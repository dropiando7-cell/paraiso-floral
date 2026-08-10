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

    const pageSize = 10;
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

export async function createContacto(data: { 
    nombre: string; 
    email?: string; 
    telefono?: string; 
    rtn?: string; 
    direccion?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailsCC?: string;
}) {
    const orgId = await getOrgId();

    const cleanNombre = data.nombre.trim();
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
            organizationId: orgId,
        },
    });

    revalidatePath('/contactos');
    return created;
}

export async function updateContacto(id: string, data: { 
    nombre: string; 
    email?: string; 
    telefono?: string; 
    rtn?: string; 
    direccion?: string;
    nombreContacto?: string;
    telefonoContacto?: string;
    emailsCC?: string;
}) {
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
