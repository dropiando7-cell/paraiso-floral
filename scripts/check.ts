import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.productoOdoo.findMany({
        where: {
            nombre: { contains: 'ZMM3V3', mode: 'insensitive' }
        }
    });
    console.log('Found ZMM3V3:', res.length);
    console.log(res);

    // Let's also check if ANY records exist
    const count = await prisma.productoOdoo.count();
    console.log('Total records:', count);
}
main().finally(() => prisma.$disconnect());
