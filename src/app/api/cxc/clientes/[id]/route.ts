import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { calcularEstadoCuentaClienteCxC } from '@/utils/facturaUtils';

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
      select: { organizationId: true, role: true }
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
        organization: {
          select: {
            name: true,
            logoUrl: true,
            direccion: true,
            rtn: true,
            telefono: true,
            correoContacto: true,
            invoiceSettings: true
          }
        },
        facturas: {
          where: {
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
            tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] }
          },
          include: {
            detalles: true,
            pagosMixtos: true,
            subCliente: { select: { id: true, nombre: true, rtn: true } },
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

    const {
      sInicial,
      saldoInicialPendiente,
      totalFacturado,
      totalAbonado,
      totalNotasCredito,
      saldoTotal,
      mapaFacturasInfo
    } = calcularEstadoCuentaClienteCxC({
      saldoInicial: cliente.saldoInicial,
      facturas: cliente.facturas,
      pagos: cliente.pagos,
      notasCredito: cliente.notasCredito
    });

    const listadoFacturas = cliente.facturas.map(f => {
      const total = Number(f.total || 0);
      const info = mapaFacturasInfo[f.id] || {
        saldoPendiente: total,
        estadoPago: 'PENDIENTE',
        pagadoEnFacturacion: 0,
        cubiertoPorCxc: 0
      };
      return {
        ...f,
        total,
        saldoPendiente: info.saldoPendiente,
        estadoPago: info.estadoPago,
        pagadoEnFacturacion: info.pagadoEnFacturacion
      };
    });

    const facturasProcesadas = [
      ...(sInicial > 0 ? [{
        id: 'saldo-inicial-excel',
        correlativo: 'SALDO INICIAL EXCEL',
        tipoDocumento: 'SALDO_INICIAL',
        fechaEmision: cliente.fechaSaldoInicial || cliente.createdAt,
        fechaVencimiento: null,
        total: sInicial,
        saldoPendiente: saldoInicialPendiente,
        estadoPago: saldoInicialPendiente <= 0.01 ? 'PAGADA' : (saldoInicialPendiente < sInicial ? 'PARCIAL' : 'PENDIENTE'),
        detalles: []
      }] : []),
      ...listadoFacturas
    ];

    const logsMonedero = await prisma.activityLog.findMany({
      where: {
        organizationId: orgId,
        module: '/cxc/monedero',
        metadata: { path: ['clienteId'], equals: cliente.id }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }).catch(() => []);

    // Abonos anulados: solo para mostrarlos tachados (trazabilidad); NO afectan saldos
    const pagosAnuladosRaw = await prisma.pagoCliente.findMany({
      where: { clienteId: cliente.id, organizationId: orgId, anulado: true },
      include: {
        creadoPor: { select: { nombre: true, apellido: true } },
        anuladoPor: { select: { nombre: true, apellido: true } }
      },
      orderBy: { fecha: 'desc' }
    }).catch(() => [] as any[]);

    return NextResponse.json({
      esSuperAdmin: dbUser.role === 'SUPER_ADMIN',
      organization: cliente.organization,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        direccion: cliente.direccion,
        rtn: cliente.rtn,
        nombreContacto: cliente.nombreContacto,
        telefonoContacto: cliente.telefonoContacto,
        limiteCredito: Number(cliente.limiteCredito || 0),
        saldoInicial: sInicial,
        fechaSaldoInicial: cliente.fechaSaldoInicial,
        diasCredito: cliente.diasCredito || 15,
        saldoFavor: Number(cliente.saldoFavor || 0)
      },
      movimientosMonedero: logsMonedero.map(l => ({
        id: l.id,
        fecha: l.createdAt,
        ...((l.metadata as any) || {})
      })),
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
      })),
      pagosAnulados: pagosAnuladosRaw.map((p: any) => ({
        id: p.id,
        correlativo: p.correlativo,
        monto: Number(p.monto),
        fecha: p.fecha,
        metodoPago: p.metodoPago,
        banco: p.banco,
        referencia: p.referencia,
        anuladoAt: p.anuladoAt,
        motivoAnulacion: p.motivoAnulacion,
        creadoPor: p.creadoPor ? [p.creadoPor.nombre, p.creadoPor.apellido].filter(Boolean).join(' ') : null,
        anuladoPor: p.anuladoPor ? [p.anuladoPor.nombre, p.anuladoPor.apellido].filter(Boolean).join(' ') : null
      }))
    });
  } catch (error: any) {
    console.error('Error cargando estado de cuenta cliente:', error);
    return NextResponse.json({ error: 'Error cargando estado de cuenta' }, { status: 500 });
  }
}
