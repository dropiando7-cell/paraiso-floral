import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/utils/supabase/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { organizationId: true }
        });

        if (!dbUser?.organizationId) {
            return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
        }

        const orgId = dbUser.organizationId;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const serie = searchParams.get('serie') || '';

        let whereClause: any = { organizationId: orgId };

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
                // Buscamos cualquier registro que tenga al menos UNO de los términos (búsqueda más flexible)
                whereClause.OR = terms.map(term => ({
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

        let resultados = await prisma.inventarioHistorico.findMany({
            where: whereClause,
            take: 100, // Límite más alto para la puntuación en memoria
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Ordenamiento difuso en memoria (para que la IA y el Combobox reciban los mejores "matches")
        if (query && !serie) {
            const terms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);

            resultados.sort((a: any, b: any) => {
                const textA = ((a.nombrePropiedad || '') + ' ' + (a.marcaModelo || '')).toLowerCase();
                const textB = ((b.nombrePropiedad || '') + ' ' + (b.marcaModelo || '')).toLowerCase();

                let scoreA = 0; let scoreB = 0;
                terms.forEach(t => {
                    if (textA.includes(t)) scoreA++;
                    if (textB.includes(t)) scoreB++;
                });

                return scoreB - scoreA;
            });
            resultados = resultados.slice(0, 15);
        } else {
            resultados = resultados.slice(0, 15);
        }

        return NextResponse.json(resultados);
    } catch (error) {
        console.error('Error buscando inventario histórico:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor consultando el registro contable.' },
            { status: 500 }
        );
    }
}
