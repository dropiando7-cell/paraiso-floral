import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando copiado de respaldos originales...");

    // Obtenemos todos los historicos
    const rows = await prisma.inventarioHistorico.findMany();

    let actualizados = 0;
    for (const row of rows) {
        // Solo copiamos si no tienen nombreOriginal ya (evita sobrecribir si se corre 2 veces)
        if (!row.nombreOriginal || !row.serieOriginal) {
            await prisma.inventarioHistorico.update({
                where: { id: row.id },
                data: {
                    nombreOriginal: row.nombreOriginal ? undefined : row.nombrePropiedad,
                    serieOriginal: row.serieOriginal ? undefined : row.serie
                }
            });
            actualizados++;
        }
    }

    console.log(`Migracion completada. Se respaldaron exitosamente ${actualizados} registros.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
