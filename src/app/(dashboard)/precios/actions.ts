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
  id: string; // Puede ser id de Producto o el idQr/codigoGrupo representativo del grupo
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
};

export type ActualizarPrecioInput = {
  id: string;
  tipo: 'PRODUCTO' | 'GRUPO_ACTIVO_FIJO';
  descripcion?: string; // Para agrupar activos
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

export async function getProductosPricing(query?: string): Promise<ProductoPricing[]> {
    const orgId = await getOrgId();

    // 1. Obtener los productos ya registrados en el catálogo
    const productos = await prisma.producto.findMany({
        where: {
            organizationId: orgId,
            ...(query ? {
                OR: [
                    { nombre: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } }
                ]
            } : {})
        }
    });

    // 2. Obtener los Activos Fijos que NO tienen productoId asignado, agrupados por descripcionCorta
    // Solo agruparemos los que están VIGENTES
    const activosSinProducto = await prisma.activoFijo.findMany({
        where: {
            organizationId: orgId,
            productoId: null,
            estatusContable: 'VIGENTE',
            ...(query ? {
                OR: [
                    { descripcionCorta: { contains: query, mode: 'insensitive' } },
                    { codigoBarras: { contains: query, mode: 'insensitive' } }
                ]
            } : {})
        },
        select: {
            id: true,
            idQr: true,
            descripcionCorta: true,
            referencia: true,
            costoAdq: true,
            stock: true,
            categoria: { select: { nombre: true } }
        }
    });

    // Agrupar manualmente en memoria (Prisma groupBy no retorna full select de relaciones tan fácil)
    const grupos = new Map<string, ProductoPricing>();

    for (const activo of activosSinProducto) {
        const desc = activo.descripcionCorta || 'Sin Descripción';
        if (!grupos.has(desc)) {
            grupos.set(desc, {
                id: activo.id, // ID representativo (el primero que encuentra)
                codigo: 'AGRUPADO-' + (activo.idQr.split('-').slice(0, 2).join('-')), // Ej: AGRUPADO-BEA-001
                descripcion: desc,
                referencia: activo.referencia,
                categoria: activo.categoria?.nombre || 'Activo Fijo',
                costoBase: activo.costoAdq ? Number(activo.costoAdq) : null,
                precioVenta: null, // Porque no tienen producto asignado aún
                stock: activo.stock || 1,
                estado: 'VIGENTE',
                sinPrecio: true,
                tipo: 'GRUPO_ACTIVO_FIJO'
            });
        } else {
            // Ya existe este grupo, solo sumamos el stock
            const actual = grupos.get(desc)!;
            actual.stock += (activo.stock || 1);
        }
    }

    // Unificar resultados
    const resultado: ProductoPricing[] = [
        ...productos.map(p => ({
            id: p.id,
            codigo: p.sku,
            descripcion: p.nombre,
            referencia: null,
            categoria: null,
            costoBase: p.costoBase ? Number(p.costoBase) : null,
            precioVenta: p.precioVenta ? Number(p.precioVenta) : null,
            stock: p.stockActual || 0,
            estado: p.estado,
            sinPrecio: !p.costoBase || !p.precioVenta,
            tipo: 'PRODUCTO' as const
        })),
        ...Array.from(grupos.values())
    ];

    // Ordenar: primero los que no tienen precio (sinPrecio = true), luego por descripción
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
            // Es un grupo de Activos Fijos -> Creamos el Producto Maestro en el Catálogo.
            if (!input.descripcion) throw new Error("Falta la descripción para agrupar.");

            // Buscar un SKU que no exista
            const newSku = 'CAT-' + String(Date.now()).slice(-6);

            const nuevoProd = await prisma.producto.create({
                data: {
                    organizationId: orgId,
                    sku: newSku,
                    nombre: input.descripcion, // La descripción corta es el nombre base
                    precioVenta: input.precioVenta,
                    costoBase: input.costoBase,
                    estado: 'ACTIVO',
                }
            });

            // Asignarle el nuevo `productoId` a todos los activos con esta descripcionCorta
            await prisma.activoFijo.updateMany({
                where: {
                    organizationId: orgId,
                    descripcionCorta: input.descripcion,
                    productoId: null
                },
                data: {
                    productoId: nuevoProd.id
                }
            });
        }

        revalidatePath('/precios');
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

        revalidatePath('/precios');
        return { success: true, message: 'Producto base creado exitosamente.', producto: nuevo };
    } catch (e: any) {
        return { success: false, message: 'Error interno: ' + e.message };
    }
}
