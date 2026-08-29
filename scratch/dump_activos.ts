import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dumpAll() {
    const all = await prisma.activoFijo.findMany({
        orderBy: { idQr: 'asc' }
    });
    console.log(`Total Activos Fijos: ${all.length}`);
    all.forEach(a => {
        console.log(`${a.idQr} | ${a.codigoBarras} | ${a.descripcionCorta} | Stock: ${a.stock} | Lote: ${a.lote}`);
    });
}

dumpAll().finally(() => prisma.$disconnect());
