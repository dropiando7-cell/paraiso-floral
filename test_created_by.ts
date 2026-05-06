import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const act = await prisma.activoFijo.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { nombre: true, apellido: true } } }
    });
    console.log(JSON.stringify(act?.createdBy, null, 2));
    
    // Check if older assets have createdBy
    const older = await prisma.activoFijo.findFirst({
        where: { idQr: 'BEA-001-000288' },
        include: { createdBy: { select: { nombre: true, apellido: true } } }
    });
    console.log("BEA-001-000288:", JSON.stringify(older?.createdBy, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
