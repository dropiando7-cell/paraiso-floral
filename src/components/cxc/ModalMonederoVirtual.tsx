'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Wallet, AlertCircle, Plus, Minus, FileText, History } from 'lucide-react';
import { updateSaldoFavorCliente } from '@/app/(dashboard)/contactos/actions';

export interface MovimientoMonedero {
  id: string;
  fecha: string;
  monto: number;
  motivo?: string;
  facturaCorrelativo?: string | null;
  saldoNuevo?: number;
  usuario?: string;
}

interface ModalMonederoVirtualProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
    id: string;
    nombre: string;
    saldoFavor?: number;
  } | null;
  facturas?: { id: string; correlativo: string; total: number; fechaEmision: string | Date; tipoDocumento?: string }[];
  movimientos?: MovimientoMonedero[];
  onSuccess: () => void;
}

const fmtL = (n: number) => `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ModalMonederoVirtual({ isOpen, onClose, cliente, facturas = [], movimientos = [], onSuccess }: ModalMonederoVirtualProps) {
  const [saldoOperacion, setSaldoOperacion] = useState<string>('0');
  const [operacion, setOperacion] = useState<'AGREGAR' | 'RESTAR'>('AGREGAR');
  const [motivo, setMotivo] = useState('');
  const [facturaId, setFacturaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && cliente) {
      setSaldoOperacion('');
      setOperacion('AGREGAR');
      setMotivo('');
      setFacturaId('');
      setError(null);
    }
  }, [isOpen, cliente?.id]);

  if (!isOpen || !cliente) return null;

  const facturasReales = facturas.filter(f => f.tipoDocumento !== 'SALDO_INICIAL' && f.id !== 'saldo-inicial-excel');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let numSaldo = parseFloat(saldoOperacion.replace(/,/g, '')) || 0;
      if (numSaldo <= 0) throw new Error('Ingresa un monto válido mayor a cero.');
      if (!motivo.trim()) throw new Error('Indica el motivo del movimiento.');
      
      if (operacion === 'RESTAR') {
        numSaldo = -Math.abs(numSaldo);
      }

      await updateSaldoFavorCliente(cliente.id, numSaldo, motivo.trim(), facturaId || null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el monedero virtual.');
    } finally {
      setLoading(false);
    }
  };

  const saldoActual = cliente.saldoFavor || 0;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-tight">Monedero Virtual</h3>
            <p className="text-xs font-bold text-emerald-700 uppercase truncate max-w-[240px] mt-0.5">{cliente.nombre}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Saldo Actual a Favor</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">L. {saldoActual.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOperacion('AGREGAR')}
              className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                operacion === 'AGREGAR'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-4 h-4" /> Agregar (+ L.)
            </button>
            <button
              type="button"
              onClick={() => setOperacion('RESTAR')}
              className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                operacion === 'RESTAR'
                  ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Minus className="w-4 h-4" /> Restar (- L.)
            </button>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Monto a {operacion === 'AGREGAR' ? 'Agregar al Monedero' : 'Restar del Monedero'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-sm ${operacion === 'AGREGAR' ? 'text-emerald-700' : 'text-rose-700'}`}>L.</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={saldoOperacion}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const raw = e.target.value.replace(/^0+(?=\d)/, '');
                  setSaldoOperacion(raw);
                }}
                placeholder="0.00"
                className={`w-full pl-9 pr-4 py-2.5 border rounded-2xl text-slate-900 text-sm font-black font-mono focus:ring-2 focus:bg-white outline-none transition-all ${
                  operacion === 'AGREGAR' 
                    ? 'bg-emerald-50/60 border-emerald-300 focus:ring-emerald-500' 
                    : 'bg-rose-50/60 border-rose-300 focus:ring-rose-500'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium italic mt-1">
              {operacion === 'AGREGAR' 
                ? '* Este monto quedará a favor del cliente para descontar en futuras facturas.' 
                : '* Este monto se restará del saldo a favor actual del cliente (por ej. si se usó como pago).'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Motivo <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder={operacion === 'AGREGAR' ? 'Ej: Se cobró de más el flete, se devuelve diferencia.' : 'Ej: Aplicado manualmente como pago.'}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm text-slate-900 font-medium bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" /> Factura relacionada <span className="text-slate-400 normal-case font-medium">(opcional)</span>
            </label>
            <select
              value={facturaId}
              onChange={e => setFacturaId(e.target.value)}
              className="w-full h-11 px-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none"
            >
              <option value="">— Sin factura relacionada —</option>
              {facturasReales.map(f => (
                <option key={f.id} value={f.id}>
                  {f.correlativo} · {new Date(f.fechaEmision).toLocaleDateString('es-HN')} · {fmtL(f.total)}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !saldoOperacion || !motivo.trim()}
              className={`px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                operacion === 'AGREGAR'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Aplicar Monedero'}</span>
            </button>
          </div>
        </form>

        {movimientos.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Historial del Monedero
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {movimientos.map(m => (
                <div key={m.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-black font-mono ${m.monto > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {m.monto > 0 ? '+' : '−'} {fmtL(Math.abs(m.monto))}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(m.fecha).toLocaleString('es-HN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  {m.motivo && <p className="text-slate-700 font-medium mt-1">{m.motivo}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold">
                    {m.facturaCorrelativo && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">Fact. {m.facturaCorrelativo}</span>}
                    {m.usuario && <span>{m.usuario}</span>}
                    {m.saldoNuevo !== undefined && <span className="ml-auto">Saldo: {fmtL(m.saldoNuevo)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
