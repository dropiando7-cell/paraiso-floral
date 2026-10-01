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
            cliente: true
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
      movimientos: true
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
      egresos: 0
  };

  session.facturas.forEach(f => {
      const metodo = f.metodoPago || 'Efectivo';
      const total = Number(f.total);
      
      // Exclude unconfirmed transfers from totals
      if (metodo === 'Transferencia' && f.transferenciaConfirmada === false) {
          return;
      }

      if (summary.ventas[metodo] !== undefined) {
          summary.ventas[metodo] += total;
      } else {
          summary.ventas[metodo] = total;
      }
  });

  session.rentasPagos.forEach(p => {
      const metodo = p.metodoPago || 'Efectivo';
      const total = Number(p.monto);
      if (summary.rentas[metodo] !== undefined) {
          summary.rentas[metodo] += total;
      } else {
          summary.rentas[metodo] = total;
      }
  });

  session.ordenesTrabajo.forEach(o => {
      const metodo = o.metodoPagoRevision || 'Efectivo';
      const total = Number(o.costoRevision);
      if (summary.soporte[metodo] !== undefined) {
          summary.soporte[metodo] += total;
      } else {
          summary.soporte[metodo] = total;
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
      if (m.tipo === 'INGRESO') {
          if (m.metodoPago === 'Efectivo') movimientosResumen.ingresosEfec += amount;
          else movimientosResumen.ingresosOtros += amount;
      } else {
          if (m.metodoPago === 'Efectivo') movimientosResumen.egresosEfec += amount;
          else movimientosResumen.egresosOtros += amount;
      }
  });

  const totalVentas = metodos.reduce((sum, m) => sum + (summary.ventas[m] || 0), 0);
  const totalRentas = metodos.reduce((sum, m) => sum + (summary.rentas[m] || 0), 0);
  const totalSoporte = metodos.reduce((sum, m) => sum + (summary.soporte[m] || 0), 0);
  const totalIngresos = totalVentas + totalRentas + totalSoporte + movimientosResumen.ingresosEfec + movimientosResumen.ingresosOtros;
  
  const ventasEfectivo = summary.ventas['Efectivo'] || 0;
  const rentasEfectivo = summary.rentas['Efectivo'] || 0;
  const soporteEfectivo = summary.soporte['Efectivo'] || 0;
  const totalEfectivoIngresado = ventasEfectivo + rentasEfectivo + soporteEfectivo + movimientosResumen.ingresosEfec;

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
                activoFijo: p.renta.activoFijo ? { nombre: p.renta.activoFijo.nombre } : null,
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
        }))
    },
    totals: {
        totalVentas,
        totalRentas,
        totalSoporte,
        totalIngresos,
        ventasEfectivo,
        rentasEfectivo,
        soporteEfectivo,
        esperadoEfectivo,
    },
    summary
  };

  return <PublicCierreClient initialData={initialData} />;
}
