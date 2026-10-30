import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { calcularEstadoCuentaClienteCxC, extractExcedenteMonedero, extractSaldoFavorAplicado } from '@/utils/facturaUtils';
import { FacturaAfectadaRecibo, ReciboAbonoData, triggerTwilioReciboWhatsApp } from '@/lib/cxc-recibo-service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true, nombre: true, apellido: true }
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

    const isAjusteRedondeo =
      String(metodoPago || '').toUpperCase().includes('REDONDEO') ||
      String(metodoPago || '').toUpperCase().includes('AJUSTE');
    const metodoPagoFinal = isAjusteRedondeo ? 'AJUSTE_REDONDEO' : metodoPago;

    const facturasAfectadasRecibo: FacturaAfectadaRecibo[] = [];
    let montoAplicadoASaldoInicial = 0;
    let excedenteRegistrado = 0;

    const nuevoPago = await prisma.$transaction(async (tx) => {
      // Crear el registro del Pago
      const pagoCreado = await tx.pagoCliente.create({
        data: {
          organizationId: orgId,
          clienteId,
          correlativo,
          monto: montoNum,
          metodoPago: metodoPagoFinal,
          banco: isAjusteRedondeo ? null : banco,
          referencia: isAjusteRedondeo ? null : referencia,
          notas: isAjusteRedondeo ? (notas || 'Ajuste por diferencia de centavos / redondeo (No afecta caja)') : notas,
          comprobanteUrl,
          creadoPorId: dbUser.id,
          cajaSessionId: isAjusteRedondeo ? null : activeSession?.id
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

          const [pagosPrevios, ncsPrevias] = await Promise.all([
            tx.pagoDetalleFactura.aggregate({
              where: { facturaId: fac.id, pago: { anulado: false, id: { not: pagoCreado.id } } },
              _sum: { montoAplicado: true }
            }),
            tx.notaCreditoCliente.aggregate({
              where: { facturaId: fac.id, anulado: false },
              _sum: { monto: true }
            })
          ]);
          const cubiertoPrevio =
            Number(pagosPrevios._sum.montoAplicado || 0) +
            Number(ncsPrevias._sum.monto || 0) +
            extractSaldoFavorAplicado(fac);
          const saldoCalculado = Math.max(0, Number((Number(fac.total) - cubiertoPrevio).toFixed(2)));
          const saldoDB = fac.saldoPendiente !== null ? Number(fac.saldoPendiente) : Number(fac.total);
          const saldoActual = Math.max(saldoDB, saldoCalculado);
          if (saldoActual <= 0) continue;

          const montoAplicar = Math.min(pedido, saldoActual, saldoDisponible);
          const nuevoSaldo = Math.max(0, Number((saldoActual - montoAplicar).toFixed(2)));

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

          facturasAfectadasRecibo.push({
            id: fac.id,
            correlativo: fac.correlativo,
            montoAplicado: Number(montoAplicar.toFixed(2))
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
          const pastPagosList = await tx.pagoCliente.findMany({
            where: { clienteId, organizationId: orgId, anulado: false, id: { not: pagoCreado.id } },
            select: { monto: true, notas: true }
          });
          const totalPastPagosNeto = pastPagosList.reduce(
            (acc, p) => acc + Math.max(0, Number(p.monto || 0) - extractExcedenteMonedero(p.notas)),
            0
          );
          const totalPastAllocations = await tx.pagoDetalleFactura.aggregate({
            where: { pago: { clienteId, organizationId: orgId, anulado: false, id: { not: pagoCreado.id } } },
            _sum: { montoAplicado: true }
          });
          const pastAppliedToSInicial = Math.max(
            0,
            totalPastPagosNeto - Number(totalPastAllocations._sum.montoAplicado || 0)
          );
          const sInicialActual = Math.max(0, Number(clienteData.saldoInicial) - pastAppliedToSInicial);
          const aplicarSInicial = Math.min(saldoDisponible, sInicialActual);
          if (aplicarSInicial > 0) {
            montoAplicadoASaldoInicial = Number(aplicarSInicial.toFixed(2));
            saldoDisponible -= aplicarSInicial;
          }
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

            facturasAfectadasRecibo.push({
              id: fac.id,
              correlativo: fac.correlativo,
              montoAplicado: Number(montoAplicar.toFixed(2))
            });

            saldoDisponible -= montoAplicar;
          }
        }
      }

      // 3. Si después de cubrir toda la deuda pendiente aún sobra dinero, sumarlo al Monedero Virtual (saldoFavor)
      const excedente = Number(saldoDisponible.toFixed(2));
      if (excedente >= 0.01) {
        excedenteRegistrado = excedente;
        const cliActual = await tx.cliente.findUnique({
          where: { id: clienteId },
          select: { saldoFavor: true, nombre: true }
        });
        const saldoFavorAnterior = Number(cliActual?.saldoFavor || 0);
        const nuevoSaldoFavor = Number((saldoFavorAnterior + excedente).toFixed(2));

        await tx.cliente.update({
          where: { id: clienteId },
          data: { saldoFavor: nuevoSaldoFavor }
        });

        const tagExcedente = `Excedente a Saldo a Favor: L. ${excedente.toFixed(2)} [MONEDERO:+${excedente.toFixed(2)}]`;
        const notasFinales = notas ? `${notas} · ${tagExcedente}` : tagExcedente;

        await tx.pagoCliente.update({
          where: { id: pagoCreado.id },
          data: { notas: notasFinales }
        });
        pagoCreado.notas = notasFinales;

        await tx.activityLog.create({
          data: {
            organizationId: orgId,
            userId: dbUser.id,
            action: 'MONEDERO_ABONO',
            module: '/cxc/monedero',
            description: `Saldo a favor agregado L. ${excedente.toFixed(2)} a ${cliActual?.nombre || cliente.nombre}. Motivo: Excedente en Abono ${correlativo}`,
            metadata: {
              clienteId,
              monto: excedente,
              saldoAnterior: saldoFavorAnterior,
              saldoNuevo: nuevoSaldoFavor,
              motivo: `Excedente en Abono ${correlativo}`,
              pagoId: pagoCreado.id,
              correlativoAbono: correlativo,
              usuario: [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ')
            }
          }
        });
      }

      return pagoCreado;
    });

    // Calcular el estado de cuenta actualizado del cliente para el Recibo de Abono / Caja
    const clienteActualizado = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        facturas: {
          where: {
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
            tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] }
          },
          include: { pagosMixtos: true }
        },
        pagos: {
          where: { anulado: false }
        },
        notasCredito: {
          where: { anulado: false }
        }
      }
    });

    let nuevoSaldoPendiente = 0;
    if (clienteActualizado) {
      const estadoCxc = calcularEstadoCuentaClienteCxC({
        saldoInicial: clienteActualizado.saldoInicial,
        facturas: clienteActualizado.facturas,
        pagos: clienteActualizado.pagos,
        notasCredito: clienteActualizado.notasCredito
      });
      nuevoSaldoPendiente = Math.max(0, Number(estadoCxc.saldoTotal.toFixed(2)));
    }

    const creditoAplicadoDeuda = Math.max(0, Number((montoNum - excedenteRegistrado).toFixed(2)));
    const saldoAnterior = Math.max(0, Number((nuevoSaldoPendiente + creditoAplicadoDeuda).toFixed(2)));
    const usuarioNombre = [dbUser.nombre, dbUser.apellido].filter(Boolean).join(' ').trim() || 'Cajero / Vendedor';

    const reciboData: ReciboAbonoData = {
      id: nuevoPago.id,
      correlativo: nuevoPago.correlativo || correlativo,
      fecha: nuevoPago.fecha,
      monto: montoNum,
      metodoPago: nuevoPago.metodoPago,
      banco: nuevoPago.banco,
      referencia: nuevoPago.referencia,
      notas: nuevoPago.notas,
      usuarioNombre,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        rtn: cliente.rtn,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        departamento: cliente.departamento
      },
      facturasAfectadas: facturasAfectadasRecibo,
      aplicadoASaldoInicial: montoAplicadoASaldoInicial > 0 ? montoAplicadoASaldoInicial : 0,
      excedenteMonedero: excedenteRegistrado > 0 ? excedenteRegistrado : 0,
      saldoAnterior,
      nuevoSaldoPendiente
    };

    // Hook preparado para envío automático por Twilio WhatsApp (Fase 2)
    triggerTwilioReciboWhatsApp(reciboData).catch(err =>
      console.error('Aviso: servicio Twilio WhatsApp en espera:', err)
    );

    return NextResponse.json({
      success: true,
      pago: nuevoPago,
      recibo: reciboData
    });
  } catch (error: any) {
    console.error('Error registrando abono:', error);
    return NextResponse.json({ error: 'Error registrando abono de cliente' }, { status: 500 });
  }
}
