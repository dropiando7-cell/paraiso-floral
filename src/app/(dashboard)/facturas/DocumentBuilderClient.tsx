'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
// html2canvas and jspdf are imported dynamically inside handleDownloadPDF to avoid SSR issues
import {
  Search, Plus, Trash2, ChevronDown, ChevronUp, GripVertical,
  User, Building2, FileText, Receipt, ClipboardList, Send,
  Package, Stethoscope, Zap, CheckCircle2, Clock, AlertCircle,
  X, Calculator, Download, Eye, MoreHorizontal, ArrowRight,
  Sparkles, Hash, Calendar, CreditCard, Percent, ChevronRight,
  Tag, Info, Copy, Printer, Mail, Phone, MapPin, Star, Palette
} from 'lucide-react';

// ─── TYPES ─────────────────────────────────────────────────────────────────

type DocType = 'cotizacion' | 'proforma' | 'factura';
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
  isSection?: boolean;
  sectionStyle?: {
    bg: string;
    color: string;
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
}

import { searchClientes, searchProductos, guardarDocumentoBuilder, buscarItemPorCodigo, actualizarDocumentoBuilder, reservarCorrelativoVacio } from './actions';
import { createContacto } from '../contactos/actions';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import InvoiceCustomizerSidebar from '@/components/facturas/customizer/InvoiceCustomizerSidebar';
import ModernTemplate from '@/components/facturas/templates/ModernTemplate';
import ClassicTemplate from '@/components/facturas/templates/ClassicTemplate';
import MinimalistTemplate from '@/components/facturas/templates/MinimalistTemplate';
import LegacyTemplate from '@/components/facturas/templates/LegacyTemplate';
import { InvoiceSettings, DEFAULT_INVOICE_SETTINGS } from '@/types/invoice';
import RichDescriptionEditor from '@/components/facturas/RichDescriptionEditor';
import { convertirDocumento } from './actions';




const DOC_TYPES: { key: DocType; label: string; icon: React.ReactNode; color: string; bg: string; description: string }[] = [
  { key: 'cotizacion', label: 'Cotización', icon: <FileText size={14} />, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Propuesta comercial formal' },
  { key: 'proforma', label: 'Pro Forma', icon: <Receipt size={14} />, color: 'text-violet-600', bg: 'bg-violet-50', description: 'Factura preliminar de exportación' },
  { key: 'factura', label: 'Factura Oficial', icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Documento fiscal definitivo' },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

const normalizeText = (text: string) => text ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
const fmt = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(n);
const uid = () => Math.random().toString(36).slice(2, 9);
const today = new Date().toISOString().split('T')[0];
const futureDate = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const emptyLine = (): LineItem => ({
  id: uid(), code: '', shortDesc: '', longDesc: '', richDesc: '', showLongDesc: false,
  qty: 1, unitPrice: '', tax: 'isv15', discount: 0, discountType: 'percentage',
});

const emptySectionLine = (): LineItem => ({
  id: uid(), code: '', shortDesc: '', longDesc: '', richDesc: '', showLongDesc: false,
  qty: 0, unitPrice: '', tax: 'exento', discount: 0, discountType: 'percentage',
  isSection: true,
  sectionStyle: { bg: '#f1f5f9', color: '#1e293b', bold: true, align: 'left' }
});

const calcLine = (item: LineItem) => {
  const q = Number(item.qty) || 0;
  const p = Number(item.unitPrice) || 0;
  const dVal = Number(item.discount) || 0;
  
  let dAmount = 0;
  if (item.discountType === 'amount') {
    dAmount = dVal; 
  } else {
    dAmount = (q * p) * (dVal / 100);
  }
  
  const base = q * p;
  const baseAfterDiscount = base - dAmount;

  let tax = 0;
  if (item.tax === 'isv15') tax = baseAfterDiscount * 0.15;
  if (item.tax === 'isv18') tax = baseAfterDiscount * 0.18;

  return { base, dAmount, baseAfterDiscount, tax, total: baseAfterDiscount + tax };
};

// ─── SUB COMPONENTS ────────────────────────────────────────────────────────

function DocTypeSelector({ value, onChange }: { value: DocType; onChange: (v: DocType) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
      {DOC_TYPES.map((dt, i) => {
        const active = value === dt.key;
        return (
          <button
            key={dt.key}
            onClick={() => onChange(dt.key)}
            title={dt.description}
            className={`
              relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
              transition-all duration-200 whitespace-nowrap
              ${active ? `bg-white shadow-md ${dt.color} shadow-slate-200` : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'}
            `}
          >
            {dt.icon}
            {dt.label}
            {i < DOC_TYPES.length - 1 && !active && (
              <ChevronRight size={10} className="ml-0.5 opacity-30" />
            )}
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
      <div className={`w-8 h-8 rounded-lg group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors ${product.type === 'activo' ? 'bg-indigo-50' : 'bg-slate-100'}`}>
        {product.type === 'activo' ? (
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
  item, index, onChange, onDelete, onDuplicate, onToggleLongDesc, allProducts, viewMode, settings
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
}) {
  const { base, tax, total } = calcLine(item);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [focusedField, setFocusedField] = useState<'code' | 'desc' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggable, setIsDraggable] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const shortDescRef = useRef<HTMLTextAreaElement>(null);
  const longDescRef = useRef<HTMLTextAreaElement>(null);

  const paddingClasses = ['py-0 print:py-0', 'py-[2px] print:py-[2px]', 'py-2 print:py-1', 'py-3 print:py-2', 'py-4 print:py-3'];
  const padClass = paddingClasses[settings?.tableRowPadding ?? 2] || 'py-2 print:py-1';

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
  const filteredProducts = query.trim().length >= 2 ? allProducts.filter(p => 
    normalizeText(p.name).includes(nQuery) || 
    normalizeText(p.code).includes(nQuery) ||
    (p.type === 'activo' && p.description && normalizeText(p.description).includes(nQuery))
  ).slice(0, 15) : [];

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
    
    if (!item.longDesc) onChange(item.id, 'longDesc', product.description);
    if (Number(item.unitPrice) === 0) onChange(item.id, 'unitPrice', product.price);
    
    if (product.type === 'producto') {
       onChange(item.id, 'productoId', product.id);
       onChange(item.id, 'activoId', undefined);
    }
    if (product.type === 'activo') {
       onChange(item.id, 'activoId', product.id);
       onChange(item.id, 'productoId', undefined);
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
              if (!item.longDesc) onChange(item.id, 'longDesc', res.description);
              if (Number(item.unitPrice) === 0) onChange(item.id, 'unitPrice', res.price);
              if (res.type === 'producto') onChange(item.id, 'productoId', res.id);
              if (res.type === 'activo') onChange(item.id, 'activoId', res.id);
              if (res.imageUrl) onChange(item.id, 'imageUrl', res.imageUrl);
            }
          } catch(e) { console.error('Error in code lookup:', e); }
        }
      }
    }
  };

  const renderDropdown = () => {
    if (!showAutocomplete || !focusedField || filteredProducts.length === 0) return null;
    return (
      <div className="absolute top-[calc(100%+4px)] left-0 w-[450px] z-[60] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto print:hidden">
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coincidencias en catálogo</span>
          <span className="text-[10px] font-medium text-slate-400">{filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
        <div className="p-1">
          {filteredProducts.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => handleSelectProduct(p)}
              className={`w-full text-left px-3 py-2 rounded-lg group flex flex-col gap-1 transition-colors ${idx === selectedIndex ? 'bg-blue-50' : 'hover:bg-blue-50/70'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 leading-tight">
                  {p.name}
                </p>
                <p className="text-xs font-black text-blue-600 shrink-0">{fmt(p.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${idx === selectedIndex ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>{p.code}</span>
                {p.type === 'activo' ? (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Activo Fijo</span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Stock: {p.stock}</span>
                )}
              </div>
              {p.type === 'activo' && p.description && (
                <p className="text-[10px] text-slate-500 mt-1 truncate">{p.description}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`group relative ${isDragOver ? 'border-t-[3px] border-blue-500' : ''} ${showAutocomplete ? 'z-[70]' : ''}`} 
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
        borderBottomWidth: settings?.showTableBorders ? (settings.tableBorderThickness || '1px') : '0px',
        borderColor: settings?.tableBorderColor || '#e2e8f0',
        borderStyle: settings?.descriptionBorderDashed !== false ? 'dashed' : 'solid'
      }}>
        <div 
          className={`flex items-start gap-2 w-full px-4 print:px-4 ${item.isSection ? '' : (Number(item.qty) > 0 && Number(item.unitPrice) > 0 ? 'bg-white hover:bg-blue-50/20' : 'bg-slate-50/50')}`}
          style={item.isSection ? { 
            backgroundColor: item.sectionStyle?.bg || '#f1f5f9',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          } : undefined}
        >
        {/* Drag handle + index */}
        <div 
          className={`relative flex flex-col items-center justify-center w-4 h-[34px] shrink-0 print:hidden ${padClass}`}
          onMouseEnter={() => setIsDraggable(true)}
          onMouseLeave={() => setIsDraggable(false)}
        >
          {!viewMode && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab absolute inset-0 flex items-center justify-center z-10">
            <GripVertical size={14} className="text-slate-400 hover:text-slate-600" />
          </div>
          )}
          <span className={`text-[10px] font-bold text-slate-300 w-4 text-center ${!viewMode ? 'group-hover:opacity-0 transition-opacity' : ''}`}>{index + 1}</span>
        </div>

        {/* First Column Image Position (if enabled) */}
        {settings?.showProductImages && settings?.productImagePosition === 'firstColumn' && !item.isSection && (
          <div className={`${padClass} shrink-0`}>
            <div className="w-[34px] h-[34px] bg-slate-50 flex items-center justify-center rounded-lg border border-slate-200 overflow-hidden print:border-none print:bg-transparent">
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package size={14} className="text-slate-300" />}
            </div>
          </div>
        )}

        {item.isSection ? (
          <div className={`flex-1 flex flex-col relative print:my-1 ${padClass}`}>
             <div 
               className="w-full h-full flex items-center px-1 transition-all border border-transparent print:border-none focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20"
               style={{
                 minHeight: '34px'
               }}
             >
               <input
                 value={item.shortDesc}
                 disabled={viewMode}
                 onChange={e => onChange(item.id, 'shortDesc', e.target.value)}
                 placeholder="TITULO DE SECCIÓN (Ej: 2 AÑOS DE GARANTÍA)"
                 className="w-full bg-transparent border-none outline-none focus:ring-0 px-2 py-1 placeholder:text-slate-400"
                 style={{
                   color: item.sectionStyle?.color || '#1e293b',
                   fontWeight: item.sectionStyle?.bold ? 'bold' : 'normal',
                   textAlign: item.sectionStyle?.align || 'left',
                   textTransform: 'uppercase',
                   fontSize: '11px',
                   letterSpacing: '0.05em'
                 }}
               />
             </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-[20fr_30fr_9fr_20fr_9fr_12fr_20fr] gap-2 min-w-0 relative">
            {/* Code */}
            <div className={`min-w-0 relative flex items-center ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#e2e8f0' } : {}}>
              <input
                value={item.code}
                disabled={viewMode}
                onFocus={() => { if(!viewMode) { setFocusedField('code'); setShowAutocomplete(true); } }}
                onChange={e => {
                  if(viewMode) return;
                  onChange(item.id, 'code', e.target.value);
                  setFocusedField('code');
                  setShowAutocomplete(true);
                }}
                onKeyDown={handleKeyDown}
                onBlur={async (e) => {
                  if(viewMode) return;
                  const val = e.target.value.trim();
                  setTimeout(async () => {
                    if (val && val.length >= 3 && (!item.shortDesc || item.shortDesc.trim() === '')) {
                      try {
                        const res = await buscarItemPorCodigo(val);
                        if (res) {
                          onChange(item.id, 'shortDesc', res.name);
                          if (!item.longDesc) onChange(item.id, 'longDesc', res.description);
                          if (Number(item.unitPrice) === 0) onChange(item.id, 'unitPrice', res.price);
                          if (res.type === 'producto') onChange(item.id, 'productoId', res.id);
                          if (res.type === 'activo') onChange(item.id, 'activoId', res.id);
                          if (res.imageUrl) onChange(item.id, 'imageUrl', res.imageUrl);
                        }
                      } catch(e) { console.error('Error in onBlur search:', e); }
                    }
                  }, 200);
                }}
                placeholder="Código"
                className="w-full h-[34px] text-[10px] md:text-[11px] tracking-tight font-mono text-center border border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 print:border-transparent print:bg-transparent print:p-0 print:text-slate-800 disabled:bg-slate-50 disabled:border-transparent disabled:text-slate-700"
              />
              {focusedField === 'code' && !viewMode && renderDropdown()}
            </div>

            {/* Description */}
            <div className={`min-w-0 relative flex gap-2 items-center ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#e2e8f0' } : {}}>
              {settings?.showProductImages && (!settings?.productImagePosition || settings?.productImagePosition === 'afterCode') && (
                <div className="w-[34px] h-[34px] shrink-0 bg-slate-50 flex items-center justify-center rounded-lg border border-slate-200 overflow-hidden print:border-none print:bg-transparent">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package size={14} className="text-slate-300" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
              {viewMode ? (
                <div className="text-xs font-semibold text-slate-800 whitespace-pre-wrap break-words print:hidden">{item.shortDesc}</div>
              ) : (
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
                  className="w-full h-[34px] text-xs border border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 print:hidden block disabled:bg-slate-50 disabled:border-transparent disabled:text-slate-800"
                />
              )}
              <div className="hidden print:block text-xs font-semibold text-slate-800 whitespace-pre-wrap break-words">
                {item.shortDesc}
              </div>

              </div>
              {focusedField === 'desc' && !viewMode && renderDropdown()}
            </div>

            {/* Qty — centered horizontally and vertically */}
            <div className={`min-w-0 flex items-center justify-center ${padClass} ${settings?.showTableVerticalBorders ? 'px-1' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#e2e8f0' } : {}}>
              {!viewMode ? (
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={e => onChange(item.id, 'qty', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                  className="w-full h-[34px] text-xs text-center border border-slate-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all print:hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              ) : null}
              <span className={`text-xs font-semibold text-slate-800 text-center ${!viewMode ? 'hidden print:inline' : 'inline'}`}>
                {item.qty}
              </span>
            </div>

            {/* Unit Price — vertically centered, right-aligned */}
            <div className={`min-w-0 flex items-center justify-end ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#e2e8f0' } : {}}>
              {!viewMode ? (
                <div className="relative w-full print:hidden">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">L</span>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => onChange(item.id, 'unitPrice', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                    className="w-full h-[34px] text-xs text-right pl-5 pr-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ) : null}
              <span className={`text-xs font-semibold text-slate-800 text-right font-mono ${!viewMode ? 'hidden print:inline' : 'inline'}`}>
                {fmt(Number(item.unitPrice) || 0)}
              </span>
            </div>

            {/* Discount — vertically centered, right-aligned — (compact) */}
            <div className={`min-w-0 flex items-center justify-end ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#e2e8f0' } : {}}>
              {!viewMode ? (
                <div className="relative w-full print:hidden">
                  <input
                    type="number"
                    value={item.discount}
                    onChange={e => onChange(item.id, 'discount', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full h-[34px] text-xs text-right pr-6 pl-1.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => onChange(item.id, 'discountType', item.discountType === 'percentage' ? 'amount' : 'percentage')}
                    title={item.discountType === 'percentage' ? 'Cambiar a monto (L)' : 'Cambiar a porcentaje (%)'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer select-none w-4 text-center"
                  >{item.discountType === 'percentage' ? '%' : 'L'}</button>
                </div>
              ) : null}
              <span className={`text-xs font-semibold text-slate-800 text-right ${!viewMode ? 'hidden print:inline' : 'inline'}`}>
                {Number(item.discount) > 0
                  ? (item.discountType === 'percentage' ? `${item.discount}%` : fmt(Number(item.discount)))
                  : '-'}
              </span>
            </div>

            {/* Tax — vertically centered, centered — */}
            <div className={`min-w-0 flex items-center justify-center ${padClass} ${settings?.showTableVerticalBorders ? 'pr-2' : ''}`} style={settings?.showTableVerticalBorders ? { borderRightWidth: settings.tableBorderThickness || '1px', borderColor: settings.tableBorderColor || '#e2e8f0' } : {}}>
              {!viewMode ? (
                <select
                  value={item.tax}
                  onChange={e => onChange(item.id, 'tax', e.target.value as TaxType)}
                  className="w-full min-w-0 h-[34px] text-[10px] font-semibold border border-slate-200 rounded-lg px-0.5 text-center bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer print:hidden"
                >
                  <option value="isv15">ISV 15%</option>
                  <option value="isv18">ISV 18%</option>
                  <option value="exento">Exento</option>
                  <option value="exonerado">Exonerado</option>
                </select>
              ) : null}
              <span className={`text-[10px] font-semibold text-slate-700 text-center ${!viewMode ? 'hidden print:inline' : 'inline'}`}>
                {item.tax === 'isv15' ? 'ISV 15%' : item.tax === 'isv18' ? 'ISV 18%' : item.tax === 'exento' ? 'Exento' : 'Exonerado'}
              </span>
            </div>

            {/* Monto / Subtotal — vertically centered, centered */}
            <div className={`min-w-0 flex items-center justify-center ${padClass}`}>
              <p className="text-xs font-bold text-slate-800 text-center font-mono">
                {fmt(total)}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`relative w-[24px] shrink-0 print:hidden flex items-center justify-center ${padClass}`}>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-row gap-0.5 items-center justify-end opacity-0 group-hover:opacity-100 transition-all bg-white/95 backdrop-blur-sm px-1 py-0.5 rounded-md shadow-sm border border-slate-200 z-[60]">
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
                    <input type="color" value={item.sectionStyle?.bg || '#f1f5f9'} onChange={e => onChange(item.id, 'sectionStyle', { ...item.sectionStyle, bg: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0 shadow-sm" title="Color de Fondo" />
                  </div>
                  <div className="w-[1px] h-5 bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Texto</span>
                    <input type="color" value={item.sectionStyle?.color || '#1e293b'} onChange={e => onChange(item.id, 'sectionStyle', { ...item.sectionStyle, color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0 shadow-sm" title="Color de Texto" />
                  </div>
               </div>
            ) : viewMode ? (
              item.richDesc ? (
                <div
                  className="text-xs text-slate-600 prose prose-sm max-w-none print:max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.richDesc }}
                />
              ) : (
                <div className="text-xs text-slate-600 whitespace-pre-wrap break-words">{item.longDesc}</div>
              )
            ) : (
              <div className="print:hidden">
                <RichDescriptionEditor
                  content={item.richDesc || item.longDesc || ''}
                  onChange={html => {
                    onChange(item.id, 'richDesc', html);
                    // Keep plain-text longDesc synced as fallback
                    const div = document.createElement('div');
                    div.innerHTML = html;
                    onChange(item.id, 'longDesc', div.textContent || '');
                  }}
                  placeholder="Descripción técnica detallada, especificaciones..."
                />
              </div>
            )}
            <div className={`hidden ${!viewMode ? 'print:block' : 'print:hidden'} text-xs text-slate-600 prose prose-sm max-w-none`} dangerouslySetInnerHTML={{ __html: item.richDesc || item.longDesc }} />
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
  viewMode = false 
}: { 
  organization?: any;
  initialData?: any;
  editMode?: boolean;
  viewMode?: boolean;
}) {
  const [docType, setDocType] = useState<DocType>('cotizacion');
  const [docNumber, setDocNumber] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...emptyLine(), id: 'default-line-hash' }]);
  const [paymentTerms, setPaymentTerms] = useState('30 días netos');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ nombre: '', email: '', telefono: '', rtn: '', direccion: '' });
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [activeTab, setActiveTab] = useState<'clients' | 'products'>('clients');
  const [showPreview, setShowPreview] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const templateContainerRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<InvoiceSettings>(() => {
    // Always merge organization settings (available on both server and client as a prop).
    // localStorage preferences are loaded in useEffect to avoid hydration mismatch.
    if (organization?.invoiceSettings) return { ...DEFAULT_INVOICE_SETTINGS, ...organization.invoiceSettings };
    return DEFAULT_INVOICE_SETTINGS;
  });

  const isAnulada = initialData?.estado === 'ANULADA';
  const isConvertida = initialData?.estado === 'CONVERTIDA';
  const effectiveViewMode = viewMode || isAnulada || isConvertida;

  const estaVencida = typeof window !== 'undefined' ? (function() {
    if (!initialData?.fechaEmision || initialData?.tipoDocumento !== 'COTIZACION') return false;
    const fecha = new Date(initialData.fechaEmision);
    const expiracion = new Date(fecha.setDate(fecha.getDate() + (initialData?.validezDias || 30)));
    return expiracion < new Date();
  })() : false;

  const [isLoaded, setIsLoaded] = useState(false);

  // --- PERSISTENCE (AUTO-SAVE) ---
  const [reservedDocId, setReservedDocId] = useState<string | null>(initialData?.id || null);
  const [isLocked, setIsLocked] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const draftKey = 'bea_factura_draft_v2'; // Single unified draft

  // 1. Hydrate from localStorage on mount (ONLY if it's a new document and not in viewMode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initialData || effectiveViewMode || editMode) {
      setIsHydrated(true);
      return; 
    }

    try {
      const stored = window.localStorage.getItem(draftKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.reservedDocId) setReservedDocId(parsed.reservedDocId);
        if (parsed.docType) setDocType(parsed.docType);
        if (parsed.docNumber) setDocNumber(parsed.docNumber);
        if (parsed.selectedClient) setSelectedClient(parsed.selectedClient);
        if (parsed.lineItems && parsed.lineItems.length > 0) setLineItems(parsed.lineItems);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.paymentTerms) setPaymentTerms(parsed.paymentTerms);
        if (parsed.validityDays) setValidityDays(parsed.validityDays);
        if (!parsed.reservedDocId) setIsLocked(true); // Must reserve first 
      } else {
        setIsLocked(true); // Locked if completely blank session
      }
    } catch (e) {
      console.warn("Failed to parse draft", e);
      setIsLocked(true);
    }
    setIsHydrated(true);
  }, [initialData, effectiveViewMode, editMode]);

  // 2. Auto-save to localStorage with debounce
  useEffect(() => {
    if (!isHydrated || initialData || effectiveViewMode || editMode) return;

    const handler = setTimeout(() => {
      try {
        const draft = {
          reservedDocId, docType, docNumber, selectedClient, lineItems, notes, paymentTerms, validityDays
        };
        window.localStorage.setItem(draftKey, JSON.stringify(draft));
        setLastSaved(new Date());
      } catch (e) {}
    }, 1500);

    return () => clearTimeout(handler);
  }, [isHydrated, reservedDocId, docType, docNumber, selectedClient, lineItems, notes, paymentTerms, validityDays, initialData, effectiveViewMode, editMode]);

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

  // Load preferences from localStorage 
  useEffect(() => {
    if (typeof window !== 'undefined' && !effectiveViewMode) {
      try {
        const saved = localStorage.getItem('bea_invoice_template_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error("Error al cargar settings visuales", e);
      } finally {
        setIsLoaded(true);
      }
    } else {
      setIsLoaded(true);
    }
  }, [effectiveViewMode]);

  // Save preferences when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && !effectiveViewMode && isLoaded) {
      localStorage.setItem('bea_invoice_template_settings', JSON.stringify(settings));
    }
  }, [settings, effectiveViewMode, isLoaded]);


  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
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

  // PDF Download handler
  const handleDownloadPDF = async () => {
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

    setIsDownloadingPDF(true);
    const toastId = toast.loading('Generando PDF Vectorial (Máxima Calidad)...');

    try {
      // Petición al API de Puppeteer (Nivel Odoo)
      const res = await fetch(`/api/pdf/${docId}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('Puppeteer Server API Error:', errBody);
        throw new Error(errBody.error || 'API Error');
      }
      
      const blob = await res.blob();
      const typeLabel = docType === 'cotizacion' ? 'Cotizacion' : docType === 'proforma' ? 'ProForma' : 'Factura';
      const fileName = `${typeLabel}-${docNumber || 'documento'}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF Vectorial descargado exitosamente', { id: toastId });
      setIsDownloadingPDF(false);
      return;
    } catch (apiError) {
      console.warn('API Vector Serverless failed/timeout. Falling back to html2canvas local render.', apiError);
      toast.loading('Generación de respaldo activada...', { id: toastId });
      
      // FALLBACK LOCAL IMAGE-BASED PDF
      const container = templateContainerRef.current;
      if (!container) {
        toast.error('Error crítico al generar respaldo', { id: toastId });
        setIsDownloadingPDF(false);
        return;
      }
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

        const originalClasses = container.className;
        container.className = originalClasses.replace('pr-80', '').replace('scale-[0.95]', '');

        // PREPROCESS: Convert images to base64 to avoid html2canvas Tainted Canvas / CORS silent drops
        const imagesToConvert = Array.from(container.querySelectorAll('img'));
        const originalSrcs: string[] = [];
        
        await Promise.all(imagesToConvert.map(async (img) => {
          originalSrcs.push(img.src);
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

        await new Promise(r => setTimeout(r, 200));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        // RESTORE
        imagesToConvert.forEach((img, i) => {
          img.src = originalSrcs[i];
        });

        container.className = originalClasses;
        uiElements.forEach((el, i) => {
          (el as HTMLElement).style.display = originalDisplays[i];
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 215.9;
        const pageHeight = 279.4;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF('p', 'mm', 'letter');
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const typeLabel = docType === 'cotizacion' ? 'Cotizacion' : docType === 'proforma' ? 'ProForma' : 'Factura';
        const fileName = `${typeLabel}-${docNumber || 'documento'}(respaldo).pdf`;
        pdf.save(fileName);
        toast.success('PDF de Respaldo generado correctamente', { id: toastId });
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        toast.error('Mecanismos de PDF agotados. Imprime manualmente.', { id: toastId });
      } finally {
        setIsDownloadingPDF(false);
      }
    }
  };

  // Cargar initialData si existe
  useEffect(() => {
    if (initialData) {
      setDocType(initialData.tipoDocumento.toLowerCase() as DocType);
      
      // Mostrar correlativo al editar o ver; solo borrar cuando sea un clon (nueva copia)
      const isClone = !editMode && !viewMode;
      setDocNumber(isClone ? '' : initialData.correlativo);
      
      setPaymentTerms(initialData.terminosPago || '30 días netos');
      setValidityDays(initialData.validezDias || 30);
      setNotes(initialData.notas || '');
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
          category: 'Cliente'
        });
      }

      if (initialData.detalles && initialData.detalles.length > 0) {
        const loadedItems = initialData.detalles.map((d: any) => {
          let tax: TaxType = 'exento';
          if (d.porcentajeIsv === 15) tax = 'isv15';
          else if (d.porcentajeIsv === 18) tax = 'isv18'; // We don't have 18 in db schema explicitly, but assuming mapping
          // For exonerado, we would have logic, but default to exento if 0
          
          let isSection = false;
          let rawDesc = d.descripcion || '';
          if (rawDesc.startsWith('__SECTION__')) {
              isSection = true;
              rawDesc = rawDesc.substring(11);
          }

          let longDesc = '';
          let shortDesc = rawDesc;
          if (rawDesc.includes('\n')) {
              const parts = rawDesc.split('\n');
              shortDesc = parts[0];
              longDesc = parts.slice(1).join('\n');
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
            showLongDesc: isSection ? false : !!longDesc.trim(), // Expandir automáticamente en base a si tiene descripción larga
            qty: d.cantidad,
            unitPrice: Number(d.precioUnitario),
            tax,
            discount,
            discountType,
            productoId: d.productoId || undefined,
            activoId: d.activoId || undefined,
            imageUrl: d.activo?.imagenUrl || undefined
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
          category: 'Cliente'
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
        })));
      } catch (e) {
        console.error("Error al cargar datos", e);
      }
    };
    loadData();
  }, [docType]);

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
      const created = await createContacto({
        nombre: newClientData.nombre,
        email: newClientData.email || undefined,
        telefono: newClientData.telefono || undefined,
        rtn: newClientData.rtn || undefined,
        direccion: newClientData.direccion || undefined
      });
      const newClientObj: Client = {
        id: created.id,
        name: created.nombre,
        rtn: created.rtn || '',
        email: created.email || '',
        phone: created.telefono || '',
        address: created.direccion || '',
        city: '',
        category: 'Cliente'
      };
      setAllClients(prev => [...prev, newClientObj]);
      setSelectedClient(newClientObj);
      setShowNewClientModal(false);
      setShowClientModal(false);
      setNewClientData({ nombre: '', email: '', telefono: '', rtn: '', direccion: '' });
      toast.success('Cliente registrado correctamente');
    } catch (e: any) {
      toast.error('Error al registrar cliente');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const nProductSearch = normalizeText(productSearch);
  const filteredProducts = allProducts.filter(p =>
    normalizeText(p.name).includes(nProductSearch) ||
    normalizeText(p.code).includes(nProductSearch) ||
    normalizeText(p.category).includes(nProductSearch)
  );

  const handleLineChange = useCallback((id: string, field: any, val: any) => {
    setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleToggleLongDesc = useCallback((id: string) => {
    setLineItems(prev => prev.map(item =>
      item.id === id ? { ...item, showLongDesc: !item.showLongDesc } : item
    ));
  }, []);

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
      showLongDesc: !!productLongDesc.trim(),
      qty: 1,
      unitPrice: product.price,
      tax: 'isv15',
      discount: 0,
      discountType: 'percentage',
      productoId: product.type === 'producto' ? product.id : undefined,
      activoId: product.type === 'activo' ? product.id : undefined,
      imageUrl: (product as any).imageUrl || undefined,
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
        tipoDocumento: docType === 'cotizacion' ? 'COTIZACION' : docType === 'proforma' ? 'PROFORMA' : 'FACTURA',
        notas: notes,
        terminosPago: paymentTerms,
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
        templateSettings: settings
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
    const label = nuevoTipo === 'PROFORMA' ? 'Pro Forma' : 'Factura Oficial';
    
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col overflow-hidden border border-slate-100`}>
        <div className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
             <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">Convertir a {label}</h3>
            <p className="text-sm text-slate-500 mt-1">El documento actual subirá de categoría a <strong>{label}</strong>. Esta acción bloqueará la edición del documento original.</p>
          </div>
        </div>
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3">
          <button onClick={() => toast.dismiss(t.id)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              setIsConverting(true);
              try {
                const res = await convertirDocumento(initialData.id, nuevoTipo);
                if (res.success) {
                  toast.success(`Documento convertido a ${label} exitosamente`);
                  router.push(`/facturas/ver/${res.nuevoId}`);
                } else {
                  toast.error(res.error || 'Error al convertir el documento');
                }
              } catch (e: any) {
                toast.error(e.message || 'Error al convertir');
              } finally {
                setIsConverting(false);
              }
            }}
            className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            Confirmar
          </button>
        </div>
      </div>
    ), { duration: Infinity, id: 'convert-confirm' });
  };


  const totals = {
    get subtotal() { return lineItems.reduce((acc, item) => acc + calcLine(item).base, 0); },
    get descuentos() { return lineItems.reduce((acc, item) => acc + calcLine(item).dAmount, 0); },
    get exento() { return lineItems.reduce((acc, item) => item.tax === 'exento' ? acc + calcLine(item).baseAfterDiscount : acc, 0); },
    get exonerado() { return lineItems.reduce((acc, item) => item.tax === 'exonerado' ? acc + calcLine(item).baseAfterDiscount : acc, 0); },
    get gravado15() { return lineItems.reduce((acc, item) => item.tax === 'isv15' ? acc + calcLine(item).baseAfterDiscount : acc, 0); },
    get isv15() { return lineItems.reduce((acc, item) => item.tax === 'isv15' ? acc + calcLine(item).tax : acc, 0); },
    get gravado18() { return lineItems.reduce((acc, item) => item.tax === 'isv18' ? acc + calcLine(item).baseAfterDiscount : acc, 0); },
    get isv18() { return lineItems.reduce((acc, item) => item.tax === 'isv18' ? acc + calcLine(item).tax : acc, 0); },
    get total() { return this.subtotal - this.descuentos + this.isv15 + this.isv18; }
  };

  const currentDocType = DOC_TYPES.find(d => d.key === docType)!;

  const docTypeStatusConfig: Record<DocType, { badge: string; label: string }> = {
    cotizacion: { badge: 'bg-blue-50 text-blue-600 border border-blue-200', label: 'COTIZACIÓN' },
    proforma: { badge: 'bg-violet-50 text-violet-600 border border-violet-200', label: 'PRO FORMA' },
    factura: { badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200', label: 'FACTURA OFICIAL' },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans print:bg-white overflow-x-hidden print:overflow-visible print:min-h-0 print:block">
      {/* Top Bar */}
      <div className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm print:hidden transition-all duration-300 ${showCustomizer ? 'pr-[320px]' : ''}`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Left section: Breadcrumb space */}
          <div className="flex items-center gap-4 flex-1">
            {/* Espacio para breadcrumb exterior */}
          </div>

          <DocTypeSelector value={docType} onChange={setDocType} />

          <div className="flex items-center gap-2 flex-1 justify-end">
            {!isLocked ? (
              <>
                <button
                  onClick={() => setShowCustomizer(!showCustomizer)}
                  className={`flex items-center gap-2 px-4 py-2 ${showCustomizer ? 'bg-blue-600 text-white shadow-md' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700'} rounded-xl text-sm font-semibold hover:shadow-md transition-all sm:flex`}
                >
                  {showCustomizer ? <X size={15} /> : <Sparkles size={15} />}
                  {showCustomizer ? 'Ocultar Panel' : 'Personalizar Diseño'}
                </button>
                {(effectiveViewMode || initialData?.id || reservedDocId) && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${isDownloadingPDF ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 hover:from-emerald-100 hover:to-teal-100 hover:shadow-md'}`}
                >
                  <Download size={15} className={isDownloadingPDF ? 'animate-bounce' : ''} /> {isDownloadingPDF ? 'Generando...' : 'Descargar PDF'}
                </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Printer size={15} /> Imprimir
                </button>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-400 mr-4">Selecciona y crea tu documento para comenzar</span>
            )}
            {!isLocked && !isAnulada && !isConvertida && effectiveViewMode && initialData?.id && (
              <>
                {initialData.tipoDocumento === 'COTIZACION' && (
                  <button
                    onClick={() => handleConvert('PROFORMA')}
                    disabled={isConverting || estaVencida}
                    title={estaVencida ? "Esta cotización ha vencido. Duplíquela para renovarla." : "Convertir a Pro Forma"}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-violet-600 hover:to-violet-700 shadow-md shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight size={15} />
                    {isConverting ? 'Convirtiendo...' : 'Convertir a Pro Forma'}
                  </button>
                )}
                {initialData.tipoDocumento === 'PROFORMA' && (
                  <button
                    onClick={() => handleConvert('FACTURA')}
                    disabled={isConverting}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
                  >
                    <ArrowRight size={15} />
                    {isConverting ? 'Convirtiendo...' : 'Convertir a Factura Oficial'}
                  </button>
                )}
                {initialData.tipoDocumento === 'COTIZACION' && (
                  <button
                    onClick={() => handleConvert('FACTURA')}
                    disabled={isConverting || estaVencida}
                    title={estaVencida ? "Esta cotización ha vencido. Duplíquela para renovarla." : "Convertir directamente a Factura"}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight size={15} />
                    {isConverting ? 'Convirtiendo...' : 'Facturar Directo'}
                  </button>
                )}
              </>
            )}
            {!isAnulada && !isLocked && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-5 py-2 text-white rounded-xl text-sm font-bold shadow-md transition-all ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
              >
                <Send size={15} />
                {isSaving ? 'Guardando...' : (docType === 'factura' ? 'Emitir Factura' : 'Guardar Documento')}
              </button>
            )}

          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-8 flex gap-5 print:p-0 print:max-w-none print:m-0 relative print:block">

        <div className={`w-full relative transition-all duration-300 print:block ${isLocked ? 'pointer-events-none' : ''}`}>
          
          <div className={`transition-all duration-500 relative flex-1 min-w-0 z-10 print:block ${showCustomizer ? 'pr-80 print:pr-0 scale-[0.95] print:scale-100 origin-top' : ''} ${isLocked ? 'blur-[6px] opacity-60 grayscale-[0.1]' : ''}`}>
             <div ref={templateContainerRef} className="max-w-[816px] mx-auto relative bg-white">
          
          {isAnulada && (
             <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden mix-blend-multiply opacity-30 print:opacity-20 px-8">
                 <span className="text-[10rem] sm:text-[14rem] font-black text-red-500 uppercase tracking-widest -rotate-45 block whitespace-nowrap">ANULADA</span>
             </div>
          )}
          
          {settings.template === 'modern' && <ModernTemplate 
            settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
            nombreUsuario={initialData?.nombreUsuario}
            docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
            today={today} futureDate={futureDate} selectedClient={selectedClient} 
            setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
            setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
            lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
            handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
            setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
            setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
            LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode}
          />}
          {settings.template === 'classic' && <ClassicTemplate 
             settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
             nombreUsuario={initialData?.nombreUsuario}
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
             handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode}
          />}
          {settings.template === 'minimalist' && <MinimalistTemplate 
             settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
             nombreUsuario={initialData?.nombreUsuario}
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
            handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode}
          />}
          {settings.template === 'legacy' && <LegacyTemplate 
             settings={settings} organization={organization} docNumber={docNumber || 'PENDIENTE'} 
             nombreUsuario={initialData?.nombreUsuario}
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} handleDuplicateLine={handleDuplicateLine}
             handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} emptySectionLine={emptySectionLine}
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={effectiveViewMode}
          />}

          </div>

          {/* Bottom Action Bar */}
          {!effectiveViewMode && (
          <div className="flex items-center gap-3 print:hidden mt-6">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Copy size={14} /> Duplicar
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────── */}
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
              {filteredClients.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>No se encontraron clientes.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowClientModal(false);
                      }}
                      className={`w-full flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition-all text-left group ${selectedClient?.id === client.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white border border-slate-100'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${selectedClient?.id === client.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                        <Building2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{client.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{client.rtn || 'Sin RTN'} • {client.category}</p>
                      </div>
                      {selectedClient?.id === client.id && <CheckCircle2 size={18} className="text-blue-600 shrink-0 mx-2" />}
                    </button>
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
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar equipo, marca o código..."
                  className="w-full pl-11 pr-4 py-3 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
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
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Teléfono</label>
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
                        onClick={() => setShowNewClientModal(false)}
                        className="px-5 py-2.5 rounded-xl font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
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
          onChange={(key, val) => setSettings(p => ({ ...p, [key]: val }))}
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
              <p className="font-mono text-lg font-bold text-slate-800">{showSuccessModal.correlativo}</p>
            </div>

            <div className="flex gap-3 w-full mt-4">
              <button
                onClick={() => {
                  setShowSuccessModal(null);
                  router.push('/facturas');
                }}
                className="flex-1 py-3 px-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Hacer Nuevo
              </button>
              <button
                onClick={() => router.push(`/facturas/ver/${showSuccessModal.docId}`)}
                className="flex-[1.5] py-3 px-4 bg-emerald-600 border-2 border-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 hover:border-emerald-700 hover:shadow-lg transition-all"
              >
                Ver Documento
              </button>
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
    </div>
  );
}
