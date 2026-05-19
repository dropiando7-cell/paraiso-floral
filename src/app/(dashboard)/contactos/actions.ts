'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function fetchContactos(query: string, page: number = 1) {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Org no encontrada');

    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where = {
        organizationId: org.id,
        ...(query ? {
            OR: [
                { nombre: { contains: query, mode: 'insensitive' as any } },
                { email: { contains: query, mode: 'insensitive' as any } },
                { telefono: { contains: query, mode: 'insensitive' as any } },
                { rtn: { contains: query, mode: 'insensitive' as any } },
            ],
        } : {}),
    };

    const count = await prisma.cliente.count({ where });
    const data = await prisma.cliente.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nombre: 'asc' },
    });

    return { params: data, totalPages: Math.ceil(count / pageSize), count };
}

export async function createContacto(data: { nombre: string; email?: string; telefono?: string; rtn?: string; direccion?: string }) {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Org no encontrada');

    const cleanNombre = data.nombre.trim();
    const existe = await prisma.cliente.findFirst({
        where: {
            organizationId: org.id,
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
            organizationId: org.id,
        },
    });

    revalidatePath('/contactos');
    return created;
}

export async function updateContacto(id: string, data: { nombre: string; email?: string; telefono?: string; rtn?: string; direccion?: string }) {
    const updated = await prisma.cliente.update({
        where: { id },
        data,
    });

    revalidatePath('/contactos');
    return updated;
}

export async function deleteContacto(id: string) {
    await prisma.cliente.delete({ where: { id } });
    revalidatePath('/contactos');
    return true;
}
