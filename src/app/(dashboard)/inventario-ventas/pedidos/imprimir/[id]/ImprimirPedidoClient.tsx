'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, FileText, Receipt } from 'lucide-react';
import { Pedido } from '@/types/pedido';

interface ImprimirPedidoClientProps {
  dbUser: any;
  pedido: Pedido;
}

export default function ImprimirPedidoClient({
  dbUser,
  pedido
}: ImprimirPedidoClientProps) {
  const router = useRouter();
  const [format, setFormat] = useState<'ticket' | 'carta'>('ticket');

  // Trigger print dialog automatically after styles load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, [format]);

  const formattedDate = new Date(pedido.createdAt).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-slate-100 min-h-screen text-slate-900 font-sans pb-10 print:bg-white print:p-0 print:pb-0">
      
      {/* Print settings top bar (hidden on physical print) */}
      <div className="print:hidden bg-white border-b border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <button
          onClick={() => router.push('/inventario-ventas/pedidos')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-950 font-bold text-sm px-4 py-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Volver a Pedidos
        </button>

        {/* Format Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFormat('ticket')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              format === 'ticket'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" /> Ticket (80mm)
          </button>
          <button
            onClick={() => setFormat('carta')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              format === 'carta'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" /> Hoja Carta
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.01]"
        >
          <Printer className="w-4 h-4" /> Imprimir Comanda
        </button>
      </div>

      {/* Printable Sheet Area */}
      <div className="max-w-[800px] mx-auto p-4 md:p-8 print:p-0 print:max-w-full print:w-full flex justify-center">
        
        {/* FORMAT 1: THERMAL TICKET (80mm) */}
        {format === 'ticket' && (
          <div className="w-[80mm] min-h-[120mm] bg-white p-4 border border-slate-200 print:border-none print:p-2 text-black text-xs font-mono tracking-tight print:w-full">
            
            {/* Header info */}
            <div className="text-center border-b border-dashed border-black pb-3">
              <h2 className="text-sm font-extrabold tracking-wide uppercase">PARAÍSO FLORAL</h2>
              <p className="text-[10px] mt-0.5 font-bold">Comanda de Picking / Preparación</p>
              <p className="text-[9px] text-slate-600 mt-1">{formattedDate}</p>
            </div>

            {/* General Info */}
            <div className="py-3 border-b border-dashed border-black space-y-1 text-[10px]">
              <div><span className="font-bold">Código:</span> {pedido.codigoPedido}</div>
              <div><span className="font-bold">Cliente:</span> {pedido.cliente.nombre}</div>
              {pedido.cliente.telefono && <div><span className="font-bold">Tel:</span> {pedido.cliente.telefono}</div>}
              <div><span className="font-bold">Destino:</span> {pedido.destino}</div>
              <div><span className="font-bold">Pago:</span> {pedido.estadoPago.toUpperCase().replace('_', ' ')}</div>
              {pedido.auxiliarAsignado && (
                <div><span className="font-bold">Auxiliar:</span> {pedido.auxiliarAsignado.nombre}</div>
              )}
            </div>

            {/* Picking checklist items */}
            <div className="py-3">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-black text-left font-bold">
                    <th className="pb-1 w-6">[ ]</th>
                    <th className="pb-1 text-center w-8">Cant</th>
                    <th className="pb-1">Producto</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 text-[11px] font-bold">[ ]</td>
                      <td className="py-2 text-center font-bold text-[11px]">{item.cantidadSolicitada}</td>
                      <td className="py-2 font-medium">
                        <div>{item.nombreProducto}</div>
                        {item.variedadTono && (
                          <div className="text-[9px] text-slate-700 italic">Color: {item.variedadTono}</div>
                        )}
                        {item.sustituidoPor && (
                          <div className="text-[9px] text-amber-700 font-bold">Sust: {item.sustituidoPor.nombreProducto}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {pedido.notas && (
              <div className="py-2 border-t border-dashed border-black text-[9px] italic">
                <span className="font-bold not-italic">Notas:</span> {pedido.notas}
              </div>
            )}

            {/* Footer summary */}
            <div className="border-t border-dashed border-black pt-3 text-center text-[9px] font-bold mt-2">
              <p>¡Gracias por tu servicio!</p>
              <p className="text-[8px] text-slate-500 mt-1">Paraíso Floral ERP v1.0</p>
            </div>
          </div>
        )}

        {/* FORMAT 2: LETTER SHEET (Hoja Carta) */}
        {format === 'carta' && (
          <div className="w-full max-w-[800px] bg-white p-8 border border-slate-200 rounded-2xl shadow-sm print:shadow-none print:border-none print:p-0 print:max-w-full print:w-full text-sm">
            
            {/* Header with Letterhead logo */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-600 text-white font-black text-2xl flex items-center justify-center rounded-2xl shadow-sm shrink-0">
                  PF
                </div>
                <div>
                  <h1 className="text-xl font-black text-emerald-800 tracking-tight">PARAÍSO FLORAL</h1>
                  <p className="text-xs text-slate-500 font-bold">CEDI - Centro de Distribución y Ventas</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Barrio Guamilito, San Pedro Sula, Honduras.</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-extrabold text-slate-800 tracking-wide uppercase">HOJA DE PICKING & COMANDA</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">Código: {pedido.codigoPedido}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Impreso: {formattedDate}</p>
              </div>
            </div>

            {/* Grid Client & Order Info */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 text-xs font-semibold">
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">DATOS DEL CLIENTE</span>
                <div><span className="text-slate-500">Nombre:</span> <span className="text-slate-900 font-bold">{pedido.cliente.nombre}</span></div>
                {pedido.cliente.telefono && <div><span className="text-slate-500">Teléfono:</span> <span className="text-slate-950">{pedido.cliente.telefono}</span></div>}
                <div><span className="text-slate-500">Dirección:</span> <span className="text-slate-950 font-normal">{pedido.cliente.direccion || 'N/A'}</span></div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">DATOS DE ENTREGA & LOGÍSTICA</span>
                <div><span className="text-slate-500">Destino de Ruta:</span> <span className="text-slate-900 font-bold">{pedido.destino}</span></div>
                <div><span className="text-slate-500">Condición de Pago:</span> <span className="text-slate-900 font-bold capitalize">{pedido.estadoPago.replace('_', ' ')}</span></div>
                {pedido.auxiliarAsignado && (
                  <div><span className="text-slate-500">Auxiliar de Bodega:</span> <span className="text-slate-900 font-bold">{pedido.auxiliarAsignado.nombre}</span></div>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="mb-8">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">[ ]</th>
                    <th className="p-3 w-28">Código SKU</th>
                    <th className="p-3">Producto / Flores</th>
                    <th className="p-3 w-24 text-center">Variedad / Color</th>
                    <th className="p-3 w-28 text-center">Cant. Solicitada</th>
                    <th className="p-3 w-28 text-center">Cant. Preparada</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                      <td className="p-3 text-center text-sm font-bold">[ ]</td>
                      <td className="p-3 font-mono font-bold text-slate-500">{item.codigoBarras || 'N/A'}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {item.nombreProducto}
                        {item.sustituidoPor && (
                          <div className="text-[10px] text-amber-700 font-bold mt-1">
                            Sustituido por: {item.sustituidoPor.nombreProducto}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center text-slate-500 font-bold">{item.variedadTono || 'Surtido'}</td>
                      <td className="p-3 text-center font-bold">{item.cantidadSolicitada} paquetes</td>
                      <td className="p-3 text-center text-slate-400 font-bold">________</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {pedido.notas && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs italic mb-8">
                <span className="font-extrabold not-italic text-slate-800 uppercase text-[10px] tracking-wider block mb-1">NOTAS Y OBSERVACIONES DE BODEGA</span>
                {pedido.notas}
              </div>
            )}

            {/* Signature signatures section */}
            <div className="grid grid-cols-2 gap-12 mt-12 pt-12 text-center text-xs font-bold text-slate-600 print:mt-16 shrink-0">
              <div className="flex flex-col items-center">
                <div className="w-48 border-b border-slate-400 mb-2"></div>
                <span>Firma Despacho (Bodega)</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Paraíso Floral CEDI</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-48 border-b border-slate-400 mb-2"></div>
                <span>Firma Auxiliar Asignado</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Recolección de Piso</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
