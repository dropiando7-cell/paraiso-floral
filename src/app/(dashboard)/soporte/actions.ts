'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

export async function getOrdenesActivas() {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organización no encontrada');

    return prisma.ordenTrabajo.findMany({
        where: {
            organizationId: org.id,
            estado: { not: 'ENTREGADO' }
        },
        include: {
            cliente: true
        },
        orderBy: { fechaRecibido: 'desc' }
    });
}

export async function getOrdenByQR(codigoSeguridad: string) {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organización no encontrada');

    return prisma.ordenTrabajo.findFirst({
        where: {
            organizationId: org.id,
            codigoSeguridad
        },
        include: {
            cliente: true
        }
    });
}

export async function createOrdenTrabajo(data: {
    cliente: string;
    telefono?: string;
    equipo: string;
    modelo?: string;
    serie?: string;
    marca?: string;
    descripcionFalla: string;
    fotosEstadoInicial?: string[];
    usuarioRecepcionId?: string;
}) {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organización no encontrada');

    // Find or create cliente
    let clienteRecord = await prisma.cliente.findFirst({
        where: { nombre: data.cliente, organizationId: org.id }
    });

    if (!clienteRecord) {
        clienteRecord = await prisma.cliente.create({
            data: {
                nombre: data.cliente,
                telefono: data.telefono,
                organizationId: org.id
            }
        });
    }

    // Generar un código criptográfico corto para el QR 
    const codigoSeguridad = randomBytes(4).toString('hex').toUpperCase();

    const marcaModelo = [data.marca, data.modelo].filter(Boolean).join(" ") || null;

    const orden = await prisma.ordenTrabajo.create({
        data: {
            organizationId: org.id,
            clienteId: clienteRecord.id,
            equipoDano: data.equipo === 'medico' ? 'Equipo Médico' : data.equipo === 'aire' ? 'Aire Acondicionado' : 'Otro',
            tipoAparato: data.equipo.toUpperCase(),
            marcaModelo,
            serie: data.serie || null,
            descripcionFalla: data.descripcionFalla,
            codigoSeguridad,
            fotosEstadoInicial: data.fotosEstadoInicial || [],
            costoRevision: 450,
            estado: 'RECIBIDO',
            usuarioRecepcionId: data.usuarioRecepcionId || null
        },
        include: { cliente: true }
    });

    // TODO: Mensaje WhatsApp
    // await sendWhatsApp(orden.cliente.telefono, codigoSeguridad, ...);

    revalidatePath('/soporte');
    return orden;
}

export async function updateEstadoOrden(id: string, nuevoEstado: string) {
    const data: any = { estado: nuevoEstado };

    if (nuevoEstado === 'EN_EVALUACION') data.fechaEvaluado = new Date();
    if (nuevoEstado === 'LISTO_ENTREGA') data.fechaListo = new Date();
    if (nuevoEstado === 'ENTREGADO') data.fechaEntregado = new Date();
    if (nuevoEstado === 'ESPERANDO_APROBACION') data.fechaEvaluado = new Date(); // Opcional

    const updated = await prisma.ordenTrabajo.update({
        where: { id },
        data
    });

    revalidatePath('/soporte');
    return updated;
}

export async function updateCostoReparacion(id: string, costo: number) {
    const updated = await prisma.ordenTrabajo.update({
        where: { id },
        data: {
            costoReparacion: costo
        }
    });
    revalidatePath('/soporte');
    return updated;
}

export async function entregarOrden(id: string) {
    const updated = await prisma.ordenTrabajo.update({
        where: { id },
        data: {
            estado: 'ENTREGADO',
            fechaEntregado: new Date()
        }
    });
    revalidatePath('/soporte');
    return updated;
}
