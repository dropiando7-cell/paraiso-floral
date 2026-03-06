import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint — no auth required, anyone scanning the QR can access it
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ idQr: string }> }
) {
    try {
        const { idQr } = await params;

        const activo = await prisma.activoFijo.findFirst({
            where: { idQr: decodeURIComponent(idQr) },
            select: {
                idQr: true,
                descripcionCorta: true,
                descripcionDetallada: true,
                serie: true,
                modelo: true,
                area: true,
                cuentaAct: true,
                estatusContable: true,
                estadoDano: true,
                tipoIncidencia: true,
                accionRecomendada: true,
                responsable: true,
                observaciones: true,
                imagenUrl: true,
                imagenPlacaUrl: true,
                fechaAdq: true,
                fechaLevantamiento: true,
                integrado: true,
                costoAdq: true,
                createdAt: true,
            },
        });

        if (!activo) {
            return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 });
        }

        return NextResponse.json(activo);
    } catch (err) {
        console.error('[ficha]', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
