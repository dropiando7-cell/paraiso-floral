'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-logger';

// Helper for Auth — returns full user object with nombre+apellido
export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) throw new Error("Usuario no encontrado");

    // Build full name from nombre+apellido; fallback to email prefix
    const fullName = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Usuario';

    return { ...dbUser, fullName };
}

// Helper for Auth — organizationId only (backward compat)
export async function getOrganizationId() {
    const u = await getAuthenticatedUser();
    return u.organizationId;
}

// Format correlativo as PREFIX-SO-8-digit padded number
function formatCorrelativo(numeroInterno: number, tipoDocumento: string): string {
    const prefix = tipoDocumento === 'COTIZACION' ? 'COT-SO' :
                   tipoDocumento === 'PROFORMA' ? 'PRO-SO' :
                   tipoDocumento === 'NOTA_CREDITO' ? 'NC-SO' :
                   tipoDocumento === 'PRESUPUESTO_REPARACION' ? 'COT-SO' :
                   tipoDocumento === 'PRESUPUESTO_MANTENIMIENTO' ? 'COT-SO' :
                   'FAC-SO';
    return `${prefix}${String(numeroInterno).padStart(8, '0')}`;
}

// --- CLIENTES ---
export async function searchClientes(query: string = "") {
    try {
        const organizationId = await getOrganizationId();
        const queryTrim = query.trim();

        // Auto-asegurar que exista el cliente "CONSUMIDOR FINAL" en la organización
        const consumidorExists = await prisma.cliente.findFirst({
            where: { organizationId, nombre: { equals: 'CONSUMIDOR FINAL', mode: 'insensitive' } }
        });
        if (!consumidorExists) {
            try {
                await prisma.cliente.create({
                    data: {
                        organizationId,
                        nombre: 'CONSUMIDOR FINAL',
                        rtn: '00000000000000',
                        direccion: 'CONSUMIDOR FINAL',
                        notas: 'Cliente genérico por defecto para caja POS'
                    }
                });
            } catch (errCreate) {
                console.error('Error auto-creating CONSUMIDOR FINAL:', errCreate);
            }
        }

        const clientes = await prisma.cliente.findMany({
            where: { 
                organizationId,
                ...(queryTrim ? {
                    OR: [
                        { nombre: { contains: queryTrim, mode: 'insensitive' } },
                        { rtn: { contains: queryTrim, mode: 'insensitive' } },
                        { telefono: { contains: queryTrim, mode: 'insensitive' } },
                    ]
                } : {})
            },
            take: 100,
            orderBy: { nombre: 'asc' }
        });

        return clientes.map(c => ({
            ...c,
            nombre: c.nombre.toUpperCase(),
            nombreContacto: c.nombreContacto ? c.nombreContacto.toUpperCase() : null,
            limiteCredito: c.limiteCredito ? Number(c.limiteCredito) : 0,
            diasCredito: c.diasCredito || 15
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

// --- PRODUCTOS Y ACTIVOS FIJOS (Catálogo Médico General) ---
export async function searchProductos(query: string = "", limitOverride?: number) {
    try {
        const organizationId = await getOrganizationId();
        const queryTrim = query.trim();
        const limit = limitOverride || (queryTrim ? 50 : 30);
        
        const [productos, activos] = await Promise.all([
            prisma.producto.findMany({
                where: { 
                    organizationId,
                    estado: 'ACTIVO',
                    ...(queryTrim ? {
                        OR: [
                            { nombre: { contains: queryTrim, mode: 'insensitive' } },
                            { sku: { contains: queryTrim, mode: 'insensitive' } },
                            { marca: { contains: queryTrim, mode: 'insensitive' } },
                            { modelo: { contains: queryTrim, mode: 'insensitive' } },
                            { categoria: { contains: queryTrim, mode: 'insensitive' } }
                        ]
                    } : {})
                },
                take: limit
            }),
            prisma.activoFijo.findMany({
                where: {
                    organizationId,
                    estatusContable: 'VIGENTE',
                    ...(queryTrim ? {
                        OR: [
                            { descripcionCorta: { contains: queryTrim, mode: 'insensitive' } },
                            { idQr: { contains: queryTrim, mode: 'insensitive' } },
                            { marca: { contains: queryTrim, mode: 'insensitive' } },
                            { serie: { contains: queryTrim, mode: 'insensitive' } }
                        ]
                    } : {})
                },
                include: { producto: true },
                take: limit
            })
        ]);
        
        // 3. Buscar en Ordenes de Trabajo / Tareas Kanban
        const otLimit = queryTrim ? 15 : 5;
        const [matchingOTs, matchingTasks] = await Promise.all([
            prisma.ordenTrabajo.findMany({
                where: {
                    organizationId,
                    ...(queryTrim ? {
                        OR: [
                            { codigoSeguridad: { contains: queryTrim, mode: 'insensitive' } },
                            { equipoDano: { contains: queryTrim, mode: 'insensitive' } },
                            { marcaModelo: { contains: queryTrim, mode: 'insensitive' } },
                            { serie: { contains: queryTrim, mode: 'insensitive' } }
                        ]
                    } : {})
                },
                include: { kanbanTasks: true },
                take: otLimit,
                orderBy: { fechaRecibido: 'desc' }
            }),
            queryTrim ? prisma.kanbanTask.findMany({
                where: {
                    organizationId,
                    OR: [
                        { codigo: { contains: queryTrim, mode: 'insensitive' } },
                        { title: { contains: queryTrim, mode: 'insensitive' } }
                    ]
                },
                include: { ordenTrabajo: true },
                take: otLimit
            }) : []
        ]);

        const formatDecimal = (val: any) => val ? val.toString() : '0';

        const unifiedProductos = productos.map(p => ({
            id: p.id,
            sku: p.sku,
            nombre: p.nombre,
            descripcion: p.descripcion,
            precioVenta: formatDecimal(p.precioVenta),
            costoBase: formatDecimal(p.costoBase),
            marca: p.marca,
            stockActual: p.stockActual,
            type: 'producto' as const,
            imageUrl: p.imagenWeb || (p.imagenes && p.imagenes[0]) || undefined
        }));

        const unifiedActivos = activos.map(a => ({
            id: a.id,
            sku: a.idQr,
            nombre: a.descripcionCorta,
            descripcion: a.descripcionDetallada || `Serie: ${a.serie || 'N/A'} - Modelo: ${a.modelo || 'N/A'}`,
            precioVenta: formatDecimal(a.producto?.precioVenta || a.costoAdq || 0),
            costoBase: formatDecimal(a.costoAdq || 0),
            marca: a.marca || a.area || 'Activo Fijo',
            stockActual: a.stock || 1,
            type: 'activo' as const,
            fechaVencimiento: a.fechaVencimiento ? a.fechaVencimiento.toISOString() : undefined,
            imageUrl: a.imagenUrl || undefined,
            serie: a.serie || undefined
        }));

        const otItems = [];
        const seenOtIds = new Set();
        
        for (const ot of matchingOTs) {
            if (seenOtIds.has(ot.id)) continue;
            seenOtIds.add(ot.id);
            const taskCode = ot.kanbanTasks?.[0]?.codigo || ot.codigoSeguridad;
            otItems.push({
                id: ot.id,
                sku: taskCode,
                nombre: `Servicio de Mantenimiento - ${ot.equipoDano}`,
                descripcion: `Marca/Modelo: ${ot.marcaModelo || 'N/A'}\nSerie: ${ot.serie || 'N/A'}`,
                precioVenta: formatDecimal(ot.costoReparacion || ot.costoRevision || 0),
                costoBase: '0',
                marca: 'Orden de Trabajo',
                stockActual: 1,
                type: 'activo' as const,
                imageUrl: ot.fotosTecnico?.[0] || ot.fotosEstadoInicial?.[0] || undefined,
                serie: ot.serie || undefined,
                marcaModelo: ot.marcaModelo || undefined,
                isOrdenTrabajo: true
            });
        }

        for (const task of matchingTasks) {
            const ot = task.ordenTrabajo;
            if (!ot || seenOtIds.has(ot.id)) continue;
            seenOtIds.add(ot.id);
            otItems.push({
                id: ot.id,
                sku: task.codigo,
                nombre: `Servicio de Mantenimiento - ${ot.equipoDano}`,
                descripcion: `Marca/Modelo: ${ot.marcaModelo || 'N/A'}\nSerie: ${ot.serie || 'N/A'}`,
                precioVenta: formatDecimal(ot.costoReparacion || ot.costoRevision || 0),
                costoBase: '0',
                marca: 'Orden de Trabajo',
                stockActual: 1,
                type: 'activo' as const,
                imageUrl: ot.fotosTecnico?.[0] || ot.fotosEstadoInicial?.[0] || undefined,
                serie: ot.serie || undefined,
                marcaModelo: ot.marcaModelo || undefined,
                isOrdenTrabajo: true
            });
        }

        return [...unifiedProductos, ...unifiedActivos, ...otItems];
    } catch (e) {
        console.error("Error en searchProductos:", e);
        return [];
    }
}

// --- CREAR FACTURA ---
export async function crearFacturaSegura(facturaData: any, detalles: any[], tipoCorrelativo: string = "FACTURA") {
    try {
        const organizationId = await getOrganizationId();

        // Check for active caja session
        const activeCaja = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId,
                estado: 'ABIERTA'
            }
        });
        const cajaSessionId = activeCaja?.id || null;

        // Si el cliente no existe, lo buscamos por nombre o lo creamos rápido
        let clienteId = facturaData.clienteId;
        if (!clienteId && facturaData.clienteNombre) {
            const clienteExistente = await prisma.cliente.findFirst({
                where: {
                    organizationId,
                    nombre: {
                        equals: facturaData.clienteNombre.trim(),
                        mode: 'insensitive'
                    }
                }
            });
            if (clienteExistente) {
                clienteId = clienteExistente.id;
            } else {
                const nuevoCliente = await prisma.cliente.create({
                    data: {
                        organizationId,
                        nombre: facturaData.clienteNombre.trim(),
                        rtn: facturaData.rtn,
                        telefono: facturaData.telefono,
                        direccion: facturaData.direccion
                    }
                });
                clienteId = nuevoCliente.id;
            }
        }

        if (!clienteId) throw new Error("Se requiere un cliente válido.");

        // AUTO-CORRELATIVO: Buscar la última factura para sumar 1
        const ultimaFactura = await prisma.factura.findFirst({
            where: { organizationId },
            orderBy: { numeroInterno: 'desc' }
        });
        
        const nextNumber = ultimaFactura ? ultimaFactura.numeroInterno + 1 : 1;
        // Generador visual
        const correlativoGenerado = formatCorrelativo(nextNumber, tipoCorrelativo);

        // TRANSACTION: Asegura que si falla el descuento de inventario, NO se guarde la factura.
        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Guardar la Factura
            const nuevaFactura = await tx.factura.create({
                data: {
                    organizationId,
                    clienteId,
                    correlativo: correlativoGenerado,
                    tipoDocumento: tipoCorrelativo, // Explicitly save the document type
                    numeroCAI: facturaData.numeroCAI || '3E6532-...-4C',
                    rangoAutorizado: facturaData.rangoAutorizado || '000-001-01-000001 al ...',
                    fechaLimiteEmision: facturaData.fechaLimiteEmision ? new Date(facturaData.fechaLimiteEmision) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    
                    subTotal: facturaData.subTotal,
                    descuentos: facturaData.descuentos,
                    totalExento: facturaData.totalExento,
                    totalExonerado: facturaData.totalExonerado,
                    totalGravado15: facturaData.totalGravado15,
                    isv15: facturaData.isv15,
                    totalGravado18: facturaData.totalGravado18,
                    isv18: facturaData.isv18,
                    total: facturaData.total,
                    
                    estado: 'EMITIDA',
                    inventarioDescontado: true,
                    metodoPago: facturaData.metodoPago || 'Efectivo',
                    cajaSessionId,
                    
                    detalles: {
                        create: detalles.map((d) => ({
                            descripcion: d.descripcion,
                            cantidad: d.cantidad,
                            precioUnitario: d.precioUnitario,
                            porcentajeIsv: d.porcentajeIsv ?? 15,
                            totalLinea: d.totalLinea,
                            productoId: d.productoId || null,
                            activoId: d.activoId || null,
                            mostrarDescripcion: d.mostrarDescripcion || false
                        }))
                    }
                }
            });

            // 2. Descontar Inventario Híbrido
            for (const detalle of detalles) {
                if (detalle.productoId) {
                    // Es un consumible/producto masivo: Restar Stock
                    await tx.producto.update({
                        where: { id: detalle.productoId },
                        data: { stockActual: { decrement: detalle.cantidad } }
                    });
                }
                
                if (detalle.activoId) {
                    const activo = await tx.activoFijo.findUnique({ where: { id: detalle.activoId }});
                    if (activo) {
                        const nuevoStock = activo.stock - detalle.cantidad;
                        await tx.activoFijo.update({
                            where: { id: detalle.activoId },
                            data: { 
                                stock: Math.max(0, nuevoStock),
                                estatusContable: nuevoStock <= 0 ? 'VENDIDO/ENTREGADO' : activo.estatusContable
                            }
                        });
                    }
                }
            }

            return nuevaFactura;
        });

        // Log activity
        const creator = await getAuthenticatedUser();
        await logActivity({
            userId: creator.id,
            organizationId,
            action: 'CREATE',
            module: '/facturas',
            description: `Creó documento ${tipoCorrelativo}: ${result.correlativo}`,
            metadata: {
                facturaId: result.id,
                correlativo: result.correlativo,
                tipoDocumento: tipoCorrelativo,
                total: facturaData.total
            }
        });

        revalidatePath('/facturas');
        return { success: true, facturaId: result.id, correlativo: result.correlativo };

    } catch (error: any) {
        console.error("Error al crear factura:", error);
        return { success: false, error: error.message || "Error desconocido al facturar" };
    }
}

// --- ACTUALIZAR DOCUMENTO EXISTENTE (Cotización, Proforma, Factura) ---
export async function actualizarDocumentoBuilder(id: string, data: any, lineItems: any[]) {
    try {
        const user = await getAuthenticatedUser();
        const organizationId = user.organizationId;
        const userRole = user.role;

        // Check for active caja session
        const activeCaja = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId,
                estado: 'ABIERTA'
            }
        });
        const activeCajaId = activeCaja?.id || null;

        // Verificar que el documento existe y pertenece a la organización
        const docExistente = await prisma.factura.findFirst({
            where: { id, organizationId }
        });
        if (!docExistente) throw new Error('Documento no encontrado o sin permisos.');
        if (docExistente.estado === 'ANULADA') throw new Error('No se puede modificar un documento anulado.');

        // Restricción para facturas emitidas
        if (docExistente.tipoDocumento === 'FACTURA' && docExistente.estado === 'EMITIDA') {
            const allowedModules = user.accessibleModules || [];
            const canEditEmitidas = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN' || allowedModules.includes('editar_facturas_emitidas');
            if (!canEditEmitidas) {
                throw new Error('Esta factura ya fue emitida. Solo un rol de administrador o usuario con privilegios autorizados puede manipular esta información sensible.');
            }
        }

        let clienteId = data.clienteId;
        if (!clienteId && data.clienteNombre) {
            const clienteExistente = await prisma.cliente.findFirst({
                where: {
                    organizationId,
                    nombre: {
                        equals: data.clienteNombre.trim(),
                        mode: 'insensitive'
                    }
                }
            });
            if (clienteExistente) {
                clienteId = clienteExistente.id;
            } else {
                const nuevoCliente = await prisma.cliente.create({
                    data: {
                        organizationId,
                        nombre: data.clienteNombre.trim(),
                        rtn: data.rtn || null,
                        telefono: data.telefono || null,
                        email: data.email || null,
                        direccion: data.direccion || null
                    }
                });
                clienteId = nuevoCliente.id;
            }
        }

        if (!clienteId) throw new Error('Se requiere un cliente válido.');

        const nuevoTipo = data.tipoDocumento || docExistente.tipoDocumento;
        const nuevoEstado = (nuevoTipo === 'FACTURA' || nuevoTipo === 'NOTA_CREDITO') ? 'EMITIDA' : 'PENDIENTE';
        const nuevoCorrelativo = formatCorrelativo(docExistente.numeroInterno, nuevoTipo);

        const result = await prisma.$transaction(async (tx) => {
            // Eliminar los detalles anteriores
            await tx.detalleFactura.deleteMany({ where: { facturaId: id } });

            // Actualizar la factura principal
            const docActualizado = await tx.factura.update({
                where: { id },
                data: {
                    clienteId,
                    correlativo: nuevoCorrelativo,
                    notas: data.notas || null,
                    terminosPago: data.terminosPago || null,
                    validezDias: Number(data.validezDias) || 30,
                    subTotal: data.subTotal,
                    descuentos: data.descuentos,
                    totalExento: data.totalExento || 0,
                    totalExonerado: data.totalExonerado || 0,
                    totalGravado15: data.totalGravado15 || 0,
                    isv15: data.isv15 || 0,
                    totalGravado18: data.totalGravado18 || 0,
                    isv18: data.isv18 || 0,
                    total: data.total,
                    estado: nuevoEstado, 
                    tipoDocumento: nuevoTipo,
                    templateSettings: data.templateSettings ? JSON.parse(JSON.stringify(data.templateSettings)) : undefined,
                    metodoPago: data.metodoPago || docExistente.metodoPago || 'Efectivo',
                    cajaSessionId: docExistente.cajaSessionId || (nuevoTipo === 'FACTURA' ? activeCajaId : null),
                    ordenTrabajoId: data.ordenTrabajoId !== undefined ? data.ordenTrabajoId : docExistente.ordenTrabajoId,
                    detalles: {
                        create: lineItems.map((item) => {
                            const basePrice = item.qty * item.unitPrice;
                            const discountAmt = item.discountType === 'amount'
                                ? Number(item.discount) || 0
                                : basePrice * ((Number(item.discount) || 0) / 100);
                            const lineTotal = basePrice - discountAmt;
                            let finalDesc = item.shortDesc;
                            if (item.marcaModelo || item.serie) {
                                if (item.marcaModelo) finalDesc += `\nMarca/Modelo: ${item.marcaModelo}`;
                                if (item.serie) finalDesc += `\nSerie: ${item.serie}`;
                            }
                            if (item.longDesc) {
                                finalDesc += `\n${item.longDesc}`;
                            }
                            if (item.isSection) {
                                finalDesc = `__SECTION__${finalDesc}`;
                                if (item.sectionStyle) finalDesc += `__STYLE__${JSON.stringify(item.sectionStyle)}`;
                            } else {
                                const metadata: any = {};
                                if (item.imageUrl) metadata.imageUrl = item.imageUrl;
                                if (item.marcaModelo) metadata.marcaModelo = item.marcaModelo;
                                if (item.serie) metadata.serie = item.serie;
                                if (Object.keys(metadata).length > 0) {
                                    finalDesc += `__METADATA__${JSON.stringify(metadata)}`;
                                }
                            }
                            return {
                                descripcion: finalDesc,
                                descripcionEnriquecida: item.richDesc || null,
                                cantidad: Number(item.qty) || 0,
                                precioUnitario: Number(item.unitPrice) || 0,
                                porcentajeIsv: item.tax === 'isv15' ? 15 : item.tax === 'isv18' ? 18 : 0,
                                totalDescuento: discountAmt || 0,
                                totalLinea: lineTotal || 0,
                                productoId: item.productoId || null,
                                activoId: item.activoId || null,
                                mostrarDescripcion: item.showLongDesc || false
                            };
                        })
                    }
                }
            });

            // Descontar inventario (sólo si no lo estaba ya)
            const debeDescontarInventario = (data.tipoDocumento === 'FACTURA' || data.tipoDocumento === 'PROFORMA');
            const debeRestaurarInventario = (data.tipoDocumento === 'NOTA_CREDITO');
            
            if (docExistente.estado === 'BORRADOR' && (debeDescontarInventario || debeRestaurarInventario)) {
                for (const item of lineItems) {
                    if (item.productoId) {
                        const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
                        const esServicio = prod?.esServicio === true || prod?.stockActual === 9999;
                        if (!esServicio) {
                            if (debeDescontarInventario) {
                                await tx.producto.update({
                                    where: { id: item.productoId },
                                    data: { stockActual: { decrement: Number(item.qty) } }
                                });
                            } else if (debeRestaurarInventario) {
                                await tx.producto.update({
                                    where: { id: item.productoId },
                                    data: { stockActual: { increment: Number(item.qty) } }
                                });
                            }
                        }
                    }
                    if (item.activoId && debeDescontarInventario) {
                        const activo = await tx.activoFijo.findUnique({ where: { id: item.activoId }});
                        if (activo) {
                            const nuevoStock = activo.stock - Number(item.qty);
                            await tx.activoFijo.update({
                                where: { id: item.activoId },
                                data: { 
                                    stock: Math.max(0, nuevoStock),
                                    estatusContable: nuevoStock <= 0 ? 'VENDIDO' : activo.estatusContable
                                }
                            });
                        }
                    } else if (item.activoId && debeRestaurarInventario) {
                        const activo = await tx.activoFijo.findUnique({ where: { id: item.activoId }});
                        if (activo) {
                            await tx.activoFijo.update({
                                where: { id: item.activoId },
                                data: { 
                                    stock: activo.stock + Number(item.qty),
                                    estatusContable: 'VIGENTE' 
                                }
                            });
                        }
                    }
                }
                // Mark inventory deducted
                await tx.factura.update({
                    where: { id },
                    data: { inventarioDescontado: true }
                });
            }

            if (data.templateSettings) {
                const orgSettings = JSON.parse(JSON.stringify(data.templateSettings));
                delete orgSettings.roundAdjustment;
                await tx.organization.update({
                    where: { id: organizationId },
                    data: { invoiceSettings: orgSettings }
                });
            }

            return docActualizado;
        });

        revalidatePath('/facturas');
        return { success: true, docId: result.id, correlativo: result.correlativo };

    } catch (error: any) {
        console.error('Error al actualizar documento:', error);
        return { success: false, error: error.message || 'Error al actualizar el documento' };
    }
}



// --- GUARDAR DOCUMENTO DINÁMICO (Cotización, Proforma, Factura) ---
export async function guardarDocumentoBuilder(data: any, lineItems: any[]) {
    try {
        const authUser = await getAuthenticatedUser();
        const { organizationId, id: creadoPorId, fullName: nombreUsuario } = authUser;

        // Check for active caja session
        const activeCaja = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId,
                estado: 'ABIERTA'
            }
        });
        const cajaSessionId = (data.tipoDocumento === 'FACTURA') ? (activeCaja?.id || null) : null;

        let clienteId = data.clienteId;
        if (!clienteId && data.clienteNombre) {
            const clienteExistente = await prisma.cliente.findFirst({
                where: {
                    organizationId,
                    nombre: {
                        equals: data.clienteNombre.trim(),
                        mode: 'insensitive'
                    }
                }
            });
            if (clienteExistente) {
                clienteId = clienteExistente.id;
            } else {
                const nuevoCliente = await prisma.cliente.create({
                    data: {
                        organizationId,
                        nombre: data.clienteNombre.trim(),
                        rtn: data.rtn || null,
                        telefono: data.telefono || null,
                        email: data.email || null,
                        direccion: data.direccion || null
                    }
                });
                clienteId = nuevoCliente.id;
            }
        }

        if (!clienteId) throw new Error("Se requiere un cliente válido.");

        // Descuenta inventario: FACTURA y PROFORMA sí, COTIZACION no
        const debeDescontarInventario = data.tipoDocumento === 'FACTURA' || data.tipoDocumento === 'PROFORMA';
        const debeRestaurarInventario = data.tipoDocumento === 'NOTA_CREDITO';

        const result = await prisma.$transaction(async (tx) => {
            // Crear el documento — el correlativo se genera DESPUÉS del create (usa numeroInterno auto)
            const nuevoDoc = await tx.factura.create({
                data: {
                    organizationId,
                    clienteId,
                    correlativo: 'TEMP', // Temporal — se actualiza abajo con el numeroInterno real
                    tipoDocumento: data.tipoDocumento,
                    estado: (data.tipoDocumento === 'FACTURA' || data.tipoDocumento === 'NOTA_CREDITO') ? 'EMITIDA' : 'PENDIENTE',
                    notas: data.notas || null,
                    terminosPago: data.terminosPago || null,
                    validezDias: Number(data.validezDias) || 30,
                    subTotal: data.subTotal,
                    descuentos: data.descuentos,
                    totalExento: data.totalExento || 0,
                    totalExonerado: data.totalExonerado || 0,
                    totalGravado15: data.totalGravado15 || 0,
                    isv15: data.isv15 || 0,
                    totalGravado18: data.totalGravado18 || 0,
                    isv18: data.isv18 || 0,
                    total: data.total,
                    templateSettings: data.templateSettings ? JSON.parse(JSON.stringify(data.templateSettings)) : null,
                    creadoPorId,
                    nombreUsuario,
                    inventarioDescontado: debeDescontarInventario,
                    documentoOrigenId: data.documentoOrigenId || null,
                    referenciaOriginalId: data.referenciaOriginalId || null,
                    ordenTrabajoId: data.ordenTrabajoId || null,
                    metodoPago: data.metodoPago || 'Efectivo',
                    cajaSessionId,
                    detalles: {
                        create: lineItems.map((item) => {
                            const basePrice = Number(item.qty) * Number(item.unitPrice);
                            const discountAmt = item.discountType === 'amount'
                                ? Number(item.discount) || 0
                                : basePrice * ((Number(item.discount) || 0) / 100);
                            const lineTotal = basePrice - discountAmt;
                            let finalDesc = item.shortDesc;
                            if (item.marcaModelo || item.serie) {
                                if (item.marcaModelo) finalDesc += `\nMarca/Modelo: ${item.marcaModelo}`;
                                if (item.serie) finalDesc += `\nSerie: ${item.serie}`;
                            }
                            if (item.longDesc) {
                                finalDesc += `\n${item.longDesc}`;
                            }
                            if (item.isSection) {
                                finalDesc = `__SECTION__${finalDesc}`;
                                if (item.sectionStyle) finalDesc += `__STYLE__${JSON.stringify(item.sectionStyle)}`;
                            } else {
                                const metadata: any = {};
                                if (item.imageUrl) metadata.imageUrl = item.imageUrl;
                                if (item.marcaModelo) metadata.marcaModelo = item.marcaModelo;
                                if (item.serie) metadata.serie = item.serie;
                                if (Object.keys(metadata).length > 0) {
                                    finalDesc += `__METADATA__${JSON.stringify(metadata)}`;
                                }
                            }
                            return {
                                descripcion: finalDesc,
                                descripcionEnriquecida: item.richDesc || null,
                                cantidad: Number(item.qty) || 0,
                                precioUnitario: Number(item.unitPrice) || 0,
                                porcentajeIsv: item.tax === 'isv15' ? 15 : item.tax === 'isv18' ? 18 : 0,
                                totalDescuento: discountAmt || 0,
                                totalLinea: lineTotal || 0,
                                productoId: item.productoId || null,
                                activoId: item.activoId || null,
                                mostrarDescripcion: item.showLongDesc || false
                            };
                        })
                    }
                }
            });

            // Ahora que tenemos numeroInterno, generar correlativo SO real y actualizar
            const correlativoFinal = formatCorrelativo(nuevoDoc.numeroInterno, data.tipoDocumento);
            const docFinal = await tx.factura.update({
                where: { id: nuevoDoc.id },
                data: { correlativo: correlativoFinal }
            });

            // Descontar o restaurar inventario
            if (debeDescontarInventario || debeRestaurarInventario) {
                for (const item of lineItems) {
                    if (item.productoId) {
                        // Verificar si es servicio (esServicio=true o stockActual=9999)
                        const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
                        const esServicio = prod?.esServicio === true || prod?.stockActual === 9999;
                        if (!esServicio) {
                            if (debeDescontarInventario) {
                                await tx.producto.update({
                                    where: { id: item.productoId },
                                    data: { stockActual: { decrement: Number(item.qty) } }
                                });
                            } else if (debeRestaurarInventario) {
                                await tx.producto.update({
                                    where: { id: item.productoId },
                                    data: { stockActual: { increment: Number(item.qty) } }
                                });
                            }
                        }
                    }
                    if (item.activoId && debeDescontarInventario) {
                        const activo = await tx.activoFijo.findUnique({ where: { id: item.activoId }});
                        if (activo) {
                            const nuevoStock = activo.stock - Number(item.qty);
                            await tx.activoFijo.update({
                                where: { id: item.activoId },
                                data: { 
                                    stock: Math.max(0, nuevoStock),
                                    estatusContable: nuevoStock <= 0 ? 'VENDIDO' : activo.estatusContable
                                }
                            });
                        }
                    } else if (item.activoId && debeRestaurarInventario) {
                        const activo = await tx.activoFijo.findUnique({ where: { id: item.activoId }});
                        if (activo) {
                            await tx.activoFijo.update({
                                where: { id: item.activoId },
                                data: { 
                                    stock: activo.stock + Number(item.qty),
                                    estatusContable: 'VIGENTE' 
                                }
                            });
                        }
                    }
                }
            }

            if (data.templateSettings) {
                const orgSettings = JSON.parse(JSON.stringify(data.templateSettings));
                delete orgSettings.roundAdjustment;
                await tx.organization.update({
                    where: { id: organizationId },
                    data: { invoiceSettings: orgSettings }
                });
            }

            return docFinal;
        });

        // Log activity
        await logActivity({
            userId: creadoPorId,
            organizationId,
            action: 'CREATE',
            module: '/facturas',
            description: `Creó documento ${data.tipoDocumento} (Builder): ${result.correlativo}`,
            metadata: {
                facturaId: result.id,
                correlativo: result.correlativo,
                tipoDocumento: data.tipoDocumento,
                total: data.total
            }
        });

        revalidatePath('/facturas');
        return { success: true, docId: result.id, correlativo: result.correlativo };

    } catch (error: any) {
        console.error("Error al guardar documento:", error);
        return { success: false, error: error.message || "Error al guardar el documento" };
    }
}

// --- BÚSQUEDA RÁPIDA DE ITEM POR CÓDIGO (Producto o Activo Fijo) ---

export async function buscarItemPorCodigo(codigo: string) {
    if (!codigo || codigo.trim() === '') return null;
    try {
        const organizationId = await getOrganizationId();
        const codigoTrim = codigo.trim();
        
        // 1. Buscar en Productos (Stock Generico)
        const producto = await prisma.producto.findFirst({
            where: {
                organizationId,
                estado: 'ACTIVO',
                sku: codigoTrim,
                activosFijos: { none: {} }
            }
        });

        if (producto) {
            return {
                id: producto.id,
                type: 'producto',
                name: producto.nombre,
                description: producto.descripcion || '',
                price: Number(producto.precioVenta) || 0,
                imageUrl: producto.imagenWeb || (producto.imagenes && producto.imagenes[0]) || undefined
            };
        }

        // 2. Buscar en Activos Fijos (Inventario Físico / Serializado)
        const activo = await prisma.activoFijo.findFirst({
            where: {
                organizationId,
                OR: [
                    { idQr: { equals: codigoTrim, mode: 'insensitive' } },
                    { serie: { equals: codigoTrim, mode: 'insensitive' } }
                ],
                estatusContable: 'VIGENTE'
            },
            include: { producto: true }
        });

        if (activo) {
            return {
                id: activo.id,
                type: 'activo',
                name: activo.descripcionCorta,
                description: activo.descripcionDetallada || `Serie: ${activo.serie || 'N/A'} - Modelo: ${activo.modelo || 'N/A'}`,
                price: activo.producto && activo.producto.precioVenta ? Number(activo.producto.precioVenta) : (Number(activo.costoAdq) || 0),
                fechaVencimiento: activo.fechaVencimiento ? activo.fechaVencimiento.toISOString() : undefined,
                imageUrl: activo.imagenUrl || undefined,
                serie: activo.serie || null
            };
        }

        // 3. Buscar en Ordenes de Trabajo / Tareas Kanban
        const otMatch = await prisma.ordenTrabajo.findFirst({
            where: {
                organizationId,
                OR: [
                    { codigoSeguridad: { equals: codigoTrim, mode: 'insensitive' } },
                    {
                        kanbanTasks: {
                            some: {
                                codigo: { equals: codigoTrim, mode: 'insensitive' }
                            }
                        }
                    }
                ]
            },
            include: {
                kanbanTasks: true
            }
        });

        if (otMatch) {
            const taskCode = otMatch.kanbanTasks?.[0]?.codigo || otMatch.codigoSeguridad;
            return {
                id: otMatch.id,
                type: 'activo',
                name: `Servicio de Mantenimiento - ${otMatch.equipoDano}`,
                description: `Marca/Modelo: ${otMatch.marcaModelo || 'N/A'}\nSerie: ${otMatch.serie || 'N/A'}`,
                price: otMatch.costoReparacion ? Number(otMatch.costoReparacion) : (Number(otMatch.costoRevision) || 0),
                imageUrl: otMatch.fotosTecnico?.[0] || otMatch.fotosEstadoInicial?.[0] || undefined,
                serie: otMatch.serie || null,
                marcaModelo: otMatch.marcaModelo || null,
                sku: taskCode
            };
        }

        return null;
    } catch(e) {
        console.error("Error buscando item por codigo:", e);
        return null;
    }
}

// --- BUSCAR Y OBTENER ACTIVO/PRODUCTO COMPLETO PARA EDICIÓN DIRECTA ---
export async function getActivoForEdit(params: { activoId?: string | null; productoId?: string | null; code?: string | null; serie?: string | null }) {
    try {
        const organizationId = await getOrganizationId();
        const { activoId, productoId, code, serie } = params;

        // 1. Si viene activoId explícito, buscar por ID
        if (activoId) {
            const activo = await prisma.activoFijo.findFirst({
                where: { id: activoId, organizationId },
                include: { categoria: true, createdBy: { select: { nombre: true, apellido: true, email: true } } }
            });
            if (activo) {
                return {
                    ...activo,
                    costoAdq: activo.costoAdq ? Number(activo.costoAdq) : null,
                    vidaUtilOverride: activo.vidaUtilOverride ? Number(activo.vidaUtilOverride) : null,
                    valResidual: activo.valResidual ? Number(activo.valResidual) : null,
                    baseDeprec: activo.baseDeprec ? Number(activo.baseDeprec) : null,
                };
            }
        }

        // 2. Buscar por serie, idQr o codigoBarras si hay serie o código
        const searchTerms: any[] = [];
        if (serie && serie.trim()) {
            searchTerms.push({ serie: { equals: serie.trim(), mode: 'insensitive' } });
        }
        if (code && code.trim()) {
            searchTerms.push({ idQr: { equals: code.trim(), mode: 'insensitive' } });
            searchTerms.push({ codigoBarras: { equals: code.trim(), mode: 'insensitive' } });
        }
        if (productoId) {
            searchTerms.push({ productoId });
        }

        if (searchTerms.length > 0) {
            const activo = await prisma.activoFijo.findFirst({
                where: {
                    organizationId,
                    OR: searchTerms
                },
                include: { categoria: true, createdBy: { select: { nombre: true, apellido: true, email: true } } },
                orderBy: { createdAt: 'desc' }
            });

            if (activo) {
                return {
                    ...activo,
                    costoAdq: activo.costoAdq ? Number(activo.costoAdq) : null,
                    vidaUtilOverride: activo.vidaUtilOverride ? Number(activo.vidaUtilOverride) : null,
                    valResidual: activo.valResidual ? Number(activo.valResidual) : null,
                    baseDeprec: activo.baseDeprec ? Number(activo.baseDeprec) : null,
                };
            }
        }

        // 3. Buscar si existe en Productos (Stock Genérico) o sintetizar plantilla
        if (productoId || code) {
            const prodConditions: any[] = [];
            if (productoId) prodConditions.push({ id: productoId });
            if (code && code.trim()) prodConditions.push({ sku: { equals: code.trim(), mode: 'insensitive' } });

            const prod = await prisma.producto.findFirst({
                where: {
                    organizationId,
                    OR: prodConditions
                }
            });

            if (prod) {
                // Verificar si tiene un activoFijo asociado
                const linkedActivo = await prisma.activoFijo.findFirst({
                    where: { organizationId, productoId: prod.id },
                    include: { categoria: true, createdBy: { select: { nombre: true, apellido: true, email: true } } },
                    orderBy: { createdAt: 'desc' }
                });

                if (linkedActivo) {
                    return {
                        ...linkedActivo,
                        costoAdq: linkedActivo.costoAdq ? Number(linkedActivo.costoAdq) : null,
                        vidaUtilOverride: linkedActivo.vidaUtilOverride ? Number(linkedActivo.vidaUtilOverride) : null,
                        valResidual: linkedActivo.valResidual ? Number(linkedActivo.valResidual) : null,
                        baseDeprec: linkedActivo.baseDeprec ? Number(linkedActivo.baseDeprec) : null,
                    };
                }

                // Si es un producto sin ActivoFijo aún registrado, devolver plantilla pre-llenada para ActivoModal
                return {
                    id: '',
                    idQr: prod.sku || code || '',
                    descripcionCorta: prod.nombre,
                    descripcionDetallada: prod.descripcion || '',
                    marca: prod.marca || '',
                    modelo: '',
                    serie: serie || null,
                    area: 'BODEGA GENERAL',
                    cuentaAct: 'Mercadería / Inventario',
                    estatusContable: 'VIGENTE',
                    integrado: false,
                    costoAdq: prod.precioVenta ? Number(prod.precioVenta) : 0,
                    codigoBarras: prod.sku || code || '',
                    codigoGrupo: '001',
                    imagenUrl: prod.imagenWeb || (prod.imagenes && prod.imagenes[0]) || null,
                    stock: prod.stockActual || 1,
                    esConsumible: false,
                    garantia: '',
                    mantenimientosIncluidos: null,
                    frecuenciaMantenimientoMeses: null,
                };
            }
        }

        return null;
    } catch (e) {
        console.error("Error al obtener activo/producto para edición:", e);
        return null;
    }
}

// --- HISTORIAL DE DOCUMENTOS ---
export async function getHistorialDocumentos(soloPropiosUserId?: string) {
    try {
        const organizationId = await getOrganizationId();
        
        const whereClause: any = { organizationId };
        if (soloPropiosUserId) {
            whereClause.creadoPorId = soloPropiosUserId;
        }

        const docs = await prisma.factura.findMany({
            where: whereClause,
            select: {
                id: true,
                correlativo: true,
                tipoDocumento: true,
                estado: true,
                fechaEmision: true,
                validezDias: true,
                total: true,
                cliente: {
                    select: {
                        nombre: true,
                        rtn: true
                    }
                },
                detalles: {
                    select: {
                        descripcion: true,
                        cantidad: true,
                        precioUnitario: true,
                        totalLinea: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 200 // Limit for reasonable UI perf
        });
        
        return docs.map(doc => ({
            id: doc.id,
            correlativo: doc.correlativo,
            tipoDocumento: doc.tipoDocumento,
            estado: doc.estado,
            fechaEmision: doc.fechaEmision.toISOString(),
            validezDias: doc.validezDias,
            clienteNombre: doc.cliente?.nombre || 'Desconocido',
            clienteRtn: doc.cliente?.rtn || '',
            total: Number(doc.total),
            detalles: doc.detalles.map(d => ({
               descripcion: d.descripcion,
               cantidad: d.cantidad,
               precioUnitario: Number(d.precioUnitario),
               totalLinea: Number(d.totalLinea)
            }))
        }));
    } catch (e) {
        console.error("Error obteniendo historial:", e);
        return [];
    }
}

// --- OBTENER DOCUMENTO ESPECIFICO ---
export async function getDocumentoById(id: string) {
    try {
        const organizationId = await getOrganizationId();
        const doc = await prisma.factura.findFirst({
            where: { id, organizationId },
            include: {
                cliente: true,
                creadoPor: true,
                ordenTrabajo: {
                    select: {
                        tipoTrabajo: true
                    }
                },
                detalles: {
                    include: {
                        producto: true,
                        activo: true
                    }
                },
                ordenEntrega: true
            }
        });
        if (!doc) return null;

        // Recover missing image URLs and metadata for existing lines
        const detailsWithRecoveredData = await Promise.all(doc.detalles.map(async (d: any) => {
            const rawDesc = d.descripcion || '';
            let metadata: any = {};
            let descToParse = rawDesc;
            
            const metaIdx = rawDesc.indexOf('__METADATA__');
            if (metaIdx !== -1) {
                try {
                    metadata = JSON.parse(rawDesc.substring(metaIdx + 12));
                } catch(e){}
                descToParse = rawDesc.substring(0, metaIdx);
            }
            
            if (metadata.imageUrl) {
                return d; // Already has recovered/saved image URL
            }
            
            // Parse brand/model and serial from the text description
            let brandModel: string | null = null;
            let parsedSerie: string | null = null;
            let shortDesc = descToParse;
            
            if (descToParse.includes('\n')) {
                const parts = descToParse.split('\n');
                shortDesc = parts[0];
                const remaining = parts.slice(1);
                const brandLine = remaining.find((l: string) => l.startsWith('Marca/Modelo:'));
                const serieLine = remaining.find((l: string) => l.startsWith('Serie:'));
                if (brandLine) brandModel = brandLine.substring(13).trim();
                if (serieLine) parsedSerie = serieLine.substring(6).trim();
            }
            
            let recoveredImageUrl: string | null = null;
            let recoveredSerie: string | null = null;
            let recoveredBrandModel: string | null = null;
            
            if (parsedSerie) {
                // Try matching by serial in work orders
                const ot = await prisma.ordenTrabajo.findFirst({
                    where: { 
                        organizationId,
                        serie: parsedSerie 
                    },
                    include: { activo: true }
                });
                if (ot) {
                    recoveredImageUrl = ot.fotosTecnico?.[0] || ot.fotosEstadoInicial?.[0] || ot.activo?.imagenUrl || null;
                    recoveredSerie = ot.serie || null;
                    recoveredBrandModel = ot.marcaModelo || null;
                }
                
                // Try matching by serial in assets
                if (!recoveredImageUrl) {
                    const activo = await prisma.activoFijo.findFirst({
                        where: {
                            organizationId,
                            serie: parsedSerie
                        }
                    });
                    if (activo) {
                        recoveredImageUrl = activo.imagenUrl || null;
                        recoveredSerie = activo.serie || null;
                        recoveredBrandModel = (activo.marca && activo.modelo) ? `${activo.marca} ${activo.modelo}` : activo.marca || activo.modelo || null;
                    }
                }
            }
            
            if (!recoveredImageUrl) {
                // Try matching by equipoDano
                let cleanEquipoDano = shortDesc;
                if (shortDesc.startsWith('Servicio de Mantenimiento - ')) {
                    cleanEquipoDano = shortDesc.substring(28).trim();
                }
                
                if (cleanEquipoDano && cleanEquipoDano !== 'Servicio de Mantenimiento -') {
                    const ot = await prisma.ordenTrabajo.findFirst({
                        where: {
                            organizationId,
                            equipoDano: cleanEquipoDano
                        },
                        include: { activo: true }
                    });
                    if (ot) {
                        recoveredImageUrl = ot.fotosTecnico?.[0] || ot.fotosEstadoInicial?.[0] || ot.activo?.imagenUrl || null;
                        recoveredSerie = ot.serie || null;
                        recoveredBrandModel = ot.marcaModelo || null;
                    }
                }
            }
            
            if (recoveredImageUrl || recoveredSerie || recoveredBrandModel) {
                const updatedMetadata = { ...metadata };
                if (recoveredImageUrl) updatedMetadata.imageUrl = recoveredImageUrl;
                if (recoveredSerie) updatedMetadata.serie = recoveredSerie;
                if (recoveredBrandModel) updatedMetadata.marcaModelo = recoveredBrandModel;
                
                const cleanDesc = rawDesc.replace(/__METADATA__.*$/, '');
                d.descripcion = `${cleanDesc}__METADATA__${JSON.stringify(updatedMetadata)}`;
            }
            
            return d;
        }));
        
        doc.detalles = detailsWithRecoveredData;

        const safeDoc = JSON.parse(JSON.stringify(doc));
        return safeDoc;
    } catch (e) {
        console.error("Error obteniendo documento:", e);
        return null;
    }
}

// --- ACTUALIZAR ESTADO DE DESCRIPCION TECNICA ---
export async function toggleMostrarDescripcion(id: string, mostrar: boolean) {
    try {
        await prisma.detalleFactura.update({
            where: { id },
            data: { mostrarDescripcion: mostrar }
        });
        return { success: true };
    } catch (e) {
        // Ignorar errores (por ejemplo si el id es un draft y aún no existe en DB)
        return { success: false };
    }
}

// --- ANULAR DOCUMENTO (Soft Delete + Restore Inventory) ---
export async function anularDocumento(id: string) {
    try {
        const organizationId = await getOrganizationId();
        
        const sb = await createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("No autenticado");
        const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
        if (!dbUser) throw new Error("Usuario no encontrado");

        const doc = await prisma.factura.findFirst({
            where: { id, organizationId },
            include: { detalles: true }
        });

        if (!doc) throw new Error("Documento no encontrado o no tiene permisos.");
        if (doc.estado === 'ANULADA') throw new Error("El documento ya se encuentra anulado.");

        await prisma.$transaction(async (tx) => {
            // 1. Marcar la factura como ANULADA y registrar rastreo
            await tx.factura.update({
                where: { id },
                data: {
                    estado: 'ANULADA',
                    anuladaAt: new Date(),
                    anuladaPorId: dbUser.id
                }
            });

            // 2. Si el documento había descontado inventario (Facturas o Proformas), devolverlo. Si era Nota de Crédito, volver a descontar.
            if (doc.tipoDocumento === 'NOTA_CREDITO') {
                for (const item of doc.detalles) {
                    if (item.productoId) {
                        try {
                           await tx.producto.update({
                               where: { id: item.productoId },
                               data: { stockActual: { decrement: item.cantidad } }
                           });
                        } catch(e) {}
                    }
                    if (item.activoId) {
                        try {
                           const activo = await tx.activoFijo.findUnique({ where: { id: item.activoId }});
                           if (activo) {
                               const nuevoStock = activo.stock - item.cantidad;
                               await tx.activoFijo.update({
                                   where: { id: item.activoId },
                                   data: { 
                                       stock: Math.max(0, nuevoStock),
                                       estatusContable: nuevoStock <= 0 ? 'VENDIDO' : activo.estatusContable
                                   }
                               });
                           }
                        } catch(e) {}
                    }
                }
            } else if (doc.inventarioDescontado || (doc.estado === 'EMITIDA' && (doc.tipoDocumento === 'FACTURA' || doc.tipoDocumento === 'PROFORMA'))) {
                for (const item of doc.detalles) {
                    if (item.productoId) {
                        try {
                           await tx.producto.update({
                               where: { id: item.productoId },
                               data: { stockActual: { increment: item.cantidad } }
                           });
                        } catch(e) {}
                    }
                    if (item.activoId) {
                        try {
                           const activo = await tx.activoFijo.findUnique({ where: { id: item.activoId }});
                           if (activo) {
                               await tx.activoFijo.update({
                                   where: { id: item.activoId },
                                   data: { 
                                       stock: activo.stock + item.cantidad,
                                       estatusContable: 'VIGENTE' 
                                   }
                               });
                           }
                        } catch(e) {}
                    }
                }
            }
        });

        // Log activity
        await logActivity({
            userId: dbUser.id,
            organizationId,
            action: 'DELETE',
            module: '/facturas',
            description: `Anuló documento ${doc.tipoDocumento}: ${doc.correlativo}`,
            metadata: {
                facturaId: doc.id,
                correlativo: doc.correlativo,
                tipoDocumento: doc.tipoDocumento,
                total: Number(doc.total)
            }
        });

        revalidatePath('/facturas');
        return { success: true };
    } catch (e: any) {
        console.error("Error anulando documento:", e);
        return { success: false, error: e.message || "Error al anular" };
    }
}

// --- CONVERTIR DOCUMENTO (Cotización → ProForma → Factura Oficial) ---
export async function convertirDocumento(
    id: string, 
    nuevoTipo: 'PROFORMA' | 'FACTURA',
    options?: { metodoPago?: string; estado?: 'BORRADOR' | 'EMITIDA' }
) {
    try {
        const authUser = await getAuthenticatedUser();
        const { organizationId } = authUser;

        const nuevoEstado = options?.estado || 'EMITIDA';

        // Check for active caja session
        const activeCaja = await prisma.corteCajaSession.findFirst({
            where: {
                organizationId,
                estado: 'ABIERTA'
            }
        });
        const cajaSessionId = (nuevoTipo === 'FACTURA' && nuevoEstado === 'EMITIDA') ? (activeCaja?.id || null) : null;

        const doc = await prisma.factura.findFirst({
            where: { id, organizationId },
            include: { detalles: true }
        });

        if (!doc) throw new Error('Documento no encontrado.');
        if (doc.estado === 'ANULADA') throw new Error('No se puede convertir un documento anulado.');

        // Validar flujo: COTIZACION→PROFORMA o PROFORMA→FACTURA (no saltar pasos, y no FACTURA→otro)
        const flujoValido =
            (doc.tipoDocumento === 'COTIZACION' && nuevoTipo === 'PROFORMA') ||
            (doc.tipoDocumento === 'PROFORMA' && nuevoTipo === 'FACTURA') ||
            (doc.tipoDocumento === 'COTIZACION' && nuevoTipo === 'FACTURA'); // directo también permitido
        if (!flujoValido) throw new Error(`No se puede convertir ${doc.tipoDocumento} a ${nuevoTipo}.`);

        // ¿Hay que descontar inventario ahora? Solo si no se descontó antes, el nuevo tipo lo requiere, y está siendo emitida
        const debeDescontar = nuevoEstado === 'EMITIDA' && !doc.inventarioDescontado && (nuevoTipo === 'PROFORMA' || nuevoTipo === 'FACTURA');

        const nuevoId = await prisma.$transaction(async (tx) => {
            // Marcar el documento original como CONVERTIDO
            await tx.factura.update({
                where: { id },
                data: {
                    estado: 'CONVERTIDA',
                    convertidoAt: new Date(),
                }
            });

            // Crear el nuevo documento heredando información
            const nuevoDoc = await tx.factura.create({
                data: {
                    organizationId: doc.organizationId,
                    clienteId: doc.clienteId,
                    correlativo: 'TEMP',
                    tipoDocumento: nuevoTipo,
                    tipoOriginal: doc.tipoOriginal || doc.tipoDocumento, // Mantener origen histórico
                    estado: nuevoEstado,
                    subTotal: doc.subTotal,
                    descuentos: doc.descuentos,
                    totalExento: doc.totalExento,
                    totalExonerado: doc.totalExonerado,
                    totalGravado15: doc.totalGravado15,
                    isv15: doc.isv15,
                    totalGravado18: doc.totalGravado18,
                    isv18: doc.isv18,
                    total: doc.total,
                    templateSettings: doc.templateSettings || undefined,
                    creadoPorId: doc.creadoPorId,
                    nombreUsuario: doc.nombreUsuario,
                    inventarioDescontado: doc.inventarioDescontado || debeDescontar,
                    documentoOrigenId: doc.documentoOrigenId || doc.id,
                    metodoPago: options?.metodoPago || doc.metodoPago || 'Efectivo',
                    cajaSessionId,
                    ordenTrabajoId: doc.ordenTrabajoId || null,
                    notas: doc.notas,
                    terminosPago: doc.terminosPago || 'Pago inmediato',
                    detalles: {
                        create: doc.detalles.map((d) => ({
                            descripcion: d.descripcion,
                            descripcionEnriquecida: d.descripcionEnriquecida,
                            cantidad: d.cantidad,
                            precioUnitario: d.precioUnitario,
                            porcentajeIsv: d.porcentajeIsv,
                            totalDescuento: d.totalDescuento,
                            totalLinea: d.totalLinea,
                            productoId: d.productoId,
                            activoId: d.activoId,
                            mostrarDescripcion: d.mostrarDescripcion || false
                        }))
                    }
                }
            });

            // Asignar el prefijo correcto al nuevo correlativo
            const correlativoFinal = formatCorrelativo(nuevoDoc.numeroInterno, nuevoTipo);
            await tx.factura.update({
                where: { id: nuevoDoc.id },
                data: { correlativo: correlativoFinal }
            });

            // Descontar inventario si aplica
            if (debeDescontar) {
                for (const detalle of doc.detalles) {
                    if (detalle.productoId) {
                        const prod = await tx.producto.findUnique({ where: { id: detalle.productoId } });
                        const esServicio = prod?.esServicio === true || prod?.stockActual === 9999;
                        if (!esServicio) {
                            await tx.producto.update({
                                where: { id: detalle.productoId },
                                data: { stockActual: { decrement: detalle.cantidad } }
                            });
                        }
                    }
                    if (detalle.activoId) {
                        const activo = await tx.activoFijo.findUnique({ where: { id: detalle.activoId }});
                        if (activo) {
                            const nuevoStock = activo.stock - detalle.cantidad;
                            await tx.activoFijo.update({
                                where: { id: detalle.activoId },
                                data: { 
                                    stock: Math.max(0, nuevoStock),
                                    estatusContable: nuevoStock <= 0 ? 'VENDIDO/ENTREGADO' : activo.estatusContable
                                }
                            });
                        }
                    }
                }
            }
            return nuevoDoc.id;
        });

        // Log activity
        await logActivity({
            userId: authUser.id,
            organizationId,
            action: 'UPDATE',
            module: '/facturas',
            description: `Convirtió documento ${doc.tipoDocumento} a ${nuevoTipo} (Correlativo original: ${doc.correlativo})`,
            metadata: {
                previousType: doc.tipoDocumento,
                newType: nuevoTipo,
                originalId: id,
                newId: nuevoId,
                correlativo: doc.correlativo
            }
        });

        revalidatePath('/facturas');
        return { success: true, nuevoTipo, nuevoId };
    } catch (e: any) {
        console.error("Error convirtiendo documento:", e);
        return { success: false, error: e.message || "Error al convertir" };
    }
}


// --- OBTENER VISTA PREVIA DEL PRÓXIMO CORRELATIVO (SIN CREAR BORRADOR EN DB) ---
export async function getProximoCorrelativoPreview(tipoDocumento: string) {
    try {
        const organizationId = await getOrganizationId();
        const tipoNormalized = (tipoDocumento || 'FACTURA').toUpperCase();

        const ultimaFactura = await prisma.factura.findFirst({
            where: { organizationId },
            orderBy: { numeroInterno: 'desc' }
        });

        const nextNumber = ultimaFactura ? ultimaFactura.numeroInterno + 1 : 1;
        const correlativoPreview = formatCorrelativo(nextNumber, tipoNormalized);

        return { success: true, correlativo: correlativoPreview, nextNumber };
    } catch (error: any) {
        console.error("Error al obtener vista previa de correlativo:", error);
        return { success: false, correlativo: 'FAC-SO00000001', error: error.message };
    }
}

// Deprecada por motivos de cumplimiento fiscal SAR (retorna vista previa sin modificar DB)
export async function reservarCorrelativoVacio(tipoDocumento: string) {
    return await getProximoCorrelativoPreview(tipoDocumento);
}

// --- LIMPIEZA DE BORRADORES TEMPORALES EN CERO (CUMPLIMIENTO SAR) ---
export async function limpiarBorradoresTemporalesHuecos() {
    try {
        const authUser = await getAuthenticatedUser();
        const { organizationId } = authUser;

        // Eliminar facturas en borrador que tengan total 0 y pertenezcan a "Borrador Temporal"
        const result = await prisma.factura.deleteMany({
            where: {
                organizationId,
                estado: 'BORRADOR',
                total: 0,
                cliente: {
                    nombre: { contains: 'Borrador Temporal', mode: 'insensitive' }
                }
            }
        });

        revalidatePath('/facturas');
        return { success: true, count: result.count };
    } catch (error: any) {
        console.error("Error al limpiar borradores temporales:", error);
        return { success: false, error: error.message };
    }
}

// --- GESTIÓN DE PLANTILLAS PERSONALIZADAS ---
export async function guardarInvoiceTemplate(name: string, settings: any) {
    try {
        const organizationId = await getOrganizationId();
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org) throw new Error("Organización no encontrada");

        const currentTemplates: any[] = Array.isArray(org.invoiceTemplates) ? org.invoiceTemplates : [];
        
        const existingIndex = currentTemplates.findIndex(t => t.name.trim().toLowerCase() === name.trim().toLowerCase());
        
        let updatedTemplates;
        if (existingIndex >= 0) {
            updatedTemplates = [...currentTemplates];
            updatedTemplates[existingIndex] = { ...updatedTemplates[existingIndex], settings };
        } else {
            const newTemplate = { id: Math.random().toString(36).slice(2, 9), name: name.trim(), settings };
            updatedTemplates = [...currentTemplates, newTemplate];
        }

        await prisma.organization.update({
            where: { id: organizationId },
            data: { invoiceTemplates: updatedTemplates }
        });
        return { success: true, templates: updatedTemplates };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function eliminarInvoiceTemplate(templateId: string) {
    try {
        const organizationId = await getOrganizationId();
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org) throw new Error("Organización no encontrada");

        const currentTemplates: any[] = Array.isArray(org.invoiceTemplates) ? org.invoiceTemplates : [];
        const updatedTemplates = currentTemplates.filter(t => t.id !== templateId);

        await prisma.organization.update({
            where: { id: organizationId },
            data: { invoiceTemplates: updatedTemplates }
        });
        return { success: true, templates: updatedTemplates };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getInvoiceTemplates() {
    try {
        const organizationId = await getOrganizationId();
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        return Array.isArray(org?.invoiceTemplates) ? org.invoiceTemplates : [];
    } catch (e) {
        return [];
    }
}

export async function updateDocumentTemplateSettings(facturaId: string, settings: any) {
    try {
        const user = await getAuthenticatedUser();
        const organizationId = user.organizationId;

        const docExistente = await prisma.factura.findFirst({
            where: { id: facturaId, organizationId }
        });
        if (!docExistente) throw new Error('Documento no encontrado o sin permisos.');

        const updated = await prisma.factura.update({
            where: { id: facturaId },
            data: {
                templateSettings: settings ? JSON.parse(JSON.stringify(settings)) : null
            }
        });

        return { success: true, settings: updated.templateSettings };
    } catch (error: any) {
        console.error("Error al actualizar templateSettings:", error);
        return { success: false, error: error.message || "Error al guardar" };
    }
}

export async function updateOrganizationDefaultSettings(settings: any) {
    try {
        const user = await getAuthenticatedUser();
        const organizationId = user.organizationId;

        const orgSettings = settings ? JSON.parse(JSON.stringify(settings)) : null;
        if (orgSettings) {
            delete orgSettings.roundAdjustment;
        }

        await prisma.organization.update({
            where: { id: organizationId },
            data: {
                invoiceSettings: orgSettings
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error al actualizar default settings de organizacion:", error);
        return { success: false, error: error.message || "Error al guardar" };
    }
}

// Action for fast creation of service in catalog
export async function crearServicioRapido(prefix: string) {
    try {
        const { generateNextServiceCode } = await import('../inventario/actions');
        const authUser = await getAuthenticatedUser();
        const { organizationId, id: userId } = authUser;

        const nextCode = await generateNextServiceCode(prefix);

        // Map prefix to standard names
        let name = "Servicio";
        let description = "";
        let imageUrl = "/services/reparacion.jpg";
        if (prefix === 'INS') {
            name = "Servicio de Instalación";
            description = "Servicios de montaje, configuración inicial y puesta en marcha de equipos.";
            imageUrl = "/services/instalacion.svg";
        } else if (prefix === 'REP') {
            name = "Servicio de Reparación";
            description = "Reparación de fallas mecánicas, eléctricas o electrónicas en equipos.";
            imageUrl = "/services/reparacion.jpg";
        } else if (prefix === 'DIAG') {
            name = "Servicio de Diagnóstico y Revisión";
            description = "Inspección técnica, diagnóstico de fallas y revisión de estado.";
            imageUrl = "/services/soporte.svg";
        } else if (prefix === 'MPV') {
            name = "Mantenimiento Preventivo y Certificación";
            description = "Rutina de mantenimiento preventivo y emisión de certificados de calibración/buen estado.";
            imageUrl = "/services/mantenimiento.svg";
        } else if (prefix === 'MCO') {
            name = "Mantenimiento Correctivo y Certificación";
            description = "Mantenimiento correctivo planificado con certificación técnica posterior.";
            imageUrl = "/services/garantia.svg";
        } else if (prefix === 'MO') {
            name = "Mano de Obra / Horas de Técnico";
            description = "Cobro de horas de mano de obra técnica laboradas.";
            imageUrl = "/services/mano_obra.svg";
        }

        // Crear en ActivoFijo (el catálogo físico de servicios)
        const newService = await prisma.activoFijo.create({
            data: {
                organizationId,
                idQr: nextCode,
                codigoBarras: nextCode,
                descripcionCorta: name,
                descripcionDetallada: description,
                area: 'SERVICIOS',
                cuentaAct: 'INVENTARIO',
                estatusContable: 'VIGENTE',
                stock: 9999,
                imagenUrl: imageUrl,
                createdById: userId,
                updatedById: userId
            }
        });

        revalidatePath('/inventario');

        return {
            success: true,
            service: {
                id: newService.id,
                code: newService.idQr,
                name: newService.descripcionCorta,
                description: newService.descripcionDetallada || "",
                price: 0,
                category: 'SERVICIOS',
                stock: 9999,
                brand: 'BEA',
                type: 'activo' as const,
                imageUrl: newService.imagenUrl || undefined
            }
        };
    } catch (e: any) {
        console.error("Error creating fast service:", e);
        return { success: false, error: e.message || "Error al crear el servicio" };
    }
}

// --- BUSCAR ÓRDENES DE TRABAJO PARA FACTURACIÓN/COTIZACIÓN ---
export async function searchOrdenesTrabajoParaFacturar(query: string = "") {
    try {
        const organizationId = await getOrganizationId();
        
        const matches = await prisma.ordenTrabajo.findMany({
            where: {
                organizationId,
                OR: [
                    { codigoSeguridad: { contains: query, mode: 'insensitive' } },
                    { equipoDano: { contains: query, mode: 'insensitive' } },
                    { marcaModelo: { contains: query, mode: 'insensitive' } },
                    { serie: { contains: query, mode: 'insensitive' } },
                    { cliente: { nombre: { contains: query, mode: 'insensitive' } } },
                    {
                        kanbanTasks: {
                            some: {
                                OR: [
                                    { codigo: { contains: query, mode: 'insensitive' } },
                                    { title: { contains: query, mode: 'insensitive' } }
                                ]
                            }
                        }
                    }
                ]
            },
            include: {
                cliente: true,
                activo: true,
                kanbanTasks: {
                    select: {
                        codigo: true
                    }
                },
                repuestos: {
                    include: {
                        producto: true,
                        activoFijo: true
                    }
                }
            },
            take: 30,
            orderBy: { fechaRecibido: 'desc' }
        });
        
        return matches.map(ot => ({
            id: ot.id,
            codigoSeguridad: ot.codigoSeguridad,
            equipoDano: ot.equipoDano,
            marcaModelo: ot.marcaModelo || '',
            serie: ot.serie || '',
            tipoTrabajo: ot.tipoTrabajo,
            estado: ot.estado,
            costoReparacion: ot.costoReparacion ? Number(ot.costoReparacion) : 0,
            costoRevision: ot.costoRevision ? Number(ot.costoRevision) : 0,
            fotosEstadoInicial: ot.fotosEstadoInicial || [],
            fotosTecnico: ot.fotosTecnico || [],
            diagnosticoTecnico: ot.diagnosticoTecnico || '',
            detalleManoObra: ot.detalleManoObra || [],
            metodoPagoRevision: ot.metodoPagoRevision || null,
            activoId: ot.activoId || null,
            cliente: ot.cliente ? {
                id: ot.cliente.id,
                name: ot.cliente.nombre,
                rtn: ot.cliente.rtn || '',
                phone: ot.cliente.telefono || '',
                address: ot.cliente.direccion || '',
                email: ot.cliente.email || '',
                category: 'Estándar',
                city: ot.cliente.direccion || 'Honduras',
                nombreContacto: ot.cliente.nombreContacto || '',
                telefonoContacto: ot.cliente.telefonoContacto || ''
            } : null,
            repuestos: ot.repuestos.map(r => ({
                id: r.id,
                productoId: r.productoId,
                activoId: r.activoFijoId,
                cantidad: r.cantidad,
                precioSugerido: r.precioSugerido ? Number(r.precioSugerido) : 0,
                precioAprobado: r.precioAprobado ? Number(r.precioAprobado) : null,
                nombre: r.producto?.nombre || r.activoFijo?.descripcionCorta || 'Repuesto',
                sku: r.producto?.sku || r.activoFijo?.idQr || '',
                serie: r.activoFijo?.serie || null,
                imageUrl: r.producto?.imagenWeb || r.activoFijo?.imagenUrl || null
            })),
            kanbanCodigo: ot.kanbanTasks?.[0]?.codigo || null
        }));
    } catch (e) {
        console.error("Error en searchOrdenesTrabajoParaFacturar:", e);
        return [];
    }
}

// --- OBTENER FOTOS DE UNA ORDEN DE TRABAJO ---
export async function getOrdenTrabajoImages(id: string) {
    try {
        const organizationId = await getOrganizationId();
        const ot = await prisma.ordenTrabajo.findFirst({
            where: { id, organizationId },
            select: {
                fotosEstadoInicial: true,
                fotosTecnico: true,
                activo: {
                    select: {
                        imagenUrl: true
                    }
                }
            }
        });
        if (!ot) return [];
        return [
            ...(ot.fotosTecnico || []),
            ...(ot.fotosEstadoInicial || []),
            ot.activo?.imagenUrl
        ].filter((img): img is string => typeof img === 'string' && img.length > 0);
    } catch (e) {
        console.error("Error en getOrdenTrabajoImages:", e);
        return [];
    }
}

