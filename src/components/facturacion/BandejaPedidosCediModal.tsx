'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  X, 
  Sparkles, 
  RefreshCw,
  Receipt,
  FileCheck
} from 'lucide-react';
import { getPedidosListosParaFacturar } from '@/app/(dashboard)/inventario-ventas/pedidos/actions';
import { playWarehouseAlertChime, playSuccessChime } from '@/utils/audioAlerts';

export interface PedidoListoCedi {
  id: string;
  codigoPedido: string;
  estado: string;
  estadoPago: string;
  destino: string;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
  totalEstimado: number;
  cliente: {
    id: string;
    nombre: string;
    rtn?: string;
    telefono?: string;
    direccion?: string;
    email?: string;
  };
  auxiliarAsignado?: {
    id: string;
    nombre: string;
  };
  items: {
    id: string;
    productoId: string;
    nombreProducto: string;
    sku: string;
    cantidadPreparada: number;
    cantidadSolicitada: number;
    precioVenta: number;
    isvAplicable: number;
    esSustituido: boolean;
    nombreOriginal?: string;
  }[];
}

interface BandejaPedidosCediModalProps {
  onSelectPedido: (pedido: PedidoListoCedi) => void;
  className?: string;
}

export default function BandejaPedidosCediModal({
  onSelectPedido,
  className = ''
}: BandejaPedidosCediModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoListoCedi[]>([]);
  const [loading, setLoading] = useState(false);
  const previousIdsRef = useRef<Set<string>>(new Set());

  // Polling for ready orders every 6 seconds
  const fetchPedidos = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const data = await getPedidosListosParaFacturar();
      
      // Check for incoming new ready orders
      const currentIds = previousIdsRef.current;
      const incomingIds = new Set(data.map(p => p.id));
      let hasNewOrder = false;

      data.forEach(p => {
        if (!currentIds.has(p.id)) {
          hasNewOrder = true;
        }
      });

      if (hasNewOrder && currentIds.size > 0) {
        playWarehouseAlertChime();
      }

      previousIdsRef.current = incomingIds;
      setPedidos(data as any);
    } catch (e) {
      console.error('Error fetching ready orders:', e);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (pedido: PedidoListoCedi) => {
    playSuccessChime();
    onSelectPedido(pedido);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button with Pulse Indicator */}
      <button
        type="button"
        onClick={() => {
          fetchPedidos(true);
          setIsOpen(true);
        }}
        className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-xs active:scale-95 ${
          pedidos.length > 0
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/30'
            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
        } ${className}`}
        title="Ver pedidos alistados en CEDI listos para cobro"
      >
        <Package className="w-4 h-4 stroke-[2.5]" />
        <span>Pedidos CEDI</span>
        
        {pedidos.length > 0 ? (
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black bg-white text-emerald-800 rounded-full shadow-xs animate-pulse">
            {pedidos.length}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-bold">0</span>
        )}
      </button>

      {/* Modal / Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[120] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                  <Package className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-950 tracking-tight leading-tight">
                    Pedidos Alistados de Bodega (CEDI)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Listos para cobro y emisión de Factura Fiscal en Caja
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchPedidos(true)}
                  disabled={loading}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
                  title="Actualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[300px]">
              {pedidos.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 stroke-[2]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800">
                    No hay pedidos pendientes de cobro
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Cuando un alistador en bodega termine de escanear los paquetes en su terminal móvil LANDI, el pedido aparecerá automáticamente aquí.
                  </p>
                </div>
              ) : (
                pedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-500 p-4 transition-all shadow-xs flex flex-col gap-3 group"
                  >
                    {/* Top Row: Code + Client + Total */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-950 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {pedido.codigoPedido}
                          </span>
                          <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Alistado en Bodega
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 mt-1">
                          {pedido.cliente.nombre}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5 font-medium">
                          {pedido.cliente.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {pedido.cliente.telefono}
                            </span>
                          )}
                          {pedido.auxiliarAsignado && (
                            <span className="flex items-center gap-1 text-slate-600 font-semibold">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              Alistó: {pedido.auxiliarAsignado.nombre}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">
                          Total Estimado
                        </span>
                        <span className="text-lg sm:text-xl font-black text-emerald-700">
                          L. {pedido.totalEstimado.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Prepared Items Pills */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-wrap gap-1.5 text-xs">
                      {pedido.items.map((item) => (
                        <span
                          key={item.id}
                          className="bg-white border border-slate-200 text-slate-800 font-bold px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs"
                        >
                          <span className="text-emerald-700 font-black">{item.cantidadPreparada}x</span>
                          <span className="truncate max-w-[180px]">{item.nombreProducto}</span>
                          {item.esSustituido && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 px-1 rounded font-extrabold">
                              Sust.
                            </span>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Action Button: Load into Invoice */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleSelect(pedido)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Cargar en Facturación</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-semibold shrink-0">
              Al cargar el pedido, los productos y cantidades exactas alistadas se traspasan a la factura para el cobro.
            </div>

          </div>
        </div>
      )}
    </>
  );
}
