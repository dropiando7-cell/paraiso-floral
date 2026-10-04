import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get('orgId');

        const where: any = { 
            estado: 'PENDIENTE',
            impresora: 'Tickets'
        };
        if (orgId) {
            where.organizationId = orgId;
        }

        const trabajos = await prisma.colaImpresion.findMany({
            where,
            take: 20,
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                urlImagen: true,
                impresora: true,
                tamano: true,
                organizationId: true,
                activo: {
                    select: {
                        idQr: true,
                        descripcionCorta: true,
                        marca: true,
                        modelo: true,
                        serie: true,
                        codigoBarras: true
                    }
                }
            }
        });

        return NextResponse.json({ trabajos });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

