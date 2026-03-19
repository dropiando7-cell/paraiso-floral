'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function createRenta(data: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) throw new Error('Unauthorized');

    const clienteId = data.get('clienteId') as string;
    const activoFijoId = data.get('activoFijoId') as string;
    const fechaFinEsperada = data.get('fechaFinEsperada') as string;
    const costoRenta = parseFloat(data.get('costoRenta') as string) || 0;
    const deposito = parseFloat(data.get('deposito') as string) || 0;
    const notas = data.get('notas') as string;

    const renta = await prisma.rentaEquipo.create({
        data: {
            organizationId: dbUser.organizationId,
            clienteId,
            activoFijoId,
            fechaFinEsperada: new Date(fechaFinEsperada),
            costoRenta,
            deposito,
            notas,
            estado: 'ACTIVA',
        }
    });

    await prisma.activoFijo.update({
        where: { id: activoFijoId },
        data: { estatusContable: 'EN_RENTA' }
    });

    return renta;
}

export async function getClientesLista() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { organizationId: true } });
    if (!dbUser) return [];

    return prisma.cliente.findMany({
        where: { organizationId: dbUser.organizationId },
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true }
    });
}

export async function getEquiposDisponibles() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { organizationId: true } });
    if (!dbUser) return [];

    return prisma.activoFijo.findMany({
        where: { 
            organizationId: dbUser.organizationId,
            estatusContable: 'VIGENTE'
        },
        orderBy: { descripcionCorta: 'asc' },
        select: { id: true, descripcionCorta: true, serie: true, codigoBarras: true }
    });
}
