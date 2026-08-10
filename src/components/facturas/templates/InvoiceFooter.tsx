import React from 'react';
import { InvoiceSettings } from '@/types/invoice';

interface InvoiceFooterProps {
 settings: InvoiceSettings;
 organization?: any;
 /** Extra CSS classes for the wrapper — useful for print:fixed positioning in some templates */
 className?: string;
}

/**
 * Shared footer used by all invoice templates.
 * Data comes from `settings.footer*` fields (editable in the customizer).
 * Falls back to `organization.*` values if footer fields are empty.
 */
export default function InvoiceFooter({ settings, organization, className = '' }: InvoiceFooterProps) {
 const tel = settings.footerTelefono || (organization?.telefono ? organization.telefono : '');
 const correo = settings.footerCorreo || (organization?.correoContacto ? organization.correoContacto : '');
 const web = settings.footerWeb || '';
 const nota = settings.footerNota || '';
 const showPage = settings.footerMostrarPagina !== false; // default true

 // At least one field must be populated to render
 const hasContent = tel || correo || web || nota;
 if (!hasContent && !showPage) return null;

 const fullTextLen = (tel?.length || 0) + (correo?.length || 0) + (web?.length || 0);
 const defaultFontSize = fullTextLen > 70 ? 8.5 : 9.5;
 const fontSizeVal = settings.footerFontSize || defaultFontSize;

 return (
 <div className={`border-t border-slate-300 pt-2 mt-6 print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:z-[100] print:pb-2 ${className}`}>
  {/* Main info row */}
  {hasContent && (
  <div className="w-full flex justify-center px-4">
    <div 
      className="flex flex-nowrap whitespace-nowrap items-center justify-center gap-x-2.5 text-slate-600 max-w-full tracking-tight"
      style={{ fontSize: `${fontSizeVal}px` }}
    >
      {tel && <span className="shrink-0">Tel.: {tel}</span>}
      {correo && <span className="shrink-0">Correo: {correo}</span>}
      {web && <span className="shrink-0">Web: {web}</span>}
    </div>
  </div>
  )}

 {/* Nota adicional */}
 {nota && (
 <p className="text-[9px] text-slate-500 text-center mt-0.5 italic leading-tight">{nota}</p>
 )}

 {/* Número de página */}
 {showPage && (
 <p className="text-[9px] text-slate-400 text-center mt-0.5">Página: 1/1</p>
 )}
 </div>
 );
}
