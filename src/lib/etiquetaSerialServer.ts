import { prisma } from '@/lib/prisma';
import { formatCodigoSerial, parseCodigoEtiqueta } from '@/utils/etiquetaSerialHelper';

export interface GenerarEtiquetasSerialParams {
  organizationId: string;
  codigoPadre: string;
  descripcion: string;
  cantidad: number;
  activoFijoId?: string | null;
  productoId?: string | null;
  recepcionLoteId?: string | null;
  recepcionCajaId?: string | null;
  recepcionItemId?: string | null;
  loteNumero?: string | null;
}

/**
 * Genera y registra en base de datos N etiquetas hijas únicas (ej. 010055-0001 ... 010055-0025)
 * para un producto/activo padre, devolviendo la lista de códigos seriales asignados.
 */
export async function generarYRegistrarEtiquetasSeriales(
  params: GenerarEtiquetasSerialParams
): Promise<string[]> {
  const {
    organizationId,
    codigoPadre: rawPadre,
    descripcion,
    cantidad,
    activoFijoId = null,
    productoId = null,
    recepcionLoteId = null,
    recepcionCajaId = null,
    recepcionItemId = null,
    loteNumero = null,
  } = params;

  const qty = Math.max(0, Math.floor(cantidad || 0));
  if (qty === 0) return [];

  const parsed = parseCodigoEtiqueta(rawPadre || '000000');
  const basePadre = parsed.codigoPadre || '000000';

  // Resolver productoId automáticamente desde ActivoFijo si no se proporcionó
  let resolvedProductoId = productoId;
  let resolvedActivoId = activoFijoId;

  if (!resolvedProductoId && resolvedActivoId) {
    const act = await prisma.activoFijo.findUnique({
      where: { id: resolvedActivoId },
      select: { productoId: true },
    });
    if (act?.productoId) resolvedProductoId = act.productoId;
  } else if (!resolvedActivoId && basePadre !== '000000') {
    const act = await prisma.activoFijo.findFirst({
      where: {
        organizationId,
        OR: [
          { idQr: { equals: basePadre, mode: 'insensitive' } },
          { codigoBarras: { equals: basePadre, mode: 'insensitive' } },
        ],
      },
      select: { id: true, productoId: true },
    });
    if (act) {
      resolvedActivoId = act.id;
      if (!resolvedProductoId && act.productoId) {
        resolvedProductoId = act.productoId;
      }
    }
  }

  if (!resolvedProductoId && basePadre !== '000000') {
    const prod = await prisma.producto.findFirst({
      where: {
        organizationId,
        sku: { equals: basePadre, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (prod) resolvedProductoId = prod.id;
  }

  // Consultar el último correlativo emitido para este código padre en esta organización
  const agg = await prisma.etiquetaSerial.aggregate({
    where: {
      organizationId,
      codigoPadre: basePadre,
    },
    _max: {
      correlativo: true,
    },
  });

  const lastCorrelativo = agg._max.correlativo || 0;
  const serialesGenerados: string[] = [];
  const recordsToInsert: Array<{
    organizationId: string;
    codigoSerial: string;
    codigoPadre: string;
    correlativo: number;
    descripcion: string;
    estado: string;
    activoFijoId: string | null;
    productoId: string | null;
    recepcionLoteId: string | null;
    recepcionCajaId: string | null;
    recepcionItemId: string | null;
    loteNumero: string | null;
  }> = [];

  for (let i = 1; i <= qty; i++) {
    const corr = lastCorrelativo + i;
    const codigoSerial = formatCodigoSerial(basePadre, corr);
    serialesGenerados.push(codigoSerial);
    recordsToInsert.push({
      organizationId,
      codigoSerial,
      codigoPadre: basePadre,
      correlativo: corr,
      descripcion: (descripcion || 'Producto').substring(0, 120),
      estado: 'DISPONIBLE_BODEGA',
      activoFijoId: resolvedActivoId,
      productoId: resolvedProductoId,
      recepcionLoteId,
      recepcionCajaId,
      recepcionItemId,
      loteNumero,
    });
  }

  await prisma.etiquetaSerial.createMany({
    data: recordsToInsert,
    skipDuplicates: true,
  });

  return serialesGenerados;
}
