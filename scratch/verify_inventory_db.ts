import { prisma } from '../src/lib/prisma';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
    const totalCount = await prisma.activoFijo.count();
    const withStock = await prisma.activoFijo.count({ where: { stock: { gt: 0 } } });
    const zeroStock = await prisma.activoFijo.count({ where: { stock: 0 } });

    console.log('=== INVENTORY SEED VERIFICATION SUMMARY ===');
    console.log(`Total Inventory Records in DB: ${totalCount}`);
    console.log(`Available Items (Stock > 0): ${withStock}`);
    console.log(`Out of Stock Items (Stock = 0): ${zeroStock}`);

    const byCategory = await prisma.activoFijo.groupBy({
        by: ['cuentaAct'],
        _count: { id: true },
        _sum: { stock: true }
    });

    console.log('\n--- BREAKDOWN BY CATEGORY ---');
    for (const c of byCategory) {
        console.log(`- ${c.cuentaAct || 'Sin Categoría'}: ${c._count.id} ítems (Total Paquetes en Stock: ${c._sum.stock || 0})`);
    }

    const byArea = await prisma.activoFijo.groupBy({
        by: ['area'],
        _count: { id: true },
        _sum: { stock: true }
    });

    console.log('\n--- BREAKDOWN BY STORAGE AREA ---');
    for (const a of byArea) {
        console.log(`- ${a.area}: ${a._count.id} ítems (Total Paquetes en Stock: ${a._sum.stock || 0})`);
    }

    console.log('\n--- SAMPLE 15 ITEMS WITH STOCK > 0 ---');
    const sampleAvailable = await prisma.activoFijo.findMany({
        where: { stock: { gt: 0 } },
        take: 15,
        select: { idQr: true, descripcionCorta: true, stock: true, cuentaAct: true, area: true, imagenUrl: true }
    });
    console.table(sampleAvailable);

    console.log('\n--- SAMPLE 10 ITEMS WITH STOCK = 0 ---');
    const sampleZero = await prisma.activoFijo.findMany({
        where: { stock: 0 },
        take: 10,
        select: { idQr: true, descripcionCorta: true, stock: true, cuentaAct: true, area: true }
    });
    console.table(sampleZero);
}

main().catch(console.error).finally(() => prisma.$disconnect());
