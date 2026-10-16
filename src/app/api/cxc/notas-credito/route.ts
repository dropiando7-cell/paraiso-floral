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
      fotos,
      fecha
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

    // Resolver fecha en zona horaria de Honduras (America/Tegucigalpa, UTC-6)
    // Si la fecha elegida es el día de hoy en Honduras, usar el timestamp actual exacto
    // para que aparezca al final del Libro Mayor Contable del día de hoy.
    let fechaFinal = new Date();
    if (fecha && typeof fecha === 'string') {
      const soloFecha = fecha.slice(0, 10);
      const hoyHn = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Tegucigalpa',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      if (soloFecha !== hoyHn && /^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
        fechaFinal = new Date(`${soloFecha}T23:59:00-06:00`);
      }
    }

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
        fecha: fechaFinal,
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
      // Importante: NO modificar cliente.saldoInicial en la BD (es estático como cargo histórico en el Libro Mayor).
      // Calculamos cuánto del Saldo Inicial sigue descubierto antes de esta NC, y el remanente se aplica FIFO a facturas.
      const clienteData = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { saldoInicial: true }
      });

      let saldoDisponible = montoNum;

      if (clienteData && Number(clienteData.saldoInicial || 0) > 0) {
        const [totalPastPagos, totalPastAllocations, totalPastNCsLibres] = await Promise.all([
          prisma.pagoCliente.aggregate({
            where: { clienteId, organizationId: orgId, anulado: false },
            _sum: { monto: true }
          }),
          prisma.pagoDetalleFactura.aggregate({
            where: { pago: { clienteId, organizationId: orgId, anulado: false } },
            _sum: { montoAplicado: true }
          }),
          prisma.notaCreditoCliente.aggregate({
            where: { clienteId, organizationId: orgId, anulado: false, facturaId: null, id: { not: nuevaNC.id } },
            _sum: { monto: true }
          })
        ]);

        const abonosLibresPrevios = Math.max(
          0,
          Number(totalPastPagos._sum.monto || 0) - Number(totalPastAllocations._sum.montoAplicado || 0)
        );
        const ncLibresPrevias = Number(totalPastNCsLibres._sum.monto || 0);
        const creditoLibrePrevio = abonosLibresPrevios + ncLibresPrevias;

        const sInicialRestante = Math.max(0, Number(clienteData.saldoInicial) - creditoLibrePrevio);
        saldoDisponible -= Math.min(saldoDisponible, sInicialRestante);
      }

      // Aplicación FIFO automática a facturas si queda saldo por aplicar
      if (saldoDisponible > 0) {
        const facturasPendientes = await prisma.factura.findMany({
          where: {
            organizationId: orgId,
            clienteId,
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
            tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] },
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

          saldoDisponible -= montoAplicar;
        }
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
