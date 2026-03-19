'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Package, Search, Plus, Filter, ChevronLeft, ChevronRight,
    X, Upload, Pencil, Trash2, QrCode, CheckCircle2, AlertTriangle,
    TrendingDown, MapPin, Loader2, Eye, Camera, Sparkles, ChevronDown, Printer, ExternalLink, Eraser, RotateCw
} from 'lucide-react';
import { getActivos, getActivoStats, createActivo, updateActivo, deleteActivo, previewIdQr, closeArea, clearPrintQueue, getActiveUserArea, validateAndOpenArea, getGruposAutocompletado, encolarLoteImpresion, getCategorias, createCategoria } from './actions';
import { removeBackground } from '@imgly/background-removal';

// ─── Preview Etiqueta Modal ───────────────────────────────────────────────────
function PreviewEtiquetaModal({ activo, onClose, onPrint, isPrinting }: { activo: Activo; onClose: () => void; onPrint: () => void; isPrinting: boolean }) {
    const searchParams = new URLSearchParams({
        idQr: activo.idQr,
        descripcion: activo.descripcionCorta || '',
        area: activo.area || '',
        cuenta: activo.cuentaAct || '',
        codigoBarras: activo.codigoBarras || '',
        modelo: activo.modelo || '',
        marca: activo.marca || '',
        fechaAdq: (activo as any).createdAt ? new Date((activo as any).createdAt).toISOString() : new Date().toISOString()
    });
    const url = `/api/impresion/generar-etiqueta?${searchParams.toString()}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 relative max-w-lg w-full">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2.5 rounded-xl"><Printer className="w-5 h-5 text-[#0500A3]" /></div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 leading-tight">Vista Previa de Etiqueta QR</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Asegúrate de que la impresora NIIMBOT K3 esté conectada y lista.</p>
                    </div>
                </div>
                <div className="border-4 border-slate-100 rounded-xl p-4 bg-slate-50 flex justify-center mb-6 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} className="w-full max-w-[406px] h-auto object-contain bg-white shadow-sm" alt="Preview Etiqueta" />
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 font-semibold border-2 border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
                    <button onClick={() => { onPrint(); onClose(); }} disabled={isPrinting} className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#0500A3] text-white hover:bg-[#0600c2] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-70">
                        {isPrinting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Printer className="w-5 h-5" />} Enviar a Impresora
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Las áreas se cargan dinámicamente de la tabla "Area" mediante getAreas

// Responsable por defecto según área (editable en el formulario)
export const RESPONSABLES: Record<string, string> = {
    'PB-A1-OF.PASTOR': 'ROGER DIAZ',
    'PB-A2-OF.ADM': 'ROBERTO FUNEZ',
    'PB-A3-S.CUNA': 'BELINDA DE VEGA',
    'PB-A4-ENFERM': 'JORGE PUERTO',
    'PB-A5-S.JUNTAS': 'JORGE PUERTO',
    'PB-A6-COCINETA': 'MIRIAM DE PUERTO',
    'PB-A7-OF.JOVEN': 'JOSUE RODRIGUEZ',
    'PB-A8-OF.EB': 'YOLANDA MONROY',
    'PB-A9-EB': 'YOLANDA MONROY',
    'PB-A10-EB': 'YOLANDA MONROY',
    'PB-A11-COCIN CAF': 'GENOVEBA MATUTE',
    'PB-A12-SALON CAF': 'GENOVEBA MATUTE',
    'PB-A13-AUDIO': 'OSCAR BEJARANO',
    'PB-A14-MULTI': 'ISAAC PAZ',
    'PB-A15-TEMPLO': 'JORGE PUERTO',
    'PB-A16-PLATAFO': 'EDIE PAZ',
    'PB-A17-OF': 'ISAAC PAZ',
    'PB-A18-OF. IMCE': 'ISAAC PAZ',
    'PA-A1-SAL.MUL': 'JORGE PUERTO',
    'PA-A2-OFICINA': 'DAVID DIAZ',
    'PA-A3-EB': 'YOLANDA MONROY',
    'PA-A4-EB': 'YOLANDA MONROY',
    'PA-A5-EB': 'YOLANDA MONROY',
    'PA-A6-EB': 'YOLANDA MONROY',
    'PA-B1-PASILLO': 'JORGE PUERTO',
    'PB-B1-OFICINA': 'ISAAC PAZ',
    'PB-B2-PASILLO': 'MIRIAM DE PUERTO',
    'PB-B3-TRASERA': 'MIRIAM DE PUERTO',
    'PB-B4-TEMPLO': 'OSCAR BEJARANO',
    'PB-B5-TEMPLO': 'JORGE PUERTO',
    'B6-EXTERNA CV': 'ISAAC PAZ',
    'PB-A32-PT.VIGILANCIA': 'JESMY PEREZ',
};

export const CUENTAS = [
    'Terrenos', 'Edificios', 'Vehículos', 'Equipo de Cómputo',
    'Mobiliario y Equipo de Oficina', 'Mobiliario y Equipo de Templo',
    'Equipo de Audio e Instrumentos', 'Mejoras a Edificios', 'Equipos Diversos',
];

const ESTATUS = ['VIGENTE', 'DEPRECIADO', 'PROCESO DE BAJA'];
const ESTADO_DANO = ['DAÑADO', 'FALTANTE', 'NO REGISTRADO', 'INSERVIBLE'];
const TIPO_INCIDENCIA = ['Faltante', 'Extraviado', 'No Registrado'];
const ACCION_RECOMENDADA = ['Reparar', 'Mantenimiento', 'Dar de baja', 'Reponer'];

type Activo = {
    id: string;
    idQr: string;
    descripcionCorta: string;
    descripcionDetallada?: string | null;
    marca?: string | null;
    modelo?: string | null;
    serie?: string | null;
    area: string;
    cuentaAct: string;
    estatusContable: string;
    fechaAdq?: Date | null;
    fechaLevantamiento?: Date | null;
    integrado: boolean;
    costoAdq?: any;
    origenActivo?: string | null;
    imagenUrl?: string | null;
    imagenPlacaUrl?: string | null;
    estadoDano?: string | null;
    tipoIncidencia?: string | null;
    accionRecomendada?: string | null;
    responsable?: string | null;
    observaciones?: string | null;

    historicoId?: string | null;
    categoriaDepreciacion?: string | null;
    vidaUtilOverride?: any;
    codigoGrupo?: string | null;
    codigoBarras?: string | null;
    compatibilidad?: string[];
    categoriaId?: string | null;
    categoria?: { id: string; nombre: string; color?: string | null } | null;
    esConsumible?: boolean;
    fechaVencimiento?: Date | string | null;
    lote?: string | null;
    stock?: number;
};

const CATEGORIAS_DEPRECIACION = [
    { value: 'EDIFICIOS_40', label: 'Edificios (40 años)', years: 40 },
    { value: 'MEJORAS_EDIFICIOS_10', label: 'Mejoras a Edificios (10 años mín)', years: 10 },
    { value: 'VEHICULOS_5', label: 'Vehículos (5 años)', years: 5 },
    { value: 'COMPUTACION_10', label: 'Equipo de Cómputo (10 años)', years: 10 },
    { value: 'MOBILIARIO_10', label: 'Mobiliario y Equipo (10 años)', years: 10 },
    { value: 'AUDIO_INSTRUMENTOS_10', label: 'Audio e Instrumentos (10 años)', years: 10 },
    { value: 'OTRAS_INSTALACIONES_10', label: 'Otras Instalaciones (10 años)', years: 10 },
];

function getMatchingCategoriaDepreciacion(cuenta: string | null | undefined, vidaUtil: string | number | null | undefined): string | null {
    let matchCatVal = null;
    if (cuenta) {
        if (cuenta.includes('Mobiliario') || cuenta.includes('Equipo de Oficina') || cuenta.includes('Templo')) matchCatVal = 'MOBILIARIO_10';
        else if (cuenta.includes('Audio')) matchCatVal = 'AUDIO_INSTRUMENTOS_10';
        else if (cuenta.includes('Cómputo') || cuenta.includes('Computo')) matchCatVal = 'COMPUTACION_10';
        else if (cuenta.includes('Mejoras')) matchCatVal = 'MEJORAS_EDIFICIOS_10';
        else if (cuenta.includes('Edificios')) matchCatVal = 'EDIFICIOS_40';
        else if (cuenta.includes('Vehículos') || cuenta.includes('Vehiculos')) matchCatVal = 'VEHICULOS_5';
        else if (cuenta.includes('Instalaciones')) matchCatVal = 'OTRAS_INSTALACIONES_10';
    }
    if (!matchCatVal && vidaUtil) {
        const matchCatObj = CATEGORIAS_DEPRECIACION.find(c => c.years === Number(vidaUtil));
        if (matchCatObj) matchCatVal = matchCatObj.value;
    }
    return matchCatVal;
}

type AiResult = {
    descripcionCorta?: string;
    descripcionDetallada?: string;
    marca?: string;
    modelo?: string;
    cuentaAct?: string;
    confianza?: string;
    error?: string;
    palabrasClaveBusqueda?: string[];
};

function getLocalDateString(dateInput?: Date | string | null): string {
    let d = new Date();
    if (dateInput) {
        d = new Date(dateInput);
        // Fallback for invalid dates
        if (isNaN(d.getTime())) d = new Date();
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ─── Searchable Combobox ──────────────────────────────────────────────────────
function Combobox({
    options, value, onChange, placeholder, required, label, aiHighlight, allowClear, allowCustom
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    label?: string;
    aiHighlight?: boolean;
    allowClear?: boolean;
    allowCustom?: boolean;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const filtered = query.trim() === ''
        ? options
        : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.value.toLowerCase().includes(query.toLowerCase()));

    const selected = options.find(o => o.value === value);

    // Close on outside click
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
            {/* Trigger */}
            <button type="button" onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between text-base border-2 rounded-xl px-4 py-3.5 text-left transition-all focus:outline-none
                    ${aiHighlight ? 'border-purple-400 bg-purple-50' : 'border-slate-200 bg-white'}
                    ${open ? 'ring-2 ring-[#0500A3]/30 border-[#0500A3]/50' : 'hover:border-slate-300'}`}>
                <span className={`truncate ${selected || (allowCustom && value) ? 'text-slate-900' : 'text-slate-400'}`}>
                    {selected ? selected.label : (allowCustom && value ? value : (placeholder || 'Seleccionar...'))}
                </span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {allowClear && value && (
                        <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); setQuery(''); }}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                            title="Limpiar filtro"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown — bounds to trigger width */}
            {open && (
                <div className="absolute z-50 left-0 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                autoComplete="off"
                                autoFocus
                                placeholder="Escribe para buscar..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30"
                            />
                        </div>
                    </div>
                    {/* Options */}
                    <div className="max-h-64 overflow-y-auto">
                        {allowClear && (
                            <button type="button" onClick={() => select('')}
                                className={`w-full text-left px-4 py-3 text-sm whitespace-nowrap hover:bg-blue-50 transition-colors italic
                                    ${!value ? 'bg-[#0500A3]/5 font-semibold text-[#0500A3]' : 'text-slate-400'}`}>
                                — Todas las áreas —
                            </button>
                        )}
                        {filtered.length === 0 && !allowCustom ? (
                            <div className="text-sm text-slate-400 text-center py-4">Sin resultados para &ldquo;{query}&rdquo;</div>
                        ) : filtered.map(o => (
                            <button key={o.value} type="button" onClick={() => select(o.value)}
                                className={`w-full text-left px-4 py-3 text-sm truncate hover:bg-blue-50 transition-colors
                                    ${value === o.value ? 'bg-blue-50/50 font-medium text-[#0500A3]' : 'text-slate-700'}`}>
                                {o.label}
                            </button>
                        ))}

                        {/* Custom Option Button */}
                        {allowCustom && query.trim() !== '' && !options.some(o => o.value.toLowerCase() === query.trim().toLowerCase()) && (
                            <button type="button" onClick={() => select(query.trim())}
                                className="w-full text-left px-4 py-3 text-sm truncate hover:bg-green-50 transition-colors text-green-700 font-medium border-t border-slate-100 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Usar nuevo: "{query}"
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden input for form submission */}
            {required && <input type="text" name={label} value={value} readOnly required className="sr-only" tabIndex={-1} />}
        </div>
    );
}

// ─── Reusable Field Components (iPad-optimized) ───────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {children} {required && <span className="text-red-500">*</span>}
        </label>
    );
}

function PreviewField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`rounded-xl px-3 py-2.5 ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-slate-200'}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className={`text-sm font-semibold leading-snug truncate ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value}</p>
        </div>
    );
}

const inputCls = "w-full text-base border-2 border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 focus:border-[#0500A3]/50 bg-white transition-all placeholder:text-slate-300";
const inputAiCls = "w-full text-base border-2 border-purple-400 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-purple-50 transition-all placeholder:text-slate-300";
const selectCls = "w-full text-base border-2 border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 focus:border-[#0500A3]/50 bg-white transition-all appearance-none";

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{children}</span>
            <div className="h-px flex-1 bg-slate-100" />
        </div>
    );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function StatsCards({ stats }: { stats: any }) {
    const cards = [
        { label: 'Total de Productos', value: stats?.total ?? 0, sub: `${stats?.areasRegistradas ?? 0} áreas localizadas`, icon: Package, color: 'text-[#0500A3]', bg: 'bg-blue-50' },
        { label: 'En Inventario', value: stats?.vigente ?? 0, sub: 'Disponibles para venta/uso', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Obsoletos', value: (stats?.depreciado ?? 0) + (stats?.procesoBaja ?? 0), sub: `${stats?.procesoBaja ?? 0} en proceso de baja`, icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Para Reparación', value: stats?.conDano ?? 0, sub: 'Requieren atención', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    ];
    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            {cards.map(c => (
                <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
                    <div className={`${c.bg} p-2.5 rounded-lg shrink-0`}><c.icon className={`w-5 h-5 ${c.color}`} /></div>
                    <div className="min-w-0">
                        <div className="text-xs text-slate-500 font-medium mb-0.5 leading-tight">{c.label}</div>
                        <div className="text-2xl font-bold text-slate-900">{c.value}</div>
                        <div className="text-xs text-slate-400 mt-0.5 leading-tight">{c.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function EstatusBadge({ estatus }: { estatus: string }) {
    const map: Record<string, string> = {
        'VIGENTE': 'bg-emerald-100 text-emerald-700',
        'DEPRECIADO': 'bg-amber-100 text-amber-700',
        'PROCESO DE BAJA': 'bg-red-100 text-red-700',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[estatus] || 'bg-slate-100 text-slate-600'}`}>{estatus}</span>;
}

function DanoBadge({ dano }: { dano?: string | null }) {
    if (!dano) return <span className="text-slate-300 text-[10px]">OK</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">{dano}</span>;
}

// ─── CropModal ─────────────────────────────────────────────────────────────────
function CropModal({ imageSrc, onConfirm, onCancel }: {
    imageSrc: string;
    onConfirm: (blob: Blob) => void;
    onCancel: () => void;
}) {
    const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });
    const imgRef = useRef<HTMLImageElement>(null);
    const dragRef = useRef<{ type: string; sx: number; sy: number; sc: typeof crop } | null>(null);
    const [isBgRemoving, setIsBgRemoving] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(imageSrc);
    const [rotation, setRotation] = useState(0);

    async function removeBg() {
        if (isBgRemoving) return;
        setIsBgRemoving(true);
        try {
            const blob = await removeBackground(currentSrc);
            const newUrl = URL.createObjectURL(blob);
            setCurrentSrc(newUrl);
        } catch (err) {
            alert('Error al quitar el fondo. Asegúrate de tener conexión.');
        } finally {
            setIsBgRemoving(false);
        }
    }

    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

    function pct(e: React.PointerEvent) {
        const r = imgRef.current!.getBoundingClientRect();
        return { px: (e.clientX - r.left) / r.width * 100, py: (e.clientY - r.top) / r.height * 100 };
    }

    function startDrag(type: string, e: React.PointerEvent) {
        e.preventDefault(); e.stopPropagation();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        const { px, py } = pct(e);
        dragRef.current = { type, sx: px, sy: py, sc: { ...crop } };
    }

    function onMove(e: React.PointerEvent) {
        if (!dragRef.current) return;
        const { type, sx, sy, sc } = dragRef.current;
        const { px, py } = pct(e);
        const dx = px - sx, dy = py - sy, MIN = 15;
        setCrop(() => {
            let { x, y, w, h } = sc;
            if (type === 'move') {
                x = clamp(sc.x + dx, 0, 100 - w); y = clamp(sc.y + dy, 0, 100 - h);
            } else if (type === 'br') {
                w = clamp(sc.w + dx, MIN, 100 - x); h = clamp(sc.h + dy, MIN, 100 - y);
            } else if (type === 'tl') {
                const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN);
                const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
                w = sc.x + sc.w - nx; h = sc.y + sc.h - ny; x = nx; y = ny;
            } else if (type === 'tr') {
                const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
                w = clamp(sc.w + dx, MIN, 100 - sc.x); h = sc.y + sc.h - ny; y = ny;
            } else if (type === 'bl') {
                const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN);
                w = sc.x + sc.w - nx; x = nx; h = clamp(sc.h + dy, MIN, 100 - sc.y);
            }
            return { x, y, w, h };
        });
    }

    function apply(full: boolean) {
        const img = imgRef.current!;
        const { naturalWidth: nw, naturalHeight: nh } = img;
        
        const isRotated = rotation === 90 || rotation === 270;
        
        let sx, sy, sw, sh;
        if (full) {
            sx = 0; sy = 0; sw = nw; sh = nh;
        } else {
            // Apply crop percentages based on visual boundaries (which swap when rotated 90/270)
            const visualW = isRotated ? nh : nw;
            const visualH = isRotated ? nw : nh;
            
            const cropVisualX = crop.x / 100 * visualW;
            const cropVisualY = crop.y / 100 * visualH;
            const cropVisualW = crop.w / 100 * visualW;
            const cropVisualH = crop.h / 100 * visualH;

            if (rotation === 0) {
                sx = cropVisualX; sy = cropVisualY; sw = cropVisualW; sh = cropVisualH;
            } else if (rotation === 90) {
                sx = cropVisualY; sy = nw - cropVisualX - cropVisualW; sw = cropVisualH; sh = cropVisualW;
            } else if (rotation === 180) {
                sx = nw - cropVisualX - cropVisualW; sy = nh - cropVisualY - cropVisualH; sw = cropVisualW; sh = cropVisualH;
            } else { // 270
                sx = nh - cropVisualY - cropVisualH; sy = cropVisualX; sw = cropVisualH; sh = cropVisualW;
            }
            sx = Math.round(sx); sy = Math.round(sy); sw = Math.round(sw); sh = Math.round(sh);
        }

        const MAX = 1568;
        const visualSw = isRotated ? sh : sw;
        const visualSh = isRotated ? sw : sh;
        
        const ratio = Math.min(1, MAX / Math.max(visualSw, visualSh));
        
        const finalW = Math.round(visualSw * ratio);
        const finalH = Math.round(visualSh * ratio);
        
        const canvas = document.createElement('canvas');
        canvas.width = finalW; canvas.height = finalH;
        
        const ctx = canvas.getContext('2d')!;
        
        ctx.translate(finalW/2, finalH/2);
        ctx.rotate((rotation * Math.PI) / 180);
        
        if (isRotated) {
            ctx.drawImage(img, sx, sy, sw, sh, -finalH/2, -finalW/2, finalH, finalW);
        } else {
            ctx.drawImage(img, sx, sy, sw, sh, -finalW/2, -finalH/2, finalW, finalH);
        }
        
        canvas.toBlob(blob => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.85);
    }

    const handles = [
        { id: 'tl', style: { top: -8, left: -8, cursor: 'nwse-resize' } as React.CSSProperties },
        { id: 'tr', style: { top: -8, right: -8, cursor: 'nesw-resize' } as React.CSSProperties },
        { id: 'bl', style: { bottom: -8, left: -8, cursor: 'nesw-resize' } as React.CSSProperties },
        { id: 'br', style: { bottom: -8, right: -8, cursor: 'nwse-resize' } as React.CSSProperties },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black" style={{ touchAction: 'none' }}>
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <p className="text-white text-sm font-medium">📐 Arrastra el recuadro para recortar</p>
                <button onClick={onCancel} className="p-2 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto flex items-start justify-center"
                onPointerMove={onMove} onPointerUp={() => { dragRef.current = null; }}>
                <div className="relative" style={{ maxWidth: 640, width: '100%' }}>
                    <img ref={imgRef} src={currentSrc} className="block w-full select-none transition-transform duration-300" style={{ transform: `rotate(${rotation}deg)` }} draggable={false} alt="Vista previa" />
                    {isBgRemoving && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                <span className="text-white font-medium text-sm">Eliminando fondo... (la 1ª vez demora ~10s)</span>
                            </div>
                        </div>
                    )}
                    <div className="absolute border-2 border-white touch-none"
                        style={{
                            left: `${crop.x}%`, top: `${crop.y}%`,
                            width: `${crop.w}%`, height: `${crop.h}%`,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', cursor: 'move',
                        }}
                        onPointerDown={e => startDrag('move', e)}>
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                        </div>
                        {handles.map(h => (
                            <div key={h.id}
                                className="absolute w-7 h-7 bg-white rounded border-2 border-[#0500A3] touch-none"
                                style={{ ...h.style, position: 'absolute' }}
                                onPointerDown={e => startDrag(h.id, e)} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-6 gap-2 p-4 bg-black/80">
                <button onClick={() => apply(true)} disabled={isBgRemoving}
                    className="col-span-2 border-2 border-white/30 text-white font-semibold py-4 rounded-xl active:scale-95 transition-all text-sm disabled:opacity-50">
                    Foto completa
                </button>
                <button onClick={() => setRotation(r => (r + 90) % 360)} disabled={isBgRemoving}
                    className="col-span-1 border-2 border-white/30 text-white font-semibold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center disabled:opacity-50" title="Rotar Imagen 90º">
                    <RotateCw className="w-5 h-5" />
                </button>
                <button onClick={() => apply(false)} disabled={isBgRemoving}
                    className="col-span-3 bg-[#0500A3] text-white font-semibold py-4 rounded-xl active:scale-95 transition-all text-sm disabled:opacity-50">
                    ✓ Confirmar recorte
                </button>
                <button onClick={removeBg} disabled={isBgRemoving || currentSrc !== imageSrc}
                    className="col-span-6 border-2 border-purple-500/50 text-purple-200 bg-purple-900/40 font-semibold py-3 rounded-xl active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4" />
                    {currentSrc !== imageSrc ? 'Fondo eliminado' : '🪄 Magia: Eliminar Fondo'}
                </button>
            </div>
        </div>
    );
}

// ─── Modal Form (iPad-first + AI vision) ─────────────────────────────────────
function ActivoModal({ open, onClose, editActivo, onSuccess, lockedArea, dbAreas = [] }: {
    open: boolean; onClose: () => void; editActivo?: Activo | null; onSuccess: () => void; lockedArea?: string | null; dbAreas?: any[];
}) {
    const AREAS = dbAreas.length > 0 ? dbAreas.map(a => ({
        value: a.name,
        label: a.description ? `${a.name} — ${a.description}` : a.name
    })) : [{ value: 'TEST-AREA', label: '🧪 TEST-AREA — Área genérica' }];
    const [isPending, startTransition] = useTransition();
    const [imagenUrl, setImagenUrl] = useState(editActivo?.imagenUrl || '');
    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
    const [placaUploadPhase, setPlacaUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
    const [imagenPlacaUrl, setImagenPlacaUrl] = useState(editActivo?.imagenPlacaUrl || '');
    const [previewQr, setPreviewQr] = useState('');
    const [selectedArea, setSelectedArea] = useState(editActivo?.area || lockedArea || '');
    const [selectedCuenta, setSelectedCuenta] = useState(editActivo?.cuentaAct || '');
    const [aiResult, setAiResult] = useState<AiResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const placaCameraRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const isEdit = !!editActivo;
    const [cropOpen, setCropOpen] = useState(false);
    const [cropImgSrc, setCropImgSrc] = useState('');

    const [descripcionCorta, setDescripcionCorta] = useState(editActivo?.descripcionCorta || '');
    const [descripcionDetallada, setDescripcionDetallada] = useState(editActivo?.descripcionDetallada || '');
    const [marca, setMarca] = useState(editActivo?.marca || '');
    const [modelo, setModelo] = useState(editActivo?.modelo || '');
    const [codigoGrupo, setCodigoGrupo] = useState(editActivo?.codigoGrupo || '001');
    const [codigoBarras, setCodigoBarras] = useState(editActivo?.codigoBarras || '');
    const [cantidad, setCantidad] = useState(editActivo?.stock ? String(editActivo.stock) : '1');
    const [responsable, setResponsable] = useState(editActivo?.responsable || (lockedArea ? RESPONSABLES[lockedArea] : '') || '');
    const [compatibilidad, setCompatibilidad] = useState<string[]>(isEdit && editActivo ? editActivo.compatibilidad || [] : []);
    const [tagInput, setTagInput] = useState('');
    const [fechaAdq, setFechaAdq] = useState(editActivo?.fechaAdq ? getLocalDateString(editActivo.fechaAdq) : '');
    const [costoAdq, setCostoAdq] = useState<string>(editActivo?.costoAdq ? Number(editActivo.costoAdq).toString() : '');

    // ─── Phase 14: Categories and Expirations ───
    const [categoriaId, setCategoriaId] = useState(editActivo?.categoriaId || '');
    const [categorias, setCategorias] = useState<{value: string, label: string}[]>([]);
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [nuevaCategoriaText, setNuevaCategoriaText] = useState('');
    const [esConsumible, setEsConsumible] = useState(editActivo?.esConsumible || false);
    const [lote, setLote] = useState(editActivo?.lote || '');
    const [fechaVencimiento, setFechaVencimiento] = useState(editActivo?.fechaVencimiento ? getLocalDateString(editActivo.fechaVencimiento) : '');

    useEffect(() => {
        getCategorias().then(data => setCategorias(data.map((c: any) => ({ value: c.id, label: c.nombre }))));
    }, []);

    // ─── Historic Matcher States ───
    const [searchHistoricoText, setSearchHistoricoText] = useState('');
    const [historicoOptions, setHistoricoOptions] = useState<any[]>([]);
    const [isSearchingHistorico, setIsSearchingHistorico] = useState(false);
    const [selectedHistorico, setSelectedHistorico] = useState<any | null>(null);
    const [showHistoricoDropdown, setShowHistoricoDropdown] = useState(false);
    const historicoRef = useRef<HTMLDivElement>(null);

    const [categoriaDepreciacion, setCategoriaDepreciacion] = useState(editActivo?.categoriaDepreciacion || '');
    const [vidaUtilOverride, setVidaUtilOverride] = useState<string>(editActivo?.vidaUtilOverride ? Number(editActivo.vidaUtilOverride).toString() : '');

    const [aiMatchFailed, setAiMatchFailed] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
    const [previewCode, setPreviewCode] = useState<string>('...');

    function applyHistoricRecord(record: any) {
        setSelectedHistorico(record);
        setSearchHistoricoText(record.nombrePropiedad);
        if (record.vidaUtil) {
            setVidaUtilOverride(Number(record.vidaUtil).toString());
        }
        const matchCat = getMatchingCategoriaDepreciacion(record.cuentaContable, record.vidaUtil);
        if (matchCat) setCategoriaDepreciacion(matchCat);
        if (record.cuentaContable && CUENTAS.includes(record.cuentaContable)) {
            setSelectedCuenta(record.cuentaContable);
            // Assuming 'a' refers to 'record' here based on context
            setCompatibilidad([]);
            setTagInput('');
            setCategoriaId('');
            setEsConsumible(false);
            setLote('');
            setFechaVencimiento('');
        }
        if (record.fechaAdquisicion) {
            setFechaAdq(getLocalDateString(record.fechaAdquisicion));
        }
        if (record.costoAdquisicion) {
            setCostoAdq(Number(record.costoAdquisicion).toString());
        }
        setDescripcionCorta(prev => prev || record.nombrePropiedad || record.descripcionCorta);
        setDescripcionDetallada(prev => prev || record.descripcionDetallada || '');
        setMarca(prev => prev || record.marca);
        setModelo(prev => prev || record.modelo);
        if (record.imagenUrl && !imagenUrl) setImagenUrl(record.imagenUrl);
        if (record.imagenPlacaUrl && !imagenPlacaUrl) setImagenPlacaUrl(record.imagenPlacaUrl);
        setAiMatchFailed(false);

        if (record.cantidad && record.cantidad > 1) {
            setCantidad(record.cantidad.toString());
        }
    }

    // ─── Grupos Autocompletables ───
    const [gruposDisponibles, setGruposDisponibles] = useState<any[]>([]);

    useEffect(() => {
        getGruposAutocompletado().then(res => setGruposDisponibles(res));
    }, []);

    // Historic auto-search debounce
    useEffect(() => {
        if (!searchHistoricoText || searchHistoricoText.length < 3) {
            setHistoricoOptions([]);
            return;
        }
        const delay = setTimeout(async () => {
            setIsSearchingHistorico(true);
            try {
                const res = await fetch(`/api/inventario/historico/search?q=${encodeURIComponent(searchHistoricoText)}`);
                if (res.ok) setHistoricoOptions(await res.json());
            } catch (e) { }
            setIsSearchingHistorico(false);
        }, 500);
        return () => clearTimeout(delay);
    }, [searchHistoricoText]);

    // Close historic dropdown on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (historicoRef.current && !historicoRef.current.contains(e.target as Node)) setShowHistoricoDropdown(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (editActivo) {
            setImagenUrl(editActivo.imagenUrl || '');
            setImagenPlacaUrl(editActivo.imagenPlacaUrl || '');
            setSelectedArea(editActivo.area);
            setSelectedCuenta(editActivo.cuentaAct || '');
            setDescripcionCorta(editActivo.descripcionCorta || '');
            setDescripcionDetallada(editActivo.descripcionDetallada || '');
            setMarca(editActivo.marca || '');
            setModelo(editActivo.modelo || '');
            setCodigoGrupo(editActivo.codigoGrupo || '001');
            setCodigoBarras(editActivo.codigoBarras || '');
            setCantidad(editActivo.stock ? String(editActivo.stock) : '1');
            setResponsable(editActivo.responsable || '');
            setCategoriaDepreciacion(editActivo.categoriaDepreciacion || '');
            setVidaUtilOverride(editActivo.vidaUtilOverride ? Number(editActivo.vidaUtilOverride).toString() : '');
            setFechaAdq(editActivo.fechaAdq ? getLocalDateString(editActivo.fechaAdq) : '');
            setCostoAdq(editActivo.costoAdq ? Number(editActivo.costoAdq).toString() : '');
            setCategoriaId(editActivo.categoriaId || '');
            setEsConsumible(editActivo.esConsumible || false);
            setLote(editActivo.lote || '');
            setFechaVencimiento(editActivo.fechaVencimiento ? getLocalDateString(editActivo.fechaVencimiento) : '');
            // For now, not fetching full historic record on edit, just handling its absence.
        } else {
            setImagenUrl(''); setImagenPlacaUrl(''); setSelectedArea(lockedArea || ''); setSelectedCuenta('');
            setPreviewQr(''); setAiResult(null); setUploadPhase('idle'); setPlacaUploadPhase('idle');
            setDescripcionCorta(''); setDescripcionDetallada(''); setMarca(''); setModelo(''); setCodigoGrupo('001'); setCodigoBarras(''); setCantidad('1');
            setResponsable(lockedArea && RESPONSABLES[lockedArea] ? RESPONSABLES[lockedArea] : '');
            setCategoriaDepreciacion(''); setVidaUtilOverride(''); setSelectedHistorico(null); setSearchHistoricoText('');
            setFechaAdq(''); setCostoAdq(''); setCategoriaId(''); setEsConsumible(false); setLote(''); setFechaVencimiento('');
        }
    }, [editActivo, open, lockedArea]);

    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    async function handleAreaChange(area: string) {
        setSelectedArea(area);
        // Auto-fill responsable from the CSV map (but keep it editable)
        if (area && RESPONSABLES[area]) setResponsable(RESPONSABLES[area]);
        if (area && !isEdit) {
            const qr = await previewIdQr(area);
            setPreviewQr(qr);
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setAiResult(null);
        const url = URL.createObjectURL(file);
        setCropImgSrc(url);
        setCropOpen(true);
    }

    async function doUpload(blob: Blob) {
        setCropOpen(false);
        URL.revokeObjectURL(cropImgSrc);
        setCropImgSrc('');
        setUploadPhase('uploading');
        try {
            const res = await fetch('/api/upload/inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: 'activo.jpg', contentType: 'image/jpeg' }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status} al obtener URL de subida`);
            }
            const { uploadUrl, publicUrl } = await res.json();
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'image/jpeg' },
                body: blob,
            });
            if (!uploadRes.ok) throw new Error('Error al enviar imagen a R2');
            setImagenUrl(publicUrl);
            setUploadPhase('done');
            // Auto-trigger AI analysis right after upload
            analyzeWithAI(publicUrl);
        } catch (err: any) {
            setUploadPhase('idle');
            alert('Error: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    async function analyzeWithAI(urlOverride?: string) {
        const url = urlOverride ?? imagenUrl;
        if (!url) return;
        setAiResult(null);
        setAiMatchFailed(false);
        try {
            setUploadPhase('analyzing');
            const aiRes = await fetch('/api/inventario/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
            });
            const data: AiResult = await aiRes.json();
            if (aiRes.ok && !data.error) {
                setAiResult(data);
                if (data.descripcionCorta) setDescripcionCorta(data.descripcionCorta);
                if (data.descripcionDetallada) setDescripcionDetallada(data.descripcionDetallada);
                if (data.marca) setMarca(data.marca);
                if (data.modelo) setModelo(data.modelo);
                if (data.cuentaAct && CUENTAS.includes(data.cuentaAct)) setSelectedCuenta(data.cuentaAct);

                // Silent lookup in Historical records using smart keywords or fallback to short description and model
                const rawKeywords = [
                    ...(data.palabrasClaveBusqueda || []),
                    data.descripcionCorta,
                    data.marca,
                    data.modelo
                ];
                const searchQueries = Array.from(new Set(rawKeywords.filter(Boolean))).join(' ');
                if (searchQueries) {
                    try {
                        const searchRes = await fetch(`/api/inventario/historico/search?q=${encodeURIComponent(searchQueries)}`);
                        if (searchRes.ok) {
                            const historicos = await searchRes.json();
                            if (historicos && historicos.length > 0) {
                                applyHistoricRecord(historicos[0]);
                            } else {
                                setAiMatchFailed(true);
                            }
                        } else {
                            setAiMatchFailed(true);
                        }
                    } catch (e) {
                        setAiMatchFailed(true);
                    }
                }
            } else {
                alert('La IA no pudo analizar la imagen: ' + (data.error || 'Error desconocido'));
            }
            setUploadPhase('done');
        } catch (err: any) {
            setUploadPhase('done');
            alert('Error al analizar: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    async function handlePlacaUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        setPlacaUploadPhase('uploading');
        try {
            // Reusing the same upload endpoint for compression and R2 saving
            const fd = new FormData();
            fd.append('file', file);

            // Note: Since we need to compress it client side, let's just do the exact same direct-to-R2 flow
            // Actually, we can reuse `doUpload` logic but we shouldn't open CropModal for the plaque.
            // Let's implement dynamic compression inline for the plaque

            const url = URL.createObjectURL(file);
            const img = new window.Image();
            img.src = url;
            await new Promise((resolve) => { img.onload = resolve; });
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1568;
            let { width, height } = img;
            if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85));

            const res = await fetch('/api/upload/inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: 'placa.jpg', contentType: 'image/jpeg' }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status}: Falló URL de subida`);
            }
            const { uploadUrl, publicUrl } = await res.json();

            const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
            if (!uploadRes.ok) throw new Error('Error al enviar imagen de placa a R2');

            setImagenPlacaUrl(publicUrl);
            setPlacaUploadPhase('done');
            analyzePlacaWithAI(publicUrl);
        } catch (err: any) {
            setPlacaUploadPhase('idle');
            alert('Error al subir placa: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    async function analyzePlacaWithAI(url: string) {
        if (!url) return;
        setAiMatchFailed(false);
        try {
            setPlacaUploadPhase('analyzing');
            const aiRes = await fetch('/api/inventario/analyze-placa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
            });
            const data = await aiRes.json();
            if (aiRes.ok && !data.error) {
                if (data.serie) {
                    const el = document.querySelector('[name="serie"]') as HTMLInputElement;
                    if (el) { el.value = data.serie; el.classList.add('bg-purple-50'); }

                    // Silent lookup in Historical records
                    fetch(`/api/inventario/historico/search?serie=${encodeURIComponent(data.serie)}`)
                        .then(r => r.json())
                        .then(res => {
                            if (res && res.length > 0) {
                                applyHistoricRecord(res[0]);
                            } else {
                                setAiMatchFailed(true);
                            }
                        }).catch(() => {
                            setAiMatchFailed(true);
                        });
                } else {
                    // Si no detectó serie también lo consideramos un "fallo de match histórico" porque no hay con qué cruzarlo
                    setAiMatchFailed(true);
                }
                if (data.marca) setMarca(data.marca);
                if (data.modelo) setModelo(data.modelo);
            } else {
                alert('La IA no pudo leer la placa: ' + (data.error || 'Error desconocido'));
            }
            setPlacaUploadPhase('done');
        } catch (err: any) {
            setPlacaUploadPhase('done');
            alert('Error al analizar placa: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set('imagenUrl', imagenUrl);
        fd.set('imagenPlacaUrl', imagenPlacaUrl);
        fd.set('area', selectedArea);
        fd.set('cuentaAct', 'INVENTARIO');

        // Use proper group code — generateIdQr handles auto-increment sequence
        let finalCodigoGrupo = codigoGrupo || '001';

        fd.set('codigoGrupo', finalCodigoGrupo);
        if (codigoBarras) fd.set('codigoBarras', codigoBarras);
        fd.set('cantidad', cantidad);
        fd.set('compatibilidad', JSON.stringify(compatibilidad));

        if (categoriaId) fd.set('categoriaId', categoriaId);
        fd.set('esConsumible', String(esConsumible));
        if (lote) fd.set('lote', lote);
        if (fechaVencimiento) fd.set('fechaVencimiento', fechaVencimiento);

        // Show preview and fetch real next code in parallel
        setPendingFormData(fd);
        previewIdQr(selectedArea, finalCodigoGrupo).then(code => setPreviewCode(code)).catch(() => setPreviewCode('—'));
    }

    const [isSubmitting, setIsSubmitting] = useState(false);

    function confirmSave() {
        if (!pendingFormData || isSubmitting) return;
        setIsSubmitting(true);
        const fd = pendingFormData;
        startTransition(async () => {
            try {
                if (isEdit) {
                    await updateActivo(editActivo!.id, fd);
                    setPendingFormData(null);
                    onSuccess();
                    onClose();
                    setIsSubmitting(false);
                } else {
                    const result = await createActivo(fd);
                    setPendingFormData(null);
                    onSuccess();
                    onClose();
                    setIsSubmitting(false);

                    // Auto-print label for the newly created activo
                    if (result?.id && result?.idQr) {
                        try {
                            const params = new URLSearchParams({
                                idQr: result.idQr,
                                descripcion: fd.get('descripcionCorta') as string || '',
                                area: fd.get('area') as string || '',
                                cuenta: fd.get('cuentaAct') as string || '',
                                codigoBarras: codigoBarras || '',
                            });
                            const urlImagen = `${window.location.origin}/api/impresion/generar-etiqueta?${params.toString()}`;
                            
                            // Si el stock es N, encolamos N etiquetas iguales
                            const qtyToPrint = Number(cantidad) || 1;
                            const enqueuePromises = [];
                            for (let i = 0; i < qtyToPrint; i++) {
                                enqueuePromises.push(
                                    fetch('/api/impresion/encolar', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ activoId: result.id, urlImagen }),
                                    })
                                );
                            }
                            await Promise.all(enqueuePromises);
                        } catch {
                            // Print failure is non-fatal — asset was still saved
                            console.warn('Auto-print enqueue failed');
                        }
                    }
                }
            } catch (err: any) {
                alert('Error al guardar: ' + err.message);
                setPendingFormData(null);
                setIsSubmitting(false);
            }
        });
    }

    if (!open) return null;

    const isLoading = uploadPhase === 'uploading' || uploadPhase === 'analyzing';

    return (
        <>
            {cropOpen && (
                <CropModal
                    imageSrc={cropImgSrc}
                    onConfirm={doUpload}
                    onCancel={() => { setCropOpen(false); URL.revokeObjectURL(cropImgSrc); setCropImgSrc(''); }}
                />
            )}
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
                <div className="min-h-full flex items-start justify-center p-0 sm:p-4 md:p-6">
                    <div className="bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-2xl sm:my-4">

                        {/* ── Sticky Header ── */}
                        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#0500A3]/10 p-2.5 rounded-xl">
                                    <QrCode className="w-5 h-5 text-[#0500A3]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {isEdit ? 'Editar Producto' : 'Registrar Producto'}
                                    </h2>
                                    {(previewQr || isEdit) && (
                                        <p className="text-xs font-mono text-[#0500A3] font-bold mt-0.5">
                                            ID QR: {isEdit ? editActivo?.idQr : previewQr}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95">
                                Cerrar
                            </button>
                        </div>

                        {/* ── Preview / Confirm Screen ── */}
                        {pendingFormData ? (
                            <div className="px-5 py-6">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="bg-green-100 p-2.5 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-base">Revisa antes de registrar</h3>
                                        <p className="text-xs text-slate-400">Confirma que la información es correcta</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {/* Image + Identificación row */}
                                    <div className="flex gap-4 items-start bg-slate-50 rounded-2xl p-4">
                                        {imagenUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={imagenUrl} alt="activo" className="w-20 h-20 object-cover rounded-xl shrink-0 border border-slate-200 shadow" />
                                        ) : (
                                            <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0 flex items-center justify-center">
                                                <Eye className="w-7 h-7 text-slate-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 text-base leading-snug truncate">{descripcionCorta || '—'}</p>
                                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{descripcionDetallada || '—'}</p>
                                            <div className="flex gap-2 mt-1.5 flex-wrap">
                                                {marca && <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-md">{marca}</span>}
                                                {modelo && <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-md">{modelo}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                                            <QrCode className="w-4 h-4 text-[#0500A3] shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-bold text-[#0500A3]/60 uppercase tracking-wider">Código QR que se asignará</p>
                                                <p className="text-xs font-black text-[#0500A3] font-mono tracking-tight">
                                                    {previewCode}
                                                </p>
                                            </div>
                                        </div>
                                        <PreviewField label="Área" value={AREAS.find(a => a.value === selectedArea)?.label || selectedArea || '—'} />
                                        <PreviewField label="Stock Inicial" value={cantidad} highlight />
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={confirmSave}
                                        disabled={isPending || isSubmitting}
                                        className="flex items-center justify-center gap-2 text-base font-bold bg-green-600 text-white py-4 px-5 rounded-2xl hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md"
                                    >
                                        {(isPending || isSubmitting) ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                        {(isPending || isSubmitting) ? 'Guardando e imprimiendo...' : '✅ Confirmar, Registrar e Imprimir'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPendingFormData(null)}
                                        disabled={isPending || isSubmitting}
                                        className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 border-2 border-slate-200 py-3.5 px-5 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-60"
                                    >
                                        ✏️ Volver a editar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form ref={formRef} onSubmit={handleSubmit} className="px-5 py-6 space-y-6">

                                {/* ── SECCIÓN 1: FOTOGRAFÍA ── */}
                                <div>
                                    <SectionTitle>📸 Fotografía del Activo</SectionTitle>

                                    {/* ── Progress bar: upload + AI analysis ── */}
                                    {uploadPhase === 'uploading' && (
                                        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                                                <p className="text-sm font-semibold text-blue-800">Subiendo foto...</p>
                                            </div>
                                            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                                            </div>
                                            <p className="text-xs text-blue-600 mt-1">Las fotos del iPad pueden tardar unos segundos</p>
                                        </div>
                                    )}
                                    {uploadPhase === 'analyzing' && (
                                        <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-purple-500 animate-pulse shrink-0" />
                                                <p className="text-sm font-semibold text-purple-800">IA analizando la imagen...</p>
                                            </div>
                                            <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '80%' }} />
                                            </div>
                                            <p className="text-xs text-purple-600 mt-1">Identificando activo, marca y cuenta contable</p>
                                        </div>
                                    )}
                                    {uploadPhase === 'done' && aiResult && (
                                        <div className="mb-4 flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                                            <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-purple-800">
                                                    ✅ Campos completados por IA
                                                    {aiResult.confianza && <span className="ml-2 text-xs font-normal text-purple-600">Confianza: {aiResult.confianza}</span>}
                                                </p>
                                                <p className="text-xs text-purple-600">Revisa y ajusta los campos resaltados en morado si es necesario</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex justify-center sm:justify-start">
                                            {imagenUrl ? (
                                                <div className="relative">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={imagenUrl} alt="Activo" className="w-32 h-32 object-cover rounded-2xl border-2 border-slate-200 shadow-md" />
                                                    {!isLoading && (
                                                        <button type="button" onClick={() => { setImagenUrl(''); setAiResult(null); }}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg active:scale-95">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isLoading && (
                                                        <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                                                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                                                    {uploadPhase === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin text-blue-500" /> : <><Eye className="w-8 h-8 mb-1" /><span className="text-xs">Sin foto</span></>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-3 justify-center">
                                            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                                            <button type="button" onClick={() => cameraInputRef.current?.click()}
                                                disabled={isLoading}
                                                className="flex items-center justify-center gap-3 text-base font-semibold bg-[#0500A3] text-white py-4 px-5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-md">
                                                <Camera className="w-5 h-5" />
                                                {isLoading ? 'Procesando...' : 'Tomar Foto con Cámara'}
                                            </button>
                                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                                disabled={isLoading}
                                                className="flex items-center justify-center gap-3 text-base font-medium border-2 border-slate-200 text-slate-600 py-3.5 px-5 rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                                                <Upload className="w-5 h-5" />
                                                Seleccionar de Galería
                                            </button>
                                            {!isEdit && !!imagenUrl && !aiResult && (
                                                <button type="button" onClick={() => analyzeWithAI()}
                                                    disabled={uploadPhase === 'analyzing'}
                                                    className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 py-3 px-5 rounded-xl active:scale-95 transition-all w-full">
                                                    <Sparkles className="w-4 h-4" />
                                                    {uploadPhase === 'analyzing' ? 'Analizando...' : '✨ Analizar foto con IA'}
                                                </button>
                                            )}
                                            {!isEdit && uploadPhase === 'idle' && (
                                                <p className="text-xs text-purple-600 text-center flex items-center justify-center gap-1 mt-2">
                                                    <Sparkles className="w-3 h-3" /> Sube la foto primero, luego usa la IA
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── SECCIÓN 2: IDENTIFICACIÓN ── */}
                                <div className="col-span-12 xl:col-span-8">
                                    <div className="bg-white rounded-2xl border-2 border-[#0500A3]/10 p-5 lg:p-6 shadow-sm">
                                        <SectionTitle>📋 Identificación</SectionTitle>
                                        <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Código de Barras / SKU Comercial */}
                                            <div>
                                                <FieldLabel>Código de Barras / SKU (Opcional)</FieldLabel>
                                                <input 
                                                    type="text" 
                                                    value={codigoBarras} 
                                                    onChange={e => setCodigoBarras(e.target.value)} 
                                                    placeholder="Escanea o escribe el código..." 
                                                    className={`${inputCls} font-mono font-bold tracking-widest text-slate-800 border-indigo-200 focus:ring-indigo-500`} 
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">Si ya existe un producto con este código, al registrar se sumará al stock actual en lugar de duplicarse.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Área — Searchable / Locked */}
                                            <div>
                                                <FieldLabel required>Área / Ubicación</FieldLabel>
                                                <input
                                                    type="text"
                                                    required
                                                    name="area"
                                                    value={selectedArea}
                                                    onChange={e => setSelectedArea(e.target.value.toUpperCase())}
                                                    placeholder="Ej: A-1-1, SE-A-1, B-5-4"
                                                    list="ubicaciones-sugeridas"
                                                    className={`${inputCls} font-mono font-bold tracking-widest text-[#0500A3] uppercase`}
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">Formato sugerido: <b>A-1-1</b>. Reutiliza el historial para agrupar.</p>
                                                <datalist id="ubicaciones-sugeridas">
                                                    {dbAreas.map((a: any) => (
                                                        <option key={a.name} value={a.name} />
                                                    ))}
                                                </datalist>
                                            </div>

                                            <div className="flex gap-3 bg-blue-50/30 p-3 rounded-xl border border-blue-100/50">
                                                <div className="flex-[2]">
                                                    <FieldLabel required={!isEdit}>Código Grupo</FieldLabel>
                                                    {isEdit ? (
                                                        <input
                                                            type="text"
                                                            disabled
                                                            value={codigoGrupo}
                                                            className={`${inputCls} font-mono bg-blue-50/10 font-bold tracking-widest text-[#0500A3] opacity-60 cursor-not-allowed border-transparent`}
                                                        />
                                                    ) : (
                                                        <Combobox
                                                            options={gruposDisponibles.map(g => ({ value: g.codigoGrupo, label: `${g.codigoGrupo} - ${g.descripcionCorta} (${g.cantidad})` }))}
                                                            value={codigoGrupo}
                                                            onChange={(val) => {
                                                                setCodigoGrupo(val);
                                                                const match = gruposDisponibles.find(g => g.codigoGrupo === val);
                                                                if (match && match.descripcionCorta && !descripcionCorta) setDescripcionCorta(match.descripcionCorta);
                                                            }}
                                                            placeholder="Ej: 001"
                                                            allowCustom={true}
                                                        />
                                                    )}
                                                    {!isEdit && <p className="text-[10px] text-[#0500A3]/60 mt-1 leading-tight">Agrupa estos activos.</p>}
                                                </div>

                                                <div className="flex-1">
                                                    <FieldLabel required>Cantidad</FieldLabel>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={cantidad}
                                                        onChange={e => setCantidad(e.target.value)}
                                                        className={`${inputCls} font-mono font-bold text-center border-blue-200 focus:ring-blue-500`}
                                                    />
                                                    <p className="text-[10px] text-[#0500A3]/60 mt-1 leading-tight text-center">Stock Inicial</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nombre / Descripción Corta — AI controlled */}
                                        <div className="mb-6 flex gap-2 items-end">
                                            <div className="flex-1">
                                                <FieldLabel>Clasificación General (Maestra)</FieldLabel>
                                                <Combobox
                                                    options={categorias}
                                                    value={categoriaId}
                                                    onChange={setCategoriaId}
                                                    placeholder="Ej: Sensores Médicos, Herramientas..."
                                                    allowClear
                                                />
                                            </div>
                                            <button type="button" onClick={() => setCatModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-[#0500A3] px-4 py-3.5 rounded-xl border border-slate-200 transition-colors shrink-0 font-bold flex items-center justify-center" title="Añadir Categoría Rápida">
                                                <Plus className="w-5 h-5"/>
                                            </button>
                                        </div>

                                        <div>
                                            <FieldLabel required>Nombre / Descripción Corta <span className="opacity-50">(Para Tickets)</span></FieldLabel>
                                            <input type="text" name="descripcionCorta" required
                                                value={descripcionCorta}
                                                onChange={e => setDescripcionCorta(e.target.value)}
                                                placeholder="Ej: Silla Ejecutiva, Escritorio 4 Gavetas..."
                                                className={aiResult?.descripcionCorta ? inputAiCls : inputCls} />
                                        </div>

                                        {/* Serie + Modelo */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel>
                                                    Número de Serie
                                                    {placaUploadPhase === 'analyzing' && <Loader2 className="w-3 h-3 text-purple-500 animate-spin ml-2 inline" />}
                                                    {placaUploadPhase === 'done' && imagenPlacaUrl && <Sparkles className="w-3 h-3 text-purple-500 ml-2 inline" />}
                                                </FieldLabel>
                                                <div className="flex gap-2">
                                                    <input type="text" name="serie" defaultValue={editActivo?.serie || ''}
                                                        placeholder="S/N si no aplica" className={placaUploadPhase === 'done' && imagenPlacaUrl ? inputAiCls : inputCls} />

                                                    <input ref={placaCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePlacaUpload} />

                                                    {imagenPlacaUrl ? (
                                                        <div className="shrink-0 relative">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={imagenPlacaUrl} alt="Placa" className="w-[42px] h-[42px] object-cover rounded-xl border border-slate-200" />
                                                            {placaUploadPhase === 'idle' || placaUploadPhase === 'done' ? (
                                                                <button type="button" onClick={() => setImagenPlacaUrl('')}
                                                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg hover:scale-110">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            ) : (
                                                                <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                                                                    <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button type="button" onClick={() => placaCameraRef.current?.click()} disabled={placaUploadPhase === 'uploading' || placaUploadPhase === 'analyzing'}
                                                            className="shrink-0 w-[42px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors disabled:opacity-50" title="Escanear placa con cámara">
                                                            {placaUploadPhase === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Camera className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <FieldLabel>
                                                    Marca
                                                    {aiResult?.marca && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                                </FieldLabel>
                                                <input type="text" name="marca"
                                                    value={marca}
                                                    onChange={e => setMarca(e.target.value)}
                                                    placeholder="Ej: Yamaha, Sony..."
                                                    className={aiResult?.marca ? inputAiCls : inputCls} />
                                            </div>
                                            <div>
                                                <FieldLabel>
                                                    Modelo
                                                    {aiResult?.modelo && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                                </FieldLabel>
                                                <input type="text" name="modelo"
                                                    value={modelo}
                                                    onChange={e => setModelo(e.target.value)}
                                                    placeholder="Ej: P-125..."
                                                    className={aiResult?.modelo ? inputAiCls : inputCls} />
                                            </div>
                                        </div>

                                        {/* Compatibilidad Tags */}
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-2 mb-2">
                                            <FieldLabel>Etiquetas de Compatibilidad / Marcas Funcionales</FieldLabel>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {compatibilidad.map(tag => (
                                                    <span key={tag} className="inline-flex items-center gap-1.5 bg-indigo-100 text-[#0500A3] px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-200">
                                                        {tag}
                                                        <button type="button" onClick={() => setCompatibilidad(compatibilidad.filter(t => t !== tag))} className="hover:text-red-500 hover:bg-white rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                                                    </span>
                                                ))}
                                                {compatibilidad.length === 0 && <span className="text-xs text-slate-400 italic py-1.5">Ninguna marca agregada...</span>}
                                            </div>
                                            <input 
                                                type="text" 
                                                value={tagInput}
                                                onChange={e => setTagInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const v = tagInput.trim().toUpperCase();
                                                        if (v && !compatibilidad.includes(v)) {
                                                            setCompatibilidad([...compatibilidad, v]);
                                                            setTagInput('');
                                                        }
                                                    }
                                                }}
                                                placeholder="Ej: MINDRAY, PHILIPS (Presiona Enter para añadir)" 
                                                className={inputCls} 
                                            />
                                        </div>

                                        {/* Descripción Detallada — AI controlled */}
                                        <div>
                                            <FieldLabel>
                                                Descripción Detallada
                                            </FieldLabel>
                                            <textarea name="descripcionDetallada" rows={3}
                                                value={descripcionDetallada}
                                                onChange={e => setDescripcionDetallada(e.target.value)}
                                                placeholder="Marca, modelo, color, características adicionales..."
                                                className={`${aiResult?.descripcionDetallada ? inputAiCls : inputCls} resize-none`} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                                {/* ── FOOTER ── */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                                    <button type="button" onClick={onClose}
                                        className="flex-1 text-base font-medium border-2 border-slate-200 text-slate-600 py-4 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={isPending || isLoading}
                                        className="flex-1 flex items-center justify-center gap-2 text-base font-bold bg-[#0500A3] text-white py-4 rounded-2xl hover:bg-[#0600c2] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg">
                                        {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                                        {isEdit ? '💾 Guardar Cambios' : '✅ Registrar Activo'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div >
            </div >
        </>
    );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ activo, onClose, onSuccess }: { activo: Activo; onClose: () => void; onSuccess: () => void }) {
    const [isPending, startTransition] = useTransition();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-100 p-2.5 rounded-xl"><Trash2 className="w-5 h-5 text-red-600" /></div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Eliminar Activo</h2>
                        <p className="text-xs font-mono text-slate-500">{activo.idQr}</p>
                    </div>
                </div>
                <p className="text-sm text-slate-600 mb-6">¿Estás seguro que deseas eliminar <strong>{activo.descripcionCorta}</strong>? Esta acción no se puede deshacer.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => startTransition(async () => { await deleteActivo(activo.id); onSuccess(); onClose(); })}
                        disabled={isPending}
                        className="flex items-center justify-center gap-2 text-base font-bold bg-red-600 text-white rounded-2xl py-4 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60">
                        {isPending && <Loader2 className="w-5 h-5 animate-spin" />} Sí, eliminar
                    </button>
                    <button onClick={onClose} className="text-base font-medium border-2 border-slate-200 rounded-2xl py-4 hover:bg-slate-50 active:scale-[0.98] transition-all text-slate-600">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Imprimir Lote Modal ──────────────────────────────────────────────────────
function ImprimirLoteModal({ open, onClose, grupos, onSuccess }: { open: boolean; onClose: () => void; grupos: any[]; onSuccess: () => void }) {
    const [grupo, setGrupo] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [isPending, startTransition] = useTransition();

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2.5 rounded-xl"><Printer className="w-5 h-5 text-[#0500A3]" /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Imprimir Lote</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Enviar grupo a la impresora en masa</p>
                    </div>
                </div>

                <div className="space-y-4 mb-6 mt-6">
                    <div>
                        <FieldLabel required>Código de Grupo</FieldLabel>
                        <Combobox
                            options={grupos.map(g => ({ value: g.codigoGrupo, label: `${g.codigoGrupo} - ${g.descripcionCorta} (${g.cantidad})` }))}
                            value={grupo}
                            onChange={setGrupo}
                            placeholder="Ej: 001"
                            allowCustom={true}
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <FieldLabel required>Del (№ Correlativo)</FieldLabel>
                            <input type="number" min="1" value={desde} onChange={e => setDesde(e.target.value)}
                                className={inputCls} placeholder="Ej: 1" />
                        </div>
                        <div className="flex-1">
                            <FieldLabel required>Al (№ Correlativo)</FieldLabel>
                            <input type="number" min="1" value={hasta} onChange={e => setHasta(e.target.value)}
                                className={inputCls} placeholder="Ej: 50" />
                        </div>
                    </div>
                </div>

                <button onClick={() => startTransition(async () => {
                    if (!grupo || !desde || !hasta) return alert('Completa todos los campos');
                    if (Number(desde) > Number(hasta)) return alert('Rango inválido');

                    try {
                        const res = await encolarLoteImpresion(grupo, Number(desde), Number(hasta));
                        if (res.error) alert(res.error);
                        else {
                            alert(`Se enviaron ${res.count} etiquetas a la cola de impresión exitosamente.`);
                            onSuccess();
                            onClose();
                        }
                    } catch (e) {
                        alert('Error conectando con el servidor');
                    }
                })}
                    disabled={isPending || !grupo || !desde || !hasta}
                    className="w-full flex items-center justify-center gap-2 text-base font-bold bg-[#0500A3] text-white rounded-2xl py-4 hover:bg-[#0600c2] active:scale-[0.98] transition-all disabled:opacity-60">
                    {isPending && <Loader2 className="w-5 h-5 animate-spin" />} Enviar a Cola
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InventarioClient({ initialData, initialStats, dbAreas = [], userRole }: { initialData?: any; initialStats?: any; dbAreas?: any[]; userRole?: string }) {
    const AREAS = dbAreas.length > 0 ? dbAreas.map(a => ({
        value: a.name,
        label: a.description ? `${a.name} — ${a.description}` : a.name
    })) : [{ value: 'TEST-AREA', label: '🧪 TEST-AREA — Área genérica' }];
    const [activos, setActivos] = useState<Activo[]>(initialData?.activos || []);
    const [total, setTotal] = useState(initialData?.total || 0);
    const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1);
    const [stats, setStats] = useState(initialStats || null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filtroArea, setFiltroArea] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editActivo, setEditActivo] = useState<Activo | null>(null);
    const [deleteActivo_, setDeleteActivo] = useState<Activo | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [viewActivo, setViewActivo] = useState<Activo | null>(null);
    const [previewActivo, setPreviewActivo] = useState<Activo | null>(null);
    const [previewImage, setPreviewImage] = useState<{ index: number, images: string[] } | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [printStatus, setPrintStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [loteModalOpen, setLoteModalOpen] = useState(false);
    const hasMounted = useRef(false);

    // Grupos autocompletables prefetch para el lote printer
    const [gruposDisponibles, setGruposDisponibles] = useState<any[]>([]);
    useEffect(() => { getGruposAutocompletado().then(res => setGruposDisponibles(res)); }, []);

    const searchParams = useSearchParams();
    const router = useRouter();

    // QR Area Control
    const [lockedArea, setLockedArea] = useState<string | null>(null);
    const [isCheckingArea, setIsCheckingArea] = useState(false);
    const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
    
    const [noAreaModalOpen, setNoAreaModalOpen] = useState(false);
    const [isClosingAct, startClosingAct] = useTransition();

    // Lógica para interceptar Deep Links y/o autocompletar área activa
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

    // The initial fetch is now handled Serverside on `page.tsx` directly!

    async function handlePrintLabel(activo: Activo) {
        setPrintingId(activo.id);
        setPrintStatus('sending');
        try {
            // Construir la URL de la etiqueta generada
            const params = new URLSearchParams({
                idQr: activo.idQr,
                descripcion: activo.descripcionCorta,
                area: activo.area,
                cuenta: activo.cuentaAct,
            });

            const urlImagen = `${window.location.origin}/api/impresion/generar-etiqueta?${params.toString()}`;

            // Encolar en la base de datos para que la laptop lo reciba
            const res = await fetch('/api/impresion/encolar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activoId: activo.id, urlImagen }),
            });

            if (!res.ok) throw new Error('Error al encolar impresión');
            setPrintStatus('sent');
            setTimeout(() => { setPrintStatus('idle'); setPrintingId(null); }, 3000);
        } catch {
            setPrintStatus('error');
            setTimeout(() => { setPrintStatus('idle'); setPrintingId(null); }, 3000);
        }
    }

    const [debugPrinting, setDebugPrinting] = useState(false);
    const [debugStatus, setDebugStatus] = useState<'idle' | 'sent' | 'error'>('idle');
    const [clearingQueue, setClearingQueue] = useState(false);

    async function handleClearQueue() {
        if (!confirm('¿Estás seguro que deseas limpiar TODA la cola de impresión de la iglesia?')) return;
        setClearingQueue(true);
        try {
            await clearPrintQueue();
            alert('Cola de impresión limpiada exitosamente');
        } catch {
            alert('Error al limpiar cola');
        } finally {
            setClearingQueue(false);
        }
    }

    async function handleDebugPrint() {
        setDebugPrinting(true);
        setDebugStatus('idle');
        try {
            // Etiqueta de prueba: texto simple "IMPRESION EXITOSA ELIM"
            const urlImagen = `${window.location.origin}/api/impresion/generar-etiqueta?debug=1&idQr=TEST-DEBUG`;
            const res = await fetch('/api/impresion/encolar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: '00000000-0000-0000-0000-000000000000', // ID placeholder para debug
                    urlImagen,
                }),
            });
            if (!res.ok) throw new Error();
            setDebugStatus('sent');
        } catch {
            setDebugStatus('error');
        } finally {
            setDebugPrinting(false);
            setTimeout(() => setDebugStatus('idle'), 4000);
        }
    }

    async function refresh(p = page, s = search, a = filtroArea, e = filtroEstatus, currentLockedArea = lockedArea) {
        setIsRefetching(true);
        setLoading(false); // Make sure blocking loader is off
        try {
            const resolvedAreaFilter = a || (currentLockedArea || undefined);
            const [data, st] = await Promise.all([
                getActivos(p, s, resolvedAreaFilter, e), 
                getActivoStats(currentLockedArea || undefined)
            ]);
            setActivos(data.activos as Activo[]);
            setTotal(data.total); setTotalPages(data.totalPages); setStats(st);
        } catch (error) {
            console.error('Error fetching inventory data on client: ', error);
        } finally {
            setIsRefetching(false);
        }
    }

    useEffect(() => {
        if (!hasMounted.current) {
             hasMounted.current = true;
             return; // Skip initial render since it's SSR hydrated
        }
        const t = setTimeout(() => { setPage(1); refresh(1, search, filtroArea, filtroEstatus, lockedArea); }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filtroArea, filtroEstatus]);

    function handlePageChange(p: number) {
        setPage(p);
        // We explicitly pass `lockedArea` here to maintain the area context when paginating
        refresh(p, search, filtroArea, filtroEstatus, lockedArea);
    }
    const PER_PAGE = 10;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 hide-on-print">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Package className="w-8 h-8 text-[#0500A3]" />
                        Inventario de Productos
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Catálogo Comercial y Existencias · Bioelectrónica Honduras</p>
                </div>
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                    <div className="flex items-center gap-2">
                        {/* Funciones de Impresión para ADMIN */}
                        {userRole === 'SUPER_ADMIN' && (
                            <>
                                <button
                                    onClick={handleClearQueue}
                                    disabled={clearingQueue}
                                    title="Limpiar cola de impresión pendiente completa"
                                    className="flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-2xl border-2 transition-all active:scale-95 disabled:opacity-60 hidden sm:flex bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300"
                                >
                                    {clearingQueue ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                                    Limpiar Cola
                                </button>
                                <button
                                    onClick={handleDebugPrint}
                                    disabled={debugPrinting}
                                    title="Enviar etiqueta de prueba a la impresora Tally"
                                    className={`flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-2xl border-2 transition-all active:scale-95 disabled:opacity-60 hidden sm:flex ${debugStatus === 'sent' ? 'bg-green-50 border-green-400 text-green-700' :
                                        debugStatus === 'error' ? 'bg-red-50 border-red-400 text-red-700' :
                                            'bg-yellow-50 border-yellow-400 text-yellow-700 hover:bg-yellow-100'
                                        }`}
                                >
                                    {debugPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                    {debugStatus === 'sent' ? '✅ Enviado' : debugStatus === 'error' ? '❌ Error' : 'Debug Impr.'}
                                </button>
                            </>
                        )}
                        <button onClick={() => {
                            window.print();
                        }}
                            className="flex items-center justify-center gap-2 text-base font-bold bg-white text-slate-700 border-2 border-slate-200 px-5 py-3 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all w-full sm:w-auto mt-2 sm:mt-0 hide-on-print">
                            <Printer className="w-5 h-5 text-slate-500" /> Imprimir Reporte
                        </button>
                        <button onClick={() => setLoteModalOpen(true)}
                            className="flex items-center gap-2 text-base font-bold bg-white text-[#0500A3] border-2 border-[#0500A3]/20 px-5 py-3 rounded-2xl hover:bg-blue-50 active:scale-95 transition-all w-full sm:w-auto justify-center hide-on-print">
                            <Printer className="w-5 h-5" /> Imprimir Lote
                        </button>
                        
                        {userRole === 'SUPER_ADMIN' && (
                            <button onClick={async () => {
                                if (confirm('¿Ejecutar la categorización automática con IA (Claude)? Esto procesará 50 productos sin categoría.')) {
                                    setIsAutoCategorizing(true);
                                    try {
                                        const res = await fetch('/api/inventario/auto-categorize', { method: 'POST' });
                                        const json = await res.json();
                                        if (json.error) alert(json.error);
                                        else {
                                            alert(json.message);
                                            refresh();
                                        }
                                    } catch (e: any) { alert('Error: ' + e.message); }
                                    finally { setIsAutoCategorizing(false); }
                                }
                            }}
                                disabled={isAutoCategorizing}
                                className="flex items-center gap-2 text-base font-bold bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700 border-2 border-purple-200 px-5 py-3 rounded-2xl hover:bg-purple-100 active:scale-95 transition-all w-full sm:w-auto justify-center hide-on-print shadow-sm">
                                {isAutoCategorizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Auto-Categorizar
                            </button>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setModalOpen(true)}
                                disabled={isCheckingArea}
                                className="flex items-center justify-center gap-2 text-base font-bold bg-[#0500A3] text-white px-5 py-3 rounded-2xl transition-all shadow-md w-full sm:w-auto justify-center hide-on-print"
                            >
                                {isCheckingArea ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                {isCheckingArea ? 'Iniciando...' : 'Registrar Producto'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Area Banner */}
            {lockedArea && (
                <div className="mb-6 bg-[#0500A3] rounded-xl border border-[#0600c2] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hide-on-print">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-white/20 p-2.5 rounded-xl"><QrCode className="w-6 h-6" /></div>
                        <div>
                            <div className="text-xs font-semibold text-white/80 uppercase tracking-widest mb-0.5">Área de Inventario Abierta</div>
                            <div className="text-base font-bold">{AREAS.find(a => a.value === lockedArea)?.label || lockedArea}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsClosingModalOpen(true)}
                        className="flex-shrink-0 flex items-center justify-center gap-2 text-sm font-bold bg-white text-[#0500A3] py-2.5 px-5 rounded-xl hover:bg-slate-100 active:scale-95 transition-all w-full sm:w-auto hide-on-print">
                        <CheckCircle2 className="w-4 h-4" />
                        Terminar / Cerrar Área
                    </button>
                </div>
            )}

            {/* Modal Confirmación de Cierre */}
            {isClosingModalOpen && lockedArea && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 hide-on-print">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Cerrar Área</h2>
                        <p className="text-slate-600 mb-6 font-medium">¿Estás completamente seguro de cerrar esta área?</p>

                        <div className="flex flex-col gap-3">
                            <button
                                disabled={isClosingAct}
                                onClick={() => startClosingAct(async () => {
                                    await closeArea(lockedArea);
                                    setLockedArea(null);
                                    setIsClosingModalOpen(false);
                                })}
                                className="flex items-center justify-center gap-2 text-base font-bold bg-amber-500 text-white rounded-2xl py-4 hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-60"
                            >
                                {isClosingAct && <Loader2 className="w-5 h-5 animate-spin" />}
                                SI estoy seguro
                            </button>
                            <button
                                onClick={() => setIsClosingModalOpen(false)}
                                disabled={isClosingAct}
                                className="flex items-center justify-center text-base font-bold border-2 border-slate-200 text-slate-700 rounded-2xl py-4 hover:bg-slate-50 active:scale-[0.98] transition-all"
                            >
                                NO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ImprimirLoteModal
                open={loteModalOpen}
                onClose={() => setLoteModalOpen(false)}
                grupos={gruposDisponibles}
                onSuccess={() => { refresh() }}
            />

            {previewActivo && (
                <PreviewEtiquetaModal
                    activo={previewActivo}
                    onClose={() => setPreviewActivo(null)}
                    isPrinting={printingId === previewActivo.id && printStatus === 'sending'}
                    onPrint={() => handlePrintLabel(previewActivo)}
                />
            )}

            <div className="hide-on-print"><StatsCards stats={stats} /></div>

            {/* Search + filter toggle */}
            <div className="flex gap-2 mb-3 hide-on-print">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por ID, descripción, serie, responsable..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 bg-white" />
                </div>
                <button onClick={() => setShowFilters(f => !f)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${showFilters ? 'border-[#0500A3] text-[#0500A3] bg-blue-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                    <Filter className="w-4 h-4" /><span className="hidden sm:inline">Filtros</span>
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-4 bg-white rounded-xl border border-slate-200 hide-on-print">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Área</label>
                        <Combobox options={AREAS} value={filtroArea}
                            onChange={setFiltroArea}
                            allowClear
                            placeholder="Todas las áreas" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Estatus Contable</label>
                        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30">
                            <option value="">Todos</option>
                            {ESTATUS.map(e => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* Print Only Header */}
            <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-800">
                <h1 className="text-2xl font-bold text-slate-900">Reporte de Inventario de Activos Fijos</h1>
                <div className="text-zinc-600 mt-1">Iglesia Misión Cristiana Elim Central - San Pedro Sula, Honduras</div>
                <div className="mt-4 flex justify-between font-bold text-slate-800 text-sm">
                    <div>Filtro de Área: {filtroArea ? (AREAS.find(a => a.value === filtroArea)?.label || filtroArea) : 'TODAS LAS ÁREAS'}</div>
                    <div suppressHydrationWarning>Fecha de Reporte: {new Date().toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto print-expand">
                <table className="w-full text-xs min-w-[800px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {['ID QR', 'FOTO', 'DESCRIPCIÓN', 'ÁREA', 'CUENTA', 'ESTATUS', 'ESTADO', 'RESPONSABLE', ''].map(h => (
                                <th key={h} className={`text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 ${h === '' || h === 'FOTO' ? 'hide-on-print' : ''}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-50 transition-opacity duration-200 ${isRefetching ? 'opacity-40 pointer-events-none' : ''}`}>
                        {activos.length === 0 && !isRefetching ? (
                            <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <div className="text-sm font-medium">No se encontraron activos</div>
                                <div className="text-xs mt-1">Presiona "Registrar Activo" para comenzar el inventario</div>
                            </td></tr>
                        ) : activos.map(a => (
                            <tr key={a.id} onClick={() => setViewActivo(a)} className="hover:bg-slate-50/60 transition-colors group cursor-pointer">
                                <td className="px-3 py-3"><div className="font-mono text-[10px] text-[#0500A3] font-bold bg-blue-50 px-1.5 py-0.5 rounded w-fit whitespace-nowrap">{a.idQr}</div></td>
                                <td className="px-3 py-3 hide-on-print">
                                    {a.imagenUrl
                                        ? <Image src={a.imagenUrl} width={40} height={40} onClick={(e) => {
                                            e.stopPropagation();
                                            const imgs = [a.imagenUrl, a.imagenPlacaUrl].filter(Boolean) as string[];
                                            if (imgs.length > 0) setPreviewImage({ index: 0, images: imgs });
                                        }} alt="Activo" className="w-10 h-10 object-cover rounded-lg border border-slate-200 hover:border-[#0500A3] transition-colors" />
                                        : <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Eye className="w-4 h-4 text-slate-300" /></div>}
                                </td>
                                <td className="px-3 py-3 max-w-[200px]">
                                    <div className="font-semibold text-slate-800 truncate">{a.descripcionCorta}</div>
                                    {a.categoria && <div className="text-purple-600 font-bold text-[10px] bg-purple-50 px-1.5 py-0.5 mt-0.5 rounded w-fit border border-purple-100">{a.categoria.nombre}</div>}
                                    {a.modelo && <div className="text-slate-400 text-[10px] truncate">{a.modelo}</div>}
                                    {a.serie && <div className="text-slate-400 text-[10px] font-mono truncate">S/N: {a.serie}</div>}
                                    {a.esConsumible && a.fechaVencimiento && (() => {
                                        const fv = new Date(a.fechaVencimiento);
                                        const diff = Math.ceil((fv.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                        if (diff < 0) return <div className="mt-1 text-red-600 font-bold text-[10px] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded w-fit !opacity-100">⚠️ VENCIDO</div>;
                                        if (diff <= 30) return <div className="mt-1 text-red-500 font-bold text-[10px] bg-red-50 px-1.5 py-0.5 rounded w-fit">⚠️ Vence en {diff} días</div>;
                                        if (diff <= 60) return <div className="mt-1 text-orange-600 font-bold text-[10px] bg-orange-50 px-1.5 py-0.5 rounded w-fit">⏳ {diff} días</div>;
                                        return <div className="mt-1 text-emerald-600 font-medium text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded w-fit">Vence: {fv.toLocaleDateString('es-HN')}</div>;
                                    })()}
                                </td>
                                <td className="px-3 py-3"><div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0" /><span className="text-slate-600 font-mono text-[10px] whitespace-nowrap">{a.area}</span></div></td>
                                <td className="px-3 py-3 max-w-[140px]"><div className="text-[10px] text-slate-600 truncate">{a.cuentaAct}</div></td>
                                <td className="px-3 py-3"><EstatusBadge estatus={a.estatusContable} /></td>
                                <td className="px-3 py-3"><DanoBadge dano={a.estadoDano} /></td>
                                <td className="px-3 py-3 max-w-[100px]"><div className="text-[10px] text-slate-600 truncate">{a.responsable || '—'}</div></td>
                                <td className="px-3 py-3 hide-on-print" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setEditActivo(a); setModalOpen(true); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Editar"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteActivo(a); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600" title="Eliminar activo"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 hide-on-print">
                    <span className="text-xs text-slate-400">
                        {total === 0 ? 'Sin activos registrados' : `${Math.min((page - 1) * PER_PAGE + 1, total)}–${Math.min(page * PER_PAGE, total)} de ${total}`}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                            <button key={n} onClick={() => handlePageChange(n)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === n ? 'bg-[#0500A3] text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{n}</button>
                        ))}
                        {totalPages > 5 && <span className="text-slate-400 text-xs px-1">...</span>}
                        <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                    </div>
                </div>
            </div>

            <ActivoModal
                dbAreas={dbAreas}
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditActivo(null); }}
                editActivo={editActivo}
                onSuccess={() => refresh(1)}
                lockedArea={lockedArea}
            />
            {/* No Area Open Modal */}
            {noAreaModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <QrCode className="w-8 h-8 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Área no abierta</h2>
                        <p className="text-slate-600 mb-1 font-medium">Para registrar un activo, primero debes abrir un área.</p>
                        <p className="text-sm text-slate-400 mb-6">Escanea el código QR de la puerta del área con la cámara de tu teléfono para iniciar.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setNoAreaModalOpen(false)}
                                className="flex items-center justify-center gap-2 text-base font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 py-3.5 px-5 rounded-2xl transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {deleteActivo_ && (
                <DeleteConfirm
                    activo={deleteActivo_}
                    onClose={() => setDeleteActivo(null)}
                    onSuccess={() => { refresh(1); setDeleteActivo(null); }}
                />
            )}

            {/* Image Preview Modal (Slider) */}
            {previewImage && previewImage.images.length > 0 && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-5xl w-full flex items-center justify-center h-full">
                        {/* Close button */}
                        <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 z-10 p-3 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors active:scale-95"><X className="w-6 h-6" /></button>

                        {/* Prev Button */}
                        {previewImage.images.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null);
                                }}
                                className="absolute left-4 p-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 z-10">
                                <ChevronLeft className="w-10 h-10" />
                            </button>
                        )}

                        {/* Image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img key={previewImage.index} src={previewImage.images[previewImage.index]} alt="Preview" className="w-auto h-auto max-h-[90vh] max-w-full object-contain rounded-xl shadow-2xl transition-opacity animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()} />

                        {/* Next Button */}
                        {previewImage.images.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null);
                                }}
                                className="absolute right-4 p-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 z-10">
                                <ChevronRight className="w-10 h-10" />
                            </button>
                        )}

                        {/* Indicators */}
                        {previewImage.images.length > 1 && (
                            <div className="absolute bottom-6 flex gap-2" onClick={e => e.stopPropagation()}>
                                {previewImage.images.map((_, i) => (
                                    <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i === previewImage.index ? 'bg-white scale-125' : 'bg-white/30'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View Activo Modal */}
            {viewActivo && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setViewActivo(null)}>
                    <div className="min-h-full flex items-center justify-center p-4">
                        <div className="bg-white w-full rounded-2xl shadow-2xl max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-[#0500A3]">Detalle del Activo</h3>
                                <button onClick={() => setViewActivo(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-6">
                                <div className="flex gap-6 mb-6">
                                    <div className="w-32 h-32 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                                        {viewActivo.imagenUrl ? (
                                            <Image src={viewActivo.imagenUrl} width={128} height={128} alt="Activo" className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => {
                                                const imgs = [viewActivo.imagenUrl, viewActivo.imagenPlacaUrl].filter(Boolean) as string[];
                                                setPreviewImage({ index: 0, images: imgs });
                                            }} />
                                        ) : (
                                            <Package className="w-8 h-8 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="inline-block px-2 py-1 bg-blue-50 text-[#0500A3] text-xs font-mono font-bold rounded mb-2">{viewActivo.idQr}</div>
                                        <h4 className="text-xl font-bold text-slate-800 mb-1 leading-tight">{viewActivo.descripcionCorta}</h4>
                                        <div className="text-sm text-slate-500 mb-3">{viewActivo.cuentaAct}</div>
                                        <div className="flex gap-2">
                                            <EstatusBadge estatus={viewActivo.estatusContable} />
                                            <DanoBadge dano={viewActivo.estadoDano} />
                                        </div>
                                    </div>
                                </div>

                                {viewActivo.descripcionDetallada && (
                                    <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción Detallada</h5>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewActivo.descripcionDetallada}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">Área</div>
                                        <div className="font-medium text-slate-800 truncate" title={viewActivo.area}>{viewActivo.area}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">Responsable</div>
                                        <div className="font-medium text-slate-800 truncate" title={viewActivo.responsable || '—'}>{viewActivo.responsable || '—'}</div>
                                    </div>
                                    {viewActivo.modelo && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Modelo</div>
                                            <div className="font-medium text-slate-800">{viewActivo.modelo}</div>
                                        </div>
                                    )}
                                    {viewActivo.serie && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">No. Serie</div>
                                            <div className="font-mono text-slate-800">{viewActivo.serie}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                                {/* Botón ficha técnica */}
                                <a
                                    href={`/ficha-tecnica/${viewActivo?.idQr}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all active:scale-95 border-2 border-[#0500A3]/30 text-[#0500A3] bg-blue-50 hover:bg-blue-100 hover:border-[#0500A3]/50 text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver Ficha Técnica Digital
                                </a>
                                {/* Botón imprimir etiqueta VISTA PREVIA */}
                                <button
                                    onClick={() => { setViewActivo(null); setPreviewActivo(viewActivo!); }}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-md bg-black text-white hover:bg-black/80`}
                                >
                                    <Printer className="w-4 h-4" />
                                    🖨️ Imprimir Etiqueta
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={() => { setViewActivo(null); setEditActivo(viewActivo); setModalOpen(true); }} className="flex-1 bg-[#0500A3] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#0600c2] transition-colors"><Pencil className="w-4 h-4" /> Editar</button>
                                    <button
                                        onClick={() => { const a = viewActivo; setViewActivo(null); setDeleteActivo(a); }}
                                        className="px-4 bg-red-50 text-red-600 border-2 border-red-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-100 hover:border-red-300 transition-colors"
                                        title="Eliminar activo"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setViewActivo(null)} className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors">Cerrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
