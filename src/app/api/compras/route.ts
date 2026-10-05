import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const mesParam = searchParams.get('mes'); // e.g. "2026-10" o "all"
    const searchParam = searchParams.get('search')?.trim();
    const categoriaParam = searchParams.get('categoria')?.trim();
    const orderParam = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // Construir filtro Where
    const whereClause: any = {
      organizationId: orgId
    };

    // Filtro de Mes
    if (mesParam && mesParam !== 'all') {
      const [yearStr, monthStr] = mesParam.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10); // 1-12
      if (!isNaN(year) && !isNaN(month)) {
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // primer dia del mes siguiente
        whereClause.fecha = {
          gte: startOfMonth,
          lt: endOfMonth
        };
      }
    }

    // Filtro de Búsqueda (descripción, factura o rtn)
    if (searchParam) {
      whereClause.OR = [
        { descripcion: { contains: searchParam, mode: 'insensitive' } },
        { factura: { contains: searchParam, mode: 'insensitive' } },
        { rtn: { contains: searchParam, mode: 'insensitive' } }
      ];
    }

    // Filtro de Categoría
    if (categoriaParam && categoriaParam !== 'TODAS') {
      whereClause.categoria = categoriaParam;
    }

    const compras = await (prisma.registroCompra as any).findMany({
      where: whereClause,
      orderBy: { fecha: orderParam },
      include: {
        creadoPor: { select: { nombre: true, apellido: true } }
      }
    });

    // Calcular estadísticas y totales acumulados
    let totalExenta = 0;
    let totalGravada = 0;
    let totalIsv15 = 0;
    let granTotal = 0;
    const porCategoria: Record<string, number> = {};

    compras.forEach((c: any) => {
      const ex = Number(c.exenta || 0);
      const gr = Number(c.gravada || 0);
      const isv = Number(c.isv15 || 0);
      const tot = Number(c.total || 0);

      totalExenta += ex;
      totalGravada += gr;
      totalIsv15 += isv;
      granTotal += tot;

      const cat = c.categoria || 'GENERAL';
      porCategoria[cat] = (porCategoria[cat] || 0) + tot;
    });

    return NextResponse.json({
      success: true,
      compras,
      resumen: {
        totalExenta,
        totalGravada,
        totalIsv15,
        granTotal,
        totalRegistros: compras.length,
        porCategoria
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo registros de compras:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // 1. Soporte para inserción en LOTE (Paste masivo de Excel)
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: 'El lote no contiene registros' }, { status: 400 });
      }

      const rowsToInsert = body.map((item: any) => {
        const exenta = Number(item.exenta || 0);
        const gravada = Number(item.gravada || 0);
        const isv15 = Number(item.isv15 || 0);
        let total = Number(item.total || 0);

        if (total <= 0 && (exenta > 0 || gravada > 0)) {
          total = exenta + gravada + isv15;
        }

        return {
          organizationId: orgId,
          fecha: new Date(item.fecha || new Date()),
          descripcion: String(item.descripcion || 'Sin descripción').trim(),
          factura: item.factura ? String(item.factura).trim() : null,
          rtn: item.rtn ? String(item.rtn).trim() : null,
          categoria: item.categoria || 'GENERAL',
          comprobanteUrl: item.comprobanteUrl || null,
          exenta,
          gravada,
          isv15,
          total,
          creadoPorId: dbUser.id
        };
      });

      const inserted = await (prisma.registroCompra as any).createMany({
        data: rowsToInsert
      });

      return NextResponse.json({
        success: true,
        count: inserted.count,
        message: `${inserted.count} registros de compra importados exitosamente`
      });
    }

    // 2. Inserción individual
    const {
      fecha,
      descripcion,
      factura,
      rtn,
      categoria,
      comprobanteUrl,
      exenta,
      gravada,
      isv15,
      total
    } = body;

    if (!descripcion || !fecha) {
      return NextResponse.json({ error: 'Fecha y descripción son obligatorios' }, { status: 400 });
    }

    const exentaNum = Number(exenta || 0);
    const gravadaNum = Number(gravada || 0);
    const isv15Num = Number(isv15 || 0);
    let totalNum = Number(total || 0);

    if (totalNum <= 0 && (exentaNum > 0 || gravadaNum > 0)) {
      totalNum = exentaNum + gravadaNum + isv15Num;
    }

    const nuevaCompra = await (prisma.registroCompra as any).create({
      data: {
        organizationId: orgId,
        fecha: new Date(fecha),
        descripcion: String(descripcion).trim(),
        factura: factura ? String(factura).trim() : null,
        rtn: rtn ? String(rtn).trim() : null,
        categoria: categoria || 'GENERAL',
        comprobanteUrl: comprobanteUrl || null,
        exenta: exentaNum,
        gravada: gravadaNum,
        isv15: isv15Num,
        total: totalNum,
        creadoPorId: dbUser.id
      }
    });

    return NextResponse.json({ success: true, compra: nuevaCompra });
  } catch (error: any) {
    console.error('Error guardando registro de compra:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

// 3. Soporte para Edición en Celda (Inline Editing estilo Excel)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es obligatorio para actualizar' }, { status: 400 });
    }

    // Sanitizar datos para la actualización
    const dataToUpdate: any = {};

    if (updates.fecha !== undefined) dataToUpdate.fecha = new Date(updates.fecha);
    if (updates.descripcion !== undefined) dataToUpdate.descripcion = String(updates.descripcion).trim();
    if (updates.factura !== undefined) dataToUpdate.factura = updates.factura ? String(updates.factura).trim() : null;
    if (updates.rtn !== undefined) dataToUpdate.rtn = updates.rtn ? String(updates.rtn).trim() : null;
    if (updates.categoria !== undefined) dataToUpdate.categoria = updates.categoria;
    if (updates.comprobanteUrl !== undefined) dataToUpdate.comprobanteUrl = updates.comprobanteUrl;
    if (updates.exenta !== undefined) dataToUpdate.exenta = Number(updates.exenta || 0);
    if (updates.gravada !== undefined) dataToUpdate.gravada = Number(updates.gravada || 0);
    if (updates.isv15 !== undefined) dataToUpdate.isv15 = Number(updates.isv15 || 0);
    if (updates.total !== undefined) dataToUpdate.total = Number(updates.total || 0);

    const updated = await (prisma.registroCompra as any).update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, compra: updated });
  } catch (error: any) {
    console.error('Error actualizando registro de compra:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }

    await prisma.registroCompra.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Registro de compra eliminado' });
  } catch (error: any) {
    console.error('Error eliminando compra:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
