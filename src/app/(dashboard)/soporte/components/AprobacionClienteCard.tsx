'use client';

import React, { useState } from 'react';
import { Smartphone, Loader2, ArrowLeft, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { aprobarPresupuestoManualmente } from '../actions';
import { useRouter } from 'next/navigation';

type AprobacionClienteCardProps = {
  orderData: any;
  budgetFactura: { id: string; correlativo: string; total: number; estado: string } | null | undefined;
  onApprove: () => void;
  onReject: () => void;
};

export default function AprobacionClienteCard({ orderData, budgetFactura, onApprove, onReject }: AprobacionClienteCardProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  const sendWhatsApp = () => {
    if (!budgetFactura) return;
    const domain = window.location.origin;
    const portalUrl = `${domain}/c/${budgetFactura.id}/presupuesto`;
    
    const msg = encodeURIComponent(
      `*Bioelectrónica Honduras*\n\n` +
      `📋 Orden: ${orderData?.codigoSeguridad || "SVC-0000"}\n` +
      `🏥 Equipo: ${orderData?.equipoDano || "Equipo"}\n` +
      `🔧 Falla: ${orderData?.descripcionFalla || "Evaluación"}\n\n` +
      `💰 *Presupuesto de Reparación*\n` +
      `*Total a Pagar: L ${Number(budgetFactura.total).toFixed(2)}*\n\n` +
      `Para ver el detalle completo y FIRMAR su aprobación, ingrese aquí:\n` +
      `${portalUrl}\n\nBioelectrónica Honduras`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    setWhatsappSent(true);
  };

  const handleApproveManually = async () => {
    if (confirm("¿Estás seguro de que deseas aprobar este presupuesto manualmente? El cliente debe haber dado su autorización verbal o por otro medio.")) {
      setIsSaving(true);
      try {
        const res = await aprobarPresupuestoManualmente(orderData.id);
        if (res.success) {
          alert("Presupuesto aprobado manualmente con éxito.");
          onApprove && onApprove();
          router.refresh();
        } else {
          alert("Error al aprobar el presupuesto.");
        }
      } catch (e) {
        console.error(e);
        alert("Error de conexión al aprobar presupuesto.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border flex flex-col border border-slate-200">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-pink-600 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="m-0 text-sm md:text-[15px] font-bold text-slate-900 tracking-tight truncate">
            Aprobación del Cliente
          </h4>
          <p className="m-0 text-xs text-slate-500 font-medium truncate">
            Esperando confirmación o firma
          </p>
        </div>
      </div>

      <div className="mb-5 bg-slate-550 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
        <div className="text-slate-600 text-xs md:text-sm leading-relaxed">
          El presupuesto de reparación y la lista de repuestos requeridos han sido generados. La orden está pendiente de aprobación por parte del cliente.
        </div>

        {budgetFactura ? (
          <div className="mt-2 pt-3 border-t border-slate-200 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Documento:</span>
              <span className="font-mono font-bold text-slate-800">{budgetFactura.correlativo}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Total Presupuestado:</span>
              <span className="font-bold text-indigo-600">L {Number(budgetFactura.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Estado del Documento:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                budgetFactura.estado === 'APROBADA' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {budgetFactura.estado === 'APROBADA' ? 'APROBADO' : 'PENDIENTE FIRMA'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              No se encontró un documento de presupuesto activo. Por favor regrese al paso anterior para generarlo y poder continuar con el flujo.
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        {budgetFactura && (
          <button 
            type="button"
            onClick={sendWhatsApp}
            className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              whatsappSent ? "bg-green-100 text-green-700" : "bg-[#25D366] hover:bg-[#20bd5a] text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            {whatsappSent ? "Enlace de firma enviado ✓" : "Enviar Enlace por WhatsApp (Manual)"}
          </button>
        )}

        <div className="flex gap-2">
          <button 
            type="button"
            onClick={onReject}
            disabled={isSaving}
            className="w-full sm:flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Devolver a Presupuesto
          </button>

          {budgetFactura && (
            <a 
              href={`/facturas/${budgetFactura.id}`} 
              target="_blank" 
              className="w-full sm:flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 decoration-transparent"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Ver Documento
            </a>
          )}
        </div>

        <button 
          type="button"
          onClick={handleApproveManually}
          disabled={isSaving || !budgetFactura}
          className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-white border-2 border-indigo-600 text-indigo-650 hover:bg-indigo-50 disabled:opacity-50 disabled:border-slate-300 disabled:text-slate-400"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
          Aprobar Manualmente (El cliente aceptó)
        </button>
      </div>
    </div>
  );
}
