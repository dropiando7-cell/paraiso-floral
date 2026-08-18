import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

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
                        { descripcionCorta: { contains: term, mode: 'insensitive' } },
                        { marca: { contains: term, mode: 'insensitive' } },
                        { modelo: { contains: term, mode: 'insensitive' } }
                    ]
                }));
            }
        } else {
            // Si no hay query ni serie, devolvemos un arreglo vacío para no sobrecargar
            return NextResponse.json([]);
        }

        let resultados = await prisma.inventarioHistorico.findMany({
            where: whereClause,
            take: 400, // Límite más alto para la puntuación en memoria para incluir registros antiguos
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Ordenamiento difuso en memoria (para que la IA y el Combobox reciban los mejores "matches")
        if (query && !serie) {
            // Filtrar "stop words" comunes en español que pueden sesgar el puntaje
            const stopWords = new Set(['de', 'el', 'la', 'los', 'las', 'y', 'o', 'un', 'una', 'en', 'para', 'con', 'sin', 'por']);
            const terms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0 && !stopWords.has(t));

            resultados.sort((a: any, b: any) => {
                const textA = ((a.nombrePropiedad || '') + ' ' + (a.descripcionCorta || '')).toLowerCase();
                const marcaA = (a.marca || '').toLowerCase();
                const modeloA = (a.modelo || '').toLowerCase();
                
                const textB = ((b.nombrePropiedad || '') + ' ' + (b.descripcionCorta || '')).toLowerCase();
                const marcaB = (b.marca || '').toLowerCase();
                const modeloB = (b.modelo || '').toLowerCase();

                let scoreA = 0; let scoreB = 0;
                terms.forEach(t => {
                    // Puntaje base por coincidir en texto general
                    if (textA.includes(t)) scoreA += 1;
                    if (textB.includes(t)) scoreB += 1;
                    
                    // Puntaje ALTO por coincidir exactamente en la marca o modelo (prioriza coincidencias tipo "NORD")
                    if (marcaA.includes(t)) scoreA += 3;
                    if (marcaB.includes(t)) scoreB += 3;
                    
                    if (modeloA.includes(t)) scoreA += 3;
                    if (modeloB.includes(t)) scoreB += 3;
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
