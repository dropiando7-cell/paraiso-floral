import * as XLSX from 'xlsx';
import { FacturaReporteItem, ReporteFiltros } from '@/app/(dashboard)/facturas/reportes-actions';

export type TipoReporte = 'VENTAS_SAR' | 'METODOS_PAGO' | 'VENDEDORES' | 'PRODUCTOS';

interface ExportContext {
  tipo: TipoReporte;
  data: FacturaReporteItem[];
  filtros: ReporteFiltros;
  organizationName?: string;
}

const formatMoneda = (val: number) => {
  return Number(val || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatFecha = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Genera y descarga el archivo Excel (.xlsx) para contabilidad
 */
export function exportarReporteExcel({ tipo, data, filtros, organizationName = 'DISTRIBUIDORA PARAISO FLORAL' }: ExportContext) {
  const workbook = XLSX.utils.book_new();
  const fechaGeneracion = new Date().toLocaleString('es-HN');
  const rangoTexto = `${filtros.fechaInicio} al ${filtros.fechaFin}`;

  if (tipo === 'VENTAS_SAR') {
    const dataRows: any[] = [];
    dataRows.push([organizationName.toUpperCase()]);
    dataRows.push(['LIBRO DE VENTAS FISCALES - CONTROL TRIBUTARIO SAR']);
    dataRows.push([`Período: ${rangoTexto} | Generado: ${fechaGeneracion}`]);
    dataRows.push([]); // fila vacía

    // Cabeceras
    dataRows.push([
      '#',
      'FECHA',
      'N° CORRELATIVO',
      'N° CAI',
      'RTN CLIENTE',
      'CLIENTE / RAZÓN SOCIAL',
      'ESTADO',
      'EMPRESA',
      'VENDEDOR',
      'CONDICIÓN / PAGO',
      'EXENTO (HNL)',
      'EXONERADO (HNL)',
      'GRAVADO 15% (HNL)',
      'ISV 15% (HNL)',
      'GRAVADO 18% (HNL)',
      'ISV 18% (HNL)',
      'TOTAL FACTURA (HNL)'
    ]);

    let sumExento = 0;
    let sumExonerado = 0;
    let sumGravado15 = 0;
    let sumIsv15 = 0;
    let sumGravado18 = 0;
    let sumIsv18 = 0;
    let sumTotal = 0;

    data.forEach((doc, idx) => {
      const isAnulada = doc.estado === 'ANULADA';
      const exento = isAnulada ? 0 : doc.totalExento;
      const exonerado = isAnulada ? 0 : doc.totalExonerado;
      const gravado15 = isAnulada ? 0 : doc.totalGravado15;
      const isv15 = isAnulada ? 0 : doc.isv15;
      const gravado18 = isAnulada ? 0 : doc.totalGravado18;
      const isv18 = isAnulada ? 0 : doc.isv18;
      const total = isAnulada ? 0 : doc.total;

      sumExento += exento;
      sumExonerado += exonerado;
      sumGravado15 += gravado15;
      sumIsv15 += isv15;
      sumGravado18 += gravado18;
      sumIsv18 += isv18;
      sumTotal += total;

      dataRows.push([
        idx + 1,
        formatFecha(doc.fechaEmision),
        doc.correlativo,
        doc.numeroCAI || 'N/A',
        doc.cliente.rtn || 'Consumidor Final',
        doc.cliente.nombre,
        doc.estado,
        doc.aliasVenta || 'Paraíso Floral',
        doc.vendedorNombre || 'Sin Vendedor',
        doc.terminosPago || doc.metodoPago || 'Contado',
        exento,
        exonerado,
        gravado15,
        isv15,
        gravado18,
        isv18,
        total
      ]);
    });

    // Fila de totales
    dataRows.push([]);
    dataRows.push([
      'TOTALES',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      sumExento,
      sumExonerado,
      sumGravado15,
      sumIsv15,
      sumGravado18,
      sumIsv18,
      sumTotal
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 12 }, // Fecha
      { wch: 22 }, // Correlativo
      { wch: 38 }, // CAI
      { wch: 18 }, // RTN
      { wch: 32 }, // Cliente
      { wch: 12 }, // Estado
      { wch: 16 }, // Empresa
      { wch: 18 }, // Vendedor
      { wch: 18 }, // Condicion
      { wch: 14 }, // Exento
      { wch: 14 }, // Exonerado
      { wch: 16 }, // Gravado 15
      { wch: 14 }, // ISV 15
      { wch: 16 }, // Gravado 18
      { wch: 14 }, // ISV 18
      { wch: 18 }  // Total
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Libro Ventas SAR');

  } else if (tipo === 'METODOS_PAGO') {
    // 1. Resumen Agrupado
    const resumen: Record<string, { cantidad: number; total: number }> = {
      'Efectivo': { cantidad: 0, total: 0 },
      'Transferencia Confirmada': { cantidad: 0, total: 0 },
      'Transferencia Pendiente': { cantidad: 0, total: 0 },
      'Tarjeta': { cantidad: 0, total: 0 },
      'Crédito (CxC)': { cantidad: 0, total: 0 },
      'Otros': { cantidad: 0, total: 0 }
    };

    const validDocs = data.filter(d => d.estado !== 'ANULADA');

    validDocs.forEach(d => {
      const terminos = (d.terminosPago || '').toLowerCase();
      const metodo = (d.metodoPago || '').toLowerCase();
      const esCred = terminos.includes('crédito') || terminos.includes('credito') || terminos.includes('días') || terminos.includes('dias');

      if (esCred) {
        resumen['Crédito (CxC)'].cantidad++;
        resumen['Crédito (CxC)'].total += d.total;
      } else if (metodo.includes('efectivo')) {
        resumen['Efectivo'].cantidad++;
        resumen['Efectivo'].total += d.total;
      } else if (metodo.includes('transferencia')) {
        if (d.transferenciaConfirmada) {
          resumen['Transferencia Confirmada'].cantidad++;
          resumen['Transferencia Confirmada'].total += d.total;
        } else {
          resumen['Transferencia Pendiente'].cantidad++;
          resumen['Transferencia Pendiente'].total += d.total;
        }
      } else if (metodo.includes('tarjeta')) {
        resumen['Tarjeta'].cantidad++;
        resumen['Tarjeta'].total += d.total;
      } else {
        resumen['Otros'].cantidad++;
        resumen['Otros'].total += d.total;
      }
    });

    const rowsResumen: any[] = [
      [organizationName.toUpperCase()],
      ['RESUMEN DE COBROS POR MÉTODO DE PAGO Y ARQUEO'],
      [`Período: ${rangoTexto} | Generado: ${fechaGeneracion}`],
      [],
      ['MÉTODO DE PAGO / CONDICIÓN', 'CANTIDAD FACTURAS', 'TOTAL COBRADO / FACTURADO (HNL)', '% PARTICIPACIÓN']
    ];

    const granTotal = Object.values(resumen).reduce((acc, curr) => acc + curr.total, 0);

    Object.entries(resumen).forEach(([nombre, info]) => {
      const porcentaje = granTotal > 0 ? (info.total / granTotal) * 100 : 0;
      rowsResumen.push([
        nombre,
        info.cantidad,
        info.total,
        `${porcentaje.toFixed(2)}%`
      ]);
    });

    rowsResumen.push([]);
    rowsResumen.push([
      'TOTAL GENERAL',
      validDocs.length,
      granTotal,
      '100.00%'
    ]);

    rowsResumen.push([]);
    rowsResumen.push(['--- DETALLE DE FACTURAS ---']);
    rowsResumen.push([
      '#', 'FECHA', 'CORRELATIVO', 'CLIENTE', 'MÉTODO PAGO', 'TRANSFERENCIA CONFIRMADA', 'TÉRMINOS', 'TOTAL (HNL)'
    ]);

    validDocs.forEach((d, idx) => {
      rowsResumen.push([
        idx + 1,
        formatFecha(d.fechaEmision),
        d.correlativo,
        d.cliente.nombre,
        d.metodoPago || 'Efectivo',
        d.metodoPago?.toLowerCase().includes('transferencia') ? (d.transferenciaConfirmada ? 'SÍ' : 'NO (PENDIENTE)') : 'N/A',
        d.terminosPago || 'Contado',
        d.total
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rowsResumen);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 26 },
      { wch: 18 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Métodos de Pago');

  } else if (tipo === 'VENDEDORES') {
    // Agrupación por Vendedor
    const vendedoresMap: Record<string, { facturas: number; contado: number; credito: number; total: number }> = {};
    const validDocs = data.filter(d => d.estado !== 'ANULADA');

    validDocs.forEach(d => {
      const vendedor = d.vendedorNombre?.trim() || 'Sin Vendedor Asignado';
      if (!vendedoresMap[vendedor]) {
        vendedoresMap[vendedor] = { facturas: 0, contado: 0, credito: 0, total: 0 };
      }

      const terminos = (d.terminosPago || '').toLowerCase();
      const esCred = terminos.includes('crédito') || terminos.includes('credito') || terminos.includes('días') || terminos.includes('dias');

      vendedoresMap[vendedor].facturas++;
      vendedoresMap[vendedor].total += d.total;
      if (esCred) {
        vendedoresMap[vendedor].credito += d.total;
      } else {
        vendedoresMap[vendedor].contado += d.total;
      }
    });

    const rowsVendedores: any[] = [
      [organizationName.toUpperCase()],
      ['LIQUIDACIÓN DE VENTAS POR VENDEDOR (COMISIONES)'],
      [`Período: ${rangoTexto} | Generado: ${fechaGeneracion}`],
      [],
      ['VENDEDOR', 'CANTIDAD FACTURAS', 'VENTAS CONTADO (HNL)', 'VENTAS CRÉDITO (HNL)', 'TOTAL FACTURADO (HNL)', '% PARTICIPACIÓN']
    ];

    const granTotal = Object.values(vendedoresMap).reduce((acc, curr) => acc + curr.total, 0);

    Object.entries(vendedoresMap)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([vendedor, stats]) => {
        const pct = granTotal > 0 ? (stats.total / granTotal) * 100 : 0;
        rowsVendedores.push([
          vendedor,
          stats.facturas,
          stats.contado,
          stats.credito,
          stats.total,
          `${pct.toFixed(2)}%`
        ]);
      });

    rowsVendedores.push([]);
    rowsVendedores.push([
      'TOTAL GENERAL',
      validDocs.length,
      Object.values(vendedoresMap).reduce((acc, curr) => acc + curr.contado, 0),
      Object.values(vendedoresMap).reduce((acc, curr) => acc + curr.credito, 0),
      granTotal,
      '100.00%'
    ]);

    rowsVendedores.push([]);
    rowsVendedores.push(['--- DETALLE DE FACTURAS POR VENDEDOR ---']);
    rowsVendedores.push([
      '#', 'VENDEDOR', 'FECHA', 'CORRELATIVO', 'CLIENTE', 'CONDICIÓN', 'TOTAL (HNL)'
    ]);

    validDocs
      .sort((a, b) => (a.vendedorNombre || '').localeCompare(b.vendedorNombre || ''))
      .forEach((d, idx) => {
        rowsVendedores.push([
          idx + 1,
          d.vendedorNombre || 'Sin Vendedor',
          formatFecha(d.fechaEmision),
          d.correlativo,
          d.cliente.nombre,
          d.terminosPago || 'Contado',
          d.total
        ]);
      });

    const worksheet = XLSX.utils.aoa_to_sheet(rowsVendedores);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comisiones Vendedores');

  } else if (tipo === 'PRODUCTOS') {
    // Agrupación por Producto
    const productosMap: Record<string, { cantidad: number; total: number; subtotal: number; isv: number }> = {};
    const validDocs = data.filter(d => d.estado !== 'ANULADA');

    validDocs.forEach(d => {
      d.detalles.forEach(item => {
        const nombre = item.descripcion.trim().toUpperCase();
        if (!productosMap[nombre]) {
          productosMap[nombre] = { cantidad: 0, total: 0, subtotal: 0, isv: 0 };
        }
        productosMap[nombre].cantidad += item.cantidad;
        productosMap[nombre].total += item.totalLinea;
        const sub = item.cantidad * item.precioUnitario - item.totalDescuento;
        productosMap[nombre].subtotal += sub;
        productosMap[nombre].isv += (item.totalLinea - sub);
      });
    });

    const rowsProductos: any[] = [
      [organizationName.toUpperCase()],
      ['DETALLE DE PRODUCTOS FACTURADOS Y SALIDAS (KÁRDEX)'],
      [`Período: ${rangoTexto} | Generado: ${fechaGeneracion}`],
      [],
      ['DESCRIPCIÓN DEL PRODUCTO', 'UNIDADES VENDIDAS', 'PRECIO PROMEDIO (HNL)', 'SUBTOTAL (HNL)', 'TOTAL ISV (HNL)', 'TOTAL FACTURADO (HNL)', '% DEL TOTAL']
    ];

    const granTotal = Object.values(productosMap).reduce((acc, curr) => acc + curr.total, 0);

    Object.entries(productosMap)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([desc, stats]) => {
        const precioProm = stats.cantidad > 0 ? stats.subtotal / stats.cantidad : 0;
        const pct = granTotal > 0 ? (stats.total / granTotal) * 100 : 0;
        rowsProductos.push([
          desc,
          stats.cantidad,
          precioProm,
          stats.subtotal,
          stats.isv,
          stats.total,
          `${pct.toFixed(2)}%`
        ]);
      });

    rowsProductos.push([]);
    rowsProductos.push([
      'TOTAL GENERAL',
      Object.values(productosMap).reduce((acc, curr) => acc + curr.cantidad, 0),
      '',
      Object.values(productosMap).reduce((acc, curr) => acc + curr.subtotal, 0),
      Object.values(productosMap).reduce((acc, curr) => acc + curr.isv, 0),
      granTotal,
      '100.00%'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(rowsProductos);
    worksheet['!cols'] = [
      { wch: 45 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos Vendidos');
  }

  const fileName = `Reporte_${tipo}_${filtros.fechaInicio}_al_${filtros.fechaFin}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Genera y descarga el archivo PDF (.pdf) formal para contabilidad
 */
export async function exportarReportePDF({ tipo, data, filtros, organizationName = 'DISTRIBUIDORA PARAISO FLORAL' }: ExportContext) {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;

  // Formato Horizontal Carta (Landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Header Corporativo
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, y, pageWidth - (margin * 2), 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(organizationName.toUpperCase(), margin + 6, y + 8);

  const titulosMap: Record<TipoReporte, string> = {
    VENTAS_SAR: 'LIBRO DE VENTAS FISCALES (SAR)',
    METODOS_PAGO: 'RESUMEN DE COBROS POR MÉTODO DE PAGO Y ARQUEO',
    VENDEDORES: 'LIQUIDACIÓN DE VENTAS POR VENDEDOR',
    PRODUCTOS: 'DETALLE DE PRODUCTOS Y SALIDAS DE INVENTARIO'
  };

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(titulosMap[tipo], margin + 6, y + 15);

  doc.setFontSize(8);
  doc.text(`Período: ${filtros.fechaInicio} al ${filtros.fechaFin}`, pageWidth - margin - 6, y + 8, { align: 'right' });
  doc.text(`Generado: ${new Date().toLocaleString('es-HN')}`, pageWidth - margin - 6, y + 15, { align: 'right' });

  y += 28;

  // Resumen / KPIs
  const validDocs = data.filter(d => d.estado !== 'ANULADA');
  const totalFacturado = validDocs.reduce((acc, d) => acc + d.total, 0);
  const totalIsv = validDocs.reduce((acc, d) => acc + d.isv15 + d.isv18, 0);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Facturado: L. ${formatMoneda(totalFacturado)}   |   Total ISV: L. ${formatMoneda(totalIsv)}   |   Documentos: ${data.length} (${validDocs.length} vigentes, ${data.length - validDocs.length} anuladas)`, margin, y);
  y += 6;

  // Render Table depending on report type
  if (tipo === 'VENTAS_SAR') {
    const colWidths = [10, 22, 38, 28, 55, 18, 20, 24, 20, 26];
    const headers = ['#', 'Fecha', 'Correlativo', 'RTN', 'Cliente', 'Estado', 'Exento', 'Gravado 15%', 'ISV 15%', 'Total L.'];

    // Header de columnas
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    let curX = margin + 2;
    headers.forEach((h, i) => {
      doc.text(h, curX, y + 5);
      curX += colWidths[i];
    });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    data.forEach((d, idx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }

      const isAnulada = d.estado === 'ANULADA';
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, pageWidth - (margin * 2), 6, 'F');
      }

      curX = margin + 2;
      const rowVals = [
        String(idx + 1),
        formatFecha(d.fechaEmision),
        d.correlativo,
        d.cliente.rtn ? d.cliente.rtn.substring(0, 16) : 'C. Final',
        d.cliente.nombre.substring(0, 32),
        d.estado,
        formatMoneda(isAnulada ? 0 : d.totalExento),
        formatMoneda(isAnulada ? 0 : d.totalGravado15),
        formatMoneda(isAnulada ? 0 : d.isv15),
        formatMoneda(isAnulada ? 0 : d.total)
      ];

      rowVals.forEach((val, i) => {
        if (i >= 6) {
          doc.text(val, curX + colWidths[i] - 4, y, { align: 'right' });
        } else {
          doc.text(val, curX, y);
        }
        curX += colWidths[i];
      });

      y += 5.5;
    });

  } else if (tipo === 'VENDEDORES') {
    // Resumen de vendedores
    const vendedoresMap: Record<string, { facturas: number; contado: number; credito: number; total: number }> = {};
    validDocs.forEach(d => {
      const v = d.vendedorNombre?.trim() || 'Sin Vendedor';
      if (!vendedoresMap[v]) vendedoresMap[v] = { facturas: 0, contado: 0, credito: 0, total: 0 };
      const terminos = (d.terminosPago || '').toLowerCase();
      const esCred = terminos.includes('crédito') || terminos.includes('credito') || terminos.includes('días') || terminos.includes('dias');
      vendedoresMap[v].facturas++;
      vendedoresMap[v].total += d.total;
      if (esCred) vendedoresMap[v].credito += d.total;
      else vendedoresMap[v].contado += d.total;
    });

    const colWidths = [12, 60, 30, 45, 45, 45, 20];
    const headers = ['#', 'Vendedor', 'Facturas', 'Ventas Contado L.', 'Ventas Crédito L.', 'Total Facturado L.', '% Part.'];

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    let curX = margin + 2;
    headers.forEach((h, i) => {
      doc.text(h, curX, y + 5);
      curX += colWidths[i];
    });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    Object.entries(vendedoresMap)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([vend, stats], idx) => {
        const pct = totalFacturado > 0 ? (stats.total / totalFacturado) * 100 : 0;
        curX = margin + 2;
        const vals = [
          String(idx + 1),
          vend,
          String(stats.facturas),
          formatMoneda(stats.contado),
          formatMoneda(stats.credito),
          formatMoneda(stats.total),
          `${pct.toFixed(1)}%`
        ];

        vals.forEach((v, i) => {
          if (i >= 2) {
            doc.text(v, curX + colWidths[i] - 4, y, { align: 'right' });
          } else {
            doc.text(v, curX, y);
          }
          curX += colWidths[i];
        });
        y += 6;
      });

  } else {
    // Otros reportes genéricos en PDF
    const colWidths = [12, 25, 40, 70, 40, 40, 30];
    const headers = ['#', 'Fecha', 'Correlativo', 'Cliente', 'Método', 'Vendedor', 'Total L.'];

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    let curX = margin + 2;
    headers.forEach((h, i) => {
      doc.text(h, curX, y + 5);
      curX += colWidths[i];
    });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    validDocs.forEach((d, idx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }
      curX = margin + 2;
      const vals = [
        String(idx + 1),
        formatFecha(d.fechaEmision),
        d.correlativo,
        d.cliente.nombre.substring(0, 35),
        d.metodoPago || 'Efectivo',
        d.vendedorNombre || 'Sin Vendedor',
        formatMoneda(d.total)
      ];

      vals.forEach((v, i) => {
        if (i === 6) {
          doc.text(v, curX + colWidths[i] - 4, y, { align: 'right' });
        } else {
          doc.text(v, curX, y);
        }
        curX += colWidths[i];
      });
      y += 6;
    });
  }

  // Footer con paginación
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages} - ${organizationName} - Sistema de Facturación Contable`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const fileName = `Reporte_${tipo}_${filtros.fechaInicio}_al_${filtros.fechaFin}.pdf`;
  doc.save(fileName);
}

/**
 * Abre una ventana emergente lista para imprimir con el diseño formal contable
 */
export function imprimirReporteHTML({ tipo, data, filtros, organizationName = 'DISTRIBUIDORA PARAISO FLORAL' }: ExportContext) {
  const titulosMap: Record<TipoReporte, string> = {
    VENTAS_SAR: 'Libro de Ventas Fiscales (Formato SAR)',
    METODOS_PAGO: 'Resumen de Cobros por Método de Pago y Arqueo',
    VENDEDORES: 'Liquidación de Ventas por Vendedor (Comisiones)',
    PRODUCTOS: 'Detalle de Productos Facturados y Salidas (Kárdex)'
  };

  const validDocs = data.filter(d => d.estado !== 'ANULADA');
  const totalFacturado = validDocs.reduce((acc, d) => acc + d.total, 0);
  const totalIsv15 = validDocs.reduce((acc, d) => acc + d.isv15, 0);
  const totalExento = validDocs.reduce((acc, d) => acc + d.totalExento, 0);

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${titulosMap[tipo]} - ${organizationName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; font-size: 11px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
        .title { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; }
        .subtitle { font-size: 12px; color: #475569; margin: 3px 0 0 0; font-weight: 600; }
        .meta { text-align: right; font-size: 10px; color: #64748b; }
        .kpis { display: flex; gap: 15px; margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .kpi-item { flex: 1; }
        .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .kpi-val { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th { background: #f1f5f9; color: #334155; text-align: left; padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold; }
        td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) { background: #fafafa; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge-anulada { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; }
        .badge-emitida { background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; }
        .totales-row { font-weight: bold; background: #e2e8f0 !important; border-top: 2px solid #0f172a; }
        @media print {
          @page { size: letter landscape; margin: 12mm; }
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${organizationName}</h1>
          <p class="subtitle">${titulosMap[tipo]}</p>
        </div>
        <div class="meta">
          <div><strong>Rango:</strong> ${filtros.fechaInicio} al ${filtros.fechaFin}</div>
          <div><strong>Generado:</strong> ${new Date().toLocaleString('es-HN')}</div>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi-item">
          <div class="kpi-label">Total Facturado</div>
          <div class="kpi-val">L. ${formatMoneda(totalFacturado)}</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-label">ISV Cobrado (15%)</div>
          <div class="kpi-val">L. ${formatMoneda(totalIsv15)}</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-label">Ventas Exentas</div>
          <div class="kpi-val">L. ${formatMoneda(totalExento)}</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-label">Total Documentos</div>
          <div class="kpi-val">${data.length} (${validDocs.length} Válidos / ${data.length - validDocs.length} Anulados)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Fecha</th>
            <th>Correlativo</th>
            <th>RTN</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Estado</th>
            <th class="text-right">Exento L.</th>
            <th class="text-right">Gravado 15% L.</th>
            <th class="text-right">ISV 15% L.</th>
            <th class="text-right">Total Factura L.</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((d, i) => {
            const isAnulada = d.estado === 'ANULADA';
            return `
              <tr>
                <td>${i + 1}</td>
                <td>${formatFecha(d.fechaEmision)}</td>
                <td><strong>${d.correlativo}</strong></td>
                <td>${d.cliente.rtn || 'Consumidor Final'}</td>
                <td>${d.cliente.nombre}</td>
                <td>${d.vendedorNombre || '-'}</td>
                <td><span class="${isAnulada ? 'badge-anulada' : 'badge-emitida'}">${d.estado}</span></td>
                <td class="text-right">${formatMoneda(isAnulada ? 0 : d.totalExento)}</td>
                <td class="text-right">${formatMoneda(isAnulada ? 0 : d.totalGravado15)}</td>
                <td class="text-right">${formatMoneda(isAnulada ? 0 : d.isv15)}</td>
                <td class="text-right"><strong>${formatMoneda(isAnulada ? 0 : d.total)}</strong></td>
              </tr>
            `;
          }).join('')}
          <tr class="totales-row">
            <td colspan="7">TOTALES</td>
            <td class="text-right">${formatMoneda(totalExento)}</td>
            <td class="text-right">${formatMoneda(validDocs.reduce((a, b) => a + b.totalGravado15, 0))}</td>
            <td class="text-right">${formatMoneda(totalIsv15)}</td>
            <td class="text-right">${formatMoneda(totalFacturado)}</td>
          </tr>
        </tbody>
      </table>

      <script>
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
