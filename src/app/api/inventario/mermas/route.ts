import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

const UNIDADES_VALIDAS = ['UNIDAD', 'PAQUETE'] as const;
const normalizarUnidad = (u: unknown): 'UNIDAD' | 'PAQUETE' =>
  String(u || '').toUpperCase() === 'PAQUETE' ? 'PAQUETE' : 'UNIDAD';

type ConteoUnidad = { unidades: number; paquetes: number };
const sumar = (c: ConteoUnidad, unidad: string, cant: number) => {
  if (unidad === 'PAQUETE') c.paquetes += cant; else c.unidades += cant;
};
// costoBase del producto es POR PAQUETE: solo los registros en paquetes se valorizan
const costoLinea = (unidad: string, cant: number, costo: number) =>
  unidad === 'PAQUETE' ? cant * costo : 0;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes'); // Formato: YYYY-MM (ej. 2026-10) o 'TODOS'
    const q = searchParams.get('q')?.trim() || '';
    const categoria = searchParams.get('categoria') || '';
    const motivo = searchParams.get('motivo') || '';

    // Rango de fechas mensual
    let dateFilter: any = {};
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMes = mesParam && mesParam !== 'TODOS' ? mesParam : (mesParam === 'TODOS' ? null : currentYearMonth);

    if (selectedMes) {
      const [yearStr, monthStr] = selectedMes.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      dateFilter = {
        fecha: {
          gte: startDate,
          lte: endDate
        }
      };
    }

    let whereClause: any = {
      organizationId: orgId,
      ...dateFilter
    };

    if (q) {
      whereClause.OR = [
        { nombreProducto: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { notas: { contains: q, mode: 'insensitive' } },
        { categoria: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (categoria && categoria !== 'TODOS') {
      whereClause.categoria = categoria;
    }

    if (motivo && motivo !== 'TODOS') {
      whereClause.motivo = motivo;
    }

    const mermas = await prisma.registroMerma.findMany({
      where: whereClause,
      orderBy: [
        { fecha: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true }
        }
      }
    });

    // Calcular KPIs del mes / periodo seleccionado
    // Unidades y paquetes se contabilizan por separado (no se convierten entre sí)
    const totalesMes: ConteoUnidad = { unidades: 0, paquetes: 0 };
    const perdidasHoy: ConteoUnidad = { unidades: 0, paquetes: 0 };
    let costoTotalEstimado = 0;
    const conteoPorProducto: Record<string, ConteoUnidad> = {};
    const desglosePorMotivo: Record<string, ConteoUnidad> = {};
    const desglosePorCategoria: Record<string, ConteoUnidad> = {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    for (const m of mermas) {
      const cant = Number(m.cantidad || 0);
      const unidad = normalizarUnidad(m.unidadMedida);
      sumar(totalesMes, unidad, cant);

      costoTotalEstimado += costoLinea(unidad, cant, Number(m.costoUnitario || 0));

      // Por producto
      const prodKey = m.nombreProducto.trim().toUpperCase();
      sumar((conteoPorProducto[prodKey] ||= { unidades: 0, paquetes: 0 }), unidad, cant);

      // Por motivo
      const motivoKey = m.motivo || 'OTRO';
      sumar((desglosePorMotivo[motivoKey] ||= { unidades: 0, paquetes: 0 }), unidad, cant);

      // Por categoría
      const catKey = m.categoria || 'Misceláneo';
      sumar((desglosePorCategoria[catKey] ||= { unidades: 0, paquetes: 0 }), unidad, cant);

      // Hoy
      const itemDate = new Date(m.fecha);
      if (itemDate >= startOfToday && itemDate <= endOfToday) {
        sumar(perdidasHoy, unidad, cant);
      }
    }

    // Flor con mayor merma (prioriza paquetes perdidos, luego unidades)
    let florMayorMerma = { nombre: 'Ninguna', unidades: 0, paquetes: 0 };
    for (const [nombre, c] of Object.entries(conteoPorProducto)) {
      if (
        c.paquetes > florMayorMerma.paquetes ||
        (c.paquetes === florMayorMerma.paquetes && c.unidades > florMayorMerma.unidades)
      ) {
        florMayorMerma = { nombre, ...c };
      }
    }

    // Resumen histórico consolidado de todos los reportes mensuales de la organización
    const todosLosRegistros = await prisma.registroMerma.findMany({
      where: { organizationId: orgId },
      select: { fecha: true, cantidad: true, costoUnitario: true, unidadMedida: true },
      orderBy: { fecha: 'desc' }
    });

    const historicoMap: Record<string, {
      mes: string;
      correlativo: string;
      totalUnidades: number;
      totalPaquetes: number;
      costoEstimado: number;
      totalRegistros: number;
      estado: 'ABIERTO' | 'CERRADO';
    }> = {};

    for (const r of todosLosRegistros) {
      const d = new Date(r.fecha);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!historicoMap[mesKey]) {
        historicoMap[mesKey] = {
          mes: mesKey,
          correlativo: `MRM-${mesKey}`,
          totalUnidades: 0,
          totalPaquetes: 0,
          costoEstimado: 0,
          totalRegistros: 0,
          estado: mesKey >= currentYearMonth ? 'ABIERTO' : 'CERRADO'
        };
      }
      const cant = Number(r.cantidad || 0);
      const unidad = normalizarUnidad(r.unidadMedida);
      if (unidad === 'PAQUETE') historicoMap[mesKey].totalPaquetes += cant;
      else historicoMap[mesKey].totalUnidades += cant;
      historicoMap[mesKey].costoEstimado += costoLinea(unidad, cant, Number(r.costoUnitario || 0));
      historicoMap[mesKey].totalRegistros += 1;
    }

    if (!historicoMap[currentYearMonth]) {
      historicoMap[currentYearMonth] = {
        mes: currentYearMonth,
        correlativo: `MRM-${currentYearMonth}`,
        totalUnidades: 0,
        totalPaquetes: 0,
        costoEstimado: 0,
        totalRegistros: 0,
        estado: 'ABIERTO'
      };
    }

    const historicoReportes = Object.values(historicoMap).sort((a, b) => b.mes.localeCompare(a.mes));

    return NextResponse.json({
      mermas,
      historicoReportes,
      kpis: {
        totalesMes,
        florMayorMerma,
        perdidasHoy,
        costoTotalEstimado,
        desglosePorMotivo,
        desglosePorCategoria,
        mesSeleccionado: selectedMes || 'TODOS'
      }
    });
  } catch (error: any) {
    console.error('Error al listar mermas:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener mermas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const body = await request.json();

    // Soporta registro individual o lote (array)
    const items = Array.isArray(body.items) ? body.items : [body];

    const creados = [];

    for (const item of items) {
      if (!item.nombreProducto && !item.productoId) continue;

      let productoDb = null;
      if (item.productoId) {
        productoDb = await prisma.producto.findUnique({
          where: { id: item.productoId },
          select: { id: true, nombre: true, sku: true, categoria: true, costoBase: true }
        });
      }

      const nombreProducto = productoDb?.nombre || item.nombreProducto || 'Producto Floral';
      const sku = productoDb?.sku || item.sku || null;
      const categoria = item.categoria || productoDb?.categoria || 'Misceláneo';
      const costoUnitario = item.costoUnitario !== undefined 
        ? item.costoUnitario 
        : (productoDb?.costoBase ? Number(productoDb.costoBase) : null);

      // Fecha
      let fechaRegistro = new Date();
      if (item.fecha) {
        // Asegurar que se guarde la fecha local sin desplazamiento UTC
        const parts = String(item.fecha).split('T')[0].split('-');
        if (parts.length === 3) {
          fechaRegistro = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        } else {
          fechaRegistro = new Date(item.fecha);
        }
      }

      const nuevo = await prisma.registroMerma.create({
        data: {
          organizationId: orgId,
          fecha: fechaRegistro,
          productoId: productoDb?.id || item.productoId || null,
          nombreProducto,
          sku,
          categoria,
          cantidad: Math.max(1, parseInt(item.cantidad, 10) || 1),
          unidadMedida: normalizarUnidad(item.unidadMedida),
          motivo: item.motivo || 'MADURACION_MARCHITA',
          notas: item.notas?.trim() || null,
          costoUnitario: costoUnitario ? Number(costoUnitario) : null,
          usuarioId: dbUser.id
        }
      });

      creados.push(nuevo);
    }

    return NextResponse.json({ success: true, count: creados.length, items: creados });
  } catch (error: any) {
    console.error('Error al registrar merma:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar merma' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const body = await request.json();
    const { id, cantidad, motivo, notas, fecha, categoria, unidadMedida } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de registro requerido' }, { status: 400 });
    }

    const updateData: any = {};
    if (cantidad !== undefined) updateData.cantidad = Math.max(1, parseInt(cantidad, 10) || 1);
    if (motivo !== undefined) updateData.motivo = motivo;
    if (unidadMedida !== undefined && UNIDADES_VALIDAS.includes(String(unidadMedida).toUpperCase() as any)) {
      updateData.unidadMedida = normalizarUnidad(unidadMedida);
    }
    if (notas !== undefined) updateData.notas = notas;
    if (categoria !== undefined) updateData.categoria = categoria;

    if (fecha) {
      const parts = String(fecha).split('T')[0].split('-');
      if (parts.length === 3) {
        updateData.fecha = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      } else {
        updateData.fecha = new Date(fecha);
      }
    }

    const actualizado = await prisma.registroMerma.update({
      where: { id, organizationId: dbUser.organizationId },
      data: updateData
    });

    return NextResponse.json({ success: true, item: actualizado });
  } catch (error: any) {
    console.error('Error al actualizar merma:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar registro' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    await prisma.registroMerma.delete({
      where: { id, organizationId: dbUser.organizationId }
    });

    return NextResponse.json({ success: true, message: 'Registro de merma eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar merma:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar merma' }, { status: 500 });
  }
}
