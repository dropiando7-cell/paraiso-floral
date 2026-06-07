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
            cliente: true
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

    const orden = await prisma.ordenTrabajo.create({
        data: {
            organizationId: orgId,
            clienteId: clienteRecord.id,
            equipoDano: data.nombreEquipo?.trim() || (data.equipo.toLowerCase() === 'medico' ? 'Equipo Médico' : data.equipo.toLowerCase() === 'aire' ? 'Aire Acondicionado' : 'Otro'),
            tipoAparato: data.equipo.toUpperCase(),
            marcaModelo,
            serie: data.serie || null,
            descripcionFalla: data.descripcionFalla,
            codigoSeguridad,
            fotosEstadoInicial: data.fotosEstadoInicial || [],
            costoRevision,
            metodoPagoRevision,
            cajaSessionId,
            estado: 'RECIBIDO',
            usuarioRecepcionId: data.usuarioRecepcionId || null,
            tecnicoReparacionId: firstTecnicoId,
            tecnicosAsignados: {
                connect: data.tecnicoIds?.map(id => ({ id })) || []
            }
        },
        include: { cliente: true }
    });

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
    // SINCRONIZACIÓN AUTOMÁTICA CON KANBAN (Desarrollo Bio)
    // ----------------------------------------------------
    try {
        // 1. Buscar o crear el espacio "Desarrollo Bio"
        let space = await prisma.kanbanSpace.findFirst({
            where: {
                nombre: {
                    equals: 'Desarrollo Bio',
                    mode: 'insensitive'
                },
                organizationId: orgId
            }
        });

        if (!space) {
            // Generar clave única para el espacio
            const baseClave = 'DB';
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
                    nombre: 'Desarrollo Bio',
                    clave: spaceClave,
                    tiposActividad: ["Task", "Story", "Feature", "Bug", "Orden de Trabajo"],
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

    revalidatePath('/soporte');
    
    // Sync with Kanban
    await syncKanbanStatus(id, nuevoEstado);

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

        // Deduct inventory
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
    fotosTecnico: string[] = []
) {
    const orgId = await getOrgId();

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
        const orden = await tx.ordenTrabajo.update({
            where: { id: ordenId },
            data: {
                estado: 'ESPERANDO_APROBACION',
                fechaEvaluado: new Date(),
                diagnosticoTecnico: diagnostico,
                detalleManoObra: manoObra as any,
                costoReparacion: costoSugerido,
                fotosTecnico: fotosTecnico
            },
            include: { cliente: true }
        });

        if (orden.cliente?.telefono) {
            const phoneWithCountryCode = orden.cliente.telefono.startsWith('+') ? orden.cliente.telefono : `+504${orden.cliente.telefono}`;
            // Tiempo estimado de reparacion (placeholder 3 a 5 días)
            const tiempoEst = "3 a 5 días hábiles";
            const falla = diagnostico.substring(0, 100) + (diagnostico.length > 100 ? "..." : "");
            const trabajosArr = manoObra.map(m => m.descripcion);
            const trabajosStr = trabajosArr.length > 0 ? trabajosArr.join(', ').substring(0, 50) : "Reparación General";
            
            try {
                await sendSoportePresupuesto(
                    orden.cliente.nombre,
                    phoneWithCountryCode,
                    orden.equipoDano,
                    orden.codigoSeguridad,
                    falla,
                    trabajosStr,
                    costoSugerido,
                    tiempoEst
                );
            } catch (e) {
                console.error("Twilio Presupuesto Error:", e);
            }
        }
    });

    await syncKanbanStatus(ordenId, 'ESPERANDO_APROBACION');

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

        const orden = await tx.ordenTrabajo.update({
            where: { id: ordenId },
            data: {
                estado: 'REPARACION',
                fechaAprobado: new Date(),
                usuarioAprobacionId: userId || undefined,
                costoReparacion: costoFinalReparacion,
                ...(detalleManoObraModificado ? { detalleManoObra: detalleManoObraModificado as any } : {})
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
                        detalles: `Gerencia ha aprobado el presupuesto. La reparación puede iniciar.`
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

export async function asignarTecnicos(ordenId: string, tecnicoIds: string[]) {
    const firstTecnicoId = tecnicoIds[0] || null;
    await prisma.ordenTrabajo.update({
        where: { id: ordenId },
        data: {
            tecnicoReparacionId: firstTecnicoId,
            tecnicosAsignados: {
                set: tecnicoIds.map(id => ({ id }))
            }
        }
    });

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
        },
        include: {
            cliente: true
        }
    });

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

        let targetColumn = '';
        if (['RECIBIDO', 'EN_EVALUACION', 'ESPERANDO_APROBACION'].includes(nuevoEstado)) {
            targetColumn = 'POR HACER';
        } else if (nuevoEstado === 'APROBACION_PRESUPUESTO') {
            targetColumn = 'EN REVISIÓN';
        } else if (nuevoEstado === 'REPARACION') {
            targetColumn = 'EN CURSO';
        } else if (['LISTO_ENTREGA', 'ENTREGADO'].includes(nuevoEstado)) {
            targetColumn = 'LISTO';
        }

        if (!targetColumn) return;

        // Auto-healing: Ensure column exists
        let currentColumns = [...task.space.columnas];
        if (!currentColumns.includes(targetColumn)) {
            currentColumns.push(targetColumn);
            await prisma.kanbanSpace.update({
                where: { id: task.space.id },
                data: { columnas: currentColumns }
            });
        }

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

import { guardarDocumentoBuilder } from '../facturas/actions';

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
            tipoDocumento: 'PRESUPUESTO_REPARACION',
            clienteId: orden.clienteId,
            subTotal: subTotal,
            total: total,
            totalExento: 0,
            totalExonerado: 0,
            totalGravado15: total, // or 0 depending on their standard
            documentoOrigenId: ordenId,
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

        // 4. Update the database within transaction: repuestos, mano de obra, and order state
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
                    estado: 'APROBACION_PRESUPUESTO',
                    costoReparacion: costoFinalReparacion,
                    detalleManoObra: detalleManoObraModificado as any
                }
            });
        });

        // 5. Send Twilio notification with the URL to the portal
        const domain = process.env.NEXT_PUBLIC_APP_URL || "https://bioelectronicahn.vercel.app";
        const portalUrl = `${domain}/c/${facturaId}/presupuesto`;

        // We inject the URL in the 'fallaEncontrada' or 'trabajoARealizar' variable.
        const trabajoText = `Para ver el detalle completo y FIRMAR, ingresa aquí: ${portalUrl}`;

        await sendSoportePresupuesto(
            orden.cliente?.nombre || '',
            orden.cliente?.telefono || '',
            `${orden.equipoDano} - ${orden.marcaModelo || ''}`,
            orden.codigoSeguridad,
            orden.descripcionFalla || 'Mantenimiento Correctivo',
            trabajoText,
            total,
            '3 a 5 días hábiles'
        );

        // 6. Sync status in Kanban
        await syncKanbanStatus(ordenId, 'APROBACION_PRESUPUESTO');

        revalidatePath('/soporte');
        revalidatePath(`/soporte/${ordenId}`);

        return { success: true, facturaId, correlativo, portalUrl };
    } catch (e: any) {
        console.error("Error generando presupuesto:", e);
        return { success: false, error: e.message || "Error al generar presupuesto" };
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
                documentoOrigenId: ordenId,
                tipoDocumento: 'PRESUPUESTO_REPARACION',
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
