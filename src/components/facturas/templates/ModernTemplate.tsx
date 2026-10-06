import React from 'react';
import { Search, Plus, CheckCircle2, Receipt, Send, Sparkles, Copy, Printer, Mail, Percent, Stethoscope } from 'lucide-react';
import { TemplateProps } from './TemplateProps';
import InvoiceFooter from './InvoiceFooter';
import InvoiceSignaturesAndSeals from './InvoiceSignaturesAndSeals';
import SarFiscalBanner, { SarLeyendasFooter } from './SarFiscalBanner';
import { isCredito } from '@/utils/facturaUtils';

export default function ModernTemplate(props: TemplateProps) {
  const {
    settings, organization, docNumber, docType, currentDocType, docTypeStatusConfig,
    today, futureDate, selectedClient, setShowClientModal, paymentTerms, setPaymentTerms,
    paymentMethod, setPaymentMethod,
    validityDays, setValidityDays, lineItems, handleLineChange, handleDeleteLine, handleDuplicateLine,
    handleToggleLongDesc, allProducts, emptyLine, emptySectionLine, setLineItems, setShowProductModal,
    notes, setNotes, totals, handleSave, isSaving, fmt, LineItemRowComponent, viewMode, nombreUsuario,
    onToggleTerms,
    numeroCAI, rangoAutorizado, fechaLimiteEmision, isSar
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

  const isHeaderNum = typeof settings.headerFontSize === 'number';
  const headerBaseSize = isHeaderNum ? 'text-[length:var(--header-base)]' : settings.headerFontSize === 'large' ? 'text-lg' : settings.headerFontSize === 'small' ? 'text-sm' : 'text-base';
  const headerSmallSize = isHeaderNum ? 'text-[length:var(--header-small)]' : settings.headerFontSize === 'large' ? 'text-xs' : settings.headerFontSize === 'small' ? 'text-[9px]' : 'text-[11px]';

  const isTableNum = typeof settings.tableHeaderFontSize === 'number';
  const tableHeaderSize = isTableNum ? 'text-[length:var(--table-header)]' : settings.tableHeaderFontSize === 'large' ? 'text-sm' : settings.tableHeaderFontSize === 'small' ? 'text-[9px]' : 'text-[10px]';

  const templateStyles = {
    '--header-base': isHeaderNum ? `${settings.headerFontSize}px` : undefined,
    '--header-small': isHeaderNum ? `${(settings.headerFontSize as number) * 0.75}px` : undefined,
    '--table-header': isTableNum ? `${settings.tableHeaderFontSize}px` : undefined,
  } as React.CSSProperties;

  const isDescNum = typeof settings?.itemDescFontSize === 'number';
  const descSizeVal = typeof settings?.itemDescFontSize === 'number' ? settings.itemDescFontSize : 12;
  const subtotalSizeClass = isDescNum ? '' : settings?.itemDescFontSize === 'large' ? 'text-sm' : settings?.itemDescFontSize === 'small' ? 'text-[10px]' : 'text-xs';
  const subtotalStyle = isDescNum ? { fontSize: `${descSizeVal}px` } : {};
  const isTotalNum = typeof settings?.totalFontSize === 'number';
  const totalSizeVal = isTotalNum 
    ? settings.totalFontSize 
    : settings?.totalFontSize === 'large' 
      ? 30 
      : settings?.totalFontSize === 'small' 
        ? 18 
        : 24;
  const totalSizeClass = '';
  const totalStyle = { fontSize: `${totalSizeVal}px` };
  
  const totalLabelSizeVal = isTotalNum 
    ? Math.max((settings.totalFontSize as number) * 0.75, 9)
    : settings?.totalFontSize === 'large' 
      ? 20 
      : settings?.totalFontSize === 'small' 
        ? 12 
        : 14;
  const totalLabelStyle = { fontSize: `${totalLabelSizeVal}px` };
  const monoClass = settings?.useMonospaceNumbers !== false ? 'font-mono' : '';
 const imageColWidth = settings?.productImageSize === 'large' ? 'w-24' : settings?.productImageSize === 'medium' ? 'w-16' : 'w-10';

  const showItemCode = settings?.showItemCode !== false;
  const qtyPositionFirst = settings?.qtyPositionFirst === true;

  let gridColsClass = 'grid-cols-[minmax(0,19fr)_minmax(0,26fr)_minmax(0,9fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)]';
  if (!showItemCode && !qtyPositionFirst) {
    gridColsClass = 'grid-cols-[minmax(0,45fr)_minmax(0,9fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)]';
  } else if (!showItemCode && qtyPositionFirst) {
    gridColsClass = 'grid-cols-[minmax(0,9fr)_minmax(0,45fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)]';
  } else if (showItemCode && qtyPositionFirst) {
    gridColsClass = 'grid-cols-[minmax(0,9fr)_minmax(0,19fr)_minmax(0,26fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)]';
  }

 // Logo rendering block helper:
 const renderLogoSection = () => (
 <div className={`flex items-center gap-3 mb-4 ${settings.logoPosition === 'center' ? 'justify-center flex-col' : settings.logoPosition === 'right' ? 'flex-row-reverse justify-end' : ''}`}>
 {organization?.logoUrl ? (
 <img src={organization.logoUrl} alt={organization.name || 'Logo'} className={`w-auto object-contain ${settings.logoSize === 'small' ? 'h-8' : settings.logoSize === 'large' ? 'h-20' : 'h-12'}`} />
 ) : (
 <div className={`rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0 ${settings.logoSize === 'small' ? 'w-8 h-8' : settings.logoSize === 'large' ? 'w-16 h-16' : 'w-10 h-10'}`}>
 <Stethoscope size={settings.logoSize === 'small' ? 16 : settings.logoSize === 'large' ? 32 : 20} className={theme.headerText} />
 </div>
 )}
 <div className={settings.logoPosition === 'center' ? 'text-center mt-2' : ''}>
 <p className={`text-white font-black leading-none ${settings.logoSize === 'large' ? 'text-2xl' : 'text-lg'}`}>{organization?.name || 'Comercial'}</p>
 <p className={`${theme.headerText} text-xs font-medium mt-1`}>{organization?.qrPrefix || 'Facturación'}</p>
 </div>
 </div>
 );

 return (
 <div className={`flex flex-col min-h-[1056px] flex-1 print:flex min-w-0 space-y-4 print:space-y-0 print:m-0 print:pb-0 print:overflow-hidden break-inside-avoid ${fontClass} print:bg-white`} style={templateStyles}>
 {/* Document Card */}
 <div className="bg-white rounded-3xl border border-slate-100 shadow-xl print:shadow-none print:border-none print:rounded-none print:overflow-visible">

 {/* Document Header */}
 <div className={`bg-gradient-to-br from-slate-900 ${theme.via} to-slate-900 p-6 md:p-8 rounded-t-3xl`}>
 <div className="flex items-start justify-between gap-6 ">
 {/* Logo/Org Side */}
 <div className={`flex-1 ${settings.logoPosition === 'center' ? 'flex flex-col items-center justify-center w-full' : ''}`}>
 {settings.logoPosition !== 'right' && renderLogoSection()}
 <div className={`space-y-1 mt-2 ${headerSmallSize} ${settings.logoPosition === 'center' ? 'text-center' : ''} `}>
 {organization?.direccion && <p className="text-slate-400 whitespace-pre-wrap max-w-[350px] leading-relaxed ">{organization.direccion}</p>}
 <p className="text-slate-400 ">
 {organization?.rtn && `RTN: ${organization.rtn}`}
 {organization?.rtn && organization?.telefono && ' · '}
 {organization?.telefono && `${organization.telefono}`}
 </p>
 {organization?.correoContacto && <p className="text-slate-400 ">{organization.correoContacto}</p>}
 {!organization?.direccion && !organization?.rtn && !organization?.correoContacto && (
 <>
 <p className="text-slate-400 ">Centro de Operaciones</p>
 <p className="text-slate-400 ">Configura tu empresa en White Label</p>
 </>
 )}
 </div>
 {settings.logoPosition === 'right' && renderLogoSection()}
 </div>

 {/* Doc Info Side */}
 <div className="text-right shrink-0">
 <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl mb-3 ${currentDocType.bg} border `}>
 <span className={currentDocType.color}>{currentDocType.icon}</span>
 <span className={`text-xs font-bold ${currentDocType.color}`}>{currentDocType.label.toUpperCase()}</span>
 </div>
 <p className={`text-white font-black text-xl ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} whitespace-nowrap`}>{docNumber}</p>
 <div className="mt-3 space-y-1">
 <div className="flex items-center gap-2 justify-end">
 <span className={`text-slate-400 ${headerSmallSize} `}>Fecha:</span>
 <span className={`text-white ${headerSmallSize} font-semibold `}>{today}</span>
 </div>
 <div className="flex items-center gap-2 justify-end">
 <span className={`text-slate-400 ${headerSmallSize} `}>Válido hasta:</span>
 <span className={`${theme.headerText} ${headerSmallSize} font-semibold `}>{futureDate(validityDays)}</span>
 </div>
 </div>
 </div>
 </div>

 {/* SAR Fiscal Details Banner */}
 {(numeroCAI || rangoAutorizado || fechaLimiteEmision) && (
 <div className="mt-5">
 <SarFiscalBanner
 numeroCAI={numeroCAI}
 rangoAutorizado={rangoAutorizado}
 fechaLimiteEmision={fechaLimiteEmision}
 variant="dark"
 />
 </div>
 )}

 {/* Client info strip */}
 <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap md:flex-nowrap items-center gap-4 relative ">
 <div className="flex-1 min-w-[200px]">
 <p className={`text-slate-500 ${headerSmallSize} uppercase tracking-wider mb-1 `}>Cliente</p>
 <button onClick={() => setShowClientModal(true)} className={`text-white hover:${theme.headerText} ${headerBaseSize} font-semibold flex items-center gap-2 transition-colors `}>
 {selectedClient?.name || 'Seleccionar cliente...'} <Search size={14} className="opacity-50 print:hidden" />
 </button>
 </div>
 <div>
 <p className={`text-slate-500 ${headerSmallSize} uppercase tracking-wider mb-1 `}>RTN</p>
 <p className={`text-white ${headerSmallSize} ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''}`}>{selectedClient?.rtn || '—'}</p>
 </div>
 <div className="min-w-[120px]">
  <p className={`text-slate-500 ${headerSmallSize} uppercase tracking-wider mb-1 `}>Marca / Origen</p>
  {viewMode ? (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${props.aliasVenta === 'HonduFlores' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-pink-500/20 text-pink-300 border-pink-500/30'}`}>
      {props.aliasVenta === 'HonduFlores' ? 'HF' : 'PF'}
    </span>
  ) : (
    <label className="flex items-center gap-2 cursor-pointer mt-1">
      <input 
        type="checkbox" 
        className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 print:hidden"
        checked={props.aliasVenta === 'HonduFlores'}
        onChange={(e) => props.setAliasVenta?.(e.target.checked ? 'HonduFlores' : 'Paraíso Floral')}
      />
      <span className="text-white text-xs font-semibold print:text-slate-800">{props.aliasVenta === 'HonduFlores' ? 'HonduFlores (HF)' : 'Paraíso Floral (PF)'}</span>
    </label>
  )}
 </div>
 <div className="w-32">
 <p className={`text-slate-500 ${headerSmallSize} uppercase tracking-wider mb-1 `}>Términos de Pago</p>
 <select
 value={paymentTerms}
 onChange={e => setPaymentTerms(e.target.value)}
 className={`bg-transparent ${theme.headerText} text-sm font-semibold border-none outline-none cursor-pointer w-full p-0 focus:ring-0 print:appearance-none `}
 >
 <option value="Pago inmediato" className="bg-slate-800 text-white">Pago inmediato</option>
 <option value="15 días netos" className="bg-slate-800 text-white">15 días</option>
 <option value="30 días netos" className="bg-slate-800 text-white">30 días</option>
 <option value="60 días netos" className="bg-slate-800 text-white">60 días</option>
 <option value="90 días netos" className="bg-slate-800 text-white">90 días</option>
 </select>
 </div>
 <div className="w-24">
 <p className={`text-slate-500 ${headerSmallSize} uppercase tracking-wider mb-1 `}>Vigencia</p>
 <div className="flex items-center gap-1">
 <input
 type="number"
 value={validityDays}
 onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
 className={`bg-transparent ${theme.headerText} text-sm font-semibold border-none outline-none w-8 p-0 focus:ring-0 print:p-0 print:m-0 print:w-auto`}
 />
 <span className={`${theme.headerText} text-sm font-semibold `}>días</span>
 </div>
 </div>
 {(docType === 'factura' || docType === 'cotizacion' || docType === 'proforma') && (
 <div className="w-36">
 <p className={`text-slate-500 ${headerSmallSize} uppercase tracking-wider mb-1 `}>Método de Pago</p>
 <select
 value={paymentMethod}
 onChange={e => setPaymentMethod(e.target.value)}
 disabled={viewMode}
 className={`bg-transparent ${theme.headerText} text-sm font-semibold border-none outline-none cursor-pointer w-full p-0 focus:ring-0 print:appearance-none `}
 >
 <option value="Efectivo" className="bg-slate-800 text-white">Efectivo</option>
 <option value="Tarjeta" className="bg-slate-800 text-white">Tarjeta</option>
 <option value="Transferencia" className="bg-slate-800 text-white">Transferencia</option>
 <option value="MIXTO" className="bg-slate-800 text-white">Pago Dividido / Mixto</option>
 <option value="Cheque" className="bg-slate-800 text-white">Cheque</option>
 <option value="Link de pago de Occidente" className="bg-slate-800 text-white">Link de pago</option>
 </select>
 {paymentMethod === 'Transferencia' && !isCredito(paymentTerms) && (
   <div className="mt-2 print:hidden" data-pdf-hide>
     {viewMode ? (
       <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${props.transferenciaConfirmada ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
         {props.transferenciaConfirmada ? '✓ Confirmada' : '⏳ Pend. Confirmación'}
       </span>
     ) : (
       <div className="flex flex-col gap-1 bg-slate-800/80 p-1.5 rounded-md border border-slate-700/60">
         <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-300 hover:text-emerald-400 select-none">
           <input
             type="radio"
             name={`transf_status_modern_${docNumber}`}
             checked={props.transferenciaConfirmada !== false}
             onChange={() => props.setTransferenciaConfirmada?.(true)}
             className="w-3 h-3 text-emerald-500 focus:ring-emerald-400 bg-slate-700 border-slate-600"
           />
           <span className={props.transferenciaConfirmada !== false ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}>
             ✓ Ya se confirmó
           </span>
         </label>
         <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-300 hover:text-amber-400 select-none">
           <input
             type="radio"
             name={`transf_status_modern_${docNumber}`}
             checked={props.transferenciaConfirmada === false}
             onChange={() => props.setTransferenciaConfirmada?.(false)}
             className="w-3 h-3 text-amber-500 focus:ring-amber-400 bg-slate-700 border-slate-600"
           />
           <span className={props.transferenciaConfirmada === false ? 'text-amber-400 font-extrabold' : 'text-slate-400'}>
             ⏳ Pend. Confirmación
           </span>
         </label>
       </div>
     )}
   </div>
 )}
 {paymentMethod === 'MIXTO' && props.pagosMixtos && props.pagosMixtos.length > 0 && (
   <div className="mt-2 flex flex-col gap-1">
     {props.pagosMixtos.map((p, idx) => (
       <div key={idx} className="flex items-center justify-between text-[9px] bg-white/10 rounded px-1.5 py-0.5 border border-white/10">
         <span className="text-slate-300 truncate max-w-[70px]" title={p.metodoPago || p.metodo}>{p.metodoPago || p.metodo}</span>
         <span className="text-white font-mono font-bold">L. {Number(p.monto).toFixed(2)}</span>
       </div>
     ))}
   </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Line Items Section */}
 <div className="p-5">
 {/* Column headers */}
 <div className="flex items-center gap-2 mb-3 px-3 print:px-0 print:mb-2">
 <div className="w-4 shrink-0 print:hidden" data-pdf-hide />
 {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && <div className={`${imageColWidth} shrink-0`} />}
 <div className={`flex-1 grid ${gridColsClass} gap-2 ${tableHeaderSize} font-bold text-slate-400 uppercase`}>
 {qtyPositionFirst && <div className="text-center print:text-left">Cant.</div>}
 {showItemCode && <div className="text-center">Código</div>}
 <div className="text-center">Descripción</div>
 {!qtyPositionFirst && <div className="text-center print:text-left">Cant.</div>}
 <div className="text-center">P. Unitario</div>
 <div className="text-center">Descuento</div>
 <div className="text-center">Impuesto</div>
 <div className="text-right pr-2">Subtotal</div>
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
 lineItems={lineItems}
 />
 ))}
 </div>

 {/* Add Line Buttons */}
 {!viewMode && (
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
 {props.setSettings && (
   <div className="flex-1 max-w-[200px] flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm shrink-0">
     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Incluyen 15%</span>
     <button
       type="button"
       onClick={() => props.setSettings?.(s => ({ ...s, pricesIncludeTax: !s.pricesIncludeTax }))}
       className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${
         settings.pricesIncludeTax ? 'bg-blue-600' : 'bg-slate-300'
       }`}
     >
       <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
         settings.pricesIncludeTax ? 'left-[18px]' : 'left-0.5'
       }`} />
     </button>
   </div>
 )}
 </div>
 )}
 </div>

 {/* Notes */}
 <div className="px-5 pb-5 print:pb-1">
  <div className="flex items-center justify-between mb-2 print:hidden">
    <p className="text-[10px] font-bold text-slate-400 uppercase">Notas y Condiciones</p>
    {!viewMode && (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400 font-normal">Notas predeterminadas</span>
        <button
          type="button"
          onClick={() => onToggleTerms?.(!settings.showTerms)}
          className={`w-8 h-4 rounded-full transition-colors relative shrink-0 focus:outline-none ${
            settings.showTerms ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transform transition-transform ${
            settings.showTerms ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
      </div>
    )}
  </div>
  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 hidden print:block">Notas y Condiciones</p>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 rows={5}
 placeholder="Condiciones de entrega, garantía, soporte técnico incluido, instrucciones especiales..."
 className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-y min-h-[80px] placeholder:text-slate-300 text-slate-600 whitespace-pre-wrap break-words print:hidden"
 data-pdf-hide
 />
 <div className="hidden print:block text-sm text-slate-800 whitespace-pre-wrap break-words w-full" data-pdf-show>
 {notes || " "}
 </div>
 </div>

 {/* Totals Section */}
 <div className="border-t border-slate-100 bg-white p-6 print:p-2 rounded-b-3xl print:break-inside-avoid">
 <div className="flex justify-end">
 <div className="w-full max-w-xs space-y-3">
 <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Resumen Financiero</p>

 <div className={`${settings?.subtotalsBorder ? 'border border-b-0 text-sm' : 'space-y-3'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Subtotal L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} font-semibold text-slate-700 ${monoClass}`} style={subtotalStyle}>{fmt(totals.subtotal)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Total descuentos y rebajas L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} font-semibold text-red-500 ${monoClass}`} style={subtotalStyle}>-{fmt(totals.descuentos)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center group'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : 'flex-col items-start'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Total exento L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : 'gap-2'}`}>
 <span className={`${subtotalSizeClass} font-semibold text-slate-700 ${monoClass}`} style={subtotalStyle}>
 {fmt(totals.exento)}
 </span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center group'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : 'flex-col items-start'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Total exonerado L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : 'gap-2'}`}>
 <span className={`${subtotalSizeClass} font-semibold text-slate-700 ${monoClass}`} style={subtotalStyle}>
 {fmt(totals.exonerado)}
 </span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Total gravado 15% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} font-semibold text-slate-700 ${monoClass}`} style={subtotalStyle}>{fmt(totals.gravado15)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Total ISV 15% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} font-semibold text-amber-600 ${monoClass}`} style={subtotalStyle}>{fmt(totals.isv15)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Total gravado 18% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} font-semibold text-slate-700 ${monoClass}`} style={subtotalStyle}>{fmt(totals.gravado18)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-slate-500`} style={subtotalStyle}>Total ISV 18% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} font-semibold text-amber-600 ${monoClass}`} style={subtotalStyle}>{fmt(totals.isv18)}</span>
 </div>
 </div>
 </div>

 <div className="border-t border-slate-200 pt-3">
 <div className="flex justify-between items-center">
 <span className={`font-black text-slate-800 ${isTotalNum ? '' : 'text-base'}`} style={totalLabelStyle}>TOTAL L.</span>
 <div className="text-right flex items-center h-full">
 <span className={`font-black ${theme.accentText} tabular-nums leading-none ${isTotalNum ? '' : 'text-2xl'}`} style={totalStyle}>{fmt(totals.total)}</span>
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

 {/* Signatures and Seals */}
 <InvoiceSignaturesAndSeals settings={settings} clienteSignature={props.clienteSignature} />

 {/* SAR Fiscal Footnotes */}
 {(isSar || numeroCAI) && <SarLeyendasFooter className="mt-4 mb-2" />}

 {/* Footer */}
 <InvoiceFooter settings={settings} organization={organization} className="print:mt-auto print:mb-0" />

 </div>
 );
}
