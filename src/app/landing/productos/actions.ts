'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const getUuidFromParam = (param: string) => {
    const parts = param.split('-');
    if (parts.length >= 5) {
        return parts.slice(0, 5).join('-');
    }
    return param;
};

async function checkAdminAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        throw new Error('No autorizado');
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, accessibleModules: true }
    });

    if (!dbUser) {
        throw new Error('Permisos insuficientes');
    }

    const hasWebAccess = dbUser.accessibleModules.includes('/admin/gestion-web');

    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && !hasWebAccess) {
        throw new Error('Permisos insuficientes');
    }

    return dbUser;
}

export async function toggleItemVisibility(id: string, type: 'activo' | 'producto', makeVisible: boolean) {
    try {
        await checkAdminAuth();
        const itemId = getUuidFromParam(id);

        if (type === 'activo') {
            await prisma.activoFijo.update({
                where: { id: itemId },
                data: { estatusContable: makeVisible ? 'VIGENTE' : 'OCULTO' }
            });
        } else {
            await prisma.producto.update({
                where: { id: itemId },
                data: { estado: makeVisible ? 'ACTIVO' : 'OCULTO' }
            });
        }

        revalidatePath('/landing/productos');
        revalidatePath('/landing/productos/[category]/[id]');
        revalidatePath('/admin/gestion-web');
        return { success: true };
    } catch (e: unknown) {
        const err = e as Error;
        console.error('Error toggling visibility:', err);
        return { success: false, error: err.message || 'Error al cambiar visibilidad' };
    }
}

export async function deleteLandingItem(id: string, type: 'activo' | 'producto') {
    try {
        await checkAdminAuth();
        const itemId = getUuidFromParam(id);

        if (type === 'activo') {
            try {
                // Try complete deletion first
                await prisma.activoFijo.delete({
                    where: { id: itemId }
                });
            } catch (deleteError) {
                console.warn('Could not hard delete activo, marking as ELIMINADO:', deleteError);
                // Fallback to soft delete
                await prisma.activoFijo.update({
                    where: { id: itemId },
                    data: { estatusContable: 'ELIMINADO' }
                });
            }
        } else {
            try {
                // Try complete deletion first
                await prisma.producto.delete({
                    where: { id: itemId }
                });
            } catch (deleteError) {
                console.warn('Could not hard delete producto, marking as INACTIVO:', deleteError);
                // Fallback to soft delete
                await prisma.producto.update({
                    where: { id: itemId },
                    data: { estado: 'INACTIVO' }
                });
            }
        }

        revalidatePath('/landing/productos');
        revalidatePath('/admin/gestion-web');
        return { success: true };
    } catch (e: unknown) {
        const err = e as Error;
        console.error('Error deleting landing item:', err);
        return { success: false, error: err.message || 'Error al eliminar el producto' };
    }
}

export async function bulkToggleItemVisibility(items: { id: string; type: 'activo' | 'producto' }[], makeVisible: boolean) {
    try {
        await checkAdminAuth();

        for (const item of items) {
            const itemId = getUuidFromParam(item.id);
            if (item.type === 'activo') {
                await prisma.activoFijo.update({
                    where: { id: itemId },
                    data: { estatusContable: makeVisible ? 'VIGENTE' : 'OCULTO' }
                });
            } else {
                await prisma.producto.update({
                    where: { id: itemId },
                    data: { estado: makeVisible ? 'ACTIVO' : 'OCULTO' }
                });
            }
        }

        revalidatePath('/landing/productos');
        revalidatePath('/landing/productos/[category]/[id]');
        revalidatePath('/admin/gestion-web');
        return { success: true };
    } catch (e: unknown) {
        const err = e as Error;
        console.error('Error in bulk visibility toggle:', err);
        return { success: false, error: err.message || 'Error al cambiar visibilidad en lote' };
    }
}

export async function bulkDeleteLandingItems(items: { id: string; type: 'activo' | 'producto' }[]) {
    try {
        await checkAdminAuth();

        for (const item of items) {
            const itemId = getUuidFromParam(item.id);
            if (item.type === 'activo') {
                try {
                    await prisma.activoFijo.delete({
                        where: { id: itemId }
                    });
                } catch {
                    await prisma.activoFijo.update({
                        where: { id: itemId },
                        data: { estatusContable: 'ELIMINADO' }
                    });
                }
            } else {
                try {
                    await prisma.producto.delete({
                        where: { id: itemId }
                    });
                } catch {
                    await prisma.producto.update({
                        where: { id: itemId },
                        data: { estado: 'INACTIVO' }
                    });
                }
            }
        }

        revalidatePath('/landing/productos');
        revalidatePath('/admin/gestion-web');
        return { success: true };
    } catch (e: unknown) {
        const err = e as Error;
        console.error('Error in bulk delete:', err);
        return { success: false, error: err.message || 'Error al eliminar productos en lote' };
    }
}
