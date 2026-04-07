'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper for Auth
export async function getOrganizationId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const dbUser = await prisma.user.findUnique({ where: { email: user.email }});
    if (!dbUser) throw new Error("Usuario no encontrado");

    return dbUser.organizationId;
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
            type: 'producto'
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
            type: 'activo'
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
        // Generador visual (Ej: 000-001-01-003557)
        const correlativoGenerado = `000-001-01-${nextNumber.toString().padStart(8, '0')}`;

        // TRANSACTION: Asegura que si falla el descuento de inventario, NO se guarde la factura.
        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Guardar la Factura
            const nuevaFactura = await tx.factura.create({
                data: {
                    organizationId,
                    clienteId,
                    correlativo: correlativoGenerado,
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

// --- GUARDAR DOCUMENTO DINÁMICO (Cotización, Proforma, Borrador, Factura) ---
export async function guardarDocumentoBuilder(data: any, lineItems: any[]) {
    try {
        const organizationId = await getOrganizationId();

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

        // Generar Correlativo según el Tipo de Documento
        let correlativoFinal = data.correlativo || "";
        
        if (data.tipoDocumento === 'FACTURA') {
            // Generar correlativo oficial si no viene
            const ultimaFactura = await prisma.factura.findFirst({
                where: { organizationId, tipoDocumento: 'FACTURA', estado: { not: 'BORRADOR'} },
                orderBy: { numeroInterno: 'desc' }
            });
            const nextNumber = ultimaFactura ? ultimaFactura.numeroInterno + 1 : 1;
            correlativoFinal = `000-001-01-${nextNumber.toString().padStart(8, '0')}`;
        } else {
            // Cotización o Proforma o Borrador
            const prefix = data.tipoDocumento === 'COTIZACION' ? 'COT' : data.tipoDocumento === 'PROFORMA' ? 'PROF' : 'BOR';
            const year = new Date().getFullYear();
            // Buscar la ultima para este prefijo (basado en numero Interno igual, porque es autoincremental, el numero no choca si le ponemos el string correcto)
            const ultimoDoc = await prisma.factura.findFirst({
                where: { organizationId, tipoDocumento: data.tipoDocumento },
                orderBy: { numeroInterno: 'desc' }
            });
            const nextNumber = ultimoDoc ? ultimoDoc.numeroInterno + 1 : 1;
            correlativoFinal = `${prefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
        }

        const result = await prisma.$transaction(async (tx) => {
            const nuevoDoc = await tx.factura.create({
                data: {
                    organizationId,
                    clienteId,
                    correlativo: correlativoFinal,
                    numeroCAI: data.numeroCAI || null,
                    rangoAutorizado: data.rangoAutorizado || null,
                    tipoDocumento: data.tipoDocumento, // 'COTIZACION', 'FACTURA', 'PROFORMA', 'BORRADOR'
                    estado: data.tipoDocumento === 'FACTURA' ? 'EMITIDA' : 'EMITIDA',
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
                    
                    detalles: {
                        create: lineItems.map((item) => {
                            const basePrice = item.qty * item.unitPrice;
                            const discountAmt = basePrice * ((item.discount || 0) / 100);
                            const lineTotal = basePrice - discountAmt;
                            return {
                                descripcion: item.shortDesc + (item.longDesc ? `\n${item.longDesc}` : ''),
                                cantidad: item.qty,
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

            // Si es FACTURA oficial, entonces descontar inventario
            if (data.tipoDocumento === 'FACTURA') {
                for (const item of lineItems) {
                    if (item.productoId) {
                        await tx.producto.update({
                            where: { id: item.productoId },
                            data: { stockActual: { decrement: item.qty } }
                        });
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
                    data: { invoiceSettings: data.templateSettings ? JSON.parse(JSON.stringify(data.templateSettings)) : null }
                });
            }

            return nuevoDoc;
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
                price: Number(producto.precioVenta) || 0
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
                price: activo.producto && activo.producto.precioVenta ? Number(activo.producto.precioVenta) : (Number(activo.costoAdq) || 0)
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
            include: { cliente: { select: { nombre: true, rtn: true } } },
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
            total: Number(doc.total)
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

            // 2. Si era FACTURA oficial (y ya estaba EMITIDA), devolver al inventario
            if (doc.tipoDocumento === 'FACTURA' && doc.estado === 'EMITIDA') {
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
