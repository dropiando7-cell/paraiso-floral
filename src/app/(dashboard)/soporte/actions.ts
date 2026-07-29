'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { 
    sendSoporteRecepcion, 
    sendSoporteEquipoListo,
    sendSoporteDiagnostico,
    sendSoportePresupuesto,
    sendSoporteReparacionIniciada
} from '@/lib/checkin-notifications';
import { createClient } from '@/utils/supabase/server';
import { triggerNotification } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-logger';

async function getOrgId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true }
    });
    if (!dbUser) throw new Error('Organización no encontrada');
    return dbUser.organizationId;
}

export async function getOrdenesActivas() {
    const orgId = await getOrgId();

    return prisma.ordenTrabajo.findMany({
        where: {
            organizationId: orgId,
            estado: { not: 'ENTREGADO' }
        },
        include: {
            cliente: true,
            tecnicosAsignados: true
        },
        orderBy: { fechaRecibido: 'desc' }
    });
}

export async function getOrdenByQR(codigoSeguridad: string) {
    const orgId = await getOrgId();

    return prisma.ordenTrabajo.findFirst({
        where: {
            organizationId: orgId,
            codigoSeguridad
        },
        include: {
            cliente: true
        }
    });
}

export async function createOrdenTrabajo(data: {
    cliente: string;
    telefono?: string;
    equipo: string;
    nombreEquipo?: string;
    modelo?: string;
    serie?: string;
    marca?: string;
    descripcionFalla: string;
    fotosEstadoInicial?: string[];
    usuarioRecepcionId?: string;
    costoRevision?: string | number;
    metodoPagoRevision?: string;
    tecnicoIds?: string[];
    tipoTrabajo?: string;
    cobertura?: string;
    fechaRecibido?: string | Date;
    aplicaMantenimientos?: boolean;
    garantiaMeses?: number;
    frecuenciaMantenimientoMeses?: number;
    cantidadMantenimientos?: number;
    activoId?: string;
    tipoOrden?: string;
    requiereAprobacion?: boolean;
}) {
    const orgId = await getOrgId();

    const cleanNombre = data.cliente.trim();
    // Find or create cliente
    let clienteRecord = await prisma.cliente.findFirst({
        where: { 
            organizationId: orgId,
            nombre: {
                equals: cleanNombre,
                mode: 'insensitive'
            }
        }
    });

    if (!clienteRecord) {
        clienteRecord = await prisma.cliente.create({
            data: {
                nombre: cleanNombre,
                telefono: data.telefono?.trim() || null,
                organizationId: orgId
            }
        });
    }

    // Generar un código criptográfico corto para el QR 
    const codigoSeguridad = randomBytes(4).toString('hex').toUpperCase();

    const marcaModelo = [data.marca, data.modelo].filter(Boolean).join(" ") || null;

    const costoRevision = data.costoRevision !== undefined ? parseFloat(data.costoRevision.toString()) : 650;
    const metodoPagoRevision = data.metodoPagoRevision || 'Ninguno';

    // Check for active caja session
    let cajaSessionId = null;
    if (metodoPagoRevision !== 'Ninguno') {
        const activeCaja = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId: orgId,
                estado: 'ABIERTA'
            }
        });
        cajaSessionId = activeCaja?.id || null;
    }

    const firstTecnicoId = data.tecnicoIds?.[0] || null;

    const requiereAprobacion = data.requiereAprobacion !== false;
    const estadoInicial = requiereAprobacion ? 'RECIBIDO' : 'REPARACION';

    const orden = await prisma.ordenTrabajo.create({
        data: {
            organizationId: orgId,
            clienteId: clienteRecord.id,
            equipoDano: data.nombreEquipo?.trim() || (data.equipo.toLowerCase() === 'medico' ? 'Equipo Médico' : data.equipo.toLowerCase() === 'aire' ? 'Aire Acondicionado' : 'Otro'),
            tipoAparato: data.equipo.toUpperCase(),
            tipoTrabajo: data.tipoTrabajo || 'NORMAL',
            cobertura: data.cobertura || 'externa',
            marcaModelo,
            serie: data.serie || null,
            descripcionFalla: data.descripcionFalla,
            codigoSeguridad,
            fotosEstadoInicial: data.fotosEstadoInicial || [],
            costoRevision,
            metodoPagoRevision,
            cajaSessionId,
            estado: estadoInicial,
            usuarioRecepcionId: data.usuarioRecepcionId || null,
            tecnicoReparacionId: firstTecnicoId,
            fechaRecibido: data.fechaRecibido ? new Date(data.fechaRecibido) : new Date(),
            tecnicosAsignados: {
                connect: data.tecnicoIds?.map(id => ({ id })) || []
            },
            aplicaMantenimientos: data.aplicaMantenimientos || false,
            garantiaMeses: data.garantiaMeses ? parseInt(data.garantiaMeses.toString()) : null,
            frecuenciaMantenimientoMeses: data.frecuenciaMantenimientoMeses ? parseInt(data.frecuenciaMantenimientoMeses.toString()) : 3,
            cantidadMantenimientos: data.cantidadMantenimientos ? parseInt(data.cantidadMantenimientos.toString()) : null,
            activoId: data.activoId || null,
            tipoOrden: data.tipoOrden || 'TALLER',
            requiereAprobacion: requiereAprobacion,
        },
        include: { cliente: true }
    });

    // Sincronizar mantenimientos
    if (orden.aplicaMantenimientos) {
        await syncMantenimientosDesdeOrdenTrabajo(orden.id);
    }

    if (clienteRecord.telefono) {
        const phoneWithCountryCode = clienteRecord.telefono.startsWith('+') ? clienteRecord.telefono : `+504${clienteRecord.telefono}`;
        try {
            await sendSoporteRecepcion(
                clienteRecord.nombre,
                phoneWithCountryCode,
                orden.codigoSeguridad,
                orden.equipoDano,
                orden.serie || 'No especificado',
                'Por asignar'
            );
        } catch (e) {
            console.error("Twilio Recepcion Error:", e);
        }
    }

    // ----------------------------------------------------
    // SINCRONIZACIÓN AUTOMÁTICA CON KANBAN (ORDENES DE TRABAJO)
    // ----------------------------------------------------
    try {
        // 1. Buscar o crear el espacio "ORDENES DE TRABAJO"
        let space = await prisma.kanbanSpace.findFirst({
            where: {
                nombre: {
                    equals: 'ORDENES DE TRABAJO',
                    mode: 'insensitive'
                },
                organizationId: orgId
            }
        });

        if (!space) {
            // Generar clave única para el espacio
            const baseClave = 'ODT';
            let spaceClave = baseClave;
            let counter = 1;
            
            // Asegurarnos de que la clave de espacio sea única
            while (true) {
                const dup = await prisma.kanbanSpace.findFirst({
                    where: {
                        organizationId: orgId,
                        clave: spaceClave
                    }
                });
                if (!dup) break;
                spaceClave = `${baseClave}${counter}`;
                counter++;
            }

            space = await prisma.kanbanSpace.create({
                data: {
                    organizationId: orgId,
                    nombre: 'ORDENES DE TRABAJO',
                    clave: spaceClave,
                    tiposActividad: ["Tarea", "Historia", "Funcionalidad", "Error / Falla", "Orden de Trabajo", "Mantenimiento Preventivo", "Mantenimiento Correctivo", "Calibración", "Instalación", "Diagnóstico", "Soporte Técnico"],
                    columnas: ["Por hacer", "En curso", "En revisión", "Listo"],
                    acceso: 'Abierto'
                }
            });
        }

        if (space) {
            // Transacción para incrementar correlativo y crear la tarea de Kanban
            const nextNumber = space.lastTaskNumber + 1;
            const taskCodigo = `${space.clave}-${nextNumber}`;

            // Actualizar el correlativo
            await prisma.kanbanSpace.update({
                where: { id: space.id },
                data: { lastTaskNumber: nextNumber }
            });

            // Determinar descripción para la tarea
            const descLines = [
                `**Equipo:** ${orden.equipoDano}`,
                orden.marcaModelo ? `**Marca/Modelo:** ${orden.marcaModelo}` : null,
                orden.serie ? `**Serie:** ${orden.serie}` : null,
                `**Cliente:** ${clienteRecord.nombre}`,
                data.descripcionFalla ? `\n**Falla Reportada:**\n${data.descripcionFalla}` : null
            ].filter(Boolean).join('\n');

            // Determinar responsable primario para compatibilidad
            const primaryAsignadoId = firstTecnicoId || null;

            // Crear la tarea en Kanban asociada a esta orden de trabajo
            const task = await prisma.kanbanTask.create({
                data: {
                    spaceId: space.id,
                    organizationId: orgId,
                    codigo: taskCodigo,
                    title: `Orden #${orden.codigoSeguridad} - ${orden.equipoDano}`,
                    description: descLines,
                    status: space.columnas[0] || 'Por hacer',
                    type: 'Orden de Trabajo',
                    priority: 'MEDIUM',
                    creadoPorId: data.usuarioRecepcionId || null,
                    asignadoId: primaryAsignadoId,
                    ordenTrabajoId: orden.id,
                    asignados: data.tecnicoIds && data.tecnicoIds.length > 0 ? {
                        connect: data.tecnicoIds.map(id => ({ id }))
                    } : undefined
                }
            });

            // Registrar actividad del Kanban
            let fallbackUserId = '';
            if (data.usuarioRecepcionId) {
                fallbackUserId = data.usuarioRecepcionId;
            } else if (firstTecnicoId) {
                fallbackUserId = firstTecnicoId;
            } else {
                const firstUser = await prisma.user.findFirst({ where: { organizationId: orgId } });
                fallbackUserId = firstUser?.id || '';
            }

            if (fallbackUserId) {
                await prisma.kanbanActivity.create({
                    data: {
                        spaceId: space.id,
                        taskId: task.id,
                        usuarioId: fallbackUserId,
                        accion: 'CREACION_TAREA',
                        detalles: `Creó automáticamente la tarea ${task.codigo} vinculada a la Orden #${orden.codigoSeguridad}`
                    }
                });
            }

            // Sincronizar fotos iniciales como adjuntos del Kanban
            if (data.fotosEstadoInicial && data.fotosEstadoInicial.length > 0) {
                for (let i = 0; i < data.fotosEstadoInicial.length; i++) {
                    const url = data.fotosEstadoInicial[i];
                    // Obtener nombre simple a partir de URL
                    let nombre = `foto_inicial_${i + 1}.jpg`;
                    try {
                        const parts = url.split('/');
                        const lastPart = parts[parts.length - 1];
                        if (lastPart) nombre = decodeURIComponent(lastPart);
                    } catch (err) {}

                    await prisma.kanbanAttachment.create({
                        data: {
                            taskId: task.id,
                            nombre: nombre,
                            url: url,
                            tipo: 'image/jpeg',
                            tamano: 0,
                            subidoPorId: fallbackUserId
                        }
                    });
                }
            }
        }
    } catch (kanbanErr) {
        console.error("[Kanban Sync Error]: No se pudo auto-crear la tarea en Kanban:", kanbanErr);
    }

    if (!requiereAprobacion) {
        try {
            await syncKanbanStatus(orden.id, 'REPARACION', data.usuarioRecepcionId);
        } catch (syncErr) {
            console.error("[Kanban Sync Error in quick flow]:", syncErr);
        }
    }

    // Notificar a los técnicos asignados sobre el nuevo trabajo
    try {
        const techIds = data.tecnicoIds || [];
        for (const techId of techIds) {
            await triggerNotification(
                techId,
                "Nueva Orden de Trabajo Asignada",
                `Se te ha asignado la Orden #${orden.codigoSeguridad} para reparar: ${orden.equipoDano}.`,
                `/soporte/${orden.id}`,
                'WORK_ORDER',
                data.usuarioRecepcionId || undefined
            );
        }
    } catch (notifErr) {
        console.error("Error sending work order assignment notification:", notifErr);
    }

    // Log activity
    await logActivity({
        userId: data.usuarioRecepcionId || null,
        organizationId: orgId,
        action: 'CREATE',
        module: '/soporte',
        description: `Creado ticket de soporte para ${orden.equipoDano} (Código: ${orden.codigoSeguridad})`,
        metadata: {
            ordenId: orden.id,
            codigoSeguridad: orden.codigoSeguridad,
            clienteId: orden.clienteId,
            equipoDano: orden.equipoDano
        }
    });

    revalidatePath('/soporte');
    return {
        ...orden,
        costoRevision: orden.costoRevision ? Number(orden.costoRevision) : null,
        costoReparacion: orden.costoReparacion ? Number(orden.costoReparacion) : null,
    };
}

export async function updateEstadoOrden(id: string, nuevoEstado: string) {
    const data: any = { estado: nuevoEstado };

    if (nuevoEstado === 'EN_EVALUACION') data.fechaEvaluado = new Date();
    if (nuevoEstado === 'LISTO_ENTREGA') data.fechaListo = new Date();
    if (nuevoEstado === 'ENTREGADO') data.fechaEntregado = new Date();
    if (nuevoEstado === 'ESPERANDO_APROBACION') data.fechaEvaluado = new Date(); // Opcional

    const updated = await prisma.ordenTrabajo.update({
        where: { id },
        data,
        include: { cliente: true }
    });

    if (nuevoEstado === 'REVISION' && updated.cliente?.telefono) {
        const phoneWithCountryCode = updated.cliente.telefono.startsWith('+') ? updated.cliente.telefono : `+504${updated.cliente.telefono}`;
        const fechaEst = new Date();
        fechaEst.setDate(fechaEst.getDate() + 2);
        
        try {
            await sendSoporteDiagnostico(
                updated.cliente.nombre,
                phoneWithCountryCode,
                updated.equipoDano,
                updated.codigoSeguridad,
                fechaEst.toLocaleDateString()
            );
        } catch (e) {
            console.error("Twilio Diagnostico Error:", e);
        }
    }

    // Notificar al técnico asignado sobre el cambio de estado
    try {
        if (updated.tecnicoReparacionId) {
            await triggerNotification(
                updated.tecnicoReparacionId,
                "Estado de Orden Actualizado",
                `La Orden #${updated.codigoSeguridad} (${updated.equipoDano}) cambió al estado "${nuevoEstado}".`,
                `/soporte/${id}`,
                'WORK_ORDER'
            );
        }
    } catch (notifErr) {
        console.error("Error sending update state notification:", notifErr);
    }

    revalidatePath('/soporte');
    
    // Sync with Kanban
    await syncKanbanStatus(id, nuevoEstado);

    // Log activity
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { id: true }});
            if (dbUser) {
                await logActivity({
                    userId: dbUser.id,
                    organizationId: updated.organizationId,
                    action: 'UPDATE',
                    module: '/soporte',
                    description: `Actualizó estado de orden #${updated.codigoSeguridad} a: ${nuevoEstado}`,
                    metadata: {
                        ordenId: id,
                        codigoSeguridad: updated.codigoSeguridad,
                        nuevoEstado
                    }
                });
            }
        }
    } catch (e) {
        console.error("Error logging status update activity:", e);
    }

    return {
        ...updated,
        costoRevision: updated.costoRevision ? Number(updated.costoRevision) : null,
        costoReparacion: updated.costoReparacion ? Number(updated.costoReparacion) : null,
    };
}

export async function updateCostoReparacion(id: string, costo: number) {
    const updated = await prisma.ordenTrabajo.update({
        where: { id },
        data: {
            costoReparacion: costo
        }
    });
    revalidatePath('/soporte');
    return {
        ...updated,
        costoRevision: updated.costoRevision ? Number(updated.costoRevision) : null,
        costoReparacion: updated.costoReparacion ? Number(updated.costoReparacion) : null,
    };
}

export async function entregarOrden(id: string) {
    const updated = await prisma.ordenTrabajo.update({
        where: { id },
        data: {
            estado: 'ENTREGADO',
            fechaEntregado: new Date()
        }
    });
    revalidatePath('/soporte');
    
    await syncKanbanStatus(id, 'ENTREGADO');

    return {
        ...updated,
        costoRevision: updated.costoRevision ? Number(updated.costoRevision) : null,
        costoReparacion: updated.costoReparacion ? Number(updated.costoReparacion) : null,
    };
}

export async function finalizarReparacion(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let userId = null;
    if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
        userId = dbUser?.id;
    }

    const orden = await prisma.$transaction(async (tx) => {
        const order = await tx.ordenTrabajo.findUnique({
            where: { id },
            include: { repuestos: true, cliente: true }
        });

        if (!order) throw new Error('Orden no encontrada');

        // NOTE: Inventory deduction only happens upon final invoice/proforma emission, not here.
        // The technical workbench is just register-only for the service history.
        /*
        for (const rep of order.repuestos) {
            if (rep.activoFijoId) {
                await tx.activoFijo.update({
                    where: { id: rep.activoFijoId },
                    data: { stock: { decrement: rep.cantidad } }
                });
            } else if (rep.productoId) {
                await tx.producto.update({
                    where: { id: rep.productoId },
                    data: { stockActual: { decrement: rep.cantidad } }
                });
            }

            if (userId && rep.productoId) {
                await tx.movimientoInventario.create({
                    data: {
                        organizationId: order.organizationId,
                        productoId: rep.productoId,
                        tipoMovimiento: 'SALIDA',
                        cantidad: rep.cantidad,
                        motivo: `Uso en Orden Soporte #${order.codigoSeguridad}`,
                        usuarioId: userId
                    }
                });
            }
        }
        */

        return tx.ordenTrabajo.update({
            where: { id },
            data: {
                estado: 'LISTO_ENTREGA',
                fechaListo: new Date()
            },
            include: { cliente: true }
        });
    });

    if (orden.cliente?.telefono) {
        const phoneWithCountryCode = orden.cliente.telefono.startsWith('+') ? orden.cliente.telefono : `+504${orden.cliente.telefono}`;
        try {
            const montoAPagar = (orden.costoRevision ? Number(orden.costoRevision) : 0) + (orden.costoReparacion ? Number(orden.costoReparacion) : 0);
            await sendSoporteEquipoListo(
                orden.cliente.nombre,
                phoneWithCountryCode,
                orden.equipoDano,
                orden.codigoSeguridad,
                montoAPagar,
                5, // Días hábiles
                50.00 // Cargo almacenaje
            );
        } catch (e) {
            console.error("Twilio Listo Error:", e);
        }
    }

    revalidatePath('/soporte');
    revalidatePath(`/soporte/${id}`);
    
    await syncKanbanStatus(id, 'LISTO_ENTREGA', userId || undefined);

    return {
        ...orden,
        costoRevision: orden.costoRevision ? Number(orden.costoRevision) : null,
        costoReparacion: orden.costoReparacion ? Number(orden.costoReparacion) : null,
    };
}

export async function searchRepuestos(query: string) {
    if (!query) return [];
    const orgId = await getOrgId();

    return prisma.activoFijo.findMany({
        where: {
            organizationId: orgId,
            OR: [
                { descripcionCorta: { contains: query, mode: 'insensitive' } },
                { codigoBarras: { contains: query, mode: 'insensitive' } },
                { idQr: { contains: query, mode: 'insensitive' } }
            ]
        },
        take: 10,
        select: {
            id: true,
            descripcionCorta: true,
            codigoBarras: true,
            idQr: true,
            costoAdq: true,
            stock: true
        }
    }).then(products => products.map(p => ({
        id: p.id,
        nombre: p.descripcionCorta,
        sku: p.codigoBarras || p.idQr || '',
        precioVenta: p.costoAdq ? Number(p.costoAdq) : 0,
        stockActual: p.stock || 0
    })));
}

export async function guardarDiagnostico(
    ordenId: string, 
    diagnostico: string, 
    repuestos: any[], 
    manoObra: any[], 
    costoSugerido: number,
    fotosTecnico: string[] = [],
    targetEstado?: string
) {
    const orgId = await getOrgId();

    const currentOrden = await prisma.ordenTrabajo.findUnique({
        where: { id: ordenId },
        select: { estado: true }
    });

    const nextEstado = targetEstado || (currentOrden?.estado === 'REPARACION' ? 'REPARACION' : 'ESPERANDO_APROBACION');

    await prisma.$transaction(async (tx) => {
        // Borrar repuestos anteriores si existen (para evitar duplicados al re-guardar)
        await tx.ordenTrabajoRepuesto.deleteMany({
            where: { ordenTrabajoId: ordenId }
        });

        // Crear nuevos repuestos
        if (repuestos.length > 0) {
            await tx.ordenTrabajoRepuesto.createMany({
                data: repuestos.map(r => ({
                    ordenTrabajoId: ordenId,
                    activoFijoId: r.productoId, // We used 'productoId' in frontend still
                    cantidad: r.cantidad,
                    precioSugerido: r.precio,
                    subtotal: r.cantidad * r.precio
                }))
            });
        }

        // Actualizar orden
        await tx.ordenTrabajo.update({
            where: { id: ordenId },
            data: {
                estado: nextEstado,
                fechaEvaluado: new Date(),
                diagnosticoTecnico: diagnostico,
                detalleManoObra: manoObra as any,
                costoReparacion: costoSugerido,
                fotosTecnico: fotosTecnico
            }
        });

    });

    await syncKanbanStatus(ordenId, nextEstado);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
            if (dbUser) {
                const task = await prisma.kanbanTask.findFirst({ where: { ordenTrabajoId: ordenId } });
                if (task) {
                    const repuestosText = repuestos.length > 0 ? `\n\n**Repuestos Sugeridos:**\n` + repuestos.map(r => `- ${r.cantidad}x ${r.nombre}`).join('\n') : '';
                    await prisma.kanbanComment.create({
                        data: {
                            taskId: task.id,
                            usuarioId: dbUser.id,
                            contenido: `**Diagnóstico Técnico:**\n${diagnostico}${repuestosText}`
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error adding kanban comment for diagnosis:", e);
    }

    // Log activity
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { id: true }});
            if (dbUser) {
                await logActivity({
                    userId: dbUser.id,
                    organizationId: orgId,
                    action: 'UPDATE',
                    module: '/soporte',
                    description: `Guardó diagnóstico y presupuesto para orden ID: ${ordenId}`,
                    metadata: {
                        ordenId,
                        diagnostico,
                        costoSugerido,
                        repuestosCount: repuestos.length
                    }
                });
            }
        }
    } catch (e) {
        console.error("Error logging diagnosis activity:", e);
    }

    revalidatePath('/soporte');
    revalidatePath(`/soporte/${ordenId}`);
    return { success: true };
}

export async function aprobarPresupuesto(
    ordenId: string, 
    repuestosAprobados: any[], 
    costoFinalLabor: number,
    costoFinalReparacion: number,
    detalleManoObraModificado?: any[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let userId = null;
    if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
        userId = dbUser?.id;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
        for (const rep of repuestosAprobados) {
            await tx.ordenTrabajoRepuesto.update({
                where: { id: rep.id },
                data: {
                    precioAprobado: rep.precioAprobado,
                    subtotalAprobado: rep.subtotalAprobado
                }
            });
        }

        const orden = await tx.ordenTrabajo.update({
            where: { id: ordenId },
            data: {
                estado: 'REPARACION',
                fechaAprobado: new Date(),
                usuarioAprobacionId: userId || undefined,
                costoReparacion: costoFinalReparacion,
            },
            include: { cliente: true, tecnicoReparacion: true }
        });

        if (orden.cliente?.telefono) {
            const phoneWithCountryCode = orden.cliente.telefono.startsWith('+') ? orden.cliente.telefono : `+504${orden.cliente.telefono}`;
            const entregaEst = new Date();
            entregaEst.setDate(entregaEst.getDate() + 5);
            
            try {
                await sendSoporteReparacionIniciada(
                    orden.cliente.nombre,
                    phoneWithCountryCode,
                    orden.equipoDano,
                    orden.codigoSeguridad,
                    orden.tecnicoReparacion?.nombre || "Equipo Técnico",
                    entregaEst.toLocaleDateString(),
                    "Reparación autorizada"
                );
            } catch (e) {
                console.error("Twilio Reparacion Iniciada Error:", e);
            }
        }
        return orden;
    });

    await syncKanbanStatus(ordenId, 'REPARACION', userId || undefined);

    if (userId) {
        try {
            const task = await prisma.kanbanTask.findFirst({ where: { ordenTrabajoId: ordenId } });
            if (task) {
                await prisma.kanbanActivity.create({
                    data: {
                        spaceId: task.spaceId,
                        taskId: task.id,
                        usuarioId: userId,
                        accion: 'COMENTARIO',
                        detalles: `Gerencia ha aprobado el presupuesto. La reparación puede iniciar.`
                    }
                });
            }
        } catch (e) {
            console.error("Error logging approval kanban activity", e);
        }
    }

    // Notificar al técnico asignado sobre el presupuesto aprobado
    try {
        if (updatedOrder.tecnicoReparacionId) {
            await triggerNotification(
                updatedOrder.tecnicoReparacionId,
                "Presupuesto Aprobado",
                `El presupuesto para la Orden #${updatedOrder.codigoSeguridad} (${updatedOrder.equipoDano}) ha sido aprobado. Puedes iniciar con la reparación.`,
                `/soporte/${ordenId}`,
                'WORK_ORDER',
                userId || undefined
            );
        }
    } catch (notifErr) {
        console.error("Error sending budget approval notification:", notifErr);
    }

    // Log activity
    if (userId) {
        await logActivity({
            userId,
            organizationId: updatedOrder.organizationId,
            action: 'UPDATE',
            module: '/soporte',
            description: `Aprobó presupuesto para orden #${updatedOrder.codigoSeguridad}`,
            metadata: {
                ordenId,
                codigoSeguridad: updatedOrder.codigoSeguridad,
                costoFinalReparacion
            }
        });
    }

    revalidatePath('/soporte');
    revalidatePath(`/soporte/${ordenId}`);
    return { success: true };
}

export async function asignarTecnicos(ordenId: string, tecnicoIds: string[]) {
    const firstTecnicoId = tecnicoIds[0] || null;
    const updated = await prisma.ordenTrabajo.update({
        where: { id: ordenId },
        data: {
            tecnicoReparacionId: firstTecnicoId,
            tecnicosAsignados: {
                set: tecnicoIds.map(id => ({ id }))
            }
        }
    });

    // Notificar a los técnicos asignados
    try {
        for (const techId of tecnicoIds) {
            await triggerNotification(
                techId,
                "Orden de Trabajo Asignada",
                `Se te ha asignado la Orden #${updated.codigoSeguridad} (${updated.equipoDano}).`,
                `/soporte/${ordenId}`,
                'WORK_ORDER'
            );
        }
    } catch (notifErr) {
        console.error("Error sending order assignment notification:", notifErr);
    }

    try {
        const task = await prisma.kanbanTask.findFirst({
            where: { ordenTrabajoId: ordenId }
        });
        if (task) {
            await prisma.kanbanTask.update({
                where: { id: task.id },
                data: {
                    asignadoId: firstTecnicoId,
                    asignados: {
                        set: tecnicoIds.map(id => ({ id }))
                    }
                }
            });
            revalidatePath(`/kanban/${task.spaceId}`);
        }
    } catch (kanbanErr) {
        console.error("[Kanban Sync Error in asignarTecnicos]:", kanbanErr);
    }

    revalidatePath('/soporte');
    revalidatePath(`/soporte/${ordenId}`);
    return { success: true };
}

export async function updateDatosOrden(
    id: string,
    data: {
        tipoAparato: string;
        equipoDano: string;
        marcaModelo?: string | null;
        serie?: string | null;
        clienteNombre?: string;
        clienteTelefono?: string | null;
        descripcionFalla?: string | null;
        costoRevision?: number;
        metodoPagoRevision?: string;
        fotosEstadoInicial?: string[];
        tipoTrabajo?: string;
        cobertura?: string;
        fechaRecibido?: string | Date;
        aplicaMantenimientos?: boolean;
        garantiaMeses?: number | null;
        frecuenciaMantenimientoMeses?: number | null;
        cantidadMantenimientos?: number | null;
    }
) {
    const orgId = await getOrgId();

    const updated = await prisma.ordenTrabajo.update({
        where: { id },
        data: {
            tipoAparato: data.tipoAparato.toUpperCase(),
            equipoDano: data.equipoDano,
            marcaModelo: data.marcaModelo || null,
            serie: data.serie || null,
            descripcionFalla: data.descripcionFalla || null,
            costoRevision: data.costoRevision !== undefined ? parseFloat(data.costoRevision.toString()) : undefined,
            metodoPagoRevision: data.metodoPagoRevision || undefined,
            fotosEstadoInicial: data.fotosEstadoInicial || undefined,
            tipoTrabajo: data.tipoTrabajo || undefined,
            cobertura: data.cobertura || undefined,
            fechaRecibido: data.fechaRecibido ? new Date(data.fechaRecibido) : undefined,
            aplicaMantenimientos: data.aplicaMantenimientos,
            garantiaMeses: data.garantiaMeses !== undefined ? (data.garantiaMeses ? parseInt(data.garantiaMeses.toString()) : null) : undefined,
            frecuenciaMantenimientoMeses: data.frecuenciaMantenimientoMeses !== undefined ? (data.frecuenciaMantenimientoMeses ? parseInt(data.frecuenciaMantenimientoMeses.toString()) : null) : undefined,
            cantidadMantenimientos: data.cantidadMantenimientos !== undefined ? (data.cantidadMantenimientos ? parseInt(data.cantidadMantenimientos.toString()) : null) : undefined,
        },
        include: {
            cliente: true
        }
    });

    await syncMantenimientosDesdeOrdenTrabajo(id);

    if (updated.clienteId && (data.clienteNombre || data.clienteTelefono !== undefined)) {
        await prisma.cliente.update({
            where: { id: updated.clienteId },
            data: {
                nombre: data.clienteNombre ? data.clienteNombre.trim() : undefined,
                telefono: data.clienteTelefono !== undefined ? (data.clienteTelefono ? data.clienteTelefono.trim() : null) : undefined,
            }
        });
    }

    revalidatePath('/soporte');
    revalidatePath(`/soporte/${id}`);
    return { success: true };
}

export async function syncKanbanStatus(ordenId: string, nuevoEstado: string, userIdArg?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        let userId = userIdArg;
        if (!userId && user?.email) {
            const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
            userId = dbUser?.id;
        }

        const task = await prisma.kanbanTask.findFirst({
            where: { ordenTrabajoId: ordenId },
            include: { space: true }
        });

        if (!task || !task.space) return;

        const columnas = task.space.columnas;
        if (columnas.length === 0) return;

        let targetColumn = '';
        if (['RECIBIDO', 'EN_EVALUACION', 'ESPERANDO_APROBACION'].includes(nuevoEstado)) {
            // Buscar columna de inicio (To Do / Por hacer)
            const keywords = ['hacer', 'ejecutar', 'pendiente', 'backlog', 'recibido', 'todo'];
            const matched = columnas.find(col => 
                keywords.some(kw => col.toLowerCase().includes(kw))
            );
            targetColumn = matched || columnas[0];
        } else if (nuevoEstado === 'APROBACION_PRESUPUESTO') {
            // Buscar columna de revisión (Review / En revisión)
            const keywords = ['revisión', 'revision', 'evaluación', 'evaluacion', 'verificación', 'verificacion', 'review', 'test', 'pruebas'];
            const matched = columnas.find(col => 
                keywords.some(kw => col.toLowerCase().includes(kw))
            );
            if (matched) {
                targetColumn = matched;
            } else {
                // Fallback a columna en curso o columna del medio
                const enCursoKeywords = ['curso', 'ejecución', 'ejecucion', 'proceso', 'haciendo', 'doing', 'progress', 'desarrollo'];
                const enCursoMatched = columnas.find(col => 
                    enCursoKeywords.some(kw => col.toLowerCase().includes(kw))
                );
                targetColumn = enCursoMatched || (columnas.length > 2 ? columnas[columnas.length - 2] : columnas[0]);
            }
        } else if (nuevoEstado === 'REPARACION') {
            // Buscar columna en curso (In Progress / En curso)
            const keywords = ['curso', 'ejecución', 'ejecucion', 'proceso', 'haciendo', 'doing', 'progress', 'desarrollo'];
            const matched = columnas.find(col => 
                keywords.some(kw => col.toLowerCase().includes(kw))
            );
            targetColumn = matched || (columnas.length > 2 ? columnas[1] : columnas[0]);
        } else if (['LISTO_ENTREGA', 'ENTREGADO'].includes(nuevoEstado)) {
            // Buscar columna listo/completado (Done / Listo)
            const keywords = ['listo', 'completado', 'entregado', 'done', 'finalizado', 'terminado', 'completada'];
            const matched = columnas.find(col => 
                keywords.some(kw => col.toLowerCase().includes(kw))
            );
            targetColumn = matched || columnas[columnas.length - 1];
        }

        if (!targetColumn) return;

        if (task.status !== targetColumn) {
            await prisma.kanbanTask.update({
                where: { id: task.id },
                data: { status: targetColumn }
            });

            if (userId) {
                await prisma.kanbanActivity.create({
                    data: {
                        spaceId: task.spaceId,
                        taskId: task.id,
                        usuarioId: userId,
                        accion: 'MOVIMIENTO',
                        detalles: `Movió la tarjeta de '${task.status}' a '${targetColumn}' (Sincronización automática)`
                    }
                });
            }
            revalidatePath(`/kanban/${task.spaceId}`);
        }
    } catch (e) {
        console.error("Error syncing Kanban status:", e);
    }
}

import { guardarDocumentoBuilder, convertirDocumento } from '../facturas/actions';

export async function generarPresupuestoReparacion(
    ordenId: string, 
    facturacionItems: any[],
    repuestosAprobados: any[],
    costoFinalReparacion: number,
    detalleManoObraModificado: any[]
) {
    try {
        const orden = await prisma.ordenTrabajo.findUnique({
            where: { id: ordenId },
            include: { cliente: true, tecnicosAsignados: true }
        });
        if (!orden) throw new Error("Orden no encontrada");

        // 1. Calculate totals
        const subTotal = facturacionItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.unitPrice)), 0);
        const total = subTotal; // Assuming no tax/discount logic here, or we can just sum

        // 2. Prepare Factura Document Data
        const documentData = {
            tipoDocumento: 'COTIZACION',
            clienteId: orden.clienteId,
            subTotal: subTotal,
            total: total,
            totalExento: 0,
            totalExonerado: 0,
            totalGravado15: total, // or 0 depending on their standard
            ordenTrabajoId: ordenId,
            validezDias: 15,
            metodoPago: 'Transferencia/Efectivo'
        };

        // 3. Create Factura using builder logic
        const result = await guardarDocumentoBuilder(documentData, facturacionItems);
        if (!result.success) {
            throw new Error(result.error);
        }

        const facturaId = result.docId;
        const correlativo = result.correlativo;

        // 4. Update the database within transaction: repuestos, mano de obra, and keep state as ESPERANDO_APROBACION
        await prisma.$transaction(async (tx) => {
            for (const rep of repuestosAprobados) {
                await tx.ordenTrabajoRepuesto.update({
                    where: { id: rep.id },
                    data: {
                        precioAprobado: rep.precioAprobado,
                        subtotalAprobado: rep.subtotalAprobado
                    }
                });
            }

            await tx.ordenTrabajo.update({
                where: { id: ordenId },
                data: {
                    estado: 'ESPERANDO_APROBACION',
                    costoReparacion: costoFinalReparacion,
                }
            });
        });

        const domain = process.env.NEXT_PUBLIC_APP_URL || "https://bioelectronicahn.vercel.app";
        const portalUrl = `${domain}/aprobar-presupuesto/${facturaId}`;

        revalidatePath('/soporte');
        revalidatePath(`/soporte/${ordenId}`);

        return { success: true, facturaId, correlativo, portalUrl };
    } catch (e: any) {
        console.error("Error generando presupuesto:", e);
        return { success: false, error: e.message || "Error al generar presupuesto" };
    }
}

export async function enviarPresupuestoAlCliente(ordenId: string) {
    try {
        const orden = await prisma.ordenTrabajo.findUnique({
            where: { id: ordenId },
            include: { cliente: true }
        });
        if (!orden) throw new Error("Orden no encontrada");

        const factura = await prisma.factura.findFirst({
            where: {
                ordenTrabajoId: ordenId,
                tipoDocumento: 'COTIZACION'
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!factura) throw new Error("No se encontró presupuesto para esta orden. Por favor genere uno primero.");

        const total = Number(factura.total);

        // 1. Update order state to APROBACION_PRESUPUESTO
        await prisma.ordenTrabajo.update({
            where: { id: ordenId },
            data: {
                estado: 'APROBACION_PRESUPUESTO'
            }
        });

        // 2. Send Twilio notification
        const domain = process.env.NEXT_PUBLIC_APP_URL || "https://bioelectronicahn.vercel.app";
        const portalUrl = `${domain}/aprobar-presupuesto/${factura.id}`;

        if (orden.cliente?.telefono) {
            const phoneWithCountryCode = orden.cliente.telefono.startsWith('+') ? orden.cliente.telefono : `+504${orden.cliente.telefono}`;
            try {
                await sendSoportePresupuesto(
                    orden.cliente?.nombre || '',
                    phoneWithCountryCode,
                    `${orden.equipoDano} - ${orden.marcaModelo || ''}`,
                    orden.codigoSeguridad,
                    orden.descripcionFalla || 'Mantenimiento Correctivo',
                    total,
                    factura.id
                );
            } catch (twilioError) {
                console.error("Twilio notification failed on send:", twilioError);
            }
        }

        // 3. Sync status in Kanban
        await syncKanbanStatus(ordenId, 'APROBACION_PRESUPUESTO');

        revalidatePath('/soporte');
        revalidatePath(`/soporte/${ordenId}`);

        return { success: true, portalUrl };
    } catch (e: any) {
        console.error("Error al enviar presupuesto:", e);
        return { success: false, error: e.message || "Error al enviar presupuesto" };
    }
}

export async function aprobarPresupuestoManualmente(ordenId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let userId = null;
    if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
        userId = dbUser?.id;
    }

    await prisma.$transaction(async (tx) => {
        // Find the active budget factura
        const factura = await tx.factura.findFirst({
            where: {
                ordenTrabajoId: ordenId,
                tipoDocumento: 'COTIZACION',
                estado: { not: 'APROBADA' }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (factura) {
            await tx.factura.update({
                where: { id: factura.id },
                data: {
                    estado: 'APROBADA',
                    firmaClienteBase64: 'APROBADO_MANUALMENTE',
                    firmaClienteAt: new Date()
                }
            });
        }

        const orden = await tx.ordenTrabajo.update({
            where: { id: ordenId },
            data: {
                estado: 'REPARACION',
                fechaAprobado: new Date(),
                usuarioAprobacionId: userId || undefined,
            },
            include: { cliente: true, tecnicoReparacion: true }
        });

        if (orden.cliente?.telefono) {
            const phoneWithCountryCode = orden.cliente.telefono.startsWith('+') ? orden.cliente.telefono : `+504${orden.cliente.telefono}`;
            const entregaEst = new Date();
            entregaEst.setDate(entregaEst.getDate() + 5);
            
            try {
                await sendSoporteReparacionIniciada(
                    orden.cliente.nombre,
                    phoneWithCountryCode,
                    orden.equipoDano,
                    orden.codigoSeguridad,
                    orden.tecnicoReparacion?.nombre || "Equipo Técnico",
                    entregaEst.toLocaleDateString(),
                    "Reparación autorizada"
                );
            } catch (e) {
                console.error("Twilio Reparacion Iniciada Error:", e);
            }
        }
    });

    await syncKanbanStatus(ordenId, 'REPARACION', userId || undefined);

    if (userId) {
        try {
            const task = await prisma.kanbanTask.findFirst({ where: { ordenTrabajoId: ordenId } });
            if (task) {
                await prisma.kanbanActivity.create({
                    data: {
                        spaceId: task.spaceId,
                        taskId: task.id,
                        usuarioId: userId,
                        accion: 'COMENTARIO',
                        detalles: `Gerencia ha aprobado el presupuesto manualmente. La reparación puede iniciar.`
                    }
                });
            }
        } catch (e) {
            console.error("Error logging approval kanban activity", e);
        }
    }

    revalidatePath('/soporte');
    revalidatePath(`/soporte/${ordenId}`);
    return { success: true };
}

export async function eliminarOrdenTrabajo(ordenId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'No autenticado.' };
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true, accessibleModules: true, organizationId: true }
    });

    if (!dbUser) {
        return { success: false, error: 'Usuario no encontrado.' };
    }

    const canDeleteOrder = dbUser.role === 'SUPER_ADMIN' || (dbUser.accessibleModules || []).includes('eliminar_ordenes');
    if (!canDeleteOrder) {
        return { success: false, error: 'No autorizado. Se requiere el privilegio "Soporte - Eliminar Órdenes".' };
    }

    const orgId = dbUser.organizationId;
    
    await prisma.$transaction(async (tx) => {
        // 1. Delete associated facturas (budget invoices) and their details will cascade delete
        const facturas = await tx.factura.findMany({
            where: { ordenTrabajoId: ordenId }
        });
        for (const f of facturas) {
            await tx.factura.delete({ where: { id: f.id } });
        }
        
        // 2. Delete associated Kanban tasks (comments, attachments, activities will cascade delete)
        const kanbanTasks = await tx.kanbanTask.findMany({
            where: { ordenTrabajoId: ordenId }
        });
        for (const t of kanbanTasks) {
            await tx.kanbanTask.delete({ where: { id: t.id } });
        }
        
        // 3. Delete repuestos associated with the order
        await tx.ordenTrabajoRepuesto.deleteMany({
            where: { ordenTrabajoId: ordenId }
        });
        
        // 4. Finally, delete the OrdenTrabajo
        await tx.ordenTrabajo.delete({
            where: { id: ordenId, organizationId: orgId }
        });
    });
    
    // Log activity
    await logActivity({
        userId: dbUser.id,
        organizationId: orgId,
        action: 'DELETE',
        module: '/soporte',
        description: `Eliminó permanentemente orden de trabajo ID: ${ordenId}`,
        metadata: {
            ordenId
        }
    });

    revalidatePath('/soporte');
    return { success: true };
}

export async function notificarClienteListo(ordenId: string) {
    const orgId = await getOrgId();
    
    const orden = await prisma.ordenTrabajo.findUnique({
        where: { id: ordenId },
        include: {
            cliente: true
        }
    });

    if (!orden) {
        return { success: false, error: 'Orden no encontrada.' };
    }

    if (!orden.cliente?.telefono) {
        return { success: false, error: 'El cliente no tiene un número de teléfono registrado.' };
    }

    const montoAPagar = Number(orden.costoReparacion) || 0;

    const res = await sendSoporteEquipoListo(
        orden.cliente.nombre,
        orden.cliente.telefono,
        orden.equipoDano,
        orden.codigoSeguridad,
        montoAPagar
    );

    if (res.success) {
        await prisma.ordenTrabajo.update({
            where: { id: ordenId },
            data: { notificadoWhatsApp: true }
        });
        revalidatePath(`/soporte/${ordenId}`);
        revalidatePath('/soporte');
        return { success: true };
    } else {
        return { success: false, error: res.error || 'Error al enviar la notificación por WhatsApp.' };
    }
}

export async function getHistorialEntregados() {
    const orgId = await getOrgId();

    return prisma.ordenTrabajo.findMany({
        where: {
            organizationId: orgId,
            estado: 'ENTREGADO'
        },
        include: {
            cliente: true,
            tecnicosAsignados: true
        },
        orderBy: { fechaEntregado: 'desc' }
    });
}

export async function convertirCotizacionAServicioFactura(cotizacionId: string) {
    return convertirDocumento(cotizacionId, 'FACTURA');
}

export async function enviarNotificacionPresupuestoTwilio(ordenId: string) {
    try {
        const orden = await prisma.ordenTrabajo.findUnique({
            where: { id: ordenId },
            include: { cliente: true }
        });
        if (!orden) throw new Error("Orden no encontrada");

        const factura = await prisma.factura.findFirst({
            where: {
                ordenTrabajoId: ordenId,
                tipoDocumento: 'COTIZACION'
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!factura) throw new Error("No se encontró presupuesto para esta orden. Por favor genere uno primero.");

        if (!orden.cliente?.telefono) {
            throw new Error("El cliente no tiene un número de teléfono registrado.");
        }

        const phoneWithCountryCode = orden.cliente.telefono.startsWith('+') ? orden.cliente.telefono : `+504${orden.cliente.telefono}`;
        const total = Number(factura.total);

        const res = await sendSoportePresupuesto(
            orden.cliente.nombre,
            phoneWithCountryCode,
            `${orden.equipoDano} - ${orden.marcaModelo || ''}`,
            orden.codigoSeguridad,
            orden.descripcionFalla || 'Mantenimiento Correctivo',
            total,
            factura.id
        );

        if (res.success) {
            revalidatePath(`/soporte/${ordenId}`);
            return { success: true };
        } else {
            return { success: false, error: res.error || "Fallo al enviar por Twilio" };
        }
    } catch (e: any) {
        console.error("Error al enviar presupuesto por Twilio:", e);
        return { success: false, error: e.message || "Error al enviar presupuesto" };
    }
}

export async function enviarNotificacionRecepcionTwilio(ordenId: string) {
    try {
        const orden = await prisma.ordenTrabajo.findUnique({
            where: { id: ordenId },
            include: { cliente: true, tecnicosAsignados: true }
        });
        if (!orden) throw new Error("Orden no encontrada");

        if (!orden.cliente?.telefono) {
            throw new Error("El cliente no tiene un número de teléfono registrado.");
        }

        const phoneWithCountryCode = orden.cliente.telefono.startsWith('+') ? orden.cliente.telefono : `+504${orden.cliente.telefono}`;
        const tecnicoAsignado = orden.tecnicosAsignados.map(t => [t.nombre, t.apellido].filter(Boolean).join(" ")).join(", ") || 'Por asignar';

        const res = await sendSoporteRecepcion(
            orden.cliente.nombre,
            phoneWithCountryCode,
            orden.codigoSeguridad,
            orden.equipoDano,
            orden.serie || 'No especificado',
            tecnicoAsignado
        );

        if (res.success) {
            revalidatePath(`/soporte/${ordenId}`);
            return { success: true };
        } else {
            return { success: false, error: res.error || "Fallo al enviar por Twilio" };
        }
    } catch (e: any) {
        console.error("Error al enviar recepción por Twilio:", e);
        return { success: false, error: e.message || "Error al enviar recepción" };
    }
}

export async function syncMantenimientosDesdeOrdenTrabajo(ordenId: string) {
    try {
        const orden = await prisma.ordenTrabajo.findUnique({
            where: { id: ordenId },
            include: { cliente: true }
        });
        if (!orden) return;

        if (!orden.aplicaMantenimientos) {
            // Si ya no aplica, eliminar mantenimientos programados que aún no se hayan realizado
            const eq = await prisma.equipoCliente.findFirst({
                where: {
                    organizationId: orden.organizationId,
                    clienteId: orden.clienteId,
                    nombre: orden.equipoDano,
                    serie: orden.serie || undefined
                }
            });
            if (eq) {
                await prisma.mantenimiento.deleteMany({
                    where: {
                        equipoClienteId: eq.id,
                        estado: "PROGRAMADO"
                    }
                });
            }
            return;
        }

        // 1. Encontrar o crear EquipoCliente
        let equipoCliente = await prisma.equipoCliente.findFirst({
            where: {
                organizationId: orden.organizationId,
                clienteId: orden.clienteId,
                nombre: orden.equipoDano,
                serie: orden.serie || undefined
            }
        });

        const brandModelSplit = orden.marcaModelo ? orden.marcaModelo.split(" ") : [];
        const marca = brandModelSplit[0] || null;
        const modelo = brandModelSplit.slice(1).join(" ") || null;

        let fechaVencimientoGarantia: Date | null = null;
        if (orden.garantiaMeses) {
            const baseDate = new Date(orden.fechaRecibido);
            fechaVencimientoGarantia = new Date(baseDate);
            fechaVencimientoGarantia.setMonth(fechaVencimientoGarantia.getMonth() + orden.garantiaMeses);
        }

        if (!equipoCliente) {
            equipoCliente = await prisma.equipoCliente.create({
                data: {
                    organizationId: orden.organizationId,
                    clienteId: orden.clienteId,
                    nombre: orden.equipoDano,
                    marca,
                    modelo,
                    serie: orden.serie,
                    fechaInstalacion: orden.fechaRecibido,
                    garantiaMeses: orden.garantiaMeses,
                    fechaVencimientoGarantia,
                    mantenimientosGratisTotales: orden.cantidadMantenimientos || 0,
                    mantenimientosGratisRealizados: 0
                }
            });
        } else {
            equipoCliente = await prisma.equipoCliente.update({
                where: { id: equipoCliente.id },
                data: {
                    garantiaMeses: orden.garantiaMeses,
                    fechaVencimientoGarantia,
                    mantenimientosGratisTotales: orden.cantidadMantenimientos || equipoCliente.mantenimientosGratisTotales
                }
            });
        }

        // 2. Generar mantenimientos
        // Eliminar programados previos
        await prisma.mantenimiento.deleteMany({
            where: {
                equipoClienteId: equipoCliente.id,
                estado: "PROGRAMADO"
            }
        });

        const countMants = orden.cantidadMantenimientos || 12; // Genera 12 mantenimientos si no se especifica
        const freqMeses = orden.frecuenciaMantenimientoMeses || 3;
        const baseDate = new Date(orden.fechaRecibido);

        for (let i = 0; i < countMants; i++) {
            const scheduledDate = new Date(baseDate);
            scheduledDate.setMonth(scheduledDate.getMonth() + (i * freqMeses));

            // Verificar si ya existe un mantenimiento en esta fecha para no duplicar
            const extExist = await prisma.mantenimiento.findFirst({
                where: {
                    equipoClienteId: equipoCliente.id,
                    fechaProgramada: scheduledDate
                }
            });

            if (!extExist) {
                await prisma.mantenimiento.create({
                    data: {
                        organizationId: orden.organizationId,
                        equipoClienteId: equipoCliente.id,
                        fechaProgramada: scheduledDate,
                        tipo: "PREVENTIVO",
                        estado: i === 0 ? "REALIZADO" : "PROGRAMADO",
                        fechaRealizada: i === 0 ? scheduledDate : null,
                        esGratis: false,
                        notas: i === 0 ? `Primer mantenimiento (fecha de la orden de trabajo)` : `Mantenimiento preventivo periódico`
                    }
                });
            }
        }
    } catch (err) {
        console.error("Error in syncMantenimientosDesdeOrdenTrabajo:", err);
    }
}

export async function crearEquipoClienteAction(data: {
    clienteId: string;
    nombre: string;
    marca?: string | null;
    modelo?: string | null;
    serie?: string | null;
    idQr?: string | null;
    observaciones?: string | null;
    createdById?: string | null;
}) {
    try {
        const orgId = await getOrgId();
        
        const finalIdQr = data.idQr?.trim() || `EQ-${randomBytes(4).toString('hex').toUpperCase()}`;

        // Verificar duplicados de idQr
        const duplicate = await prisma.activoFijo.findFirst({
            where: {
                organizationId: orgId,
                idQr: finalIdQr
            }
        });

        if (duplicate) {
            return { success: false, error: `Ya existe un equipo/activo registrado con el QR ${finalIdQr}` };
        }

        const newAsset = await prisma.activoFijo.create({
            data: {
                organizationId: orgId,
                idQr: finalIdQr,
                descripcionCorta: data.nombre.trim(),
                marca: data.marca?.trim() || null,
                modelo: data.modelo?.trim() || null,
                serie: data.serie?.trim() || null,
                observaciones: data.observaciones?.trim() || null,
                area: 'Clientes Externos',
                cuentaAct: 'Activo de Cliente',
                esEquipoCliente: true,
                clienteId: data.clienteId,
                createdById: data.createdById || null
            }
        });

        // Crear una entrada en EquipoCliente para sincronización con el módulo de mantenimientos previos si es necesario
        try {
            await prisma.equipoCliente.create({
                data: {
                    organizationId: orgId,
                    clienteId: data.clienteId,
                    activoFijoId: newAsset.id,
                    nombre: data.nombre.trim(),
                    marca: data.marca?.trim() || null,
                    modelo: data.modelo?.trim() || null,
                    serie: data.serie?.trim() || null,
                    codigoEtiqueta: finalIdQr
                }
            });
        } catch (eqErr) {
            console.error("Error creating mirrored EquipoCliente record:", eqErr);
        }

        revalidatePath('/soporte');
        return { success: true, asset: newAsset };
    } catch (e: any) {
        console.error("Error creating client equipment asset:", e);
        return { success: false, error: e.message || "Error al crear el equipo de cliente" };
    }
}

export async function crearClienteAction(data: {
    nombre: string;
    rtn?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
    notas?: string | null;
    nombreContacto?: string | null;
    telefonoContacto?: string | null;
}) {
    try {
        const orgId = await getOrgId();
        
        const cleanNombre = data.nombre.trim();

        // Verificar duplicado por nombre
        const existing = await prisma.cliente.findFirst({
            where: {
                organizationId: orgId,
                nombre: {
                    equals: cleanNombre,
                    mode: 'insensitive'
                }
            }
        });

        if (existing) {
            return { success: false, error: `Ya existe un cliente con el nombre "${cleanNombre}"` };
        }

        const newCliente = await prisma.cliente.create({
            data: {
                organizationId: orgId,
                nombre: cleanNombre,
                rtn: data.rtn?.trim() || null,
                telefono: data.telefono?.trim() || null,
                email: data.email?.trim() || null,
                direccion: data.direccion?.trim() || null,
                notas: data.notas?.trim() || null,
                nombreContacto: data.nombreContacto?.trim() || null,
                telefonoContacto: data.telefonoContacto?.trim() || null,
            }
        });

        revalidatePath('/soporte');
        return { success: true, cliente: newCliente };
    } catch (e: any) {
        console.error("Error creating cliente:", e);
        return { success: false, error: e.message || "Error al crear el cliente" };
    }
}





