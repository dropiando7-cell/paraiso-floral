import React from 'react';
import { Search, Plus, CheckCircle2, Receipt, Send, Sparkles, Copy, Printer, Mail, Percent, Stethoscope } from 'lucide-react';
import { TemplateProps } from './TemplateProps';
import InvoiceFooter from './InvoiceFooter';

export default function ModernTemplate(props: TemplateProps) {
  const {
    settings, organization, docNumber, docType, currentDocType, docTypeStatusConfig,
    today, futureDate, selectedClient, setShowClientModal, paymentTerms, setPaymentTerms,
    validityDays, setValidityDays, lineItems, handleLineChange, handleDeleteLine, handleDuplicateLine,
    handleToggleLongDesc, allProducts, emptyLine, emptySectionLine, setLineItems, setShowProductModal,
    notes, setNotes, totals, handleSave, isSaving, fmt, LineItemRowComponent, viewMode, nombreUsuario
  } = props;

  // Derive dynamic classes from settings
  // The original used: bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900
  // We can inject the colorTheme base to make it dynamic, e.g., if colorTheme is 'emerald-600', we parse it.
  const colorMap: Record<string, { via: string, headerText: string, ctaBg: string, ctaHover: string, accentText: string }> = {
    'blue-600': { via: 'via-blue-950', headerText: 'text-blue-300', ctaBg: 'bg-blue-600', ctaHover: 'hover:bg-blue-700', accentText: 'text-blue-600' },
    'emerald-600': { via: 'via-emerald-950', headerText: 'text-emerald-300', ctaBg: 'bg-emerald-600', ctaHover: 'hover:bg-emerald-700', accentText: 'text-emerald-600' },
    'violet-600': { via: 'via-violet-950', headerText: 'text-violet-300', ctaBg: 'bg-violet-600', ctaHover: 'hover:bg-violet-700', accentText: 'text-violet-600' },
    'slate-800': { via: 'via-slate-800', headerText: 'text-slate-300', ctaBg: 'bg-slate-700', ctaHover: 'hover:bg-slate-800', accentText: 'text-slate-800' },
    'rose-600': { via: 'via-rose-950', headerText: 'text-rose-300', ctaBg: 'bg-rose-600', ctaHover: 'hover:bg-rose-700', accentText: 'text-rose-600' },
  };
  const theme = colorMap[settings.colorTheme] || colorMap['blue-600'];

  // Font class
  const fontClass = settings.fontFamily || 'font-sans';

  // Logo rendering block helper:
  const renderLogoSection = () => (
    <div className={`flex items-center gap-3 mb-4 ${settings.logoPosition === 'center' ? 'justify-center flex-col' : settings.logoPosition === 'right' ? 'flex-row-reverse justify-end' : ''}`}>
      {organization?.logoUrl ? (
        <img  src={organization.logoUrl} alt={organization.name || 'Logo'} className={`w-auto object-contain ${settings.logoSize === 'small' ? 'h-8' : settings.logoSize === 'large' ? 'h-20' : 'h-12'}`} />
      ) : (
        <div className={`rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0 ${settings.logoSize === 'small' ? 'w-8 h-8' : settings.logoSize === 'large' ? 'w-16 h-16' : 'w-10 h-10'}`}>
          <Stethoscope size={settings.logoSize === 'small' ? 16 : settings.logoSize === 'large' ? 32 : 20} className={theme.headerText} />
        </div>
      )}
      <div className={settings.logoPosition === 'center' ? 'text-center mt-2' : ''}>
        <p className={`text-white font-black leading-none print:text-slate-800 ${settings.logoSize === 'large' ? 'text-2xl' : 'text-lg'}`}>{organization?.name || 'Comercial'}</p>
        <p className={`${theme.headerText} text-xs font-medium print:text-slate-500 mt-1`}>{organization?.qrPrefix || 'Facturación'}</p>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col min-h-[1056px] flex-1 print:flex-none print:block min-w-0 space-y-4 print:space-y-0 print:m-0 print:pb-8 ${fontClass}`}>
      {/* Document Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:overflow-visible">

        {/* Document Header */}
        <div className={`bg-gradient-to-br from-slate-900 ${theme.via} to-slate-900 p-6 md:p-8 print:bg-none print:bg-white`}>
          <div className="flex items-start justify-between gap-6 print:text-slate-800">
            {/* Logo/Org Side */}
            <div className={`flex-1 ${settings.logoPosition === 'center' ? 'flex flex-col items-center justify-center w-full' : ''}`}>
              {settings.logoPosition !== 'right' && renderLogoSection()}
              <div className={`space-y-1 mt-2 text-[11px] ${settings.logoPosition === 'center' ? 'text-center' : ''} print:text-slate-600`}>
                {organization?.direccion && <p className="text-slate-400 whitespace-pre-wrap max-w-[350px] leading-relaxed print:text-slate-600">{organization.direccion}</p>}
                <p className="text-slate-400 print:text-slate-600">
                  {organization?.rtn && `RTN: ${organization.rtn}`}
                  {organization?.rtn && organization?.telefono && ' · '}
                  {organization?.telefono && `${organization.telefono}`}
                </p>
                {organization?.correoContacto && <p className="text-slate-400 print:text-slate-600">{organization.correoContacto}</p>}
                {!organization?.direccion && !organization?.rtn && !organization?.correoContacto && (
                   <>
                     <p className="text-slate-400 print:text-slate-600">Centro de Operaciones</p>
                     <p className="text-slate-400 print:text-slate-600">Configura tu empresa en White Label</p>
                   </>
                )}
              </div>
              {settings.logoPosition === 'right' && renderLogoSection()}
            </div>

            {/* Doc Info Side */}
            <div className="text-right shrink-0">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl mb-3 ${currentDocType.bg} border print:border-slate-300`}>
                <span className={currentDocType.color}>{currentDocType.icon}</span>
                <span className={`text-xs font-bold ${currentDocType.color}`}>{currentDocType.label.toUpperCase()}</span>
              </div>
              <p className="text-white font-black text-xl font-mono print:text-slate-800 whitespace-nowrap">{docNumber}</p>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 justify-end">
                   <span className="text-slate-400 text-[11px] print:text-slate-500">Fecha:</span>
                   <span className="text-white text-[11px] font-semibold print:text-slate-800">{today}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                   <span className="text-slate-400 text-[11px] print:text-slate-500">Válido hasta:</span>
                   <span className={`${theme.headerText} text-[11px] font-semibold print:text-slate-800`}>{futureDate(validityDays)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Client info strip */}
          <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap md:flex-nowrap items-center gap-4 relative print:border-slate-200">
            <div className="flex-1 min-w-[200px]">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">Cliente</p>
              <button onClick={() => setShowClientModal(true)} className={`text-white hover:${theme.headerText} text-sm font-semibold flex items-center gap-2 transition-colors print:text-slate-800`}>
                {selectedClient?.name || 'Seleccionar cliente...'} <Search size={14} className="opacity-50 print:hidden" />
              </button>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">RTN</p>
              <p className="text-white text-xs font-mono print:text-slate-800">{selectedClient?.rtn || '—'}</p>
            </div>
            <div className="w-32">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">Términos de Pago</p>
              <select
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className={`bg-transparent ${theme.headerText} text-sm font-semibold border-none outline-none cursor-pointer w-full p-0 focus:ring-0 print:appearance-none print:text-slate-800`}
              >
                <option value="Contado" className="bg-slate-800 text-white">Contado</option>
                <option value="15 días netos" className="bg-slate-800 text-white">15 días</option>
                <option value="30 días netos" className="bg-slate-800 text-white">30 días</option>
                <option value="60 días netos" className="bg-slate-800 text-white">60 días</option>
                <option value="90 días netos" className="bg-slate-800 text-white">90 días</option>
              </select>
            </div>
            <div className="w-24">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">Vigencia</p>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={validityDays}
                  onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                  className={`bg-transparent ${theme.headerText} text-sm font-semibold border-none outline-none w-8 p-0 focus:ring-0 print:text-slate-800 print:p-0 print:m-0 print:w-auto`}
                />
                <span className={`${theme.headerText} text-sm font-semibold print:text-slate-800`}>días</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="p-5">
          {/* Column headers */}
          <div className="flex items-center gap-2 mb-3 px-3 print:px-0 print:mb-2">
            <div className="w-4 shrink-0 print:hidden" />
            {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && <div className="w-10 shrink-0" />}
            <div className="flex-1 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="col-span-2">Código</div>
              <div className="col-span-3">Descripción</div>
              <div className="col-span-1 text-center print:text-left">Cant.</div>
              <div className="col-span-2 text-right">P. Unitario</div>
              <div className="col-span-1 text-right">Descuento</div>
              <div className="col-span-2 text-center">Impuesto</div>
              <div className="col-span-1 text-right">Subtotal</div>
            </div>
            <div className="w-6 shrink-0 print:hidden" />
          </div>

          {/* Items */}
          <div className="space-y-2">
            {lineItems.map((item, index) => (
              <LineItemRowComponent
                key={item.id}
                item={item}
                index={index}
                onChange={handleLineChange}
                onDelete={handleDeleteLine}
                onDuplicate={handleDuplicateLine}
                onToggleLongDesc={handleToggleLongDesc}
                allProducts={allProducts}
                viewMode={viewMode}
                settings={settings}
              />
            ))}
          </div>

          {/* Add Line Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 print:hidden">
            <button
              onClick={() => setShowProductModal(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 ${theme.accentText} rounded-xl text-sm font-bold transition-all shadow-sm`}
            >
              <Search size={16} /> Buscar en Catálogo
            </button>
            <button
              onClick={() => setLineItems(prev => [...prev, emptyLine()])}
              className={`flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 ${theme.accentText} rounded-xl text-sm font-bold transition-all shadow-sm`}
            >
              <Plus size={16} /> Fila Manual
            </button>
            <button
              onClick={() => setLineItems(prev => [...prev, emptySectionLine()])}
              className={`flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 ${theme.accentText} rounded-xl text-sm font-bold transition-all shadow-sm`}
            >
              <Plus size={16} /> Sección
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="px-5 pb-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notas y Condiciones</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Condiciones de entrega, garantía, soporte técnico incluido, instrucciones especiales..."
            className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none placeholder:text-slate-300 text-slate-600 print:hidden"
          />
          <div className="hidden print:block text-sm text-slate-800 whitespace-pre-wrap">
            {notes || " "}
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t border-slate-100 bg-slate-50/70 p-6 print:break-inside-avoid">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Resumen Financiero</p>

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Subtotal L.</span>
                <span className="text-sm font-semibold text-slate-700">{fmt(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total descuentos y rebajas L.</span>
                <span className="text-sm font-semibold text-red-500">-{fmt(totals.descuentos)}</span>
              </div>
              <div className="flex justify-between items-center group">
                <div className="flex flex-col">
                    <span className="text-sm text-slate-500">Total exento L.</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                        {fmt(totals.exento)}
                    </span>
                </div>
              </div>
              <div className="flex justify-between items-center group">
                <div className="flex flex-col">
                    <span className="text-sm text-slate-500">Total exonerado L.</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                        {fmt(totals.exonerado)}
                    </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total gravado 15% L.</span>
                <span className="text-sm font-semibold text-slate-700">{fmt(totals.gravado15)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total ISV 15% L.</span>
                <span className="text-sm font-semibold text-amber-600">{fmt(totals.isv15)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total gravado 18% L.</span>
                <span className="text-sm font-semibold text-slate-700">{fmt(totals.gravado18)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total ISV 18% L.</span>
                <span className="text-sm font-semibold text-amber-600">{fmt(totals.isv18)}</span>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-black text-slate-800">TOTAL L.</span>
                  <div className="text-right flex items-center h-full">
                    <span className={`text-2xl font-black ${theme.accentText} tabular-nums leading-none`}>{fmt(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2 print:hidden">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-2xl font-bold text-sm shadow-lg transition-all ${isSaving ? 'bg-slate-400' : `${theme.ctaBg} ${theme.ctaHover} shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5`}`}
                >
                  {isSaving ? 'Guardando...' : docType === 'factura' ? (
                    <><CheckCircle2 size={16} /> Emitir Factura Oficial</>
                  ) : docType === 'proforma' ? (
                    <><Receipt size={16} /> Generar Factura Pro Forma</>
                  ) : (
                    <><Send size={16} /> Guardar {currentDocType.label}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer to push footer to bottom in html2canvas */}
      <div className="flex-1 print:hidden" />

      {/* Footer */}
      <InvoiceFooter settings={settings} organization={organization} className="print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:pb-2" />

    </div>
  );
}
