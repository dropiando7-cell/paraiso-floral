'use client';

import { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import {
    Package, Search, Plus, Filter, ChevronLeft, ChevronRight,
    X, Upload, Pencil, Trash2, QrCode, CheckCircle2, AlertTriangle,
    TrendingDown, MapPin, Loader2, Eye, Camera, Sparkles, ChevronDown
} from 'lucide-react';
import { getActivos, getActivoStats, createActivo, updateActivo, deleteActivo, previewIdQr } from './actions';
import { removeBackground } from '@imgly/background-removal';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AREAS = [
    { value: 'TEST-AREA', label: '🧪 TEST-AREA — Área de Pruebas (no usar en inventario real)' },
    { value: 'PB-A1-OF.PASTOR', label: 'PB-A1-OF.PASTOR — Planta Baja- Oficina del Pastor' },
    { value: 'PB-A2-OF.ADM', label: 'PB-A2-OF.ADM — Planta Baja- Oficina Administrativa' },
    { value: 'PB-A3-S.CUNA', label: 'PB-A3-S.CUNA — Planta Baja- Sala Cuna' },
    { value: 'PB-A4-ENFERM', label: 'PB-A4-ENFERM — Planta Baja- Enfermería' },
    { value: 'PB-A5-S.JUNTAS', label: 'PB-A5-S.JUNTAS — Planta Baja- Sala de Juntas' },
    { value: 'PB-A6-COCINETA', label: 'PB-A6-COCINETA — Planta Baja- Cocineta' },
    { value: 'PB-A7-OF.JOVEN', label: 'PB-A7-OF.JOVEN — Planta Baja- Oficina de Jóvenes' },
    { value: 'PB-A8-OF.EB', label: 'PB-A8-OF.EB — Planta Baja- Oficina de Escuela Bíblica' },
    { value: 'PB-A9-EB', label: 'PB-A9-EB — Planta Baja- Aula de Escuela Bíblica "Rayitos"' },
    { value: 'PB-A10-EB', label: 'PB-A10-EB — Planta Baja- Aula de Escuela Bíblica "Jardín de Gracia"' },
    { value: 'PB-A11-COCIN CAF', label: 'PB-A11-COCIN CAF — Planta Baja- Cocina de Cafetería' },
    { value: 'PB-A12-SALON CAF', label: 'PB-A12-SALON CAF — Planta Baja- Salón de Cafetería' },
    { value: 'PB-A13-AUDIO', label: 'PB-A13-AUDIO — Planta Baja- Sala de Audio/Consola' },
    { value: 'PB-A14-MULTI', label: 'PB-A14-MULTI — Planta Baja- Sala de Multimedia' },
    { value: 'PB-A15-TEMPLO', label: 'PB-A15-TEMPLO — Planta Baja- Salon Templo' },
    { value: 'PB-A16-PLATAFO', label: 'PB-A16-PLATAFO — Planta Baja- Plataforma de Instrumentos/Alabanza' },
    { value: 'PB-A17-OF.REC', label: 'PB-A17-OF.REC — Planta Baja- Oficina / Recepción' },
    { value: 'PB-A18-OF. IMCE', label: 'PB-A18-OF. IMCE — Planta Baja- Oficina Administrativa de IMCEH' },
    { value: 'PA-A1-SAL.MUL', label: 'PA-A1-SAL.MUL — Planta Alta- Salón de Usos Múltiples' },
    { value: 'PA-A2-OFICINA', label: 'PA-A2-OFICINA — Planta Alta- Oficina Apoyo Ministerial' },
    { value: 'PA-A3-EB', label: 'PA-A3-EB — Planta Alta- Aula de Escuela Bíblica "Soldados de Cristo"' },
    { value: 'PA-A4-EB', label: 'PA-A4-EB — Planta Alta- Aula de Escuela Bíblica "Peregrinitos"' },
    { value: 'PA-A5-EB', label: 'PA-A5-EB — Planta Alta- Aula de Escuela Bíblica "Rosas de Sarón"' },
    { value: 'PA-A6-EB', label: 'PA-A6-EB — Planta Alta- Aula de Escuela Bíblica "Oasis de Alegría"' },
    { value: 'PA-B1-PASILLO', label: 'PA-B1-PASILLO — Planta Alta- Bodega Pasillo de aulas de Escuela Bíblica' },
    { value: 'PB-B1-OFICINA', label: 'PB-B1-OFICINA — Planta Baja- Bodega Oficina Administrativa' },
    { value: 'PB-B2-PASILLO', label: 'PB-B2-PASILLO — Planta Baja- Bodega pasillo a enfermería' },
    { value: 'PB-B3-TRASERA', label: 'PB-B3-TRASERA — Planta Baja- Bodega traseras de cocineta' },
    { value: 'PB-B4-TEMPLO', label: 'PB-B4-TEMPLO — Planta Baja- Bodega de Equipo de Sonido/al Templo' },
    { value: 'PB-B5-TEMPLO', label: 'PB-B5-TEMPLO — Planta Baja- Bodega de Mob. y Eq Diverso/al Templo' },
    { value: 'B6-EXTERNA CV', label: 'B6-EXTERNA CV — Bodega Externa /Sector Cerro Verde' },
    { value: 'B7-EXTERNA', label: 'B7-EXTERNA — Bodega Externa /Sector' },
];

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
    'PB-A17-OF.REC': 'ISAAC PAZ',
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
    'B7-EXTERNA': 'JESMY PEREZ',
};

export const CUENTAS = [
    'Terrenos', 'Edificios', 'Vehículos', 'Equipo de Cómputo',
    'Mobiliario y Equipo de Oficina', 'Mobiliario y Equipo de Templo',
    'Equipo de Audio e Instrumentos', 'Mejoras a Edificios', 'Equipos Diversos',
];

const ESTATUS = ['VIGENTE', 'DEPRECIADO', 'PROCESO DE BAJA'];
const ESTADO_DANO = ['DAÑADO', 'FALTANTE', 'NO REGISTRADO', 'INSERVIBLE'];
const TIPO_INCIDENCIA = ['Faltante', 'Extraviado', 'No Registrado'];
const ACCION_RECOMENDADA = ['Reparar', 'Dar de baja', 'Reponer'];

type Activo = {
    id: string;
    idQr: string;
    descripcionCorta: string;
    descripcionDetallada?: string | null;
    serie?: string | null;
    modelo?: string | null;
    area: string;
    cuentaAct: string;
    estatusContable: string;
    fechaAdq?: Date | null;
    integrado: boolean;
    costoAdq?: any;
    origenActivo?: string | null;
    imagenUrl?: string | null;
    estadoDano?: string | null;
    tipoIncidencia?: string | null;
    accionRecomendada?: string | null;
    responsable?: string | null;
    observaciones?: string | null;
};

type AiResult = {
    descripcionCorta?: string;
    descripcionDetallada?: string;
    modelo?: string;
    cuentaAct?: string;
    confianza?: string;
    error?: string;
};

// ─── Searchable Combobox ──────────────────────────────────────────────────────
function Combobox({
    options, value, onChange, placeholder, required, label, aiHighlight
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    label?: string;
    aiHighlight?: boolean;
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
                <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
                    {selected ? selected.label : (placeholder || 'Seleccionar...')}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown — min-w-full so it's never narrower than the trigger */}
            {open && (
                <div className="absolute z-50 left-0 min-w-full w-max max-w-[min(600px,90vw)] mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
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
                        {filtered.length === 0 ? (
                            <div className="text-sm text-slate-400 text-center py-4">Sin resultados para &ldquo;{query}&rdquo;</div>
                        ) : filtered.map(o => (
                            <button key={o.value} type="button" onClick={() => select(o.value)}
                                className={`w-full text-left px-4 py-3 text-sm whitespace-nowrap hover:bg-blue-50 transition-colors
                                    ${o.value === value ? 'bg-[#0500A3]/5 font-semibold text-[#0500A3]' : 'text-slate-700'}`}>
                                {o.label}
                            </button>
                        ))}
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
        { label: 'Total de Activos', value: stats?.total ?? 0, sub: `${stats?.areasRegistradas ?? 0} de 31 áreas cubiertas`, icon: Package, color: 'text-[#0500A3]', bg: 'bg-blue-50' },
        { label: 'Vigentes', value: stats?.vigente ?? 0, sub: 'Dentro de vida útil contable', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Depreciados', value: (stats?.depreciado ?? 0) + (stats?.procesoBaja ?? 0), sub: `${stats?.procesoBaja ?? 0} en proceso de baja`, icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Con Daño / Incidencia', value: stats?.conDano ?? 0, sub: 'Requieren atención', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
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
        const [sx, sy, sw, sh] = full
            ? [0, 0, nw, nh]
            : [Math.round(crop.x / 100 * nw), Math.round(crop.y / 100 * nh),
            Math.round(crop.w / 100 * nw), Math.round(crop.h / 100 * nh)];
        const MAX = 1568;
        const ratio = Math.min(1, MAX / Math.max(sw, sh));
        const dw = Math.round(sw * ratio), dh = Math.round(sh * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = dw; canvas.height = dh;
        canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
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
                    <img ref={imgRef} src={currentSrc} className="block w-full select-none" draggable={false} alt="Vista previa" />
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
            <div className="grid grid-cols-2 gap-3 p-4 bg-black/80">
                <button onClick={() => apply(true)} disabled={isBgRemoving}
                    className="border-2 border-white/30 text-white font-semibold py-4 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50">
                    Foto completa
                </button>
                <button onClick={() => apply(false)} disabled={isBgRemoving}
                    className="bg-[#0500A3] text-white font-semibold py-4 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50">
                    ✓ Confirmar recorte
                </button>
                <button onClick={removeBg} disabled={isBgRemoving || currentSrc !== imageSrc}
                    className="col-span-2 border-2 border-purple-500/50 text-purple-200 bg-purple-900/40 font-semibold py-3 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {currentSrc !== imageSrc ? 'Fondo eliminado' : '🪄 Magia: Eliminar Fondo'}
                </button>
            </div>
        </div>
    );
}

// ─── Modal Form (iPad-first + AI vision) ─────────────────────────────────────
function ActivoModal({ open, onClose, editActivo, onSuccess }: {
    open: boolean; onClose: () => void; editActivo?: Activo | null; onSuccess: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [imagenUrl, setImagenUrl] = useState(editActivo?.imagenUrl || '');
    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
    const [previewQr, setPreviewQr] = useState('');
    const [selectedArea, setSelectedArea] = useState(editActivo?.area || '');
    const [selectedCuenta, setSelectedCuenta] = useState(editActivo?.cuentaAct || '');
    const [aiResult, setAiResult] = useState<AiResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const isEdit = !!editActivo;
    const [cropOpen, setCropOpen] = useState(false);
    const [cropImgSrc, setCropImgSrc] = useState('');

    // Dynamic field values (controlled for AI fill)
    const [descripcionCorta, setDescripcionCorta] = useState(editActivo?.descripcionCorta || '');
    const [descripcionDetallada, setDescripcionDetallada] = useState(editActivo?.descripcionDetallada || '');
    const [modelo, setModelo] = useState(editActivo?.modelo || '');
    const [responsable, setResponsable] = useState(editActivo?.responsable || '');

    useEffect(() => {
        if (editActivo) {
            setImagenUrl(editActivo.imagenUrl || '');
            setSelectedArea(editActivo.area);
            setSelectedCuenta(editActivo.cuentaAct || '');
            setDescripcionCorta(editActivo.descripcionCorta || '');
            setDescripcionDetallada(editActivo.descripcionDetallada || '');
            setModelo(editActivo.modelo || '');
            setResponsable(editActivo.responsable || '');
        } else {
            setImagenUrl(''); setSelectedArea(''); setSelectedCuenta('');
            setPreviewQr(''); setAiResult(null); setUploadPhase('idle');
            setDescripcionCorta(''); setDescripcionDetallada(''); setModelo('');
            setResponsable('');
        }
    }, [editActivo, open]);

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
                if (data.modelo) setModelo(data.modelo);
                if (data.cuentaAct && CUENTAS.includes(data.cuentaAct)) setSelectedCuenta(data.cuentaAct);
            } else {
                alert('La IA no pudo analizar la imagen: ' + (data.error || 'Error desconocido'));
            }
            setUploadPhase('done');
        } catch (err: any) {
            setUploadPhase('done');
            alert('Error al analizar: ' + (err.message || 'Intenta de nuevo'));
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set('imagenUrl', imagenUrl);
        fd.set('area', selectedArea);
        fd.set('cuentaAct', selectedCuenta);
        fd.set('descripcionCorta', descripcionCorta);
        fd.set('descripcionDetallada', descripcionDetallada);
        fd.set('modelo', modelo);

        startTransition(async () => {
            try {
                if (isEdit) await updateActivo(editActivo!.id, fd);
                else await createActivo(fd);
                onSuccess();
                onClose();
            } catch (err: any) {
                alert('Error al guardar: ' + err.message);
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
                                        {isEdit ? 'Editar Activo' : 'Registrar Activo'}
                                    </h2>
                                    {(previewQr || isEdit) && (
                                        <p className="text-xs font-mono text-[#0500A3] font-bold mt-0.5">
                                            ID QR: {isEdit ? editActivo?.idQr : previewQr}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors active:scale-95">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

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
                            <div>
                                <SectionTitle>📋 Identificación</SectionTitle>
                                <div className="space-y-4">
                                    {/* Área — Searchable */}
                                    <div>
                                        <FieldLabel required>Área / Ubicación</FieldLabel>
                                        <Combobox
                                            options={AREAS}
                                            value={selectedArea}
                                            onChange={handleAreaChange}
                                            placeholder="Escribe o selecciona el área..."
                                            label="area"
                                            required
                                        />
                                    </div>

                                    {/* Descripción Corta — AI controlled */}
                                    <div>
                                        <FieldLabel required>
                                            Nombre / Descripción Corta
                                            {aiResult?.descripcionCorta && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                        </FieldLabel>
                                        <input type="text" name="descripcionCorta" required
                                            value={descripcionCorta}
                                            onChange={e => setDescripcionCorta(e.target.value)}
                                            placeholder="Ej: Silla Ejecutiva, Escritorio 4 Gavetas..."
                                            className={aiResult?.descripcionCorta ? inputAiCls : inputCls} />
                                    </div>

                                    {/* Serie + Modelo */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <FieldLabel>Número de Serie</FieldLabel>
                                            <input type="text" name="serie" defaultValue={editActivo?.serie || ''}
                                                placeholder="S/N si no aplica" className={inputCls} />
                                        </div>
                                        <div>
                                            <FieldLabel>
                                                Marca / Modelo
                                                {aiResult?.modelo && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                            </FieldLabel>
                                            <input type="text" name="modelo"
                                                value={modelo}
                                                onChange={e => setModelo(e.target.value)}
                                                placeholder="Ej: Yamaha P-125..."
                                                className={aiResult?.modelo ? inputAiCls : inputCls} />
                                        </div>
                                    </div>

                                    {/* Descripción Detallada — AI controlled */}
                                    <div>
                                        <FieldLabel>
                                            Descripción Detallada
                                            {aiResult?.descripcionDetallada && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                        </FieldLabel>
                                        <textarea name="descripcionDetallada" rows={3}
                                            value={descripcionDetallada}
                                            onChange={e => setDescripcionDetallada(e.target.value)}
                                            placeholder="Marca, modelo, color, características adicionales..."
                                            className={`${aiResult?.descripcionDetallada ? inputAiCls : inputCls} resize-none`} />
                                    </div>
                                </div>
                            </div>

                            {/* ── SECCIÓN 3: CLASIFICACIÓN CONTABLE ── */}
                            <div>
                                <SectionTitle>📊 Clasificación Contable</SectionTitle>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Cuenta — Searchable + AI */}
                                        <div>
                                            <FieldLabel required>
                                                Cuenta Contable
                                                {aiResult?.cuentaAct && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                            </FieldLabel>
                                            <Combobox
                                                options={CUENTAS.map(c => ({ value: c, label: c }))}
                                                value={selectedCuenta}
                                                onChange={setSelectedCuenta}
                                                placeholder="Seleccionar cuenta..."
                                                aiHighlight={!!aiResult?.cuentaAct}
                                            />
                                            <input type="hidden" name="cuentaAct" value={selectedCuenta} required />
                                        </div>
                                        <div>
                                            <FieldLabel>Estatus Contable</FieldLabel>
                                            <select name="estatusContable" defaultValue={editActivo?.estatusContable || 'VIGENTE'}
                                                className={selectCls}
                                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}>
                                                {ESTATUS.map(e => <option key={e}>{e}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <FieldLabel>Fecha de Adquisición</FieldLabel>
                                            <input type="date" name="fechaAdq"
                                                defaultValue={editActivo?.fechaAdq ? new Date(editActivo.fechaAdq).toISOString().split('T')[0] : ''}
                                                className={inputCls} />
                                        </div>
                                        <div>
                                            <FieldLabel>Costo de Adquisición (L.)</FieldLabel>
                                            <input type="number" name="costoAdq" step="0.01" min="0"
                                                defaultValue={editActivo?.costoAdq ? Number(editActivo.costoAdq) : ''}
                                                placeholder="0.00" className={inputCls} />
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-[#0500A3]/40 active:scale-[0.99] transition-all">
                                        <input type="hidden" name="integrado" value="false" />
                                        <input type="checkbox" name="integrado" value="true"
                                            defaultChecked={editActivo?.integrado}
                                            className="w-6 h-6 accent-[#0500A3] rounded" />
                                        <div>
                                            <div className="text-base font-semibold text-slate-800">Activo Integrado</div>
                                            <div className="text-xs text-slate-500">El activo forma parte de un conjunto mayor</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* ── SECCIÓN 4: ESTADO FÍSICO ── */}
                            <div>
                                <SectionTitle>⚠️ Estado Físico / Incidencia</SectionTitle>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { name: 'estadoDano', label: 'Estado / Daño', opts: ESTADO_DANO, empty: 'Sin daño ✓', default: editActivo?.estadoDano },
                                            { name: 'tipoIncidencia', label: 'Tipo de Incidencia', opts: TIPO_INCIDENCIA, empty: '— N/A —', default: editActivo?.tipoIncidencia },
                                            { name: 'accionRecomendada', label: 'Acción Recomendada', opts: ACCION_RECOMENDADA, empty: '— N/A —', default: editActivo?.accionRecomendada },
                                        ].map(f => (
                                            <div key={f.name}>
                                                <FieldLabel>{f.label}</FieldLabel>
                                                <select name={f.name} defaultValue={f.default || ''}
                                                    className={selectCls}
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}>
                                                    <option value="">{f.empty}</option>
                                                    {f.opts.map(o => <option key={o}>{o}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <FieldLabel>Responsable / Custodio</FieldLabel>
                                        <input type="text" name="responsable"
                                            value={responsable}
                                            onChange={e => setResponsable(e.target.value)}
                                            placeholder="Nombre del custodio del área" className={inputCls} />
                                    </div>
                                    <div>
                                        <FieldLabel>Observaciones</FieldLabel>
                                        <textarea name="observaciones" rows={3} defaultValue={editActivo?.observaciones || ''}
                                            placeholder="Notas adicionales, reparaciones pendientes..."
                                            className={`${inputCls} resize-none`} />
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
                    </div>
                </div>
            </div>
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

// ─── Main Component ───────────────────────────────────────────────────────────
export function InventarioClient({ initialData, initialStats }: { initialData?: any; initialStats?: any }) {
    const [activos, setActivos] = useState<Activo[]>(initialData?.activos || []);
    const [total, setTotal] = useState(initialData?.total || 0);
    const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1);
    const [stats, setStats] = useState(initialStats || null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filtroArea, setFiltroArea] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editActivo, setEditActivo] = useState<Activo | null>(null);
    const [deleteActivo_, setDeleteActivo] = useState<Activo | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [viewActivo, setViewActivo] = useState<Activo | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    async function refresh(p = page, s = search, a = filtroArea, e = filtroEstatus) {
        setLoading(true);
        const [data, st] = await Promise.all([getActivos(p, s, a, e), getActivoStats()]);
        setActivos(data.activos as Activo[]);
        setTotal(data.total); setTotalPages(data.totalPages); setStats(st);
        setLoading(false);
    }

    useEffect(() => {
        const t = setTimeout(() => { setPage(1); refresh(1, search, filtroArea, filtroEstatus); }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filtroArea, filtroEstatus]);

    function handlePageChange(p: number) { setPage(p); refresh(p); }
    const PER_PAGE = 10;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-6 h-6 text-[#0500A3]" /> Inventario de Activos
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Control patrimonial físico y contable · Iglesia Elim Central</p>
                </div>
                <button onClick={() => { setEditActivo(null); setModalOpen(true); }}
                    className="flex items-center gap-2 text-base font-bold bg-[#0500A3] text-white px-5 py-3 rounded-2xl hover:bg-[#0600c2] active:scale-95 transition-all shadow-md">
                    <Plus className="w-5 h-5" /> Registrar Activo
                </button>
            </div>

            <StatsCards stats={stats} />

            {/* Search + filter toggle */}
            <div className="flex gap-2 mb-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-4 bg-white rounded-xl border border-slate-200">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Área</label>
                        <Combobox options={AREAS} value={filtroArea}
                            onChange={setFiltroArea}
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

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-xs min-w-[800px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {['ID QR', 'FOTO', 'DESCRIPCIÓN', 'ÁREA', 'CUENTA', 'ESTATUS', 'ESTADO', 'RESPONSABLE', ''].map(h => (
                                <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /><div className="text-sm">Cargando activos...</div>
                            </td></tr>
                        ) : activos.length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <div className="text-sm font-medium">No se encontraron activos</div>
                                <div className="text-xs mt-1">Presiona "Registrar Activo" para comenzar el inventario</div>
                            </td></tr>
                        ) : activos.map(a => (
                            <tr key={a.id} onClick={() => setViewActivo(a)} className="hover:bg-slate-50/60 transition-colors group cursor-pointer">
                                <td className="px-3 py-3"><div className="font-mono text-[10px] text-[#0500A3] font-bold bg-blue-50 px-1.5 py-0.5 rounded w-fit whitespace-nowrap">{a.idQr}</div></td>
                                <td className="px-3 py-3">
                                    {a.imagenUrl
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={a.imagenUrl} onClick={(e) => { e.stopPropagation(); setPreviewImage(a.imagenUrl!); }} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200 hover:border-[#0500A3] transition-colors" />
                                        : <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Eye className="w-4 h-4 text-slate-300" /></div>}
                                </td>
                                <td className="px-3 py-3 max-w-[200px]">
                                    <div className="font-semibold text-slate-800 truncate">{a.descripcionCorta}</div>
                                    {a.modelo && <div className="text-slate-400 text-[10px] truncate">{a.modelo}</div>}
                                    {a.serie && <div className="text-slate-400 text-[10px] font-mono truncate">S/N: {a.serie}</div>}
                                </td>
                                <td className="px-3 py-3"><div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0" /><span className="text-slate-600 font-mono text-[10px] whitespace-nowrap">{a.area}</span></div></td>
                                <td className="px-3 py-3 max-w-[140px]"><div className="text-[10px] text-slate-600 truncate">{a.cuentaAct}</div></td>
                                <td className="px-3 py-3"><EstatusBadge estatus={a.estatusContable} /></td>
                                <td className="px-3 py-3"><DanoBadge dano={a.estadoDano} /></td>
                                <td className="px-3 py-3 max-w-[100px]"><div className="text-[10px] text-slate-600 truncate">{a.responsable || '—'}</div></td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setEditActivo(a); setModalOpen(true); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Editar"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteActivo(a); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
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
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditActivo(null); }}
                editActivo={editActivo}
                onSuccess={() => refresh(1)}
            />
            {deleteActivo_ && (
                <DeleteConfirm
                    activo={deleteActivo_}
                    onClose={() => setDeleteActivo(null)}
                    onSuccess={() => { refresh(1); setDeleteActivo(null); }}
                />
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-4xl w-full flex flex-col items-center">
                        <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/50 rounded-full"><X className="w-6 h-6" /></button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewImage} alt="Preview" className="w-auto h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
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
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={viewActivo.imagenUrl} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => setPreviewImage(viewActivo.imagenUrl!)} />
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
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button onClick={() => { setViewActivo(null); setEditActivo(viewActivo); setModalOpen(true); }} className="flex-1 bg-[#0500A3] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#0600c2] transition-colors"><Pencil className="w-4 h-4" /> Editar Activo</button>
                                <button onClick={() => setViewActivo(null)} className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
