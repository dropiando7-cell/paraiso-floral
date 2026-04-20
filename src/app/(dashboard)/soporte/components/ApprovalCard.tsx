'use client';

import React, { useState } from 'react';
import { Check, Send } from 'lucide-react';

type ApprovalCardProps = {
  orderData: any;
  onApprove: () => void;
};

export default function ApprovalCard({ orderData, onApprove }: ApprovalCardProps) {
  const [margen, setMargen] = useState(30);
  const [approved, setApproved] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [nota, setNota] = useState("");

  const costo = orderData?.totalCosto || 2085.00;
  const precioVenta = (costo * (1 + margen / 100));
  const ganancia = precioVenta - costo;
  const itv = precioVenta * 0.15;
  const totalFinal = precioVenta + itv;

  const sendWhatsApp = () => {
    const msg = encodeURIComponent(
      `*Bioelectrónica Honduras*\n\n` +
      `📋 Orden: ${orderData?.codigoSeguridad || "SVC-0000"}\n` +
      `🏥 Equipo: ${orderData?.equipoDano || "Equipo"}\n` +
      `🔧 Falla: ${orderData?.descripcionFalla || "Evaluación"}\n\n` +
      `💰 *Presupuesto de Reparación*\n` +
      `Costo de repuestos + mano de obra: L ${costo.toFixed(2)}\n` +
      `Precio de venta (con ${margen}% margen): L ${precioVenta.toFixed(2)}\n` +
      `ITV (15%): L ${itv.toFixed(2)}\n` +
      `*Total: L ${totalFinal.toFixed(2)}*\n\n` +
      `Para aprobar el presupuesto responda con "APRUEBO".\n\nBioelectrónica Honduras · +504 2234-5678`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    setWhatsappSent(true);
  };

  const handleApprove = () => {
    setApproved(true);
    onApprove && onApprove();
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </div>
        <div>
          <h4 className="m-0 text-[15px] font-bold text-slate-900 tracking-tight">Aprobación de Presupuesto</h4>
          <p className="m-0 text-xs text-slate-500 font-medium">
            {orderData?.usuarioAprobacion?.nombre || "Gerencia"}
          </p>
        </div>
        {approved && (
          <div className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
            ✓ Aprobado
          </div>
        )}
      </div>

      {/* Resumen de costos */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4">
        <div className="text-[11px] font-bold text-slate-400 tracking-wider mb-2.5">
          DESGLOSE DE COSTOS
        </div>
        {[
          ["Costo Base (Repuestos + Mano de Obra)", `L ${costo.toFixed(2)}`, true],
        ].map(([k, v, bold]) => (
          <div key={k as string} className={`flex justify-between mb-2 ${bold ? 'pt-2 border-t border-slate-200' : ''}`}>
            <span className={`text-xs ${bold ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>{k}</span>
            <span className={`text-xs ${bold ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>{v}</span>
          </div>
        ))}
      </div>

      {/* Margen slider */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-bold text-slate-700">Margen de Ganancia</label>
          <span className="text-[13px] font-bold text-indigo-600">{margen}%</span>
        </div>
        <input 
          type="range" min="10" max="80" step="5" 
          value={margen} onChange={e => setMargen(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>10%</span><span>80%</span>
        </div>
      </div>

      {/* Precio final bento */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          ["Precio Venta", `L ${precioVenta.toFixed(2)}`, "bg-indigo-50", "text-indigo-600"],
          ["Ganancia", `L ${ganancia.toFixed(2)}`, "bg-green-50", "text-green-700"],
          ["Total + ITV", `L ${totalFinal.toFixed(2)}`, "bg-orange-50", "text-orange-600"],
        ].map(([label, value, bg, color]) => (
          <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
            <div className={`text-[10px] ${color} font-bold mb-1`}>{label}</div>
            <div className={`text-xs ${color} font-black`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Nota */}
      <div className="mb-4">
        <textarea 
          value={nota} onChange={e => setNota(e.target.value)} 
          placeholder="Nota interna o condiciones especiales..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none transition-colors h-14 resize-none"
        />
      </div>

      {/* Botones */}
      <div className="flex gap-2 mt-auto">
        <button 
          onClick={handleApprove}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${
            approved ? "bg-green-100 text-green-700 border border-green-200" : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {approved ? "✓ Presupuesto Aprobado" : "Aprobar Presupuesto"}
        </button>
        <button 
          onClick={sendWhatsApp} 
          className={`flex-1 py-2.5 border-none rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
             whatsappSent ? "bg-green-100 text-green-700" : "bg-[#25D366] hover:bg-[#20bd5a] text-white"
          }`}
        >
          {whatsappSent ? "Enviado ✓" : <><Send className="w-3.5 h-3.5"/> Whatsapp</>}
        </button>
      </div>
    </div>
  );
}
