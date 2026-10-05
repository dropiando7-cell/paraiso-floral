'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper to get logged in user from database
async function getDbUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('No autenticado');
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (!dbUser) throw new Error('Usuario de base de datos no encontrado');
  return dbUser;
}

// Get all orders for organization
export async function getPedidos() {
  try {
    const dbUser = await getDbUser();
    const pedidos = await prisma.pedido.findMany({
      where: { organizationId: dbUser.organizationId },
      include: {
        cliente: true,
        auxiliarAsignado: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatarUrl: true
          }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return pedidos.map(p => ({
      ...p,
      codigoPedido: p.codigoPedido,
      cliente: {
        id: p.cliente.id,
        nombre: p.cliente.nombre,
        telefono: p.cliente.telefono || '',
        direccion: p.cliente.direccion || ''
      },
      auxiliarAsignado: p.auxiliarAsignado ? {
        id: p.auxiliarAsignado.id,
        nombre: `${p.auxiliarAsignado.nombre || ''} ${p.auxiliarAsignado.apellido || ''}`.trim(),
        avatar: p.auxiliarAsignado.avatarUrl || undefined
      } : undefined,
      items: p.items.map(item => ({
        id: item.id,
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        variedadTono: item.variedadTono || undefined,
        codigoBarras: item.codigoBarras || undefined,
        cantidadSolicitada: item.cantidadSolicitada,
        cantidadPreparada: item.cantidadPreparada,
        recolectado: item.recolectado,
        sustituidoPor: item.sustituidoPorId ? {
          productoId: item.sustituidoPorId,
          nombreProducto: item.nombreSustituto || ''
        } : undefined
      }))
    }));
  } catch (error) {
    console.error('Error en getPedidos:', error);
    return [];
  }
}

// Get single order by id
export async function getPedidoById(id: string) {
  try {
    const dbUser = await getDbUser();
    const p = await prisma.pedido.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId
      },
      include: {
        cliente: true,
        auxiliarAsignado: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatarUrl: true
          }
        },
        items: true
      }
    });

    if (!p) return null;

    return {
      ...p,
      cliente: {
        id: p.cliente.id,
        nombre: p.cliente.nombre,
        telefono: p.cliente.telefono || '',
        direccion: p.cliente.direccion || '',
        notas: p.cliente.notas || ''
      },
      auxiliarAsignado: p.auxiliarAsignado ? {
        id: p.auxiliarAsignado.id,
        nombre: `${p.auxiliarAsignado.nombre || ''} ${p.auxiliarAsignado.apellido || ''}`.trim(),
        avatar: p.auxiliarAsignado.avatarUrl || undefined
      } : undefined,
      items: p.items.map(item => ({
        id: item.id,
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        variedadTono: item.variedadTono || undefined,
        codigoBarras: item.codigoBarras || undefined,
        cantidadSolicitada: item.cantidadSolicitada,
        cantidadPreparada: item.cantidadPreparada,
        recolectado: item.recolectado,
        sustituidoPor: item.sustituidoPorId ? {
          productoId: item.sustituidoPorId,
          nombreProducto: item.nombreSustituto || ''
        } : undefined
      }))
    };
  } catch (error) {
    console.error('Error en getPedidoById:', error);
    return null;
  }
}

// Get active warehouse assistants & team members grouped by role
export async function getAuxiliares() {
  try {
    const dbUser = await getDbUser();
    const users = await prisma.user.findMany({
      where: {
        organizationId: dbUser.organizationId,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        avatarUrl: true,
        role: true,
        customRoleName: true,
        puesto: true
      },
      orderBy: [
        { role: 'asc' },
        { nombre: 'asc' }
      ]
    });

    return users.map(u => {
      let roleGroup = 'Otros Miembros';
      if (u.customRoleName) {
        roleGroup = u.customRoleName.toUpperCase();
      } else if (u.role === 'AUXILIAR_BODEGA') {
        roleGroup = 'AUXILIARES DE BODEGA';
      } else if (u.role === 'SUPER_ADMIN' || u.role === 'ORG_ADMIN') {
        roleGroup = 'ADMINISTRACIÓN';
      } else if (u.role === 'USER') {
        roleGroup = 'USUARIOS / VENTAS';
      } else if (u.role === 'GERENTE') {
        roleGroup = 'GERENCIA';
      } else if (u.role === 'TECNICO') {
        roleGroup = 'TÉCNICOS';
      } else if (u.role === 'RECEPCION') {
        roleGroup = 'RECEPCIÓN';
      }

      return {
        id: u.id,
        nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim() || 'Sin nombre',
        avatar: u.avatarUrl || undefined,
        role: u.role,
        customRoleName: u.customRoleName || undefined,
        puesto: u.puesto || undefined,
        roleGroup
      };
    });
  } catch (error) {
    console.error('Error en getAuxiliares:', error);
    return [];
  }
}

// Create order
export async function crearPedido(data: {
  clienteId: string;
  destino: string;
  estadoPago: 'pagado' | 'contra_entrega' | 'credito';
  auxiliarAsignadoId?: string;
  notas?: string;
  items: {
    productoId: string;
    nombreProducto: string;
    variedadTono?: string;
    codigoBarras?: string;
    cantidadSolicitada: number;
  }[];
}) {
  try {
    const dbUser = await getDbUser();

    // Generate unique serial number (e.g. PED-2026-0005)
    const year = new Date().getFullYear();
    const count = await prisma.pedido.count({
      where: {
        organizationId: dbUser.organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      }
    });

    const serialCode = `PED-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const newPedido = await prisma.pedido.create({
      data: {
        organizationId: dbUser.organizationId,
        codigoPedido: serialCode,
        clienteId: data.clienteId,
        destino: data.destino,
        estado: 'pendiente',
        estadoPago: data.estadoPago,
        auxiliarAsignadoId: data.auxiliarAsignadoId || null,
        notas: data.notas,
        creadoPorId: dbUser.id,
        items: {
          create: data.items.map(item => ({
            productoId: item.productoId,
            nombreProducto: item.nombreProducto,
            variedadTono: item.variedadTono || null,
            codigoBarras: item.codigoBarras || null,
            cantidadSolicitada: item.cantidadSolicitada,
            cantidadPreparada: 0,
            recolectado: false
          }))
        }
      },
      include: {
        items: true
      }
    });

    revalidatePath('/');
    revalidatePath('/inventario-ventas/pedidos');
    return { success: true, pedidoId: newPedido.id, codigoPedido: newPedido.codigoPedido };
  } catch (error: any) {
    console.error('Error en crearPedido:', error);
    return { success: false, error: error.message || 'Error interno' };
  }
}

// Assign assistant to order
export async function asignarAuxiliarPedido(pedidoId: string, auxiliarId: string | null) {
  try {
    const dbUser = await getDbUser();
    await prisma.pedido.update({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      data: {
        auxiliarAsignadoId: auxiliarId || null
      }
    });

    revalidatePath('/');
    revalidatePath('/inventario-ventas/pedidos');
    revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error en asignarAuxiliarPedido:', error);
    return { success: false, error: error.message };
  }
}

// Start picking preparation
export async function iniciarPreparacionPedido(pedidoId: string) {
  try {
    const dbUser = await getDbUser();
    await prisma.pedido.update({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      data: {
        estado: 'en_preparacion'
      }
    });

    revalidatePath('/');
    revalidatePath('/inventario-ventas/pedidos');
    revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error en iniciarPreparacionPedido:', error);
    return { success: false, error: error.message };
  }
}

// Update single item pick state
export async function actualizarItemPicking(
  pedidoId: string,
  itemId: string,
  recolectado: boolean,
  cantidadPreparada: number
) {
  try {
    const dbUser = await getDbUser();
    
    // Ensure item belongs to order and org
    const item = await prisma.pedidoItem.findFirst({
      where: {
        id: itemId,
        pedido: {
          id: pedidoId,
          organizationId: dbUser.organizationId
        }
      }
    });

    if (!item) throw new Error('Ítem de pedido no encontrado');

    await prisma.pedidoItem.update({
      where: { id: itemId },
      data: {
        recolectado,
        cantidadPreparada: Math.max(0, cantidadPreparada)
      }
    });

    revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error en actualizarItemPicking:', error);
    return { success: false, error: error.message };
  }
}

// Substitute picking item
export async function sustituirItemPedido(
  pedidoId: string,
  itemId: string,
  nuevoProductoId: string
) {
  try {
    const dbUser = await getDbUser();
    
    // Get product details
    const nuevoProd = await prisma.producto.findFirst({
      where: {
        id: nuevoProductoId,
        organizationId: dbUser.organizationId
      }
    });

    if (!nuevoProd) throw new Error('Producto sustituto no encontrado');

    // Update item
    await prisma.pedidoItem.update({
      where: { id: itemId },
      data: {
        sustituidoPorId: nuevoProductoId,
        nombreSustituto: nuevoProd.nombre,
        codigoBarras: nuevoProd.sku // use SKU as barcode fallback
      }
    });

    revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error en sustituirItemPedido:', error);
    return { success: false, error: error.message };
  }
}

// Complete order picking and update physical stock in CEDI
export async function completarPedidoBodega(pedidoId: string) {
  try {
    const dbUser = await getDbUser();
    
    // Fetch order details
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      include: {
        items: true
      }
    });

    if (!pedido) throw new Error('Pedido no encontrado');
    if (pedido.estado === 'completado') return { success: true, message: 'El pedido ya estaba completado' };

    // Transaction for stock deduction and history creation
    await prisma.$transaction(async (tx) => {
      // 1. Update order status to listo_para_facturar (disponible en pantalla de cajera)
      await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          estado: 'listo_para_facturar'
        }
      });

      // 2. Loop items and discount stock
      for (const item of pedido.items) {
        // If nothing was prepared, skip stock deduction
        if (item.cantidadPreparada <= 0) continue;

        // Deduct from substituted product if set, otherwise from original product
        const activeProductId = item.sustituidoPorId || item.productoId;

        // Fetch current product stock
        const product = await tx.producto.findUnique({
          where: { id: activeProductId }
        });

        if (product) {
          const newStock = Math.max(0, product.stockActual - item.cantidadPreparada);
          
          // Update product stock
          await tx.producto.update({
            where: { id: activeProductId },
            data: { stockActual: newStock }
          });

          // Create inventory movement record for audit trace
          await tx.movimientoInventario.create({
            data: {
              organizationId: dbUser.organizationId,
              productoId: activeProductId,
              tipoMovimiento: 'SALIDA',
              cantidad: item.cantidadPreparada,
              motivo: `Despacho de Pedido: ${pedido.codigoPedido}${item.sustituidoPorId ? ' (Sustituido)' : ''}`,
              referencia: pedido.id,
              usuarioId: dbUser.id
            }
          });
        }
      }
    });

    revalidatePath('/');
    revalidatePath('/inventario-ventas/pedidos');
    revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error en completarPedidoBodega:', error);
    return { success: false, error: error.message || 'Error al completar el pedido' };
  }
}

// Cancel / logical delete order (workflow safety rule)
export async function anularPedido(pedidoId: string) {
  try {
    const dbUser = await getDbUser();
    await prisma.pedido.update({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      data: {
        estado: 'despachado', // Or a custom status, or logical deletion fields
        anuladoPorId: dbUser.id,
        anuladoAt: new Date()
      }
    });

    revalidatePath('/');
    revalidatePath('/inventario-ventas/pedidos');
    return { success: true };
  } catch (error: any) {
    console.error('Error en anularPedido:', error);
    return { success: false, error: error.message };
  }
}

// Add item to an existing order in real time (e.g. client requested extra products)
export async function agregarItemAPedido(data: {
  pedidoId: string;
  productoId: string;
  nombreProducto: string;
  variedadTono?: string;
  codigoBarras?: string;
  cantidadSolicitada: number;
}) {
  try {
    const dbUser = await getDbUser();

    // Verify order exists in organization
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: data.pedidoId,
        organizationId: dbUser.organizationId
      }
    });

    if (!pedido) throw new Error('Pedido no encontrado');
    if (pedido.estado === 'completado') throw new Error('No se pueden agregar ítems a un pedido completado');

    const newItem = await prisma.pedidoItem.create({
      data: {
        pedidoId: data.pedidoId,
        productoId: data.productoId,
        nombreProducto: data.nombreProducto,
        variedadTono: data.variedadTono || null,
        codigoBarras: data.codigoBarras || null,
        cantidadSolicitada: Math.max(1, data.cantidadSolicitada),
        cantidadPreparada: 0,
        recolectado: false
      }
    });

    // Touch order updatedAt
    await prisma.pedido.update({
      where: { id: data.pedidoId },
      data: { updatedAt: new Date() }
    });

    revalidatePath('/');
    revalidatePath('/inventario-ventas/pedidos');
    revalidatePath(`/inventario-ventas/pedidos/preparar/${data.pedidoId}`);
    return { success: true, item: newItem };
  } catch (error: any) {
    console.error('Error en agregarItemAPedido:', error);
    return { success: false, error: error.message || 'Error al agregar el ítem' };
  }
}

// Get refreshed picking items for live polling / synchronization
export async function getPedidoPickingItems(pedidoId: string) {
  try {
    const dbUser = await getDbUser();
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      include: {
        items: true,
        cliente: true,
        auxiliarAsignado: {
          select: { id: true, nombre: true, apellido: true }
        }
      }
    });

    if (!pedido) return null;

    return {
      id: pedido.id,
      estado: pedido.estado,
      updatedAt: pedido.updatedAt.toISOString(),
      items: pedido.items.map(item => ({
        id: item.id,
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        variedadTono: item.variedadTono || undefined,
        codigoBarras: item.codigoBarras || undefined,
        cantidadSolicitada: item.cantidadSolicitada,
        cantidadPreparada: item.cantidadPreparada,
        recolectado: item.recolectado,
        sustituidoPor: item.sustituidoPorId ? {
          productoId: item.sustituidoPorId,
          nombreProducto: item.nombreSustituto || ''
        } : undefined
      }))
    };
  } catch (error) {
    console.error('Error en getPedidoPickingItems:', error);
    return null;
  }
}

// Obtener pedidos alistados en CEDI listos para cobro y facturación en caja
export async function getPedidosListosParaFacturar() {
  try {
    const dbUser = await getDbUser();
    const pedidos = await prisma.pedido.findMany({
      where: {
        organizationId: dbUser.organizationId,
        estado: { in: ['listo_para_facturar', 'completado'] }
      },
      include: {
        cliente: true,
        auxiliarAsignado: {
          select: { id: true, nombre: true, apellido: true }
        },
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                precioVenta: true,
                isvAplicable: true
              }
            },
            sustituidoPor: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                precioVenta: true,
                isvAplicable: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return pedidos.map(p => {
      const itemsListos = p.items.filter(i => i.cantidadPreparada > 0 || i.recolectado);
      
      const totalEstimado = itemsListos.reduce((acc, it) => {
        const prod = it.sustituidoPor || it.producto;
        const precio = Number(prod?.precioVenta || 0);
        const qty = it.cantidadPreparada > 0 ? it.cantidadPreparada : it.cantidadSolicitada;
        return acc + (precio * qty);
      }, 0);

      return {
        id: p.id,
        codigoPedido: p.codigoPedido,
        estado: p.estado,
        estadoPago: p.estadoPago,
        destino: p.destino,
        notas: p.notas,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        totalEstimado,
        cliente: {
          id: p.cliente.id,
          nombre: p.cliente.nombre,
          rtn: p.cliente.rtn || '',
          telefono: p.cliente.telefono || '',
          direccion: p.cliente.direccion || '',
          email: p.cliente.email || ''
        },
        auxiliarAsignado: p.auxiliarAsignado ? {
          id: p.auxiliarAsignado.id,
          nombre: `${p.auxiliarAsignado.nombre || ''} ${p.auxiliarAsignado.apellido || ''}`.trim()
        } : undefined,
        items: itemsListos.map(it => {
          const prod = it.sustituidoPor || it.producto;
          return {
            id: it.id,
            productoId: prod?.id || it.productoId,
            nombreProducto: prod?.nombre || it.nombreProducto,
            sku: prod?.sku || it.codigoBarras || '',
            cantidadPreparada: it.cantidadPreparada > 0 ? it.cantidadPreparada : it.cantidadSolicitada,
            cantidadSolicitada: it.cantidadSolicitada,
            precioVenta: Number(prod?.precioVenta || 0),
            isvAplicable: prod?.isvAplicable ?? 15,
            esSustituido: !!it.sustituidoPorId,
            nombreOriginal: it.nombreProducto
          };
        })
      };
    });
  } catch (error) {
    console.error('Error en getPedidosListosParaFacturar:', error);
    return [];
  }
}

// Marcar pedido como facturado cuando la cajera emite la factura formal
export async function marcarPedidoFacturado(pedidoId: string, facturaId?: string) {
  try {
    const dbUser = await getDbUser();
    await prisma.pedido.update({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      data: {
        estado: 'facturado',
        notas: facturaId ? `Facturado bajo documento ID: ${facturaId}` : undefined
      }
    });

    revalidatePath('/');
    revalidatePath('/facturas');
    revalidatePath('/inventario-ventas/pedidos');
    return { success: true };
  } catch (error: any) {
    console.error('Error en marcarPedidoFacturado:', error);
    return { success: false, error: error.message };
  }
}

