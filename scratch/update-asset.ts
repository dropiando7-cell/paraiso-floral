import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Updating asset BEA-001-000107 to VIGENTE...");
        const result = await prisma.activoFijo.updateMany({
            where: {
                idQr: 'BEA-001-000107'
            },
            data: {
                estatusContable: 'VIGENTE'
            }
        });
        
        console.log("Update result:", JSON.stringify(result, null, 2));
        
        // Fetch details to verify
        const updatedAsset = await prisma.activoFijo.findFirst({
            where: {
                idQr: 'BEA-001-000107'
            }
        });
        console.log("Updated asset details:");
        console.log(JSON.stringify(updatedAsset, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
