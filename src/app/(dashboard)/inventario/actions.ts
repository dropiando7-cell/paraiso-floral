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

// Se eliminaron las constantes estáticas PREFIX_MAP y QR_TO_AREA_MAP 
// porque ahora se usa el modelo Area desde Prisma.

// ─── Auto-generate ID QR ─────────────────────────────────────────────────────
async function generateIdQr(organizationId: string, area: string, codigoGrupo: string = '001', cantidadRegistros: number = 1): Promise<string[]> {
    // Buscar el area real en BD para obtener el prefijo base
    const areaRecord = await prisma.area.findFirst({
        where: { organizationId, name: area }
    });

    const prefijoBase = areaRecord?.prefix || area;
    const prefijoConGrupo = `${prefijoBase}-${codigoGrupo.padStart(3, '0')}`;

    // Buscar el último activo de la ORGANIZACIÓN completa que pertenezca a este CODIGO DE GRUPO
    // Para no depender del prefijo del área, buscamos cualquiera cuyo ID termine con -xxx donde xxx es el correlativo
    // y cuyo codigoGrupo sea el que estamos buscando.
    const lastActivo = await prisma.activoFijo.findFirst({
        where: { organizationId, codigoGrupo },
        orderBy: { createdAt: 'desc' }, // Asumimos que el último creado tiene el correlativo mayor para su grupo (O podríamos ordenar por idQr desc pero varía el prefijo)
    });

    // Validemos buscando todos los de ese grupo para sacar el maximo número si es mas seguro
    const todosDeGrupo = await prisma.activoFijo.findMany({
        where: { organizationId, codigoGrupo },
        select: { idQr: true }
    });

    let maxCorrelativo = 0;
    for (const act of todosDeGrupo) {
        const parts = act.idQr.split('-');
        const lastPart = parts[parts.length - 1];
        if (!isNaN(Number(lastPart))) {
            const num = Number(lastPart);
            if (num > maxCorrelativo) maxCorrelativo = num;
        }
    }

    const startNum = maxCorrelativo + 1;
    const ids = [];

    for (let i = 0; i < cantidadRegistros; i++) {
        ids.push(`${prefijoConGrupo}-${String(startNum + i).padStart(4, '0')}`);
    }

    return ids;
}

// ─── Autocompletar Groupos Existentes ─────────────────────────────────────────
export async function getGruposAutocompletado() {
    try {
        const orgId = await getOrgId();

        // Agrupar por codigoGrupo para obtener cantidad y descripcion sugerida
        const agrupados = await prisma.activoFijo.groupBy({
            by: ['codigoGrupo'],
            where: { organizationId: orgId, codigoGrupo: { not: null } },
            _count: { id: true }
        });

        // Para evitar múltiples queries, optamos por mapear y luego enriquecer
        const resultados = await Promise.all(agrupados.map(async (g) => {
            const last = await prisma.activoFijo.findFirst({
                where: { organizationId: orgId, codigoGrupo: g.codigoGrupo },
                orderBy: { createdAt: 'desc' },
                select: { descripcionCorta: true }
            });
            return {
                codigoGrupo: g.codigoGrupo!,
                cantidad: g._count.id,
                descripcionCorta: last?.descripcionCorta || ''
            };
        }));

        return resultados.sort((a, b) => a.codigoGrupo.localeCompare(b.codigoGrupo));
    } catch (e) {
        return [];
    }
}

// ─── READ: List with pagination, search, filters ─────────────────────────────
export async function getActivos(page = 1, search = '', area = '', estatus = '') {
    const orgId = await getOrgId();
    const PER_PAGE = 10;
    const skip = (page - 1) * PER_PAGE;

    const where = {
        organizationId: orgId,
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
    };

    const [activos, total] = await Promise.all([
        prisma.activoFijo.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: PER_PAGE,
        }),
        prisma.activoFijo.count({ where }),
    ]);

    return { activos, total, totalPages: Math.ceil(total / PER_PAGE) };
}

export async function getActivoStats() {
    const orgId = await getOrgId();

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
            WHERE "organizationId" = ${orgId}::uuid
        )
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE "estatusContable" = 'VIGENTE') as vigente,
            COUNT(*) FILTER (WHERE "estatusContable" = 'DEPRECIADO') as depreciado,
            COUNT(*) FILTER (WHERE "estatusContable" = 'PROCESO DE BAJA') as proceso_baja,
            COUNT(*) FILTER (WHERE "estadoDano" IS NOT NULL) as con_dano,
            (SELECT areas_count FROM org_areas)
        FROM "activos_fijos"
        WHERE "organizationId" = ${orgId}::uuid
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

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createActivo(formData: FormData) {
    const orgId = await getOrgId();

    const area = formData.get('area') as string;
    const codigoGrupo = (formData.get('codigoGrupo') as string) || '001';
    const cantidadForm = formData.get('cantidad') as string;
    const cantidadRegistros = cantidadForm ? parseInt(cantidadForm, 10) : 1;

    const idQrs = await generateIdQr(orgId, area, codigoGrupo, cantidadRegistros);

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
        cuentaAct: formData.get('cuentaAct') as string,
        estatusContable: (formData.get('estatusContable') as string) || 'VIGENTE',
        fechaAdq: fechaAdqDate,
        fechaLevantamiento: fechaLevStr ? new Date(fechaLevStr) : null,
        integrado: formData.get('integrado') === 'true',
        costoAdq: costoAdqNum,
        origenActivo: (formData.get('origenActivo') as string) || null,
        imagenUrl: (formData.get('imagenUrl') as string) || null,
        imagenPlacaUrl: (formData.get('imagenPlacaUrl') as string) || null,
        estadoDano: (formData.get('estadoDano') as string) || null,
        tipoIncidencia: (formData.get('tipoIncidencia') as string) || null,
        accionRecomendada: (formData.get('accionRecomendada') as string) || null,
        responsable: (formData.get('responsable') as string) || null,
        observaciones: (formData.get('observaciones') as string) || null,
        historicoId: historicoIdStr,
        categoriaDepreciacion: (formData.get('categoriaDepreciacion') as string) || null,
        vidaUtilOverride: vidaUtilNum,
        // ── Depreciation fields ──
        valResidual: deprec?.valResidual ?? null,
        baseDeprec: deprec?.baseDeprec ?? null,
        deprecMensual: deprec?.deprecMensual ?? null,
        deprecAcum: deprec?.deprecAcum ?? null,
        valorLibros: deprec?.valorLibros ?? null,
    };

    const dataToInsert = idQrs.map(idQr => ({
        ...baseData,
        idQr
    }));

    await prisma.activoFijo.createMany({
        data: dataToInsert
    });

    revalidatePath('/inventario');

    // Fetch the newly created record's UUID for the client (needed for print queue)
    const firstCreated = await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, idQr: idQrs[0] },
        select: { id: true, idQr: true }
    });

    return { success: true, idQr: idQrs[0], id: firstCreated?.id ?? null, count: idQrs.length };
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function updateActivo(id: string, formData: FormData) {
    const orgId = await getOrgId();

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

    await prisma.activoFijo.updateMany({
        where: { id, organizationId: orgId },
        data: {
            descripcionCorta: formData.get('descripcionCorta') as string,
            descripcionDetallada: (formData.get('descripcionDetallada') as string) || null,
            serie: (formData.get('serie') as string) || null,
            marca: (formData.get('marca') as string) || null,
            modelo: (formData.get('modelo') as string) || null,
            area: formData.get('area') as string,
            cuentaAct: formData.get('cuentaAct') as string,
            estatusContable: formData.get('estatusContable') as string,
            fechaAdq: fechaAdqDate,
            fechaLevantamiento: fechaLevStr ? new Date(fechaLevStr) : null,
            integrado: formData.get('integrado') === 'true',
            costoAdq: costoAdqNum,
            origenActivo: (formData.get('origenActivo') as string) || null,
            imagenUrl: (formData.get('imagenUrl') as string) || null,
            imagenPlacaUrl: (formData.get('imagenPlacaUrl') as string) || null,
            estadoDano: (formData.get('estadoDano') as string) || null,
            tipoIncidencia: (formData.get('tipoIncidencia') as string) || null,
            accionRecomendada: (formData.get('accionRecomendada') as string) || null,
            responsable: (formData.get('responsable') as string) || null,
            observaciones: (formData.get('observaciones') as string) || null,
            historicoId: historicoIdStr,
            categoriaDepreciacion: (formData.get('categoriaDepreciacion') as string) || null,
            vidaUtilOverride: vidaUtilNum,
            // ── Depreciation fields ──
            valResidual: deprec?.valResidual ?? null,
            baseDeprec: deprec?.baseDeprec ?? null,
            deprecMensual: deprec?.deprecMensual ?? null,
            deprecAcum: deprec?.deprecAcum ?? null,
            valorLibros: deprec?.valorLibros ?? null,
        },
    });

    revalidatePath('/inventario');
    return { success: true };
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
    const orgId = await getOrgId();
    const ids = await generateIdQr(orgId, area, codigoGrupo);
    return ids[0];
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

export async function encolarLoteImpresion(codigoGrupo: string, desde: number, hasta: number) {
    const orgId = await getOrgId();

    // Buscar todos los activos con ese codigo de grupo para la organizacion de forma global
    const activos = await prisma.activoFijo.findMany({
        where: {
            organizationId: orgId,
            codigoGrupo
        },
        select: {
            id: true,
            idQr: true,
            descripcionCorta: true,
            area: true,
            cuentaAct: true
        }
    });

    // Filtrar en memoria por el correlativo ya que extraer la ultima parte con split es complejo en prisma orm pura
    const activosEnRango = activos.filter(act => {
        const parts = act.idQr.split('-');
        const correlativoStr = parts[parts.length - 1];
        if (!isNaN(Number(correlativoStr))) {
            const numero = Number(correlativoStr);
            return numero >= desde && numero <= hasta;
        }
        return false;
    });

    if (activosEnRango.length === 0) {
        return { success: false, error: 'No se encontraron activos en ese rango para el grupo seleccionado' };
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
        });
        const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;
        return {
            organizationId: orgId,
            activoId: activo.id,
            urlImagen,
            estado: 'PENDIENTE'
        };
    });

    const countPayload = await prisma.colaImpresion.createMany({
        data: printJobs
    });

    return { success: true, count: countPayload.count };
}
