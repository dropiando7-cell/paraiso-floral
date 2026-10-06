import React, { useState, useEffect } from 'react';
import { TemplateProps } from './TemplateProps';

export default function TicketTemplate(props: TemplateProps) {
  const {
    settings, organization, docNumber, docType, currentDocType,
    today, selectedClient, lineItems, totals, fmt,
    numeroCAI, rangoAutorizado, fechaLimiteEmision, isSar, nombreUsuario
  } = props;

  const fontClass = settings.fontFamily || 'font-mono';

  // Format date
  const [currentDateStr, setCurrentDateStr] = useState('');
  useEffect(() => {
    setCurrentDateStr(new Date().toLocaleDateString('es-HN', { hour: '2-digit', minute:'2-digit' }));
  }, []);

  const fechaLimiteFormatted = fechaLimiteEmision ? (typeof fechaLimiteEmision === 'string' ? fechaLimiteEmision.split('T')[0] : new Date(fechaLimiteEmision).toLocaleDateString('es-HN')) : null;

  return (
    <div className={`w-[80mm] p-2 text-black mx-auto text-[10px] bg-white print:m-0 print:p-0 ${fontClass}`}>
      <div className="text-center mb-3">
        <h1 className="font-black text-base leading-tight uppercase">{organization?.name || 'Distribuidora Paraíso Floral'}</h1>
        {organization?.direccion ? (
          <p className="text-[9.5px] mt-0.5">{organization.direccion}</p>
        ) : (
          <p className="text-[9.5px] mt-0.5">San Pedro Sula, Honduras</p>
        )}
        {organization?.telefono && <p className="text-[9.5px]">Tel: {organization.telefono}</p>}
        {organization?.rtn && <p className="text-[9.5px] font-mono">RTN: {organization.rtn}</p>}
        {organization?.correoContacto && <p className="text-[9px]">{organization.correoContacto}</p>}
        
        {/* Bloque Fiscal SAR */}
        {numeroCAI && (
          <div className="my-2 py-1.5 px-1 border-y border-dashed border-black text-left text-[9px] space-y-0.5 font-mono">
            <p className="break-all leading-tight"><strong>CAI:</strong> {numeroCAI}</p>
            {rangoAutorizado && <p className="leading-tight"><strong>Rango Aut.:</strong> {rangoAutorizado}</p>}
            {fechaLimiteFormatted && <p className="leading-tight"><strong>Fecha Límite:</strong> {fechaLimiteFormatted}</p>}
          </div>
        )}

        <p className="text-xs mt-2 font-bold font-mono uppercase">{currentDocType.label} Nº: {docNumber}</p>
        <p className="text-[9.5px] border-b border-dashed border-black pb-1.5 mb-1.5">Fecha: {currentDateStr || today}</p>
        <p className="text-[9.5px] text-left">Cliente: {selectedClient?.name || 'Consumidor Final'}</p>
        {selectedClient?.rtn && <p className="text-[9.5px] text-left font-mono">RTN Cliente: {selectedClient.rtn}</p>}
        <p className="text-[9.5px] text-left">Usuario: {nombreUsuario || 'Administrador'}</p>
      </div>
      
      <table className="w-full mb-3 text-[10px]">
        <thead>
          <tr className="border-y border-dashed border-black">
            <th className="text-left font-normal pb-0.5 pt-0.5">CANT</th>
            <th className="text-left font-normal pb-0.5 pt-0.5 px-1">DESCRIPCIÓN</th>
            <th className="text-right font-normal pb-0.5 pt-0.5">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, idx) => (
            <tr key={idx} className="align-top">
              <td className="pt-1.5">{item.qty}</td>
              <td className="pt-1.5 px-1 pr-2 truncate max-w-[40mm] whitespace-pre-wrap">
                {item.shortDesc}
                {item.taxState === 'exento' && <span className="ml-1 text-[8px] font-bold">(E)</span>}
                {item.taxState === 'exonerado' && <span className="ml-1 text-[8px] font-bold">(EXO)</span>}
                {item.taxState === 'isv18' && <span className="ml-1 text-[8px] font-bold">(18%)</span>}
                {item.price > 0 && <span className="block text-[8.5px] mt-0.5 text-gray-600">L.{item.price} c/u {item.discount > 0 && <span className="text-black font-bold uppercase ml-1">-{item.discount}%</span>}</span>}
              </td>
              <td className="text-right pt-1.5">{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-[10px] border-t border-dashed border-black pt-1.5 flex flex-col gap-0.5 w-full items-end pb-3 border-b">
        <div className="flex w-[85%] justify-between"><span className="uppercase">Sub Total:</span><span>{fmt(totals.subtotal)}</span></div>
        {totals.descuentos > 0 && <div className="flex w-[85%] justify-between text-gray-700"><span>Descuentos:</span><span>-{fmt(totals.descuentos)}</span></div>}
        {totals.exento > 0 && <div className="flex w-[85%] justify-between text-gray-700"><span>Exento:</span><span>{fmt(totals.exento)}</span></div>}
        {totals.exonerado > 0 && <div className="flex w-[85%] justify-between text-gray-700"><span>Exonerado:</span><span>{fmt(totals.exonerado)}</span></div>}
        <div className="flex w-[85%] justify-between"><span className="uppercase">ISV (15%):</span><span>{fmt(totals.isv15)}</span></div>
        {totals.isv18 > 0 && <div className="flex w-[85%] justify-between"><span className="uppercase">ISV (18%):</span><span>{fmt(totals.isv18)}</span></div>}
        
        <div className="flex w-full justify-between font-black text-sm uppercase mt-1 border-t border-black pt-1">
          <span>TOTAL:</span><span>{fmt(totals.total)}</span>
        </div>
        
        {props.paymentMethod === 'MIXTO' && props.pagosMixtos && props.pagosMixtos.length > 0 && (
          <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-400">
            <p className="font-bold text-center mb-1 uppercase text-[9px]">Desglose de Pago Mixto</p>
            {props.pagosMixtos.map((p, idx) => (
              <div key={idx} className="flex justify-between w-full text-[9px] mb-0.5">
                <span className="uppercase">{p.metodoPago || p.metodo}:</span>
                <span className="font-mono">L. {Number(p.monto).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center mt-3 text-[9.5px] leading-tight text-slate-600 border-t border-dashed border-black pt-2 space-y-0.5 font-sans">
        <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">ORIGINAL: CLIENTE</p>
        <p className="font-bold text-[9px] text-slate-800">LA FACTURA ES BENEFICIO DE TODOS, EXÍJALA</p>
        <p className="text-[8.5px] text-slate-500 mt-1">¡Gracias por su compra!</p>
      </div>
    </div>
  );
}
