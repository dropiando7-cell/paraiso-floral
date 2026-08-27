'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  PackageCheck,
  Receipt,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Search,
  ShoppingCart,
  CheckCircle,
  XCircle,
  FileSignature,
  ArrowLeft,
  ChevronRight,
  Smartphone,
  Info,
  Send,
  Printer
} from 'lucide-react';
import { IRuta, IRutaPedido, IRutaStock, IMerma, IRutaAbono, IVentaMovil } from '@/types/rutas';
import { getRutaById, registrarEntregaPedido, registrarVentaMovil, registrarAbonoCxC } from '../actions';

interface PosMovilClientProps {
  dbUser: any;
  activeRoutes: IRuta[];
  cediProducts: any[];
  cediClients: any[];
}

export default function PosMovilClient({
  dbUser,
  activeRoutes,
  cediProducts,
  cediClients
}: PosMovilClientProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [route, setRoute] = useState<IRuta | null>(null);
  const [activeTab, setActiveTab] = useState<'entregas' | 'pos' | 'cobros'>('entregas');
  
  // Deliveries State
  const [activeDelivery, setActiveDelivery] = useState<IRutaPedido | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<'ENTREGADO' | 'RECHAZADO'>('ENTREGADO');
  const [rejectReason, setRejectReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO'>('EFECTIVO');
  const [amountCollected, setAmountCollected] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  // HTML5 Canvas for Digital Signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // POS State
  const [cart, setCart] = useState<{ productoId: string; cantidad: number }[]>([]);
  const [posClient, setPosClient] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO'>('EFECTIVO');
  const [posRef, setPosRef] = useState('');
  const [ticketModalData, setTicketModalData] = useState<any | null>(null);

  // CxC State
  const [cxcClient, setCxcClient] = useState('');
  const [cxcAmount, setCxcAmount] = useState('');
  const [cxcPaymentMethod, setCxcPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [cxcRef, setCxcRef] = useState('');

  // Fetch updated route data on selection or periodic refresh
  useEffect(() => {
    if (!selectedRouteId) return;

    const fetchRoute = async () => {
      const data = await getRutaById(selectedRouteId);
      if (data) {
        setRoute(data);
      }
    };

    fetchRoute();
    const interval = setInterval(fetchRoute, 5000);
    return () => clearInterval(interval);
  }, [selectedRouteId]);

  // Signature Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#059669'; // Emerald primary
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Get mouse/touch coords
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL());
  };

  // Add Item to POS Cart (Strictly Limited to Truck Stock!)
  const addToCart = (prodId: string) => {
    if (!route) return;
    
    const st = route.inventario.find((i: any) => i.productoId === prodId);
    if (!st) return;

    // Calc available stock inside the truck
    const stockDisponible = st.cantidadCargada - (st.cantidadVendida + st.cantidadEntregada + st.cantidadMerma);
    
    const cartItem = cart.find(i => i.productoId === prodId);
    const cartQty = cartItem ? cartItem.cantidad : 0;

    if (cartQty >= stockDisponible) {
      alert(`No puedes cargar más de lo disponible en el camión (${stockDisponible} unidades disponibles).`);
      return;
    }

    if (cartItem) {
      setCart(cart.map(i => (i.productoId === prodId ? { ...i, cantidad: i.cantidad + 1 } : i)));
    } else {
      setCart([...cart, { productoId: prodId, cantidad: 1 }]);
    }
  };

  const updateCartQty = (prodId: string, qty: number) => {
    if (!route) return;

    const st = route.inventario.find((i: any) => i.productoId === prodId);
    if (!st) return;

    const stockDisponible = st.cantidadCargada - (st.cantidadVendida + st.cantidadEntregada + st.cantidadMerma);

    if (qty > stockDisponible) {
      alert(`Stock insuficiente en el camión (${stockDisponible} unidades disponibles).`);
      return;
    }

    if (qty <= 0) {
      setCart(cart.filter(i => i.productoId !== prodId));
    } else {
      setCart(cart.map(i => (i.productoId === prodId ? { ...i, cantidad: qty } : i)));
    }
  };

  // Submit delivery confirmation
  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route || !activeDelivery) return;

    const res = await registrarEntregaPedido(route.id, activeDelivery.facturaId, {
      estadoEntrega: deliveryStatus,
      motivoRechazo: deliveryStatus === 'RECHAZADO' ? rejectReason : undefined,
      formaPago: deliveryStatus === 'ENTREGADO' ? paymentMethod : undefined,
      montoCobrado: deliveryStatus === 'ENTREGADO' ? Number(amountCollected || activeDelivery.totalFactura) : 0,
      firmaUrl: signatureData || undefined
    });

    if (res.success) {
      // Reset checkout panel
      setActiveDelivery(null);
      setSignatureData(null);
      setAmountCollected('');
      setRejectReason('');
      
      // Update local state
      const updated = await getRutaById(route.id);
      if (updated) setRoute(updated);
    } else {
      alert(res.error || 'Error al guardar entrega');
    }
  };

  // POS Direct Invoice Submit
  const handlePosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route || cart.length === 0 || !posClient) {
      alert('Carrito vacío o cliente sin especificar.');
      return;
    }

    const clientName = cediClients.find(c => c.id === posClient)?.nombre || 'CONSUMIDOR FINAL';

    // Calculate totals
    let subtotal = 0;
    const items = cart.map(ci => {
      const p = cediProducts.find(cp => cp.id === ci.productoId);
      const price = p?.precioVenta || 0;
      subtotal += price * ci.cantidad;
      return {
        productoId: ci.productoId,
        productoNombre: p?.nombre || 'Flores',
        productoSku: p?.sku || 'FL-000',
        cantidad: ci.cantidad,
        precioUnitario: price,
        isv: 15
      };
    });

    const isvTotal = subtotal * 0.15;
    const total = subtotal + isvTotal;

    const res = await registrarVentaMovil(route.id, {
      clienteId: posClient,
      clienteNombre: clientName,
      items,
      formaPago: posPaymentMethod,
      total
    });

    if (res.success) {
      // Clear cart & POS state
      setCart([]);
      setPosClient('');
      setPosPaymentMethod('EFECTIVO');
      setPosRef('');

      // Open printable ticket simulation
      setTicketModalData({
        numeroFactura: res.facturaNumero,
        clienteNombre: clientName,
        items,
        formaPago: posPaymentMethod,
        total
      });

      // Update route state
      const updated = await getRutaById(route.id);
      if (updated) setRoute(updated);
    } else {
      alert(res.error || 'Error al procesar venta');
    }
  };

  // Submit CxC payment abono
  const handleCxcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!route || !cxcClient || !cxcAmount) return;

    const clientName = cediClients.find(c => c.id === cxcClient)?.nombre || 'Cliente';

    const res = await registrarAbonoCxC(route.id, {
      clienteId: cxcClient,
      clienteNombre: clientName,
      monto: Number(cxcAmount),
      formaPago: cxcPaymentMethod,
      referencia: cxcRef
    });

    if (res.success) {
      setCxcClient('');
      setCxcAmount('');
      setCxcRef('');
      alert('Abono registrado con éxito en ruta.');

      const updated = await getRutaById(route.id);
      if (updated) setRoute(updated);
    } else {
      alert(res.error || 'Error al registrar abono');
    }
  };

  // Calculate POS totals
  const cartSubtotal = cart.reduce((acc, curr) => {
    const p = cediProducts.find(cp => cp.id === curr.productoId);
    return acc + (p?.precioVenta || 0) * curr.cantidad;
  }, 0);
  const cartIsv = cartSubtotal * 0.15;
  const cartTotal = cartSubtotal + cartIsv;

  /* ──────────────────────────────────────────────────────────────────────────
     1. SCREEN: SELECTION OF ROUTE/VEHICLE (Unbound state)
     ────────────────────────────────────────────────────────────────────────── */
  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-md mx-auto p-6 animate-in fade-in duration-300">
        
        <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Smartphone className="w-8 h-8" />
          </div>

          <div>
            <h2 className="font-extrabold text-slate-900 text-xl">Auto-Venta y Reparto Móvil</h2>
            <p className="text-slate-500 text-sm mt-1">
              Hola, {dbUser.nombre}. Por favor selecciona el camión o ruta de reparto asignada para iniciar tu jornada de ventas.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rutas Disponibles</span>
            
            {activeRoutes.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-350 p-6 rounded-xl text-center text-slate-500 text-xs">
                No hay rutas despachadas desde el CEDI actualmente.
              </div>
            ) : (
              activeRoutes.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{r.camionPlaca}</span>
                      <h4 className="font-bold text-slate-800 text-xs truncate leading-snug">{r.rutaNombre}</h4>
                      <span className="text-[10px] text-slate-500 font-medium">Cond: {r.conductorNombre}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     2. SCREEN: MAIN POS MOBILE WORKSPACE (Bound state)
     ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto py-2 animate-in fade-in duration-300 pb-20">
      
      {/* MOBILE HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide leading-none">{route.camionPlaca}</span>
            <h3 className="font-black text-slate-900 text-sm truncate leading-snug w-[180px]">{route.rutaNombre}</h3>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedRouteId(null);
            setRoute(null);
          }}
          className="text-slate-500 hover:text-slate-800 text-[10px] font-bold border border-slate-250 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          Salir Jornada
        </button>
      </div>

      {/* TOP TAB CONTROL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm grid grid-cols-3 gap-1">
        <button
          onClick={() => {
            setActiveTab('entregas');
            setActiveDelivery(null);
          }}
          className={`cursor-pointer font-bold text-center py-2.5 rounded-xl transition-all text-xs ${
            activeTab === 'entregas'
              ? 'bg-brand-600 text-white shadow shadow-emerald-500/10'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Entregas
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`cursor-pointer font-bold text-center py-2.5 rounded-xl transition-all text-xs ${
            activeTab === 'pos'
              ? 'bg-brand-600 text-white shadow shadow-emerald-500/10'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          POS Móvil
        </button>
        <button
          onClick={() => setActiveTab('cobros')}
          className={`cursor-pointer font-bold text-center py-2.5 rounded-xl transition-all text-xs ${
            activeTab === 'cobros'
              ? 'bg-brand-600 text-white shadow shadow-emerald-500/10'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Cobros CxC
        </button>
      </div>

      {/* ─── TAB CONTENT: ENTREGAS PROGRAMADAS ────────────────────────────── */}
      {activeTab === 'entregas' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          
          {!activeDelivery ? (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Entregas Asignadas</span>
              
              {route.pedidos.length === 0 ? (
                <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-400 text-xs">
                  Sin entregas programadas en esta ruta.
                </div>
              ) : (
                route.pedidos.map(p => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{p.facturaNumero}</span>
                        <span className={`text-[9px] font-black px-1.5 rounded border uppercase leading-none py-0.5 ${
                          p.estadoEntrega === 'PENDIENTE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          p.estadoEntrega === 'ENTREGADO' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {p.estadoEntrega}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-700 text-xs truncate w-[200px] mt-1">{p.clienteNombre}</h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Monto: L{p.totalFactura.toFixed(2)}</span>
                    </div>

                    {p.estadoEntrega === 'PENDIENTE' && (
                      <button
                        onClick={() => {
                          setActiveDelivery(p);
                          setDeliveryStatus('ENTREGADO');
                        }}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-[10px] px-3 py-2 rounded-lg cursor-pointer"
                      >
                        Entregar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Delivery check-out screen */
            <form onSubmit={handleSubmitDelivery} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 animate-in slide-in-from-right duration-250">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveDelivery(null)}
                  className="text-slate-400 hover:text-slate-600 mr-1 p-1 rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">Checkout de Pedido</span>
                  <h4 className="font-black text-slate-900 text-xs mt-0.5">{activeDelivery.facturaNumero} - {activeDelivery.clienteNombre}</h4>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryStatus('ENTREGADO')}
                  className={`py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                    deliveryStatus === 'ENTREGADO'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  Entregado
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryStatus('RECHAZADO')}
                  className={`py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                    deliveryStatus === 'RECHAZADO'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/10'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  Rechazado / Devolución
                </button>
              </div>

              {deliveryStatus === 'RECHAZADO' ? (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Motivo del Rechazo</label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2.5 text-xs font-bold"
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="Cerrado">Negocio Cerrado</option>
                    <option value="Rechazo Calidad">Flores en mal estado / Rechazo</option>
                    <option value="Falta Pago">No se completó el pago contra entrega</option>
                    <option value="Cancelado">Cliente canceló el pedido</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Total indicator */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Total a Cobrar:</span>
                    <span className="text-sm font-black text-slate-900">L{activeDelivery.totalFactura.toFixed(2)}</span>
                  </div>

                  {/* Payment Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500">Forma de Pago Recibida</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value as any);
                        if (e.target.value === 'CREDITO') setAmountCollected('0');
                        else setAmountCollected('');
                      }}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2.5 text-xs font-bold"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia / Depósito</option>
                      <option value="CREDITO">Crédito CxC (Sin cobro en ruta)</option>
                    </select>
                  </div>

                  {paymentMethod !== 'CREDITO' && (
                    <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                      <label className="text-[10px] font-bold text-slate-500">Importe Cobrado (Monto)</label>
                      <input
                        type="number"
                        placeholder={activeDelivery.totalFactura.toString()}
                        value={amountCollected}
                        onChange={(e) => setAmountCollected(e.target.value)}
                        className="w-full border border-slate-350 bg-white rounded-lg p-2.5 text-xs font-bold text-right"
                      />
                    </div>
                  )}

                  {/* HTML5 Canvas signature pad */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500">Firma Digital del Cliente</label>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-rose-600 text-[10px] font-bold hover:underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                    
                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                      <canvas
                        ref={canvasRef}
                        width={350}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-[120px] bg-slate-50 touch-none block"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Checkout button */}
              <button
                type="submit"
                onClick={saveCanvasSignature}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-3 rounded-lg mt-2 cursor-pointer"
              >
                Confirmar Transacción
              </button>
            </form>
          )}

        </div>
      )}

      {/* ─── TAB CONTENT: POS AUTO-VENTA ─────────────────────────────────── */}
      {activeTab === 'pos' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          
          {/* Cart preview floating banner */}
          {cart.length > 0 && (
            <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md flex items-center justify-between text-xs animate-in slide-in-from-top duration-300">
              <span className="font-bold flex items-center gap-1">
                <ShoppingCart className="w-4 h-4" />
                {cart.reduce((acc, curr) => acc + curr.cantidad, 0)} Tallos en Carrito
              </span>
              <span className="font-black">Total: L{cartTotal.toFixed(2)}</span>
            </div>
          )}

          {/* POS Selector & Checkout Form */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checkout Auto-Venta</span>
            
            <form onSubmit={handlePosSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Cliente de Ruta</label>
                <select
                  value={posClient}
                  onChange={(e) => setPosClient(e.target.value)}
                  className="w-full border border-slate-350 bg-white rounded-lg p-2.5 text-xs font-bold"
                  required
                >
                  <option value="">Seleccione Cliente...</option>
                  {cediClients.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Forma Pago</label>
                  <select
                    value={posPaymentMethod}
                    onChange={(e) => setPosPaymentMethod(e.target.value as any)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Referencia</label>
                  <input
                    type="text"
                    placeholder="Ref. / Nro."
                    value={posRef}
                    onChange={(e) => setPosRef(e.target.value)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                    disabled={posPaymentMethod === 'CREDITO'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs py-3 rounded-lg mt-2 cursor-pointer shadow-md shadow-brand-500/10"
              >
                Generar Factura (Auto-Venta)
              </button>
            </form>
          </div>

          {/* Catalog STRICTLY LIMITED to Route Truck Stock */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Catálogo Disponible en Camión (Stock)
            </span>

            <div className="flex flex-col gap-2">
              {route.inventario.length === 0 ? (
                <div className="bg-white border border-slate-200 p-6 rounded-xl text-center text-slate-400 text-xs">
                  No hay stock cargado en este camión.
                </div>
              ) : (
                route.inventario.map(item => {
                  const cargado = item.cantidadCargada;
                  const vendido = item.cantidadVendida + item.cantidadEntregada;
                  const merma = item.cantidadMerma;
                  const disponible = cargado - (vendido + merma);
                  
                  const cartItem = cart.find(ci => ci.productoId === item.productoId);
                  const cartQty = cartItem ? cartItem.cantidad : 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between"
                    >
                      <div className="overflow-hidden mr-2">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{item.productoSku}</span>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate leading-snug">{item.productoNombre}</h4>
                        <div className="flex gap-2 mt-0.5 text-[9px] font-black">
                          <span className="text-slate-500">Cargado: {cargado}</span>
                          <span className="text-emerald-700">Disponible: {disponible}</span>
                        </div>
                      </div>

                      {disponible <= 0 ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">Agotado</span>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cartQty > 0 ? (
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.productoId, cartQty - 1)}
                                className="w-8 h-8 flex items-center justify-center font-black text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-black text-slate-800">{cartQty}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.productoId, cartQty + 1)}
                                className="w-8 h-8 flex items-center justify-center font-black text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item.productoId)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] px-3 py-2 rounded-lg cursor-pointer border border-emerald-250 transition-colors"
                            >
                              Agregar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: COBROS CXC ─────────────────────────────────────── */}
      {activeTab === 'cobros' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cobro de Cuentas por Cobrar</span>
            </div>

            <form onSubmit={handleCxcSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Cliente Deudor</label>
                <select
                  value={cxcClient}
                  onChange={(e) => setCxcClient(e.target.value)}
                  className="w-full border border-slate-350 bg-white rounded-lg p-2.5 text-xs font-bold"
                  required
                >
                  <option value="">Seleccione Cliente...</option>
                  {cediClients.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Monto Abono (Lps)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cxcAmount}
                  onChange={(e) => setCxcAmount(e.target.value)}
                  className="w-full border border-slate-350 bg-white rounded-lg p-2.5 text-xs font-bold text-right"
                  required
                  min={1}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Método Pago</label>
                  <select
                    value={cxcPaymentMethod}
                    onChange={(e) => setCxcPaymentMethod(e.target.value as any)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">Nro Referencia</label>
                  <input
                    type="text"
                    placeholder="Referencia"
                    value={cxcRef}
                    onChange={(e) => setCxcRef(e.target.value)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-3 rounded-lg mt-2 cursor-pointer shadow-md shadow-brand-500/10"
              >
                Registrar Abono CxC
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ─── TICKET PRINTER SIMULATOR MODAL (80mm) ────────────────────────── */}
      {ticketModalData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-2xl p-4 flex flex-col gap-4 overflow-y-auto max-h-[85vh]">
            
            <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
              <span className="text-xs font-black text-slate-700 uppercase flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" />
                VOUCHER TICKET
              </span>
              <button
                onClick={() => setTicketModalData(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Ticket Content (Styled like thermal ticket) */}
            <div className="bg-yellow-50/20 border border-slate-150 p-4 font-mono text-[10px] text-slate-800 flex flex-col gap-2 rounded-lg leading-relaxed">
              <div className="text-center font-bold">
                <span className="text-xs font-black block">DISTRIBUIDORA PARAÍSO FLORAL</span>
                <span>BARRIO GUAMILITO, SPS, HONDURAS</span>
                <span className="block">RTN: 05011990123456</span>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 flex flex-col gap-0.5">
                <div>FACTURA: {ticketModalData.numeroFactura}</div>
                <div>FECHA: {new Date().toLocaleString('es-HN')}</div>
                <div>CLIENTE: {ticketModalData.clienteNombre}</div>
                <div>FORMA PAGO: {ticketModalData.formaPago}</div>
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-slate-300 py-2 my-1">
                <div className="grid grid-cols-12 font-bold mb-1">
                  <span className="col-span-6">DESC</span>
                  <span className="col-span-2 text-center">CANT</span>
                  <span className="col-span-4 text-right">TOTAL</span>
                </div>
                {ticketModalData.items.map((item: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-12">
                    <span className="col-span-6 truncate">{item.productoNombre}</span>
                    <span className="col-span-2 text-center">{item.cantidad}</span>
                    <span className="col-span-4 text-right">L{(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-end gap-0.5 font-bold">
                <div>SUBTOTAL: L{(ticketModalData.total / 1.15).toFixed(2)}</div>
                <div>ISV (15%): L{(ticketModalData.total - (ticketModalData.total / 1.15)).toFixed(2)}</div>
                <div className="text-xs font-black border-t border-slate-350 pt-1 mt-0.5">
                  TOTAL: L{ticketModalData.total.toFixed(2)}
                </div>
              </div>

              <div className="text-center mt-3 border-t border-dashed border-slate-300 pt-2 text-[9px] font-bold">
                ¡GRACIAS POR SU COMPRA!
                <span className="block mt-0.5">FACTURA EN RUTA / MÓVIL POS</span>
              </div>
            </div>

            {/* Print button */}
            <button
              onClick={() => {
                window.print();
              }}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Recibo (Bluetooth)
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
