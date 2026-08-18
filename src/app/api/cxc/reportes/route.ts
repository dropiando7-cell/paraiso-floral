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
      select: { organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId') || 'TODOS';
    const fechaInicioStr = searchParams.get('fechaInicio') || '';
    const fechaFinStr = searchParams.get('fechaFin') || '';
    const estado = searchParams.get('estado') || 'TODOS'; // TODOS, PENDIENTE, VENCIDO, PAGADA, AL_DIA

    let start = fechaInicioStr ? new Date(fechaInicioStr + 'T00:00:00') : null;
    let end = fechaFinStr ? new Date(fechaFinStr + 'T23:59:59') : null;

    // Get clients of the organization
    const whereClient: any = { organizationId: orgId };
    if (clienteId !== 'TODOS') {
      whereClient.id = clienteId;
    }
    const targetClients = await prisma.cliente.findMany({
      where: whereClient,
      select: {
        id: true,
        nombre: true,
        saldoInicial: true,
        createdAt: true
      },
      orderBy: { nombre: 'asc' }
    });

    // 1. Calculate Opening Balance before `start`
    let totalInvoicesBefore = 0;
    let totalPaymentsBefore = 0;
    let totalCreditNotesBefore = 0;

    if (start) {
      const invoicesBefore = await prisma.factura.aggregate({
        where: {
          organizationId: orgId,
          ...(clienteId !== 'TODOS' ? { clienteId } : {}),
          fechaEmision: { lt: start },
          estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
        },
        _sum: { total: true }
      });
      totalInvoicesBefore = Number(invoicesBefore._sum.total || 0);

      const paymentsBefore = await prisma.pagoCliente.aggregate({
        where: {
          organizationId: orgId,
          ...(clienteId !== 'TODOS' ? { clienteId } : {}),
          fecha: { lt: start },
          anulado: false
        },
        _sum: { monto: true }
      });
      totalPaymentsBefore = Number(paymentsBefore._sum.monto || 0);

      const creditNotesBefore = await prisma.notaCreditoCliente.aggregate({
        where: {
          organizationId: orgId,
          ...(clienteId !== 'TODOS' ? { clienteId } : {}),
          fecha: { lt: start },
          anulado: false
        },
        _sum: { monto: true }
      });
      totalCreditNotesBefore = Number(creditNotesBefore._sum.monto || 0);
    }

    const totalExcelSaldoInicial = targetClients.reduce((sum, c) => sum + Number(c.saldoInicial || 0), 0);
    const saldoAnterior = totalExcelSaldoInicial + totalInvoicesBefore - totalPaymentsBefore - totalCreditNotesBefore;

    // 2. Fetch Invoices in Period
    const whereInvoices: any = {
      organizationId: orgId,
      estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
    };
    if (clienteId !== 'TODOS') {
      whereInvoices.clienteId = clienteId;
    }
    if (start) {
      whereInvoices.fechaEmision = { ...whereInvoices.fechaEmision, gte: start };
    }
    if (end) {
      whereInvoices.fechaEmision = { ...whereInvoices.fechaEmision, lte: end };
    }

    const invoices = await prisma.factura.findMany({
      where: whereInvoices,
      include: {
        cliente: {
          select: { nombre: true }
        }
      },
      orderBy: { fechaEmision: 'asc' }
    });

    const filteredInvoices = invoices.map(f => {
      const totalVal = Number(f.total || 0);
      const saldoVal = f.saldoPendiente !== null ? Number(f.saldoPendiente) : totalVal;
      return {
        id: f.id,
        correlativo: f.correlativo,
        fechaEmision: f.fechaEmision,
        fechaVencimiento: f.fechaVencimiento,
        total: totalVal,
        saldoPendiente: saldoVal,
        estadoPago: f.estadoPago || 'PENDIENTE',
        clienteNombre: f.cliente.nombre,
        clienteId: f.clienteId
      };
    }).filter(f => {
      if (estado === 'TODOS') return true;
      if (estado === 'PENDIENTE') return f.saldoPendiente > 0 && f.estadoPago !== 'PAGADA';
      if (estado === 'PAGADA') return f.saldoPendiente <= 0 || f.estadoPago === 'PAGADA';
      
      const now = new Date();
      const isOverdue = f.fechaVencimiento ? new Date(f.fechaVencimiento).getTime() < now.getTime() : false;
      
      if (estado === 'VENCIDO') return f.saldoPendiente > 0 && isOverdue;
      if (estado === 'AL_DIA') return f.saldoPendiente > 0 && !isOverdue;
      return true;
    });

    // 3. Fetch Payments in Period
    const wherePayments: any = {
      organizationId: orgId,
      anulado: false
    };
    if (clienteId !== 'TODOS') {
      wherePayments.clienteId = clienteId;
    }
    if (start) {
      wherePayments.fecha = { ...wherePayments.fecha, gte: start };
    }
    if (end) {
      wherePayments.fecha = { ...wherePayments.fecha, lte: end };
    }

    const payments = await prisma.pagoCliente.findMany({
      where: wherePayments,
      include: {
        cliente: {
          select: { nombre: true }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    // 4. Fetch Credit Notes in Period
    const whereCreditNotes: any = {
      organizationId: orgId,
      anulado: false
    };
    if (clienteId !== 'TODOS') {
      whereCreditNotes.clienteId = clienteId;
    }
    if (start) {
      whereCreditNotes.fecha = { ...whereCreditNotes.fecha, gte: start };
    }
    if (end) {
      whereCreditNotes.fecha = { ...whereCreditNotes.fecha, lte: end };
    }

    const creditNotes = await prisma.notaCreditoCliente.findMany({
      where: whereCreditNotes,
      include: {
        cliente: {
          select: { nombre: true }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    // Calculate totals in the period
    const totalFacturado = filteredInvoices.reduce((sum, f) => sum + f.total, 0);
    const totalAbonado = payments.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalNotasCredito = creditNotes.reduce((sum, n) => sum + Number(n.monto || 0), 0);
    const saldoTotal = saldoAnterior + totalFacturado - totalAbonado - totalNotasCredito;

    // 5. Consolidated clients balance summary (only for TODOS)
    let clientesResumen: any[] = [];
    if (clienteId === 'TODOS') {
      clientesResumen = await Promise.all(targetClients.map(async (c) => {
        const sInit = Number(c.saldoInicial || 0);

        // Before period
        let invB = 0;
        let payB = 0;
        let ncB = 0;
        if (start) {
          const invBefore = await prisma.factura.aggregate({
            where: {
              clienteId: c.id,
              fechaEmision: { lt: start },
              estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
            },
            _sum: { total: true }
          });
          invB = Number(invBefore._sum.total || 0);

          const payBefore = await prisma.pagoCliente.aggregate({
            where: {
              clienteId: c.id,
              fecha: { lt: start },
              anulado: false
            },
            _sum: { monto: true }
          });
          payB = Number(payBefore._sum.monto || 0);

          const ncBefore = await prisma.notaCreditoCliente.aggregate({
            where: {
              clienteId: c.id,
              fecha: { lt: start },
              anulado: false
            },
            _sum: { monto: true }
          });
          ncB = Number(ncBefore._sum.monto || 0);
        }
        const sAnt = sInit + invB - payB - ncB;

        // In period
        const invPeriod = await prisma.factura.aggregate({
          where: {
            clienteId: c.id,
            fechaEmision: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            },
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
          },
          _sum: { total: true }
        });
        const invP = Number(invPeriod._sum.total || 0);

        const payPeriod = await prisma.pagoCliente.aggregate({
          where: {
            clienteId: c.id,
            fecha: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            },
            anulado: false
          },
          _sum: { monto: true }
        });
        const payP = Number(payPeriod._sum.monto || 0);

        const ncPeriod = await prisma.notaCreditoCliente.aggregate({
          where: {
            clienteId: c.id,
            fecha: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            },
            anulado: false
          },
          _sum: { monto: true }
        });
        const ncP = Number(ncPeriod._sum.monto || 0);

        const sFinal = sAnt + invP - payP - ncP;

        return {
          id: c.id,
          nombre: c.nombre,
          saldoAnterior: sAnt,
          facturado: invP,
          abonado: payP,
          notasCredito: ncP,
          saldoFinal: sFinal
        };
      }));
    }

    return NextResponse.json({
      resumen: {
        saldoAnterior,
        totalFacturado,
        totalAbonado,
        totalNotasCredito,
        saldoTotal
      },
      facturas: filteredInvoices,
      pagos: payments.map(p => ({
        id: p.id,
        correlativo: p.correlativo,
        monto: Number(p.monto),
        fecha: p.fecha,
        metodoPago: p.metodoPago,
        banco: p.banco,
        referencia: p.referencia,
        notas: p.notas,
        clienteNombre: p.cliente.nombre
      })),
      notasCredito: creditNotes.map(n => ({
        id: n.id,
        correlativo: n.correlativo,
        monto: Number(n.monto),
        fecha: n.fecha,
        motivo: n.motivo,
        descripcion: n.descripcion,
        clienteNombre: n.cliente.nombre
      })),
      clientesResumen: clientesResumen.filter(c => c.saldoAnterior !== 0 || c.facturado !== 0 || c.abonado !== 0 || c.notasCredito !== 0 || c.saldoFinal !== 0)
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Error generating report' }, { status: 500 });
  }
}
