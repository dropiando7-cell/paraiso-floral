import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { TemplateProps } from './TemplateProps';
import InvoiceFooter from './InvoiceFooter';
import InvoiceSignaturesAndSeals from './InvoiceSignaturesAndSeals';

export default function LegacyTemplate(props: TemplateProps) {
 const {
 settings, organization, docNumber, docType, currentDocType,
 today, futureDate, selectedClient, paymentTerms, paymentMethod, setPaymentMethod,
 validityDays, lineItems, handleLineChange, handleDeleteLine, handleDuplicateLine,
 handleToggleLongDesc, allProducts, emptyLine, emptySectionLine, setLineItems, setShowProductModal,
 notes, setNotes, totals, handleSave, isSaving, fmt, LineItemRowComponent,
 setShowClientModal, docTypeStatusConfig, setValidityDays, setPaymentTerms, viewMode, fechaEmision
 } = props;

 const colorMap: Record<string, { bgDark: string, border: string, text: string }> = {
 'blue-600': { bgDark: 'bg-blue-900', border: 'border-blue-900', text: 'text-blue-800' },
 'emerald-600': { bgDark: 'bg-emerald-900', border: 'border-emerald-900', text: 'text-emerald-800' },
 'violet-600': { bgDark: 'bg-violet-900', border: 'border-violet-900', text: 'text-violet-800' },
 'slate-800': { bgDark: 'bg-gray-900', border: 'border-gray-800', text: 'text-gray-900' },
 'rose-600': { bgDark: 'bg-rose-900', border: 'border-rose-900', text: 'text-rose-800' },
 };
 const theme = colorMap[settings.colorTheme] || colorMap['slate-800'];
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

  const imageColWidth = settings?.productImageSize === 'large' ? 'w-24' : settings?.productImageSize === 'medium' ? 'w-16' : 'w-[34px]';
 
 // Use state for the date string to avoid SSR/client hydration mismatch
 const [currentDateStr, setCurrentDateStr] = useState(() => {
   if (fechaEmision) {
     const d = new Date(fechaEmision);
     if (!isNaN(d.getTime())) {
       const dateStr = d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
       const timeStr = d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
       return `${dateStr} ${timeStr}`;
     }
   }
   return today.split('-').reverse().join('/');
 });

 useEffect(() => {
   if (fechaEmision) {
     const d = new Date(fechaEmision);
     if (!isNaN(d.getTime())) {
       const dateStr = d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
       const timeStr = d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
       setCurrentDateStr(`${dateStr} ${timeStr}`);
       return;
     }
   }
   const now = new Date();
   const time = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
   setCurrentDateStr(`${today.split('-').reverse().join('/')} ${time}`);
 }, [today, fechaEmision]);

  const isGrouped = settings?.subtotalsBorderStyle === 'grouped';
  const [datePart = '', ...timeParts] = (currentDateStr || '').split(' ');
  const timePart = timeParts.join(' ');

 return (
 <div className={`flex flex-col min-h-[1056px] print:min-h-[26.2cm] space-y-4 print:space-y-0 print:m-0 print:pb-24 ${fontClass} bg-white max-w-4xl mx-auto shadow-md border border-slate-300 print:border-none print:shadow-none`} style={templateStyles}>
 <div className="flex flex-col flex-1 p-8 md:p-12 print:p-0 text-gray-900">
 
 {/* Header Block */}
 <div className={`flex ${settings.logoPosition === 'center' ? 'flex-col items-center gap-6 mt-4' : settings.logoPosition === 'right' ? 'flex-row-reverse' : 'justify-between items-start'} mb-8`}>
 {/* Logo */}
 <div className={`${settings.logoPosition === 'center' ? '' : 'flex-1'} ${settings.logoPosition === 'right' ? 'flex justify-end' : ''}`}>
 {organization?.logoUrl ? (
 <img src={organization.logoUrl} alt="Logo" className={`${settings.logoSize === 'small' ? 'h-16' : settings.logoSize === 'large' ? 'h-36' : 'h-28'} w-auto object-contain`} />
 ) : (
 <div className={`border border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50 text-xs text-center font-bold ${settings.logoSize === 'small' ? 'w-16 h-16' : settings.logoSize === 'large' ? 'w-36 h-36' : 'w-28 h-28'}`}>Sin<br/>Logo</div>
 )}
 </div>
 
 {/* Company Info */}
 <div className={`${settings.logoPosition === 'center' ? 'flex flex-col items-center text-center mt-4' : settings.logoPosition === 'right' ? 'flex-1 flex flex-col items-start text-left' : 'flex-1 text-right flex flex-col items-end'} text-sm`}>
 <h1 className={`font-bold text-lg ${theme.text}`}>{organization?.name || 'BIOELECTRONICA S. DE R.L. DE C.V'}</h1>
 <div className="text-gray-700 leading-snug max-w-xs mt-1">
 {organization?.direccion ? (
 <p className="whitespace-pre-wrap">{organization.direccion}</p>
 ) : (
 <>
 <p>Barrio Paz Barahona 10 CALLE 12 Y 11 Ave.</p>
 <p>Casa NO. 81-A, media cuadra abajo de Restaurante Estelina</p>
 <p>San Pedro Sula CO 01201</p>
 <p>Honduras</p>
 </>
 )}
 </div>

 <div className={`mt-6 cursor-pointer ${settings.logoPosition === 'right' ? 'text-left w-full' : settings.logoPosition === 'center' ? 'text-center' : 'text-right'}`} onClick={() => setShowClientModal(true)}>
 </div>
 </div>
 </div>

 {/* Metadata Grid (Compressed into columns) */}
  <div className={`grid ${(docType === 'factura' || docType === 'cotizacion' || docType === 'proforma') ? 'grid-cols-[0.8fr_0.6fr_0.6fr_0.6fr_1.8fr]' : 'grid-cols-[0.9fr_0.7fr_0.7fr_1.7fr]'} gap-3 mb-4 text-xs`}>
  <div className="flex flex-col">
  <span className={`font-bold ${headerBaseSize} ${theme.text} leading-tight uppercase`}>
  {currentDocType.label}
  <br/>
  <span className="text-slate-800">{docNumber}</span>
  </span>
  <span className="text-gray-600 mt-1 whitespace-nowrap">Fecha: {datePart}</span>
  {timePart && <span className="text-gray-500 text-[10px] mt-0.5 whitespace-nowrap">{timePart}</span>}
  </div>
  
  <div className="flex flex-col pl-3">
  <span className={`font-bold uppercase text-slate-800 ${headerSmallSize}`}>Elaborado por:</span>
  <span className="text-gray-600 mt-1">{props.nombreUsuario || 'Administrador (BEA)'}</span>
  </div>
  
  <div className="flex flex-col pl-3">
  <span className={`font-bold uppercase text-slate-800 ${headerSmallSize}`}>Términos de pago:</span>
  <select
  value={paymentTerms}
  onChange={e => setPaymentTerms(e.target.value)}
  className="text-gray-600 mt-1 bg-transparent border-b border-gray-200 outline-none print:hidden p-0 cursor-pointer text-xs"
  >
  <option value="Pago inmediato">Pago inmediato</option>
  <option value="15 días netos">15 días netos</option>
  <option value="30 días netos">30 días netos</option>
  <option value="60 días netos">60 días netos</option>
  <option value="90 días netos">90 días netos</option>
  </select>
  <span className="hidden print:flex text-gray-600 mt-1" data-pdf-show>{paymentTerms}</span>
  </div>

  {(docType === 'factura' || docType === 'cotizacion' || docType === 'proforma') && (
  <div className="flex flex-col pl-3">
  <span className={`font-bold uppercase text-slate-800 ${headerSmallSize}`}>Método de pago:</span>
  <select
  value={paymentMethod}
  onChange={e => setPaymentMethod(e.target.value)}
  disabled={viewMode}
  className="text-gray-600 mt-1 bg-transparent border-b border-gray-200 outline-none print:hidden p-0 cursor-pointer text-xs"
  >
  <option value="Efectivo">Efectivo</option>
  <option value="Tarjeta">Tarjeta</option>
  <option value="Transferencia">Transferencia</option>
  <option value="Cheque">Cheque</option>
  <option value="Link de pago de Occidente">Link de pago</option>
  </select>
  <span className="hidden print:flex text-gray-600 mt-1" data-pdf-show>{paymentMethod}</span>
  </div>
  )}

 <div className="flex flex-col pl-3 cursor-pointer" onClick={() => setShowClientModal(true)}>
 <span className={`font-bold uppercase text-slate-800 mb-1 ${headerSmallSize}`}>Cliente:</span>
 {selectedClient ? (
 <div className="text-[10px] leading-tight text-slate-700">
 <span className={`font-bold text-xs ${theme.text} block mb-0.5`}>{selectedClient.name}</span>
 <span className="block line-clamp-2">{selectedClient.address || selectedClient.city}</span>
 {selectedClient.rtn && <span className={`block mt-0.5 ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''}`}>RTN: {selectedClient.rtn}</span>}
 {selectedClient.nombreContacto && <span className="block mt-0.5 text-slate-500 font-medium">Contacto: {selectedClient.nombreContacto}</span>}
 {selectedClient.telefonoContacto && <span className="block mt-0.5 text-slate-700 font-semibold">Tel. Contacto: {selectedClient.telefonoContacto}</span>}
 </div>
 ) : (
 <span className="font-bold text-rose-600 italic print:hidden mt-1">Seleccionar...</span>
 )}
 </div>
 </div>

 {/* Items Table */}
 <div className="mb-8 relative z-50">
 {/* Border Layer */}
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
 backgroundColor: settings?.tableHeaderBg || '#f3f4f6', // gray-100 default for legacy
 borderBottomWidth: settings?.showTableBorders ? (settings.tableBorderThickness || '1px') : '0px',
 borderColor: settings?.tableBorderColor || '#1e293b'
 }}
 >
 <div className="w-4 shrink-0 print:hidden" data-pdf-hide />
 {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && settings?.showItemCode !== false && <div className={`${imageColWidth} shrink-0`} />}
 <div className={`flex-1 grid grid-cols-[minmax(0,19fr)_minmax(0,26fr)_minmax(0,9fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)] gap-2 ${tableHeaderSize} font-bold uppercase text-gray-800`}>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>{settings?.showItemCode !== false ? 'Código' : (settings?.showProductImages ? 'Imagen' : '')}</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Descripción</div>
 <div className={`flex items-center justify-center text-center print:text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Cant.</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Precio</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Desc.</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Imp.</div>
 <div className="flex items-center justify-end text-right py-2 print:py-1 pr-2">Monto</div>
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
 lineItems={lineItems}
 />
 ))}
 </div>
 
 <div className="mt-4 flex gap-3 print:hidden">
 <button onClick={() => setShowProductModal(true)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 flex gap-2 items-center"><Search size={14} /> Catálogo</button>
 <button onClick={() => setLineItems(prev => [...prev, emptyLine()])} className="px-4 py-2 border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 flex gap-2 items-center"><Plus size={14} /> Fila</button>
 <button onClick={() => setLineItems(prev => [...prev, emptySectionLine()])} className="px-4 py-2 border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 flex gap-2 items-center"><Plus size={14} /> Sección</button>
 </div>
 </div>
 </div>

 {/* Totals Section */}
 <div className="flex flex-col md:flex-row justify-between mb-4 mt-6 print:mt-1 gap-8 print:flex-row print:justify-between print:gap-4 print:break-inside-avoid">
 {/* Notes section left */}
 <div className="flex-1 print:w-[400px] mt-auto">
 <div className="text-sm">
 <p className="font-bold mb-1 text-xs">Nota / Plazo de pago:</p>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 rows={5}
 className="w-full text-[11px] border border-gray-300 p-2 resize-y min-h-[80px] focus:outline-none whitespace-pre-wrap break-words print:hidden"
 data-pdf-hide
 placeholder="Pago inmediato..."
 />
 <div className="hidden print:block text-[11px] whitespace-pre-wrap break-words w-full" data-pdf-show>{notes || paymentTerms}</div>
 </div>
 </div>

 {/* Totals table right */}
 <div className="w-full md:w-80 print:w-72 border-t border-gray-300 pt-2 print:shrink-0">
 <div className={`flex flex-col text-[11px] ${settings?.subtotalsBorder ? 'border border-b-0' : 'gap-0.5'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? (isGrouped ? 'px-2 py-0.5' : 'border-r px-2 py-0.5') : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-gray-600 font-medium`} style={subtotalStyle}>Sub-Total</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-0.5' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.subtotal)}</span>
 </div>
 </div>
 {totals.descuentos > 0 && (
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? (isGrouped ? '' : 'border-b') : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-0.5' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-gray-600 font-medium`} style={subtotalStyle}>Total Descuento</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-0.5' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass} text-red-600`} style={subtotalStyle}>-{fmt(totals.descuentos)}</span>
 </div>
 </div>
 )}
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? (isGrouped ? '' : 'border-b') : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-0.5' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-gray-600 font-medium`} style={subtotalStyle}>Total Exento</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-0.5' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.exento)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? (isGrouped ? '' : 'border-b') : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-0.5' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-gray-600 font-medium`} style={subtotalStyle}>Total Exonerado</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-0.5' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.exonerado)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? (isGrouped ? '' : 'border-b') : 'justify-between items-center'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-0.5' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-gray-600 font-medium`} style={subtotalStyle}>Total Gravado 15%</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-0.5' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.gravado15)}</span>
 </div>
 </div>
 <div className={`flex items-stretch ${settings?.subtotalsBorder ? 'border-b' : 'justify-between items-center border-b border-gray-300 pb-1'}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <div className={`flex-1 flex items-center ${settings?.subtotalsBorder ? 'border-r px-2 py-0.5' : ''}`} style={settings?.subtotalsBorder ? { borderColor: settings.tableBorderColor || '#1e293b' } : {}}>
 <span className={`${subtotalSizeClass} text-gray-600 font-medium`} style={subtotalStyle}>Total ISV 15%</span>
 </div>
 <div className={`w-[110px] flex items-center justify-end ${settings?.subtotalsBorder ? 'px-2 py-0.5' : ''}`}>
 <span className={`${subtotalSizeClass} ${monoClass}`} style={subtotalStyle}>{fmt(totals.isv15)}</span>
 </div>
 </div>

 
    <div 
    className={`flex justify-between items-center px-3 py-1.5 mt-1 rounded-sm shadow-sm print:border-t-2 print:border-b-2 print:border-solid print:py-1 print:px-3 ${settings?.subtotalsBorder && isGrouped ? 'border-x border-b border-t rounded-t-none mt-0' : ''}`}
    style={{
      backgroundColor: settings.totalBgColor || '#0f172a',
      color: settings.totalTextColor || '#ffffff',
      borderColor: settings.totalBgColor || '#0f172a',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact'
    }}
  >
  <span className="font-bold print:font-black" style={totalLabelStyle}>TOTAL</span>
  <span className={`font-bold print:font-black ${totalSizeClass} ${monoClass}`} style={totalStyle}>{fmt(totals.total)}</span>
  </div>
  </div>
 </div>
 </div>

 {/* Actions (Non-printable) */}
 <div className="mt-8 mb-4 flex justify-end print:hidden">
 <button 
 onClick={handleSave}
 disabled={isSaving}
 className={`px-8 py-3 text-white font-bold uppercase text-sm rounded ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
 >
 {isSaving ? 'Guardando...' : `Guardar ${currentDocType.label}`}
 </button>
 </div>

  {/* Spacer to push the footer naturally in flex views if needed */}
  <div className="flex-1" />

  {/* Signatures and Seals */}
  <InvoiceSignaturesAndSeals settings={settings} clienteSignature={props.clienteSignature} />

 {/* Footer */}
 <InvoiceFooter
 settings={settings}
 organization={organization}
 className="print:mt-auto print:mb-0 print:px-12"
 />

 </div>
 </div>
 );
}
