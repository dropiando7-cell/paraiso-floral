import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const prisma = new PrismaClient();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function uploadToR2(base64Str: string, fileName: string) {
    try {
        const fileBuffer = Buffer.from(base64Str, 'base64');
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: 'image/jpeg',
        });
        await r2Client.send(command);
        return `${NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
    } catch (error) {
        console.error("Error uploading to R2:", error);
        return null;
    }
}

async function main() {
    const csvPath = path.join(__dirname, '../referencias/Productos_Odoo_27-04-2026.csv');
    
    // Get an organization
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error("No organization found in DB. Cannot insert Odoo products.");
        process.exit(1);
    }
    const organizationId = org.id;

    const results: any[] = [];

    console.log(`Leyendo CSV desde ${csvPath}...`);

    fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`CSV parseado. Total registros: ${results.length}`);
            let count = 0;

            for (const row of results) {
                const odooId = row['ID'] || null;
                const nombre = row['Nombre'] || 'Sin Nombre';
                const nombreMostrar = row['Nombre a mostrar'] || null;
                const codigoBarras = row['Código de barras'] || null;
                const notasInternas = row['Notas internas de Odoo'] || null;
                const cantidadOdoo = row['Cantidad en Odoo'] ? parseInt(row['Cantidad en Odoo'], 10) : null;
                const descripcionSitioWeb = row['Descripción para el sitio web'] || null;
                const pasilloEstante = row['Pasillo y Estante'] || null;
                const referenciaInterna = row['Referencia interna'] || null;
                const tipoProducto = row['Tipo de producto'] || null;

                const b64Image = row['Imagen grande'] || row['Imagen de tamaño mediano'];
                let imagenUrl = null;

                if (b64Image && b64Image.length > 100) {
                    const fileName = `odoo-references/prod_${odooId || Date.now()}.jpg`;
                    imagenUrl = await uploadToR2(b64Image, fileName);
                }

                await prisma.productoOdoo.create({
                    data: {
                        organizationId,
                        odooId,
                        nombre,
                        nombreMostrar,
                        codigoBarras,
                        notasInternas,
                        cantidadOdoo: isNaN(cantidadOdoo as number) ? null : cantidadOdoo,
                        descripcionSitioWeb,
                        pasilloEstante,
                        referenciaInterna,
                        tipoProducto,
                        imagenUrl
                    }
                });

                count++;
                if (count % 50 === 0) {
                    console.log(`Procesados ${count} de ${results.length}...`);
                }
            }

            console.log(`✅ Importación completada. Se importaron ${count} productos.`);
            await prisma.$disconnect();
            process.exit(0);
        });
}

main().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
