'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function createRenta(data: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) redirect('/login');

    let clienteId = data.get('clienteId') as string;
    const nuevoClienteNombre = data.get('nuevoClienteNombre') as string;
    const nuevoClienteRtn = data.get('nuevoClienteRtn') as string;
    
    const activoFijoId = data.get('activoFijoId') as string;
    const fechaFinEsperada = data.get('fechaFinEsperada') as string;
    const costoRenta = parseFloat(data.get('costoRenta') as string) || 0;
    const deposito = parseFloat(data.get('deposito') as string) || 0;
    const notas = data.get('notas') as string;
    const tipoAlquiler = data.get('tipoAlquiler') as string || 'Mensual';
    const mesesRenta = parseInt(data.get('mesesRenta') as string) || 1;
    const horasTrabajoSalida = data.get('horasTrabajoSalida') as string;
    const accesoriosIncluidos = data.get('accesoriosIncluidos') as string;
    let telefono = data.get('telefono') as string;
    if (telefono && telefono.trim() === '+504') {
        telefono = '';
    }
    const direccion = data.get('direccion') as string;

    let evidenciaFotos: string[] = [];
    try {
        const rawFotos = data.get('evidenciaFotos') as string;
        if (rawFotos) evidenciaFotos = JSON.parse(rawFotos);
    } catch (e) {
        console.error("Error parsing fotos:", e);
    }

    if (clienteId === 'NEW' && nuevoClienteNombre) {
        const clienteExistente = await prisma.cliente.findFirst({
            where: {
                organizationId: dbUser.organizationId,
                nombre: {
                    equals: nuevoClienteNombre.trim(),
                    mode: 'insensitive'
                }
            }
        });
        if (clienteExistente) {
            clienteId = clienteExistente.id;
        } else {
            const nuevoCliente = await prisma.cliente.create({
                data: {
                    organizationId: dbUser.organizationId,
                    nombre: nuevoClienteNombre.trim(),
                    ...(nuevoClienteRtn ? { rtn: nuevoClienteRtn } : {}),
                    ...(telefono && telefono.trim() !== '+504' ? { telefono } : {}),
                    ...(direccion ? { direccion } : {})
                }
            });
            clienteId = nuevoCliente.id;
        }
    } else if (telefono || direccion) {
        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                ...(telefono && telefono.trim() !== '+504' ? { telefono } : {}),
                ...(direccion ? { direccion } : {})
            }
        });
    }

    const isDirecto = data.get('isDirecto') === 'true';
    const fechaInicioStr = data.get('fechaInicio') as string;
    
    const renta = await prisma.rentaEquipo.create({
        data: {
            organizationId: dbUser.organizationId,
            clienteId,
            activoFijoId,
            fechaInicio: isDirecto && fechaInicioStr ? new Date(fechaInicioStr + 'T12:00:00Z') : new Date(),
            fechaFinEsperada: new Date(fechaFinEsperada + 'T12:00:00Z'),
            costoRenta,
            deposito,
            notas,
            estado: isDirecto ? 'ACTIVA' : 'PENDIENTE_FIRMA',
            tipoAlquiler,
            mesesRenta,
            horasTrabajoSalida,
            accesoriosIncluidos,
            evidenciaFotos,
            creadoPorId: dbUser.id,
        }
    });

    const metodoPagoDeposito = data.get('metodoPagoDeposito') as string;
    if (deposito > 0 && metodoPagoDeposito && metodoPagoDeposito !== 'Ninguno') {
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
                monto: deposito,
                metodoPago: metodoPagoDeposito,
                notas: "Depósito en Garantía (Recibido)",
                creadoPorId: dbUser.id,
                cajaSessionId
            }
        });
    }

    // Marcar el equipo como EN_RENTA y guardar horas actuales
    await prisma.activoFijo.update({
        where: { id: activoFijoId },
        data: { 
            estatusContable: 'EN_RENTA',
            ...(horasTrabajoSalida ? { horasTrabajoActuales: horasTrabajoSalida } : {})
        }
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
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { organizationId: true } });
    if (!dbUser) redirect('/login');

    return prisma.cliente.findMany({
        where: { organizationId: dbUser.organizationId },
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true }
    });
}

export async function getEquiposDisponibles() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { organizationId: true } });
    if (!dbUser) redirect('/login');

    return prisma.activoFijo.findMany({
        where: { 
            organizationId: dbUser.organizationId,
            estatusContable: 'VIGENTE',
            esParaRenta: true
        },
        orderBy: { descripcionCorta: 'asc' },
        select: { id: true, descripcionCorta: true, serie: true, codigoBarras: true, horasTrabajoActuales: true }
    });
}
