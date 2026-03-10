import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = "62be2897-4e63-4acc-b1c4-1422ab88a044"; // Fixed organization ID from the first run

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const serie = searchParams.get('serie') || '';

        let whereClause: any = { organizationId: ORG_ID };

        // Si se envía una serie exacta (para autocompletado mágico desde la cámara AI)
        if (serie) {
            whereClause.serie = {
                equals: serie,
                mode: 'insensitive',
            };
        }
        // Si se envía una búsqueda difusa de texto (para el Combobox)
        else if (query) {
            const terms = query.trim().split(/\s+/).filter(t => t.length > 0);

            if (terms.length > 0) {
                whereClause.AND = terms.map(term => ({
                    OR: [
                        { nombrePropiedad: { contains: term, mode: 'insensitive' } },
                        { marcaModelo: { contains: term, mode: 'insensitive' } }
                    ]
                }));
            }
        } else {
            // Si no hay query ni serie, devolvemos un arreglo vacío para no sobrecargar
            return NextResponse.json([]);
        }

        const resultados = await prisma.inventarioHistorico.findMany({
            where: whereClause,
            take: 15, // Límite para mantener el desplegable rápido y limpio
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(resultados);
    } catch (error) {
        console.error('Error buscando inventario histórico:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor consultando el registro contable.' },
            { status: 500 }
        );
    }
}
