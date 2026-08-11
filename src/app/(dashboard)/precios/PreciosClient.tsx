'use client'

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react'
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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Database,
  MapPin,
  Barcode,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  getProductosPricing,
  updatePrecioGrupable,
  crearProducto,
  buscarReferenciaOdoo,
  getCategoriasParaRegistro,
  registrarDesdeOdoo,
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
  onGuardado: (id: string, costo: number, precio: number, newType?: 'PRODUCTO', newSku?: string, newStock?: number) => void
  onShowImage: (url: string) => void
}

function ModalEditarPrecios({ producto, onClose, onGuardado, onShowImage }: ModalEditarProps) {
  const [costo, setCosto] = useState('')
  const [precio, setPrecio] = useState('')
  const [factor, setFactor] = useState('3.5')
  const [precioManual, setPrecioManual] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Odoo reference integration states
  const [odooQuery, setOdooQuery] = useState('')
  const [referencias, setReferencias] = useState<any[]>([])
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [selectedRef, setSelectedRef] = useState<any | null>(null)

  // Auto-calcula precio cuando cambia costo o factor (si no ha sido editado manualmente)
  const handleCostoChange = (val: string) => {
    setCosto(val)
    setPrecioManual(false) // reset modo manual al cambiar costo
    const c = parseFloat(val)
    const f = parseFloat(factor)
    if (!isNaN(c) && !isNaN(f) && c > 0) {
      setPrecio((c * f).toFixed(2))
    }
  }

  const handleFactorChange = (val: string) => {
    setFactor(val)
    const c = parseFloat(costo)
    const f = parseFloat(val)
    if (!isNaN(c) && !isNaN(f) && c > 0) {
      setPrecio((c * f).toFixed(2))
      setPrecioManual(false)
    }
  }

  const handlePrecioManualChange = (val: string) => {
    setPrecio(val)
    setPrecioManual(true)
  }

  useEffect(() => {
    if (producto) {
      setCosto(producto.costoBase?.toString() ?? '')
      setPrecio(producto.precioVenta?.toString() ?? '')

      // Extraer palabras clave de la descripción para búsqueda inicial de Odoo
      const cleanDesc = producto.descripcion
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
      const words = cleanDesc.split(/\s+/).filter(w => w.length > 2);
      const initialSearch = words.slice(0, 3).join(' ');
      const queryToSearch = initialSearch || producto.descripcion;
      setOdooQuery(queryToSearch);
      
      setLoadingRefs(true);
      buscarReferenciaOdoo(queryToSearch)
        .then(res => {
          setReferencias(res);
          if (res.length > 0) {
            setSelectedRef(res[0]);
          } else {
            setSelectedRef(null);
          }
        })
        .catch(err => {
          console.error("Error en búsqueda inicial de Odoo:", err);
        })
        .finally(() => {
          setLoadingRefs(false);
        });
    }
  }, [producto])

  if (!producto) return null

  const handleManualSearch = async () => {
    if (!odooQuery.trim()) return;
    setLoadingRefs(true);
    try {
      const res = await buscarReferenciaOdoo(odooQuery);
      setReferencias(res);
      if (res.length > 0) {
        setSelectedRef(res[0]);
      } else {
        setSelectedRef(null);
      }
    } catch (err) {
      console.error("Error al buscar referencia manualmente:", err);
      toast.error('Error al buscar referencias de Odoo');
    } finally {
      setLoadingRefs(false);
    }
  };

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
      const subActivoIds = producto.tipo === 'GRUPO_ACTIVO_FIJO' && producto.subActivos
        ? producto.subActivos.map(s => s.id).filter((id): id is string => Boolean(id))
        : undefined;

      const result = await updatePrecioGrupable({
        id: producto.id,
        tipo: producto.tipo,
        descripcion: producto.descripcion,
        referencia: producto.referencia,
        subActivoIds,
        costoBase: costoNum,
        precioVenta: precioNum,
      })

      if (result.success) {
        toast.success(result.message)
        onGuardado(producto.id, costoNum, precioNum, 'PRODUCTO', result.newSku, result.newStock)
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
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

        {/* Cuerpo en Dos Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 animate-in fade-in duration-300 max-h-[calc(90vh-100px)] overflow-y-auto">
          
          {/* Columna Izquierda: Formulario de Precios */}
          <div className="p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                {producto.imagenUrl ? (
                  <div 
                    className="w-20 h-20 rounded-2xl border border-slate-100 bg-slate-50 flex-shrink-0 overflow-hidden relative cursor-zoom-in hover:opacity-90 transition-opacity group shadow-sm animate-in fade-in duration-200"
                    onClick={() => onShowImage(producto.imagenUrl!)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={producto.imagenUrl}
                      alt={producto.descripcion}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-semibold">
                      Ampliar
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 flex-shrink-0 flex flex-col items-center justify-center text-slate-400">
                    <PackageSearch size={20} />
                    <span className="text-[8px] mt-1 text-slate-400">Sin Foto</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-relaxed font-semibold">
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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Costo Base (L.)
                </label>
                {/* Costo + Factor en una fila */}
                <div className="flex gap-2 items-stretch">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">L.</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costo}
                      onChange={(e) => handleCostoChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
                    />
                  </div>
                  {/* Factor multiplicador */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold select-none">×</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={factor}
                        onChange={(e) => handleFactorChange(e.target.value)}
                        className="w-20 pl-6 pr-2 py-3 rounded-xl border border-indigo-200 bg-indigo-50/50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-indigo-700 text-sm font-bold transition-all text-center"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex gap-1">
                      {['2.0','2.5','3.0','3.5','4.0'].map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => handleFactorChange(f)}
                          className={`flex-1 text-[9px] font-bold py-0.5 rounded-md transition-colors ${
                            factor === f
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Indicador del cálculo */}
                {costo && !isNaN(parseFloat(costo)) && parseFloat(costo) > 0 && (
                  <p className="text-[10px] text-indigo-500 font-semibold mt-1.5 flex items-center gap-1">
                    <span className="opacity-70">L. {parseFloat(costo).toFixed(2)} × {factor} =</span>
                    <span className="text-indigo-700">L. {(parseFloat(costo) * parseFloat(factor) || 0).toFixed(2)}</span>
                    {precioManual && <span className="text-amber-500 ml-1">(precio editado manualmente)</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Precio de Venta (L.) Sin ISV
                  {!precioManual && costo && <span className="ml-2 text-[9px] text-indigo-400 font-normal normal-case">calculado automáticamente</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">L.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precio}
                    onChange={(e) => handlePrecioManualChange(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border focus:ring-2 outline-none text-slate-800 text-sm transition-all ${
                      precioManual
                        ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100 bg-amber-50/30'
                        : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'
                    }`}
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

            {/* Acciones del formulario */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-4">
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

          {/* Columna Derecha: Referencia Cruzada Odoo */}
          <div className="p-6 bg-slate-50/50 flex flex-col border-t md:border-t-0 md:border-l border-slate-100 min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <PackageSearch className="text-blue-500 w-5 h-5" />
              <h4 className="font-semibold text-slate-800 text-sm">Referencia Cruzada de Odoo</h4>
            </div>

            {/* Buscador Manual */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o ID de Odoo..."
                value={odooQuery}
                onChange={(e) => setOdooQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSearch()
                }}
                className="w-full pl-9 pr-20 py-2 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-700 text-sm transition-all bg-white"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <button
                onClick={handleManualSearch}
                disabled={loadingRefs}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-xs transition-colors disabled:opacity-60"
              >
                Buscar
              </button>
            </div>

            {/* Contenido / Resultados */}
            <div className="flex-1 flex flex-col justify-between">
              {loadingRefs ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="text-xs text-slate-500">Buscando referencias...</span>
                </div>
              ) : referencias.length > 0 ? (
                <div className="space-y-4">
                  {/* Selector / Listado de coincidencias */}
                  {referencias.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Coincidencias ({referencias.length}):
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Selecciona una para ver detalles
                        </span>
                      </div>
                      
                      <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1.5 scrollbar-thin">
                        {referencias.map((ref) => {
                          const isSelected = selectedRef?.id === ref.id;
                          return (
                            <button
                              key={ref.id}
                              onClick={() => setSelectedRef(ref)}
                              type="button"
                              className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-blue-50/70 border-blue-200 ring-2 ring-blue-100/50 shadow-sm'
                                  : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                              }`}
                            >
                              {/* Miniatura Imagen */}
                              <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex-shrink-0 overflow-hidden flex items-center justify-center bg-white">
                                {ref.imagenUrl ? (
                                  <img
                                    src={ref.imagenUrl}
                                    alt={ref.nombre}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <PackageSearch className="w-5 h-5 text-slate-400" />
                                )}
                              </div>

                              {/* Información del item */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate leading-tight ${isSelected ? 'text-blue-900 font-semibold' : 'text-slate-700'}`}>
                                  {ref.nombre}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-bold text-slate-500 font-mono px-1 py-0.2 bg-slate-100 rounded">
                                    {ref.odooId ? `ODOO-${ref.odooId}` : 'S/I'}
                                  </span>
                                  {ref.referenciaInterna && (
                                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">
                                      Ref: {ref.referenciaInterna}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Detalle del Producto Odoo Seleccionado */}
                  {selectedRef && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-in fade-in duration-200">
                      {/* Imagen y Datos Básicos */}
                      <div className="flex gap-4">
                        <div 
                          className="w-24 h-24 rounded-xl border border-slate-100 bg-slate-50 flex-shrink-0 overflow-hidden relative cursor-zoom-in hover:opacity-90 transition-opacity group"
                          onClick={() => selectedRef.imagenUrl && onShowImage(selectedRef.imagenUrl)}
                        >
                          {selectedRef.imagenUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={selectedRef.imagenUrl}
                                alt={selectedRef.nombre}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                                Ver Grande
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                              <PackageSearch size={24} />
                              <span className="text-[9px] mt-1">Sin Imagen</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md inline-block mb-1">
                            {selectedRef.odooId ? `Odoo ID: ${selectedRef.odooId}` : 'Odoo Referencia'}
                          </span>
                          <h5 className="font-semibold text-slate-800 text-sm truncate-2-lines leading-snug" title={selectedRef.nombre}>
                            {selectedRef.nombre}
                          </h5>
                          {selectedRef.referenciaInterna && (
                            <p className="text-xs text-slate-500 font-mono mt-1">Ref: {selectedRef.referenciaInterna}</p>
                          )}
                        </div>
                      </div>

                      {/* Costo de Odoo / Costo Histórico */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex flex-col justify-between">
                          <div>
                            <span className="block text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Costo Histórico</span>
                            <span className="text-base font-bold text-blue-700 block mt-0.5">
                              {selectedRef.costoHistorico !== null ? formatLPS(selectedRef.costoHistorico) : 'No Registrado'}
                            </span>
                          </div>
                          {selectedRef.costoHistorico !== null && (
                            <div className="flex gap-1.5 mt-2">
                              <button
                                type="button"
                                onClick={() => setCosto(selectedRef.costoHistorico.toString())}
                                title="Copiar al Costo Base"
                                className="flex-1 py-1 px-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 border border-blue-200/50"
                              >
                                <ArrowLeft size={10} className="stroke-[3]" />
                                Costo
                              </button>
                              <button
                                type="button"
                                onClick={() => setPrecio(selectedRef.costoHistorico.toString())}
                                title="Copiar al Precio de Venta"
                                className="flex-1 py-1 px-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm"
                              >
                                <ArrowLeft size={10} className="stroke-[3]" />
                                Precio
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ubicación Física</span>
                          <span className="text-xs font-bold text-slate-700 block mt-0.5 truncate">
                            {selectedRef.pasilloEstante || 'No Asignado'}
                          </span>
                        </div>
                      </div>

                      {/* Detalles adicionales */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                        {selectedRef.cantidadOdoo !== null && (
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-500">Stock Registrado:</span>
                            <span className="font-semibold text-slate-700">{selectedRef.cantidadOdoo} uds.</span>
                          </div>
                        )}
                        {selectedRef.codigoBarras && (
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-500">Código de Barras:</span>
                            <span className="font-mono text-slate-700">{selectedRef.codigoBarras}</span>
                          </div>
                        )}
                        {selectedRef.notasInternas && (
                          <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Notas Internas:</span>
                            <p className="text-[11px] text-slate-600 italic whitespace-pre-wrap leading-relaxed">
                              {selectedRef.notasInternas}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <PackageSearch className="text-slate-400 w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    No se encontraron coincidencias automáticas en Odoo.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[220px]">
                    Usa el buscador superior para buscar manualmente por SKU, nombre o ID.
                  </p>
                </div>
              )}
            </div>
          </div>

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

function FilaProducto({ producto, onEditar, onShowImage }: { producto: ProductoPricing; onEditar: (p: ProductoPricing) => void; onShowImage: (url: string) => void }) {
  const esParcial = (producto.costoBase === null) !== (producto.precioVenta === null)
  const [expandido, setExpandido] = useState(false)
  const tieneSub = producto.subActivos && producto.subActivos.length > 0

  return (
    <>
    <tr 
      className={`group hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 ${tieneSub ? 'cursor-pointer' : ''}`}
      onClick={() => tieneSub && setExpandido(!expandido)}
    >
      {/* ── Botón Fijar Precio al inicio ── */}
      <td className="pl-4 pr-2 py-4 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEditar(producto); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Pencil size={12} />
          {producto.sinPrecio ? 'Fijar' : 'Editar'}
        </button>
      </td>

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

      <td className="px-4 py-4" onClick={(e) => {
        if (producto.imagenUrl) {
          e.stopPropagation();
          onShowImage(producto.imagenUrl);
        }
      }}>
        {producto.imagenUrl ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50 relative group-hover:scale-105 transition-transform flex items-center justify-center cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={producto.imagenUrl} alt={producto.descripcion} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl border-2 border-slate-200 border-dashed flex items-center justify-center bg-slate-50/50">
            <PackageSearch size={18} className="text-slate-400" />
          </div>
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
        {tieneSub ? (
          <ChevronRight size={18} className={`text-slate-400 transition-transform ${expandido ? 'rotate-90' : ''}`} />
        ) : (
          <div className="w-[18px]"></div>
        )}
      </td>
    </tr>
    {expandido && tieneSub && (
      <tr>
         <td colSpan={9} className="p-0 border-b border-slate-100 bg-slate-50/50">
            <div className="px-10 py-5">
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">CÓDIGO (ID QR)</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Foto</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Serie</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Ubicación</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Stock Físico</th>
                        </tr>
                     </thead>
                     <tbody>
                        {producto.subActivos!.map(sub => (
                           <tr key={sub.idQr} className="border-t border-slate-100/50">
                              <td className="px-4 py-2.5 text-xs font-mono text-slate-700 font-medium">{sub.idQr}</td>
                              <td className="px-4 py-2.5" onClick={(e) => {
                                 if (sub.imagenUrl) {
                                    e.stopPropagation();
                                    onShowImage(sub.imagenUrl);
                                 }
                              }}>
                                 {sub.imagenUrl ? (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-slate-50 relative cursor-pointer">
                                       {/* eslint-disable-next-line @next/next/no-img-element */}
                                       <img src={sub.imagenUrl} alt={sub.idQr} className="w-full h-full object-cover" />
                                    </div>
                                 ) : (
                                    <div className="w-8 h-8 rounded-lg border border-slate-200 border-dashed flex items-center justify-center bg-slate-50/50">
                                       <PackageSearch size={12} className="text-slate-400" />
                                    </div>
                                 )}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-600">{sub.serie || '—'}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                                 <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">{sub.ubicacion}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-center font-semibold text-slate-700">{sub.stock} uds</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </td>
      </tr>
    )}
    </>
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  // ── Consulta rápida Odoo ──
  const [modalOdoo, setModalOdoo] = useState(false)
  const [odooQuery, setOdooQuery] = useState('')
  const [odooRefs, setOdooRefs] = useState<any[]>([])
  const [odooLoading, setOdooLoading] = useState(false)
  const [odooSelected, setOdooSelected] = useState<any | null>(null)

  // ── Registro rápido desde Odoo ──
  const [showRegistroPanel, setShowRegistroPanel] = useState(false)
  const [categorias, setCategorias] = useState<{ id: string; nombre: string; color: string | null }[]>([])
  const [registroForm, setRegistroForm] = useState({
    nombre: '', descripcionDetallada: '', area: 'ALMACEN', cuentaAct: '1810-00',
    categoriaId: '', esConsumible: true, cantidad: 1, imprimirEtiqueta: true
  })
  const [registrando, setRegistrando] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState<{ idQr: string; id: string } | null>(null)

  // Cargar categorías cuando se abre el modal Odoo
  useEffect(() => {
    if (modalOdoo && categorias.length === 0) {
      getCategoriasParaRegistro().then(setCategorias)
    }
  }, [modalOdoo, categorias.length])

  // Pre-cargar form cuando se selecciona un item de Odoo
  useEffect(() => {
    if (odooSelected) {
      setShowRegistroPanel(false)
      setRegistroExitoso(null)
      setRegistroForm(prev => ({
        ...prev,
        nombre: odooSelected.nombre || '',
        descripcionDetallada: odooSelected.notasInternas || '',
        cantidad: odooSelected.cantidadOdoo || 1,
      }))
    }
  }, [odooSelected])

  const handleRegistrarDesdeOdoo = async () => {
    if (!odooSelected) return
    setRegistrando(true)
    try {
      const result = await registrarDesdeOdoo({
        nombre: registroForm.nombre,
        descripcionDetallada: registroForm.descripcionDetallada || undefined,
        imagenUrl: odooSelected.imagenUrl || undefined,
        codigoBarras: odooSelected.codigoBarras || undefined,
        cantidad: registroForm.cantidad,
        referenciaInterna: odooSelected.referenciaInterna || undefined,
        pasilloEstante: odooSelected.pasilloEstante || undefined,
        categoriaId: registroForm.categoriaId || undefined,
        esConsumible: registroForm.esConsumible,
        area: registroForm.area,
        cuentaAct: registroForm.cuentaAct,
        imprimirEtiqueta: registroForm.imprimirEtiqueta,
      })
      if (result.success && result.idQr && result.id) {
        setRegistroExitoso({ idQr: result.idQr, id: result.id })
        toast.success(`✅ Registrado como ${result.idQr}`)
      } else {
        toast.error(result.error || 'Error al registrar')
      }
    } finally {
      setRegistrando(false)
    }
  }

  const handleOdooSearch = async (q?: string) => {
    const query = (q ?? odooQuery).trim()
    if (!query) return
    setOdooLoading(true)
    setOdooSelected(null)
    try {
      const res = await buscarReferenciaOdoo(query)
      setOdooRefs(res)
      if (res.length > 0) setOdooSelected(res[0])
    } catch (e) {
      toast.error('Error al consultar Odoo')
    } finally {
      setOdooLoading(false)
    }
  }

  const [pagina, setPagina] = useState(1)
  const PAGE_SIZE = 10

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos
    const q = busqueda.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return productos.filter((p) => {
      const desc = (p.descripcion || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const cod = (p.codigo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const ref = (p.referencia || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const cat = (p.categoria || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

      if (desc.includes(q) || cod.includes(q) || ref.includes(q) || cat.includes(q)) {
        return true
      }

      if (p.subActivos && p.subActivos.length > 0) {
        return p.subActivos.some(sub => 
          (sub.idQr && sub.idQr.toLowerCase().includes(q)) ||
          (sub.serie && sub.serie.toLowerCase().includes(q)) ||
          (sub.ubicacion && sub.ubicacion.toLowerCase().includes(q))
        )
      }

      return false
    })
  }, [productos, busqueda])

  useEffect(() => {
    setPagina(1)
  }, [busqueda])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(productosFiltrados.length / PAGE_SIZE))
  }, [productosFiltrados.length])

  const productosPaginados = useMemo(() => {
    const start = (pagina - 1) * PAGE_SIZE
    return productosFiltrados.slice(start, start + PAGE_SIZE)
  }, [productosFiltrados, pagina])

  const handlePrecioActualizado = useCallback(
    (id: string, costo: number, precio: number, newType?: 'PRODUCTO', newSku?: string, newStock?: number) => {
      setProductos((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, costoBase: costo, precioVenta: precio, sinPrecio: false, tipo: newType || p.tipo, codigo: newSku || p.codigo, stock: newStock ?? p.stock }
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
        tipo: 'PRODUCTO',
        imagenUrl: null
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

        <div className="flex items-center gap-2 self-start flex-wrap">
          {/* Consulta Odoo */}
          <button
            onClick={() => { setModalOdoo(true); setOdooRefs([]); setOdooSelected(null); setOdooQuery(''); }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Database size={16} />
            Consultar Odoo
          </button>
          {/* Nuevo Manual */}
          <button
            onClick={() => setModalNuevo(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold shadow-md shadow-slate-200 transition-all hover:-translate-y-0.5"
          >
            <Plus size={18} />
            Nuevo Registro Manual
          </button>
        </div>
      </div>

      <div className="relative mb-8">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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

        {productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 rounded-[20px] bg-slate-50 flex items-center justify-center mb-4">
              <PackageSearch size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-bold text-center">
              {busqueda ? 'No encontramos sugerencias, revisa tu término.' : 'Nada por aquí. Todos los precios están en orden.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="pl-4 pr-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Acción</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Código / UUID</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Foto</th>
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
                  {productosPaginados.map((p) => (
                    <FilaProducto key={p.id} producto={p} onEditar={setProductoEditando} onShowImage={setLightboxImage} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Control de Paginación ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="text-xs font-semibold text-slate-500">
                Mostrando <span className="text-slate-800 font-bold">{productosFiltrados.length === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1}</span> a <span className="text-slate-800 font-bold">{Math.min(pagina * PAGE_SIZE, productosFiltrados.length)}</span> de <span className="text-slate-800 font-bold">{productosFiltrados.length}</span> líneas unificadas
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina <= 1}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                <span className="text-xs font-bold text-slate-600 px-2">
                  Página {pagina} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina(p => Math.min(totalPages, p + 1))}
                  disabled={pagina >= totalPages}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  Siguiente
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {productoEditando && (
        <ModalEditarPrecios
          producto={productoEditando}
          onClose={() => setProductoEditando(null)}
          onGuardado={handlePrecioActualizado}
          onShowImage={setLightboxImage}
        />
      )}

      {modalNuevo && (
        <ModalNuevoProducto
          onClose={() => setModalNuevo(false)}
          onCreado={handleProductoCreado}
        />
      )}

      {/* ── Modal Consulta Inventario Odoo ── */}
      {modalOdoo && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setModalOdoo(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <Database size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Consulta de Inventario Odoo</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Búsqueda de referencia cruzada — solo lectura</p>
                </div>
              </div>
              <button
                onClick={() => setModalOdoo(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            {/* Buscador */}
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar por nombre, SKU, ID o referencia de Odoo..."
                    value={odooQuery}
                    onChange={(e) => setOdooQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOdooSearch() }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-sm transition-all"
                  />
                </div>
                <button
                  onClick={() => handleOdooSearch()}
                  disabled={odooLoading || !odooQuery.trim()}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {odooLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  Buscar
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {odooLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-sm text-slate-500">Consultando inventario de Odoo...</p>
                </div>
              ) : odooRefs.length === 0 && odooQuery ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <PackageSearch className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Sin resultados en Odoo</p>
                  <p className="text-xs text-slate-400 max-w-xs">Intenta buscar con otro término, SKU o referencia interna.</p>
                </div>
              ) : odooRefs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                    <Database className="w-7 h-7 text-blue-300" />
                  </div>
                  <p className="text-sm text-slate-500">Escribe un nombre o referencia y presiona Buscar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {/* Lista de coincidencias */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      {odooRefs.length} coincidencia{odooRefs.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                      {odooRefs.map((ref) => {
                        const isSel = odooSelected?.id === ref.id
                        return (
                          <button
                            key={ref.id}
                            type="button"
                            onClick={() => setOdooSelected(ref)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                              isSel
                                ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100/60 shadow-sm'
                                : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {ref.imagenUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={ref.imagenUrl} alt={ref.nombre} className="w-full h-full object-cover" />
                              ) : (
                                <PackageSearch className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${isSel ? 'text-blue-900' : 'text-slate-700'}`}>
                                {ref.nombre}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {ref.odooId && (
                                  <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                                    ODOO-{ref.odooId}
                                  </span>
                                )}
                                {ref.referenciaInterna && (
                                  <span className="text-[9px] text-slate-400 font-mono truncate max-w-[80px]">
                                    {ref.referenciaInterna}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Detalle del seleccionado */}
                  {odooSelected && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-4 animate-in fade-in duration-200">
                      {/* Imagen + nombre */}
                      <div className="flex gap-3 items-start">
                        <div
                          className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex-shrink-0 overflow-hidden flex items-center justify-center cursor-zoom-in"
                          onClick={() => odooSelected.imagenUrl && setLightboxImage(odooSelected.imagenUrl)}
                        >
                          {odooSelected.imagenUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={odooSelected.imagenUrl} alt={odooSelected.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <PackageSearch className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md inline-block mb-1">
                            {odooSelected.odooId ? `Odoo ID: ${odooSelected.odooId}` : 'Sin ID'}
                          </span>
                          <h5 className="font-bold text-slate-800 text-sm leading-snug">{odooSelected.nombre}</h5>
                          {odooSelected.referenciaInterna && (
                            <p className="text-xs text-slate-500 font-mono mt-1">Ref: {odooSelected.referenciaInterna}</p>
                          )}
                        </div>
                      </div>

                      {/* Datos clave */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-xl border border-slate-100 p-3">
                          <span className="block text-[9px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Costo Histórico</span>
                          <span className="text-base font-black text-blue-700">
                            {odooSelected.costoHistorico !== null ? formatLPS(odooSelected.costoHistorico) : 'N/D'}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-100 p-3">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Stock Odoo</span>
                          <span className="text-base font-black text-slate-700">
                            {odooSelected.cantidadOdoo !== null ? `${odooSelected.cantidadOdoo} uds.` : 'N/D'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {odooSelected.pasilloEstante && (
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white border border-slate-100">
                            <MapPin size={12} className="text-emerald-500 shrink-0" />
                            <span className="text-slate-500 shrink-0">Ubicación:</span>
                            <span className="font-semibold text-slate-700 truncate">{odooSelected.pasilloEstante}</span>
                          </div>
                        )}
                        {odooSelected.codigoBarras && (
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white border border-slate-100">
                            <Barcode size={12} className="text-slate-400 shrink-0" />
                            <span className="text-slate-500 shrink-0">Código de Barras:</span>
                            <span className="font-mono text-slate-700 truncate">{odooSelected.codigoBarras}</span>
                          </div>
                        )}
                      </div>

                      {odooSelected.notasInternas && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <span className="block text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1">Notas Internas</span>
                          <p className="text-xs text-amber-800 italic leading-relaxed whitespace-pre-wrap">{odooSelected.notasInternas}</p>
                        </div>
                      )}

                      {/* Botón para abrir panel de registro */}
                      {!registroExitoso && (
                        <button
                          type="button"
                          onClick={() => setShowRegistroPanel(p => !p)}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                            showRegistroPanel
                              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <Plus size={15} />
                          {showRegistroPanel ? 'Cancelar Registro' : 'Registrar en Inventario'}
                        </button>
                      )}

                      {/* ── Éxito: QR asignado ── */}
                      {registroExitoso && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-emerald-600" />
                            <span className="text-sm font-bold text-emerald-800">Registrado exitosamente</span>
                          </div>
                          <p className="text-xs text-emerald-700">QR asignado:</p>
                          <span className="block font-mono font-black text-base text-emerald-900 bg-white px-3 py-2 rounded-lg border border-emerald-200">{registroExitoso.idQr}</span>
                          <div className="flex gap-2 mt-2">
                            <a
                              href={`/inventario`}
                              target="_blank"
                              className="flex-1 text-center py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                            >
                              Ver en Inventario
                            </a>
                            <a
                              href={`/ficha-tecnica/${registroExitoso.idQr}`}
                              target="_blank"
                              className="flex-1 text-center py-2 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition-colors"
                            >
                              Ficha Técnica
                            </a>
                          </div>
                        </div>
                      )}

                      {/* ── Panel de Registro ── */}
                      {showRegistroPanel && !registroExitoso && (
                        <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Datos del Registro</p>

                          {/* Nombre */}
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Nombre</label>
                            <input
                              type="text"
                              value={registroForm.nombre}
                              onChange={e => setRegistroForm(p => ({ ...p, nombre: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
                            />
                          </div>

                          {/* Tipo */}
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Tipo</label>
                            <div className="flex gap-2">
                              {[{ label: 'Consumible', value: true }, { label: 'Equipo Médico', value: false }].map(opt => (
                                <button
                                  key={String(opt.value)}
                                  type="button"
                                  onClick={() => setRegistroForm(p => ({ ...p, esConsumible: opt.value }))}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    registroForm.esConsumible === opt.value
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Categoría */}
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Categoría</label>
                            <select
                              value={registroForm.categoriaId}
                              onChange={e => setRegistroForm(p => ({ ...p, categoriaId: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 bg-white"
                            >
                              <option value="">Sin categoría</option>
                              {categorias.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </select>
                          </div>

                          {/* Cantidad y Área */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Cantidad</label>
                              <input
                                type="number" min="1"
                                value={registroForm.cantidad}
                                onChange={e => setRegistroForm(p => ({ ...p, cantidad: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Área / Ubicación</label>
                              <input
                                type="text"
                                value={registroForm.area}
                                onChange={e => setRegistroForm(p => ({ ...p, area: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-400 bg-white"
                              />
                            </div>
                          </div>

                          {/* Imprimir etiqueta toggle */}
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div
                              onClick={() => setRegistroForm(p => ({ ...p, imprimirEtiqueta: !p.imprimirEtiqueta }))}
                              className={`w-10 h-5 rounded-full transition-colors relative ${
                                registroForm.imprimirEtiqueta ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                registroForm.imprimirEtiqueta ? 'translate-x-5' : 'translate-x-0.5'
                              }`} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">Encolar etiqueta QR para imprimir</span>
                          </label>

                          {/* Botón guardar */}
                          <button
                            type="button"
                            onClick={handleRegistrarDesdeOdoo}
                            disabled={registrando || !registroForm.nombre.trim()}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {registrando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            {registrando ? 'Registrando...' : 'Guardar en Inventario'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <button
                onClick={() => setModalOdoo(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal overlay for images */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 bg-white/10 text-white p-3 rounded-full hover:bg-white/25 transition-colors border border-white/20"
            onClick={() => setLightboxImage(null)}
            title="Cerrar vista"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={lightboxImage} 
            alt="Vista Ampliada" 
            className="w-[600px] max-w-full h-auto max-h-[80vh] object-contain bg-white p-4 rounded-xl shadow-2xl ring-1 ring-white/10" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
