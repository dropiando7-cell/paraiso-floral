'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { logActivity } from '@/lib/activity-logger';
import { sendTwilioWhatsApp } from '@/lib/checkin-notifications';

// Helper to obtain the authenticated user and organization ID
async function getAuthContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true }
    });
    if (!dbUser) throw new Error('Usuario no encontrado en la base de datos');
    return { userId: dbUser.id, organizationId: dbUser.organizationId };
}

function parseWarrantyMonths(garantiaStr: string | null | undefined): number | null {
    if (!garantiaStr) return null;
    const clean = garantiaStr.toLowerCase().trim();
    if (clean.includes('año') || clean.includes('ano')) {
        const matches = clean.match(/\d+/);
        if (matches) return parseInt(matches[0]) * 12;
    }
    if (clean.includes('mes')) {
        const matches = clean.match(/\d+/);
        if (matches) return parseInt(matches[0]);
    }
    if (clean.includes('dia') || clean.includes('día')) {
        const matches = clean.match(/\d+/);
        if (matches) return Math.ceil(parseInt(matches[0]) / 30);
    }
    const numeric = parseInt(clean);
    if (!isNaN(numeric)) return numeric;
    return null;
}

async function checkAndSyncExistingWarranties(organizationId: string) {
    try {
        const ordenes = await prisma.ordenEntrega.findMany({
            where: { organizationId, aplicaMantenimientos: true },
            include: {
                factura: {
                    include: {
                        detalles: {
                            where: { activoId: { not: null } },
                            include: { activo: true }
                        }
                    }
                }
            }
        });

        for (const orden of ordenes) {
            if (!orden.factura) continue;
            const clienteId = orden.factura.clienteId;
            const facturaId = orden.facturaId;
            const fechaVenta = orden.factura.fechaEmision;

            for (const detalle of orden.factura.detalles) {
                if (!detalle.activoId || !detalle.activo) continue;
                const activo = detalle.activo;

                let equipoCliente = await prisma.equipoCliente.findUnique({
                    where: { activoFijoId: detalle.activoId }
                });

                if (!equipoCliente) {
                    let fechaVencimientoGarantia: Date | null = null;
                    let garantiaMeses: number | null = null;

                    const meses = parseWarrantyMonths(activo.garantia);
                    if (meses) {
                        garantiaMeses = meses;
                        const fechaBase = fechaVenta ? new Date(fechaVenta) : new Date();
                        fechaVencimientoGarantia = new Date(fechaBase);
                        fechaVencimientoGarantia.setMonth(fechaVencimientoGarantia.getMonth() + meses);
                    }

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
                            codigoEtiqueta: activo.idQr,
                            fechaInstalacion: fechaVenta,
                            garantiaMeses,
                            fechaVencimientoGarantia,
                            mantenimientosGratisTotales: activo.mantenimientosIncluidos || 5,
                            mantenimientosGratisRealizados: 0
                        }
                    });

                    const mantenimientosIncluidos = activo.mantenimientosIncluidos || 5;
                    const frecuenciaMeses = activo.frecuenciaMantenimientoMeses || 3;
                    const baseDate = fechaVenta ? new Date(fechaVenta) : new Date();

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
        }
    } catch (err) {
        console.error("Error in checkAndSyncExistingWarranties:", err);
    }
}

// Fetch all data for the module
export async function getMantenimientosData() {
    try {
        const { organizationId } = await getAuthContext();

        // Sincronizar automáticamente cualquier garantía existente de ventas previas
        await checkAndSyncExistingWarranties(organizationId);

        // 1. Equipos de Clientes
        const equipos = await prisma.equipoCliente.findMany({
            where: { organizationId },
            include: {
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        telefono: true,
                        email: true
                    }
                },
                activoFijo: {
                    select: {
                        idQr: true,
                        mantenimientosIncluidos: true,
                        frecuenciaMantenimientoMeses: true
                    }
                },
                _count: {
                    select: { mantenimientos: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Mantenimientos
        const mantenimientos = await prisma.mantenimiento.findMany({
            where: { organizationId },
            include: {
                equipo: {
                    include: {
                        cliente: {
                            select: {
                                id: true,
                                nombre: true,
                                telefono: true
                            }
                        }
                    }
                },
                realizadoPor: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true
                    }
                }
            },
            orderBy: { fechaProgramada: 'asc' }
        });

        // 3. Clientes (para registrar equipos)
        const clientes = await prisma.cliente.findMany({
            where: { organizationId },
            select: { id: true, nombre: true, telefono: true, email: true },
            orderBy: { nombre: 'asc' }
        });

        // 4. Usuarios / Técnicos
        const usuarios = await prisma.user.findMany({
            where: { organizationId },
            select: { id: true, nombre: true, apellido: true, role: true, puesto: true },
            orderBy: { nombre: 'asc' }
        });

        // 5. Configuraciones del sistema
        const diasConfig = await prisma.systemSetting.findUnique({
            where: { key: 'mantenimiento_notificar_dias' }
        });
        const templateConfig = await prisma.systemSetting.findUnique({
            where: { key: 'mantenimiento_whatsapp_template_sid' }
        });

        return {
            success: true,
            equipos: equipos.map(eq => ({
                ...eq,
                mantenimientosGratisTotales: eq.mantenimientosGratisTotales || 0,
                mantenimientosGratisRealizados: eq.mantenimientosGratisRealizados || 0
            })),
            mantenimientos: mantenimientos.map(m => ({
                ...m,
                costo: m.costo ? Number(m.costo) : null
            })),
            clientes,
            usuarios,
            config: {
                notificarDias: diasConfig ? parseInt(diasConfig.value) : 5,
                whatsappTemplateSid: templateConfig ? templateConfig.value : 'HXa363e371108b8cd13811d22b75ccbc74'
            }
        };
    } catch (error: any) {
        console.error("Error in getMantenimientosData:", error);
        return { success: false, error: error.message || "Error al obtener datos" };
    }
}

// Register manual external equipment for a client (e.g. air conditioners)
export async function registrarEquipoExterno(data: {
    clienteId: string;
    nombre: string;
    marca?: string;
    modelo?: string;
    serie?: string;
    codigoEtiqueta?: string;
    fechaInstalacion?: string | Date;
    garantiaMeses?: number;
}) {
    try {
        const { userId, organizationId } = await getAuthContext();

        // Validaciones de unicidad de serie y etiqueta
        if (data.serie) {
            const dupSerie = await prisma.equipoCliente.findFirst({
                where: { organizationId, serie: data.serie }
            });
            if (dupSerie) throw new Error(`Ya existe un equipo registrado con el N° de serie: ${data.serie}`);
        }

        if (data.codigoEtiqueta) {
            const dupEtiqueta = await prisma.equipoCliente.findFirst({
                where: { organizationId, codigoEtiqueta: data.codigoEtiqueta }
            });
            if (dupEtiqueta) throw new Error(`Ya existe un equipo registrado con la etiqueta/QR: ${data.codigoEtiqueta}`);
        }

        // Calcular vencimiento de garantía si se proporciona
        let fechaVencimientoGarantia: Date | null = null;
        if (data.garantiaMeses && data.fechaInstalacion) {
            const baseDate = new Date(data.fechaInstalacion);
            fechaVencimientoGarantia = new Date(baseDate);
            fechaVencimientoGarantia.setMonth(fechaVencimientoGarantia.getMonth() + Number(data.garantiaMeses));
        }

        const equipo = await prisma.equipoCliente.create({
            data: {
                organizationId,
                clienteId: data.clienteId,
                nombre: data.nombre.trim(),
                marca: data.marca?.trim() || null,
                modelo: data.modelo?.trim() || null,
                serie: data.serie?.trim() || null,
                codigoEtiqueta: data.codigoEtiqueta?.trim() || null,
                fechaInstalacion: data.fechaInstalacion ? new Date(data.fechaInstalacion) : null,
                garantiaMeses: data.garantiaMeses ? Number(data.garantiaMeses) : null,
                fechaVencimientoGarantia,
                mantenimientosGratisTotales: 0,
                mantenimientosGratisRealizados: 0
            },
            include: { cliente: true }
        });

        // Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'CREATE',
            module: '/mantenimientos',
            description: `Registrado equipo de cliente externo: ${equipo.nombre} (Cliente: ${equipo.cliente.nombre})`,
            metadata: { equipoId: equipo.id, nombre: equipo.nombre, clienteId: equipo.clienteId }
        });

        revalidatePath('/mantenimientos');
        return { success: true, equipo };
    } catch (error: any) {
        console.error("Error in registrarEquipoExterno:", error);
        return { success: false, error: error.message || "Error al registrar el equipo" };
    }
}

// Schedule a manual maintenance session
export async function programarMantenimientoManual(data: {
    equipoClienteId: string;
    fechaProgramada: string | Date;
    tipo: string; // PREVENTIVO, CORRECTIVO, etc.
    notas?: string;
    costo?: number;
    realizadoPorId?: string;
}) {
    try {
        const { userId, organizationId } = await getAuthContext();

        const mantenimiento = await prisma.mantenimiento.create({
            data: {
                organizationId,
                equipoClienteId: data.equipoClienteId,
                fechaProgramada: new Date(data.fechaProgramada),
                tipo: data.tipo,
                estado: "PROGRAMADO",
                notas: data.notas?.trim() || null,
                costo: data.costo !== undefined ? parseFloat(data.costo.toString()) : null,
                realizadoPorId: data.realizadoPorId || null,
                esGratis: false
            },
            include: {
                equipo: { select: { nombre: true } }
            }
        });

        // Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'CREATE',
            module: '/mantenimientos',
            description: `Programado mantenimiento (${data.tipo}) para equipo: ${mantenimiento.equipo.nombre}`,
            metadata: { mantenimientoId: mantenimiento.id, equipoId: data.equipoClienteId }
        });

        revalidatePath('/mantenimientos');
        return { success: true, mantenimiento };
    } catch (error: any) {
        console.error("Error in programarMantenimientoManual:", error);
        return { success: false, error: error.message || "Error al programar mantenimiento" };
    }
}

// Record maintenance as performed
export async function registrarMantenimientoRealizado(
    mantenimientoId: string,
    data: {
        fechaRealizada: string | Date;
        notas?: string;
        realizadoPorId?: string;
        costo?: number;
    }
) {
    try {
        const { userId, organizationId } = await getAuthContext();

        const mantExistente = await prisma.mantenimiento.findFirst({
            where: { id: mantenimientoId, organizationId },
            include: { equipo: true }
        });

        if (!mantExistente) throw new Error("Mantenimiento no encontrado o sin acceso.");

        await prisma.$transaction(async (tx) => {
            // Actualizar mantenimiento
            await tx.mantenimiento.update({
                where: { id: mantenimientoId },
                data: {
                    fechaRealizada: new Date(data.fechaRealizada),
                    estado: "REALIZADO",
                    notas: data.notas?.trim() || mantExistente.notas,
                    realizadoPorId: data.realizadoPorId || mantExistente.realizadoPorId,
                    costo: data.costo !== undefined ? parseFloat(data.costo.toString()) : mantExistente.costo
                }
            });

            // Si es mantenimiento gratuito, actualizar contador en el equipo
            if (mantExistente.esGratis) {
                const realizados = mantExistente.equipo.mantenimientosGratisRealizados + 1;
                // Evitar pasar el límite
                const totalGratis = mantExistente.equipo.mantenimientosGratisTotales;
                const finalRealizados = realizados > totalGratis ? totalGratis : realizados;

                await tx.equipoCliente.update({
                    where: { id: mantExistente.equipoClienteId },
                    data: {
                        mantenimientosGratisRealizados: finalRealizados
                    }
                });
            }
        });

        // Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'UPDATE',
            module: '/mantenimientos',
            description: `Registrado mantenimiento realizado para: ${mantExistente.equipo.nombre}`,
            metadata: { mantenimientoId, equipoId: mantExistente.equipoClienteId }
        });

        revalidatePath('/mantenimientos');
        return { success: true };
    } catch (error: any) {
        console.error("Error in registrarMantenimientoRealizado:", error);
        return { success: false, error: error.message || "Error al registrar el mantenimiento" };
    }
}

// Edit a scheduled maintenance
export async function editarMantenimiento(
    mantenimientoId: string,
    data: {
        fechaProgramada?: string | Date;
        tipo?: string;
        notas?: string;
        costo?: number;
        realizadoPorId?: string;
        estado?: string;
    }
) {
    try {
        const { userId, organizationId } = await getAuthContext();

        const mantenimiento = await prisma.mantenimiento.update({
            where: { id: mantenimientoId },
            data: {
                fechaProgramada: data.fechaProgramada ? new Date(data.fechaProgramada) : undefined,
                tipo: data.tipo,
                notas: data.notas,
                costo: data.costo !== undefined ? parseFloat(data.costo.toString()) : undefined,
                realizadoPorId: data.realizadoPorId,
                estado: data.estado
            },
            include: { equipo: { select: { nombre: true } } }
        });

        // Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'UPDATE',
            module: '/mantenimientos',
            description: `Modificado mantenimiento ID: ${mantenimientoId} (${mantenimiento.equipo.nombre})`,
            metadata: { mantenimientoId, data }
        });

        revalidatePath('/mantenimientos');
        return { success: true };
    } catch (error: any) {
        console.error("Error in editarMantenimiento:", error);
        return { success: false, error: error.message || "Error al editar mantenimiento" };
    }
}

// Delete a maintenance
export async function eliminarMantenimiento(mantenimientoId: string) {
    try {
        const { userId, organizationId } = await getAuthContext();

        const mant = await prisma.mantenimiento.findFirst({
            where: { id: mantenimientoId, organizationId }
        });

        if (!mant) throw new Error("Mantenimiento no encontrado o sin acceso.");

        await prisma.mantenimiento.delete({
            where: { id: mantenimientoId }
        });

        // Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'DELETE',
            module: '/mantenimientos',
            description: `Eliminado registro de mantenimiento ID: ${mantenimientoId}`,
            metadata: { maintenanceId: mantenimientoId }
        });

        revalidatePath('/mantenimientos');
        return { success: true };
    } catch (error: any) {
        console.error("Error in eliminarMantenimiento:", error);
        return { success: false, error: error.message || "Error al eliminar mantenimiento" };
    }
}

// Delete equipment and its history
export async function eliminarEquipoCliente(equipoId: string) {
    try {
        const { userId, organizationId } = await getAuthContext();

        const eq = await prisma.equipoCliente.findFirst({
            where: { id: equipoId, organizationId }
        });

        if (!eq) throw new Error("Equipo no encontrado o sin acceso.");

        await prisma.equipoCliente.delete({
            where: { id: equipoId }
        });

        // Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'DELETE',
            module: '/mantenimientos',
            description: `Eliminado equipo de cliente: ${eq.nombre}`,
            metadata: { equipoId, nombre: eq.nombre }
        });

        revalidatePath('/mantenimientos');
        return { success: true };
    } catch (error: any) {
        console.error("Error in eliminarEquipoCliente:", error);
        return { success: false, error: error.message || "Error al eliminar equipo" };
    }
}

// Update settings
export async function updateConfiguracionMantenimientos(notificarDias: number, whatsappTemplateSid: string) {
    try {
        const { userId, organizationId } = await getAuthContext();

        await prisma.systemSetting.upsert({
            where: { key: 'mantenimiento_notificar_dias' },
            update: { value: notificarDias.toString() },
            create: { key: 'mantenimiento_notificar_dias', value: notificarDias.toString() }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'mantenimiento_whatsapp_template_sid' },
            update: { value: whatsappTemplateSid.trim() },
            create: { key: 'mantenimiento_whatsapp_template_sid', value: whatsappTemplateSid.trim() }
        });

        // Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'UPDATE',
            module: '/mantenimientos',
            description: `Actualizada configuración de mantenimientos: Notificar ${notificarDias} días antes, Plantilla: ${whatsappTemplateSid}`,
            metadata: { notificarDias, whatsappTemplateSid }
        });

        revalidatePath('/mantenimientos');
        return { success: true };
    } catch (error: any) {
        console.error("Error in updateConfiguracionMantenimientos:", error);
        return { success: false, error: error.message || "Error al actualizar configuración" };
    }
}

// Send WhatsApp notification manually for a single maintenance
export async function enviarNotificacionMantenimientoAction(mantenimientoId: string) {
    try {
        const { userId, organizationId } = await getAuthContext();

        // 1. Fetch maintenance details
        const mantenimiento = await prisma.mantenimiento.findFirst({
            where: { id: mantenimientoId, organizationId },
            include: {
                equipo: {
                    include: {
                        cliente: true
                    }
                }
            }
        });

        if (!mantenimiento) throw new Error("Mantenimiento no encontrado o sin acceso.");

        const cliente = mantenimiento.equipo.cliente;
        if (!cliente.telefono) {
            throw new Error(`El cliente ${cliente.nombre} no tiene un número de teléfono registrado.`);
        }

        // 2. Clean phone number
        let cleanPhone = cliente.telefono.replace(/[\s\-()]/g, "");
        if (!cleanPhone.startsWith("+")) {
            cleanPhone = `+504${cleanPhone}`;
        }

        // 3. Fetch template configuration
        const templateConfig = await prisma.systemSetting.findUnique({
            where: { key: 'mantenimiento_whatsapp_template_sid' }
        });
        const templateSid = templateConfig?.value || 'HXa363e371108b8cd13811d22b75ccbc74';

        // 4. Build message content variables
        const fechaStr = new Date(mantenimiento.fechaProgramada).toLocaleDateString('es-HN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        let variables: Record<string, string> = {};

        // If reusing the generic checkin/eventuality template:
        if (templateSid === 'HXa363e371108b8cd13811d22b75ccbc74') {
            const eqDesc = `${mantenimiento.equipo.nombre}` + (mantenimiento.equipo.serie ? ` (Serie: ${mantenimiento.equipo.serie})` : '');
            const genericMessage = `Estimado(a) ${cliente.nombre}, le recordamos que el mantenimiento preventivo de su equipo ${eqDesc} está programado para el día ${fechaStr}. Por favor, contáctenos para confirmar su disponibilidad.`;

            variables = {
                "1": "Bioelectrónica Honduras",
                "2": genericMessage
            };
        } else {
            // For custom template (e.g. recordatorio_mantenimiento_preventivo)
            // {{1}} = cliente, {{2}} = equipo, {{3}} = serie, {{4}} = fecha
            variables = {
                "1": cliente.nombre,
                "2": mantenimiento.equipo.nombre,
                "3": mantenimiento.equipo.serie || 'No especificado',
                "4": fechaStr
            };
        }

        // 5. Send message
        const result = await sendTwilioWhatsApp(cleanPhone, templateSid, variables);

        if (!result.success) {
            throw new Error(result.error || "Fallo en el envío a través de Twilio.");
        }

        // 6. Update database record
        await prisma.mantenimiento.update({
            where: { id: mantenimientoId },
            data: {
                notificado: true,
                fechaNotificacion: new Date(),
                whatsappSid: result.messageId
            }
        });

        // 7. Log Activity
        await logActivity({
            userId,
            organizationId,
            action: 'EXPORT', // Used to denote external message/interaction
            module: '/mantenimientos',
            description: `Enviada notificación de WhatsApp a ${cliente.nombre} por mantenimiento de ${mantenimiento.equipo.nombre}`,
            metadata: { mantenimientoId, clienteId: cliente.id, whatsappSid: result.messageId }
        });

        revalidatePath('/mantenimientos');
        return { success: true };
    } catch (error: any) {
        console.error("Error in enviarNotificacionMantenimientoAction:", error);
        return { success: false, error: error.message || "Error al enviar notificación" };
    }
}
