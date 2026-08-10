'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Loader2, AlertCircle, Settings, Save, MapPin, Phone, MessageSquare, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getDocumentoById } from '@/app/(dashboard)/facturas/actions';
import { 
  enviarDocumentoPorEmail, 
  getEmailSettings, 
  saveEmailSettings, 
  EmailTemplateSettings 
} from '@/app/(dashboard)/facturas/enviar-actions';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentoId: string;
}

export default function SendEmailModal({ isOpen, onClose, documentoId }: SendEmailModalProps) {
  const [activeTab, setActiveTab] = useState<'send' | 'template'>('send');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Document Info
  const [docData, setDocData] = useState<any>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [correlativo, setCorrelativo] = useState('');
  const [tipoDocumentoLabel, setTipoDocumentoLabel] = useState('');
  
  // Send Form fields
  const [emailDestino, setEmailDestino] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Template Settings fields
  const [bccList, setBccList] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [emailReplyTo, setEmailReplyTo] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');
  const [defaultBody, setDefaultBody] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch template settings from DB
      const settingsRes = await getEmailSettings();
      let activeSettings: EmailTemplateSettings;
      
      if (settingsRes.success && settingsRes.settings) {
        activeSettings = settingsRes.settings;
        setBccList(activeSettings.bccList);
        setAddress(activeSettings.address);
        setPhone(activeSettings.phone);
        setEmailReplyTo(activeSettings.email);
        setDefaultSubject(activeSettings.defaultSubject);
        setDefaultBody(activeSettings.defaultBody);
      } else {
        toast.error('No se pudieron cargar los parámetros de plantilla.');
        return;
      }

      // 2. Fetch document details
      if (documentoId) {
        const doc = await getDocumentoById(documentoId);
        if (doc) {
          setDocData(doc);
          const label = doc.tipoDocumento === 'FACTURA' ? 'Factura' : 
                        doc.tipoDocumento === 'NOTA_CREDITO' ? 'Nota de Crédito' : 
                        doc.tipoDocumento === 'PROFORMA' ? 'Factura Pro Forma' : 'Cotización';
          
          const docCorr = doc.correlativo || doc.id;
          
          setClienteNombre(doc.cliente?.nombre || 'Cliente');
          setCorrelativo(docCorr);
          setTipoDocumentoLabel(label);
          
          // Pre-fill destination email
          setEmailDestino(doc.cliente?.email || '');
          
          // Render templates
          const fechaEmision = doc.fechaEmision
            ? new Date(doc.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
            
          const totalFmt = new Intl.NumberFormat('es-HN', {
            style: 'currency',
            currency: 'HNL',
          }).format(Number(doc.total)).replace('HNL', 'L').trim();

          const parsedSubject = activeSettings.defaultSubject
            .replace(/{docType}/g, label)
            .replace(/{correlativo}/g, docCorr)
            .replace(/{total}/g, totalFmt)
            .replace(/{fecha}/g, fechaEmision);

          const parsedBody = activeSettings.defaultBody
            .replace(/{docType}/g, label.toLowerCase())
            .replace(/{correlativo}/g, docCorr)
            .replace(/{total}/g, totalFmt)
            .replace(/{fecha}/g, fechaEmision);

          setAsunto(parsedSubject);
          setMensaje(parsedBody);
        } else {
          toast.error('No se pudieron obtener los detalles del documento.');
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Error loading data in modal:', err);
      toast.error('Error al cargar la información.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && documentoId) {
      loadAllData();
      setActiveTab('send');
    }
  }, [isOpen, documentoId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await saveEmailSettings({
        bccList,
        address,
        phone,
        email: emailReplyTo,
        defaultSubject,
        defaultBody
      });
      if (res.success) {
        toast.success('Plantilla de correo guardada correctamente.');
        // Reload templates and re-prefill fields
        await loadAllData();
        setActiveTab('send');
      } else {
        toast.error('Error al guardar la plantilla.');
      }
    } catch (err: any) {
      toast.error('Error del servidor al guardar la plantilla.');
    } finally {
      setSavingSettings(false);
    }
  };

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
        <div className="flex flex-col border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Portal de Envío</h3>
                <p className="text-xs text-slate-500 font-semibold">{tipoDocumentoLabel} {correlativo}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={sending || savingSettings}
              className="w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all shadow-sm disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          {!loading && (
            <div className="flex px-5 border-b border-slate-150 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('send')}
                className={`py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'send' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Enviar Correo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('template')}
                className={`py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'template' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Configurar Plantilla
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">Cargando detalles de plantilla...</span>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {activeTab === 'send' ? (
              <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  
                  {/* Info client note */}
                  <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-2xl text-xs font-semibold text-blue-800 flex items-start gap-2.5">
                    <InfoIcon size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      El correo se enviará con el PDF vectorial adjunto. 
                      Se enviará una copia (BCC) a: <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded text-[10px] break-all">{bccList}</span>
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
            ) : (
              <form onSubmit={handleSaveSettings} className="flex flex-col flex-1 overflow-hidden">
                {/* Configuration Tab Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  
                  {/* Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" /> Dirección de la Empresa
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dirección física"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full h-[40px] px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" /> Teléfonos de Contacto
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Teléfonos"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full h-[40px] px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* Reply-To Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" /> Destinatario para Respuestas (Reply-To)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="administracion@bioelectronicahn.com"
                      value={emailReplyTo}
                      onChange={e => setEmailReplyTo(e.target.value)}
                      className="w-full h-[40px] px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* BCC list */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" /> Copia Oculta (BCC - separar por comas)
                    </label>
                    <input
                      type="text"
                      placeholder="correo1@bio.com, correo2@bio.com"
                      value={bccList}
                      onChange={e => setBccList(e.target.value)}
                      className="w-full h-[40px] px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium font-mono text-xs"
                    />
                  </div>

                  {/* Default Subject */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag size={13} className="text-slate-400" /> Asunto por Defecto (Plantilla)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Asunto predefinido"
                      value={defaultSubject}
                      onChange={e => setDefaultSubject(e.target.value)}
                      className="w-full h-[40px] px-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  {/* Default Body */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-slate-400" /> Cuerpo del Mensaje (Plantilla)
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Mensaje predefinido"
                      value={defaultBody}
                      onChange={e => setDefaultBody(e.target.value)}
                      className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none h-[120px]"
                    />
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 font-semibold space-y-0.5">
                      <span className="block text-slate-600 font-bold">Variables disponibles:</span>
                      <span className="block"><code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700">{'{docType}'}</code> - Cotización, Factura, etc.</span>
                      <span className="block"><code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700">{'{correlativo}'}</code> - COT-SO00001, etc.</span>
                      <span className="block"><code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700">{'{total}'}</code> - L. 45,000.00, etc.</span>
                      <span className="block"><code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700">{'{fecha}'}</code> - Fecha de emisión.</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('send')}
                    disabled={savingSettings}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm"
                  >
                    Volver
                  </button>
                  <button 
                    type="submit"
                    disabled={savingSettings}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={15} /> Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
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
