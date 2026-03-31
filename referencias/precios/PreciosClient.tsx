'use client'

/**
 * PreciosClient.tsx — Client Component del módulo "Gestor de Precios"
 * Sistema ERP Bioelectrónica Honduras
 *
 * Contiene: lista de productos, búsqueda en tiempo real,
 * modal de nuevo producto y modal de edición rápida de precios.
 *
 * Stack: React + Next.js (App Router) + Tailwind CSS + lucide-react
 */

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
  Tag,
  Search,
  Plus,
  Pencil,
  X,
  PackageSearch,
  AlertCircle,
  CheckCircle2,
  Loader2,
  DollarSign,
  Hash,
  FileText,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  fetchProductos,
  updatePrecioProducto,
  crearProducto,
  type Producto,
} from './actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formatea un número como moneda hondureña (Lempiras) */
function formatLPS(value: number | null): string {
  if (value === null) return '—'
  return `L. ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Calcula el margen de ganancia como porcentaje */
function calcularMargen(costo: number | null, precio: number | null): string {
  if (!costo || !precio || costo === 0) return '—'
  const margen = ((precio - costo) / costo) * 100
  return `${margen.toFixed(1)}%`
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Badge de estado del precio */
function PrecioBadge({ sinPrecio, parcial }: { sinPrecio: boolean; parcial: boolean }) {
  if (sinPrecio) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
        <AlertCircle size={11} />
        SIN PRECIO
      </span>
    )
  }
  if (parcial) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
        <AlertTriangle size={11} />
        INCOMPLETO
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
      <CheckCircle2 size={11} />
      OK
    </span>
  )
}

// ─── Modal: Edición rápida de precios ────────────────────────────────────────

interface ModalEditarProps {
  producto: Producto | null
  onClose: () => void
  onGuardado: (id: string, costo: number, precio: number) => void
}

function ModalEditarPrecios({ producto, onClose, onGuardado }: ModalEditarProps) {
  const [costo, setCosto] = useState('')
  const [precio, setPrecio] = useState('')
  const [isPending, startTransition] = useTransition()

  // Inicializar campos cuando cambia el producto
  useEffect(() => {
    if (producto) {
      setCosto(producto.costoBase?.toString() ?? '')
      setPrecio(producto.precioVenta?.toString() ?? '')
    }
  }, [producto])

  if (!producto) return null

  const handleGuardar = () => {
    const costoNum = parseFloat(costo)
    const precioNum = parseFloat(precio)

    // Validación de cliente
    if (isNaN(costoNum) || isNaN(precioNum)) {
      toast.error('Por favor ingresa valores numéricos válidos.')
      return
    }
    if (costoNum < 0 || precioNum < 0) {
      toast.error('Los precios no pueden ser negativos.')
      return
    }

    startTransition(async () => {
      const result = await updatePrecioProducto({
        id: producto.id,
        costoBase: costoNum,
        precioVenta: precioNum,
      })

      if (result.success) {
        toast.success(result.message)
        onGuardado(producto.id, costoNum, precioNum)
        onClose()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    /* Fondo desenfocado — igual que los modales del ERP */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Tag size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Editar Precios</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{producto.codigo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Nombre del producto */}
        <div className="px-6 pt-5 pb-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {producto.descripcion}
          </p>
          {producto.categoria && (
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {producto.categoria}
            </span>
          )}
        </div>

        {/* Campos de precio */}
        <div className="px-6 pb-5 space-y-4">
          {/* Costo Base */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Costo Base (L.)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">L.</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
              />
            </div>
          </div>

          {/* Precio de Venta */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Precio de Venta (L.)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">L.</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
              />
            </div>
          </div>

          {/* Vista previa del margen */}
          {costo && precio && !isNaN(parseFloat(costo)) && !isNaN(parseFloat(precio)) && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <TrendingUp size={16} className="text-emerald-500" />
              <span className="text-xs text-slate-500">Margen estimado:</span>
              <span className="text-xs font-bold text-emerald-600">
                {calcularMargen(parseFloat(costo), parseFloat(precio))}
              </span>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                Guardar Precios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Nuevo Producto ────────────────────────────────────────────────────

interface ModalNuevoProps {
  onClose: () => void
  onCreado: (producto: Producto) => void
}

function ModalNuevoProducto({ onClose, onCreado }: ModalNuevoProps) {
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    referencia: '',
    categoria: '',
    costoBase: '',
    precioVenta: '',
  })
  const [isPending, startTransition] = useTransition()

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCrear = () => {
    // Validaciones rápidas de cliente
    if (!form.codigo.trim() || !form.descripcion.trim()) {
      toast.error('El código y la descripción son obligatorios.')
      return
    }
    const costo = parseFloat(form.costoBase)
    const precio = parseFloat(form.precioVenta)
    if (isNaN(costo) || isNaN(precio)) {
      toast.error('Ingresa valores numéricos válidos para los precios.')
      return
    }

    startTransition(async () => {
      const result = await crearProducto({
        codigo: form.codigo.trim().toUpperCase(),
        descripcion: form.descripcion.trim(),
        referencia: form.referencia.trim() || undefined,
        categoria: form.categoria.trim().toUpperCase() || undefined,
        costoBase: costo,
        precioVenta: precio,
      })

      if (result.success && result.producto) {
        toast.success(result.message)
        onCreado(result.producto)
        onClose()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Nuevo Producto</h3>
              <p className="text-xs text-slate-500 mt-0.5">Registro express con precios</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Formulario */}
        <div className="px-6 py-5 space-y-4">
          {/* Código */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Código / ID QR <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => handleChange('codigo', e.target.value)}
                placeholder="BEA-001-000000"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all font-mono"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Descripción <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
              <textarea
                rows={2}
                value={form.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder="Nombre o descripción del equipo médico"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all resize-none"
              />
            </div>
          </div>

          {/* Referencia + Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Referencia
              </label>
              <input
                type="text"
                value={form.referencia}
                onChange={(e) => handleChange('referencia', e.target.value)}
                placeholder="REF-001"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Categoría
              </label>
              <div className="relative">
                <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.categoria}
                  onChange={(e) => handleChange('categoria', e.target.value)}
                  placeholder="CARDIOLOGÍA"
                  className="w-full pl-8 pr-3 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Separador */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign size={12} />
              Precios Iniciales
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Costo Base <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">L.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costoBase}
                    onChange={(e) => handleChange('costoBase', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Precio Venta <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">L.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precioVenta}
                    onChange={(e) => handleChange('precioVenta', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Plus size={15} />
                Registrar Producto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Fila de producto en la tabla ─────────────────────────────────────────────

interface FilaProductoProps {
  producto: Producto
  onEditar: (producto: Producto) => void
}

function FilaProducto({ producto, onEditar }: FilaProductoProps) {
  const esParcial = (producto.costoBase === null) !== (producto.precioVenta === null)

  return (
    <tr className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
      {/* Código */}
      <td className="px-5 py-4">
        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono font-medium">
          {producto.codigo}
        </span>
      </td>

      {/* Nombre/Descripción */}
      <td className="px-4 py-4 max-w-xs">
        <p className="text-sm font-medium text-slate-800 leading-tight line-clamp-2">
          {producto.descripcion}
        </p>
        {producto.categoria && (
          <span className="inline-block mt-1 text-xs text-blue-600 font-medium">
            {producto.categoria}
          </span>
        )}
        {producto.referencia && (
          <span className="block text-xs text-slate-400 font-mono mt-0.5">
            Ref: {producto.referencia}
          </span>
        )}
      </td>

      {/* Stock */}
      <td className="px-4 py-4 text-center">
        <span className="text-sm font-semibold text-slate-700">{producto.stock}</span>
        <span className="text-xs text-slate-400 block">uds</span>
      </td>

      {/* Costo Base */}
      <td className="px-4 py-4">
        <span
          className={`text-sm font-mono ${
            producto.costoBase !== null ? 'text-slate-700 font-semibold' : 'text-red-400 italic'
          }`}
        >
          {formatLPS(producto.costoBase)}
        </span>
      </td>

      {/* Precio Venta */}
      <td className="px-4 py-4">
        <span
          className={`text-sm font-mono ${
            producto.precioVenta !== null ? 'text-slate-800 font-bold' : 'text-red-400 italic'
          }`}
        >
          {formatLPS(producto.precioVenta)}
        </span>
      </td>

      {/* Margen */}
      <td className="px-4 py-4">
        <span className="text-xs font-semibold text-emerald-600">
          {calcularMargen(producto.costoBase, producto.precioVenta)}
        </span>
      </td>

      {/* Badge de estado */}
      <td className="px-4 py-4">
        <PrecioBadge sinPrecio={producto.sinPrecio} parcial={esParcial} />
      </td>

      {/* Acción */}
      <td className="px-5 py-4">
        <button
          onClick={() => onEditar(producto)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-medium transition-all shadow-sm group-hover:shadow"
        >
          <Pencil size={13} />
          Editar
          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-0.5" />
        </button>
      </td>
    </tr>
  )
}

// ─── Tarjetas de estadísticas ─────────────────────────────────────────────────

function StatsBar({ productos }: { productos: Producto[] }) {
  const total = productos.length
  const sinPrecio = productos.filter((p) => p.sinPrecio).length
  const completos = productos.filter((p) => !p.sinPrecio).length
  const porcentaje = total > 0 ? Math.round((completos / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {/* Total */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
        <p className="text-xs text-slate-500 font-medium">Total Productos</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{total}</p>
        <p className="text-xs text-slate-400 mt-0.5">en catálogo</p>
      </div>

      {/* Sin precio */}
      <div className="bg-white rounded-2xl border border-red-200 px-5 py-4 shadow-sm">
        <p className="text-xs text-red-500 font-medium">Sin Precio</p>
        <p className="text-2xl font-bold text-red-600 mt-1">{sinPrecio}</p>
        <p className="text-xs text-red-400 mt-0.5">requieren atención</p>
      </div>

      {/* Con precio */}
      <div className="bg-white rounded-2xl border border-emerald-200 px-5 py-4 shadow-sm">
        <p className="text-xs text-emerald-600 font-medium">Con Precio</p>
        <p className="text-2xl font-bold text-emerald-700 mt-1">{completos}</p>
        <p className="text-xs text-emerald-500 mt-0.5">precios asignados</p>
      </div>

      {/* Progreso */}
      <div className="bg-white rounded-2xl border border-blue-200 px-5 py-4 shadow-sm">
        <p className="text-xs text-blue-600 font-medium">Completado</p>
        <p className="text-2xl font-bold text-blue-700 mt-1">{porcentaje}%</p>
        <div className="mt-2 h-1.5 rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

interface PreciosClientProps {
  /** Productos pre-cargados desde el Server Component padre (SSR) */
  productosIniciales: Producto[]
}

export default function PreciosClient({ productosIniciales }: PreciosClientProps) {
  // ── Estado principal ──
  const [productos, setProductos] = useState<Producto[]>(productosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [isPending, startTransition] = useTransition()

  // ── Estado de modales ──
  const [modalNuevo, setModalNuevo] = useState(false)
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)

  // ── Búsqueda reactiva con debounce (300ms) ──
  useEffect(() => {
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const resultado = await fetchProductos(busqueda || undefined)
        setProductos(resultado)
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [busqueda])

  // ── Callback: precio actualizado ──
  const handlePrecioActualizado = useCallback(
    (id: string, costo: number, precio: number) => {
      setProductos((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, costoBase: costo, precioVenta: precio, sinPrecio: false }
            : p
        )
      )
    },
    []
  )

  // ── Callback: producto creado ──
  const handleProductoCreado = useCallback((nuevo: Producto) => {
    setProductos((prev) => [nuevo, ...prev])
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    /* Fondo igual al ERP: bg-slate-50 */
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8">

      {/* ── Encabezado de página ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Tag size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestor de Precios</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Asignación y revisión de precios · Bioelectrónica Honduras
            </p>
          </div>
        </div>

        {/* Botón nuevo producto */}
        <button
          onClick={() => setModalNuevo(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all hover:shadow-lg hover:shadow-blue-300 active:scale-95 self-start"
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      {/* ── Barra de búsqueda ── */}
      <div className="relative mb-6">
        <Search
          size={18}
          className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
            isPending ? 'text-blue-400' : 'text-slate-400'
          }`}
        />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, código, referencia o categoría..."
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none text-slate-800 text-sm transition-all shadow-sm placeholder:text-slate-400"
        />
        {isPending && (
          <Loader2
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
          />
        )}
      </div>

      {/* ── Tarjetas de estadísticas ── */}
      <StatsBar productos={productos} />

      {/* ── Tabla principal ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Sub-encabezado de la tabla */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PackageSearch size={17} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">
              Inventario de Productos
            </span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
              {productos.length}
            </span>
          </div>

          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X size={13} />
              Limpiar filtro
            </button>
          )}
        </div>

        {/* Tabla */}
        {productos.length === 0 ? (
          /* Estado vacío */
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <PackageSearch size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium text-center">
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : 'No hay productos registrados'}
            </p>
            <p className="text-slate-400 text-sm mt-1 text-center">
              {busqueda
                ? 'Intenta con otro término de búsqueda.'
                : 'Registra el primer producto usando el botón de arriba.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Costo Base
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Precio Venta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Margen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => (
                  <FilaProducto
                    key={producto.id}
                    producto={producto}
                    onEditar={setProductoEditando}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer de la tabla */}
        {productos.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Mostrando <span className="font-semibold text-slate-600">{productos.length}</span>{' '}
              producto{productos.length !== 1 ? 's' : ''}
              {busqueda && ` para "${busqueda}"`}
            </p>
            <p className="text-xs text-slate-400">
              Última actualización: {new Date().toLocaleTimeString('es-HN')}
            </p>
          </div>
        )}
      </div>

      {/* ── Modales ── */}

      {/* Modal: Editar precios */}
      <ModalEditarPrecios
        producto={productoEditando}
        onClose={() => setProductoEditando(null)}
        onGuardado={handlePrecioActualizado}
      />

      {/* Modal: Nuevo producto */}
      {modalNuevo && (
        <ModalNuevoProducto
          onClose={() => setModalNuevo(false)}
          onCreado={handleProductoCreado}
        />
      )}
    </div>
  )
}
