'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, AlertCircle, Loader2, CheckCircle2, ChevronDown, Building2, Edit3 } from 'lucide-react';
import { HONDURAS_BANKS } from './ModalAbono';

interface PagoAEditar {
  id: string;
  monto: number;
  fecha: string;
  metodoPago: string;
  banco?: string | null;
  referencia?: string | null;
  notas?: string | null;
  correlativo?: string | null;
}

interface ModalEditarAbonoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clienteNombre: string;
  pago: PagoAEditar | null;
}

export default function ModalEditarAbono({ isOpen, onClose, onSuccess, clienteNombre, pago }: ModalEditarAbonoProps) {
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('TRANSFERENCIA');
  const [banco, setBanco] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [fechaPago, setFechaPago] = useState<string>('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const bankDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
        setBankDropdownOpen(false);
      }
    }
    if (bankDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bankDropdownOpen]);

  useEffect(() => {
    if (!bankDropdownOpen) {
      setBankSearchQuery('');
    }
  }, [bankDropdownOpen]);

  useEffect(() => {
    if (pago) {
      setMonto(pago.monto.toString());
      setMetodoPago(pago.metodoPago || 'TRANSFERENCIA');
      setBanco(pago.banco || '');
      setReferencia(pago.referencia || '');
      setNotas(pago.notas || '');
      
      try {
        const d = new Date(pago.fecha);
        setFechaPago(d.toISOString().split('T')[0]);
      } catch {
        setFechaPago(new Date().toISOString().split('T')[0]);
      }
    }
  }, [pago]);

  if (!isOpen || !pago) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      setError('Por favor ingresa un monto válido mayor a L. 0.00');
      return;
    }

    try {
      setLoading(true);
      const isEfectivo = metodoPago?.toUpperCase() === 'EFECTIVO' || metodoPago?.toLowerCase() === 'efectivo';
      const res = await fetch(`/api/cxc/abonos/${pago.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: valMonto,
          metodoPago,
          banco: isEfectivo ? null : (banco.trim() || null),
          referencia: referencia.trim() || undefined,
          notas: notas.trim() || undefined,
          fecha: fechaPago || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al editar el abono');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error guardando los cambios');
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = HONDURAS_BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-lg">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Editar Abono / Recibo {pago.correlativo || ''}</h3>
              <p className="text-emerald-100 text-xs truncate max-w-[240px]">Cliente: {clienteNombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 rounded-2xl text-xs flex items-center gap-2 border border-red-200 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo de Monto y Fecha del Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Monto del Abono (Lempiras) *
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
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Fecha del Pago *
              </label>
              <input
                type="date"
                required
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Forma de Pago *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'TRANSFERENCIA', label: 'Transferencia' },
                { id: 'EFECTIVO', label: 'Efectivo en Caja' },
                { id: 'TIGO_MONEY', label: 'Tigo Money' },
                { id: 'CHEQUE', label: 'Cheque' },
                { id: 'DEPOSITO', label: 'Depósito Bancario' },
                { id: 'OTRO', label: 'Otro' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setMetodoPago(item.id);
                    if (item.id === 'EFECTIVO' || item.id.toLowerCase() === 'efectivo') {
                      setBankDropdownOpen(false);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    metodoPago === item.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banco y Referencia */}
          {metodoPago?.toUpperCase() !== 'EFECTIVO' && metodoPago?.toLowerCase() !== 'efectivo' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Selector Inteligente de Banco Destino */}
              <div className="relative" ref={bankDropdownRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banco Destino
                </label>
                
                <button
                  type="button"
                  onClick={() => setBankDropdownOpen(!bankDropdownOpen)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    {(() => {
                      const foundBank = HONDURAS_BANKS.find(b => b.name.toLowerCase() === banco.toLowerCase());
                      if (foundBank) {
                        return (
                          <>
                            <div className="w-5 h-5 rounded bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                              <img src={foundBank.logo} alt={foundBank.name} className="w-full h-full object-contain" />
                            </div>
                            <span className="font-extrabold text-slate-900">{foundBank.name}</span>
                          </>
                        );
                      }
                      if (banco) {
                        return (
                          <>
                            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-extrabold text-slate-900">{banco}</span>
                          </>
                        );
                      }
                      return <span className="text-slate-400 font-medium">Seleccionar Banco...</span>;
                    })()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {bankDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-1.5 space-y-1">
                    {/* Buscador de banco */}
                    <div className="sticky top-0 bg-white pb-1.5 pt-0.5 px-1 z-10 border-b border-slate-100 mb-1">
                      <input
                        type="text"
                        placeholder="Buscar banco..."
                        value={bankSearchQuery}
                        onChange={(e) => setBankSearchQuery(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                        autoFocus
                      />
                    </div>
                    {filteredBanks.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-4 font-semibold">No se encontraron bancos</p>
                    ) : (
                      filteredBanks.map((b) => (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => {
                            setBanco(b.name);
                            setBankDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                            banco.toLowerCase() === b.name.toLowerCase()
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 animate-in fade-in">
                            <img src={b.logo} alt={b.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="truncate">{b.name}</span>
                          {banco.toLowerCase() === b.name.toLowerCase() && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  # Referencia / Transacción
                </label>
                <input
                  type="text"
                  placeholder="Ej: 984521"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span># Referencia / N° Recibo Físico</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase">Opcional</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Recibo manual #0045 (opcional)"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas Explicativas
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Corrección de valor digitado..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] font-bold text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
