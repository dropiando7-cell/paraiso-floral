import React from 'react';
import { Search, Plus, Percent, Stethoscope } from 'lucide-react';
import { TemplateProps } from './TemplateProps';
import InvoiceFooter from './InvoiceFooter';

export default function MinimalistTemplate(props: TemplateProps) {
 const {
 settings, organization, docNumber, docType, currentDocType, docTypeStatusConfig,
 today, futureDate, selectedClient, setShowClientModal, paymentTerms, setPaymentTerms,
 validityDays, setValidityDays, lineItems, handleLineChange, handleDeleteLine, handleDuplicateLine,
 handleToggleLongDesc, allProducts, emptyLine, emptySectionLine, setLineItems, setShowProductModal,
 notes, setNotes, totals, handleSave, isSaving, fmt, LineItemRowComponent, viewMode
 } = props;

 const fontClass = settings.fontFamily || 'font-sans';
 const colorMap: Record<string, string> = {
 'blue-600': 'text-blue-600 border-blue-600',
 'emerald-600': 'text-emerald-600 border-emerald-600',
 'violet-600': 'text-violet-600 border-violet-600',
 'slate-800': 'text-slate-900 border-slate-900',
 'rose-600': 'text-rose-600 border-rose-600',
 };
 const themeText = colorMap[settings.colorTheme]?.split(' ')[0] || 'text-slate-900';

 const renderLogo = () => (
 <div className={`mb-6 flex ${settings.logoPosition === 'center' ? 'justify-center' : settings.logoPosition === 'right' ? 'justify-end' : ''}`}>
 {organization?.logoUrl ? (
 <img src={organization.logoUrl} alt={organization.name || 'Logo'} className={`w-auto object-contain ${settings.logoSize === 'small' ? 'h-8' : settings.logoSize === 'large' ? 'h-20' : 'h-12'}`} />
 ) : (
 <div className={`flex items-center justify-center ${settings.logoSize === 'small' ? 'w-8 h-8' : settings.logoSize === 'large' ? 'w-20 h-20' : 'w-12 h-12'}`}>
 <Stethoscope size={settings.logoSize === 'small' ? 24 : settings.logoSize === 'large' ? 48 : 32} className={themeText} />
 </div>
 )}
 </div>
 );

 return (
 <div className={`flex flex-col min-h-[1056px] flex-1 print:flex space-y-4 print:space-y-0 print:m-0 print:pb-24 ${fontClass} bg-white max-w-4xl mx-auto shadow-sm print:shadow-none`}>
 <div className="flex flex-col flex-1 p-8 md:p-14 print:p-0">
 
 {/* Header Block Minimal */}
 <div className={`flex flex-col print:flex-row sm:flex-row justify-between items-start gap-6 print:gap-4 mb-10 print:mb-6`}>
 <div className={`flex-1 ${settings.logoPosition === 'center' ? 'text-center' : settings.logoPosition === 'right' ? 'text-right' : 'text-left'}`}>
 {settings.logoPosition !== 'right' && renderLogo()}
 <h1 className={`text-xl font-light text-slate-800 ${settings.logoPosition === 'center' ? 'mx-auto' : ''}`}>{organization?.name || 'Comercial'}</h1>
 <div className="text-[11px] text-slate-400 mt-2 space-y-1">
 {organization?.direccion && <p>{organization.direccion}</p>}
 <p>
 {organization?.rtn && `${organization.rtn}`}
 {organization?.rtn && organization?.telefono && ' · '}
 {organization?.telefono && `${organization.telefono}`}
 </p>
 {organization?.correoContacto && <p>{organization.correoContacto}</p>}
 </div>
 {settings.logoPosition === 'right' && renderLogo()}
 </div>
 
 <div className="print:text-right sm:text-right">
 <h2 className={`text-2xl font-light tracking-wide ${themeText}`}>{currentDocType.label}</h2>
 <p className="font-semibold text-slate-500 mt-1">{docNumber}</p>
 <div className="mt-6 text-[11px] text-slate-400 space-y-1.5">
 <p>Emisión: <span className="font-medium text-slate-800">{today}</span></p>
 <p>Vencimiento: <span className="font-medium text-slate-800">{futureDate(validityDays)}</span></p>
 </div>
 </div>
 </div>

 {/* Client Block Minimal */}
 <div className="flex flex-col print:flex-row sm:flex-row justify-between gap-6 print:gap-4 mb-10 print:mb-6">
 <div className="flex-1">
 <p className="text-[10px] text-slate-400 uppercase mb-1">Facturar A</p>
 <button onClick={() => setShowClientModal(true)} className="text-left group w-full">
 <p className={`font-semibold text-base ${selectedClient ? 'text-slate-800' : 'text-slate-300'} group-hover:${themeText} transition-colors`}>{selectedClient?.name || 'Seleccionar cliente...'}</p>
 {selectedClient && <p className="text-xs text-slate-500 mt-1">{selectedClient.rtn || 'RTN No Disponible'}</p>}
 </button>
 </div>
 
 <div className="w-full sm:w-48 print:w-48 sm:text-right print:text-right">
 <p className="text-[10px] text-slate-400 uppercase mb-1">Pago</p>
 <select
 value={paymentTerms}
 onChange={e => setPaymentTerms(e.target.value)}
 className="w-full sm:text-right print:text-right bg-transparent text-slate-800 text-sm p-0 border-none focus:ring-0 print:appearance-none cursor-pointer font-medium mb-1"
 >
 <option value="Contado">Contado</option>
 <option value="15 días netos">15 días netos</option>
 <option value="30 días netos">30 días netos</option>
 <option value="60 días netos">60 días netos</option>
 <option value="90 días netos">90 días netos</option>
 </select>
 <div className="flex items-center justify-start sm:justify-end print:justify-end gap-2">
 <span className="text-[10px] text-slate-400">Validez:</span>
 <input
 type="number"
 value={validityDays}
 onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
 className="w-8 border-none bg-transparent text-sm font-medium text-slate-800 p-0 text-right focus:ring-0 print:p-0"
 />
 </div>
 </div>
 </div>

 {/* Items Table Minimal */}
 <div className="mb-12 relative z-50 print:mb-6">
 <div className="flex items-center gap-2 mb-3 px-2 border-b border-slate-100 pb-2 print:px-0">
 <div className="w-4 shrink-0 print:hidden" />
 {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && <div className="w-10 shrink-0" />}
 <div className={`flex-1 grid grid-cols-[18fr_30fr_9fr_18fr_14fr_15fr_16fr] gap-2 text-[10px] uppercase font-semibold text-slate-400`}>
 <div className="text-center">Código</div>
 <div className="text-center">Descripción</div>
 <div className="text-center print:text-left">Cant.</div>
 <div className="text-center">Precio</div>
 <div className="text-center">Desc.</div>
 <div className="text-center">Imp</div>
 <div className="text-right pr-2">Monto</div>
 </div>
 <div className="w-6 shrink-0 print:hidden" />
 </div>

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
 
 <div className="mt-4 flex gap-3 print:hidden">
 <button onClick={() => setShowProductModal(true)} className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 rounded flex gap-2 items-center"><Search size={14} /> Catálogo</button>
 <button onClick={() => setLineItems(prev => [...prev, emptyLine()])} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 rounded flex gap-2 items-center"><Plus size={14} /> Fila</button>
 <button onClick={() => setLineItems(prev => [...prev, emptySectionLine()])} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 rounded flex gap-2 items-center"><Plus size={14} /> Sección</button>
 </div>
 </div>

 {/* Footer Minimal */}
 <div className="pt-8 print:pt-1 print:flex print:break-inside-avoid">
 <div className="flex-1 print:float-left print:w-[50%]">
 <p className="text-[10px] text-slate-400 uppercase mb-2">Notas</p>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 rows={3}
 className="w-full text-xs border-none bg-slate-50 p-4 resize-none focus:ring-0 text-slate-600 rounded-2xl print:hidden"
 placeholder="Condiciones de pago..."
 />
 <div className="hidden print:flex text-[11px] text-slate-500 whitespace-pre-wrap">
 {notes}
 </div>
 </div>

 <div className="w-full md:w-64 print:float-right print:w-[40%]">
 <div className="space-y-3 text-sm">
 <div className="flex justify-between text-slate-500">
 <span>Subtotal L.</span>
 <span>{fmt(totals.subtotal)}</span>
 </div>
 <div className="flex justify-between text-slate-500">
 <span>Total descuentos y rebajas L.</span>
 <span className="text-red-400">-{fmt(totals.descuentos)}</span>
 </div>
 <div className="flex justify-between items-start text-slate-500">
 <div className="flex flex-col">
 <span>Total exento L.</span>
 </div>
 <div className="flex items-center gap-2">
 <span>{fmt(props.totals.exento)}</span>
 </div>
 </div>
 <div className="flex justify-between items-start text-slate-500">
 <div className="flex flex-col">
 <span>Total exonerado L.</span>
 </div>
 <div className="flex items-center gap-2">
 <span>{fmt(props.totals.exonerado)}</span>
 </div>
 </div>
 <div className="flex justify-between text-slate-500">
 <span>Total gravado 15% L.</span>
 <span>{fmt(totals.gravado15)}</span>
 </div>
 <div className="flex justify-between text-slate-500">
 <span>Total ISV 15% L.</span>
 <span>{fmt(totals.isv15)}</span>
 </div>
 <div className="flex justify-between text-slate-500">
 <span>Total gravado 18% L.</span>
 <span>{fmt(totals.gravado18)}</span>
 </div>
 <div className="flex justify-between text-slate-500 pb-3 border-b border-slate-100">
 <span>Total ISV 18% L.</span>
 <span>{fmt(totals.isv18)}</span>
 </div>
 <div className="flex justify-between items-end pt-1">
 <span className="text-[11px] text-slate-400 uppercase mb-1">Total L.</span>
 <span className={`text-2xl font-light ${themeText}`}>{fmt(totals.total)}</span>
 </div>
 </div>

 <div className="mt-8 print:hidden">
 <button 
 onClick={handleSave}
 disabled={isSaving}
 className={`w-full py-4 text-white rounded-full text-sm font-medium transition-opacity ${isSaving ? 'bg-slate-300' : 'bg-slate-900 hover:opacity-90'}`}
 >
 {isSaving ? '...' : 'Generar'}
 </button>
 </div>
 </div>
 <div className="clear-both print:flex"></div>
 </div>

 {/* Spacer to push footer down in html2canvas */}
 <div className="flex-1 print:hidden" />

 {/* Footer */}
 <InvoiceFooter settings={settings} organization={organization} className="print:mt-auto print:mb-0 print:px-12" />

 </div>
 </div>
 );
}
