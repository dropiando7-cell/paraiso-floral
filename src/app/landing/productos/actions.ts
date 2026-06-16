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
    } catch (e: any) {
        console.error('Error toggling visibility:', e);
        return { success: false, error: e.message || 'Error al cambiar visibilidad' };
    }
}
