import sys
import re

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

new_ticket = '''<div className="bg-white shadow-sm border border-slate-200 font-mono text-[11px] leading-tight text-black p-4" style={{ width: '80mm', minHeight: '100px' }}>
                     <div className="text-center font-bold text-sm mb-2 uppercase">Distribuidora Paraíso Floral, S. de R.L.</div>
                     <div className="text-center mb-4 uppercase">
                         RTN: 05019023491749<br/>
                         8 Calle, 9 Avenida NO, Barrio Guamilito,<br/>
                         San Pedro Sula, Cortes<br/>
                     </div>
                     <div className="mb-2 uppercase">
                         FACTURA NO: {ticketPreview.correlativo}<br/>
                         FECHA: {new Date(ticketPreview.fechaEmision).toLocaleString('es-HN')}<br/>
                         CAI: {ticketPreview.cai || 'N/A'}<br/>
                         CLIENTE: {ticketPreview.clienteNombre || 'CONSUMIDOR FINAL'}<br/>
                         {ticketPreview.clienteRtn && <>RTN CLIENTE: {ticketPreview.clienteRtn}<br/></>}
                     </div>
                     <div className="border-t border-b border-dashed border-black py-2 mb-2 uppercase">
                         <div className="flex justify-between font-bold mb-1">
                             <span>CANT DESCRIPCION</span>
                             <span>TOTAL</span>
                         </div>
                         {ticketPreview.detalles?.map((d, i) => {
                             let n = d.nombre || d.productoNombre || d.descripcion || '';
                             n = n.split('\\n')[0];
                             if (n.includes('Producto registrado')) n = n.split('Producto registrado')[0];
                             return (
                                 <div key={i} className="mb-1 flex justify-between">
                                     <span className="pr-2 w-[70%]">{d.cantidad} <span className="pl-1">{n.trim()}</span></span>
                                     <span className="w-[30%] text-right">L {Number(d.totalLinea || d.total || 0).toFixed(2)}</span>
                                 </div>
                             )
                         })}
                     </div>
                     <div className="flex flex-col items-end text-sm mb-4 uppercase space-y-1">
                         <div className="flex justify-between w-[70%]">
                             <span>SUBTOTAL:</span>
                             <span>L {Number(ticketPreview.subTotal || 0).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between w-[70%]">
                             <span>IMPUESTO:</span>
                             <span>L {Number((ticketPreview.totalGravado15 || 0) * 0.15 + (ticketPreview.totalGravado18 || 0) * 0.18).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between w-[70%] font-bold text-base mt-2">
                             <span>TOTAL:</span>
                             <span>L {Number(ticketPreview.total || 0).toFixed(2)}</span>
                         </div>
                     </div>
                     <div className="text-center">
                         *** GRACIAS POR SU COMPRA ***<br/>
                         <span className="text-[9px]">Desarrollado por Soluciones Tecnológicas HN<br/>+504 94897451</span>
                     </div>
                  </div>'''

c = re.sub(r'<div className="bg-white shadow-sm border border-slate-200 font-mono text-\[11px\].*?</div>\s*</div>\s*</div>', new_ticket + '\n               </div>\n            </div>', c, flags=re.DOTALL)

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
