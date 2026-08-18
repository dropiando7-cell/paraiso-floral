import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

// PATCH /api/cxc/abonos/[id] - Editar Abono existente
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pagoId } = await context.params;

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

    const { monto, fecha, metodoPago, banco, referencia, notas } = body;

    const pago = await prisma.pagoCliente.findFirst({
      where: { id: pagoId, organizationId: orgId },
      include: { detalles: true }
    });

    if (!pago) {
      return NextResponse.json({ error: 'Abono no encontrado' }, { status: 404 });
    }

    if (pago.anulado) {
      return NextResponse.json({ error: 'No se puede editar un abono anulado' }, { status: 400 });
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // 1. Revertir aplicación previa en facturas
    for (const det of pago.detalles) {
      const fac = await prisma.factura.findUnique({ where: { id: det.facturaId } });
      if (fac) {
        const total = Number(fac.total);
        const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : total;
        const nuevoSaldo = Math.min(total, saldoActual + Number(det.montoAplicado));
        const nuevoEstado = nuevoSaldo >= total ? 'PENDIENTE' : 'PARCIAL';

        await prisma.factura.update({
          where: { id: fac.id },
          data: {
            saldoPendiente: nuevoSaldo,
            estadoPago: nuevoEstado
          }
        });
      }
    }

    // Eliminar detalles previos
    await prisma.pagoDetalleFactura.deleteMany({ where: { pagoId } });

    // 2. Actualizar datos del pago
    const fechaObj = fecha ? new Date(fecha) : pago.fecha;

    const pagoActualizado = await prisma.pagoCliente.update({
      where: { id: pagoId },
      data: {
        monto: montoNum,
        fecha: fechaObj,
        metodoPago: metodoPago || pago.metodoPago,
        banco: banco !== undefined ? banco : pago.banco,
        referencia: referencia !== undefined ? referencia : pago.referencia,
        notas: notas !== undefined ? notas : pago.notas
      }
    });

    // 3. Re-aplicar nuevo monto mediante FIFO a facturas del cliente
    let saldoDisponible = montoNum;

    // Descontar primero de Saldo Inicial Excel si existe
    const clienteData = await prisma.cliente.findUnique({
      where: { id: pago.clienteId },
      select: { saldoInicial: true }
    });

    if (clienteData && Number(clienteData.saldoInicial || 0) > 0) {
      const sInicialActual = Number(clienteData.saldoInicial);
      const deduccion = Math.min(saldoDisponible, sInicialActual);
      const nuevoSInicial = Math.max(0, sInicialActual - deduccion);

      await prisma.cliente.update({
        where: { id: pago.clienteId },
        data: { saldoInicial: nuevoSInicial }
      });

      saldoDisponible -= deduccion;
    }

    // Re-aplicar a facturas pendientes
    const facturasPendientes = await prisma.factura.findMany({
      where: {
        organizationId: orgId,
        clienteId: pago.clienteId,
        estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
        OR: [{ estadoPago: { not: 'PAGADA' } }, { estadoPago: null }]
      },
      orderBy: { fechaEmision: 'asc' }
    });

    for (const fac of facturasPendientes) {
      if (saldoDisponible <= 0) break;

      const totalFac = Number(fac.total);
      const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : totalFac;

      if (saldoActual <= 0) continue;

      const montoAplicar = Math.min(saldoDisponible, saldoActual);
      const nuevoSaldo = Math.max(0, saldoActual - montoAplicar);
      const nuevoEstado = nuevoSaldo === 0 ? 'PAGADA' : 'PARCIAL';

      await prisma.factura.update({
        where: { id: fac.id },
        data: {
          saldoPendiente: nuevoSaldo,
          estadoPago: nuevoEstado
        }
      });

      await prisma.pagoDetalleFactura.create({
        data: {
          pagoId,
          facturaId: fac.id,
          montoAplicado: montoAplicar
        }
      });

      saldoDisponible -= montoAplicar;
    }

    return NextResponse.json({ success: true, pago: pagoActualizado });
  } catch (error: any) {
    console.error('Error al editar abono:', error);
    return NextResponse.json({ error: error.message || 'Error al editar abono' }, { status: 500 });
  }
}

// DELETE /api/cxc/abonos/[id] - Anular Abono
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pagoId } = await context.params;

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

    const pago = await prisma.pagoCliente.findFirst({
      where: { id: pagoId, organizationId: orgId },
      include: { detalles: true }
    });

    if (!pago) {
      return NextResponse.json({ error: 'Abono no encontrado' }, { status: 404 });
    }

    if (pago.anulado) {
      return NextResponse.json({ error: 'Este abono ya ha sido anulado' }, { status: 400 });
    }

    // 1. Revertir aplicación en facturas
    for (const det of pago.detalles) {
      const fac = await prisma.factura.findUnique({ where: { id: det.facturaId } });
      if (fac) {
        const total = Number(fac.total);
        const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : total;
        const nuevoSaldo = Math.min(total, saldoActual + Number(det.montoAplicado));
        const nuevoEstado = nuevoSaldo >= total ? 'PENDIENTE' : 'PARCIAL';

        await prisma.factura.update({
          where: { id: fac.id },
          data: {
            saldoPendiente: nuevoSaldo,
            estadoPago: nuevoEstado
          }
        });
      }
    }

    // 2. Marcar como anulado
    const pagoAnulado = await prisma.pagoCliente.update({
      where: { id: pagoId },
      data: {
        anulado: true,
        anuladoAt: new Date()
      }
    });

    return NextResponse.json({ success: true, pago: pagoAnulado });
  } catch (error: any) {
    console.error('Error al anular abono:', error);
    return NextResponse.json({ error: error.message || 'Error al anular abono' }, { status: 500 });
  }
}
