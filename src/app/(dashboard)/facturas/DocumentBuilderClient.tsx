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

type DocType = 'borrador' | 'cotizacion' | 'proforma' | 'factura';
type TaxType = 'isv15' | 'exento';

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
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';



const DOC_TYPES: { key: DocType; label: string; icon: React.ReactNode; color: string; bg: string; description: string }[] = [
  { key: 'borrador', label: 'Borrador', icon: <ClipboardList size={14} />, color: 'text-slate-500', bg: 'bg-slate-100', description: 'Documento de trabajo interno' },
  { key: 'cotizacion', label: 'Cotización', icon: <FileText size={14} />, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Propuesta comercial formal' },
  { key: 'proforma', label: 'Pro Forma', icon: <Receipt size={14} />, color: 'text-violet-600', bg: 'bg-violet-50', description: 'Factura preliminar de exportación' },
  { key: 'factura', label: 'Factura Oficial', icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Documento fiscal definitivo' },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(n);
const uid = () => Math.random().toString(36).slice(2, 9);
const today = new Date().toISOString().split('T')[0];
const futureDate = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const emptyLine = (): LineItem => ({
  id: uid(), code: '', shortDesc: '', longDesc: '', showLongDesc: false,
  qty: 1, unitPrice: '', tax: 'isv15', discount: 0,
});

const calcLine = (item: LineItem) => {
  const q = Number(item.qty) || 0;
  const p = Number(item.unitPrice) || 0;
  const d = Number(item.discount) || 0;
  const base = q * p * (1 - d / 100);
  const tax = item.tax === 'isv15' ? base * 0.15 : 0;
  return { base, tax, total: base + tax };
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
  item, index, onChange, onDelete, onToggleLongDesc
}: {
  item: LineItem;
  index: number;
  onChange: (id: string, field: keyof LineItem, val: unknown) => void;
  onDelete: (id: string) => void;
  onToggleLongDesc: (id: string) => void;
}) {
  const { base, tax, total } = calcLine(item);

  return (
    <div className="group relative">
      <div className={`
        flex items-start gap-2 p-3 rounded-xl border transition-all duration-200
        ${item.qty > 0 && item.unitPrice > 0
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
        <div className="flex-1 grid grid-cols-12 gap-2 min-w-0">
          {/* Code */}
          <div className="col-span-2">
            <input
              value={item.code}
              onChange={e => onChange(item.id, 'code', e.target.value)}
              onBlur={async (e) => {
                const val = e.target.value.trim();
                // Only autocomplete if we don't have a description yet and the code is long enough
                if (val && val.length >= 3 && (!item.shortDesc || item.shortDesc.trim() === '')) {
                  try {
                    const res = await buscarItemPorCodigo(val);
                    if (res) {
                      onChange(item.id, 'shortDesc', res.name);
                      if (!item.longDesc) onChange(item.id, 'longDesc', res.description);
                      if (item.unitPrice === 0) onChange(item.id, 'unitPrice', res.price);
                      if (res.type === 'producto') onChange(item.id, 'productoId', res.id);
                      if (res.type === 'activo') onChange(item.id, 'activoId', res.id);
                    }
                  } catch(e) { console.error('Error in onBlur search:', e); }
                }
              }}
              placeholder="Código"
              className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 print:border-transparent print:bg-transparent print:p-0 print:text-slate-800"
            />
          </div>

          {/* Description */}
          <div className="col-span-4">
            <input
              value={item.shortDesc}
              onChange={e => onChange(item.id, 'shortDesc', e.target.value)}
              placeholder="Descripción del producto o servicio"
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 print:font-semibold print:border-transparent print:bg-transparent print:p-0 print:text-slate-800"
            />
            {item.showLongDesc && (
              <textarea
                value={item.longDesc}
                onChange={e => onChange(item.id, 'longDesc', e.target.value)}
                placeholder="Descripción técnica detallada, especificaciones, número de serie..."
                rows={3}
                className="mt-1.5 w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none placeholder:text-slate-300 text-slate-600 print:border-transparent print:bg-transparent print:p-0 print:mt-0"
              />
            )}
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

          {/* Tax */}
          <div className="col-span-1">
            <select
              value={item.tax}
              onChange={e => onChange(item.id, 'tax', e.target.value as TaxType)}
              className="w-full text-[10px] font-semibold border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer print:border-transparent print:bg-transparent print:p-0 print:appearance-none print:text-slate-800"
            >
              <option value="isv15">ISV 15%</option>
              <option value="exento">Exento</option>
            </select>
          </div>

          {/* Subtotal */}
          <div className="col-span-2 flex items-center justify-end">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{fmt(total)}</p>
              {item.tax === 'isv15' && (
                <p className="text-[10px] text-slate-400">+{fmt(tax)} ISV</p>
              )}
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

export default function DocumentBuilderClient({ organization }: { organization?: any }) {
  const [docType, setDocType] = useState<DocType>('cotizacion');
  const [docNumber, setDocNumber] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [globalDiscount, setGlobalDiscount] = useState<number | string>(0);
  const [paymentTerms, setPaymentTerms] = useState('30 días netos');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'clients' | 'products'>('clients');
  const [showPreview, setShowPreview] = useState(false);

  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Carregar datos
  useEffect(() => {
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

  const filteredClients = allClients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.rtn.includes(clientSearch)
  );

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleLineChange = useCallback((id: string, field: keyof LineItem, val: unknown) => {
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
      productoId: product.type === 'producto' ? product.id : undefined,
      activoId: product.type === 'activo' ? product.id : undefined,
    };
    setLineItems(prev => {
      const hasEmpty = prev.some(l => !l.shortDesc && !l.unitPrice);
      return hasEmpty ? prev.map((l, i) => i === prev.length - 1 && !l.shortDesc ? newLine : l) : [...prev, newLine];
    });
    setShowProductModal(false);
  }, []);

  const handleSave = async () => {
    if (!selectedClient) {
      toast.error('Debe seleccionar un cliente');
      return;
    }
    const validItems = lineItems.filter(i => Number(i.qty) > 0 && String(i.shortDesc).trim() !== '' && Number(i.unitPrice) >= 0);
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un ítem válido');
      return;
    }

    setIsSaving(true);
    try {
      // Cálculo aproximado de gravado
      const totalGravado15 = validItems.reduce((acc, item) => item.tax === 'isv15' ? acc + (Number(item.qty) * Number(item.unitPrice) * (1 - Number(item.discount) / 100)) : acc, 0);
      const totalExento = validItems.reduce((acc, item) => item.tax === 'exento' ? acc + (Number(item.qty) * Number(item.unitPrice) * (1 - Number(item.discount) / 100)) : acc, 0);

      const dGlobal = Number(globalDiscount) || 0;

      const data = {
        clienteId: selectedClient.id,
        tipoDocumento: docType === 'borrador' ? 'BORRADOR' : docType === 'cotizacion' ? 'COTIZACION' : docType === 'proforma' ? 'PROFORMA' : 'FACTURA',
        notas: notes,
        terminosPago: paymentTerms,
        validezDias: validityDays,
        subTotal: subtotalBase,
        descuentos: discountAmount,
        totalExento: totalExento - (totalExento * (dGlobal / 100)),
        totalExonerado: 0,
        totalGravado15: totalGravado15 - (totalGravado15 * (dGlobal / 100)),
        isv15: totalTax, // Ya calculado en la UI (puede ser con descuento o sin descuento dependiendo del código, el MOCK descontaba de la base?)
        totalGravado18: 0,
        isv18: 0,
        total: grandTotal
      };
      
      const res = await guardarDocumentoBuilder(data, validItems);
      if (res.success) {
        toast.success(`Documento guardado: ${res.correlativo}`);
        setTimeout(() => router.push('/facturas'), 1000);
      } else {
        toast.error(res.error || 'Error al guardar el documento');
      }
    } catch(e: any) {
      toast.error(e.message || 'Error desconocido al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Totals
  const subtotalBase = lineItems.reduce((acc, item) => acc + calcLine(item).base, 0);
  const totalTax = lineItems.reduce((acc, item) => acc + calcLine(item).tax, 0);
  const discountAmount = subtotalBase * ((Number(globalDiscount) || 0) / 100);
  const grandTotal = subtotalBase - discountAmount + totalTax;

  const currentDocType = DOC_TYPES.find(d => d.key === docType)!;

  const docTypeStatusConfig: Record<DocType, { badge: string; label: string }> = {
    borrador: { badge: 'bg-slate-100 text-slate-500 border border-slate-200', label: 'BORRADOR' },
    cotizacion: { badge: 'bg-blue-50 text-blue-600 border border-blue-200', label: 'COTIZACIÓN' },
    proforma: { badge: 'bg-violet-50 text-violet-600 border border-violet-200', label: 'PRO FORMA' },
    factura: { badge: 'bg-emerald-50 text-emerald-600 border border-emerald-200', label: 'FACTURA OFICIAL' },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans print:bg-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-slate-400">{docNumber}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${docTypeStatusConfig[docType].badge}`}>
                  {docTypeStatusConfig[docType].label}
                </span>
              </div>
              <button onClick={() => setShowClientModal(true)} className="text-sm font-bold text-blue-600 hover:text-blue-700 mt-0.5 text-left transition-colors">
                {selectedClient?.name || <span className="font-normal italic">Seleccionar cliente...</span>}
              </button>
            </div>
          </div>

          <DocTypeSelector value={docType} onChange={setDocType} />

          <div className="flex items-center gap-2">
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
        <div className="flex-1 min-w-0 space-y-4 print:space-y-0 print:m-0">

          {/* Document Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">

            {/* Document Header */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 md:p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {organization?.logoUrl ? (
                      <img src={organization.logoUrl} alt={organization.name || 'Logo'} className="h-12 w-auto object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0">
                        <Stethoscope size={20} className="text-blue-300" />
                      </div>
                    )}
                    <div>
                      <p className="text-white font-black text-lg leading-none print:text-slate-800">{organization?.name || 'Comercial'}</p>
                      <p className="text-blue-300 text-xs font-medium print:text-slate-500">{organization?.qrPrefix || 'Facturación'}</p>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    {organization?.direccion && <p className="text-slate-400 text-[11px] whitespace-pre-wrap max-w-[350px] leading-relaxed">{organization.direccion}</p>}
                    <p className="text-slate-400 text-[11px]">
                      {organization?.rtn && `RTN: ${organization.rtn}`}
                      {organization?.rtn && organization?.telefono && ' · '}
                      {organization?.telefono && `${organization.telefono}`}
                    </p>
                    {organization?.correoContacto && <p className="text-slate-400 text-[11px]">{organization.correoContacto}</p>}
                    {!organization?.direccion && !organization?.rtn && !organization?.correoContacto && (
                       <>
                         <p className="text-slate-400 text-[11px]">Centro de Operaciones</p>
                         <p className="text-slate-400 text-[11px]">Configura tu empresa en White Label</p>
                       </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl mb-3 ${currentDocType.bg} border print:border-slate-300`}>
                    <span className={currentDocType.color}>{currentDocType.icon}</span>
                    <span className={`text-xs font-bold ${currentDocType.color}`}>{currentDocType.label.toUpperCase()}</span>
                  </div>
                  <p className="text-white font-black text-xl font-mono print:text-slate-800 whitespace-nowrap">{docNumber}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 justify-end">
                       <span className="text-slate-400 text-[11px] print:text-slate-500">Fecha:</span>
                       <span className="text-white text-[11px] font-semibold print:text-slate-800">{today}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                       <span className="text-slate-400 text-[11px] print:text-slate-500">Válido hasta:</span>
                       <span className="text-blue-300 text-[11px] font-semibold print:text-slate-800">{futureDate(validityDays)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client info strip */}
              <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap md:flex-nowrap items-center gap-4 relative print:border-slate-200">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">Cliente</p>
                  <button onClick={() => setShowClientModal(true)} className="text-white hover:text-blue-300 text-sm font-semibold flex items-center gap-2 transition-colors print:text-slate-800">
                    {selectedClient?.name || 'Seleccionar cliente...'} <Search size={14} className="opacity-50 print:hidden" />
                  </button>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">RTN</p>
                  <p className="text-white text-xs font-mono print:text-slate-800">{selectedClient?.rtn || '—'}</p>
                </div>
                <div className="w-32">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">Términos de Pago</p>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="bg-transparent text-blue-300 text-sm font-semibold border-none outline-none cursor-pointer w-full p-0 focus:ring-0 print:appearance-none print:text-slate-800"
                  >
                    <option value="Contado" className="bg-slate-800">Contado</option>
                    <option value="15 días netos" className="bg-slate-800">15 días</option>
                    <option value="30 días netos" className="bg-slate-800">30 días</option>
                    <option value="60 días netos" className="bg-slate-800">60 días</option>
                    <option value="90 días netos" className="bg-slate-800">90 días</option>
                  </select>
                </div>
                <div className="w-24">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 print:text-slate-500">Vigencia</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={validityDays}
                      onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                      className="bg-transparent text-blue-300 text-sm font-semibold border-none outline-none w-8 p-0 focus:ring-0 print:text-slate-800"
                    />
                    <span className="text-blue-300 text-sm font-semibold print:text-slate-800">días</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="p-5">
              {/* Column headers */}
              <div className="flex items-center gap-2 mb-3 px-3">
                <div className="w-5 shrink-0" />
                <div className="flex-1 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="col-span-2">Código</div>
                  <div className="col-span-4">Descripción</div>
                  <div className="col-span-1 text-center">Cant.</div>
                  <div className="col-span-2">P. Unitario</div>
                  <div className="col-span-1">Impuesto</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>
                <div className="w-16 shrink-0" />
              </div>

              {/* Items */}
              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={handleLineChange}
                    onDelete={handleDeleteLine}
                    onToggleLongDesc={handleToggleLongDesc}
                  />
                ))}
              </div>

              {/* Add Line Buttons */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3 print:hidden">
                <button
                  onClick={() => setShowProductModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  <Search size={16} />
                  Buscar en Catálogo
                </button>
                <button
                  onClick={() => setLineItems(prev => [...prev, emptyLine()])}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl text-sm text-slate-400 hover:text-blue-500 hover:bg-slate-50 transition-all font-medium"
                >
                  <Plus size={16} />
                  Renglón Manual
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="px-5 pb-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notas y Condiciones</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Condiciones de entrega, garantía, soporte técnico incluido, instrucciones especiales..."
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none placeholder:text-slate-300 text-slate-600 print:border-transparent print:bg-transparent print:p-0 print:text-slate-800"
              />
            </div>

            {/* Totals Section */}
            <div className="border-t border-slate-100 bg-slate-50/70 p-6">
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Resumen Financiero</p>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Subtotal (sin ISV)</span>
                    <span className="text-sm font-semibold text-slate-700">{fmt(subtotalBase)}</span>
                  </div>

                  {/* Global Discount */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Descuento Global</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={globalDiscount}
                          onChange={e => setGlobalDiscount(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                          className="w-12 text-xs text-center border border-slate-200 rounded-lg px-1 py-1 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all print:hidden"
                        />
                        <span className="hidden print:inline-block text-xs font-semibold text-slate-800">{globalDiscount}%</span>
                        <Percent size={11} className="absolute right-1.5 text-slate-400 print:hidden" />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-red-500">-{fmt(discountAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">ISV (15%)</span>
                    <span className="text-sm font-semibold text-amber-600">{fmt(totalTax)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-black text-slate-800">TOTAL A PAGAR</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-blue-600 tabular-nums">{fmt(grandTotal)}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Lempiras Hondureños</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-2 print:hidden">
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-2xl font-bold text-sm shadow-lg transition-all ${isSaving ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5'}`}
                    >
                      {isSaving ? 'Guardando...' : docType === 'factura' ? (
                        <><CheckCircle2 size={16} /> Emitir Factura Oficial</>
                      ) : docType === 'proforma' ? (
                        <><Receipt size={16} /> Generar Factura Pro Forma</>
                      ) : (
                        <><Send size={16} /> Guardar {currentDocType.label}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center gap-3 print:hidden">
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
              <span className="text-xs font-semibold text-emerald-700">{lineItems.length} renglón{lineItems.length !== 1 ? 'es' : ''} · {fmt(grandTotal)} total</span>
            </div>
          </div>
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
              <button onClick={() => setShowClientModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
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
    </div>
  );
}
