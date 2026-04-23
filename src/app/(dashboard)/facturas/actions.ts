'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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
                   'FAC-SO';
    return `${prefix}${String(numeroInterno).padStart(8, '0')}`;
}

// --- CLIENTES ---
export async function searchClientes(query: string = "") {
    try {
        const organizationId = await getOrganizationId();
        return await prisma.cliente.findMany({
            where: { 
                organizationId,
                nombre: { contains: query, mode: 'insensitive' }
            },
            take: 1000,
            orderBy: { nombre: 'asc' }
        });
    } catch (e) {
        console.error(e);
        return [];
    }
}

// --- PRODUCTOS Y ACTIVOS FIJOS (Catálogo Médico General) ---
export async function searchProductos(query: string = "") {
    try {
        const organizationId = await getOrganizationId();
        
        const [productos, activos] = await Promise.all([
            prisma.producto.findMany({
                where: { 
                    organizationId,
                    estado: 'ACTIVO',
                    activosFijos: { none: {} },
                    OR: [
                        { nombre: { contains: query, mode: 'insensitive' } },
                        { sku: { contains: query, mode: 'insensitive' } }
                    ]
                },
                take: 1000
            }),
            prisma.activoFijo.findMany({
                where: {
                    organizationId,
                    estatusContable: 'VIGENTE',
                    OR: [
                        { descripcionCorta: { contains: query, mode: 'insensitive' } },
                        { idQr: { contains: query, mode: 'insensitive' } },
                        { marca: { contains: query, mode: 'insensitive' } }
                    ]
                },
                include: { producto: true },
                take: 1000
            })
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
            type: 'producto',
            imageUrl: undefined
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
            type: 'activo',
            fechaVencimiento: a.fechaVencimiento ? a.fechaVencimiento.toISOString() : undefined,
            imageUrl: a.imagenUrl || undefined
        }));

        return [...unifiedProductos, ...unifiedActivos];
    } catch (e) {
        console.error("Error en searchProductos:", e);
        return [];
    }
}

// --- CREAR FACTURA ---
export async function crearFacturaSegura(facturaData: any, detalles: any[], tipoCorrelativo: string = "FACTURA") {
    try {
        const organizationId = await getOrganizationId();

        // Si el cliente no existe, lo creamos rápido
        let clienteId = facturaData.clienteId;
        if (!clienteId && facturaData.clienteNombre) {
            const nuevoCliente = await prisma.cliente.create({
                data: {
                    organizationId,
                    nombre: facturaData.clienteNombre,
                    rtn: facturaData.rtn,
                    telefono: facturaData.telefono,
                    direccion: facturaData.direccion
                }
            });
            clienteId = nuevoCliente.id;
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
                    
                    detalles: {
                        create: detalles.map((d) => ({
                            descripcion: d.descripcion,
                            cantidad: d.cantidad,
                            precioUnitario: d.precioUnitario,
                            porcentajeIsv: d.porcentajeIsv || 15,
                            totalLinea: d.totalLinea,
                            productoId: d.productoId || null,
                            activoId: d.activoId || null
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
                    // Es un equipo único (Ej. Aire Acondicionado Serial XYZ): Cambiar Estatus
                    await tx.activoFijo.update({
                        where: { id: detalle.activoId },
                        data: { estatusContable: 'VENDIDO/ENTREGADO' }
                    });
                }
            }

            return nuevaFactura;
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
        const organizationId = await getOrganizationId();

        // Verificar que el documento existe y pertenece a la organización
        const docExistente = await prisma.factura.findFirst({
            where: { id, organizationId }
        });
        if (!docExistente) throw new Error('Documento no encontrado o sin permisos.');
        if (docExistente.estado === 'ANULADA') throw new Error('No se puede modificar un documento anulado.');

        let clienteId = data.clienteId;
        if (!clienteId && data.clienteNombre) {
            const nuevoCliente = await prisma.cliente.create({
                data: {
                    organizationId,
                    nombre: data.clienteNombre,
                    rtn: data.rtn || null,
                    telefono: data.telefono || null,
                    email: data.email || null,
                    direccion: data.direccion || null
                }
            });
            clienteId = nuevoCliente.id;
        }

        if (!clienteId) throw new Error('Se requiere un cliente válido.');

        const result = await prisma.$transaction(async (tx) => {
            // Eliminar los detalles anteriores
            await tx.detalleFactura.deleteMany({ where: { facturaId: id } });

            // Actualizar la factura principal
            const docActualizado = await tx.factura.update({
                where: { id },
                data: {
                    clienteId,
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
                    estado: 'EMITIDA', // Change state to EMITIDA officially
                    tipoDocumento: data.tipoDocumento || docExistente.tipoDocumento,
                    templateSettings: data.templateSettings ? JSON.parse(JSON.stringify(data.templateSettings)) : undefined,
                    detalles: {
                        create: lineItems.map((item) => {
                            const basePrice = item.qty * item.unitPrice;
                            const discountAmt = basePrice * ((item.discount || 0) / 100);
                            const lineTotal = basePrice - discountAmt;
                            let finalDesc = item.shortDesc + (item.longDesc ? `\n${item.longDesc}` : '');
                            if (item.isSection) finalDesc = `__SECTION__${finalDesc}`;
                            return {
                                descripcion: finalDesc,
                                descripcionEnriquecida: item.richDesc || null,
                                cantidad: Number(item.qty) || 0,
                                precioUnitario: item.unitPrice,
                                porcentajeIsv: item.tax === 'isv15' ? 15 : 0,
                                totalDescuento: discountAmt,
                                totalLinea: lineTotal,
                                productoId: item.productoId || null,
                                activoId: item.activoId || null
                            };
                        })
                    }
                }
            });

            // Descontar inventario (sólo si no lo estaba ya)
            const debeDescontarInventario = (data.tipoDocumento === 'FACTURA' || data.tipoDocumento === 'PROFORMA');
            if (docExistente.estado === 'BORRADOR' && debeDescontarInventario) {
                for (const item of lineItems) {
                    if (item.productoId) {
                        const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
                        const esServicio = prod?.esServicio === true || prod?.stockActual === 9999;
                        if (!esServicio) {
                            await tx.producto.update({
                                where: { id: item.productoId },
                                data: { stockActual: { decrement: Number(item.qty) } }
                            });
                        }
                    }
                    if (item.activoId) {
                        await tx.activoFijo.update({
                            where: { id: item.activoId },
                            data: { estatusContable: 'VENDIDO/ENTREGADO' }
                        });
                    }
                }
                // Mark inventory deducted
                await tx.factura.update({
                    where: { id },
                    data: { inventarioDescontado: true }
                });
            }

            if (data.templateSettings) {
                await tx.organization.update({
                    where: { id: organizationId },
                    data: { invoiceSettings: data.templateSettings ? JSON.parse(JSON.stringify(data.templateSettings)) : null }
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

        let clienteId = data.clienteId;
        if (!clienteId && data.clienteNombre) {
            const nuevoCliente = await prisma.cliente.create({
                data: {
                    organizationId,
                    nombre: data.clienteNombre,
                    rtn: data.rtn || null,
                    telefono: data.telefono || null,
                    email: data.email || null,
                    direccion: data.direccion || null
                }
            });
            clienteId = nuevoCliente.id;
        }

        if (!clienteId) throw new Error("Se requiere un cliente válido.");

        // Descuenta inventario: FACTURA y PROFORMA sí, COTIZACION no
        const debeDescontarInventario = data.tipoDocumento === 'FACTURA' || data.tipoDocumento === 'PROFORMA';

        const result = await prisma.$transaction(async (tx) => {
            // Crear el documento — el correlativo se genera DESPUÉS del create (usa numeroInterno auto)
            const nuevoDoc = await tx.factura.create({
                data: {
                    organizationId,
                    clienteId,
                    correlativo: 'TEMP', // Temporal — se actualiza abajo con el numeroInterno real
                    tipoDocumento: data.tipoDocumento,
                    estado: 'EMITIDA',
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
                    detalles: {
                        create: lineItems.map((item) => {
                            const basePrice = Number(item.qty) * Number(item.unitPrice);
                            const discountAmt = item.discountType === 'amount'
                                ? Number(item.discount) || 0
                                : basePrice * ((Number(item.discount) || 0) / 100);
                            const lineTotal = basePrice - discountAmt;
                            let finalDesc = item.shortDesc + (item.longDesc ? `\n${item.longDesc}` : '');
                            if (item.isSection) finalDesc = `__SECTION__${finalDesc}`;
                            return {
                                descripcion: finalDesc,
                                descripcionEnriquecida: item.richDesc || null,
                                cantidad: Number(item.qty) || 0,
                                precioUnitario: Number(item.unitPrice),
                                porcentajeIsv: item.tax === 'isv15' ? 15 : item.tax === 'isv18' ? 18 : 0,
                                totalDescuento: discountAmt,
                                totalLinea: lineTotal,
                                productoId: item.productoId || null,
                                activoId: item.activoId || null
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

            // Descontar inventario (FACTURA y PROFORMA, no servicios)
            if (debeDescontarInventario) {
                for (const item of lineItems) {
                    if (item.productoId) {
                        // Verificar si es servicio (esServicio=true o stockActual=9999)
                        const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
                        const esServicio = prod?.esServicio === true || prod?.stockActual === 9999;
                        if (!esServicio) {
                            await tx.producto.update({
                                where: { id: item.productoId },
                                data: { stockActual: { decrement: Number(item.qty) } }
                            });
                        }
                    }
                    if (item.activoId) {
                        await tx.activoFijo.update({
                            where: { id: item.activoId },
                            data: { estatusContable: 'VENDIDO/ENTREGADO' }
                        });
                    }
                }
            }

            if (data.templateSettings) {
                await tx.organization.update({
                    where: { id: organizationId },
                    data: { invoiceSettings: JSON.parse(JSON.stringify(data.templateSettings)) }
                });
            }

            return docFinal;
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
                imageUrl: undefined
            };
        }

        // 2. Buscar en Activos Fijos (Inventario Físico / Serializado)
        const activo = await prisma.activoFijo.findFirst({
            where: {
                organizationId,
                idQr: { equals: codigoTrim, mode: 'insensitive' },
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
                imageUrl: activo.imagenUrl || undefined
            };
        }

        return null;
    } catch(e) {
        console.error("Error buscando item por codigo:", e);
        return null;
    }
}

// --- HISTORIAL DE DOCUMENTOS ---
export async function getHistorialDocumentos() {
    try {
        const organizationId = await getOrganizationId();
        const docs = await prisma.factura.findMany({
            where: { organizationId },
            include: { 
                cliente: { select: { nombre: true, rtn: true } },
                detalles: true 
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
                detalles: {
                    include: {
                        producto: true,
                        activo: true
                    }
                }
            }
        });
        if (!doc) return null;

        // Serialize details for the UI. Wait, let's just return what is needed. Note that BigInt or Decimals might be an issue, so we convert them.
        const safeDoc = JSON.parse(JSON.stringify(doc));
        return safeDoc;
    } catch (e) {
        console.error("Error obteniendo documento:", e);
        return null;
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

            // 2. Si el documento había descontado inventario (Facturas o Proformas), devolverlo
            if (doc.inventarioDescontado) {
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
                           await tx.activoFijo.update({
                               where: { id: item.activoId },
                               data: { estatusContable: 'VIGENTE' }
                           });
                        } catch(e) {}
                    }
                }
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
export async function convertirDocumento(id: string, nuevoTipo: 'PROFORMA' | 'FACTURA') {
    try {
        const authUser = await getAuthenticatedUser();
        const { organizationId } = authUser;

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

        // ¿Hay que descontar inventario ahora? Solo si no se descontó antes y el nuevo tipo lo requiere
        const debeDescontar = !doc.inventarioDescontado && (nuevoTipo === 'PROFORMA' || nuevoTipo === 'FACTURA');

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
                    estado: 'EMITIDA',
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
                            activoId: d.activoId
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
                        await tx.activoFijo.update({
                            where: { id: detalle.activoId },
                            data: { estatusContable: 'VENDIDO/ENTREGADO' }
                        });
                    }
                }
            }
            return nuevoDoc.id;
        });

        revalidatePath('/facturas');
        return { success: true, nuevoTipo, nuevoId };
    } catch (e: any) {
        console.error("Error convirtiendo documento:", e);
        return { success: false, error: e.message || "Error al convertir" };
    }
}


// --- RESERVAR CORRELATIVO VACIO ---
export async function reservarCorrelativoVacio(tipoDocumento: string) {
    try {
        const authUser = await getAuthenticatedUser();
        const { organizationId, id: creadoPorId, fullName: nombreUsuario } = authUser;

        let dummyClient = await prisma.cliente.findFirst({
            where: { organizationId, nombre: 'Borrador Temporal' }
        });
        if (!dummyClient) {
            dummyClient = await prisma.cliente.create({
                data: {
                    organizationId,
                    nombre: 'Borrador Temporal',
                    notas: 'Cliente genérico para reservar secuencias de facturas en progreso.'
                }
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const nuevoDoc = await tx.factura.create({
                data: {
                    organizationId,
                    clienteId: dummyClient.id,
                    correlativo: 'TEMP', 
                    tipoDocumento: tipoDocumento,
                    estado: 'BORRADOR',
                    creadoPorId,
                    nombreUsuario
                }
            });

            const correlativoFinal = formatCorrelativo(nuevoDoc.numeroInterno, tipoDocumento);
            const docFinal = await tx.factura.update({
                where: { id: nuevoDoc.id },
                data: { correlativo: correlativoFinal }
            });

            return docFinal;
        });

        // revalidatePath('/facturas'); // We might not want to revalidate if they didn't finish it
        return { success: true, docId: result.id, correlativo: result.correlativo };
    } catch (error: any) {
        console.error("Error al reservar correlativo:", error);
        return { success: false, error: 'Incapaz de reservar correlativo: ' + error.message };
    }
}
