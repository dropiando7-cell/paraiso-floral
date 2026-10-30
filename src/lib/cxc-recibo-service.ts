export interface FacturaAfectadaRecibo {
  id?: string;
  correlativo: string;
  montoAplicado: number;
}

export interface ReciboAbonoData {
  id: string;
  correlativo: string;
  fecha: string | Date;
  monto: number;
  metodoPago: string;
  banco?: string | null;
  referencia?: string | null;
  notas?: string | null;
  usuarioNombre: string;
  cliente: {
    id: string;
    nombre: string;
    rtn?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    departamento?: string | null;
  };
  facturasAfectadas: FacturaAfectadaRecibo[];
  aplicadoASaldoInicial?: number;
  excedenteMonedero?: number;
  saldoAnterior: number;
  nuevoSaldoPendiente: number;
}

/**
 * Formatea de manera formal y legible el método de pago y banco para el Recibo de Abono / Caja.
 */
export function formatFormaPagoRecibo(metodoPago?: string | null, banco?: string | null): string {
  const raw = (metodoPago || 'Efectivo').trim();
  const upper = raw.toUpperCase();
  const cleanBanco = banco?.trim() || '';

  if (upper.includes('TRANSFERENCIA') || upper.includes('DEPOSITO') || upper.includes('DEPÓSITO')) {
    return cleanBanco ? `Transferencia Bancaria (${cleanBanco})` : 'Transferencia Bancaria';
  }
  if (upper.includes('EFECTIVO')) {
    return 'Efectivo';
  }
  if (upper.includes('TARJETA')) {
    return cleanBanco ? `Tarjeta POS (${cleanBanco})` : 'Tarjeta / POS';
  }
  if (upper.includes('CHEQUE')) {
    return cleanBanco ? `Cheque (${cleanBanco})` : 'Cheque';
  }
  if (upper.includes('REDONDEO') || upper.includes('AJUSTE')) {
    return 'Ajuste Contable por Redondeo';
  }
  if (upper.includes('MONEDERO') || upper.includes('SALDO A FAVOR')) {
    return 'Aplicación de Saldo a Favor (Monedero)';
  }

  return cleanBanco ? `${raw} (${cleanBanco})` : raw;
}

/**
 * Normaliza el correlativo de factura para mostrar prefijo SAR cuando corresponde a numeración fiscal.
 */
export function formatCorrelativoFacturaRecibo(correlativo?: string | null): string {
  if (!correlativo) return 'Abono General a Cuenta';
  const clean = correlativo.trim().replace(/^#/, '');
  if (clean.toUpperCase() === 'SALDO INICIAL EXCEL' || clean.toUpperCase() === 'SALDO INICIAL') {
    return 'Saldo Inicial Registrado';
  }
  if (/^\d{3}-\d{3}-\d{2}-\d{8}$/.test(clean)) {
    return `SAR-${clean}`;
  }
  return clean;
}

/**
 * Limpia las etiquetas internas de sistema (ej. [MONEDERO:+...]) de las notas visibles en el recibo.
 */
export function cleanNotasRecibo(notas?: string | null): string {
  if (!notas) return '';
  return String(notas)
    .replace(/\s*·?\s*Excedente a Saldo a Favor:\s*L\.\s*[\d.,]+\s*\[MONEDERO:\+[\d.]+\]/gi, '')
    .replace(/\s*\[MONEDERO:\+[\d.]+\]/gi, '')
    .trim();
}

/**
 * Construye el objeto ReciboAbonoData a partir de un pago histórico y el estado de cuenta del cliente.
 * Permite reimprimir/reenviar cualquier recibo anterior desde el Historial de Abonos o Libro Mayor.
 */
export function buildReciboFromHistorial(
  pago: {
    id: string;
    correlativo?: string | null;
    monto: number;
    fecha: string | Date;
    metodoPago: string;
    banco?: string | null;
    referencia?: string | null;
    notas?: string | null;
    creadoPor?: { nombre?: string | null; apellido?: string | null } | string | null;
    detalles?: Array<{
      facturaId?: string;
      montoAplicado: number | string;
      factura?: { correlativo?: string | null } | null;
    }>;
  },
  cliente: {
    id: string;
    nombre: string;
    rtn?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    departamento?: string | null;
  },
  movimientosContables?: Array<{
    id: string;
    tipo: string;
    credito: number;
    saldoAcumulado: number;
  }>,
  saldoTotalActual?: number
): ReciboAbonoData {
  // 1. Determinar usuario que registró el abono
  let usuarioNombre = 'Departamento de Caja / Crédito';
  if (typeof pago.creadoPor === 'string' && pago.creadoPor.trim()) {
    usuarioNombre = pago.creadoPor.trim();
  } else if (pago.creadoPor && typeof pago.creadoPor === 'object') {
    const full = [pago.creadoPor.nombre, pago.creadoPor.apellido].filter(Boolean).join(' ').trim();
    if (full) usuarioNombre = full;
  }

  // 2. Facturas afectadas registradas en PagoDetalleFactura
  const facturasAfectadas: FacturaAfectadaRecibo[] = (pago.detalles || [])
    .filter(d => Number(d.montoAplicado) > 0)
    .map(d => ({
      id: d.facturaId,
      correlativo: d.factura?.correlativo || 'Factura a Crédito',
      montoAplicado: Number(d.montoAplicado)
    }));

  // 3. Calcular excedente a monedero si existe en notas
  const matchMonedero = pago.notas ? String(pago.notas).match(/\[MONEDERO:\+(\d+(?:\.\d+)?)\]/i) : null;
  const excedenteMonedero = matchMonedero ? Number(matchMonedero[1]) || 0 : 0;
  const montoTotal = Number(pago.monto || 0);
  const creditoNetoCxc = Math.max(0, Number((montoTotal - excedenteMonedero).toFixed(2)));

  const sumaFacturas = facturasAfectadas.reduce((acc, f) => acc + f.montoAplicado, 0);
  const aplicadoASaldoInicial = Math.max(0, Number((creditoNetoCxc - sumaFacturas).toFixed(2)));

  // 4. Calcular Saldo Anterior y Nuevo Saldo Pendiente usando el movimiento en el Libro Mayor
  const mov = movimientosContables?.find(m => m.id === pago.id && m.tipo === 'ABONO');
  let nuevoSaldoPendiente = typeof saldoTotalActual === 'number' ? Math.max(0, saldoTotalActual) : 0;
  let saldoAnterior = Number((nuevoSaldoPendiente + creditoNetoCxc).toFixed(2));

  if (mov) {
    nuevoSaldoPendiente = Math.max(0, Number(mov.saldoAcumulado.toFixed(2)));
    saldoAnterior = Math.max(0, Number((mov.saldoAcumulado + mov.credito).toFixed(2)));
  }

  return {
    id: pago.id,
    correlativo: pago.correlativo || 'AB-00000',
    fecha: pago.fecha,
    monto: montoTotal,
    metodoPago: pago.metodoPago || 'Efectivo',
    banco: pago.banco || null,
    referencia: pago.referencia || null,
    notas: pago.notas || null,
    usuarioNombre,
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      rtn: cliente.rtn || null,
      telefono: cliente.telefono || null,
      direccion: cliente.direccion || null,
      departamento: cliente.departamento || null
    },
    facturasAfectadas,
    aplicadoASaldoInicial: aplicadoASaldoInicial > 0.009 ? aplicadoASaldoInicial : 0,
    excedenteMonedero: excedenteMonedero > 0.009 ? excedenteMonedero : 0,
    saldoAnterior,
    nuevoSaldoPendiente
  };
}

/**
 * Servicio preparado para Fase 2 (Twilio WhatsApp Business API).
 * Cuando se active la eSIM y el número remitente de Twilio, esta función
 * disparará automáticamente la plantilla con el resumen del recibo y el botón CTA
 * hacia el estado de cuenta en línea (/c/[clienteId]/cxc).
 */
export async function triggerTwilioReciboWhatsApp(recibo: ReciboAbonoData, baseUrl?: string): Promise<{
  sent: boolean;
  provider: 'TWILIO_WHATSAPP';
  reason?: string;
}> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!twilioSid || !twilioToken || !twilioFrom) {
    // Fase actual: captura manual de imagen para WhatsApp mientras se activa la eSIM
    return {
      sent: false,
      provider: 'TWILIO_WHATSAPP',
      reason: 'Credenciales de Twilio WhatsApp pendientes de activación (modo captura de imagen activo).'
    };
  }

  const rawPhone = recibo.cliente.telefono ? recibo.cliente.telefono.replace(/\D/g, '') : '';
  if (!rawPhone || rawPhone.length < 8) {
    return {
      sent: false,
      provider: 'TWILIO_WHATSAPP',
      reason: 'El cliente no tiene un número de teléfono válido registrado.'
    };
  }

  // Aquí se conectará el envío directo por Twilio API / Content Template en Fase 2
  const _estadoCuentaUrl = `${baseUrl || process.env.NEXT_PUBLIC_APP_URL || ''}/c/${recibo.cliente.id}/cxc`;
  void _estadoCuentaUrl;

  return {
    sent: false,
    provider: 'TWILIO_WHATSAPP',
    reason: 'Stub listo para activar con plantilla aprobada de Twilio.'
  };
}
