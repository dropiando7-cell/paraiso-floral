import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Searching for asset BEA-001-000107...");
        const asset = await prisma.activoFijo.findFirst({
            where: {
                idQr: 'BEA-001-000107'
            },
            include: {
                categoria: true
            }
        });
        
        if (asset) {
            console.log("Found Asset Details:");
            console.log(JSON.stringify(asset, null, 2));
            
            // Check if there are other assets with the same codigoGrupo
            if (asset.codigoGrupo) {
                console.log(`\nSearching for other assets in group: ${asset.codigoGrupo}...`);
                const groupAssets = await prisma.activoFijo.findMany({
                    where: {
                        codigoGrupo: asset.codigoGrupo
                    }
                });
                console.log(`Found ${groupAssets.length} assets in this group:`);
                console.log(JSON.stringify(groupAssets.map(g => ({
                    id: g.id,
                    idQr: g.idQr,
                    estatusContable: g.estatusContable,
                    area: g.area
                })), null, 2));
            }
        } else {
            console.log("Asset BEA-001-000107 not found in DB!");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
