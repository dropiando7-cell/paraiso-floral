'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function getRentas() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) throw new Error('Unauthorized');

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
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) throw new Error('Unauthorized');

    // Mover a completado
    const renta = await prisma.rentaEquipo.update({
        where: { id: rentaId, organizationId: dbUser.organizationId },
        data: {
            estado: 'DEVUELTO',
            fechaDevolucion: new Date(),
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
