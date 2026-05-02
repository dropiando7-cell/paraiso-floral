import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function searchOdooProducts(query: string) {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const searchTerm = query.trim();

    try {
        const results = await prisma.productoOdoo.findMany({
            where: {
                OR: [
                    { nombre: { contains: searchTerm, mode: 'insensitive' } },
                    { codigoBarras: { contains: searchTerm, mode: 'insensitive' } },
                    { referenciaInterna: { contains: searchTerm, mode: 'insensitive' } },
                    { odooId: { contains: searchTerm, mode: 'insensitive' } }
                ]
            },
            take: 20, // Limit to top 20 results
        });

        return results;
    } catch (error) {
        console.error("Error searching Odoo products:", error);
        return [];
    }
}

async function test() {
    const res = await searchOdooProducts('ZMM3V3');
    console.log('Action Result length:', res.length);
}

test().finally(() => prisma.$disconnect());
