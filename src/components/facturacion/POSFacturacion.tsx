'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Search, Plus, Minus, Trash2, Printer, X, Monitor, Zap, User, CreditCard, 
  Banknote, ShoppingCart, CheckCircle2, QrCode, LayoutGrid, List, Grid3X3, 
  ArrowDownCircle, FileText, Keyboard, Save, ArrowLeft, UserPlus, UserCheck, 
  Loader2, Building2, Phone, Mail, MapPin, Sparkles, FileBadge, Receipt, ZoomIn, ZoomOut, Eye, Pencil, Star, Flame, Clock,
  Camera
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { searchClientes } from '@/app/(dashboard)/facturas/actions';
import { crearClienteAction } from '@/app/(dashboard)/soporte/actions';
import { crearProducto } from '@/app/(dashboard)/precios/actions';
import ContactoModal from '@/components/contactos/ContactoModal';
import { PosCameraScannerModal } from './PosCameraScannerModal';
import BandejaPedidosCediModal, { PedidoListoCedi } from './BandejaPedidosCediModal';
import { marcarPedidoFacturado, getPedidosListosParaFacturar } from '@/app/(dashboard)/inventario-ventas/pedidos/actions';

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
  diasCredito?: number;
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
  aliasVenta: string;
  detalles: any[];
}

interface Props {
  productos: POSProduct[];
  categorias: string[];
  onEmitirFactura: (payload: POSFacturaPayload) => Promise<{ 
    success: boolean; 
    correlativo?: string; 
    facturaId?: string; 
    docId?: string;
    error?: string;
    numeroCAI?: string | null;
    rangoAutorizado?: string | null;
    fechaLimiteEmision?: string | Date | null;
  }>;
  cajeroNombre: string;
  modoKiosko?: boolean;
  organization?: {
    name?: string;
    direccion?: string;
    telefono?: string;
    correoContacto?: string;
    rtn?: string;
    logoUrl?: string;
    invoiceSettings?: any;
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
  const searchParams = useSearchParams();
  
  // State
  const [localProducts, setLocalProducts] = useState<POSProduct[]>(productos);
  const [activePedidoCediId, setActivePedidoCediId] = useState<string | null>(null);

  useEffect(() => {
    setLocalProducts(productos);
  }, [productos]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const isSubmittingRef = useRef(false);
  const [lastSaleCart, setLastSaleCart] = useState<CartItem[]>([]);
  const [lastSaleTotals, setLastSaleTotals] = useState<any>(null);

  // Favorites & Sales Counter State
  const [favorites, setFavorites] = useState<string[]>([]);
  const [salesCount, setSalesCount] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFavs = localStorage.getItem('paraiso_pos_favorites');
        if (savedFavs) setFavorites(JSON.parse(savedFavs));

        const savedSales = localStorage.getItem('paraiso_pos_sales_count');
        if (savedSales) setSalesCount(JSON.parse(savedSales));
      } catch (e) {
        console.error('Error loading POS favorites/sales:', e);
      }
    }
  }, []);

  const toggleFavorite = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.includes(productId);
      const updated = isFav ? prev.filter(id => id !== productId) : [...prev, productId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('paraiso_pos_favorites', JSON.stringify(updated));
      }
      toast.success(isFav ? 'Removido de favoritos' : '⭐ Agregado a favoritos');
      return updated;
    });
  };

  // Precios con ISV Incluido (Redondeado) State
  const [pricesIncludeTax, setPricesIncludeTax] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedInc = localStorage.getItem('paraiso_pos_prices_include_tax');
        if (savedInc !== null) {
          setPricesIncludeTax(JSON.parse(savedInc));
        }
      } catch (e) {}
    }
  }, []);

  const togglePricesIncludeTax = () => {
    setPricesIncludeTax(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('paraiso_pos_prices_include_tax', JSON.stringify(next));
      }
      toast.success(next ? '🏷️ Precios ahora INCLUYEN ISV (Redondeado)' : '🏷️ Precios ahora MÁS ISV');
      return next;
    });
  };

  // Client Selection & Creation State
  const [clientName, setClientName] = useState('CONSUMIDOR FINAL');
  const [selectedClient, setSelectedClient] = useState<{ id?: string; nombre: string; rtn?: string; telefono?: string; email?: string; diasCredito?: number; limiteCredito?: number } | null>(null);
  
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);

  // Cargar pedido alistado desde Bodega (CEDI)
  const handleCargarPedidoCedi = useCallback((pedido: PedidoListoCedi) => {
    setActivePedidoCediId(pedido.id);

    if (pedido.cliente) {
      setSelectedClient({
        id: pedido.cliente.id,
        nombre: pedido.cliente.nombre,
        rtn: pedido.cliente.rtn,
        telefono: pedido.cliente.telefono,
        email: pedido.cliente.email
      });
      setClientName(pedido.cliente.nombre);
    }

    const newCartItems: CartItem[] = pedido.items.map((it, idx) => {
      const catalogProd = productos.find(p => p.id === it.productoId || (it.sku && p.sku.toLowerCase() === it.sku.toLowerCase()));

      return {
        id: it.productoId,
        sku: it.sku || catalogProd?.sku || 'CEDI-ITEM',
        nombre: it.nombreProducto,
        precioVenta: it.precioVenta || catalogProd?.precioVenta || 0,
        stockActual: catalogProd?.stockActual || 999,
        isvAplicable: it.isvAplicable ?? 15,
        esServicio: false,
        qty: it.cantidadPreparada || 1,
        discountPercentage: 0,
        cartId: `cedi-${it.id || idx}-${Date.now()}`,
        taxState: (it.isvAplicable === 0) ? 'exento' : 'isv15'
      };
    });

    setCart(newCartItems);
    setAliasVenta(`Pedido CEDI ${pedido.codigoPedido}`);
    toast.success(`✓ Pedido ${pedido.codigoPedido} cargado con ${newCartItems.length} ítem(s) en caja`, { duration: 4000 });
  }, [productos]);

  // Auto-cargar si viene por URL ?cargarPedido=ID
  useEffect(() => {
    const pedidoParam = searchParams.get('cargarPedido');
    if (pedidoParam) {
      getPedidosListosParaFacturar().then(lista => {
        const found = lista.find(p => p.id === pedidoParam);
        if (found) {
          handleCargarPedidoCedi(found as any);
        }
      });
    }
  }, [searchParams, handleCargarPedidoCedi]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

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
  const [lastFiscalData, setLastFiscalData] = useState<{
    numeroCAI?: string | null;
    rangoAutorizado?: string | null;
    fechaLimiteEmision?: string | Date | null;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [customCreditDays, setCustomCreditDays] = useState<number>(15);
  const [aliasVenta, setAliasVenta] = useState('Paraíso Floral');
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
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Camera Scanner States
  const [showCameraScanner, setShowCameraScanner] = useState(false);

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
    const days = c.diasCredito !== undefined && c.diasCredito !== null ? Number(c.diasCredito) : 15;
    const clientObj = { 
      ...c, 
      nombre: upperName,
      diasCredito: days,
      limiteCredito: c.limiteCredito !== undefined && c.limiteCredito !== null ? Number(c.limiteCredito) : 0
    };
    setClientName(upperName);
    setSelectedClient(clientObj);
    setCustomCreditDays(days);
    setShowClientDropdown(false);
    toast.success(`Cliente "${upperName}" seleccionado (${days} días plazo)`);
  };

  useEffect(() => {
    if (selectedClient && selectedClient.diasCredito !== undefined && selectedClient.diasCredito !== null) {
      setCustomCreditDays(Number(selectedClient.diasCredito));
    }
  }, [selectedClient]);

  const handleResetToConsumidorFinal = () => {
    setClientName('CONSUMIDOR FINAL');
    setSelectedClient(null);
    setShowClientDropdown(false);
  };

  const handleClearClientSearch = async () => {
    setClientName('');
    setSelectedClient(null);
    setShowClientDropdown(true);
    setIsSearchingClients(true);
    try {
      const res = await searchClientes('');
      setClientSearchResults(res || []);
    } catch (e) {
      console.error('Error searching clients:', e);
    } finally {
      setIsSearchingClients(false);
    }
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

  // Computed: Products Filtered & Ranked
  const filteredProducts = useMemo(() => {
    let list = localProducts.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (activeCategory === 'favorites') {
        return favorites.includes(p.id);
      }
      if (activeCategory === 'popular') {
        return (salesCount[p.id] || 0) > 0;
      }
      return true;
    });

    // Auto-ranking:
    // 1. Favorites pinned first
    // 2. Highest salesCount second
    // 3. Alphabetical third
    return list.sort((a, b) => {
      const isFavA = favorites.includes(a.id) ? 1 : 0;
      const isFavB = favorites.includes(b.id) ? 1 : 0;
      if (isFavA !== isFavB) {
        return isFavB - isFavA;
      }

      const countA = salesCount[a.id] || 0;
      const countB = salesCount[b.id] || 0;
      if (countA !== countB) {
        return countB - countA;
      }

      return a.nombre.localeCompare(b.nombre);
    });
  }, [localProducts, searchTerm, activeCategory, favorites, salesCount]);

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
      const q = item.qty;
      const p = item.precioVenta;
      const dVal = item.discountPercentage;

      let tasa = 0;
      if (item.taxState === 'isv15') tasa = 0.15;
      if (item.taxState === 'isv18') tasa = 0.18;

      if (pricesIncludeTax) {
        // Precios INCLUYEN ISV (ej: L.300 precio final redondeado)
        const totalConImpLinea = q * p;
        const descConImpLinea = totalConImpLinea * (dVal / 100);
        const totalNetoConImpDesc = totalConImpLinea - descConImpLinea;

        const baseNetaLinea = totalNetoConImpDesc / (1 + tasa);
        const impuestoLinea = totalNetoConImpDesc - baseNetaLinea;

        subTotal += totalConImpLinea / (1 + tasa);
        descuentos += descConImpLinea / (1 + tasa);

        if (item.taxState === 'exento') {
          exento += baseNetaLinea;
        } else if (item.taxState === 'exonerado') {
          exonerado += baseNetaLinea;
        } else if (item.taxState === 'isv15') {
          gravado15 += baseNetaLinea;
          isv15 += impuestoLinea;
        } else if (item.taxState === 'isv18') {
          gravado18 += baseNetaLinea;
          isv18 += impuestoLinea;
        }
      } else {
        // Precios MÁS ISV (se suma arriba)
        const baseLinea = q * p;
        const descLinea = baseLinea * (dVal / 100);
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
      }
    });

    const finalTotal = pricesIncludeTax 
      ? (subTotal - descuentos + isv15 + isv18) 
      : (subTotal - descuentos + isv15 + isv18);

    return {
      subTotal, descuentos, exento, exonerado,
      gravado15, isv15, gravado18, isv18,
      total: finalTotal
    };
  }, [cart, pricesIncludeTax]);

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

  const setBulkTaxRate = (newTax: 'isv15' | 'isv18' | 'exento' | 'exonerado') => {
    if (cart.length === 0) return;
    setCart(prev => prev.map(i => ({ ...i, taxState: newTax })));
    const labels: Record<string, string> = {
      exento: 'EXENTO',
      exonerado: 'EXONERADO',
      isv15: '+15% ISV',
      isv18: '+18% ISV'
    };
    toast.success(`Impuesto "${labels[newTax]}" aplicado a todos los ${cart.length} ítems`);
  };

  const renderBulkTaxBar = () => {
    if (cart.length === 0) return null;

    return (
      <div className="bg-slate-100/90 border border-slate-200/90 rounded-lg p-1.5 mb-2 flex flex-col gap-1 shadow-2xs">
        {/* Interactive Tax Mode Toggle */}
        <button
          type="button"
          onClick={togglePricesIncludeTax}
          className={`w-full py-1 px-2 rounded-md text-[9.5px] font-black flex items-center justify-between border transition-all cursor-pointer ${
            pricesIncludeTax 
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 hover:bg-emerald-100' 
              : 'bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100'
          }`}
          title="Clic para cambiar entre Precios con ISV incluido o Precios más ISV"
        >
          <span className="flex items-center gap-1">
            <Receipt size={12} className={pricesIncludeTax ? "text-emerald-600" : "text-amber-600"} />
            <span>{pricesIncludeTax ? "Precios Incluyen ISV (L.300 Redondeado)" : "Precios Más ISV (+15% Adicional)"}</span>
          </span>
          <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
            pricesIncludeTax ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}>
            {pricesIncludeTax ? 'Incluido' : '+ ISV Extra'}
          </span>
        </button>

        <div className="flex items-center justify-between px-0.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <span>⚡ Impuesto Masivo ({cart.length} ítems)</span>
          </span>
          <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded">1-Clic</span>
        </div>

        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setBulkTaxRate('isv15')}
            className="py-0.5 px-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 text-slate-700 font-black text-[9px] rounded border border-slate-200 shadow-2xs transition-all text-center truncate cursor-pointer h-6"
            title="Aplicar +15% ISV a todos los ítems del ticket"
          >
            +15% ISV
          </button>

          <button
            type="button"
            onClick={() => setBulkTaxRate('exento')}
            className="py-0.5 px-1 bg-white hover:bg-amber-50 hover:text-amber-700 active:scale-95 text-slate-700 font-black text-[9px] rounded border border-slate-200 shadow-2xs transition-all text-center truncate cursor-pointer h-6"
            title="Aplicar EXENTO a todos los ítems del ticket"
          >
            EXENTO
          </button>

          <button
            type="button"
            onClick={() => setBulkTaxRate('exonerado')}
            className="py-0.5 px-1 bg-white hover:bg-blue-50 hover:text-blue-700 active:scale-95 text-slate-700 font-black text-[9px] rounded border border-slate-200 shadow-2xs transition-all text-center truncate cursor-pointer h-6"
            title="Aplicar EXONERADO a todos los ítems del ticket"
          >
            EXONERADO
          </button>

          <button
            type="button"
            onClick={() => setBulkTaxRate('isv18')}
            className="py-0.5 px-1 bg-white hover:bg-purple-50 hover:text-purple-700 active:scale-95 text-slate-700 font-black text-[9px] rounded border border-slate-200 shadow-2xs transition-all text-center truncate cursor-pointer h-6"
            title="Aplicar +18% ISV a todos los ítems del ticket"
          >
            +18% ISV
          </button>
        </div>
      </div>
    );
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
    if (isSubmittingRef.current || isProcessing) return;
    if (cart.length === 0) return;
    
    isSubmittingRef.current = true;
    setIsProcessing(true);

    const snapshotCart = [...cart];
    const snapshotTotals = { ...totals };
    const snapshotClientName = clientName;
    const snapshotSelectedClient = selectedClient ? { ...selectedClient } : null;
    const snapshotPaymentMethod = paymentMethod;
    const snapshotCashTendered = cashTendered;

    const payload: POSFacturaPayload = {
      clienteNombre: clientName,
      clienteId: selectedClient?.id,
      diasCredito: paymentMethod === 'Crédito' ? customCreditDays : 0,
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
      aliasVenta: aliasVenta,
      detalles: cart.map(c => {
        let tasa = 0;
        if (c.taxState === 'isv15') tasa = 0.15;
        if (c.taxState === 'isv18') tasa = 0.18;

        const totalConDesc = (c.precioVenta * c.qty) * (1 - c.discountPercentage / 100);
        const precioUnitarioNeto = pricesIncludeTax && tasa > 0 ? (c.precioVenta / (1 + tasa)) : c.precioVenta;
        const totalLineaNeta = pricesIncludeTax && tasa > 0 ? (totalConDesc / (1 + tasa)) : totalConDesc;

        return {
          productoId: c.isActivoFijo ? undefined : c.id,
          activoId: c.isActivoFijo ? c.id : undefined,
          descripcion: c.nombre,
          cantidad: c.qty,
          precioUnitario: precioUnitarioNeto,
          porcentajeIsv: c.taxState === 'isv15' ? 15 : c.taxState === 'isv18' ? 18 : 0,
          totalLinea: totalLineaNeta
        };
      })
    };

    try {
      const res = await onEmitirFactura(payload);
      
      if (res.success && (res.correlativo || res.facturaId)) {
        // Guardar snapshot para vista previa e impresión y limpiar de inmediato el carrito activo para evitar duplicados
        setLastSaleCart(snapshotCart);
        setLastSaleTotals({
          totals: snapshotTotals,
          clientName: snapshotClientName,
          selectedClient: snapshotSelectedClient,
          paymentMethod: snapshotPaymentMethod,
          cashTendered: snapshotCashTendered
        });
        setCart([]);
        setCashTendered('');

        // Si este cobro correspondía a un pedido de CEDI, marcarlo como facturado en el ERP
        if (activePedidoCediId) {
          marcarPedidoFacturado(activePedidoCediId, res.facturaId || res.docId);
          setActivePedidoCediId(null);
        }

        setLastTicket(res.correlativo || null);
        setLastFacturaId(res.facturaId || res.docId || null);
        if (res.numeroCAI || res.rangoAutorizado || res.fechaLimiteEmision) {
          setLastFiscalData({
            numeroCAI: res.numeroCAI,
            rangoAutorizado: res.rangoAutorizado,
            fechaLimiteEmision: res.fechaLimiteEmision
          });
        }
        setShowCheckout(false);
        setShowSuccess(true);

        // Auto-increment sales count for top products ranking
        setSalesCount(prev => {
          const updated = { ...prev };
          snapshotCart.forEach(item => {
            updated[item.id] = (updated[item.id] || 0) + item.qty;
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('paraiso_pos_sales_count', JSON.stringify(updated));
          }
          return updated;
        });
      } else {
        alert("Error: " + (res.error || "No se pudo emitir la factura"));
      }
    } catch (err: any) {
      console.error("Error in handleCheckout:", err);
      alert("Error al procesar la venta: " + (err.message || "Error desconocido"));
    } finally {
      setIsProcessing(false);
      isSubmittingRef.current = false;
    }
  };

  const playScannerBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1400, audioContext.currentTime); // 1400 Hz
      
      gainNode.gain.setValueAtTime(0.18, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.065);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.065);
    } catch (e) {
      console.warn("No se pudo reproducir el beep: ", e);
    }
  }, []);

  const handleScannedCode = useCallback((code: string) => {
    let cleanCode = code.trim().replace(/'/g, '-');
    
    // Si el QR contiene una URL completa (ej: https://paraiso-floral.vercel.app/catalogo/000279)
    if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/').filter(Boolean);
      const lastPart = parts.pop();
      if (lastPart) cleanCode = lastPart.trim();
    }
    
    // Buscar coincidencia de SKU (QR), código de barras o ID
    const product = productos.find(p => 
      p.sku.toLowerCase() === cleanCode.toLowerCase() || 
      (p.codigoBarras && p.codigoBarras.toLowerCase() === cleanCode.toLowerCase()) ||
      p.id.toLowerCase() === cleanCode.toLowerCase()
    );

    if (product) {
      addToCart(product);
      toast.success(`"${product.nombre}" agregado al ticket`);
      
      // Beep de confirmación tipo supermercado
      playScannerBeep();

      // Cerrar el escáner
      setShowCameraScanner(false);
    } else {
      toast.error(`Código o QR "${cleanCode}" no encontrado`);
    }
  }, [productos, addToCart, playScannerBeep]);



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
            let scannedSku = barcodeBufferRef.current.replace(/'/g, '-');
            barcodeBufferRef.current = '';
            if (scannedSku.includes('/')) {
              const parts = scannedSku.split('/').filter(Boolean);
              const lastPart = parts.pop();
              if (lastPart) scannedSku = lastPart.trim();
            }
            
            // Find exact SKU, barcode, or ID
            const product = productos.find(p => 
              p.sku.toLowerCase() === scannedSku.toLowerCase() || 
              (p.codigoBarras && p.codigoBarras.toLowerCase() === scannedSku.toLowerCase()) ||
              p.id.toLowerCase() === scannedSku.toLowerCase()
            );
            if (product) {
               addToCart(product);
               playScannerBeep();
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
    <div className="bg-white p-2 space-y-1.5 relative rounded-xl border border-slate-200/80">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <User size={11} className="text-indigo-600" />
          <span>Cliente / Facturar A</span>
        </label>
        {selectedClient ? (
          <button
            type="button"
            onClick={handleResetToConsumidorFinal}
            className="text-[9px] font-black text-rose-500 hover:underline uppercase"
          >
            CONSUMIDOR FINAL
          </button>
        ) : (
          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded uppercase">
            CONSUMIDOR FINAL
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 relative">
        <div className="relative flex-1">
          <input
            type="text"
            value={clientName}
            onChange={e => handleClientSearchChange(e.target.value)}
            onFocus={handleFocusClientSearch}
            placeholder="Buscar cliente (Nombre, RTN)..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-2.5 py-1 pr-7 text-xs font-medium text-slate-800 outline-none transition-all uppercase h-8"
          />
          {clientName ? (
            <button
              type="button"
              onClick={handleClearClientSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
              title="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          ) : isSearchingClients ? (
            <Loader2 size={12} className="absolute right-2.5 top-2 animate-spin text-indigo-500" />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingClient(null);
            setShowAddClientModal(true);
          }}
          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-2xs shrink-0 transition-transform h-8"
          title="Agregar Nuevo Cliente"
        >
          <UserPlus size={13} />
          <span className="text-[11px]">+ Nuevo</span>
        </button>
      </div>

      {/* Selected Client Badges */}
      {selectedClient && (
        <div className="bg-indigo-50/80 border border-indigo-100 rounded-lg px-2 py-1 text-[10px] flex items-center justify-between">
          <div className="flex items-center gap-1 truncate">
            <UserCheck size={12} className="text-indigo-600 shrink-0" />
            <span className="font-bold text-indigo-950 uppercase truncate">{selectedClient.nombre}</span>
            {selectedClient.rtn && <span className="text-indigo-600 font-mono text-[9px] shrink-0">({selectedClient.rtn})</span>}
          </div>
          <button onClick={handleResetToConsumidorFinal} className="text-rose-500 hover:text-rose-700 ml-1">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Autocomplete Dropdown con opción de editar contacto */}
      {showClientDropdown && clientSearchResults.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
          {clientSearchResults.map(c => (
            <div
              key={c.id}
              className="w-full px-3 py-2 hover:bg-indigo-50/80 transition-colors flex items-center justify-between group"
            >
              <button
                type="button"
                onClick={() => handleSelectClient(c)}
                className="flex-1 text-left min-w-0 pr-2"
              >
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide truncate">
                  {c.nombre.toUpperCase()}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  {c.rtn ? `RTN: ${c.rtn}` : c.telefono ? `Tel: ${c.telefono}` : 'Cliente registrado'}
                  {c.departamento ? ` • ${c.departamento}` : ''}
                </p>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingClient(c);
                    setShowAddClientModal(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                  title="Editar datos de este cliente"
                >
                  <Pencil size={13} className="text-emerald-600" />
                  <span className="text-[10px] text-emerald-700 font-extrabold hidden sm:inline">Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectClient(c)}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                  title="Seleccionar cliente"
                >
                  <UserCheck size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const fmt = (v: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(v);

  const sarCfg = organization?.invoiceSettings?.sarConfig;
  const caiTicket = lastFiscalData?.numeroCAI || (sarCfg?.activo !== false ? sarCfg?.cai : null);
  const rangoTicket = lastFiscalData?.rangoAutorizado || (sarCfg?.rangoInicial && sarCfg?.rangoFinal ? `Del ${sarCfg.rangoInicial} al ${sarCfg.rangoFinal}` : null);
  const fechaLimiteTicket = lastFiscalData?.fechaLimiteEmision || sarCfg?.fechaLimiteEmision;
  const fechaLimiteFormatted = fechaLimiteTicket ? (typeof fechaLimiteTicket === 'string' ? fechaLimiteTicket.split('T')[0] : new Date(fechaLimiteTicket).toLocaleDateString('es-HN')) : null;

  const activeTicketItems = lastSaleCart.length > 0 ? lastSaleCart : cart;
  const activeTicketTotals = lastSaleTotals?.totals || totals;
  const activeTicketClientName = lastSaleTotals?.clientName || clientName;
  const activeTicketSelectedClient = lastSaleTotals?.selectedClient || selectedClient;
  const activeTicketPaymentMethod = lastSaleTotals?.paymentMethod || paymentMethod;
  const activeTicketCashTendered = lastSaleTotals?.cashTendered !== undefined ? lastSaleTotals.cashTendered : cashTendered;

  return (

    <div className={`flex flex-col h-screen h-[100dvh] bg-[#F3F4F6] font-sans ${modoKiosko ? 'fixed inset-0 z-[1000] overflow-hidden' : 'relative w-full overflow-hidden'}`}>
      
      {/* HEADER POS - FIJO Y SIEMPRE VISIBLE */}
      <header className="bg-white px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-gray-200 shadow-2xs shrink-0 z-20 print:hidden relative gap-2">
        
        {/* Mobile top bar (Image 2 style) */}
        <div className="flex md:hidden items-center justify-between bg-[#16a34a] text-white -mx-3 -mt-1.5 p-2 shadow-md mb-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/facturas')} 
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <button 
              onClick={() => setShowMobileCartSheet(true)}
              className="flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-800 text-white px-2 py-1 rounded-lg text-xs font-black shadow-xs"
            >
              <ShoppingCart size={14} />
              <span>Ticket</span>
              <span className="bg-white text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
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
              className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-900 font-black text-xs rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-1"
            >
              <span>COBRAR</span>
              <span className="font-extrabold">{fmt(totals.total)}</span>
            </button>
          </div>
        </div>

        {/* Desktop Header Left */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
            <Zap className="text-white fill-white" size={16} />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">CAJA RÁPIDA</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{organization?.name || 'Distribuidora Paraíso Floral'}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl md:mx-4 relative z-30 flex items-center gap-2">
          <div className="relative flex-1 group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-500 transition-colors" size={15} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto por código, nombre o escanea..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.replace(/'/g, '-'))}
              className="w-full pl-9 pr-10 py-1.5 bg-gray-100 hover:bg-gray-200/50 focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none text-xs sm:text-sm font-semibold transition-all shadow-2xs focus:shadow-xs h-9"
            />
            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-indigo-600 bg-white/90 hover:bg-white rounded-lg transition-colors border border-slate-200/50 flex items-center justify-center cursor-pointer shadow-2xs"
              title="Escanear con Cámara (Móvil/Tableta)"
            >
              <Camera size={14} className="text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Desktop Header Right */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0 justify-end">
          <BandejaPedidosCediModal onSelectPedido={handleCargarPedidoCedi} />
          <div className="text-right pr-2.5 border-r border-gray-200">
            <p className="text-xs font-bold text-gray-900 leading-tight">{cajeroNombre}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Cajero</p>
          </div>
          <button onClick={() => setShowShortcuts(true)} className="p-1.5 text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 rounded-lg transition-colors" title="Teclas de Acceso Rápido">
            <Keyboard size={15} />
          </button>
          <button onClick={() => router.push('/facturas')} title="Salir / Volver (ESC)" className="p-1.5 px-2.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-lg transition-all font-bold text-xs flex gap-1.5 items-center">
            <X size={15} /> <span className="hidden lg:inline">Cerrar POS</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT DIVIDED */}
      <div className="flex flex-1 overflow-hidden print:hidden relative z-10 w-full pb-16 md:pb-0">
        
        {/* LEFT PANEL - PRODUCTS */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FB] overflow-hidden w-full">
          
          <div className="py-2 sm:py-4 px-2 sm:px-6 flex items-center justify-between border-b border-gray-100 bg-white/50 backdrop-blur shrink-0 z-10">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === 'all'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todos los artículos
                </button>

                <button
                  onClick={() => setActiveCategory('favorites')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                    activeCategory === 'favorites'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <Star size={13} className="fill-amber-400 text-amber-500" />
                  <span>Favoritos ({favorites.length})</span>
                </button>

                <button
                  onClick={() => setActiveCategory('popular')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                    activeCategory === 'popular'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black'
                      : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <Flame size={13} className="text-rose-500 fill-rose-500" />
                  <span>Más Vendidos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="px-3 py-1.5 sm:py-2 rounded-full text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 whitespace-nowrap flex items-center gap-1 active:scale-95 transition-transform"
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
                const isFav = favorites.includes(p.id);
                const totalSold = salesCount[p.id] || 0;

                return (
                  <div 
                    key={p.id} 
                    onClick={() => addToCart(p)}
                    className={`bg-white cursor-pointer hover:shadow-xl border shadow-xs transition-all group overflow-hidden relative select-none rounded-2xl p-1.5 sm:p-3 active:scale-95 ${
                      isFav ? 'border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/10' : 'border-gray-200'
                    } ${
                      qtyInCart > 0 ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20' : 'hover:border-indigo-200'
                    } ${isAnimating ? 'scale-95 border-emerald-500 ring-4 ring-emerald-400/40' : ''}`}
                  >
                    {/* Favorite Star Toggle Pin Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(p.id, e)}
                      className={`absolute top-1.5 left-1.5 p-1 rounded-full z-20 transition-all ${
                        isFav 
                          ? 'bg-amber-400 text-white shadow-md scale-110' 
                          : 'bg-white/80 backdrop-blur-xs text-slate-300 hover:text-amber-400 hover:bg-white'
                      }`}
                      title={isFav ? 'Quitar de Favoritos' : 'Fijar como Favorito arriba'}
                    >
                      <Star size={12} className={isFav ? 'fill-white text-white' : ''} />
                    </button>

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
                       
                       {/* Available Stock Badge on Image */}
                       {!p.esServicio && (
                         <span className={`absolute bottom-1 right-1 font-black text-[9.5px] px-1.5 py-0.5 rounded-md shadow-xs backdrop-blur-xs z-10 ${
                           p.stockActual === 0 ? 'bg-rose-500 text-white' :
                           p.stockActual <= 5 ? 'bg-amber-500 text-white' :
                           'bg-slate-900/85 text-white'
                         }`} title={`Stock disponible en inventario: ${p.stockActual}`}>
                           Disp: {p.stockActual}
                         </span>
                       )}
                    </div>

                    <div className={viewMode === 'list' ? 'flex-1 min-w-0' : 'flex flex-col flex-1'}>
                      <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight text-xs sm:text-sm">{p.nombre}</h3>
                      <div className="mt-auto flex items-center justify-between pt-1 gap-1">
                        <div>
                          <p className="font-black text-emerald-600 text-xs sm:text-base leading-none">{fmt(p.precioVenta)}</p>
                          {p.esServicio && (
                            <p className="text-[10px] font-extrabold text-slate-400 mt-0.5">Servicio</p>
                          )}
                        </div>
                        
                        {qtyInCart > 0 ? (
                          <div 
                            className="flex items-center gap-0.5 bg-emerald-50 border border-emerald-300 rounded-xl p-0.5 shadow-2xs z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const cartItem = cart.find(i => i.id === p.id);
                                if (cartItem) {
                                  if (cartItem.qty <= 1) {
                                    removeLine(cartItem.cartId);
                                    toast.success(`Removido "${p.nombre}"`);
                                  } else {
                                    changeQty(cartItem.cartId, -1);
                                  }
                                }
                              }}
                              className="w-5 h-5 sm:w-7 sm:h-7 bg-white hover:bg-rose-50 text-rose-600 hover:border-rose-300 rounded-lg flex items-center justify-center font-black shadow-2xs active:scale-90 transition-all border border-slate-200 cursor-pointer"
                              title="Restar 1 unidad"
                            >
                              <Minus size={12} className="stroke-[3]" />
                            </button>
                            
                            <span className="font-black text-xs sm:text-sm text-emerald-950 px-1 min-w-[16px] text-center select-none">
                              {qtyInCart}
                            </span>
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p);
                              }}
                              className="w-5 h-5 sm:w-7 sm:h-7 bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white rounded-lg flex items-center justify-center font-black shadow-2xs transition-all cursor-pointer"
                              title="Sumar 1 unidad"
                            >
                              <Plus size={12} className="stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors shadow-xs bg-gray-100 text-gray-500 group-hover:bg-emerald-600 group-hover:text-white cursor-pointer"
                            title="Agregar al ticket"
                          >
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
        <div className="hidden md:flex w-[380px] lg:w-[400px] xl:w-[420px] bg-white border-l border-gray-200 flex-col shadow-2xl z-20 shrink-0 h-full">
          
          <div className="p-2.5 border-b border-gray-200 shrink-0 bg-white space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                Ticket <span className="text-xs bg-gray-900 text-white font-bold px-2 py-0.5 rounded-md shadow-2xs">{cart.length}</span>
              </h2>
              {cart.length > 0 && (
                 <button onClick={clearCart} className="text-[11px] font-bold text-gray-400 hover:text-rose-500 transition-colors flex gap-1 items-center bg-gray-50 px-2 py-0.5 rounded-md">
                   <Trash2 size={11} /> Vaciar {shortcuts.clear}
                 </button>
              )}
            </div>
            
            {/* Customer Select */}
            {renderClientSection()}
          </div>

          {/* CART ITEMS - SCROLLABLE AREA */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 bg-gray-50/60 hide-scrollbar scroll-smooth">
            {renderBulkTaxBar()}
            <div className="space-y-1.5">
              {cart.map(item => (
                <div key={item.cartId} className="bg-white p-2 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 group relative border border-gray-200 shadow-2xs hover:border-indigo-200 transition-all">
                  
                  {/* Delete overlay */}
                  <button onClick={() => removeLine(item.cartId)} className="text-gray-300 hover:text-rose-500 p-0.5 rounded transition-colors shrink-0 order-last" title="Eliminar ítem">
                     <Trash2 size={13} />
                  </button>

                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                     {item.imageUrl ? (
                       <img src={item.imageUrl} alt={item.nombre} className="w-full h-full object-contain mix-blend-multiply" />
                     ) : (
                       <span className="font-black text-gray-300 text-xs uppercase">{item.nombre.substring(0,2)}</span>
                     )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-xs text-gray-900 truncate leading-tight pr-1" title={item.nombre}>{item.nombre}</h4>
                    
                    {/* PRICING & TAX ROW */}
                    <div className="flex items-center gap-1 mt-1 flex-nowrap">
                       <span className="text-gray-400 font-bold text-[9px]">L.</span>
                       <input 
                         type="number"
                         step="0.01"
                         min="0"
                         value={item.precioVenta === 0 ? '' : item.precioVenta}
                         onFocus={e => e.target.select()}
                         onChange={e => {
                           const raw = e.target.value.replace(/^0+(?=\d)/, '');
                           changePrice(item.cartId, raw === '' ? 0 : parseFloat(raw));
                         }}
                         className="w-13 h-5 rounded bg-gray-100 border border-transparent hover:border-gray-300 focus:bg-indigo-50 focus:border-indigo-300 text-[10px] font-black text-indigo-700 outline-none transition-all px-1"
                       />
                      <select
                        value={item.taxState}
                        onChange={(e) => changeTax(item.cartId, e.target.value as any)}
                        className={`text-[8px] font-black px-1 h-5 rounded transition-colors uppercase outline-none border-none appearance-none text-center cursor-pointer shrink-0 ${
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
                      <div className="flex items-center bg-rose-50 rounded border border-rose-100 h-5 px-1 shrink-0" title="Descuento aplicado al producto">
                        <input
                          type="number"
                          value={item.discountPercentage > 0 ? item.discountPercentage : ''}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const raw = e.target.value.replace(/^0+(?=\d)/, '');
                            changeDiscount(item.cartId, raw === '' ? 0 : parseFloat(raw));
                          }}
                          placeholder="0"
                          className="w-6 text-center bg-transparent text-[9px] font-black text-rose-600 outline-none placeholder:text-rose-300 [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-rose-400 font-bold text-[8px] pointer-events-none">%</span>
                      </div>
                    </div>

                  </div>
                  
                  <div className="flex flex-col items-end justify-between shrink-0 pl-1">
                     <div className="flex flex-col items-end">
                       <p className={`text-xs font-black ${item.discountPercentage > 0 ? 'text-indigo-600' : 'text-gray-900'}`}>
                         {fmt((item.precioVenta * item.qty) * (1 - item.discountPercentage / 100))}
                       </p>
                       {item.discountPercentage > 0 && <p className="text-[8px] font-bold text-gray-400 line-through">{fmt(item.precioVenta * item.qty)}</p>}
                     </div>
                     
                     <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 border border-gray-200 mt-1">
                       <button onClick={() => changeQty(item.cartId, -1)} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-indigo-600 rounded transition-all active:scale-95"><Minus size={11} /></button>
                       <span className="text-[11px] font-black w-5 text-center text-gray-800">{item.qty}</span>
                       <button onClick={() => changeQty(item.cartId, 1)} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-indigo-600 rounded transition-all active:scale-95"><Plus size={11} /></button>
                     </div>
                  </div>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="text-center py-16 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-white shadow-inner flex items-center justify-center mb-3">
                    <ShoppingCart size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-bold text-sm mb-0.5">Ticket Vacío</p>
                  <p className="text-xs text-gray-400">Selecciona artículos del catálogo<br/>para agregarlos al carrito</p>
                </div>
              )}
            </div>
          </div>

          {/* TOTALS & CHECKOUT - FIJO ABAJO DESKTOP */}
          <div className="p-3 px-4 bg-white border-t border-gray-200 shadow-[0_-8px_25px_rgba(0,0,0,0.05)] shrink-0 z-30 space-y-2">
            <div className="space-y-1 relative text-xs font-semibold">
              <div className="flex justify-between text-gray-500">
                <span>Sub Total {totals.exento > 0 && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 py-0.2 rounded ml-1 uppercase font-bold">Exento</span>}</span>
                <span className="text-gray-900 font-bold">{fmt(totals.subTotal)}</span>
              </div>
              {totals.descuentos > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Descuento</span>
                  <span>-{fmt(totals.descuentos)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Impuesto (15%)</span>
                <span className="text-gray-900 font-bold">{fmt(totals.isv15)}</span>
              </div>
              {totals.isv18 > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Impuesto (18%)</span>
                  <span className="text-gray-900 font-bold">{fmt(totals.isv18)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 mt-1">
                <span className="text-sm font-black text-gray-900 uppercase">Total</span>
                <span className="text-2xl font-black text-indigo-600 tracking-tight">{fmt(totals.total)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              <Banknote size={18} className={cart.length === 0 ? "opacity-50" : ""} />
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
              {renderBulkTaxBar()}
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
                        value={item.precioVenta === 0 ? '' : item.precioVenta}
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const raw = e.target.value.replace(/^0+(?=\d)/, '');
                          changePrice(item.cartId, raw === '' ? 0 : parseFloat(raw));
                        }}
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
                
                <button 
                  type="button"
                  onClick={() => setShowCheckout(false)} 
                  className="absolute top-4 right-4 z-50 p-2 sm:p-2.5 bg-white/15 hover:bg-rose-600 text-white rounded-full transition-all border border-white/20 hover:border-rose-500 shadow-xl hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Cerrar ventana de cobro"
                >
                  <X size={22} className="stroke-[2.5]" />
                </button>
                <p className="text-gray-400 font-bold mb-1 uppercase tracking-widest text-xs sm:text-sm relative z-10">Monto Final a Pagar</p>
                <p className="text-3xl sm:text-5xl font-black text-white tracking-tight relative z-10 break-all px-2 py-2">{fmt(totals.total)}</p>
             </div>
             
             <div className="p-6 sm:p-8 pb-4 overflow-y-auto">
               <h3 className="font-bold text-gray-900 mb-4 text-xs sm:text-sm uppercase tracking-widest">Método de Pago</h3>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
                 {[
                   { id: 'Efectivo', icon: Banknote, active: 'bg-emerald-50 border-emerald-500 text-emerald-700', ring: 'ring-emerald-500/20' },
                   { id: 'Tarjeta', icon: CreditCard, active: 'bg-indigo-50 border-indigo-500 text-indigo-700', ring: 'ring-indigo-500/20' },
                   { id: 'Transferencia', icon: QrCode, active: 'bg-violet-50 border-violet-500 text-violet-700', ring: 'ring-violet-500/20' },
                   { id: 'Crédito', icon: Clock, active: 'bg-amber-50 border-amber-500 text-amber-700', ring: 'ring-amber-500/20' },
                 ].map(m => (
                   <button 
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all ${paymentMethod === m.id ? `${m.active} shadow-md ring-4 ${m.ring}` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                   >
                      <m.icon size={22} className="mb-1.5" />
                      <span className="font-bold text-xs sm:text-sm tracking-tight">{m.id}</span>
                      {paymentMethod === m.id && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-current shadow-sm" />}
                   </button>
                 ))}
               </div>

               <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                 <h3 className="font-bold text-gray-900 mb-3 text-xs sm:text-sm uppercase tracking-widest">Origen de la Venta / Marca</h3>
                 <div className="flex gap-3">
                   <button 
                     onClick={() => setAliasVenta('Paraíso Floral')}
                     className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${aliasVenta === 'Paraíso Floral' ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-md ring-4 ring-pink-500/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
                   >
                     Paraíso Floral
                   </button>
                   <button 
                     onClick={() => setAliasVenta('HonduFlores')}
                     className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${aliasVenta === 'HonduFlores' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-4 ring-emerald-500/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
                   >
                     HonduFlores (HF)
                   </button>
                 </div>
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

               {paymentMethod === 'Crédito' && (
                 <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                   {selectedClient && selectedClient.nombre.toUpperCase() !== 'CONSUMIDOR FINAL' ? (
                     <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl space-y-3 shadow-sm">
                       <div className="flex items-center justify-between">
                         <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                           <Clock size={16} className="text-amber-600" />
                           <span>Venta a Crédito Comercial (CxC)</span>
                         </span>
                         <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full uppercase">
                           CxC Registrado
                         </span>
                       </div>
                       
                       <div className="text-xs text-amber-950 font-medium pt-2 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div>
                           <p className="text-[10px] text-amber-700 uppercase font-bold mb-0.5">Cliente Acreditable</p>
                           <p className="font-bold text-slate-900 uppercase truncate">{selectedClient.nombre}</p>
                         </div>

                         <div>
                           <label className="text-[10px] text-amber-800 uppercase font-extrabold block mb-1">
                             Plazo de Crédito <span className="text-amber-600 font-bold">(Modificable)</span>
                           </label>
                           <select
                             value={customCreditDays}
                             onChange={e => setCustomCreditDays(Number(e.target.value))}
                             className="w-full bg-white border-2 border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                           >
                             <option value={0}>0 Días (Mismo Día / Contado)</option>
                             <option value={7}>7 Días (Semanal)</option>
                             <option value={15}>15 Días (Quincenal)</option>
                             <option value={30}>30 Días (Mensual)</option>
                             <option value={45}>45 Días (Especial)</option>
                             <option value={60}>60 Días (Especial)</option>
                           </select>
                         </div>
                       </div>

                       {selectedClient.rtn && (
                         <div className="text-[11px] font-bold text-slate-700 bg-white/80 p-2 rounded-xl border border-amber-200 flex justify-between items-center">
                           <span>RTN / Identidad:</span>
                           <span className="font-mono text-xs text-slate-900">{selectedClient.rtn}</span>
                         </div>
                       )}

                       <p className="text-[10px] text-amber-800 font-medium italic pt-1">
                         * Este ticket vencerá en {customCreditDays} días a partir de hoy y se registrará en Cuentas por Cobrar (CxC).
                       </p>
                     </div>
                   ) : (
                     <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 shadow-xs">
                       <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase">
                         <X className="shrink-0 text-rose-600" size={18} />
                         <span>Requiere Cliente Registrado</span>
                       </div>
                       <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                         Las ventas a crédito comercial no se pueden facturar a <span className="font-black underline">"CONSUMIDOR FINAL"</span>.
                         Por favor busque o cree el cliente registrado en la parte superior.
                       </p>
                     </div>
                   )}
                 </div>
               )}

               <button
                  onClick={handleCheckout}
                  disabled={
                    isProcessing || 
                    (paymentMethod === 'Efectivo' && Number(cashTendered) > 0 && Number(cashTendered) < totals.total) ||
                    (paymentMethod === 'Crédito' && (!selectedClient || selectedClient.nombre.toUpperCase() === 'CONSUMIDOR FINAL'))
                  }
                  className="w-full h-[60px] sm:h-[72px] bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-sm sm:text-lg rounded-[1.25rem] shadow-xl transition-all flex items-center justify-center gap-2 mt-auto mb-4 px-3 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
               >
                 {isProcessing ? 'Procesando Venta...' : paymentMethod === 'Crédito' ? `Facturar a Crédito — ${fmt(totals.total)}` : `Emitir Documento Final`}
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
                {organization?.rtn && <p className="text-[10px] text-slate-600 font-mono">RTN: {organization.rtn}</p>}
                {organization?.correoContacto && <p className="text-[9px] text-slate-500">{organization.correoContacto}</p>}
                
                {/* Bloque Fiscal SAR */}
                {caiTicket && (
                  <div className="my-2 py-1.5 px-2 bg-slate-50 border-y border-dashed border-slate-300 text-left text-[9.5px] space-y-0.5 font-mono">
                    <p className="break-all"><strong>CAI:</strong> <span className="font-bold">{caiTicket}</span></p>
                    {rangoTicket && <p><strong>Rango Aut.:</strong> {rangoTicket}</p>}
                    {fechaLimiteFormatted && <p><strong>Fecha Límite:</strong> {fechaLimiteFormatted}</p>}
                  </div>
                )}

                <div className="my-1.5 border-b border-dashed border-slate-400" />
                <p className="text-xs font-black text-indigo-950 font-mono">FACTURA FISCAL Nº: {lastTicket}</p>
                <p className="text-[10px] text-slate-500">{new Date().toLocaleString('es-HN')}</p>
                <p className="text-[10px] text-slate-700 text-left mt-2"><strong>Cliente:</strong> {activeTicketClientName}</p>
                {activeTicketSelectedClient?.rtn && <p className="text-[10px] text-slate-700 text-left font-mono"><strong>RTN:</strong> {activeTicketSelectedClient.rtn}</p>}
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
                  {activeTicketItems.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1 font-bold">{item.qty}</td>
                      <td className="py-1 px-1">{item.nombre}</td>
                      <td className="py-1 text-right font-bold">{fmt((item.precioVenta * item.qty) * (1 - item.discountPercentage / 100))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-dashed border-black font-bold text-[10px]">
                    <td className="py-1">{activeTicketItems.reduce((s, it) => s + (Number(it.qty) || 0), 0)}</td>
                    <td className="py-1 px-1 uppercase" colSpan={2}>TOTAL ÍTEMS / PAQUETES</td>
                  </tr>
                </tfoot>
              </table>

              <div className="space-y-0.5 text-right text-[11px] font-mono border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between font-bold border-b border-dashed border-slate-200 pb-0.5 mb-0.5"><span>Total Ítems:</span><span>{activeTicketItems.reduce((s, it) => s + (Number(it.qty) || 0), 0)}</span></div>
                <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(activeTicketTotals.subTotal)}</span></div>
                {activeTicketTotals.descuentos > 0 && <div className="flex justify-between"><span>Descuentos:</span><span>-{fmt(activeTicketTotals.descuentos)}</span></div>}
                {activeTicketTotals.exonerado > 0 && <div className="flex justify-between"><span>Exonerado:</span><span>{fmt(activeTicketTotals.exonerado)}</span></div>}
                <div className="flex justify-between"><span>ISV (15%):</span><span>{fmt(activeTicketTotals.isv15)}</span></div>
                {activeTicketTotals.isv18 > 0 && <div className="flex justify-between"><span>ISV (18%):</span><span>{fmt(activeTicketTotals.isv18)}</span></div>}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>{fmt(activeTicketTotals.total)}</span>
                </div>
              </div>

              <div className="text-center mt-3 text-[9.5px] leading-tight text-slate-600 border-t border-dashed border-slate-400 pt-2 space-y-0.5 font-sans">
                <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">ORIGINAL: CLIENTE</p>
                <p className="font-bold text-[9px] text-slate-800">LA FACTURA ES BENEFICIO DE TODOS, EXÍJALA</p>
                <p className="text-[8.5px] text-slate-500 mt-1">¡Gracias por su compra!</p>
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
        <div className="hidden print:block w-[80mm] p-2 font-mono text-black mx-auto text-[10px]">
           <div className="text-center mb-3">
             <h1 className="font-black text-base leading-tight uppercase">{organization?.name || 'Distribuidora Paraíso Floral'}</h1>
             {organization?.direccion ? (
               <p className="text-[9.5px] mt-0.5">{organization.direccion}</p>
             ) : (
               <p className="text-[9.5px] mt-0.5">San Pedro Sula, Honduras</p>
             )}
             {organization?.telefono && <p className="text-[9.5px]">Tel: {organization.telefono}</p>}
             {organization?.rtn && <p className="text-[9.5px] font-mono">RTN: {organization.rtn}</p>}
             {organization?.correoContacto && <p className="text-[9px]">{organization.correoContacto}</p>}
             
             {/* Bloque Fiscal SAR */}
             {caiTicket && (
               <div className="my-2 py-1.5 px-1 border-y border-dashed border-black text-left text-[9px] space-y-0.5 font-mono">
                 <p className="break-all leading-tight"><strong>CAI:</strong> {caiTicket}</p>
                 {rangoTicket && <p className="leading-tight"><strong>Rango Aut.:</strong> {rangoTicket}</p>}
                 {fechaLimiteFormatted && <p className="leading-tight"><strong>Fecha Límite:</strong> {fechaLimiteFormatted}</p>}
               </div>
             )}

             <p className="text-xs mt-2 font-bold font-mono">FACTURA FISCAL Nº: {lastTicket}</p>
             <p className="text-[9.5px] border-b border-dashed border-black pb-1.5 mb-1.5">Fecha: {new Date().toLocaleDateString('es-HN', { hour: '2-digit', minute:'2-digit' })}</p>
             <p className="text-[9.5px] text-left">Cliente: {activeTicketClientName}</p>
             {activeTicketSelectedClient?.rtn && <p className="text-[9.5px] text-left font-mono">RTN Cliente: {activeTicketSelectedClient.rtn}</p>}
             <p className="text-[9.5px] text-left">Cajero: {cajeroNombre}</p>
           </div>
           
           <table className="w-full mb-3 text-[10px]">
             <thead>
               <tr className="border-y border-dashed border-black">
                 <th className="text-left font-normal pb-0.5 pt-0.5">CANT</th>
                 <th className="text-left font-normal pb-0.5 pt-0.5 px-1">DESCRIPCIÓN</th>
                 <th className="text-right font-normal pb-0.5 pt-0.5">TOTAL</th>
               </tr>
             </thead>
             <tbody>
               {activeTicketItems.map((item, idx) => (
                 <tr key={idx} className="align-top">
                   <td className="pt-1.5">{item.qty}</td>
                   <td className="pt-1.5 px-1 pr-2 truncate max-w-[40mm]">
                     {item.nombre}
                     {item.taxState === 'exento' && <span className="ml-1 text-[8px] font-bold">(E)</span>}
                     {item.taxState === 'exonerado' && <span className="ml-1 text-[8px] font-bold">(EXO)</span>}
                     {item.taxState === 'isv18' && <span className="ml-1 text-[8px] font-bold">(18%)</span>}
                     {item.precioVenta > 0 && <span className="block text-[8.5px] mt-0.5 text-gray-600">L.{item.precioVenta} c/u {item.discountPercentage > 0 && <span className="text-black font-bold uppercase ml-1">-{item.discountPercentage}%</span>}</span>}
                   </td>
                   <td className="text-right pt-1.5">{fmt((item.precioVenta * item.qty) * (1 - item.discountPercentage / 100))}</td>
                 </tr>
               ))}
             </tbody>
              <tfoot>
                <tr className="border-t border-dashed border-black font-bold text-[10px]">
                  <td className="pt-1.5">{activeTicketItems.reduce((s, it) => s + (Number(it.qty) || 0), 0)}</td>
                  <td className="pt-1.5 px-1 uppercase" colSpan={2}>TOTAL ÍTEMS / PAQUETES</td>
                </tr>
              </tfoot>
           </table>

           <div className="text-[10px] border-t border-dashed border-black pt-1.5 flex flex-col gap-0.5 w-full items-end pb-3 border-b">
             <div className="flex w-[85%] justify-between text-slate-800 font-semibold mb-0.5 pb-0.5 border-b border-dashed border-gray-300">
                <span className="uppercase">Total Ítems:</span>
                <span>{activeTicketItems.reduce((s, it) => s + (Number(it.qty) || 0), 0)}</span>
              </div>
              <div className="flex w-[85%] justify-between"><span className="uppercase">Sub Total:</span><span>{fmt(activeTicketTotals.subTotal)}</span></div>
             {activeTicketTotals.descuentos > 0 && <div className="flex w-[85%] justify-between"><span className="uppercase">Descuentos:</span><span>-{fmt(activeTicketTotals.descuentos)}</span></div>}
             {activeTicketTotals.exonerado > 0 && <div className="flex w-[85%] justify-between"><span className="uppercase">Exonerado:</span><span>{fmt(activeTicketTotals.exonerado)}</span></div>}
             <div className="flex w-[85%] justify-between"><span className="uppercase">ISV 15%:</span><span>{fmt(activeTicketTotals.isv15)}</span></div>
             {activeTicketTotals.isv18 > 0 && <div className="flex w-[85%] justify-between"><span className="uppercase">ISV 18%:</span><span>{fmt(activeTicketTotals.isv18)}</span></div>}
             <div className="flex w-[85%] justify-between font-black text-xs mt-1 pt-1 border-t border-black"><span className="uppercase">TOTAL:</span><span>{fmt(activeTicketTotals.total)}</span></div>
           </div>

           <div className="mt-3 flex flex-col gap-0.5 text-[10px] pb-3 border-b border-dashed border-black">
             <p className="font-bold">Método Pago: {activeTicketPaymentMethod}</p>
             {activeTicketPaymentMethod === 'Efectivo' && activeTicketCashTendered && <p>Recibido: {fmt(Number(activeTicketCashTendered))}</p>}
             {activeTicketPaymentMethod === 'Efectivo' && activeTicketCashTendered && <p className="font-bold">Cambio: {fmt(Number(activeTicketCashTendered) - activeTicketTotals.total)}</p>}
           </div>

           <div className="text-center mt-3 text-[9px] leading-tight space-y-0.5">
             <p className="font-bold uppercase tracking-widest text-[9.5px]">ORIGINAL: CLIENTE</p>
             <p className="font-bold uppercase">LA FACTURA ES BENEFICIO DE TODOS, EXÍJALA</p>
             <p className="mt-1 text-[8.5px]">¡Gracias por su compra!</p>
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

      {/* MODAL REUTILIZABLE REGISTRAR / EDITAR CLIENTE (DISTRIBUIDORA) */}
      <ContactoModal
        open={showAddClientModal}
        onClose={() => {
          setShowAddClientModal(false);
          setEditingClient(null);
        }}
        initialContacto={editingClient}
        onSuccess={async (savedClient) => {
          if (savedClient) {
            const nuevoClienteObj = {
              id: savedClient.id,
              nombre: savedClient.nombre,
              rtn: savedClient.rtn || undefined,
              telefono: savedClient.telefono || undefined,
              email: savedClient.email || undefined,
              direccion: savedClient.direccion || undefined
            };
            setSelectedClient(nuevoClienteObj);
            setClientName(savedClient.nombre.toUpperCase());
            
            try {
              const res = await searchClientes(savedClient.nombre);
              setClientSearchResults(res || []);
            } catch (e) {
              console.error(e);
            }
            toast.success(`Cliente "${savedClient.nombre}" guardado y seleccionado.`);
          }
        }}
      />

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
                    onFocus={e => e.target.select()}
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
                    onFocus={e => e.target.select()}
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
                  onFocus={e => e.target.select()}
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
      {/* Modal de Escáner de Cámara para Móviles y Tabletas */}
      <PosCameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleScannedCode}
      />

    </div>
  );
}
