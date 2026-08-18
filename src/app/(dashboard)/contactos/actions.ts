'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

async function getOrgId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true }
    });
    if (!dbUser) throw new Error('Organización no encontrada');
    return dbUser.organizationId;
}

export async function fetchContactos(query: string, page: number = 1) {
    const orgId = await getOrgId();

    const pageSize = 15;
    const skip = (page - 1) * pageSize;

    const where = {
        organizationId: orgId,
        ...(query ? {
            OR: [
                { nombre: { contains: query, mode: 'insensitive' as any } },
                { email: { contains: query, mode: 'insensitive' as any } },
                { telefono: { contains: query, mode: 'insensitive' as any } },
                { rtn: { contains: query, mode: 'insensitive' as any } },
                { nombreContacto: { contains: query, mode: 'insensitive' as any } },
                { telefonoContacto: { contains: query, mode: 'insensitive' as any } },
                { departamento: { contains: query, mode: 'insensitive' as any } },
            ],
        } : {}),
    };

    const count = await prisma.cliente.count({ where });
    const data = await prisma.cliente.findMany({
        where,
        select: {
            id: true,
            nombre: true,
            rtn: true,
            telefono: true,
            email: true,
            direccion: true,
            departamento: true,
            nombreContacto: true,
            telefonoContacto: true,
            emailsCC: true,
            limiteCredito: true,
            saldoInicial: true,
            diasCredito: true,
            notas: true,
            createdAt: true
        },
        skip,
        take: pageSize,
        orderBy: { nombre: 'asc' },
    });

    return { 
      params: data.map(d => ({
        ...d,
        limiteCredito: d.limiteCredito ? Number(d.limiteCredito) : 0,
        saldoInicial: d.saldoInicial ? Number(d.saldoInicial) : 0,
        diasCredito: d.diasCredito || 15
      })), 
      totalPages: Math.ceil(count / pageSize), 
      count 
    };
}

export async function createContacto(data: { 
    nombre: string; 
    email?: string; 
    telefono?: string; 
    rtn?: string; 
    direccion?: string;
    departamento?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailsCC?: string;
    limiteCredito?: number;
    saldoInicial?: number;
    diasCredito?: number;
    notas?: string;
}) {
    const orgId = await getOrgId();

    const cleanNombre = data.nombre.trim().toUpperCase();
    const cleanNombreContacto = data.nombreContacto?.trim() ? data.nombreContacto.trim().toUpperCase() : null;

    const existe = await prisma.cliente.findFirst({
        where: {
            organizationId: orgId,
            nombre: {
                equals: cleanNombre,
                mode: 'insensitive'
            }
        }
    });

    if (existe) {
        throw new Error(`Ya existe un contacto con el nombre "${cleanNombre}".`);
    }

    const created = await prisma.cliente.create({
        data: {
            ...data,
            nombre: cleanNombre,
            nombreContacto: cleanNombreContacto,
            organizationId: orgId,
        },
    });

    revalidatePath('/contactos');
    return {
      ...created,
      limiteCredito: created.limiteCredito ? Number(created.limiteCredito) : 0,
      saldoInicial: created.saldoInicial ? Number(created.saldoInicial) : 0
    };
}

export async function updateContacto(id: string, data: { 
    nombre: string; 
    email?: string; 
    telefono?: string; 
    rtn?: string; 
    direccion?: string;
    departamento?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailsCC?: string;
    limiteCredito?: number;
    saldoInicial?: number;
    diasCredito?: number;
    notas?: string;
}) {
    const cleanNombre = data.nombre.trim().toUpperCase();
    const cleanNombreContacto = data.nombreContacto?.trim() ? data.nombreContacto.trim().toUpperCase() : null;

    const updated = await prisma.cliente.update({
        where: { id },
        data: {
            ...data,
            nombre: cleanNombre,
            nombreContacto: cleanNombreContacto,
        },
    });

    revalidatePath('/contactos');
    return {
      ...updated,
      limiteCredito: updated.limiteCredito ? Number(updated.limiteCredito) : 0,
      saldoInicial: updated.saldoInicial ? Number(updated.saldoInicial) : 0
    };
}

export async function deleteContacto(id: string) {
    await prisma.cliente.delete({ where: { id } });
    revalidatePath('/contactos');
    return true;
}

export async function updateSaldoInicialCliente(clienteId: string, nuevoSaldoInicial: number, notas?: string) {
    const updated = await prisma.cliente.update({
        where: { id: clienteId },
        data: {
            saldoInicial: nuevoSaldoInicial,
            ...(notas ? { notas: notas.trim() } : {})
        }
    });

    revalidatePath('/cxc');
    revalidatePath('/cxc/cliente/' + clienteId);
    revalidatePath('/contactos');
    return {
        success: true,
        saldoInicial: Number(updated.saldoInicial)
    };
}
