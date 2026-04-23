import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { TemplateProps } from './TemplateProps';
import InvoiceFooter from './InvoiceFooter';

export default function LegacyTemplate(props: TemplateProps) {
 const {
 settings, organization, docNumber, docType, currentDocType,
 today, futureDate, selectedClient, paymentTerms,
 validityDays, lineItems, handleLineChange, handleDeleteLine, handleDuplicateLine,
 handleToggleLongDesc, allProducts, emptyLine, emptySectionLine, setLineItems, setShowProductModal,
 notes, setNotes, totals, handleSave, isSaving, fmt, LineItemRowComponent,
 setShowClientModal, docTypeStatusConfig, setValidityDays, setPaymentTerms, viewMode
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
 
 // Use state for the date string to avoid SSR/client hydration mismatch
 const [currentDateStr, setCurrentDateStr] = useState(today.split('-').reverse().join('/'));
 useEffect(() => {
 const now = new Date();
 const time = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
 setCurrentDateStr(`${today.split('-').reverse().join('/')} ${time}`);
 }, [today]);

 return (
 <div className={`flex flex-col min-h-[1056px] print:min-h-[26.2cm] space-y-4 print:space-y-0 print:m-0 print:pb-0 ${fontClass} bg-white max-w-4xl mx-auto shadow-md border border-slate-300 print:border-none print:shadow-none`}>
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

 {/* Metadata Grid (Compressed into 4 columns) */}
 <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
 <div className="flex flex-col">
 <span className={`font-bold text-sm ${theme.text} leading-tight uppercase`}>
 {currentDocType.label}
 <br/>
 <span className="text-slate-800">{docNumber}</span>
 </span>
 <span className="text-gray-600 mt-1">Fecha: {currentDateStr}</span>
 </div>
 
 <div className="flex flex-col border-l border-slate-200 pl-3">
 <span className="font-bold uppercase text-slate-800">Comercial:</span>
 <span className="text-gray-600 mt-1">{props.nombreUsuario || 'Administrador (BEA)'}</span>
 </div>
 
 <div className="flex flex-col border-l border-slate-200 pl-3">
 <span className="font-bold uppercase text-slate-800">Términos de pago:</span>
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
 <span className="hidden print:flex text-gray-600 mt-1">{paymentTerms}</span>
 </div>

 <div className="flex flex-col border-l border-slate-200 pl-3 cursor-pointer" onClick={() => setShowClientModal(true)}>
 <span className="font-bold uppercase text-slate-800 mb-1">Cliente:</span>
 {selectedClient ? (
 <div className="text-[10px] leading-tight text-slate-700">
 <span className={`font-bold text-xs ${theme.text} block mb-0.5`}>{selectedClient.name}</span>
 <span className="block line-clamp-2">{selectedClient.address || selectedClient.city}</span>
 {selectedClient.rtn && <span className="block mt-0.5 font-mono">RTN: {selectedClient.rtn}</span>}
 </div>
 ) : (
 <span className="font-bold text-rose-600 italic print:hidden mt-1">Seleccionar...</span>
 )}
 </div>
 </div>

 {/* Items Table */}
 <div className="mb-8 relative">
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
 className={`flex flex-col relative z-10 bg-transparent ${settings?.tableRoundedBorders ? 'rounded-xl overflow-hidden' : ''}`}
 >
 <div 
 className={`flex items-stretch gap-2 px-4 print:px-4 ${settings?.tableRoundedBorders ? 'rounded-t-xl' : ''}`}
 style={{ 
 backgroundColor: settings?.tableHeaderBg || '#f3f4f6', // gray-100 default for legacy
 borderBottomWidth: settings?.showTableBorders ? (settings.tableBorderThickness || '1px') : '0px',
 borderColor: settings?.tableBorderColor || '#1e293b'
 }}
 >
 <div className="w-4 shrink-0 print:hidden" />
 {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && <div className="w-[34px] shrink-0" />}
 <div className={`flex-1 grid grid-cols-[20fr_30fr_9fr_20fr_9fr_12fr_20fr] gap-2 text-[10px] font-bold uppercase text-gray-800`}>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Código</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Descripción</div>
 <div className={`flex items-center justify-center text-center print:text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Cant.</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Precio</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Desc.</div>
 <div className={`flex items-center justify-center text-center py-2 print:py-1 `} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#1e293b' } : {}}>Imp.</div>
 <div className="flex items-center justify-center text-center py-2 print:py-1">Monto</div>
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
 <button onClick={() => setShowProductModal(true)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 flex gap-2 items-center"><Search size={14} /> Catálogo</button>
 <button onClick={() => setLineItems(prev => [...prev, emptyLine()])} className="px-4 py-2 border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 flex gap-2 items-center"><Plus size={14} /> Fila</button>
 <button onClick={() => setLineItems(prev => [...prev, emptySectionLine()])} className="px-4 py-2 border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 flex gap-2 items-center"><Plus size={14} /> Sección</button>
 </div>
 </div>
 </div>

 {/* Totals Section */}
 <div className="flex flex-col md:flex-row justify-between mb-4 mt-6 gap-8 print:flex-row print:justify-between print:gap-8 print:break-inside-avoid">
 {/* Notes section left */}
 <div className="flex-1 mt-auto">
 <div className="text-sm">
 <p className="font-bold mb-1 text-xs">Nota / Plazo de pago:</p>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 rows={3}
 className="w-full text-[11px] border border-gray-300 p-2 resize-none focus:outline-none print:hidden"
 placeholder="Pago inmediato..."
 />
 <div className="hidden print:flex text-[11px] whitespace-pre-wrap">{notes || paymentTerms}</div>
 </div>
 </div>

 {/* Totals table right */}
 <div className="w-full md:w-80 print:w-72 border-t border-gray-300 pt-2 print:shrink-0">
 <div className="flex flex-col gap-0.5 text-[11px]">
 <div className="flex justify-between items-center">
 <span className="text-gray-600 font-medium">Sub-Total</span>
 <span className="font-mono">{fmt(totals.subtotal)}</span>
 </div>
 {totals.descuentos > 0 && (
 <div className="flex justify-between items-center">
 <span className="text-gray-600 font-medium">Total Descuento</span>
 <span className="font-mono text-red-600">-{fmt(totals.descuentos)}</span>
 </div>
 )}
 <div className="flex justify-between items-center">
 <span className="text-gray-600 font-medium">Total Exento</span>
 <span className="font-mono">{fmt(totals.exento)}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-gray-600 font-medium">Total Exonerado</span>
 <span className="font-mono">{fmt(totals.exonerado)}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-gray-600 font-medium">Total Gravado 15%</span>
 <span className="font-mono">{fmt(totals.gravado15)}</span>
 </div>
 <div className="flex justify-between items-center border-b border-gray-300 pb-1">
 <span className="text-gray-600 font-medium">Total ISV 15%</span>
 <span className="font-mono">{fmt(totals.isv15)}</span>
 </div>
 
 <div 
    className="flex justify-between items-center px-3 py-1.5 mt-1 rounded-sm shadow-sm print:border-t-2 print:border-b-2 print:border-solid print:py-1 print:px-0"
    style={{
      backgroundColor: settings.totalBgColor || '#0f172a',
      color: settings.totalTextColor || '#ffffff',
      borderColor: settings.totalBgColor || '#0f172a'
    }}
  >
  <span className="font-bold print:font-black text-sm print:text-base">TOTAL</span>
  <span className="font-bold print:font-black font-mono text-base print:text-lg">{fmt(totals.total)}</span>
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

 {/* Footer */}
 <InvoiceFooter
 settings={settings}
 organization={organization}
 className="print:mt-auto print:mb-0 print:px-12 print:pb-0"
 />

 </div>
 </div>
 );
}
