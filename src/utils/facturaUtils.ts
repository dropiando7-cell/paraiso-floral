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
