'use client'

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
  getProductosPricing,
  updatePrecioGrupable,
  crearProducto,
  type ProductoPricing,
} from './actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLPS(value: number | null): string {
  if (value === null) return '—'
  return `L. ${value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calcularMargen(costo: number | null, precio: number | null): string {
  if (!costo || !precio || costo === 0) return '—'
  const margen = ((precio - costo) / costo) * 100
  return `${margen.toFixed(1)}%`
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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
  producto: ProductoPricing | null
  onClose: () => void
  onGuardado: (id: string, costo: number, precio: number, newType?: 'PRODUCTO') => void
}

function ModalEditarPrecios({ producto, onClose, onGuardado }: ModalEditarProps) {
  const [costo, setCosto] = useState('')
  const [precio, setPrecio] = useState('')
  const [isPending, startTransition] = useTransition()

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

    if (isNaN(costoNum) || isNaN(precioNum)) {
      toast.error('Por favor ingresa valores numéricos válidos.')
      return
    }
    if (costoNum < 0 || precioNum < 0) {
      toast.error('Los precios no pueden ser negativos.')
      return
    }

    startTransition(async () => {
      const result = await updatePrecioGrupable({
        id: producto.id,
        tipo: producto.tipo,
        descripcion: producto.descripcion,
        costoBase: costoNum,
        precioVenta: precioNum,
      })

      if (result.success) {
        toast.success(result.message)
        onGuardado(producto.id, costoNum, precioNum, 'PRODUCTO') // Una vez guardado, ya tiene catálogo
        onClose()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Tag size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Fijar Precios</h3>
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

        <div className="px-6 pt-5 pb-4">
          <p className="text-sm text-slate-600 leading-relaxed font-semibold">
            {producto.descripcion}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
              {producto.categoria && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {producto.categoria}
                </span>
              )}
              {producto.tipo === 'GRUPO_ACTIVO_FIJO' && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                  Agrupación de {producto.stock} uds.
                </span>
              )}
          </div>
        </div>

        <div className="px-6 pb-5 space-y-4">
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
                Fijar Precio
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
  onCreado: (producto: any) => void
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Nuevo Catálogo</h3>
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

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Código Original / SKU <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => handleChange('codigo', e.target.value)}
                placeholder="BEA-001..."
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Descripción Base <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
              <textarea
                rows={2}
                value={form.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder="Nombre o descripción del equipo"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Referencia
              </label>
              <input
                type="text"
                value={form.referencia}
                onChange={(e) => handleChange('referencia', e.target.value)}
                placeholder="REF"
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
                  placeholder="Categoría principal"
                  className="w-full pl-8 pr-3 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Costo Base
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
                  Precio Venta
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

function FilaProducto({ producto, onEditar }: { producto: ProductoPricing; onEditar: (p: ProductoPricing) => void }) {
  const esParcial = (producto.costoBase === null) !== (producto.precioVenta === null)

  return (
    <tr className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
      <td className="px-5 py-4">
        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
          {producto.codigo}
        </span>
        {producto.tipo === 'GRUPO_ACTIVO_FIJO' && (
           <span className="block mt-1 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Activo(s) Fijo(s) Unificados</span>
        )}
        {producto.tipo === 'PRODUCTO' && (
           <span className="block mt-1 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Catálogo Base</span>
        )}
      </td>

      <td className="px-4 py-4 max-w-xs">
        <p className="text-sm font-semibold text-slate-800 leading-tight">
          {producto.descripcion}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {producto.categoria && (
            <span className="inline-block text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
              {producto.categoria}
            </span>
          )}
          {producto.referencia && (
            <span className="inline-block text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              Ref: {producto.referencia}
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-4 text-center">
        <span className="text-sm font-semibold text-slate-700">{producto.stock}</span>
        <span className="text-[10px] text-slate-400 block font-semibold uppercase">uds</span>
      </td>

      <td className="px-4 py-4">
        <span
          className={`text-sm font-mono ${
            producto.costoBase !== null ? 'text-slate-700 font-semibold' : 'text-red-400 italic'
          }`}
        >
          {formatLPS(producto.costoBase)}
        </span>
      </td>

      <td className="px-4 py-4">
        <span
          className={`text-sm font-mono ${
            producto.precioVenta !== null ? 'text-slate-800 font-bold' : 'text-red-400 italic'
          }`}
        >
          {formatLPS(producto.precioVenta)}
        </span>
      </td>

      <td className="px-4 py-4">
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
          {calcularMargen(producto.costoBase, producto.precioVenta)}
        </span>
      </td>

      <td className="px-4 py-4">
        <PrecioBadge sinPrecio={producto.sinPrecio} parcial={esParcial} />
      </td>

      <td className="px-5 py-4 text-right">
        <button
          onClick={() => onEditar(producto)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-bold transition-all shadow-sm active:scale-95"
        >
          <Pencil size={13} />
          {producto.sinPrecio ? 'Fijar Precio' : 'Editar Precio'}
        </button>
      </td>
    </tr>
  )
}

function StatsBar({ productos }: { productos: ProductoPricing[] }) {
  const total = productos.length
  // Si tipo es agrupo hay mas de 1. Pero dejemos simple conteo de filas
  const sinPrecio = productos.filter((p) => p.sinPrecio).length
  const completos = productos.filter((p) => !p.sinPrecio).length
  const porcentaje = total > 0 ? Math.round((completos / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-[20px] border border-slate-200 px-5 py-5 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Líneas de Producto</p>
        <p className="text-3xl font-black text-slate-800 mt-1">{total}</p>
        <p className="text-[10px] text-slate-400 mt-1">unificados</p>
      </div>

      <div className="bg-white rounded-[20px] border border-red-200 px-5 py-5 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Sin Precio</p>
        <p className="text-3xl font-black text-red-600 mt-1">{sinPrecio}</p>
        <p className="text-[10px] text-red-400 mt-1">requieren tu atención</p>
      </div>

      <div className="bg-white rounded-[20px] border border-emerald-200 px-5 py-5 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold">Con Precio</p>
        <p className="text-3xl font-black text-emerald-700 mt-1">{completos}</p>
        <p className="text-[10px] text-emerald-500 mt-1">asignados al catálogo</p>
      </div>

      <div className="bg-white rounded-[20px] border border-blue-200 px-5 py-5 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">Avance de fijación</p>
        <p className="text-3xl font-black text-blue-700 mt-1">{porcentaje}%</p>
        <div className="mt-3 h-2 rounded-full bg-blue-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function PreciosClient({ productosIniciales }: { productosIniciales: ProductoPricing[] }) {
  const [productos, setProductos] = useState<ProductoPricing[]>(productosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [isPending, startTransition] = useTransition()
  const [modalNuevo, setModalNuevo] = useState(false)
  const [productoEditando, setProductoEditando] = useState<ProductoPricing | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const resultado = await getProductosPricing(busqueda || undefined)
        setProductos(resultado)
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [busqueda])

  const handlePrecioActualizado = useCallback(
    (id: string, costo: number, precio: number, newType?: 'PRODUCTO') => {
      setProductos((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, costoBase: costo, precioVenta: precio, sinPrecio: false, tipo: newType || p.tipo }
            : p
        ).sort((a, b) => {
           // Re-sort: put incomplete/no price items at top, then alphabetical
           const aSin = !a.costoBase || !a.precioVenta;
           const bSin = !b.costoBase || !b.precioVenta;
           if (aSin && !bSin) return -1;
           if (!aSin && bSin) return 1;
           return 0;
        })
      )
    },
    []
  )

  const handleProductoCreado = useCallback((nuevoReq: any) => {
    const mapped: ProductoPricing = {
        id: nuevoReq.id,
        codigo: nuevoReq.sku,
        descripcion: nuevoReq.nombre,
        referencia: null,
        categoria: null,
        costoBase: Number(nuevoReq.costoBase),
        precioVenta: Number(nuevoReq.precioVenta),
        stock: 0,
        estado: 'ACTIVO',
        sinPrecio: false,
        tipo: 'PRODUCTO'
    }
    setProductos((prev) => [mapped, ...prev])
  }, [])

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <DollarSign size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Consolidación de Precios</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Control general de inventario y valores base.
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalNuevo(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold shadow-md shadow-slate-200 transition-all hover:-translate-y-0.5 self-start"
        >
          <Plus size={18} />
          Nuevo Registro Manual
        </button>
      </div>

      <div className="relative mb-8">
        <Search
          size={18}
          className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
            isPending ? 'text-blue-500' : 'text-slate-400'
          }`}
        />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar inventario para asignar precio..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-0 shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 text-sm font-medium transition-all placeholder:text-slate-400"
        />
      </div>

      <StatsBar productos={productos} />

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-600" />
            <span className="text-sm font-bold text-slate-700">
              Catálogo General / Maquinaria Unificada
            </span>
          </div>
        </div>

        {productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 rounded-[20px] bg-slate-50 flex items-center justify-center mb-4">
              <PackageSearch size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-bold text-center">
              {busqueda ? 'No encontramos sugerencias, revisa tu término.' : 'Nada por aquí. Todos los precios están en orden.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Código / UUID</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Identificador unificado</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">T. Activos</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Costo Eq.</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">PVP. Mostrador</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Marg. Ganancia</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                  <th className="px-5 py-3 border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <FilaProducto key={p.id} producto={p} onEditar={setProductoEditando} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {productoEditando && (
        <ModalEditarPrecios
          producto={productoEditando}
          onClose={() => setProductoEditando(null)}
          onGuardado={handlePrecioActualizado}
        />
      )}

      {modalNuevo && (
        <ModalNuevoProducto
          onClose={() => setModalNuevo(false)}
          onCreado={handleProductoCreado}
        />
      )}
    </div>
  )
}
