import * as XLSX from 'xlsx';

export interface ClienteExportItem {
  nombre: string;
  telefono: string | null;
  email?: string | null;
  direccion?: string | null;
  departamento?: string | null;
  saldoTotal: number;
  saldoVencido: number;
  facturasPendientesCount: number;
  maxDiasMora: number;
  estadoMorosidad?: string;
  ultimoPago?: {
    monto: number;
    fecha: string;
  } | null;
}

export interface MovimientoExportItem {
  fecha: string | Date;
  tipo: string;
  documento: string;
  detalles: string;
  debito: number;
  credito: number;
  saldoAcumulado: number;
}

/**
 * Exporta la cartera completa de cuentas por cobrar a un archivo Excel (.xlsx)
 */
export function exportarCarteraGeneralExcel(
  clientes: ClienteExportItem[],
  titulo: string = 'CARTERA DE CUENTAS POR COBRAR - PARAISO FLORAL'
) {
  const dataRows: any[] = [];

  // Fila de encabezado general
  dataRows.push([titulo]);
  dataRows.push([`Fecha de Generación: ${new Date().toLocaleString('es-HN')}`]);
  dataRows.push([]); // Espacio

  // Encabezados de columnas
  dataRows.push([
    '#',
    'CLIENTE',
    'TELÉFONO',
    'UBICACIÓN / RUTA',
    'FACTURAS PENDIENTES',
    'MÁX. DÍAS MORA',
    'ESTADO MOROSIDAD',
    'SALDO PENDIENTE (HNL)',
    'SALDO VENCIDO (HNL)',
    'ÚLTIMO ABONO (HNL)',
    'FECHA ÚLTIMO ABONO'
  ]);

  let totalCartera = 0;
  let totalVencido = 0;

  clientes.forEach((c, index) => {
    totalCartera += Number(c.saldoTotal || 0);
    totalVencido += Number(c.saldoVencido || 0);

    let estado = 'Al Día (0-7d)';
    if (c.saldoTotal <= 0) estado = 'Solventado';
    else if (c.maxDiasMora > 30) estado = 'En Riesgo (>30d)';
    else if (c.maxDiasMora > 15) estado = 'Vencido (16-30d)';
    else if (c.maxDiasMora > 7) estado = 'Por Vencer (8-15d)';

    dataRows.push([
      index + 1,
      c.nombre,
      c.telefono || 'Sin teléfono',
      c.departamento || 'No especificado',
      c.facturasPendientesCount || 0,
      c.maxDiasMora || 0,
      estado,
      Number(c.saldoTotal || 0),
      Number(c.saldoVencido || 0),
      c.ultimoPago ? Number(c.ultimoPago.monto) : 0,
      c.ultimoPago?.fecha ? new Date(c.ultimoPago.fecha).toLocaleDateString('es-HN') : 'Sin pagos'
    ]);
  });

  // Fila de Totales
  dataRows.push([]);
  dataRows.push([
    'TOTALES',
    '',
    '',
    '',
    '',
    '',
    '',
    totalCartera,
    totalVencido,
    '',
    ''
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

  // Ajuste de ancho de columnas
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 35 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cartera CxC');

  const fechaStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Cartera_CxC_Paraiso_Floral_${fechaStr}.xlsx`);
}

/**
 * Exporta el estado de cuenta individual del cliente (Libro Mayor) a Excel (.xlsx)
 */
export function exportarEstadoCuentaClienteExcel(
  cliente: {
    nombre: string;
    telefono?: string | null;
    rtn?: string | null;
    departamento?: string | null;
    saldoTotal: number;
  },
  movimientos: MovimientoExportItem[]
) {
  const dataRows: any[] = [];

  dataRows.push(['DISTRIBUIDORA PARAISO FLORAL']);
  dataRows.push(['ESTADO DE CUENTA INDIVIDUAL / LIBRO MAYOR']);
  dataRows.push([`CLIENTE: ${cliente.nombre}`]);
  dataRows.push([`TELÉFONO: ${cliente.telefono || 'Sin teléfono'} | RTN: ${cliente.rtn || 'Consumidor Final'}`]);
  dataRows.push([`FECHA EMISIÓN: ${new Date().toLocaleString('es-HN')}`]);
  dataRows.push([`SALDO TOTAL ACTUAL: L. ${cliente.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`]);
  dataRows.push([]); // Espacio

  // Encabezados
  dataRows.push([
    '#',
    'FECHA',
    'TIPO MOVIMIENTO',
    'DOCUMENTO / REF',
    'DESCRIPCIÓN / DETALLE',
    'CARGO / DÉBITO (+)',
    'ABONO / CRÉDITO (-)',
    'SALDO RESULTANTE (=)'
  ]);

  let totalDebitos = 0;
  let totalCreditos = 0;

  movimientos.forEach((m, idx) => {
    totalDebitos += Number(m.debito || 0);
    totalCreditos += Number(m.credito || 0);

    const fechaFormat = m.fecha instanceof Date
      ? m.fecha.toLocaleDateString('es-HN')
      : new Date(m.fecha).toLocaleDateString('es-HN');

    dataRows.push([
      idx + 1,
      fechaFormat,
      m.tipo,
      m.documento,
      m.detalles,
      Number(m.debito || 0),
      Number(m.credito || 0),
      Number(m.saldoAcumulado || 0)
    ]);
  });

  // Totales
  dataRows.push([]);
  dataRows.push([
    'TOTALES',
    '',
    '',
    '',
    '',
    totalDebitos,
    totalCreditos,
    Number(cliente.saldoTotal || 0)
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 45 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  const nombreLimpio = cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  XLSX.utils.book_append_sheet(workbook, worksheet, nombreLimpio || 'EstadoCuenta');

  const fechaStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `EstadoCuenta_${nombreLimpio}_${fechaStr}.xlsx`);
}
