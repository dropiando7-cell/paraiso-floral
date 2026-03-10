import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

const prisma = new PrismaClient();

const CSV_FILE_PATH = path.join(process.cwd(), 'plantilla-concilia/INVENTARIO_CONSOLIDADO_ELIM_2026_HISTORICO.csv');
const ORG_ID = "62be2897-4e63-4acc-b1c4-1422ab88a044"; // Fixed organization ID from the first run

function parseDecimalString(val: string): number | null {
    if (!val) return null;
    const cleanStr = val.replace(/,/g, '').replace(/\$/g, '').replace(/L\./g, '').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
}

function parseSpanishDate(val: string): Date | null {
    if (!val) return null;
    val = val.trim();
    // Format is DD/MM/YYYY
    const parts = val.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
}

async function run() {
    console.log('🔄 Iniciando carga histórica de Inventario CSV...');

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`❌ Archivo CSV no encontrado en: ${CSV_FILE_PATH}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(CSV_FILE_PATH, { encoding: 'utf-8' });

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`📊 Total de filas parseadas en CSV: ${records.length}`);

    let insertados = 0;
    let omitidos = 0;

    const bulkData: any[] = [];

    for (const record of records as any[]) {
        // 1. Filtrar filas inválidas (ej. la de sumatoria final que no tiene nombre de propiedad)
        const nombrePropiedad = record['Descripción de la propiedad'];
        if (!nombrePropiedad) {
            omitidos++;
            continue;
        }

        // 2. Extraer campos
        const cantidadStr = record['cantidad'];
        const cantidad = parseInt(cantidadStr, 10) || 1;

        const marcaModelo = record['marca_modelo'] || null;
        const serie = record['serie'] || null;

        const fechaAdqStr = record['Fecha de adquisición'];
        const fechaAdquisicion = parseSpanishDate(fechaAdqStr);

        const valorAdqStr = record['Valor de adquisicion'];
        const costoAdquisicion = parseDecimalString(valorAdqStr);

        const cuentaContable = record['cuenta_contable'] || null;

        const vidaUtilStr = record['vida_util'];
        const vidaUtil = parseDecimalString(vidaUtilStr);

        bulkData.push({
            organizationId: ORG_ID,
            cantidad,
            nombrePropiedad,
            marcaModelo,
            serie,
            fechaAdquisicion,
            costoAdquisicion,
            cuentaContable,
            vidaUtil
        });
    }

    try {
        console.log(`🚀 Insertando ${bulkData.length} registros en la base de datos...`);
        const result = await prisma.inventarioHistorico.createMany({
            data: bulkData,
            skipDuplicates: true // Just in case
        });
        insertados = result.count;
    } catch (error) {
        console.error(`❌ Error en Bulk Insert:`, error);
    }

    console.log('✅ Carga finalizada.');
    console.log(`-> Insertados exitosamente: ${insertados}`);
    console.log(`-> Filas omitidas (ej. totales): ${omitidos}`);
}

run()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
