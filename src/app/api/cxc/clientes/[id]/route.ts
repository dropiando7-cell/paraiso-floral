import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await context.params;

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

    const cliente = await prisma.cliente.findFirst({
      where: {
        id: clienteId,
        organizationId: orgId
      },
      include: {
        facturas: {
          where: {
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
          },
          include: {
            detalles: true,
            creadoPor: { select: { nombre: true, apellido: true } }
          },
          orderBy: { fechaEmision: 'desc' }
        },
        pagos: {
          where: { anulado: false },
          include: {
            detalles: {
              include: {
                factura: {
                  select: { correlativo: true }
                }
              }
            },
            creadoPor: {
              select: { nombre: true, apellido: true }
            }
          },
          orderBy: { fecha: 'desc' }
        },
        notasCredito: {
          where: { anulado: false },
          include: {
            factura: {
              select: { correlativo: true }
            },
            creadoPor: {
              select: { nombre: true, apellido: true }
            }
          },
          orderBy: { fecha: 'desc' }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const totalAbonado = cliente.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const totalNotasCredito = cliente.notasCredito.reduce((sum, n) => sum + Number(n.monto), 0);

    const sInicial = Number(cliente.saldoInicial || 0);
    let totalFacturado = sInicial;

    // Calcular bolsa total de créditos aplicables (Abonos + Notas de Crédito por mermas)
    let creditoDisponible = totalAbonado + totalNotasCredito;

    if (sInicial > 0) {
      if (creditoDisponible >= sInicial) {
        creditoDisponible -= sInicial;
      } else {
        creditoDisponible = 0;
      }
    }

    // Ordenar facturas por fecha de emisión ascendente (antiguas primero) para cascarada FIFO
    const facturasAsc = [...cliente.facturas].sort(
      (a, b) => new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime()
    );

    const mapaFacturasInfo: Record<string, { saldoPendiente: number; estadoPago: string }> = {};

    for (const f of facturasAsc) {
      const total = Number(f.total || 0);

      // Pagos o mermas asociados directamente a esta factura
      const pagosDirectos = cliente.pagos.reduce((sum, p) => {
        const det = p.detalles.find(d => d.facturaId === f.id);
        return sum + (det ? Number(det.montoAplicado) : 0);
      }, 0);

      const ncDirectas = cliente.notasCredito.reduce((sum, nc) => {
        return sum + (nc.facturaId === f.id ? Number(nc.monto) : 0);
      }, 0);

      const cubiertoDirecto = pagosDirectos + ncDirectas;

      let saldo = total;
      let estadoPago = 'PENDIENTE';

      if (f.estado === 'PAGADA' || cubiertoDirecto >= total - 0.01) {
        saldo = 0;
        estadoPago = 'PAGADA';
      } else if (cubiertoDirecto > 0) {
        saldo = Math.max(0, total - cubiertoDirecto);
        estadoPago = 'PARCIAL';
      } else if (creditoDisponible >= total - 0.01) {
        creditoDisponible -= total;
        saldo = 0;
        estadoPago = 'PAGADA';
      } else if (creditoDisponible > 0) {
        saldo = Math.max(0, total - creditoDisponible);
        creditoDisponible = 0;
        estadoPago = 'PARCIAL';
      } else {
        saldo = total;
        estadoPago = 'PENDIENTE';
      }

      mapaFacturasInfo[f.id] = { saldoPendiente: saldo, estadoPago };
    }

    const listadoFacturas = cliente.facturas.map(f => {
      const total = Number(f.total || 0);
      totalFacturado += total;
      const info = mapaFacturasInfo[f.id] || { saldoPendiente: total, estadoPago: 'PENDIENTE' };
      return {
        ...f,
        total,
        saldoPendiente: info.saldoPendiente,
        estadoPago: info.estadoPago
      };
    });

    const saldoTotal = totalFacturado - totalAbonado - totalNotasCredito;

    const facturasProcesadas = [
      ...(sInicial > 0 ? [{
        id: 'saldo-inicial-excel',
        correlativo: 'SALDO INICIAL EXCEL',
        tipoDocumento: 'SALDO_INICIAL',
        fechaEmision: cliente.fechaSaldoInicial || cliente.createdAt,
        fechaVencimiento: null,
        total: sInicial,
        saldoPendiente: sInicial,
        estadoPago: 'PENDIENTE',
        detalles: []
      }] : []),
      ...listadoFacturas
    ];

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        direccion: cliente.direccion,
        rtn: cliente.rtn,
        limiteCredito: Number(cliente.limiteCredito || 0),
        saldoInicial: sInicial,
        fechaSaldoInicial: cliente.fechaSaldoInicial,
        diasCredito: cliente.diasCredito || 15
      },
      resumen: {
        saldoTotal,
        totalFacturado,
        totalAbonado,
        totalNotasCredito
      },
      facturas: facturasProcesadas,
      pagos: cliente.pagos.map(p => ({
        ...p,
        monto: Number(p.monto)
      })),
      notasCredito: cliente.notasCredito.map(n => ({
        ...n,
        monto: Number(n.monto)
      }))
    });
  } catch (error: any) {
    console.error('Error cargando estado de cuenta cliente:', error);
    return NextResponse.json({ error: 'Error cargando estado de cuenta' }, { status: 500 });
  }
}
