'use server'

import { prisma } from '@/lib/prisma';
import { ProductoOdoo } from '@prisma/client';

export async function searchOdooProducts(query: string): Promise<ProductoOdoo[]> {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const searchTerm = query.trim();
    const keywords = searchTerm.split(/\s+/).filter(Boolean);

    if (keywords.length === 0) return [];

    const andConditions = keywords.map(keyword => ({
        OR: [
            { nombre: { contains: keyword, mode: 'insensitive' as const } },
            { nombreMostrar: { contains: keyword, mode: 'insensitive' as const } },
            { codigoBarras: { contains: keyword, mode: 'insensitive' as const } },
            { referenciaInterna: { contains: keyword, mode: 'insensitive' as const } },
            { odooId: { contains: keyword, mode: 'insensitive' as const } },
            { notasInternas: { contains: keyword, mode: 'insensitive' as const } }
        ]
    }));

    try {
        const results = await prisma.productoOdoo.findMany({
            where: {
                AND: andConditions
            },
            take: 20,
        });

        return results;
    } catch (error) {
        console.error("Error searching Odoo products:", error);
        return [];
    }
}
