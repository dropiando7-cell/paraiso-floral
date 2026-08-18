'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Clock, HelpCircle, DollarSign, AlertCircle } from 'lucide-react';
import { updateSaldoInicialCliente } from '@/app/(dashboard)/contactos/actions';

interface ModalSaldoInicialProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
    id: string;
    nombre: string;
    saldoInicial?: number;
    fechaSaldoInicial?: string | Date | null;
  } | null;
  onSuccess: () => void;
}

export default function ModalSaldoInicial({ isOpen, onClose, cliente, onSuccess }: ModalSaldoInicialProps) {
  const [saldoInicial, setSaldoInicial] = useState<string>('0');
  const [fecha, setFecha] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cliente) {
      setSaldoInicial(cliente.saldoInicial ? String(cliente.saldoInicial) : '0');
      setNotas('');
      
      if (cliente.fechaSaldoInicial) {
        const d = new Date(cliente.fechaSaldoInicial);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setFecha(`${yyyy}-${mm}-${dd}`);
      } else {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setFecha(`${yyyy}-${mm}-${dd}`);
      }
      setError(null);
    }
  }, [cliente]);

  if (!isOpen || !cliente) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const numSaldo = parseFloat(saldoInicial.replace(/,/g, '')) || 0;
      const parsedFecha = fecha ? new Date(fecha + 'T12:00:00') : null;
      await updateSaldoInicialCliente(cliente.id, numSaldo, notas, parsedFecha);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el saldo inicial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-tight">Saldo Inicial Excel (Deuda Previa)</h3>
            <p className="text-xs font-bold text-emerald-700 uppercase truncate max-w-[240px] mt-0.5">{cliente.nombre}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Monto Saldo Inicial (Excel) L. <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700 font-extrabold text-sm">L.</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={saldoInicial === '0' ? '' : saldoInicial}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const raw = e.target.value.replace(/^0+(?=\d)/, '');
                  setSaldoInicial(raw);
                }}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-amber-50/60 border border-amber-300 rounded-2xl text-slate-900 text-sm font-black font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-amber-800 font-medium italic mt-1">
              * Este monto se sumará a la cartera de CxC del cliente y se reducirá automáticamente al aplicar abonos o notas de crédito.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Fecha del Saldo Inicial <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
            />
            <p className="text-[10px] text-slate-500 font-medium italic mt-1">
              Establece la fecha histórica en la que se originó esta deuda previa del cliente.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Observaciones / Notas (Opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Ej: Carga inicial según libreta de cobros Excel antes del ERP..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
            />
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
              disabled={loading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Saldo Inicial'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
