import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

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
    
    // Obtener compras, ordenadas por fecha (más reciente primero, o más antigua para la tabla)
    // Para modo "Excel", usualmente se quiere ver el historial cronológico o inverso
    const compras = await prisma.registroCompra.findMany({
      where: { organizationId: orgId },
      orderBy: { fecha: 'asc' }, // cronológico para que funcione como libro
      include: {
        creadoPor: { select: { nombre: true, apellido: true } }
      }
    });

    return NextResponse.json(compras);
  } catch (error: any) {
    console.error('Error obteniendo registros de compras:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
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

    const {
      fecha,
      descripcion,
      factura,
      exenta,
      gravada,
      isv15,
      total
    } = body;

    if (!descripcion || !fecha) {
      return NextResponse.json({ error: 'Fecha y descripción son obligatorios' }, { status: 400 });
    }

    const nuevaCompra = await prisma.registroCompra.create({
      data: {
        organizationId: orgId,
        fecha: new Date(fecha),
        descripcion,
        factura: factura || null,
        exenta: Number(exenta || 0),
        gravada: Number(gravada || 0),
        isv15: Number(isv15 || 0),
        total: Number(total || 0),
        creadoPorId: dbUser.id
      }
    });

    return NextResponse.json({ success: true, compra: nuevaCompra });
  } catch (error: any) {
    console.error('Error guardando registro de compra:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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
