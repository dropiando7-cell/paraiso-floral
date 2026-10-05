'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Copy, 
  Check, 
  Sparkles, 
  Package, 
  Barcode, 
  QrCode, 
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  SendHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { crearPedidoPruebaTicket } from './actions';
import Link from 'next/link';

export interface ProductItem {
  code: string;
  name: string;
  price?: number;
  category?: string;
  unit?: string;
  stock?: number;
  productoId?: string;
  qtySuggested?: number;
}

// Respaldo de los productos etiquetados en CEDI por si no carga la BD
const FALLBACK_CEDI_PRODUCTS: ProductItem[] = [
  { code: '000069', name: 'BABY ECUADOR', price: 130, category: 'CAMARA FRIA - 1', unit: 'paq', stock: 195, qtySuggested: 2 },
  { code: '010043', name: 'BABY NORMAL', price: 100, category: 'CAMARA FRIA - 1', unit: 'paq', stock: 13, qtySuggested: 1 },
  { code: '000068', name: 'BABY GUATEMALA', price: 90, category: 'CAMARA FRIA - 1', unit: 'paq', stock: 0, qtySuggested: 1 },
  { code: '000070', name: 'ROSA FREEDOM ROJA', price: 350, category: 'CAMARA FRIA - 1', unit: 'paq', stock: 50, qtySuggested: 2 },
  { code: '000071', name: 'SOLIDAGO ECUADOR', price: 200, category: 'CAMARA FRIA - 2', unit: 'atados', stock: 40, qtySuggested: 5 },
  { code: '000072', name: 'GIRASOLES', price: 250, category: 'CAMARA FRIA - 2', unit: 'tallos', stock: 100, qtySuggested: 10 }
];

interface Props {
  inventoryProducts: ProductItem[];
}

export default function SimuladorEtiquetasClient({ inventoryProducts }: Props) {
  const sourceProducts = inventoryProducts.length > 0 ? inventoryProducts : FALLBACK_CEDI_PRODUCTS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [copied, setCopied] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{ id: string; code: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');

  // List of distinct areas in inventory
  const areas = useMemo(() => {
    const set = new Set<string>();
    sourceProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [sourceProducts]);

  // Filter products by search and area
  const filteredList = useMemo(() => {
    return sourceProducts.filter(item => {
      const matchesSearch = searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesArea = selectedArea === 'all' || item.category === selectedArea;

      return matchesSearch && matchesArea;
    });
  }, [sourceProducts, searchQuery, selectedArea]);

  // If search changes and index is out of bounds, reset index
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery, selectedArea]);

  const currentProduct = filteredList[currentIndex] || filteredList[0] || sourceProducts[0];

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : filteredList.length - 1));
  }, [filteredList.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < filteredList.length - 1 ? prev + 1 : 0));
  }, [filteredList.length]);

  // Keyboard Navigation: Left & Right arrows
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePrev, handleNext]);

  const handleCopyCode = () => {
    if (!currentProduct) return;
    navigator.clipboard.writeText(currentProduct.code);
    setCopied(true);
    toast.success(`Código copiado: ${currentProduct.code}`);
    setTimeout(() => setCopied(false), 2000);
  };

  // Create test order using the real products from the inventory
  const handleCreateTestOrder = async () => {
    setIsCreatingOrder(true);
    try {
      // Pick first 5 items from the filtered list (or at least 3)
      const sampleItems = filteredList.slice(0, 5).map(p => ({
        code: p.code,
        name: p.name,
        qty: p.qtySuggested || 2,
        productoId: p.productoId
      }));

      if (sampleItems.length === 0) {
        toast.error('No hay productos seleccionados para crear el pedido');
        return;
      }

      const res = await crearPedidoPruebaTicket(sampleItems);
      if (res.success && res.pedidoId) {
        setCreatedOrder({ id: res.pedidoId, code: res.codigoPedido });
        toast.success(`¡Pedido de prueba creado con éxito: ${res.codigoPedido}!`, { duration: 5000 });
      } else {
        toast.error(res.error || 'Error al crear pedido');
      }
    } catch {
      toast.error('Error de comunicación con el servidor');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // URL de la etiqueta oficial generada en tiempo real con el ID QR exacto (ej. 000069)
  const labelImageUrl = currentProduct 
    ? `/api/impresion/generar-etiqueta?idQr=${encodeURIComponent(currentProduct.code)}&descripcion=${encodeURIComponent(currentProduct.name)}&size=50x25`
    : '';

  // Scale styles
  const scaleClass = zoomLevel === 'normal' 
    ? 'scale-100 max-w-[399px]' 
    : zoomLevel === 'large' 
      ? 'scale-125 sm:scale-135 max-w-[399px]' 
      : 'scale-150 sm:scale-175 max-w-[399px]';

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 select-none">
      
      {/* ─── TOP BAR (SuperAdmin) ─── */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            SA
          </div>
          <div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
              Entorno de Pruebas • Códigos Reales de Inventario
            </span>
            <span className="text-xs text-slate-600 font-bold">
              {sourceProducts.length} Productos Etiquetados en CEDI
            </span>
          </div>
        </div>

        {/* Search & Area Filter Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar código (ej. 000069)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-800 text-slate-900 placeholder-slate-400"
            />
          </div>

          {areas.length > 0 && (
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-slate-800"
            >
              <option value="all">Todas las Áreas</option>
              {areas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ─── MAIN SIMULATOR VIEW (Exact layout of user's Image 1) ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full">
        
        {/* Title from Image 1: "Entorno de pruebas" */}
        <h1 className="text-3xl sm:text-5xl font-normal tracking-tight text-slate-950 mb-8 sm:mb-12 text-center">
          Entorno de pruebas
        </h1>

        {/* Carousel Container matching Image 1: Left Chevron + Label Card + Right Chevron */}
        <div className="w-full flex items-center justify-center gap-4 sm:gap-12 relative my-4">
          
          {/* Left Arrow Button (Image 1 style) */}
          <button
            onClick={handlePrev}
            className="w-12 h-20 sm:w-16 sm:h-28 flex items-center justify-center text-slate-900 hover:text-slate-600 active:scale-90 transition-all cursor-pointer z-10"
            title="Anterior (Flecha Izquierda ←)"
          >
            <ChevronLeft className="w-12 h-12 sm:w-16 sm:h-16 stroke-[2]" />
          </button>

          {/* Central Label Card */}
          <div className="flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px]">
            {currentProduct ? (
              <div className={`transition-transform duration-150 ease-out origin-center ${scaleClass}`}>
                
                {/* Outer Label Container with crisp border and shadow */}
                <div className="bg-white rounded-lg p-2 border-2 border-slate-300 shadow-xl overflow-hidden hover:border-slate-500 transition-colors">
                  <img
                    src={labelImageUrl}
                    alt={`Etiqueta ${currentProduct.name} - ${currentProduct.code}`}
                    className="w-full h-auto block select-none pointer-events-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs">
                No se encontraron productos coincidentes.
              </div>
            )}
          </div>

          {/* Right Arrow Button (Image 1 style) */}
          <button
            onClick={handleNext}
            className="w-12 h-20 sm:w-16 sm:h-28 flex items-center justify-center text-slate-900 hover:text-slate-600 active:scale-90 transition-all cursor-pointer z-10"
            title="Siguiente (Flecha Derecha → o Barra Espaciadora)"
          >
            <ChevronRight className="w-12 h-12 sm:w-16 sm:h-16 stroke-[2]" />
          </button>

        </div>

        {/* Product Details & Zoom Toolbar */}
        {currentProduct && (
          <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-md text-center">
            
            {/* Index Counter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Ítem {currentIndex + 1} de {filteredList.length}
              </span>
            </div>

            {/* Active Product Name, Real Correlativo and Stock */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full flex items-center justify-between shadow-2xs">
              <div className="text-left">
                <span className="text-base font-black text-slate-950 block">
                  {currentProduct.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ID QR: {currentProduct.code}
                  </span>
                  {currentProduct.category && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                      {currentProduct.category}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Stock CEDI</span>
                <span className="text-sm font-black text-slate-900">
                  {currentProduct.stock ?? '—'} {currentProduct.unit || 'paq'}
                </span>
              </div>
            </div>

            {/* Utility Buttons: Zoom & Copy */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleCopyCode}
                className="flex-1 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 active:scale-95 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? '¡Copiado!' : `Copiar "${currentProduct.code}"`}</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setZoomLevel('normal')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    zoomLevel === 'normal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  1x
                </button>
                <button
                  onClick={() => setZoomLevel('large')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    zoomLevel === 'large' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  1.5x
                </button>
                <button
                  onClick={() => setZoomLevel('xlarge')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    zoomLevel === 'xlarge' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  2x
                </button>
              </div>
            </div>

            {/* Quick Helper Text */}
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
              💡 <b>Tip de escaneo:</b> Apunta el láser de la terminal LANDI M20SE directamente al código de barras en pantalla. Pulsa las flechas <b>←</b> y <b>→</b> para pasar al siguiente producto.
            </p>
          </div>
        )}

      </div>

      {/* ─── BOTTOM ACTION: TEST ORDER GENERATOR WITH REAL PRODUCTS ─── */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-950 block">
                Generador de Pedido de Prueba con Códigos Reales
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Crea un pedido con estos mismos productos (ej. 000069 BABY ECUADOR) para escanearlos desde la terminal LANDI.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {createdOrder ? (
              <Link
                href={`/inventario-ventas/pedidos/preparar/${createdOrder.id}`}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Abrir Alisto en LANDI ({createdOrder.code})</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={handleCreateTestOrder}
                disabled={isCreatingOrder}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-950 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-slate-950/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>{isCreatingOrder ? 'Creando Pedido...' : 'Crear Pedido de Prueba en CEDI'}</span>
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
