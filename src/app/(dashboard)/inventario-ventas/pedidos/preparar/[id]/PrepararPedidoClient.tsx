'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshCw,
  Plus,
  Minus,
  Barcode,
  Tag,
  SendHorizontal
} from 'lucide-react';
import { Pedido, PedidoItem } from '@/types/pedido';
import { 
  actualizarItemPicking, 
  sustituirItemPedido, 
  completarPedidoBodega,
  iniciarPreparacionPedido,
  getPedidoPickingItems,
  agregarItemAPedido
} from '../../actions';
import { toast } from 'react-hot-toast';
import { 
  playTactileClick, 
  playWarehouseAlertChime, 
  playSuccessChime, 
  triggerHaptic,
  playLaserBeep,
  playErrorBuzz
} from '@/utils/audioAlerts';

interface PrepararPedidoClientProps {
  dbUser: any;
  initialPedido: Pedido;
  products: { id: string; nombre: string; sku: string; stockActual: number; precioVenta?: number }[];
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

  // Hardware Barcode Scanner State (LANDI M20SE Keyboard Wedge listener)
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // New items alert notification banner
  const [newItemsAlert, setNewItemsAlert] = useState<string | null>(null);
  const previousItemIdsRef = useRef<Set<string>>(new Set(initialPedido.items.map(i => i.id)));

  // Substitution modal state
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTargetItemId, setSubTargetItemId] = useState<string | null>(null);
  const [subSearchQuery, setSubSearchQuery] = useState('');

  // Add Item On-The-Fly modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addQty, setAddQty] = useState(1);

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
          playWarehouseAlertChime();
          setNewItemsAlert(`¡Se agregaron ${newCount} nuevos producto(s) a este pedido!`);
          previousItemIdsRef.current = incomingIds;
          setTimeout(() => setNewItemsAlert(null), 8000);
        }

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

  // 3. Hardware Barcode Scanner Listener for LANDI M20SE
  const handleBarcodeScanned = useCallback(async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setLastScannedCode(cleanCode);

    // Look for item in current order by SKU, barcode or matching product
    const targetItem = pedido.items.find(i => {
      const p = products.find(prod => prod.id === (i.sustituidoPor?.productoId || i.productoId));
      const cleanLower = cleanCode.toLowerCase();
      const cleanNumeric = cleanLower.replace(/^0+/, '');
      const cleanNoPrefix = cleanLower.replace(/^pf-/i, '');

      const codeMatches = 
        (i.codigoBarras && (
          i.codigoBarras.toLowerCase() === cleanLower ||
          i.codigoBarras.toLowerCase().replace(/^0+/, '') === cleanNumeric ||
          i.codigoBarras.toLowerCase().replace(/^pf-/i, '') === cleanNoPrefix
        )) ||
        (p?.sku && (
          p.sku.toLowerCase() === cleanLower ||
          p.sku.toLowerCase().replace(/^0+/, '') === cleanNumeric ||
          p.sku.toLowerCase().replace(/^pf-/i, '') === cleanNoPrefix
        ));

      return codeMatches;
    });

    if (targetItem) {
      // Item found in order! Increment prepared count
      playLaserBeep();
      const currentQty = targetItem.cantidadPreparada || 0;
      const newQty = currentQty + 1;
      const isComplete = newQty >= targetItem.cantidadSolicitada;

      // Optimistic update
      setPedido(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === targetItem.id ? {
          ...i,
          cantidadPreparada: newQty,
          recolectado: isComplete
        } : i)
      }));

      toast.success(
        `✓ ${targetItem.nombreProducto}: ${newQty}/${targetItem.cantidadSolicitada} paq ${isComplete ? '[COMPLETO]' : ''}`,
        { icon: '🏷️', duration: 2500 }
      );

      await actualizarItemPicking(pedido.id, targetItem.id, isComplete, newQty);
    } else {
      // Check if it's in CEDI product catalog
      const matchedCatalogProduct = products.find(p => p.sku.toLowerCase() === cleanCode.toLowerCase());
      if (matchedCatalogProduct) {
        playLaserBeep();
        toast(
          (t) => (
            <div className="flex flex-col gap-2">
              <span className="font-bold text-xs text-slate-800">
                ¿Agregar {matchedCatalogProduct.nombre} al pedido?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    await handleAddExtraProduct(matchedCatalogProduct, 1);
                  }}
                  className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-1 rounded-lg"
                >
                  Sí, agregar 1
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      } else {
        playErrorBuzz();
        toast.error(`Código no encontrado: ${cleanCode}`, { duration: 3000 });
      }
    }
  }, [pedido.items, pedido.id, products]);

  // Global Keydown Listener for Landi M20SE Laser Scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in a standard input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const now = Date.now();
      // Landi hardware scanner types characters extremely rapidly (< 60ms between keys)
      if (now - lastKeyTimeRef.current > 200) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length > 2) {
          e.preventDefault();
          const scanned = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          handleBarcodeScanned(scanned);
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScanned]);

  // Back action restoring layouts
  const handleBack = () => {
    setIsFullscreen(false);
    router.push('/inventario-ventas/pedidos');
  };

  // Adjust item quantity with +/- buttons
  const handleAdjustQuantity = async (item: PedidoItem, delta: number) => {
    playTactileClick();
    const currentQty = item.cantidadPreparada || 0;
    const newQty = Math.max(0, currentQty + delta);
    const isComplete = newQty >= item.cantidadSolicitada;

    setPedido(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === item.id ? {
        ...i,
        cantidadPreparada: newQty,
        recolectado: isComplete
      } : i)
    }));

    try {
      await actualizarItemPicking(pedido.id, item.id, isComplete, newQty);
    } catch {
      toast.error('Error al actualizar cantidad');
    }
  };

  // Mark all or remaining items at once
  const handleMarkAll = async (item: PedidoItem) => {
    playTactileClick();
    const newQty = item.cantidadSolicitada;
    const isComplete = true;

    setPedido(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === item.id ? {
        ...i,
        cantidadPreparada: newQty,
        recolectado: isComplete
      } : i)
    }));

    try {
      await actualizarItemPicking(pedido.id, item.id, isComplete, newQty);
      toast.success(`✓ ${item.nombreProducto} completado (${newQty})`);
    } catch {
      toast.error('Error al actualizar ítem');
    }
  };

  // Add extra product on the fly
  const handleAddExtraProduct = async (product: typeof products[0], qty: number) => {
    try {
      const res = await agregarItemAPedido({
        pedidoId: pedido.id,
        productoId: product.id,
        nombreProducto: product.nombre,
        codigoBarras: product.sku,
        cantidadSolicitada: qty
      });

      if (res.success && res.item) {
        playLaserBeep();
        toast.success(`✓ Agregado al pedido: ${product.nombre}`);
        setPedido(prev => ({
          ...prev,
          items: [
            ...prev.items,
            {
              id: res.item!.id,
              productoId: res.item!.productoId,
              nombreProducto: res.item!.nombreProducto,
              codigoBarras: res.item!.codigoBarras || undefined,
              cantidadSolicitada: res.item!.cantidadSolicitada,
              cantidadPreparada: 1,
              recolectado: res.item!.cantidadSolicitada <= 1
            }
          ]
        }));
        setIsAddModalOpen(false);
      } else {
        toast.error(res.error || 'Error al agregar ítem');
      }
    } catch {
      toast.error('Error de red al agregar producto');
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

  // Complete picking session and send to cashier
  const handleCompleteAndSendToCashier = async () => {
    const readyItemsCount = pedido.items.reduce((acc, i) => acc + (i.cantidadPreparada || 0), 0);
    if (readyItemsCount === 0) {
      toast.error('Por favor recolecta al menos un ítem o paquete antes de enviar a caja.');
      return;
    }

    if (!window.confirm('¿Confirmas finalizar el alistamiento y enviar este pedido a la CAJERA para su cobro y facturación?')) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await completarPedidoBodega(pedido.id);
      if (result.success) {
        playSuccessChime();
        toast.success('¡Alistamiento completado! Enviado a caja para cobro y emisión de factura.', { duration: 4000 });
        setIsFullscreen(false);
        router.push('/inventario-ventas/pedidos');
      } else {
        toast.error(result.error || 'Error al enviar a caja');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products in modals
  const filteredSubProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(subSearchQuery.toLowerCase())
  );

  const filteredAddProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(addSearchQuery.toLowerCase())
  );

  // Compute metrics exactly like the user's mockup:
  // e.g. 4 / 17 TOTAL ÍTEMS (prepared quantity / requested quantity)
  const totalQuantityRequested = pedido.items.reduce((acc, i) => acc + i.cantidadSolicitada, 0);
  const totalQuantityPrepared = pedido.items.reduce((acc, i) => acc + (i.cantidadPreparada || 0), 0);

  // Helper to determine if an item is LÁSER vs CUBETA/GRANEL
  const isBulkItem = (item: PedidoItem) => {
    const name = item.nombreProducto.toLowerCase();
    const isLoose = name.includes('suelto') || 
                    name.includes('atado') || 
                    name.includes('granel') || 
                    name.includes('hule') || 
                    name.includes('solidago') || 
                    name.includes('girasol') ||
                    name.includes('follaje');
    return isLoose || !item.codigoBarras;
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#F1F5F9] text-slate-900 font-sans select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* ─── 1. TOP HEADER (Exact mockup style: CEDI PICKING TERMINAL) ─── */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-200 shrink-0 shadow-xs z-20">
        <button 
          onClick={handleBack}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-950">
            CEDI PICKING TERMINAL
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Terminal LANDI M20SE Activa</span>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95 flex items-center justify-center transition-all"
          title="Agregar producto extra"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Real-time Added Items Alert Banner */}
      {newItemsAlert && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg shrink-0 animate-in slide-in-from-top duration-300 z-30">
          <div className="flex items-center gap-2 text-xs font-extrabold">
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

      {/* ─── 2. MAIN SCROLLABLE CONTENT ─── */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 pb-32">
        
        {/* ─── CARD: ORDER INFO & TOTAL METRICS (Exact layout of user's mockup) ─── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
              {pedido.codigoPedido}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-700 truncate mt-0.5">
              Client: <span className="font-extrabold text-slate-950">{pedido.cliente.nombre}</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 truncate">
              Seller: <span className="text-slate-700 font-bold">{pedido.auxiliarAsignado?.nombre || dbUser?.nombre || 'General'}</span>
            </p>
            {pedido.destino && (
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Destino: {pedido.destino}
              </p>
            )}
          </div>

          {/* Right Metrics Box: 4 / 17 TOTAL ÍTEMS */}
          <div className="text-right pl-4 border-l border-slate-100 shrink-0">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none">
              {totalQuantityPrepared} <span className="text-slate-400 font-bold text-lg sm:text-xl">/ {totalQuantityRequested}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase mt-1">
              TOTAL ÍTEMS
            </p>
          </div>
        </div>

        {/* ─── LIST OF PRODUCT CARDS ─── */}
        <div className="flex flex-col gap-3">
          {pedido.items.map((item) => {
            const isBulk = isBulkItem(item);
            const qtyPrepared = item.cantidadPreparada || 0;
            const qtyRequested = item.cantidadSolicitada;
            const isComplete = qtyPrepared >= qtyRequested;
            const remaining = Math.max(0, qtyRequested - qtyPrepared);

            // ─── CARD TYPE 1: LÁSER ITEM (Green accent, Barcode Tag) ───
            if (!isBulk) {
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border-2 transition-all shadow-xs flex flex-col gap-2.5 ${
                    isComplete
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Row: Title + Laser Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isComplete ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-950 leading-snug tracking-tight">
                          {item.nombreProducto}
                        </h3>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">
                          {qtyPrepared} / {qtyRequested} paq {isComplete && <span className="text-emerald-700 font-black">[COMPLETO]</span>}
                        </p>
                        {item.codigoBarras && (
                          <p className="text-[10px] font-mono text-slate-400 font-semibold mt-0.5">
                            SKU: {item.codigoBarras}
                          </p>
                        )}
                        {item.sustituidoPor && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <ArrowRightLeft className="w-3 h-3" /> Sustituido por: {item.sustituidoPor.nombreProducto}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge LÁSER */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 bg-emerald-700 text-white text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-2xs">
                        <Tag className="w-3 h-3" /> LÁSER
                      </span>
                      {pedido.estado !== 'completado' && pedido.estado !== 'facturado' && (
                        <button
                          onClick={() => openSubModal(item.id)}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline transition-colors"
                        >
                          Sustituir
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Controls Row for Laser Item */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleAdjustQuantity(item, -1)}
                      disabled={qtyPrepared <= 0}
                      className="w-12 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-black text-slate-800 text-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Minus className="w-4 h-4 stroke-[3]" />
                    </button>
                    <button
                      onClick={() => handleAdjustQuantity(item, 1)}
                      className="w-12 h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-black text-slate-800 text-lg transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>

                    {!isComplete ? (
                      <button
                        onClick={() => handleMarkAll(item)}
                        className="flex-1 h-10 rounded-xl bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 active:scale-98 font-bold text-slate-900 text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        <span>MARCAR RESTANTES ({remaining})</span>
                      </button>
                    ) : (
                      <div className="flex-1 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 font-extrabold text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>LISTO PARA EMPAQUE</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ─── CARD TYPE 2: CUBETA / GRANEL ITEM (Amber accent, Bulk Tag, Fast buttons) ───
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border-2 border-l-[6px] transition-all shadow-xs flex flex-col gap-2.5 ${
                  isComplete
                    ? 'border-emerald-500 border-l-emerald-600 bg-emerald-50/20'
                    : 'border-slate-200 border-l-amber-500 hover:border-slate-300'
                }`}
              >
                {/* Top Row: Title + Bulk Tag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="text-xl shrink-0 mt-0.5 select-none" role="img" aria-label="flor">
                      {item.nombreProducto.toLowerCase().includes('girasol') ? '🌻' : '🌾'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-950 leading-snug tracking-tight">
                        {item.nombreProducto}
                      </h3>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {qtyPrepared} / {qtyRequested} atados {isComplete && <span className="text-emerald-700 font-black">[COMPLETO]</span>}
                      </p>
                      {item.sustituidoPor && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <ArrowRightLeft className="w-3 h-3" /> Sustituido: {item.sustituidoPor.nombreProducto}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badge CUBETA / GRANEL */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-2xs">
                      <Sparkles className="w-3 h-3" /> CUBETA/GRANEL
                    </span>
                    {pedido.estado !== 'completado' && pedido.estado !== 'facturado' && (
                      <button
                        onClick={() => openSubModal(item.id)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline transition-colors"
                      >
                        Sustituir
                      </button>
                    )}
                  </div>
                </div>

                {/* Big Action Buttons Row (Exact layout from user's mockup) */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleAdjustQuantity(item, -1)}
                    disabled={qtyPrepared <= 0}
                    className="w-12 h-11 rounded-xl bg-white border border-slate-400 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-black text-slate-800 text-lg transition-all disabled:opacity-30 disabled:pointer-events-none shadow-xs"
                    aria-label="Restar 1"
                  >
                    <Minus className="w-5 h-5 stroke-[3]" />
                  </button>

                  <button
                    onClick={() => handleAdjustQuantity(item, 1)}
                    className="w-12 h-11 rounded-xl bg-white border border-slate-400 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-black text-slate-800 text-lg transition-all shadow-xs"
                    aria-label="Sumar 1"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </button>

                  {!isComplete ? (
                    <button
                      onClick={() => handleMarkAll(item)}
                      className="flex-1 h-11 rounded-xl bg-white border border-slate-400 hover:bg-amber-50 hover:border-amber-600 active:scale-98 font-black text-slate-950 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <Check className="w-5 h-5 text-slate-900 stroke-[3]" />
                      <span>{qtyPrepared === 0 ? `MARCAR TODO (${qtyRequested} ATADOS)` : `MARCAR RESTANTES (${remaining})`}</span>
                    </button>
                  ) : (
                    <div className="flex-1 h-11 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800 font-black text-xs sm:text-sm flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>ATADOS LISTOS ({qtyPrepared})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Laser Scanner helper hint */}
        <div className="bg-slate-200/60 rounded-xl p-3 text-center text-xs text-slate-600 font-semibold flex items-center justify-center gap-2 mt-2">
          <Barcode className="w-4 h-4 text-slate-500" />
          <span>Apunta el láser de la <b>Landi M20SE</b> a cualquier etiqueta para sumar +1 automáticamente</span>
        </div>
      </div>

      {/* ─── 3. BOTTOM FLOATING ACTION BAR: FINALIZAR Y ENVIAR A CAJA ─── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl z-30">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          
          {/* Progress Indicator */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${totalQuantityRequested > 0 ? Math.min(100, Math.round((totalQuantityPrepared / totalQuantityRequested) * 100)) : 0}%` }}
            />
          </div>

          <button
            onClick={handleCompleteAndSendToCashier}
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-800 hover:to-teal-800 active:scale-[0.98] text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-700/30 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
          >
            <SendHorizontal className="w-5 h-5 stroke-[2.5]" />
            <span>{submitting ? 'Enviando a Caja...' : 'FINALIZAR ALISTAMIENTO Y ENVIAR A CAJA'}</span>
          </button>
        </div>
      </div>

      {/* ─── MODAL: SUBSTITUTE PRODUCT ─── */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-700" />
                <h3 className="font-black text-sm text-slate-900">Sustituir Flor o Follaje</h3>
              </div>
              <button 
                onClick={() => setIsSubModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 shrink-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar variedad sustituta..."
                  value={subSearchQuery}
                  onChange={(e) => setSubSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 text-slate-800"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[220px]">
              {filteredSubProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-xs">
                  No se encontraron productos en el catálogo.
                </div>
              ) : (
                filteredSubProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectSubstitute(p.id)}
                    className="border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between active:scale-[0.99]"
                  >
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{p.nombre}</h4>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">SKU: {p.sku}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black text-slate-700">
                      Stock: {p.stockActual}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD EXTRA PRODUCT ON THE FLY ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-700" />
                <h3 className="font-black text-sm text-slate-900">Agregar Ítem Extra al Carrito</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 shrink-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar flor o follaje suelto..."
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 text-slate-800"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[220px]">
              {filteredAddProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-xs">
                  No se encontraron productos coincidentes.
                </div>
              ) : (
                filteredAddProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAddExtraProduct(p, addQty)}
                    className="border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between active:scale-[0.99]"
                  >
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{p.nombre}</h4>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">SKU: {p.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                        + Agregar
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
