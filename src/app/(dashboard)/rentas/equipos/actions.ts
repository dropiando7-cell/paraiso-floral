'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

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

export async function getEquiposParaRenta(page = 1, search = '', area = '', estatus = '') {
    const orgId = await getOrgId();
    const PER_PAGE = 10;
    const skip = (page - 1) * PER_PAGE;

    const where = {
        organizationId: orgId,
        esParaRenta: true,
        ...(search && {
            OR: [
                { descripcionCorta: { contains: search, mode: 'insensitive' as const } },
                { idQr: { contains: search, mode: 'insensitive' as const } },
                { codigoBarras: { contains: search, mode: 'insensitive' as const } },
                { serie: { contains: search, mode: 'insensitive' as const } },
                { modelo: { contains: search, mode: 'insensitive' as const } },
            ],
        }),
        ...(area && { area }),
        ...(estatus && { estatusContable: estatus }),
    };

    const activos = await prisma.activoFijo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: PER_PAGE,
        include: { categoria: true, createdBy: { select: { nombre: true, apellido: true, email: true } } },
    });
    const total = await prisma.activoFijo.count({ where });

    const plainActivos = activos.map(a => ({
        ...a,
        costoAdq: a.costoAdq ? Number(a.costoAdq) : null,
        vidaUtilOverride: a.vidaUtilOverride ? Number(a.vidaUtilOverride) : null,
        valResidual: a.valResidual ? Number(a.valResidual) : null,
        baseDeprec: a.baseDeprec ? Number(a.baseDeprec) : null,
        deprecMensual: a.deprecMensual ? Number(a.deprecMensual) : null,
        deprecAcum: a.deprecAcum ? Number(a.deprecAcum) : null,
        valorLibros: a.valorLibros ? Number(a.valorLibros) : null,
    }));

    return { activos: plainActivos, total, totalPages: Math.ceil(total / PER_PAGE) };
}

export async function getRentaStats(area?: string) {
    const orgId = await getOrgId();
    const { Prisma } = await import('@prisma/client');

    const statsRaw = await prisma.$queryRaw<
        Array<{
            total: bigint;
            vigente: bigint;
            depreciado: bigint;
            proceso_baja: bigint;
            con_dano: bigint;
            areas_count: bigint;
        }>
    >`
        WITH org_areas AS (
            SELECT COUNT(DISTINCT "area") as areas_count 
            FROM "activos_fijos" 
            WHERE "organizationId" = ${orgId}::uuid AND "esParaRenta" = true
            ${area ? Prisma.sql`AND "area" = ${area}` : Prisma.empty}
        )
        SELECT 
            COALESCE(SUM("stock"), 0) as total,
            COALESCE(SUM("stock") FILTER (WHERE "estatusContable" = 'VIGENTE'), 0) as vigente,
            COALESCE(SUM("stock") FILTER (WHERE "estatusContable" = 'DEPRECIADO'), 0) as depreciado,
            COALESCE(SUM("stock") FILTER (WHERE "estatusContable" = 'PROCESO DE BAJA'), 0) as proceso_baja,
            COALESCE(SUM("stock") FILTER (WHERE "estadoDano" IS NOT NULL), 0) as con_dano,
            (SELECT areas_count FROM org_areas)
        FROM "activos_fijos"
        WHERE "organizationId" = ${orgId}::uuid AND "esParaRenta" = true
        ${area ? Prisma.sql`AND "area" = ${area}` : Prisma.empty}
    `;

    const row = statsRaw[0];

    return {
        total: Number(row?.total || 0),
        vigente: Number(row?.vigente || 0),
        depreciado: Number(row?.depreciado || 0),
        procesoBaja: Number(row?.proceso_baja || 0),
        conDano: Number(row?.con_dano || 0),
        areasRegistradas: Number(row?.areas_count || 0)
    };
}
