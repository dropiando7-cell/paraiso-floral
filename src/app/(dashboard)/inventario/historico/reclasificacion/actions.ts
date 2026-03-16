'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

// ─── Helper: Get authenticated org ID ────────────────────────────────────────
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

// Transform Prisma result to plain object (converting Decimals to Numbers)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeActivo(a: any) {
    return {
        ...a,
        costoAdquisicion: a.costoAdquisicion ? Number(a.costoAdquisicion) : null,
        vidaUtil: a.vidaUtil ? Number(a.vidaUtil) : null,
    };
}

export async function getActivosPorReclasificar(limit = 20, umbral = 2000, operador: 'lte' | 'gte' = 'lte') {
    const orgId = await getOrgId();
    
    const costFilter = operador === 'lte' ? { lte: umbral } : { gte: umbral };

    const items = await prisma.inventarioHistorico.findMany({
        where: {
            organizationId: orgId,
            costoAdquisicion: costFilter,
            clasificacion: 'ACTIVO' // O null por seguridad de registros viejos
        },
        orderBy: operador === 'lte' ? { costoAdquisicion: 'desc' } : { costoAdquisicion: 'asc' },
        take: limit
    });
    
    // Recuperar todos los null en caso que el default no aplicara a los viejos
    if(items.length < limit) {
         const itemsNulls = await prisma.inventarioHistorico.findMany({
            where: {
                organizationId: orgId,
                costoAdquisicion: costFilter,
                clasificacion: null
            },
            orderBy: operador === 'lte' ? { costoAdquisicion: 'desc' } : { costoAdquisicion: 'asc' },
            take: limit - items.length
        });
        items.push(...itemsNulls);
    }

    return items.map(serializeActivo);
}

export async function setEquipoMenor(id: string) {
    const orgId = await getOrgId();
    await prisma.inventarioHistorico.updateMany({
        where: { id, organizationId: orgId },
        data: { clasificacion: 'EQUIPO_MENOR' }
    });
    return { success: true };
}

export async function revertirEquipoMenor(id: string) {
    const orgId = await getOrgId();
    await prisma.inventarioHistorico.updateMany({
        where: { id, organizationId: orgId },
        data: { clasificacion: 'ACTIVO' }
    });
    return { success: true };
}

export async function getResumenReclasificacion(umbral = 2000, operador: 'lte' | 'gte' = 'lte') {
    const orgId = await getOrgId();
    
    const costFilter = operador === 'lte' ? { lte: umbral } : { gte: umbral };

    const equiposMenores = await prisma.inventarioHistorico.aggregate({
        where: { organizationId: orgId, clasificacion: 'EQUIPO_MENOR' },
        _count: { id: true },
        _sum: { costoAdquisicion: true }
    });

    const activosRestantes = await prisma.inventarioHistorico.aggregate({
        where: { 
            organizationId: orgId, 
            costoAdquisicion: costFilter,
            OR: [
                { clasificacion: 'ACTIVO' },
                { clasificacion: null }
            ]
        },
        _count: { id: true },
        _sum: { costoAdquisicion: true }
    });
    
    return {
        equipoMenor: {
            cantidad: equiposMenores._count?.id || 0,
            total: Number(equiposMenores._sum?.costoAdquisicion || 0)
        },
        pendientesDeRevisar: {
            cantidad: activosRestantes._count?.id || 0,
            total: Number(activosRestantes._sum?.costoAdquisicion || 0)
        }
    };
}

export async function getReporteEquipoMenor(page = 1, limit = 50) {
    const orgId = await getOrgId();
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        prisma.inventarioHistorico.findMany({
            where: { organizationId: orgId, clasificacion: 'EQUIPO_MENOR' },
            orderBy: { fechaAdquisicion: 'desc' },
            skip,
            take: limit
        }),
        prisma.inventarioHistorico.count({
            where: { organizationId: orgId, clasificacion: 'EQUIPO_MENOR' }
        })
    ]);

    return { items: items.map(serializeActivo), total, totalPages: Math.ceil(total / limit) };
}
