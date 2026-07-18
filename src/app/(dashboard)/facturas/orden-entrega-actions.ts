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
        detallesExcluidos?: string[];
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
                mostrarSello: data.mostrarSello !== undefined ? data.mostrarSello : undefined,
                detallesExcluidos: data.detallesExcluidos !== undefined ? data.detallesExcluidos : undefined
            }
        });

        // Sincronizar mantenimientos y equipos si cambió aplicaMantenimientos
        if (data.aplicaMantenimientos !== undefined) {
            await syncMantenimientosDesdeOrdenEntrega(ordenActualizada.id, organizationId);
        }

        revalidatePath(`/facturas/ver/${ordenExistente.facturaId}`);
        return { success: true, orden: ordenActualizada };
    } catch (error: any) {
        console.error("Error in updateOrdenEntrega:", error);
        return { success: false, error: error.message || "Error al actualizar la Orden de Entrega" };
    }
}

async function syncMantenimientosDesdeOrdenEntrega(ordenId: string, organizationId: string) {
    try {
        // Obtener la orden de entrega con la factura, cliente y detalles de factura con activos
        const orden = await prisma.ordenEntrega.findUnique({
            where: { id: ordenId },
            include: {
                factura: {
                    include: {
                        cliente: true,
                        detalles: {
                            where: {
                                activoId: { not: null }
                            },
                            include: {
                                activo: true
                            }
                        }
                    }
                }
            }
        });

        if (!orden || !orden.factura) return;

        const clienteId = orden.factura.clienteId;
        const facturaId = orden.facturaId;

        if (orden.aplicaMantenimientos) {
            // Generar mantenimientos y equipos
            for (const detalle of orden.factura.detalles) {
                if (!detalle.activoId || !detalle.activo) continue;

                const activo = detalle.activo;

                // Verificar si el equipo ya fue creado
                let equipoCliente = await prisma.equipoCliente.findUnique({
                    where: { activoFijoId: detalle.activoId }
                });

                if (!equipoCliente) {
                    // Calcular fecha de vencimiento de la garantía
                    let fechaVencimientoGarantia: Date | null = null;
                    let garantiaMeses: number | null = null;
                    
                    if (activo.garantia) {
                        const meses = parseInt(activo.garantia);
                        if (!isNaN(meses)) {
                            garantiaMeses = meses;
                            const fechaBase = orden.factura.fechaEmision ? new Date(orden.factura.fechaEmision) : new Date();
                            fechaVencimientoGarantia = new Date(fechaBase);
                            fechaVencimientoGarantia.setMonth(fechaVencimientoGarantia.getMonth() + meses);
                        }
                    }

                    // Crear el equipo del cliente
                    equipoCliente = await prisma.equipoCliente.create({
                        data: {
                            organizationId,
                            clienteId,
                            activoFijoId: detalle.activoId,
                            facturaId,
                            nombre: activo.descripcionCorta,
                            marca: activo.marca,
                            modelo: activo.modelo,
                            serie: activo.serie,
                            codigoEtiqueta: activo.idQr, // Usar el ID QR como código de etiqueta
                            fechaInstalacion: orden.factura.fechaEmision,
                            garantiaMeses,
                            fechaVencimientoGarantia,
                            mantenimientosGratisTotales: activo.mantenimientosIncluidos || 5,
                            mantenimientosGratisRealizados: 0
                        }
                    });
                }

                // Generar mantenimientos programados de garantía si no existen ninguno
                const countMantenimientos = await prisma.mantenimiento.count({
                    where: { equipoClienteId: equipoCliente.id }
                });

                if (countMantenimientos === 0) {
                    const mantenimientosIncluidos = activo.mantenimientosIncluidos || 5;
                    const frecuenciaMeses = activo.frecuenciaMantenimientoMeses || 3;
                    const baseDate = orden.factura.fechaEmision ? new Date(orden.factura.fechaEmision) : new Date();

                    for (let i = 1; i <= mantenimientosIncluidos; i++) {
                        const scheduledDate = new Date(baseDate);
                        scheduledDate.setMonth(scheduledDate.getMonth() + (i * frecuenciaMeses));

                        await prisma.mantenimiento.create({
                            data: {
                                organizationId,
                                equipoClienteId: equipoCliente.id,
                                fechaProgramada: scheduledDate,
                                tipo: "GARANTIA",
                                estado: "PROGRAMADO",
                                esGratis: true,
                                notas: `Mantenimiento gratuito #${i} de garantía`
                            }
                        });
                    }
                }
            }
        } else {
            // Si aplicaMantenimientos es false, buscar los equipos clientes vinculados a la factura y borrar mantenimientos futuros/programados
            const equipos = await prisma.equipoCliente.findMany({
                where: { facturaId }
            });

            for (const eq of equipos) {
                // Eliminar mantenimientos que estén programados y no realizados
                await prisma.mantenimiento.deleteMany({
                    where: {
                        equipoClienteId: eq.id,
                        estado: "PROGRAMADO",
                        fechaRealizada: null
                    }
                });

                // Si el equipo cliente no tiene mantenimientos restantes y fue creado sólo para esta factura, se puede borrar
                const totalMantenimientos = await prisma.mantenimiento.count({
                    where: { equipoClienteId: eq.id }
                });

                if (totalMantenimientos === 0) {
                    await prisma.equipoCliente.delete({
                        where: { id: eq.id }
                    });
                }
            }
        }
    } catch (err) {
        console.error("Error in syncMantenimientosDesdeOrdenEntrega:", err);
    }
}
