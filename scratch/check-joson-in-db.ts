import { prisma } from '../src/lib/prisma';

async function main() {
    try {
        const totalJoson = await prisma.producto.count({
            where: { sku: { startsWith: 'JOSON-' } }
        });
        console.log(`Total JOSON products in DB: ${totalJoson}`);

        const josonProducts = await prisma.producto.findMany({
            where: { sku: { startsWith: 'JOSON-' } },
            select: { sku: true, nombre: true, categoria: true, estado: true }
        });
        
        console.log("\nList of JOSON products:");
        josonProducts.forEach(p => {
            console.log(`- SKU: ${p.sku} | Name: ${p.nombre} | Category: ${p.categoria} | Estado: ${p.estado}`);
        });

    } catch (e) {
        console.error("DB Query failed:", e);
    }
}

main();
export {};
