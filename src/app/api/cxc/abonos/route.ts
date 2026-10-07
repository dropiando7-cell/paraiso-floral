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

    // Crear el registro del Pago
    const nuevoPago = await prisma.pagoCliente.create({
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

    // Aplicar a facturas
    if (Array.isArray(facturasSeleccionadas) && facturasSeleccionadas.length > 0) {
      // Aplicación manual a facturas específicas
      for (const item of facturasSeleccionadas) {
        const montoAplicar = Number(item.montoAplicado);
        if (montoAplicar <= 0) continue;

        const fac = await prisma.factura.findUnique({
          where: { id: item.facturaId }
        });
        if (!fac) continue;

        const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : Number(fac.total);
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
            pagoId: nuevoPago.id,
            facturaId: fac.id,
            montoAplicado: montoAplicar
          }
        });
      }
    } else {
      // Descontar primero del Saldo Inicial Deuda (Excel) si existe, pero manteniéndolo estático en DB
      const clienteData = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { saldoInicial: true }
      });

      let saldoDisponible = montoNum;

      if (clienteData && Number(clienteData.saldoInicial || 0) > 0) {
        // Calcular cuánto del saldoInicial ya fue pagado en abonos anteriores
        const totalPastPagos = await prisma.pagoCliente.aggregate({
          where: { clienteId, organizationId: orgId, anulado: false, id: { not: nuevoPago.id } },
          _sum: { monto: true }
        });
        const sumPastPagos = Number(totalPastPagos._sum.monto || 0);

        const totalPastAllocations = await prisma.pagoDetalleFactura.aggregate({
          where: {
            pago: { clienteId, organizationId: orgId, anulado: false, id: { not: nuevoPago.id } }
          },
          _sum: { montoAplicado: true }
        });
        const sumPastAllocations = Number(totalPastAllocations._sum.montoAplicado || 0);

        const pastAppliedToSInicial = Math.max(0, sumPastPagos - sumPastAllocations);
        const sInicialOriginal = Number(clienteData.saldoInicial);
        const sInicialActual = Math.max(0, sInicialOriginal - pastAppliedToSInicial);

        const deduccion = Math.min(saldoDisponible, sInicialActual);
        saldoDisponible -= deduccion;
      }

      // Aplicación FIFO automática a facturas más antiguas no pagadas
      const facturasPendientes = await prisma.factura.findMany({
        where: {
          organizationId: orgId,
          clienteId,
          estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
          OR: [
            { estadoPago: { not: 'PAGADA' } },
            { estadoPago: null }
          ]
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
            pagoId: nuevoPago.id,
            facturaId: fac.id,
            montoAplicado: montoAplicar
          }
        });

        saldoDisponible -= montoAplicar;
      }
    }

    return NextResponse.json({
      success: true,
      pago: nuevoPago
    });
  } catch (error: any) {
    console.error('Error registrando abono:', error);
    return NextResponse.json({ error: 'Error registrando abono de cliente' }, { status: 500 });
  }
}
