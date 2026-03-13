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
        select: { organizationId: true, role: true, accessibleModules: true },
    });
    if (!dbUser) redirect('/unauthorized');

    const allowedRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'INVENTARIO_EDITOR'];
    const hasModuleAccess = dbUser.accessibleModules?.includes('/inventario/historico');

    if (!allowedRoles.includes(dbUser.role) && !hasModuleAccess) {
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
        // Dividir la búsqueda en palabras y limpiar espacios
        const searchTerms = query.trim().split(/\s+/).filter(t => t.length > 0);

        if (searchTerms.length > 0) {
            // Requerimos que TODAS las palabras ingresadas coincidan con al menos ALGÚN campo
            whereClause.AND = searchTerms.map(term => ({
                OR: [
                    { nombrePropiedad: { contains: term, mode: 'insensitive' } },
                    { nombreOriginal: { contains: term, mode: 'insensitive' } },
                    { marca: { contains: term, mode: 'insensitive' } },
                    { modelo: { contains: term, mode: 'insensitive' } },
                    { serie: { contains: term, mode: 'insensitive' } },
                    { serieOriginal: { contains: term, mode: 'insensitive' } },
                    { descripcionCorta: { contains: term, mode: 'insensitive' } },
                    { descripcionDetallada: { contains: term, mode: 'insensitive' } },
                    { observaciones: { contains: term, mode: 'insensitive' } },
                    { cuentaContable: { contains: term, mode: 'insensitive' } },
                ]
            }));
        }
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

export async function updateHistorico(id: string, data: { nombrePropiedad?: string, marca?: string | null, modelo?: string | null, descripcionCorta?: string | null, observaciones?: string | null, serie?: string | null, imagenUrl?: string | null, imagenPlacaUrl?: string | null, descripcionDetallada?: string | null }) {
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

export async function splitHistorico(id: string) {
    const orgId = await getOrgId();

    const existing = await prisma.inventarioHistorico.findUnique({
        where: { id }
    });

    if (!existing || existing.organizationId !== orgId) {
        throw new Error("Registro no encontrado o no pertenece a tu organización");
    }

    if (existing.cantidad <= 1) {
        throw new Error("No se puede desdoblar un registro con cantidad 1 o menor");
    }

    // Usar transacción para asegurar desdoble atómico
    await prisma.$transaction(async (tx) => {
        // 1. Reducir en 1 el original
        await tx.inventarioHistorico.update({
            where: { id },
            data: {
                cantidad: existing.cantidad - 1,
            }
        });

        // 2. Crear una nueva copia exacta (pero cantidad = 1)
        // sin transferir relaciones ni IDs, y dejando el costo intacto (según requerimiento)
        await tx.inventarioHistorico.create({
            data: {
                organizationId: existing.organizationId,
                nombrePropiedad: existing.nombrePropiedad,
                cantidad: 1,
                nombreOriginal: existing.nombreOriginal,
                descripcionCorta: existing.descripcionCorta,
                descripcionDetallada: existing.descripcionDetallada,
                marca: existing.marca,
                modelo: existing.modelo,
                serie: existing.serie,
                serieOriginal: existing.serieOriginal,
                observaciones: existing.observaciones,
                imagenUrl: existing.imagenUrl,
                imagenPlacaUrl: existing.imagenPlacaUrl,
                fechaAdquisicion: existing.fechaAdquisicion,
                costoAdquisicion: existing.costoAdquisicion, // Sin dividir
                cuentaContable: existing.cuentaContable,
                vidaUtil: existing.vidaUtil,
            }
        });
    });

    revalidatePath('/inventario/historico');
    return { success: true };
}
