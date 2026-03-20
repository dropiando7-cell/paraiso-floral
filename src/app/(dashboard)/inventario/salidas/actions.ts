'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function registrarSalida(
    organizationId: string,
    usuarioId: string,
    productoId: string,
    cantidad: number,
    motivo: string,
    referencia?: string
) {
    if (cantidad <= 0) {
        return { success: false, error: "La cantidad debe ser mayor a 0." };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Check stock first
            const producto = await tx.producto.findUnique({ where: { id: productoId } });
            
            if (!producto) {
                throw new Error("Producto no encontrado.");
            }
            if (producto.stockActual < cantidad) {
                throw new Error(`Stock insuficiente. Stock actual es: ${producto.stockActual}`);
            }

            // 1. Create the Movement record
            await tx.movimientoInventario.create({
                data: {
                    organizationId,
                    productoId,
                    tipoMovimiento: 'SALIDA',
                    cantidad, // stored as positive, we infer it is a deduction based on tipoMovimiento
                    motivo: motivo || 'Consumo / Despacho',
                    referencia,
                    usuarioId,
                }
            });

            // 2. Update Product Stock safely
            await tx.producto.update({
                where: { id: productoId },
                data: {
                    stockActual: {
                        decrement: cantidad
                    }
                }
            });
        });

        revalidatePath('/inventario/salidas');
        return { success: true };
    } catch (error: any) {
        console.error("Error al registrar salida:", error);
        return { success: false, error: error.message || "Ocurrió un error al registrar la salida." };
    }
}
