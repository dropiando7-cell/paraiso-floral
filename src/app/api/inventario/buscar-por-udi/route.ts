import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const udi = searchParams.get('udi');

        if (!udi) {
            return NextResponse.json({ error: 'Falta parametro UDI' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { organizationId: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // Buscar el activo más reciente que tenga este código de barras exacto, o que lo contenga
        // para extraer sus propiedades (marca, modelo, descripción, cuentaAct, categoría).
        const match = await prisma.activoFijo.findFirst({
            where: {
                organizationId: dbUser.organizationId,
                codigoBarras: {
                    contains: udi,
                    mode: 'insensitive' // Por si varían mayúsculas en HIBC
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                descripcionCorta: true,
                descripcionDetallada: true,
                marca: true,
                modelo: true,
                cuentaAct: true,
                codigoGrupo: true,
                categoriaId: true,
                esConsumible: true,
                vidaUtilOverride: true
            }
        });

        if (!match) {
            return NextResponse.json({ found: false });
        }

        return NextResponse.json({
            found: true,
            data: match
        });

    } catch (err: any) {
        console.error('[Buscar UDI] Error:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
