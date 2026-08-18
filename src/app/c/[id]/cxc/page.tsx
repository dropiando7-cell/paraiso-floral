import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PublicCxCClient from './PublicCxCClient';

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
          estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
        },
        select: {
          id: true,
          correlativo: true,
          fechaEmision: true,
          fechaVencimiento: true,
          total: true,
          saldoPendiente: true,
          estadoPago: true,
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
          notas: true
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
          descripcion: true
        },
        orderBy: { fecha: 'desc' }
      }
    }
  });

  if (!cliente) {
    notFound();
  }

  // Calculate totals
  const sInicial = Number(cliente.saldoInicial || 0);
  let totalFacturadoNuevos = 0;
  let totalFacturasPendientes = 0;

  const facturasProcesadas = cliente.facturas.map(f => {
    const total = Number(f.total || 0);
    const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : total;
    totalFacturadoNuevos += total;
    if (f.estadoPago !== 'PAGADA' && saldo > 0) {
      totalFacturasPendientes += saldo;
    }
    return {
      ...f,
      fechaEmision: f.fechaEmision.toISOString(),
      fechaVencimiento: f.fechaVencimiento ? f.fechaVencimiento.toISOString() : null,
      total,
      saldoPendiente: saldo,
      estadoPago: f.estadoPago || 'PENDIENTE',
      detalles: (f.detalles || []).map(d => ({
        id: d.id,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitario: Number(d.precioUnitario || 0),
        totalLinea: Number(d.totalLinea || 0)
      }))
    };
  });

  const totalAbonado = cliente.pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const totalNotasCredito = cliente.notasCredito.reduce((sum, n) => sum + Number(n.monto || 0), 0);

  const saldoTotalFinal = Math.max(0, sInicial + totalFacturasPendientes - totalAbonado - totalNotasCredito);

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
      totalFacturado: sInicial + totalFacturadoNuevos,
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
