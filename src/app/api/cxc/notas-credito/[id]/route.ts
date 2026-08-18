import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

// PATCH /api/cxc/notas-credito/[id] - Editar Nota de Crédito / Merma
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ncId } = await context.params;

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

    const { monto, fecha, motivo, descripcion, notas } = body;

    const nc = await prisma.notaCreditoCliente.findFirst({
      where: { id: ncId, organizationId: orgId }
    });

    if (!nc) {
      return NextResponse.json({ error: 'Nota de crédito no encontrada' }, { status: 404 });
    }

    if (nc.anulado) {
      return NextResponse.json({ error: 'No se puede editar una nota de crédito anulada' }, { status: 400 });
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const fechaObj = fecha ? new Date(fecha) : nc.fecha;

    const ncActualizada = await prisma.notaCreditoCliente.update({
      where: { id: ncId },
      data: {
        monto: montoNum,
        fecha: fechaObj,
        motivo: motivo || nc.motivo,
        descripcion: descripcion !== undefined ? descripcion : nc.descripcion
      }
    });

    return NextResponse.json({ success: true, notaCredito: ncActualizada });
  } catch (error: any) {
    console.error('Error al editar nota de crédito:', error);
    return NextResponse.json({ error: error.message || 'Error al editar nota de crédito' }, { status: 500 });
  }
}

// DELETE /api/cxc/notas-credito/[id] - Anular Nota de Crédito / Merma
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ncId } = await context.params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;

    const nc = await prisma.notaCreditoCliente.findFirst({
      where: { id: ncId, organizationId: orgId }
    });

    if (!nc) {
      return NextResponse.json({ error: 'Nota de crédito no encontrada' }, { status: 404 });
    }

    if (nc.anulado) {
      return NextResponse.json({ error: 'Esta nota de crédito ya ha sido anulada' }, { status: 400 });
    }

    const ncAnulada = await prisma.notaCreditoCliente.update({
      where: { id: ncId },
      data: {
        anulado: true,
        anuladoAt: new Date()
      }
    });

    return NextResponse.json({ success: true, notaCredito: ncAnulada });
  } catch (error: any) {
    console.error('Error al anular nota de crédito:', error);
    return NextResponse.json({ error: error.message || 'Error al anular nota de crédito' }, { status: 500 });
  }
}
