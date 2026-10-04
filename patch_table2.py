import sys

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add directPrint state
if 'const [directPrint, setDirectPrint] = useState(false);' not in c:
    c = c.replace(
        'const [ticketPreview, setTicketPreview] = useState<DocumentRecord | null>(null);',
        'const [ticketPreview, setTicketPreview] = useState<DocumentRecord | null>(null);\n  const [directPrint, setDirectPrint] = useState(false);\n  useEffect(() => { setDirectPrint(localStorage.getItem(\'pos_direct_print\') === \'true\'); }, []);'
    )

new_onclick = '''onClick={async () => {
                    if (directPrint) {
                        try {
                            const toastId = toast.loading('Enviando a cola de tickets...');
                            const res = await fetch('/api/impresion/tickets/encolar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ docId: docToPrint.id })
                            });
                            const data = await res.json();
                            if (res.ok) {
                                toast.success('Ticket enviado exitosamente', { id: toastId });
                                setDocToPrint(null);
                            } else {
                                toast.error(data.error || 'Error al encolar', { id: toastId });
                            }
                        } catch (e) {
                            toast.error('Error de red al imprimir');
                        }
                    } else {
                        setTicketPreview(docToPrint); 
                        setDocToPrint(null); 
                    }
                  }}'''

c = c.replace('onClick={() => { setTicketPreview(docToPrint); setDocToPrint(null); }}', new_onclick)
c = c.replace('<span className="text-xs font-bold">Ticket (Vista Previa)</span>', '<span className="text-xs font-bold">Ticket ({directPrint ? \'Directo\' : \'Vista Previa\'})</span>')


# Replace the iframe with the actual visual receipt
old_iframe_block = '''<div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center">
                <div className="bg-white shadow-sm border border-slate-200" style={{ width: '80mm', minHeight: '100px' }}>
                   <iframe src={`/facturas/ver/${ticketPreview.id}?print=ticket&silent=true`} className="w-full h-[600px] border-0" />
                </div>
             </div>'''

new_ticket_html = '''<div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center">
                <div className="bg-white shadow-sm border border-slate-200 font-mono text-[11px] leading-tight text-black p-4" style={{ width: '80mm', minHeight: '100px' }}>
                   <div className="text-center font-bold text-sm mb-2">Vortek POS</div>
                   <div className="text-center mb-4">
                       San Pedro Sula, Cortés<br/>
                       RTN: 050190123456<br/>
                       TEL: +504 94897451
                   </div>
                   <div className="mb-2">
                       Factura: {ticketPreview.correlativo}<br/>
                       Fecha: {new Date(ticketPreview.fechaEmision).toLocaleDateString()}<br/>
                       Cliente: {ticketPreview.clienteNombre}<br/>
                       RTN: {ticketPreview.clienteRtn || 'Consumidor Final'}
                   </div>
                   <div className="border-t border-b border-dashed border-black py-2 mb-2">
                       <div className="flex justify-between font-bold mb-1">
                           <span>DESCRIPCION</span>
                           <span>TOTAL</span>
                       </div>
                       {ticketPreview.detalles?.map((d, i) => (
                           <div key={i} className="mb-1 flex justify-between">
                               <span className="pr-2">{d.cantidad}x {d.descripcion}</span>
                               <span>L. {Number(d.totalLinea).toFixed(2)}</span>
                           </div>
                       ))}
                   </div>
                   <div className="flex justify-between font-bold text-sm mb-4">
                       <span>TOTAL:</span>
                       <span>L. {Number(ticketPreview.total).toFixed(2)}</span>
                   </div>
                   <div className="text-center">
                       ¡GRACIAS POR SU COMPRA!<br/>
                       <span className="text-[9px]">Desarrollado por Soluciones Tecnológicas HN<br/>+504 94897451</span>
                   </div>
                </div>
             </div>'''

c = c.replace(old_iframe_block, new_ticket_html)

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
