'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

// helper
async function getOrgId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");
    const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
    if (!dbUser) throw new Error("Usuario no encontrado");
    return dbUser.organizationId;
}

export type ProductoPricing = {
  id: string;
  codigo: string;
  descripcion: string;
  referencia: string | null;
  categoria: string | null;
  costoBase: number | null;
  precioVenta: number | null;
  stock: number;
  estado: string;
  sinPrecio: boolean;
  tipo: 'PRODUCTO' | 'GRUPO_ACTIVO_FIJO';
  imagenUrl?: string | null;
  subActivos?: { id?: string; idQr: string; serie: string | null; ubicacion: string; stock: number; imagenUrl?: string | null }[];
};

export type ActualizarPrecioInput = {
  id: string;
  tipo: 'PRODUCTO' | 'GRUPO_ACTIVO_FIJO';
  descripcion?: string;
  referencia?: string | null;
  subActivoIds?: string[];
  costoBase: number;
  precioVenta: number;
};

export type CrearProductoInput = {
  codigo: string;
  descripcion: string;
  referencia?: string;
  categoria?: string;
  costoBase: number;
  precioVenta: number;
};

function getAccentCombinations(str: string): string[] {
    const map: Record<string, string[]> = {
        'a': ['a', 'á'],
        'e': ['e', 'é'],
        'i': ['i', 'í'],
        'o': ['o', 'ó'],
        'u': ['u', 'ú']
    };

    const normalizedStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    let results = [''];
    let vowelCount = 0;

    for (const char of normalizedStr) {
        const options = map[char] || [char];
        if (options.length > 1) vowelCount++;

        if (vowelCount > 5) {
            results = results.map(r => r + char);
            continue;
        }

        const nextResults: string[] = [];
        for (const res of results) {
            for (const opt of options) {
                nextResults.push(res + opt);
            }
        }
        results = nextResults;
    }
    return Array.from(new Set(results));
}

export async function getProductosPricing(query?: string): Promise<ProductoPricing[]> {
    const orgId = await getOrgId();
    const searchTerms = query ? getAccentCombinations(query) : [];

    const productos = await prisma.producto.findMany({
        where: {
            organizationId: orgId,
            ...(query ? {
                OR: searchTerms.flatMap(term => [
                    { nombre: { contains: term, mode: 'insensitive' } },
                    { sku: { contains: term, mode: 'insensitive' } }
                ])
            } : {})
        },
        include: {
            activosFijos: {
                where: { estatusContable: 'VIGENTE' },
                select: { idQr: true, serie: true, area: true, stock: true, imagenUrl: true, imagenWeb: true }
            }
        }
    });

    const activosSinProducto = await prisma.activoFijo.findMany({
        where: {
            organizationId: orgId,
            productoId: null,
            estatusContable: 'VIGENTE',
            ...(query ? {
                OR: searchTerms.flatMap(term => [
                    { descripcionCorta: { contains: term, mode: 'insensitive' } },
                    { codigoBarras: { contains: term, mode: 'insensitive' } },
                    { referencia: { contains: term, mode: 'insensitive' } },
                    { modelo: { contains: term, mode: 'insensitive' } }
                ])
            } : {})
        },
        select: {
            id: true,
            idQr: true,
            descripcionCorta: true,
            referencia: true,
            codigoBarras: true,
            modelo: true,
            marca: true,
            costoAdq: true,
            stock: true,
            area: true,
            serie: true,
            categoria: { select: { nombre: true } },
            imagenUrl: true,
            imagenWeb: true
        }
    });

    const grupos = new Map<string, ProductoPricing>();

    for (const activo of activosSinProducto) {
        const desc = activo.descripcionCorta || 'Sin Descripción';
        const normDesc = desc.trim().toLowerCase();
        const normRef = (activo.referencia || '').trim().toLowerCase();
        const normCode = (activo.codigoBarras || '').trim().toLowerCase();
        const normModel = (activo.modelo || '').trim().toLowerCase();
        const normBrand = (activo.marca || '').trim().toLowerCase();

        const refKey = normRef || normCode || normModel || (normBrand ? `marca:${normBrand}` : '');
        const groupKey = `${normDesc}:::${refKey}`;

        const activeImg = activo.imagenUrl || activo.imagenWeb || null;
        const subItem = { id: activo.id, idQr: activo.idQr, serie: activo.serie, ubicacion: activo.area || 'Sin asignar', stock: activo.stock || 1, imagenUrl: activeImg };
        const refDisplay = activo.referencia || activo.codigoBarras || activo.modelo || (activo.marca ? `Marca: ${activo.marca}` : null);

        if (!grupos.has(groupKey)) {
            grupos.set(groupKey, {
                id: activo.id,
                codigo: 'AGRUPADO-' + (activo.idQr.split('-').slice(0, 2).join('-')),
                descripcion: desc,
                referencia: refDisplay,
                categoria: activo.categoria?.nombre || 'Activo Fijo',
                costoBase: activo.costoAdq ? Number(activo.costoAdq) : null,
                precioVenta: null,
                stock: activo.stock || 1,
                estado: 'VIGENTE',
                sinPrecio: true,
                tipo: 'GRUPO_ACTIVO_FIJO',
                imagenUrl: activeImg,
                subActivos: [subItem]
            });
        } else {
            const actual = grupos.get(groupKey)!;
            actual.stock += (activo.stock || 1);
            actual.subActivos!.push(subItem);
            if (!actual.imagenUrl && activeImg) {
                actual.imagenUrl = activeImg;
            }
            if (!actual.referencia && refDisplay) {
                actual.referencia = refDisplay;
            }
        }
    }

    const resultado: ProductoPricing[] = [
        ...productos.map(p => {
             const sumHijos = p.activosFijos ? p.activosFijos.reduce((acc, curr) => acc + (curr.stock || 1), 0) : 0;
             const finalStock = p.activosFijos && p.activosFijos.length > 0 ? sumHijos : (p.stockActual || 0);
             const firstAssetWithImg = p.activosFijos?.find(a => a.imagenUrl || a.imagenWeb);
             const mainImageUrl = p.imagenWeb || (p.imagenes && p.imagenes[0]) || firstAssetWithImg?.imagenUrl || firstAssetWithImg?.imagenWeb || null;

             return {
                 id: p.id,
                 codigo: p.sku,
                 descripcion: p.nombre,
                 referencia: null,
                 categoria: null,
                 costoBase: p.costoBase ? Number(p.costoBase) : null,
                 precioVenta: p.precioVenta ? Number(p.precioVenta) : null,
                 stock: finalStock,
                 estado: p.estado,
                 sinPrecio: !p.costoBase || !p.precioVenta,
                 tipo: 'PRODUCTO' as const,
                 imagenUrl: mainImageUrl,
                 subActivos: p.activosFijos && p.activosFijos.length > 0 ? p.activosFijos.map(a => ({
                     idQr: a.idQr,
                     serie: a.serie,
                     ubicacion: a.area || 'Sin asignar',
                     stock: a.stock || 1,
                     imagenUrl: a.imagenUrl || a.imagenWeb || null
                 })) : []
             };
        }),
        ...Array.from(grupos.values())
    ];

    resultado.sort((a, b) => {
        if (a.sinPrecio && !b.sinPrecio) return -1;
        if (!a.sinPrecio && b.sinPrecio) return 1;
        return a.descripcion.localeCompare(b.descripcion);
    });

    return resultado;
}

export async function updatePrecioGrupable(input: ActualizarPrecioInput) {
    const orgId = await getOrgId();

    if (input.costoBase < 0 || input.precioVenta < 0) {
        return { success: false, message: 'Los precios no pueden ser negativos.' };
    }

    try {
        if (input.tipo === 'PRODUCTO') {
            await prisma.producto.update({
                where: { id: input.id },
                data: {
                    costoBase: input.costoBase,
                    precioVenta: input.precioVenta,
                }
            });
        } else if (input.tipo === 'GRUPO_ACTIVO_FIJO') {
            if (!input.descripcion) throw new Error("Falta la descripción para agrupar.");

            const newSku = 'CAT-' + String(Date.now()).slice(-6);

            const whereCondition: any = {
                organizationId: orgId,
                productoId: null
            };

            if (input.subActivoIds && input.subActivoIds.length > 0) {
                whereCondition.id = { in: input.subActivoIds };
            } else {
                whereCondition.descripcionCorta = input.descripcion;
                if (input.referencia !== undefined && input.referencia !== null) {
                    whereCondition.referencia = input.referencia;
                }
            }

            const agg = await prisma.activoFijo.aggregate({
                where: whereCondition,
                _sum: { stock: true }
            });
            const stockTotal = agg._sum.stock || 0;

            const nuevoProd = await prisma.producto.create({
                data: {
                    organizationId: orgId,
                    sku: newSku,
                    nombre: input.descripcion,
                    precioVenta: input.precioVenta,
                    costoBase: input.costoBase,
                    estado: 'ACTIVO',
                    stockActual: stockTotal
                }
            });

            await prisma.activoFijo.updateMany({
                where: whereCondition,
                data: {
                    productoId: nuevoProd.id
                }
            });

            return { success: true, message: 'Precios actualizados y vinculados correctamente.', newSku, newStock: stockTotal };
        }

        return { success: true, message: 'Precios actualizados y vinculados correctamente.' };
    } catch (e: any) {
        return { success: false, message: 'Error al actualizar el precio: ' + e.message };
    }
}

export async function crearProducto(data: CrearProductoInput) {
    const orgId = await getOrgId();

    const existente = await prisma.producto.findFirst({
        where: { organizationId: orgId, sku: data.codigo }
    });

    if (existente) {
        return { success: false, message: `El código "${data.codigo}" ya existe en el catálogo.` };
    }

    try {
        const nuevo = await prisma.producto.create({
            data: {
                organizationId: orgId,
                sku: data.codigo,
                nombre: data.descripcion,
                precioVenta: data.precioVenta,
                costoBase: data.costoBase,
                estado: 'ACTIVO'
            }
        });

        return { success: true, message: 'Producto base creado exitosamente.', producto: nuevo };
    } catch (e: any) {
        return { success: false, message: 'Error interno: ' + e.message };
    }
}

export async function buscarReferenciaOdoo(query: string): Promise<any[]> {
    const orgId = await getOrgId();
    if (!query || query.trim().length === 0) return [];
    const searchTerm = query.trim();
    const keywords = searchTerm.split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return [];
    const andConditions = keywords.map(keyword => ({
        OR: [
            { nombre: { contains: keyword, mode: 'insensitive' as const } },
            { nombreMostrar: { contains: keyword, mode: 'insensitive' as const } },
            { codigoBarras: { contains: keyword, mode: 'insensitive' as const } },
            { referenciaInterna: { contains: keyword, mode: 'insensitive' as const } },
            { odooId: { contains: keyword, mode: 'insensitive' as const } },
            { notasInternas: { contains: keyword, mode: 'insensitive' as const } },
            { descripcionSitioWeb: { contains: keyword, mode: 'insensitive' as const } }
        ]
    }));
    try {
        const odooProducts = await prisma.productoOdoo.findMany({ where: { AND: andConditions }, take: 30 });
        const results = [];
        for (const prod of odooProducts) {
            let costoHistorico: number | null = null;
            if (prod.odooId) {
                const hist = await prisma.inventarioHistorico.findFirst({
                    where: { organizationId: orgId, observaciones: { contains: `ODOO-${prod.odooId}` } },
                    select: { costoAdquisicion: true }
                });
                if (hist?.costoAdquisicion) costoHistorico = hist.costoAdquisicion.toNumber();
            }
            results.push({
                id: prod.id, odooId: prod.odooId, nombre: prod.nombre, nombreMostrar: prod.nombreMostrar,
                codigoBarras: prod.codigoBarras, notasInternas: prod.notasInternas, cantidadOdoo: prod.cantidadOdoo,
                descripcionSitioWeb: prod.descripcionSitioWeb, imagenUrl: prod.imagenUrl,
                pasilloEstante: prod.pasilloEstante, referenciaInterna: prod.referenciaInterna,
                tipoProducto: prod.tipoProducto, costoHistorico
            });
        }
        return results;
    } catch (error) {
        console.error("Error al buscar referencia de Odoo:", error);
        return [];
    }
}

// ─── Categorías para el registro rápido desde Odoo ───────────────────────────
export async function getCategoriasParaRegistro(): Promise<{ id: string; nombre: string; color: string | null }[]> {
    try {
        const orgId = await getOrgId();
        return await prisma.categoria.findMany({
            where: { organizationId: orgId },
            orderBy: { nombre: 'asc' },
            select: { id: true, nombre: true, color: true }
        });
    } catch {
        return [];
    }
}

// ─── Registro rápido de activo desde Odoo ────────────────────────────────────
export async function registrarDesdeOdoo(input: {
    nombre: string;
    descripcionDetallada?: string;
    imagenUrl?: string;
    codigoBarras?: string;
    cantidad: number;
    referenciaInterna?: string;
    pasilloEstante?: string;
    categoriaId?: string;
    esConsumible: boolean;
    area: string;
    cuentaAct: string;
    imprimirEtiqueta?: boolean;
}): Promise<{ success: boolean; idQr?: string; id?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No autenticado' };

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, organizationId: true }
        });
        if (!dbUser) return { success: false, error: 'Usuario no encontrado' };
        const { id: userId, organizationId: orgId } = dbUser;

        // Generar idQr
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { qrPrefix: true }
        });
        const prefix = org?.qrPrefix || 'BEA';

        const todos = await prisma.activoFijo.findMany({
            where: { organizationId: orgId, idQr: { startsWith: `${prefix}-` } },
            select: { idQr: true }
        });
        let maxNum = 0;
        for (const a of todos) {
            const parts = a.idQr.split('-');
            const last = parts[parts.length - 1];
            if (!isNaN(Number(last)) && Number(last) > maxNum) maxNum = Number(last);
        }
        const nextNum = String(maxNum + 1).padStart(6, '0');
        const idQr = `${prefix}-001-${nextNum}`;

        // Crear el activo
        const activo = await prisma.activoFijo.create({
            data: {
                organizationId: orgId,
                idQr,
                descripcionCorta: input.nombre.trim(),
                descripcionDetallada: input.descripcionDetallada || null,
                imagenUrl: input.imagenUrl || null,
                codigoBarras: input.codigoBarras || null,
                stock: input.cantidad || 1,
                referencia: input.referenciaInterna || null,
                observaciones: input.pasilloEstante ? `Ubicación Odoo: ${input.pasilloEstante}` : null,
                categoriaId: input.categoriaId || null,
                esConsumible: input.esConsumible,
                area: input.area.trim().toUpperCase() || 'ALMACEN',
                cuentaAct: input.cuentaAct || '1810-00',
                estatusContable: 'VIGENTE',
                origenActivo: 'ODOO',
                createdById: userId,
                updatedById: userId,
            }
        });

        // Encolar etiqueta de impresión si se solicitó
        if (input.imprimirEtiqueta) {
            const qrText = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || 'https://sistema.bioelectronicahn.com'}/ficha-tecnica/${idQr}`);
            const labelUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${qrText}&scale=4&eclevel=M&includetext=false`;
            await prisma.colaImpresion.create({
                data: {
                    organizationId: orgId,
                    activoId: activo.id,
                    urlImagen: labelUrl,
                    estado: 'PENDIENTE',
                    impresora: 'Niimbot',
                    tamano: '50x30'
                }
            });
        }

        revalidatePath('/inventario');
        revalidatePath('/precios');
        return { success: true, idQr, id: activo.id };
    } catch (e: any) {
        console.error('Error registrarDesdeOdoo:', e);
        return { success: false, error: e.message || 'Error interno' };
    }
}
