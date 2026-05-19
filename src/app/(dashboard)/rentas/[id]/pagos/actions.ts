'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registrarPagoRenta(data: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) throw new Error('Unauthorized');

    const rentaId = data.get('rentaId') as string;
    const monto = parseFloat(data.get('monto') as string);
    const fechaPagoStr = data.get('fechaPago') as string;
    const metodoPago = data.get('metodoPago') as string;
    const referencia = data.get('referencia') as string;
    const notas = data.get('notas') as string;

    if (!monto || monto <= 0) throw new Error('Monto inválido');

    await prisma.rentaPago.create({
        data: {
            organizationId: dbUser.organizationId,
            rentaId,
            monto,
            fechaPago: new Date(fechaPagoStr + 'T12:00:00Z'),
            metodoPago,
            referencia,
            notas,
            creadoPorId: dbUser.id
        }
    });

    revalidatePath(`/rentas/${rentaId}/pagos`);
}

export async function eliminarPagoRenta(pagoId: string, rentaId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true, role: true },
    });
    if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN')) {
        throw new Error('Solo administradores pueden eliminar pagos');
    }

    await prisma.rentaPago.delete({
        where: { id: pagoId, organizationId: dbUser.organizationId }
    });

    revalidatePath(`/rentas/${rentaId}/pagos`);
}

export async function editarPagoRenta(pagoId: string, data: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) throw new Error('Unauthorized');

    const rentaId = data.get('rentaId') as string;
    const monto = parseFloat(data.get('monto') as string);
    const fechaPagoStr = data.get('fechaPago') as string;
    const metodoPago = data.get('metodoPago') as string;
    const referencia = data.get('referencia') as string;
    const notas = data.get('notas') as string;

    if (!monto || monto <= 0) throw new Error('Monto inválido');

    await prisma.rentaPago.update({
        where: { id: pagoId, organizationId: dbUser.organizationId },
        data: {
            monto,
            fechaPago: new Date(fechaPagoStr + 'T12:00:00Z'),
            metodoPago,
            referencia,
            notas,
            modificadoPorId: dbUser.id
        }
    });

    revalidatePath(`/rentas/${rentaId}/pagos`);
}
