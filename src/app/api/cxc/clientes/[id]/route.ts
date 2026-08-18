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
            detalles: true
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

    // Calcular consolidados
    const sInicial = Number(cliente.saldoInicial || 0);
    let saldoTotal = sInicial;
    let totalFacturado = sInicial;

    const listadoFacturas = cliente.facturas.map(f => {
      const total = Number(f.total || 0);
      const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : total;
      totalFacturado += total;
      if (f.estadoPago !== 'PAGADA' && saldo > 0) {
        saldoTotal += saldo;
      }
      return {
        ...f,
        total,
        saldoPendiente: saldo
      };
    });

    const facturasProcesadas = [
      ...(sInicial > 0 ? [{
        id: 'saldo-inicial-excel',
        correlativo: 'SALDO INICIAL EXCEL',
        tipoDocumento: 'SALDO_INICIAL',
        fechaEmision: cliente.createdAt,
        fechaVencimiento: null,
        total: sInicial,
        saldoPendiente: sInicial,
        estadoPago: 'PENDIENTE',
        detalles: []
      }] : []),
      ...listadoFacturas
    ];

    const totalAbonado = cliente.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const totalNotasCredito = cliente.notasCredito.reduce((sum, n) => sum + Number(n.monto), 0);

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
