'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Loader2, Flower2 } from 'lucide-react';

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
    }>;
  } | null;
}

export default function ModalNotaCredito({ isOpen, onClose, onSuccess, cliente }: ModalNotaCreditoProps) {
  const [monto, setMonto] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('FLOR_DANADA');
  const [facturaId, setFacturaId] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !cliente) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      setError('Por favor ingresa un monto válido a descontar');
      return;
    }

    if (!descripcion.trim()) {
      setError('Escribe el detalle del motivo (ej. 2 paquetes de rosa roja llegaron podridos)');
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
          descripcion: descripcion.trim(),
          fotos: fotoUrl.trim() ? [fotoUrl.trim()] : []
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
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              <Flower2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Nota de Crédito / Ajuste por Flor</h3>
              <p className="text-amber-100 text-xs truncate max-w-[240px]">Cliente: {cliente.nombre}</p>
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

          {/* Monto a Descontar */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Monto a Descontar (Lempiras) *
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
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Descripción obligatoria */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Detalle del Reclamo / Justificación *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Ej: Se descontaron L. 450 correspondientes a 3 docenas de gerberas amarillas que llegaron maltratadas..."
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
