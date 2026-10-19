import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PublicCxCClient from './PublicCxCClient';
import { calcularEstadoCuentaClienteCxC } from '@/utils/facturaUtils';

export const metadata = {
  title: 'Estado de Cuenta Oficial - Distribuidora Paraíso Floral',
  description: 'Consulta y descarga tu estado de cuenta actualizado de Distribuidora Paraíso Floral',
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicCxCPage({ params }: PageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
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
          estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
          tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] }
        },
        select: {
          id: true,
          correlativo: true,
          fechaEmision: true,
          fechaVencimiento: true,
          total: true,
          saldoPendiente: true,
          estadoPago: true,
          estado: true,
          terminosPago: true,
          metodoPago: true,
          detalles: {
            select: {
              id: true,
              descripcion: true,
              cantidad: true,
              precioUnitario: true,
              totalLinea: true
            }
          }
        },
        orderBy: { fechaEmision: 'desc' }
      },
      pagos: {
        where: { anulado: false },
        select: {
          id: true,
          correlativo: true,
          monto: true,
          fecha: true,
          metodoPago: true,
          banco: true,
          referencia: true,
          notas: true,
          detalles: {
            select: {
              facturaId: true,
              montoAplicado: true
            }
          }
        },
        orderBy: { fecha: 'desc' }
      },
      notasCredito: {
        where: { anulado: false },
        select: {
          id: true,
          correlativo: true,
          monto: true,
          fecha: true,
          motivo: true,
          descripcion: true,
          facturaId: true
        },
        orderBy: { fecha: 'desc' }
      }
    }
  });

  if (!cliente) {
    notFound();
  }

  const {
    sInicial,
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

  const facturasProcesadas = cliente.facturas.map(f => {
    const total = Number(f.total || 0);
    const info = mapaFacturasInfo[f.id] || {
      saldoPendiente: f.saldoPendiente !== null ? Number(f.saldoPendiente) : total,
      estadoPago: f.estadoPago || 'PENDIENTE',
      pagadoEnFacturacion: 0
    };
    return {
      ...f,
      fechaEmision: f.fechaEmision.toISOString(),
      fechaVencimiento: f.fechaVencimiento ? f.fechaVencimiento.toISOString() : null,
      total,
      saldoPendiente: info.saldoPendiente,
      estadoPago: info.estadoPago,
      pagadoEnFacturacion: info.pagadoEnFacturacion,
      detalles: (f.detalles || []).map(d => ({
        id: d.id,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitario: Number(d.precioUnitario || 0),
        totalLinea: Number(d.totalLinea || 0)
      }))
    };
  });

  const saldoTotalFinal = Math.max(0, saldoTotal);

  const dataProps = {
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
    organization: cliente.organization,
    resumen: {
      saldoTotal: saldoTotalFinal,
      totalFacturado,
      totalAbonado,
      totalNotasCredito,
      saldoInicial: sInicial
    },
    facturas: facturasProcesadas,
    pagos: cliente.pagos.map(p => ({
      ...p,
      fecha: p.fecha.toISOString(),
      monto: Number(p.monto)
    })),
    notasCredito: cliente.notasCredito.map(n => ({
      ...n,
      fecha: n.fecha.toISOString(),
      monto: Number(n.monto)
    }))
  };

  return <PublicCxCClient initialData={dataProps} />;
}
