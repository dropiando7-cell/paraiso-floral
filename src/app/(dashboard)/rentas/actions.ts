'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function getRentas() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) redirect('/login');

    const rentas = await prisma.rentaEquipo.findMany({
        where: { organizationId: dbUser.organizationId },
        include: {
            cliente: true,
            activoFijo: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return rentas;
}

export async function returnRenta(rentaId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) redirect('/login');

    // Mover a completado
    const renta = await prisma.rentaEquipo.update({
        where: { id: rentaId, organizationId: dbUser.organizationId },
        data: {
            estado: 'DEVUELTO',
            fechaDevolucion: new Date(),
            modificadoPorId: dbUser.id,
        },
    });

    // Liberar equipo en el inventario
    await prisma.activoFijo.update({
        where: { id: renta.activoFijoId },
        data: {
            estatusContable: 'VIGENTE',
        }
    });

    return true;
}

export async function editRenta(rentaId: string, payload: {
    tipoAlquiler?: string;
    mesesRenta?: number;
    costoRenta?: number;
    deposito?: number;
    notas?: string;
    fechaFinEsperada?: Date;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) redirect('/login');

    await prisma.rentaEquipo.update({
        where: { id: rentaId, organizationId: dbUser.organizationId },
        data: {
            ...payload,
            modificadoPorId: dbUser.id,
        },
    });

    return true;
}

export async function cancelRenta(rentaId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) redirect('/login');

    const renta = await prisma.rentaEquipo.update({
        where: { id: rentaId, organizationId: dbUser.organizationId },
        data: {
            estado: 'CANCELADA',
            modificadoPorId: dbUser.id,
            // updatedAt is automatically handled by Prisma @updatedAt
        },
    });

    // Liberar equipo en el inventario
    await prisma.activoFijo.update({
        where: { id: renta.activoFijoId },
        data: {
            estatusContable: 'VIGENTE',
        }
    });

    return true;
}

export async function processRecepcion(data: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) redirect('/login');

    const rentaId = data.get('rentaId') as string;
    const recepcionNotas = data.get('recepcionNotas') as string;
    const depositoDevueltoStr = data.get('depositoDevuelto') as string;
    const depositoDevuelto = depositoDevueltoStr ? parseFloat(depositoDevueltoStr) : null;
    const nuevoEstadoEquipo = data.get('nuevoEstadoEquipo') as string || 'VIGENTE';
    const horasTrabajoRecibido = data.get('horasTrabajoRecibido') as string;

    let recepcionFotos: string[] = [];
    try {
        const rawFotos = data.get('recepcionFotos') as string;
        if (rawFotos) recepcionFotos = JSON.parse(rawFotos);
    } catch (e) {
        console.error("Error parsing fotos:", e);
    }

    const renta = await prisma.rentaEquipo.update({
        where: { id: rentaId, organizationId: dbUser.organizationId },
        data: {
            estado: 'DEVUELTO',
            fechaDevolucion: new Date(),
            recibidoPorId: dbUser.id,
            recepcionNotas,
            recepcionFotos,
            depositoDevuelto: depositoDevuelto !== null ? depositoDevuelto : null,
            horasTrabajoRecibido,
        },
    });

    const metodoPagoDevolucion = data.get('metodoPagoDevolucion') as string;
    if (depositoDevuelto !== null && depositoDevuelto > 0 && metodoPagoDevolucion && metodoPagoDevolucion !== 'Ninguno') {
        const activeCaja = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId: dbUser.organizationId,
                estado: 'ABIERTA'
            }
        });
        const cajaSessionId = activeCaja?.id || null;

        await prisma.rentaPago.create({
            data: {
                organizationId: dbUser.organizationId,
                rentaId: renta.id,
                monto: -depositoDevuelto, // Negativo representa devolución/salida de dinero
                metodoPago: metodoPagoDevolucion,
                notas: "Depósito en Garantía (Devuelto)",
                creadoPorId: dbUser.id,
                cajaSessionId
            }
        });
    }

    await prisma.activoFijo.update({
        where: { id: renta.activoFijoId },
        data: {
            estatusContable: nuevoEstadoEquipo,
            ...(horasTrabajoRecibido ? { horasTrabajoActuales: horasTrabajoRecibido } : {})
        }
    });

    return true;
}
