'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLayoutControls } from '@/components/layout/MobileDashboardWrapper';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Search, 
  X, 
  Package, 
  CreditCard, 
  Sparkles,
  Volume2,
  Bell,
  RefreshCw
} from 'lucide-react';
import { Pedido, PedidoItem } from '@/types/pedido';
import { 
  actualizarItemPicking, 
  sustituirItemPedido, 
  completarPedidoBodega,
  iniciarPreparacionPedido,
  getPedidoPickingItems
} from '../../actions';
import { toast } from 'react-hot-toast';
import { playTactileClick, playWarehouseAlertChime, playSuccessChime, triggerHaptic } from '@/utils/audioAlerts';

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

  // New items alert notification banner
  const [newItemsAlert, setNewItemsAlert] = useState<string | null>(null);
  const previousItemIdsRef = useRef<Set<string>>(new Set(initialPedido.items.map(i => i.id)));

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

  // 2. Real-time polling listener: Check for items added live by sellers/admins
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const liveStatus = await getPedidoPickingItems(pedido.id);
        if (!liveStatus) return;

        // Check if there are new items added
        const currentIds = previousItemIdsRef.current;
        const incomingIds = new Set(liveStatus.items.map(i => i.id));
        
        let hasNewItems = false;
        let newCount = 0;
        liveStatus.items.forEach(item => {
          if (!currentIds.has(item.id)) {
            hasNewItems = true;
            newCount++;
          }
        });

        if (hasNewItems) {
          // Play notification chime and warehouse vibration
          playWarehouseAlertChime();
          setNewItemsAlert(`¡Se agregaron ${newCount} nuevos producto(s) a este pedido!`);
          previousItemIdsRef.current = incomingIds;

          // Auto clear alert banner after 8 seconds
          setTimeout(() => setNewItemsAlert(null), 8000);
        }

        // Update local items state while preserving local recolectado flags
        setPedido(prev => ({
          ...prev,
          estado: liveStatus.estado as Pedido['estado'],
          items: liveStatus.items.map(item => {
            const existing = prev.items.find(i => i.id === item.id);
            return existing ? { ...item, recolectado: existing.recolectado, cantidadPreparada: existing.cantidadPreparada } : item;
          })
        }));

      } catch (err) {
        // Silent polling catch
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [pedido.id]);

  // Back action restoring layouts
  const handleBack = () => {
    setIsFullscreen(false);
    router.push('/inventario-ventas/pedidos');
  };

  // Toggle item collected state with tactile audio & haptic feedback
  const handleToggleItem = async (item: PedidoItem) => {
    playTactileClick();

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
    triggerHaptic(30);
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
        playSuccessChime();
        toast.success('¡Pedido preparado y empaque completado!');
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

  const totalItems = pedido.items.length;
  const collectedItems = pedido.items.filter(i => i.recolectado).length;
  const progressPercent = totalItems > 0 ? Math.round((collectedItems / totalItems) * 100) : 0;

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#F8FAFC] text-slate-900 font-sans select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Navigation Bar (Inspired by Image 1: Clean Minimal Header) */}
      <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 flex items-center justify-center text-slate-800 transition-all"
            title="Volver a pedidos"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
              Preparar Pedido
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {pedido.codigoPedido}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {pedido.estado === 'completado' ? 'Completado' : 'En Bodega'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Circle Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs font-black text-slate-900">{collectedItems}/{totalItems}</span>
            <p className="text-[10px] text-slate-400 font-bold">{progressPercent}%</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 font-black text-xs">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* Real-time Added Items Alert Banner */}
      {newItemsAlert && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg shrink-0 animate-in slide-in-from-top duration-300 z-30">
          <div className="flex items-center gap-2.5 text-xs font-extrabold">
            <Bell className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
            <span>{newItemsAlert}</span>
          </div>
          <button
            onClick={() => setNewItemsAlert(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-28">
        
        {/* CARD 1: Delivery Address & Customer (Exact layout inspired by Image 1) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Dirección de Entrega</span>
            </div>
            <button
              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
            >
              <span>{isHeaderExpanded ? 'Ocultar' : 'Ver Detalles'}</span>
              {isHeaderExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {pedido.cliente.nombre}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 leading-relaxed">
              {pedido.destino}
            </p>
          </div>

          {/* Expanded Customer & Payment Details */}
          {isHeaderExpanded && (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Condición de Pago</span>
                  <p className="font-extrabold text-slate-900 capitalize mt-0.5">{pedido.estadoPago.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Teléfono</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{pedido.cliente.telefono || 'Sin teléfono'}</p>
                </div>
              </div>

              {pedido.notas && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-700 italic">
                  <span className="font-black text-slate-900 not-italic block text-[10px] uppercase text-slate-400 mb-0.5">Notas del Vendedor:</span>
                  "{pedido.notas}"
                </div>
              )}

              {/* Direct Quick Contact Buttons */}
              {pedido.cliente.telefono && (
                <div className="flex gap-2 pt-1">
                  <a
                    href={`tel:${pedido.cliente.telefono}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold transition-all"
                  >
                    <Phone className="w-4 h-4 text-slate-600" /> Llamar
                  </a>
                  <a
                    href={`https://wa.me/${pedido.cliente.telefono.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-xs font-bold border border-emerald-200 transition-all"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: Checklist Header */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Ítems a Recolectar
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">
              {totalItems}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Toca para marcar
          </span>
        </div>

        {/* SECTION 3: Item Cards List (Directly styled like Image 1 Cards) */}
        <div className="flex flex-col gap-3">
          {pedido.items.map((item) => {
            const isCollected = item.recolectado;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleItem(item)}
                className={`rounded-3xl p-4 transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer active:scale-[0.98] ${
                  isCollected
                    ? 'bg-[#EBF8F2] border-2 border-emerald-500 shadow-sm shadow-emerald-500/10'
                    : 'bg-white border border-slate-200/90 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* Left side: Icon Container & Product Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  
                  {/* Icon Box (Inspired by Image 1 Card Left Icon) */}
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      isCollected 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Package className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  {/* Product Text info */}
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-black text-sm tracking-tight leading-snug truncate ${
                      isCollected ? 'text-slate-700' : 'text-slate-950'
                    }`}>
                      {item.nombreProducto}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {item.variedadTono && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                          isCollected 
                            ? 'bg-emerald-100/70 text-emerald-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.variedadTono}
                        </span>
                      )}
                      
                      <span className="text-[11px] font-black text-slate-700">
                        {item.cantidadSolicitada} Paq.
                      </span>

                      {item.codigoBarras && (
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {item.codigoBarras}
                        </span>
                      )}
                    </div>

                    {/* Substituted product tag */}
                    {item.sustituidoPor && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md w-fit">
                        <ArrowRightLeft className="w-3 h-3" /> Sustituido: {item.sustituidoPor.nombreProducto}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Action / Checkmark (Exact check circle from Image 1) */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Substitute Button */}
                  {!isCollected && pedido.estado !== 'completado' && (
                    <button
                      onClick={() => openSubModal(item.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold transition-colors active:scale-95"
                      title="Sustituir producto si no hay stock"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  )}

                  {/* Circular Checkmark Badge (Exact style of Image 1 green check circle) */}
                  <div
                    onClick={() => handleToggleItem(item)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isCollected
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 ring-2 ring-emerald-300'
                        : 'border-2 border-slate-300 bg-white'
                    }`}
                  >
                    {isCollected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Bottom Floating Bar: Order Completion (Ergonomic mobile tap) */}
      {pedido.estado !== 'completado' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl z-20">
          <div className="max-w-md mx-auto flex flex-col gap-2">
            
            {/* Quick Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <button
              onClick={handleComplete}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>{submitting ? 'Guardando en CEDI...' : 'Completar Pedido y Empaque'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Substitute Catalog Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Sustituto de Producto</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Selecciona el producto que se empacará en su lugar</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSubModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b border-slate-100 shrink-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar flores o follaje en catálogo..."
                  value={subSearchQuery}
                  onChange={(e) => setSubSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 text-slate-800"
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-[250px]">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold text-xs">
                  No se encontraron productos disponibles en el catálogo.
                </div>
              ) : (
                filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectSubstitute(p.id)}
                    className="border border-slate-200/90 hover:border-emerald-500 hover:bg-emerald-50/30 p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between active:scale-[0.99]"
                  >
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{p.nombre}</h4>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">SKU: {p.sku}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-[10px] font-black text-slate-700">
                        Stock: {p.stockActual}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 shrink-0">
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="w-full py-3 border border-slate-200 text-slate-700 hover:bg-white text-xs font-black rounded-2xl transition-all"
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
