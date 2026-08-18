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
    const query = searchParams.get('q') || '';
    const filtro = searchParams.get('filtro') || 'TODOS'; // TODOS, CON_SALDO, AL_DIA, POR_VENCER, VENCIDO, RIESGO

    // Obtener clientes de la organización
    let whereCliente: any = { organizationId: orgId };
    if (query.trim()) {
      whereCliente.OR = [
        { nombre: { contains: query.trim(), mode: 'insensitive' } },
        { telefono: { contains: query.trim(), mode: 'insensitive' } },
        { rtn: { contains: query.trim(), mode: 'insensitive' } }
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where: whereCliente,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
        direccion: true,
        limiteCredito: true,
        saldoInicial: true,
        diasCredito: true,
        facturas: {
          where: {
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
          },
          select: {
            id: true,
            correlativo: true,
            total: true,
            saldoPendiente: true,
            estadoPago: true,
            fechaEmision: true,
            fechaVencimiento: true
          },
          orderBy: { fechaEmision: 'desc' }
        },
        pagos: {
          where: { anulado: false },
          select: { id: true, monto: true, fecha: true }
        },
        notasCredito: {
          where: { anulado: false },
          select: { monto: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const now = new Date();

    const resultado = clientes.map(c => {
      const sInicial = Number(c.saldoInicial || 0);
      const totalAbonado = c.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      const totalNotasCredito = c.notasCredito.reduce((sum, n) => sum + Number(n.monto), 0);

      let totalFacturado = sInicial;
      let saldoVencido = 0;
      let maxDiasMora = 0;

      c.facturas.forEach(f => {
        const totalFactura = Number(f.total || 0);
        const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : totalFactura;
        totalFacturado += totalFactura;

        if (f.estadoPago === 'PAGADA' || saldo <= 0) return;

        const diffTime = Math.abs(now.getTime() - new Date(f.fechaEmision).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > maxDiasMora) {
          maxDiasMora = diffDays;
        }

        if (diffDays > 15) {
          saldoVencido += saldo;
        }
      });

      const saldoTotal = totalFacturado - totalAbonado - totalNotasCredito;

      let facturasPendientesCount = c.facturas.filter(f => {
        const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : Number(f.total);
        return f.estadoPago !== 'PAGADA' && saldo > 0;
      }).length;

      if (sInicial > 0 && saldoTotal > 0) {
        facturasPendientesCount++;
      }

      const sortedPagos = [...c.pagos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const ultimoPago = sortedPagos[0] || null;

      return {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        email: c.email,
        direccion: c.direccion,
        limiteCredito: Number(c.limiteCredito || 0),
        saldoInicial: sInicial,
        diasCredito: c.diasCredito || 15,
        saldoTotal,
        saldoVencido,
        facturasPendientesCount,
        maxDiasMora,
        ultimoPago: ultimoPago ? {
          monto: Number(ultimoPago.monto),
          fecha: ultimoPago.fecha
        } : null
      };
    });

    // Aplicar filtro de saldo / antigüedad
    let resultadoFiltrado = resultado;
    if (filtro === 'CON_SALDO') {
      resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0);
    } else if (filtro === 'AL_DIA') {
      resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora <= 7);
    } else if (filtro === 'POR_VENCER') {
      resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora > 7 && c.maxDiasMora <= 15);
    } else if (filtro === 'VENCIDO') {
      resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora > 15 && c.maxDiasMora <= 30);
    } else if (filtro === 'RIESGO') {
      resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora > 30);
    }

    // Ordenar de mayor saldo pendiente a menor
    resultadoFiltrado.sort((a, b) => b.saldoTotal - a.saldoTotal);

    return NextResponse.json(resultadoFiltrado);
  } catch (error: any) {
    console.error('Error en /api/cxc/clientes:', error);
    return NextResponse.json({ error: 'Error cargando lista de cuentas por cobrar' }, { status: 500 });
  }
}
