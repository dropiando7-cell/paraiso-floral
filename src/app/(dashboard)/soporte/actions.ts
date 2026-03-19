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
    clienteId: string;
    equipoDano: string;
    marcaModelo?: string;
    accesorios?: string;
}) {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organización no encontrada');

    // Generar un código criptográfico corto para el QR 
    const codigoSeguridad = randomBytes(4).toString('hex').toUpperCase();

    const orden = await prisma.ordenTrabajo.create({
        data: {
            organizationId: org.id,
            clienteId: data.clienteId,
            equipoDano: data.equipoDano,
            marcaModelo: data.marcaModelo || null,
            accesorios: data.accesorios || null,
            codigoSeguridad,
            costoRevision: 650
        },
        include: { cliente: true }
    });

    // TODO: Disparar mensaje de WhatsApp aquí usando la lógica de Twilio
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
