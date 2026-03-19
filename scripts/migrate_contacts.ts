/**
 * Script para migrar el archivo contactos_bioelectronica.csv a la tabla Cliente de Prisma
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Iniciando migración de contactos de Odoo...');

        const org = await prisma.organization.findFirst();
        if (!org) {
            console.error('No se encontró ninguna organización en la Base de Datos.');
            process.exit(1);
        }

        const csvPath = path.resolve(process.cwd(), 'referencias/contactos_bioelectronica.csv');
        const fileContent = fs.readFileSync(csvPath, 'utf8');

        // Parseamos el CSV
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            delimiter: ',',
            bom: true
        });

        console.log(`Se encontraron ${records.length} contactos en el CSV.`);

        let iter = 0;
        let upserted = 0;

        for (const row of records as any[]) {
            iter++;

            // Nombres de columna tal cual aparecen en el CSV original Exportado de Odoo
            const idExterno = row['ID externo'];
            const nombre = row['Nombre mostrado'];
            let email = row['Correo electrónico'] || null;
            let telefono = row['Teléfono'] || null;

            if (!nombre || nombre.trim() === '') {
                console.log(`Fila ${iter}: Ignorando contacto sin nombre.`);
                continue;
            }

            if (telefono) {
                // Remove weird quotes like '
                telefono = telefono.replace(/'/g, '').trim();
                // Odoo might have exported empty strings as spaces
                if (telefono === '') telefono = null;
            }
            if (email) {
                if (email === '') email = null;
            }

            if (iter <= 3) {
                console.log(`[DEBUG] Procesando fila ${iter}:`, nombre);
            }

            // Prevent duplicates using the exact same name for idempotency
            const existing = await prisma.cliente.findFirst({
                where: {
                    nombre: nombre,
                    organizationId: org.id
                }
            });

            if (iter <= 3) {
                console.log(`[DEBUG] findFirst completado para fila ${iter}. Existe:`, !!existing);
            }

            if (!existing) {
                await prisma.cliente.create({
                    data: {
                        organizationId: org.id,
                        nombre: nombre,
                        email: email,
                        telefono: telefono,
                    }
                });
                upserted++;
                if (upserted % 50 === 0) {
                    console.log(`✅ ${upserted} contactos insertados...`);
                }
            }
            if (iter <= 3) {
                console.log(`[DEBUG] Fila ${iter} procesada.`);
            }
        }

        console.log(`✅ Migración finalizada. Se insertaron ${upserted} NUEVOS contactos de un total de ${records.length}.`);
    } catch (e) {
        console.error('❌ Error fatal en migración:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
