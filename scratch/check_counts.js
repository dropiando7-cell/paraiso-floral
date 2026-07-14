const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking DB counts...");
    const productsCount = await prisma.producto.count();
    console.log("Products Count:", productsCount);
    
    const assetsCount = await prisma.activoFijo.count();
    console.log("Assets Count:", assetsCount);

    const distinctBrands = await prisma.producto.findMany({
        select: { marca: true },
        distinct: ['marca']
    });
    console.log("Distinct Brands Count:", distinctBrands.length);

    const distinctCats = await prisma.producto.findMany({
        select: { categoria: true },
        distinct: ['categoria']
    });
    console.log("Distinct Categories Count:", distinctCats.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
