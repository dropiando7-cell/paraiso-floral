'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function getOrgId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true, role: true },
    });
    if (!dbUser) redirect('/unauthorized');

    const allowedRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'INVENTARIO_EDITOR'];
    if (!allowedRoles.includes(dbUser.role)) {
        throw new Error('No tienes permisos suficientes (Requiere Administrador o Editor de Inventario)');
    }

    return dbUser.organizationId;
}

export async function getHistoricoPaginated(query: string, page: number = 1, limit: number = 10) {
    const orgId = await getOrgId();
    const skip = (page - 1) * limit;

    const whereClause: any = {
        organizationId: orgId,
    };

    if (query) {
        whereClause.OR = [
            { nombrePropiedad: { contains: query, mode: 'insensitive' } },
            { marca: { contains: query, mode: 'insensitive' } },
            { modelo: { contains: query, mode: 'insensitive' } },
            { serie: { contains: query, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.inventarioHistorico.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: {
                nombrePropiedad: 'asc'
            },
            include: {
                _count: {
                    select: { activosFijos: true }
                }
            }
        }),
        prisma.inventarioHistorico.count({ where: whereClause })
    ]);
    const serializedItems = items.map(item => ({
        ...item,
        costoAdquisicion: item.costoAdquisicion ? item.costoAdquisicion.toNumber() : null,
        vidaUtil: item.vidaUtil ? item.vidaUtil.toNumber() : null,
    }));

    return { items: serializedItems, total };
}

export async function updateHistorico(id: string, data: { nombrePropiedad?: string, marca?: string, modelo?: string, descripcionCorta?: string, observaciones?: string, serie?: string, imagenUrl?: string, imagenPlacaUrl?: string, descripcionDetallada?: string }) {
    const orgId = await getOrgId();

    // Configurar dueño / org
    const existing = await prisma.inventarioHistorico.findUnique({
        where: { id }
    });

    if (!existing || existing.organizationId !== orgId) throw new Error("Registro no encontrado o no pertenece a tu organización");

    await prisma.inventarioHistorico.update({
        where: { id },
        data: {
            // solo actualizamos si vienen definidos
            ...(data.nombrePropiedad !== undefined && { nombrePropiedad: data.nombrePropiedad }),
            ...(data.marca !== undefined && { marca: data.marca }),
            ...(data.modelo !== undefined && { modelo: data.modelo }),
            ...(data.descripcionCorta !== undefined && { descripcionCorta: data.descripcionCorta }),
            ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
            ...(data.serie !== undefined && { serie: data.serie }),
            ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl }),
            ...(data.imagenPlacaUrl !== undefined && { imagenPlacaUrl: data.imagenPlacaUrl }),
            ...(data.descripcionDetallada !== undefined && { descripcionDetallada: data.descripcionDetallada })
        }
    });

    revalidatePath('/inventario/historico');
    return { success: true };
}
