import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { rentaId, firmaDataUrl } = await req.json();

        if (!rentaId || !firmaDataUrl) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        // Validate the contract is pending
        const renta = await prisma.rentaEquipo.findUnique({ where: { id: rentaId } });
        if (!renta) return NextResponse.json({ error: 'Renta no encontrada' }, { status: 404 });
        if (renta.estado === 'ACTIVA') return NextResponse.json({ error: 'El contrato ya fue firmado' }, { status: 400 });

        // Update the contract with the signature and change state
        await prisma.rentaEquipo.update({
            where: { id: rentaId },
            data: { 
                firmaUrl: firmaDataUrl,
                estado: 'ACTIVA' 
            }
        });

        // Update the ActivoFijo state to EN_RENTA as the contract is now official
        await prisma.activoFijo.update({
            where: { id: renta.activoFijoId },
            data: { estatusContable: 'EN_RENTA' }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error saving signature:', e);
        return NextResponse.json({ error: 'Error del servidor al guardar la firma' }, { status: 500 });
    }
}
