'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import {
    Package, Search, Plus, Filter, ChevronLeft, ChevronRight,
    X, Upload, Pencil, Trash2, QrCode, CheckCircle2, AlertTriangle,
    TrendingDown, MapPin, Loader2, Eye, Camera
} from 'lucide-react';
import { getActivos, getActivoStats, createActivo, updateActivo, deleteActivo, uploadActivoImage, previewIdQr } from './actions';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AREAS = [
    { value: 'TEST-AREA', label: '🧪 TEST-AREA — Área de Pruebas (no usar en inventario real)' },
    { value: 'PB-A1-OF.PASTOR', label: 'PB-A1-OF.PASTOR — Planta Baja · Oficina del Pastor' },
    { value: 'PB-A2-OF.ADM', label: 'PB-A2-OF.ADM — Planta Baja · Oficina Administrativa' },
    { value: 'PB-A3-S.CUNA', label: 'PB-A3-S.CUNA — Planta Baja · Sala Cuna' },
    { value: 'PB-A4-ENFERM', label: 'PB-A4-ENFERM — Planta Baja · Enfermería' },
    { value: 'PB-A5-S.JUNTAS', label: 'PB-A5-S.JUNTAS — Planta Baja · Sala de Juntas' },
    { value: 'PB-A6-COCINETA', label: 'PB-A6-COCINETA — Planta Baja · Cocineta' },
    { value: 'PB-A7-OF.JOVEN', label: 'PB-A7-OF.JOVEN — Planta Baja · Oficina de Jóvenes' },
    { value: 'PB-A8-OF.EB', label: 'PB-A8-OF.EB — Planta Baja · Oficina de Escuela Bíblica' },
    { value: 'PB-A9-EB', label: 'PB-A9-EB — Planta Baja · Aula EB "Rayitos"' },
    { value: 'PB-A10-EB', label: 'PB-A10-EB — Planta Baja · Aula EB "Jardín de Gracia"' },
    { value: 'PB-A11-COCIN CAF', label: 'PB-A11-COCIN CAF — Planta Baja · Cocina de Cafetería' },
    { value: 'PB-A12-SALON CAF', label: 'PB-A12-SALON CAF — Planta Baja · Salón de Cafetería' },
    { value: 'PB-A13-AUDIO', label: 'PB-A13-AUDIO — Planta Baja · Sala de Audio/Consola' },
    { value: 'PB-A14-MULTI', label: 'PB-A14-MULTI — Planta Baja · Sala de Multimedia' },
    { value: 'PB-A15-TEMPLO', label: 'PB-A15-TEMPLO — Planta Baja · Salón Templo' },
    { value: 'PB-A16-PLATAFO', label: 'PB-A16-PLATAFO — Planta Baja · Plataforma de Instrumentos' },
    { value: 'PB-A17-OF.REC', label: 'PB-A17-OF.REC — Planta Baja · Oficina / Recepción' },
    { value: 'PB-A18-OF.IMCE', label: 'PB-A18-OF.IMCE — Planta Baja · Oficina Administrativa IMCEH' },
    { value: 'PA-A1-SAL.MUL', label: 'PA-A1-SAL.MUL — Planta Alta · Salón de Usos Múltiples' },
    { value: 'PA-A2-OFICINA', label: 'PA-A2-OFICINA — Planta Alta · Oficina Administrativa' },
    { value: 'PA-A3-EB', label: 'PA-A3-EB — Planta Alta · Aula EB "Soldados de Cristo"' },
    { value: 'PA-A4-EB', label: 'PA-A4-EB — Planta Alta · Aula EB "Peregrinitos"' },
    { value: 'PA-A5-EB', label: 'PA-A5-EB — Planta Alta · Aula EB "Rosas de Sarón"' },
    { value: 'PA-A6-EB', label: 'PA-A6-EB — Planta Alta · Aula EB "Oasis de Alegría"' },
    { value: 'PA-B1-PASILLO', label: 'PA-B1-PASILLO — Planta Alta · Bodega Pasillo aulas EB' },
    { value: 'PB-B1-OFICINA', label: 'PB-B1-OFICINA — Planta Baja · Bodega Oficina Administrativa' },
    { value: 'PB-B2-PASILLO', label: 'PB-B2-PASILLO — Planta Baja · Bodega Pasillo a Enfermería' },
    { value: 'PB-B3-TRASERA', label: 'PB-B3-TRASERA — Planta Baja · Bodega Trasera de Cocineta' },
    { value: 'PB-B4-TEMPLO', label: 'PB-B4-TEMPLO — Planta Baja · Bodega Equipo Sonido/Templo' },
    { value: 'PB-B5-TEMPLO', label: 'PB-B5-TEMPLO — Planta Baja · Bodega Mob. y Eq Diverso/Templo' },
    { value: 'B6-EXTERNA CV', label: 'B6-EXTERNA CV — Bodega Externa · Sector Cerro Verde' },
    { value: 'B7-EXTERNA', label: 'B7-EXTERNA — Bodega Externa · Sector General' },
];

const CUENTAS = [
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

// ─── Reusable Field Components (iPad-optimized) ───────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {children} {required && <span className="text-red-500">*</span>}
        </label>
    );
}

const inputCls = "w-full text-base border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 focus:border-[#0500A3]/50 bg-white transition-all placeholder:text-slate-300";
const selectCls = "w-full text-base border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 focus:border-[#0500A3]/50 bg-white transition-all appearance-none";

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
        {
            label: 'Total de Activos',
            value: stats?.total ?? 0,
            sub: `${stats?.areasRegistradas ?? 0} de 31 áreas cubiertas`,
            icon: Package, color: 'text-[#0500A3]', bg: 'bg-blue-50'
        },
        {
            label: 'Vigentes',
            value: stats?.vigente ?? 0,
            sub: 'Dentro de vida útil contable',
            icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50'
        },
        {
            label: 'Depreciados',
            value: (stats?.depreciado ?? 0) + (stats?.procesoBaja ?? 0),
            sub: `${stats?.procesoBaja ?? 0} en proceso de baja`,
            icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50'
        },
        {
            label: 'Con Daño / Incidencia',
            value: stats?.conDano ?? 0,
            sub: 'Requieren atención',
            icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50'
        },
    ];

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            {cards.map(c => (
                <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
                    <div className={`${c.bg} p-2.5 rounded-lg shrink-0`}>
                        <c.icon className={`w-5 h-5 ${c.color}`} />
                    </div>
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
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[estatus] || 'bg-slate-100 text-slate-600'}`}>
            {estatus}
        </span>
    );
}

function DanoBadge({ dano }: { dano?: string | null }) {
    if (!dano) return <span className="text-slate-300 text-[10px]">OK</span>;
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
            {dano}
        </span>
    );
}

// ─── Modal Form (iPad-first) ──────────────────────────────────────────────────
function ActivoModal({
    open, onClose, editActivo, onSuccess
}: {
    open: boolean;
    onClose: () => void;
    editActivo?: Activo | null;
    onSuccess: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [imagenUrl, setImagenUrl] = useState(editActivo?.imagenUrl || '');
    const [uploading, setUploading] = useState(false);
    const [previewQr, setPreviewQr] = useState('');
    const [selectedArea, setSelectedArea] = useState(editActivo?.area || '');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const isEdit = !!editActivo;

    useEffect(() => {
        if (editActivo) {
            setImagenUrl(editActivo.imagenUrl || '');
            setSelectedArea(editActivo.area);
        } else {
            setImagenUrl('');
            setSelectedArea('');
            setPreviewQr('');
        }
    }, [editActivo, open]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    async function handleAreaChange(area: string) {
        setSelectedArea(area);
        if (area && !isEdit) {
            const qr = await previewIdQr(area);
            setPreviewQr(qr);
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const result = await uploadActivoImage(fd);
            setImagenUrl(result.url);
        } catch {
            alert('Error al subir imagen. Intenta de nuevo.');
        } finally {
            setUploading(false);
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set('imagenUrl', imagenUrl);
        fd.set('area', selectedArea);

        startTransition(async () => {
            try {
                if (isEdit) {
                    await updateActivo(editActivo!.id, fd);
                } else {
                    await createActivo(fd);
                }
                onSuccess();
                onClose();
            } catch (err: any) {
                alert('Error al guardar: ' + err.message);
            }
        });
    }

    if (!open) return null;

    return (
        /* Full-screen overlay with scroll */
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            {/* Modal panel — full width on mobile/tablet, max-w-2xl on desktop */}
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
                        <button onClick={onClose}
                            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors active:scale-95">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-5 py-6 space-y-6">

                        {/* ── SECCIÓN 1: FOTOGRAFÍA (primero para facilidad de campo) ── */}
                        <div>
                            <SectionTitle>📸 Fotografía del Activo</SectionTitle>
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Preview */}
                                <div className="flex justify-center sm:justify-start">
                                    {imagenUrl ? (
                                        <div className="relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={imagenUrl} alt="Activo"
                                                className="w-32 h-32 object-cover rounded-2xl border-2 border-slate-200 shadow-md" />
                                            <button type="button" onClick={() => setImagenUrl('')}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg active:scale-95">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                                            {uploading
                                                ? <Loader2 className="w-8 h-8 animate-spin text-[#0500A3]" />
                                                : <><Eye className="w-8 h-8 mb-1" /><span className="text-xs">Sin foto</span></>
                                            }
                                        </div>
                                    )}
                                </div>
                                {/* Buttons */}
                                <div className="flex-1 flex flex-col gap-3 justify-center">
                                    {/* Camera — primary for iPad */}
                                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                                    <button type="button" onClick={() => cameraInputRef.current?.click()}
                                        disabled={uploading}
                                        className="flex items-center justify-center gap-3 text-base font-semibold bg-[#0500A3] text-white py-4 px-5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 shadow-md">
                                        <Camera className="w-5 h-5" />
                                        {uploading ? 'Subiendo...' : 'Tomar Foto con Cámara'}
                                    </button>
                                    {/* Gallery / file fallback */}
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="flex items-center justify-center gap-3 text-base font-medium border-2 border-slate-200 text-slate-600 py-3.5 px-5 rounded-2xl active:scale-95 transition-all disabled:opacity-50">
                                        <Upload className="w-5 h-5" />
                                        Seleccionar de Galería
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── SECCIÓN 2: IDENTIFICACIÓN ── */}
                        <div>
                            <SectionTitle>📋 Identificación</SectionTitle>
                            <div className="space-y-4">
                                {/* Área */}
                                <div>
                                    <FieldLabel required>Área / Ubicación</FieldLabel>
                                    <div className="relative">
                                        <select
                                            name="area"
                                            required
                                            value={selectedArea}
                                            onChange={e => handleAreaChange(e.target.value)}
                                            className={selectCls}
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}
                                        >
                                            <option value="">— Seleccionar área —</option>
                                            {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Descripción Corta */}
                                <div>
                                    <FieldLabel required>Nombre / Descripción Corta</FieldLabel>
                                    <input type="text" name="descripcionCorta" required
                                        defaultValue={editActivo?.descripcionCorta}
                                        placeholder="Ej: Silla Ejecutiva, Escritorio 4 Gavetas..."
                                        className={inputCls} />
                                </div>

                                {/* Serie + Modelo en grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel>Número de Serie</FieldLabel>
                                        <input type="text" name="serie" defaultValue={editActivo?.serie || ''}
                                            placeholder="S/N si no aplica" className={inputCls} />
                                    </div>
                                    <div>
                                        <FieldLabel>Marca / Modelo</FieldLabel>
                                        <input type="text" name="modelo" defaultValue={editActivo?.modelo || ''}
                                            placeholder="Ej: Yamaha P-125..." className={inputCls} />
                                    </div>
                                </div>

                                {/* Descripción Detallada */}
                                <div>
                                    <FieldLabel>Descripción Detallada</FieldLabel>
                                    <textarea name="descripcionDetallada" rows={3}
                                        defaultValue={editActivo?.descripcionDetallada || ''}
                                        placeholder="Marca, modelo, color, características adicionales..."
                                        className={`${inputCls} resize-none`} />
                                </div>
                            </div>
                        </div>

                        {/* ── SECCIÓN 3: CLASIFICACIÓN CONTABLE ── */}
                        <div>
                            <SectionTitle>📊 Clasificación Contable</SectionTitle>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel required>Cuenta Contable</FieldLabel>
                                        <select name="cuentaAct" required defaultValue={editActivo?.cuentaAct || ''}
                                            className={selectCls}
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}>
                                            <option value="">— Seleccionar —</option>
                                            {CUENTAS.map(c => <option key={c}>{c}</option>)}
                                        </select>
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

                                {/* Integrado — Large checkbox for touch */}
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
                                    <div>
                                        <FieldLabel>Estado / Daño</FieldLabel>
                                        <select name="estadoDano" defaultValue={editActivo?.estadoDano || ''}
                                            className={selectCls}
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}>
                                            <option value="">Sin daño ✓</option>
                                            {ESTADO_DANO.map(e => <option key={e}>{e}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <FieldLabel>Tipo de Incidencia</FieldLabel>
                                        <select name="tipoIncidencia" defaultValue={editActivo?.tipoIncidencia || ''}
                                            className={selectCls}
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}>
                                            <option value="">— N/A —</option>
                                            {TIPO_INCIDENCIA.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <FieldLabel>Acción Recomendada</FieldLabel>
                                        <select name="accionRecomendada" defaultValue={editActivo?.accionRecomendada || ''}
                                            className={selectCls}
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px', paddingRight: '40px' }}>
                                            <option value="">— N/A —</option>
                                            {ACCION_RECOMENDADA.map(a => <option key={a}>{a}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Responsable / Custodio</FieldLabel>
                                    <input type="text" name="responsable" defaultValue={editActivo?.responsable || ''}
                                        placeholder="Nombre del custodio del área" className={inputCls} />
                                </div>

                                <div>
                                    <FieldLabel>Observaciones</FieldLabel>
                                    <textarea name="observaciones" rows={3} defaultValue={editActivo?.observaciones || ''}
                                        placeholder="Notas adicionales, reparaciones pendientes, detalles..."
                                        className={`${inputCls} resize-none`} />
                                </div>
                            </div>
                        </div>

                        {/* ── FOOTER BUTTONS — Large for touch ── */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                            <button type="button" onClick={onClose}
                                className="flex-1 text-base font-medium border-2 border-slate-200 text-slate-600 py-4 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isPending}
                                className="flex-1 flex items-center justify-center gap-2 text-base font-bold bg-[#0500A3] text-white py-4 rounded-2xl hover:bg-[#0600c2] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg">
                                {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                                {isEdit ? '💾 Guardar Cambios' : '✅ Registrar Activo'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
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
                        {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                        Sí, eliminar
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

    async function refresh(p = page, s = search, a = filtroArea, e = filtroEstatus) {
        setLoading(true);
        const [data, st] = await Promise.all([getActivos(p, s, a, e), getActivoStats()]);
        setActivos(data.activos as Activo[]);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStats(st);
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
                        <Package className="w-6 h-6 text-[#0500A3]" />
                        Inventario de Activos
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Control patrimonial físico y contable · Iglesia Elim Central</p>
                </div>
                {/* Primary CTA — big and visible on iPad */}
                <button
                    onClick={() => { setEditActivo(null); setModalOpen(true); }}
                    className="flex items-center gap-2 text-base font-bold bg-[#0500A3] text-white px-5 py-3 rounded-2xl hover:bg-[#0600c2] active:scale-95 transition-all shadow-md">
                    <Plus className="w-5 h-5" /> Registrar Activo
                </button>
            </div>

            {/* Stats */}
            <StatsCards stats={stats} />

            {/* Search + Filter toggle */}
            <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por ID, descripción, serie, responsable..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 bg-white" />
                </div>
                <button onClick={() => setShowFilters(f => !f)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${showFilters ? 'border-[#0500A3] text-[#0500A3] bg-blue-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filtros</span>
                </button>
            </div>

            {/* Expandable filters */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-4 bg-white rounded-xl border border-slate-200">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Área</label>
                        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30">
                            <option value="">Todas las áreas</option>
                            {AREAS.map(a => <option key={a.value} value={a.value}>{a.value}</option>)}
                        </select>
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
                                <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                <div className="text-sm">Cargando activos...</div>
                            </td></tr>
                        ) : activos.length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <div className="text-sm font-medium">No se encontraron activos</div>
                                <div className="text-xs mt-1">Presiona "Registrar Activo" para comenzar el inventario</div>
                            </td></tr>
                        ) : activos.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/60 transition-colors group">
                                <td className="px-3 py-3">
                                    <div className="font-mono text-[10px] text-[#0500A3] font-bold bg-blue-50 px-1.5 py-0.5 rounded w-fit whitespace-nowrap">{a.idQr}</div>
                                </td>
                                <td className="px-3 py-3">
                                    {a.imagenUrl
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={a.imagenUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                                        : <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Eye className="w-4 h-4 text-slate-300" /></div>
                                    }
                                </td>
                                <td className="px-3 py-3 max-w-[200px]">
                                    <div className="font-semibold text-slate-800 truncate">{a.descripcionCorta}</div>
                                    {a.modelo && <div className="text-slate-400 text-[10px] truncate">{a.modelo}</div>}
                                    {a.serie && <div className="text-slate-400 text-[10px] font-mono truncate">S/N: {a.serie}</div>}
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="text-slate-600 font-mono text-[10px] whitespace-nowrap">{a.area}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-3 max-w-[140px]">
                                    <div className="text-[10px] text-slate-600 truncate">{a.cuentaAct}</div>
                                </td>
                                <td className="px-3 py-3"><EstatusBadge estatus={a.estatusContable} /></td>
                                <td className="px-3 py-3"><DanoBadge dano={a.estadoDano} /></td>
                                <td className="px-3 py-3 max-w-[100px]">
                                    <div className="text-[10px] text-slate-600 truncate">{a.responsable || '—'}</div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditActivo(a); setModalOpen(true); }}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Editar">
                                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                                        </button>
                                        <button onClick={() => setDeleteActivo(a)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
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
                        <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                            <button key={n} onClick={() => handlePageChange(n)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === n ? 'bg-[#0500A3] text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                                {n}
                            </button>
                        ))}
                        {totalPages > 5 && <span className="text-slate-400 text-xs px-1">...</span>}
                        <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
        </div>
    );
}
