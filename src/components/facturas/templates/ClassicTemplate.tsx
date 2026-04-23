import React from 'react';
import { Search, Plus, CheckCircle2, Receipt, Send, Percent, Stethoscope } from 'lucide-react';
import { TemplateProps } from './TemplateProps';
import InvoiceFooter from './InvoiceFooter';

export default function ClassicTemplate(props: TemplateProps) {
  const {
    settings, organization, docNumber, docType, currentDocType, docTypeStatusConfig,
    today, futureDate, selectedClient, setShowClientModal, paymentTerms, setPaymentTerms,
    validityDays, setValidityDays, lineItems, handleLineChange, handleDeleteLine, handleDuplicateLine,
    handleToggleLongDesc, allProducts, emptyLine, emptySectionLine, setLineItems, setShowProductModal,
    notes, setNotes, totals, handleSave, isSaving, fmt, LineItemRowComponent, viewMode
  } = props;

  const fontClass = settings.fontFamily || 'font-serif';
  
  const colorMap: Record<string, string> = {
    'blue-600': 'text-blue-700 border-blue-700 bg-blue-50',
    'emerald-600': 'text-emerald-700 border-emerald-700 bg-emerald-50',
    'violet-600': 'text-violet-700 border-violet-700 bg-violet-50',
    'slate-800': 'text-slate-800 border-slate-800 bg-slate-50',
    'rose-600': 'text-rose-700 border-rose-700 bg-rose-50',
  };
  const theme = colorMap[settings.colorTheme] || colorMap['slate-800'];
  const baseColor = theme.split(' ')[0]; // text-xxx

  const renderLogo = () => (
    <div className={`mb-4 flex ${settings.logoPosition === 'center' ? 'justify-center' : settings.logoPosition === 'right' ? 'justify-end' : ''}`}>
      {organization?.logoUrl ? (
        <img  src={organization.logoUrl} alt={organization.name || 'Logo'} className={`w-auto object-contain ${settings.logoSize === 'small' ? 'h-10' : settings.logoSize === 'large' ? 'h-24' : 'h-16'}`} />
      ) : (
        <div className={`border-2 ${baseColor} border-current flex items-center justify-center ${settings.logoSize === 'small' ? 'w-10 h-10' : settings.logoSize === 'large' ? 'w-20 h-20' : 'w-16 h-16'}`}>
          <Stethoscope size={settings.logoSize === 'small' ? 20 : settings.logoSize === 'large' ? 40 : 28} className={baseColor} />
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col min-h-[1056px] flex-1 print:flex-none print:block space-y-4 print:space-y-0 print:m-0 print:pb-8 ${fontClass} bg-white max-w-4xl mx-auto shadow-md border border-slate-300 print:border-none print:shadow-none`}>
      <div className="flex flex-col flex-1 p-8 md:p-12 print:p-0">
        
        {/* Header Block */}
        <div className="flex flex-col print:flex-row sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-6 mb-6 gap-6 print:gap-4">
          <div className={`flex-1 ${settings.logoPosition === 'center' ? 'text-center' : settings.logoPosition === 'right' ? 'text-right' : 'text-left'}`}>
             {settings.logoPosition !== 'right' && renderLogo()}
             <h1 className={`text-2xl font-bold uppercase tracking-widest text-slate-900 ${settings.logoPosition === 'center' ? 'mx-auto' : ''}`}>{organization?.name || 'Comercial'}</h1>
             <p className="text-sm text-slate-600 font-semibold">{organization?.qrPrefix || 'Facturación'}</p>
             <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                {organization?.direccion && <p>{organization.direccion}</p>}
                <p>
                  {organization?.rtn && `RTN: ${organization.rtn}`}
                  {organization?.rtn && organization?.telefono && ' · '}
                  {organization?.telefono && `Tel: ${organization.telefono}`}
                </p>
                {organization?.correoContacto && <p>{organization.correoContacto}</p>}
             </div>
             {settings.logoPosition === 'right' && renderLogo()}
          </div>
          
          <div className="text-right border-l-2 border-slate-200 pl-6 ml-6">
             <h2 className={`text-3xl font-light uppercase tracking-widest ${baseColor}`}>{currentDocType.label}</h2>
             <p className="font-bold text-lg text-slate-800 mt-1">{docNumber}</p>
             
             <div className="mt-4 text-sm text-slate-600 space-y-1">
               <div className="flex justify-between gap-4">
                 <span className="font-semibold uppercase text-xs">Fecha:</span>
                 <span>{today}</span>
               </div>
               <div className="flex justify-between gap-4">
                 <span className="font-semibold uppercase text-xs">Vencimiento:</span>
                 <span>{futureDate(validityDays)}</span>
               </div>
             </div>
          </div>
        </div>

        {/* Client Block */}
        <div className="grid grid-cols-2 gap-8 mb-8">
           <div>
             <h3 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-2">Facturado A:</h3>
             <button onClick={() => setShowClientModal(true)} className="text-left group w-full">
               <p className={`font-bold text-lg ${selectedClient ? 'text-slate-800' : 'text-slate-400 italic'} group-hover:${baseColor} transition-colors`}>{selectedClient?.name || 'Seleccionar cliente...'}</p>
               <p className="text-sm text-slate-600 mt-1 font-mono">RTN: {selectedClient?.rtn || '—'}</p>
             </button>
           </div>
           <div>
             <h3 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1 mb-2">Condiciones de Pago:</h3>
             <div className="space-y-2 mt-2">
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm p-1.5 focus:ring-0 print:appearance-none print:border-none print:bg-transparent print:p-0 font-semibold"
                >
                  <option value="Contado">Contado</option>
                  <option value="15 días netos">15 días netos</option>
                  <option value="30 días netos">30 días netos</option>
                  <option value="60 días netos">60 días netos</option>
                  <option value="90 días netos">90 días netos</option>
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase">Validez (días):</span>
                  <input
                    type="number"
                    value={validityDays}
                    onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                    className="w-16 border-b border-slate-300 text-sm font-semibold text-slate-800 p-0 text-center focus:ring-0 print:border-none"
                  />
                </div>
             </div>
           </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 relative">
          {/* Border Layer (fixes PDF rounding bug) */}
          <div 
            className={`absolute inset-0 pointer-events-none z-20 ${settings?.tableRoundedBorders ? 'rounded-xl' : ''}`}
            style={{
              borderWidth: (settings?.showTableOuterBorders !== false) ? (settings.tableBorderThickness || '1px') : '0px',
              borderColor: settings?.tableBorderColor || '#1e293b',
              borderStyle: 'solid'
            }}
          />
          
          {/* Content Layer */}
          <div 
            className={`flex flex-col relative z-10 bg-transparent ${settings?.tableRoundedBorders ? 'rounded-xl overflow-hidden' : ''}`}
          >
          <div 
            className={`flex items-stretch gap-2 px-4 print:px-4 ${settings?.tableRoundedBorders ? 'rounded-t-xl' : ''}`}
            style={{ 
              backgroundColor: settings?.tableHeaderBg || 'transparent',
              borderBottomWidth: settings?.showTableBorders ? (settings.tableBorderThickness || '1px') : '0px',
              borderColor: settings?.tableBorderColor || '#1e293b'
            }}
          >
            <div className="w-4 shrink-0 print:hidden" />
            {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && <div className="w-[34px] shrink-0" />}
            <div className={`flex-1 grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-widest ${baseColor}`}>
              <div className={`col-span-2 flex items-center py-2 print:py-1 ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Código</div>
              <div className={`col-span-3 flex items-center py-2 print:py-1 ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Descripción</div>
              <div className={`col-span-1 flex items-center justify-center text-center print:text-center py-2 print:py-1 ${settings?.showTableVerticalBorders ? 'px-1' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Cant.</div>
              <div className={`col-span-2 flex items-center justify-end text-right py-2 print:py-1 ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Precio</div>
              <div className={`col-span-1 flex items-center justify-end text-right py-2 print:py-1 ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Desc.</div>
              <div className={`col-span-2 flex items-center justify-center text-center py-2 print:py-1 ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Imp</div>
              <div className="col-span-1 flex items-center justify-end text-right py-2 print:py-1">Monto</div>
            </div>
            <div className="w-[24px] shrink-0 print:hidden" />
          </div>

          <div className="flex flex-col">
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
          
          <div className="mt-4 flex gap-3 print:hidden">
            <button onClick={() => setShowProductModal(true)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 flex gap-2 items-center"><Search size={14} /> Catálogo</button>
            <button onClick={() => setLineItems(prev => [...prev, emptyLine()])} className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 flex gap-2 items-center"><Plus size={14} /> Fila</button>
            <button onClick={() => setLineItems(prev => [...prev, emptySectionLine()])} className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 flex gap-2 items-center"><Plus size={14} /> Sección</button>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-300 print:block print:break-inside-avoid">
           {/* Notes */}
           <div className="flex-1 print:float-left print:w-[50%]">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Términos y Condiciones</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                className="w-full text-xs border border-slate-200 bg-slate-50 p-3 resize-none focus:border-slate-400 focus:ring-0 print:hidden"
                placeholder="Ingresar condiciones..."
              />
              <div className="hidden print:block text-xs text-slate-700 whitespace-pre-wrap mt-1">
                {notes}
              </div>
           </div>

           {/* Totals */}
           <div className="w-full md:w-72 print:float-right print:w-[40%]">
              <div className="space-y-2 text-sm">
                 <div className="flex justify-between text-slate-600">
                   <span>Subtotal L.</span>
                   <span className="font-mono">{fmt(totals.subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-slate-600">
                   <span>Total descuentos y rebajas L.</span>
                   <span className="font-mono text-red-600">-{fmt(totals.descuentos)}</span>
                 </div>
                 <div className="flex justify-between items-start text-slate-600">
                    <div className="flex flex-col">
                       <span>Total exento L.</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="font-mono">{fmt(props.totals.exento)}</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-start text-slate-600">
                    <div className="flex flex-col">
                       <span>Total exonerado L.</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="font-mono">{fmt(props.totals.exonerado)}</span>
                    </div>
                 </div>
                 <div className="flex justify-between text-slate-600">
                   <span>Total gravado 15% L.</span>
                   <span className="font-mono">{fmt(totals.gravado15)}</span>
                 </div>
                 <div className="flex justify-between text-slate-600">
                   <span>Total ISV 15% L.</span>
                   <span className="font-mono">{fmt(totals.isv15)}</span>
                 </div>
                 <div className="flex justify-between text-slate-600">
                   <span>Total gravado 18% L.</span>
                   <span className="font-mono">{fmt(totals.gravado18)}</span>
                 </div>
                 <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-2">
                   <span>Total ISV 18% L.</span>
                   <span className="font-mono">{fmt(totals.isv18)}</span>
                 </div>
                 <div className="flex justify-between items-end pt-2">
                   <span className="font-bold uppercase tracking-widest text-slate-800">TOTAL L.</span>
                   <span className={`text-xl font-bold font-mono ${baseColor}`}>{fmt(totals.total)}</span>
                 </div>
              </div>

              <div className="mt-6 print:hidden">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`w-full py-3 text-white font-bold tracking-widest uppercase text-xs transition-colors ${isSaving ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800'}`}
                >
                  {isSaving ? 'Guardando...' : `Guardar ${currentDocType.label}`}
                </button>
              </div>
           </div>
           <div className="clear-both print:block"></div>
        </div>

        {/* Spacer to push footer down in html2canvas */}
        <div className="flex-1 print:hidden" />

        {/* Footer */}
        <InvoiceFooter settings={settings} organization={organization} className="print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:px-12 print:pb-2" />

      </div>
    </div>
  );
}
