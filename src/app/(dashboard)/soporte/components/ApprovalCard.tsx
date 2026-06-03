'use client';

import React, { useState } from 'react';
import { Check, Send, Loader2 } from 'lucide-react';
import { aprobarPresupuesto } from '../actions';
import { useRouter } from 'next/navigation';

type ApprovalCardProps = {
  orderData: any;
  onApprove: () => void;
};

export default function ApprovalCard({ orderData, onApprove }: ApprovalCardProps) {
  const router = useRouter();
  const [margen, setMargen] = useState(30);
  const [approved, setApproved] = useState(
    orderData?.estado === 'REPARACION' || 
    orderData?.estado === 'LISTO_ENTREGA' || 
    orderData?.estado === 'ENTREGADO'
  );
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [nota, setNota] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [repuestos, setRepuestos] = useState<any[]>(
    orderData?.repuestos?.map((r: any) => ({
      ...r,
      precioAprobado: r.precioAprobado || r.precioSugerido
    })) || []
  );

  const costoManoObra = orderData?.detalleManoObra?.reduce((s: number, h: any) => s + (h.horas * h.tarifa), 0) || 0;
  
  const totalRepuestosAprobados = repuestos.reduce((s, r) => s + (r.cantidad * Number(r.precioAprobado)), 0);
  const costoTotalBase = totalRepuestosAprobados + costoManoObra; 

  const precioVenta = (costoTotalBase * (1 + margen / 100));
  const ganancia = precioVenta - costoTotalBase;
  const itv = precioVenta * 0.15;
  const totalFinal = precioVenta + itv;

  const sendWhatsApp = () => {
    const msg = encodeURIComponent(
      `*Bioelectrónica Honduras*\n\n` +
      `📋 Orden: ${orderData?.codigoSeguridad || "SVC-0000"}\n` +
      `🏥 Equipo: ${orderData?.equipoDano || "Equipo"}\n` +
      `🔧 Falla: ${orderData?.descripcionFalla || "Evaluación"}\n\n` +
      `💰 *Presupuesto de Reparación*\n` +
      `Costo de repuestos + mano de obra: L ${costoTotalBase.toFixed(2)}\n` +
      `Precio de venta: L ${precioVenta.toFixed(2)}\n` +
      `ITV (15%): L ${itv.toFixed(2)}\n` +
      `*Total a Pagar: L ${totalFinal.toFixed(2)}*\n\n` +
      `Para aprobar el presupuesto responda con "APRUEBO".\n\nBioelectrónica Honduras · +504 2234-5678`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    setWhatsappSent(true);
  };

  const handleApprove = async () => {
    if (approved) return;
    setIsSaving(true);
    try {
        const repuestosModificados = repuestos.map(r => ({
            id: r.id,
            precioAprobado: Number(r.precioAprobado),
            subtotalAprobado: r.cantidad * Number(r.precioAprobado)
        }));
        
        await aprobarPresupuesto(orderData.id, repuestosModificados, costoManoObra, totalFinal);
        setApproved(true);
        onApprove && onApprove();
        router.refresh();
    } catch (e) {
        console.error(e);
        alert("Error al aprobar presupuesto");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border flex flex-col border border-slate-200">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="m-0 text-sm md:text-[15px] font-bold text-slate-900 tracking-tight truncate">Aprobación de Presupuesto</h4>
          <p className="m-0 text-xs text-slate-500 font-medium truncate">
            {orderData?.usuarioAprobacion?.nombre || "Gerencia"}
          </p>
        </div>
        {approved && (
          <div className="shrink-0 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
            ✓ Aprobado
          </div>
        )}
      </div>

      <div className="mb-4">
        <h5 className="text-xs md:text-sm font-bold text-slate-800 mb-2">Diagnóstico Técnico</h5>
        <div className="bg-slate-50 rounded-xl p-3 md:p-4 text-xs md:text-sm text-slate-700 leading-relaxed">
            {orderData?.diagnosticoTecnico || "Sin diagnóstico técnico registrado."}
        </div>
      </div>

      {(orderData?.fotosEstadoInicial?.length > 0 || orderData?.fotosTecnico?.length > 0) && (
          <div className="mb-5">
            <h5 className="text-xs md:text-sm font-bold text-slate-800 mb-2">Evidencia Fotográfica</h5>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                {orderData?.fotosEstadoInicial?.map((url: string, i: number) => (
                    <div key={`rec-${i}`} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative cursor-pointer" onClick={() => setSelectedImage(url)}>
                        <span className="absolute top-0 left-0 bg-slate-900/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">Recepción</span>
                        <img src={url} alt="Recepción" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                ))}
                {orderData?.fotosTecnico?.map((url: string, i: number) => (
                    <div key={`tec-${i}`} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative cursor-pointer" onClick={() => setSelectedImage(url)}>
                        <span className="absolute top-0 left-0 bg-indigo-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">Técnico</span>
                        <img src={url} alt="Técnico" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                ))}
            </div>
          </div>
      )}

      <div className="bg-slate-50 rounded-xl p-3 md:p-4 mb-4">
        <div className="text-[10px] md:text-[11px] font-bold text-slate-400 tracking-wider mb-2.5">
          DESGLOSE Y AJUSTE DE PRECIOS
        </div>
        
        {repuestos.length > 0 && (
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <table className="w-full text-left text-xs mb-3 min-w-[320px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-1 font-semibold text-slate-500">Repuesto</th>
                    <th className="py-1 font-semibold text-slate-500 text-center">Cant</th>
                    <th className="py-1 font-semibold text-slate-500 text-right">Costo Unit. (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {repuestos.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 text-slate-700">{r.producto?.nombre}</td>
                      <td className="py-1.5 text-slate-700 text-center">{r.cantidad}</td>
                      <td className="py-1.5 text-right">
                        <input 
                          type="number" 
                          disabled={approved}
                          className="w-20 text-right border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-transparent disabled:border-transparent font-bold"
                          value={r.precioAprobado}
                          onChange={e => {
                             const val = parseFloat(e.target.value) || 0;
                             setRepuestos(p => p.map(x => x.id === r.id ? {...x, precioAprobado: val} : x));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}

        {orderData?.detalleManoObra && orderData.detalleManoObra.length > 0 && (
            <div className="mb-3 mt-4 border-t border-slate-200 pt-3">
                <div className="text-[10px] md:text-[11px] font-bold text-slate-400 tracking-wider mb-2">MANO DE OBRA SUGERIDA</div>
                <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                  <table className="w-full text-left text-xs mb-2 min-w-[320px]">
                      <thead>
                          <tr className="border-b border-slate-200">
                              <th className="py-1 font-semibold text-slate-500">Actividad</th>
                              <th className="py-1 font-semibold text-slate-500 text-center">Horas</th>
                              <th className="py-1 font-semibold text-slate-500 text-right">Tarifa (L)</th>
                          </tr>
                      </thead>
                      <tbody>
                          {orderData.detalleManoObra.map((h: any) => (
                              <tr key={h.id} className="border-b border-slate-100 last:border-0">
                                  <td className="py-1 text-slate-700">{h.descripcion}</td>
                                  <td className="py-1 text-slate-700 text-center">{h.horas}</td>
                                  <td className="py-1 text-slate-700 text-right">{(h.horas * h.tarifa).toFixed(2)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center mb-1 mt-3">
            <span className="text-xs text-slate-500 font-medium">Total Mano de Obra Sugerida</span>
            <span className="text-xs text-slate-800 font-bold">L {costoManoObra.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-900 font-bold">Costo Base Total</span>
            <span className="text-xs text-slate-900 font-bold">L {costoTotalBase.toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-bold text-slate-700">Margen de Ganancia</label>
          <span className="text-[13px] font-bold text-indigo-600">{margen}%</span>
        </div>
        <input 
          type="range" min="0" max="100" step="5" 
          disabled={approved}
          value={margen} onChange={e => setMargen(Number(e.target.value))}
          className="w-full accent-indigo-600 disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          ["Precio Venta", `L ${precioVenta.toFixed(2)}`, "bg-indigo-50", "text-indigo-600"],
          ["Ganancia", `L ${ganancia.toFixed(2)}`, "bg-green-50", "text-green-700"],
          ["Total + ITV", `L ${totalFinal.toFixed(2)}`, "bg-orange-50", "text-orange-600"],
        ].map(([label, value, bg, color]) => (
          <div key={label} className={`${bg} rounded-xl p-3.5 text-center flex flex-col justify-between`}>
            <div className={`text-[9px] md:text-[10px] ${color} font-bold mb-1 leading-tight`}>{label}</div>
            <div className={`text-[11px] md:text-xs ${color} font-black truncate`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <textarea 
          value={nota} onChange={e => setNota(e.target.value)} 
          disabled={approved}
          placeholder="Nota interna o condiciones especiales..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100 outline-none transition-colors h-14 resize-none disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-auto">
        <button 
          type="button"
          onClick={handleApprove}
          disabled={approved || isSaving}
          className={`w-full sm:flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${
            approved ? "bg-green-100 text-green-700 border border-green-200" : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          }`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (approved ? "✓ Presupuesto Aprobado" : "Aprobar Presupuesto")}
        </button>
        <button 
          type="button"
          onClick={sendWhatsApp} 
          className={`w-full sm:flex-1 py-3 border-none rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
             whatsappSent ? "bg-green-100 text-green-700" : "bg-[#25D366] hover:bg-[#20bd5a] text-white"
          }`}
        >
          {whatsappSent ? "Enviado ✓" : <><Send className="w-3.5 h-3.5"/> Whatsapp</>}
        </button>
      </div>
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-screen w-full h-full flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-md transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <img 
              src={selectedImage} 
              alt="Evidencia a pantalla completa" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
