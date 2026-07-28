'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDocumentoById } from '@/app/(dashboard)/facturas/actions';
import { enviarDocumentoPorEmail } from '@/app/(dashboard)/facturas/enviar-actions';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentoId: string;
}

export default function SendEmailModal({ isOpen, onClose, documentoId }: SendEmailModalProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [clienteNombre, setClienteNombre] = useState('');
  const [correlativo, setCorrelativo] = useState('');
  const [tipoDocumentoLabel, setTipoDocumentoLabel] = useState('');
  
  // Form fields
  const [emailDestino, setEmailDestino] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!isOpen || !documentoId) return;

    const loadDocumentData = async () => {
      setLoading(true);
      try {
        const doc = await getDocumentoById(documentoId);
        if (doc) {
          const isv15 = doc.isv15 || 0;
          const isv18 = doc.isv18 || 0;
          
          const label = doc.tipoDocumento === 'FACTURA' ? 'Factura' : 
                        doc.tipoDocumento === 'NOTA_CREDITO' ? 'Nota de Crédito' : 
                        doc.tipoDocumento === 'PROFORMA' ? 'Factura Pro Forma' : 'Cotización';
          
          const docCorr = doc.correlativo || doc.id;
          
          setClienteNombre(doc.cliente?.nombre || 'Cliente');
          setCorrelativo(docCorr);
          setTipoDocumentoLabel(label);
          
          // Pre-fill fields
          setEmailDestino(doc.cliente?.email || '');
          setAsunto(`${label} ${docCorr} - Bioelectrónica Honduras`);
          
          const fechaEmision = doc.fechaEmision
            ? new Date(doc.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
            
          const totalFmt = new Intl.NumberFormat('es-HN', {
            style: 'currency',
            currency: 'HNL',
          }).format(Number(doc.total)).replace('HNL', 'L').trim();

          setMensaje(
            `Le hacemos llegar su ${label.toLowerCase()} número ${docCorr} por un monto total de ${totalFmt}, emitida el ${fechaEmision}.\n\nEn el archivo adjunto encontrará el documento PDF correspondiente.`
          );
        } else {
          toast.error('No se pudieron obtener los detalles del documento.');
          onClose();
        }
      } catch (err: any) {
        console.error('Error loading doc details in modal:', err);
        toast.error('Error al cargar la información del documento.');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadDocumentData();
  }, [isOpen, documentoId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailDestino.trim()) {
      toast.error('Por favor ingresa un correo electrónico de destino.');
      return;
    }

    setSending(true);
    const toastId = toast.loading('Enviando documento por correo...');
    try {
      const res = await enviarDocumentoPorEmail(documentoId, emailDestino, asunto, mensaje);
      if (res.success) {
        toast.success(`El documento ha sido enviado con éxito a ${emailDestino}`, { id: toastId });
        onClose();
      } else {
        toast.error(res.error || 'Error al enviar el correo.', { id: toastId });
      }
    } catch (err: any) {
      console.error('Error in send handler:', err);
      toast.error(err.message || 'Error del servidor al intentar enviar el correo.', { id: toastId });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in p-4 print:hidden">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Enviar por Correo</h3>
              <p className="text-xs text-slate-500 font-semibold">{tipoDocumentoLabel} {correlativo}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={sending}
            className="w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all shadow-sm disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">Cargando detalles del documento...</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Info client note */}
              <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-2xl text-xs font-semibold text-blue-800 flex items-start gap-2.5">
                <InfoIcon size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  Este correo se enviará a la dirección especificada con el PDF vectorial adjunto. 
                  Se enviará una copia (BCC) a administración y gerencia de Bioelectrónica.
                </div>
              </div>

              {/* Destination email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Destinatario (Cliente)</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@cliente.com"
                  value={emailDestino}
                  onChange={e => setEmailDestino(e.target.value)}
                  className="w-full h-[40px] px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-350"
                />
                {!emailDestino && (
                  <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                    <AlertCircle size={10} /> El cliente asociado no tiene un correo predefinido.
                  </span>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Asunto</label>
                <input
                  type="text"
                  required
                  placeholder="Asunto del correo"
                  value={asunto}
                  onChange={e => setAsunto(e.target.value)}
                  className="w-full h-[40px] px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Mensaje Personalizado</label>
                <textarea
                  rows={4}
                  placeholder="Redacta un mensaje para el cliente..."
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal resize-none h-[120px]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                disabled={sending}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={sending}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Enviar Correo
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function InfoIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  );
}
