'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { X, Search, Camera, Package, Loader2, CheckCircle2, ChevronDown, Sparkles, Printer, MapPin, CalendarDays } from 'lucide-react';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { checkExistingByBarcode, getActivosByGrupo, createActivo, encolarCopiasNiimbot, getUbicacionesActivasByProducto, getActivosByDescripcionCorta } from './actions';
import { type GS1Fields, gs1DateToISO } from '@/lib/gs1';
import { AreaSplitInput } from '@/components/ui/AreaSplitInput';
import { DateInput } from '@/components/ui/DateInput';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {children} {required && <span className="text-red-500">*</span>}
        </label>
    );
}

const inputCls = "w-full text-base border-2 border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 focus:border-[#0500A3]/50 bg-white transition-all placeholder:text-slate-300";

// Reusable Combobox included for standalone use
function Combobox({
    options, value, onChange, placeholder, disabled
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const filtered = query.trim() === ''
        ? options
        : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.value.toLowerCase().includes(query.toLowerCase()));

    const selected = options.find(o => o.value === value);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function select(v: string) { onChange(v); setOpen(false); setQuery(''); }

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}
                className={`w-full flex items-center justify-between text-base border-2 rounded-xl px-4 py-3.5 text-left transition-all focus:outline-none 
                    ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-transparent' : 'border-slate-200 bg-white'}
                    ${open ? 'ring-2 ring-emerald-500/30 border-emerald-500/50' : 'hover:border-slate-300'}`}>
                <span className={`truncate ${selected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {selected ? selected.label : (placeholder || 'Seleccionar...')}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 left-0 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" autoFocus placeholder="Escribe para buscar..." value={query} onChange={e => setQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="text-sm text-slate-400 text-center py-4">Sin resultados</div>
                        ) : filtered.map(o => (
                            <button key={o.value} type="button" onClick={() => select(o.value)}
                                className={`w-full text-left px-4 py-3 text-sm truncate hover:bg-emerald-50 transition-colors
                                    ${value === o.value ? 'bg-emerald-50/50 font-bold text-emerald-700' : 'text-slate-700'}`}>
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

type RestockModalProps = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    dbAreas: { name: string }[];
    gruposDisponibles: { codigoGrupo: string; descripcionCorta: string; cantidad: number }[];
};

export function RestockModal({ open, onClose, onSuccess, dbAreas, gruposDisponibles }: RestockModalProps) {
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    // Search states
    const [codigoBarrasSearch, setCodigoBarrasSearch] = useState('');
    const [codigoGrupoSearch, setCodigoGrupoSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Selected product state
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

    // Form inputs state
    const [area, setArea] = useState('');
    const [cantidad, setCantidad] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmittingPrint, setIsSubmittingPrint] = useState(false);
    const [ubicacionesSugeridas, setUbicacionesSugeridas] = useState<{area:string; stock:number}[]>([]);
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    const [serie, setSerie] = useState('');

    // Auto-search by barcode
    useEffect(() => {
        if (codigoBarrasSearch.length > 3) {
            const timeout = setTimeout(() => {
                buscarPorCodigoBarras(codigoBarrasSearch);
            }, 600);
            return () => clearTimeout(timeout);
        } else if (!codigoGrupoSearch && !codigoBarrasSearch) {
            setSelectedProduct(null);
        }
    }, [codigoBarrasSearch]);

    // Auto-search by group code
    useEffect(() => {
        if (codigoGrupoSearch) {
            buscarPorDescripcionCorta(codigoGrupoSearch);
        }
    }, [codigoGrupoSearch]);

    async function buscarPorCodigoBarras(cb: string) {
        setIsSearching(true);
        try {
            const prod = await checkExistingByBarcode(cb);
            if (prod) {
                setSelectedProduct(prod);
                setCodigoGrupoSearch('');
                // Default to product's last known area if empty
                if (!area && prod.area) setArea(prod.area);
                
                const ubs = await getUbicacionesActivasByProducto(cb, 'codigoBarras');
                setUbicacionesSugeridas(ubs);
            } else {
                setSelectedProduct(null);
                setUbicacionesSugeridas([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    }

    async function buscarPorDescripcionCorta(desc: string) {
        setIsSearching(true);
        try {
            const activos = await getActivosByDescripcionCorta(desc);
            if (activos && activos.length > 0) {
                // Tomar el primero as the representative model
                // Note: The UI card needs imagenUrl, descripcionCorta, marca, modelo which checkExistingByBarcode returns.
                // We'll construct a mock product from getActivosByDescripcionCorta or just use the first item data.
                setSelectedProduct({
                    ...activos[0],
                    isFromGroup: true // flag knowing we don't have exactly one barcode matching
                });
                if (!area && activos[0].area) setArea(activos[0].area);

                const ubs = await getUbicacionesActivasByProducto(desc, 'descripcionCorta');
                setUbicacionesSugeridas(ubs);
            } else {
                setSelectedProduct(null);
                setUbicacionesSugeridas([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    }

    function handleScanSuccess(val: string, gs1?: GS1Fields) {
        let cleanText = val.trim();
        if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
            try {
                const url = new URL(cleanText);
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts.length > 0) cleanText = parts[parts.length - 1];
            } catch {
                cleanText = cleanText.substring(cleanText.lastIndexOf('/') + 1);
            }
        }
        
        setCodigoBarrasSearch(cleanText);
        setIsScannerOpen(false);
        
        if (gs1?.fechaVenc) {
            const iso = gs1DateToISO(gs1.fechaVenc);
            if (iso) setFechaVencimiento(iso);
        }
    }

    async function executeSave(print: boolean = false) {
        if (!selectedProduct) return;
        if (Number(cantidad) < 1) return alert('Cantidad debe ser al menos 1');

        if (print) setIsSubmittingPrint(true); else setIsSubmitting(true);
        try {
            const fd = new FormData();
            fd.set('area', area.toUpperCase());
            fd.set('cantidad', cantidad);
            if (fechaVencimiento) fd.set('fechaVencimiento', fechaVencimiento);

            if (selectedProduct.codigoBarras) {
                fd.set('codigoBarras', selectedProduct.codigoBarras);
            } else if (selectedProduct.codigoGrupo) {
                fd.set('codigoGrupo', selectedProduct.codigoGrupo);
            }
            
            // Populate base properties for independent record cloning
            if (serie) fd.set('serie', serie);
            if (selectedProduct.descripcionCorta) fd.set('descripcionCorta', selectedProduct.descripcionCorta);
            if (selectedProduct.descripcionDetallada) fd.set('descripcionDetallada', selectedProduct.descripcionDetallada);
            if (selectedProduct.marca) fd.set('marca', selectedProduct.marca);
            if (selectedProduct.modelo) fd.set('modelo', selectedProduct.modelo);
            if (selectedProduct.imagenUrl) fd.set('imagenUrl', selectedProduct.imagenUrl);
            if (selectedProduct.categoriaId) fd.set('categoriaId', selectedProduct.categoriaId);
            if (selectedProduct.esConsumible !== undefined) fd.set('esConsumible', String(selectedProduct.esConsumible));
            fd.set('cuentaAct', selectedProduct.cuentaAct || 'INVENTARIO');

            const result = await createActivo(fd);
            if (!result || !result.success) throw new Error('Falló la creación o reabastecimiento.');
            
            if (print && result.id) {
                await encolarCopiasNiimbot(result.id, Number(cantidad));
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            alert('Error al reingresar: ' + err.message);
        } finally {
            if (print) setIsSubmittingPrint(false); else setIsSubmitting(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        executeSave(false);
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-0 sm:p-4 md:p-6">
                <div className="bg-white w-full sm:rounded-3xl shadow-2xl sm:max-w-xl sm:my-8 overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-emerald-600 px-6 py-5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Reingreso / Restock</h2>
                                <p className="text-emerald-100 text-xs font-medium mt-0.5">Sumar existencias a un producto</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 md:p-8 shrink-0 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Search className="w-4 h-4 text-emerald-600" />
                            Paso 1: Identificar el producto
                        </h3>
                        <div className="flex flex-col gap-4">
                            {/* Buscar por Código de Barras */}
                            <div>
                                <FieldLabel>Código de Barras / UDI GS1</FieldLabel>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="text" 
                                            value={codigoBarrasSearch}
                                            onChange={e => { setCodigoBarrasSearch(e.target.value); setCodigoGrupoSearch(''); }}
                                            placeholder="Ej: 00123456789..." 
                                            className={`${inputCls} font-mono pl-4 focus:border-emerald-500 focus:ring-emerald-500/30`} 
                                        />
                                        {isSearching && codigoBarrasSearch && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
                                    </div>
                                    <button type="button" onClick={() => setIsScannerOpen(true)}
                                        className="shrink-0 flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 rounded-xl font-bold transition-colors active:scale-95 border border-emerald-200">
                                        <Camera className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="h-px bg-slate-200 flex-1"></div>
                                <span className="text-xs font-bold text-slate-400 uppercase">o buscar producto por grupo</span>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>

                            {/* Buscar por Nombre/Grupo */}
                            <div>
                                <FieldLabel>Buscar por Nombre / Grupo Creado</FieldLabel>
                                <Combobox
                                    options={gruposDisponibles.map(g => ({ value: g.descripcionCorta, label: `${g.codigoGrupo || '001'} - ${g.descripcionCorta} (${g.cantidad})` }))}
                                    value={codigoGrupoSearch}
                                    onChange={(v) => {
                                        setCodigoGrupoSearch(v);
                                        setCodigoBarrasSearch('');
                                    }}
                                    placeholder="Seleccionar código o escribir descripción..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Card Result */}
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                        <div className="p-6 md:p-8 flex-1">
                            {!selectedProduct ? (
                                <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <Package className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Busca o escanea un producto para continuar</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Product Preview Card */}
                                    <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 shadow-sm flex gap-4 items-start">
                                        {selectedProduct.imagenUrl ? (
                                            <img src={selectedProduct.imagenUrl} alt="producto" className="w-20 h-20 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0" />
                                        ) : (
                                            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                                <Package className="w-8 h-8 opacity-50" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-black text-slate-800 text-lg leading-tight truncate">{selectedProduct.descripcionCorta || 'Sin nombre corto'}</h4>
                                                <span className="shrink-0 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md mt-0.5">Detectado</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{selectedProduct.descripcionDetallada || 'Sin descripción detallada'}</p>
                                            
                                            <div className="flex gap-2 mt-2">
                                                {(selectedProduct.codigoBarras || selectedProduct.codigoGrupo) && (
                                                    <span className="inline-flex font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                                        {selectedProduct.codigoBarras || `GRUPO: ${selectedProduct.codigoGrupo}`}
                                                    </span>
                                                )}
                                                {selectedProduct.marca && (
                                                    <span className="inline-flex text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                                                        {selectedProduct.marca}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Chips */}
                                    {ubicacionesSugeridas.length > 0 && (
                                        <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                            <p className="text-xs font-bold text-slate-500 mb-3 uppercase flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                Ubicaciones actuales de este producto:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {ubicacionesSugeridas.map((ub, i) => (
                                                    <button 
                                                        key={i} 
                                                        type="button" 
                                                        onClick={() => setArea(ub.area)}
                                                        className="flex items-center gap-2 bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-xl text-sm font-black transition-colors active:scale-95 shadow-sm"
                                                    >
                                                        {ub.area}
                                                        <span className="bg-slate-200 text-slate-600 rounded-md px-1.5 py-0.5 text-[10px] font-black border border-slate-200">{ub.stock} ud.</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Toca una píldora para rellenar automáticamente la ubicación de este lote.</p>
                                        </div>
                                    )}

                                    {/* Action Fields */}
                                    <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
                                        <h3 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Paso 2: Detalles del Reingreso
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel required>Cantidad a añadir</FieldLabel>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={cantidad}
                                                    onChange={e => setCantidad(e.target.value)}
                                                    className={`${inputCls} font-mono font-black text-center text-2xl py-3 border-emerald-200 focus:ring-emerald-500/30 focus:border-emerald-500 text-emerald-700`}
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel required>Área / Ubicación</FieldLabel>
                                                <AreaSplitInput
                                                    id="area"
                                                    value={area}
                                                    onChange={val => setArea(val)}
                                                    required
                                                    dbAreas={dbAreas}
                                                />
                                            </div>
                                            <div className="col-span-1 sm:col-span-2">
                                                <FieldLabel>Fecha de Vencimiento <span className="text-slate-400 font-normal ml-1">(Opcional)</span></FieldLabel>
                                                <DateInput
                                                    value={fechaVencimiento}
                                                    onChange={setFechaVencimiento}
                                                    className={`${inputCls} font-mono`}
                                                />
                                            </div>
                                            <div className="col-span-1 sm:col-span-2">
                                                <FieldLabel>No. Serie <span className="text-slate-400 font-normal ml-1">(Opcional)</span></FieldLabel>
                                                <input
                                                    type="text"
                                                    value={serie}
                                                    onChange={e => setSerie(e.target.value)}
                                                    placeholder="Al indicar una serie se creará un registro de equipo nuevo e independiente"
                                                    className={`${inputCls} font-mono`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={() => executeSave(false)}
                                disabled={!selectedProduct || isSubmitting || isSubmittingPrint}
                                className="flex-1 flex items-center justify-center gap-2 text-base font-bold bg-white text-emerald-700 py-4 px-5 rounded-2xl border-2 border-emerald-500 hover:bg-emerald-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:border-slate-200 disabled:text-slate-400"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                {isSubmitting ? 'Guardando...' : `Solo Registrar`}
                            </button>
                            <button
                                type="button"
                                onClick={() => executeSave(true)}
                                disabled={!selectedProduct || isSubmitting || isSubmittingPrint}
                                className="flex-[2] flex items-center justify-center gap-2 text-lg font-bold bg-emerald-500 text-white py-4 px-5 rounded-2xl hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 shadow-md"
                            >
                                {isSubmittingPrint ? <Loader2 className="w-6 h-6 animate-spin" /> : <Printer className="w-6 h-6" />}
                                {isSubmittingPrint ? 'Imprimiendo...' : `Registrar e Imprimir (${cantidad})`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <BarcodeScannerModal
                onOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
            />
        </div>
    );
}
