'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from './actions';

export async function getOrCreateOrdenEntrega(facturaId: string) {
    try {
        const user = await getAuthenticatedUser();
        const organizationId = user.organizationId;

        // Buscar si ya existe la Orden de Entrega para esta factura
        let orden = await prisma.ordenEntrega.findUnique({
            where: { facturaId }
        });

        if (orden) {
            return { success: true, orden };
        }

        // Si no existe, crear una nueva calculando el correlativo ODE-0037
        const count = await prisma.ordenEntrega.count({
            where: { organizationId }
        });

        const nextNum = 37 + count;
        const correlativo = `ODE-${String(nextNum).padStart(4, '0')}`;

        orden = await prisma.ordenEntrega.create({
            data: {
                organizationId,
                facturaId,
                correlativo,
                creadoPorId: user.id,
                aplicaMantenimientos: false,
                evidenciaFotos: []
            }
        });

        revalidatePath(`/facturas/ver/${facturaId}`);
        return { success: true, orden };
    } catch (error: any) {
        console.error("Error in getOrCreateOrdenEntrega:", error);
        return { success: false, error: error.message || "Error al obtener o crear la Orden de Entrega" };
    }
}

export async function updateOrdenEntrega(
    id: string, 
    data: { 
        aplicaMantenimientos?: boolean; 
        evidenciaFotos?: string[];
        evidenciaFotosDesc?: string[];
        mostrarFirmas?: boolean;
        mostrarSello?: boolean;
    }
) {
    try {
        const user = await getAuthenticatedUser();
        const organizationId = user.organizationId;

        // Verificar existencia y pertenencia a la organización
        const ordenExistente = await prisma.ordenEntrega.findFirst({
            where: { id, organizationId }
        });

        if (!ordenExistente) {
            throw new Error("Orden de Entrega no encontrada o sin acceso.");
        }

        const ordenActualizada = await prisma.ordenEntrega.update({
            where: { id },
            data: {
                aplicaMantenimientos: data.aplicaMantenimientos !== undefined ? data.aplicaMantenimientos : undefined,
                evidenciaFotos: data.evidenciaFotos !== undefined ? data.evidenciaFotos : undefined,
                evidenciaFotosDesc: data.evidenciaFotosDesc !== undefined ? data.evidenciaFotosDesc : undefined,
                mostrarFirmas: data.mostrarFirmas !== undefined ? data.mostrarFirmas : undefined,
                mostrarSello: data.mostrarSello !== undefined ? data.mostrarSello : undefined
            }
        });

        revalidatePath(`/facturas/ver/${ordenExistente.facturaId}`);
        return { success: true, orden: ordenActualizada };
    } catch (error: any) {
        console.error("Error in updateOrdenEntrega:", error);
        return { success: false, error: error.message || "Error al actualizar la Orden de Entrega" };
    }
}
