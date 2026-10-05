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
        select: { organizationId: true }
    });
    if (!dbUser) redirect('/unauthorized');
    return dbUser.organizationId;
}

// In-memory cache for effective org IDs (60s TTL)
const effectiveOrgIdsCache = new Map<string, { ids: string[]; expiresAt: number }>();

export async function getEffectiveOrgIds(): Promise<string[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return [];

        const cached = effectiveOrgIdsCache.get(user.email);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
            return cached.ids;
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, organizationId: true, role: true, accessibleModules: true },
        });
        if (!dbUser) return [];

        const org = await prisma.organization.findUnique({
            where: { id: dbUser.organizationId },
            select: { id: true, slug: true, invoiceSettings: true }
        });

        const orgSettings = (org?.invoiceSettings as any) || {};
        const sharedOrgId = orgSettings.sharedInventoryOrgId;
        const shareCedi = orgSettings.shareCediInventory;
        const hasRolePermission = dbUser.role === 'SUPER_ADMIN' ||
            dbUser.accessibleModules?.includes('ver_inventario_cedi') ||
            dbUser.accessibleModules?.includes('inventario_compartido');

        let result: string[] = [dbUser.organizationId];

        if (sharedOrgId && sharedOrgId !== dbUser.organizationId) {
            result = [dbUser.organizationId, sharedOrgId];
        } else if (shareCedi || org?.slug === 'honduflores' || hasRolePermission) {
            const paraisoOrg = await prisma.organization.findFirst({
                where: {
                    OR: [
                        { slug: 'paraiso-floral' },
                        { name: { contains: 'Paraíso Floral', mode: 'insensitive' } }
                    ]
                },
                select: { id: true }
            });
            if (paraisoOrg && paraisoOrg.id !== dbUser.organizationId) {
                result = [dbUser.organizationId, paraisoOrg.id];
            }
        }

        effectiveOrgIdsCache.set(user.email, { ids: result, expiresAt: now + 60_000 });
        return result;
    } catch (e) {
        return [];
    }
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

function getAccentInsensitiveRegex(search: string): string {
    const escaped = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return escaped
        .replace(/[aáàâä]/gi, '[aáàâä]')
        .replace(/[eéèêë]/gi, '[eéèêë]')
        .replace(/[iíìîï]/gi, '[iíìîï]')
        .replace(/[oóòôö]/gi, '[oóòôö]')
        .replace(/[uúùûü]/gi, '[uúùûü]')
        .replace(/[nñ]/gi, '[nñ]');
}

// ─── Auto-generate ID QR ─────────────────────────────────────────────────────
async function generateIdQr(organizationId: string, area: string, codigoGrupo: string = '001', cantidadRegistros: number = 1): Promise<string[]> {
    const todos = await prisma.activoFijo.findMany({
        where: { organizationId },
        select: { idQr: true }
    });

    let maxCorrelativo = 0;
    for (const act of todos) {
        if (!act.idQr) continue;
        let numStr = act.idQr;
        if (act.idQr.includes('-')) {
            const parts = act.idQr.split('-');
            numStr = parts[parts.length - 1];
        }
        const num = Number(numStr);
        if (!isNaN(num)) {
            if (num > maxCorrelativo) maxCorrelativo = num;
        }
    }

    const startNum = maxCorrelativo + 1;
    const ids = [];

    for (let i = 0; i < cantidadRegistros; i++) {
        const numPart = String(startNum + i).padStart(6, '0');
        ids.push(numPart);
    }

    return ids;
}

// ─── Autocompletar Groupos Existentes ─────────────────────────────────────────
export async function getGruposAutocompletado() {
    try {
        const orgIds = await getEffectiveOrgIds();

        // Agrupar por descripcionCorta para obtener cantidad
        const agrupados = await prisma.activoFijo.groupBy({
            by: ['descripcionCorta'],
            where: { organizationId: { in: orgIds }, esParaRenta: false },
            _count: { id: true }
        });

        const resultados = [];
        for (const g of agrupados) {
            const last = await prisma.activoFijo.findFirst({
                where: { organizationId: { in: orgIds }, descripcionCorta: g.descripcionCorta, esParaRenta: false },
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
        const orgIds = await getEffectiveOrgIds();
        return await prisma.categoria.findMany({
            where: { organizationId: { in: orgIds } },
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
        const orgIds = await getEffectiveOrgIds();
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: { in: orgIds }, codigoGrupo, esParaRenta: false },
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
        const orgIds = await getEffectiveOrgIds();
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: { in: orgIds }, descripcionCorta, esParaRenta: false },
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
        const orgIds = await getEffectiveOrgIds();
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId: { in: orgIds }, idQr, esParaRenta: false },
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

// ─── Helpers de normalización para búsqueda sin tildes ───────────────────────
function removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function addAccentVariants(str: string): string[] {
    // Genera variantes: original + sin tildes + con tildes comunes en español
    const clean = removeAccents(str.toUpperCase());
    const original = str.toUpperCase();
    const variants = new Set([original, clean]);

    // Aplicar tildes comunes sobre la versión limpia
    const withAccents = clean
        .replace(/\bA\b/g, 'Á').replace(/^A(\s|$)/, 'Á$1') // casos simples
        .replace('QUIRURGICA', 'QUIRÚRGICA')
        .replace('QUIRURGICO', 'QUIRÚRGICO')
        .replace('MEDICA', 'MÉDICA')
        .replace('MEDICO', 'MÉDICO')
        .replace('TECNICA', 'TÉCNICA')
        .replace('TECNICO', 'TÉCNICO')
        .replace('BASICA', 'BÁSICA')
        .replace('BASICO', 'BÁSICO')
        .replace('AUTOMATICA', 'AUTOMÁTICA')
        .replace('ELECTRICA', 'ELÉCTRICA')
        .replace('ELECTRICO', 'ELÉCTRICO')
        .replace('ELECTRONICA', 'ELECTRÓNICA')
        .replace('ELECTRONICO', 'ELECTRÓNICO')
        .replace('OPTICA', 'ÓPTICA')
        .replace('OPTICO', 'ÓPTICO')
        .replace('CALCULO', 'CÁLCULO')
        .replace('CAMARA', 'CÁMARA')
        .replace('COMPUTACION', 'COMPUTACIÓN')
        .replace('COMUNICACION', 'COMUNICACIÓN')
        .replace('PROTECCION', 'PROTECCIÓN')
        .replace('PRODUCCION', 'PRODUCCIÓN')
        .replace('INSPECCION', 'INSPECCIÓN')
        .replace('DETECCION', 'DETECCIÓN')
        .replace('GENERACION', 'GENERACIÓN')
        .replace('CIRCULACION', 'CIRCULACIÓN')
        .replace('ESTERILIZACION', 'ESTERILIZACIÓN')
        .replace('REFRIGERACION', 'REFRIGERACIÓN')
        .replace('VENTILACION', 'VENTILACIÓN')
        .replace('ANESTESIA', 'ANESTESIA')
        .replace('OXIGENO', 'OXÍGENO')
        .replace('FARMACEUTICA', 'FARMACÉUTICA')
        .replace('DIAGNOSTICO', 'DIAGNÓSTICO')
        .replace('ORTOPEDICA', 'ORTOPÉDICA')
        .replace('ORTOPEDICO', 'ORTOPÉDICO')
        .replace('TERAPEUTICA', 'TERAPÉUTICA')
        .replace('NEUMATICA', 'NEUMÁTICA')
        .replace('NEUMATICO', 'NEUMÁTICO')
        .replace('HIDRAULICA', 'HIDRÁULICA')
        .replace('HIDRAULICO', 'HIDRÁULICO')
        .replace('BIOLOGICA', 'BIOLÓGICA')
        .replace('BIOLOGICO', 'BIOLÓGICO')
        .replace('QUIMICA', 'QUÍMICA')
        .replace('QUIMICO', 'QUÍMICO');

    if (withAccents !== clean) variants.add(withAccents);
    return Array.from(variants);
}

function buildSearchOR(variants: string[], fields: string[]) {
    const conditions: any[] = [];
    for (const v of variants) {
        for (const field of fields) {
            conditions.push({ [field]: { contains: v, mode: 'insensitive' } });
        }
    }
    return conditions;
}

// ─── Helpers de Relevancia de Búsqueda ───────────────────────────────────────
function normalizeSearchText(str: string | null | undefined): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function getSearchWordStem(word: string): string {
    if (!word) return '';
    if (word.endsWith('ES') && word.length > 4) return word.slice(0, -2);
    if (word.endsWith('S') && word.length > 3) return word.slice(0, -1);
    return word;
}

function computeSearchRelevance(item: any, query: string): number {
    const qNorm = normalizeSearchText(query);
    if (!qNorm) return 0;
    const qStem = getSearchWordStem(qNorm);

    const desc = normalizeSearchText(item.descripcionCorta || item.nombre);
    const qr = normalizeSearchText(item.idQr || item.sku);
    const barcode = normalizeSearchText(item.codigoBarras);

    // 1. Coincidencia exacta con ID QR o Código de Barra (prioridad absoluta en escaneos/códigos directos)
    if (qr === qNorm || barcode === qNorm) return 10000;
    if (qr.startsWith(qNorm) || barcode.startsWith(qNorm)) return 9000;
    if (qr.includes(qNorm) || barcode.includes(qNorm)) return 8000;

    // 2. Coincidencia exacta de descripción
    if (desc === qNorm || desc === qStem) return 5000;

    // 3. La descripción empieza exactamente con la búsqueda completa o su raíz
    if (desc.startsWith(qNorm) || desc.startsWith(qStem)) return 4000;

    const descWords = desc.split(/\s+/).filter(Boolean);
    const firstWord = descWords[0] || '';
    const firstWordStem = getSearchWordStem(firstWord);

    // 4. La primera palabra coincide exactamente con la búsqueda (ej: 'GERBERAS NARANJA' cuando busca 'GERBERAS' o 'GERBERA')
    if (firstWord === qNorm || firstWord === qStem || firstWordStem === qNorm || firstWordStem === qStem) {
        return 3500;
    }

    // 5. La primera palabra comienza con la búsqueda o raíz
    if (firstWord.startsWith(qNorm) || firstWord.startsWith(qStem)) {
        return 3000;
    }

    // Búsqueda multi-palabra (ej: 'GERBERAS NARANJA')
    const qWords = qNorm.split(/\s+/).filter(Boolean);
    if (qWords.length > 1) {
        const allWordsMatchPrefix = qWords.every(qw => {
            const qwStem = getSearchWordStem(qw);
            return descWords.some(dw => dw.startsWith(qw) || dw.startsWith(qwStem));
        });
        if (allWordsMatchPrefix) {
            return 2800;
        }
    }

    // 6. Contiene la búsqueda como palabra completa independiente en cualquier posición (ej: 'FLOR GERBERAS ROJA')
    const hasStandaloneWord = descWords.some(w => {
        const wStem = getSearchWordStem(w);
        return w === qNorm || w === qStem || wStem === qNorm || wStem === qStem;
    });
    if (hasStandaloneWord) {
        return 2000;
    }

    // 7. Cualquier palabra en la descripción comienza con la búsqueda
    const hasWordStartingWith = descWords.some(w => w.startsWith(qNorm) || w.startsWith(qStem));
    if (hasWordStartingWith) {
        return 1500;
    }

    // 8. La descripción contiene el término como subcadena interna de otra palabra (ej: 'MINIGERBERAS' contiene 'GERBERAS')
    if (desc.includes(qNorm) || desc.includes(qStem)) {
        return 500;
    }

    // 9. Coincidencia en otros campos (referencia, marca, modelo, lote, área)
    const otherFields = normalizeSearchText([item.referencia, item.marca, item.modelo, item.lote, item.area].filter(Boolean).join(' '));
    if (otherFields.includes(qNorm) || otherFields.includes(qStem)) {
        return 200;
    }

    return 50;
}

// ─── Search Activos Globally ─────────────────────────────────────────────────
export async function searchActivosGlobal(query: string, includeSold: boolean = false) {
    if (!query) return [];
    try {
        const orgId = await getOrgId();
        
        // Limpiar consulta
        const cleanQuery = query.trim().toUpperCase();
        if (cleanQuery.length < 2) return [];

        // Detectar si parece un código de barras (números únicamente) o un código QR
        const isExactCode = /^[A-Z]{3,}-[0-9-]+$/i.test(cleanQuery) || /^[0-9]{5,}$/.test(cleanQuery);

        const rawWords = cleanQuery.split(/\s+/).filter(Boolean);
        const words = rawWords.filter(w => w.length >= 2);
        const searchWords = words.length > 0 ? words : rawWords;

        const baseWhere: any = {
            organizationId: orgId,
            esParaRenta: false
        };

        // Excluir vendidos si no está habilitado el flag
        if (!includeSold) {
            baseWhere.estatusContable = {
                notIn: ['VENDIDO', 'VENDIDO/ENTREGADO']
            };
        }

        const andConditions: any[] = [];
        for (const word of searchWords) {
            const cleanW = removeAccents(word);
            const searchTerms = cleanW !== word ? [word, cleanW] : [word];
            const wordOR: any[] = [];
            for (const v of searchTerms) {
                wordOR.push(
                    { descripcionCorta: { contains: v, mode: 'insensitive' as const } },
                    { marca: { contains: v, mode: 'insensitive' as const } },
                    { referencia: { contains: v, mode: 'insensitive' as const } },
                    { lote: { contains: v, mode: 'insensitive' as const } }
                );
            }
            wordOR.push(
                { idQr: { contains: word, mode: 'insensitive' as const } },
                { codigoBarras: { contains: word, mode: 'insensitive' as const } }
            );
            andConditions.push({ OR: wordOR });
        }

        const whereClause = {
            ...baseWhere,
            ...(isExactCode ? {
                OR: [
                    { idQr: { contains: cleanQuery, mode: 'insensitive' as const } },
                    { codigoBarras: { contains: cleanQuery, mode: 'insensitive' as const } }
                ]
            } : {
                AND: andConditions
            })
        };

        const activos = await prisma.activoFijo.findMany({
            where: whereClause,
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
            take: 60
        });

        // Ordenar por relevancia calculada para priorizar coincidencias exactas y de inicio
        const scored = activos.map(a => ({
            ...a,
            _score: computeSearchRelevance(a, cleanQuery)
        })).sort((a, b) => {
            if (b._score !== a._score) return b._score - a._score;
            const descA = a.descripcionCorta || '';
            const descB = b.descripcionCorta || '';
            return descA.localeCompare(descB, 'es', { sensitivity: 'base' });
        });

        return scored.map(({ _score, ...rest }) => rest);
    } catch (e) {
        console.error("searchActivosGlobal error:", e);
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
export async function getActivos(page = 1, search = '', area = '', estatus = '', origen = '', condicion = '', tipoInventario = 'real') {
    const orgIds = await getEffectiveOrgIds();
    const PER_PAGE = 10;
    const skip = (page - 1) * PER_PAGE;

    const cleanSearch = search.trim();

    // ─── Pestaña Especial: Catálogo de Productos Importados desde Web ───────────
    if (tipoInventario === 'importado') {
        const prodWhere: any = {
            organizationId: { in: orgIds },
            ...(origen && origen !== 'TODOS' && origen !== 'SIN_DEFINIR' && {
                sku: { startsWith: origen }
            })
        };

        let productos = await prisma.producto.findMany({
            where: prodWhere,
            orderBy: { createdAt: 'desc' },
        });

        if (cleanSearch) {
            const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const searchNorm = removeAccents(cleanSearch);
            productos = productos.filter(p => {
                const nombre = removeAccents(p.nombre || '');
                const sku = removeAccents(p.sku || '');
                const marca = removeAccents(p.marca || '');
                const modelo = removeAccents(p.modelo || '');
                const cat = removeAccents(p.categoria || '');
                return nombre.includes(searchNorm) || sku.includes(searchNorm) || marca.includes(searchNorm) || modelo.includes(searchNorm) || cat.includes(searchNorm);
            });
        }

        const total = productos.length;
        const paginatedProds = productos.slice(skip, skip + PER_PAGE);

        const plainActivos = paginatedProds.map(p => {
            let providerName = 'Catálogo Web';
            if (p.sku.startsWith('SOMA-')) providerName = 'Soma Tech';
            else if (p.sku.startsWith('SOMAPARTS-') || p.sku.startsWith('PARTS-')) providerName = 'Soma Medical Parts';
            else if (p.sku.startsWith('PUKANG-')) providerName = 'Pukang Medical';
            else if (p.sku.startsWith('JOSON-')) providerName = 'Joson Care';
            else if (p.sku.startsWith('AERTI-')) providerName = 'Aerti Oxygen';
            else if (p.sku.startsWith('DRE-')) providerName = 'DRE Medical';
            else if (p.sku.startsWith('AMCAREMED-')) providerName = 'AmcareMed';
            else if (p.sku.startsWith('RD-') || p.sku.startsWith('RDBATTERIES-')) providerName = 'R&D Batteries';

            const resolvedImg = p.imagenWeb 
                || (p.imagenes && p.imagenes.length > 0 ? p.imagenes[0] : null)
                || (p.sku.startsWith('CAT-') ? `https://pub-e15b9a4e15fd45f5924e2cc60a925b1e.r2.dev/odoo-products/${p.sku}.jpg` : null);

            return {
                id: p.id,
                idQr: p.sku,
                descripcionCorta: p.nombre,
                descripcionDetallada: p.descripcion,
                serie: p.sku,
                modelo: p.modelo || 'N/A',
                marca: p.marca || 'N/A',
                area: p.categoria || 'CATÁLOGO WEB',
                cuentaAct: 'IMPORTADO_WEB',
                origenActivo: providerName,
                estatusContable: 'VIGENTE',
                costoAdq: Number(p.costoBase || 0),
                precioVenta: Number(p.precioVenta || 0),
                imagenUrl: resolvedImg,
                imagenWeb: resolvedImg,
                stock: p.stockActual || 0,
                integrado: true,
                esImportadoWeb: true,
                providerName,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            };
        });

        return { activos: plainActivos, total, totalPages: Math.ceil(total / PER_PAGE) };
    }

    const where: any = {
        organizationId: { in: orgIds },
        esParaRenta: false,
        ...(area && { area }),
        ...(estatus && { estatusContable: estatus }),
        ...(origen && {
            origenActivo: origen === 'SIN_DEFINIR' ? null : origen
        }),
        ...(condicion && {
            condicionActivo: condicion === 'SIN_DEFINIR' ? null : condicion
        }),
        ...(tipoInventario === 'cliente' && {
            esEquipoCliente: true
        }),
        ...(tipoInventario === 'servicio' && {
            OR: [
                { area: 'SERVICIOS' },
                { stock: 9999 }
            ]
        }),
        ...(tipoInventario === 'real' && !cleanSearch && {
            esEquipoCliente: false,
            area: { not: 'SERVICIOS' },
            stock: { not: 9999 }
        }),
        ...(tipoInventario === 'real' && cleanSearch && {
            esEquipoCliente: false
        })
    };

    if (cleanSearch) {
        const words = cleanSearch.split(/\s+/).filter(Boolean);
        where.AND = words.map(w => {
            const cleanW = removeAccents(w);
            const searchTerms = cleanW !== w ? [w, cleanW] : [w];
            return {
                OR: [
                    ...searchTerms.flatMap(term => [
                        { descripcionCorta: { contains: term, mode: 'insensitive' as const } },
                        { marca: { contains: term, mode: 'insensitive' as const } },
                        { lote: { contains: term, mode: 'insensitive' as const } },
                        { referencia: { contains: term, mode: 'insensitive' as const } }
                    ]),
                    { idQr: { contains: w, mode: 'insensitive' as const } },
                    { codigoBarras: { contains: w, mode: 'insensitive' as const } }
                ]
            };
        });
    }

    const selectFields = {
        id: true,
        organizationId: true,
        idQr: true,
        descripcionCorta: true,
        descripcionDetallada: true,
        marca: true,
        modelo: true,
        serie: true,
        referencia: true,
        lote: true,
        area: true,
        codigoBarras: true,
        stock: true,
        cuentaAct: true,
        estatusContable: true,
        estadoDano: true,
        costoAdq: true,
        imagenUrl: true,
        imagenPlacaUrl: true,
        esConsumible: true,
        fechaVencimiento: true,
        origenActivo: true,
        condicionActivo: true,
        garantia: true,
        esEquipoCliente: true,
        cobertura: true,
        vidaUtilOverride: true,
        valResidual: true,
        baseDeprec: true,
        deprecMensual: true,
        deprecAcum: true,
        valorLibros: true,
        integrado: true,
        createdAt: true,
        updatedAt: true,
        categoria: { select: { id: true, nombre: true } },
        createdBy: { select: { nombre: true, apellido: true, email: true } },
        updatedBy: { select: { nombre: true, apellido: true, email: true } },
        responsable: true,
    };

    let activos: any[];
    let total: number;

    if (cleanSearch) {
        // Traer resultados coincidentes de forma ultra rápida (límite 60 para respuesta inmediata)
        const matchingActivos = await prisma.activoFijo.findMany({
            where,
            select: selectFields,
            take: 60,
        });

        const scoredActivos = matchingActivos.map(a => ({
            ...a,
            _score: computeSearchRelevance(a, cleanSearch)
        })).sort((a, b) => {
            if (b._score !== a._score) {
                return b._score - a._score;
            }
            const descA = a.descripcionCorta || '';
            const descB = b.descripcionCorta || '';
            const descCmp = descA.localeCompare(descB, 'es', { sensitivity: 'base' });
            if (descCmp !== 0) return descCmp;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        total = scoredActivos.length;
        activos = scoredActivos.slice(skip, skip + PER_PAGE).map(({ _score, ...rest }) => rest);
    } else {
        const [activosDb, countDb] = await Promise.all([
            prisma.activoFijo.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: PER_PAGE,
                select: selectFields,
            }),
            prisma.activoFijo.count({ where })
        ]);
        activos = activosDb;
        total = countDb;
    }

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
export async function getActivosForExport(search = '', area = '', estatus = '', origen = '', condicion = '', tipoInventario = 'real') {
    try {
        const orgIds = await getEffectiveOrgIds();
        const where = {
            organizationId: { in: orgIds },
            esParaRenta: false,
            ...(area && { area }),
            ...(estatus && { estatusContable: estatus }),
            ...(origen && {
                origenActivo: origen === 'SIN_DEFINIR' ? null : origen
            }),
            ...(condicion && {
                condicionActivo: condicion === 'SIN_DEFINIR' ? null : condicion
            }),
            ...(tipoInventario === 'cliente' && {
                esEquipoCliente: true
            }),
            ...(tipoInventario === 'servicio' && {
                OR: [
                    { area: 'SERVICIOS' },
                    { stock: 9999 }
                ]
            }),
            ...(tipoInventario === 'real' && !search.trim() && {
                esEquipoCliente: false,
                area: { not: 'SERVICIOS' },
                stock: { not: 9999 }
            }),
            ...(tipoInventario === 'real' && search.trim() && {
                esEquipoCliente: false
            })
        };

        let activos = await prisma.activoFijo.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { categoria: true }
        });

        if (search) {
            const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const searchNorm = removeAccents(search.trim());
            activos = activos.filter(a => {
                const desc = removeAccents(a.descripcionCorta || '');
                const qr = removeAccents(a.idQr || '');
                const code = removeAccents(a.codigoBarras || '');
                const ser = removeAccents(a.serie || '');
                const mod = removeAccents(a.modelo || '');
                const brand = removeAccents(a.marca || '');
                const resp = removeAccents(a.responsable || '');
                return desc.includes(searchNorm) || qr.includes(searchNorm) || code.includes(searchNorm) || ser.includes(searchNorm) || mod.includes(searchNorm) || brand.includes(searchNorm) || resp.includes(searchNorm);
            });

            activos.sort((a, b) => {
                const sA = computeSearchRelevance(a, search);
                const sB = computeSearchRelevance(b, search);
                if (sB !== sA) return sB - sA;
                return (a.descripcionCorta || '').localeCompare(b.descripcionCorta || '', 'es', { sensitivity: 'base' });
            });
        }

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

export async function getActivoStats(area?: string, tipoInventario = 'real') {
    const orgIds = await getEffectiveOrgIds();
    const { Prisma } = await import('@prisma/client');

    const totalImportadosWebCount = await prisma.producto.count({
        where: { organizationId: { in: orgIds } }
    });

    if (tipoInventario === 'importado') {
        return {
            total: totalImportadosWebCount,
            vigente: totalImportadosWebCount,
            enTransito: 0,
            depreciado: 0,
            procesoBaja: 0,
            conDano: 0,
            areasRegistradas: 1,
            totalImportadosWeb: totalImportadosWebCount
        };
    }

    let filterSql = Prisma.sql`AND "esParaRenta" = false AND "esEquipoCliente" = false AND "area" <> 'SERVICIOS' AND "stock" <> 9999`;

    if (tipoInventario === 'cliente') {
        filterSql = Prisma.sql`AND "esParaRenta" = false AND "esEquipoCliente" = true`;
    } else if (tipoInventario === 'servicio') {
        filterSql = Prisma.sql`AND "esParaRenta" = false AND ("area" = 'SERVICIOS' OR "stock" = 9999)`;
    }

    const areaSql = area ? Prisma.sql`AND "area" = ${area}` : Prisma.empty;

    const statsRaw = await prisma.$queryRaw<
        Array<{
            total: bigint;
            vigente: bigint;
            en_transito: bigint;
            depreciado: bigint;
            proceso_baja: bigint;
            con_dano: bigint;
            bajo_stock: bigint;
            areas_count: bigint;
        }>
    >`
        WITH org_areas AS (
            SELECT COUNT(DISTINCT "area") as areas_count 
            FROM "activos_fijos" 
            WHERE "organizationId" = ANY(${orgIds}::uuid[]) ${filterSql}
            ${areaSql}
        )
        SELECT 
            COALESCE(SUM("stock"), 0) as total,
            COALESCE(SUM("stock") FILTER (WHERE "estatusContable" = 'VIGENTE'), 0) as vigente,
            COALESCE(SUM("stock") FILTER (WHERE "estatusContable" = 'EN TRANSITO'), 0) as en_transito,
            COALESCE(SUM("stock") FILTER (WHERE "estatusContable" = 'DEPRECIADO'), 0) as depreciado,
            COALESCE(SUM("stock") FILTER (WHERE "estatusContable" = 'PROCESO DE BAJA'), 0) as proceso_baja,
            COALESCE(SUM("stock") FILTER (WHERE "estadoDano" IS NOT NULL), 0) as con_dano,
            COALESCE(COUNT(1) FILTER (WHERE "stock" <= 5 AND "estatusContable" = 'VIGENTE'), 0) as bajo_stock,
            (SELECT areas_count FROM org_areas)
        FROM "activos_fijos"
        WHERE "organizationId" = ANY(${orgIds}::uuid[]) ${filterSql}
        ${areaSql}
    `;

    const row = statsRaw[0];

    return {
        total: Number(row?.total || 0),
        vigente: Number(row?.vigente || 0),
        enTransito: Number(row?.en_transito || 0),
        depreciado: Number(row?.depreciado || 0),
        procesoBaja: Number(row?.proceso_baja || 0),
        conDano: Number(row?.con_dano || 0),
        bajoStock: Number(row?.bajo_stock || 0),
        areasRegistradas: Number(row?.areas_count || 0),
        totalImportadosWeb: totalImportadosWebCount
    };
}

// ─── Get Ubicaciones Activas ─────────────────────────────────────────────────
export async function getUbicacionesActivasByProducto(identificador: string, tipo: 'codigoBarras' | 'codigoGrupo' | 'descripcionCorta') {
    const orgId = await getOrgId();
    
    const whereClause: any = { organizationId: orgId, esParaRenta: false };
    if (tipo === 'codigoBarras') {
        whereClause.codigoBarras = { contains: identificador.trim(), mode: 'insensitive' };
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
    if (!codigoBarras?.trim()) return null;
    const orgId = await getOrgId();
    const cleanCode = codigoBarras.trim();
    const activo = await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, codigoBarras: { contains: cleanCode, mode: 'insensitive' }, esParaRenta: false },
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
    const cleanCode = codigoBarras.trim();
    const activo = await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, codigoBarras: { contains: cleanCode, mode: 'insensitive' }, esParaRenta: false },
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
    if (!codigoBarras?.trim()) return null;
    const orgId = await getOrgId();
    const cleanCode = codigoBarras.trim();
    return await prisma.activoFijo.findFirst({
        where: { organizationId: orgId, codigoBarras: { contains: cleanCode, mode: 'insensitive' }, esParaRenta: false },
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
        take: 30,
        orderBy: { createdAt: 'desc' }
    });

    const sorted = results.sort((a, b) => {
        const sA = computeSearchRelevance(a, query);
        const sB = computeSearchRelevance(b, query);
        if (sB !== sA) return sB - sA;
        return (a.descripcionCorta || '').localeCompare(b.descripcionCorta || '', 'es', { sensitivity: 'base' });
    }).slice(0, 10);

    return sorted;
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createActivo(formData: FormData): Promise<{ success?: boolean, idQr?: string, id?: string | null, count?: number, error?: string, restock?: boolean }> {
    const { orgId, userId } = await getContextUser();

    const area = formData.get('area') as string;
    const codigoGrupo = (formData.get('codigoGrupo') as string) || '001';
    const cantidadForm = formData.get('cantidad') as string;
    const cantidadRegistros = cantidadForm ? parseInt(cantidadForm, 10) : 1;
    const codigoBarrasForm = formData.get('codigoBarras') as string;
    const codigoBarras = codigoBarrasForm 
        ? codigoBarrasForm.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).join(', ') 
        : null;
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
    
    // Soporte para reemplazo manual/escaneado de código por SuperAdmin
    const customIdQr = (formData.get('customIdQr') as string || formData.get('idQr') as string)?.trim();
    if (customIdQr) {
        const duplicate = await prisma.activoFijo.findFirst({
            where: { organizationId: orgId, idQr: customIdQr }
        });
        if (duplicate) {
            return { error: `El código ID QR "${customIdQr}" ya existe en el sistema (${duplicate.descripcionCorta}). Elige un código único.` };
        }
    }

    // Si es servicio, usar el codigo manual ingresado (codigoBarras) como idQr para rastreo exacto.
    const idQrs = customIdQr ? [customIdQr] : ((esServicio && codigoBarras) ? [codigoBarras] : await generateIdQr(orgId, area, codigoGrupo, numIds));

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
        esParaRenta,
        esEquipoCliente: formData.get('esEquipoCliente') === 'true',
        cobertura: (formData.get('cobertura') as string) || 'externa',
        clienteId: (formData.get('clienteId') as string) || null
    };

    // ── Master-Data Integrity Constraint ──
    if (codigoBarras) {
        const barCodesArray = codigoBarras.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        const master = await prisma.activoFijo.findFirst({
            where: { 
                organizationId: orgId,
                OR: barCodesArray.map(code => ({ codigoBarras: { contains: code, mode: 'insensitive' } }))
            },
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
            const barCodesArray = codigoBarras.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            whereClause.OR = barCodesArray.map(code => ({ codigoBarras: { contains: code, mode: 'insensitive' } }));
        } else if (codigoGrupo) {
            whereClause.codigoGrupo = codigoGrupo;
            whereClause.descripcionCorta = baseData.descripcionCorta; // PROTECCIÓN: Impide agrupar equipos distintos sin GS1
        }
        
        const existente = await prisma.activoFijo.findFirst({
            where: whereClause,
            orderBy: { createdAt: 'asc' } // el original de esa área
        });
        
        if (existente) {
            let mergedBarcode = existente.codigoBarras;
            if (codigoBarras) {
                const existingCodes = (existente.codigoBarras || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                const newCodes = codigoBarras.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                const mergedSet = Array.from(new Set([...existingCodes, ...newCodes]));
                mergedBarcode = mergedSet.join(', ');
            }

            await prisma.activoFijo.update({
                where: { id: existente.id },
                data: {
                    stock: existente.stock + cantidadRegistros,
                    codigoBarras: mergedBarcode,
                    estatusContable: 'VIGENTE'
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

    if (formData.get('esEquipoCliente') === 'true' && firstCreatedId) {
        const cId = formData.get('clienteId') as string;
        try {
            await prisma.equipoCliente.create({
                data: {
                    organizationId: orgId,
                    clienteId: cId,
                    activoFijoId: firstCreatedId,
                    nombre: (formData.get('descripcionCorta') as string || '').trim(),
                    marca: (formData.get('marca') as string || '').trim() || null,
                    modelo: (formData.get('modelo') as string || '').trim() || null,
                    serie: (formData.get('serie') as string || '').trim() || null,
                    codigoEtiqueta: finalIdQrs[0]
                }
            });
        } catch (eqErr) {
            console.error("Error creating mirrored EquipoCliente record in createActivo:", eqErr);
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

        // Soporte para reemplazo manual/escaneado de código por SuperAdmin
        const customIdQr = (formData.get('customIdQr') as string || formData.get('idQr') as string)?.trim();
        if (customIdQr) {
            const duplicate = await prisma.activoFijo.findFirst({
                where: {
                    organizationId: orgId,
                    idQr: customIdQr,
                    id: { not: id }
                }
            });
            if (duplicate) {
                return { error: `El código ID QR "${customIdQr}" ya pertenece a otro producto (${duplicate.descripcionCorta}). Elige un código único.` };
            }
        }

        await prisma.activoFijo.updateMany({
            where: { id, organizationId: orgId },
            data: {
                ...(customIdQr && { idQr: customIdQr }),
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
                codigoBarras: (formData.get('codigoBarras') as string)
                    ? (formData.get('codigoBarras') as string).split(/[\n,]+/).map(s => s.trim()).filter(Boolean).join(', ')
                    : null,
                esEquipoCliente: formData.get('esEquipoCliente') === 'true',
                cobertura: (formData.get('cobertura') as string) || 'externa',
                clienteId: (formData.get('clienteId') as string) || null
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
    try {
        const orgId = await getOrgId();
        
        await prisma.$transaction(async (tx) => {
            // 1. Set references to null in DetalleFactura (optional relation)
            await tx.detalleFactura.updateMany({
                where: { activoId: id },
                data: { activoId: null }
            });

            // 2. Set references to null in OrdenTrabajoRepuesto (optional relation)
            await tx.ordenTrabajoRepuesto.updateMany({
                where: { activoFijoId: id },
                data: { activoFijoId: null }
            });

            // 3. Set references to null in OrdenTrabajo (optional relation)
            await tx.ordenTrabajo.updateMany({
                where: { activoId: id },
                data: { activoId: null }
            });

            // 4. Delete associated RentaEquipo records (which cascade deletes RentaPago)
            await tx.rentaEquipo.deleteMany({
                where: { activoFijoId: id, organizationId: orgId }
            });

            // 5. Finally delete the ActivoFijo record
            await tx.activoFijo.deleteMany({
                where: { id, organizationId: orgId }
            });
        });

        revalidatePath('/inventario');
        revalidatePath('/rentas/equipos');
        return { success: true };
    } catch (error: any) {
        console.error('Error in deleteActivo:', error);
        return { success: false, error: error.message || 'Error al eliminar el activo' };
    }
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

export async function encolarLoteImpresion(codigoGrupo: string, cantidad: number, size: string = '50x25', impresora: string = 'Vorttek') {
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

export async function encolarCopiasNiimbot(activoId: string, cantidad: number, size: string = '50x25', impresora: string = 'Vorttek') {
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

    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://paraiso-floral.vercel.app';
    
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
        
        // 2. Fetch all current assets to determine maxCorrelativo
        const todos = await prisma.activoFijo.findMany({
            where: { organizationId: orgId },
            select: { idQr: true }
        });

        let maxCorrelativo = 0;
        for (const act of todos) {
            if (!act.idQr) continue;
            let numStr = act.idQr;
            if (act.idQr.includes('-')) {
                const parts = act.idQr.split('-');
                numStr = parts[parts.length - 1];
            }
            const num = Number(numStr);
            if (!isNaN(num)) {
                if (num > maxCorrelativo) maxCorrelativo = num;
            }
        }

        const dateTag = new Date().toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' })
            .replace(/, /g, ' ')
            .substring(0, 16);
        const batchTag = `Lote CSV: ${dateTag.replace(/:/g, '-')}`;
        
        const createdIds: string[] = [];
        let importedCount = 0;

        function parseDate(dateStr?: string): Date | null {
            if (!dateStr || !dateStr.trim()) return null;
            const cleanStr = dateStr.trim();
            const parts = cleanStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) return date;
            }
            const fallback = new Date(cleanStr);
            return !isNaN(fallback.getTime()) ? fallback : null;
        }

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
                } else {
                    const camaraArea = await tx.area.findFirst({
                        where: { 
                            organizationId: orgId,
                            name: { contains: 'CAMARA', mode: 'insensitive' }
                        },
                        orderBy: { name: 'asc' }
                    });
                    if (camaraArea) {
                        areaIdOrName = camaraArea.name;
                    } else {
                        const primerArea = await tx.area.findFirst({
                            where: { organizationId: orgId },
                            orderBy: { name: 'asc' }
                        });
                        if (primerArea) {
                            areaIdOrName = primerArea.name;
                        }
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
                const itemLote = (item.lote && item.lote.trim()) || null;
                const itemFecha = parseDate(item.fechaAdq);
                
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
                    updatedById: userId,
                    lote: itemLote,
                    fechaAdq: itemFecha
                };

                if (esConsumible) {
                    // Consumible Re-entry logic (Agrupación)
                    const whereClause: any = { organizationId: orgId, esConsumible: true };
                    if (item.idQr && item.idQr.trim()) {
                        whereClause.idQr = item.idQr.trim();
                    } else if (codigoBarras) {
                        whereClause.codigoBarras = codigoBarras;
                        whereClause.area = areaIdOrName;
                    } else {
                        whereClause.codigoGrupo = codigoGrupo;
                        whereClause.descripcionCorta = baseData.descripcionCorta;
                        whereClause.area = areaIdOrName;
                    }

                    const existente = await tx.activoFijo.findFirst({
                        where: whereClause,
                        orderBy: { createdAt: 'asc' }
                    });

                    if (existente) {
                        // Increment stock and update lote/date
                        const updated = await tx.activoFijo.update({
                            where: { id: existente.id },
                            data: { 
                                stock: existente.stock + cantidad,
                                lote: itemLote || existente.lote,
                                fechaAdq: itemFecha || existente.fechaAdq
                            }
                        });
                        createdIds.push(updated.id);
                        importedCount += cantidad;
                    } else {
                        // Create new consumible
                        let finalQr = item.idQr?.trim();
                        if (!finalQr) {
                            maxCorrelativo++;
                            finalQr = String(maxCorrelativo).padStart(6, '0');
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
                            finalQr = String(maxCorrelativo).padStart(6, '0');
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

        const host = process.env.NEXT_PUBLIC_APP_URL || 'https://paraiso-floral.vercel.app';
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
                size: '50x25'
            });
            const urlImagen = `${host}/api/impresion/generar-etiqueta?${params.toString()}`;

            printJobs.push({
                organizationId: orgId,
                activoId: activo.id,
                urlImagen,
                estado: 'PENDIENTE',
                impresora: 'Vorttek',
                tamano: '50x25'
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

export async function searchWebCatalogProducts(query: string) {
    const orgId = await getOrgId();
    if (!query || query.trim().length === 0) return [];

    const searchTerm = query.trim();
    const keywords = searchTerm.split(/\s+/).filter(Boolean);

    const andConditions = keywords.map(keyword => ({
        OR: [
            { nombre: { contains: keyword, mode: 'insensitive' as const } },
            { sku: { contains: keyword, mode: 'insensitive' as const } },
            { marca: { contains: keyword, mode: 'insensitive' as const } },
            { modelo: { contains: keyword, mode: 'insensitive' as const } },
            { categoria: { contains: keyword, mode: 'insensitive' as const } }
        ]
    }));

    try {
        const results = await prisma.producto.findMany({
            where: {
                organizationId: orgId,
                AND: andConditions
            },
            take: 20,
        });
        return results;
    } catch (error) {
        console.error("Error searching web catalog products:", error);
        return [];
    }
}

export async function generateNextSkuCode(): Promise<string> {
    try {
        const orgId = await getOrgId();
        const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { qrPrefix: true } });
        const prefijoBase = org?.qrPrefix || 'BEA';

        const items = await prisma.activoFijo.findMany({
            where: {
                organizationId: orgId,
                codigoBarras: { startsWith: `${prefijoBase}-SKU-` }
            },
            select: { codigoBarras: true }
        });

        let maxCorrelativo = 0;
        const regex = new RegExp(`^${prefijoBase}-SKU-(\\d+)$`);
        for (const item of items) {
            if (item.codigoBarras) {
                const match = item.codigoBarras.match(regex);
                if (match) {
                    const num = Number(match[1]);
                    if (num > maxCorrelativo) maxCorrelativo = num;
                }
            }
        }

        const nextNum = maxCorrelativo + 1;
        const nextCode = `${prefijoBase}-SKU-${String(nextNum).padStart(5, '0')}`;
        return nextCode;
    } catch (err) {
        console.error("Error generating next SKU code:", err);
        return `BEA-SKU-00001`;
    }
}

export async function recibirActivoEnTransito(id: string) {
    try {
        const orgId = await getOrgId();
        await prisma.activoFijo.updateMany({
            where: { id, organizationId: orgId },
            data: {
                estatusContable: 'VIGENTE'
            }
        });
        revalidatePath('/inventario');
        return { success: true };
    } catch (e: any) {
        console.error("Error in recibirActivoEnTransito:", e);
        return { success: false, error: e.message || 'Error al actualizar estatus' };
    }
}

export async function getFacturaByActivoId(activoId: string) {
    try {
        const orgId = await getOrgId();
        const detalle = await prisma.detalleFactura.findFirst({
            where: {
                activoId,
                factura: {
                    organizationId: orgId,
                    estado: { not: 'ANULADA' }
                }
            },
            include: {
                factura: {
                    select: {
                        id: true,
                        correlativo: true,
                        estado: true
                    }
                }
            }
        });
        return { success: true, factura: detalle?.factura || null };
    } catch (e: any) {
        console.error("Error in getFacturaByActivoId:", e);
        return { success: false, error: e.message || 'Error al obtener la factura del activo' };
    }
}

export async function getActivoForEdit(idOrQr: string) {
    try {
        const orgId = await getOrgId();
        const activo = await prisma.activoFijo.findFirst({
            where: {
                organizationId: orgId,
                OR: [
                    { id: idOrQr },
                    { idQr: idOrQr }
                ]
            },
            include: {
                cliente: true,
            }
        });
        if (!activo) return null;
        const a = activo as any;
        return {
            ...activo,
            valorAdq: Number(a.valorAdq || a.costo || 0),
            costoReemplazo: Number(a.costoReemplazo || 0),
            valorResidual: Number(a.valorResidual || 0),
            origenActivo: a.origenActivo,
            condicionActivo: a.condicionActivo,
        };
    } catch (err) {
        console.error('Error fetching activo for edit:', err);
        return null;
    }
}



