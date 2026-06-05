import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncKanbanStatus } from '@/app/(dashboard)/soporte/actions';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { facturaId, firmaDataUrl } = body;

        if (!facturaId || !firmaDataUrl) {
            return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
        }

        const factura = await prisma.factura.findUnique({
            where: { id: facturaId },
            include: { organization: true }
        });

        if (!factura) {
            return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
        }

        if (factura.estado === 'APROBADA') {
            return NextResponse.json({ error: 'El presupuesto ya fue aprobado.' }, { status: 400 });
        }

        // 1. Marcar factura como aprobada y guardar la firma
        await prisma.factura.update({
            where: { id: facturaId },
            data: {
                estado: 'APROBADA',
                firmaClienteBase64: firmaDataUrl,
                firmaClienteAt: new Date()
            }
        });

        // 2. Si este presupuesto está ligado a una orden de soporte, actualizarla y sincronizar Kanban
        if (factura.documentoOrigenId) {
            const orden = await prisma.ordenTrabajo.findUnique({
                where: { id: factura.documentoOrigenId }
            });

            if (orden && orden.estado === 'APROBACION_PRESUPUESTO') {
                // Mover la orden a REPARACION
                await prisma.ordenTrabajo.update({
                    where: { id: orden.id },
                    data: {
                        estado: 'REPARACION'
                    }
                });

                // Sincronizar Kanban a EN CURSO
                try {
                    await syncKanbanStatus(orden.id, 'REPARACION');
                } catch(e) {
                    console.error("Error sincronizando Kanban tras firma:", e);
                }
            }
        }

        revalidatePath('/soporte');
        revalidatePath('/facturas');
        revalidatePath('/kanban');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error al guardar firma de presupuesto:', error);
        return NextResponse.json({ error: 'Error del servidor al procesar la firma.' }, { status: 500 });
    }
}
