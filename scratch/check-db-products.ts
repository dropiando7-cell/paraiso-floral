import { prisma } from '../src/lib/prisma';

async function main() {
    try {
        const somaCount = await prisma.producto.count({
            where: { sku: { startsWith: 'SOMA-' } }
        });
        const repCount = await prisma.producto.count({
            where: { sku: { startsWith: 'REP-' } }
        });
        console.log("Products in DB:");
        console.log(`SOMA- prefixed: ${somaCount}`);
        console.log(`REP- prefixed: ${repCount}`);

        if (somaCount > 0) {
            const sample = await prisma.producto.findFirst({
                where: { sku: { startsWith: 'SOMA-' } },
                select: { sku: true, nombre: true, createdAt: true }
            });
            console.log("Sample SOMA product:", sample);
        }
    } catch (e) {
        console.error("DB Query failed:", e);
    }
}

main();
