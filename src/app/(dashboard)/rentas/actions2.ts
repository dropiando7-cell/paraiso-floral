'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function createRenta(data: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) throw new Error('Unauthorized');

    let clienteId = data.get('clienteId') as string;
    const nuevoClienteNombre = data.get('nuevoClienteNombre') as string;
    
    const activoFijoId = data.get('activoFijoId') as string;
    const fechaFinEsperada = data.get('fechaFinEsperada') as string;
    const costoRenta = parseFloat(data.get('costoRenta') as string) || 0;
    const deposito = parseFloat(data.get('deposito') as string) || 0;
    const notas = data.get('notas') as string;
    const tipoAlquiler = data.get('tipoAlquiler') as string || 'Mensual';
    const mesesRenta = parseInt(data.get('mesesRenta') as string) || 1;
    const horasTrabajoSalida = data.get('horasTrabajoSalida') as string;
    const accesoriosIncluidos = data.get('accesoriosIncluidos') as string;
    const telefono = data.get('telefono') as string;
    const direccion = data.get('direccion') as string;

    if (clienteId === 'NEW' && nuevoClienteNombre) {
        const nuevoCliente = await prisma.cliente.create({
            data: {
                organizationId: dbUser.organizationId,
                nombre: nuevoClienteNombre,
                ...(telefono ? { telefono } : {}),
                ...(direccion ? { direccion } : {})
            }
        });
        clienteId = nuevoCliente.id;
    } else if (telefono || direccion) {
        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                ...(telefono ? { telefono } : {}),
                ...(direccion ? { direccion } : {})
            }
        });
    }

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
            tipoAlquiler,
            mesesRenta,
            horasTrabajoSalida,
            accesoriosIncluidos,
            creadoPorId: dbUser.id,
        }
    });

    await prisma.activoFijo.update({
        where: { id: activoFijoId },
        data: { estatusContable: 'EN_RENTA' }
    });

    return {
        ...renta,
        costoRenta: Number(renta.costoRenta),
        deposito: Number(renta.deposito),
    };
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
            estatusContable: 'VIGENTE',
            esParaRenta: true
        },
        orderBy: { descripcionCorta: 'asc' },
        select: { id: true, descripcionCorta: true, serie: true, codigoBarras: true }
    });
}
