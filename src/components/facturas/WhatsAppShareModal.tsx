import React, { useState } from 'react';
import { 
  X, MessageCircle, Copy, CheckCircle2, ExternalLink, Loader2, 
  Smartphone, Image as ImageIcon, Sparkles 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { copyInvoiceImageToClipboard } from '@/utils/invoiceImageUtils';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  defaultPhone?: string;
  clientName?: string;
  correlativo?: string;
  docType?: string;
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  containerRef,
  defaultPhone = '88542199',
  clientName,
  correlativo,
  docType = 'Factura'
}: WhatsAppShareModalProps) {
  // Limpiar el teléfono inicial si viene con formato
  const cleanInitialPhone = defaultPhone ? defaultPhone.replace(/[^0-9]/g, '') : '88542199';
  const initialDisplayPhone = cleanInitialPhone.startsWith('504') 
    ? cleanInitialPhone.slice(3) 
    : cleanInitialPhone;

  const [phone, setPhone] = useState(initialDisplayPhone || '88542199');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopyOnly = async () => {
    if (!containerRef.current) {
      toast.error('No se pudo encontrar la factura en pantalla.');
      return;
    }

    setIsProcessing(true);
    setCopiedSuccess(false);

    try {
      await copyInvoiceImageToClipboard(containerRef.current);
      setCopiedSuccess(true);
      toast.success('¡Imagen copiada al portapapeles! Presiona Ctrl + V en WhatsApp.', {
        duration: 5000,
        icon: '📸',
      });
    } catch (err: any) {
      console.error('Error copying invoice image:', err);
      toast.error(err.message || 'Error al copiar la imagen al portapapeles.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAndOpenWhatsApp = async () => {
    if (!containerRef.current) {
      toast.error('No se pudo encontrar la factura en pantalla.');
      return;
    }

    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 8) {
      clean = '504' + clean;
    }

    if (!clean || clean.length < 8) {
      toast.error('Por favor ingresa un número de teléfono válido.');
      return;
    }

    setIsProcessing(true);
    setCopiedSuccess(false);

    try {
      await copyInvoiceImageToClipboard(containerRef.current);
      setCopiedSuccess(true);
      toast.success('¡Imagen copiada! Abriendo WhatsApp Web para que presiones Ctrl + V...', {
        duration: 5000,
        icon: '💬',
      });

      // Abrir WhatsApp Web con el chat del número indicado
      const waUrl = `https://web.whatsapp.com/send?phone=${clean}`;
      window.open(waUrl, '_blank');
    } catch (err: any) {
      console.error('Error copying invoice image:', err);
      toast.error(err.message || 'Error al copiar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3100] flex items-center justify-center animate-in fade-in p-4 print:hidden">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/20">
              <MessageCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Compartir por WhatsApp
              </h3>
              <p className="text-xs font-semibold text-emerald-800">
                {correlativo ? `${docType} No. ${correlativo}` : 'Factura en pantalla'}
                {clientName ? ` • ${clientName}` : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all shadow-xs"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Explicación amigable */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
              <ImageIcon size={18} />
            </div>
            <div className="leading-relaxed">
              <span className="font-bold text-slate-800 block text-sm mb-0.5">Visualización instantánea para el cliente</span>
              La factura se convierte en una <strong>imagen de alta resolución</strong> en la memoria de la computadora (sin descargar archivos). El cliente podrá verla inmediatamente en WhatsApp con solo tocarla.
            </div>
          </div>

          {/* Estado de copiado exitoso */}
          {copiedSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-extrabold text-sm text-emerald-800">¡Imagen copiada al portapapeles!</p>
                <p className="text-emerald-700 mt-0.5">
                  Ahora solo ve al chat de WhatsApp y presiona <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-800">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-800">V</kbd> para enviarla.
                </p>
              </div>
            </div>
          )}

          {/* OPCIÓN 1: Solo copiar imagen (Principal y más rápida) */}
          <div className="space-y-2">
            <button
              onClick={handleCopyOnly}
              disabled={isProcessing}
              className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Procesando imagen de la factura...</span>
                </>
              ) : (
                <>
                  <Copy size={20} />
                  <span>Copiar Imagen al Portapapeles</span>
                  <span className="bg-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1">
                    Recomendado
                  </span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              Cero descargas en tu PC. Luego solo seleccionas el chat en WhatsApp Web y pegas con Ctrl + V.
            </p>
          </div>

          {/* Divisor */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">O abrir chat con número</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* OPCIÓN 2: Probar con teléfono específico */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Número de WhatsApp (Honduras +504)
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-2xs">
                  +504
                </span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="8854-2199"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <button
              onClick={handleCopyAndOpenWhatsApp}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-white border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <ExternalLink size={16} />
              <span>Copiar Imagen y Abrir WhatsApp Web</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
