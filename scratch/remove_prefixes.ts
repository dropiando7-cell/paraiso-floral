import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('[*] Iniciando limpieza de prefijos en la base de datos...');
    
    // 1. Obtener todos los activos
    const activos = await prisma.activoFijo.findMany({
        select: {
            id: true,
            idQr: true,
            descripcionCorta: true
        }
    });

    console.log(`[*] Se encontraron ${activos.length} activos en la base de datos.`);
    let actualizados = 0;

    for (const activo of activos) {
        if (!activo.idQr) continue;
        
        let nuevoIdQr = activo.idQr.trim();
        
        // Si el código contiene letras o guiones, extraemos solo el número
        if (nuevoIdQr.includes('-')) {
            const parts = nuevoIdQr.split('-');
            const lastPart = parts[parts.length - 1];
            
            // Validar que la última parte sea un número
            if (!isNaN(Number(lastPart))) {
                nuevoIdQr = String(Number(lastPart)).padStart(6, '0');
            }
        }

        // Si el idQr cambió, lo actualizamos en la base de datos
        if (nuevoIdQr !== activo.idQr) {
            console.log(`[*] Actualizando: "${activo.descripcionCorta}" | ${activo.idQr} -> ${nuevoIdQr}`);
            await prisma.activoFijo.update({
                where: { id: activo.id },
                data: { idQr: nuevoIdQr }
            });
            actualizados++;
        }
    }

    console.log(`\n[+] ¡Proceso finalizado con éxito!`);
    console.log(`[+] Activos actualizados en base de datos: ${actualizados}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
