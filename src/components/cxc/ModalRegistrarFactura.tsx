'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  User,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClienteOption {
  id: string;
  nombre: string;
  telefono?: string | null;
  diasCredito?: number;
}

interface ModalRegistrarFacturaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientePreseleccionado?: { id: string; nombre: string; diasCredito?: number } | null;
}

export default function ModalRegistrarFactura({
  isOpen,
  onClose,
  onSuccess,
  clientePreseleccionado
}: ModalRegistrarFacturaProps) {
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteId, setClienteId] = useState<string>('');
  const [searchCliente, setSearchCliente] = useState<string>('');

  const [correlativo, setCorrelativo] = useState<string>('');
  const [fechaEmision, setFechaEmision] = useState<string>(new Date().toISOString().split('T')[0]);
  const [diasCredito, setDiasCredito] = useState<number>(15);
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [descripcionGeneral, setDescripcionGeneral] = useState<string>('Venta de Flor a Crédito');

  // Modo detallado opcional
  const [mostrarDetalles, setMostrarDetalles] = useState<boolean>(false);
  const [items, setItems] = useState<Array<{ descripcion: string; cantidad: number; precioUnitario: number }>>([
    { descripcion: 'Flores / Variedades', cantidad: 1, precioUnitario: 0 }
  ]);

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (clientePreseleccionado) {
        setClienteId(clientePreseleccionado.id);
        setSearchCliente(clientePreseleccionado.nombre);
        setDiasCredito(clientePreseleccionado.diasCredito || 15);
      } else {
        setClienteId('');
        setSearchCliente('');
        cargarClientes();
      }
      setFechaEmision(new Date().toISOString().split('T')[0]);
      setMontoTotal('');
      setCorrelativo('');
      setDescripcionGeneral('Venta de Flor a Crédito');
      setMostrarDetalles(false);
      setItems([{ descripcion: 'Flores / Variedades', cantidad: 1, precioUnitario: 0 }]);
    }
  }, [isOpen, clientePreseleccionado]);

  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const res = await fetch('/api/cxc/clientes?filtro=TODOS');
      if (res.ok) {
        const data = await res.json();
        setClientes(data.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono,
          diasCredito: c.diasCredito || 15
        })));
      }
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleClienteSelect = (c: ClienteOption) => {
    setClienteId(c.id);
    setSearchCliente(c.nombre);
    setDiasCredito(c.diasCredito || 15);
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    setItems(updated);

    // Actualizar monto total si está en modo detallado
    const suma = updated.reduce((sum, it) => sum + (Number(it.cantidad || 1) * Number(it.precioUnitario || 0)), 0);
    if (suma > 0) {
      setMontoTotal(suma.toFixed(2));
    }
  };

  const handleAddItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precioUnitario: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    const suma = updated.reduce((sum, it) => sum + (Number(it.cantidad || 1) * Number(it.precioUnitario || 0)), 0);
    if (suma > 0) {
      setMontoTotal(suma.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(montoTotal);

    if (!clienteId) {
      toast.error('Por favor selecciona un cliente');
      return;
    }

    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('Ingresa un monto válido mayor a 0');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        clienteId,
        correlativo: correlativo.trim() || undefined,
        fechaEmision,
        monto: montoNum,
        diasCredito,
        descripcion: descripcionGeneral.trim() || 'Venta a Crédito Comercial'
      };

      if (mostrarDetalles && items.length > 0) {
        payload.items = items.map(it => ({
          descripcion: it.descripcion || descripcionGeneral,
          cantidad: Number(it.cantidad) || 1,
          precioUnitario: Number(it.precioUnitario) || montoNum,
          totalLinea: (Number(it.cantidad) || 1) * (Number(it.precioUnitario) || montoNum)
        }));
      }

      const res = await fetch('/api/cxc/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Error al guardar la factura');
      }

      toast.success(resJson.message || 'Factura registrada exitosamente');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al registrar factura');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchCliente.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Header con gradiente esmeralda */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FileText className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Registrar Factura / Cargo
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/40 text-emerald-100 border border-emerald-400/30">
                  CxC
                </span>
              </h2>
              <p className="text-emerald-100 text-xs font-medium">
                Carga ágil de ventas a crédito para seguimiento de cartera
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario con scroll interno */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs">
          {/* Selector de Cliente */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Cliente Receptor <span className="text-rose-500">*</span>
            </label>

            {clientePreseleccionado ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-black text-sm text-emerald-900 flex items-center justify-between">
                <span>{clientePreseleccionado.nombre}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  Cliente Actual
                </span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value);
                    setClienteId('');
                  }}
                  placeholder="Buscar o seleccionar cliente..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                {searchCliente && !clienteId && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 divide-y divide-slate-100">
                    {loadingClientes ? (
                      <div className="p-3 text-center text-slate-400 text-xs">Cargando lista...</div>
                    ) : filteredClientes.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">No se encontró cliente</div>
                    ) : (
                      filteredClientes.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleClienteSelect(c)}
                          className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                        >
                          <span className="font-bold">{c.nombre}</span>
                          <span className="text-[11px] text-slate-400">{c.telefono || 'Sin tel.'}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grid de Correlativo y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Nro. Factura / Ref (Opcional)
              </label>
              <input
                type="text"
                value={correlativo}
                onChange={(e) => setCorrelativo(e.target.value)}
                placeholder="Ej. FAC-1049 (Auto si vacío)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Fecha de Emisión <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Monto Total y Días de Crédito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Monto Total Factura (L.) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                  L.
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-emerald-50/60 border-2 border-emerald-200 rounded-xl text-sm font-black text-emerald-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Presets de Días de Crédito */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Plazo de Crédito: <span className="text-emerald-700">{diasCredito} días</span>
              </label>
              <div className="flex items-center gap-1">
                {[7, 15, 30].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiasCredito(d)}
                    className={`flex-1 py-2 rounded-xl font-extrabold text-[11px] transition-all ${
                      diasCredito === d
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Descripción / Concepto General */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Concepto / Variedades de Flor</span>
              <button
                type="button"
                onClick={() => setMostrarDetalles(!mostrarDetalles)}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {mostrarDetalles ? 'Ocultar desglose detallado' : '+ Desglosar productos/líneas'}
              </button>
            </label>
            <textarea
              rows={2}
              value={descripcionGeneral}
              onChange={(e) => setDescripcionGeneral(e.target.value)}
              placeholder="Ej. 10 Bonches Rosa Freedom, 5 Girasoles, 2 Baby Breath..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          {/* Desglose de Líneas Opcional */}
          {mostrarDetalles && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-[11px] text-slate-700 uppercase tracking-wider">
                  Detalle de Productos / Bonches
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3" /> Fila
                </button>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={it.descripcion}
                      onChange={(e) => handleItemChange(idx, 'descripcion', e.target.value)}
                      placeholder="Producto / Flor"
                      className="flex-3 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      value={it.cantidad}
                      onChange={(e) => handleItemChange(idx, 'cantidad', Number(e.target.value))}
                      placeholder="Cant"
                      className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={it.precioUnitario || ''}
                      onChange={(e) => handleItemChange(idx, 'precioUnitario', Number(e.target.value))}
                      placeholder="Precio"
                      className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right outline-none"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold shadow-md shadow-emerald-700/20 transition-all flex items-center gap-2"
            >
              {saving ? (
                <span>Guardando Factura...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Factura</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
