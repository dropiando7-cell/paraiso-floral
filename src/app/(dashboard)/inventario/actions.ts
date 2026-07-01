'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { uploadToR2 } from '@/lib/storage/r2';
import { redirect } from 'next/navigation';
import { calcDepreciacion } from '@/lib/depreciation';

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

// ─── Helper: Get authenticated user context ──────────────────────────────────
async function getContextUser(): Promise<{ orgId: string, userId: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) redirect('/unauthorized');
    return { orgId: dbUser.organizationId, userId: dbUser.id };
}

// Se eliminaron las constantes estáticas PREFIX_MAP y QR_TO_AREA_MAP 
// porque ahora se usa el modelo Area desde Prisma.

// ─── Auto-generate ID QR ─────────────────────────────────────────────────────
async function generateIdQr(organizationId: string, area: string, codigoGrupo: string = '001', cantidadRegistros: number = 1): Promise<string[]> {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { qrPrefix: true } });
    const prefijoBase = org?.qrPrefix || 'BEA';


    const todos = await prisma.activoFijo.findMany({
        where: { 
            organizationId,
            idQr: { startsWith: `${prefijoBase}-` }
        },
        select: { idQr: true }
    });

    let maxCorrelativo = 0;
    for (const act of todos) {
        const parts = act.idQr.split('-');
        if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            if (!isNaN(Number(lastPart))) {
                const num = Number(lastPart);
                if (num > maxCorrelativo) maxCorrelativo = num;
            }
        }
    }

    const startNum = maxCorrelativo + 1;
    const ids = [];

    for (let i = 0; i < cantidadRegistros; i++) {
        const numPart = String(startNum + i).padStart(6, '0');
        ids.push(`${prefijoBase}-${codigoGrupo}-${numPart}`);
    }

    return ids;
}

// ─── Autocompletar Groupos Existentes ─────────────────────────────────────────
export async function getGruposAutocompletado() {
    try {
        const orgId = await getOrgId();

        // Agrupar por descripcionCorta para obtener cantidad
        const agrupados = await prisma.activoFijo.groupBy({
            by: ['descripcionCorta'],
            where: { organizationId: orgId, esParaRenta: false },
            _count: { id: true }
        });

        const resultados = [];
        for (const g of agrupados) {
            const last = await prisma.activoFijo.findFirst({
                where: { organizationId: orgId, descripcionCorta: g.descripcionCorta, esParaRenta: false },
                orderBy: { createdAt: 'desc' },
                select: { codigoGrupo: true }
            });
            resultados.push({
                codigoGrupo: last?.codigoGrupo || '001',
                cantidad: g._count.id,
                descripcionCorta: g.descripcionCorta!
            });
        }

        return resultados.sort((a, b) => a.descripcionCorta.localeCompare(b.descripcionCorta));
    } catch (e) {
        return [];
    }
}

// ─── Categoria Management ───────────────────────────────────────────────────
export async function getCategorias() {
    try {
        const orgId = await getOrgId();
        return await prisma.categoria.findMany({
            where: { organizationId: orgId },
            orderBy: { nombre: 'asc' }
        });
    } catch (e) {
        return [];
    }
}

export async function createCategoria(nombre: string, color?: string) {
    try {
        const orgId = await getOrgId();
        const cat = await prisma.categoria.create({
            data: { organizationId: orgId, nombre: nombre.trim().toUpperCase(), color }
        });
        revalidatePath('/inventario');
        return { success: true, categoria: cat };
    } catch (e: any) {
        if (e.code === 'P2002') return { error: 'La categoría ya existe en esta organización.' };
        return { error: 'Error interno al crear la categoría.' };
    }
}

export async function updateCategoria(id: string, nombre: string, color?: string) {
    try {
        const orgId = await getOrgId();
        const cat = await prisma.categoria.update({
            where: { id, organizationId: orgId },
            data: { nombre: nombre.trim().toUpperCase(), color }
        });
        revalidatePath('/inventario');
        return { success: true, categoria: cat };
    } catch (e: any) {
        if (e.code === 'P2002') return { error: 'Ya existe otra categoría con ese nombre.' };
        return { error: 'Error interno al actualizar la categoría.' };
    }
}

// ─── Fetch Activos by Group Code ─────────────────────────────────────────────
export async function getActivosByGrupo(codigoGrupo: string) {
    if (!codigoGrupo) return [];
    try {
        const orgId = await getOrgId();
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: orgId, codigoGrupo, esParaRenta: false },
            orderBy: { area: 'asc' },
            select: {
                id: true,
                idQr: true,
                descripcionCorta: true,
                area: true,
                codigoBarras: true,
                stock: true,
                estatusContable: true,
                descripcionDetallada: true,
                marca: true,
                modelo: true,
                cuentaAct: true,
                categoriaId: true,
                esConsumible: true,
                imagenUrl: true,
            }
        });
        return activos;
    } catch (error) {
        console.error("Error fetching activos by group code", error);
        return [];
    }
}

// ─── Fetch Activos by Descripcion Corta ──────────────────────────────────────
export async function getActivosByDescripcionCorta(descripcionCorta: string) {
    if (!descripcionCorta) return [];
    try {
        const orgId = await getOrgId();
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: orgId, descripcionCorta, esParaRenta: false },
            orderBy: { area: 'asc' },
            select: {
                id: true,
                idQr: true,
                descripcionCorta: true,
                area: true,
                codigoBarras: true,
                stock: true,
                estatusContable: true,
                descripcionDetallada: true,
                marca: true,
                modelo: true,
                cuentaAct: true,
                categoriaId: true,
                esConsumible: true,
                imagenUrl: true,
                codigoGrupo: true,
            }
        });
        return activos;
    } catch (error) {
        console.error("Error fetching activos by descripcion", error);
        return [];
    }
}

// ─── Fetch Activos by ID QR ──────────────────────────────────────────────────
export async function getActivosByIdQr(idQr: string) {
    if (!idQr) return [];
    try {
        const orgId = await getOrgId();
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: orgId, idQr, esParaRenta: false },
            orderBy: { area: 'asc' },
            select: {
                id: true,
                idQr: true,
                descripcionCorta: true,
                area: true,
                codigoBarras: true,
                stock: true,
                estatusContable: true
            }
        });
        return activos;
    } catch (e) {
        console.error(e);
        return [];
    }
}

// ─── Search Activos Globally ─────────────────────────────────────────────────
export async function searchActivosGlobal(query: string) {
    if (!query) return [];
    try {
        const orgId = await getOrgId();
        const activos = await prisma.activoFijo.findMany({
            where: {
                organizationId: orgId,
                esParaRenta: false,
                OR: [
                    { idQr: { contains: query, mode: 'insensitive' } },
                    { codigoBarras: { contains: query, mode: 'insensitive' } },
                    { descripcionCorta: { contains: query, mode: 'insensitive' } },
                    { modelo: { contains: query, mode: 'insensitive' } },
                    { area: { contains: query, mode: 'insensitive' } },
                ]
            },
            orderBy: [{ descripcionCorta: 'asc' }, { area: 'asc' }],
            select: {
                id: true,
                idQr: true,
                descripcionCorta: true,
                area: true,
                codigoBarras: true,
                stock: true,
                estatusContable: true,
                imagenUrl: true,
                referencia: true,
                lote: true,
                createdBy: { select: { nombre: true, apellido: true, email: true } }
            },
            take: 100
        });
        return activos;
    } catch (e) {
        console.error(e);
        return [];
    }
}

// ─── Quick Update Inline Activo ──────────────────────────────────────────────
export async function updateActivoQuick(id: string, area: string, cantidadStr: string) {
    try {
        const cantidad = Number(cantidadStr);
        if (isNaN(cantidad) || cantidad < 0) return { error: 'Cantidad inválida' };
        
        await prisma.activoFijo.update({
            where: { id },
            data: {
                area,
                stock: cantidad
            }
        });

        revalidatePath('/inventario');
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { error: 'Error actualizando: ' + e.message };
    }
}

// ─── READ: List with pagination, search, filters ─────────────────────────────
export async function getActivos(page = 1, search = '', area = '', estatus = '', origen = '', condicion = '') {
    const orgId = await getOrgId();
    const PER_PAGE = 10;
    const skip = (page - 1) * PER_PAGE;

    const where = {
        organizationId: orgId,
        esParaRenta: false,
        ...(search && {
            OR: [
                { descripcionCorta: { contains: search, mode: 'insensitive' as const } },
                { idQr: { contains: search, mode: 'insensitive' as const } },
                { serie: { contains: search, mode: 'insensitive' as const } },
                { modelo: { contains: search, mode: 'insensitive' as const } },
                { responsable: { contains: search, mode: 'insensitive' as const } },
            ],
        }),
        ...(area && { area }),
        ...(estatus && { estatusContable: estatus }),
        ...(origen && {
            origenActivo: origen === 'SIN_DEFINIR' ? null : origen
        }),
        ...(condicion && {
            condicionActivo: condicion === 'SIN_DEFINIR' ? null : condicion
        })
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

// ─── READ: Get all matching assets for export (without pagination) ────────────
export async function getActivosForExport(search = '', area = '', estatus = '', origen = '', condicion = '') {
    try {
        const orgId = await getOrgId();
        const where = {
            organizationId: orgId,
            esParaRenta: false,
            ...(search && {
                OR: [
                    { descripcionCorta: { contains: search, mode: 'insensitive' as const } },
                    { idQr: { contains: search, mode: 'insensitive' as const } },
                    { serie: { contains: search, mode: 'insensitive' as const } },
                    { modelo: { contains: search, mode: 'insensitive' as const } },
                    { responsable: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            ...(area && { area }),
            ...(estatus && { estatusContable: estatus }),
            ...(origen && {
                origenActivo: origen === 'SIN_DEFINIR' ? null : origen
            }),
            ...(condicion && {
                condicionActivo: condicion === 'SIN_DEFINIR' ? null : condicion
            })
        };

        const activos = await prisma.activoFijo.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { categoria: true }
        });

        return activos.map(a => ({
            ...a,
            costoAdq: a.costoAdq ? Number(a.costoAdq) : null,
            vidaUtilOverride: a.vidaUtilOverride ? Number(a.vidaUtilOverride) : null,
            valResidual: a.valResidual ? Number(a.valResidual) : null,
            baseDeprec: a.baseDeprec ? Number(a.baseDeprec) : null,
            deprecMensual: a.deprecMensual ? Number(a.deprecMensual) : null,
            deprecAcum: a.deprecAcum ? Number(a.deprecAcum) : null,
            valorLibros: a.valorLibros ? Number(a.valorLibros) : null,
        }));
    } catch (error) {
        console.error("Error in getActivosForExport:", error);
        return [];
    }
}

export async function getActivoStats(area?: string) {
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
            WHERE "organizationId" = ${orgId}::uuid AND "esParaRenta" = false AND "area" <> 'SERVICIOS'
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
        WHERE "organizationId" = ${orgId}::uuid AND "esParaRenta" = false AND "area" <> 'SERVICIOS'
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

// ─── Get Ubicaciones Activas ─────────────────────────────────────────────────
export async function getUbicacionesActivasByProducto(identificador: string, tipo: 'codigoBarras' | 'codigoGrupo' | 'descripcionCorta') {
    const orgId = await getOrgId();
    
    const whereClause: any = { organizationId: orgId, esParaRenta: false };
    if (tipo === 'codigoBarras') {
        whereClause.codigoBarras = identificador;
    } else if (tipo === 'codigoGrupo') {
        whereClause.codigoGrupo = identificador;
    } else if (tipo === 'descripcionCorta') {
        whereClause.descripcionCorta = identificador;
    }

    const agrupados = await prisma.activoFijo.groupBy({
        by: ['area'],
        where: whereClause,
        _sum: {
            stock: true
        }
    });

    return agrupados
        .filter(g => g._sum.stock && g._sum.stock > 0)
        .map(g => ({
            area: g.area,
            stock: g._sum.stock || 0
        }));
}

export async function findActivoByBarcode(codigoBarras: string) {
    const orgId = await getOrgId();
    const activo = await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, codigoBarras, esParaRenta: false },
        orderBy: { createdAt: 'asc' }
    });
    return activo;
}

/**
 * Devuelve info del producto existente con ese código de barras, para que el UI
 * entre en modo Reabastecer sin crear un registro nuevo.
 */
export async function checkExistingByBarcode(codigoBarras: string) {
    if (!codigoBarras?.trim()) return null;
    const orgId = await getOrgId();
    const activo = await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, codigoBarras: codigoBarras.trim(), esParaRenta: false },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            idQr: true,
            descripcionCorta: true,
            descripcionDetallada: true,
            marca: true,
            modelo: true,
            imagenUrl: true,
            stock: true,
            area: true,
            codigoBarras: true,
            cuentaAct: true,
            categoriaId: true,
            esConsumible: true,
            origenActivo: true,
            fechaAdq: true,
            costoAdq: true,
            condicionActivo: true,
        }
    });
    return activo;
}

export async function getActivoDetailsByBarcode(codigoBarras: string) {
    const orgId = await getOrgId();
    return await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, codigoBarras, esParaRenta: false },
        select: {
            descripcionCorta: true,
            descripcionDetallada: true,
            marca: true,
            modelo: true,
            cuentaAct: true,
            categoriaId: true,
            esConsumible: true,
            imagenUrl: true, // so they don't need to re-photo
            origenActivo: true,
            fechaAdq: true,
            costoAdq: true,
            condicionActivo: true,
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function searchActivosForAutocomplete(query: string) {
    const orgId = await getOrgId();
    if (!query || query.length < 2) return [];
    
    // Search distinct barcodes matching barcode OR short description
    const results = await prisma.activoFijo.findMany({
        where: {
            organizationId: orgId,
            esParaRenta: false,
            codigoBarras: { not: null },
            OR: [
                { codigoBarras: { contains: query, mode: 'insensitive' } },
                { descripcionCorta: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            codigoBarras: true,
            descripcionCorta: true,
            imagenUrl: true
        },
        distinct: ['codigoBarras'],
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    return results;
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createActivo(formData: FormData): Promise<{ success?: boolean, idQr?: string, id?: string | null, count?: number, error?: string, restock?: boolean }> {
    const { orgId, userId } = await getContextUser();

    const area = formData.get('area') as string;
    const codigoGrupo = (formData.get('codigoGrupo') as string) || '001';
    const cantidadForm = formData.get('cantidad') as string;
    const cantidadRegistros = cantidadForm ? parseInt(cantidadForm, 10) : 1;
    const codigoBarrasForm = formData.get('codigoBarras') as string;
    const codigoBarras = codigoBarrasForm ? codigoBarrasForm.trim() : null;
    const esConsumible = formData.get('esConsumible') === 'true';
    const esParaRenta = formData.get('esParaRenta') === 'true';
    const esServicio = formData.get('esServicio') === 'true';
    const garantia = (formData.get('garantia') as string) || null;
    const mantenimientosIncluidosStr = formData.get('mantenimientosIncluidos') as string;
    const mantenimientosIncluidos = mantenimientosIncluidosStr ? parseInt(mantenimientosIncluidosStr, 10) : null;
    const frecuenciaStr = formData.get('frecuenciaMantenimientoMeses') as string;
    const frecuenciaMantenimientoMeses = frecuenciaStr ? parseInt(frecuenciaStr, 10) : null;

    // Generar 1 idQr si es consumible (o será agrupado), o N idQrs si es Activo Fijo (serialización forzada)
    const numIds = (esConsumible || esServicio) ? 1 : cantidadRegistros;
    
    // Si es servicio, usar el codigo manual ingresado (codigoBarras) como idQr para rastreo exacto.
    const idQrs = (esServicio && codigoBarras) ? [codigoBarras] : await generateIdQr(orgId, area, codigoGrupo, numIds);

    const costoStr = formData.get('costoAdq') as string;
    const fechaStr = formData.get('fechaAdq') as string;
    const fechaLevStr = formData.get('fechaLevantamiento') as string;
    const vidaUtilOverrideStr = formData.get('vidaUtilOverride') as string;

    const costoAdqNum = costoStr ? parseFloat(costoStr) : null;
    const fechaAdqDate = fechaStr ? new Date(fechaStr) : null;
    const vidaUtilNum = vidaUtilOverrideStr ? parseFloat(vidaUtilOverrideStr) : null;

    // ── Resolve vida útil from histórico if not overridden ──
    let resolvedVidaUtil = vidaUtilNum;
    const historicoIdStr = (formData.get('historicoId') as string) || null;
    if (!resolvedVidaUtil && historicoIdStr) {
        const hist = await prisma.inventarioHistorico.findUnique({
            where: { id: historicoIdStr },
            select: { vidaUtil: true }
        });
        if (hist?.vidaUtil) resolvedVidaUtil = Number(hist.vidaUtil);
    }

    // ── Calculate depreciation (Acuerdo Nº1, Línea Recta) ──
    const deprec = (costoAdqNum && fechaAdqDate && resolvedVidaUtil)
        ? calcDepreciacion({ costoAdq: costoAdqNum, fechaAdq: fechaAdqDate, vidaUtilAnios: resolvedVidaUtil })
        : null;

    const baseData = {
        organizationId: orgId,
        area,
        codigoGrupo,
        descripcionCorta: formData.get('descripcionCorta') as string,
        descripcionDetallada: (formData.get('descripcionDetallada') as string) || null,
        serie: (formData.get('serie') as string) || null,
        marca: (formData.get('marca') as string) || null,
        modelo: (formData.get('modelo') as string) || null,
        referencia: (formData.get('referencia') as string) || null,
        cuentaAct: formData.get('cuentaAct') as string,
        estatusContable: (formData.get('estatusContable') as string) || 'VIGENTE',
        fechaAdq: fechaAdqDate,
        fechaLevantamiento: fechaLevStr ? new Date(fechaLevStr) : null,
        integrado: formData.get('integrado') === 'true',
        costoAdq: costoAdqNum,
        origenActivo: (formData.get('origenActivo') as string) || null,
        condicionActivo: (formData.get('condicionActivo') as string) || null,
        imagenUrl: (formData.get('imagenUrl') as string) || null,
        imagenPlacaUrl: (formData.get('imagenPlacaUrl') as string) || null,
        estadoDano: (formData.get('estadoDano') as string) || null,
        tipoIncidencia: (formData.get('tipoIncidencia') as string) || null,
        accionRecomendada: (formData.get('accionRecomendada') as string) || null,
        responsable: (formData.get('responsable') as string) || null,
        observaciones: (formData.get('observaciones') as string) || null,
        historicoId: historicoIdStr,
        createdById: userId,
        updatedById: userId,
        categoriaDepreciacion: (formData.get('categoriaDepreciacion') as string) || null,
        vidaUtilOverride: vidaUtilNum,
        categoriaId: (formData.get('categoriaId') as string) || null,
        esConsumible: formData.get('esConsumible') === 'true',
        garantia,
        mantenimientosIncluidos,
        frecuenciaMantenimientoMeses,
        lote: (formData.get('lote') as string) || null,
        fechaFabricacion: formData.get('fechaFabricacion') ? new Date(formData.get('fechaFabricacion') as string) : null,
        fechaVencimiento: formData.get('fechaVencimiento') ? new Date(formData.get('fechaVencimiento') as string) : null,
        // ── Depreciation fields ──
        valResidual: deprec?.valResidual ?? null,
        baseDeprec: deprec?.baseDeprec ?? null,
        deprecMensual: deprec?.deprecMensual ?? null,
        deprecAcum: deprec?.deprecAcum ?? null,
        valorLibros: deprec?.valorLibros ?? null,
        // ── Retail fields ──
        codigoBarras,
        stock: cantidadRegistros,
        esParaRenta
    };

    // ── Master-Data Integrity Constraint ──
    if (codigoBarras) {
        const master = await prisma.activoFijo.findFirst({
            where: { organizationId: orgId, codigoBarras },
            orderBy: { createdAt: 'asc' },
            select: { categoriaId: true, marca: true, modelo: true, imagenUrl: true, descripcionCorta: true }
        });
        if (master) {
            baseData.categoriaId = master.categoriaId;
            baseData.marca = master.marca;
            baseData.modelo = master.modelo;
            baseData.imagenUrl = baseData.imagenUrl || master.imagenUrl;
            baseData.descripcionCorta = master.descripcionCorta;
        }
    }

    // Si es consumible y ya existe en el área (y NO se proporciona vencimiento distinto), solo sumamos stock (Agrupación)
    if (esConsumible && !baseData.fechaVencimiento && !baseData.serie && (codigoBarras || codigoGrupo)) {
        const whereClause: any = { organizationId: orgId, area };
        if (codigoBarras) {
            whereClause.codigoBarras = codigoBarras;
        } else if (codigoGrupo) {
            whereClause.codigoGrupo = codigoGrupo;
            whereClause.descripcionCorta = baseData.descripcionCorta; // PROTECCIÓN: Impide agrupar equipos distintos sin GS1
        }
        
        const existente = await prisma.activoFijo.findFirst({
            where: whereClause,
            orderBy: { createdAt: 'asc' } // el original de esa área
        });
        
        if (existente) {
            await prisma.activoFijo.update({
                where: { id: existente.id },
                data: {
                    stock: existente.stock + cantidadRegistros,
                }
            });
            revalidatePath('/inventario');
            return { success: true, idQr: existente.idQr, id: existente.id, count: cantidadRegistros, restock: true };
        }
    }

    let firstCreatedId = null;
    let finalIdQrs = [...idQrs];
    let createdExitosamente = false;
    let intentos = 0;
    const maxIntentos = 3;

    while (!createdExitosamente && intentos < maxIntentos) {
        try {
            if (esConsumible || esServicio) {
                // Nuevo consumible o servicio: 1 fila con stock = N (o 9999)
                const dataToInsert = { ...baseData, idQr: finalIdQrs[0] };
                const created = await prisma.activoFijo.create({ data: dataToInsert });
                firstCreatedId = created.id;
            } else {
                // Activo Fijo: Serialización forzada. N filas con stock = 1.
                await prisma.$transaction(async (tx) => {
                    const promises = [];
                    for (let i = 0; i < cantidadRegistros; i++) {
                        promises.push(
                            tx.activoFijo.create({
                                data: {
                                    ...baseData,
                                    idQr: finalIdQrs[i],
                                    stock: 1,
                                    serie: cantidadRegistros === 1 ? baseData.serie : null
                                }
                            })
                        );
                    }
                    const createdArray = await Promise.all(promises);
                    firstCreatedId = createdArray[0].id;
                });
            }
            createdExitosamente = true;
        } catch (error: any) {
            intentos++;
            // P2002 es el error de Prisma de restricción única (Unique Constraint)
            if (error?.code === 'P2002') {
                if (esServicio) throw new Error("Ya existe un registro con este Código de Servicio en la organización.");
                if (intentos >= maxIntentos) throw new Error("Sistema saturado por múltiples registros globales. Envía de nuevo.");
                // Recalcular IDs debido a colisión
                const numIdsError = esConsumible ? 1 : cantidadRegistros;
                finalIdQrs = await generateIdQr(orgId, area, codigoGrupo, numIdsError);
            } else {
                throw error;
            }
        }
    }

    revalidatePath('/inventario');

    return { success: true, idQr: finalIdQrs[0], id: firstCreatedId, count: cantidadRegistros };
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function updateActivo(id: string, formData: FormData): Promise<{ success?: boolean, error?: string }> {
    try {
        const { orgId, userId } = await getContextUser();

        const costoStr = formData.get('costoAdq') as string;
        const fechaStr = formData.get('fechaAdq') as string;
        const fechaLevStr = formData.get('fechaLevantamiento') as string;
        const vidaUtilOverrideStr = formData.get('vidaUtilOverride') as string;

        const costoAdqNum = costoStr ? parseFloat(costoStr) : null;
        const fechaAdqDate = fechaStr ? new Date(fechaStr) : null;
        const vidaUtilNum = vidaUtilOverrideStr ? parseFloat(vidaUtilOverrideStr) : null;
        const historicoIdStr = (formData.get('historicoId') as string) || null;

        // ── Resolve vida útil from histórico if not overridden ──
        let resolvedVidaUtil = vidaUtilNum;
        if (!resolvedVidaUtil && historicoIdStr) {
            const hist = await prisma.inventarioHistorico.findUnique({
                where: { id: historicoIdStr },
                select: { vidaUtil: true }
            });
            if (hist?.vidaUtil) resolvedVidaUtil = Number(hist.vidaUtil);
        }

        // ── Recalculate depreciation on every edit ──
        const deprec = (costoAdqNum && fechaAdqDate && resolvedVidaUtil)
            ? calcDepreciacion({ costoAdq: costoAdqNum, fechaAdq: fechaAdqDate, vidaUtilAnios: resolvedVidaUtil })
            : null;

        const estatusContable = formData.get('estatusContable') as string;
        const cantidadStr = formData.get('cantidad') as string;
        const stockNum = cantidadStr ? parseInt(cantidadStr, 10) : undefined;
        const mantenimientosIncluidosStr = formData.get('mantenimientosIncluidos') as string;
        const mantenimientosIncluidos = mantenimientosIncluidosStr ? parseInt(mantenimientosIncluidosStr, 10) : null;
        const frecuenciaStr = formData.get('frecuenciaMantenimientoMeses') as string;
        const frecuenciaMantenimientoMeses = frecuenciaStr ? parseInt(frecuenciaStr, 10) : null;

        await prisma.activoFijo.updateMany({
            where: { id, organizationId: orgId },
            data: {
                ...(stockNum !== undefined && !isNaN(stockNum) && { stock: stockNum }),
                descripcionCorta: formData.get('descripcionCorta') as string,
                descripcionDetallada: (formData.get('descripcionDetallada') as string) || null,
                serie: (formData.get('serie') as string) || null,
                marca: (formData.get('marca') as string) || null,
                modelo: (formData.get('modelo') as string) || null,
                referencia: (formData.get('referencia') as string) || null,
                area: formData.get('area') as string,
                cuentaAct: formData.get('cuentaAct') as string,
                ...(estatusContable && { estatusContable }),
                fechaAdq: fechaAdqDate,
                fechaLevantamiento: fechaLevStr ? new Date(fechaLevStr) : null,
                integrado: formData.get('integrado') === 'true',
                costoAdq: costoAdqNum,
                origenActivo: (formData.get('origenActivo') as string) || null,
                condicionActivo: (formData.get('condicionActivo') as string) || null,
                imagenUrl: (formData.get('imagenUrl') as string) || null,
                imagenPlacaUrl: (formData.get('imagenPlacaUrl') as string) || null,
                estadoDano: (formData.get('estadoDano') as string) || null,
                tipoIncidencia: (formData.get('tipoIncidencia') as string) || null,
                accionRecomendada: (formData.get('accionRecomendada') as string) || null,
                responsable: (formData.get('responsable') as string) || null,
                observaciones: (formData.get('observaciones') as string) || null,
                historicoId: historicoIdStr,
                updatedById: userId,
                categoriaDepreciacion: (formData.get('categoriaDepreciacion') as string) || null,
                vidaUtilOverride: vidaUtilNum,
                categoriaId: (formData.get('categoriaId') as string) || null,
                esConsumible: formData.get('esConsumible') === 'true',
                garantia: (formData.get('garantia') as string) || null,
                mantenimientosIncluidos,
                frecuenciaMantenimientoMeses,
                lote: (formData.get('lote') as string) || null,
                fechaFabricacion: formData.get('fechaFabricacion') ? new Date(formData.get('fechaFabricacion') as string) : null,
                fechaVencimiento: formData.get('fechaVencimiento') ? new Date(formData.get('fechaVencimiento') as string) : null,
                // ── Depreciation fields ──
                valResidual: deprec?.valResidual ?? null,
                baseDeprec: deprec?.baseDeprec ?? null,
                deprecMensual: deprec?.deprecMensual ?? null,
                deprecAcum: deprec?.deprecAcum ?? null,
                valorLibros: deprec?.valorLibros ?? null,
                // ── Retail fields ──
                codigoBarras: (formData.get('codigoBarras') as string) || null,
            },
        });

        revalidatePath('/inventario');
        return { success: true };
    } catch (e: any) {
        console.error('Error in updateActivo:', e);
        return { error: e.message || 'Error desconocido al actualizar' };
    }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function deleteActivo(id: string) {
    const orgId = await getOrgId();
    await prisma.activoFijo.deleteMany({ where: { id, organizationId: orgId } });
    revalidatePath('/inventario');
    return { success: true };
}

// ─── UPLOAD IMAGE to R2 ──────────────────────────────────────────────────────
export async function uploadActivoImage(formData: FormData): Promise<{ url: string }> {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `activos/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const url = await uploadToR2(buffer, fileName, file.type);
    return { url };
}

// ─── PREVIEW ID QR (for form) ────────────────────────────────────────────────
export async function previewIdQr(area: string, codigoGrupo: string = '001'): Promise<string> {
    try {
        console.log('[DEBUG_PREVIEW] previewIdQr called with area:', area, 'codigoGrupo:', codigoGrupo);
        const orgId = await getOrgId();
        console.log('[DEBUG_PREVIEW] previewIdQr got orgId:', orgId);
        const ids = await generateIdQr(orgId, area, codigoGrupo);
        console.log('[DEBUG_PREVIEW] previewIdQr generated ids:', ids);
        return ids[0];
    } catch (err: any) {
        console.error('[DEBUG_PREVIEW] Error in previewIdQr server action:', err);
        throw err;
    }
}

export async function generateNextServiceCode(prefix: string): Promise<string> {
    try {
        console.log('[SERVER_SERVICE] generateNextServiceCode called with prefix:', prefix);
        const orgId = await getOrgId();
        console.log('[SERVER_SERVICE] orgId:', orgId);
        
        // Buscar todos los activos fijos que empiecen con el prefijo + "-" en esa organización
        const services = await prisma.activoFijo.findMany({
            where: {
                organizationId: orgId,
                idQr: { startsWith: `${prefix}-` }
            },
            select: { idQr: true }
        });
        console.log('[SERVER_SERVICE] found services count:', services.length);

        let maxCorrelativo = 0;
        const regex = new RegExp(`^${prefix}-(\\d+)$`);
        for (const s of services) {
            const match = s.idQr.match(regex);
            if (match) {
                const num = Number(match[1]);
                if (num > maxCorrelativo) {
                    maxCorrelativo = num;
                }
            }
        }
        console.log('[SERVER_SERVICE] maxCorrelativo:', maxCorrelativo);

        const nextNum = maxCorrelativo + 1;
        const nextCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;
        console.log('[SERVER_SERVICE] generated code:', nextCode);
        // Formatear como PREFIX-00X (rellenado con ceros a 3 dígitos)
        return nextCode;
    } catch (err) {
        console.error("[SERVER_SERVICE] Error generating next service code:", err);
        return `${prefix}-001`;
    }
}

export async function checkGrupoExists(codigoGrupo: string): Promise<boolean> {
    const orgId = await getOrgId();
    const exists = await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, codigoGrupo },
        select: { id: true }
    });
    return !!exists;
}

// ─── AREA ACTIVATION CONTROL ─────────────────────────────────────────────────

export async function validateAndOpenArea(qrCode: string) {
    const orgId = await getOrgId();

    // Validar si el QR existe en la base de datos de Areas
    const areaRecord = await prisma.area.findFirst({
        where: { organizationId: orgId, qrCode }
    });

    if (!areaRecord) {
        return { success: false, error: 'Código QR de área no reconocido o inválido.' };
    }

    const areaCode = areaRecord.name;

    // Obtener el ID del usuario
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let userId = null;
    if (user) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) userId = dbUser.id;
    }

    // Buscar o crear el estatus del área (upsert) para evitar duplicados
    const status = await prisma.areaInventoryStatus.upsert({
        where: {
            organizationId_areaCode: { organizationId: orgId, areaCode }
        },
        create: {
            organizationId: orgId,
            areaCode,
            qrCode,
            status: 'IN_PROGRESS',
            openedById: userId,
            openedAt: new Date(),
        },
        update: {}
    });

    if (status.status === 'COMPLETED') {
        return { success: false, error: 'Esta área ya fue inventariada y cerrada. Si quedó pendiente algo, solicita al administrador su reapertura.' };
    }

    // Si estaba "PENDING" o ya estaba en progreso, aseguramos que nos marque a nosotros
    if (status.status !== 'IN_PROGRESS') {
        await prisma.areaInventoryStatus.update({
            where: { id: status.id },
            data: { status: 'IN_PROGRESS', openedById: userId, openedAt: new Date() }
        });
    }

    return { success: true, areaCode };
}

export async function closeArea(areaCode: string) {
    const orgId = await getOrgId();

    // Obtener el ID del usuario
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let userId = null;
    if (user) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) userId = dbUser.id;
    }

    try {
        await prisma.areaInventoryStatus.update({
            where: {
                organizationId_areaCode: { organizationId: orgId, areaCode }
            },
            data: {
                status: 'COMPLETED',
                closedById: userId,
                closedAt: new Date()
            }
        });
        revalidatePath('/inventario');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function reopenArea(areaCode: string) {
    const orgId = await getOrgId();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let userId = null;
    if (user) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) userId = dbUser.id;
    }

    await prisma.areaInventoryStatus.update({
        where: {
            organizationId_areaCode: { organizationId: orgId, areaCode }
        },
        data: {
            status: 'IN_PROGRESS',
            approvedById: userId,
        }
    });

    revalidatePath('/admin/inventario');
    return { success: true };
}

export async function getAreaStatuses() {
    const orgId = await getOrgId();

    const statuses = await prisma.areaInventoryStatus.findMany({
        where: { organizationId: orgId },
        include: {
            openedBy: { select: { email: true } },
            closedBy: { select: { email: true } },
            approvedBy: { select: { email: true } }
        },
        orderBy: { areaCode: 'asc' }
    });
    return statuses;
}

export async function clearPrintQueue() {
    const orgId = await getOrgId();
    await prisma.colaImpresion.deleteMany({
        where: { organizationId: orgId, estado: 'PENDIENTE' }
    });
    return { success: true };
}

export async function getActiveUserArea() {
    try {
        const orgId = await getOrgId();

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, areaCode: null };

        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (!dbUser) return { success: false, areaCode: null };

        // Buscar si este usuario tiene algún área IN_PROGRESS
        const activeStatus = await prisma.areaInventoryStatus.findFirst({
            where: {
                organizationId: orgId,
                status: 'IN_PROGRESS',
                openedById: dbUser.id
            },
            orderBy: {
                openedAt: 'desc'
            }
        });

        if (activeStatus) {
            return { success: true, areaCode: activeStatus.areaCode };
        }

        return { success: true, areaCode: null };
    } catch (e: any) {
        return { success: false, error: e.message, areaCode: null };
    }
}

export async function encolarLoteImpresion(codigoGrupo: string, cantidad: number, size: string = '70x40', impresora: string = 'Niimbot') {
    const orgId = await getOrgId();

    // Buscar los ultimos N activos con ese codigo de grupo para la organizacion de forma global
    const activosEnRango = await prisma.activoFijo.findMany({
        where: {
            organizationId: orgId,
            codigoGrupo
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: cantidad,
        select: {
            id: true,
            idQr: true,
            descripcionCorta: true,
            area: true,
            cuentaAct: true,
            fechaFabricacion: true,
            fechaVencimiento: true,
            marca: true,
            modelo: true,
            codigoBarras: true,
            serie: true
        }
    });

    if (activosEnRango.length === 0) {
        return { success: false, error: 'No se encontraron activos para el grupo seleccionado' };
    }

    // Preparar el host desde env variable o localhost temporalmente. 
    // Usualmente window.location.origin no está en servers actions, 
    // asumiendo hostname de prod si no está
    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://sistemas-elim.vercel.app';

    const printJobs = activosEnRango.map(activo => {
        const params = new URLSearchParams({
            idQr: activo.idQr,
            descripcion: activo.descripcionCorta,
            area: activo.area,
            cuenta: activo.cuentaAct,
            marca: activo.marca || '',
            modelo: activo.modelo || '',
            codigoBarras: activo.codigoBarras || '',
            serie: activo.serie || ''
        });
        if (activo.fechaFabricacion) params.set('fechaFab', activo.fechaFabricacion.toISOString().split('T')[0]);
        if (activo.fechaVencimiento) params.set('fechaVenc', activo.fechaVencimiento.toISOString().split('T')[0]);
        params.set('size', size);
        const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;
        return {
            organizationId: orgId,
            activoId: activo.id,
            urlImagen,
            estado: 'PENDIENTE',
            impresora: impresora,
            tamano: size
        };
    });

    const countPayload = await prisma.colaImpresion.createMany({
        data: printJobs
    });

    return { success: true, count: countPayload.count };
}

export async function encolarCopiasNiimbot(activoId: string, cantidad: number, size: string = '70x40', impresora: string = 'Niimbot') {
    const orgId = await getOrgId();

    const activo = await prisma.activoFijo.findUnique({
        where: { id: activoId, organizationId: orgId },
        select: {
            id: true,
            idQr: true,
            descripcionCorta: true,
            area: true,
            cuentaAct: true,
            marca: true,
            modelo: true,
            codigoBarras: true,
            serie: true
        }
    });

    if (!activo) {
        return { success: false, error: 'Activo no encontrado' };
    }

    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://bioelectronicahn.vercel.app';
    
    const params = new URLSearchParams({
        idQr: activo.idQr,
        descripcion: activo.descripcionCorta,
        area: activo.area,
        cuenta: activo.cuentaAct,
        marca: activo.marca || '',
        modelo: activo.modelo || '',
        codigoBarras: activo.codigoBarras || '',
        serie: activo.serie || '',
        size: size
    });
    const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

    const printJobs = Array.from({ length: cantidad }).map(() => ({
        organizationId: orgId,
        activoId: activo.id,
        urlImagen,
        estado: 'PENDIENTE',
        impresora: impresora,
        tamano: size
    }));

    const countPayload = await prisma.colaImpresion.createMany({
        data: printJobs
    });

    return { success: true, count: countPayload.count };
}

// ─── SETTINGS: Get and Save Inventory Origins ─────────────────────────────
export async function getInventoryOriginsSetting() {
    try {
        const originsSetting = await prisma.systemSetting.findUnique({
            where: { key: 'inventory_origins' }
        });
        const defaultSetting = await prisma.systemSetting.findUnique({
            where: { key: 'default_inventory_origin' }
        });

        const origins = originsSetting ? JSON.parse(originsSetting.value) : ["Americano", "Chino", "Otro"];
        const defaultOrigin = defaultSetting ? defaultSetting.value : "";

        return { success: true, origins, defaultOrigin };
    } catch (error: any) {
        console.error('Error fetching inventory origins setting:', error);
        return { success: false, origins: ["Americano", "Chino", "Otro"], defaultOrigin: "" };
    }
}

export async function saveInventoryOriginsSetting(origins: string[], defaultOrigin: string) {
    try {
        await prisma.systemSetting.upsert({
            where: { key: 'inventory_origins' },
            update: { value: JSON.stringify(origins) },
            create: { key: 'inventory_origins', value: JSON.stringify(origins) }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'default_inventory_origin' },
            update: { value: defaultOrigin },
            create: { key: 'default_inventory_origin', value: defaultOrigin }
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error saving inventory origins setting:', error);
        return { success: false, error: error.message || 'Error al guardar configuraciones' };
    }
}

// ─── SETTINGS: Get and Save Inventory Conditions ──────────────────────────
export async function getInventoryConditionsSetting() {
    try {
        const conditionsSetting = await prisma.systemSetting.findUnique({
            where: { key: 'inventory_conditions' }
        });
        const defaultSetting = await prisma.systemSetting.findUnique({
            where: { key: 'default_inventory_condition' }
        });

        const conditions = conditionsSetting ? JSON.parse(conditionsSetting.value) : ["Nuevo", "Usado", "Remanufacturado"];
        const defaultCondition = defaultSetting ? defaultSetting.value : "";

        return { success: true, conditions, defaultCondition };
    } catch (error: any) {
        console.error('Error fetching inventory conditions setting:', error);
        return { success: false, conditions: ["Nuevo", "Usado", "Remanufacturado"], defaultCondition: "" };
    }
}

export async function saveInventoryConditionsSetting(conditions: string[], defaultCondition: string) {
    try {
        await prisma.systemSetting.upsert({
            where: { key: 'inventory_conditions' },
            update: { value: JSON.stringify(conditions) },
            create: { key: 'inventory_conditions', value: JSON.stringify(conditions) }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'default_inventory_condition' },
            update: { value: defaultCondition },
            create: { key: 'default_inventory_condition', value: defaultCondition }
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error saving inventory conditions setting:', error);
        return { success: false, error: error.message || 'Error al guardar configuraciones' };
    }
}

export async function bulkImportActivos(activos: any[]): Promise<{ success: boolean; error?: string; count?: number; batchTag?: string; createdIds?: string[] }> {
    try {
        const { orgId, userId } = await getContextUser();
        
        // 1. Get organization QR Prefix
        const org = await prisma.organization.findUnique({ 
            where: { id: orgId }, 
            select: { qrPrefix: true } 
        });
        const prefijoBase = org?.qrPrefix || 'BEA';

        // 2. Fetch all current assets to determine maxCorrelativo
        const todos = await prisma.activoFijo.findMany({
            where: { 
                organizationId: orgId,
                idQr: { startsWith: `${prefijoBase}-` }
            },
            select: { idQr: true }
        });

        let maxCorrelativo = 0;
        for (const act of todos) {
            const parts = act.idQr.split('-');
            if (parts.length >= 2) {
                const lastPart = parts[parts.length - 1];
                if (!isNaN(Number(lastPart))) {
                    const num = Number(lastPart);
                    if (num > maxCorrelativo) maxCorrelativo = num;
                }
            }
        }

        const dateTag = new Date().toLocaleString('es-HN', { timeZone: 'America/Tegucigalialpa' })
            .replace(/, /g, ' ')
            .substring(0, 16);
        const batchTag = `Lote CSV: ${dateTag.replace(/:/g, '-')}`;
        
        const createdIds: string[] = [];
        let importedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const item of activos) {
                // Find or create Area
                let areaIdOrName = 'Taller';
                if (item.area && item.area.trim()) {
                    const cleanArea = item.area.trim();
                    const existingArea = await tx.area.findFirst({
                        where: { organizationId: orgId, name: { equals: cleanArea, mode: 'insensitive' } }
                    });
                    if (existingArea) {
                        areaIdOrName = existingArea.name;
                    } else {
                        // Create new Area
                        const cleanPrefix = cleanArea.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'GEN';
                        const fallbackQr = `ELIM-QR-GEN-${cleanArea.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
                        const newArea = await tx.area.create({
                            data: { 
                                organizationId: orgId, 
                                name: cleanArea,
                                prefix: cleanPrefix,
                                qrCode: fallbackQr
                            }
                        });
                        areaIdOrName = newArea.name;
                    }
                }

                // Find or create Categoria
                let catId: string | null = null;
                if (item.categoria && item.categoria.trim()) {
                    const cleanCat = item.categoria.trim();
                    const existingCat = await tx.categoria.findFirst({
                        where: { organizationId: orgId, nombre: { equals: cleanCat, mode: 'insensitive' } }
                    });
                    if (existingCat) {
                        catId = existingCat.id;
                    } else {
                        const newCat = await tx.categoria.create({
                            data: { organizationId: orgId, nombre: cleanCat }
                        });
                        catId = newCat.id;
                    }
                }

                const esConsumible = ['si', 'sí', 'true', 'yes', '1', 's', 'true'].includes(String(item.esConsumible).toLowerCase().trim());
                const cantidad = Math.max(1, parseInt(item.cantidad) || 1);
                const codigoGrupo = (item.codigoGrupo && item.codigoGrupo.trim()) || '001';
                const codigoBarras = (item.codigoBarras && item.codigoBarras.trim()) || null;
                
                // Base fields to insert
                const baseData = {
                    organizationId: orgId,
                    descripcionCorta: item.descripcionCorta?.substring(0, 60) || 'Sin nombre',
                    descripcionDetallada: item.descripcionDetallada || null,
                    marca: item.marca || null,
                    modelo: item.modelo || null,
                    serie: item.serie || null,
                    area: areaIdOrName,
                    cuentaAct: item.cuentaAct || 'Equipos Diversos',
                    estatusContable: 'VIGENTE',
                    origenActivo: item.origenActivo || 'Americano',
                    condicionActivo: item.condicionActivo || 'Nuevo',
                    garantia: item.garantia || null,
                    observaciones: `${item.observaciones || ''} [${batchTag}]`.trim(),
                    esConsumible,
                    codigoGrupo,
                    codigoBarras,
                    categoriaId: catId,
                    createdById: userId,
                    updatedById: userId
                };

                if (esConsumible) {
                    // Consumible Re-entry logic (Agrupación)
                    const whereClause: any = { organizationId: orgId, area: areaIdOrName, esConsumible: true };
                    if (codigoBarras) {
                        whereClause.codigoBarras = codigoBarras;
                    } else {
                        whereClause.codigoGrupo = codigoGrupo;
                        whereClause.descripcionCorta = baseData.descripcionCorta;
                    }

                    const existente = await tx.activoFijo.findFirst({
                        where: whereClause,
                        orderBy: { createdAt: 'asc' }
                    });

                    if (existente) {
                        // Increment stock
                        const updated = await tx.activoFijo.update({
                            where: { id: existente.id },
                            data: { stock: existente.stock + cantidad }
                        });
                        createdIds.push(updated.id);
                        importedCount += cantidad;
                    } else {
                        // Create new consumible
                        let finalQr = item.idQr?.trim();
                        if (!finalQr) {
                            maxCorrelativo++;
                            const numPart = String(maxCorrelativo).padStart(6, '0');
                            finalQr = `${prefijoBase}-${codigoGrupo}-${numPart}`;
                        }

                        const created = await tx.activoFijo.create({
                            data: {
                                ...baseData,
                                idQr: finalQr,
                                stock: cantidad
                            }
                        });
                        createdIds.push(created.id);
                        importedCount += cantidad;
                    }
                } else {
                    // Non-consumible / Medical Equipment: forced serialization (N items, each with stock=1)
                    for (let i = 0; i < cantidad; i++) {
                        let finalQr = item.idQr?.trim();
                        // If quantity > 1 or no idQr was provided, we generate a new sequential idQr
                        if (!finalQr || cantidad > 1) {
                            maxCorrelativo++;
                            const numPart = String(maxCorrelativo).padStart(6, '0');
                            finalQr = `${prefijoBase}-${codigoGrupo}-${numPart}`;
                        }

                        const created = await tx.activoFijo.create({
                            data: {
                                ...baseData,
                                idQr: finalQr,
                                stock: 1
                            }
                        });
                        createdIds.push(created.id);
                        importedCount++;
                    }
                }
            }
        });

        revalidatePath('/inventario');
        return { success: true, count: importedCount, batchTag, createdIds };
    } catch (e: any) {
        console.error('Error in bulkImportActivos:', e);
        return { success: false, error: e.message || 'Error al importar inventario' };
    }
}

export async function encolarLoteImportado(ids: string[]) {
    try {
        const orgId = await getOrgId();
        
        const activos = await prisma.activoFijo.findMany({
            where: { id: { in: ids }, organizationId: orgId },
            select: {
                id: true,
                idQr: true,
                descripcionCorta: true,
                area: true,
                cuentaAct: true,
                marca: true,
                modelo: true,
                codigoBarras: true,
                serie: true
            }
        });

        if (activos.length === 0) {
            return { success: false, error: 'No se encontraron activos para encolar' };
        }

        const host = process.env.NEXT_PUBLIC_APP_URL || 'https://bioelectronicahn.vercel.app';
        const printJobs: any[] = [];

        for (const activo of activos) {
            const params = new URLSearchParams({
                idQr: activo.idQr,
                descripcion: activo.descripcionCorta,
                area: activo.area,
                cuenta: activo.cuentaAct,
                marca: activo.marca || '',
                modelo: activo.modelo || '',
                codigoBarras: activo.codigoBarras || '',
                serie: activo.serie || '',
                size: '70x40'
            });
            const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

            printJobs.push({
                organizationId: orgId,
                activoId: activo.id,
                urlImagen,
                estado: 'PENDIENTE',
                impresora: 'Niimbot',
                tamano: '70x40'
            });
        }

        const countPayload = await prisma.colaImpresion.createMany({
            data: printJobs
        });

        return { success: true, count: countPayload.count };
    } catch (e: any) {
        console.error('Error in encolarLoteImportado:', e);
        return { success: false, error: e.message || 'Error al encolar lote de impresión' };
    }
}

