'use client';

import React, { useState } from 'react';
import { Check, Send, Loader2, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { aprobarPresupuesto, generarPresupuestoReparacion, enviarPresupuestoAlCliente } from '../actions';
import { useRouter } from 'next/navigation';
import SafeImage from '@/components/SafeImage';
import DocumentPreviewModal from './DocumentPreviewModal';

type ApprovalCardProps = {
  orderData: any;
  onApprove: () => void;
  onReject?: () => void;
  isGerente?: boolean;
  budgetFactura?: { id: string; correlativo: string; total: number; estado: string } | null;
};

export default function ApprovalCard({ orderData, onApprove, onReject, isGerente, budgetFactura }: ApprovalCardProps) {
  const router = useRouter();
  const [approved, setApproved] = useState(
    orderData?.estado === 'REPARACION' || 
    orderData?.estado === 'LISTO_ENTREGA' || 
    orderData?.estado === 'ENTREGADO'
  );
  const [nota, setNota] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [repuestos, setRepuestos] = useState<any[]>(
    orderData?.repuestos?.map((r: any) => ({
      ...r,
      precioAprobado: r.precioAprobado || r.precioSugerido
    })) || []
  );

  const [manoObra, setManoObra] = useState<any[]>(
    orderData?.detalleManoObra || []
  );

  const costoManoObra = manoObra.reduce((s: number, h: any) => s + (h.horas * h.tarifa), 0) || 0;
  
  const totalRepuestosAprobados = repuestos.reduce((s, r) => s + (r.cantidad * Number(r.precioAprobado)), 0);
  const costoTotalBase = totalRepuestosAprobados + costoManoObra; 

  const subtotal = costoTotalBase;
  const itv = subtotal * 0.15;
  const totalFinal = subtotal + itv;

  const [facturaGeneradaId, setFacturaGeneradaId] = useState<string | null>(budgetFactura?.id || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(
    budgetFactura ? `${typeof window !== 'undefined' ? window.location.origin : ''}/aprobar-presupuesto/${budgetFactura.id}` : null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onClose?: () => void;
  } | null>(null);

  const showAlert = (title: string, description: string, onClose?: () => void) => {
    setAlertDialog({ isOpen: true, title, description, onClose });
  };

  React.useEffect(() => {
    if (budgetFactura) {
      setFacturaGeneradaId(budgetFactura.id);
      setPortalUrl(`${window.location.origin}/aprobar-presupuesto/${budgetFactura.id}`);
    }
  }, [budgetFactura]);

  const getFacturacionItems = () => {
    const items: any[] = [];
    repuestos.forEach(r => {
      items.push({
        productoId: r.productoId,
        qty: r.cantidad,
        unitPrice: Number(r.precioAprobado),
        shortDesc: r.producto?.nombre,
        longDesc: 'Repuesto sugerido por técnico',
        tax: 'isv15'
      });
    });
    manoObra.forEach(h => {
      items.push({
        qty: h.horas,
        unitPrice: Number(h.tarifa),
        shortDesc: h.descripcion,
        longDesc: 'Mano de obra (horas)',
        tax: 'isv15' // or exento depending on policy, assuming 15
      });
    });
    return items;
  };



  const handleGenerarPresupuesto = async () => {
    setIsGenerating(true);
    try {
        const items = getFacturacionItems();
        const repuestosModificados = repuestos.map(r => ({
            id: r.id,
            precioAprobado: Number(r.precioAprobado),
            subtotalAprobado: r.cantidad * Number(r.precioAprobado)
        }));
        
        const res = await generarPresupuestoReparacion(
            orderData.id, 
            items, 
            repuestosModificados, 
            totalFinal, 
            manoObra
        );
        if (res.success) {
            setFacturaGeneradaId(res.facturaId || null);
            setPortalUrl(res.portalUrl || null);
            showAlert(
                "Presupuesto Generado",
                `Presupuesto ${res.correlativo} generado exitosamente. Se abrirá la vista previa para editar.`,
                () => { window.location.reload(); }
            );
        } else {
            showAlert("Error al generar presupuesto", res.error || "Ocurrió un error.");
        }
    } catch (e) {
        showAlert("Error de conexión", "Error de conexión al generar presupuesto.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleEnviarAprobacion = async () => {
    setIsSending(true);
    try {
      const res = await enviarPresupuestoAlCliente(orderData.id);
      if (res.success) {
        showAlert(
            "Enviado al Cliente",
            "El presupuesto ha sido enviado al cliente para su aprobación.",
            () => { window.location.reload(); }
        );
      } else {
        showAlert("Error al enviar presupuesto", res.error || "Ocurrió un error.");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error de conexión", "Error de conexión al enviar presupuesto.");
    } finally {
      setIsSending(false);
    }
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
        
        await aprobarPresupuesto(orderData.id, repuestosModificados, costoManoObra, totalFinal, manoObra);
        setApproved(true);
        onApprove && onApprove();
        router.refresh();
    } catch (e) {
        console.error(e);
        showAlert("Error al aprobar presupuesto", "Ocurrió un error al aprobar el presupuesto.");
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
                        <SafeImage src={url} alt="Recepción" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                ))}
                {orderData?.fotosTecnico?.map((url: string, i: number) => (
                    <div key={`tec-${i}`} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative cursor-pointer" onClick={() => setSelectedImage(url)}>
                        <span className="absolute top-0 left-0 bg-indigo-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">Técnico</span>
                        <SafeImage src={url} alt="Técnico" className="w-full h-full object-cover hover:scale-105 transition-transform" />
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
                          {manoObra.map((h: any) => (
                              <tr key={h.id} className="border-b border-slate-100 last:border-0">
                                  <td className="py-1 text-slate-700">{h.descripcion}</td>
                                  <td className="py-1 text-center">
                                    <input 
                                      type="number" 
                                      disabled={approved}
                                      className="w-16 text-center border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-transparent disabled:border-transparent font-medium"
                                      value={h.horas}
                                      onChange={e => {
                                         const val = parseFloat(e.target.value) || 0;
                                         setManoObra(p => p.map(x => x.id === h.id ? {...x, horas: val} : x));
                                      }}
                                    />
                                  </td>
                                  <td className="py-1 text-right">
                                    <input 
                                      type="number" 
                                      disabled={approved}
                                      className="w-20 text-right border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-transparent disabled:border-transparent font-bold"
                                      value={h.tarifa}
                                      onChange={e => {
                                         const val = parseFloat(e.target.value) || 0;
                                         setManoObra(p => p.map(x => x.id === h.id ? {...x, tarifa: val} : x));
                                      }}
                                    />
                                  </td>
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

      <div className="grid grid-cols-2 gap-2 mb-4 mt-2">
        {[
          ["Subtotal (Costo Base)", `L ${subtotal.toFixed(2)}`, "bg-indigo-50", "text-indigo-600"],
          ["Total + ITV", `L ${totalFinal.toFixed(2)}`, "bg-orange-50", "text-orange-600"],
        ].map(([label, value, bg, color]) => (
          <div key={label} className={`${bg} rounded-xl p-3.5 text-center flex flex-col justify-between`}>
            <div className={`text-[9px] md:text-[10px] ${color} font-bold mb-1 leading-tight uppercase`}>{label}</div>
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

      <div className="flex flex-col gap-2 mt-auto">
        {!facturaGeneradaId && !approved && (
            <button 
              type="button"
              onClick={handleGenerarPresupuesto}
              disabled={isGenerating || isSaving}
              className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 shadow-md shadow-indigo-500/20"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />} 
              Diseñar Presupuesto / Agregar Líneas
            </button>
        )}

        {facturaGeneradaId && !approved && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800">Presupuesto Generado</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="text-[10px] bg-white border border-emerald-200 px-2 py-1 rounded shadow-sm text-emerald-700 font-bold hover:bg-emerald-50"
                >
                  Ver Vista Previa / Editar
                </button>
            </div>
        )}

        {facturaGeneradaId && !approved && (
            <button 
              type="button"
              onClick={handleEnviarAprobacion}
              disabled={isSending || isSaving || isGenerating}
              className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 shadow-md shadow-indigo-500/20 mb-2"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />} 
              Enviar a Aprobación del Cliente
            </button>
        )}

        {onReject && !approved && (
          <button 
            type="button"
            onClick={onReject}
            disabled={isSaving || isGenerating}
            className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 disabled:opacity-50 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Devolver
          </button>
        )}

        <button 
          type="button"
          onClick={handleApprove}
          disabled={approved || isSaving || isGenerating}
          className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${
            approved ? "bg-green-100 text-green-700 border border-green-200" : "bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:border-slate-300 disabled:text-slate-400"
          }`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (approved ? "✓ Presupuesto Aprobado" : "Aprobar Manualmente (El cliente aceptó)")}
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
            <SafeImage 
              src={selectedImage} 
              alt="Evidencia a pantalla completa" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
            />
          </div>
        </div>
      )}
      <DocumentPreviewModal 
        facturaId={facturaGeneradaId || ""} 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        correlativo={orderData?.codigoSeguridad ? `Presupuesto para Orden #${orderData.codigoSeguridad}` : undefined}
        editable={isGerente}
      />

      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 border border-indigo-200/50">
                  <CheckCircle2 className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {alertDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {alertDialog.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAlertDialog(null);
                  alertDialog.onClose && alertDialog.onClose();
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-sm hover:shadow flex items-center justify-center cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
