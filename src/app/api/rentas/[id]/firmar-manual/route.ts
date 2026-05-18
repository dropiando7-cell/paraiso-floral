import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rentaId } = await params;

        const renta = await prisma.rentaEquipo.findUnique({ where: { id: rentaId } });
        if (!renta) return NextResponse.json({ error: 'Renta no encontrada' }, { status: 404 });
        if (renta.estado === 'ACTIVA') return NextResponse.json({ error: 'El contrato ya está activo' }, { status: 400 });

        await prisma.rentaEquipo.update({
            where: { id: rentaId },
            data: { estado: 'ACTIVA' }
        });

        await prisma.activoFijo.update({
            where: { id: renta.activoFijoId },
            data: { estatusContable: 'EN_RENTA' }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Error al activar' }, { status: 500 });
    }
}
