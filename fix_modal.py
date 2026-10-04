import sys

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

modal_html = '''
      {/* Modal Preview Ticket */}
      {ticketPreview && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-[380px] flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
             <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
               <div className="flex items-center gap-2 text-slate-800 font-bold">
                 <FileText size={18} className="text-emerald-500" />
                 <span>Vista Previa del Ticket</span>
               </div>
               <button onClick={() => setTicketPreview(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center">
                <div className="bg-white shadow-sm border border-slate-200" style={{ width: '80mm', minHeight: '100px' }}>
                   <iframe src={`/facturas/ver/${ticketPreview.id}?print=ticket&silent=true`} className="w-full h-[600px] border-0" />
                </div>
             </div>

             <div className="p-4 bg-white border-t border-slate-100">
                <button
                  onClick={async () => {
                    try {
                        const toastId = toast.loading('Enviando a cola de tickets...');
                        const res = await fetch('/api/impresion/tickets/encolar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ docId: ticketPreview.id })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            toast.success('Ticket enviado exitosamente', { id: toastId });
                            setTicketPreview(null);
                        } else {
                            toast.error(data.error || 'Error al encolar', { id: toastId });
                        }
                    } catch (e) {
                        toast.error('Error de red al imprimir');
                    }
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={18} />
                  <span>Imprimir Ticket Ahora</span>
                </button>
             </div>
          </div>
        </div>
      )}
'''

c = c.replace('{/* Modal Enviar Email */}', modal_html + '\n      {/* Modal Enviar Email */}')

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
