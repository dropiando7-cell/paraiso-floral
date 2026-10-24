'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseCodigoEtiqueta } from '@/utils/etiquetaSerialHelper';

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
        chequeadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        items: {
          include: {
            etiquetasSerial: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return pedidos.map(p => ({
      ...p,
      codigoPedido: p.codigoPedido,
      tipoDespacho: p.tipoDespacho || 'INMEDIATO',
      horaDespacho: p.horaDespacho || null,
      motoristaRuta: p.motoristaRuta || null,
      facturaId: p.facturaId || null,
      chequeadoAt: p.chequeadoAt ? p.chequeadoAt.toISOString() : null,
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
      chequeadoPor: p.chequeadoPor ? {
        id: p.chequeadoPor.id,
        nombre: `${p.chequeadoPor.nombre || ''} ${p.chequeadoPor.apellido || ''}`.trim()
      } : undefined,
      items: p.items.map(item => ({
        id: item.id,
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        variedadTono: item.variedadTono || undefined,
        codigoBarras: item.codigoBarras || undefined,
        cantidadSolicitada: item.cantidadSolicitada,
        cantidadPreparada: item.cantidadPreparada,
        cantidadChequeada: item.cantidadChequeada || 0,
        chequeado: item.chequeado || false,
        recolectado: item.recolectado,
        sustituidoPor: item.sustituidoPorId ? {
          productoId: item.sustituidoPorId,
          nombreProducto: item.nombreSustituto || ''
        } : undefined,
        serialesEscaneados: (item.etiquetasSerial || []).map(s => ({
          id: s.id,
          codigoSerial: s.codigoSerial,
          codigoPadre: s.codigoPadre,
          estado: s.estado,
          alistadoAt: s.alistadoAt ? s.alistadoAt.toISOString() : null,
          chequeadoAt: s.chequeadoAt ? s.chequeadoAt.toISOString() : null
        }))
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
        chequeadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        items: {
          include: {
            etiquetasSerial: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!p) return null;

    return {
      ...p,
      tipoDespacho: p.tipoDespacho || 'INMEDIATO',
      horaDespacho: p.horaDespacho || null,
      motoristaRuta: p.motoristaRuta || null,
      facturaId: p.facturaId || null,
      chequeadoAt: p.chequeadoAt ? p.chequeadoAt.toISOString() : null,
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
      chequeadoPor: p.chequeadoPor ? {
        id: p.chequeadoPor.id,
        nombre: `${p.chequeadoPor.nombre || ''} ${p.chequeadoPor.apellido || ''}`.trim()
      } : undefined,
      items: p.items.map(item => ({
        id: item.id,
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        variedadTono: item.variedadTono || undefined,
        codigoBarras: item.codigoBarras || undefined,
        cantidadSolicitada: item.cantidadSolicitada,
        cantidadPreparada: item.cantidadPreparada,
        cantidadChequeada: item.cantidadChequeada || 0,
        chequeado: item.chequeado || false,
        recolectado: item.recolectado,
        sustituidoPor: item.sustituidoPorId ? {
          productoId: item.sustituidoPorId,
          nombreProducto: item.nombreSustituto || ''
        } : undefined,
        serialesEscaneados: (item.etiquetasSerial || []).map(s => ({
          id: s.id,
          codigoSerial: s.codigoSerial,
          codigoPadre: s.codigoPadre,
          estado: s.estado,
          alistadoAt: s.alistadoAt ? s.alistadoAt.toISOString() : null,
          chequeadoAt: s.chequeadoAt ? s.chequeadoAt.toISOString() : null
        }))
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
  tipoDespacho?: string;
  horaDespacho?: string;
  motoristaRuta?: string;
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
        tipoDespacho: data.tipoDespacho || 'INMEDIATO',
        horaDespacho: data.horaDespacho || null,
        motoristaRuta: data.motoristaRuta || null,
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
          estado: 'listo_para_facturar',
          chequeadoPorId: dbUser.id,
          chequeadoAt: new Date()
        }
      });

      // 1.1 Update all associated EtiquetaSerial records to CHEQUEADO_OK
      await tx.etiquetaSerial.updateMany({
        where: {
          pedidoId,
          organizationId: dbUser.organizationId
        },
        data: {
          estado: 'CHEQUEADO_OK',
          chequeadoPorId: dbUser.id,
          chequeadoAt: new Date()
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
    await prisma.$transaction(async (tx) => {
      await tx.pedido.update({
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

      // Liberar cualquier etiqueta serializada que haya sido apartada en este pedido
      await tx.etiquetaSerial.updateMany({
        where: {
          pedidoId,
          organizationId: dbUser.organizationId,
          estado: { in: ['ALISTADO_PEDIDO', 'CHEQUEADO_OK'] }
        },
        data: {
          estado: 'DISPONIBLE_BODEGA',
          pedidoId: null,
          pedidoItemId: null,
          alistadoPorId: null,
          alistadoAt: null,
          chequeadoPorId: null,
          chequeadoAt: null
        }
      });
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
        items: {
          include: {
            etiquetasSerial: {
              orderBy: { createdAt: 'asc' }
            }
          }
        },
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
        cantidadChequeada: item.cantidadChequeada || 0,
        chequeado: item.chequeado || false,
        recolectado: item.recolectado,
        sustituidoPor: item.sustituidoPorId ? {
          productoId: item.sustituidoPorId,
          nombreProducto: item.nombreSustituto || ''
        } : undefined,
        serialesEscaneados: (item.etiquetasSerial || []).map(s => ({
          id: s.id,
          codigoSerial: s.codigoSerial,
          codigoPadre: s.codigoPadre,
          estado: s.estado,
          alistadoAt: s.alistadoAt ? s.alistadoAt.toISOString() : null,
          chequeadoAt: s.chequeadoAt ? s.chequeadoAt.toISOString() : null
        }))
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
    await prisma.$transaction(async (tx) => {
      await tx.pedido.update({
        where: {
          id: pedidoId,
          organizationId: dbUser.organizationId
        },
        data: {
          estado: 'facturado',
          facturaId: facturaId || null,
          notas: facturaId ? `Facturado bajo documento ID: ${facturaId}` : undefined
        }
      });

      // Actualizar todas las etiquetas serializadas casadas con este pedido a FACTURADO_EN_RUTA
      await tx.etiquetaSerial.updateMany({
        where: {
          pedidoId,
          organizationId: dbUser.organizationId
        },
        data: {
          estado: 'FACTURADO_EN_RUTA',
          facturaId: facturaId || null,
          despachadoAt: new Date()
        }
      });
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

// Pasar pedido de alistamiento a mesa de chequeo (Rol Chequeador)
export async function pasarPedidoAChequeo(pedidoId: string) {
  try {
    const dbUser = await getDbUser();
    await prisma.pedido.update({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      data: {
        estado: 'en_chequeo'
      }
    });

    revalidatePath('/');
    revalidatePath('/inventario-ventas/pedidos');
    revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error en pasarPedidoAChequeo:', error);
    return { success: false, error: error.message };
  }
}

// Escanear etiqueta en PDA (Modo ALISTADOR o Modo CHEQUEADOR) con bloqueo de doble escaneo y validación de apartados
export async function escanearEtiquetaPedido(params: {
  pedidoId: string;
  codigoEscaneado: string;
  modo: 'ALISTADOR' | 'CHEQUEADOR';
}) {
  try {
    const dbUser = await getDbUser();
    const { pedidoId, codigoEscaneado, modo } = params;
    const parsed = parseCodigoEtiqueta(codigoEscaneado);

    if (!parsed.clean) {
      return { success: false, code: 'CODIGO_VACIO', error: 'Código vacío' };
    }

    const pedido = await prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        organizationId: dbUser.organizationId
      },
      include: {
        items: {
          include: {
            producto: { select: { id: true, sku: true, nombre: true } },
            sustituidoPor: { select: { id: true, sku: true, nombre: true } },
            etiquetasSerial: true
          }
        }
      }
    });

    if (!pedido) {
      return { success: false, code: 'PEDIDO_NO_ENCONTRADO', error: 'Pedido no encontrado' };
    }

    // Helper para buscar el PedidoItem que corresponde al código padre
    const findMatchingPedidoItem = (codigoPadre: string, preferIncomplete: boolean) => {
      const padreLower = codigoPadre.toLowerCase().replace(/^pf-/i, '');
      const padreNum = padreLower.replace(/^0+/, '');

      const matches = pedido.items.filter(i => {
        const activeProd = i.sustituidoPor || i.producto;
        const itemBar = (i.codigoBarras || '').toLowerCase().replace(/^pf-/i, '');
        const prodSku = (activeProd?.sku || '').toLowerCase().replace(/^pf-/i, '');

        return (
          (itemBar && (itemBar === padreLower || itemBar.replace(/^0+/, '') === padreNum)) ||
          (prodSku && (prodSku === padreLower || prodSku.replace(/^0+/, '') === padreNum))
        );
      });

      if (matches.length === 0) return null;
      if (preferIncomplete) {
        if (modo === 'ALISTADOR') {
          const incomplete = matches.find(m => m.cantidadPreparada < m.cantidadSolicitada);
          if (incomplete) return incomplete;
        } else {
          const incomplete = matches.find(m => (m.cantidadChequeada || 0) < (m.cantidadPreparada || m.cantidadSolicitada));
          if (incomplete) return incomplete;
        }
      }
      return matches[0];
    };

    // ─── CASO A: Etiqueta Hija Serializada (ej. 010055-0042) ─────────────────
    if (parsed.isSerial) {
      let etiqueta = await prisma.etiquetaSerial.findFirst({
        where: {
          organizationId: dbUser.organizationId,
          codigoSerial: { equals: parsed.codigoSerial, mode: 'insensitive' }
        },
        include: {
          pedido: {
            include: {
              cliente: { select: { nombre: true } }
            }
          }
        }
      });

      // 1. Validar si ya pertenece a OTRO pedido (Respeto de Apartados y Pedidos Programados)
      if (
        etiqueta &&
        etiqueta.pedidoId &&
        etiqueta.pedidoId !== pedidoId &&
        ['ALISTADO_PEDIDO', 'CHEQUEADO_OK', 'FACTURADO_EN_RUTA'].includes(etiqueta.estado)
      ) {
        const otroCodigo = etiqueta.pedido?.codigoPedido || 'Otro Pedido';
        const otroCliente = etiqueta.pedido?.cliente?.nombre || 'Cliente';
        return {
          success: false,
          code: 'APARTADO_OTRO_PEDIDO',
          error: `🚫 Paquete ${parsed.codigoSerial} ya está apartado en ${otroCodigo} (${otroCliente}).`
        };
      }

      // 2. Validar si está en MERMA o ENTREGADO
      if (etiqueta && ['MERMA', 'ENTREGADO'].includes(etiqueta.estado)) {
        return {
          success: false,
          code: 'ESTADO_INVALIDO',
          error: `🚫 Etiqueta ${parsed.codigoSerial} figura como ${etiqueta.estado}.`
        };
      }

      // 3. MODO ALISTADOR
      if (modo === 'ALISTADOR') {
        // Bloqueo de Doble Escaneo en el mismo pedido
        if (etiqueta && etiqueta.pedidoId === pedidoId && etiqueta.estado !== 'DISPONIBLE_BODEGA') {
          return {
            success: false,
            code: 'DOBLE_ESCANEO',
            error: `⚠️ Este paquete (${parsed.codigoSerial}) ya fue escaneado en este pedido.`
          };
        }

        const targetItem = findMatchingPedidoItem(parsed.codigoPadre, true);
        if (!targetItem) {
          return {
            success: false,
            code: 'NO_EN_PEDIDO',
            codigoPadre: parsed.codigoPadre,
            codigoSerial: parsed.codigoSerial,
            error: `El producto ${parsed.codigoPadre} (${parsed.codigoSerial}) no está solicitado en este pedido.`
          };
        }

        const activeProdId = targetItem.sustituidoPorId || targetItem.productoId;
        const newQty = (targetItem.cantidadPreparada || 0) + 1;
        const isComplete = newQty >= targetItem.cantidadSolicitada;

        const updatedSerial = await prisma.$transaction(async (tx) => {
          let serialRec;
          if (etiqueta) {
            serialRec = await tx.etiquetaSerial.update({
              where: { id: etiqueta.id },
              data: {
                estado: 'ALISTADO_PEDIDO',
                pedidoId,
                pedidoItemId: targetItem.id,
                productoId: etiqueta.productoId || activeProdId,
                alistadoPorId: dbUser.id,
                alistadoAt: new Date()
              }
            });
          } else {
            serialRec = await tx.etiquetaSerial.create({
              data: {
                organizationId: dbUser.organizationId,
                codigoSerial: parsed.codigoSerial,
                codigoPadre: parsed.codigoPadre,
                correlativo: parsed.correlativo || 1,
                descripcion: targetItem.nombreProducto,
                estado: 'ALISTADO_PEDIDO',
                productoId: activeProdId,
                pedidoId,
                pedidoItemId: targetItem.id,
                alistadoPorId: dbUser.id,
                alistadoAt: new Date()
              }
            });
          }

          await tx.pedidoItem.update({
            where: { id: targetItem.id },
            data: {
              cantidadPreparada: newQty,
              recolectado: isComplete
            }
          });

          return serialRec;
        });

        revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);

        return {
          success: true,
          modo: 'ALISTADOR',
          isSerial: true,
          itemId: targetItem.id,
          nombreProducto: targetItem.nombreProducto,
          cantidadPreparada: newQty,
          cantidadSolicitada: targetItem.cantidadSolicitada,
          recolectado: isComplete,
          serial: {
            id: updatedSerial.id,
            codigoSerial: updatedSerial.codigoSerial,
            codigoPadre: updatedSerial.codigoPadre,
            estado: updatedSerial.estado,
            alistadoAt: updatedSerial.alistadoAt ? updatedSerial.alistadoAt.toISOString() : null,
            chequeadoAt: updatedSerial.chequeadoAt ? updatedSerial.chequeadoAt.toISOString() : null
          }
        };
      }

      // 4. MODO CHEQUEADOR (Doble Verificación 100%)
      if (modo === 'CHEQUEADOR') {
        if (etiqueta && etiqueta.pedidoId === pedidoId && etiqueta.estado === 'CHEQUEADO_OK') {
          return {
            success: false,
            code: 'DOBLE_ESCANEO',
            error: `⚠️ Este paquete (${parsed.codigoSerial}) ya fue chequeado en este pedido.`
          };
        }

        const targetItem = etiqueta?.pedidoItemId
          ? pedido.items.find(i => i.id === etiqueta!.pedidoItemId) || findMatchingPedidoItem(parsed.codigoPadre, true)
          : findMatchingPedidoItem(parsed.codigoPadre, true);

        if (!targetItem) {
          return {
            success: false,
            code: 'PRODUCTO_CRUZADO',
            error: `🚫 Paquete ajeno al pedido: ${parsed.codigoSerial} no corresponde a ningún ítem solicitado.`
          };
        }

        const activeProdId = targetItem.sustituidoPorId || targetItem.productoId;
        const wasAlreadyAlistado = etiqueta && etiqueta.pedidoId === pedidoId;
        const newPrepQty = wasAlreadyAlistado
          ? targetItem.cantidadPreparada
          : (targetItem.cantidadPreparada || 0) + 1;
        const targetGoal = Math.max(targetItem.cantidadSolicitada, newPrepQty);
        const newCheqQty = (targetItem.cantidadChequeada || 0) + 1;
        const isCheqComplete = newCheqQty >= targetGoal;

        const updatedSerial = await prisma.$transaction(async (tx) => {
          let serialRec;
          if (etiqueta) {
            serialRec = await tx.etiquetaSerial.update({
              where: { id: etiqueta.id },
              data: {
                estado: 'CHEQUEADO_OK',
                pedidoId,
                pedidoItemId: targetItem.id,
                productoId: etiqueta.productoId || activeProdId,
                alistadoPorId: etiqueta.alistadoPorId || dbUser.id,
                alistadoAt: etiqueta.alistadoAt || new Date(),
                chequeadoPorId: dbUser.id,
                chequeadoAt: new Date()
              }
            });
          } else {
            serialRec = await tx.etiquetaSerial.create({
              data: {
                organizationId: dbUser.organizationId,
                codigoSerial: parsed.codigoSerial,
                codigoPadre: parsed.codigoPadre,
                correlativo: parsed.correlativo || 1,
                descripcion: targetItem.nombreProducto,
                estado: 'CHEQUEADO_OK',
                productoId: activeProdId,
                pedidoId,
                pedidoItemId: targetItem.id,
                alistadoPorId: dbUser.id,
                alistadoAt: new Date(),
                chequeadoPorId: dbUser.id,
                chequeadoAt: new Date()
              }
            });
          }

          await tx.pedidoItem.update({
            where: { id: targetItem.id },
            data: {
              cantidadPreparada: newPrepQty,
              recolectado: newPrepQty >= targetItem.cantidadSolicitada,
              cantidadChequeada: newCheqQty,
              chequeado: isCheqComplete
            }
          });

          return serialRec;
        });

        revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);

        return {
          success: true,
          modo: 'CHEQUEADOR',
          isSerial: true,
          itemId: targetItem.id,
          nombreProducto: targetItem.nombreProducto,
          cantidadPreparada: newPrepQty,
          cantidadSolicitada: targetItem.cantidadSolicitada,
          cantidadChequeada: newCheqQty,
          chequeado: isCheqComplete,
          serial: {
            id: updatedSerial.id,
            codigoSerial: updatedSerial.codigoSerial,
            codigoPadre: updatedSerial.codigoPadre,
            estado: updatedSerial.estado,
            alistadoAt: updatedSerial.alistadoAt ? updatedSerial.alistadoAt.toISOString() : null,
            chequeadoAt: updatedSerial.chequeadoAt ? updatedSerial.chequeadoAt.toISOString() : null
          }
        };
      }
    }

    // ─── CASO B: Etiqueta Clásica / Padre sin sufijo serial (ej. 010055) ─────
    const targetItem = findMatchingPedidoItem(parsed.codigoPadre, true);
    if (!targetItem) {
      return {
        success: false,
        code: 'NO_EN_PEDIDO',
        codigoPadre: parsed.codigoPadre,
        codigoSerial: parsed.codigoSerial,
        error: `Código no encontrado en este pedido: ${parsed.clean}`
      };
    }

    if (modo === 'ALISTADOR') {
      const newQty = (targetItem.cantidadPreparada || 0) + 1;
      const isComplete = newQty >= targetItem.cantidadSolicitada;
      await prisma.pedidoItem.update({
        where: { id: targetItem.id },
        data: {
          cantidadPreparada: newQty,
          recolectado: isComplete
        }
      });
      revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
      return {
        success: true,
        modo: 'ALISTADOR',
        isSerial: false,
        itemId: targetItem.id,
        nombreProducto: targetItem.nombreProducto,
        cantidadPreparada: newQty,
        cantidadSolicitada: targetItem.cantidadSolicitada,
        recolectado: isComplete
      };
    } else {
      const targetGoal = Math.max(targetItem.cantidadSolicitada, targetItem.cantidadPreparada || 0);
      const newCheqQty = (targetItem.cantidadChequeada || 0) + 1;
      const isCheqComplete = newCheqQty >= targetGoal;
      await prisma.pedidoItem.update({
        where: { id: targetItem.id },
        data: {
          cantidadChequeada: newCheqQty,
          chequeado: isCheqComplete
        }
      });
      revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
      return {
        success: true,
        modo: 'CHEQUEADOR',
        isSerial: false,
        itemId: targetItem.id,
        nombreProducto: targetItem.nombreProducto,
        cantidadPreparada: targetItem.cantidadPreparada,
        cantidadSolicitada: targetItem.cantidadSolicitada,
        cantidadChequeada: newCheqQty,
        chequeado: isCheqComplete
      };
    }
  } catch (error: any) {
    console.error('Error en escanearEtiquetaPedido:', error);
    return { success: false, error: error.message || 'Error al procesar escaneo' };
  }
}

// Desvincular un serial específico de un pedido y devolverlo a DISPONIBLE_BODEGA
export async function desvincularEtiquetaSerial(pedidoId: string, etiquetaId: string) {
  try {
    const dbUser = await getDbUser();
    const etiqueta = await prisma.etiquetaSerial.findFirst({
      where: {
        id: etiquetaId,
        pedidoId,
        organizationId: dbUser.organizationId
      }
    });

    if (!etiqueta) {
      return { success: false, error: 'Etiqueta no encontrada en este pedido' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.etiquetaSerial.update({
        where: { id: etiqueta.id },
        data: {
          estado: 'DISPONIBLE_BODEGA',
          pedidoId: null,
          pedidoItemId: null,
          alistadoPorId: null,
          alistadoAt: null,
          chequeadoPorId: null,
          chequeadoAt: null
        }
      });

      if (etiqueta.pedidoItemId) {
        const item = await tx.pedidoItem.findUnique({
          where: { id: etiqueta.pedidoItemId }
        });
        if (item) {
          const newPrep = Math.max(0, (item.cantidadPreparada || 0) - 1);
          const newCheq = etiqueta.estado === 'CHEQUEADO_OK'
            ? Math.max(0, (item.cantidadChequeada || 0) - 1)
            : (item.cantidadChequeada || 0);

          await tx.pedidoItem.update({
            where: { id: item.id },
            data: {
              cantidadPreparada: newPrep,
              recolectado: newPrep >= item.cantidadSolicitada,
              cantidadChequeada: newCheq,
              chequeado: newCheq >= item.cantidadSolicitada
            }
          });
        }
      }
    });

    revalidatePath(`/inventario-ventas/pedidos/preparar/${pedidoId}`);
    return { success: true, codigoSerial: etiqueta.codigoSerial };
  } catch (error: any) {
    console.error('Error en desvincularEtiquetaSerial:', error);
    return { success: false, error: error.message };
  }
}

// Obtener mapa de Stock Comprometido / Apartado en pedidos activos (pendiente, en_preparacion, en_chequeo)
export async function getStockComprometidoMap(): Promise<Record<string, number>> {
  try {
    const dbUser = await getDbUser();
    const pedidosActivos = await prisma.pedido.findMany({
      where: {
        organizationId: dbUser.organizationId,
        estado: { in: ['pendiente', 'en_preparacion', 'en_chequeo'] },
        anuladoAt: null
      },
      include: {
        items: true
      }
    });

    const map: Record<string, number> = {};
    for (const p of pedidosActivos) {
      for (const item of p.items) {
        const prodId = item.sustituidoPorId || item.productoId;
        const qty = Math.max(item.cantidadSolicitada, item.cantidadPreparada || 0);
        map[prodId] = (map[prodId] || 0) + qty;
      }
    }
    return map;
  } catch (error) {
    console.error('Error en getStockComprometidoMap:', error);
    return {};
  }
}

// Fase E: Liquidación / Retorno de Ruta por escaneo de etiqueta (Reingreso a Bodega o Merma)
export async function procesarRetornoEtiquetaRuta(params: {
  codigoSerial: string;
  accion: 'DEVUELTO_BODEGA' | 'MERMA';
  motivo?: string;
}) {
  try {
    const dbUser = await getDbUser();
    const parsed = parseCodigoEtiqueta(params.codigoSerial);

    if (!parsed.clean) {
      return { success: false, error: 'Código inválido' };
    }

    const etiqueta = await prisma.etiquetaSerial.findFirst({
      where: {
        organizationId: dbUser.organizationId,
        codigoSerial: { equals: parsed.codigoSerial, mode: 'insensitive' }
      },
      include: {
        producto: true,
        activoFijo: true,
        pedido: {
          include: { cliente: { select: { nombre: true } } }
        }
      }
    });

    if (!etiqueta) {
      return {
        success: false,
        error: `No se encontró la etiqueta serializada ${parsed.codigoSerial} en el sistema.`
      };
    }

    if (etiqueta.estado === 'DISPONIBLE_BODEGA' && params.accion === 'DEVUELTO_BODEGA') {
      return {
        success: false,
        error: `La etiqueta ${etiqueta.codigoSerial} ya se encuentra DISPONIBLE EN BODEGA.`
      };
    }

    if (etiqueta.estado === 'MERMA') {
      return {
        success: false,
        error: `La etiqueta ${etiqueta.codigoSerial} ya había sido registrada como MERMA.`
      };
    }

    const estabaDescontadoStock = ['FACTURADO_EN_RUTA', 'CHEQUEADO_OK', 'ENTREGADO'].includes(etiqueta.estado);

    await prisma.$transaction(async (tx) => {
      if (params.accion === 'DEVUELTO_BODEGA') {
        await tx.etiquetaSerial.update({
          where: { id: etiqueta.id },
          data: {
            estado: 'DISPONIBLE_BODEGA',
            retornadoAt: new Date(),
            motivoRetorno: params.motivo || 'Retorno de ruta en buen estado (Reintegrado a cámara fría)',
            pedidoId: null,
            pedidoItemId: null
          }
        });

        // Si el paquete ya había descontado stock al completarse el pedido, reintegrar +1 al inventario
        if (estabaDescontadoStock && etiqueta.productoId) {
          await tx.producto.update({
            where: { id: etiqueta.productoId },
            data: { stockActual: { increment: 1 } }
          });

          if (etiqueta.activoFijoId) {
            await tx.activoFijo.update({
              where: { id: etiqueta.activoFijoId },
              data: { stock: { increment: 1 } }
            });
          }

          await tx.movimientoInventario.create({
            data: {
              organizationId: dbUser.organizationId,
              productoId: etiqueta.productoId,
              tipoMovimiento: 'ENTRADA',
              cantidad: 1,
              motivo: `Retorno de Ruta (${etiqueta.codigoSerial}): ${params.motivo || 'Reingreso a cámara fría'}`,
              referencia: etiqueta.codigoSerial,
              usuarioId: dbUser.id
            }
          });
        }
      } else {
        // ACCIÓN: MERMA
        await tx.etiquetaSerial.update({
          where: { id: etiqueta.id },
          data: {
            estado: 'MERMA',
            retornadoAt: new Date(),
            motivoRetorno: params.motivo || 'Dañado en retorno de ruta'
          }
        });

        // Si aún estaba en DISPONIBLE_BODEGA o ALISTADO_PEDIDO (no había descontado stock de salida), descontar 1 por merma
        if (!estabaDescontadoStock && etiqueta.productoId) {
          await tx.producto.update({
            where: { id: etiqueta.productoId },
            data: { stockActual: { decrement: 1 } }
          });
          if (etiqueta.activoFijoId) {
            await tx.activoFijo.update({
              where: { id: etiqueta.activoFijoId },
              data: { stock: { decrement: 1 } }
            });
          }
        }

        if (etiqueta.productoId) {
          await tx.movimientoInventario.create({
            data: {
              organizationId: dbUser.organizationId,
              productoId: etiqueta.productoId,
              tipoMovimiento: 'MERMA',
              cantidad: 1,
              motivo: `Merma por Retorno de Etiqueta ${etiqueta.codigoSerial}: ${params.motivo || 'Maltratado / Dañado'}`,
              referencia: etiqueta.codigoSerial,
              usuarioId: dbUser.id
            }
          });
        }

        await tx.registroMerma.create({
          data: {
            organizationId: dbUser.organizationId,
            productoId: etiqueta.productoId || null,
            nombreProducto: etiqueta.descripcion,
            sku: etiqueta.codigoSerial,
            categoria: etiqueta.producto?.categoria || 'FLOR',
            cantidad: 1,
            unidadMedida: 'PAQUETE',
            motivo: params.motivo || 'RETORNO_RUTA_DANADO',
            notas: `Etiqueta serializada: ${etiqueta.codigoSerial}${etiqueta.pedido ? ` (Pedido ${etiqueta.pedido.codigoPedido})` : ''}`,
            costoUnitario: etiqueta.producto?.costoBase || 0,
            usuarioId: dbUser.id
          }
        });
      }
    });

    revalidatePath('/inventario');
    revalidatePath('/inventario-ventas/pedidos');
    return {
      success: true,
      etiqueta: {
        codigoSerial: etiqueta.codigoSerial,
        descripcion: etiqueta.descripcion,
        nuevoEstado: params.accion === 'DEVUELTO_BODEGA' ? 'DISPONIBLE_BODEGA' : 'MERMA',
        pedidoCodigo: etiqueta.pedido?.codigoPedido || null,
        clienteNombre: etiqueta.pedido?.cliente?.nombre || null
      }
    };
  } catch (error: any) {
    console.error('Error en procesarRetornoEtiquetaRuta:', error);
    return { success: false, error: error.message || 'Error al procesar retorno de etiqueta' };
  }
}


