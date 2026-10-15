import type { ClientProductPriceInfo } from '@/app/(dashboard)/facturas/actions';

export interface PriceSuggestionResult {
  unitPrice: number;
  priceOrigin: 'historial' | 'base' | 'manual';
  priceOriginLabel?: string;
}

/**
 * Determina el precio sugerido para un producto en base a:
 * 1. Último precio facturado al cliente específico (historial).
 * 2. Precio base oficial del catálogo/inventario (si nunca lo ha comprado).
 * 3. 0 para ingreso manual si no tiene precio base ni historial.
 */
export function resolveProductPrice(
  product: { id?: string; name?: string; price?: number | string; type?: string; code?: string } | null | undefined,
  historyMap: Record<string, ClientProductPriceInfo> = {}
): PriceSuggestionResult {
  if (!product) {
    return { unitPrice: 0, priceOrigin: 'manual', priceOriginLabel: undefined };
  }

  // 1. Prioridad: Último precio facturado a este cliente
  if (product.id) {
    const histProd = historyMap[`prod:${product.id}`];
    if (histProd && Number(histProd.price) > 0) {
      return {
        unitPrice: Number(histProd.price),
        priceOrigin: 'historial',
        priceOriginLabel: `Último: L. ${Number(histProd.price).toFixed(2)}`
      };
    }
    const histAct = historyMap[`act:${product.id}`];
    if (histAct && Number(histAct.price) > 0) {
      return {
        unitPrice: Number(histAct.price),
        priceOrigin: 'historial',
        priceOriginLabel: `Último: L. ${Number(histAct.price).toFixed(2)}`
      };
    }
  }

  if (product.name) {
    const cleanName = product.name.split('\n')[0].replace(/__METADATA__.*$/, '').trim().toUpperCase();
    const histDesc = historyMap[`desc:${cleanName}`];
    if (histDesc && Number(histDesc.price) > 0) {
      return {
        unitPrice: Number(histDesc.price),
        priceOrigin: 'historial',
        priceOriginLabel: `Último: L. ${Number(histDesc.price).toFixed(2)}`
      };
    }
  }

  // 2. Si no hay historial previo para este cliente, usar precio base oficial del inventario
  const basePrice = Number(product.price) || 0;
  if (basePrice > 0) {
    return {
      unitPrice: basePrice,
      priceOrigin: 'base',
      priceOriginLabel: `Base: L. ${basePrice.toFixed(2)}`
    };
  }

  // 3. Si no tiene precio base registrado, dejar en 0 para ingreso manual (sin error)
  return {
    unitPrice: 0,
    priceOrigin: 'manual',
    priceOriginLabel: undefined
  };
}
