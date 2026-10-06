import React from 'react';
import { 
  X, Download, Mail, MessageSquare, Link as LinkIcon, 
  FileText, ArrowRight, Sparkles, LayoutGrid, FileSpreadsheet,
  Printer, Truck
} from 'lucide-react';

interface DocumentActionsModalProps {
  onClose: () => void;
  onDownloadPDF: () => void;
  onToggleCustomizer: () => void;
  onConvert?: (targetType: 'PROFORMA' | 'FACTURA') => void;
  onShowOrdenEntrega?: () => void;
  onSendEmail?: () => void;
  onSendWhatsApp?: () => void;
  isDownloadingPDF?: boolean;
  isConverting?: boolean;
  docType?: string; // 'cotizacion', 'proforma', etc
  estaVencida?: boolean;
  isEmitida?: boolean;
  isSaved?: boolean;
}

export default function DocumentActionsModal({
  onClose,
  onDownloadPDF,
  onToggleCustomizer,
  onConvert,
  onShowOrdenEntrega,
  onSendEmail,
  onSendWhatsApp,
  isDownloadingPDF,
  isConverting,
  docType,
  estaVencida,
  isEmitida = false,
  isSaved = true
}: DocumentActionsModalProps) {
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handlers para acciones que luego cierran el modal
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Centro de Acciones</h3>
            <p className="text-slate-500 text-sm font-medium">¿Qué te gustaría hacer con este documento?</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          
          {/* Section: Principales */}
          <div className="mb-8">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Exportar y Modificar</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Descargar PDF */}
              <button 
                onClick={() => handleAction(onDownloadPDF)}
                disabled={isDownloadingPDF || !isSaved}
                className="group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 border-emerald-100 hover:border-emerald-500 rounded-2xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {!isSaved && <div className="absolute top-2 right-2 bg-slate-100 text-slate-400 text-[9px] font-black uppercase px-2 py-1 rounded-md">Guardar Primero</div>}
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download size={28} className={isDownloadingPDF ? 'animate-bounce' : ''} />
                </div>
                <span className="font-bold text-slate-700 text-sm text-center">Descargar PDF</span>
              </button>

              {/* Personalizar Diseño */}
              <button 
                onClick={() => handleAction(onToggleCustomizer)}
                className="group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 border-blue-100 hover:border-blue-500 rounded-2xl transition-all hover:shadow-lg"
              >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles size={28} />
                </div>
                <span className="font-bold text-slate-700 text-sm text-center">Personalizar Diseño</span>
              </button>

              {/* Orden de Entrega */}
              {onShowOrdenEntrega && (
                <button 
                  onClick={() => handleAction(onShowOrdenEntrega)}
                  disabled={!isSaved}
                  className="group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:shadow-lg rounded-2xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                  {!isSaved && <div className="absolute top-2 right-2 bg-slate-100 text-slate-400 text-[9px] font-black uppercase px-2 py-1 rounded-md">Guardar Primero</div>}
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck size={28} />
                  </div>
                  <span className="font-bold text-slate-700 text-sm text-center leading-tight">Orden de Entrega</span>
                </button>
              )}

              {/* Convertir a Proforma (Si aplica) */}
              {docType === 'cotizacion' && onConvert && (
                <button 
                  onClick={() => handleAction(() => onConvert('PROFORMA'))}
                  disabled={isConverting || estaVencida || !isSaved}
                  className="group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 border-violet-100 hover:border-violet-500 rounded-2xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                  {!isSaved && <div className="absolute top-2 right-2 bg-slate-100 text-slate-400 text-[9px] font-black uppercase px-2 py-1 rounded-md">Guardar Primero</div>}
                  <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight size={28} />
                  </div>
                  <span className="font-bold text-slate-700 text-sm text-center leading-tight">Convertir a<br/>Pro Forma</span>
                </button>
              )}

              {/* Convertir a Factura (Si aplica) */}
              {(docType === 'cotizacion' || docType === 'proforma') && onConvert && (
                <button 
                  onClick={() => handleAction(() => onConvert('FACTURA'))}
                  disabled={isConverting || (docType === 'cotizacion' && estaVencida) || !isSaved}
                  className="group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 border-amber-100 hover:border-amber-500 rounded-2xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                  {!isSaved && <div className="absolute top-2 right-2 bg-slate-100 text-slate-400 text-[9px] font-black uppercase px-2 py-1 rounded-md">Guardar Primero</div>}
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={28} />
                  </div>
                  <span className="font-bold text-slate-700 text-sm text-center leading-tight">Convertir a<br/>Factura</span>
                </button>
              )}

            </div>
          </div>

          {/* Section: Compartir (Pronto) */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Compartir</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Email */}
              <button 
                onClick={() => onSendEmail && handleAction(onSendEmail)}
                disabled={!onSendEmail || !isSaved}
                className={`group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 rounded-2xl transition-all relative ${
                  (onSendEmail && isSaved)
                    ? 'border-blue-100 hover:border-blue-500 hover:shadow-lg cursor-pointer' 
                    : 'border-slate-100 opacity-50 cursor-not-allowed'
                }`}
              >
                {!isSaved && <div className="absolute top-2 right-2 bg-slate-100 text-slate-400 text-[9px] font-black uppercase px-2 py-1 rounded-md">Guardar Primero</div>}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
                  onSendEmail ? 'bg-blue-50 text-blue-600 group-hover:scale-110' : 'bg-slate-50 text-slate-400'
                }`}>
                  <Mail size={28} />
                </div>
                <span className={`font-bold text-sm text-center ${onSendEmail ? 'text-slate-700' : 'text-slate-500'}`}>Por Correo</span>
              </button>

              {/* WhatsApp */}
              <button 
                onClick={() => onSendWhatsApp && handleAction(onSendWhatsApp)}
                disabled={!onSendWhatsApp}
                className={`group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 rounded-2xl transition-all relative ${
                  onSendWhatsApp
                    ? 'border-emerald-200 hover:border-emerald-500 hover:shadow-lg cursor-pointer ring-2 ring-emerald-500/10'
                    : 'border-slate-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">Imagen HD</div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
                  onSendWhatsApp ? 'bg-emerald-50 text-emerald-600 group-hover:scale-110' : 'bg-slate-50 text-slate-400'
                }`}>
                  <MessageSquare size={28} />
                </div>
                <span className={`font-bold text-sm text-center ${onSendWhatsApp ? 'text-slate-700' : 'text-slate-500'}`}>Por WhatsApp</span>
              </button>

              {/* Link */}
              <button disabled className="group flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl transition-all opacity-70 relative">
                <div className="absolute top-2 right-2 bg-slate-200 text-slate-500 text-[9px] font-black uppercase px-2 py-1 rounded-md">Pronto</div>
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                  <LinkIcon size={28} />
                </div>
                <span className="font-bold text-slate-500 text-sm text-center leading-tight">Link Online</span>
              </button>

              {/* Excel XML */}
              <button disabled className="group flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl transition-all opacity-70 relative">
                <div className="absolute top-2 right-2 bg-slate-200 text-slate-500 text-[9px] font-black uppercase px-2 py-1 rounded-md">Pronto</div>
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                  <FileSpreadsheet size={28} />
                </div>
                <span className="font-bold text-slate-500 text-sm text-center leading-tight">Exportar CSV</span>
              </button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
