'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function registrarEntrada(
    organizationId: string,
    usuarioId: string,
    activoId: string,
    cantidad: number,
    motivo: string,
    referencia?: string
) {
    if (cantidad <= 0) {
        return { success: false, error: "La cantidad debe ser mayor a 0." };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Find the inventory asset
            const activo = await tx.activoFijo.findUnique({
                where: { id: activoId }
            });

            if (!activo) {
                throw new Error("Producto de inventario no encontrado.");
            }

            let finalProductoId = activo.productoId;
            if (!finalProductoId) {
                // Find if a product with the same SKU already exists for this org
                const skuCode = activo.codigoBarras || activo.idQr;
                const existingProd = await tx.producto.findFirst({
                    where: { organizationId, sku: skuCode }
                });

                if (existingProd) {
                    finalProductoId = existingProd.id;
                } else {
                    // Create product template on the fly
                    const newProd = await tx.producto.create({
                        data: {
                            organizationId,
                            sku: skuCode,
                            nombre: activo.descripcionCorta,
                            precioVenta: activo.costoAdq || 0,
                            stockActual: activo.stock
                        }
                    });
                    finalProductoId = newProd.id;
                }

                // Link the asset to the product
                await tx.activoFijo.update({
                    where: { id: activoId },
                    data: { productoId: finalProductoId }
                });
            }

            // 1. Create the Movement record
            await tx.movimientoInventario.create({
                data: {
                    organizationId,
                    productoId: finalProductoId,
                    tipoMovimiento: 'ENTRADA',
                    cantidad,
                    motivo: motivo || 'Comprobante de Ingreso',
                    referencia,
                    usuarioId,
                }
            });

            // 2. Update Asset Stock
            await tx.activoFijo.update({
                where: { id: activoId },
                data: {
                    stock: {
                        increment: cantidad
                    }
                }
            });

            // 3. Update Product Stock
            await tx.producto.update({
                where: { id: finalProductoId },
                data: {
                    stockActual: {
                        increment: cantidad
                    }
                }
            });
        });

        revalidatePath('/inventario/entradas');
        revalidatePath('/inventario');
        return { success: true };
    } catch (error: any) {
        console.error("Error al registrar entrada:", error);
        return { success: false, error: error.message || "Ocurrió un error al registrar la entrada." };
    }
}

export async function registrarEntradasLote(
    organizationId: string,
    usuarioId: string,
    items: { productoId: string; cantidad: number }[],
    motivo: string,
    referencia?: string
) {
    if (!items || items.length === 0) {
        return { success: false, error: "No hay productos para registrar." };
    }

    for (const item of items) {
        if (!item.productoId) {
            return { success: false, error: "Todos los productos deben estar seleccionados." };
        }
        if (item.cantidad <= 0) {
            return { success: false, error: "La cantidad de todos los productos debe ser mayor a 0." };
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const activoId = item.productoId;

                // Find the inventory asset
                const activo = await tx.activoFijo.findUnique({
                    where: { id: activoId }
                });

                if (!activo) {
                    throw new Error(`Producto de inventario no encontrado.`);
                }

                let finalProductoId = activo.productoId;
                if (!finalProductoId) {
                    const skuCode = activo.codigoBarras || activo.idQr;
                    const existingProd = await tx.producto.findFirst({
                        where: { organizationId, sku: skuCode }
                    });

                    if (existingProd) {
                        finalProductoId = existingProd.id;
                    } else {
                        const newProd = await tx.producto.create({
                            data: {
                                organizationId,
                                sku: skuCode,
                                nombre: activo.descripcionCorta,
                                precioVenta: activo.costoAdq || 0,
                                stockActual: activo.stock
                            }
                        });
                        finalProductoId = newProd.id;
                    }

                    await tx.activoFijo.update({
                        where: { id: activoId },
                        data: { productoId: finalProductoId }
                    });
                }

                // 1. Create the Movement record
                await tx.movimientoInventario.create({
                    data: {
                        organizationId,
                        productoId: finalProductoId,
                        tipoMovimiento: 'ENTRADA',
                        cantidad: item.cantidad,
                        motivo: motivo || 'Ingreso por Lote (Excel/CSV)',
                        referencia,
                        usuarioId,
                    }
                });

                // 2. Update Asset Stock
                await tx.activoFijo.update({
                    where: { id: activoId },
                    data: {
                        stock: {
                            increment: item.cantidad
                        }
                    }
                });

                // 3. Update Product Stock
                await tx.producto.update({
                    where: { id: finalProductoId },
                    data: {
                        stockActual: {
                            increment: item.cantidad
                        }
                    }
                });
            }
        });

        revalidatePath('/inventario/entradas');
        revalidatePath('/inventario');
        return { success: true };
    } catch (error: any) {
        console.error("Error al registrar entradas por lote:", error);
        return { success: false, error: error.message || "Ocurrió un error al registrar las entradas." };
    }
}

