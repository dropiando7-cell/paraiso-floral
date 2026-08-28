'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLayoutControls } from '@/components/layout/MobileDashboardWrapper';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { Pedido, PedidoItem } from '@/types/pedido';
import { 
  actualizarItemPicking, 
  sustituirItemPedido, 
  completarPedidoBodega,
  iniciarPreparacionPedido
} from '../../actions';
import { toast } from 'react-hot-toast';

interface PrepararPedidoClientProps {
  dbUser: any;
  initialPedido: Pedido;
  products: { id: string; nombre: string; sku: string; stockActual: number }[];
}

export default function PrepararPedidoClient({
  dbUser,
  initialPedido,
  products
}: PrepararPedidoClientProps) {
  const router = useRouter();
  const { setIsFullscreen } = useLayoutControls();
  const [pedido, setPedido] = useState<Pedido>(initialPedido);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Substitution modal state
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTargetItemId, setSubTargetItemId] = useState<string | null>(null);
  const [subSearchQuery, setSubSearchQuery] = useState('');

  // 1. Force Fullscreen mode on mount for mobile ergonomic layout
  useEffect(() => {
    setIsFullscreen(true);
    
    // Automatically set status to en_preparacion if it was pending
    if (pedido.estado === 'pendiente') {
      iniciarPreparacionPedido(pedido.id).then(res => {
        if (res.success) {
          setPedido(prev => ({ ...prev, estado: 'en_preparacion' }));
        }
      });
    }

    return () => setIsFullscreen(false);
  }, [setIsFullscreen, pedido.estado, pedido.id]);

  // Back action restoring layouts
  const handleBack = () => {
    setIsFullscreen(false);
    router.push('/inventario-ventas/pedidos');
  };

  // Toggle item collected state
  const handleToggleItem = async (item: PedidoItem) => {
    const newCollected = !item.recolectado;
    const qtyPrepared = newCollected ? item.cantidadSolicitada : 0;

    // Optimistic UI update
    setPedido(prev => ({
      ...prev,
      items: prev.items.map(i => 
        i.id === item.id 
          ? { ...i, recolectado: newCollected, cantidadPreparada: qtyPrepared } 
          : i
      )
    }));

    try {
      const result = await actualizarItemPicking(pedido.id, item.id, newCollected, qtyPrepared);
      if (!result.success) {
        toast.error('Error al guardar el estado');
        // Rollback state
        setPedido(prev => ({
          ...prev,
          items: prev.items.map(i => 
            i.id === item.id ? { ...i, recolectado: item.recolectado, cantidadPreparada: item.cantidadPreparada } : i
          )
        }));
      }
    } catch (e) {
      toast.error('Error de comunicación');
    }
  };

  // Open substitute modal
  const openSubModal = (itemId: string) => {
    setSubTargetItemId(itemId);
    setSubSearchQuery('');
    setIsSubModalOpen(true);
  };

  // Select substitute product
  const handleSelectSubstitute = async (nuevoProductoId: string) => {
    if (!subTargetItemId) return;
    
    const matchedProduct = products.find(p => p.id === nuevoProductoId);
    if (!matchedProduct) return;

    try {
      const result = await sustituirItemPedido(pedido.id, subTargetItemId, nuevoProductoId);
      if (result.success) {
        toast.success(`Producto sustituido por ${matchedProduct.nombre}`);
        
        // Update local state
        setPedido(prev => ({
          ...prev,
          items: prev.items.map(i => {
            if (i.id === subTargetItemId) {
              return {
                ...i,
                sustituidoPor: {
                  productoId: matchedProduct.id,
                  nombreProducto: matchedProduct.nombre
                },
                codigoBarras: matchedProduct.sku
              };
            }
            return i;
          })
        }));
        
        setIsSubModalOpen(false);
        setSubTargetItemId(null);
      } else {
        toast.error(result.error || 'Error al sustituir');
      }
    } catch (e) {
      toast.error('Error de comunicación');
    }
  };

  // Complete picking session
  const handleComplete = async () => {
    const readyItems = pedido.items.filter(i => i.recolectado).length;
    if (readyItems === 0) {
      toast.error('Por favor recolecta al menos un ítem antes de completar.');
      return;
    }

    if (!window.confirm('¿Deseas completar la preparación del pedido? Esto descontará el stock físico del CEDI.')) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await completarPedidoBodega(pedido.id);
      if (result.success) {
        toast.success('Pedido preparado y empaque completado');
        setIsFullscreen(false);
        router.push('/inventario-ventas/pedidos');
      } else {
        toast.error(result.error || 'Error al completar el pedido');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products in substitute modal
  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(subSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-50 text-slate-900 font-sans select-none animate-in fade-in duration-200">
      
      {/* Mobile top bar */}
      <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-1.5 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight">{pedido.codigoPedido}</span>
              <span className="text-[10px] bg-white/20 text-white font-extrabold px-2 py-0.5 rounded-full uppercase">
                {pedido.estado === 'completado' ? 'Completado' : 'Bodega'}
              </span>
            </div>
            <h2 className="text-xs font-semibold text-emerald-100 max-w-[200px] truncate">
              {pedido.cliente.nombre}
            </h2>
          </div>
        </div>
        
        {/* Toggleable customer card button */}
        <button 
          onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
        >
          {isHeaderExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded Customer Card */}
      {isHeaderExpanded && (
        <div className="bg-white border-b border-slate-200 p-4 shadow-inner flex flex-col gap-3 shrink-0 animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Cliente</span>
              <p className="text-slate-950 font-bold mt-0.5">{pedido.cliente.nombre}</p>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Condición de Pago</span>
              <p className="text-slate-950 font-bold mt-0.5 capitalize">{pedido.estadoPago.replace('_', ' ')}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Destino de Entrega</span>
              <p className="text-slate-950 font-bold mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {pedido.destino}
              </p>
            </div>
            {pedido.notas && (
              <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Notas Especiales</span>
                <p className="text-slate-800 italic mt-0.5 font-semibold text-xs">{pedido.notas}</p>
              </div>
            )}
          </div>
          
          {/* Quick contact buttons */}
          <div className="flex gap-2 mt-1">
            {pedido.cliente.telefono && (
              <>
                <a
                  href={`tel:${pedido.cliente.telefono}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                >
                  <Phone className="w-4 h-4 text-slate-500" /> Llamar
                </a>
                <a
                  href={`https://wa.me/${pedido.cliente.telefono.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors"
                >
                  💬 WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Checklist area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pl-1">
          Ítems a recolectar ({pedido.items.filter(i => i.recolectado).length}/{pedido.items.length})
        </div>

        {pedido.items.map((item) => {
          const isCollected = item.recolectado;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-300 flex items-center p-4 gap-4 active:scale-[0.99] cursor-pointer ${
                isCollected
                  ? 'bg-emerald-50 border-emerald-300 shadow-sm shadow-emerald-100'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
              onClick={() => handleToggleItem(item)}
            >
              {/* Tap Check Indicator */}
              <div 
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isCollected
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 bg-slate-50'
                }`}
              >
                {isCollected && <Check className="w-4 h-4 stroke-[3]" />}
              </div>

              {/* Product Info details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-black text-sm tracking-tight leading-snug truncate ${
                    isCollected ? 'text-slate-500 line-through' : 'text-slate-900'
                  }`}>
                    {item.nombreProducto}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {item.variedadTono && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      {item.variedadTono}
                    </span>
                  )}
                  {item.codigoBarras && (
                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                      SKU: {item.codigoBarras}
                    </span>
                  )}
                </div>

                {item.sustituidoPor && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-250 px-2 py-0.5 rounded w-fit">
                    <ArrowRightLeft className="w-3 h-3" /> Sustituido por: {item.sustituidoPor.nombreProducto}
                  </div>
                )}
              </div>

              {/* Quantity badge */}
              <div className="text-right shrink-0 flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-extrabold text-slate-950">
                  {item.cantidadSolicitada} Paq.
                </span>
                
                {pedido.estado !== 'completado' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openSubModal(item.id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 text-[10px] font-bold tracking-tight transition-colors shadow-inner"
                  >
                    <ArrowRightLeft className="w-3 h-3" /> Sustituir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom picking completion bar */}
      {pedido.estado !== 'completado' && (
        <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-lg">
          <button
            onClick={handleComplete}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4.5 h-4.5" />
            {submitting ? 'Guardando en CEDI...' : 'Completar Pedido y Empaque'}
          </button>
        </div>
      )}

      {/* Quick Substitute Catalog Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Sustituto de Producto</h3>
              </div>
              <button 
                onClick={() => setIsSubModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b border-slate-100 shrink-0 bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en catálogo..."
                  value={subSearchQuery}
                  onChange={(e) => setSubSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 text-slate-800"
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-[250px]">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-semibold text-xs">
                  No se encontraron productos disponibles.
                </div>
              ) : (
                filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectSubstitute(p.id)}
                    className="border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{p.nombre}</h4>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">SKU: {p.sku}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-extrabold text-slate-600">
                        Stock: {p.stockActual}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl shrink-0">
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
