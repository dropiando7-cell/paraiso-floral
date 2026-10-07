'use server';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from './actions';

export interface ReporteFiltros {
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  origen?: 'TODOS' | 'PARAISO' | 'HF';
  vendedor?: string;
  estado?: 'TODOS' | 'VALIDAS' | 'ANULADAS';
  tipoDocumento?: 'TODOS' | 'FACTURA' | 'PROFORMA' | 'COTIZACION';
}

export interface FacturaReporteItem {
  id: string;
  correlativo: string;
  numeroCAI: string | null;
  fechaEmision: string;
  fechaVencimiento: string | null;
  terminosPago: string | null;
  metodoPago: string | null;
  estado: string;
  estadoPago: string | null;
  subTotal: number;
  descuentos: number;
  totalExento: number;
  totalExonerado: number;
  totalGravado15: number;
  isv15: number;
  totalGravado18: number;
  isv18: number;
  total: number;
  aliasVenta: string;
  vendedorNombre: string | null;
  transferenciaConfirmada: boolean;
  saldoPendiente: number | null;
  tipoDocumento: string;
  cliente: {
    nombre: string;
    rtn: string | null;
    telefono: string | null;
  };
  detalles: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    porcentajeIsv: number;
    totalDescuento: number;
    totalLinea: number;
    sku?: string | null;
    categoria?: string | null;
  }>;
}

export interface ReporteContableResponse {
  success: boolean;
  data: FacturaReporteItem[];
  kpis: {
    totalDocumentos: number;
    totalFacturado: number;
    totalGravado15: number;
    totalIsv15: number;
    totalExento: number;
    totalExonerado: number;
    totalDescuentos: number;
    totalEfectivo: number;
    totalTransferenciaConfirmada: number;
    totalTransferenciaPendiente: number;
    totalTarjeta: number;
    totalCredito: number;
    totalAnuladas: number;
  };
  error?: string;
}

/**
 * Consulta facturas para reportes contables y fiscales con filtros avanzados
 */
export async function getReporteContableData(filtros: ReporteFiltros): Promise<ReporteContableResponse> {
  try {
    const user = await getAuthenticatedUser();
    const orgId = user.organizationId;

    // Fechas en zona horaria local (Honduras UTC-6) o ISO seguro
    const [startYear, startMonth, startDay] = filtros.fechaInicio.split('-').map(Number);
    const [endYear, endMonth, endDay] = filtros.fechaFin.split('-').map(Number);

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 6, 0, 0)); // 00:00:00 UTC-6
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay + 1, 5, 59, 59, 999)); // 23:59:59 UTC-6

    const whereClause: any = {
      organizationId: orgId,
      fechaEmision: {
        gte: startDate,
        lte: endDate
      }
    };

    // Tipo de documento
    if (filtros.tipoDocumento && filtros.tipoDocumento !== 'TODOS') {
      whereClause.tipoDocumento = filtros.tipoDocumento;
    } else {
      // Por defecto facturas fiscales y notas de crédito
      whereClause.tipoDocumento = { in: ['FACTURA', 'NOTA_CREDITO'] };
    }

    // Estado
    if (filtros.estado === 'VALIDAS') {
      whereClause.estado = { not: 'ANULADA' };
    } else if (filtros.estado === 'ANULADAS') {
      whereClause.estado = 'ANULADA';
    }

    // Origen
    if (filtros.origen === 'PARAISO') {
      whereClause.aliasVenta = { not: 'HonduFlores' };
    } else if (filtros.origen === 'HF') {
      whereClause.aliasVenta = 'HonduFlores';
    }

    // Vendedor
    if (filtros.vendedor && filtros.vendedor !== 'TODOS') {
      if (filtros.vendedor === 'CON_VENDEDOR') {
        whereClause.vendedorNombre = { not: null };
      } else if (filtros.vendedor === 'SIN_VENDEDOR') {
        whereClause.vendedorNombre = null;
      } else {
        whereClause.vendedorNombre = filtros.vendedor;
      }
    }

    const docs = await prisma.factura.findMany({
      where: whereClause,
      select: {
        id: true,
        correlativo: true,
        numeroCAI: true,
        fechaEmision: true,
        fechaVencimiento: true,
        terminosPago: true,
        metodoPago: true,
        estado: true,
        estadoPago: true,
        subTotal: true,
        descuentos: true,
        totalExento: true,
        totalExonerado: true,
        totalGravado15: true,
        isv15: true,
        totalGravado18: true,
        isv18: true,
        total: true,
        aliasVenta: true,
        vendedorNombre: true,
        transferenciaConfirmada: true,
        saldoPendiente: true,
        tipoDocumento: true,
        cliente: {
          select: {
            nombre: true,
            rtn: true,
            telefono: true
          }
        },
        detalles: {
          select: {
            descripcion: true,
            cantidad: true,
            precioUnitario: true,
            porcentajeIsv: true,
            totalDescuento: true,
            totalLinea: true,
            producto: {
              select: {
                sku: true,
                categoria: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaEmision: 'asc'
      }
    });

    // Mapeo y cálculo de KPIs
    let totalFacturado = 0;
    let totalGravado15 = 0;
    let totalIsv15 = 0;
    let totalExento = 0;
    let totalExonerado = 0;
    let totalDescuentos = 0;
    let totalEfectivo = 0;
    let totalTransferenciaConfirmada = 0;
    let totalTransferenciaPendiente = 0;
    let totalTarjeta = 0;
    let totalCredito = 0;
    let totalAnuladas = 0;

    const data: FacturaReporteItem[] = docs.map((d) => {
      const isAnulada = d.estado === 'ANULADA';
      const tot = Number(d.total || 0);
      const sub = Number(d.subTotal || 0);
      const desc = Number(d.descuentos || 0);
      const exento = Number(d.totalExento || 0);
      const exon = Number(d.totalExonerado || 0);
      const g15 = Number(d.totalGravado15 || 0);
      const isv15Val = Number(d.isv15 || 0);
      const g18 = Number(d.totalGravado18 || 0);
      const isv18Val = Number(d.isv18 || 0);
      const saldo = d.saldoPendiente !== null ? Number(d.saldoPendiente) : null;

      if (isAnulada) {
        totalAnuladas += 1;
      } else {
        totalFacturado += tot;
        totalGravado15 += g15;
        totalIsv15 += isv15Val;
        totalExento += exento;
        totalExonerado += exon;
        totalDescuentos += desc;

        const metodo = (d.metodoPago || '').toLowerCase();
        const terminos = (d.terminosPago || '').toLowerCase();
        const esCred = terminos.includes('crédito') || terminos.includes('credito') || terminos.includes('días') || terminos.includes('dias');

        if (esCred) {
          totalCredito += tot;
        } else if (metodo.includes('efectivo')) {
          totalEfectivo += tot;
        } else if (metodo.includes('transferencia')) {
          if (d.transferenciaConfirmada) {
            totalTransferenciaConfirmada += tot;
          } else {
            totalTransferenciaPendiente += tot;
          }
        } else if (metodo.includes('tarjeta')) {
          totalTarjeta += tot;
        } else {
          totalEfectivo += tot;
        }
      }

      return {
        id: d.id,
        correlativo: d.correlativo,
        numeroCAI: d.numeroCAI,
        fechaEmision: d.fechaEmision.toISOString(),
        fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.toISOString() : null,
        terminosPago: d.terminosPago,
        metodoPago: d.metodoPago,
        estado: d.estado,
        estadoPago: d.estadoPago,
        subTotal: sub,
        descuentos: desc,
        totalExento: exento,
        totalExonerado: exon,
        totalGravado15: g15,
        isv15: isv15Val,
        totalGravado18: g18,
        isv18: isv18Val,
        total: tot,
        aliasVenta: d.aliasVenta,
        vendedorNombre: d.vendedorNombre,
        transferenciaConfirmada: d.transferenciaConfirmada,
        saldoPendiente: saldo,
        tipoDocumento: d.tipoDocumento,
        cliente: {
          nombre: d.cliente?.nombre || 'Consumidor Final',
          rtn: d.cliente?.rtn || null,
          telefono: d.cliente?.telefono || null
        },
        detalles: (d.detalles || []).map((det) => ({
          descripcion: det.descripcion,
          cantidad: det.cantidad,
          precioUnitario: Number(det.precioUnitario),
          porcentajeIsv: det.porcentajeIsv,
          totalDescuento: Number(det.totalDescuento),
          totalLinea: Number(det.totalLinea),
          sku: det.producto?.sku || null,
          categoria: det.producto?.categoria || null
        }))
      };
    });

    return {
      success: true,
      data,
      kpis: {
        totalDocumentos: docs.length,
        totalFacturado,
        totalGravado15,
        totalIsv15,
        totalExento,
        totalExonerado,
        totalDescuentos,
        totalEfectivo,
        totalTransferenciaConfirmada,
        totalTransferenciaPendiente,
        totalTarjeta,
        totalCredito,
        totalAnuladas
      }
    };
  } catch (error: any) {
    console.error('Error al generar reporte contable:', error);
    return {
      success: false,
      data: [],
      kpis: {
        totalDocumentos: 0,
        totalFacturado: 0,
        totalGravado15: 0,
        totalIsv15: 0,
        totalExento: 0,
        totalExonerado: 0,
        totalDescuentos: 0,
        totalEfectivo: 0,
        totalTransferenciaConfirmada: 0,
        totalTransferenciaPendiente: 0,
        totalTarjeta: 0,
        totalCredito: 0,
        totalAnuladas: 0
      },
      error: error.message || 'Error al obtener datos para el reporte contable'
    };
  }
}
