import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { extractExcedenteMonedero } from '@/utils/facturaUtils';

function stripMonederoTagFromNotas(notas?: string | null): string {
  if (!notas) return '';
  return String(notas)
    .replace(/\s*·?\s*Excedente a Saldo a Favor:\s*L\.\s*[\d.,]+\s*\[MONEDERO:\+[\d.]+\]/gi, '')
    .replace(/\s*\[MONEDERO:\+[\d.]+\]/gi, '')
    .trim();
}

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

    const pagoActualizado = await prisma.$transaction(async (tx) => {
      // 1. Revertir aplicación previa en facturas
      for (const det of pago.detalles) {
        const fac = await tx.factura.findUnique({ where: { id: det.facturaId } });
        if (fac) {
          const total = Number(fac.total);
          const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : total;
          const nuevoSaldo = Math.min(total, saldoActual + Number(det.montoAplicado));
          const nuevoEstado = nuevoSaldo >= total ? 'PENDIENTE' : 'PARCIAL';

          await tx.factura.update({
            where: { id: fac.id },
            data: {
              saldoPendiente: nuevoSaldo,
              estadoPago: nuevoEstado
            }
          });
        }
      }

      // Eliminar detalles previos de este abono
      await tx.pagoDetalleFactura.deleteMany({ where: { pagoId } });

      // Si el abono original había generado excedente al Monedero, revertirlo antes de recalcular
      const excedentePrevio = extractExcedenteMonedero(pago.notas);
      if (excedentePrevio > 0) {
        const cliPrev = await tx.cliente.findUnique({
          where: { id: pago.clienteId },
          select: { saldoFavor: true }
        });
        const saldoFavorAct = Number(cliPrev?.saldoFavor || 0);
        const nuevoSaldoRev = Math.max(0, Number((saldoFavorAct - excedentePrevio).toFixed(2)));
        await tx.cliente.update({
          where: { id: pago.clienteId },
          data: { saldoFavor: nuevoSaldoRev }
        });
      }

      // 2. Actualizar datos del pago
      const fechaObj = fecha ? new Date(fecha) : pago.fecha;
      const notasBase = stripMonederoTagFromNotas(notas !== undefined ? notas : pago.notas);

      const actualizado = await tx.pagoCliente.update({
        where: { id: pagoId },
        data: {
          monto: montoNum,
          fecha: fechaObj,
          metodoPago: metodoPago || pago.metodoPago,
          banco: banco !== undefined ? banco : pago.banco,
          referencia: referencia !== undefined ? referencia : pago.referencia,
          notas: notasBase || null
        }
      });

      // 3. Re-aplicar el nuevo monto (misma lógica que al registrar un abono)
      let saldoDisponible = montoNum;

      // 3a. Saldo Inicial Excel: se mantiene ESTÁTICO en DB. Solo se calcula cuánto
      //     queda pendiente según los abonos anteriores NO asignados a facturas.
      const clienteData = await tx.cliente.findUnique({
        where: { id: pago.clienteId },
        select: { saldoInicial: true, saldoFavor: true, nombre: true }
      });
      const sInicialOriginal = Number(clienteData?.saldoInicial || 0);

      if (sInicialOriginal > 0) {
        const otrosPagosList = await tx.pagoCliente.findMany({
          where: { clienteId: pago.clienteId, organizationId: orgId, anulado: false, id: { not: pagoId } },
          select: { monto: true, notas: true }
        });
        const totalOtrosPagosNeto = otrosPagosList.reduce(
          (acc, p) => acc + Math.max(0, Number(p.monto || 0) - extractExcedenteMonedero(p.notas)),
          0
        );
        const totalOtrasAsignaciones = await tx.pagoDetalleFactura.aggregate({
          where: { pago: { clienteId: pago.clienteId, organizationId: orgId, anulado: false, id: { not: pagoId } } },
          _sum: { montoAplicado: true }
        });
        const yaAplicadoASInicial = Math.max(
          0,
          totalOtrosPagosNeto - Number(totalOtrasAsignaciones._sum.montoAplicado || 0)
        );
        const sInicialPendiente = Math.max(0, sInicialOriginal - yaAplicadoASInicial);
        saldoDisponible -= Math.min(saldoDisponible, sInicialPendiente);
      }

      // 3b. Re-aplicar a facturas pendientes (FIFO, más antiguas primero)
      const facturasPendientes = await tx.factura.findMany({
        where: {
          organizationId: orgId,
          clienteId: pago.clienteId,
          estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
          tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] },
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

        await tx.factura.update({
          where: { id: fac.id },
          data: {
            saldoPendiente: nuevoSaldo,
            estadoPago: nuevoEstado
          }
        });

        await tx.pagoDetalleFactura.create({
          data: {
            pagoId,
            facturaId: fac.id,
            montoAplicado: montoAplicar
          }
        });

        saldoDisponible -= montoAplicar;
      }

      // 3c. Si queda excedente en el nuevo monto, sumarlo al Monedero Virtual (saldoFavor)
      const nuevoExcedente = Number(saldoDisponible.toFixed(2));
      if (nuevoExcedente >= 0.01) {
        const cliAct = await tx.cliente.findUnique({
          where: { id: pago.clienteId },
          select: { saldoFavor: true, nombre: true }
        });
        const sAnt = Number(cliAct?.saldoFavor || 0);
        const sNuevo = Number((sAnt + nuevoExcedente).toFixed(2));
        await tx.cliente.update({
          where: { id: pago.clienteId },
          data: { saldoFavor: sNuevo }
        });
        const tagEx = `Excedente a Saldo a Favor: L. ${nuevoExcedente.toFixed(2)} [MONEDERO:+${nuevoExcedente.toFixed(2)}]`;
        const notasConTag = notasBase ? `${notasBase} · ${tagEx}` : tagEx;
        await tx.pagoCliente.update({
          where: { id: pagoId },
          data: { notas: notasConTag }
        });
        actualizado.notas = notasConTag;
      }

      // 4. Bitácora de auditoría
      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId: dbUser.id,
          action: 'UPDATE',
          module: '/cxc/abonos',
          description: `Abono ${pago.correlativo || pago.id} editado: L. ${Number(pago.monto).toFixed(2)} → L. ${montoNum.toFixed(2)}`,
          metadata: {
            pagoId,
            clienteId: pago.clienteId,
            montoAnterior: Number(pago.monto),
            montoNuevo: montoNum,
            fechaAnterior: pago.fecha,
            metodoPagoAnterior: pago.metodoPago
          }
        }
      });

      return actualizado;
    });

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
      select: { id: true, organizationId: true, nombre: true, apellido: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;

    let motivo = '';
    try {
      const body = await request.json();
      motivo = String(body?.motivo || '').trim();
    } catch { /* sin cuerpo */ }
    if (!motivo) {
      return NextResponse.json({ error: 'Debes indicar el motivo de la anulación.' }, { status: 400 });
    }

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

    const pagoAnulado = await prisma.$transaction(async (tx) => {
      // 1. Revertir aplicación en facturas
      for (const det of pago.detalles) {
        const fac = await tx.factura.findUnique({ where: { id: det.facturaId } });
        if (fac) {
          const total = Number(fac.total);
          const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : total;
          const nuevoSaldo = Math.min(total, saldoActual + Number(det.montoAplicado));
          const nuevoEstado = nuevoSaldo >= total ? 'PENDIENTE' : 'PARCIAL';

          await tx.factura.update({
            where: { id: fac.id },
            data: {
              saldoPendiente: nuevoSaldo,
              estadoPago: nuevoEstado
            }
          });
        }
      }

      // 1.5 Si el abono había enviado un excedente al Monedero Virtual, revertirlo
      const excedenteAnulado = extractExcedenteMonedero(pago.notas);
      if (excedenteAnulado > 0) {
        const cliAnul = await tx.cliente.findUnique({
          where: { id: pago.clienteId },
          select: { saldoFavor: true, nombre: true }
        });
        const saldoAnt = Number(cliAnul?.saldoFavor || 0);
        const saldoNuevo = Math.max(0, Number((saldoAnt - excedenteAnulado).toFixed(2)));
        await tx.cliente.update({
          where: { id: pago.clienteId },
          data: { saldoFavor: saldoNuevo }
        });
        await tx.activityLog.create({
          data: {
            organizationId: orgId,
            userId: dbUser.id,
            action: 'MONEDERO_CARGO',
            module: '/cxc/monedero',
            description: `Reversión de L. ${excedenteAnulado.toFixed(2)} de Saldo a Favor por anulación de Abono ${pago.correlativo || pago.id}`,
            metadata: {
              clienteId: pago.clienteId,
              monto: -excedenteAnulado,
              saldoAnterior: saldoAnt,
              saldoNuevo,
              motivo: `Anulación de Abono ${pago.correlativo || pago.id}: ${motivo}`,
              usuario: [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ')
            }
          }
        });
      }

      // 2. Marcar como anulado (borrado lógico con trazabilidad)
      const anulado = await tx.pagoCliente.update({
        where: { id: pagoId },
        data: {
          anulado: true,
          anuladoAt: new Date(),
          anuladoPorId: dbUser.id,
          motivoAnulacion: motivo
        }
      });

      // 3. Bitácora de auditoría
      await tx.activityLog.create({
        data: {
          organizationId: orgId,
          userId: dbUser.id,
          action: 'ANULAR',
          module: '/cxc/abonos',
          description: `Abono ${pago.correlativo || pago.id} de L. ${Number(pago.monto).toFixed(2)} anulado. Motivo: ${motivo}`,
          metadata: {
            pagoId,
            clienteId: pago.clienteId,
            correlativo: pago.correlativo,
            monto: Number(pago.monto),
            metodoPago: pago.metodoPago,
            motivo,
            usuario: [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ')
          }
        }
      });

      return anulado;
    });

    return NextResponse.json({ success: true, pago: pagoAnulado });
  } catch (error: any) {
    console.error('Error al anular abono:', error);
    return NextResponse.json({ error: error.message || 'Error al anular abono' }, { status: 500 });
  }
}
