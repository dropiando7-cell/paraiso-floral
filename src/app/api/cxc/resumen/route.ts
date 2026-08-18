import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
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
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all clients with their invoices, payments, and credit notes
    const clientes = await prisma.cliente.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        saldoInicial: true,
        facturas: {
          where: { estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] } },
          select: { total: true, saldoPendiente: true, estadoPago: true, fechaEmision: true }
        },
        pagos: {
          where: { anulado: false },
          select: { monto: true }
        },
        notasCredito: {
          where: { anulado: false },
          select: { monto: true }
        }
      }
    });

    // Abonos del mes actual (para cobradoEsteMes)
    const abonosMes = await prisma.pagoCliente.aggregate({
      where: {
        organizationId: orgId,
        anulado: false,
        fecha: { gte: firstDayOfMonth }
      },
      _sum: { monto: true }
    });

    let totalCartera = 0;
    let totalVencido = 0;
    let alDia = 0;
    let porVencer = 0;
    let vencido = 0;
    let enRiesgo = 0;
    let clientesMorososCount = 0;

    clientes.forEach(c => {
      const sInicial = Number(c.saldoInicial || 0);
      const totalAbonado = c.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      const totalNotasCredito = c.notasCredito.reduce((sum, n) => sum + Number(n.monto), 0);

      let totalFacturado = sInicial;
      c.facturas.forEach(f => {
        totalFacturado += Number(f.total || 0);
      });

      const saldoTotal = Math.max(0, totalFacturado - totalAbonado - totalNotasCredito);
      if (saldoTotal <= 0) return; // No debt

      totalCartera += saldoTotal;

      let debtToAllocate = saldoTotal;
      let hasOverdue = false;

      // Sort client's unpaid invoices by age (oldest first)
      const unpaidFacturas = c.facturas
        .filter(f => f.estadoPago !== 'PAGADA')
        .map(f => {
          const totalFactura = Number(f.total || 0);
          const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : totalFactura;
          const diffTime = Math.abs(now.getTime() - new Date(f.fechaEmision).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { saldo, diffDays };
        })
        .sort((a, b) => b.diffDays - a.diffDays);

      unpaidFacturas.forEach(f => {
        if (debtToAllocate <= 0) return;
        const allocated = Math.min(debtToAllocate, f.saldo);
        debtToAllocate -= allocated;

        if (f.diffDays <= 7) {
          alDia += allocated;
        } else if (f.diffDays <= 15) {
          porVencer += allocated;
        } else if (f.diffDays <= 30) {
          vencido += allocated;
          totalVencido += allocated;
          hasOverdue = true;
        } else {
          enRiesgo += allocated;
          totalVencido += allocated;
          hasOverdue = true;
        }
      });

      // Remaining debt represents unpaid initial Excel balance
      if (debtToAllocate > 0) {
        enRiesgo += debtToAllocate;
        totalVencido += debtToAllocate;
        hasOverdue = true;
      }

      if (hasOverdue) {
        clientesMorososCount++;
      }
    });

    return NextResponse.json({
      totalCartera,
      totalVencido,
      cobradoEsteMes: Number(abonosMes._sum.monto || 0),
      clientesMorososCount,
      antiguedad: {
        alDia,
        porVencer,
        vencido,
        enRiesgo
      }
    });
  } catch (error: any) {
    console.error('Error en /api/cxc/resumen:', error);
    return NextResponse.json({ error: 'Error calculando resumen de CxC' }, { status: 500 });
  }
}
