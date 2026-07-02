import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking products in database...");
        
        // Find products with SKU starting with 'RD-'
        const rdProducts = await prisma.producto.findMany({
            where: {
                sku: {
                    startsWith: 'RD-'
                }
            },
            take: 10
        });
        
        console.log(`Total RD products found: ${rdProducts.length}`);
        if (rdProducts.length > 0) {
            console.log("Sample product in database:");
            console.log(JSON.stringify(rdProducts[0], null, 2));
            
            // Print unique organizationIds and categories in all RD products
            const allRd = await prisma.producto.findMany({
                where: {
                    sku: {
                        startsWith: 'RD-'
                    }
                },
                select: {
                    organizationId: true,
                    categoria: true,
                    estado: true
                }
            });
            
            const orgs = Array.from(new Set(allRd.map(p => p.organizationId)));
            const cats = Array.from(new Set(allRd.map(p => p.categoria)));
            const estados = Array.from(new Set(allRd.map(p => p.estado)));
            
            console.log("\nSummary of all RD products:");
            console.log("  Organization IDs:", orgs);
            console.log("  Categories:", cats);
            console.log("  States (Estados):", estados);
        } else {
            console.log("No RD- products found at all!");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
