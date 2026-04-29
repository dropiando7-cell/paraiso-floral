'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, Printer, X, Monitor, Zap, User, CreditCard, Banknote, ShoppingCart, CheckCircle2, QrCode, LayoutGrid, List, Grid3X3, ArrowDownCircle, FileText, Keyboard, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface POSProduct {
  id: string;
  sku: string;
  nombre: string;
  precioVenta: number;
  stockActual: number;
  isvAplicable: number;
  esServicio: boolean;
  imageUrl?: string;
  isActivoFijo?: boolean;
}

interface CartItem extends POSProduct {
  qty: number;
  discountPercentage: number;
  cartId: string; // Unique ID for cart entries
  taxState: 'isv15' | 'isv18' | 'exento' | 'exonerado';
}

export interface POSFacturaPayload {
  clienteNombre: string;
  clienteId?: string;
  subTotal: number;
  descuentos: number;
  totalExento: number;
  totalExonerado: number;
  totalGravado15: number;
  isv15: number;
  totalGravado18: number;
  isv18: number;
  total: number;
  metodoPago: string;
  detalles: any[];
}

interface Props {
  productos: POSProduct[];
  categorias: string[];
  onEmitirFactura: (payload: POSFacturaPayload) => Promise<{ success: boolean; correlativo?: string; facturaId?: string; error?: string }>;
  cajeroNombre: string;
  modoKiosko?: boolean;
}

export default function POSFacturacion({ productos, categorias, onEmitirFactura, cajeroNombre, modoKiosko = false }: Props) {
  const router = useRouter();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState('Consumidor Final');
  const [viewMode, setViewMode] = useState<'large' | 'small' | 'list'>('large');
  const [visibleCount, setVisibleCount] = useState(24);
  
  // Modals
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const [lastFacturaId, setLastFacturaId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  // Shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcuts, setShortcuts] = useState({ search: 'F2', checkout: 'F4', clear: 'F8' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('bea_pos_shortcuts');
       if (saved) setShortcuts(JSON.parse(saved));
    }
  }, []);

  const updateShortcut = (action: keyof typeof shortcuts, key: string) => {
    const updated = { ...shortcuts, [action]: key.toUpperCase() };
    setShortcuts(updated);
    localStorage.setItem('bea_pos_shortcuts', JSON.stringify(updated));
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Computed: Products Filtered
  const filteredProducts = useMemo(() => {
    return productos.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = activeCategory === 'all' || true; // Placeholder for category filter logic if needed
      return matchSearch && matchCat;
    });
  }, [productos, searchTerm, activeCategory]);

  const pagedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Reset pagination on search change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchTerm, activeCategory]);

  // Computed: Cart Totals
  const totals = useMemo(() => {
    let subTotal = 0; let descuentos = 0; let exento = 0; let exonerado = 0;
    let gravado15 = 0; let isv15 = 0; let gravado18 = 0; let isv18 = 0;

    cart.forEach(item => {
      const baseLinea = item.precioVenta * item.qty;
      const descLinea = baseLinea * (item.discountPercentage / 100);
      const totalLinea = baseLinea - descLinea;

      subTotal += baseLinea;
      descuentos += descLinea;

      if (item.taxState === 'exento') {
        exento += totalLinea;
      } else if (item.taxState === 'exonerado') {
        exonerado += totalLinea;
      } else if (item.taxState === 'isv15') {
        gravado15 += totalLinea;
        isv15 += totalLinea * 0.15;
      } else if (item.taxState === 'isv18') {
        gravado18 += totalLinea;
        isv18 += totalLinea * 0.18;
      }
    });

    return {
      subTotal, descuentos, exento, exonerado,
      gravado15, isv15, gravado18, isv18,
      total: subTotal - descuentos + isv15 + isv18
    };
  }, [cart]);

  // Actions
  const addToCart = useCallback((p: POSProduct) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === p.id && !p.isActivoFijo);
      if (exists) {
        return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [{ 
        ...p, 
        qty: 1, 
        discountPercentage: 0, 
        cartId: Math.random().toString(36).substr(2, 9),
        taxState: p.isvAplicable === 15 ? 'isv15' : 'exento'
      }, ...prev];
    });
  }, []);

  const changeQty = (cartId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.cartId === cartId) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const changePrice = (cartId: string, newPrice: number) => {
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, precioVenta: newPrice >= 0 ? newPrice : 0 } : i));
  };

  const changeDiscount = (cartId: string, discPercent: number) => {
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, discountPercentage: Math.min(100, Math.max(0, discPercent || 0)) } : i));
  };

  const changeTax = (cartId: string, newTax: 'isv15' | 'isv18' | 'exento' | 'exonerado') => {
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, taxState: newTax } : i));
  };

  const removeLine = (cartId: string) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId));
  };

  const clearCart = () => {
    setShowClearCartModal(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setShowClearCartModal(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    const payload: POSFacturaPayload = {
      clienteNombre: clientName,
      subTotal: totals.subTotal,
      descuentos: totals.descuentos,
      totalExento: totals.exento,
      totalExonerado: totals.exonerado,
      totalGravado15: totals.gravado15,
      isv15: totals.isv15,
      totalGravado18: totals.gravado18,
      isv18: totals.isv18,
      total: totals.total,
      metodoPago: paymentMethod,
      detalles: cart.map(c => ({
        productoId: c.isActivoFijo ? undefined : c.id,
        activoId: c.isActivoFijo ? c.id : undefined,
        descripcion: c.nombre,
        cantidad: c.qty,
        precioUnitario: c.precioVenta,
        porcentajeIsv: c.taxState === 'isv15' ? 15 : c.taxState === 'isv18' ? 18 : 0,
        totalLinea: (c.precioVenta * c.qty) * (1 - c.discountPercentage / 100)
      }))
    };

    const res = await onEmitirFactura(payload);
    setIsProcessing(false);
    
    if (res.success && res.correlativo) {
      setLastTicket(res.correlativo);
      setLastFacturaId(res.facturaId || null);
      setShowCheckout(false);
      setShowSuccess(true);
      // Cart text is not cleared yet to allow ticket to calculate correctly
    } else {
      alert("Error: " + res.error);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== searchInputRef.current && e.key !== 'Escape') {
         return; 
      }

      if (e.key === shortcuts.search) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === shortcuts.checkout) {
        e.preventDefault();
        if (cart.length > 0 && !showCheckout && !showSuccess && !showShortcuts) setShowCheckout(true);
      } else if (e.key === shortcuts.clear) {
        e.preventDefault();
        if (cart.length > 0 && !showCheckout && !showSuccess && !showShortcuts && !showClearCartModal) clearCart();
      } else if (e.key === 'Escape') {
        if (showClearCartModal) {
           setShowClearCartModal(false);
        } else if (showShortcuts) {
           setShowShortcuts(false);
        } else if (showCheckout) {
           setShowCheckout(false);
        } else if (showSuccess) {
           setShowSuccess(false);
           setCart([]);
           setCashTendered('');
           setLastTicket(null);
        } else if (!modoKiosko) {
           if (typeof window !== 'undefined' && document.referrer.includes(window.location.host)) {
             router.back();
           } else {
             router.push('/facturas');
           }
        }
      } else if (e.key === 'Enter' && document.activeElement === searchInputRef.current) {
        if (filteredProducts.length > 0) {
          addToCart(filteredProducts[0]);
          setSearchTerm('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, showCheckout, showSuccess, filteredProducts, addToCart]);

  const fmt = (v: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(v);

  return (
    <div className={`flex flex-col h-screen h-[100dvh] bg-[#F3F4F6] font-sans ${modoKiosko ? 'fixed inset-0 z-[1000] overflow-hidden' : 'relative w-full overflow-hidden'}`}>
      
      {/* HEADER POS - FIJO Y SIEMPRE VISIBLE */}
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200 shadow-sm shrink-0 z-20 print:hidden relative">
        <div className="flex items-center gap-4 shrink-0 w-1/4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Zap className="text-white fill-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">CAJA RÁPIDA</h1>
            <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-widest">Bioelectrónica HN</p>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-8 relative z-30">
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-500 transition-colors" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Buscar producto por código, nombre o escanea... (${shortcuts.search})`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-100 hover:bg-gray-200/50 focus:bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none text-base font-semibold transition-all shadow-sm focus:shadow-md"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 px-2 py-1 rounded-md text-[10px] font-black text-indigo-500 shadow-sm border border-indigo-100 uppercase tracking-widest hidden md:block">
              {shortcuts.search}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 w-1/4 justify-end">
          <div className="text-right hidden md:block pr-4 border-r border-gray-200">
            <p className="text-sm font-bold text-gray-900">{cajeroNombre}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Cajero</p>
          </div>
          {modoKiosko ? (
             <>
               <button onClick={() => setShowShortcuts(true)} className="p-2.5 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-colors" title="Teclas de Acceso Rápido">
                 <Keyboard size={20} />
               </button>
               <button onClick={() => document.exitFullscreen().catch(()=>{})} className="p-2.5 text-gray-400 hover:text-rose-500 transition-colors bg-gray-50 hover:bg-rose-50 rounded-xl">
                 <X size={20} />
               </button>
             </>
          ) : (
             <>
               <button onClick={() => setShowShortcuts(true)} className="p-2.5 text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-xl transition-colors" title="Teclas de Acceso Rápido">
                 <Keyboard size={16} />
               </button>
               <button onClick={() => router.push('/facturas')} title="Salir / Volver (ESC)" className="p-2.5 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-xl transition-all font-bold text-sm flex gap-2 items-center">
                 <X size={16} /> Cerrar POS
               </button>
             </>
          )}
        </div>
      </header>

      {/* MAIN CONTENT DIVIDED */}
      <div className="flex flex-1 overflow-hidden print:hidden relative z-10 w-full">
        
        {/* LEFT PANEL - PRODUCTS */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FB] overflow-hidden">
          
          <div className="py-4 px-6 flex items-center justify-between border-b border-gray-100 bg-white/50 backdrop-blur shrink-0 z-10">
            <div className="flex gap-2">
               <button
                 onClick={() => setActiveCategory('all')}
                 className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
               >
                 Catálogo General
               </button>
            </div>

            {/* Layout Toggles */}
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex items-center shadow-sm">
                <button onClick={() => setViewMode('large')} title="Tarjetas Grandes" className={`p-1.5 rounded-lg transition-colors ${viewMode === 'large' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <LayoutGrid size={18} />
                </button>
                <button onClick={() => setViewMode('small')} title="Tarjetas Pequeñas" className={`p-1.5 rounded-lg transition-colors ${viewMode === 'small' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Grid3X3 size={18} />
                </button>
                <button onClick={() => setViewMode('list')} title="Vista de Lista" className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <List size={18} />
                </button>
            </div>
          </div>

          {/* Product Grid Area - SCROLLABLE */}
          <div className="flex-1 overflow-y-auto px-6 py-6 hide-scrollbar relative">
            <div className={
              viewMode === 'large' ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4' : 
              viewMode === 'small' ? 'grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3' : 
              'flex flex-col gap-2'
            }>
              {pagedProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  className={`bg-white cursor-pointer hover:shadow-xl hover:border-indigo-200 border border-gray-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all group overflow-hidden ${
                    viewMode === 'list' ? 'flex items-center p-3 rounded-2xl hover:-translate-y-0.5' : 'flex flex-col rounded-3xl p-4 hover:-translate-y-1'
                  }`}
                >
                  <div className={`relative flex items-center justify-center overflow-hidden transition-colors ${
                    viewMode === 'list' ? 'w-16 h-16 bg-gray-50 rounded-xl mr-4 shrink-0' : 
                    viewMode === 'small' ? 'aspect-square bg-gray-50 rounded-2xl mb-3 p-2' : 
                    'aspect-square bg-gray-50 rounded-2xl mb-4 p-4 group-hover:bg-indigo-50/30'
                  }`}>
                     {p.imageUrl ? (
                       <img src={p.imageUrl} alt={p.nombre} className="w-full h-full object-contain mix-blend-multiply" />
                     ) : (
                       <span className={`${viewMode === 'small' || viewMode === 'list' ? 'text-2xl' : 'text-5xl'} font-black text-gray-200 group-hover:text-indigo-200 transition-colors uppercase`}>{p.nombre.substring(0,2)}</span>
                     )}
                     
                     {p.stockActual <= 5 && !p.esServicio && viewMode !== 'list' && (
                       <span className="absolute top-2 right-2 bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">Bajo</span>
                     )}
                  </div>

                  <div className={viewMode === 'list' ? 'flex-1 min-w-0' : 'flex flex-col flex-1'}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 line-clamp-1">{p.sku}</p>
                    <h3 className={`font-bold text-gray-900 line-clamp-2 leading-tight ${viewMode === 'small' ? 'text-xs mb-1' : 'text-sm mb-2'}`}>{p.nombre}</h3>
                    <div className={`mt-auto flex items-center justify-between ${viewMode === 'list' && 'mt-1'}`}>
                      <p className={`font-black text-indigo-600 ${viewMode === 'small' ? 'text-sm' : 'text-lg'}`}>{fmt(p.precioVenta)}</p>
                      
                      {viewMode !== 'list' && (
                        <button className="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {viewMode === 'list' && (
                     <button className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors shadow-sm ml-4 shrink-0">
                       <Plus size={20} />
                     </button>
                  )}
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-4"><Search className="text-gray-300" size={32} /></div>
                <p className="text-gray-600 font-bold text-xl">Sin resultados en inventario</p>
                <p className="text-gray-400 mt-2">Intenta buscar con otra palabra clave</p>
              </div>
            )}

            {filteredProducts.length > pagedProducts.length && (
              <div className="mt-8 mb-4 flex justify-center">
                 <button 
                   onClick={() => setVisibleCount(prev => prev + 24)}
                   className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-bold rounded-2xl shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors"
                 >
                   <ArrowDownCircle size={18} /> Cargar más productos ({filteredProducts.length - pagedProducts.length} restantes)
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - TICKET - FIJO LATERAL */}
        <div className="w-[420px] 2xl:w-[480px] bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20 shrink-0 h-full">
          
          <div className="p-6 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                Ticket <span className="text-xs bg-gray-900 text-white font-bold px-2 py-0.5 rounded-md shadow-sm">{cart.length}</span>
              </h2>
              {cart.length > 0 && (
                 <button onClick={clearCart} className="text-xs font-bold text-gray-400 hover:text-rose-500 transition-colors flex gap-1 items-center bg-gray-50 px-2 py-1 rounded-lg">
                   <Trash2 size={12} /> Vaciar {shortcuts.clear}
                 </button>
              )}
            </div>
            
            {/* Quick Customer Select */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 opacity-90 focus-within:opacity-100 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 transition-all shadow-inner">
              <User size={18} className="text-indigo-400 mr-3" />
              <input 
                type="text" 
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
                placeholder="Nombre del Cliente"
              />
            </div>
          </div>

          {/* CART ITEMS - SCROLLABLE AREA */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 hide-scrollbar scroll-smooth">
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.cartId} className="bg-white p-3 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 group relative border border-gray-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-indigo-200 transition-all">
                  
                  {/* Delete overlay */}
                  <button onClick={() => removeLine(item.cartId)} className="absolute -top-2 -right-2 w-7 h-7 bg-white text-gray-300 hover:text-white hover:bg-rose-500 border border-gray-100 rounded-full flex items-center justify-center shadow-md transition-all z-20 transform scale-0 group-hover:scale-100">
                     <Trash2 size={12} />
                  </button>

                  <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                     {item.imageUrl ? (
                       <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-contain mix-blend-multiply" />
                     ) : (
                       <span className="font-black text-gray-300 text-2xl uppercase">{item.nombre.substring(0,2)}</span>
                     )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <h4 className="font-bold text-sm text-gray-900 line-clamp-2 pr-4 leading-tight">{item.nombre}</h4>
                    
                    {/* PRICING & TAX ROW */}
                    <div className="flex items-center gap-1.5 mt-auto pt-2 flex-nowrap pr-1">
                       <span className="text-gray-400 font-bold text-[10px]">L.</span>
                       <input 
                         type="number"
                         value={item.precioVenta}
                         onChange={e => changePrice(item.cartId, Number(e.target.value))}
                         className="w-14 rounded bg-gray-100 border border-transparent hover:border-gray-300 focus:bg-indigo-50 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-xs font-black text-indigo-700 outline-none transition-all px-1 py-0.5"
                       />
                      <select
                        value={item.taxState}
                        onChange={(e) => changeTax(item.cartId, e.target.value as any)}
                        className={`text-[9px] font-black px-1.5 py-1 rounded transition-colors uppercase tracking-widest outline-none border-none appearance-none text-center cursor-pointer min-w-[76px] max-w-[90px] shrink-0 ${
                          item.taxState === 'isv15' ? 'bg-orange-100 text-orange-600' :
                          item.taxState === 'isv18' ? 'bg-red-100 text-red-600' :
                          item.taxState === 'exonerado' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-500'
                        }`}
                        title="Clic para cambiar estado de impuesto"
                      >
                        <option value="exento">EXENTO</option>
                        <option value="exonerado">EXONERADO</option>
                        <option value="isv15">+15% ISV</option>
                        <option value="isv18">+18% ISV</option>
                      </select>
                      <div className="flex items-center bg-rose-50 rounded border border-rose-100 hover:border-rose-300 focus-within:ring-2 focus-within:ring-rose-200 transition-all h-6 px-1.5 shrink-0" title="Descuento aplicado al producto">
                        <input
                          type="number"
                          value={item.discountPercentage > 0 ? item.discountPercentage : ''}
                          onChange={e => changeDiscount(item.cartId, Number(e.target.value))}
                          placeholder="0"
                          className="w-8 text-center bg-transparent text-[10px] font-black text-rose-600 outline-none placeholder:text-rose-300 [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-rose-400 font-bold text-[9px] pointer-events-none">%</span>
                      </div>
                    </div>

                  </div>
                  
                  <div className="flex flex-col items-end justify-between shrink-0 pl-1">
                     <div className="flex flex-col items-end">
                       <p className={`text-xs font-black bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100 ${item.discountPercentage > 0 ? 'text-indigo-600' : 'text-gray-900'}`}>
                         {fmt((item.precioVenta * item.qty) * (1 - item.discountPercentage / 100))}
                       </p>
                       {item.discountPercentage > 0 && <p className="text-[9px] font-bold text-gray-400 line-through mt-0.5">{fmt(item.precioVenta * item.qty)}</p>}
                     </div>
                     
                     <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200 mt-2">
                       <button onClick={() => changeQty(item.cartId, -1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-md transition-all active:scale-95"><Minus size={14} /></button>
                       <span className="text-xs font-black w-6 text-center text-gray-800">{item.qty}</span>
                       <button onClick={() => changeQty(item.cartId, 1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-md transition-all active:scale-95"><Plus size={14} /></button>
                     </div>
                  </div>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="text-center py-32 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-inner flex items-center justify-center mb-6">
                    <ShoppingCart size={40} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-bold text-xl mb-1">El ticket está vacío</p>
                  <p className="text-sm text-gray-400">Selecciona productos a la izquierda<br/>para armar la orden</p>
                </div>
              )}
            </div>
          </div>

          {/* TOTALS & CHECKOUT - FIJO ABAJO */}
          <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-15px_40px_rgba(0,0,0,0.06)] shrink-0 z-30">
            <div className="space-y-2 mb-4 relative px-2">
              <div className="flex justify-between text-sm font-bold text-gray-400">
                <span>Sub Total {totals.exento > 0 && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded ml-2 uppercase">Tiene Exentos</span>}</span>
                <span className="text-gray-900">{fmt(totals.subTotal)}</span>
              </div>
              {totals.descuentos > 0 && (
                <div className="flex justify-between text-sm font-bold text-rose-500">
                  <span>Descuentos</span>
                  <span>-{fmt(totals.descuentos)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-400">
                <span>Impuesto (15%)</span>
                <span className="text-gray-900">{fmt(totals.isv15)}</span>
              </div>
              {totals.isv18 > 0 && (
                <div className="flex justify-between text-sm font-bold text-gray-400">
                  <span>Impuesto (18%)</span>
                  <span className="text-gray-900">{fmt(totals.isv18)}</span>
                </div>
              )}
              
              <div className="h-px w-full bg-gray-200 border-dashed my-4" />
              
              <div className="flex justify-between items-end pt-1 pb-2">
                <span className="text-2xl font-black text-gray-900">Total</span>
                <span className="text-[40px] leading-none font-black text-indigo-600 tracking-tighter">{fmt(totals.total)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full h-[72px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-black text-2xl rounded-[1.25rem] shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <Banknote size={28} className={cart.length === 0 ? "opacity-50" : ""} />
              COBRAR AHORA
            </button>
          </div>

        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center print:hidden animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-screen">
             <div className="bg-[#111827] px-8 py-10 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                
                <button onClick={() => setShowCheckout(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-gray-800 rounded-full p-2.5 transition-all"><X size={16} /></button>
                <p className="text-gray-400 font-bold mb-2 uppercase tracking-widest text-sm relative z-10">Monto Final a Pagar</p>
                <p className="text-[80px] leading-none font-black text-white tracking-tighter relative z-10">{fmt(totals.total)}</p>
             </div>
             
             <div className="p-8 pb-4">
               <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-widest">Método de Pago</h3>
               <div className="grid grid-cols-3 gap-4 mb-8">
                 {[
                   { id: 'Efectivo', icon: Banknote, active: 'bg-emerald-50 border-emerald-500 text-emerald-700', ring: 'ring-emerald-500/20' },
                   { id: 'Tarjeta', icon: CreditCard, active: 'bg-indigo-50 border-indigo-500 text-indigo-700', ring: 'ring-indigo-500/20' },
                   { id: 'Transferencia', icon: QrCode, active: 'bg-violet-50 border-violet-500 text-violet-700', ring: 'ring-violet-500/20' },
                 ].map(m => (
                   <button 
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === m.id ? `${m.active} shadow-md ring-4 ${m.ring}` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                   >
                      <m.icon size={28} className="mb-2" />
                      <span className="font-bold text-sm tracking-tight">{m.id}</span>
                      {paymentMethod === m.id && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-current shadow-sm" />}
                   </button>
                 ))}
               </div>

               {paymentMethod === 'Efectivo' && (
                 <div className="mb-8 animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest">Efectivo Recibido</h3>
                   </div>
                   <input 
                      type="number"
                      autoFocus
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      placeholder="Ej. 1000"
                      className="w-full bg-gray-50 border-2 border-gray-200 text-gray-900 font-black text-4xl p-5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center placeholder:text-gray-300"
                   />
                   <div className="grid grid-cols-4 gap-2 mt-3">
                     {[totals.total, totals.total + 100, totals.total + 500, totals.total + 1000].map((amt, i) => {
                        const roundedAmt = i === 0 ? totals.total : Math.ceil(amt / 100) * 100;
                        return (
                          <button key={i} onClick={() => setCashTendered(roundedAmt.toString())} className="bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors text-sm shadow-sm">
                            {i === 0 ? 'Exacto' : `L. ${roundedAmt}`}
                          </button>
                        );
                     })}
                   </div>
                   {Number(cashTendered) >= totals.total && (
                     <div className="mt-4 p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-400 flex justify-between items-center animate-in zoom-in-95 shadow-inner">
                        <span className="font-black text-emerald-800 text-xl uppercase tracking-widest">Su Cambio</span>
                        <span className="font-black text-emerald-600 text-4xl">{fmt(Number(cashTendered) - totals.total)}</span>
                     </div>
                   )}
                 </div>
               )}

               <button
                  onClick={handleCheckout}
                  disabled={isProcessing || (paymentMethod === 'Efectivo' && Number(cashTendered) > 0 && Number(cashTendered) < totals.total)}
                  className="w-full h-[72px] bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xl rounded-[1.25rem] shadow-xl transition-all flex items-center justify-center gap-3 mt-auto mb-4"
               >
                 {isProcessing ? 'Procesando Venta...' : `Emitir Documento Final`}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL WITH PRINT OPTIONS */}
      {showSuccess && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center print:hidden animate-in fade-in p-4">
           <div className="bg-white rounded-3xl p-10 max-w-lg w-full flex flex-col items-center text-center shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10 zoom-in-95 relative">
              <button 
                  onClick={() => {
                     setShowSuccess(false);
                     setCart([]);
                     setCashTendered('');
                     setLastTicket(null);
                  }}
                  className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
                  title="Cerrar y nueva venta"
              >
                  <X size={20} />
              </button>
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              
              <h2 className="text-3xl font-black text-gray-900 mb-2">¡Venta Exitosa!</h2>
              <p className="text-gray-500 font-medium mb-1">La factura se ha generado y registrado en el inventario.</p>
              
              <div className="bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl mb-8 flex flex-col mt-4 w-full">
                 <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">Correlativo Oficial</span>
                 <span className="text-indigo-700 font-black text-3xl">{lastTicket}</span>
              </div>
              
              <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs mb-4 w-full text-left pl-2">Opciones de Impresión</h3>
              <div className="flex gap-4 w-full mb-6">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-center items-center gap-2 group"
                >
                  <Printer size={28} className="text-slate-400 group-hover:text-slate-600 transition-colors" /> 
                  Formato Ticket
                </button>
                <button 
                  onClick={() => window.open(`/facturas/ver/${lastFacturaId}?print=true`, '_blank', 'noopener,noreferrer')}
                  className="flex-1 py-5 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-100 hover:border-indigo-200 transition-all flex flex-col justify-center items-center gap-2 group"
                >
                  <FileText size={28} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" /> 
                  Formato Carta (PDF)
                </button>
              </div>

              <button 
                  onClick={() => {
                     setShowSuccess(false);
                     setCart([]);
                     setCashTendered('');
                     setLastTicket(null);
                  }}
                  className="w-full py-4 text-gray-500 font-bold rounded-2xl border-2 border-transparent hover:bg-gray-100 transition-colors"
                >
                  Continuar con otra venta
              </button>
           </div>
        </div>
      )}

      {/* TICKET FOR PRINTING ONLY */}
      {lastTicket && (
        <div className="hidden print:block w-[80mm] p-2 font-mono text-black mx-auto">
           <div className="text-center mb-4">
             <h1 className="font-black text-lg leading-tight uppercase">BIOELECTRONICA HN</h1>
             <p className="text-[10px] mt-1">Barrio Paz Barahona 10 CALLE 12 Y 11 Ave.</p>
             <p className="text-[10px]">San Pedro Sula, Honduras</p>
             <p className="text-[10px] mt-3 font-bold font-sans">FACTURA OFICIAL: {lastTicket}</p>
             <p className="text-[10px] border-b border-dashed border-black pb-2 mb-2">Fecha: {new Date().toLocaleDateString('es-HN', { hour: '2-digit', minute:'2-digit' })}</p>
             <p className="text-[10px] text-left">Cliente: {clientName}</p>
             <p className="text-[10px] text-left">Cajero: {cajeroNombre}</p>
           </div>
           
           <table className="w-full mb-4 text-[11px]">
             <thead>
               <tr className="border-y border-dashed border-black">
                 <th className="text-left font-normal pb-0.5 pt-0.5">CANT</th>
                 <th className="text-left font-normal pb-0.5 pt-0.5 px-1">DESCRIPCIÓN</th>
                 <th className="text-right font-normal pb-0.5 pt-0.5">TOTAL</th>
               </tr>
             </thead>
             <tbody>
               {cart.map((item, idx) => (
                 <tr key={idx} className="align-top">
                   <td className="pt-2">{item.qty}</td>
                   <td className="pt-2 px-1 pr-2 truncate max-w-[40mm]">
                     {item.nombre}
                     {item.taxState === 'exento' && <span className="ml-1 text-[8px] font-bold">(E)</span>}
                     {item.taxState === 'exonerado' && <span className="ml-1 text-[8px] font-bold">(EXO)</span>}
                     {item.taxState === 'isv18' && <span className="ml-1 text-[8px] font-bold">(18%)</span>}
                     {item.precioVenta > 0 && <span className="block text-[9px] mt-0.5 text-gray-500">L.{item.precioVenta} c/u {item.discountPercentage > 0 && <span className="text-black font-bold uppercase ml-1">-{item.discountPercentage}% off</span>}</span>}
                   </td>
                   <td className="text-right pt-2">{fmt((item.precioVenta * item.qty) * (1 - item.discountPercentage / 100))}</td>
                 </tr>
               ))}
             </tbody>
           </table>

           <div className="text-[11px] border-t border-dashed border-black pt-2 flex flex-col gap-1 w-full items-end pb-4 border-b">
             <div className="flex w-[80%] justify-between"><span className="uppercase">Sub Total:</span><span>{fmt(totals.subTotal)}</span></div>
             {totals.descuentos > 0 && <div className="flex w-[80%] justify-between"><span className="uppercase">Descuentos:</span><span>-{fmt(totals.descuentos)}</span></div>}
             {totals.exonerado > 0 && <div className="flex w-[80%] justify-between"><span className="uppercase">Exonerado:</span><span>{fmt(totals.exonerado)}</span></div>}
             <div className="flex w-[80%] justify-between"><span className="uppercase">ISV 15%:</span><span>{fmt(totals.isv15)}</span></div>
             {totals.isv18 > 0 && <div className="flex w-[80%] justify-between"><span className="uppercase">ISV 18%:</span><span>{fmt(totals.isv18)}</span></div>}
             <div className="flex w-[80%] justify-between font-black text-sm mt-2"><span className="uppercase">TOTAL:</span><span>{fmt(totals.total)}</span></div>
           </div>

           <div className="mt-4 flex flex-col gap-1 text-[11px] pb-4 border-b border-dashed border-black">
             <p className="font-bold">Método Pago: {paymentMethod}</p>
             {paymentMethod === 'Efectivo' && cashTendered && <p>Recibido: {fmt(Number(cashTendered))}</p>}
             {paymentMethod === 'Efectivo' && cashTendered && <p className="font-bold">Cambio: {fmt(Number(cashTendered) - totals.total)}</p>}
           </div>

           <div className="text-center mt-4 text-[10px] leading-tight">
             <p className="font-bold uppercase tracking-widest text-xs mb-1">¡Gracias por su compra!</p>
             <p>Este es un documento equivalente de facturación local.</p>
           </div>
        </div>
      )}

      {/* SHORTCUTS EDITOR MODAL */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[4000] flex items-center justify-center print:hidden animate-in fade-in p-4">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-full flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Keyboard className="text-indigo-600" /> Atajos de Teclado
                </h2>
                <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"><X size={16} /></button>
              </div>
              
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-bold text-gray-600">Buscador</span>
                    <input 
                      type="text" 
                      value={shortcuts.search} 
                      onChange={e => updateShortcut('search', e.target.value)}
                      maxLength={3}
                      className="w-16 bg-white border border-gray-300 text-center font-black text-indigo-600 rounded-lg p-1 uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-bold text-gray-600">Saltar a Cobrar</span>
                    <input 
                      type="text" 
                      value={shortcuts.checkout} 
                      onChange={e => updateShortcut('checkout', e.target.value)}
                      maxLength={3}
                      className="w-16 bg-white border border-gray-300 text-center font-black text-indigo-600 rounded-lg p-1 uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-bold text-gray-600">Vaciar Carrito</span>
                    <input 
                      type="text" 
                      value={shortcuts.clear} 
                      onChange={e => updateShortcut('clear', e.target.value)}
                      maxLength={3}
                      className="w-16 bg-white border border-gray-300 text-center font-black text-indigo-600 rounded-lg p-1 uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                 </div>
                 
                 <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100 opacity-80">
                    <span className="text-sm font-bold text-rose-600">Cerrar Todo / Salir</span>
                    <span className="w-16 bg-white border border-rose-200 text-center font-black text-rose-600 rounded-lg p-1 uppercase">ESC</span>
                 </div>
              </div>
              
              <button onClick={() => setShowShortcuts(false)} className="w-full mt-8 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
                 <Save size={18} /> Guardar Ajustes
              </button>
           </div>
        </div>
      )}

      {/* CLEAR CART MODAL */}
      {showClearCartModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[5000] flex items-center justify-center print:hidden animate-in fade-in p-4">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-full flex flex-col items-center text-center shadow-2xl border border-gray-100 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-rose-50/50">
                <Trash2 size={32} className="stroke-[2.5]" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">¿Vaciar Ticket?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium px-2 leading-relaxed">
                Estás a punto de eliminar todos los productos seleccionados para esta venta. ¿Deseas continuar?
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowClearCartModal(false)}
                  className="flex-[1] py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmClearCart}
                  className="flex-[1.5] py-3.5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all"
                >
                  Sí, Vaciar
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
