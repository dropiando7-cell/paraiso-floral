import React from 'react';
import { Search, Plus, CheckCircle2, Receipt, Send, Percent, Stethoscope } from 'lucide-react';
import { TemplateProps } from './TemplateProps';
import InvoiceFooter from './InvoiceFooter';
import InvoiceSignaturesAndSeals from './InvoiceSignaturesAndSeals';

export default function ClassicTemplate(props: TemplateProps) {
 const {
 settings, organization, docNumber, docType, currentDocType, docTypeStatusConfig,
 today, futureDate, selectedClient, setShowClientModal, paymentTerms, setPaymentTerms,
 paymentMethod, setPaymentMethod,
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

  const imageColWidth = settings?.productImageSize === 'large' ? 'w-24' : settings?.productImageSize === 'medium' ? 'w-16' : 'w-[34px]';

 const renderLogo = () => (
 <div className={`mb-4 flex ${settings.logoPosition === 'center' ? 'justify-center' : settings.logoPosition === 'right' ? 'justify-end' : ''}`}>
 {organization?.logoUrl ? (
 <img src={organization.logoUrl} alt={organization.name || 'Logo'} className={`w-auto object-contain ${settings.logoSize === 'small' ? 'h-10' : settings.logoSize === 'large' ? 'h-24' : 'h-16'}`} />
 ) : (
 <div className={`border-2 ${baseColor} border-current flex items-center justify-center ${settings.logoSize === 'small' ? 'w-10 h-10' : settings.logoSize === 'large' ? 'w-20 h-20' : 'w-16 h-16'}`}>
 <Stethoscope size={settings.logoSize === 'small' ? 20 : settings.logoSize === 'large' ? 40 : 28} className={baseColor} />
 </div>
 )}
 </div>
 );

 return (
 <div className={`flex flex-col min-h-[1056px] flex-1 print:flex space-y-4 print:space-y-0 print:m-0 print:pb-24 ${fontClass} bg-white max-w-4xl mx-auto shadow-md border border-slate-300 print:border-none print:shadow-none`} style={templateStyles}>
 <div className="flex flex-col flex-1 p-8 md:p-12 print:p-0">
 
 {/* Header Block */}
 <div className="flex flex-col print:flex-row sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-6 mb-6 gap-6 print:gap-4">
 <div className={`flex-1 ${settings.logoPosition === 'center' ? 'text-center' : settings.logoPosition === 'right' ? 'text-right' : 'text-left'}`}>
 {settings.logoPosition !== 'right' && renderLogo()}
 <h1 className={`text-2xl font-bold uppercase text-slate-900 ${settings.logoPosition === 'center' ? 'mx-auto' : ''}`}>{organization?.name || 'Comercial'}</h1>
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
 <h2 className={`text-3xl font-light uppercase ${baseColor}`}>{currentDocType.label}</h2>
 <p className={`font-bold ${headerBaseSize} text-slate-800 mt-1`}>{docNumber}</p>
 
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
 <h3 className={`font-bold uppercase border-b border-slate-300 pb-1 mb-2 ${headerSmallSize}`}>Facturado A:</h3>
 <button onClick={() => setShowClientModal(true)} className="text-left group w-full">
 <p className={`font-bold ${headerBaseSize} ${selectedClient ? 'text-slate-800' : 'text-slate-400 italic'} group-hover:${baseColor} transition-colors`}>{selectedClient?.name || 'Seleccionar cliente...'}</p>
 <p className={`text-sm text-slate-600 mt-1 ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''}`}>RTN: {selectedClient?.rtn || '—'}</p>
 </button>
 </div>
 <div>
 <h3 className={`font-bold uppercase border-b border-slate-300 pb-1 mb-2 ${headerSmallSize}`}>Condiciones de Pago:</h3>
 <div className="space-y-2 mt-2">
 <select
 value={paymentTerms}
 onChange={e => setPaymentTerms(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm p-1.5 focus:ring-0 print:appearance-none print:border-none print:p-0 font-semibold"
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
 {docType === 'factura' && (
 <div className="flex flex-col gap-1 mt-1">
 <span className="text-xs text-slate-500 uppercase">Método de Pago:</span>
 <select
 value={paymentMethod}
 onChange={e => setPaymentMethod(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm p-1.5 focus:ring-0 print:appearance-none print:border-none print:p-0 font-semibold"
 >
 <option value="Efectivo">Efectivo</option>
 <option value="Tarjeta">Tarjeta</option>
 <option value="Transferencia">Transferencia</option>
 <option value="Cheque">Cheque</option>
 <option value="Link de pago de Occidente">Link de pago de Occidente</option>
 </select>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Items Table */}
 <div className="mb-8 relative z-50">
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
 className={`flex flex-col relative z-10 bg-transparent ${settings?.tableRoundedBorders ? 'rounded-xl' : ''}`}
 >
 <div 
 className={`flex items-stretch gap-2 px-4 print:px-4 ${settings?.tableRoundedBorders ? 'rounded-t-xl' : ''}`}
 style={{ 
 backgroundColor: settings?.tableHeaderBg || 'transparent',
 borderBottomWidth: settings?.showTableBorders ? (settings.tableBorderThickness || '1px') : '0px',
 borderColor: settings?.tableBorderColor || '#1e293b'
 }}
 >
 <div className="w-4 shrink-0 print:hidden" data-pdf-hide />
 {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && settings?.showItemCode !== false && <div className={`${imageColWidth} shrink-0`} />}
 <div className={`flex-1 grid grid-cols-[minmax(0,19fr)_minmax(0,26fr)_minmax(0,9fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)] gap-2 ${tableHeaderSize} font-bold uppercase ${baseColor}`}>
  <div className={`relative flex items-center justify-center text-center py-2 print:py-1 `}>{settings?.showItemCode !== false ? 'Código' : (settings?.showProductImages ? 'Imagen' : '')}
    {settings?.showTableVerticalBorders && <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#1e293b', zIndex: 10 }} />}
  </div>
  <div className={`relative flex items-center justify-center text-center py-2 print:py-1 `}>Descripción
    {settings?.showTableVerticalBorders && <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#1e293b', zIndex: 10 }} />}
  </div>
  <div className={`relative flex items-center justify-center text-center print:text-center py-2 print:py-1 `}>Cant.
    {settings?.showTableVerticalBorders && <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#1e293b', zIndex: 10 }} />}
  </div>
  <div className={`relative flex items-center justify-center text-center py-2 print:py-1 `}>Precio
    {settings?.showTableVerticalBorders && <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#1e293b', zIndex: 10 }} />}
  </div>
  <div className={`relative flex items-center justify-center text-center py-2 print:py-1 `}>Desc.
    {settings?.showTableVerticalBorders && <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#1e293b', zIndex: 10 }} />}
  </div>
  <div className={`relative flex items-center justify-center text-center py-2 print:py-1 `}>Imp.
    {settings?.showTableVerticalBorders && <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#1e293b', zIndex: 10 }} />}
  </div>
  <div className="relative flex items-center justify-end text-right py-2 print:py-1 pr-2">Monto</div>
 </div>
 <div className="w-[24px] shrink-0 print:hidden" data-pdf-hide />
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
 <div className="pt-6 print:pt-1 border-t border-slate-300 print:flex print:break-inside-avoid">
 {/* Notes */}
 <div className="flex-1 print:float-left print:w-[50%]">
 <h3 className="text-xs font-bold uppercase mb-2 border-b border-slate-200 pb-1">Términos y Condiciones</h3>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 rows={5}
 className="w-full text-xs border border-slate-200 bg-slate-50 p-3 resize-y min-h-[80px] focus:border-slate-400 focus:ring-0 whitespace-pre-wrap break-words print:hidden"
 data-pdf-hide
 placeholder="Ingresar condiciones..."
 />
 <div className="hidden print:block text-xs text-slate-700 whitespace-pre-wrap break-words w-full mt-1" data-pdf-show>
 {notes}
 </div>
 </div>

 {/* Totals */}
 <div className="w-full md:w-72 print:float-right print:w-[40%]">
 <div className={`text-sm ${settings?.subtotalsBorder ? 'border border-b-0' : 'space-y-2'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Subtotal L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.subtotal)}</span>
 </div>
 </div>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Total descuentos y rebajas L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass} text-red-600`} style={subtotalStyle}>-{fmt(totals.descuentos)}</span>
 </div>
 </div>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-start'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : 'flex-col'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Total exento L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : 'gap-2'}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(props.totals.exento)}</span>
 </div>
 </div>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-start'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : 'flex-col'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Total exonerado L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : 'gap-2'}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(props.totals.exonerado)}</span>
 </div>
 </div>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Total gravado 15% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.gravado15)}</span>
 </div>
 </div>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Total ISV 15% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.isv15)}</span>
 </div>
 </div>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Total gravado 18% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.gravado18)}</span>
 </div>
 </div>
 <div className={`flex items-stretch text-slate-600 ${settings?.subtotalsBorder ? 'border-b' : 'justify-between border-b border-slate-200 pb-2'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-1' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span>Total ISV 18% L.</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-1' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.isv18)}</span>
 </div>
 </div>
 <div className="flex justify-between items-end pt-2">
 <span className="font-bold uppercase text-slate-800">TOTAL L.</span>
 <span className={`${totalSizeClass} font-bold ${monoClass} ${baseColor}`} style={totalStyle}>{fmt(totals.total)}</span>
 </div>
 </div>

 <div className="mt-6 print:hidden">
 <button 
 onClick={handleSave}
 disabled={isSaving}
 className={`w-full py-3 text-white font-bold uppercase text-xs transition-colors ${isSaving ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800'}`}
 >
 {isSaving ? 'Guardando...' : `Guardar ${currentDocType.label}`}
 </button>
 </div>
 </div>
 <div className="clear-both print:flex"></div>
 </div>

 {/* Spacer to push footer down in html2canvas */}
 <div className="flex-1 print:hidden" />

 {/* Signatures and Seals */}
 <InvoiceSignaturesAndSeals settings={settings} />

 {/* Footer */}
 <InvoiceFooter settings={settings} organization={organization} className="print:mt-auto print:mb-0 print:px-12" />

 </div>
 </div>
 );
}
