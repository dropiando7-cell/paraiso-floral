'use server'

/**
 * actions.ts — Server Actions para el módulo "Gestor de Precios"
 * Sistema ERP Bioelectrónica Honduras
 *
 * Estas acciones simulan la conexión a la base de datos con Prisma.
 * En producción, descomenta las líneas de Prisma y elimina los datos mockeados.
 */

// import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── Tipos compartidos ────────────────────────────────────────────────────────

export type Producto = {
  id: string
  codigo: string
  descripcion: string
  referencia: string | null
  categoria: string | null
  costoBase: number | null
  precioVenta: number | null
  stock: number
  estado: 'VIGENTE' | 'OBSOLETO' | 'REPARACION'
  sinPrecio: boolean
}

export type CrearProductoInput = {
  codigo: string
  descripcion: string
  referencia?: string
  categoria?: string
  costoBase: number
  precioVenta: number
}

export type ActualizarPrecioInput = {
  id: string
  costoBase: number
  precioVenta: number
}

// ─── Datos mockeados ──────────────────────────────────────────────────────────
// En producción estos vendrían de Prisma: `await prisma.producto.findMany(...)`

const PRODUCTOS_MOCK: Producto[] = [
  {
    id: '1',
    codigo: 'BEA-001-000032',
    descripcion: 'Monitor de Presión Arterial Lumiscope Advanced',
    referencia: 'PGY133MS',
    categoria: 'MONITORES DE SIGNOS VITALES',
    costoBase: 850.00,
    precioVenta: 1200.00,
    stock: 1,
    estado: 'VIGENTE',
    sinPrecio: false,
  },
  {
    id: '2',
    codigo: 'BEA-001-000031',
    descripcion: 'Monitor de Presión Arterial Wrist Blood Pressure',
    referencia: 'PGY133MS',
    categoria: 'MONITORES DE SIGNOS VITALES',
    costoBase: null,
    precioVenta: null,
    stock: 1,
    estado: 'VIGENTE',
    sinPrecio: true,
  },
  {
    id: '3',
    codigo: 'BEA-002-000015',
    descripcion: 'Electrocardiógrafo Portátil 12 Derivaciones',
    referencia: 'ECG-12D',
    categoria: 'CARDIOLOGÍA',
    costoBase: 4500.00,
    precioVenta: null,
    stock: 3,
    estado: 'VIGENTE',
    sinPrecio: true,
  },
  {
    id: '4',
    codigo: 'BEA-003-000008',
    descripcion: 'Oxímetro de Pulso Digital con Alarma',
    referencia: 'OXI-88B',
    categoria: 'MONITOREO',
    costoBase: 320.00,
    precioVenta: 480.00,
    stock: 12,
    estado: 'VIGENTE',
    sinPrecio: false,
  },
  {
    id: '5',
    codigo: 'BEA-004-000022',
    descripcion: 'Desfibrilador Externo Automático (DEA)',
    referencia: 'DEF-AED2',
    categoria: 'EMERGENCIAS',
    costoBase: null,
    precioVenta: null,
    stock: 2,
    estado: 'VIGENTE',
    sinPrecio: true,
  },
  {
    id: '6',
    codigo: 'BEA-005-000003',
    descripcion: 'Estetoscopio Littmann Classic III',
    referencia: 'LTC3-BLK',
    categoria: 'DIAGNÓSTICO',
    costoBase: 680.00,
    precioVenta: 950.00,
    stock: 7,
    estado: 'VIGENTE',
    sinPrecio: false,
  },
  {
    id: '7',
    codigo: 'BEA-006-000041',
    descripcion: 'Nebulizador Ultrasónico Pediátrico',
    referencia: 'NEB-UP1',
    categoria: 'RESPIRATORIO',
    costoBase: null,
    precioVenta: 350.00,
    stock: 5,
    estado: 'VIGENTE',
    sinPrecio: true,
  },
  {
    id: '8',
    codigo: 'BEA-007-000009',
    descripcion: 'Termómetro Infrarrojo sin Contacto',
    referencia: 'TEMP-IR3',
    categoria: 'DIAGNÓSTICO',
    costoBase: 180.00,
    precioVenta: 260.00,
    stock: 20,
    estado: 'VIGENTE',
    sinPrecio: false,
  },
]

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * Obtiene todos los productos del inventario.
 * Opcionalmente filtra por nombre, código o referencia.
 * Marca como `sinPrecio` aquellos que no tienen costo o precio de venta.
 */
export async function fetchProductos(query?: string): Promise<Producto[]> {
  // Simulamos un pequeño delay de red
  await new Promise((r) => setTimeout(r, 300))

  /* ── PRODUCCIÓN ──────────────────────────────────────────────────────────
  const productos = await prisma.producto.findMany({
    where: query
      ? {
          OR: [
            { descripcion: { contains: query, mode: 'insensitive' } },
            { codigo: { contains: query, mode: 'insensitive' } },
            { referencia: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: [
      // Primero los que no tienen precio (más urgentes)
      { costoBase: 'asc' },
      { descripcion: 'asc' },
    ],
  })

  return productos.map((p) => ({
    ...p,
    sinPrecio: p.costoBase === null || p.precioVenta === null,
  }))
  ── FIN PRODUCCIÓN ────────────────────────────────────────────────────── */

  // ── MOCK ──
  let resultado = [...PRODUCTOS_MOCK]

  if (query && query.trim() !== '') {
    const q = query.toLowerCase()
    resultado = resultado.filter(
      (p) =>
        p.descripcion.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.referencia ?? '').toLowerCase().includes(q) ||
        (p.categoria ?? '').toLowerCase().includes(q)
    )
  }

  // Ordenar: primero sin precio, luego por descripción
  resultado.sort((a, b) => {
    if (a.sinPrecio && !b.sinPrecio) return -1
    if (!a.sinPrecio && b.sinPrecio) return 1
    return a.descripcion.localeCompare(b.descripcion)
  })

  return resultado
}

/**
 * Actualiza el costo base y precio de venta de un producto específico.
 * Valida que los valores sean positivos antes de guardar.
 */
export async function updatePrecioProducto(
  input: ActualizarPrecioInput
): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 400))

  // Validaciones del lado del servidor
  if (input.costoBase < 0 || input.precioVenta < 0) {
    return { success: false, message: 'Los precios no pueden ser negativos.' }
  }
  if (input.precioVenta < input.costoBase) {
    return {
      success: false,
      message: 'El precio de venta no puede ser menor al costo base.',
    }
  }

  /* ── PRODUCCIÓN ──────────────────────────────────────────────────────────
  await prisma.producto.update({
    where: { id: input.id },
    data: {
      costoBase: input.costoBase,
      precioVenta: input.precioVenta,
    },
  })
  revalidatePath('/precios')
  ── FIN PRODUCCIÓN ────────────────────────────────────────────────────── */

  // ── MOCK: Actualizar en el arreglo en memoria ──
  const idx = PRODUCTOS_MOCK.findIndex((p) => p.id === input.id)
  if (idx === -1) {
    return { success: false, message: 'Producto no encontrado.' }
  }
  PRODUCTOS_MOCK[idx].costoBase = input.costoBase
  PRODUCTOS_MOCK[idx].precioVenta = input.precioVenta
  PRODUCTOS_MOCK[idx].sinPrecio = false

  revalidatePath('/precios')
  return { success: true, message: 'Precios actualizados correctamente.' }
}

/**
 * Crea un nuevo producto en el catálogo con sus precios iniciales.
 * El código debe ser único en el sistema.
 */
export async function crearProducto(
  data: CrearProductoInput
): Promise<{ success: boolean; message: string; producto?: Producto }> {
  await new Promise((r) => setTimeout(r, 500))

  // Validar que el código no exista ya
  const existe = PRODUCTOS_MOCK.find(
    (p) => p.codigo.toLowerCase() === data.codigo.toLowerCase()
  )
  if (existe) {
    return {
      success: false,
      message: `El código "${data.codigo}" ya está registrado en el sistema.`,
    }
  }

  /* ── PRODUCCIÓN ──────────────────────────────────────────────────────────
  const nuevo = await prisma.producto.create({
    data: {
      codigo: data.codigo,
      descripcion: data.descripcion,
      referencia: data.referencia ?? null,
      categoria: data.categoria ?? null,
      costoBase: data.costoBase,
      precioVenta: data.precioVenta,
      stock: 0,
      estado: 'VIGENTE',
    },
  })
  revalidatePath('/precios')
  return { success: true, message: 'Producto creado exitosamente.', producto: { ...nuevo, sinPrecio: false } }
  ── FIN PRODUCCIÓN ────────────────────────────────────────────────────── */

  // ── MOCK ──
  const nuevoProducto: Producto = {
    id: String(Date.now()),
    codigo: data.codigo,
    descripcion: data.descripcion,
    referencia: data.referencia ?? null,
    categoria: data.categoria ?? null,
    costoBase: data.costoBase,
    precioVenta: data.precioVenta,
    stock: 0,
    estado: 'VIGENTE',
    sinPrecio: false,
  }
  PRODUCTOS_MOCK.unshift(nuevoProducto)

  revalidatePath('/precios')
  return {
    success: true,
    message: 'Producto registrado exitosamente.',
    producto: nuevoProducto,
  }
}
