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
        select: { organizationId: true },
    });
    if (!dbUser) redirect('/unauthorized');
    return dbUser.organizationId;
}

export async function getHistoricoPaginated(query: string, page: number = 1, limit: number = 50) {
    const orgId = await getOrgId();
    const skip = (page - 1) * limit;

    const whereClause: any = {
        organizationId: orgId,
    };

    if (query) {
        whereClause.OR = [
            { nombrePropiedad: { contains: query, mode: 'insensitive' } },
            { marcaModelo: { contains: query, mode: 'insensitive' } },
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

    return { items, total };
}

export async function updateHistorico(id: string, data: { nombrePropiedad?: string, marcaModelo?: string }) {
    const orgId = await getOrgId();

    // Configurar dueño / org
    const existing = await prisma.inventarioHistorico.findUnique({
        where: { id }
    });

    if (!existing || existing.organizationId !== orgId) throw new Error("Registro no encontrado o no pertenece a tu organización");

    await prisma.inventarioHistorico.update({
        where: { id },
        data: {
            // solo actualizamos nombrePropiedad y marcaModelo si vienen definidos
            ...(data.nombrePropiedad !== undefined && { nombrePropiedad: data.nombrePropiedad }),
            ...(data.marcaModelo !== undefined && { marcaModelo: data.marcaModelo })
        }
    });

    revalidatePath('/inventario/historico');
    return { success: true };
}
