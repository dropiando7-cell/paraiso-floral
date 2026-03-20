'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function registrarEntrada(
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
            // 1. Create the Movement record
            await tx.movimientoInventario.create({
                data: {
                    organizationId,
                    productoId,
                    tipoMovimiento: 'ENTRADA',
                    cantidad,
                    motivo: motivo || 'Comprobante de Ingreso',
                    referencia,
                    usuarioId,
                }
            });

            // 2. Update Product Stock
            await tx.producto.update({
                where: { id: productoId },
                data: {
                    stockActual: {
                        increment: cantidad
                    }
                }
            });
        });

        revalidatePath('/inventario/entradas');
        return { success: true };
    } catch (error: any) {
        console.error("Error al registrar entrada:", error);
        return { success: false, error: "Ocurrió un error al registrar la entrada. Verifique la base de datos." };
    }
}
