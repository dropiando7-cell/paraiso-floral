'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper for Auth
async function getOrganizationId() {
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
            take: 10,
            orderBy: { nombre: 'asc' }
        });
    } catch (e) {
        console.error(e);
        return [];
    }
}

// --- PRODUCTOS (Inventario Estilo Supermercado) ---
export async function searchProductos(query: string = "") {
    try {
        const organizationId = await getOrganizationId();
        const productos = await prisma.producto.findMany({
            where: { 
                organizationId,
                estado: 'ACTIVO',
                OR: [
                    { nombre: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 10
        });
        
        // Convertir Decimal a String para que pase del Server Component al Client Component sin errores
        return productos.map(p => ({
            ...p,
            precioVenta: p.precioVenta.toString(),
            costoBase: p.costoBase?.toString() || null
        }));
    } catch (e) {
        console.error(e);
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
