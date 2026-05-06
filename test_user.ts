import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const act = await prisma.activoFijo.findFirst({
        where: { idQr: 'BEA-001-000288' },
        select: { createdById: true, createdBy: true }
    });
    console.log("BEA-001-000288 createdById:", act?.createdById);
    console.log("createdBy record:", act?.createdBy);
}
main().catch(console.error).finally(() => prisma.$disconnect());
