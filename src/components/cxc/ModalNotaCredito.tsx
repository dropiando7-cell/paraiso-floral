'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle2, Loader2, Flower2, Plus, Trash2, Search } from 'lucide-react';
import { searchProductos } from '@/app/(dashboard)/facturas/actions';

interface ItemReclamo {
  cantidad: number;
  descripcion: string;
  precioUnitario: number;
}

interface ProductoCatalogo {
  id: string;
  sku?: string | null;
  nombre: string;
  precioVenta: string | number;
}

interface ModalNotaCreditoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cliente: {
    id: string;
    nombre: string;
    saldoTotal: number;
    facturas?: Array<{
      id: string;
      correlativo: string;
      total: number;
      saldoPendiente: number;
      detalles?: Array<{
        id: string;
        descripcion: string;
        cantidad: number;
        precioUnitario: number;
        totalLinea: number;
      }>;
    }>;
  } | null;
}

export default function ModalNotaCredito({ isOpen, onClose, onSuccess, cliente }: ModalNotaCreditoProps) {
  const [monto, setMonto] = useState<string>('');
  const [fechaNC, setFechaNC] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<string>('FLOR_DANADA');
  const [facturaId, setFacturaId] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ítems detallados (Cantidad + Producto/Descripción + Precio Unitario)
  const [items, setItems] = useState<ItemReclamo[]>([
    { cantidad: 1, descripcion: '', precioUnitario: 0 }
  ]);

  // Catálogo de productos para autocompletado tipo facturación
  const [catalogo, setCatalogo] = useState<ProductoCatalogo[]>([]);
  const [activeRowSearch, setActiveRowSearch] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFechaNC(new Date().toISOString().split('T')[0]);
      setError(null);
      // Cargar catálogo inicial para búsqueda rápida
      searchProductos('', 200)
        .then((res: any[]) => {
          const soloProductos = (res || []).filter((p) => !p.isOrdenTrabajo);
          setCatalogo(soloProductos);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveRowSearch(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen || !cliente) return null;

  const recalcularMontoDesdeItems = (listaItems: ItemReclamo[]) => {
    const suma = listaItems.reduce(
      (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0),
      0
    );
    if (suma > 0) {
      setMonto(suma.toFixed(2));
    }
  };

  const handleItemChange = (index: number, field: keyof ItemReclamo, value: any) => {
    const nuevos = [...items];
    (nuevos[index] as any)[field] = value;
    setItems(nuevos);
    recalcularMontoDesdeItems(nuevos);
  };

  const handleSelectProducto = (index: number, prod: { nombre: string; precio: number }) => {
    const nuevos = [...items];
    nuevos[index] = {
      ...nuevos[index],
      descripcion: prod.nombre.toUpperCase(),
      precioUnitario: prod.precio > 0 ? prod.precio : nuevos[index].precioUnitario,
    };
    setItems(nuevos);
    recalcularMontoDesdeItems(nuevos);
    setActiveRowSearch(null);
  };

  const handleAddItem = () => {
    setItems([...items, { cantidad: 1, descripcion: '', precioUnitario: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      const vacio = [{ cantidad: 1, descripcion: '', precioUnitario: 0 }];
      setItems(vacio);
      setMonto('');
      return;
    }
    const nuevos = items.filter((_, i) => i !== index);
    setItems(nuevos);
    recalcularMontoDesdeItems(nuevos);
  };

  // Construir resumen de líneas válidas (ej. "2 ROSAS AMARILLAS 300 = 600")
  const itemsValidos = items.filter((it) => it.descripcion.trim() !== '');
  const resumenItemsTexto = itemsValidos
    .map((it) => {
      const cant = Number(it.cantidad) || 1;
      const precio = Number(it.precioUnitario) || 0;
      const sub = cant * precio;
      return precio > 0
        ? `${cant} ${it.descripcion.trim().toUpperCase()} ${precio} = ${sub.toFixed(2).replace(/\.00$/, '')}`
        : `${cant} ${it.descripcion.trim().toUpperCase()}`;
    })
    .join(', ');

  // Sugerencias de productos (primero los de la factura seleccionada o del cliente si existen, luego catálogo)
  const getSugerenciasFila = (query: string) => {
    const q = query.trim().toUpperCase();
    const sugerencias: Array<{ id: string; nombre: string; precio: number; origen?: string }> = [];
    const vistos = new Set<string>();

    // 1. Si hay factura seleccionada o facturas del cliente, extraer sus productos y precios reales
    const facturasFuente = facturaId
      ? (cliente.facturas || []).filter((f) => f.id === facturaId)
      : cliente.facturas || [];

    for (const fac of facturasFuente) {
      for (const det of fac.detalles || []) {
        const nom = (det.descripcion || '').trim().toUpperCase();
        if (!nom) continue;
        const key = `${nom}-${det.precioUnitario}`;
        if (!vistos.has(key) && (!q || nom.includes(q))) {
          vistos.add(key);
          sugerencias.push({
            id: `fac-${det.id}`,
            nombre: nom,
            precio: Number(det.precioUnitario) || 0,
            origen: `Fac #${fac.correlativo.slice(-5)}`,
          });
        }
      }
    }

    // 2. Productos del catálogo general de facturación
    for (const p of catalogo) {
      const nom = (p.nombre || '').trim().toUpperCase();
      if (!nom) continue;
      const precio = Number(p.precioVenta) || 0;
      const key = `${nom}-${precio}`;
      if (!vistos.has(key) && (!q || nom.includes(q) || (p.sku && p.sku.toUpperCase().includes(q)))) {
        vistos.add(key);
        sugerencias.push({
          id: p.id,
          nombre: nom,
          precio,
        });
      }
      if (sugerencias.length >= 25) break;
    }

    return sugerencias;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      setError('Por favor ingresa un monto válido a descontar');
      return;
    }

    const textoFinal = [resumenItemsTexto, descripcion.trim()].filter(Boolean).join(' — ');

    if (!textoFinal) {
      setError('Agrega al menos un producto/flor o escribe el detalle del motivo');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/cxc/notas-credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cliente.id,
          facturaId: facturaId || undefined,
          monto: valMonto,
          motivo,
          descripcion: textoFinal,
          fotos: fotoUrl.trim() ? [fotoUrl.trim()] : [],
          fecha: fechaNC || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al emitir la nota de crédito');
      }

      setMonto('');
      setDescripcion('');
      setFacturaId('');
      setFotoUrl('');
      setItems([{ cantidad: 1, descripcion: '', precioUnitario: 0 }]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error registrando la nota de crédito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              <Flower2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Nota de Crédito / Ajuste por Flor</h3>
              <p className="text-amber-100 text-xs truncate max-w-[280px]">Cliente: {cliente.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 bg-white">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Motivo del Ajuste */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Motivo del Descuento / Reclamo *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="FLOR_DANADA">🌹 Flor Dañada / Podrida en Paquete</option>
              <option value="DEFECTO_CALIDAD">🥀 Defecto de Calidad / Tallo Corto</option>
              <option value="FALTANTE_PAQUETE">📦 Faltante de Tallos en Bulto</option>
              <option value="ERROR_PRECIO">💲 Error en Precio de Facturación</option>
              <option value="DESCUENTO_ESPECIAL">🤝 Descuento Comercial / Bonificación</option>
              <option value="OTRO">✏️ Otro Motivo Explicado</option>
            </select>
          </div>

          {/* Factura Específica (Opcional) */}
          {cliente.facturas && cliente.facturas.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aplicar a Factura Específica (Opcional)
              </label>
              <select
                value={facturaId}
                onChange={(e) => setFacturaId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              >
                <option value="">-- Descontar del saldo general del cliente --</option>
                {cliente.facturas.map(f => (
                  <option key={f.id} value={f.id}>
                    Factura #{f.correlativo} (Saldo: L. {f.saldoPendiente.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desglose de Ítems / Flores a Rebajar */}
          <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2.5" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                <Flower2 className="w-3.5 h-3.5 text-amber-600" />
                Productos / Flores a Rebajar
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
              >
                <Plus className="w-3 h-3" /> Agregar Ítem
              </button>
            </div>

            {/* Encabezados de columnas */}
            <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-slate-500 uppercase px-1">
              <div className="col-span-2 text-center">Cant.</div>
              <div className="col-span-5">Producto / Descripción</div>
              <div className="col-span-3 text-right">Precio Unit.</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => {
                const subtotal = (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0);
                const sugerencias = activeRowSearch === idx ? getSugerenciasFila(it.descripcion) : [];

                return (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center relative">
                    {/* Cantidad */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={it.cantidad}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                        placeholder="Cant"
                        className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-center text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    {/* Buscador / Descripción del Producto */}
                    <div className="col-span-5 relative">
                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={it.descripcion}
                          onFocus={() => setActiveRowSearch(idx)}
                          onChange={(e) => {
                            handleItemChange(idx, 'descripcion', e.target.value.toUpperCase());
                            setActiveRowSearch(idx);
                          }}
                          placeholder="Ej. ROSAS AMARILLAS"
                          className="w-full pl-7 pr-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>

                      {/* Dropdown Autocomplete */}
                      {activeRowSearch === idx && sugerencias.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100">
                          {sugerencias.map((sug) => (
                            <button
                              key={sug.id}
                              type="button"
                              onClick={() => handleSelectProducto(idx, sug)}
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="truncate font-bold text-slate-800">
                                {sug.nombre}
                                {sug.origen && (
                                  <span className="ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                    {sug.origen}
                                  </span>
                                )}
                              </div>
                              {sug.precio > 0 && (
                                <span className="text-[11px] font-black text-amber-700 shrink-0">
                                  L. {sug.precio.toFixed(2)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Precio Unitario */}
                    <div className="col-span-3 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        L.
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.precioUnitario || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleItemChange(idx, 'precioUnitario', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-right text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    {/* Subtotal y botón eliminar */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <span className="text-xs font-black text-amber-900 whitespace-nowrap">
                        L. {subtotal.toLocaleString('es-HN', { maximumFractionDigits: 2 })}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors shrink-0"
                          title="Quitar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {resumenItemsTexto && (
              <div className="pt-1.5 border-t border-amber-200/70 flex items-center justify-between text-[11px] text-amber-900">
                <span className="font-semibold truncate">
                  📋 <span className="font-bold">{resumenItemsTexto}</span>
                </span>
              </div>
            )}
          </div>

          {/* Monto y Fecha del Ajuste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Monto Total a Descontar (L.) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">L.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={monto}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>Fecha del Reclamo / Nota *</span>
                <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">Modificable</span>
              </label>
              <input
                type="date"
                required
                value={fechaNC}
                onChange={(e) => setFechaNC(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Observaciones / Detalle adicional */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Detalle Adicional / Justificación {resumenItemsTexto ? '(Opcional)' : '*'}
            </label>
            <textarea
              rows={2}
              required={!resumenItemsTexto}
              placeholder="Ej: Llegaron maltratadas en el envío de la mañana..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
            />
          </div>

          {/* URL o prueba fotográfica */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              URL de Foto de Respaldo WhatsApp / Evidencia (Opcional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl transition-colors border border-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] font-bold text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emitir Nota de Crédito</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

