import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onConfirm: (total: number) => void;
  efectivoEsperado: number;
}

export default function CalculadoraArqueoModal({ onClose, onConfirm, efectivoEsperado }: Props) {
  // Billetes y monedas de Honduras por defecto, pero se puede extender
  const [denominaciones, setDenominaciones] = useState<{ valor: number; cantidad: number }[]>([
    { valor: 500, cantidad: 0 },
    { valor: 200, cantidad: 0 },
    { valor: 100, cantidad: 0 },
    { valor: 50, cantidad: 0 },
    { valor: 20, cantidad: 0 },
    { valor: 10, cantidad: 0 },
    { valor: 5, cantidad: 0 },
    { valor: 2, cantidad: 0 },
    { valor: 1, cantidad: 0 },
  ]);

  const [monedas, setMonedas] = useState<{ valor: number; cantidad: number }[]>([
    { valor: 0.50, cantidad: 0 },
    { valor: 0.20, cantidad: 0 },
    { valor: 0.10, cantidad: 0 },
    { valor: 0.05, cantidad: 0 },
    { valor: 0.01, cantidad: 0 }
  ]);

  const updateDenominacion = (valor: number, cantidadStr: string, isMoneda = false) => {
    let cant = parseInt(cantidadStr) || 0;
    if (cant < 0) cant = 0;
    
    if (isMoneda) {
      setMonedas(prev => prev.map(m => m.valor === valor ? { ...m, cantidad: cant } : m));
    } else {
      setDenominaciones(prev => prev.map(d => d.valor === valor ? { ...d, cantidad: cant } : d));
    }
  };

  const totalCalculado = denominaciones.reduce((sum, d) => sum + (d.valor * d.cantidad), 0) + 
                         monedas.reduce((sum, m) => sum + (m.valor * m.cantidad), 0);
  
  const diferencia = totalCalculado - efectivoEsperado;

  const handleConfirm = () => {
    onConfirm(totalCalculado);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-lg w-full my-auto">
        <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-lg">Calculadora de Billetes</h3>
            <p className="text-xs text-slate-400">Cuadre exacto de efectivo en caja</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Denominación</span>
            <span className="text-xs font-bold text-slate-500 uppercase">Cantidad</span>
            <span className="text-xs font-bold text-slate-500 uppercase">Subtotal</span>
          </div>

          <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {denominaciones.map((item) => (
              <div key={`billete-${item.valor}`} className="flex items-center gap-3">
                <div className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-right shrink-0">
                  L. {item.valor}
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.cantidad || ''}
                    onChange={(e) => updateDenominacion(item.valor, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-bold text-slate-900"
                  />
                </div>
                <div className="w-28 text-right font-black text-slate-800 shrink-0">
                  L. {(item.valor * item.cantidad).toFixed(2)}
                </div>
              </div>
            ))}

            <div className="py-2">
              <div className="border-t border-dashed border-slate-300 mb-2"></div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">Monedas</h4>
            </div>

            {monedas.map((item) => (
              <div key={`moneda-${item.valor}`} className="flex items-center gap-3">
                <div className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-right shrink-0">
                  L. {item.valor.toFixed(2)}
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.cantidad || ''}
                    onChange={(e) => updateDenominacion(item.valor, e.target.value, true)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-bold text-slate-900"
                  />
                </div>
                <div className="w-28 text-right font-black text-slate-800 shrink-0">
                  L. {(item.valor * item.cantidad).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-600">Total Calculado:</span>
            <span className="text-2xl font-black text-slate-900">L. {totalCalculado.toFixed(2)}</span>
          </div>

          <div className={`p-3 rounded-lg border flex gap-2.5 text-sm transition-colors mb-4 ${
              diferencia === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : diferencia < 0
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
              <div className="shrink-0 mt-0.5">
                  {diferencia === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                  {diferencia === 0 ? (
                      <span className="font-bold">Arqueo y comparación está cuadrado.</span>
                  ) : diferencia < 0 ? (
                      <span>Faltante contra sistema: <strong className="font-black text-red-700">L. {Math.abs(diferencia).toFixed(2)}</strong></span>
                  ) : (
                      <span>Sobrante contra sistema: <strong className="font-black text-blue-700">L. {diferencia.toFixed(2)}</strong></span>
                  )}
                  <div className="text-[10px] opacity-70 mt-0.5">Esperado: L. {efectivoEsperado.toFixed(2)}</div>
              </div>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition cursor-pointer flex justify-center items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Utilizar este total como Efectivo Real
          </button>
        </div>
      </div>
    </div>
  );
}
