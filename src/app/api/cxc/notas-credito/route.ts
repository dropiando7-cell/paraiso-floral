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
      facturaId,
      monto,
      motivo = 'FLOR_DANADA',
      descripcion,
      fotos
    } = body;

    const montoNum = Number(monto);
    if (!clienteId || isNaN(montoNum) || montoNum <= 0 || !descripcion?.trim()) {
      return NextResponse.json({ error: 'Cliente, descripción y un monto válido son obligatorios' }, { status: 400 });
    }

    // Verificar cliente
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, organizationId: orgId }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Generar correlativo (ej: NC-00045)
    const countNC = await prisma.notaCreditoCliente.count({
      where: { organizationId: orgId }
    });
    const correlativo = `NC-${String(countNC + 1).padStart(5, '0')}`;

    // Crear la Nota de Crédito
    const nuevaNC = await prisma.notaCreditoCliente.create({
      data: {
        organizationId: orgId,
        clienteId,
        facturaId: facturaId || null,
        correlativo,
        monto: montoNum,
        motivo,
        descripcion,
        fotos: fotos || [],
        creadoPorId: dbUser.id
      }
    });

    // Descontar del saldo de la factura si fue elegida explícitamente
    if (facturaId) {
      const fac = await prisma.factura.findUnique({ where: { id: facturaId } });
      if (fac) {
        const saldoActual = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : Number(fac.total);
        const nuevoSaldo = Math.max(0, saldoActual - montoNum);
        const nuevoEstado = nuevoSaldo === 0 ? 'PAGADA' : 'PARCIAL';

        await prisma.factura.update({
          where: { id: fac.id },
          data: {
            saldoPendiente: nuevoSaldo,
            estadoPago: nuevoEstado
          }
        });
      }
    } else {
      // Aplicación FIFO automática si no se especificó factura
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

      let saldoDisponible = montoNum;

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

        saldoDisponible -= montoAplicar;
      }
    }

    return NextResponse.json({
      success: true,
      notaCredito: nuevaNC
    });
  } catch (error: any) {
    console.error('Error emitiendo nota de crédito:', error);
    return NextResponse.json({ error: 'Error emitiendo nota de crédito' }, { status: 500 });
  }
}
