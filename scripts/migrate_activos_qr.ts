import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Mapa manual basado en: Codigos_Activos_Elim_CORRECTO.csv
// Key: NOMBRE DEL ÁREA (coincide con el "value" que guardamos o "label" parseado)
// Value { codigoBase, responsable }
const CSV_DATA: Record<string, { codigoBase: string, responsable: string }> = {
    'PB-A1-OF.PASTOR': { codigoBase: 'ELIM-PB-A01-OF', responsable: 'ROGER DIAZ' },
    'PB-A2-OF.ADM': { codigoBase: 'ELIM-PB-A02-OF', responsable: 'ROBERTO FUNEZ' },
    'PB-A3-S.CUNA': { codigoBase: 'ELIM-PB-A03-SC', responsable: 'BELINDA DE VEGA' },
    'PB-A4-ENFERM': { codigoBase: 'ELIM-PB-A04-EN', responsable: 'JORGE PUERTO' },
    'PB-A5-S.JUNTAS': { codigoBase: 'ELIM-PB-A05-SJ', responsable: 'JORGE PUERTO' },
    'PB-A6-COCINETA': { codigoBase: 'ELIM-PB-A06-CK', responsable: 'MIRIAM DE PUERTO' },
    'PB-A7-OF.JOVEN': { codigoBase: 'ELIM-PB-A07-OF', responsable: 'JOSUE RODRIGUEZ' },
    'PB-A8-OF.EB': { codigoBase: 'ELIM-PB-A08-OF', responsable: 'YOLANDA MONROY' },
    'PB-A9-EB': { codigoBase: 'ELIM-PB-A09-EB', responsable: 'YOLANDA MONROY' },
    'PB-A10-EB': { codigoBase: 'ELIM-PB-A10-EB', responsable: 'YOLANDA MONROY' },
    'PB-A11-COCIN CAF': { codigoBase: 'ELIM-PB-A11-CA', responsable: 'GENOVEBA MATUTE' },
    'PB-A12-SALON CAF': { codigoBase: 'ELIM-PB-A12-CA', responsable: 'GENOVEBA MATUTE' },
    'PB-A13-AUDIO': { codigoBase: 'ELIM-PB-A13-AU', responsable: 'OSCAR BEJARANO' },
    'PB-A14-MULTI': { codigoBase: 'ELIM-PB-A14-ML', responsable: 'ISAAC PAZ' },
    'PB-A15-TEMPLO': { codigoBase: 'ELIM-PB-A15-TM', responsable: 'JORGE PUERTO' },
    'PB-A16-PLATAFO': { codigoBase: 'ELIM-PB-A16-PL', responsable: 'EDIE PAZ' },
    'PB-A17-OF.REC': { codigoBase: 'ELIM-PB-A17-RC', responsable: 'ISAAC PAZ' },
    'PB-A18-OF. IMCE': { codigoBase: 'ELIM-PB-A18-OF', responsable: 'ISAAC PAZ' },
    'PA-A1-SAL.MUL': { codigoBase: 'ELIM-PA-A19-SL', responsable: 'JORGE PUERTO' },
    'PA-A2-OFICINA': { codigoBase: 'ELIM-PA-A20-OF', responsable: 'DAVID DIAZ' },
    'PA-A3-EB': { codigoBase: 'ELIM-PA-A21-EB', responsable: 'YOLANDA MONROY' },
    'PA-A4-EB': { codigoBase: 'ELIM-PA-A22-EB', responsable: 'YOLANDA MONROY' },
    'PA-A5-EB': { codigoBase: 'ELIM-PA-A23-EB', responsable: 'YOLANDA MONROY' },
    'PA-A6-EB': { codigoBase: 'ELIM-PA-A24-EB', responsable: 'YOLANDA MONROY' },
    'PA-B1-PASILLO': { codigoBase: 'ELIM-PA-A25-BD', responsable: 'JORGE PUERTO' },
    'PB-B1-OFICINA': { codigoBase: 'ELIM-PB-A26-BD', responsable: 'ISAAC PAZ' },
    'PB-B2-PASILLO': { codigoBase: 'ELIM-PB-A27-BD', responsable: 'MIRIAM DE PUERTO' },
    'PB-B3-TRASERA': { codigoBase: 'ELIM-PB-A28-BD', responsable: 'MIRIAM DE PUERTO' },
    'PB-B4-TEMPLO': { codigoBase: 'ELIM-PB-A29-BD', responsable: 'OSCAR BEJARANO' },
    'PB-B5-TEMPLO': { codigoBase: 'ELIM-PB-A30-BD', responsable: 'JORGE PUERTO' },
    'B6-EXTERNA CV': { codigoBase: 'ELIM-EX-A31-BD', responsable: 'ISAAC PAZ' },
    'B7-EXTERNA': { codigoBase: 'ELIM-EX-A32-BD', responsable: 'JESMY PEREZ' },
};

async function migrate() {
    console.log('Iniciando migración de códigos de activo QR...');

    // Agrupar todos los activos actuales por AREA
    const activos = await prisma.activoFijo.findMany({
        orderBy: { createdAt: 'asc' } // Respetar orden de creación actual para los correlativos
    });

    console.log(`Encontrados ${activos.length} activos en la base de datos.`);

    const areaCounters: Record<string, number> = {};
    let migratedCount = 0;

    for (const activo of activos) {
        const conf = CSV_DATA[activo.area];

        let newIdQr = activo.idQr; // Fallback

        if (conf) {
            // Inicializar contador si no existe
            if (!areaCounters[activo.area]) {
                areaCounters[activo.area] = 1;
            } else {
                areaCounters[activo.area]++;
            }

            const currentNumber = areaCounters[activo.area];
            const correlativeStr = String(currentNumber).padStart(4, '0');
            newIdQr = `${conf.codigoBase}-${correlativeStr}`;
        } else {
            console.warn(`[!] No se encontró configuración CSV para el área del activo: ${activo.area}`);
        }

        if (activo.idQr !== newIdQr) {
            await prisma.activoFijo.update({
                where: { id: activo.id },
                data: { idQr: newIdQr }
            });
            console.log(`  -> Migrado ${activo.idQr} a ${newIdQr}`);
            migratedCount++;
        }
    }

    console.log(`\nMigración completada. Modificados: ${migratedCount} activos.`);
}

migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
