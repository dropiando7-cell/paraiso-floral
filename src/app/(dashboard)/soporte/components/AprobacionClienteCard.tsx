'use client';

import React, { useState } from 'react';
import { Smartphone, Loader2, ArrowLeft, FileText, CheckCircle2, AlertTriangle, X, Send } from 'lucide-react';
import { aprobarPresupuestoManualmente, enviarNotificacionPresupuestoTwilio } from '../actions';
import { useRouter } from 'next/navigation';
import DocumentPreviewModal from './DocumentPreviewModal';

type AprobacionClienteCardProps = {
  orderData: any;
  budgetFactura: { id: string; correlativo: string; total: number; estado: string } | null | undefined;
  onApprove: () => void;
  onReject: () => void;
  isGerente?: boolean;
};

export default function AprobacionClienteCard({ orderData, budgetFactura, onApprove, onReject, isGerente }: AprobacionClienteCardProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [twilioSent, setTwilioSent] = useState(false);
  const [isPreviewTwilioOpen, setIsPreviewTwilioOpen] = useState(false);
  const [isSendingTwilio, setIsSendingTwilio] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onClose?: () => void;
  } | null>(null);

  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, description, onConfirm });
  };

  const showAlert = (title: string, description: string, onClose?: () => void) => {
    setAlertDialog({ isOpen: true, title, description, onClose });
  };

  const sendWhatsApp = () => {
    if (!budgetFactura) return;
    const domain = window.location.origin;
    const portalUrl = `${domain}/aprobar-presupuesto/${budgetFactura.id}`;
    
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

  const handleApproveManually = () => {
    showConfirm(
      "Aprobar Presupuesto Manualmente",
      "¿Estás seguro de que deseas aprobar este presupuesto manualmente? El cliente debe haber dado su autorización verbal o por otro medio.",
      async () => {
        setIsSaving(true);
        try {
          const res = await aprobarPresupuestoManualmente(orderData.id);
          if (res.success) {
            showAlert(
              "¡Presupuesto Aprobado!",
              "El presupuesto ha sido aprobado manualmente con éxito.",
              () => {
                onApprove && onApprove();
                window.location.reload();
              }
            );
          } else {
            showAlert("Error al aprobar", "Ocurrió un error al aprobar el presupuesto.");
          }
        } catch (e) {
          console.error(e);
          showAlert("Error de conexión", "Error de conexión al aprobar el presupuesto.");
        } finally {
          setIsSaving(false);
        }
      }
    );
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

      {budgetFactura?.estado === 'RECHAZADA' && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-800 text-xs md:text-sm rounded-xl p-4 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-bold text-red-900 mb-1">¡El presupuesto fue rechazado por el cliente!</h5>
            <p className="leading-relaxed text-red-700">
              El cliente ha rechazado esta propuesta. Se recomienda hacer clic en <strong>"Devolver a Presupuesto"</strong> para poder editar la cotización existente (o crear una nueva de tipo <strong>REP</strong> o <strong>MTN</strong>) para ajustar los precios o añadir otras opciones y mejorar la propuesta comercial.
            </p>
          </div>
        </div>
      )}

      <div className="mb-5 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
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
                budgetFactura.estado === 'APROBADA' ? 'bg-green-100 text-green-700' :
                budgetFactura.estado === 'RECHAZADA' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {budgetFactura.estado === 'APROBADA' ? 'APROBADO' :
                 budgetFactura.estado === 'RECHAZADA' ? 'RECHAZADO' : 'PENDIENTE FIRMA'}
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
          <>
            <button 
              type="button"
              onClick={() => setIsPreviewTwilioOpen(true)}
              className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                twilioSent ? "bg-green-150 text-green-800 border border-green-200" : "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-650/10"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {twilioSent ? "Presupuesto enviado por Twilio ✓" : "Avisar y Enviar Presupuesto (Twilio WhatsApp)"}
            </button>

            <button 
              type="button"
              onClick={sendWhatsApp}
              className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                whatsappSent ? "bg-slate-100 text-slate-700 border border-slate-205" : "bg-[#25D366] hover:bg-[#20bd5a] text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {whatsappSent ? "Enlace de firma manual enviado ✓" : "Enviar Enlace por WhatsApp (Manual / Web)"}
            </button>
          </>
        )}

        <div className="flex gap-2">
          <button 
            type="button"
            onClick={onReject}
            disabled={isSaving}
            className="w-full sm:flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 disabled:opacity-50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Devolver a Presupuesto
          </button>

          {budgetFactura && (
            <button 
              type="button" 
              onClick={() => setIsPreviewOpen(true)} 
              className="w-full sm:flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Ver Vista Previa
            </button>
          )}
        </div>

        <button 
          type="button"
          onClick={handleApproveManually}
          disabled={isSaving || !budgetFactura}
          className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors bg-white border-2 border-indigo-600 text-indigo-650 hover:bg-indigo-50 disabled:opacity-50 disabled:border-slate-300 disabled:text-slate-400 cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
          Aprobar Manualmente (El cliente aceptó)
        </button>
      </div>

      {/* Modal Vista Previa Twilio WhatsApp */}
      {isPreviewTwilioOpen && budgetFactura && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" /> Vista Previa del Mensaje (Twilio)
              </h3>
              <button 
                onClick={() => setIsPreviewTwilioOpen(false)} 
                className="text-slate-400 hover:text-slate-650 p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-100 flex-1 overflow-y-auto space-y-4 text-left">
              <p className="text-xs text-slate-500 font-medium m-0">
                Este mensaje se enviará automáticamente al número de WhatsApp registrado: <strong className="text-slate-700">{orderData.cliente?.telefono || 'Sin número'}</strong>
              </p>
              
              {/* WhatsApp Chat Bubble */}
              <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-100 max-w-sm ml-0 mr-auto relative">
                <div className="text-slate-800 text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                  Estimado/a *{orderData.cliente?.nombre || 'Cliente'}*, su equipo *{orderData.equipoDano} {orderData.marcaModelo || ''}* (Orden: *{orderData.codigoSeguridad}*) con falla de *{orderData.descripcionFalla || 'Mantenimiento Correctivo'}* ya cuenta con presupuesto de reparación por un total de *L {Number(budgetFactura.total).toFixed(2)}*. *Bioelectrónica Honduras*
                </div>
                
                {/* Dynamic Button Preview */}
                <div className="mt-3 pt-2.5 border-t border-emerald-200/50 flex justify-center">
                  <div className="bg-white hover:bg-slate-50 text-indigo-600 font-bold py-2 px-4 rounded-xl text-xs shadow-sm flex items-center gap-1 border border-indigo-100 select-none">
                    <FileText className="w-3.5 h-3.5" />
                    Ver y Firmar Presupuesto
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewTwilioOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSendingTwilio || !orderData.cliente?.telefono}
                onClick={async () => {
                  setIsSendingTwilio(true);
                  try {
                    const res = await enviarNotificacionPresupuestoTwilio(orderData.id);
                    if (res.success) {
                      setTwilioSent(true);
                      setIsPreviewTwilioOpen(false);
                      showAlert(
                        "¡Mensaje Enviado!",
                        "Se ha enviado el presupuesto al cliente por Twilio WhatsApp exitosamente."
                      );
                    } else {
                      showAlert("Error al enviar", res.error || "Ocurrió un error al enviar el presupuesto.");
                    }
                  } catch (e) {
                    console.error(e);
                    showAlert("Error de conexión", "Error de conexión al enviar el presupuesto.");
                  } finally {
                    setIsSendingTwilio(false);
                  }
                }}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSendingTwilio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Enviar Mensaje Twilio
              </button>
            </div>
          </div>
        </div>
      )}

      {budgetFactura && (
        <DocumentPreviewModal 
          facturaId={budgetFactura.id} 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
          correlativo={budgetFactura.correlativo}
          editable={isGerente}
        />
      )}

      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 text-amber-605 rounded-xl shrink-0 border border-amber-200/50">
                  <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {confirmDialog.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConf = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  onConf();
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-sm hover:shadow flex items-center justify-center cursor-pointer"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

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
