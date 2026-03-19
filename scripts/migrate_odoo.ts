import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import http from 'http';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Configure S3 client for Cloudflare R2 using the local environment variables.
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {

        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const ODOO_BASE_URL = 'http://he608m8yeek.sn.mynetname.net:8032';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'sistemaselimapp';
const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

async function fetchOdooImage(id: string): Promise<Buffer | null> {
    try {
        const url = `${ODOO_BASE_URL}/web/image/product.template/${id}/image`;
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) return null;
        
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Odoo placeholder check
        if (buffer.length <= 6100) return null;
        return buffer;
    } catch(e) {
        return null;
    }
}

async function uploadToR2(buffer: Buffer, filename: string): Promise<string> {
    const key = `odoo-migration/${Date.now()}-${filename}.jpg`;
    
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
    }));
    
    return `${PUBLIC_URL}/${key}`;
}

async function run() {
    console.log('[*] Starting Odoo Migration...');
    const organizationId = '2e6b71bb-a475-4dd3-83a4-b5fb6b6193f8';
    
    // 1. Get the Bioelectronica organization
    const org = await prisma.organization.findUnique({
        where: { id: organizationId }
    });
    
    if (!org) {
        console.error('[-] Could not find BIOELECTRONICA organization. Aborting.');
        return;
    }
    console.log(`[+] Found Organization: ${org.name} (${org.id})`);

    // 2. Read and parse CSV
    const csvContent = fs.readFileSync('D:/bioelectronica-app/bioelectronica-app/referencias/productos_bioelectronica_odoo.csv', 'utf8');
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`[+] Parsed ${records.length} records from CSV.`);

    let successCount = 0;
    let failedCount = 0;

    for (const record of records) {
        try {
            const row: any = record;
            const externalId = row['ID externo'] || '';
            const rawIdMatch = externalId.match(/product_template_(\d+)_/);
            const internalId = rawIdMatch ? rawIdMatch[1] : null;

            const name = row['Nombre']?.trim() || 'Sin Nombre';
            const stockStr = row['Cantidad a mano'];
            const stock = parseInt(stockStr, 10) || 0;
            const priceStr = row['Precio de venta'];
            const price = parseFloat(priceStr) || 0;
            const internalRef = row['Referencia interna']?.trim();
            const category = row['Categoría de producto']?.trim() || 'Bodega Principal';

            let imagenUrl: string | null = null;

            // 3. Attempt image fetch if we resolved the ID
            if (internalId) {
                const imgBuffer = await fetchOdooImage(internalId);
                if (imgBuffer) {
                    imagenUrl = await uploadToR2(imgBuffer, `product_${internalId}`);
                    console.log(`[+] Uploaded image for ${internalId}: ${imagenUrl}`);
                }
            }

            // 4. Transform and Insert to Prisma ActivoFijo
            const odooId = internalId || `csv-${Math.floor(Math.random() * 1000000)}`;
            const safeRef = `ODOO-${odooId}`;

            const activoData = {
                organizationId: org.id,
                idQr: safeRef,
                codigoBarras: internalRef || null,
                descripcionCorta: name,
                area: 'Bodega Principal',
                cuentaAct: category,
                estatusContable: 'VIGENTE',
                costoAdq: price,
                stock: stock > 0 ? stock : 1,
                imagenUrl: imagenUrl || undefined,
                integrado: true,
            };

            await prisma.activoFijo.upsert({
                where: {
                    organizationId_idQr: {
                        organizationId: org.id,
                        idQr: safeRef,
                    }
                },
                update: {
                    codigoBarras: activoData.codigoBarras,
                    descripcionCorta: activoData.descripcionCorta,
                    cuentaAct: activoData.cuentaAct,
                    costoAdq: activoData.costoAdq,
                    stock: activoData.stock,
                    ...(imagenUrl ? { imagenUrl } : {}),
                },
                create: activoData,
            });

            successCount++;
            if (successCount % 50 === 0) {
                console.log(`[+] Processed ${successCount}/${records.length}`);
            }
        } catch (e: any) {
            console.error(`[-] Failed to process record: ${record['Nombre']} - ${e.message}`);
            failedCount++;
        }
    }

    console.log(`[*] Migration Complete. Inserted: ${successCount}, Failed: ${failedCount}`);
}

run()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
