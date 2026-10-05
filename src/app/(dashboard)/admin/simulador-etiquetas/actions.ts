'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Crear un pedido de prueba en CEDI con los productos reales del inventario
export async function crearPedidoPruebaTicket(items: { code: string; name: string; qty: number; productoId?: string }[]) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('No autenticado');

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (!dbUser || dbUser.role !== 'SUPER_ADMIN') {
      throw new Error('Solo el SUPER_ADMIN puede generar pedidos de prueba.');
    }

    // Buscar o crear cliente de prueba
    let cliente = await prisma.cliente.findFirst({
      where: {
        organizationId: dbUser.organizationId,
        nombre: { contains: 'Prueba', mode: 'insensitive' }
      }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          organizationId: dbUser.organizationId,
          nombre: 'Floristería de Prueba (Simulador)',
          telefono: '9999-0000',
          direccion: 'CEDI Paraíso Floral - Estación de Pruebas'
        }
      });
    }

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

    const serialCode = `ORD-TEST-${(count + 1).toString().padStart(4, '0')}`;

    // Obtener productos de catálogo y activos etiquetados para asociar IDs reales
    const dbProducts = await prisma.producto.findMany({
      where: { organizationId: dbUser.organizationId }
    });

    const dbActivos = await prisma.activoFijo.findMany({
      where: { organizationId: dbUser.organizationId },
      include: { producto: true }
    });

    const newPedido = await prisma.pedido.create({
      data: {
        organizationId: dbUser.organizationId,
        codigoPedido: serialCode,
        clienteId: cliente.id,
        destino: 'CEDI - Mesa de Alisto #1',
        estado: 'pendiente',
        estadoPago: 'pagado',
        notas: 'Pedido de prueba generado desde el Simulador de Etiquetas (Códigos Reales de Inventario)',
        creadoPorId: dbUser.id,
        auxiliarAsignadoId: dbUser.id,
        items: {
          create: items.map(item => {
            // 1. Buscar en activos fijos por idQr exacto (ej. 000069)
            const matchedActivo = dbActivos.find(a => a.idQr === item.code);
            // 2. Si no, buscar en productos por SKU o id
            const matchedProd = matchedActivo?.producto || 
              dbProducts.find(p => p.id === item.productoId || p.sku.toLowerCase() === item.code.toLowerCase()) ||
              dbProducts.find(p => p.nombre.toLowerCase().includes(item.name.toLowerCase().substring(0, 5))) ||
              dbProducts[0];

            return {
              productoId: matchedProd ? matchedProd.id : (matchedActivo?.id || '00000000-0000-0000-0000-000000000000'),
              nombreProducto: item.name,
              codigoBarras: item.code, // Guardar el ID QR real (ej: 000069)
              cantidadSolicitada: Math.max(1, item.qty),
              cantidadPreparada: 0,
              recolectado: false
            };
          })
        }
      }
    });

    revalidatePath('/inventario-ventas/pedidos');
    return { success: true, pedidoId: newPedido.id, codigoPedido: newPedido.codigoPedido };
  } catch (error: any) {
    console.error('Error al crear pedido de prueba:', error);
    return { success: false, error: error.message || 'Error al crear pedido de prueba' };
  }
}
