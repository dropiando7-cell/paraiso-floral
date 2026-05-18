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

 return (
 <div className={`border-t border-slate-300 pt-2 mt-6 print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:z-[100] print:pb-2 ${className}`}>
  {/* Main info row */}
  {hasContent && (
  <div className="w-full flex justify-center overflow-hidden">
    <div 
      className="flex flex-nowrap whitespace-nowrap items-center gap-x-3 text-slate-600 max-w-full"
      style={{ fontSize: `${settings.footerFontSize || 10}px` }}
    >
      {tel && <span className="shrink-0">Tel.: {tel}</span>}
      {correo && <span className="shrink truncate">Correo: {correo}</span>}
      {web && <span className="shrink-0 truncate">Web: {web}</span>}
    </div>
  </div>
  )}

 {/* Nota adicional */}
 {nota && (
 <p className="text-[10px] text-slate-500 text-center mt-0.5 italic leading-tight">{nota}</p>
 )}

 {/* Número de página */}
 {showPage && (
 <p className="text-[10px] text-slate-400 text-center mt-0.5">Página: 1/1</p>
 )}
 </div>
 );
}
