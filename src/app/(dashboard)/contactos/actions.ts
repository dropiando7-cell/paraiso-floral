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

export async function fetchContactos(
    query: string, 
    page: number = 1,
    filtroRuta: string = '',
    filtroVendedorId: string = ''
) {
    const orgId = await getOrgId();

    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where: any = {
        organizationId: orgId,
    };

    if (filtroRuta && filtroRuta !== 'TODOS') {
        if (filtroRuta === 'SIN_RUTA') {
            where.ruta = null;
        } else {
            where.ruta = { equals: filtroRuta, mode: 'insensitive' };
        }
    }

    if (filtroVendedorId && filtroVendedorId !== 'TODOS') {
        if (filtroVendedorId === 'SIN_VENDEDOR') {
            where.vendedorId = null;
        } else {
            where.vendedorId = filtroVendedorId;
        }
    }

    if (query && query.trim()) {
        const q = query.trim();
        where.OR = [
            { nombre: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { telefono: { contains: q, mode: 'insensitive' } },
            { rtn: { contains: q, mode: 'insensitive' } },
            { nombreContacto: { contains: q, mode: 'insensitive' } },
            { telefonoContacto: { contains: q, mode: 'insensitive' } },
            { departamento: { contains: q, mode: 'insensitive' } },
            { ruta: { contains: q, mode: 'insensitive' } },
            { alias: { contains: q, mode: 'insensitive' } },
            { direccion: { contains: q, mode: 'insensitive' } },
            {
                vendedor: {
                    OR: [
                        { nombre: { contains: q, mode: 'insensitive' } },
                        { apellido: { contains: q, mode: 'insensitive' } },
                    ]
                }
            }
        ];
    }

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
            saldoFavor: true,
            diasCredito: true,
            notas: true,
            ruta: true,
            alias: true,
            vendedorId: true,
            vendedor: {
                select: {
                    id: true,
                    nombre: true,
                    apellido: true,
                    email: true
                }
            },
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
        saldoFavor: d.saldoFavor ? Number(d.saldoFavor) : 0,
        diasCredito: d.diasCredito || 15
      })), 
      totalPages: Math.ceil(count / pageSize), 
      count 
    };
}

export async function fetchRutasExistentes() {
    const orgId = await getOrgId();
    const clientes = await prisma.cliente.findMany({
        where: { organizationId: orgId, ruta: { not: null } },
        distinct: ['ruta'],
        select: { ruta: true }
    });
    const set = new Set<string>([
        'Ruta Occidente',
        'Ruta La Esperanza',
        'Ruta Guamilito / Progreso',
        'Cartera Francis Carías',
        'Nacional / Todas las Rutas'
    ]);
    clientes.forEach(c => {
        if (c.ruta?.trim()) set.add(c.ruta.trim());
    });
    return Array.from(set).sort();
}

export async function asignarRutaYVendedorMasivo(
    clienteIds: string[],
    data: {
        ruta?: string | null;
        vendedorId?: string | null;
    }
) {
    if (!clienteIds || clienteIds.length === 0) {
        throw new Error('No se seleccionaron clientes.');
    }
    const orgId = await getOrgId();

    const updateData: any = {};
    if (data.ruta !== undefined) {
        updateData.ruta = data.ruta && data.ruta.trim() ? data.ruta.trim() : null;
    }
    if (data.vendedorId !== undefined) {
        updateData.vendedorId = data.vendedorId ? data.vendedorId : null;
    }

    if (Object.keys(updateData).length === 0) {
        return { success: false, count: 0 };
    }

    await prisma.cliente.updateMany({
        where: {
            id: { in: clienteIds },
            organizationId: orgId
        },
        data: updateData
    });

    revalidatePath('/contactos');
    revalidatePath('/cxc');
    return { success: true, count: clienteIds.length };
}

export async function fetchVendedores() {
    const orgId = await getOrgId();
    return prisma.user.findMany({
        where: {
            organizationId: orgId,
            isAssignable: true
        },
        select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            role: true,
            puesto: true,
            rutasAsignadas: true,
            puedeVerTodasCxC: true
        },
        orderBy: { nombre: 'asc' }
    });
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
    vendedorId?: string | null;
    ruta?: string | null;
    alias?: string | null;
}) {
    const orgId = await getOrgId();

    const cleanNombre = data.nombre.trim().toUpperCase();
    const cleanNombreContacto = data.nombreContacto?.trim() ? data.nombreContacto.trim().toUpperCase() : null;
    const cleanAlias = data.alias?.trim() ? data.alias.trim().toUpperCase() : null;

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
            alias: cleanAlias,
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
    vendedorId?: string | null;
    ruta?: string | null;
    alias?: string | null;
}) {
    const cleanNombre = data.nombre.trim().toUpperCase();
    const cleanNombreContacto = data.nombreContacto?.trim() ? data.nombreContacto.trim().toUpperCase() : null;
    const cleanAlias = data.alias !== undefined ? (data.alias?.trim() ? data.alias.trim().toUpperCase() : null) : undefined;

    const updated = await prisma.cliente.update({
        where: { id },
        data: {
            ...data,
            nombre: cleanNombre,
            nombreContacto: cleanNombreContacto,
            ...(cleanAlias !== undefined ? { alias: cleanAlias } : {})
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

export async function updateSaldoInicialCliente(clienteId: string, nuevoSaldoInicial: number, notas?: string, fecha?: Date | null) {
    const updated = await prisma.cliente.update({
        where: { id: clienteId },
        data: {
            saldoInicial: nuevoSaldoInicial,
            fechaSaldoInicial: fecha || null,
            ...(notas ? { notas: notas.trim() } : {})
        }
    });

    revalidatePath('/cxc');
    revalidatePath('/cxc/cliente/' + clienteId);
    revalidatePath('/contactos');
    return {
        success: true,
        saldoInicial: Number(updated.saldoInicial),
        fechaSaldoInicial: updated.fechaSaldoInicial
    };
}

export async function eliminarSaldoInicialCliente(clienteId: string, motivo: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true, role: true, nombre: true, apellido: true }
    });
    if (!dbUser) throw new Error('Usuario no encontrado');
    if (dbUser.role !== 'SUPER_ADMIN') {
        throw new Error('Solo el Super Administrador puede eliminar el saldo inicial.');
    }
    const motivoLimpio = (motivo || '').trim();
    if (!motivoLimpio) throw new Error('Debes indicar el motivo.');

    const cliente = await prisma.cliente.findFirst({
        where: { id: clienteId, organizationId: dbUser.organizationId },
        select: { id: true, nombre: true, saldoInicial: true, fechaSaldoInicial: true }
    });
    if (!cliente) throw new Error('Cliente no encontrado');

    const saldoAnterior = Number(cliente.saldoInicial || 0);

    await prisma.$transaction(async (tx) => {
        await tx.cliente.update({
            where: { id: clienteId },
            data: { saldoInicial: 0, fechaSaldoInicial: null }
        });
        await tx.activityLog.create({
            data: {
                organizationId: dbUser.organizationId,
                userId: dbUser.id,
                action: 'DELETE',
                module: '/cxc/saldo-inicial',
                description: `Saldo inicial Excel eliminado (L. ${saldoAnterior.toFixed(2)}) de ${cliente.nombre}. Motivo: ${motivoLimpio}`,
                metadata: {
                    clienteId,
                    saldoInicialAnterior: saldoAnterior,
                    fechaSaldoInicialAnterior: cliente.fechaSaldoInicial,
                    motivo: motivoLimpio,
                    usuario: [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ')
                }
            }
        });
    });

    revalidatePath('/cxc');
    revalidatePath('/cxc/cliente/' + clienteId);
    revalidatePath('/contactos');
    return { success: true, saldoInicialAnterior: saldoAnterior };
}

export async function getSaldoFavorCliente(clienteId: string) {
    if (!clienteId) return 0;
    const orgId = await getOrgId();
    const c = await prisma.cliente.findFirst({
        where: { id: clienteId, organizationId: orgId },
        select: { saldoFavor: true }
    });
    return c?.saldoFavor ? Number(c.saldoFavor) : 0;
}

export async function updateSaldoFavorCliente(
    clienteId: string,
    montoAAgregar: number,
    motivo?: string,
    facturaId?: string | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true, nombre: true, apellido: true }
    });
    if (!dbUser) throw new Error('Organización no encontrada');
    const orgId = dbUser.organizationId;

    const motivoLimpio = (motivo || '').trim();
    if (!motivoLimpio) throw new Error('Debes indicar el motivo del movimiento.');
    if (!montoAAgregar || isNaN(montoAAgregar)) throw new Error('Monto inválido.');

    const cliente = await prisma.cliente.findFirst({
        where: { id: clienteId, organizationId: orgId }
    });
    if (!cliente) throw new Error('Cliente no encontrado');

    let facturaCorrelativo: string | null = null;
    if (facturaId) {
        const f = await prisma.factura.findFirst({
            where: { id: facturaId, clienteId, organizationId: orgId },
            select: { correlativo: true }
        });
        if (!f) throw new Error('La factura relacionada no pertenece a este cliente.');
        facturaCorrelativo = f.correlativo;
    }

    const saldoActual = cliente.saldoFavor ? Number(cliente.saldoFavor) : 0;
    const nuevoSaldo = Math.round((saldoActual + montoAAgregar) * 100) / 100;
    if (nuevoSaldo < 0) {
        throw new Error('El monedero no puede quedar con saldo negativo.');
    }

    const updated = await prisma.$transaction(async (tx) => {
        const up = await tx.cliente.update({
            where: { id: clienteId },
            data: { saldoFavor: nuevoSaldo }
        });
        await tx.activityLog.create({
            data: {
                organizationId: orgId,
                userId: dbUser.id,
                action: montoAAgregar > 0 ? 'MONEDERO_ABONO' : 'MONEDERO_CARGO',
                module: '/cxc/monedero',
                description: `${montoAAgregar > 0 ? 'Saldo a favor agregado' : 'Saldo a favor restado'} L. ${Math.abs(montoAAgregar).toFixed(2)} a ${cliente.nombre}. Motivo: ${motivoLimpio}${facturaCorrelativo ? ` (Factura ${facturaCorrelativo})` : ''}`,
                metadata: {
                    clienteId,
                    monto: montoAAgregar,
                    saldoAnterior: saldoActual,
                    saldoNuevo: nuevoSaldo,
                    motivo: motivoLimpio,
                    facturaId: facturaId || null,
                    facturaCorrelativo,
                    usuario: [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ')
                }
            }
        });
        return up;
    });

    revalidatePath('/cxc');
    revalidatePath('/cxc/cliente/' + clienteId);
    revalidatePath('/contactos');
    return {
        success: true,
        saldoFavor: Number(updated.saldoFavor)
    };
}
