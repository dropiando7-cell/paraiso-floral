import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PublicCierreClient from './PublicCierreClient';

export const metadata = {
  title: 'Reporte de Cierre de Caja Diario - Distribuidora Paraíso Floral',
  description: 'Reporte oficial de arqueo y cierre de turno de caja.',
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicCierrePage({ params }: PageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const session = await prisma.corteCajaSession.findUnique({
    where: { id },
    include: {
      creadoPor: true,
      cerradoPor: true,
      organization: {
        select: {
          name: true,
          rtn: true,
          telefono: true,
          direccion: true,
          correoContacto: true,
          logoUrl: true
        }
      },
      facturas: {
        where: { 
            estado: { not: 'ANULADA' },
            tipoDocumento: 'FACTURA'
        },
        include: {
            cliente: true,
            pagosMixtos: true
        }
      },
      rentasPagos: {
        include: {
            renta: {
                include: {
                    cliente: true,
                    activoFijo: true
                }
            }
        }
      },
      ordenesTrabajo: {
        include: {
            cliente: true
        }
      },
      movimientos: true,
      pagosCliente: {
        include: {
            cliente: true
        }
      }
    }
  });

  if (!session) {
    notFound();
  }

  // Calculate totals and summaries using the same logic as actions.ts
  const metodos = ['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago de Occidente'];
  const summary = {
      ventas: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
      rentas: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
      soporte: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
      abonos: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
      ventasCredito: 0,
      transaccionesPorMetodo: metodos.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<string, number>),
      egresos: 0
  };

  session.facturas.forEach(f => {
      let metodo = f.metodoPago || 'Efectivo';
      if (metodo === 'Tarjeta de Crédito/Débito') metodo = 'Tarjeta';
      const total = Number(f.total);
      
      // Credit sale
      if (metodo === 'Crédito' || metodo === 'CREDITO' || (f.saldoPendiente && Number(f.saldoPendiente) > 0 && f.estadoPago !== 'PAGADO')) {
          summary.ventasCredito += total;
          return;
      }

      // Exclude unconfirmed transfers from totals
      if (metodo === 'Transferencia' && f.transferenciaConfirmada === false) {
          return;
      }

      if (metodo === 'MIXTO' && f.pagosMixtos && f.pagosMixtos.length > 0) {
          f.pagosMixtos.forEach((p: any) => {
              let pMetodo = p.metodoPago;
              if (pMetodo === 'Tarjeta de Crédito/Débito') pMetodo = 'Tarjeta';
              const pTotal = Number(p.monto);
              
              if (pMetodo === 'Transferencia' && f.transferenciaConfirmada === false) {
                  return;
              }

              if (summary.ventas[pMetodo] !== undefined) {
                  summary.ventas[pMetodo] += pTotal;
                  summary.transaccionesPorMetodo[pMetodo] = (summary.transaccionesPorMetodo[pMetodo] || 0) + 1;
              } else {
                  summary.ventas[pMetodo] = pTotal;
                  summary.transaccionesPorMetodo[pMetodo] = (summary.transaccionesPorMetodo[pMetodo] || 0) + 1;
              }
          });
      } else {
          if (summary.ventas[metodo] !== undefined) {
              summary.ventas[metodo] += total;
              summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
          } else {
              summary.ventas[metodo] = total;
              summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
          }
      }
  });

  session.rentasPagos.forEach(p => {
      let metodo = p.metodoPago || 'Efectivo';
      if (metodo === 'Tarjeta de Crédito/Débito') metodo = 'Tarjeta';
      const total = Number(p.monto);
      if (summary.rentas[metodo] !== undefined) {
          summary.rentas[metodo] += total;
          summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
      } else {
          summary.rentas[metodo] = total;
          summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
      }
  });

  session.ordenesTrabajo.forEach(o => {
      let metodo = o.metodoPagoRevision || 'Efectivo';
      if (metodo === 'Tarjeta de Crédito/Débito') metodo = 'Tarjeta';
      const total = Number(o.costoRevision);
      if (summary.soporte[metodo] !== undefined) {
          summary.soporte[metodo] += total;
          summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
      } else {
          summary.soporte[metodo] = total;
          summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
      }
  });

  (session.pagosCliente || []).forEach(p => {
      if (p.anulado) return;
      let rawMetodo = (p.metodoPago || 'Efectivo').toUpperCase();
      let metodo = 'Efectivo';
      if (rawMetodo.includes('TARJETA')) metodo = 'Tarjeta';
      else if (rawMetodo.includes('TRANSFERENCIA')) metodo = 'Transferencia';
      else if (rawMetodo.includes('CHEQUE')) metodo = 'Cheque';
      else if (rawMetodo.includes('OCCIDENTE') || rawMetodo.includes('LINK')) metodo = 'Link de pago de Occidente';
      
      const total = Number(p.monto);
      if (summary.abonos[metodo] !== undefined) {
          summary.abonos[metodo] += total;
          summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
      } else {
          summary.abonos[metodo] = total;
          summary.transaccionesPorMetodo[metodo] = (summary.transaccionesPorMetodo[metodo] || 0) + 1;
      }
  });

  // Summarize movements
  const movimientosResumen = {
    ingresosEfec: 0,
    ingresosOtros: 0,
    egresosEfec: 0,
    egresosOtros: 0
  };

  session.movimientos.forEach(m => {
      if (m.anuladaAt) return;
      const amount = Number(m.monto);
      if (m.metodoPago === 'Efectivo') {
          if (m.tipo === 'INGRESO') {
              movimientosResumen.ingresosEfec += amount;
          } else if (m.tipo === 'EGRESO') {
              if (m.concepto !== 'REEMBOLSO_GARANTIA') {
                  movimientosResumen.egresosEfec += amount;
              }
          }
      } else {
          if (m.tipo === 'INGRESO') {
              movimientosResumen.ingresosOtros += amount;
          } else if (m.tipo === 'EGRESO') {
              movimientosResumen.egresosOtros += amount;
          }
      }
  });

  const totalVentas = Object.values(summary.ventas).reduce((sum, v) => sum + v, 0);
  const totalVentasCredito = summary.ventasCredito || 0;
  const totalFacturado = totalVentas + totalVentasCredito;
  const totalRentas = Object.values(summary.rentas).reduce((sum, r) => sum + r, 0);
  const totalSoporte = Object.values(summary.soporte).reduce((sum, s) => sum + s, 0);
  const totalAbonos = Object.values(summary.abonos).reduce((sum, a) => sum + a, 0);
  const totalIngresos = totalVentas + totalRentas + totalSoporte + totalAbonos + movimientosResumen.ingresosEfec + movimientosResumen.ingresosOtros;
  
  const ventasEfectivo = summary.ventas['Efectivo'] || 0;
  const rentasEfectivo = summary.rentas['Efectivo'] || 0;
  const soporteEfectivo = summary.soporte['Efectivo'] || 0;
  const abonosEfectivo = summary.abonos['Efectivo'] || 0;
  const totalEfectivoIngresado = ventasEfectivo + rentasEfectivo + soporteEfectivo + abonosEfectivo + movimientosResumen.ingresosEfec;

  const esperadoEfectivo = Number(session.saldoInicial) + totalEfectivoIngresado - movimientosResumen.egresosEfec;

  const initialData = {
    organization: session.organization,
    session: {
        id: session.id,
        saldoInicial: Number(session.saldoInicial),
        saldoFinalEfectivo: session.saldoFinalEfectivo ? Number(session.saldoFinalEfectivo) : null,
        diferencia: session.diferencia ? Number(session.diferencia) : null,
        observaciones: session.observaciones,
        aperturaAt: session.aperturaAt.toISOString(),
        cierreAt: session.cierreAt ? session.cierreAt.toISOString() : null,
        creadoPor: session.creadoPor ? { nombre: session.creadoPor.nombre, apellido: session.creadoPor.apellido } : null,
        cerradoPor: session.cerradoPor ? { nombre: session.cerradoPor.nombre, apellido: session.cerradoPor.apellido } : null,
        facturas: session.facturas.map(f => ({
            id: f.id,
            metodoPago: f.metodoPago,
            fechaEmision: f.fechaEmision.toISOString(),
            correlativo: f.correlativo,
            cliente: f.cliente ? { nombre: f.cliente.nombre } : null,
            total: Number(f.total),
            transferenciaConfirmada: f.transferenciaConfirmada
        })),
        rentasPagos: session.rentasPagos.map(p => ({
            id: p.id,
            metodoPago: p.metodoPago,
            fechaPago: p.fechaPago.toISOString(),
            notas: p.notas,
            renta: p.renta ? { 
                activoFijo: p.renta.activoFijo ? { nombre: p.renta.activoFijo.descripcionCorta } : null,
                cliente: p.renta.cliente ? { nombre: p.renta.cliente.nombre } : null
            } : null,
            monto: Number(p.monto)
        })),
        ordenesTrabajo: session.ordenesTrabajo.map(o => ({
            id: o.id,
            metodoPagoRevision: o.metodoPagoRevision,
            fechaRecibido: o.fechaRecibido.toISOString(),
            codigoSeguridad: o.codigoSeguridad,
            equipoDano: o.equipoDano,
            cliente: o.cliente ? { nombre: o.cliente.nombre } : null,
            costoRevision: Number(o.costoRevision)
        })),
        movimientos: session.movimientos.map(m => ({
            id: m.id,
            metodoPago: m.metodoPago,
            concepto: m.concepto,
            tipo: m.tipo,
            createdAt: m.createdAt.toISOString(),
            anuladaAt: m.anuladaAt ? m.anuladaAt.toISOString() : null,
            descripcion: m.descripcion,
            monto: Number(m.monto)
        })),
        pagosCliente: (session.pagosCliente || []).map(p => ({
            id: p.id,
            monto: Number(p.monto),
            metodoPago: p.metodoPago,
            fecha: p.fecha.toISOString(),
            clienteNombre: p.cliente?.nombre || 'Cliente General',
            notas: p.notas || '',
            anulado: p.anulado
        }))
    },
    totals: {
        totalVentas,
        totalVentasCredito,
        totalFacturado,
        totalRentas,
        totalSoporte,
        totalAbonos,
        totalIngresos,
        ventasEfectivo,
        rentasEfectivo,
        soporteEfectivo,
        abonosEfectivo,
        ingresosMovimientosEfectivo: movimientosResumen.ingresosEfec,
        egresosMovimientosEfectivo: movimientosResumen.egresosEfec,
        esperadoEfectivo,
    },
    summary
  };

  return <PublicCierreClient initialData={initialData} />;
}
