import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

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
      clienteId,
      monto,
      metodoPago = 'TRANSFERENCIA',
      banco,
      referencia,
      notas,
      comprobanteUrl,
      facturas: facturasSeleccionadas
    } = body;

    const montoNum = Number(monto);
    if (!clienteId || isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Cliente y un monto mayor a 0 son obligatorios' }, { status: 400 });
    }

    // Verificar cliente
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, organizationId: orgId }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Generar correlativo de pago (ej: AB-00123)
    const countPagos = await prisma.pagoCliente.count({
      where: { organizationId: orgId }
    });
    const correlativo = `AB-${String(countPagos + 1).padStart(5, '0')}`;

    // Buscar sesión activa de caja para este abono
    const activeSession = await prisma.corteCajaSession.findFirst({
      where: {
        organizationId: orgId,
        estado: 'ABIERTA'
      },
      select: { id: true }
    });

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const nuevoPago = await prisma.$transaction(async (tx) => {
      // Crear el registro del Pago
      const pagoCreado = await tx.pagoCliente.create({
        data: {
          organizationId: orgId,
          clienteId,
          correlativo,
          monto: montoNum,
          metodoPago,
          banco,
          referencia,
          notas,
          comprobanteUrl,
          creadoPorId: dbUser.id,
          cajaSessionId: activeSession?.id
        }
      });

      let saldoDisponible = montoNum;

      // 1. Aplicación manual a facturas REALES seleccionadas (ignora "SALDO INICIAL EXCEL"
      //    u otros ids que no sean facturas; ese monto sigue el flujo automático de abajo)
      if (Array.isArray(facturasSeleccionadas) && facturasSeleccionadas.length > 0) {
        for (const item of facturasSeleccionadas) {
          if (saldoDisponible <= 0) break;
          const facturaId = String(item?.facturaId || '');
          if (!UUID_RE.test(facturaId)) continue;

          const pedido = Number(item.montoAplicado);
          if (!(pedido > 0)) continue;

          const fac = await tx.factura.findFirst({
            where: { id: facturaId, clienteId, organizationId: orgId }
          });
          if (!fac) continue;

          const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : Number(fac.total);
          if (saldoActual <= 0) continue;

          const montoAplicar = Math.min(pedido, saldoActual, saldoDisponible);
          const nuevoSaldo = Math.max(0, saldoActual - montoAplicar);

          await tx.factura.update({
            where: { id: fac.id },
            data: {
              saldoPendiente: nuevoSaldo,
              estadoPago: nuevoSaldo <= 0 ? 'PAGADA' : 'PARCIAL'
            }
          });

          await tx.pagoDetalleFactura.create({
            data: { pagoId: pagoCreado.id, facturaId: fac.id, montoAplicado: montoAplicar }
          });

          saldoDisponible -= montoAplicar;
        }
      }

      // 2. Lo que quede: primero Saldo Inicial Excel (estático en DB), luego FIFO
      if (saldoDisponible > 0) {
        const clienteData = await tx.cliente.findUnique({
          where: { id: clienteId },
          select: { saldoInicial: true }
        });

        if (clienteData && Number(clienteData.saldoInicial || 0) > 0) {
          const totalPastPagos = await tx.pagoCliente.aggregate({
            where: { clienteId, organizationId: orgId, anulado: false, id: { not: pagoCreado.id } },
            _sum: { monto: true }
          });
          const totalPastAllocations = await tx.pagoDetalleFactura.aggregate({
            where: { pago: { clienteId, organizationId: orgId, anulado: false, id: { not: pagoCreado.id } } },
            _sum: { montoAplicado: true }
          });
          const pastAppliedToSInicial = Math.max(
            0,
            Number(totalPastPagos._sum.monto || 0) - Number(totalPastAllocations._sum.montoAplicado || 0)
          );
          const sInicialActual = Math.max(0, Number(clienteData.saldoInicial) - pastAppliedToSInicial);
          saldoDisponible -= Math.min(saldoDisponible, sInicialActual);
        }

        if (saldoDisponible > 0) {
          const facturasPendientes = await tx.factura.findMany({
            where: {
              organizationId: orgId,
              clienteId,
              estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
              tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] },
              OR: [{ estadoPago: { not: 'PAGADA' } }, { estadoPago: null }]
            },
            orderBy: { fechaEmision: 'asc' }
          });

          for (const fac of facturasPendientes) {
            if (saldoDisponible <= 0) break;
            const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : Number(fac.total);
            if (saldoActual <= 0) continue;

            const montoAplicar = Math.min(saldoDisponible, saldoActual);
            const nuevoSaldo = Math.max(0, saldoActual - montoAplicar);

            await tx.factura.update({
              where: { id: fac.id },
              data: {
                saldoPendiente: nuevoSaldo,
                estadoPago: nuevoSaldo <= 0 ? 'PAGADA' : 'PARCIAL'
              }
            });

            await tx.pagoDetalleFactura.create({
              data: { pagoId: pagoCreado.id, facturaId: fac.id, montoAplicado: montoAplicar }
            });

            saldoDisponible -= montoAplicar;
          }
        }
      }

      return pagoCreado;
    });

    return NextResponse.json({
      success: true,
      pago: nuevoPago
    });
  } catch (error: any) {
    console.error('Error registrando abono:', error);
    return NextResponse.json({ error: 'Error registrando abono de cliente' }, { status: 500 });
  }
}
