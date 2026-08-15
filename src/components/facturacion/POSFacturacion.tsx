'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Search, Plus, Minus, Trash2, Printer, X, Monitor, Zap, User, CreditCard, 
  Banknote, ShoppingCart, CheckCircle2, QrCode, LayoutGrid, List, Grid3X3, 
  ArrowDownCircle, FileText, Keyboard, Save, ArrowLeft, UserPlus, UserCheck, 
  Loader2, Building2, Phone, Mail, MapPin, Sparkles, FileBadge, Receipt, ZoomIn, ZoomOut, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { searchClientes } from '@/app/(dashboard)/facturas/actions';
import { crearClienteAction } from '@/app/(dashboard)/soporte/actions';
import { crearProducto } from '@/app/(dashboard)/precios/actions';

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
  codigoBarras?: string | null;
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
  organization?: {
    name?: string;
    direccion?: string;
    telefono?: string;
    correoContacto?: string;
    rtn?: string;
    logoUrl?: string;
  };
}

export const HONDURAS_BANKS = [
  // Top 5 Popular Honduran Banks
  { id: 'ficohsa', name: 'Ficohsa', logo: '/logos_bancos/ficohsa.png', popular: true },
  { id: 'atlantida', name: 'Atlántida', logo: '/logos_bancos/atlantida.png', popular: true },
  { id: 'bac', name: 'BAC Credomatic', logo: '/logos_bancos/bac.png', popular: true },
  { id: 'occidente', name: 'Banco de Occidente', logo: '/logos_bancos/occidente.png', popular: true },
  { id: 'banpais', name: 'Banpaís', logo: '/logos_bancos/banpais.png', popular: true },

  // Other Honduran Banks
  { id: 'davivienda', name: 'Davivienda', logo: '/logos_bancos/davivienda.png', popular: false },
  { id: 'lafise', name: 'LAFISE', logo: '/logos_bancos/lafise.png', popular: false },
  { id: 'cuscatlan', name: 'Cuscatlán', logo: '/logos_bancos/cuscatlan.png', popular: false },
  { id: 'banrural', name: 'Banrural', logo: '/logos_bancos/banrural.png', popular: false },
  { id: 'promerica', name: 'Promerica', logo: '/logos_bancos/promerica.png', popular: false },
  { id: 'azteca', name: 'Banco Azteca', logo: '/logos_bancos/azteca.png', popular: false },
  { id: 'ficensa', name: 'Ficensa', logo: '/logos_bancos/ficensa.png', popular: false },
  { id: 'banhcafe', name: 'Banhcafé', logo: '/logos_bancos/banhcafe.png', popular: false },
  { id: 'popular', name: 'Banco Popular', logo: '/logos_bancos/popular.png', popular: false },
];

export default function POSFacturacion({ productos, categorias, onEmitirFactura, cajeroNombre, modoKiosko = false, organization }: Props) {
  const router = useRouter();
  
  // State
  const [localProducts, setLocalProducts] = useState<POSProduct[]>(productos);

  useEffect(() => {
    setLocalProducts(productos);
  }, [productos]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Client Selection & Creation State
  const [clientName, setClientName] = useState('CONSUMIDOR FINAL');
  const [selectedClient, setSelectedClient] = useState<{ id?: string; nombre: string; rtn?: string; telefono?: string; email?: string } | null>(null);
  
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Quick Add Client Modal
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nombre: '',
    rtn: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  // Quick Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    nombre: '',
    precioVenta: '',
    costoBase: '',
    stockActual: '100'
  });

  const [viewMode, setViewMode] = useState<'large' | 'small' | 'list'>('small');
  const [visibleCount, setVisibleCount] = useState(24);
  
  // Modals & Pinch Zoom State
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTicketPreviewModal, setShowTicketPreviewModal] = useState(false);
  const [ticketZoom, setTicketZoom] = useState(1.2);
  const touchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.2);

  const handleTicketTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialZoomRef.current = ticketZoom;
    }
  };

  const handleTicketTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      const newZoom = Math.min(2.5, Math.max(0.75, initialZoomRef.current * scale));
      setTicketZoom(Number(newZoom.toFixed(2)));
    }
  };

  const handleTicketTouchEnd = () => {
    touchStartDistRef.current = null;
  };
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const [lastFacturaId, setLastFacturaId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [selectedBank, setSelectedBank] = useState<string | null>('ficohsa');
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showMobileCartSheet, setShowMobileCartSheet] = useState(false);
  const [animatingProductId, setAnimatingProductId] = useState<string | null>(null);

  const totalCartItemsCount = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);

  const getItemCartQty = useCallback((productId: string) => {
    const item = cart.find(i => i.id === productId);
    return item ? item.qty : 0;
  }, [cart]);

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

  // Scanner Refs
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Client Search & Creation Handlers
  const handleClientSearchChange = async (val: string) => {
    setClientName(val.toUpperCase());
    setIsSearchingClients(true);
    setShowClientDropdown(true);
    try {
      const q = val.trim().toUpperCase() === 'CONSUMIDOR FINAL' ? '' : val;
      const res = await searchClientes(q);
      setClientSearchResults(res || []);
    } catch (e) {
      console.error('Error searching clients:', e);
    } finally {
      setIsSearchingClients(false);
    }
  };

  const handleFocusClientSearch = async () => {
    setIsSearchingClients(true);
    setShowClientDropdown(true);
    try {
      const q = clientName.trim().toUpperCase() === 'CONSUMIDOR FINAL' ? '' : clientName;
      const res = await searchClientes(q);
      setClientSearchResults(res || []);
    } catch (e) {
      console.error('Error searching clients:', e);
    } finally {
      setIsSearchingClients(false);
    }
  };

  const handleSelectClient = (c: any) => {
    const upperName = c.nombre ? c.nombre.toUpperCase() : 'CONSUMIDOR FINAL';
    setClientName(upperName);
    setSelectedClient({ ...c, nombre: upperName });
    setShowClientDropdown(false);
    toast.success(`Cliente "${upperName}" seleccionado`);
  };

  const handleResetToConsumidorFinal = () => {
    setClientName('CONSUMIDOR FINAL');
    setSelectedClient(null);
    setShowClientDropdown(false);
  };

  const handleSaveNewClient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newClientData.nombre.trim()) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    setIsSavingClient(true);
    try {
      const res = await crearClienteAction({
        nombre: newClientData.nombre,
        rtn: newClientData.rtn || null,
        telefono: newClientData.telefono || null,
        email: newClientData.email || null,
        direccion: newClientData.direccion || null
      });

      if (!res.success || !res.cliente) {
        throw new Error(res.error || 'No se pudo crear el cliente');
      }

      setClientName(res.cliente.nombre);
      setSelectedClient({
        id: res.cliente.id,
        nombre: res.cliente.nombre,
        rtn: res.cliente.rtn || undefined,
        telefono: res.cliente.telefono || undefined,
        email: res.cliente.email || undefined
      });
      toast.success(`Cliente "${res.cliente.nombre}" guardado y seleccionado`);
      setShowAddClientModal(false);
      setNewClientData({ nombre: '', rtn: '', telefono: '', email: '', direccion: '' });
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el cliente');
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleSaveNewProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProductData.nombre.trim()) {
      toast.error('El nombre de la flor o producto es obligatorio');
      return;
    }
    const precio = parseFloat(newProductData.precioVenta) || 0;
    if (precio <= 0) {
      toast.error('Ingrese un precio de venta válido');
      return;
    }
    const costo = parseFloat(newProductData.costoBase) || 0;
    const stock = parseInt(newProductData.stockActual) || 100;

    setIsSavingProduct(true);
    try {
      const sku = 'FLOR-' + String(Date.now()).slice(-6);
      const res = await crearProducto({
        codigo: sku,
        descripcion: newProductData.nombre,
        precioVenta: precio,
        costoBase: costo
      });

      if (!res.success || !res.producto) {
        throw new Error(res.message || 'Error al crear la flor o producto');
      }

      const createdItem: POSProduct = {
        id: res.producto.id,
        sku: res.producto.sku || sku,
        nombre: res.producto.nombre,
        precioVenta: Number(res.producto.precioVenta),
        stockActual: stock,
        isvAplicable: 15,
        esServicio: false,
        isActivoFijo: false
      };

      setLocalProducts(prev => [createdItem, ...prev]);
      
      // Auto add to cart
      addToCart(createdItem);
      
      toast.success(`"${createdItem.nombre}" creado y agregado al ticket`);
      setShowAddProductModal(false);
      setNewProductData({ nombre: '', precioVenta: '', costoBase: '', stockActual: '100' });
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el producto');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Computed: Products Filtered
  const filteredProducts = useMemo(() => {
    return localProducts.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = activeCategory === 'all' || true;
      return matchSearch && matchCat;
    });
  }, [localProducts, searchTerm, activeCategory]);

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
    setAnimatingProductId(p.id);
    setTimeout(() => setAnimatingProductId(null), 400);

    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.id === p.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1
        };
        return updated;
      }
      return [{ 
        ...p, 
        qty: 1, 
        discountPercentage: 0, 
        cartId: `${p.id}-${Date.now()}`,
        taxState: p.isvAplicable === 15 ? 'isv15' : p.isvAplicable === 18 ? 'isv18' : 'exento'
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

  // Keyboard Shortcuts & Scanner Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();

      // --- Scanner Logic ---
      if (e.key.length === 1) {
        const timeDiff = now - lastKeyTimeRef.current;
        if (timeDiff < 200) {
          // Fast typing (Scanner)
          barcodeBufferRef.current += e.key;
        } else {
          // Human typing (Reset)
          barcodeBufferRef.current = e.key;
        }
        lastKeyTimeRef.current = now;
      }

      // If Enter is pressed, check if it was from a fast scan
      if (e.key === 'Enter' && barcodeBufferRef.current.length > 2) {
         const timeDiff = now - lastKeyTimeRef.current;
         if (timeDiff < 200) {
            e.preventDefault();
            const scannedSku = barcodeBufferRef.current.replace(/'/g, '-');
            barcodeBufferRef.current = '';
            
            // Find exact SKU or barcode
            const product = productos.find(p => p.sku.toLowerCase() === scannedSku.toLowerCase() || (p.codigoBarras && p.codigoBarras.toLowerCase() === scannedSku.toLowerCase()));
            if (product) {
               addToCart(product);
               setSearchTerm(''); // Clear input so scanner garbage is removed
               return; // Stop processing further
            }
         }
      }
      // --- End Scanner Logic ---

      if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== searchInputRef.current && e.key !== 'Escape' && e.key !== 'Enter') {
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
  }, [cart.length, showCheckout, showSuccess, filteredProducts, addToCart, productos]);

  const renderClientSection = () => (
    <div className="bg-white border-b border-slate-200 p-3 space-y-2 relative">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <User size={12} className="text-indigo-600" />
          <span>Cliente / Facturar A</span>
        </label>
        {selectedClient ? (
          <button
            type="button"
            onClick={handleResetToConsumidorFinal}
            className="text-[10px] font-black text-rose-500 hover:underline uppercase"
          >
            CONSUMIDOR FINAL
          </button>
        ) : (
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
            CONSUMIDOR FINAL
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 relative">
        <div className="relative flex-1">
          <input
            type="text"
            value={clientName}
            onChange={e => handleClientSearchChange(e.target.value)}
            onFocus={handleFocusClientSearch}
            placeholder="Buscar o ingresar cliente (ej: CONSUMIDOR FINAL, Nombre, RTN)..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none transition-all uppercase"
          />
          {isSearchingClients && (
            <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-indigo-500" />
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAddClientModal(true)}
          className="px-2.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm shrink-0 transition-transform"
          title="Agregar Nuevo Cliente"
        >
          <UserPlus size={14} />
          <span className="text-xs">+ Nuevo</span>
        </button>
      </div>

      {/* Selected Client Badges */}
      {selectedClient && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-2 text-[11px] space-y-0.5">
          <p className="font-semibold text-indigo-950 flex items-center gap-1 uppercase">
            <UserCheck size={13} className="text-indigo-600 shrink-0" />
            <span>{selectedClient.nombre.toUpperCase()}</span>
          </p>
          {selectedClient.rtn && (
            <p className="text-indigo-700 font-mono text-[10px] pl-4">
              RTN/DNI: <span className="font-semibold">{selectedClient.rtn}</span>
            </p>
          )}
          {selectedClient.telefono && (
            <p className="text-slate-600 text-[10px] pl-4">
              Tel: {selectedClient.telefono}
            </p>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showClientDropdown && clientSearchResults.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
          {clientSearchResults.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectClient(c)}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-slate-800 uppercase tracking-wide">{c.nombre.toUpperCase()}</p>
                <p className="text-[10px] text-slate-500 font-normal">
                  {c.rtn ? `RTN: ${c.rtn}` : c.telefono ? `Tel: ${c.telefono}` : 'Cliente registrado'}
                </p>
              </div>
              <UserCheck size={14} className="text-indigo-500 opacity-80" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const fmt = (v: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(v);

  return (
    <div className={`flex flex-col h-screen h-[100dvh] bg-[#F3F4F6] font-sans ${modoKiosko ? 'fixed inset-0 z-[1000] overflow-hidden' : 'relative w-full overflow-hidden'}`}>
      
      {/* HEADER POS - FIJO Y SIEMPRE VISIBLE */}
      <header className="bg-white px-3 sm:px-6 py-2.5 sm:py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-gray-200 shadow-sm shrink-0 z-20 print:hidden relative gap-2">
        
        {/* Mobile top bar (Image 2 style) */}
        <div className="flex md:hidden items-center justify-between bg-[#16a34a] text-white -mx-3 -mt-2.5 p-3 shadow-md mb-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/facturas')} 
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={() => setShowMobileCartSheet(true)}
              className="flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-sm"
            >
              <ShoppingCart size={15} />
              <span>Ticket</span>
              <span className="bg-white text-emerald-800 text-[11px] font-black px-1.5 py-0.2 rounded-full">
                {totalCartItemsCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (cart.length > 0) setShowMobileCartSheet(true);
              }}
              className="px-2.5 py-1 bg-emerald-700/60 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              Guardar
            </button>
            <button 
              onClick={() => {
                if (cart.length > 0) setShowCheckout(true);
              }}
              disabled={cart.length === 0}
              className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-900 font-black text-xs rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1"
            >
              <span>COBRAR</span>
              <span className="font-extrabold">{fmt(totals.total)}</span>
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center gap-4 shrink-0 w-1/4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Zap className="text-white fill-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">CAJA RÁPIDA</h1>
            <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-widest">{organization?.name || 'Distribuidora Paraíso Floral'}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl md:mx-8 relative z-30">
          <div className="relative group/search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-500 transition-colors" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto por código, nombre o escanea..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.replace(/'/g, '-'))}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200/50 focus:bg-white border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-xs sm:text-base font-semibold transition-all shadow-sm focus:shadow-md"
            />
          </div>
        </div>

        {/* Desktop Header Right */}
        <div className="hidden md:flex items-center gap-4 shrink-0 w-1/4 justify-end">
          <div className="text-right pr-4 border-r border-gray-200">
            <p className="text-sm font-bold text-gray-900">{cajeroNombre}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Cajero</p>
          </div>
          <button onClick={() => setShowShortcuts(true)} className="p-2.5 text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-xl transition-colors" title="Teclas de Acceso Rápido">
            <Keyboard size={16} />
          </button>
          <button onClick={() => router.push('/facturas')} title="Salir / Volver (ESC)" className="p-2.5 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-xl transition-all font-bold text-sm flex gap-2 items-center">
            <X size={16} /> Cerrar POS
          </button>
        </div>
      </header>

      {/* MAIN CONTENT DIVIDED */}
      <div className="flex flex-1 overflow-hidden print:hidden relative z-10 w-full pb-16 md:pb-0">
        
        {/* LEFT PANEL - PRODUCTS */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FB] overflow-hidden w-full">
          
          <div className="py-2 sm:py-4 px-2 sm:px-6 flex items-center justify-between border-b border-gray-100 bg-white/50 backdrop-blur shrink-0 z-10">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
               <button
                 onClick={() => setActiveCategory('all')}
                 className="px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold bg-indigo-600 text-white shadow-md shadow-indigo-600/20 whitespace-nowrap"
               >
                 Todos los artículos
               </button>
               <button
                 type="button"
                 onClick={() => setShowAddProductModal(true)}
                 className="px-3 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 whitespace-nowrap flex items-center gap-1 active:scale-95 transition-transform"
               >
                 <Plus size={14} />
                 <span>+ Nueva Flor</span>
               </button>
            </div>

            {/* Layout Toggles */}
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex items-center shadow-sm shrink-0">
                <button onClick={() => setViewMode('large')} title="Tarjetas Grandes" className={`p-1.5 rounded-lg transition-colors ${viewMode === 'large' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <LayoutGrid size={16} />
                </button>
                <button onClick={() => setViewMode('small')} title="Tarjetas Pequeñas" className={`p-1.5 rounded-lg transition-colors ${viewMode === 'small' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Grid3X3 size={16} />
                </button>
                <button onClick={() => setViewMode('list')} title="Vista de Lista" className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <List size={16} />
                </button>
            </div>
          </div>

          {/* Product Grid Area - SCROLLABLE (Image 2 style tight layout) */}
          <div className="flex-1 overflow-y-auto p-1.5 sm:p-6 hide-scrollbar relative">
            <div className={
              viewMode === 'large' ? 'grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-4' : 
              viewMode === 'small' ? 'grid grid-cols-3 xs:grid-cols-4 md:grid-cols-6 2xl:grid-cols-8 gap-1.5 sm:gap-3' : 
              'flex flex-col gap-1.5'
            }>
              {pagedProducts.map(p => {
                const qtyInCart = getItemCartQty(p.id);
                const isAnimating = animatingProductId === p.id;

                return (
                  <div 
                    key={p.id} 
                    onClick={() => addToCart(p)}
                    className={`bg-white cursor-pointer hover:shadow-xl border border-gray-200 shadow-xs transition-all group overflow-hidden relative select-none rounded-2xl p-1.5 sm:p-3 active:scale-95 ${
                      qtyInCart > 0 ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20' : 'hover:border-indigo-200'
                    } ${isAnimating ? 'scale-95 border-emerald-500 ring-4 ring-emerald-400/40' : ''}`}
                  >
                    {/* Quantity Badge on Product Card */}
                    {qtyInCart > 0 && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full shadow-md z-20 animate-in zoom-in-75">
                        x{qtyInCart}
                      </div>
                    )}

                    {/* Floating Fly-to-Cart Animation Indicator */}
                    {isAnimating && (
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-xl animate-bounce z-30 pointer-events-none">
                        +1
                      </div>
                    )}

                    <div className={`relative flex items-center justify-center overflow-hidden transition-colors ${
                      viewMode === 'list' ? 'w-14 h-14 bg-gray-50 rounded-xl mr-3 shrink-0' : 
                      'aspect-square bg-gray-50/80 rounded-xl mb-1.5 sm:mb-3 p-1.5 group-hover:bg-emerald-50/20'
                    }`}>
                       {p.imageUrl ? (
                         <img src={p.imageUrl} alt={p.nombre} className="w-full h-full object-contain mix-blend-multiply" />
                       ) : (
                         <span className="text-3xl sm:text-5xl font-black text-gray-200 group-hover:text-emerald-300 transition-colors uppercase">{p.nombre.substring(0,2)}</span>
                       )}
                       
                       {p.stockActual <= 5 && !p.esServicio && qtyInCart === 0 && (
                         <span className="absolute top-1 left-1 bg-rose-100 text-rose-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-xs">Bajo</span>
                       )}
                    </div>

                    <div className={viewMode === 'list' ? 'flex-1 min-w-0' : 'flex flex-col flex-1'}>
                      <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight text-xs sm:text-sm">{p.nombre}</h3>
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <p className="font-black text-emerald-600 text-xs sm:text-base">{fmt(p.precioVenta)}</p>
                        
                        {viewMode !== 'list' && (
                          <button className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors shadow-xs ${
                            qtyInCart > 0 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-600 group-hover:text-white'
                          }`}>
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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

        {/* RIGHT PANEL - TICKET - FIJO LATERAL EN DESKTOP */}
        <div className="hidden md:flex w-[420px] 2xl:w-[480px] bg-white border-l border-gray-200 flex-col shadow-2xl z-20 shrink-0 h-full">
          
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
            
            {/* Customer Select */}
            {renderClientSection()}
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

          {/* TOTALS & CHECKOUT - FIJO ABAJO DESKTOP */}
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

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md text-white p-2.5 px-3.5 flex items-center justify-between shadow-2xl border-t border-slate-800 md:hidden print:hidden hide-on-print">
        <button 
          onClick={() => setShowMobileCartSheet(true)}
          className="flex items-center gap-2 text-left"
        >
          <div className="relative bg-emerald-600 text-white p-2 rounded-xl">
            <ShoppingCart size={18} />
            {totalCartItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900">
                {totalCartItemsCount}
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide">
              {totalCartItemsCount} {totalCartItemsCount === 1 ? 'ítem' : 'ítems'} en Ticket
            </p>
            <p className="text-base font-black text-white leading-none">{fmt(totals.total)}</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileCartSheet(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl active:scale-95"
          >
            Ver Ticket
          </button>
          <button
            onClick={() => {
              if (cart.length > 0) setShowCheckout(true);
            }}
            disabled={cart.length === 0}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1 active:scale-95"
          >
            <span>Cobrar</span>
            <span className="text-[11px] font-black">{fmt(totals.total)}</span>
          </button>
        </div>
      </div>

      {/* MOBILE FULLSCREEN CART SUMMARY SHEET */}
      {showMobileCartSheet && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200 md:hidden print:hidden">
          <div className="bg-white rounded-t-3xl max-h-[90vh] flex flex-col w-full shadow-2xl animate-in slide-in-from-bottom duration-300">
            
            {/* Sheet Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-emerald-600" size={20} />
                <h3 className="text-base font-black text-slate-900">Resumen del Ticket</h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-extrabold px-2 py-0.5 rounded-full">
                  {totalCartItemsCount} ítems
                </span>
              </div>
              <button 
                onClick={() => setShowMobileCartSheet(false)}
                className="p-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer Select */}
            {renderClientSection()}

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[50vh]">
              {cart.map(item => (
                <div key={item.cartId} className="bg-slate-50 p-2.5 rounded-xl flex gap-2 border border-slate-200 relative">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-contain mix-blend-multiply" />
                    ) : (
                      <span className="font-black text-slate-400 text-base uppercase">{item.nombre.substring(0,2)}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate pr-6">{item.nombre}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] font-extrabold text-slate-400">L.</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.precioVenta}
                        onChange={(e) => changePrice(item.cartId, parseFloat(e.target.value) || 0)}
                        className="w-20 px-1.5 py-0.5 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        title="Haga clic para editar el precio de venta unitario"
                      />
                      <span className="text-[9px] font-bold text-slate-400">c/u</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <select
                        value={item.taxState}
                        onChange={(e) => changeTax(item.cartId, e.target.value as any)}
                        className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-200 text-slate-700"
                      >
                        <option value="exento">EXENTO</option>
                        <option value="exonerado">EXONERADO</option>
                        <option value="isv15">+15% ISV</option>
                        <option value="isv18">+18% ISV</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button 
                      onClick={() => removeLine(item.cartId)} 
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-slate-200">
                      <button onClick={() => changeQty(item.cartId, -1)} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded active:scale-95"><Minus size={12} /></button>
                      <span className="text-xs font-black w-5 text-center text-slate-900">{item.qty}</span>
                      <button onClick={() => changeQty(item.cartId, 1)} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded active:scale-95"><Plus size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">El ticket está vacío</p>
                </div>
              )}
            </div>

            {/* Sheet Footer */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              <div className="space-y-1 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Sub Total</span>
                  <span className="text-slate-900">{fmt(totals.subTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ISV 15%</span>
                  <span className="text-slate-900">{fmt(totals.isv15)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
                  <span>TOTAL A PAGAR</span>
                  <span className="text-emerald-600">{fmt(totals.total)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="px-3 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs border border-rose-200"
                  >
                    Vaciar
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMobileCartSheet(false);
                    if (cart.length > 0) setShowCheckout(true);
                  }}
                  disabled={cart.length === 0}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Banknote size={18} />
                  <span>COBRAR {fmt(totals.total)}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center print:hidden animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-screen">
             <div className="bg-[#111827] px-6 sm:px-8 py-6 sm:py-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                
                <button onClick={() => setShowCheckout(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-gray-800 rounded-full p-2.5 transition-all"><X size={16} /></button>
                <p className="text-gray-400 font-bold mb-1 uppercase tracking-widest text-xs sm:text-sm relative z-10">Monto Final a Pagar</p>
                <p className="text-3xl sm:text-5xl font-black text-white tracking-tight relative z-10 break-all px-2 py-2">{fmt(totals.total)}</p>
             </div>
             
             <div className="p-6 sm:p-8 pb-4 overflow-y-auto">
               <h3 className="font-bold text-gray-900 mb-4 text-xs sm:text-sm uppercase tracking-widest">Método de Pago</h3>
               <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                 {[
                   { id: 'Efectivo', icon: Banknote, active: 'bg-emerald-50 border-emerald-500 text-emerald-700', ring: 'ring-emerald-500/20' },
                   { id: 'Tarjeta', icon: CreditCard, active: 'bg-indigo-50 border-indigo-500 text-indigo-700', ring: 'ring-indigo-500/20' },
                   { id: 'Transferencia', icon: QrCode, active: 'bg-violet-50 border-violet-500 text-violet-700', ring: 'ring-violet-500/20' },
                 ].map(m => (
                   <button 
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all ${paymentMethod === m.id ? `${m.active} shadow-md ring-4 ${m.ring}` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                   >
                      <m.icon size={24} className="mb-1.5" />
                      <span className="font-bold text-xs sm:text-sm tracking-tight">{m.id}</span>
                      {paymentMethod === m.id && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-current shadow-sm" />}
                   </button>
                 ))}
               </div>

               {paymentMethod === 'Efectivo' && (
                 <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-widest">Efectivo Recibido</h3>
                   </div>
                   <input 
                      type="number"
                      autoFocus
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      placeholder="Ej. 1000"
                      className="w-full bg-gray-50 border-2 border-gray-200 text-gray-900 font-black text-2xl sm:text-4xl p-3.5 sm:p-5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center placeholder:text-gray-300"
                   />
                   <div className="grid grid-cols-4 gap-2 mt-3">
                     {[totals.total, totals.total + 100, totals.total + 500, totals.total + 1000].map((amt, i) => {
                        const roundedAmt = i === 0 ? totals.total : Math.ceil(amt / 100) * 100;
                        return (
                          <button key={i} onClick={() => setCashTendered(roundedAmt.toString())} className="bg-white border border-gray-200 text-gray-700 font-bold py-2.5 sm:py-3 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors text-xs sm:text-sm shadow-sm">
                            {i === 0 ? 'Exacto' : `L. ${roundedAmt}`}
                          </button>
                        );
                     })}
                   </div>
                   {Number(cashTendered) >= totals.total && (
                     <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-400 flex justify-between items-center animate-in zoom-in-95 shadow-inner">
                        <span className="font-black text-emerald-800 text-base sm:text-xl uppercase tracking-widest">Su Cambio</span>
                        <span className="font-black text-emerald-600 text-2xl sm:text-4xl">{fmt(Number(cashTendered) - totals.total)}</span>
                     </div>
                   )}
                 </div>
               )}

               {paymentMethod === 'Transferencia' && (
                 <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between items-center mb-2.5">
                     <h3 className="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-widest flex items-center gap-1.5">
                       <Building2 size={16} className="text-violet-600" />
                       <span>Selecciona Banco para Transferencia</span>
                     </h3>
                   </div>

                   {/* Top 5 Popular Honduran Banks Badges - GRID DE 3 COLUMNAS */}
                   <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                     {HONDURAS_BANKS.filter(b => b.popular).map(bank => {
                       const isSelected = selectedBank === bank.id;
                       return (
                         <button
                           key={bank.id}
                           type="button"
                           onClick={() => setSelectedBank(bank.id)}
                           className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer bg-white ${
                             isSelected 
                               ? 'border-violet-600 shadow-md ring-4 ring-violet-500/20 scale-102 z-10' 
                               : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                           }`}
                         >
                           <div className="w-full h-10 sm:h-12 flex items-center justify-center p-1">
                             <img src={bank.logo} alt={bank.name} className="max-h-full max-w-full object-contain" />
                           </div>
                           <span className="text-xs font-black text-slate-800 leading-tight mt-1 text-center truncate w-full">
                             {bank.name}
                           </span>
                           {isSelected && (
                             <div className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white rounded-full p-1 shadow-sm">
                               <CheckCircle2 size={14} />
                             </div>
                           )}
                         </button>
                       );
                     })}
                   </div>

                   {/* Expandable Remaining Banks - GRID DE 3 COLUMNAS */}
                   {showAllBanks && (
                     <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 pt-3 border-t border-dashed border-slate-200 animate-in fade-in zoom-in-95">
                       {HONDURAS_BANKS.filter(b => !b.popular).map(bank => {
                         const isSelected = selectedBank === bank.id;
                         return (
                           <button
                             key={bank.id}
                             type="button"
                             onClick={() => setSelectedBank(bank.id)}
                             className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer bg-white ${
                               isSelected 
                                 ? 'border-violet-600 shadow-md ring-4 ring-violet-500/20 scale-102 z-10' 
                                 : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                             }`}
                           >
                             <div className="w-full h-9 sm:h-11 flex items-center justify-center p-1">
                               <img src={bank.logo} alt={bank.name} className="max-h-full max-w-full object-contain" />
                             </div>
                             <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1 text-center truncate w-full">
                               {bank.name}
                             </span>
                             {isSelected && (
                               <div className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white rounded-full p-1 shadow-sm">
                                 <CheckCircle2 size={14} />
                               </div>
                             )}
                           </button>
                         );
                       })}
                     </div>
                   )}

                   {/* Expand/Collapse Toggle Button */}
                   <div className="text-center mt-2">
                     <button
                       type="button"
                       onClick={() => setShowAllBanks(!showAllBanks)}
                       className="text-[11px] font-extrabold text-violet-600 hover:text-violet-800 bg-violet-50 px-3 py-1 rounded-lg border border-violet-200 transition-colors cursor-pointer"
                     >
                       {showAllBanks ? '▲ Ocultar bancos secundarios' : '▼ Ver más bancos de Honduras (+9)'}
                     </button>
                   </div>

                   {/* Selected Bank Banner */}
                   {selectedBank && (
                     <div className="mt-3 p-3 bg-violet-50/80 border border-violet-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                       <div className="flex items-center gap-2.5">
                         <img 
                           src={HONDURAS_BANKS.find(b => b.id === selectedBank)?.logo} 
                           alt="Bank logo" 
                           className="w-8 h-8 object-contain bg-white p-1 rounded-lg border border-violet-200 shrink-0" 
                         />
                         <div>
                           <p className="font-black text-slate-900 leading-tight">
                             {HONDURAS_BANKS.find(b => b.id === selectedBank)?.name}
                           </p>
                           <p className="text-[10px] text-violet-700 font-medium">Pago vía transferencia bancaria</p>
                         </div>
                       </div>
                       <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-300">
                         ✓ Seleccionado
                       </span>
                     </div>
                   )}
                 </div>
               )}

               <button
                  onClick={handleCheckout}
                  disabled={isProcessing || (paymentMethod === 'Efectivo' && Number(cashTendered) > 0 && Number(cashTendered) < totals.total)}
                  className="w-full h-[60px] sm:h-[72px] bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg sm:text-xl rounded-[1.25rem] shadow-xl transition-all flex items-center justify-center gap-3 mt-auto mb-4"
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
           <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full flex flex-col items-center text-center shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10 zoom-in-95 relative">
              <button 
                  onClick={() => {
                     setShowSuccess(false);
                     setCart([]);
                     setCashTendered('');
                     setLastTicket(null);
                  }}
                  className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
                  title="Cerrar y nueva venta"
              >
                  <X size={18} />
              </button>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-inner ring-8 ring-emerald-50">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">¡Venta Exitosa!</h2>
              <p className="text-gray-500 font-medium text-xs sm:text-sm mb-1">La factura se ha generado y registrado en el inventario.</p>
              
              <div className="bg-indigo-50 border border-indigo-100 px-6 py-2.5 rounded-2xl mb-6 flex flex-col mt-3 w-full">
                 <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Correlativo Oficial</span>
                 <span className="text-indigo-700 font-black text-2xl sm:text-3xl">{lastTicket}</span>
              </div>
              
              <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs mb-3 w-full text-left pl-1">Opciones de Impresión / Previa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-6">
                <button 
                  onClick={() => setShowTicketPreviewModal(true)}
                  className="py-3.5 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 font-bold rounded-2xl hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs cursor-pointer"
                >
                  <Eye size={20} className="text-emerald-600" /> 
                  <span>Ver Recibo</span>
                </button>

                <button 
                  onClick={() => window.open(`/facturas/ver/${lastFacturaId}?print=true`, '_blank', 'noopener,noreferrer')}
                  className="py-3.5 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs cursor-pointer"
                >
                  <FileText size={20} className="text-indigo-600" /> 
                  <span>Formato Carta (PDF)</span>
                </button>
              </div>

              <button 
                  onClick={() => {
                     setShowSuccess(false);
                     setCart([]);
                     setCashTendered('');
                     setLastTicket(null);
                  }}
                  className="w-full py-4 bg-[#0500A3] hover:bg-indigo-900 text-white font-black text-base rounded-2xl shadow-lg shadow-indigo-950/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  <span>Continuar con otra venta</span>
              </button>
           </div>
        </div>
      )}

      {/* INTERACTIVE ZOOMABLE TICKET PREVIEW MODAL */}
      {showTicketPreviewModal && lastTicket && (
        <div className="fixed inset-0 z-[3500] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-4 print:hidden animate-in fade-in duration-200">
          
          {/* Top Bar with Zoom Controls & Close */}
          <div className="w-full max-w-lg bg-slate-900 text-white rounded-2xl p-3 px-4 flex items-center justify-between shadow-2xl border border-slate-800 shrink-0 gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="text-emerald-400 shrink-0" size={20} />
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-white">Vista Previa del Recibo</h3>
                <p className="text-[10px] text-slate-400 font-mono">{lastTicket}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button 
                  type="button"
                  onClick={() => setTicketZoom(z => Math.max(0.75, z - 0.25))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-base flex items-center justify-center cursor-pointer active:scale-95 text-white"
                  title="Alejar (Zoom Out)"
                >
                  -
                </button>
                <span className="w-12 text-center text-xs font-mono font-black text-emerald-400">
                  {Math.round(ticketZoom * 100)}%
                </span>
                <button 
                  type="button"
                  onClick={() => setTicketZoom(z => Math.min(2.5, z + 0.25))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-base flex items-center justify-center cursor-pointer active:scale-95 text-white"
                  title="Acercar (Zoom In)"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowTicketPreviewModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable & Pinchable Ticket Canvas */}
          <div 
            onTouchStart={handleTicketTouchStart}
            onTouchMove={handleTicketTouchMove}
            onTouchEnd={handleTicketTouchEnd}
            className="flex-1 w-full max-w-lg overflow-auto my-3 flex items-start justify-center bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 touch-pan-x touch-pan-y"
          >
            <div 
              style={{ transform: `scale(${ticketZoom})`, transformOrigin: 'center top' }}
              className="transition-transform duration-150 ease-out bg-white text-black p-5 rounded-xl shadow-2xl w-[80mm] min-w-[80mm] font-mono text-xs select-text border border-slate-300 my-2"
            >
              {/* Ticket Content Duplicate for Mobile Interactive Zoom */}
              <div className="text-center mb-3">
                <h2 className="font-black text-sm uppercase tracking-tight">{organization?.name || 'Distribuidora Paraíso Floral'}</h2>
                <p className="text-[10px] text-slate-600 mt-0.5">{organization?.direccion || 'San Pedro Sula, Cortés'}</p>
                {organization?.telefono && <p className="text-[10px] text-slate-600">Tel: {organization.telefono}</p>}
                {organization?.rtn && <p className="text-[10px] text-slate-600">RTN: {organization.rtn}</p>}
                <div className="my-2 border-b border-dashed border-slate-400" />
                <p className="text-xs font-bold text-indigo-900 font-sans">FACTURA OFICIAL: {lastTicket}</p>
                <p className="text-[10px] text-slate-500">{new Date().toLocaleString('es-HN')}</p>
                <p className="text-[10px] text-slate-700 text-left mt-2"><strong>Cliente:</strong> {clientName}</p>
                <p className="text-[10px] text-slate-700 text-left"><strong>Cajero:</strong> {cajeroNombre}</p>
              </div>

              <table className="w-full my-2 text-[11px] border-y border-dashed border-slate-400 py-1">
                <thead>
                  <tr className="text-left font-bold text-slate-600 border-b border-slate-200">
                    <th className="pb-1">Cant</th>
                    <th className="pb-1 px-1">Producto</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1 font-bold">{item.qty}</td>
                      <td className="py-1 px-1">{item.nombre}</td>
                      <td className="py-1 text-right font-bold">{fmt((item.precioVenta * item.qty) * (1 - item.discountPercentage / 100))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-0.5 text-right text-[11px] font-mono border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(totals.subTotal)}</span></div>
                <div className="flex justify-between"><span>ISV (15%):</span><span>{fmt(totals.isv15)}</span></div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>{fmt(totals.total)}</span>
                </div>
              </div>

              <div className="text-center mt-3 text-[10px] text-slate-500">
                <p className="font-bold text-slate-800 uppercase">¡Gracias por su compra!</p>
                <p>Este es un documento equivalente de facturación local.</p>
              </div>
            </div>
          </div>

          {/* Bottom Print & Share Actions */}
          <div className="w-full max-w-lg bg-slate-900 p-3 rounded-2xl flex items-center gap-3 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
            >
              <Printer size={18} />
              <span>Imprimir Ticket</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTicketPreviewModal(false)}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* TICKET FOR PRINTING ONLY */}
      {lastTicket && (
        <div className="hidden print:block w-[80mm] p-2 font-mono text-black mx-auto">
           <div className="text-center mb-4">
             <h1 className="font-black text-lg leading-tight uppercase">{organization?.name || 'Distribuidora Paraíso Floral'}</h1>
             {organization?.direccion ? (
               <p className="text-[10px] mt-1">{organization.direccion}</p>
             ) : (
               <p className="text-[10px] mt-1">San Pedro Sula, Honduras</p>
             )}
             {organization?.telefono && <p className="text-[10px]">Tel: {organization.telefono}</p>}
             {organization?.rtn && <p className="text-[10px]">RTN: {organization.rtn}</p>}
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

      {/* MODAL AGREGAR NUEVO CLIENTE */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Registrar Nuevo Cliente</h3>
                  <p className="text-xs text-slate-400">Crear cliente rápido para esta venta</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddClientModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewClient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre / Razón Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora Las Rosas S.A."
                  value={newClientData.nombre}
                  onChange={e => setNewClientData({ ...newClientData, nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RTN / DNI</label>
                  <input
                    type="text"
                    placeholder="0801199012345"
                    value={newClientData.rtn}
                    onChange={e => setNewClientData({ ...newClientData, rtn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="9999-9999"
                    value={newClientData.telefono}
                    onChange={e => setNewClientData({ ...newClientData, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={newClientData.email}
                  onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección Física</label>
                <input
                  type="text"
                  placeholder="Colonia, calle, referencia..."
                  value={newClientData.direccion}
                  onChange={e => setNewClientData({ ...newClientData, direccion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSavingClient ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Guardar y Seleccionar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO PRODUCTO / FLOR */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Crear Nueva Flor o Artículo</h3>
                  <p className="text-xs text-slate-400">Añadir al catálogo e incluir en el ticket</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Producto / Flor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Girasol Holandés Grado A"
                  value={newProductData.nombre}
                  onChange={e => setNewProductData({ ...newProductData, nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Precio Venta (Lps) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newProductData.precioVenta}
                    onChange={e => setNewProductData({ ...newProductData, precioVenta: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Costo Base (Lps)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProductData.costoBase}
                    onChange={e => setNewProductData({ ...newProductData, costoBase: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Inicial</label>
                <input
                  type="number"
                  placeholder="100"
                  value={newProductData.stockActual}
                  onChange={e => setNewProductData({ ...newProductData, stockActual: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSavingProduct ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Guardar y Agregar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
