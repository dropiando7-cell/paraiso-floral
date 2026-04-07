'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search, Plus, Trash2, ChevronDown, ChevronUp, GripVertical,
  User, Building2, FileText, Receipt, ClipboardList, Send,
  Package, Stethoscope, Zap, CheckCircle2, Clock, AlertCircle,
  X, Calculator, Download, Eye, MoreHorizontal, ArrowRight,
  Sparkles, Hash, Calendar, CreditCard, Percent, ChevronRight,
  Tag, Info, Copy, Printer, Mail, Phone, MapPin, Star
} from 'lucide-react';

// ─── TYPES ─────────────────────────────────────────────────────────────────

type DocType = 'cotizacion' | 'proforma' | 'factura';
type TaxType = 'isv15' | 'isv18' | 'exento' | 'exonerado';

interface LineItem {
  id: string;
  code: string;
  shortDesc: string;
  longDesc: string;
  showLongDesc: boolean;
  qty: number | string;
  unitPrice: number | string;
  tax: TaxType;
  discount: number | string;
  discountType: 'percentage' | 'amount';
  productoId?: string;
  activoId?: string;
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
}

import { searchClientes, searchProductos, guardarDocumentoBuilder, buscarItemPorCodigo } from './actions';
import { createContacto } from '../contactos/actions';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import InvoiceCustomizerSidebar from '@/components/facturas/customizer/InvoiceCustomizerSidebar';
import ModernTemplate from '@/components/facturas/templates/ModernTemplate';
import ClassicTemplate from '@/components/facturas/templates/ClassicTemplate';
import MinimalistTemplate from '@/components/facturas/templates/MinimalistTemplate';
import LegacyTemplate from '@/components/facturas/templates/LegacyTemplate';
import { InvoiceSettings, DEFAULT_INVOICE_SETTINGS } from '@/types/invoice';




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
  id: uid(), code: '', shortDesc: '', longDesc: '', showLongDesc: false,
  qty: 1, unitPrice: '', tax: 'isv15', discount: 0, discountType: 'percentage',
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
  item, index, onChange, onDelete, onToggleLongDesc, allProducts
}: {
  item: LineItem;
  index: number;
  onChange: (id: string, field: keyof LineItem, val: unknown) => void;
  onDelete: (id: string) => void;
  onToggleLongDesc: (id: string) => void;
  allProducts: Product[];
}) {
  const { base, tax, total } = calcLine(item);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [focusedField, setFocusedField] = useState<'code' | 'desc' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const shortDescRef = useRef<HTMLTextAreaElement>(null);
  const longDescRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSelectProduct = (product: Product) => {
    onChange(item.id, 'code', product.code);
    onChange(item.id, 'shortDesc', product.name);
    
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
    <div className="group relative" ref={containerRef} data-line-id={item.id}>
      <div className={`
        flex items-start gap-2 p-3 rounded-xl border transition-all duration-200
        ${Number(item.qty) > 0 && Number(item.unitPrice) > 0
          ? 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-sm'
          : 'border-dashed border-slate-200 bg-slate-50/50'}
        print:border-none print:p-0 print:bg-transparent print:my-1
      `}>
        {/* Drag handle + index */}
        <div className="flex flex-col items-center gap-1 pt-1 shrink-0 print:hidden">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
            <GripVertical size={14} className="text-slate-300" />
          </div>
          <span className="text-[10px] font-bold text-slate-300 w-4 text-center">{index + 1}</span>
        </div>

        {/* Main fields */}
        <div className="flex-1 grid grid-cols-12 gap-2 min-w-0 relative">
          {/* Code */}
          <div className="col-span-2 relative">
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
                        if (res.type === 'producto') onChange(item.id, 'productoId', res.id);
                        if (res.type === 'activo') onChange(item.id, 'activoId', res.id);
                      }
                    } catch(e) { console.error('Error in onBlur search:', e); }
                  }
                }, 200);
              }}
              placeholder="Código"
              className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 print:border-transparent print:bg-transparent print:p-0 print:text-slate-800"
            />
            {focusedField === 'code' && renderDropdown()}
          </div>

          {/* Description */}
          <div className="col-span-3 relative">
            <textarea
              ref={shortDescRef}
              rows={1}
              value={item.shortDesc}
              onFocus={() => { setFocusedField('desc'); setShowAutocomplete(true); }}
              onChange={e => {
                onChange(item.id, 'shortDesc', e.target.value);
                setFocusedField('desc');
                setShowAutocomplete(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Descripción del producto o servicio"
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 overflow-hidden resize-none print:hidden block"
            />
            <div className="hidden print:block text-xs font-semibold text-slate-800 whitespace-pre-wrap break-words">
              {item.shortDesc}
            </div>
            {item.showLongDesc && (
              <>
                <textarea
                  ref={longDescRef}
                  value={item.longDesc}
                  onChange={e => onChange(item.id, 'longDesc', e.target.value)}
                  placeholder="Descripción técnica detallada, especificaciones, número de serie..."
                  rows={3}
                  className="mt-1.5 w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all overflow-hidden resize-none placeholder:text-slate-300 text-slate-600 print:hidden"
                />
                <div className="hidden print:block text-xs text-slate-600 whitespace-pre-wrap mt-0.5 break-words">
                  {item.longDesc}
                </div>
              </>
            )}
            {focusedField === 'desc' && renderDropdown()}
          </div>

          {/* Qty */}
          <div className="col-span-1">
            <input
              type="number"
              min="1"
              value={item.qty}
              onChange={e => onChange(item.id, 'qty', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
              className="w-full text-xs text-center border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all print:border-transparent print:bg-transparent print:p-0 print:text-slate-800 print:text-left"
            />
          </div>

          {/* Unit Price */}
          <div className="col-span-2">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs print:hidden">L</span>
              <span className="hidden print:inline absolute left-0 top-1/2 -translate-y-1/2 text-slate-800 text-xs font-semibold">L</span>
              <input
                type="number"
                value={item.unitPrice}
                onChange={e => onChange(item.id, 'unitPrice', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                className="w-full text-xs pl-5 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all print:border-transparent print:bg-transparent print:pl-3 print:py-0 print:text-slate-800"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="col-span-2">
            <div className="relative flex items-center border border-slate-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all print:hidden">
              <input
                type="number"
                value={item.discount}
                onChange={e => onChange(item.id, 'discount', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                placeholder="Desc."
                className="w-full text-xs px-2 py-1.5 bg-transparent border-none focus:ring-0"
              />
              <select
                value={item.discountType}
                onChange={e => onChange(item.id, 'discountType', e.target.value)}
                className="text-xs font-semibold bg-slate-50 border-l border-slate-200 py-1.5 px-1 rounded-r-lg text-slate-600 focus:outline-none"
              >
                <option value="percentage">%</option>
                <option value="amount">L</option>
              </select>
            </div>
            <div className="hidden print:block text-center text-xs font-semibold text-slate-800 mt-1">
               {Number(item.discount) > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : `L. ${item.discount}`) : '-'}
            </div>
          </div>

          {/* Tax */}
          <div className="col-span-1">
            <select
              value={item.tax}
              onChange={e => onChange(item.id, 'tax', e.target.value as TaxType)}
              className="w-full text-[10px] font-semibold border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer print:border-transparent print:bg-transparent print:p-0 print:appearance-none print:text-slate-800"
            >
              <option value="isv15">ISV 15%</option>
              <option value="isv18">ISV 18%</option>
              <option value="exento">Exento</option>
              <option value="exonerado">Exonerado</option>
            </select>
          </div>

          {/* Subtotal */}
          <div className="col-span-1 flex items-center justify-end">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{fmt(total)}</p>
              {item.tax === 'isv15' && <p className="text-[10px] text-slate-400 hidden lg:block">ISV 15</p>}
              {item.tax === 'isv18' && <p className="text-[10px] text-slate-400 hidden lg:block">ISV 18</p>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0 pt-0.5 print:hidden">
          <button
            onClick={() => onToggleLongDesc(item.id)}
            title="Descripción técnica"
            className={`p-1.5 rounded-lg transition-all ${item.showLongDesc ? 'bg-blue-100 text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-400 hover:bg-blue-50'}`}
          >
            <Info size={12} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-slate-300 hover:text-red-400 hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
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
  const [settings, setSettings] = useState<InvoiceSettings>(() => {
    // We cannot access localStorage synchronously during SSR without causing hydration mismatch,
    // so we initialize to default, and hydrate in useEffect.
    if (typeof window !== 'undefined' && organization?.invoiceSettings) return { ...DEFAULT_INVOICE_SETTINGS, ...organization.invoiceSettings };
    return DEFAULT_INVOICE_SETTINGS;
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage 
  useEffect(() => {
    if (typeof window !== 'undefined' && !viewMode) {
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
  }, [viewMode]);

  // Save preferences when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && !viewMode && isLoaded) {
      localStorage.setItem('bea_invoice_template_settings', JSON.stringify(settings));
    }
  }, [settings, viewMode, isLoaded]);


  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState<{show: boolean, docId: string, correlativo: string, format: string} | null>(null);

  // Auto-print if requested via query param
  useEffect(() => {
    if (viewMode && searchParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 800); // slight delay to ensure fonts/layout are fully rendered
      return () => clearTimeout(timer);
    }
  }, [viewMode, searchParams]);

  // Cargar initialData si existe
  useEffect(() => {
    if (initialData) {
      setDocType(initialData.tipoDocumento.toLowerCase() as DocType);
      setDocNumber(initialData.correlativo);
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
          
          let longDesc = '';
          let shortDesc = d.descripcion;
          if (d.descripcion.includes('\n')) {
              const parts = d.descripcion.split('\n');
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
            showLongDesc: longDesc.length > 0,
            qty: d.cantidad,
            unitPrice: Number(d.precioUnitario),
            tax,
            discount,
            discountType,
            productoId: d.productoId || undefined,
            activoId: d.activoId || undefined
          };
        });
        setLineItems(loadedItems);
      }

      // Since it's dynamic, we no longer compute difference for manual fallback
      if (viewMode) setShowPreview(true);
    }
  }, [initialData, viewMode]);

  // Carregar catalogos iniciales y numeracion si es creacion
  useEffect(() => {
    if (!initialData) {
      const year = new Date().getFullYear();
      const randomSuffix = String(Math.floor(Math.random() * 90000) + 10000);
      
      if (docType === 'cotizacion') {
        setDocNumber(`COT-${year}-${randomSuffix}`);
      } else if (docType === 'proforma') {
        setDocNumber(`PROF-${year}-${randomSuffix}`);
      } else if (docType === 'factura') {
        setDocNumber(`000-001-01-000${randomSuffix}`);
      } else {
        setDocNumber(`BOR-${year}-${randomSuffix}`);
      }
    }

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
          type: p.type || 'producto'
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

  const addProduct = useCallback((product: Product) => {
    const newLine: LineItem = {
      id: uid(),
      code: product.code,
      shortDesc: product.name,
      longDesc: product.description,
      showLongDesc: false,
      qty: 1,
      unitPrice: product.price,
      tax: 'isv15',
      discount: 0,
      discountType: 'percentage',
      productoId: product.type === 'producto' ? product.id : undefined,
      activoId: product.type === 'activo' ? product.id : undefined,
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
    if (!selectedClient) {
      toast.error('Debe seleccionar un cliente');
      return;
    }

    const documentComplete = lineItems.every((i, index) => {
      // Ignore the trailing empty row if it's completely empty
      if (index === lineItems.length - 1 && !i.shortDesc && !i.code && Number(i.unitPrice) === 0) return true;
      return i.shortDesc.trim() !== '' && Number(i.qty) > 0;
    });

    if (!documentComplete) {
      toast.error('Por favor complete la descripción y cantidad en todos los renglones.');
      return;
    }

    const validItems = lineItems.filter(i => Number(i.qty) > 0 && String(i.shortDesc).trim() !== '');
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un ítem válido');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        id: editMode && initialData ? initialData.id : undefined,
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
      
      const res = await guardarDocumentoBuilder(data, validItems);
      if (res.success) {
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
    <div className="min-h-screen bg-slate-50 font-sans print:bg-white overflow-x-hidden">
      {/* Top Bar */}
      <div className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm print:hidden transition-all duration-300 ${showCustomizer ? 'pr-[320px]' : ''}`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Left section: Breadcrumb space */}
          <div className="flex items-center gap-4 flex-1">
            {/* Espacio para breadcrumb exterior */}
          </div>

          <DocTypeSelector value={docType} onChange={setDocType} />

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className={`flex items-center gap-2 px-4 py-2 ${showCustomizer ? 'bg-blue-600 text-white shadow-md' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700'} rounded-xl text-sm font-semibold hover:shadow-md transition-all sm:flex`}
            >
              {showCustomizer ? <X size={15} /> : <Sparkles size={15} />}
              {showCustomizer ? 'Ocultar Panel' : 'Personalizar Diseño'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Printer size={15} /> Imprimir / PDF
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-5 py-2 text-white rounded-xl text-sm font-bold shadow-md transition-all ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
            >
              <Send size={15} />
              {isSaving ? 'Guardando...' : (docType === 'factura' ? 'Emitir Factura' : 'Guardar Documento')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-8 flex gap-5 print:p-0 print:max-w-none print:m-0">

        
        {/* ─── MAIN DOCUMENT ───────────────────────────────────────────── */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${showCustomizer ? 'pr-80 print:pr-0 scale-[0.95] print:scale-100 origin-top' : ''}`}>
          
          {settings.template === 'modern' && <ModernTemplate 
            settings={settings} organization={organization} docNumber={docNumber} 
            docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
            today={today} futureDate={futureDate} selectedClient={selectedClient} 
            setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
            setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
            lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} 
            handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} 
            setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
            setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
            LineItemRowComponent={LineItemRow} viewMode={viewMode}
          />}
          {settings.template === 'classic' && <ClassicTemplate 
             settings={settings} organization={organization} docNumber={docNumber} 
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} 
             handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} 
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={viewMode}
          />}
          {settings.template === 'minimalist' && <MinimalistTemplate 
             settings={settings} organization={organization} docNumber={docNumber} 
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} 
             handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} 
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={viewMode}
          />}
          {settings.template === 'legacy' && <LegacyTemplate 
             settings={settings} organization={organization} docNumber={docNumber} 
             docType={docType} currentDocType={currentDocType} docTypeStatusConfig={docTypeStatusConfig} 
             today={today} futureDate={futureDate} selectedClient={selectedClient} 
             setShowClientModal={setShowClientModal} paymentTerms={paymentTerms} 
             setPaymentTerms={setPaymentTerms} validityDays={validityDays} setValidityDays={setValidityDays} 
             lineItems={lineItems} handleLineChange={handleLineChange} handleDeleteLine={handleDeleteLine} 
             handleToggleLongDesc={handleToggleLongDesc} allProducts={allProducts} emptyLine={emptyLine} 
             setLineItems={setLineItems} setShowProductModal={setShowProductModal} notes={notes} 
             setNotes={setNotes} totals={totals} handleSave={handleSave} isSaving={isSaving} fmt={fmt} 
             LineItemRowComponent={LineItemRow} viewMode={viewMode}
          />}

          {/* Bottom Action Bar */}
          {!viewMode && (
          <div className="flex items-center gap-3 print:hidden mt-6">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Copy size={14} /> Duplicar
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Printer size={14} /> Imprimir
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Mail size={14} /> Enviar por Email
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Sparkles size={13} className="text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">{lineItems.length} renglón{lineItems.length !== 1 ? 'es' : ''} · {fmt(totals.total)} total</span>
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
                onClick={() => router.push('/facturas')}
                className="flex-1 py-3 px-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Volver
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
    </div>
  );
}
