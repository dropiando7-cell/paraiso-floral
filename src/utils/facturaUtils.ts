/**
 * Utilidades para determinar condiciones de crédito, vencimientos y estados de pago de Facturas.
 * Distribuidora Paraíso Floral.
 */

export function isCredito(terminosPago?: string | null): boolean {
  if (!terminosPago) return false;
  const t = terminosPago.toLowerCase().trim();
  if (t === 'pago inmediato' || t === 'contado' || t === 'efectivo') return false;
  return (
    t.includes('15') ||
    t.includes('30') ||
    t.includes('60') ||
    t.includes('90') ||
    t.includes('crédito') ||
    t.includes('credito') ||
    t.includes('días') ||
    t.includes('dias')
  );
}

export function getDiasCredito(terminosPago?: string | null, fallback: number = 30): number {
  if (!terminosPago) return fallback;
  const match = terminosPago.match(/\d+/);
  return match ? parseInt(match[0], 10) : fallback;
}

export function calcularFechaVencimiento(
  fechaEmision: Date | string,
  terminosPago?: string | null,
  fallbackDias: number = 30
): Date | null {
  if (!isCredito(terminosPago)) return null;
  const dias = getDiasCredito(terminosPago, fallbackDias);
  const base = new Date(fechaEmision);
  return new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);
}

/**
 * Determina si un ítem de factura/documento corresponde a un cargo de envío o flete
 * ("ENVIO", "ENVIOS", "ENVÍO", "FLETE", etc.) para excluirlo del conteo de bultos/paquetes.
 */
export function isEnvioItem(itemOrDesc: any): boolean {
  if (!itemOrDesc) return false;
  const rawText =
    typeof itemOrDesc === 'string'
      ? itemOrDesc
      : itemOrDesc.shortDesc ||
        itemOrDesc.nombre ||
        itemOrDesc.productoNombre ||
        itemOrDesc.descripcion ||
        '';
  if (!rawText) return false;

  const firstLine = String(rawText)
    .split('\n')[0]
    .split('__METADATA__')[0]
    .split('Producto registrado')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!firstLine) return false;

  return /\b(envi[oa]\w*|emvi[oa]\w*|enbi[oa]\w*|flete\w*|delivery)\b/.test(firstLine);
}

/**
 * Determina si un cliente corresponde a HONDUFLORES (floristería hija de Paraíso Floral),
 * ya sea por nombre o por RTN (0501199108836).
 */
export function isHondufloresClient(client?: { id?: string; name?: string; nombre?: string; rtn?: string | null } | null): boolean {
  if (!client) return false;
  const rawName = String(client.name || client.nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '');
  const rawRtn = String(client.rtn || '').trim();
  return rawName.includes('HONDUFLORES') || rawRtn === '0501199108836';
}

/**
 * Determina si una factura fue emitida bajo modalidad de Crédito (por términos o método de pago).
 */
export function isCreditoFactura(terminosPago?: string | null, metodoPago?: string | null): boolean {
  const m = (metodoPago || '').toLowerCase().trim();
  if (m === 'crédito' || m === 'credito') return true;
  return isCredito(terminosPago);
}

/**
 * Determina si una factura fue pagada directamente en el módulo de Facturación
 * (Contado / Pago inmediato / Caja / Transferencia confirmada).
 */
export function esFacturaPagadaEnFacturacion(f: {
  terminosPago?: string | null;
  metodoPago?: string | null;
  estadoPago?: string | null;
  estado?: string | null;
}): boolean {
  if (isCreditoFactura(f.terminosPago, f.metodoPago)) return false;
  return f.estadoPago === 'PAGADA' || f.estado === 'PAGADA';
}

export interface FacturaCxCInput {
  id: string;
  total?: any;
  saldoPendiente?: any;
  estadoPago?: string | null;
  estado?: string | null;
  terminosPago?: string | null;
  metodoPago?: string | null;
  fechaEmision: Date | string;
  [key: string]: any;
}

export interface PagoCxCInput {
  id?: string;
  monto?: any;
  fecha?: Date | string;
  metodoPago?: string | null;
  notas?: string | null;
  detalles?: Array<{
    facturaId: string;
    montoAplicado?: any;
  }>;
  [key: string]: any;
}

/**
 * Extrae el monto de excedente que fue enviado al Monedero Virtual desde un abono CXC.
 */
export function extractExcedenteMonedero(notas?: string | null): number {
  if (!notas) return 0;
  const match = String(notas).match(/\[MONEDERO:\+(\d+(?:\.\d+)?)\]/i);
  return match ? Number(match[1]) || 0 : 0;
}

/**
 * Extrae el monto de Saldo a Favor (Monedero) aplicado a una factura.
 */
export function extractSaldoFavorAplicado(facturaOrNotas?: any): number {
  if (!facturaOrNotas) return 0;
  if (typeof facturaOrNotas === 'object') {
    if (typeof facturaOrNotas.montoSaldoFavorAplicado === 'number' && facturaOrNotas.montoSaldoFavorAplicado > 0) {
      return facturaOrNotas.montoSaldoFavorAplicado;
    }
    if (Array.isArray(facturaOrNotas.detallesPago) && facturaOrNotas.detallesPago.length > 0) {
      const sumMonedero = facturaOrNotas.detallesPago.reduce((acc: number, dp: any) => {
        const metodo = dp?.pago?.metodoPago || dp?.metodoPago || '';
        const anulado = dp?.pago?.anulado === true;
        if (!anulado && String(metodo).toUpperCase() === 'MONEDERO') {
          return acc + (Number(dp.montoAplicado) || 0);
        }
        return acc;
      }, 0);
      if (sumMonedero > 0) return Number(sumMonedero.toFixed(2));
    }
  }
  const notas = typeof facturaOrNotas === 'string' ? facturaOrNotas : (facturaOrNotas.notas || '');
  if (!notas) return 0;
  const tagMatch = String(notas).match(/\[SALDO_FAVOR_APLICADO:(\d+(?:\.\d+)?)\]/i);
  if (tagMatch) return Number(tagMatch[1]) || 0;
  const textMatch = String(notas).match(/SALDO A FAVOR APLICADO:\s*\(-\)\s*(?:L\.?|HNL)?\s*([\d,]+(?:\.\d+)?)/i);
  if (textMatch) {
    const val = Number(textMatch[1].replace(/,/g, ''));
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

export interface NotaCreditoCxCInput {
  id?: string;
  facturaId?: string | null;
  monto?: any;
  fecha?: Date | string;
  [key: string]: any;
}

export interface FacturaCxCCalculadaInfo {
  saldoPendiente: number;
  estadoPago: 'PAGADA' | 'PARCIAL' | 'PENDIENTE';
  pagadoEnFacturacion: number;
  cubiertoPorCxc: number;
}

/**
 * Calcula de forma unificada el estado de cuenta CXC de un cliente,
 * respetando abonos manuales de CXC (sin duplicar pagos) y contabilizando
 * los pagos realizados directamente en Facturación (Contado / Caja).
 */
export function calcularEstadoCuentaClienteCxC(params: {
  saldoInicial?: any;
  facturas: FacturaCxCInput[];
  pagos: PagoCxCInput[];
  notasCredito: NotaCreditoCxCInput[];
}) {
  const sInicial = Number(params.saldoInicial || 0);
  const totalPagosCxc = (params.pagos || []).reduce((sum, p) => {
    const montoBruto = Number(p.monto || 0);
    const excedenteMonedero = extractExcedenteMonedero(p.notas);
    return sum + Math.max(0, montoBruto - excedenteMonedero);
  }, 0);
  const totalNotasCredito = (params.notasCredito || []).reduce((sum, n) => sum + Number(n.monto || 0), 0);

  const abonosAplicados = (params.pagos || []).reduce(
    (sum, p) => sum + (p.detalles || []).reduce((s, d) => s + Number(d.montoAplicado || 0), 0),
    0
  );
  const abonosLibres = Math.max(0, totalPagosCxc - abonosAplicados);
  const ncLibres = (params.notasCredito || [])
    .filter((n) => !n.facturaId)
    .reduce((sum, n) => sum + Number(n.monto || 0), 0);

  // 1. El crédito libre en CXC cubre primero el saldo inicial de libreta Excel
  const abonoAplicadoSI = Math.min(sInicial, abonosLibres);
  let abonosLibresRestantes = Math.max(0, abonosLibres - abonoAplicadoSI);
  const ncAplicadoSI = Math.min(Math.max(0, sInicial - abonoAplicadoSI), ncLibres);
  let ncLibresRestantes = Math.max(0, ncLibres - ncAplicadoSI);
  const saldoInicialPendiente = Number(Math.max(0, sInicial - abonoAplicadoSI - ncAplicadoSI).toFixed(2));

  // 2. Ordenar facturas cronológicamente (antiguas primero) para cascada FIFO
  const facturasAsc = [...(params.facturas || [])].sort(
    (a, b) => new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime()
  );

  const mapaFacturasInfo: Record<string, FacturaCxCCalculadaInfo> = {};
  let totalPagadoEnFacturacion = 0;

  for (const f of facturasAsc) {
    const total = Number(f.total || 0);

    const pagosDirectos = (params.pagos || []).reduce((sum, p) => {
      const det = (p.detalles || []).find((d) => d.facturaId === f.id);
      return sum + (det ? Number(det.montoAplicado || 0) : 0);
    }, 0);

    const ncDirectas = (params.notasCredito || []).reduce((sum, nc) => {
      return sum + (nc.facturaId === f.id ? Number(nc.monto || 0) : 0);
    }, 0);

    const saldoFavorAplicado = extractSaldoFavorAplicado(f);

    const cubiertoDirecto = Math.min(total, pagosDirectos + ncDirectas + saldoFavorAplicado);
    let restante = Math.max(0, total - cubiertoDirecto);
    let cubiertoLibre = 0;
    let pagadoEnFacturacion = 0;

    if (esFacturaPagadaEnFacturacion(f)) {
      // Si se registró un abono manual en CXC para cubrir una factura de contado,
      // consumir primero ese abono libre para no duplicar el pago en el Libro Mayor ni afectar facturas de crédito.
      if (restante > 0 && abonosLibresRestantes > 0) {
        cubiertoLibre = Math.min(restante, abonosLibresRestantes);
        restante = Math.max(0, restante - cubiertoLibre);
        abonosLibresRestantes = Math.max(0, abonosLibresRestantes - cubiertoLibre);
      }
      if (restante > 0) {
        pagadoEnFacturacion = Number(restante.toFixed(2));
        totalPagadoEnFacturacion += pagadoEnFacturacion;
        restante = 0;
      }
    } else {
      // Para facturas de crédito, aplicar únicamente el crédito libre en CXC que ya haya sido
      // reconocido en el saldo de la factura en base de datos (evita que ajustes de saldoInicial
      // o abonos no vinculados marquen como PAGADA una factura que sigue PENDIENTE en Facturación).
      const saldoEnDB =
        f.estadoPago === 'PAGADA' || f.estado === 'PAGADA'
          ? 0
          : f.saldoPendiente !== null && f.saldoPendiente !== undefined
            ? Number(f.saldoPendiente)
            : restante;
      let brechaReconocidaEnDB = Math.max(0, restante - saldoEnDB);

      if (brechaReconocidaEnDB > 0 && ncLibresRestantes > 0) {
        const cubNC = Math.min(brechaReconocidaEnDB, ncLibresRestantes);
        cubiertoLibre += cubNC;
        restante = Math.max(0, restante - cubNC);
        brechaReconocidaEnDB = Math.max(0, brechaReconocidaEnDB - cubNC);
        ncLibresRestantes = Math.max(0, ncLibresRestantes - cubNC);
      }

      if (brechaReconocidaEnDB > 0 && abonosLibresRestantes > 0) {
        const cubAbono = Math.min(brechaReconocidaEnDB, abonosLibresRestantes);
        cubiertoLibre += cubAbono;
        restante = Math.max(0, restante - cubAbono);
        abonosLibresRestantes = Math.max(0, abonosLibresRestantes - cubAbono);
      }
    }

    const saldo = restante <= 0.01 ? 0 : Number(restante.toFixed(2));
    const estadoPago: 'PAGADA' | 'PARCIAL' | 'PENDIENTE' =
      saldo === 0 ? 'PAGADA' : saldo < total - 0.01 ? 'PARCIAL' : 'PENDIENTE';

    mapaFacturasInfo[f.id] = {
      saldoPendiente: saldo,
      estadoPago,
      pagadoEnFacturacion,
      cubiertoPorCxc: Number((cubiertoDirecto + cubiertoLibre).toFixed(2)),
    };
  }

  const totalFacturas = (params.facturas || []).reduce((sum, f) => sum + Number(f.total || 0), 0);
  const totalFacturado = Number((sInicial + totalFacturas).toFixed(2));
  totalPagadoEnFacturacion = Number(totalPagadoEnFacturacion.toFixed(2));
  const totalAbonado = Number((totalPagosCxc + totalPagadoEnFacturacion).toFixed(2));
  const sumaSaldosFacturas = Object.values(mapaFacturasInfo).reduce((sum, info) => sum + info.saldoPendiente, 0);
  const saldoTotal = Number(Math.max(0, saldoInicialPendiente + sumaSaldosFacturas).toFixed(2));

  return {
    sInicial,
    saldoInicialPendiente,
    totalFacturas: Number(totalFacturas.toFixed(2)),
    totalFacturado,
    totalPagosCxc: Number(totalPagosCxc.toFixed(2)),
    totalPagadoEnFacturacion,
    totalAbonado,
    totalNotasCredito: Number(totalNotasCredito.toFixed(2)),
    saldoTotal,
    mapaFacturasInfo,
  };
}
