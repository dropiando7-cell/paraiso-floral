import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== ORGANIZACIONES ===");
    const orgs = await prisma.organization.findMany();
    console.log(orgs.map(o => ({ id: o.id, name: o.name, slug: o.slug })));

    console.log("\n=== PRODUCTOS Y ACTIVOS BUSCANDO 'ROSA' ===");
    const activosRosa = await prisma.activoFijo.findMany({
        where: {
            descripcionCorta: {
                contains: 'ROSA',
                mode: 'insensitive'
            }
        },
        take: 50
    });
    console.log(`Encontrados ${activosRosa.length} Activos Fijos con 'ROSA':`);
    activosRosa.forEach(a => {
        console.log(`ID: ${a.id} | idQr: ${a.idQr} | Lote: ${a.lote} | Desc: ${a.descripcionCorta} | Stock: ${a.stock} | CodBarras: ${a.codigoBarras}`);
    });

    console.log("\n=== PRODUCTOS ODOO BUSCANDO 'ROSA' ===");
    const productosOdoo = await prisma.productoOdoo.findMany({
        where: {
            nombre: {
                contains: 'ROSA',
                mode: 'insensitive'
            }
        },
        take: 50
    });
    console.log(`Encontrados ${productosOdoo.length} Productos Odoo con 'ROSA':`);
    productosOdoo.forEach(p => {
        console.log(`ID: ${p.id} | Nombre: ${p.nombre} | CodBarras: ${p.codigoBarras} | RefInterna: ${p.referenciaInterna}`);
    });

    console.log("\n=== TODOS LOS ACTIVOS FIJOS (SAMPLE 20) ===");
    const activosSample = await prisma.activoFijo.findMany({
        take: 20
    });
    console.log(`Sample Activos Fijos (${activosSample.length}):`);
    activosSample.forEach(a => {
        console.log(`ID: ${a.id} | idQr: ${a.idQr} | Lote: ${a.lote} | Desc: ${a.descripcionCorta} | Stock: ${a.stock}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
