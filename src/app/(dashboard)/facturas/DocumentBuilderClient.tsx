'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
// html2canvas and jspdf are imported dynamically inside handleDownloadPDF to avoid SSR issues
import {
  Search, Plus, Trash2, ChevronDown, ChevronUp, GripVertical,
  User, Building2, FileText, Receipt, ClipboardList, Send,
  Package, Stethoscope, Zap, CheckCircle2, Clock, AlertCircle,
  X, Calculator, Download, Eye, MoreHorizontal, ArrowRight,
  Sparkles, Hash, Calendar, CreditCard, Percent, ChevronRight,
  Tag, Info, Copy, Printer, Mail, Phone, MapPin, Star, Palette, Undo, LayoutGrid, Pencil,
  Smartphone, Loader2, UploadCloud, PenTool, RefreshCw, Wrench
} from 'lucide-react';
import DocumentActionsModal from '@/components/facturas/DocumentActionsModal';
import SendEmailModal from '@/components/facturas/SendEmailModal';
import SignatureCanvas from 'react-signature-canvas';

// ─── TYPES ─────────────────────────────────────────────────────────────────

type DocType = 'cotizacion' | 'proforma' | 'factura' | 'nota_credito' | 'presupuesto_reparacion' | 'presupuesto_mantenimiento';
type TaxType = 'isv15' | 'isv18' | 'exento' | 'exonerado';

interface LineItem {
  id: string;
  code: string;
  shortDesc: string;
  longDesc: string;
  richDesc: string;
  showLongDesc: boolean;
  qty: number | string;
  unitPrice: number | string;
  tax: TaxType;
  discount: number | string;
  discountType: 'percentage' | 'amount';
  productoId?: string;
  activoId?: string;
  imageUrl?: string;
  serie?: string | null;
  marcaModelo?: string | null;
  isSection?: boolean;
  sectionStyle?: {
    bg?: string;
    color?: string;
    bold: boolean;
    align: 'left' | 'center' | 'right';
  };
}

interface Client {
  id: string;
  name: string;
  rtn: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
}

interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  brand: string;
  type: 'producto' | 'activo';
  imageUrl?: string;
  fechaVencimiento?: string | Date | null;
  serie?: string | null;
  marcaModelo?: string | null;
  isOrdenTrabajo?: boolean;
}

import { searchClientes, searchProductos, guardarDocumentoBuilder, buscarItemPorCodigo, actualizarDocumentoBuilder, reservarCorrelativoVacio, toggleMostrarDescripcion, updateDocumentTemplateSettings, getAuthenticatedUser, updateOrganizationDefaultSettings, searchOrdenesTrabajoParaFacturar, getOrdenTrabajoImages } from './actions';
import { createContacto, updateContacto } from '../contactos/actions';
import { getOrCreateOrdenEntrega, updateOrdenEntrega } from './orden-entrega-actions';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import InvoiceCustomizerSidebar from '@/components/facturas/customizer/InvoiceCustomizerSidebar';
import ModernTemplate from '@/components/facturas/templates/ModernTemplate';
import ClassicTemplate from '@/components/facturas/templates/ClassicTemplate';
import MinimalistTemplate from '@/components/facturas/templates/MinimalistTemplate';
import LegacyTemplate from '@/components/facturas/templates/LegacyTemplate';
import OrdenEntregaTemplate from '@/components/facturas/templates/OrdenEntregaTemplate';
import { InvoiceSettings, DEFAULT_INVOICE_SETTINGS, SignatureItem } from '@/types/invoice';
import RichDescriptionEditor from '@/components/facturas/RichDescriptionEditor';
import { convertirDocumento, crearServicioRapido } from './actions';
import { ActivoModal } from '../inventario/InventarioClient';
import { getAreas } from '../admin/areas/actions';




const DOC_TYPES: { key: DocType; label: string; icon: React.ReactNode; color: string; bg: string; description: string }[] = [
  { key: 'cotizacion', label: 'Cotización', icon: <FileText size={14} />, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Propuesta comercial formal o presupuesto de soporte' },
  { key: 'proforma', label: 'Pro Forma', icon: <Receipt size={14} />, color: 'text-violet-600', bg: 'bg-violet-50', description: 'Factura preliminar de exportación' },
  { key: 'factura', label: 'Factura Oficial', icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Documento fiscal definitivo' },
  { key: 'nota_credito', label: 'Nota de Crédito', icon: <Undo size={14} />, color: 'text-purple-600', bg: 'bg-purple-50', description: 'Documento de devolución/descuento' },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

const normalizeText = (text: string) => text ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
const fmt = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(n);
const uid = () => Math.random().toString(36).slice(2, 9);

const resolveServiceImageUrl = (desc: string | null | undefined): string | undefined => {
  if (!desc) return undefined;
  const lower = desc.toLowerCase();
  if (lower.includes('servicio de instalacion') || lower.includes('servicio de instalación')) return '/services/instalacion.svg';
  if (lower.includes('servicio de reparacion') || lower.includes('servicio de reparación')) return '/services/reparacion.jpg';
  if (lower.includes('servicio de diagnostico') || lower.includes('servicio de diagnóstico') || lower.includes('revision') || lower.includes('revisión')) return '/services/soporte.svg';
  if (lower.includes('mantenimiento preventivo')) return '/services/mantenimiento.svg';
  if (lower.includes('mantenimiento correctivo')) return '/services/garantia.svg';
  if (lower.includes('mano de obra') || lower.includes('horas de tecnico') || lower.includes('horas de técnico')) return '/services/mano_obra.svg';
  return undefined;
};

const formatFecha = (dStr: string | Date | null | undefined) => {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '';
  }
};

const emptyLine = (): LineItem => ({
  id: uid(), code: '', shortDesc: '', longDesc: '', richDesc: '', showLongDesc: false,
  qty: 1, unitPrice: '', tax: 'isv15', discount: 0, discountType: 'percentage',
});

const emptySectionLine = (): LineItem => ({
  id: uid(), code: '', shortDesc: '', longDesc: '', richDesc: '', showLongDesc: false,
  qty: 0, unitPrice: '', tax: 'exento', discount: 0, discountType: 'percentage',
  isSection: true,
  sectionStyle: { 
    bold: true, align: 'left' 
  }
});

const calcLine = (item: LineItem, pricesIncludeTax?: boolean) => {
  const q = Number(item.qty) || 0;
  const p = Number(item.unitPrice) || 0;
  const dVal = Number(item.discount) || 0;

  let tasaImpuesto = 0;
  if (item.tax === 'isv15') tasaImpuesto = 0.15;
  if (item.tax === 'isv18') tasaImpuesto = 0.18;

  if (pricesIncludeTax) {
    const baseConImpuesto = q * p;
    const baseNeta = baseConImpuesto / (1 + tasaImpuesto);
    
    let dAmount = 0;
    if (item.discountType === 'amount') {
      dAmount = dVal / (1 + tasaImpuesto);
    } else {
      dAmount = baseNeta * (dVal / 100);
    }
    
    const baseAfterDiscount = baseNeta - dAmount;
    const tax = baseAfterDiscount * tasaImpuesto;
    const total = baseAfterDiscount + tax;

    return { 
      base: baseNeta, 
      dAmount, 
      baseAfterDiscount, 
      tax, 
      total 
    };
  } else {
    let dAmount = 0;
    if (item.discountType === 'amount') {
      dAmount = dVal;
    } else {
      dAmount = (q * p) * (dVal / 100);
    }
    
    const base = q * p;
    const baseAfterDiscount = base - dAmount;
    const tax = baseAfterDiscount * tasaImpuesto;

    return { 
      base, 
      dAmount, 
      baseAfterDiscount, 
      tax, 
      total: baseAfterDiscount + tax 
    };
  }
};

// Helper to calculate Unit Price backwards from target line Total (Option 1)
const calculateUnitPriceFromTotal = (
  targetTotal: number,
  qty: number,
  taxType: TaxType,
  discount: number,
  discountType: 'percentage' | 'amount',
  pricesIncludeTax?: boolean
): number => {
  const q = qty || 1; // avoid division by zero
  const dVal = discount || 0;
  
  let tasaImpuesto = 0;
  if (taxType === 'isv15') tasaImpuesto = 0.15;
  if (taxType === 'isv18') tasaImpuesto = 0.18;
  
  if (pricesIncludeTax) {
    if (discountType === 'amount') {
      return (targetTotal + dVal) / q;
    } else {
      const pct = dVal / 100;
      if (pct >= 1) return 0;
      return targetTotal / (1 - pct) / q;
    }
  } else {
    const netTarget = targetTotal / (1 + tasaImpuesto);
    if (discountType === 'amount') {
      return (netTarget + dVal) / q;
    } else {
      const pct = dVal / 100;
      if (pct >= 1) return 0;
      return (netTarget / (1 - pct)) / q;
    }
  }
};

// ─── SUB COMPONENTS ────────────────────────────────────────────────────────

function DocTypeSelector({ value, onChange }: { value: DocType; onChange: (v: DocType) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {DOC_TYPES.map((dt) => {
        const active = value === dt.key;
        return (
          <button
            key={dt.key}
            onClick={() => onChange(dt.key)}
            title={dt.description}
            className={`
              flex flex-col items-center justify-center w-28 h-16 rounded-xl border transition-all duration-200 shadow-sm
              ${active 
                ? `bg-white border-[currentColor] ${dt.color} shadow-md ring-4 ring-slate-100/30 font-bold scale-[1.02]` 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-50 font-medium'
              }
            `}
          >
            <span className="mb-1">{dt.icon}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold">{dt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ClientCard({ client, onRemove }: { client: Client; onRemove: () => void }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm group relative">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg"
      >
        <X size={13} className="text-red-400" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-tight truncate">{client.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">RTN: {client.rtn}</p>
          <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
            {client.category}
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Mail size={11} className="shrink-0" /><span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Phone size={11} className="shrink-0" /><span>{client.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin size={11} className="shrink-0" /><span className="truncate">{client.city}</span>
        </div>
      </div>
    </div>
  );
}

function ProductSearchItem({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const catColors: Record<string, string> = {
    'Diagnóstico': 'text-blue-600 bg-blue-50',
    'Monitoreo': 'text-violet-600 bg-violet-50',
    'Ventilación': 'text-cyan-600 bg-cyan-50',
    'Imagenología': 'text-indigo-600 bg-indigo-50',
    'Infusión': 'text-amber-600 bg-amber-50',
    'Servicio': 'text-emerald-600 bg-emerald-50',
    'Emergencias': 'text-red-600 bg-red-50',
    'Cirugía': 'text-pink-600 bg-pink-50',
  };
  const cc = catColors[product.category] || 'text-slate-600 bg-slate-100';
  return (
    <button
      onClick={() => onAdd(product)}
      className="w-full flex items-start gap-3 p-3 hover:bg-blue-50/70 rounded-xl transition-all group text-left"
    >
      <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 relative transition-colors group-hover:border-blue-300">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : product.type === 'activo' ? (
          <Stethoscope size={14} className="text-indigo-400 group-hover:text-blue-500" />
        ) : (
          <Package size={14} className="text-slate-400 group-hover:text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-700 leading-tight">{product.name}</p>
          <span className="shrink-0 text-xs font-bold text-slate-700 group-hover:text-blue-600">{fmt(product.price)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-slate-400">{product.code}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cc}`}>{product.category}</span>
          <span className="text-[10px] text-slate-400">Stock: {product.stock}</span>
        </div>
      </div>
    </button>
  );
}

function LineItemRow({
  item, index, onChange, onDelete, onDuplicate, onToggleLongDesc, allProducts, viewMode, settings, lineItems
}: {
  item: LineItem;
  index: number;
  onChange: (id: string, field: keyof LineItem, val: unknown) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLongDesc: (id: string) => void;
  allProducts: Product[];
  viewMode?: boolean;
  settings?: any;
  lineItems?: LineItem[];
}) {
  const { base, tax, total } = calcLine(item, settings?.pricesIncludeTax);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const lastNonSectionIndex = lineItems ? lineItems.reduceRight((acc: number, it: any, idx: number) => acc !== -1 ? acc : (!it.isSection ? idx : -1), -1) : -1;
  const isLastNonSection = index === lastNonSectionIndex;
  const adjustment = (isLastNonSection && mounted) ? (Number(settings?.roundAdjustment) || 0) : 0;
  const displayTotal = total + adjustment;
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [focusedField, setFocusedField] = useState<'code' | 'desc' | 'monto' | null>(null);
  const [montoInputValue, setMontoInputValue] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggable, setIsDraggable] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);


  const handleSyncCatalogClick = () => {
    setIsSyncingCatalog(true);
    window.dispatchEvent(new CustomEvent('reload-catalog'));
    setTimeout(() => {
      setIsSyncingCatalog(false);
      toast.success('Catálogo de inventario sincronizado');
    }, 850);
  };
  const [isDragOver, setIsDragOver] = useState(false);
  const shortDescRef = useRef<HTMLTextAreaElement>(null);
  const longDescRef = useRef<HTMLTextAreaElement>(null);

  const paddingClasses = ['py-0 print:py-0', 'py-[2px] print:py-[2px]', 'py-2 print:py-1', 'py-3 print:py-2', 'py-4 print:py-3'];
  const padClass = paddingClasses[settings?.tableRowPadding ?? 2] || 'py-2 print:py-1';

  const imgSizeClass = settings?.productImageSize === 'large' ? 'w-24 h-24' : 
                       settings?.productImageSize === 'medium' ? 'w-16 h-16' : 'w-[34px] h-[34px]';
  
  const imgStyleClass = settings?.productImageStyle === 'original' 
    ? 'bg-transparent overflow-visible border-none'
    : settings?.productImageStyle === 'square' 
      ? 'bg-slate-50 rounded-none border border-slate-200 overflow-hidden print:border-none print:bg-transparent'
      : 'bg-slate-50 rounded-lg border border-slate-200 overflow-hidden print:border-none print:bg-transparent';
      
  const imgObjectClass = settings?.productImageStyle === 'original' ? 'object-contain' : 'object-cover';

  const isDescNum = typeof settings?.itemDescFontSize === 'number';
  const descSizeClass = isDescNum ? '' : settings?.itemDescFontSize === 'large' ? 'text-sm' : settings?.itemDescFontSize === 'small' ? 'text-[9px]' : 'text-[11px]';
  const inputDescSizeClass = isDescNum ? '' : settings?.itemDescFontSize === 'large' ? 'text-sm' : settings?.itemDescFontSize === 'small' ? 'text-[9px]' : 'text-[11px]';
  const descStyle = isDescNum ? { fontSize: `${settings.itemDescFontSize}px`, lineHeight: '1.45' } as React.CSSProperties : { lineHeight: '1.45' };

  const isServiceIcon = item.imageUrl?.includes('/services/') && item.imageUrl?.endsWith('.svg');
  const renderImage = () => {
    const fallbackIcon = <Package size={14} className="text-slate-300" />;

    const imageElement = (() => {
      if (!item.imageUrl) return fallbackIcon;
      if (isServiceIcon) {
        return (
          <div 
            className="w-full h-full print:!-webkit-print-color-adjust:exact"
            style={{
              backgroundColor: settings?.serviceIconColor || '#0500A3',
              WebkitMaskImage: `url(${item.imageUrl})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskImage: `url(${item.imageUrl})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
            }}
          />
        );
      }
      const displayUrl = (item.imageUrl.startsWith('http') && !isServiceIcon)
        ? `/_next/image?url=${encodeURIComponent(item.imageUrl)}&w=256&q=75`
        : item.imageUrl;

      return (
        <img 
          src={displayUrl} 
          alt="" 
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('show-lightbox-image', { detail: item.imageUrl }));
          }}
          className={`w-full h-full ${imgObjectClass} cursor-zoom-in hover:opacity-80 transition-opacity`} 
        />
      );
    })();

    if (viewMode) {
      return imageElement;
    }

    return (
      <div className="relative w-full h-full group flex flex-col items-center justify-center min-h-[34px]">
        <div className="w-full h-full flex items-center justify-center">
          {imageElement}
        </div>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('open-line-item-image-picker', { 
              detail: { itemId: item.id, currentUrl: item.imageUrl } 
            }));
          }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-white cursor-pointer rounded-lg z-20 border-none outline-none"
          title="Cambiar imagen"
        >
          <UploadCloud size={14} className="animate-bounce" />
        </button>
        
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('open-line-item-image-picker', { 
              detail: { itemId: item.id, currentUrl: item.imageUrl } 
            }));
          }}
          className="absolute -bottom-2 bg-indigo-50 border border-indigo-200 text-indigo-755 text-[8px] font-extrabold px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-35 shadow-sm print:hidden"
        >
          CAMBIAR
        </button>
      </div>
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = focusedField === 'code' ? (item.code || '') : (item.shortDesc || '');
  const nQuery = normalizeText(query);

  useEffect(() => {
    if (!showAutocomplete || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingResults(true);
      try {
        const res = await searchProductos(query);
        const mapped = res.map((p: any) => ({
          id: p.id,
          code: p.sku || '',
          name: p.nombre,
          description: p.descripcion || '',
          price: Number(p.precioVenta) || 0,
          category: p.marca || 'General',
          stock: p.stockActual || 0,
          brand: p.marca || '',
          type: p.type || 'producto',
          imageUrl: p.imageUrl || p.imagenUrl || null,
          fechaVencimiento: p.fechaVencimiento || null,
          serie: p.serie || null,
          marcaModelo: p.marcaModelo || null,
          isOrdenTrabajo: p.isOrdenTrabajo || false
        }));
        setSearchResults(mapped);
      } catch (err) {
        console.error("Error searching products dynamic:", err);
      } finally {
        setIsLoadingResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, showAutocomplete]);

  const matchedProducts = query.trim().length >= 2 
    ? (searchResults.length > 0 ? searchResults : (isLoadingResults ? [] : allProducts.filter(p => 
        normalizeText(p.name).includes(nQuery) || 
        normalizeText(p.code).includes(nQuery) ||
        (p.type === 'activo' && p.description && normalizeText(p.description).includes(nQuery)) ||
        (p.serie && normalizeText(p.serie).includes(nQuery))
      )))
    : [];

  const filteredProducts = matchedProducts.sort((a, b) => {
    const aName = normalizeText(a.name);
    const bName = normalizeText(b.name);
    
    // 1st Priority: Name starts with search query
    const aStarts = aName.startsWith(nQuery);
    const bStarts = bName.startsWith(nQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    // 2nd Priority: Name has a word starting with query (word boundary matching)
    const aWordStarts = aName.split(/\s+/).some(word => word.startsWith(nQuery));
    const bWordStarts = bName.split(/\s+/).some(word => word.startsWith(nQuery));
    if (aWordStarts && !bWordStarts) return -1;
    if (!aWordStarts && bWordStarts) return 1;
    
    // 3rd Priority: Shorter names first (exact/closer match)
    if (aName.includes(nQuery) && bName.includes(nQuery)) {
      return aName.length - bName.length;
    }
    
    return 0;
  }).slice(0, 25);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (shortDescRef.current) {
      shortDescRef.current.style.height = 'auto';
      shortDescRef.current.style.height = shortDescRef.current.scrollHeight + 'px';
    }
  }, [item.shortDesc]);

  useEffect(() => {
    if (longDescRef.current && item.showLongDesc) {
      longDescRef.current.style.height = 'auto';
      longDescRef.current.style.height = longDescRef.current.scrollHeight + 'px';
    }
  }, [item.longDesc, item.showLongDesc]);

  const handleSelectProduct = async (product: Product) => {
    if ((product as any).isOrdenTrabajo) {
      setShowAutocomplete(false);
      window.dispatchEvent(new CustomEvent('extract-work-order-event', {
        detail: { code: product.code, id: product.id, lineId: item.id }
      }));
      return;
    }

    onChange(item.id, 'code', product.code);
    onChange(item.id, 'shortDesc', product.name);
    
    // Si la imagen ya viene en la data cacheada
    if (product.imageUrl) {
      onChange(item.id, 'imageUrl', product.imageUrl);
    } else {
      // Forzar recarga por si el caché no trajo la imagen (ej: recién subida)
      try {
        const res = await buscarItemPorCodigo(product.code);
        if (res?.imageUrl) {
          onChange(item.id, 'imageUrl', res.imageUrl);
        }
      } catch (e) {}
    }
    
    let targetDescription = product.description || '';
    if (product.type === 'activo' && product.serie) {
      const hasSerieAlready = targetDescription.toLowerCase().includes(product.serie.toLowerCase()) ||
                              targetDescription.toLowerCase().includes('s/n:');
      if (!hasSerieAlready) {
        if (targetDescription.trim()) {
          targetDescription += `\nS/N: ${product.serie}`;
        } else {
          targetDescription = `S/N: ${product.serie}`;
        }
      }
    }
    
    if (!item.longDesc || item.longDesc.trim() === '') {
      onChange(item.id, 'longDesc', targetDescription);
    } else {
      const currentDesc = item.longDesc || '';
      const hasSerieAlready = currentDesc.toLowerCase().includes(product.serie?.toLowerCase() || '') ||
                              currentDesc.toLowerCase().includes('s/n:');
      if (product.type === 'activo' && product.serie && !hasSerieAlready) {
        onChange(item.id, 'longDesc', currentDesc.trim() + `\nS/N: ${product.serie}`);
      }
    }

    if (Number(item.unitPrice) === 0) onChange(item.id, 'unitPrice', product.price);
    
    if (product.type === 'producto') {
       onChange(item.id, 'productoId', product.id);
       onChange(item.id, 'activoId', undefined);
       onChange(item.id, 'serie', null);
    }
    if (product.type === 'activo') {
       onChange(item.id, 'activoId', product.id);
       onChange(item.id, 'productoId', undefined);
       onChange(item.id, 'serie', product.serie || null);
    }
    if ((product as any).marcaModelo) {
       onChange(item.id, 'marcaModelo', (product as any).marcaModelo);
    } else {
       onChange(item.id, 'marcaModelo', null);
    }
    
    setShowAutocomplete(false);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (showAutocomplete && filteredProducts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectProduct(filteredProducts[selectedIndex]);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedField === 'code') {
        const val = item.code.trim();
        if (val && val.length >= 3 && (!item.shortDesc || item.shortDesc.trim() === '')) {
          try {
            const res = await buscarItemPorCodigo(val);
            if (res) {
              onChange(item.id, 'shortDesc', res.name);
              if ((res as any).marcaModelo) {
                onChange(item.id, 'marcaModelo', (res as any).marcaModelo);
              } else {
                onChange(item.id, 'marcaModelo', null);
              }
              if (res.serie) {
                onChange(item.id, 'serie', res.serie);
              } else {
                onChange(item.id, 'serie', null);
              }
              
              let targetDescription = res.description || '';
              if (res.type === 'activo' && res.serie) {
                const hasSerieAlready = targetDescription.toLowerCase().includes(res.serie.toLowerCase()) ||
                                        targetDescription.toLowerCase().includes('s/n:');
                if (!hasSerieAlready) {
                  if (targetDescription.trim()) {
                    targetDescription += `\nS/N: ${res.serie}`;
                  } else {
                    targetDescription = `S/N: ${res.serie}`;
                  }
                }
              }
              
              if (!item.longDesc || item.longDesc.trim() === '') {
                onChange(item.id, 'longDesc', targetDescription);
              } else {
                const currentDesc = item.longDesc || '';
                const hasSerieAlready = currentDesc.toLowerCase().includes(res.serie?.toLowerCase() || '') ||
                                        currentDesc.toLowerCase().includes('s/n:');
                if (res.type === 'activo' && res.serie && !hasSerieAlready) {
                  onChange(item.id, 'longDesc', currentDesc.trim() + `\nS/N: ${res.serie}`);
                }
              }

              if (Number(item.unitPrice) === 0) onChange(item.id, 'unitPrice', res.price);
              if (res.type === 'producto') {
                onChange(item.id, 'productoId', res.id);
                onChange(item.id, 'activoId', undefined);
                onChange(item.id, 'serie', null);
              }
              if (res.type === 'activo') {
                onChange(item.id, 'activoId', res.id);
                onChange(item.id, 'productoId', undefined);
                onChange(item.id, 'serie', res.serie || null);
              }
              if (res.imageUrl) onChange(item.id, 'imageUrl', res.imageUrl);
            }
          } catch(e) { console.error('Error in code lookup:', e); }
        }
      }
    }
  };

  const renderDropdown = () => {
    if (!showAutocomplete || !focusedField) return null;
    if (query.trim().length < 2) return null;
    return (
      <div className="absolute top-[calc(100%+4px)] left-0 w-[500px] md:w-[540px] z-[60] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto print:hidden">
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-[65]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coincidencias en catálogo</span>
            {isLoadingResults ? (
              <span className="text-[10px] text-blue-500 font-semibold animate-pulse ml-1.5">Buscando en base de datos...</span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSyncCatalogClick();
                }}
                disabled={isSyncingCatalog}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition active:scale-95 flex items-center justify-center cursor-pointer"
                title="Sincronizar catálogo desde la base de datos sin recargar la página"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingCatalog ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}
          </div>
          <span className="text-[10px] font-medium text-slate-400">{filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
        <div className="p-1">
          {filteredProducts.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => handleSelectProduct(p)}
              className={`w-full text-left px-3 py-2.5 rounded-lg group flex items-start gap-3 transition-colors ${idx === selectedIndex ? 'bg-blue-50' : 'hover:bg-blue-50/70'}`}
            >
              {/* Miniatura del Producto / Activo */}
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 relative">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : p.isOrdenTrabajo ? (
                  <Wrench size={16} className="text-indigo-600 group-hover:text-blue-500 transition-colors" />
                ) : p.type === 'activo' ? (
                  <Stethoscope size={16} className="text-indigo-400 group-hover:text-blue-500 transition-colors" />
                ) : (
                  <Package size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                )}
              </div>

              {/* Información Detallada */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 leading-tight truncate">
                    {p.name}
                  </p>
                  <p className="text-xs font-black text-blue-600 shrink-0">{fmt(p.price)}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors`}>
                    {p.code}
                  </span>
                  
                  {p.isOrdenTrabajo ? (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded">
                      Orden de Trabajo
                    </span>
                  ) : p.type === 'activo' ? (
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Activo Fijo
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Stock: {p.stock}
                    </span>
                  )}

                  {p.type === 'activo' && p.serie && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Tag size={10} className="shrink-0" />
                      S/N: {p.serie}
                    </span>
                  )}

                  {p.fechaVencimiento && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Calendar size={10} className="shrink-0" />
                      Vence: {formatFecha(p.fechaVencimiento)}
                    </span>
                  )}
                </div>

                {p.type === 'activo' && p.description && (
                  <p className="text-[10px] text-slate-400 truncate leading-tight">{p.description}</p>
                )}
              </div>
            </button>
          ))}
          
          {filteredProducts.length === 0 && (
            <div className="px-4 py-3.5 text-xs text-slate-400 text-center font-medium">
              No se encontraron coincidencias para "{query}"
            </div>
          )}

          {/* SECCIÓN: CREAR SERVICIO AL INSTANTE */}
          <div className="border-t border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Zap size={13} className="text-amber-500 fill-amber-500 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Crear e Insertar Servicio Rápido</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { label: 'Instalación (INS)', prefix: 'INS' },
                { label: 'Reparación (REP)', prefix: 'REP' },
                { label: 'Diagnóstico (DIAG)', prefix: 'DIAG' },
                { label: 'Mant. Prev. (MPV)', prefix: 'MPV' },
                { label: 'Mant. Corr. (MCO)', prefix: 'MCO' },
                { label: 'Mano Obra (MO)', prefix: 'MO' },
              ].map((s) => (
                <button
                  key={s.prefix}
                  type="button"
                  onClick={async () => {
                    const toastId = toast.loading(`Autogenerando código ${s.prefix} y registrando...`);
                    try {
                      const res = await crearServicioRapido(s.prefix);
                      if (res.success && res.service) {
                        toast.success(`Código ${res.service.code} reservado y asignado!`, { id: toastId });
                        // Cerrar autocomplete y notificar al padre
                        setShowAutocomplete(false);
                        window.dispatchEvent(new CustomEvent('service-created', { detail: { service: res.service, lineId: item.id } }));
                      } else {
                        throw new Error(res.error || 'Error al generar el servicio');
                      }
                    } catch (e: any) {
                      toast.error(e.message || 'Error al generar', { id: toastId });
                    }
                  }}
                  className="flex items-center justify-center text-[10px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 py-2 px-1.5 rounded-lg transition-all text-center leading-tight active:scale-[0.98] cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAutocomplete(false);
              window.dispatchEvent(new CustomEvent('open-activo-modal', { detail: { lineId: item.id } }));
            }}
            className="w-full text-left px-3 py-2.5 border-t border-slate-100 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center gap-2 transition-colors sticky bottom-0 z-10"
          >
            <Plus size={14} className="shrink-0" />
            Registrar nuevo producto o activo en Inventario
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`group relative hover:z-50 ${isDragOver ? 'border-t-[3px] border-blue-500' : ''} ${showAutocomplete ? 'z-[70]' : ''}`} 
      ref={containerRef} 
      data-line-id={item.id}
      draggable={isDraggable && !viewMode}
      onDragStart={(e) => {
        if (viewMode) return;
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
          if (containerRef.current) containerRef.current.style.opacity = '0.4';
        }, 0);
      }}
      onDragEnd={() => {
        if (containerRef.current) containerRef.current.style.opacity = '1';
        setIsDraggable(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const dragId = e.dataTransfer.getData('text/plain');
        if (dragId && dragId !== item.id) {
          window.dispatchEvent(new CustomEvent('reorder-lines', { detail: { dragId, dropId: item.id } }));
        }
      }}
    >
      <div className={`
        flex flex-col transition-all duration-200 w-full
        ${settings?.tableRoundedBorders ? 'rounded-none print:rounded-none' : ''}
        print:p-0 print:bg-transparent print:my-0
      `}
      style={{
        borderLeftWidth: (settings?.showTableOuterBorders !== false) ? (settings.tableBorderThickness || '1px') : '0px',
        borderRightWidth: (settings?.showTableOuterBorders !== false) ? (settings.tableBorderThickness || '1px') : '0px',
        borderBottomWidth: settings?.showTableBorders ? (settings.tableBorderThickness || '1px') : '0px',
        borderColor: settings?.tableBorderColor || '#e2e8f0',
        borderStyle: settings?.descriptionBorderDashed !== false ? 'dashed' : 'solid'
      }}>
        <div 
          className={`flex items-stretch gap-2 w-full px-4 print:px-4 ${item.isSection ? '' : (Number(item.qty) > 0 && Number(item.unitPrice) > 0 ? 'bg-white hover:bg-blue-50/20' : 'bg-slate-50/50')}`}
          style={item.isSection ? { 
            backgroundColor: (item.sectionStyle?.bg && item.sectionStyle.bg !== '#f1f5f9') ? item.sectionStyle.bg : (settings?.sectionBgColor || '#f1f5f9'),
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          } : undefined}
        >
        {/* Drag handle + index */}
        <div 
          className={`relative flex flex-col items-center justify-center w-4 ${item.isSection ? 'py-2 print:py-1' : `h-[34px] ${padClass}`} shrink-0 print:hidden`}
          data-pdf-hide
          onMouseEnter={() => setIsDraggable(true)}
          onMouseLeave={() => setIsDraggable(false)}
        >
          {!viewMode && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab absolute inset-0 flex items-center justify-center z-10">
            <GripVertical size={14} className="text-slate-400 hover:text-slate-600" />
          </div>
          )}
          <span data-pdf-hide className={`text-[10px] font-bold text-slate-300 w-4 text-center ${!viewMode ? 'group-hover:opacity-0 transition-opacity' : ''}`}>{index + 1}</span>
        </div>

        {/* First Column Image Position (if enabled) */}
        {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && settings?.showItemCode !== false && !item.isSection && (
          <div className={`${padClass} shrink-0`}>
            <div className={`${imgSizeClass} ${imgStyleClass} flex items-center justify-center`}>
{renderImage()}
            </div>
          </div>
        )}

        {item.isSection ? (
          <div 
            className={`flex-1 flex flex-col relative py-2 print:py-1`}
          >
             <div 
               className="w-full h-full flex items-center px-1 transition-all border border-transparent print:border-none focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20"
             >
               {viewMode ? (
                 <div
                   className="w-full px-2 py-0 flex items-center"
                   style={{
                     color: (item.sectionStyle?.color && item.sectionStyle.color !== '#1e293b') ? item.sectionStyle.color : (settings?.sectionTextColor || '#1e293b'),
                     fontWeight: item.sectionStyle?.bold ? 'bold' : 'normal',
                     textAlign: item.sectionStyle?.align || 'left',
                     textTransform: 'uppercase',
                     fontSize: '11px',
                     letterSpacing: '0.05em'
                   }}
                 >
                   {item.shortDesc || ' '}
                 </div>
               ) : (
                 <input
                   value={item.shortDesc}
                   disabled={viewMode}
                   onChange={e => onChange(item.id, 'shortDesc', e.target.value)}
                   placeholder="TITULO DE SECCIÓN (Ej: 2 AÑOS DE GARANTÍA)"
                   className="w-full bg-transparent border-none outline-none focus:ring-0 px-2 py-0 placeholder:text-[currentColor]"
                   style={{
                     color: (item.sectionStyle?.color && item.sectionStyle.color !== '#1e293b') ? item.sectionStyle.color : (settings?.sectionTextColor || '#1e293b'),
                     fontWeight: item.sectionStyle?.bold ? 'bold' : 'normal',
                     textAlign: item.sectionStyle?.align || 'left',
                     textTransform: 'uppercase',
                     fontSize: '11px',
                     letterSpacing: '0.05em'
                   }}
                 />
               )}
             </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-[minmax(0,19fr)_minmax(0,26fr)_minmax(0,9fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)] gap-2 min-w-0 relative">
            {/* Code */}
            <div className={`min-w-0 relative flex items-center justify-center ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`}>
              {settings?.showItemCode !== false ? (
                viewMode ? (
                  <div className={`w-full ${descSizeClass} tracking-tight ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-center text-slate-800 break-words`} style={descStyle}>
                    {item.code || ' '}
                  </div>
                ) : (
                  <>
                    <input
                      value={item.code}
                    onFocus={() => { setFocusedField('code'); setShowAutocomplete(true); }}
                    onChange={e => {
                      onChange(item.id, 'code', e.target.value);
                      setFocusedField('code');
                      setShowAutocomplete(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      setTimeout(async () => {
                        if (val && val.length >= 3 && (!item.shortDesc || item.shortDesc.trim() === '')) {
                          try {
                            const res = await buscarItemPorCodigo(val);
                            if (res) {
                              onChange(item.id, 'shortDesc', res.name);
                              if (!item.longDesc) onChange(item.id, 'longDesc', res.description);
                              if (Number(item.unitPrice) === 0) onChange(item.id, 'unitPrice', res.price);
                              if (res.type === 'producto') {
                                onChange(item.id, 'productoId', res.id);
                                onChange(item.id, 'activoId', undefined);
                                onChange(item.id, 'serie', null);
                              }
                              if (res.type === 'activo') {
                                onChange(item.id, 'activoId', res.id);
                                onChange(item.id, 'productoId', undefined);
                                onChange(item.id, 'serie', (res as any).serie || null);
                              }
                              if ((res as any).marcaModelo) {
                                onChange(item.id, 'marcaModelo', (res as any).marcaModelo);
                              } else {
                                onChange(item.id, 'marcaModelo', null);
                              }
                              if (res.imageUrl) onChange(item.id, 'imageUrl', res.imageUrl);
                            }
                          } catch(err) { console.error('Error in onBlur search:', err); }
                        }
                      }, 200);
                    }}
                    placeholder="Código"
                    className={`w-full h-[34px] text-[10px] md:text-[11px] tracking-tight ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-center border border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 print:hidden disabled:bg-slate-50 disabled:border-transparent disabled:text-slate-700`}
                  />
                  <span className={`hidden print:block w-full ${descSizeClass} tracking-tight ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-center text-slate-800 break-words`} style={descStyle}>
                    {item.code || ' '}
                  </span>
                  </>
                )
              ) : (
                settings?.showProductImages && (
                  <div className={`${imgSizeClass} shrink-0 flex items-center justify-center ${imgStyleClass}`}>
{renderImage()}
                  </div>
                )
              )}

              {focusedField === 'code' && !viewMode && renderDropdown()}
              {settings?.showTableVerticalBorders && (
                <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#e2e8f0', zIndex: 10 }} />
              )}
            </div>

            {/* Description */}
            <div className={`min-w-0 relative flex gap-2 items-center ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`}>
              {settings?.showProductImages && (!settings?.productImagePosition || settings?.productImagePosition === 'afterCode') && settings?.showItemCode !== false && (
                <div className={`${imgSizeClass} shrink-0 flex items-center justify-center ${imgStyleClass}`}>
{renderImage()}
                </div>
              )}
              <div className="flex-1 min-w-0">
              {viewMode ? (
                <div className={`${descSizeClass} font-semibold text-slate-800 whitespace-pre-wrap break-words leading-snug`} style={descStyle}>
                  {item.shortDesc}
                  {(item.marcaModelo || item.serie) && (
                    <div className="text-[9px] text-slate-500 font-normal mt-0.5 leading-normal break-all">
                      {item.marcaModelo ? `Marca/Modelo: ${item.marcaModelo}` : ''}
                      {item.marcaModelo && item.serie ? ' | ' : ''}
                      {item.serie ? `Serie: ${item.serie}` : ''}
                    </div>
                  )}
                </div>
              ) : (
                <>
                <input
                  type="text"
                  value={item.shortDesc}
                  disabled={viewMode}
                  onFocus={() => { setFocusedField('desc'); setShowAutocomplete(true); }}
                  onChange={e => {
                    onChange(item.id, 'shortDesc', e.target.value);
                    setFocusedField('desc');
                    setShowAutocomplete(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Descripción del producto o servicio"
                  className={`w-full h-[34px] ${inputDescSizeClass} border border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 print:hidden block disabled:bg-slate-50 disabled:border-transparent disabled:text-slate-800`}
                  style={descStyle}
                />
                {(item.marcaModelo || item.serie) && (
                  <div className="text-[9px] text-slate-455 font-normal mt-0.5 px-1 print:hidden leading-normal break-all">
                    {item.marcaModelo ? `Marca/Modelo: ${item.marcaModelo}` : ''}
                    {item.marcaModelo && item.serie ? ' | ' : ''}
                    {item.serie ? `Serie: ${item.serie}` : ''}
                  </div>
                )}
                <div className="hidden print:block">
                  <span className={`${descSizeClass} font-semibold text-slate-800 whitespace-pre-wrap break-words leading-snug`} style={descStyle}>
                    {item.shortDesc}
                  </span>
                  {(item.marcaModelo || item.serie) && (
                    <div className="text-[9px] text-slate-500 font-normal mt-0.5 leading-normal break-all">
                      {item.marcaModelo ? `Marca/Modelo: ${item.marcaModelo}` : ''}
                      {item.marcaModelo && item.serie ? ' | ' : ''}
                      {item.serie ? `Serie: ${item.serie}` : ''}
                    </div>
                  )}
                </div>
                </>
              )}

              </div>
              {focusedField === 'desc' && !viewMode && renderDropdown()}
              {settings?.showTableVerticalBorders && (
                <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#e2e8f0', zIndex: 10 }} />
              )}
            </div>

            {/* Qty — centered horizontally and vertically */}
            <div className={`min-w-0 flex items-center justify-center relative ${padClass} ${settings?.showTableVerticalBorders ? 'px-1' : ''}`}>
              {!viewMode ? (
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={e => onChange(item.id, 'qty', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                  className={`w-full h-[34px] ${inputDescSizeClass} ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-center border border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all print:hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  style={descStyle}
                />
              ) : null}
              <span className={`${descSizeClass} font-semibold text-slate-800 text-center ${!viewMode ? 'hidden print:inline' : 'inline'}`} style={descStyle}>
                {item.qty}
              </span>
              {settings?.showTableVerticalBorders && (
                <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#e2e8f0', zIndex: 10 }} />
              )}
            </div>

            {/* Unit Price — vertically centered, right-aligned */}
            <div className={`min-w-0 flex items-center justify-end relative ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`}>
              {!viewMode ? (
                <div className="relative w-full print:hidden">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">L</span>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => onChange(item.id, 'unitPrice', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                    className={`w-full h-[34px] ${inputDescSizeClass} ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-right pl-5 pr-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    style={descStyle}
                  />
                </div>
              ) : null}
              <span className={`${descSizeClass} font-semibold text-slate-800 text-right ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} ${!viewMode ? 'hidden print:inline' : 'inline'}`} style={descStyle}>
                {fmt(Number(item.unitPrice) || 0)}
              </span>
              {settings?.showTableVerticalBorders && (
                <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#e2e8f0', zIndex: 10 }} />
              )}
            </div>

            {/* Discount — vertically centered, right-aligned — (compact) */}
            <div className={`min-w-0 flex items-center justify-end relative ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`}>
              {!viewMode ? (
                <div className="relative w-full print:hidden">
                  <input
                    type="number"
                    value={item.discount}
                    onChange={e => onChange(item.id, 'discount', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className={`w-full h-[34px] ${inputDescSizeClass} ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-right pr-6 pl-1.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    style={descStyle}
                  />
                  <button
                    type="button"
                    onClick={() => onChange(item.id, 'discountType', item.discountType === 'percentage' ? 'amount' : 'percentage')}
                    title={item.discountType === 'percentage' ? 'Cambiar a monto (L)' : 'Cambiar a porcentaje (%)'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer select-none w-4 text-center"
                  >{item.discountType === 'percentage' ? '%' : 'L'}</button>
                </div>
              ) : null}
              <span className={`${descSizeClass} font-semibold text-slate-800 text-right ${!viewMode ? 'hidden print:inline' : 'inline'}`} style={descStyle}>
                {Number(item.discount) > 0
                  ? (item.discountType === 'percentage' ? `${item.discount}%` : fmt(Number(item.discount)))
                  : '-'}
              </span>
              {settings?.showTableVerticalBorders && (
                <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#e2e8f0', zIndex: 10 }} />
              )}
            </div>

            {/* Tax — vertically centered, centered — */}
            <div className={`min-w-0 flex items-center justify-center relative ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`}>
              {!viewMode ? (
                <select
                  value={item.tax}
                  onChange={e => onChange(item.id, 'tax', e.target.value as TaxType)}
                  className={`w-full min-w-0 h-[34px] ${inputDescSizeClass} ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} font-semibold border border-slate-200 rounded-lg px-0.5 text-center bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer print:hidden`}
                  style={descStyle}
                >
                  <option value="isv15">ISV 15%</option>
                  <option value="isv18">ISV 18%</option>
                  <option value="exento">Exento</option>
                  <option value="exonerado">Exonerado</option>
                </select>
              ) : null}
              <span className={`${descSizeClass} font-semibold text-slate-700 text-center ${!viewMode ? 'hidden print:inline' : 'inline'}`} style={descStyle}>
                {item.tax === 'isv15' ? 'ISV 15%' : item.tax === 'isv18' ? 'ISV 18%' : item.tax === 'exento' ? 'Exento' : 'Exonerado'}
              </span>
              {settings?.showTableVerticalBorders && (
                <div className="print:block" style={{ position: 'absolute', right: 0, top: 0, bottom: '-1.5px', width: settings.tableBorderThickness || '1px', backgroundColor: settings.tableBorderColor || '#e2e8f0', zIndex: 10 }} />
              )}
            </div>

            {/* Monto / Subtotal — vertically centered, centered */}
            <div className={`min-w-0 flex items-center justify-end ${padClass}`}>
              {!viewMode ? (
                <div className="relative w-full print:hidden">
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">L</span>
                  <input
                    type="number"
                    step="any"
                    value={focusedField === 'monto' ? montoInputValue : displayTotal.toFixed(2)}
                    onFocus={() => {
                      setFocusedField('monto');
                      setMontoInputValue(displayTotal.toFixed(2));
                    }}
                    onChange={e => {
                      const valStr = e.target.value;
                      setMontoInputValue(valStr);
                      const val = parseFloat(valStr);
                      if (!isNaN(val)) {
                        const calculatedPrice = calculateUnitPriceFromTotal(
                          val,
                          Number(item.qty) || 1,
                          item.tax,
                          Number(item.discount) || 0,
                          item.discountType,
                          settings?.pricesIncludeTax
                        );
                        const roundedPrice = Math.round((calculatedPrice + Number.EPSILON) * 100) / 100;
                        onChange(item.id, 'unitPrice', roundedPrice);
                      }
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                    }}
                    className={`w-full h-[34px] ${inputDescSizeClass} ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-right pl-4 pr-1.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold text-slate-800`}
                    style={descStyle}
                  />
                </div>
              ) : null}
              <span className={`${descSizeClass} font-bold text-slate-800 text-right ${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} ${!viewMode ? 'hidden print:inline' : 'inline'} pr-2`} style={descStyle}>
                {fmt(displayTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`relative w-[24px] shrink-0 print:hidden flex items-center justify-center ${padClass}`} data-pdf-hide>
          {!viewMode && (
            <div className="absolute right-0 top-[-12px] flex flex-row gap-0.5 items-center justify-end opacity-0 group-hover:opacity-100 transition-all bg-white/95 backdrop-blur-sm px-1 py-0.5 rounded-md shadow-sm border border-slate-200 z-[60]">
              {item.isSection ? (
                <button
                  onClick={() => onToggleLongDesc(item.id)}
                  title="Personalizar diseño"
                  className={`p-1 rounded transition-all ${item.showLongDesc ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <Palette size={11} />
                </button>
              ) : (
                <button
                  onClick={() => onToggleLongDesc(item.id)}
                  title="Descripción técnica"
                  className={`p-1 rounded transition-all ${item.showLongDesc ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                >
                  <Info size={11} />
                </button>
              )}
              <button
                onClick={() => onDuplicate(item.id)}
                title="Duplicar fila"
                className="p-1 rounded transition-all text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
              >
                <Copy size={11} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                title="Eliminar fila"
                className="p-1 rounded transition-all text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
        </div>
        
        {/* ROW EXPANSION - RICH DESCRIPTION OR SECTION CONTROLS */}
        {item.showLongDesc && (
          <div 
            className={`w-full px-4 pt-2 pb-2 ${settings?.descriptionBorderDashed ? 'border-t-[1.5px] border-dashed' : 'border-t border-solid'}`}
            style={{ borderColor: settings?.tableBorderColor || '#cbd5e1' }}
          >
            {item.isSection ? (
               <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 shadow-sm ml-8 w-fit print:hidden">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Diseño</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onChange(item.id, 'sectionStyle', { ...item.sectionStyle, align: 'left' })} className={`p-1.5 rounded hover:bg-slate-200 ${item.sectionStyle?.align === 'left' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg></button>
                    <button onClick={() => onChange(item.id, 'sectionStyle', { ...item.sectionStyle, align: 'center' })} className={`p-1.5 rounded hover:bg-slate-200 ${item.sectionStyle?.align === 'center' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="12" y2="12"/><line x1="21" x2="3" y1="18" y2="18"/></svg></button>
                    <button onClick={() => onChange(item.id, 'sectionStyle', { ...item.sectionStyle, align: 'right' })} className={`p-1.5 rounded hover:bg-slate-200 ${item.sectionStyle?.align === 'right' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="9" y1="6" y2="6"/><line x1="21" x2="3" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></svg></button>
                  </div>
                  <div className="w-[1px] h-5 bg-slate-300" />
                  <button onClick={() => onChange(item.id, 'sectionStyle', { ...item.sectionStyle, bold: !item.sectionStyle?.bold })} className={`p-1.5 px-3 rounded hover:bg-slate-200 font-serif font-bold ${item.sectionStyle?.bold ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>B</button>
                  <div className="w-[1px] h-5 bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fondo</span>
                    <input type="color" value={(item.sectionStyle?.bg && item.sectionStyle.bg !== '#f1f5f9') ? item.sectionStyle.bg : (settings?.sectionBgColor || '#f1f5f9')} onChange={e => {
                      onChange(item.id, 'sectionStyle', { ...item.sectionStyle, bg: e.target.value });
                    }} className="w-6 h-6 rounded cursor-pointer border-0 p-0 shadow-sm" title="Color de Fondo" />
                  </div>
                  <div className="w-[1px] h-5 bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Texto</span>
                    <input type="color" value={(item.sectionStyle?.color && item.sectionStyle.color !== '#1e293b') ? item.sectionStyle.color : (settings?.sectionTextColor || '#1e293b')} onChange={e => {
                      onChange(item.id, 'sectionStyle', { ...item.sectionStyle, color: e.target.value });
                    }} className="w-6 h-6 rounded cursor-pointer border-0 p-0 shadow-sm" title="Color de Texto" />
                  </div>
               </div>
            ) : viewMode ? (
              item.richDesc ? (
                <div
                  className="text-xs text-slate-600 prose prose-sm max-w-none print:max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.richDesc }}
                />
              ) : (
                <div className={`text-slate-600 whitespace-pre-wrap break-words ${descSizeClass}`} style={descStyle}>{item.longDesc}</div>
              )
            ) : (
              <div className="print:hidden">
                <RichDescriptionEditor
                  content={item.richDesc || (item.longDesc ? item.longDesc.replace(/\n/g, '<br/>') : '')}
                  onChange={html => {
                    onChange(item.id, 'richDesc', html);
                    // Keep plain-text longDesc synced as fallback
                    const temp = html.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '');
                    const div = document.createElement('div');
                    div.innerHTML = temp;
                    onChange(item.id, 'longDesc', div.textContent || '');
                  }}
                  placeholder="Descripción técnica detallada, especificaciones..."
                />
              </div>
            )}
            <div className={`hidden ${!viewMode ? 'print:block' : 'print:hidden'} text-slate-600 prose prose-sm max-w-none ${descSizeClass}`} style={descStyle} dangerouslySetInnerHTML={{ __html: item.richDesc || (item.longDesc ? item.longDesc.replace(/\n/g, '<br/>') : '') }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function DocumentBuilderClient({ 
  organization, 
  initialData, 
  editMode = false, 
  viewMode = false,
  isNotaCredito = false,
  userRole = 'USER',
  userAccessibleModules = []
}: { 
  organization?: any;
  initialData?: any;
  editMode?: boolean;
  viewMode?: boolean;
  isNotaCredito?: boolean;
  userRole?: string;
  userAccessibleModules?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docType, setDocType] = useState<DocType>('cotizacion');

  const docDate = (initialData?.fechaEmision && (editMode || viewMode))
    ? new Date(initialData.fechaEmision)
    : new Date();

  const today = `${docDate.getFullYear()}-${String(docDate.getMonth() + 1).padStart(2, '0')}-${String(docDate.getDate()).padStart(2, '0')}`;

  const futureDate = useCallback((days: number) => {
    const d = new Date(docDate);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [docDate]);

  const resolvedFechaEmision = (editMode || viewMode) ? initialData?.fechaEmision : null;

  const getOrdenEntregaTodayStr = useCallback(() => {
    const dateStr = docDate.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = docDate.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${dateStr} ${timeStr}`;
  }, [docDate]);

  const [docNumber, setDocNumber] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...emptyLine(), id: 'default-line-hash' }]);
  const [paymentTerms, setPaymentTerms] = useState('Pago inmediato');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false);
  const [sendEmailDocId, setSendEmailDocId] = useState('');
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ nombre: '', email: '', telefono: '', rtn: '', direccion: '', nombreContacto: '', telefonoContacto: '' });
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'products'>('clients');
  const [showPreview, setShowPreview] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isForcePrinting, setIsForcePrinting] = useState(false);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [ordenEntrega, setOrdenEntrega] = useState<any>(initialData?.ordenEntrega || null);
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [showOrdenEntregaPanel, setShowOrdenEntregaPanel] = useState(true);
  const [activeCanvasMode, setActiveCanvasMode] = useState<'document' | 'orden_entrega'>('document');
  
  const [ordenTrabajoId, setOrdenTrabajoId] = useState<string | undefined>(initialData?.ordenTrabajoId || searchParams.get('ordenTrabajoId') || undefined);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);

  const [imagePickerItem, setImagePickerItem] = useState<{ itemId: string; currentUrl?: string } | null>(null);
  const [otImages, setOtImages] = useState<string[]>([]);
  const [loadingOtImages, setLoadingOtImages] = useState(false);
  const [isUploadingLineImage, setIsUploadingLineImage] = useState(false);

  useEffect(() => {
    const handleOpenPicker = (e: Event) => {
      const customEvent = e as CustomEvent<{ itemId: string; currentUrl?: string }>;
      setImagePickerItem(customEvent.detail);
    };
    window.addEventListener('open-line-item-image-picker', handleOpenPicker);
    return () => window.removeEventListener('open-line-item-image-picker', handleOpenPicker);
  }, []);

  useEffect(() => {
    if (!imagePickerItem || !ordenTrabajoId) {
      setOtImages([]);
      return;
    }
    
    const loadOtImages = async () => {
      setLoadingOtImages(true);
      try {
        const urls = await getOrdenTrabajoImages(ordenTrabajoId);
        setOtImages(urls);
      } catch (err) {
        console.error("Error loading OT images:", err);
      } finally {
        setLoadingOtImages(false);
      }
    };
    
    loadOtImages();
  }, [imagePickerItem, ordenTrabajoId]);

  const handleSelectPickerImage = (url: string) => {
    if (!imagePickerItem) return;
    setLineItems(prev => prev.map(item => item.id === imagePickerItem.itemId ? { ...item, imageUrl: url } : item));
    setImagePickerItem(null);
    toast.success('Imagen del ítem seleccionada.');
  };

  const handleUploadPickerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imagePickerItem) return;
    setIsUploadingLineImage(true);
    const toastId = toast.loading('Subiendo imagen...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', `line_item_${Date.now()}_${file.name}`);
      
      const uploadRes = await fetch('/api/upload/inventario', {
        method: 'POST',
        body: formData
      });
      if (!uploadRes.ok) throw new Error('Error al subir la imagen');
      const data = await uploadRes.json();
      
      if (data.publicUrl) {
        setLineItems(prev => prev.map(item => item.id === imagePickerItem.itemId ? { ...item, imageUrl: data.publicUrl } : item));
        setImagePickerItem(null);
        toast.success('Imagen del ítem subida y actualizada.', { id: toastId });
      } else {
        throw new Error('No se recibió la URL pública');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al subir la imagen', { id: toastId });
    } finally {
      setIsUploadingLineImage(false);
    }
  };

  useEffect(() => {
    if (!showWorkOrderModal) return;

    const fetchOTs = async () => {
      setLoadingWorkOrders(true);
      try {
        const res = await searchOrdenesTrabajoParaFacturar(workOrderSearch);
        setWorkOrders(res);
      } catch (err) {
        console.error("Error cargando ordenes de trabajo para facturar:", err);
      } finally {
        setLoadingWorkOrders(false);
      }
    };

    const delayDebounce = setTimeout(fetchOTs, 300);
    return () => clearTimeout(delayDebounce);
  }, [showWorkOrderModal, workOrderSearch]);

  const handleSelectWorkOrder = (ot: any, lineId?: string) => {
    if (!ot) return;
    
    // 1. Set the client
    if (ot.cliente) {
      setSelectedClient(ot.cliente);
    }
    
    // 2. Set the linked work order ID
    setOrdenTrabajoId(ot.id);
    
    // 3. Construct lines
    const mainItemPrice = ot.costoReparacion !== null ? Number(ot.costoReparacion) : (Number(ot.costoRevision) || 0);
    
    const serviceLine: LineItem = {
      id: uid(),
      code: ot.codigoSeguridad,
      shortDesc: `Servicio de Mantenimiento - ${ot.equipoDano}`,
      longDesc: '',
      marcaModelo: ot.marcaModelo || null,
      serie: ot.serie || null,
      richDesc: [
        `<p><strong>Servicio de Mantenimiento</strong></p>`,
        `<p><strong>Equipo:</strong> ${ot.equipoDano}</p>`,
        ot.marcaModelo ? `<p><strong>Marca/Modelo:</strong> ${ot.marcaModelo}</p>` : null,
        ot.serie ? `<p><strong>Serie:</strong> ${ot.serie}</p>` : null,
      ].filter(Boolean).join(''),
      showLongDesc: false,
      qty: 1,
      unitPrice: mainItemPrice,
      tax: 'isv15',
      discount: 0,
      discountType: 'percentage',
      imageUrl: ot.fotosTecnico?.[0] || ot.fotosEstadoInicial?.[0] || ot.activo?.imagenUrl || undefined,
      activoId: ot.activoId || undefined,
    };

    // Spare parts lines
    const repuestosLines: LineItem[] = (ot.repuestos || []).map((r: any) => ({
      id: uid(),
      code: r.sku || '',
      shortDesc: r.nombre,
      longDesc: r.serie ? `Serie: ${r.serie}` : '',
      richDesc: r.serie ? `<p>Serie: ${r.serie}</p>` : '',
      showLongDesc: !!r.serie,
      qty: r.cantidad,
      unitPrice: r.precioAprobado !== null ? r.precioAprobado : r.precioSugerido,
      tax: 'isv15',
      discount: 0,
      discountType: 'percentage',
      productoId: r.productoId || undefined,
      activoId: r.activoId || undefined,
      imageUrl: r.imageUrl || undefined,
      serie: r.serie || null
    }));

    // Labor lines
    const manoObraArr = Array.isArray(ot.detalleManoObra) ? ot.detalleManoObra : [];
    const manoObraLines: LineItem[] = manoObraArr.map((m: any) => ({
      id: uid(),
      code: '',
      shortDesc: m.descripcion || 'Mano de Obra',
      longDesc: '',
      richDesc: '',
      showLongDesc: false,
      qty: m.horas || 1,
      unitPrice: Number(m.tarifa || 0),
      tax: 'isv15',
      discount: 0,
      discountType: 'percentage'
    }));

    // Revision cost credit if paid
    const esRevisionPagada = Number(ot.costoRevision) > 0 && 
                             ot.metodoPagoRevision && 
                             ot.metodoPagoRevision !== 'Ninguno';
    const revisionCreditLines: LineItem[] = esRevisionPagada ? [{
      id: uid(),
      code: '',
      shortDesc: 'Abono/Crédito por Costo de Revisión Ya Pagado',
      longDesc: '',
      richDesc: '',
      showLongDesc: false,
      qty: 1,
      unitPrice: -Number(ot.costoRevision),
      tax: 'exento',
      discount: 0,
      discountType: 'percentage'
    }] : [];

    // Combine all new lines
    const allNewLines = [serviceLine, ...repuestosLines, ...manoObraLines, ...revisionCreditLines];
    
    setLineItems(prev => {
      const indexToReplace = lineId ? prev.findIndex(item => item.id === lineId) : -1;
      
      if (indexToReplace !== -1) {
        const updated = [...prev];
        updated.splice(indexToReplace, 1, ...allNewLines);
        return updated;
      }
      
      const isOnlyOneEmptyLine = prev.length === 1 && 
        !prev[0].code && 
        !prev[0].shortDesc && 
        (Number(prev[0].unitPrice) === 0 || prev[0].unitPrice === '');
        
      if (isOnlyOneEmptyLine) {
        return allNewLines;
      } else {
        return [...prev, ...allNewLines];
      }
    });
    
    // Close modal
    setShowWorkOrderModal(false);
    toast.success(`Orden de Trabajo ${ot.codigoSeguridad} extraída con éxito.`);
  };
  
  // States for registering new product directly
  const [registeringLineId, setRegisteringLineId] = useState<string | null>(null);
  const [isActivoModalOpen, setIsActivoModalOpen] = useState(false);
  const [dbAreas, setDbAreas] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getAuthenticatedUser()
      .then(user => setCurrentUser(user))
      .catch(err => console.error("Error fetching authenticated user in DocumentBuilderClient:", err));
  }, []);

  const templateContainerRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<InvoiceSettings>(() => {
    // Always merge organization settings (available on both server and client as a prop).
    // localStorage preferences are loaded in useEffect to avoid hydration mismatch.
    if (organization?.invoiceSettings) {
      const orgSettings = { ...organization.invoiceSettings };
      delete orgSettings.roundAdjustment;
      return { ...DEFAULT_INVOICE_SETTINGS, ...orgSettings, showTerms: false };
    }
    return { ...DEFAULT_INVOICE_SETTINGS, showTerms: false };
  });

  const [activeLibraryType, setActiveLibraryType] = useState<'signature' | 'seal' | null>(null);
  const [activeSigIndex, setActiveSigIndex] = useState<number | null>(null);
  const [activeSealField, setActiveSealField] = useState<'company' | 'status' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showShareSignatureModal, setShowShareSignatureModal] = useState(false);
  const [showDirectSignatureModal, setShowDirectSignatureModal] = useState(false);
  const [hasDirectSignatureDrawn, setHasDirectSignatureDrawn] = useState(false);
  const [isSavingDirectSignature, setIsSavingDirectSignature] = useState(false);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (showDirectSignatureModal) {
      setHasDirectSignatureDrawn(false);
    }
  }, [showDirectSignatureModal]);

  const signaturesList = settings.signaturesList || [
    { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: settings.showEmiliaZapata !== false },
    { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: settings.showManuelTejada !== false }
  ];

  const signaturesLibrary = settings.signaturesLibrary || [
    '/firmas-sellos/firma emilia zapata.png',
    '/firmas-sellos/firma Ing Manuel Tejada.png'
  ];

  const sealsLibrary = settings.sealsLibrary || [
    '/firmas-sellos/SELLO DE BIOELECTRONICA.png',
    '/firmas-sellos/SELLO DE ENTREGADO.png',
    '/firmas-sellos/SELLO DE CANCELADO.png'
  ];

  const updateSignature = (index: number, field: keyof SignatureItem, value: any) => {
    const updated = [...signaturesList];
    updated[index] = { ...updated[index], [field]: value };
    const newSettings = { ...settings, signaturesList: updated };
    setSettings(newSettings);
    handleSaveTemplateSettings(newSettings);
  };

  const addSignature = () => {
    const newSig: SignatureItem = {
      id: `sig_${Date.now()}`,
      name: 'Nueva Persona',
      role: 'Cargo',
      imageUrl: '/firmas-sellos/firma emilia zapata.png',
      enabled: true,
      offsetY: 0,
      offsetX: 0
    };
    const newSettings = { ...settings, signaturesList: [...signaturesList, newSig] };
    setSettings(newSettings);
    handleSaveTemplateSettings(newSettings);
  };

  const deleteSignature = (index: number) => {
    const updated = signaturesList.filter((_, i) => i !== index);
    const newSettings = { ...settings, signaturesList: updated };
    setSettings(newSettings);
    handleSaveTemplateSettings(newSettings);
  };

  const handleFileUpload = async (file: File, type: 'signature' | 'seal') => {
    try {
      setUploading(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type })
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await res.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');

      if (type === 'signature') {
        const lib = [...signaturesLibrary, publicUrl];
        const newSettings = { ...settings, signaturesLibrary: lib };
        setSettings(newSettings);
        handleSaveTemplateSettings(newSettings);
      } else {
        const lib = [...sealsLibrary, publicUrl];
        const newSettings = { ...settings, sealsLibrary: lib };
        setSettings(newSettings);
        handleSaveTemplateSettings(newSettings);
      }
      return publicUrl;
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleApplyTerms = (newSettings?: InvoiceSettings) => {
    const activeSettings = newSettings || settings;
    const p1 = activeSettings.advancePercentage ?? 80;
    const p2 = activeSettings.completionPercentage ?? 20;
    const t1 = activeSettings.termsTextDefault1 ?? "Para iniciar los trabajos aquí descritos se deberá cancelar el {p1}% del valor total y el {p2}% restante al finalizar.";
    const t2 = activeSettings.termsTextDefault2 ?? "Favor someter a consideración esta cotización y le rogamos sea devuelta con firma y sello de aceptación en caso que la misma sea aceptada.";

    const compiledT1 = t1.replace('{p1}', `${p1}`).replace('{p2}', `${p2}`);
    const compiledT2 = t2;

    const compiledTerms = `1) ${compiledT1}\n\n2) ${compiledT2}`;

    setNotes(prev => {
      const cleaned = prev.trim();
      if (!cleaned) {
        return compiledTerms;
      }

      if (prev.includes('1)') && prev.includes('2)')) {
        const lines = prev.split('\n');
        const firstTermIdx = lines.findIndex(l => l.trim().startsWith('1)'));
        const secondTermIdx = lines.findIndex(l => l.trim().startsWith('2)'));

        if (firstTermIdx !== -1 && secondTermIdx !== -1 && secondTermIdx > firstTermIdx) {
          const before = lines.slice(0, firstTermIdx).join('\n');
          let endIdx = secondTermIdx + 1;
          while (endIdx < lines.length && lines[endIdx].trim() !== '' && !lines[endIdx].trim().startsWith('1)') && !lines[endIdx].trim().startsWith('3)')) {
            endIdx++;
          }
          const after = lines.slice(endIdx).join('\n');
          return [before.trim(), compiledTerms, after.trim()].filter(Boolean).join('\n\n');
        }
      }

      return `${prev}\n\n${compiledTerms}`;
    });
    toast.success("Términos aplicados al campo de Notas");
  };

  const handleToggleTerms = (enabled: boolean) => {
    const nextSettings = { ...settings, showTerms: enabled };
    setSettings(nextSettings);
    handleSaveTemplateSettings(nextSettings);
    if (enabled) {
      handleApplyTerms(nextSettings);
    }
  };

  const isAnulada = initialData?.estado === 'ANULADA';
  const isConvertida = initialData?.estado === 'CONVERTIDA';
  const effectiveViewMode = viewMode || isAnulada || isConvertida || isForcePrinting;
  const currentCanvasMode = docType === 'factura' ? activeCanvasMode : 'document';

  const estaVencida = typeof window !== 'undefined' ? (function() {
    if (!initialData?.fechaEmision || 
        (initialData?.tipoDocumento !== 'COTIZACION' && 
         initialData?.tipoDocumento !== 'PRESUPUESTO_REPARACION' && 
         initialData?.tipoDocumento !== 'PRESUPUESTO_MANTENIMIENTO')) return false;
    const fecha = new Date(initialData.fechaEmision);
    const expiracion = new Date(fecha.setDate(fecha.getDate() + (initialData?.validezDias || 30)));
    return expiracion < new Date();
  })() : false;

  const [isLoaded, setIsLoaded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const handleShowLightbox = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setLightboxImage(customEvent.detail);
      }
    };
    window.addEventListener('show-lightbox-image', handleShowLightbox);
    return () => window.removeEventListener('show-lightbox-image', handleShowLightbox);
  }, []);

  // --- PERSISTENCE (AUTO-SAVE) ---
  const [reservedDocId, setReservedDocId] = useState<string | null>(initialData?.id || null);
  const [isLocked, setIsLocked] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const draftKey = `bea_factura_draft_v2_${initialData?.id || 'new'}`; // Dynamic draft per doc
  const draftLoadedRef = useRef(false);

  // PRE-CONVERT IMAGES TO BASE64 IN VIEW MODE (PUPPETEER PRINT CONTEXT)
  useEffect(() => {
    if (effectiveViewMode && typeof window !== 'undefined') {
      const convertImagesToBase64 = async () => {
        const images = document.querySelectorAll('img');
        const convertPromises = Array.from(images).map(async (img) => {
          if (!img.src || img.src.startsWith('data:') || img.src.includes('lucide')) return;
          try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
              const blob = await res.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  img.src = reader.result;
                }
              };
              reader.readAsDataURL(blob);
            }
          } catch (e) {
            console.warn('Error pre-converting image in viewMode', e);
          }
        });
        await Promise.allSettled(convertPromises);
      };
      
      // Delay allowing DOM hydration to finish before querying images
      setTimeout(convertImagesToBase64, 400);
    }
  }, [effectiveViewMode]);

  // Cargar/Inicializar Orden de Entrega si está en viewMode y es una Factura
  useEffect(() => {
    if (viewMode && initialData?.id && docType === 'factura') {
      const fetchOrden = async () => {
        setLoadingOrden(true);
        try {
          const res = await getOrCreateOrdenEntrega(initialData.id);
          if (res.success && res.orden) {
            setOrdenEntrega(res.orden);
          }
        } catch (err) {
          console.error("Error cargando Orden de Entrega:", err);
        } finally {
          setLoadingOrden(false);
        }
      };
      fetchOrden();
    }
  }, [viewMode, initialData?.id, docType]);

  // 1. Hydrate from localStorage on mount (ONLY if it's a new document and not in viewMode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (effectiveViewMode) {
      setIsHydrated(true);
      return; 
    }

    try {
      const stored = window.localStorage.getItem(draftKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reservedDocId) setReservedDocId(parsed.reservedDocId);
        if (parsed.docType) {
          let restoredType = parsed.docType;
          if (restoredType === 'presupuesto_reparacion' || restoredType === 'presupuesto_mantenimiento') {
            restoredType = 'cotizacion';
          }
          setDocType(restoredType);
        }
        if (parsed.docNumber) setDocNumber(parsed.docNumber);
        if (parsed.selectedClient) setSelectedClient(parsed.selectedClient);
        if (parsed.lineItems && parsed.lineItems.length > 0) {
          const mergedLineItems = parsed.lineItems.map((item: any) => {
            const dbDetail = initialData?.detalles?.find((d: any) => {
              return d.id === item.id || d.descripcion.replace(/__METADATA__.*$/, '').startsWith(item.shortDesc);
            });
            if (dbDetail) {
              let dbMeta: any = {};
              const rawDesc = dbDetail.descripcion || '';
              const metaIdx = rawDesc.indexOf('__METADATA__');
              if (metaIdx !== -1) {
                try {
                  dbMeta = JSON.parse(rawDesc.substring(metaIdx + 12));
                } catch(e){}
              }
              const recoveredImg = dbMeta.imageUrl || dbDetail.producto?.imagenWeb || dbDetail.activo?.imagenUrl || undefined;
              const recoveredSerie = dbMeta.serie || dbDetail.activo?.serie || undefined;
              const recoveredBrand = dbMeta.marcaModelo || undefined;
              
              return {
                ...item,
                imageUrl: item.imageUrl || recoveredImg,
                serie: item.serie || recoveredSerie,
                marcaModelo: item.marcaModelo || recoveredBrand
              };
            }
            return item;
          });
          setLineItems(mergedLineItems);
        }
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.paymentTerms) setPaymentTerms(parsed.paymentTerms);
        if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
        if (parsed.validityDays) setValidityDays(parsed.validityDays);
        if (!parsed.reservedDocId) setIsLocked(true); // Must reserve first 
        draftLoadedRef.current = true;
        toast('Borrador restaurado', { icon: '📝' });
      } else {
        if (!initialData) setIsLocked(true); // Locked if completely blank session
      }
    } catch (e) {
      console.warn("Failed to parse draft", e);
      if (!initialData) setIsLocked(true);
    }
    setIsHydrated(true);
  }, [draftKey, effectiveViewMode, initialData]);

  // 2. Auto-save to localStorage with debounce
  useEffect(() => {
    if (!isHydrated || effectiveViewMode) return;

    const handler = setTimeout(() => {
      try {
        const draft = {
          reservedDocId, docType, docNumber, selectedClient, lineItems, notes, paymentTerms, paymentMethod, validityDays
        };
        window.localStorage.setItem(draftKey, JSON.stringify(draft));
        setLastSaved(new Date());
      } catch (e) {}
    }, 1500);

    return () => clearTimeout(handler);
  }, [isHydrated, reservedDocId, docType, docNumber, selectedClient, lineItems, notes, paymentTerms, paymentMethod, validityDays, effectiveViewMode, draftKey]);

  const clearLocalDraft = () => {
    try {
      window.localStorage.removeItem(draftKey);
      setLastSaved(null);
    } catch (e) {}
  };

  // --- Drag and Drop Reordering ---
  useEffect(() => {
    const handleReorder = (e: any) => {
      const { dragId, dropId } = e.detail;
      setLineItems(prev => {
        const dragIndex = prev.findIndex(i => i.id === dragId);
        const dropIndex = prev.findIndex(i => i.id === dropId);
        if (dragIndex < 0 || dropIndex < 0) return prev;
        const result = [...prev];
        const [removed] = result.splice(dragIndex, 1);
        result.splice(dropIndex, 0, removed);
        return result;
      });
    };
    window.addEventListener('reorder-lines', handleReorder);
    return () => window.removeEventListener('reorder-lines', handleReorder);
  }, []);
  // ------------------------------

  // --- Register New Product from Dropdown ---
  useEffect(() => {
    const handleOpenRegister = (e: any) => {
      const { lineId } = e.detail;
      setRegisteringLineId(lineId);
      setIsActivoModalOpen(true);
    };
    const handleServiceCreated = (e: any) => {
      const { service, lineId } = e.detail;
      setAllProducts(prev => [service, ...prev]);
      setLineItems(prev => prev.map(item => {
        if (item.id === lineId) {
          return {
            ...item,
            code: service.code,
            shortDesc: service.name,
            longDesc: service.description || '',
            unitPrice: service.price || '',
            activoId: service.id,
            productoId: undefined,
            serie: service.serie || null,
            imageUrl: service.imageUrl || undefined
          };
        }
        return item;
      }));
    };
    window.addEventListener('open-activo-modal', handleOpenRegister);
    window.addEventListener('service-created', handleServiceCreated);
    return () => {
      window.removeEventListener('open-activo-modal', handleOpenRegister);
      window.removeEventListener('service-created', handleServiceCreated);
    };
  }, []);

  // Listener for extracting work order from row dropdown/autocompletion selection
  useEffect(() => {
    const handleExtract = async (e: any) => {
      const { code, id, lineId } = e.detail;
      const toastId = toast.loading('Cargando datos completos de la orden de trabajo...');
      try {
        const ots = await searchOrdenesTrabajoParaFacturar(code);
        const fullOt = ots.find(o => o.id === id);
        if (fullOt) {
          handleSelectWorkOrder(fullOt, lineId);
          toast.success('Orden de trabajo extraída con éxito', { id: toastId });
        } else {
          toast.error('No se pudo encontrar la orden seleccionada', { id: toastId });
        }
      } catch (err) {
        console.error('Error fetching work order from event:', err);
        toast.error('Error al cargar la orden de trabajo', { id: toastId });
      }
    };
    window.addEventListener('extract-work-order-event', handleExtract);
    return () => window.removeEventListener('extract-work-order-event', handleExtract);
  }, []);

  // Fetch areas for the ActivoModal
  useEffect(() => {
    getAreas()
      .then(res => setDbAreas(res))
      .catch(e => console.error("Error fetching areas for ActivoModal:", e));
  }, []);

  const handleRegisterSuccess = async () => {
    try {
      // 1. Reload the products list
      const prd = await searchProductos('');
      
      const newProductsList = prd.map((p: any) => ({
        id: p.id,
        code: p.sku || '',
        name: p.nombre,
        description: p.descripcion || '',
        price: Number(p.precioVenta) || 0,
        category: p.marca || 'General',
        stock: p.stockActual || 0,
        brand: p.marca || '',
        type: p.type || 'producto',
        imageUrl: p.imageUrl || p.imagenUrl || null,
        fechaVencimiento: p.fechaVencimiento || null,
        serie: p.serie || null,
      }));

      // Find the new product by comparing the new list with allProducts (by id)
      const existingIds = new Set(allProducts.map(p => p.id));
      const newlyCreatedProduct = newProductsList.find(p => !existingIds.has(p.id));

      // Update the allProducts state with the new list
      setAllProducts(newProductsList);

      // 2. If we have a registering line ID and a new product was found, automatically select it!
      if (registeringLineId && newlyCreatedProduct) {
        setLineItems(prev => prev.map(item => {
          if (item.id === registeringLineId) {
            let targetDescription = newlyCreatedProduct.description || '';
            if (newlyCreatedProduct.type === 'activo' && newlyCreatedProduct.serie) {
              const hasSerieAlready = targetDescription.toLowerCase().includes(newlyCreatedProduct.serie.toLowerCase()) ||
                                      targetDescription.toLowerCase().includes('s/n:');
              if (!hasSerieAlready) {
                if (targetDescription.trim()) {
                  targetDescription += `\nS/N: ${newlyCreatedProduct.serie}`;
                } else {
                  targetDescription = `S/N: ${newlyCreatedProduct.serie}`;
                }
              }
            }
            return {
              ...item,
              code: newlyCreatedProduct.code,
              shortDesc: newlyCreatedProduct.name,
              imageUrl: newlyCreatedProduct.imageUrl || item.imageUrl,
              longDesc: targetDescription,
              unitPrice: (Number(item.unitPrice) === 0 || !item.unitPrice) ? newlyCreatedProduct.price : item.unitPrice,
              productoId: newlyCreatedProduct.type === 'producto' ? newlyCreatedProduct.id : undefined,
              activoId: newlyCreatedProduct.type === 'activo' ? newlyCreatedProduct.id : undefined,
              serie: newlyCreatedProduct.serie || null,
            };
          }
          return item;
        }));
        toast.success(`Producto "${newlyCreatedProduct.name}" registrado e insertado.`);
      } else {
        toast.success("Producto registrado exitosamente en catálogo.");
      }
    } catch (e) {
      console.error("Error reloading products after registration:", e);
      toast.error("Error al actualizar catálogo de productos.");
    } finally {
      setRegisteringLineId(null);
    }
  };

  // Load preferences from localStorage 
  useEffect(() => {
    if (typeof window !== 'undefined' && !effectiveViewMode) {
      try {
        if (initialData?.templateSettings) {
          const tSettings = typeof initialData.templateSettings === 'string'
            ? JSON.parse(initialData.templateSettings)
            : initialData.templateSettings;
          setSettings(prev => ({ ...prev, ...tSettings, showTerms: false }));
        } else {
          const saved = localStorage.getItem('bea_invoice_template_settings');
          if (saved) {
            const parsed = JSON.parse(saved);
            delete parsed.roundAdjustment;
            setSettings(prev => ({ ...prev, ...parsed, showTerms: false, roundAdjustment: undefined }));
          } else {
            setSettings(prev => ({ ...prev, showTerms: false, roundAdjustment: undefined }));
          }
        }
      } catch (e) {
        console.error("Error al cargar settings visuales", e);
      } finally {
        setIsLoaded(true);
      }
    } else {
      if (initialData?.templateSettings) {
        try {
          const tSettings = typeof initialData.templateSettings === 'string'
            ? JSON.parse(initialData.templateSettings)
            : initialData.templateSettings;
          setSettings(prev => ({ ...prev, ...tSettings, showTerms: false }));
        } catch (e) {}
      } else {
        setSettings(prev => ({ ...prev, showTerms: false, roundAdjustment: undefined }));
      }
      setIsLoaded(true);
    }
  }, [effectiveViewMode, initialData]);

  // Save preferences when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && !effectiveViewMode && isLoaded) {
      const localSettings = { ...settings };
      delete localSettings.roundAdjustment;
      localStorage.setItem('bea_invoice_template_settings', JSON.stringify(localSettings));
    }
  }, [settings, effectiveViewMode, isLoaded]);


  const isPrintIframe = typeof window !== 'undefined' && window.location.pathname.startsWith('/print');
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showAdminWarningModal, setShowAdminWarningModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState<{ nuevoTipo: 'PROFORMA' | 'FACTURA' } | null>(null);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState('Efectivo');
  const [convertEstado, setConvertEstado] = useState<'EMITIDA' | 'BORRADOR'>('EMITIDA');

  const canEditEmitidas = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN' || userAccessibleModules.includes('editar_facturas_emitidas');

  const handleEditClick = () => {
    if (docType === 'factura' && initialData?.estado === 'EMITIDA') {
      if (!canEditEmitidas) {
        setShowAdminWarningModal(true);
        return;
      }
    }
    router.push(`/facturas/${initialData.id}`);
  };

  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState<{show: boolean, docId: string, correlativo: string, format: string} | null>(null);

  // Auto-print if requested via query param
  useEffect(() => {
    if (effectiveViewMode && searchParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('print');
        window.history.replaceState({}, '', newUrl);
      }, 800); // slight delay to ensure fonts/layout are fully rendered
      return () => clearTimeout(timer);
    }
  }, [effectiveViewMode, searchParams]);

  // Auto-download PDF if requested via query param
  useEffect(() => {
    if (effectiveViewMode && searchParams.get('download') === 'true') {
      const timer = setTimeout(() => {
        handleDownloadPDF();
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('download');
        window.history.replaceState({}, '', newUrl);
      }, 1200); // extra delay for full render before capture
      return () => clearTimeout(timer);
    }
  }, [effectiveViewMode, searchParams]);

  // Print handler for edit mode
  const handlePrintEditor = () => {
    setIsForcePrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsForcePrinting(false);
      }, 500);
    }, 150);
  };

  // Helper to save template settings to database
  const handleSaveTemplateSettings = async (newSettings: any) => {
    const docId = reservedDocId || initialData?.id;
    if (!docId || docId === 'nuevo') return;
    try {
      await updateDocumentTemplateSettings(docId, newSettings);
    } catch (err) {
      console.error('Error auto-saving template settings:', err);
    }
  };

  const handleSilentSave = async () => {
    const docId = reservedDocId || initialData?.id;
    if (!docId || docId === 'nuevo' || effectiveViewMode) return;
    try {
      const validItems = lineItems.filter((i, index) => {
        if (index === lineItems.length - 1 && !i.shortDesc && !i.code && Number(i.unitPrice) === 0) return false;
        return true;
      });
      const savePayload = {
        clienteId: selectedClient?.id,
        tipoDocumento: docType === 'cotizacion' ? 'COTIZACION' : 
                       docType === 'proforma' ? 'PROFORMA' : 
                       docType === 'nota_credito' ? 'NOTA_CREDITO' : 
                       docType === 'presupuesto_reparacion' ? 'PRESUPUESTO_REPARACION' :
                       docType === 'presupuesto_mantenimiento' ? 'PRESUPUESTO_MANTENIMIENTO' :
                       'FACTURA',
        notas: notes,
        terminosPago: paymentTerms,
        metodoPago: paymentMethod,
        validezDias: validityDays,
        subTotal: totals.subtotal,
        descuentos: totals.descuentos,
        totalExento: totals.exento,
        totalExonerado: totals.exonerado,
        totalGravado15: totals.gravado15,
        isv15: totals.isv15,
        totalGravado18: totals.gravado18,
        isv18: totals.isv18,
        total: totals.total,
        templateSettings: settings,
        documentoOrigenId: isNotaCredito ? initialData?.id : undefined,
        ordenTrabajoId: ordenTrabajoId || undefined
      };
      await actualizarDocumentoBuilder(docId, savePayload, validItems);
    } catch (err) {
      console.error('Error in silent save:', err);
    }
  };

  // PDF Download handler
  const handleDownloadPDF = async (pdfType: 'factura' | 'entrega' | 'garantia' = 'factura') => {
    const container = templateContainerRef.current;
    if (!container) {
      toast.error('No se encontró el documento para exportar');
      return;
    }

    // Solo podemos descargar el vectorial si el documento ya tiene ID oficial en BD
    const docId = initialData?.id;
    if (!docId || docId === 'nuevo') {
      toast.error('Debes GUARDAR EL DOCUMENTO antes de poder exportarlo en formato PDF.');
      return;
    }

    // Guardar cambios silenciosamente antes de descargar
    await handleSilentSave();

    if (pdfType === 'entrega' || pdfType === 'garantia') {
      window.open(`/api/pdf/${docId}?type=${pdfType}`, '_blank');
      return;
    }

    setIsDownloadingPDF(true);
    
    const customToast = (message: string, isFallback: boolean = false) => {
      return toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-2xl rounded-lg pointer-events-none flex flex-col p-4 border border-slate-100`}>
          <style>{`
            @keyframes toastShimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{message}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFallback 
                  ? 'Compilando captura del documento localmente.' 
                  : 'Procesando imágenes y formateando el documento vectorial.'}
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-3 relative">
            <div 
              className="absolute top-0 bottom-0 left-0 right-0 bg-brand-500 rounded-full" 
              style={{
                width: '40%',
                animation: 'toastShimmer 1.5s infinite linear',
              }}
            />
          </div>
        </div>
      ), { duration: Infinity });
    };

    let toastId = customToast('Generando PDF Vectorial (Máxima Calidad)...');

    try {
      // Petición al API de generación PDF Serverless con query param type
      const res = await fetch(`/api/pdf/${docId}?type=${pdfType}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.warn('PDF Server API Error:', errBody);
        throw new Error(errBody.error || 'Serverless API Error');
      }
      
      const blob = await res.blob();
      const isRepair = docType === 'cotizacion' && (initialData?.ordenTrabajo?.tipoTrabajo === 'REPARACION');
      const isMaint = docType === 'cotizacion' && (initialData?.ordenTrabajo?.tipoTrabajo === 'MANTENIMIENTO');
      const typeLabel = isRepair ? 'PresupuestoReparacion' : 
                        isMaint ? 'PresupuestoMantenimiento' :
                        docType === 'cotizacion' ? 'Cotizacion' : 
                        docType === 'proforma' ? 'ProForma' : 
                        'Factura';
      const fileName = `${typeLabel}-${docNumber || 'documento'}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('PDF generado y descargado exitosamente');
      setIsDownloadingPDF(false);
      return;
    } catch (apiError) {
      if (pdfType !== 'factura') {
        toast.dismiss(toastId);
        toast.error('Error al generar este PDF especial en el servidor.');
        setIsDownloadingPDF(false);
        return;
      }
      console.warn('API Vector Serverless failed/timeout. Falling back to html2canvas local render.', apiError);
      toast.dismiss(toastId);
      toastId = customToast('Generando PDF de Respaldo...', true);
      
      // FALLBACK LOCAL IMAGE-BASED PDF
      const container = templateContainerRef.current;
      if (!container) {
        toast.dismiss(toastId);
        toast.error('Error crítico al generar respaldo');
        setIsDownloadingPDF(false);
        return;
      }

      setIsForcePrinting(true);
      setTimeout(async () => {
        try {
          const html2canvasModule = await import('html2canvas-pro');
          const jsPDFModule = await import('jspdf');
          const html2canvas = html2canvasModule.default;
          const jsPDF = jsPDFModule.default;

        const uiElements = container.querySelectorAll('button, select, [data-pdf-hide]');
        const originalDisplays: string[] = [];
        uiElements.forEach((el, i) => {
          const htmlEl = el as HTMLElement;
          originalDisplays[i] = htmlEl.style.display;
          htmlEl.style.display = 'none';
        });

        const showElements = container.querySelectorAll('[data-pdf-show]');
        const originalShowDisplays: string[] = [];
        showElements.forEach((el, i) => {
          const htmlEl = el as HTMLElement;
          originalShowDisplays[i] = htmlEl.style.display;
          htmlEl.style.display = 'block';
        });

        const originalClasses = container.className;
        container.className = originalClasses.replace('pr-80', '').replace('scale-[0.95]', '');

        // PREPROCESS: Convert images to base64 to avoid html2canvas Tainted Canvas / CORS silent drops
        const imagesToConvert = Array.from(container.querySelectorAll('img'));
        imagesToConvert.forEach((img) => {
          img.setAttribute('data-original-src', img.src);
        });
        
        await Promise.all(imagesToConvert.map(async (img) => {
          if (img.src.startsWith('data:')) return;
          try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
            const fetchRes = await fetch(proxyUrl);
            if (fetchRes.ok) {
              const blob = await fetchRes.blob();
              const base64data = await new Promise((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result);
                 reader.readAsDataURL(blob);
              });
              img.src = base64data as string;
            }
          } catch(e) {
            console.warn('Could not base64 fetch image through proxy:', img.src, e);
          }
        }));

        let canvas: any;
        try {
          // Damos tiempo suficiente (800ms) para que el navegador re-renderice las imágenes con la enorme cadena de texto base64
          await new Promise(r => setTimeout(r, 800));

          canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
          });
        } finally {
          // RESTORE SIEMPRE, INCLUSO SI FALLA EL RENDER O DA TIMEOUT
          imagesToConvert.forEach((img) => {
            const orig = img.getAttribute('data-original-src');
            if (orig) {
              img.src = orig;
              img.removeAttribute('data-original-src');
            }
          });

          container.className = originalClasses;
          uiElements.forEach((el, i) => {
            (el as HTMLElement).style.display = originalDisplays[i];
          });
          showElements.forEach((el, i) => {
            (el as HTMLElement).style.display = originalShowDisplays[i];
          });
        }

        const imgData = canvas.toDataURL('image/png');
        const pageWidth = 215.9;
        const pageHeight = 279.4;
        
        let imgWidth = pageWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Si la imagen es un poco más alta que 1 página (hasta un 15% más), 
        // la escalamos para que quepa exactamente en 1 sola página sin generar una hoja extra casi vacía.
        if (imgHeight > pageHeight && imgHeight <= pageHeight * 1.15) {
             const scale = pageHeight / imgHeight;
             imgWidth = imgWidth * scale;
             imgHeight = pageHeight;
        }

        const pdf = new jsPDF('p', 'mm', 'letter');
        let heightLeft = imgHeight;
        let position = 0;

        // Centrar horizontalmente si fue escalada
        const xOffset = (pageWidth - imgWidth) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Usamos > 2 para evitar páginas en blanco por un par de milímetros residuales
        while (heightLeft > 2) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const isRepair = docType === 'cotizacion' && (initialData?.ordenTrabajo?.tipoTrabajo === 'REPARACION');
        const isMaint = docType === 'cotizacion' && (initialData?.ordenTrabajo?.tipoTrabajo === 'MANTENIMIENTO');
        const typeLabel = isRepair ? 'PresupuestoReparacion' : 
                          isMaint ? 'PresupuestoMantenimiento' :
                          docType === 'cotizacion' ? 'Cotizacion' : 
                          docType === 'proforma' ? 'ProForma' : 
                          'Factura';
        const fileName = `${typeLabel}-${docNumber || 'documento'}(respaldo).pdf`;
        pdf.save(fileName);
        toast.dismiss(toastId);
        toast.success('PDF de Respaldo generado correctamente');
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        toast.dismiss(toastId);
        toast.error('Mecanismos de PDF agotados. Imprime manualmente.');
      } finally {
        setIsForcePrinting(false);
        setIsDownloadingPDF(false);
      }
    }, 150);
  }
  };

  // Cargar initialData si existe
  useEffect(() => {
    if (initialData && !draftLoadedRef.current) {
      if (isNotaCredito) {
        setDocType('nota_credito');
        setNotes(`Aplica a Factura Oficial No. ${initialData.correlativo}\n`);
      } else {
        let mappedType = initialData.tipoDocumento.toLowerCase();
        if (mappedType === 'presupuesto_reparacion' || mappedType === 'presupuesto_mantenimiento') {
          mappedType = 'cotizacion';
        }
        setDocType(mappedType as DocType);
        setNotes(initialData.notas || '');
      }
      
      // Mostrar correlativo al editar o ver; solo borrar cuando sea un clon (nueva copia)
      const isClone = !editMode && !viewMode && !isNotaCredito;
      setDocNumber(isClone ? '' : initialData.correlativo);
      
      setPaymentTerms(initialData.terminosPago || 'Pago inmediato');
      setPaymentMethod(initialData.metodoPago || 'Efectivo');
      setValidityDays(initialData.validezDias || 30);
      // Extraemos totales manuales si la suma no cuaja, pero como no sabemos de donde vino, tomamos el valor guardado y restamos lo calculado por lineas.
      let lineBaseExento = 0;
      let lineBaseExonerado = 0;

      if (initialData.cliente) {
        setSelectedClient({
          id: initialData.cliente.id,
          name: initialData.cliente.nombre,
          rtn: initialData.cliente.rtn || '',
          email: initialData.cliente.email || '',
          phone: initialData.cliente.telefono || '',
          address: initialData.cliente.direccion || '',
          city: '',
          category: 'Cliente',
          nombreContacto: initialData.cliente.nombreContacto || '',
          telefonoContacto: initialData.cliente.telefonoContacto || '',
        });
      }

      if (initialData.detalles && initialData.detalles.length > 0) {
        const loadedItems = initialData.detalles.map((d: any) => {
          let tax: TaxType = 'exento';
          if (d.porcentajeIsv === 15) tax = 'isv15';
          else if (d.porcentajeIsv === 18) tax = 'isv18'; // We don't have 18 in db schema explicitly, but assuming mapping
          // For exonerado, we would have logic, but default to exento if 0
          
          let isSection = false;
          let sectionStyle;
          let metadata: any = {};
          let rawDesc = d.descripcion || '';
          
          const metaIdx = rawDesc.indexOf('__METADATA__');
          if (metaIdx !== -1) {
              try {
                  metadata = JSON.parse(rawDesc.substring(metaIdx + 12));
              } catch(e){}
              rawDesc = rawDesc.substring(0, metaIdx);
          }
          
          if (rawDesc.startsWith('__SECTION__')) {
              isSection = true;
              rawDesc = rawDesc.substring(11);
              const styleIdx = rawDesc.indexOf('__STYLE__');
              if (styleIdx !== -1) {
                  try {
                      sectionStyle = JSON.parse(rawDesc.substring(styleIdx + 9));
                  } catch(e){}
                  rawDesc = rawDesc.substring(0, styleIdx);
              }
          }

          let longDesc = '';
          let shortDesc = rawDesc;
          let marcaModelo: string | null = null;
          let parsedSerie: string | null = d.activo?.serie || d.serie || null;
          
          if (rawDesc.includes('\n')) {
              const parts = rawDesc.split('\n');
              shortDesc = parts[0];
              const remaining = parts.slice(1);
              
              const brandLine = remaining.find((l: string) => l.startsWith('Marca/Modelo:'));
              const serieLine = remaining.find((l: string) => l.startsWith('Serie:'));
              
              if (brandLine || serieLine) {
                  if (brandLine) {
                      marcaModelo = brandLine.substring(13).trim();
                  }
                  if (serieLine) {
                      parsedSerie = serieLine.substring(6).trim();
                  }
                  const otherLines = remaining.filter((l: string) => !l.startsWith('Marca/Modelo:') && !l.startsWith('Serie:'));
                  longDesc = otherLines.join('\n');
              } else {
                  longDesc = remaining.join('\n');
              }
          }
          
          let discountType: 'percentage' | 'amount' = 'amount';
          let discount = Number(d.totalDescuento);

          // Sum base
          if (tax === 'exento') lineBaseExento += (Number(d.cantidad) * Number(d.precioUnitario) - discount);

          return {
            id: d.id || uid(),
            code: d.producto?.sku || d.activo?.idQr || '',
            shortDesc,
            longDesc,
            richDesc: d.descripcionEnriquecida || '',
            isSection,
            sectionStyle,
            showLongDesc: d.mostrarDescripcion || false,
            qty: d.cantidad,
            unitPrice: Number(d.precioUnitario),
            tax,
            discount,
            discountType,
            productoId: d.productoId || undefined,
            activoId: d.activoId || undefined,
            imageUrl: metadata.imageUrl || d.producto?.imagenWeb || (d.producto?.imagenes && d.producto?.imagenes[0]) || d.activo?.imagenUrl || resolveServiceImageUrl(shortDesc) || undefined,
            serie: metadata.serie || parsedSerie,
            marcaModelo: metadata.marcaModelo || marcaModelo
          };
        });
        setLineItems(loadedItems);
      }

      // Since it's dynamic, we no longer compute difference for manual fallback
      if (viewMode) setShowPreview(true);
    }
  }, [initialData, viewMode]);

  // Cargar catalogos iniciales — el correlativo se asigna al interactuar con el UI
  useEffect(() => {
    const loadData = async () => {
      try {
        const cls = await searchClientes('');
        const prd = await searchProductos('');
        setAllClients(cls.map((c: any) => ({
          id: c.id,
          name: c.nombre,
          rtn: c.rtn || '',
          email: c.email || '',
          phone: c.telefono || '',
          address: c.direccion || '',
          city: '',
          category: 'Cliente',
          nombreContacto: c.nombreContacto || '',
          telefonoContacto: c.telefonoContacto || '',
        })));
        setAllProducts(prd.map((p: any) => ({
          id: p.id,
          code: p.sku || '',
          name: p.nombre,
          description: p.descripcion || '',
          price: Number(p.precioVenta) || 0,
          category: p.marca || 'General',
          stock: p.stockActual || 0,
          brand: p.marca || '',
          type: p.type || 'producto',
          imageUrl: p.imageUrl || p.imagenUrl || null,
          fechaVencimiento: p.fechaVencimiento || null,
          serie: p.serie || null,
        })));
      } catch (e) {
        console.error("Error al cargar datos", e);
      }
    };
    loadData();

    const handleForceReloadCatalog = async () => {
      try {
        const prd = await searchProductos('');
        setAllProducts(prd.map((p: any) => ({
          id: p.id,
          code: p.sku || '',
          name: p.nombre,
          description: p.descripcion || '',
          price: Number(p.precioVenta) || 0,
          category: p.marca || 'General',
          stock: p.stockActual || 0,
          brand: p.marca || '',
          type: p.type || 'producto',
          imageUrl: p.imageUrl || p.imagenUrl || null,
          fechaVencimiento: p.fechaVencimiento || null,
          serie: p.serie || null,
        })));
      } catch (e) {
        console.error("Error reloading catalog:", e);
      }
    };
    window.addEventListener('reload-catalog', handleForceReloadCatalog);
    return () => {
      window.removeEventListener('reload-catalog', handleForceReloadCatalog);
    };
  }, [docType]);

  // Safety net: resolve missing asset serial numbers against loaded catalog
  useEffect(() => {
    if (allProducts.length > 0 && lineItems.length > 0) {
      let changed = false;
      const updated = lineItems.map(item => {
        if (item.activoId && !item.serie) {
          const matched = allProducts.find(p => p.id === item.activoId && p.type === 'activo');
          if (matched && matched.serie) {
            changed = true;
            return { ...item, serie: matched.serie };
          }
        }
        return item;
      });
      if (changed) {
        setLineItems(updated);
      }
    }
  }, [allProducts, lineItems]);

  // Global hotkey for adding new row
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!viewMode && !showCustomizer && !showProductModal && !showClientModal && !showNewClientModal && !showSuccessModal) {
           e.preventDefault();
           setLineItems(prev => [...prev, emptyLine()]);
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
         if (!viewMode && !showCustomizer && !showProductModal && !showClientModal && !showNewClientModal && !showSuccessModal) {
            e.preventDefault();
            setShowProductModal(true);
         }
      }
    };
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const rowDiv = target.closest('[data-line-id]');
      if (rowDiv) {
        setActiveLineId(rowDiv.getAttribute('data-line-id'));
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
       document.removeEventListener('keydown', handleGlobalKeyDown);
       document.removeEventListener('focusin', handleFocusIn);
    };
  }, [viewMode, showCustomizer, showProductModal, showClientModal, showNewClientModal, showSuccessModal]);

  const nClientSearch = normalizeText(clientSearch);
  const filteredClients = allClients.filter(c =>
    normalizeText(c.name).includes(nClientSearch) ||
    normalizeText(c.rtn).includes(nClientSearch)
  );

  const handleCreateClient = async () => {
    if (!newClientData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setIsCreatingClient(true);
    try {
      if (editingClientId) {
        // Edit mode
        await updateContacto(editingClientId, {
          nombre: newClientData.nombre,
          email: newClientData.email || undefined,
          telefono: newClientData.telefono || undefined,
          rtn: newClientData.rtn || undefined,
          direccion: newClientData.direccion || undefined,
          nombreContacto: newClientData.nombreContacto || undefined,
          telefonoContacto: newClientData.telefonoContacto || undefined
        });

        const updatedClientObj: Client = {
          id: editingClientId,
          name: newClientData.nombre,
          rtn: newClientData.rtn || '',
          email: newClientData.email || '',
          phone: newClientData.telefono || '',
          address: newClientData.direccion || '',
          city: '',
          category: 'Cliente',
          nombreContacto: newClientData.nombreContacto || '',
          telefonoContacto: newClientData.telefonoContacto || '',
        };

        // Update in lists
        setAllClients(prev => prev.map(c => c.id === editingClientId ? updatedClientObj : c));
        // If it was the selected client, update it as well
        if (selectedClient?.id === editingClientId) {
          setSelectedClient(updatedClientObj);
        }
        setShowNewClientModal(false);
        setEditingClientId(null);
        setNewClientData({ nombre: '', email: '', telefono: '', rtn: '', direccion: '', nombreContacto: '', telefonoContacto: '' });
        toast.success('Cliente actualizado correctamente');
      } else {
        // Create mode
        const created = await createContacto({
          nombre: newClientData.nombre,
          email: newClientData.email || undefined,
          telefono: newClientData.telefono || undefined,
          rtn: newClientData.rtn || undefined,
          direccion: newClientData.direccion || undefined,
          nombreContacto: newClientData.nombreContacto || undefined,
          telefonoContacto: newClientData.telefonoContacto || undefined
        });
        const newClientObj: Client = {
          id: created.id,
          name: created.nombre,
          rtn: created.rtn || '',
          email: created.email || '',
          phone: created.telefono || '',
          address: created.direccion || '',
          city: '',
          category: 'Cliente',
          nombreContacto: created.nombreContacto || '',
          telefonoContacto: created.telefonoContacto || '',
        };
        setAllClients(prev => [...prev, newClientObj]);
        setSelectedClient(newClientObj);
        setShowNewClientModal(false);
        setShowClientModal(false);
        setNewClientData({ nombre: '', email: '', telefono: '', rtn: '', direccion: '', nombreContacto: '', telefonoContacto: '' });
        toast.success('Cliente registrado correctamente');
      }
    } catch (e: any) {
      toast.error(editingClientId ? 'Error al actualizar cliente' : 'Error al registrar cliente');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const nProductSearch = normalizeText(productSearch);
  const filteredProducts = allProducts.filter(p => {
    const matchesSearch = normalizeText(p.name).includes(nProductSearch) ||
      normalizeText(p.code).includes(nProductSearch) ||
      normalizeText(p.category).includes(nProductSearch);
      
    if (showExpiredOnly) {
      const isExpired = p.fechaVencimiento && new Date(p.fechaVencimiento) < new Date();
      return matchesSearch && isExpired;
    }
    
    return matchesSearch;
  });

  const handleLineChange = useCallback((id: string, field: any, val: any) => {
    if (field === 'sectionStyle' && val) {
      setSettings(prev => ({
        ...prev,
        sectionBgColor: val.bg || prev.sectionBgColor,
        sectionTextColor: val.color || prev.sectionTextColor
      }));
    }
    setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleToggleLongDesc = useCallback((id: string) => {
    const targetItem = lineItems.find(i => i.id === id);
    if (!targetItem) return;
    const newVal = !targetItem.showLongDesc;
    
    // Guardado automático en BD si es un registro real
    if (id && id.length > 20) {
      toggleMostrarDescripcion(id, newVal).catch(e => console.error('Error auto-saving desc toggle:', e));
    }
    
    setLineItems(prev => prev.map(item =>
      item.id === id ? { ...item, showLongDesc: newVal } : item
    ));
  }, [lineItems]);

  const handleToggleItemExcluido = async (itemId: string, isIncluded: boolean) => {
    if (!ordenEntrega) return;
    const currentExcluded = ordenEntrega.detallesExcluidos || [];
    let newExcluded: string[];
    if (!isIncluded) {
      newExcluded = [...currentExcluded, itemId];
    } else {
      newExcluded = currentExcluded.filter((id: string) => id !== itemId);
    }
    
    const toastId = toast.loading('Actualizando artículos de entrega...');
    try {
      const res = await updateOrdenEntrega(ordenEntrega.id, { detallesExcluidos: newExcluded });
      if (res.success && res.orden) {
        setOrdenEntrega(res.orden);
        toast.success('Artículos actualizados', { id: toastId });
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar', { id: toastId });
    }
  };

  const handleDuplicateLine = useCallback((id: string) => {
    setLineItems(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      const newItems = [...prev];
      newItems.splice(index + 1, 0, { ...prev[index], id: uid() });
      return newItems;
    });
  }, []);

  const addProduct = useCallback((product: Product) => {
    const sanitizedShortDesc = product.name.replace(/\r?\n|\r/g, ' ').trim();
    let productLongDesc = product.description || '';
    
    // Check if product is expired
    if (product.fechaVencimiento && new Date(product.fechaVencimiento) < new Date()) {
        productLongDesc = productLongDesc ? `${productLongDesc}\n[PRODUCTO VENCIDO]` : "[PRODUCTO VENCIDO]";
    }

    const newLine: LineItem = {
      id: uid(),
      code: product.code,
      shortDesc: sanitizedShortDesc,
      longDesc: productLongDesc,
      richDesc: '',
      showLongDesc: false,
      qty: 1,
      unitPrice: product.price,
      tax: 'isv15',
      discount: 0,
      discountType: 'percentage',
      productoId: product.type === 'producto' ? product.id : undefined,
      activoId: product.type === 'activo' ? product.id : undefined,
      imageUrl: (product as any).imageUrl || undefined,
      serie: product.serie || null,
    };
    setLineItems(prev => {
      if (activeLineId) {
        // Replace the currently selected row
        return prev.map(l => l.id === activeLineId ? { ...newLine, id: l.id } : l);
      }
      // Otherwise, act as before: replace last empty row or append
      const hasEmpty = prev.some(l => !l.shortDesc && !l.unitPrice);
      return hasEmpty ? prev.map((l, i) => i === prev.length - 1 && !l.shortDesc ? newLine : l) : [...prev, newLine];
    });
    setShowProductModal(false);
  }, [activeLineId]);

  const handleSave = async () => {
    if (isAnulada) { toast.error('No se puede modificar un documento anulado'); return; }
    if (!selectedClient) {
      toast.error('Debe seleccionar un cliente');
      return;
    }

    const validItems = lineItems.filter((i, index) => {
      // Ignore the completely empty trailing row
      if (index === lineItems.length - 1 && !i.shortDesc && !i.code && Number(i.unitPrice) === 0) return false;
      return true;
    });

    // 1. Debe haber al menos un ítem en el documento
    if (validItems.length === 0) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-red-100`}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
               <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800">Documento Vacío</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">No puedes emitir un documento sin agregar al menos un producto o servicio.</p>
              <button onClick={() => toast.dismiss(t.id)} className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">Entendido</button>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }

    // 2. Todos los listados deben tener descripción y cantidad válida (excepto secciones)
    const incompleteItem = validItems.find(i => {
      if (i.isSection) {
        // A section must have either a shortDesc (title) or a richDesc (content)
        const hasTitle = i.shortDesc && i.shortDesc.trim() !== '';
        const hasRichText = i.richDesc && i.richDesc.replace(/<[^>]+>/g, '').trim() !== '';
        return !hasTitle && !hasRichText;
      }
      return i.shortDesc.trim() === '' || Number(i.qty) <= 0;
    });
    
    if (incompleteItem) {
      toast.error('Por favor complete la descripción y cantidad en todos los renglones (las secciones deben tener texto).');
      return;
    }

    // 3. El total no puede ser 0.
    if (totals.total <= 0) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-amber-100`}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
               <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800">Valor Inválido</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">El documento tiene un Monto Total de L 0.00. Ingresa el precio de los ítems para continuar.</p>
              <button onClick={() => toast.dismiss(t.id)} className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">Entendido</button>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        clienteId: selectedClient.id,
        tipoDocumento: docType === 'cotizacion' ? 'COTIZACION' : 
                       docType === 'proforma' ? 'PROFORMA' : 
                       docType === 'nota_credito' ? 'NOTA_CREDITO' : 
                       docType === 'presupuesto_reparacion' ? 'PRESUPUESTO_REPARACION' :
                       docType === 'presupuesto_mantenimiento' ? 'PRESUPUESTO_MANTENIMIENTO' :
                       'FACTURA',
        notas: notes,
        terminosPago: paymentTerms,
        metodoPago: paymentMethod,
        validezDias: validityDays,
        subTotal: totals.subtotal,
        descuentos: totals.descuentos,
        totalExento: totals.exento,
        totalExonerado: totals.exonerado,
        totalGravado15: totals.gravado15,
        isv15: totals.isv15,
        totalGravado18: totals.gravado18,
        isv18: totals.isv18,
        total: totals.total,
        templateSettings: settings,
        documentoOrigenId: isNotaCredito ? initialData?.id : undefined,
        ordenTrabajoId: ordenTrabajoId || undefined
      };
      
      let res;
      // Si tenemos un documento reservado localmente, O si estamos en editMode, SIEMPRE ACTUALIZAMOS
      const targetId = reservedDocId || (editMode ? initialData?.id : null);
      
      if (targetId) {
        res = await actualizarDocumentoBuilder(targetId, data, validItems);
      } else {
        // Fallback for safety, though reservedDocId should always exist now before saving
        res = await guardarDocumentoBuilder(data, validItems);
      }
      if (res.success) {
        clearLocalDraft();
        setShowSuccessModal({ 
          show: true, 
          docId: String(res.docId || (initialData?.id || '')), 
          correlativo: res.correlativo || '',
          format: docType 
        });
      } else {
        toast.error(res.error || 'Error al guardar el documento');
      }
    } catch(e: any) {
      toast.error(e.message || 'Error desconocido al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReservarCorrelativo = async () => {
    setIsReserving(true);
    try {
      const res = await reservarCorrelativoVacio(docType.toUpperCase());
      if (res.success && res.docId) {
        setReservedDocId(res.docId);
        setDocNumber(res.correlativo || '');
        setIsLocked(false);
        // Force an immediate local storage save
        const draft = {
          reservedDocId: res.docId, docType, docNumber: res.correlativo, selectedClient, lineItems, notes, paymentTerms, validityDays
        };
        window.localStorage.setItem(draftKey, JSON.stringify(draft));
        setLastSaved(new Date());
      } else {
        toast.error(res.error || 'Error reservando correlativo');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al conectar con el servidor.');
    } finally {
      setIsReserving(false);
    }
  };

  const handleConvert = (nuevoTipo: 'PROFORMA' | 'FACTURA') => {
    if (!initialData?.id) return;
    setConvertPaymentMethod(paymentMethod || initialData?.metodoPago || 'Efectivo');
    setConvertEstado('EMITIDA');
    setShowConvertModal({ nuevoTipo });
  };


  const totals = {
    get subtotal() { return lineItems.reduce((acc, item) => acc + calcLine(item, settings?.pricesIncludeTax).base, 0); },
    get descuentos() { return lineItems.reduce((acc, item) => acc + calcLine(item, settings?.pricesIncludeTax).dAmount, 0); },
    get exento() { 
      const val = lineItems.reduce((acc, item) => item.tax === 'exento' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0);
      const adjustment = Number(settings?.roundAdjustment) || 0;
      if (this.isv15 === 0 && this.isv18 === 0 && val > 0) {
        return val + adjustment;
      }
      return val;
    },
    get exonerado() { 
      const val = lineItems.reduce((acc, item) => item.tax === 'exonerado' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0);
      const adjustment = Number(settings?.roundAdjustment) || 0;
      if (this.isv15 === 0 && this.isv18 === 0 && this.exento === 0 && val > 0) {
        return val + adjustment;
      }
      return val;
    },
    get gravado15() { return lineItems.reduce((acc, item) => item.tax === 'isv15' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0); },
    get isv15() { 
      const val = lineItems.reduce((acc, item) => item.tax === 'isv15' ? acc + calcLine(item, settings?.pricesIncludeTax).tax : acc, 0);
      const adjustment = Number(settings?.roundAdjustment) || 0;
      if (val > 0) {
        return val + adjustment;
      }
      return val;
    },
    get gravado18() { return lineItems.reduce((acc, item) => item.tax === 'isv18' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0); },
    get isv18() { 
      const val = lineItems.reduce((acc, item) => item.tax === 'isv18' ? acc + calcLine(item, settings?.pricesIncludeTax).tax : acc, 0);
      const adjustment = Number(settings?.roundAdjustment) || 0;
      if (val > 0 && this.isv15 === 0) {
        return val + adjustment;
      }
      return val;
    },
    get total() { 
      const baseTotal = this.subtotal - this.descuentos + this.isv15 + this.isv18;
      if (this.isv15 === 0 && this.isv18 === 0) {
        const adjustment = Number(settings?.roundAdjustment) || 0;
        if (this.exento > 0 || this.exonerado > 0) {
          return baseTotal + adjustment;
        }
      }
      return baseTotal;
    }
  };

  const baseDocType = DOC_TYPES.find(d => d.key === docType) || DOC_TYPES.find(d => d.key === 'cotizacion')!;
  let resolvedLabel = baseDocType.label;
  
  if (docType === 'cotizacion' && initialData?.ordenTrabajo?.tipoTrabajo) {
    const tipoTrabajo = initialData.ordenTrabajo.tipoTrabajo;
    if (tipoTrabajo === 'MANTENIMIENTO') {
      resolvedLabel = 'Presupuesto de Mantenimiento';
    } else if (tipoTrabajo === 'REPARACION') {
      resolvedLabel = 'Presupuesto de Reparación';
    }
  }

  const currentDocType = {
    ...baseDocType,
    label: resolvedLabel
  };

  const docTypeStatusConfig: Record<DocType, { badge: string; label: string }> = {
    cotizacion: { badge: 'bg-blue-50 text-blue-600 border border-blue-200', label: 'COTIZACIÓN' },
    proforma: { badge: 'bg-violet-50 text-violet-600 border border-violet-200', label: 'PRO FORMA' },
    factura: { badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200', label: 'FACTURA OFICIAL' },
    nota_credito: { badge: 'bg-purple-50 text-purple-600 border border-purple-200', label: 'NOTA DE CRÉDITO' },
    presupuesto_reparacion: { badge: 'bg-pink-50 text-pink-600 border border-pink-200', label: 'PRESUPUESTO DE REPARACIÓN' },
    presupuesto_mantenimiento: { badge: 'bg-amber-50 text-amber-600 border border-amber-200', label: 'PRESUPUESTO DE MANTENIMIENTO' },
  };
  const clienteSignaturePayload = (initialData?.firmaClienteBase64 && initialData?.firmaClienteAt) 
    ? {
        url: initialData.firmaClienteBase64,
        date: initialData.firmaClienteAt,
        name: selectedClient?.name || 'Cliente'
    } 
    : null;

  const resolvedNombreUsuario = (initialData?.creadoPor ? [initialData.creadoPor.nombre, initialData.creadoPor.apellido].filter(Boolean).join(' ') : null) || initialData?.nombreUsuario || currentUser?.fullName || 'Administrador (BEA)';

  return (
    <div className="min-h-screen bg-slate-50 font-sans print:!bg-white overflow-x-hidden print:overflow-visible print:min-h-0 print:block">
      {/* Top Bar */}
      <div className={`bg-white border-b border-slate-100 shadow-sm print:hidden transition-all duration-300 ${showCustomizer ? 'pr-[360px]' : ''}`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-4 overflow-x-auto sm:overflow-visible">
          
          <div className="flex items-center gap-4">
             <DocTypeSelector value={docType} onChange={setDocType} />
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {!isLocked ? (
              <>
                {viewMode && !isAnulada && !isConvertida && (docType === 'cotizacion' || docType === 'factura') && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold hover:shadow-indigo-100 hover:shadow-lg transition-all shadow-sm whitespace-nowrap shrink-0"
                  >
                    <Pencil size={15} /> Editar
                  </button>
                )}
                {!viewMode && (
                  <button
                    onClick={() => setShowWorkOrderModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-xl text-sm font-semibold transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Wrench size={15} className="stroke-[2.5]" /> Extraer Orden
                  </button>
                )}
                <button
                  onClick={() => setShowActionsModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 hover:border-slate-300 transition-all shadow-sm whitespace-nowrap shrink-0"
                >
                  <LayoutGrid size={15} /> Más Acciones
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap shrink-0"
                >
                  <Printer size={15} /> Imprimir
                </button>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-400 mr-4 whitespace-nowrap">Selecciona y crea tu documento para comenzar</span>
            )}
            {!isAnulada && !isLocked && !viewMode && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-5 py-2 text-white rounded-xl text-sm font-bold shadow-md transition-all whitespace-nowrap shrink-0 ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
              >
                <Send size={15} />
                {isSaving ? 'Guardando...' : (docType === 'factura' ? 'Emitir Factura' : 'Guardar Documento')}
              </button>
            )}

          </div>
        </div>
      </div>

      <div className={`mx-auto px-4 py-8 flex flex-col md:flex-row print:p-0 print:max-w-none print:m-0 relative print:block transition-all duration-300 ${
        showCustomizer
          ? 'max-w-none w-full gap-5'
          : (viewMode && docType === 'factura' && !isLocked)
            ? (showOrdenEntregaPanel ? 'max-w-[1200px] gap-5' : 'max-w-[816px] gap-y-5 md:gap-x-0')
            : (viewMode ? 'max-w-[816px] gap-y-5 md:gap-x-0' : 'max-w-[1200px] gap-y-5 md:gap-x-0')
      }`}>

        <div className={`flex-1 min-w-0 relative transition-all duration-300 print:block ${isLocked ? 'pointer-events-none' : ''}`}>
          
          <div className={`transition-all duration-500 relative flex-1 min-w-0 z-10 print:block ${showCustomizer ? 'pr-[360px] print:pr-0 scale-[0.95] print:scale-100 origin-top' : ''} ${isLocked ? 'blur-[6px] opacity-60 grayscale-[0.1]' : ''}`}>
             <div ref={templateContainerRef} className="max-w-[816px] mx-auto relative bg-white">
          
          {isAnulada && (
             <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden mix-blend-multiply opacity-30 print:opacity-20 px-8">
                 <span className="text-[10rem] sm:text-[14rem] font-black text-red-500 uppercase tracking-widest -rotate-45 block whitespace-nowrap">ANULADA</span>
             </div>
          )}
          
          {currentCanvasMode === 'orden_entrega' && (
            <OrdenEntregaTemplate
              settings={settings}
              organization={organization}
              docNumber={docNumber || 'PENDIENTE'}
              nombreUsuario={resolvedNombreUsuario}
              selectedClient={selectedClient}
              today={getOrdenEntregaTodayStr()}
              lineItems={lineItems}
              viewMode={effectiveViewMode}
              ordenEntrega={ordenEntrega}
              onToggleItemExcluido={handleToggleItemExcluido}
              ordenTrabajo={initialData?.ordenTrabajo}
            />
          )}

          {currentCanvasMode === 'document' && settings.template === 'modern' && <ModernTemplate 
            settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
            nombreUsuario={resolvedNombreUsuario}
            docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
            today={today} fechaEmision={resolvedFechaEmision} futureDate={futureDate} selectedClient={selectedClient} 
            setShowClientModal={isNotaCredito ? () => toast.error('No se puede cambiar el cliente en una Nota de Crédito') : setShowClientModal} paymentTerms={paymentTerms} 
            setPaymentTerms={setPaymentTerms}
            paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
            validityDays={validityDays} setValidityDays={setValidityDays} 
            lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
            handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
            setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
            setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
            LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode} clienteSignature={clienteSignaturePayload}
            setSettings={setSettings}
            onToggleTerms={handleToggleTerms}
          />}
          {currentCanvasMode === 'document' && settings.template === 'classic' && <ClassicTemplate 
             settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
             nombreUsuario={resolvedNombreUsuario}
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} fechaEmision={resolvedFechaEmision} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={isNotaCredito ? () => toast.error('No se puede cambiar el cliente en una Nota de Crédito') : setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms}
             paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
             validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
             handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode} clienteSignature={clienteSignaturePayload}
             setSettings={setSettings}
             onToggleTerms={handleToggleTerms}
          />}
          {currentCanvasMode === 'document' && settings.template === 'minimalist' && <MinimalistTemplate 
             settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
             nombreUsuario={resolvedNombreUsuario}
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} fechaEmision={resolvedFechaEmision} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={isNotaCredito ? () => toast.error('No se puede cambiar el cliente en una Nota de Crédito') : setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms}
             paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
             validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
            handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode} clienteSignature={clienteSignaturePayload}
             setSettings={setSettings}
             onToggleTerms={handleToggleTerms}
          />}
          {currentCanvasMode === 'document' && settings.template === 'legacy' && <LegacyTemplate 
             settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
             nombreUsuario={resolvedNombreUsuario}
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} fechaEmision={resolvedFechaEmision} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={isNotaCredito ? () => toast.error('No se puede cambiar el cliente en una Nota de Crédito') : setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms}
             paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
             validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
             handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode} clienteSignature={clienteSignaturePayload}
             setSettings={setSettings}
             onToggleTerms={handleToggleTerms}
          />}
          </div>

          {/* Bottom Action Bar */}
          {!effectiveViewMode && (
          <div className="flex items-center gap-3 print:hidden mt-6">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Copy size={14} /> Duplicar
            </button>
            <button onClick={handlePrintEditor} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Printer size={14} /> Imprimir
            </button>

            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Mail size={14} /> Enviar por Email
            </button>
            <div className="flex-1" />
            {lastSaved && (
              <div className="flex items-center gap-3 mr-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 opacity-80">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Borrador guardado
                </span>
                <button
                  onClick={() => setShowDiscardModal(true)}
                  title="Descartar borrador actual"
                  className="text-[10px] uppercase tracking-wider font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/80 px-2 py-1 rounded transition-colors"
                >
                  Descartar
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Sparkles size={13} className="text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">{lineItems.length} renglón{lineItems.length !== 1 ? 'es' : ''} · {fmt(totals.total)} total</span>
            </div>
          </div>
          )}
          </div>
          {/* ─── END MAIN DOCUMENT BLUR WRAPPER ──────────────────────────────────── */}

          {isLocked && (
            <div className="absolute inset-x-0 top-0 z-50 flex justify-center pointer-events-none mt-[-8px]">
              <div className="bg-white/98 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white max-w-3xl w-full mx-4 animate-in zoom-in-95 duration-300 pointer-events-auto">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                    <FileText size={24} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Nuevo Documento</h2>
                  <p className="text-slate-500 mt-2 text-sm">Selecciona el tipo de documento que deseas crear para generar el correlativo oficial.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {DOC_TYPES.map((dt) => {
                    const isSelected = docType === dt.key;
                    return (
                      <button
                        key={dt.key}
                        onClick={() => setDocType(dt.key)}
                        className={`
                          relative text-left p-6 rounded-2xl border-2 transition-all duration-200 outline-none
                          ${isSelected 
                            ? `border-[currentColor] ${dt.bg} shadow-md ring-4 ring-slate-100 scale-[1.02] ${dt.color}` 
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm text-slate-400'
                          }
                        `}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isSelected ? dt.bg : 'bg-slate-50 text-slate-400'} ${isSelected ? dt.color : ''}`}>
                          {dt.icon}
                        </div>
                        <h3 className={`font-bold mb-1 ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{dt.label}</h3>
                        <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-slate-700' : 'text-slate-400'}`}>{dt.description}</p>
                        
                        {isSelected && (
                          <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${dt.color.replace('text-', 'bg-')} shadow-sm`}>
                            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                              <path d="M1 4.5l3 3 6-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="flex justify-center border-t border-slate-100 pt-6">
                  <button 
                    onClick={handleReservarCorrelativo}
                    disabled={isReserving || !isHydrated}
                    className="flex items-center justify-center min-w-[300px] gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/30 text-lg font-bold transform hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {isReserving ? (
                      <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <Plus size={22} className="stroke-[3]" />
                    )}
                    {isReserving ? `Reservando Correlativo...` : `Crear ${currentDocType.label}`}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right side: Orden de Entrega & Trazabilidad Panel */}
        {viewMode && docType === 'factura' && !isLocked && showOrdenEntregaPanel && (
          <div className="transition-all duration-300 relative flex shrink-0 print:hidden w-full md:w-[360px]">
            {/* Collapsible Panel */}
            <div 
              className="w-full md:w-[360px] bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm self-start md:sticky md:top-[80px] space-y-6 transition-all duration-300 transform translate-x-0 opacity-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                  🚚 Orden de Entrega
                </h3>
                <div className="flex items-center gap-2">
                  {loadingOrden ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : ordenEntrega ? (
                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold px-2.5 py-1 rounded-full tracking-wider uppercase font-mono">
                      {ordenEntrega.correlativo}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowOrdenEntregaPanel(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    title="Ocultar panel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

            {ordenEntrega ? (
              <>
                {/* PDF generation list */}
                <div className="space-y-3 pb-4 border-b border-slate-100 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    📄 Documentos Adicionales
                  </h4>
                  <button
                    onClick={() => handleDownloadPDF('entrega')}
                    disabled={isDownloadingPDF}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow transition-all hover:shadow-lg disabled:opacity-50 animate-pulse-subtle"
                  >
                    <Download size={13} /> Descargar Orden de Entrega
                  </button>
                  <button
                    onClick={() => handleDownloadPDF('garantia')}
                    disabled={isDownloadingPDF}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-black shadow transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    <Download size={13} /> Descargar Certificado de Garantía
                  </button>
                  {!ordenEntrega.aplicaMantenimientos && (
                    <p className="text-[10px] text-amber-500 font-medium text-center">
                      * Habilita el calendario de mantenimientos para incluir el cronograma de visitas preventivas
                    </p>
                  )}
                </div>

                {/* Selector de Lienzo */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vista del Canvas</span>
                  <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveCanvasMode('document')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeCanvasMode === 'document' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      📄 Factura
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCanvasMode('orden_entrega')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        activeCanvasMode === 'orden_entrega' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      🚚 Entrega
                    </button>
                  </div>
                </div>

                {/* Toggles section */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <input
                      id="aplicaMantenimientos"
                      type="checkbox"
                      checked={ordenEntrega.aplicaMantenimientos || false}
                      onChange={async (e) => {
                        const val = e.target.checked;
                        const toastId = toast.loading('Guardando preferencia...');
                        try {
                          const res = await updateOrdenEntrega(ordenEntrega.id, { aplicaMantenimientos: val });
                          if (res.success && res.orden) {
                            setOrdenEntrega(res.orden);
                            toast.success('Preferencia actualizada', { id: toastId });
                          } else {
                            throw new Error(res.error);
                          }
                        } catch (err: any) {
                          toast.error(err.message || 'Error al actualizar', { id: toastId });
                        }
                      }}
                      className="mt-1 h-4.5 w-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="aplicaMantenimientos" className="text-xs font-semibold text-slate-600 cursor-pointer leading-relaxed">
                      ¿Aplica Calendario de Mantenimientos e Historial de Garantía?
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Calcula fechas dinámicas de visitas basándose en la configuración del activo.</span>
                    </label>
                  </div>
                </div>

                  {/* Firmas y Sellos en la Orden de Entrega */}
                  <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      ✍️ Firmas y Sellos en PDF
                    </h4>
                    
                    <div className="flex items-center gap-3">
                      <input
                        id="oeMostrarFirmas"
                        type="checkbox"
                        checked={ordenEntrega.mostrarFirmas !== false}
                        onChange={async (e) => {
                          const val = e.target.checked;
                          const toastId = toast.loading('Guardando preferencia...');
                          try {
                            const res = await updateOrdenEntrega(ordenEntrega.id, { mostrarFirmas: val });
                            if (res.success && res.orden) {
                              setOrdenEntrega(res.orden);
                              toast.success('Preferencia guardada', { id: toastId });
                            } else {
                              throw new Error(res.error);
                            }
                          } catch (err: any) {
                            toast.error(err.message || 'Error al actualizar', { id: toastId });
                          }
                        }}
                        className="h-4.5 w-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="oeMostrarFirmas" className="text-xs font-semibold text-slate-600 cursor-pointer">
                        Mostrar firmas de responsables
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        id="oeMostrarSello"
                        type="checkbox"
                        checked={ordenEntrega.mostrarSello !== false}
                        onChange={async (e) => {
                          const val = e.target.checked;
                          const toastId = toast.loading('Guardando preferencia...');
                          try {
                            const res = await updateOrdenEntrega(ordenEntrega.id, { mostrarSello: val });
                            if (res.success && res.orden) {
                              setOrdenEntrega(res.orden);
                              toast.success('Preferencia guardada', { id: toastId });
                            } else {
                              throw new Error(res.error);
                            }
                          } catch (err: any) {
                            toast.error(err.message || 'Error al actualizar', { id: toastId });
                          }
                        }}
                        className="h-4.5 w-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="oeMostrarSello" className="text-xs font-semibold text-slate-600 cursor-pointer">
                        Mostrar sello de Bioelectrónica
                      </label>
                    </div>

                    {ordenEntrega.mostrarFirmas !== false && (
                      <div className="space-y-3 pt-2 border-t border-slate-200/60">
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lista de Firmantes</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setShowDirectSignatureModal(true)}
                              className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl transition-all active:scale-95 border border-emerald-200/50 w-full"
                              title="Firmar directamente en esta pantalla"
                            >
                              <PenTool size={11} /> Firmar en Pantalla
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowShareSignatureModal(true)}
                              className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-xl transition-all active:scale-95 border border-indigo-200/50 w-full"
                              title="Enviar enlace al celular del cliente para firmar"
                            >
                              <Smartphone size={11} /> Celular
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {signaturesList.map((sig, idx) => (
                            <div key={sig.id || idx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 relative shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-700">Firmante #{idx + 1}</span>
                                <div className="flex items-center gap-2">
                                  {signaturesList.length > 1 && (
                                    <button
                                      onClick={() => deleteSignature(idx)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                      title="Eliminar Firmante"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => updateSignature(idx, 'enabled', !sig.enabled)}
                                    className={`w-8 h-4 rounded-full transition-all relative ${
                                      sig.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                                    }`}
                                  >
                                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                                      sig.enabled ? 'left-4.5' : 'left-0.5'
                                    }`} />
                                  </button>
                                </div>
                              </div>

                              {sig.enabled && (
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Nombre</label>
                                    <input
                                      type="text"
                                      value={sig.name}
                                      onChange={e => updateSignature(idx, 'name', e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                      placeholder="Nombre"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Cargo</label>
                                    <input
                                      type="text"
                                      value={sig.role}
                                      onChange={e => updateSignature(idx, 'role', e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                      placeholder="Cargo"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Firma</label>
                                    <div 
                                      onClick={() => {
                                        setActiveLibraryType('signature');
                                        setActiveSigIndex(idx);
                                      }}
                                      className="flex items-center justify-between border border-slate-200 rounded-lg p-2 bg-slate-50 hover:border-indigo-400 cursor-pointer transition-all"
                                    >
                                      <div className="h-8 w-20 flex items-center justify-center bg-white rounded overflow-hidden">
                                        {sig.imageUrl ? (
                                          <img src={sig.imageUrl} alt="Firma" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                        ) : (
                                          <span className="text-[9px] text-slate-400 font-semibold">Seleccionar...</span>
                                        )}
                                      </div>
                                      <span className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700">Cambiar</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1 pt-1.5 border-t border-slate-100 mt-2">
                                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                                      <span>Alineación Vertical Individual:</span>
                                      <span className="font-bold text-slate-700">{sig.offsetY ?? 0}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-60" max="60" step="1"
                                      value={sig.offsetY ?? 0}
                                      onChange={e => updateSignature(idx, 'offsetY', Number(e.target.value))}
                                      className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                                    />
                                  </div>
                                  <div className="space-y-1 pt-1.5">
                                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                                      <span>Alineación Horizontal Individual:</span>
                                      <span className="font-bold text-slate-700">{sig.offsetX ?? 0}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-60" max="60" step="1"
                                      value={sig.offsetX ?? 0}
                                      onChange={e => updateSignature(idx, 'offsetX', Number(e.target.value))}
                                      className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                                    />
                                  </div>
                                  <div className="space-y-1 pt-1.5">
                                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                                      <span>Alto de la Firma Individual:</span>
                                      <span className="font-bold text-slate-700">{sig.height ?? settings.signatureHeight ?? 64}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="30" max="200" step="2"
                                      value={sig.height ?? settings.signatureHeight ?? 64}
                                      onChange={e => updateSignature(idx, 'height', Number(e.target.value))}
                                      className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={addSignature}
                          className="w-full py-2 bg-white hover:bg-slate-100 text-indigo-650 hover:text-indigo-755 text-xs font-bold rounded-xl transition-all border border-dashed border-slate-350 flex items-center justify-center gap-1.5"
                        >
                          <Plus size={12} /> Agregar Firmante
                        </button>
                      </div>
                    )}

                    {/* Controles deslizantes para cambiar el tamaño de las firmas y del sello */}
                    <div className="pt-3 border-t border-slate-200/60 space-y-3">
                      {ordenEntrega.mostrarFirmas !== false && (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-slate-600">
                              <span className="font-semibold">Alto de las Firmas:</span>
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.signatureHeight ?? 64}px</span>
                            </div>
                            <input
                              type="range"
                              min="30"
                              max="180"
                              value={settings.signatureHeight ?? 64}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newSettings = { ...settings, signatureHeight: val };
                                setSettings(newSettings);
                              }}
                              onMouseUp={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              onTouchEnd={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-slate-600">
                              <span className="font-semibold">Posición de las Firmas (Subir/Bajar):</span>
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.signatureSpacing ?? 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-30"
                              max="50"
                              value={settings.signatureSpacing ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newSettings = { ...settings, signatureSpacing: val };
                                setSettings(newSettings);
                              }}
                              onMouseUp={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              onTouchEnd={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </>
                      )}

                      {ordenEntrega.mostrarSello !== false && (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-slate-600">
                              <span className="font-semibold">Tamaño del Sello:</span>
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.sealSize ?? 112}px</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="230"
                              value={settings.sealSize ?? 112}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newSettings = { ...settings, sealSize: val };
                                setSettings(newSettings);
                              }}
                              onMouseUp={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              onTouchEnd={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-slate-600">
                              <span className="font-semibold">Ajuste Horizontal Sello (Mover Izq/Der):</span>
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.companySealX ?? 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-300"
                              max="150"
                              step="2"
                              value={settings.companySealX ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newSettings = { ...settings, companySealX: val };
                                setSettings(newSettings);
                              }}
                              onMouseUp={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              onTouchEnd={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-slate-600">
                              <span className="font-semibold">Ajuste Vertical Sello (Subir/Bajar):</span>
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.companySealY ?? 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-200"
                              max="200"
                              step="2"
                              value={settings.companySealY ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newSettings = { ...settings, companySealY: val };
                                setSettings(newSettings);
                              }}
                              onMouseUp={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              onTouchEnd={() => {
                                handleSaveTemplateSettings(settings);
                              }}
                              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </>
                      )}

                      {/* Ajustes de Garantía (Warranty Certificate settings) */}
                      <div className="pt-3 border-t border-slate-200/60 space-y-3">
                        <h5 className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block pt-2 border-t border-slate-200/60">
                          🛡️ Ajustes Certificado de Garantía
                        </h5>
                        
                        {/* 1. Alto de Firma Garantía */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-slate-600">
                            <span className="font-semibold">Alto de Firma (Garantía):</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.warrantySignatureHeight ?? 120}px</span>
                          </div>
                          <input
                            type="range"
                            min="30"
                            max="200"
                            value={settings.warrantySignatureHeight ?? 120}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newSettings = { ...settings, warrantySignatureHeight: val };
                              setSettings(newSettings);
                            }}
                            onMouseUp={() => handleSaveTemplateSettings(settings)}
                            onTouchEnd={() => handleSaveTemplateSettings(settings)}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 2. Ajuste Horizontal Firma (Mover Izq/Der) */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-slate-600">
                            <span className="font-semibold">Firma Horizontal (Izq/Der):</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.warrantySignatureX ?? 0}px</span>
                          </div>
                          <input
                            type="range"
                            min="-150"
                            max="150"
                            step="1"
                            value={settings.warrantySignatureX ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newSettings = { ...settings, warrantySignatureX: val };
                              setSettings(newSettings);
                            }}
                            onMouseUp={() => handleSaveTemplateSettings(settings)}
                            onTouchEnd={() => handleSaveTemplateSettings(settings)}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 3. Ajuste Vertical Firma (Subir/Bajar) */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-slate-600">
                            <span className="font-semibold">Firma Vertical (Subir/Bajar):</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.warrantySignatureY ?? 0}px</span>
                          </div>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            step="1"
                            value={settings.warrantySignatureY ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newSettings = { ...settings, warrantySignatureY: val };
                              setSettings(newSettings);
                            }}
                            onMouseUp={() => handleSaveTemplateSettings(settings)}
                            onTouchEnd={() => handleSaveTemplateSettings(settings)}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 4. Tamaño del Sello Garantía */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-slate-600">
                            <span className="font-semibold">Tamaño del Sello (Garantía):</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.warrantySealSize ?? 112}px</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="250"
                            value={settings.warrantySealSize ?? 112}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newSettings = { ...settings, warrantySealSize: val };
                              setSettings(newSettings);
                            }}
                            onMouseUp={() => handleSaveTemplateSettings(settings)}
                            onTouchEnd={() => handleSaveTemplateSettings(settings)}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 5. Ajuste Horizontal Sello Garantía (Mover Izq/Der) */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-slate-600">
                            <span className="font-semibold">Sello Horizontal (Izq/Der):</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.warrantySealX ?? 0}px</span>
                          </div>
                          <input
                            type="range"
                            min="-150"
                            max="150"
                            step="1"
                            value={settings.warrantySealX ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newSettings = { ...settings, warrantySealX: val };
                              setSettings(newSettings);
                            }}
                            onMouseUp={() => handleSaveTemplateSettings(settings)}
                            onTouchEnd={() => handleSaveTemplateSettings(settings)}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 6. Ajuste Vertical Sello Garantía (Subir/Bajar) */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-slate-600">
                            <span className="font-semibold">Sello Vertical (Subir/Bajar):</span>
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{settings.warrantySealY ?? 0}px</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            step="1"
                            value={settings.warrantySealY ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newSettings = { ...settings, warrantySealY: val };
                              setSettings(newSettings);
                            }}
                            onMouseUp={() => handleSaveTemplateSettings(settings)}
                            onTouchEnd={() => handleSaveTemplateSettings(settings)}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={async () => {
                            const toastId = toast.loading('Guardando ajustes como predeterminados para toda la empresa...');
                            try {
                              const res = await updateOrganizationDefaultSettings(settings);
                              if (res.success) {
                                toast.success('¡Ajustes establecidos como predeterminados con éxito!', { id: toastId });
                              } else {
                                throw new Error(res.error);
                              }
                            } catch (err: any) {
                              toast.error(err.message || 'Error al guardar predeterminados', { id: toastId });
                            }
                          }}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow active:scale-[0.98] cursor-pointer"
                        >
                          💾 Guardar Diseño como Predeterminado
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Evidencia fotográfica R2 uploader */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      📷 Evidencias de Entrega
                    </h4>
                    
                    {/* Listado de Fotos con Descripción */}
                    <div className="space-y-3">
                      {(ordenEntrega.evidenciaFotos || []).map((foto: string, index: number) => {
                        const desc = (ordenEntrega.evidenciaFotosDesc || [])[index] || "";
                        return (
                          <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 relative group">
                            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-100 shadow-sm flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={foto} alt={`Evidencia ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => window.open(foto, '_blank')}
                                  className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 shadow"
                                  title="Ver en pantalla completa"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm('¿Deseas eliminar esta foto de evidencia?')) return;
                                    const toastId = toast.loading('Eliminando foto...');
                                    try {
                                      const newFotos = ordenEntrega.evidenciaFotos.filter((_: string, idx: number) => idx !== index);
                                      const newDescs = (ordenEntrega.evidenciaFotosDesc || []).filter((_: string, idx: number) => idx !== index);
                                      const res = await updateOrdenEntrega(ordenEntrega.id, { evidenciaFotos: newFotos, evidenciaFotosDesc: newDescs });
                                      if (res.success && res.orden) {
                                        setOrdenEntrega(res.orden);
                                        toast.success('Evidencia eliminada', { id: toastId });
                                      } else {
                                        throw new Error(res.error);
                                      }
                                    } catch (err: any) {
                                      toast.error(err.message || 'Error al eliminar', { id: toastId });
                                    }
                                  }}
                                  className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow"
                                  title="Eliminar foto"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Campo de descripción */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Descripción #{index + 1}
                              </label>
                              <input
                                type="text"
                                value={desc}
                                placeholder="Ej: Orring dañado por uso de siliconas..."
                                onChange={(e) => {
                                  const newDescs = [...(ordenEntrega.evidenciaFotosDesc || [])];
                                  while (newDescs.length < ordenEntrega.evidenciaFotos.length) {
                                    newDescs.push("");
                                  }
                                  newDescs[index] = e.target.value;
                                  setOrdenEntrega((p: any) => ({
                                    ...p,
                                    evidenciaFotosDesc: newDescs
                                  }));
                                }}
                                onBlur={async (e) => {
                                  const newDescs = [...(ordenEntrega.evidenciaFotosDesc || [])];
                                  while (newDescs.length < ordenEntrega.evidenciaFotos.length) {
                                    newDescs.push("");
                                  }
                                  newDescs[index] = e.target.value;
                                  try {
                                    const res = await updateOrdenEntrega(ordenEntrega.id, { evidenciaFotosDesc: newDescs });
                                    if (res.success && res.orden) {
                                      setOrdenEntrega(res.orden);
                                    }
                                  } catch (err) {
                                    console.error("Error saving photo description:", err);
                                  }
                                }}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {ordenEntrega.evidenciaFotos?.length === 0 && (
                      <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400 font-medium">
                        No se han subido fotos de evidencia
                      </div>
                    )}

                    {/* Upload button */}
                    <div>
                      <label className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/10 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 ${isUploadingFoto ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                        <Download size={14} />
                        {isUploadingFoto ? 'Subiendo archivo...' : 'Subir Foto de Evidencia'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingFoto(true);
                            const toastId = toast.loading('Subiendo evidencia a R2...');
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              formData.append('fileName', `entrega_${Date.now()}_${file.name}`);
                              
                              const uploadRes = await fetch('/api/upload/inventario', {
                                method: 'POST',
                                body: formData
                              });
                              if (!uploadRes.ok) throw new Error('Error al subir la foto');
                              const data = await uploadRes.json();
                              
                              const updatedFotos = [...(ordenEntrega.evidenciaFotos || []), data.publicUrl];
                              const updatedDescs = [...(ordenEntrega.evidenciaFotosDesc || []), ""];
                              const saveRes = await updateOrdenEntrega(ordenEntrega.id, { evidenciaFotos: updatedFotos, evidenciaFotosDesc: updatedDescs });
                              if (saveRes.success && saveRes.orden) {
                                setOrdenEntrega(saveRes.orden);
                                toast.success('Evidencia subida correctamente', { id: toastId });
                              } else {
                                throw new Error(saveRes.error || 'Error al guardar la foto en base de datos');
                              }
                            } catch (err: any) {
                              toast.error(err.message || 'Error al subir foto', { id: toastId });
                            } finally {
                              setIsUploadingFoto(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs text-slate-400 font-medium">Inicializando Orden de Entrega...</p>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Flap/Tab when hidden */}
        {viewMode && docType === 'factura' && !isLocked && !showOrdenEntregaPanel && (
          <button
            type="button"
            onClick={() => setShowOrdenEntregaPanel(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-45 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 px-2.5 rounded-l-2xl shadow-lg border-l border-y border-indigo-500 transition-all hover:pr-3.5 flex items-center justify-center gap-1.5 print:hidden"
            style={{ writingMode: 'vertical-lr' }}
          >
            <span className="text-[10px] tracking-widest font-black flex items-center gap-1.5 transform rotate-180 select-none">
              🚚 ORDEN DE ENTREGA
            </span>
          </button>
        )}

      </div>

      {/* ─── MODALS ────────────────────────────────────────────────── */}
      {imagePickerItem && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 print:hidden animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4 animate-duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud size={18} className="text-indigo-600" /> Seleccionar Imagen del Ítem
              </h3>
              <button 
                onClick={() => setImagePickerItem(null)} 
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Option 1: Upload Custom Photo */}
              <div>
                <h4 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-3">Subir nueva imagen</h4>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadPickerImage}
                  id="picker-upload-file"
                  className="hidden"
                  disabled={isUploadingLineImage}
                />
                <label
                  htmlFor="picker-upload-file"
                  className={`border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-indigo-50/20 group relative overflow-hidden ${isUploadingLineImage ? 'pointer-events-none' : ''}`}
                >
                  {isUploadingLineImage ? (
                    <div className="flex flex-col items-center py-2">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                      <span className="text-xs font-semibold text-slate-500">Subiendo imagen a la nube...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-550 transition-colors mb-2" />
                      <span className="text-xs font-bold text-slate-700">Haz clic para buscar o arrastra una imagen</span>
                      <span className="text-[10px] text-slate-400 mt-1 font-medium">Formatos soportados: PNG, JPG, JPEG, WEBP</span>
                    </>
                  )}
                </label>
              </div>

              {/* Option 2: Choose from OT Photos (if available) */}
              {ordenTrabajoId && (
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-3">Imágenes de la Orden de Trabajo</h4>
                  {loadingOtImages ? (
                    <div className="flex items-center justify-center py-6 gap-2">
                      <Loader2 className="w-5 h-5 text-indigo-650 animate-spin" />
                      <span className="text-xs font-medium text-slate-500">Cargando fotos de la orden...</span>
                    </div>
                  ) : otImages.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      No se encontraron fotos asociadas a esta Orden de Trabajo.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {otImages.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPickerImage(url)}
                          className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow transition-all group cursor-pointer active:scale-95 flex items-center justify-center"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-indigo-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-extrabold text-white bg-indigo-600 px-2 py-0.5 rounded-full shadow-sm">
                              Seleccionar
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Option 3: Remove Current Image (if any) */}
              {imagePickerItem.currentUrl && (
                <div className="border-t border-slate-100 pt-5 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Quitar imagen actual</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5">El ítem ya no mostrará miniatura en el documento.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPickerImage('')}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Quitar Imagen
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setImagePickerItem(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showWorkOrderModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 print:hidden animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Wrench size={18} className="text-indigo-650" /> Extraer Orden de Trabajo
              </h3>
              <button 
                onClick={() => setShowWorkOrderModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={workOrderSearch}
                  onChange={e => setWorkOrderSearch(e.target.value)}
                  placeholder="Buscar por código de orden, cliente, equipo, modelo, marca o serie..."
                  className="w-full pl-11 pr-4 py-3 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto p-4 bg-slate-50/50 flex-1 min-h-[300px]">
              {loadingWorkOrders ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-650 animate-spin mb-2" />
                  <p className="text-xs text-slate-550 font-medium">Buscando órdenes de trabajo...</p>
                </div>
              ) : workOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <ClipboardList size={40} className="stroke-[1.5] mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No se encontraron órdenes de trabajo.</p>
                  <p className="text-xs text-slate-450 mt-1 max-w-sm">Intenta buscar por otro término, o verifica que la orden esté registrada en el sistema.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.map((ot) => {
                    const firstPhoto = ot.fotosEstadoInicial?.[0] || ot.repuestos?.[0]?.imageUrl || null;
                    const mainCost = ot.costoReparacion > 0 ? ot.costoReparacion : ot.costoRevision;
                    
                    return (
                      <button
                        key={ot.id}
                        type="button"
                        onClick={() => handleSelectWorkOrder(ot)}
                        className="w-full flex items-center gap-4 p-3.5 bg-white border border-slate-150 hover:border-indigo-300 rounded-2xl transition-all shadow-sm hover:shadow-md text-left cursor-pointer group active:scale-[0.99] select-none"
                      >
                        {/* Equipment Image or Icon */}
                        <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-200 shadow-inner group-hover:border-indigo-100">
                          {firstPhoto ? (
                            <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ClipboardList className="w-6 h-6 text-slate-400 group-hover:text-indigo-550 transition-colors" />
                          )}
                        </div>
                        
                        {/* Middle Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              #{ot.codigoSeguridad}
                            </span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase">
                              {ot.estado}
                            </span>
                            {ot.tipoTrabajo && (
                              <span className="text-[9px] font-semibold text-slate-400 capitalize">
                                • {ot.tipoTrabajo.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                            {ot.equipoDano}
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                            Cliente: <span className="text-slate-800 font-bold">{ot.cliente?.name || 'Desconocido'}</span>
                          </p>
                          {(ot.marcaModelo || ot.serie) && (
                            <p className="text-[10px] text-slate-400 mt-1 truncate">
                              {ot.marcaModelo ? `Modelo: ${ot.marcaModelo}` : ''}
                              {ot.marcaModelo && ot.serie ? ' | ' : ''}
                              {ot.serie ? `Serie: ${ot.serie}` : ''}
                            </p>
                          )}
                        </div>
                        
                        {/* Cost Side */}
                        <div className="text-right shrink-0">
                          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Costo Estimado</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5 group-hover:text-indigo-700 transition-colors font-mono">
                            L. {mainCost.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 group-hover:translate-x-1 transition-transform mt-1">
                            Extraer <ArrowRight size={10} className="stroke-[2.5]" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWorkOrderModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showClientModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 print:hidden animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <User size={18} className="text-blue-600" /> Seleccionar Cliente
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewClientModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus size={14} /> Nuevo
                </button>
                <button onClick={() => setShowClientModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Buscar nombre o RTN..."
                  className="w-full pl-11 pr-4 py-3 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2 bg-slate-50/50 flex-1">
              {/* Cliente Seleccionado en la parte superior */}
              {selectedClient && !clientSearch && (
                <div className="mb-3 pb-3 border-b border-slate-200">
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider px-2 block mb-1.5">Cliente Seleccionado</span>
                  <div
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-all text-left bg-blue-50 ring-1 ring-blue-200"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowClientModal(false);
                      }}
                      className="flex-1 flex items-center gap-4 text-left min-w-0"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-600 text-white shadow-sm">
                        <Building2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{selectedClient.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{selectedClient.rtn || 'Sin RTN'} • {selectedClient.category}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClientId(selectedClient.id);
                          setNewClientData({
                            nombre: selectedClient.name,
                            email: selectedClient.email || '',
                            telefono: selectedClient.phone || '',
                            rtn: selectedClient.rtn || '',
                            direccion: selectedClient.address || '',
                            nombreContacto: selectedClient.nombreContacto || '',
                            telefonoContacto: selectedClient.telefonoContacto || ''
                          });
                          setShowNewClientModal(true);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        title="Editar Contacto"
                      >
                        <Pencil size={15} />
                      </button>
                      <CheckCircle2 size={18} className="text-blue-600 shrink-0 mx-1" />
                    </div>
                  </div>
                </div>
              )}

              {filteredClients.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>No se encontraron clientes.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClients.map(client => (
                    <div
                      key={client.id}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group ${selectedClient?.id === client.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white border border-slate-100 hover:bg-blue-50/30'}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(client);
                          setShowClientModal(false);
                        }}
                        className="flex-1 flex items-center gap-4 text-left min-w-0"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${selectedClient?.id === client.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                          <Building2 size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{client.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{client.rtn || 'Sin RTN'} • {client.category}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClientId(client.id);
                            setNewClientData({
                              nombre: client.name,
                              email: client.email || '',
                              telefono: client.phone || '',
                              rtn: client.rtn || '',
                              direccion: client.address || '',
                              nombreContacto: client.nombreContacto || '',
                              telefonoContacto: client.telefonoContacto || ''
                            });
                            setShowNewClientModal(true);
                          }}
                          className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar Contacto"
                        >
                          <Pencil size={15} />
                        </button>
                        {selectedClient?.id === client.id && <CheckCircle2 size={18} className="text-blue-600 shrink-0 mx-1" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 print:hidden animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-blue-600" /> Catálogo Médico
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Buscar equipo, marca o código..."
                    className="w-full pl-11 pr-4 py-3 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowExpiredOnly(!showExpiredOnly)}
                  className={`px-4 py-3 rounded-xl text-xs font-semibold border-2 transition-all flex items-center justify-center whitespace-nowrap ${showExpiredOnly ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  title="Mostrar solo productos vencidos"
                >
                  <AlertCircle size={14} className="mr-1.5" />
                  Vencidos
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 bg-slate-50/50 flex-1">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>No se encontraron productos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(product => (
                    <ProductSearchItem key={product.id} product={product} onAdd={addProduct} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewClientModal && (
        <div className="fixed inset-0 z-[65] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">
                        Nuevo Contacto
                    </h2>
                    <button onClick={() => setShowNewClientModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Nombre / Empresa <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="Ej: Juan Perez, Empresa S.A."
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                            value={newClientData.nombre}
                            onChange={e => setNewClientData({ ...newClientData, nombre: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Teléfono Empresa</label>
                            <input
                                type="tel"
                                placeholder="+504 0000..."
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                value={newClientData.telefono}
                                onChange={e => setNewClientData({ ...newClientData, telefono: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">RTN / NIT</label>
                            <input
                                type="text"
                                placeholder="No. Identidad o RTN"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                value={newClientData.rtn}
                                onChange={e => setNewClientData({ ...newClientData, rtn: e.target.value })}
                            />
                        </div>
                    </div>
                    
                    {/* Contact Person Details Section */}
                    <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Datos del Contacto Directo (Encargado)</span>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Nombre de Contacto</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Encargado de Compras"
                                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                    value={newClientData.nombreContacto || ''}
                                    onChange={e => setNewClientData({ ...newClientData, nombreContacto: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Teléfono Contacto</label>
                                <input
                                    type="tel"
                                    placeholder="Celular o Directo"
                                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                    value={newClientData.telefonoContacto || ''}
                                    onChange={e => setNewClientData({ ...newClientData, telefonoContacto: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Correo Electrónico</label>
                        <input
                            type="email"
                            placeholder="contacto@empresa.com"
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                            value={newClientData.email}
                            onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Dirección</label>
                        <textarea
                            placeholder="Dirección física..."
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800 min-h-[80px] resize-none"
                            value={newClientData.direccion}
                            onChange={e => setNewClientData({ ...newClientData, direccion: e.target.value })}
                        />
                    </div>
                </div>
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                    <button
                        onClick={() => { setShowNewClientModal(false); setEditingClientId(null); setNewClientData({ nombre: '', email: '', telefono: '', rtn: '', direccion: '', nombreContacto: '', telefonoContacto: '' }); }}
                        className="px-5 py-2.5 rounded-xl font-semibold text-slate-550 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={isCreatingClient}
                        onClick={handleCreateClient}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isCreatingClient ? 'Guardando...' : 'Guardar Contacto'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showCustomizer && (
        <InvoiceCustomizerSidebar
          settings={settings}
          onChange={(key, val) => {
            setSettings(p => {
              const next = { ...p, [key]: val };
              handleSaveTemplateSettings(next);
              return next;
            });
          }}
          onLoadTemplate={(tplSettings) => {
            setSettings(tplSettings);
            handleSaveTemplateSettings(tplSettings);
          }}
          onApplyTerms={handleApplyTerms}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in transition-all">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center flex flex-col items-center gap-4 animate-in zoom-in-95 data-[state=open]:zoom-in-90 relative overflow-hidden">
            {/* Boton X para cerrar */}
            <button 
              onClick={() => setShowSuccessModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>
            {/* Confetti / Decorator */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
            
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center -mb-2 mt-2 ring-8 ring-emerald-50">
              <CheckCircle2 size={40} className="text-emerald-500 stroke-[2.5]" />
            </div>
            
            <div className="space-y-1 mt-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">¡Guardado Exitoso!</h2>
              <p className="text-slate-500 font-medium">{showSuccessModal.format === 'factura' ? 'Factura emitida' : 'Documento guardado'} correctamente.</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full mt-2">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Correlativo</p>
              <p className={`${settings?.useMonospaceNumbers !== false ? 'font-mono' : ''} text-lg font-bold text-slate-800`}>{showSuccessModal.correlativo}</p>
            </div>

            <div className="flex gap-3 w-full mt-4">
              {isPrintIframe ? (
                <>
                  <button
                    onClick={() => {
                      setShowSuccessModal(null);
                      if (window.parent) {
                        window.parent.postMessage({ type: 'close-modal-reload' }, '*');
                      }
                    }}
                    className="flex-1 py-3 px-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-xs cursor-pointer"
                  >
                    Volver a la Orden
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModal(null);
                      router.push(`/print/${showSuccessModal.docId}`);
                    }}
                    className="flex-[1.2] py-3 px-3 bg-emerald-600 border-2 border-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 hover:border-emerald-700 hover:shadow-lg transition-all text-xs cursor-pointer"
                  >
                    Ver Vista Previa
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowSuccessModal(null);
                      const otId = ordenTrabajoId;
                      if (otId) {
                        router.push(`/soporte/${otId}`);
                      } else {
                        router.push('/facturas');
                      }
                    }}
                    className="flex-1 py-3 px-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                  >
                    {ordenTrabajoId ? 'Volver a la Orden' : 'Hacer Nuevo'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModal(null);
                      router.push(`/facturas/ver/${showSuccessModal.docId}`);
                    }}
                    className="flex-[1.5] py-3 px-4 bg-emerald-600 border-2 border-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 hover:border-emerald-700 hover:shadow-lg transition-all cursor-pointer"
                  >
                    Ver Documento
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDiscardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-red-50/50">
              <Trash2 size={32} className="stroke-[2.5]" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 text-center mb-2 tracking-tight">¿Descartar Borrador?</h3>
            <p className="text-sm text-slate-500 text-center mb-8 font-medium px-2 leading-relaxed">
              Perderás todo el progreso ingresado en este documento y limpiarás la memoria para un archivo nuevo.
            </p>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowDiscardModal(false)}
                className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors"
                title="Mantener borrador"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearLocalDraft();
                  window.location.reload();
                }}
                className="flex-[1.5] py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all"
              >
                Sí, Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-amber-50/50">
              <AlertCircle size={32} className="stroke-[2.5]" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 text-center mb-2 tracking-tight">Acceso Restringido</h3>
            <p className="text-sm text-slate-500 text-center mb-6 font-medium px-2 leading-relaxed">
              Esta factura ya fue emitida. Requiere un rol de administrador o un privilegio asignado para modificar información sensible de documentos emitidos.
            </p>
            
            <div className="w-full">
              <button
                onClick={() => setShowAdminWarningModal(false)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showActionsModal && (
        <DocumentActionsModal
          onClose={() => setShowActionsModal(false)}
          onDownloadPDF={handleDownloadPDF}
          onToggleCustomizer={() => setShowCustomizer(!showCustomizer)}
          onShowOrdenEntrega={() => setShowOrdenEntregaPanel(true)}
          onConvert={(!isLocked && !isAnulada && !isConvertida && initialData?.id) ? handleConvert : undefined}
          onSendEmail={initialData?.id ? async () => {
            await handleSilentSave();
            setSendEmailDocId(initialData.id);
            setSendEmailModalOpen(true);
          } : undefined}
          isDownloadingPDF={isDownloadingPDF}
          isConverting={isConverting}
          docType={
            (initialData?.tipoDocumento?.toLowerCase() === 'presupuesto_reparacion' || 
             initialData?.tipoDocumento?.toLowerCase() === 'presupuesto_mantenimiento')
              ? 'cotizacion'
              : (initialData?.tipoDocumento?.toLowerCase() || docType)
          }
          estaVencida={estaVencida}
          isEmitida={initialData?.estado === 'EMITIDA'}
        />
      )}

      {sendEmailModalOpen && (
        <SendEmailModal
          isOpen={sendEmailModalOpen}
          onClose={() => {
            setSendEmailModalOpen(false);
            setSendEmailDocId('');
          }}
          documentoId={sendEmailDocId}
        />
      )}

      {showConvertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col">
            
            {/* Icon and Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles size={24} className="stroke-[2]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  Convertir a {showConvertModal.nuevoTipo === 'PROFORMA' ? 'Pro Forma' : 'Factura Oficial'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  El documento actual ({initialData?.correlativo}) cambiará de categoría.
                </p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 my-4">
              {/* Payment Method Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-450 uppercase tracking-widest">
                  Método de Pago
                </label>
                <select
                  value={convertPaymentMethod}
                  onChange={(e) => setConvertPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-semibold text-slate-800"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Link de pago de Occidente">Link de pago de Occidente</option>
                </select>
              </div>

              {/* Status Select (only if FACTURA) */}
              {showConvertModal.nuevoTipo === 'FACTURA' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-450 uppercase tracking-widest">
                    Estado de la Factura
                  </label>
                  <select
                    value={convertEstado}
                    onChange={(e) => setConvertEstado(e.target.value as 'EMITIDA' | 'BORRADOR')}
                    className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-semibold text-slate-800"
                  >
                    <option value="EMITIDA">Emitida (Oficial e inmutable)</option>
                    <option value="BORRADOR">Borrador (No emitida, editable)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Warning Message */}
            <div className="text-xs text-slate-650 leading-relaxed mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1.5">
              {showConvertModal.nuevoTipo === 'FACTURA' && convertEstado === 'EMITIDA' ? (
                <>
                  <p className="font-bold text-amber-600 flex items-center gap-1.5">
                    <span>⚠️</span> Emisión Inmediata
                  </p>
                  <p className="text-slate-500 font-medium">
                    Al emitir la factura se descontará el inventario, se asociará a la caja del turno actual y se bloqueará su edición para roles no administrativos.
                  </p>
                </>
              ) : showConvertModal.nuevoTipo === 'FACTURA' && convertEstado === 'BORRADOR' ? (
                <>
                  <p className="font-bold text-indigo-650 flex items-center gap-1.5">
                    <span>📝</span> Guardar como Borrador
                  </p>
                  <p className="text-slate-500 font-medium">
                    Se creará una factura en borrador. No afectará el inventario ni el cierre de caja actual hasta que sea editada y emitida oficialmente.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>ℹ️</span> Conversión Pro Forma
                  </p>
                  <p className="text-slate-500 font-medium">
                    Se generará el documento Pro Forma correspondiente a partir de los datos actuales.
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowConvertModal(null)}
                className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isConverting}
                onClick={async () => {
                  setIsConverting(true);
                  try {
                    const res = await convertirDocumento(initialData!.id, showConvertModal.nuevoTipo, {
                      metodoPago: convertPaymentMethod,
                      estado: convertEstado
                    });
                    if (res.success && res.nuevoId) {
                      toast.success(`Documento convertido exitosamente`);
                      setShowConvertModal(null);
                      if (showConvertModal.nuevoTipo === 'FACTURA' && convertEstado === 'BORRADOR') {
                        router.push(`/facturas/${res.nuevoId}`);
                      } else {
                        router.push(`/facturas/ver/${res.nuevoId}`);
                      }
                    } else {
                      toast.error(res.error || 'Error al convertir el documento');
                    }
                  } catch (e: any) {
                    toast.error(e.message || 'Error al convertir');
                  } finally {
                    setIsConverting(false);
                  }
                }}
                className="flex-[1.5] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all text-xs flex items-center justify-center gap-2"
              >
                {isConverting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  'Confirmar Conversión'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal overlay for images */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[5000] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 print:hidden"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 bg-white/10 text-white p-3 rounded-full hover:bg-white/25 transition-colors border border-white/20"
            onClick={() => setLightboxImage(null)}
            title="Cerrar vista"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={lightboxImage} 
            alt="Vista Ampliada" 
            className="w-[600px] max-w-full h-auto max-h-[80vh] object-contain bg-white p-4 rounded-xl shadow-2xl ring-1 ring-white/10" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ActivoModal for registering a new product/asset */}
      {isActivoModalOpen && (
        <ActivoModal
          open={isActivoModalOpen}
          onClose={() => setIsActivoModalOpen(false)}
          dbAreas={dbAreas}
          onSuccess={handleRegisterSuccess}
        />
      )}

      {/* Library Modal for Signatures/Seals */}
      {activeLibraryType && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {activeLibraryType === 'signature' ? 'Biblioteca de Firmas' : 'Biblioteca de Sellos'}
              </h3>
              <button 
                onClick={() => {
                  setActiveLibraryType(null);
                  setActiveSigIndex(null);
                  setActiveSealField(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 max-h-[350px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {/* Upload Card */}
                <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-blue-50/20 aspect-square group">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file, activeLibraryType);
                        if (url) {
                          // Select the newly uploaded file automatically
                          if (activeLibraryType === 'signature' && activeSigIndex !== null) {
                            updateSignature(activeSigIndex, 'imageUrl', url);
                          } else if (activeLibraryType === 'seal') {
                            if (activeSealField === 'company') {
                              const newSettings = { ...settings, companySealUrl: url };
                              setSettings(newSettings);
                              handleSaveTemplateSettings(newSettings);
                            } else if (activeSealField === 'status') {
                              const newSettings = { ...settings, selectedStatusSeal: url };
                              setSettings(newSettings);
                              handleSaveTemplateSettings(newSettings);
                            }
                          }
                          setActiveLibraryType(null);
                          setActiveSigIndex(null);
                          setActiveSealField(null);
                        }
                      }
                    }}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
                      <span className="text-[9px] text-slate-400 font-bold">Subiendo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <UploadCloud className="text-indigo-650 group-hover:scale-110 transition-transform w-6 h-6" />
                      <span className="text-[10px] text-slate-500 font-bold">Subir PNG</span>
                    </div>
                  )}
                </label>

                {/* Library Items */}
                {(activeLibraryType === 'signature' ? signaturesLibrary : sealsLibrary).map((url, i) => {
                  const isSelected = activeLibraryType === 'signature'
                    ? (activeSigIndex !== null && signaturesList[activeSigIndex]?.imageUrl === url)
                    : (activeSealField === 'company' ? (settings.companySealUrl || '/firmas-sellos/SELLO DE BIOELECTRONICA.png') === url : settings.selectedStatusSeal === url);

                  const isDefault = url.startsWith('/firmas-sellos/');

                  return (
                    <div 
                      key={i} 
                      className={`relative rounded-xl border p-2 flex items-center justify-center cursor-pointer transition-all aspect-square bg-slate-50/50 hover:bg-white group ${
                        isSelected ? 'border-indigo-500 bg-white ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-400'
                      }`}
                      onClick={() => {
                        if (activeLibraryType === 'signature' && activeSigIndex !== null) {
                          updateSignature(activeSigIndex, 'imageUrl', url);
                        } else if (activeLibraryType === 'seal') {
                          if (activeSealField === 'company') {
                            const newSettings = { ...settings, companySealUrl: url };
                            setSettings(newSettings);
                            handleSaveTemplateSettings(newSettings);
                          } else if (activeSealField === 'status') {
                            const newSettings = { ...settings, selectedStatusSeal: url };
                            setSettings(newSettings);
                            handleSaveTemplateSettings(newSettings);
                          }
                        }
                        setActiveLibraryType(null);
                        setActiveSigIndex(null);
                        setActiveSealField(null);
                      }}
                    >
                      <img src={url} alt="Item" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      
                      {/* Delete button from library (only if not default) */}
                      {!isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar esta imagen de la biblioteca?')) {
                              if (activeLibraryType === 'signature') {
                                const newSettings = { ...settings, signaturesLibrary: signaturesLibrary.filter(u => u !== url) };
                                setSettings(newSettings);
                                handleSaveTemplateSettings(newSettings);
                              } else {
                                const newSettings = { ...settings, sealsLibrary: sealsLibrary.filter(u => u !== url) };
                                setSettings(newSettings);
                                handleSaveTemplateSettings(newSettings);
                              }
                            }
                          }}
                          className="absolute -top-1 -right-1 bg-red-100 hover:bg-red-200 text-red-655 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-red-200"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-right">
              <button 
                onClick={() => {
                  setActiveLibraryType(null);
                  setActiveSigIndex(null);
                  setActiveSealField(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-650 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareSignatureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[5000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-650 rounded-full flex items-center justify-center mb-4">
              <Smartphone size={24} className="stroke-[2.5]" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 text-center mb-1 tracking-tight">Firma Digital del Cliente</h3>
            <p className="text-xs text-slate-500 text-center mb-6 font-medium leading-relaxed px-2">
              Haz que el cliente escanee este código QR con su celular o tablet para abrir la pantalla de firma digital.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-150 mb-6 flex justify-center items-center shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/c/${initialData?.id}/entrega`)}`}
                alt="Código QR de Firma"
                className="w-[180px] h-[180px] object-contain rounded-xl shadow border border-white"
              />
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/c/${initialData?.id}/entrega`;
                  navigator.clipboard.writeText(url);
                  toast.success('Enlace de firma copiado al portapapeles');
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5 active:scale-98"
              >
                Copiar Enlace de Firma
              </button>
              <button
                onClick={() => setShowShareSignatureModal(false)}
                className="w-full py-3 bg-[#0500A3] hover:bg-[#040080] text-white font-bold rounded-2xl transition-all text-xs active:scale-98"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDirectSignatureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[5000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-650 rounded-full flex items-center justify-center">
                  <PenTool size={16} className="stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Firma del Cliente en Pantalla</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectSignatureModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              Por favor, solicite al cliente que dibuje su firma en el recuadro gris de abajo para firmar la entrega de la factura/orden de entrega.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-700">Dibuja la firma aquí *</span>
                <button
                  type="button"
                  onClick={() => {
                    sigCanvasRef.current?.clear();
                    setHasDirectSignatureDrawn(false);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-850 font-extrabold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                >
                  Limpiar
                </button>
              </div>
              
              <div 
                className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden relative touch-none h-[220px]"
              >
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="#0500A3"
                  canvasProps={{
                    width: 400,
                    height: 220,
                    className: 'sigCanvas touch-none w-full h-full'
                  }}
                  onBegin={() => setHasDirectSignatureDrawn(true)}
                />
                {!hasDirectSignatureDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 select-none">
                    <span className="font-serif italic text-sm text-slate-400">Firmar aquí</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDirectSignatureModal(false)}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                disabled={isSavingDirectSignature}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!hasDirectSignatureDrawn || sigCanvasRef.current?.isEmpty()) {
                    toast.error('Por favor dibuja la firma antes de guardar.');
                    return;
                  }
                  
                  setIsSavingDirectSignature(true);
                  const toastId = toast.loading('Guardando firma del cliente...');
                  try {
                    const dataUrl = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png');
                    const res = await fetch('/api/facturas/firmar-entrega', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ facturaId: initialData?.id, firmaDataUrl: dataUrl })
                    });
                    
                    if (res.ok) {
                      toast.success('¡Firma guardada correctamente!', { id: toastId });
                      setShowDirectSignatureModal(false);
                      // Recargar la página para que la firma aparezca en el PDF / entrega
                      window.location.reload();
                    } else {
                      const errData = await res.json();
                      throw new Error(errData.error || 'Ocurrió un error al guardar.');
                    }
                  } catch (e: any) {
                    toast.error(e.message || 'Error al conectar con el servidor.', { id: toastId });
                  } finally {
                    setIsSavingDirectSignature(false);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                disabled={isSavingDirectSignature || !hasDirectSignatureDrawn}
              >
                {isSavingDirectSignature ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> Guardar Firma
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
