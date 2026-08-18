'use client';

import React, { useState } from 'react';
import { X, DollarSign, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface ModalAbonoProps {
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
      fechaEmision: string;
    }>;
  } | null;
}

export default function ModalAbono({ isOpen, onClose, onSuccess, cliente }: ModalAbonoProps) {
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('TRANSFERENCIA');
  const [banco, setBanco] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !cliente) return null;

  const handleMontoRapido = (porcentaje: number) => {
    const valor = Math.round(cliente.saldoTotal * porcentaje);
    setMonto(valor.toString());
  };

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
      const res = await fetch('/api/cxc/abonos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cliente.id,
          monto: valMonto,
          metodoPago,
          banco: banco.trim() || undefined,
          referencia: referencia.trim() || undefined,
          notas: notas.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el abono');
      }

      setMonto('');
      setBanco('');
      setReferencia('');
      setNotas('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error registrando el abono');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Registrar Abono / Pago</h3>
              <p className="text-emerald-100 text-xs truncate max-w-[240px]">Cliente: {cliente.nombre}</p>
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
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen de Saldo */}
          <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex justify-between items-center">
            <div>
              <span className="text-xs text-emerald-900 font-bold">Saldo Pendiente Actual</span>
              <p className="text-xs text-slate-500">Total adeudado por el cliente</p>
            </div>
            <span className="text-xl font-black text-emerald-700">
              L. {cliente.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Botones de Abono Rápido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Atajos de Monto Rápido
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleMontoRapido(0.25)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 font-semibold text-xs rounded-lg transition-colors text-slate-700 border border-slate-200"
              >
                25% (L. {(cliente.saldoTotal * 0.25).toFixed(0)})
              </button>
              <button
                type="button"
                onClick={() => handleMontoRapido(0.50)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 font-semibold text-xs rounded-lg transition-colors text-slate-700 border border-slate-200"
              >
                50% (L. {(cliente.saldoTotal * 0.50).toFixed(0)})
              </button>
              <button
                type="button"
                onClick={() => handleMontoRapido(1.0)}
                className="py-1.5 px-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                Pago Total (100%)
              </button>
            </div>
          </div>

          {/* Campo de Monto */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Monto a Abonar (Lempiras) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">L.</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                  onClick={() => setMetodoPago(item.id)}
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
          {metodoPago !== 'EFECTIVO' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Banco Destino
                </label>
                <input
                  type="text"
                  placeholder="Ej: Atlántida, Ficohsa"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas Explicativas (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Pagado por primo del cliente, comprobante enviado a WhatsApp..."
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
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl transition-colors border border-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] font-bold text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Abono</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
