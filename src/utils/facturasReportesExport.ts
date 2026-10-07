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
 * Genera el documento PDF formal con el diseño idéntico a CXC
 * FONDO 100% BLANCO - AHORRO DE TINTA - LÍNEA VERDE ESMERALDA - RESÚMENES CLAROS
 */
export async function exportarReportePDF({ tipo, data, filtros, organizationName = 'DISTRIBUIDORA PARAISO FLORAL' }: ExportContext) {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;

  // Si es SAR usamos landscape por la cantidad de columnas fiscales.
  // Si son Vendedores, Métodos de Pago o Productos usamos Portrait para máxima pulcritud tipo CXC.
  const isLandscape = tipo === 'VENTAS_SAR';
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  const titulosMap: Record<TipoReporte, { badge: string; sub: string }> = {
    VENTAS_SAR: { badge: 'REPORTE OFICIAL SAR', sub: 'LIBRO DE VENTAS FISCALES' },
    METODOS_PAGO: { badge: 'REPORTE DE COBROS', sub: 'RESUMEN POR MÉTODO DE PAGO Y ARQUEO' },
    VENDEDORES: { badge: 'REPORTE DE COMISIONES', sub: 'LIQUIDACIÓN DE VENTAS POR VENDEDOR' },
    PRODUCTOS: { badge: 'REPORTE DE KÁRDEX', sub: 'DETALLE DE PRODUCTOS Y SALIDAS' }
  };

  const infoReporte = titulosMap[tipo];
  const validDocs = data.filter(d => d.estado !== 'ANULADA');
  const totalFacturado = validDocs.reduce((acc, d) => acc + d.total, 0);
  const totalIsv = validDocs.reduce((acc, d) => acc + d.isv15 + d.isv18, 0);
  const totalExento = validDocs.reduce((acc, d) => acc + d.totalExento, 0);
  const totalGravado15 = validDocs.reduce((acc, d) => acc + d.totalGravado15, 0);

  // --- CABECERA ESTILO CXC (BLANCA CON LÍNEA ESMERALDA) ---
  // Título principal en verde esmeralda institucional
  doc.setTextColor(6, 95, 70); // #065f46
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(organizationName.toUpperCase(), margin, y + 4);

  // Subtítulo
  doc.setTextColor(51, 65, 85); // #334155
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Mayorista y Distribuidora de Flores y Follajes Fresh 🌹', margin, y + 9);

  // Dirección y contacto
  doc.setTextColor(100, 116, 139); // #64748b
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula, Cortés | Tel: +(504) 8854-2199', margin, y + 13);

  // Badge en la esquina derecha (Estilo CXC: fondo blanco/muy claro con borde esmeralda)
  const badgeWidth = 48;
  const badgeX = pageWidth - margin - badgeWidth;
  doc.setFillColor(236, 253, 245); // #ecfdf5 (emerald muy claro)
  doc.setDrawColor(110, 231, 183); // #6ee7b7
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, y, badgeWidth, 7, 1.5, 1.5, 'FD');

  doc.setTextColor(6, 78, 59); // emerald 900
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(infoReporte.badge, badgeX + (badgeWidth / 2), y + 4.8, { align: 'center' });

  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emisión: ${new Date().toLocaleDateString('es-HN')}`, pageWidth - margin, y + 11.5, { align: 'right' });

  y += 16;

  // LÍNEA DIVISORIA ESMERALDA INSTITUCIONAL (Estilo CXC)
  doc.setDrawColor(5, 150, 105); // emerald-600 (#059669)
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);

  y += 4;

  // --- 2 CAJAS SUPERIORES ESTILO CXC (PARÁMETROS Y RESUMEN FINANCIERO) ---
  const boxWidth = (pageWidth - (margin * 2) - 4) / 2;
  const boxHeight = 24;

  // Caja 1 (Izquierda): Parámetros del Reporte
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setFillColor(248, 250, 252); // #f8fafc (fondo casi blanco para no gastar tinta)
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // #0f172a
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PARÁMETROS DEL REPORTE', margin + 3, y + 4.5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 3, y + 6, margin + boxWidth - 3, y + 6);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Tipo de Reporte: ${infoReporte.sub}`, margin + 3, y + 10.5);
  doc.text(`Rango de Fechas: ${filtros.fechaInicio} al ${filtros.fechaFin}`, margin + 3, y + 14.5);
  doc.text(`Empresa / Vendedor: ${filtros.origen === 'TODOS' ? 'Todas' : filtros.origen} | ${filtros.vendedor === 'TODOS' ? 'Todos' : filtros.vendedor}`, margin + 3, y + 18.5);
  doc.text(`Estado Documentos: ${filtros.estado === 'TODOS' ? 'Vigentes y Anuladas' : filtros.estado}`, margin + 3, y + 22);

  // Caja 2 (Derecha): Resumen Financiero
  const boxRightX = margin + boxWidth + 4;
  doc.setDrawColor(167, 243, 208); // #a7f3d0 (borde esmeralda suave)
  doc.setFillColor(240, 253, 244); // #f0fdf4
  doc.roundedRect(boxRightX, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Total Documentos:', boxRightX + 3, y + 5);
  doc.text(`${data.length} (${validDocs.length} vigentes, ${data.length - validDocs.length} anuladas)`, boxRightX + boxWidth - 3, y + 5, { align: 'right' });

  doc.text('Ventas Exentas (+):', boxRightX + 3, y + 9.5);
  doc.text(`L. ${formatMoneda(totalExento)}`, boxRightX + boxWidth - 3, y + 9.5, { align: 'right' });

  doc.text('ISV 15% Cobrado (+):', boxRightX + 3, y + 14);
  doc.text(`L. ${formatMoneda(totalIsv)}`, boxRightX + boxWidth - 3, y + 14, { align: 'right' });

  // Línea divisoria en caja de totales
  doc.setDrawColor(167, 243, 208);
  doc.line(boxRightX + 3, y + 16.5, boxRightX + boxWidth - 3, y + 16.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 78, 59); // esmeralda oscuro
  doc.text('TOTAL FACTURADO NETO:', boxRightX + 3, y + 21);
  doc.text(`L. ${formatMoneda(totalFacturado)}`, boxRightX + boxWidth - 3, y + 21, { align: 'right' });

  y += boxHeight + 6;

  // --- TABLAS DE DATOS ESTILO CXC ---
  // Título de la sección
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`DETALLE CONSOLIDADO - ${infoReporte.sub}`, margin, y);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);

  y += 4;

  if (tipo === 'VENDEDORES') {
    // Agrupación por Vendedor (Exacto al requerimiento de Screenshot 1 pero con diseño CXC)
    const vendedoresMap: Record<string, { facturas: number; contado: number; credito: number; total: number }> = {};
    validDocs.forEach(d => {
      const v = d.vendedorNombre?.trim() || 'Sin Vendedor Asignado';
      if (!vendedoresMap[v]) vendedoresMap[v] = { facturas: 0, contado: 0, credito: 0, total: 0 };
      const terminos = (d.terminosPago || '').toLowerCase();
      const esCred = terminos.includes('crédito') || terminos.includes('credito') || terminos.includes('días') || terminos.includes('dias');
      vendedoresMap[v].facturas++;
      vendedoresMap[v].total += d.total;
      if (esCred) vendedoresMap[v].credito += d.total;
      else vendedoresMap[v].contado += d.total;
    });

    const colWidths = [10, 56, 24, 34, 34, 34, 20];
    const headers = ['#', 'Vendedor Asignado', 'Facturas', 'Ventas Contado L.', 'Ventas Crédito L.', 'Total Facturado L.', '% Part.'];

    // Cabecera de la tabla (gris suave, sin fondos negros)
    doc.setFillColor(241, 245, 249); // #f1f5f9
    doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    let curX = margin + 2;
    headers.forEach((h, i) => {
      if (i >= 2) {
        doc.text(h, curX + colWidths[i] - 4, y + 4.5, { align: 'right' });
      } else {
        doc.text(h, curX, y + 4.5);
      }
      curX += colWidths[i];
    });

    y += 7.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    const sortedVendedores = Object.entries(vendedoresMap).sort((a, b) => b[1].total - a[1].total);

    sortedVendedores.forEach(([vend, stats], idx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }

      // Línea inferior sutil
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);

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

      doc.setTextColor(30, 41, 59);
      vals.forEach((v, i) => {
        if (i === 1) doc.setFont('helvetica', 'bold');
        else doc.setFont('helvetica', 'normal');

        if (i >= 2) {
          doc.text(v, curX + colWidths[i] - 4, y, { align: 'right' });
        } else {
          doc.text(v, curX, y);
        }
        curX += colWidths[i];
      });

      y += 5.5;
    });

    // Fila final de totales (Estilo CXC)
    y += 1;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y - 3.5, pageWidth - (margin * 2), 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTALES CONSOLIDADOS', margin + 12, y);

    const totContado = Object.values(vendedoresMap).reduce((a, b) => a + b.contado, 0);
    const totCredito = Object.values(vendedoresMap).reduce((a, b) => a + b.credito, 0);

    doc.text(String(validDocs.length), margin + colWidths[0] + colWidths[1] + colWidths[2] - 4, y, { align: 'right' });
    doc.text(formatMoneda(totContado), margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - 4, y, { align: 'right' });
    doc.text(formatMoneda(totCredito), margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] - 4, y, { align: 'right' });
    doc.text(formatMoneda(totalFacturado), margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] - 4, y, { align: 'right' });
    doc.text('100.0%', pageWidth - margin - 2, y, { align: 'right' });

  } else if (tipo === 'VENTAS_SAR') {
    // Reporte Fiscal SAR (Landscape)
    const colWidths = [10, 20, 36, 26, 56, 18, 22, 22, 20, 26];
    const headers = ['#', 'Fecha', 'Correlativo', 'RTN', 'Cliente / Razón Social', 'Estado', 'Exento L.', 'Gravado 15%', 'ISV 15%', 'Total L.'];

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    let curX = margin + 2;
    headers.forEach((h, i) => {
      if (i >= 6) {
        doc.text(h, curX + colWidths[i] - 3, y + 4.5, { align: 'right' });
      } else {
        doc.text(h, curX, y + 4.5);
      }
      curX += colWidths[i];
    });

    y += 7.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    data.forEach((d, idx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }

      const isAnulada = d.estado === 'ANULADA';
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);

      curX = margin + 2;
      const rowVals = [
        String(idx + 1),
        formatFecha(d.fechaEmision),
        d.correlativo,
        d.cliente.rtn ? d.cliente.rtn.substring(0, 16) : 'C. Final',
        d.cliente.nombre.substring(0, 34),
        d.estado,
        formatMoneda(isAnulada ? 0 : d.totalExento),
        formatMoneda(isAnulada ? 0 : d.totalGravado15),
        formatMoneda(isAnulada ? 0 : d.isv15),
        formatMoneda(isAnulada ? 0 : d.total)
      ];

      doc.setTextColor(isAnulada ? 185 : 30, isAnulada ? 28 : 41, isAnulada ? 28 : 59);

      rowVals.forEach((val, i) => {
        if (i >= 6) {
          doc.text(val, curX + colWidths[i] - 3, y, { align: 'right' });
        } else {
          doc.text(val, curX, y);
        }
        curX += colWidths[i];
      });

      y += 5.2;
    });

  } else {
    // Otros reportes genéricos con estilo CXC limpio
    const colWidths = [10, 24, 38, 54, 30, 36, 26];
    const headers = ['#', 'Fecha', 'Correlativo', 'Cliente', 'Método', 'Vendedor', 'Total L.'];

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    let curX = margin + 2;
    headers.forEach((h, i) => {
      if (i === 6) doc.text(h, curX + colWidths[i] - 4, y + 4.5, { align: 'right' });
      else doc.text(h, curX, y + 4.5);
      curX += colWidths[i];
    });

    y += 7.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    validDocs.forEach((d, idx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);

      curX = margin + 2;
      const vals = [
        String(idx + 1),
        formatFecha(d.fechaEmision),
        d.correlativo,
        d.cliente.nombre.substring(0, 32),
        d.metodoPago || 'Efectivo',
        d.vendedorNombre || 'Sin Vendedor',
        formatMoneda(d.total)
      ];

      doc.setTextColor(30, 41, 59);
      vals.forEach((v, i) => {
        if (i === 6) doc.text(v, curX + colWidths[i] - 4, y, { align: 'right' });
        else doc.text(v, curX, y);
        curX += colWidths[i];
      });
      y += 5.5;
    });
  }

  // Footer con paginación limpia (sin fondos oscuros)
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages} - ${organizationName} - Sistema de Facturación & Control Contable`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const fileName = `Reporte_${tipo}_${filtros.fechaInicio}_al_${filtros.fechaFin}.pdf`;
  doc.save(fileName);
}

/**
 * Abre la ventana con el formato IDÉNTICO AL REPORTE DE CXC para imprimir o 'Guardar como PDF'
 */
export function imprimirReporteHTML({ tipo, data, filtros, organizationName = 'DISTRIBUIDORA PARAÍSO FLORAL' }: ExportContext) {
  const titulosMap: Record<TipoReporte, { badge: string; titulo: string }> = {
    VENTAS_SAR: { badge: 'REPORTE OFICIAL SAR', titulo: 'LIBRO DE VENTAS FISCALES' },
    METODOS_PAGO: { badge: 'REPORTE DE COBROS', titulo: 'RESUMEN POR MÉTODO DE PAGO Y ARQUEO' },
    VENDEDORES: { badge: 'REPORTE DE COMISIONES', titulo: 'LIQUIDACIÓN DE VENTAS POR VENDEDOR' },
    PRODUCTOS: { badge: 'REPORTE DE KÁRDEX', titulo: 'DETALLE DE PRODUCTOS Y SALIDAS' }
  };

  const infoReporte = titulosMap[tipo];
  const validDocs = data.filter(d => d.estado !== 'ANULADA');
  const totalFacturado = validDocs.reduce((acc, d) => acc + d.total, 0);
  const totalIsv15 = validDocs.reduce((acc, d) => acc + d.isv15, 0);
  const totalExento = validDocs.reduce((acc, d) => acc + d.totalExento, 0);
  const totalGravado15 = validDocs.reduce((acc, d) => acc + d.totalGravado15, 0);

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return;

  // Si es Vendedores agrupamos
  let tablaVendedoresHTML = '';
  if (tipo === 'VENDEDORES') {
    const vendedoresMap: Record<string, { facturas: number; contado: number; credito: number; total: number }> = {};
    validDocs.forEach(d => {
      const v = d.vendedorNombre?.trim() || 'Sin Vendedor Asignado';
      if (!vendedoresMap[v]) vendedoresMap[v] = { facturas: 0, contado: 0, credito: 0, total: 0 };
      const terminos = (d.terminosPago || '').toLowerCase();
      const esCred = terminos.includes('crédito') || terminos.includes('credito') || terminos.includes('días') || terminos.includes('dias');
      vendedoresMap[v].facturas++;
      vendedoresMap[v].total += d.total;
      if (esCred) vendedoresMap[v].credito += d.total;
      else vendedoresMap[v].contado += d.total;
    });

    const totContado = Object.values(vendedoresMap).reduce((a, b) => a + b.contado, 0);
    const totCredito = Object.values(vendedoresMap).reduce((a, b) => a + b.credito, 0);

    tablaVendedoresHTML = `
      <div style="margin-top: 15px;">
        <h3 class="section-title">RESUMEN CONSOLIDADO POR VENDEDOR</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Vendedor Asignado</th>
              <th class="text-right">Facturas</th>
              <th class="text-right">Ventas Contado L.</th>
              <th class="text-right">Ventas Crédito L.</th>
              <th class="text-right">Total Facturado L.</th>
              <th class="text-right">% Part.</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(vendedoresMap)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([v, s], idx) => {
                const pct = totalFacturado > 0 ? (s.total / totalFacturado) * 100 : 0;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td style="font-weight: bold;">${v}</td>
                    <td class="text-right tabular">${s.facturas}</td>
                    <td class="text-right tabular">${formatMoneda(s.contado)}</td>
                    <td class="text-right tabular">${formatMoneda(s.credito)}</td>
                    <td class="text-right tabular font-bold">${formatMoneda(s.total)}</td>
                    <td class="text-right tabular">${pct.toFixed(1)}%</td>
                  </tr>
                `;
              }).join('')}
            <tr class="totales-row">
              <td colspan="2">TOTALES CONSOLIDADOS</td>
              <td class="text-right tabular">${validDocs.length}</td>
              <td class="text-right tabular">${formatMoneda(totContado)}</td>
              <td class="text-right tabular">${formatMoneda(totCredito)}</td>
              <td class="text-right tabular font-bold">${formatMoneda(totalFacturado)}</td>
              <td class="text-right tabular">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${infoReporte.titulo} - ${organizationName}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
          margin: 18px 24px; 
          font-size: 10px; 
          color: #0f172a; 
          background-color: #ffffff !important;
        }
        
        /* Cabecera idéntica a CXC */
        .print-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          border-bottom: 2.5px solid #059669; 
          padding-bottom: 8px; 
          margin-bottom: 12px; 
        }
        .brand-container { display: flex; align-items: center; gap: 10px; }
        .logo-img { width: 44px; height: 44px; object-fit: contain; border-radius: 50%; }
        .company-name { font-size: 16px; font-weight: 900; color: #065f46; letter-spacing: -0.3px; margin: 0; }
        .company-sub { font-size: 9px; font-weight: bold; color: #334155; margin: 2px 0 0 0; }
        .company-contact { font-size: 8px; color: #64748b; margin: 2px 0 0 0; }
        
        .badge-meta { text-align: right; }
        .report-badge { 
          display: inline-block; 
          padding: 3px 10px; 
          background: #ecfdf5; 
          color: #064e3b; 
          font-weight: 800; 
          font-size: 9px; 
          border-radius: 4px; 
          border: 1px solid #6ee7b7; 
          text-transform: uppercase;
        }
        .emission-date { font-size: 8px; color: #94a3b8; margin-top: 4px; }
        
        /* Cuadros de Parámetros y Resumen estilo CXC */
        .grid-boxes { display: flex; gap: 14px; margin-bottom: 14px; }
        .box-params { 
          flex: 1; 
          border: 1px solid #cbd5e1; 
          border-radius: 8px; 
          padding: 8px 12px; 
          background-color: #f8fafc; 
        }
        .box-resumen { 
          flex: 1; 
          border: 1px solid #a7f3d0; 
          border-radius: 8px; 
          padding: 8px 12px; 
          background-color: #f0fdf4; 
          text-align: right; 
        }
        .box-title { 
          font-size: 9px; 
          font-weight: 800; 
          color: #1e293b; 
          text-transform: uppercase; 
          border-bottom: 1px solid #e2e8f0; 
          padding-bottom: 3px; 
          margin-bottom: 6px; 
        }
        .line-item { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9px; color: #475569; }
        .line-item-total { 
          display: flex; 
          justify-content: space-between; 
          border-top: 1.5px solid #6ee7b7; 
          padding-top: 5px; 
          margin-top: 5px; 
          font-weight: 900; 
          font-size: 11px; 
          color: #064e3b; 
        }
        
        /* Tablas estilo CXC */
        .section-title { 
          font-size: 9px; 
          font-weight: 800; 
          color: #1e293b; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          border-bottom: 1px solid #cbd5e1; 
          padding-bottom: 3px; 
          margin: 12px 0 6px 0; 
        }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { 
          background: #f1f5f9; 
          color: #0f172a; 
          text-align: left; 
          padding: 5px 6px; 
          border-bottom: 1.5px solid #cbd5e1; 
          font-weight: 700; 
        }
        td { 
          padding: 4.5px 6px; 
          border-bottom: 1px solid #e2e8f0; 
          color: #334155; 
        }
        tr:nth-child(even) { background-color: #fcfcfc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .tabular { font-variant-numeric: tabular-nums; }
        .font-bold { font-weight: bold; }
        .badge-anulada { background: #fee2e2; color: #991b1b; padding: 1.5px 5px; border-radius: 3px; font-weight: bold; font-size: 8px; }
        .badge-emitida { background: #dcfce7; color: #166534; padding: 1.5px 5px; border-radius: 3px; font-weight: bold; font-size: 8px; }
        .totales-row { font-weight: 800; background: #f8fafc !important; border-top: 2px solid #0f172a; color: #0f172a; }

        @media print {
          @page { 
            size: ${tipo === 'VENTAS_SAR' ? 'letter landscape' : 'letter portrait'}; 
            margin: 10mm; 
          }
          body { margin: 0; background: #fff !important; }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="brand-container">
          <img src="/icon.png" alt="Paraíso Floral" class="logo-img" onerror="this.style.display='none'" />
          <div>
            <h1 class="company-name">${organizationName}</h1>
            <p class="company-sub">Mayorista y Distribuidora de Flores y Follajes Fresh 🌹</p>
            <p class="company-contact">8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula, Cortés | Tel: +(504) 8854-2199</p>
          </div>
        </div>
        <div class="badge-meta">
          <span class="report-badge">${infoReporte.badge}</span>
          <div class="emission-date">Emisión: ${new Date().toLocaleDateString('es-HN')}</div>
        </div>
      </div>

      <div class="grid-boxes">
        <div class="box-params">
          <div class="box-title">PARÁMETROS DEL REPORTE</div>
          <div class="line-item"><span>Reporte:</span> <strong>${infoReporte.titulo}</strong></div>
          <div class="line-item"><span>Rango de Fechas:</span> <strong>${filtros.fechaInicio} al ${filtros.fechaFin}</strong></div>
          <div class="line-item"><span>Empresa:</span> <strong>${filtros.origen === 'TODOS' ? 'Todas' : filtros.origen}</strong></div>
          <div class="line-item"><span>Vendedor:</span> <strong>${filtros.vendedor === 'TODOS' ? 'Todos los Vendedores' : filtros.vendedor}</strong></div>
        </div>

        <div class="box-resumen">
          <div class="box-title" style="text-align: right;">RESUMEN FINANCIERO</div>
          <div class="line-item"><span>Total Documentos:</span> <span class="tabular font-bold">${data.length} (${validDocs.length} Vigentes)</span></div>
          <div class="line-item"><span>Ventas Exentas:</span> <span class="tabular">L. ${formatMoneda(totalExento)}</span></div>
          <div class="line-item"><span>ISV 15% Cobrado:</span> <span class="tabular">L. ${formatMoneda(totalIsv15)}</span></div>
          <div class="line-item-total">
            <span>TOTAL FACTURADO:</span>
            <span class="tabular">L. ${formatMoneda(totalFacturado)}</span>
          </div>
        </div>
      </div>

      ${tablaVendedoresHTML}

      <div style="margin-top: 15px;">
        <h3 class="section-title">
          ${tipo === 'VENDEDORES' ? 'DETALLE DE FACTURAS EMITIDAS POR VENDEDOR' : 'DETALLE DE FACTURAS Y DOCUMENTOS'}
        </h3>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Fecha</th>
              <th>Correlativo</th>
              <th>Cliente / Razón Social</th>
              <th>Vendedor</th>
              <th class="text-center">Estado</th>
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
                  <td style="font-weight: 700; font-family: monospace;">${d.correlativo}</td>
                  <td>${d.cliente.nombre}</td>
                  <td>${d.vendedorNombre || '-'}</td>
                  <td class="text-center"><span class="${isAnulada ? 'badge-anulada' : 'badge-emitida'}">${d.estado}</span></td>
                  <td class="text-right tabular">${formatMoneda(isAnulada ? 0 : d.totalExento)}</td>
                  <td class="text-right tabular">${formatMoneda(isAnulada ? 0 : d.totalGravado15)}</td>
                  <td class="text-right tabular">${formatMoneda(isAnulada ? 0 : d.isv15)}</td>
                  <td class="text-right tabular font-bold">${formatMoneda(isAnulada ? 0 : d.total)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="totales-row">
              <td colspan="6">TOTALES GENERALES</td>
              <td class="text-right tabular">${formatMoneda(totalExento)}</td>
              <td class="text-right tabular">${formatMoneda(totalGravado15)}</td>
              <td class="text-right tabular">${formatMoneda(totalIsv15)}</td>
              <td class="text-right tabular font-bold">${formatMoneda(totalFacturado)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <script>
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
