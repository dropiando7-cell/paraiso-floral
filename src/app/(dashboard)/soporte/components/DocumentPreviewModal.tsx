'use client';

import React from 'react';
import { X, Printer, Download } from 'lucide-react';

type DocumentPreviewModalProps = {
  facturaId: string;
  isOpen: boolean;
  onClose: () => void;
  correlativo?: string;
  editable?: boolean;
};

export default function DocumentPreviewModal({ facturaId, isOpen, onClose, correlativo, editable = false }: DocumentPreviewModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const handleClose = () => {
    onClose();
    if (editable) {
      window.location.reload();
    }
  };

  const iframeSrc = editable ? `/print/${facturaId}?edit=true` : `/print/${facturaId}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Vista Previa de Impresión
            </h3>
            {correlativo && (
              <p className="text-[11px] text-slate-500 font-mono font-bold mt-0.5">
                {correlativo}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all active:scale-[0.97] shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button 
              type="button" 
              onClick={handleClose} 
              className="text-slate-400 hover:text-slate-600 p-1.5 transition-colors hover:bg-slate-100 rounded-lg"
              title="Cerrar Vista Previa"
            >
              <X className="w-5.5 h-5.5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content - Iframe */}
        <div className="flex-1 bg-slate-100 relative p-1 sm:p-4">
          <iframe
            id="preview-iframe"
            src={iframeSrc}
            className="w-full h-full border-0 rounded-none sm:rounded-xl shadow-inner bg-white"
            title="Vista Previa de Presupuesto"
          />
        </div>
      </div>
    </div>
  );
}
