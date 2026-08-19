'use client';

import { useState, useEffect, useTransition, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package, Search, Plus, Filter, ChevronLeft, ChevronRight,
    X, Upload, Pencil, Trash2, QrCode, CheckCircle2, AlertTriangle,
    TrendingDown, MapPin, Loader2, Eye, Camera, Sparkles, ChevronDown, Printer, ExternalLink, Eraser, RotateCw, Lock, Unlock, LayoutGrid, List, Tag, ArrowRightLeft, Wrench, Download, FileSpreadsheet,
    Globe, UserPlus, Laptop, ClipboardList, ArrowUp, ArrowDown, ArrowUpDown, Flower2, AlertCircle, Snowflake
} from 'lucide-react';
import { crearClienteAction } from '../soporte/actions';
import {
    searchActivosForAutocomplete, getActivoDetailsByBarcode, getActivos, getActivoStats, 
    createActivo, updateActivo, deleteActivo, previewIdQr, closeArea, clearPrintQueue, 
    getActiveUserArea, validateAndOpenArea, getGruposAutocompletado, encolarLoteImpresion, 
    encolarCopiasNiimbot, getCategorias, createCategoria, updateCategoria, checkExistingByBarcode, 
    getActivosByGrupo, updateActivoQuick, checkGrupoExists, getActivosByIdQr, 
    searchActivosGlobal, generateNextServiceCode, getActivosForExport, getInventoryOriginsSetting,
    saveInventoryOriginsSetting, getInventoryConditionsSetting, saveInventoryConditionsSetting,
    bulkImportActivos, encolarLoteImportado, generateNextSkuCode, recibirActivoEnTransito,
    getFacturaByActivoId, getActivoForEdit
} from './actions';
import { completarReparacionActivo } from './garantias/actions';
import toast from 'react-hot-toast';
import { getEquiposParaRenta, getRentaStats } from '../rentas/equipos/actions';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { RestockModal } from './RestockModal';
import BuscadorCatWeb, { WebProductAlertPanel } from './BuscadorCatWeb';
import { AreaSplitInput } from '@/components/ui/AreaSplitInput';
import { type GS1Fields, gs1DateToISO } from '@/lib/gs1';
import { removeBackground } from '@imgly/background-removal';
import { DateInput } from '@/components/ui/DateInput';
import BuscadorOdoo, { OdooAlertPanel } from './BuscadorOdoo';

// ─── Debounced Search Input Component ─────────────────────────────────────────
interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    debounce?: number;
}

function DebouncedInput({
    value: initialValue,
    onChange,
    debounce = 300,
    ...props
}: DebouncedInputProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value);
        }, debounce);

        return () => clearTimeout(timeout);
    }, [value, debounce, onChange]);

    return (
        <input {...props} value={value} onChange={e => setValue(e.target.value)} />
    );
}

// ─── Preview Etiqueta Modal ───────────────────────────────────────────────────
function PreviewEtiquetaModal({ activo, onClose, onPrint, isPrinting }: { activo: Activo; onClose: () => void; onPrint: (cantidad: number, size: string, impresora: string) => void; isPrinting: boolean }) {
    const [cantidad, setCantidad] = useState(1);
    const [size, setSize] = useState('50x25');
    const [impresora, setImpresora] = useState('Niimbot');

    useEffect(() => {
        const saved = localStorage.getItem('default_printer');
        if (saved) {
            setImpresora(saved);
        }
    }, []);

    const handlePrinterChange = (newPrinter: string) => {
        setImpresora(newPrinter);
        localStorage.setItem('default_printer', newPrinter);
    };

    const searchParams = new URLSearchParams({
        idQr: activo.idQr,
        descripcion: activo.descripcionCorta || '',
        area: activo.area || '',
        cuenta: activo.cuentaAct || '',
        codigoBarras: activo.codigoBarras || '',
        modelo: activo.modelo || '',
        marca: activo.marca || '',
        serie: activo.serie || '',
        fechaAdq: (activo as any).createdAt ? new Date((activo as any).createdAt).toISOString() : new Date().toISOString()
    });
    if ((activo as any).fechaFabricacion) searchParams.set('fechaFab', new Date((activo as any).fechaFabricacion).toISOString().split('T')[0]);
    if ((activo as any).fechaVencimiento) searchParams.set('fechaVenc', new Date((activo as any).fechaVencimiento).toISOString().split('T')[0]);
    searchParams.set('size', size);
    const url = `/api/impresion/generar-etiqueta?${searchParams.toString()}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 relative max-w-lg w-full">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2.5 rounded-xl"><Printer className="w-5 h-5 text-[#0500A3]" /></div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 leading-tight">Vista Previa de Etiqueta QR</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Asegúrate de que la impresora {impresora === 'Niimbot' ? 'NIIMBOT K3' : 'TSC TE200'} esté conectada y lista.</p>
                    </div>
                </div>
                <div className="mb-4 flex flex-col gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Copias a Imprimir:</span>
                        <input 
                            type="number" 
                            min="1" 
                            max="100" 
                            value={cantidad} 
                            onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                            className="w-20 text-center font-bold font-mono py-1.5 px-2 rounded-lg border-slate-300 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-sm font-semibold text-slate-700">Tamaño Etiqueta:</span>
                        <select 
                            value={size} 
                            onChange={(e) => setSize(e.target.value)}
                            className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-blue-500 bg-white"
                        >
                            <option value="70x40">70x40 mm</option>
                            <option value="50x33">50x33 mm</option>
                            <option value="50x25">50x25 mm</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-sm font-semibold text-slate-700">Impresora:</span>
                        <select 
                            value={impresora} 
                            onChange={(e) => handlePrinterChange(e.target.value)}
                            className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-blue-500 bg-white"
                        >
                            <option value="Niimbot">NIIMBOT K3</option>
                            <option value="TSC TE200">TSC TE200</option>
                        </select>
                    </div>
                </div>
                <div className="border-4 border-slate-100 rounded-xl p-4 bg-slate-50 flex justify-center mb-6 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} className="w-full max-w-[406px] h-auto object-contain bg-white shadow-sm" alt="Preview Etiqueta" />
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 font-semibold border-2 border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
                    <button onClick={() => { onPrint(cantidad, size, impresora); onClose(); }} disabled={isPrinting} className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#0500A3] text-white hover:bg-[#0600c2] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-70">
                        {isPrinting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Printer className="w-5 h-5" />} Enviar a Impresora
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── SuperAdmin Label Preview Modal ──────────────────────────────────────────
function SuperAdminLabelPreviewModal({ onClose, activo }: { onClose: () => void; activo: Activo | null }) {
    const [scale, setScale] = useState<1 | 2 | 3>(2);
    const [reloadKey, setReloadKey] = useState(0);
    const [size, setSize] = useState('50x25');

    if (!activo) return null;

    const searchParams = new URLSearchParams({
        idQr: activo.idQr,
        descripcion: activo.descripcionCorta || '',
        area: activo.area || '',
        cuenta: activo.cuentaAct || '',
        codigoBarras: activo.codigoBarras || '',
        modelo: activo.modelo || '',
        marca: activo.marca || '',
        serie: activo.serie || '',
        fechaAdq: (activo as any).createdAt ? new Date((activo as any).createdAt).toISOString() : new Date().toISOString()
    });
    if ((activo as any).fechaFabricacion) searchParams.set('fechaFab', new Date((activo as any).fechaFabricacion).toISOString().split('T')[0]);
    if ((activo as any).fechaVencimiento) searchParams.set('fechaVenc', new Date((activo as any).fechaVencimiento).toISOString().split('T')[0]);
    searchParams.set('size', size);
    const url = `/api/impresion/generar-etiqueta?${searchParams.toString()}&_r=${reloadKey}`;

    // Dimensiones reales en px del canvas
    const W = size === '70x40' ? 559 : (size === '50x33' ? 406 : 406);
    const H = size === '70x40' ? 320 : (size === '50x33' ? 264 : 203);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl relative flex flex-col overflow-hidden"
                style={{ maxWidth: 620, width: '100%' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2.5 rounded-xl">
                            <Eye className="w-5 h-5 text-purple-700" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">Vista Previa de Etiqueta</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold">SUPER_ADMIN</span>
                                <select 
                                    value={size} 
                                    onChange={(e) => setSize(e.target.value)}
                                    className="text-[11px] font-mono font-semibold py-0.5 px-1 rounded border border-slate-200 bg-white"
                                >
                                    <option value="70x40">70x40mm ({559}x{320}px)</option>
                                    <option value="50x33">50x33mm ({406}x{264}px)</option>
                                    <option value="50x25">50x25mm ({406}x{203}px)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Activo info */}
                <div className="mx-6 mt-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="font-mono text-xs font-black text-[#0500A3] bg-blue-50 px-2 py-1 rounded-lg ring-1 ring-[#0500A3]/20 shrink-0">{activo.idQr}</div>
                    <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate">{activo.descripcionCorta}</div>
                        {activo.marca && <div className="text-xs text-slate-400">Marca: {activo.marca}</div>}
                    </div>
                    <button
                        onClick={() => setReloadKey(k => k + 1)}
                        title="Recargar imagen"
                        className="ml-auto shrink-0 p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="mx-6 mt-4 mb-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Imagen generada por endpoint</span>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                            {([1, 2, 3] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setScale(s)}
                                    className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all ${
                                        scale === s ? 'bg-white text-[#0500A3] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {s}×
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Label stage with checkerboard background (like Photoshop) */}
                    <div
                        className="rounded-xl overflow-auto flex justify-center items-center border border-slate-200"
                        style={{
                            backgroundImage: `repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%)`,
                            backgroundSize: '16px 16px',
                            padding: 16,
                            maxHeight: 420,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            key={reloadKey}
                            src={url}
                            alt="Etiqueta generada"
                            style={{
                                width: W * scale,
                                height: H * scale,
                                imageRendering: scale > 1 ? 'pixelated' : 'auto',
                                display: 'block',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                                border: '2px solid rgba(0,0,0,0.08)',
                                borderRadius: 4,
                                background: '#fff',
                            }}
                        />
                    </div>

                    {/* Ruler bar */}
                    <div className="flex items-center justify-between mt-2 px-1">
                        <span className="text-[10px] text-slate-400 font-mono">0</span>
                        <div className="flex-1 mx-2 h-px bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 relative">
                            <div className="absolute left-1/2 -translate-x-1/2 -top-2 text-[9px] text-slate-400 font-mono bg-white px-1">{Math.round(W * scale)}px</div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{W * scale}px</span>
                    </div>
                </div>

                {/* Metadata chips */}
                <div className="mx-6 mb-5 mt-3 flex flex-wrap gap-2">
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono font-semibold">Canvas: {W}×{H}px</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono font-semibold">203 DPI</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono font-semibold">{size === '70x40' ? '2.7"×1.5" (70×40mm)' : size === '50x33' ? '2"×1.3" (50.8×33mm)' : '2"×1" (50.8×25mm)'}</span>
                    <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">NIIMBOT K3</span>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
                    <a
                        href={url.replace(/&_r=\d+/, '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <ExternalLink className="w-4 h-4" /> Abrir PNG directo
                    </a>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all active:scale-95"
                    >
                        Cerrar
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

const ESTATUS = ['VIGENTE', 'EN TRANSITO', 'DEPRECIADO', 'PROCESO DE BAJA'];
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
    condicionActivo?: string | null;
    esImportadoWeb?: boolean;
    providerName?: string;
    referencia?: string | null;
    lote?: string | null;
    fechaFabricacion?: Date | string | null;
    fechaVencimiento?: Date | string | null;
    imagenUrl?: string | null;
    imagenPlacaUrl?: string | null;
    estadoDano?: string | null;
    tipoIncidencia?: string | null;
    accionRecomendada?: string | null;
    responsable?: string | null;
    observaciones?: string | null;
    createdBy?: { nombre?: string | null; apellido?: string | null; email?: string | null } | null;
    updatedBy?: { nombre?: string | null; apellido?: string | null; email?: string | null } | null;
    createdAt?: Date | string | null;

    historicoId?: string | null;
    categoriaDepreciacion?: string | null;
    vidaUtilOverride?: any;
    codigoGrupo?: string | null;
    codigoBarras?: string | null;
    compatibilidad?: string[];
    categoriaId?: string | null;
    categoria?: { id: string; nombre: string; color?: string | null } | null;
    esConsumible?: boolean;
    garantia?: string | null;
    mantenimientosIncluidos?: number | null;
    frecuenciaMantenimientoMeses?: number | null;
    stock?: number;
    esEquipoCliente?: boolean;
    clienteId?: string | null;
    cobertura?: string | null;
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
    options, value, onChange, placeholder, required, label, aiHighlight, allowClear, allowCustom, disabled
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
    disabled?: boolean;
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
            <button type="button" onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}
                className={`w-full h-[46px] flex items-center justify-between text-sm font-semibold border rounded-xl px-3.5 py-2.5 text-left transition-all focus:outline-none
                    ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-transparent' : aiHighlight ? 'border-purple-400 bg-purple-50' : 'border-slate-200 bg-white'}
                    ${open ? 'ring-2 ring-[#0500A3]/30 border-[#0500A3]/50' : 'hover:border-slate-300'}`}>
                <span className={`flex-1 min-w-0 truncate ${selected || (allowCustom && value) ? (disabled ? 'text-slate-500' : 'text-slate-900') : 'text-slate-400'}`}>
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
function StatsCards({ stats, onSelectFilter }: { stats: any; onSelectFilter?: (estatus: string) => void }) {
    const cards = [
        { 
            label: 'Total Productos', 
            value: stats?.total ?? 0, 
            sub: `${stats?.areasRegistradas ?? 0} cámaras frías`, 
            icon: Flower2, 
            color: 'text-[#0500A3]', 
            bg: 'bg-blue-50',
            filter: ''
        },
        { 
            label: 'En Cámara Fría', 
            value: stats?.vigente ?? 0, 
            sub: 'Flores listas para venta', 
            icon: CheckCircle2, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            filter: 'VIGENTE'
        },
        { 
            label: 'Bajo Stock', 
            value: stats?.bajoStock ?? 0, 
            sub: 'Stock crítico (≤ 5 paq.)', 
            icon: AlertCircle, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50',
            filter: 'BAJO_STOCK'
        },
        { 
            label: 'Merma de Flor', 
            value: stats?.conDano ?? 0, 
            sub: 'Flores marchitas o daño', 
            icon: TrendingDown, 
            color: 'text-rose-600', 
            bg: 'bg-rose-50',
            filter: 'CON_DANO'
        },
        { 
            label: 'Cámaras Frías', 
            value: stats?.areasRegistradas ?? 0, 
            sub: 'Zonas de refrigeración', 
            icon: Snowflake, 
            color: 'text-sky-600', 
            bg: 'bg-sky-50',
            filter: ''
        },
    ];

    return (
        <div className="flex sm:grid sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
            {cards.map(c => (
                <div 
                  key={c.label} 
                  onClick={() => c.filter && onSelectFilter && onSelectFilter(c.filter)}
                  className={`bg-white rounded-xl border border-slate-200 p-3.5 flex items-start gap-3 shadow-2xs hover:shadow-md transition-all min-w-[170px] sm:min-w-0 shrink-0 snap-start ${
                    c.filter ? 'cursor-pointer hover:border-indigo-300 active:scale-98' : ''
                  }`}
                  title={c.filter ? `Filtrar por ${c.label}` : undefined}
                >
                    <div className={`${c.bg} p-2 rounded-lg shrink-0`}><c.icon className={`w-4.5 h-4.5 ${c.color}`} /></div>
                    <div className="min-w-0">
                        <div className="text-[11px] text-slate-500 font-bold mb-0.5 leading-tight">{c.label}</div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900">{c.value}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight font-medium truncate">{c.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function EstatusBadge({ estatus }: { estatus: string }) {
    const map: Record<string, string> = {
        'VIGENTE': 'bg-emerald-100 text-emerald-700 border border-emerald-200/50',
        'EN TRANSITO': 'bg-purple-100 text-purple-700 border border-purple-200/50',
        'DEPRECIADO': 'bg-amber-100 text-amber-700 border border-amber-200/50',
        'PROCESO DE BAJA': 'bg-red-100 text-red-700 border border-red-200/50',
        'EN REPARACION': 'bg-blue-100 text-blue-700 border border-blue-200/50',
        'VENDIDO': 'bg-slate-100 text-slate-700 border border-slate-200/50',
        'VENDIDO/ENTREGADO': 'bg-slate-100 text-slate-700 border border-slate-200/50',
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
        <div className="fixed inset-0 z-[150] flex flex-col bg-black" style={{ touchAction: 'none' }}>
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
export function ActivoModal({ open, onClose, editActivo, onSuccess, lockedArea, dbAreas = [], onSelectRestock, isRentaMode, originsList = ["Americano", "Chino", "Otro"], defaultOrigin = "", onManageOrigins, conditionsList = ["Nuevo", "Usado", "Remanufacturado"], defaultCondition = "", onManageConditions, disableAiVision = false, clientes = [] }: {
    open: boolean; onClose: () => void; editActivo?: Activo | null; onSuccess: () => void; lockedArea?: string | null; dbAreas?: any[]; onSelectRestock?: () => void; isRentaMode?: boolean; originsList?: string[]; defaultOrigin?: string; onManageOrigins?: () => void; conditionsList?: string[]; defaultCondition?: string; onManageConditions?: () => void; disableAiVision?: boolean; clientes?: any[];
}) {
    const AREAS = dbAreas.length > 0 ? dbAreas.map(a => ({
        value: a.name,
        label: a.description ? `${a.name} — ${a.description}` : a.name
    })) : [{ value: 'TEST-AREA', label: '🧪 TEST-AREA — Área genérica' }];
    const searchParams = useSearchParams();
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
    const [referencia, setReferencia] = useState(editActivo?.referencia || '');
    const [codigoGrupo, setCodigoGrupo] = useState(editActivo?.codigoGrupo || '');
    const [codigoBarras, setCodigoBarras] = useState(editActivo?.codigoBarras || '');
    const [cantidad, setCantidad] = useState(editActivo?.stock ? String(editActivo.stock) : '1');
    const [responsable, setResponsable] = useState(editActivo?.responsable || (lockedArea ? RESPONSABLES[lockedArea] : '') || '');
    const [garantia, setGarantia] = useState(editActivo?.garantia || '');
    const [mantenimientosIncluidos, setMantenimientosIncluidos] = useState(editActivo?.mantenimientosIncluidos ? String(editActivo.mantenimientosIncluidos) : '');
    const [frecuenciaMantenimientoMeses, setFrecuenciaMantenimientoMeses] = useState(editActivo?.frecuenciaMantenimientoMeses ? String(editActivo.frecuenciaMantenimientoMeses) : '');

    // Clientes list state & registration modal states
    const [clientesList, setClientesList] = useState<any[]>(clientes || []);
    const [selectedClienteId, setSelectedClienteId] = useState<string>(editActivo?.clienteId || '');
    const [cobertura, setCobertura] = useState<string>(editActivo?.cobertura || 'externa');
    const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
    const [newClienteData, setNewClienteData] = useState({
        nombre: '',
        rtn: '',
        telefono: '',
        email: '',
        direccion: '',
        notas: '',
        nombreContacto: '',
        telefonoContacto: ''
    });


    // Pre-step Registration Type
    const [tipoRegistro, setTipoRegistro] = useState<'seleccion' | 'nuevo' | 'reingreso' | 'servicio' | 'import_web' | 'equipo_cliente'>(editActivo ? ((editActivo.esEquipoCliente ?? false) ? 'equipo_cliente' : 'reingreso') : 'seleccion');
    const [esEquipoCliente, setEsEquipoCliente] = useState<boolean>(editActivo ? (editActivo.esEquipoCliente ?? false) : false);

    const [isServiceMode, setIsServiceMode] = useState(false);
    const [estatusContable, setEstatusContable] = useState(editActivo?.estatusContable || 'VIGENTE');

    useEffect(() => {
        if (tipoRegistro === 'servicio') {
            setIsServiceMode(true);
        } else {
            setIsServiceMode(false);
        }
    }, [tipoRegistro]);

    useEffect(() => {
        if (!isEdit && open) {
            setEsEquipoCliente(tipoRegistro === 'equipo_cliente');
        }
    }, [tipoRegistro, isEdit, open]);

    useEffect(() => {
        const reg = searchParams?.get('register');
        const cob = searchParams?.get('cobertura');
        if ((reg === 'equipo_cliente' || cob === 'externa') && open) {
            setTipoRegistro('equipo_cliente');
            setCobertura('externa');
        }
    }, [searchParams, open]);

    const handleCreateCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClienteData.nombre) {
            toast.error("Por favor ingresa el nombre del cliente.");
            return;
        }

        try {
            const res = await crearClienteAction(newClienteData);

            if (res.success && res.cliente) {
                toast.success("Cliente registrado exitosamente.");
                const newCli = res.cliente;
                setClientesList(prev => [...prev, newCli].sort((a, b) => a.nombre.localeCompare(b.nombre)));
                
                // Pre-seleccionar el cliente creado
                setSelectedClienteId(newCli.id);
                
                // Reset form
                setNewClienteData({
                    nombre: '',
                    rtn: '',
                    telefono: '',
                    email: '',
                    direccion: '',
                    notas: '',
                    nombreContacto: '',
                    telefonoContacto: ''
                });
                setIsClienteModalOpen(false);
            } else {
                toast.error(res.error || "No se pudo registrar el cliente.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error al registrar el cliente.");
        }
    };

    // Obtener el prefijo del código de servicio basado en el icono seleccionado
    const getServicePrefix = (img: string) => {
        if (img.includes('instalacion')) return 'INS';
        if (img.includes('reparacion')) return 'REP';
        if (img.includes('soporte')) return 'DIAG';
        if (img.includes('mantenimiento')) return 'MPV';
        if (img.includes('garantia')) return 'MCO';
        if (img.includes('mano_obra')) return 'MO';
        return 'REP'; // Prefijo por defecto
    };

    // Auto-generar código correlativo de servicio cuando se entra en modo servicio o cambia el icono
    useEffect(() => {
        console.log('[DEBUG_SERVICE] useEffect triggered. isServiceMode:', isServiceMode, 'isEdit:', isEdit, 'imagenUrl:', imagenUrl);
        if (isServiceMode && !isEdit) {
            const activeIcon = imagenUrl || '/services/reparacion.jpg';
            const prefix = getServicePrefix(activeIcon);
            console.log('[DEBUG_SERVICE] calculated prefix:', prefix);
            
            const fetchServiceCode = async () => {
                try {
                    console.log('[DEBUG_SERVICE] calling generateNextServiceCode with prefix:', prefix);
                    const nextCode = await generateNextServiceCode(prefix);
                    console.log('[DEBUG_SERVICE] generateNextServiceCode resolved:', nextCode);
                    setCodigoBarras(nextCode);
                } catch (err) {
                    console.error('[DEBUG_SERVICE] Error al generar código correlativo de servicio:', err);
                }
            };
            
            fetchServiceCode();
        }
    }, [isServiceMode, imagenUrl, isEdit]);
    const [compatibilidad, setCompatibilidad] = useState<string[]>(isEdit && editActivo ? editActivo.compatibilidad || [] : []);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [fechaAdq, setFechaAdq] = useState(editActivo?.fechaAdq ? getLocalDateString(editActivo.fechaAdq) : getLocalDateString(new Date()));
    const [origenActivo, setOrigenActivo] = useState(editActivo?.origenActivo || '');
    const [condicionActivo, setCondicionActivo] = useState(editActivo?.condicionActivo || '');
    const [serie, setSerie] = useState(editActivo?.serie || '');

    const [odooReference, setOdooReference] = useState<any>(null);
    const [webProductReference, setWebProductReference] = useState<any>(null);

    const handleAutogenerarSku = async () => {
        try {
            const nextSku = await generateNextSkuCode();
            setCodigoBarras(nextSku);
            toast.success(`Código interno autogenerado: ${nextSku}`);
        } catch (e) {
            console.error(e);
            toast.error("Error al autogenerar código de barras");
        }
    };

    const handleWebProductSelect = async (product: any) => {
        setWebProductReference(product);
        if (product.nombre) setDescripcionCorta(product.nombre);
        
        const img = product.imagenWeb || (product.imagenes && product.imagenes[0]) || '';
        if (img && !imagenUrl) setImagenUrl(img);
        if (product.marca && !marca) setMarca(product.marca);
        if (product.modelo && !modelo) setModelo(product.modelo);
        if (product.costoBase && !costoAdq) setCostoAdq(String(product.costoBase));
        if (product.sku && !referencia) setReferencia(product.sku);
        if (product.categoria) {
            const matchedCat = categorias.find(c => c.label.toLowerCase() === product.categoria.toLowerCase());
            if (matchedCat) setCategoriaId(matchedCat.value);
        }

        // Generate next SKU from our inventory
        try {
            const nextSku = await generateNextSkuCode();
            setCodigoBarras(nextSku);
            toast.success(`Código interno asignado: ${nextSku}`);
        } catch (e) {
            console.error(e);
        }

        setCompatibilidad(prev => {
            const nuevas = new Set([...prev, 'CATALOGO-WEB']);
            return Array.from(nuevas);
        });
    };

    const handleOdooSelect = (product: any) => {
        setOdooReference(product);
        if (product.nombreMostrar || product.nombre) setDescripcionCorta(product.nombreMostrar || product.nombre);
        if (product.imagenUrl && !imagenUrl) setImagenUrl(product.imagenUrl);
        if (product.codigoBarras && !codigoBarras) setCodigoBarras(product.codigoBarras);
        if (product.referenciaInterna && !referencia) setReferencia(product.referenciaInterna);
        
        if (product.tipoProducto && product.tipoProducto !== 'N/A') {
            setEsConsumible(product.tipoProducto.toLowerCase().includes('consu') || product.tipoProducto.toLowerCase().includes('almacenable'));
        }

        if (product.pasilloEstante) {
            setSelectedArea(product.pasilloEstante.toUpperCase().replace(/\s+/g, '-'));
        }

        setCompatibilidad(prev => {
            const nuevas = new Set([...prev, 'MIGRACION-ODOO', 'REPUESTO']);
            return Array.from(nuevas);
        });
    };
    const [costoAdq, setCostoAdq] = useState<string>(editActivo?.costoAdq ? Number(editActivo.costoAdq).toString() : '');


    const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
    const [barcodeOptions, setBarcodeOptions] = useState<any[]>([]);
    const [showBarcodeDropdown, setShowBarcodeDropdown] = useState(false);
    const barcodeRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<boolean>(true);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    // Cuando un código ya existe en inventario, entra en modo Reabastecer
    const [restockTarget, setRestockTarget] = useState<{
        id: string; idQr: string; descripcionCorta: string; stock: number; imagenUrl: string | null; codigoBarras: string | null; area: string;
    } | null>(null);
    const [restockCantidad, setRestockCantidad] = useState('1');
    const [isRestocking, setIsRestocking] = useState(false);

    const handleScanSuccess = async (decodedText: string, gs1?: GS1Fields) => {
        let cleanText = decodedText.trim();
        if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
            try {
                const url = new URL(cleanText);
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts.length > 0) cleanText = parts[parts.length - 1];
            } catch {
                cleanText = cleanText.substring(cleanText.lastIndexOf('/') + 1);
            }
        }
        
        setIsScannerOpen(false);
        setCodigoBarras(cleanText);

        // Autocompletar lote y vencimiento desde GS1 si el modal los tiene
        if (gs1?.lote) setLote(gs1.lote);
        if (gs1?.serial) setSerie(gs1.serial);
        if (gs1?.fechaProd) {
            const iso = gs1DateToISO(gs1.fechaProd);
            if (iso) setFechaFabricacion(iso);
        }
        if (gs1?.fechaVenc) {
            const iso = gs1DateToISO(gs1.fechaVenc);
            if (iso) setFechaVencimiento(iso);
        }

        // Verificar si ya existe en inventario → modo Reabastecer
        try {
            const existente = await checkExistingByBarcode(cleanText);
            if (existente) {
                setRestockTarget(existente);
                setRestockCantidad('1');
                return; // No rellenar el formulario completo
            }
        } catch (e) {
            console.error('checkExistingByBarcode error:', e);
        }

        // No existe → intentar autocompletar desde histórico
        try {
            const res = await fetch(`/api/inventario/buscar-por-udi?udi=${encodeURIComponent(cleanText)}`);
            if (res.ok) {
                const json = await res.json();
                if (json.found && json.data) {
                    if (json.data.descripcionCorta) setDescripcionCorta(json.data.descripcionCorta);
                    if (json.data.descripcionDetallada) setDescripcionDetallada(json.data.descripcionDetallada);
                    if (json.data.marca) setMarca(json.data.marca);
                    if (json.data.modelo) setModelo(json.data.modelo);
                    if (json.data.cuentaAct) setSelectedCuenta(json.data.cuentaAct);
                    if (json.data.codigoGrupo) setCodigoGrupo(json.data.codigoGrupo);
                    alert('¡Producto detectado en registro histórico! Formulario autocompletado.');
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (!codigoBarras || codigoBarras.length < 2 || isEdit) {
            setBarcodeOptions([]);
            setShowBarcodeDropdown(false);
            return;
        }
        const delay = setTimeout(async () => {
            setIsSearchingBarcode(true);
            try {
                const res = await searchActivosForAutocomplete(codigoBarras);
                setBarcodeOptions(res);
                if (res.length > 0) setShowBarcodeDropdown(true);
            } catch (e) { }
            setIsSearchingBarcode(false);
        }, 400);
        return () => clearTimeout(delay);
    }, [codigoBarras, isEdit]);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (barcodeRef.current && !barcodeRef.current.contains(e.target as Node)) {
                setShowBarcodeDropdown(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    async function handleBarcodeSearch(overrideCode?: string) {
        let codeToSearch = overrideCode || codigoBarras;
        if (typeof codeToSearch !== 'string') codeToSearch = codigoBarras;
        if (!codeToSearch.trim() || isEdit) return;
        setIsSearchingBarcode(true);
        setShowBarcodeDropdown(false);
        try {
            const data = await getActivoDetailsByBarcode(codeToSearch.trim());
            if (data) {
                if (overrideCode && typeof overrideCode === 'string') setCodigoBarras(overrideCode);
                if (!descripcionCorta) setDescripcionCorta(data.descripcionCorta || '');
                if (!descripcionDetallada) setDescripcionDetallada(data.descripcionDetallada || '');
                if (!marca) setMarca(data.marca || '');
                if (!modelo) setModelo(data.modelo || '');
                if (!selectedCuenta) setSelectedCuenta(data.cuentaAct || '');
                if (!categoriaId) setCategoriaId(data.categoriaId || '');
                if (!imagenUrl) setImagenUrl(data.imagenUrl || '');
                setEsConsumible(data.esConsumible || false);
            } else if (!overrideCode) {
                alert('No se encontraron detalles para este código.');
            }
        } catch (e) { console.error(e); } finally { setIsSearchingBarcode(false); }
    }


    // ─── Phase 14: Categories and Expirations ───
    const [categoriaId, setCategoriaId] = useState(editActivo?.categoriaId || '');
    const [categorias, setCategorias] = useState<{value: string, label: string}[]>([]);
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [nuevaCategoriaText, setNuevaCategoriaText] = useState('');
    const [esConsumible, setEsConsumible] = useState(editActivo ? (editActivo.esConsumible ?? true) : true);
    const [lote, setLote] = useState(editActivo?.lote || '');
    const [fechaVencimiento, setFechaVencimiento] = useState(editActivo?.fechaVencimiento ? getLocalDateString(editActivo.fechaVencimiento) : '');
    const [fechaFabricacion, setFechaFabricacion] = useState(editActivo?.fechaFabricacion ? getLocalDateString(editActivo.fechaFabricacion) : '');

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

    // Auto Grupo State
    const [autoGrupo, setAutoGrupo] = useState<string>('');
    const [isGrupoLocked, setIsGrupoLocked] = useState<boolean>(false);
    const [grupoError, setGrupoError] = useState<string>('');
    const [isCheckingGrupo, setIsCheckingGrupo] = useState<boolean>(false);
    
    // Dynamic preview logic exclusively for UI feedback (no auto-locking)
    useEffect(() => {
        if (tipoRegistro === 'nuevo' && !isEdit) {
            const timer = setTimeout(() => {
                const groupToUse = codigoGrupo && codigoGrupo.trim() !== '' ? codigoGrupo.trim() : '001';
                console.log('[CLIENT] useEffect calling previewIdQr with area:', selectedArea, 'group:', groupToUse);
                previewIdQr(selectedArea, groupToUse).then(code => {
                    console.log('[CLIENT] useEffect previewIdQr resolved:', code);
                    setPreviewCode(code);
                }).catch(e => {
                    console.error('[CLIENT] useEffect previewIdQr error:', e);
                });
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [tipoRegistro, isEdit, selectedArea, codigoGrupo]);

    function handleUnlockGrupo() {
        if (isGrupoLocked) {
            setIsGrupoLocked(false);
        } else {
            setIsGrupoLocked(true);
        }
    }

    async function validateGrupoManual() {
        if (isGrupoLocked || !codigoGrupo || tipoRegistro !== 'nuevo' || isEdit) return;
        if (codigoGrupo === autoGrupo) return;
        
        setIsCheckingGrupo(true);
        try {
            const exists = await checkGrupoExists(codigoGrupo);
            if (exists) {
                setGrupoError('Este código ya existe. Usa "Reingreso" o elige otro.');
            } else {
                setGrupoError('');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCheckingGrupo(false);
        }
    }

    function applyHistoricRecord(record: any, options?: { skipImage?: boolean }) {
        const skipImage = options?.skipImage ?? false;
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
        
        // Use functional state updates to prevent stale closures overwriting fresh image state
        setImagenUrl(prev => (!skipImage && record.imagenUrl && !prev) ? record.imagenUrl : prev);
        setImagenPlacaUrl(prev => (record.imagenPlacaUrl && !prev) ? record.imagenPlacaUrl : prev);
        
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

    const isExistingGroup = !isEdit && !!gruposDisponibles.find(g => g.codigoGrupo === codigoGrupo && g.cantidad > 0);

    const [activosGrupo, setActivosGrupo] = useState<any[]>([]);
    useEffect(() => {
        if (codigoGrupo && isExistingGroup) {
            getActivosByGrupo(codigoGrupo).then(data => {
                setActivosGrupo(data);
                if (data.length > 0 && !codigoBarras && data[0].codigoBarras) {
                    setCodigoBarras(data[0].codigoBarras);
                }
            });
        } else {
            setActivosGrupo([]);
        }
    }, [codigoGrupo, isExistingGroup, codigoBarras]);

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
            setReferencia(editActivo.referencia || '');
            setLote(editActivo.lote || '');
            setCodigoGrupo(editActivo.codigoGrupo || '001');
            setCodigoBarras(editActivo.codigoBarras || '');
            setCantidad(editActivo.stock ? String(editActivo.stock) : '1');
            setResponsable(editActivo.responsable || '');
            setCategoriaDepreciacion(editActivo.categoriaDepreciacion || '');
            setVidaUtilOverride(editActivo.vidaUtilOverride ? Number(editActivo.vidaUtilOverride).toString() : '');
            setFechaAdq(editActivo.fechaAdq ? getLocalDateString(editActivo.fechaAdq) : '');
            setCostoAdq(editActivo.costoAdq ? Number(editActivo.costoAdq).toString() : '');
            setOrigenActivo(editActivo.origenActivo || '');
            setCondicionActivo(editActivo.condicionActivo || '');
            setCategoriaId(editActivo.categoriaId || '');
            setEsConsumible(editActivo.esConsumible ?? true);
            setGarantia(editActivo.garantia || '');
            setMantenimientosIncluidos(editActivo.mantenimientosIncluidos ? String(editActivo.mantenimientosIncluidos) : '');
            setFrecuenciaMantenimientoMeses(editActivo.frecuenciaMantenimientoMeses ? String(editActivo.frecuenciaMantenimientoMeses) : '');
            setLote(editActivo.lote || '');
            setFechaVencimiento(editActivo.fechaVencimiento ? getLocalDateString(editActivo.fechaVencimiento) : '');
            setFechaFabricacion(editActivo.fechaFabricacion ? getLocalDateString(editActivo.fechaFabricacion) : '');
            setSerie(editActivo.serie || '');

            setEstatusContable(editActivo.estatusContable || 'VIGENTE');
            setCobertura(editActivo.cobertura || 'externa');
            setEsEquipoCliente(editActivo.esEquipoCliente ?? false);
            // For now, not fetching full historic record on edit, just handling its absence.
        } else {
            setImagenUrl(''); setImagenPlacaUrl(''); setSelectedArea(lockedArea || ''); setSelectedCuenta('');
            setPreviewQr(''); setAiResult(null); setUploadPhase('idle'); setPlacaUploadPhase('idle');
            setDescripcionCorta(''); setDescripcionDetallada(''); setMarca(''); setModelo(''); setReferencia(''); setCodigoGrupo(''); setCodigoBarras(''); setCantidad('1');
            setResponsable(lockedArea && RESPONSABLES[lockedArea] ? RESPONSABLES[lockedArea] : '');
            setCategoriaDepreciacion(''); setVidaUtilOverride(''); setSelectedHistorico(null); setSearchHistoricoText('');
            setFechaAdq(getLocalDateString(new Date())); setCostoAdq(''); setOrigenActivo(defaultOrigin); setCondicionActivo(defaultCondition); setCategoriaId(''); setEsConsumible(true); setGarantia(''); setMantenimientosIncluidos(''); setFrecuenciaMantenimientoMeses(''); setLote(''); setFechaVencimiento(''); setFechaFabricacion(''); setSerie('');
            setTipoRegistro('seleccion');
            setEstatusContable('VIGENTE');
            setCobertura('externa');
            setEsEquipoCliente(false);
            setWebProductReference(null);
        }
    }, [editActivo, open, lockedArea, defaultOrigin, defaultCondition]);

    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        event.preventDefault();
                        setAiResult(null);
                        const url = URL.createObjectURL(file);
                        setCropImgSrc(url);
                        setCropOpen(true);
                        toast.success('Imagen detectada en el portapapeles y cargada.');
                    }
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
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
            const formData = new FormData();
            formData.append('file', blob, 'activo.jpg');
            formData.append('fileName', 'activo.jpg');
            const res = await fetch('/api/upload/inventario', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status} al subir imagen`);
            }
            const { publicUrl } = await res.json();
            setImagenUrl(publicUrl);
            setUploadPhase('done');
            // Auto-trigger AI analysis right after upload if not disabled
            if (!disableAiVision) {
                analyzeWithAI(publicUrl);
            }
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
                                applyHistoricRecord(historicos[0], { skipImage: true });
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
                alert('✅ Foto subida exitosamente.\n\n⚠️ Aviso: La Inteligencia Artificial no pudo procesar los datos automáticamente (' + (data.error || 'Error desconocido') + ').\n\nPuedes continuar ingresando los datos manualmente.');
            }
            setUploadPhase('done');
        } catch (err: any) {
            setUploadPhase('done');
            alert('✅ Foto subida exitosamente.\n\n⚠️ Aviso: Hubo un problema de conexión con la Inteligencia Artificial.\n\nPuedes continuar ingresando los datos manualmente sin problemas.');
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
            await new Promise((resolve, reject) => {
                img.onload = () => resolve(null);
                img.onerror = () => reject(new Error("Formato de imagen no soportado (ej. HEIC/HEIF de iPhone) o archivo corrupto. Intenta con JPG/PNG."));
            });
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

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(b => {
                    if (b) resolve(b);
                    else reject(new Error("Error al convertir la imagen de la placa a Blob."));
                }, 'image/jpeg', 0.85);
            });

            const placaFormData = new FormData();
            placaFormData.append('file', blob, 'placa.jpg');
            placaFormData.append('fileName', 'placa.jpg');
            const res = await fetch('/api/upload/inventario', {
                method: 'POST',
                body: placaFormData,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status}: Falló subida de placa`);
            }
            const { publicUrl } = await res.json();

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
                                applyHistoricRecord(res[0], { skipImage: true });
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
        
        if (grupoError) {
            alert('Corrige los errores en el formulario antes de continuar.');
            return;
        }
        const fd = new FormData(e.currentTarget);
        if (esEquipoCliente) {
            if (!selectedClienteId) {
                alert("Por favor selecciona un cliente propietario.");
                return;
            }
            fd.set('esEquipoCliente', 'true');
            fd.set('clienteId', selectedClienteId);
            fd.set('cobertura', cobertura);
        } else {
            fd.set('esEquipoCliente', 'false');
            fd.delete('clienteId');
            fd.delete('cobertura');
        }
        fd.set('imagenUrl', isServiceMode ? (imagenUrl || '/services/reparacion.jpg') : imagenUrl);
        fd.set('imagenPlacaUrl', isServiceMode ? '' : imagenPlacaUrl);
        fd.set('area', isServiceMode ? 'SERVICIOS' : selectedArea);
        fd.set('cuentaAct', 'INVENTARIO');

        // Use proper group code — generateIdQr handles auto-increment sequence
        const finalCodigoGrupo = codigoGrupo || '001';

        fd.set('codigoGrupo', finalCodigoGrupo);
        if (codigoBarras) fd.set('codigoBarras', codigoBarras);
        fd.set('cantidad', isServiceMode ? '9999' : cantidad);
        fd.set('compatibilidad', JSON.stringify(compatibilidad));

        if (categoriaId) fd.set('categoriaId', categoriaId);
        
        // Ensure esServicio is passed to backend
        if (isServiceMode) fd.set('esServicio', 'true');
        fd.set('esConsumible', String(esConsumible));
        if (lote) fd.set('lote', lote);
        if (fechaVencimiento) fd.set('fechaVencimiento', fechaVencimiento);
        if (fechaFabricacion) fd.set('fechaFabricacion', fechaFabricacion);
        if (fechaAdq) fd.set('fechaAdq', fechaAdq);
        if (costoAdq) fd.set('costoAdq', costoAdq);
        if (origenActivo) fd.set('origenActivo', origenActivo);
        if (condicionActivo) fd.set('condicionActivo', condicionActivo);
        fd.set('estatusContable', estatusContable);

        // Show preview and fetch real next code in parallel
        fd.set('shouldPrint', printRef.current ? 'true' : 'false');
        setPendingFormData(fd);
        console.log('[CLIENT] handleSubmit calling previewIdQr with area:', selectedArea, 'group:', finalCodigoGrupo);
        previewIdQr(selectedArea, finalCodigoGrupo).then(code => {
            console.log('[CLIENT] handleSubmit previewIdQr resolved:', code);
            setPreviewCode(code);
        }).catch((e) => {
            console.error('[CLIENT] handleSubmit previewIdQr error:', e);
            setPreviewCode('—');
        });
    }

    const [isSubmitting, setIsSubmitting] = useState(false);

    function confirmSave(printLabel = true) {
        if (!pendingFormData || isSubmitting) return;
        setIsSubmitting(true);
        const fd = pendingFormData;
        fd.set('shouldPrint', printLabel ? 'true' : 'false');
        startTransition(async () => {
            try {
                if (isEdit) {
                    const result = await updateActivo(editActivo!.id, fd);
                    if (result?.error) {
                        alert(result.error);
                        setIsSubmitting(false);
                        return;
                    }
                    setPendingFormData(null);
                    onSuccess();
                    onClose();
                    setIsSubmitting(false);
                } else {
                    const result = await createActivo(fd);
                    if (result?.error) {
                        alert(result.error);
                        setIsSubmitting(false);
                        return;
                    }
                    setPendingFormData(null);
                    onSuccess();
                    onClose();
                    setIsSubmitting(false);

                    // Auto-print label for the newly created activo
                    if (result?.id && result?.idQr && fd.get('shouldPrint') === 'true') {
                        try {
                            const params = new URLSearchParams({
                                idQr: result.idQr,
                                descripcion: fd.get('descripcionCorta') as string || '',
                                area: fd.get('area') as string || '',
                                cuenta: fd.get('cuentaAct') as string || '',
                                marca: fd.get('marca') as string || '',
                                modelo: fd.get('modelo') as string || '',
                                codigoBarras: codigoBarras || '',
                                serie: fd.get('serie') as string || '',
                                size: '50x25',
                            });
                            const urlImagen = `${window.location.origin}/api/impresion/generar-etiqueta?${params.toString()}`;
                            
                            // Si el stock es N, encolamos N etiquetas iguales
                            const defaultPrinter = localStorage.getItem('default_printer') || 'Niimbot';
                            const qtyToPrint = Number(cantidad) || 1;
                            const enqueuePromises = [];
                            for (let i = 0; i < qtyToPrint; i++) {
                                enqueuePromises.push(
                                    fetch('/api/impresion/encolar', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ 
                                            activoId: result.id, 
                                            urlImagen,
                                            impresora: defaultPrinter,
                                            tamano: '50x25'
                                        }),
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
            {catModalOpen && (
                <CategoriaQuickModal 
                    open={catModalOpen} 
                    onClose={() => setCatModalOpen(false)} 
                    categorias={categorias}
                    onSuccess={(id, name, isEdit) => {
                        if (isEdit) {
                            setCategorias(prev => prev.map(c => c.value === id ? { ...c, label: name } : c));
                        } else {
                            setCategorias(prev => [...prev, { value: id, label: name }]);
                        }
                        setCategoriaId(id);
                    }} 
                />
            )}
            {cropOpen && (
                <CropModal
                    imageSrc={cropImgSrc}
                    onConfirm={doUpload}
                    onCancel={() => { setCropOpen(false); URL.revokeObjectURL(cropImgSrc); setCropImgSrc(''); }}
                />
            )}
            <div className="fixed inset-0 z-[100] bg-black/60 md:backdrop-blur-sm overflow-y-auto">
                <div className="min-h-full flex items-start justify-center p-0 sm:p-4 md:p-6">
                    <div className="bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-2xl sm:my-4 transform translate-z-0" style={{ transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }}>

                        {/* ── Sticky Header ── */}
                        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                {tipoRegistro !== 'seleccion' && !isEdit && (
                                    <button type="button" onClick={() => setTipoRegistro('seleccion')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800" title="Volver a la selección">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    </button>
                                )}
                                <div className="bg-[#0500A3]/10 p-2.5 rounded-xl">
                                    <QrCode className="w-5 h-5 text-[#0500A3]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {isEdit ? 'Editar Producto' : 'Registrar Producto'}
                                    </h2>
                                    {(previewQr || isEdit) ? (
                                        <p className="text-xs font-mono text-[#0500A3] font-bold mt-0.5">
                                            ID QR: {isEdit ? editActivo?.idQr : previewQr}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {tipoRegistro === 'seleccion' ? 'Por favor elige un tipo de registro' : 
                                             tipoRegistro === 'nuevo' ? 'Completar información de nueva alta' :
                                             'Añadir existencias a un producto previo'}
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
                                                <p className="text-[10px] font-bold text-[#0500A3]/60 uppercase tracking-wider">
                                                    {isEdit ? 'Código QR' : 'Código QR que se asignará'}
                                                </p>
                                                <p className="text-xs font-black text-[#0500A3] font-mono tracking-tight">
                                                    {isEdit ? editActivo?.idQr : (isServiceMode ? codigoBarras : previewCode)}
                                                </p>
                                            </div>
                                        </div>
                                        <PreviewField label="Área" value={AREAS.find(a => a.value === selectedArea)?.label || selectedArea || '—'} />
                                        <PreviewField label="Stock Inicial" value={cantidad} highlight />
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-3">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            type="button"
                                            onClick={() => confirmSave(true)}
                                            disabled={isPending || isSubmitting}
                                            className="flex-1 flex items-center justify-center gap-2 text-sm font-bold bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md"
                                        >
                                            {(isPending || isSubmitting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {(isPending || isSubmitting) ? 'Guardando...' : 'Guardar e Imprimir'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => confirmSave(false)}
                                            disabled={isPending || isSubmitting}
                                            className="flex-1 flex items-center justify-center gap-2 text-sm font-bold bg-[#0500A3] text-white py-3 px-4 rounded-xl hover:bg-[#0500A3]/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md"
                                        >
                                            {(isPending || isSubmitting) ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾 '}
                                            {(isPending || isSubmitting) ? 'Guardando...' : 'Solo Guardar'}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPendingFormData(null)}
                                        disabled={isPending || isSubmitting}
                                        className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 border-2 border-slate-200 py-3.5 px-5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-60"
                                    >
                                        ✏️ Volver a editar
                                    </button>
                                </div>
                            </div>
                        ) : tipoRegistro === 'seleccion' && !isEdit ? (
                            <div className="p-6 md:p-8 space-y-4">
                                <button type="button" onClick={() => setTipoRegistro('nuevo')}
                                    className="w-full text-left p-6 border-2 border-slate-100 rounded-2xl hover:border-[#0500A3] hover:bg-[#0500A3]/5 transition-all group flex items-start gap-5">
                                    <div className="w-14 h-14 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                        <Plus className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-[#0500A3]">Nuevo Producto</h3>
                                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                                            Registrar un código o producto que no existe actualmente en la base de datos.
                                        </p>
                                    </div>
                                </button>

                                <button type="button" onClick={() => setTipoRegistro('import_web')}
                                    className="w-full text-left p-6 border-2 border-slate-100 rounded-2xl hover:border-[#0500A3] hover:bg-[#0500A3]/5 transition-all group flex items-start gap-5">
                                    <div className="w-14 h-14 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                        <Globe className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-[#0500A3]">Importar desde Catálogo Web</h3>
                                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                                            Buscar y cargar una referencia importada (Soma, Pukang, Joson, etc.) para registrarla en nuestro inventario físico con un SKU propio.
                                        </p>
                                    </div>
                                </button>

                                <button type="button" onClick={() => { if (onSelectRestock) onSelectRestock(); }}
                                    className="w-full text-left p-6 border-2 border-slate-100 rounded-2xl hover:border-[#0500A3] hover:bg-[#0500A3]/5 transition-all group flex items-start gap-5">
                                    <div className="w-14 h-14 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                        <Package className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-[#0500A3]">Reingreso / Restock</h3>
                                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                                            Seleccionar un producto existente para agregarle más existencias en una nueva ubicación de área.
                                        </p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <form ref={formRef} onSubmit={handleSubmit} className="px-5 py-6 space-y-6">

                                {/* ── PROPIETARIO DEL EQUIPO (CLIENTE - SOLO SI ES EDIT) ── */}
                                {esEquipoCliente && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                                        <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider">Cliente Propietario *</label>
                                        <div className="flex gap-2 items-center">
                                            <div className="flex-1 min-w-0">
                                                <select
                                                    required
                                                    value={selectedClienteId}
                                                    onChange={(e) => setSelectedClienteId(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600"
                                                >
                                                    <option value="">-- Seleccionar Cliente --</option>
                                                    {clientesList.map(c => (
                                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsClienteModalOpen(true)}
                                                className="bg-indigo-600 text-white hover:bg-indigo-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer"
                                                title="Registrar Nuevo Cliente"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>Nuevo</span>
                                            </button>
                                        </div>

                                        <div className="mt-3 border-t border-blue-200 pt-3">
                                            <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Cobertura del Equipo *</label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 flex-1 hover:bg-slate-50 transition-colors">
                                                    <input 
                                                        type="radio" 
                                                        name="cobertura" 
                                                        value="externa" 
                                                        checked={cobertura === 'externa'} 
                                                        onChange={() => setCobertura('externa')} 
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>🌍 Externo (En su ubicación)</span>
                                                </label>
                                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 flex-1 hover:bg-slate-50 transition-colors">
                                                    <input 
                                                        type="radio" 
                                                        name="cobertura" 
                                                        value="interna" 
                                                        checked={cobertura === 'interna'} 
                                                        onChange={() => setCobertura('interna')} 
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>🏢 Interno (Traído a tienda/taller)</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── BUSCADOR CATÁLOGO WEB (SOMA/PUKANG/ETC.) ── */}
                                {!isEdit && tipoRegistro === 'import_web' && !isServiceMode && (
                                    <>
                                        <BuscadorCatWeb onSelect={handleWebProductSelect} />
                                        <WebProductAlertPanel product={webProductReference} />
                                    </>
                                )}

                                {/* ── SECCIÓN 1: FOTOGRAFÍA ── */}
                                {!isServiceMode && (
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
                                                    <img src={imagenUrl} alt="Activo" onClick={() => setLightboxImage(imagenUrl)} className="w-32 h-32 object-cover rounded-2xl border-2 border-slate-200 shadow-md cursor-pointer hover:opacity-90 transition-opacity" />
                                                    {!isLoading && (
                                                        <button type="button" onClick={() => { 
                                                            if (window.confirm('¿Está seguro de eliminar esta foto principal del equipo?')) {
                                                                setImagenUrl(''); 
                                                                setAiResult(null); 
                                                            }
                                                        }}
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
                                            {!isEdit && !disableAiVision && !!imagenUrl && !aiResult && (
                                                <button type="button" onClick={() => analyzeWithAI()}
                                                    disabled={uploadPhase === 'analyzing'}
                                                    className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 py-3 px-5 rounded-xl active:scale-95 transition-all w-full">
                                                    <Sparkles className="w-4 h-4" />
                                                    {uploadPhase === 'analyzing' ? 'Analizando...' : '✨ Analizar foto con IA'}
                                                </button>
                                            )}
                                            {!isEdit && !disableAiVision && uploadPhase === 'idle' && (
                                                <p className="text-xs text-purple-600 text-center flex items-center justify-center gap-1 mt-2">
                                                    <Sparkles className="w-3 h-3" /> Sube la foto primero, luego usa la IA
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                )}

                                {/* ── SECCIÓN 2: IDENTIFICACIÓN ── */}
                                <div className="col-span-12 xl:col-span-8">
                                    <div className="bg-white rounded-2xl border-2 border-[#0500A3]/10 p-5 lg:p-6 shadow-sm">
                                        <SectionTitle>📋 Identificación</SectionTitle>

                                        
                                        {!isEdit && (tipoRegistro === 'nuevo' || tipoRegistro === 'servicio') && !isServiceMode && previewCode && previewCode !== '...' && (
                                            <div className="mb-6 bg-indigo-50/50 border-2 border-indigo-200 border-dashed p-4 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl"></div>
                                                <p className="text-[10px] text-indigo-500 font-bold tracking-widest uppercase mb-1 z-10">Generación Automática de Placa ARSA</p>
                                                <div className="font-mono text-xl sm:text-2xl tracking-widest text-[#0500A3] font-black z-10 bg-white/50 px-4 py-1 rounded">
                                                    {previewCode}
                                                </div>
                                            </div>
                                        )}

                                        {isServiceMode && (
                                            <div className="mb-6 bg-purple-50/50 border-2 border-purple-200 border-dashed p-4 rounded-xl space-y-4">
                                                <div>
                                                    <FieldLabel required>Código de Servicio Personalizado</FieldLabel>
                                                    <input
                                                        type="text"
                                                        value={codigoBarras}
                                                        onChange={e => setCodigoBarras(e.target.value.toUpperCase())}
                                                        disabled={isEdit}
                                                        placeholder="Ej: TEC001, MANT-02"
                                                        className="w-full mt-1 border border-purple-300 rounded-xl px-4 py-3 bg-white text-purple-900 font-mono font-bold uppercase focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
                                                        required
                                                    />
                                                    <p className="text-xs text-purple-600 mt-1">Este código será usado como ID para buscarlo y facturarlo.</p>
                                                </div>
                                                <div>
                                                    <FieldLabel>Icono para Facturación</FieldLabel>
                                                    <div className="grid grid-cols-6 gap-2 mt-2 bg-white/60 p-2 rounded-xl">
                                                        {[
                                                            { id: '/services/instalacion.svg', label: 'Instalación' },
                                                            { id: '/services/reparacion.jpg', label: 'Reparación' },
                                                            { id: '/services/soporte.svg', label: 'Diagnóstico' },
                                                            { id: '/services/mantenimiento.svg', label: 'Mant. Prev.' },
                                                            { id: '/services/garantia.svg', label: 'Mant. Corr.' },
                                                            { id: '/services/mano_obra.svg', label: 'Mano Obra' }
                                                        ].map(icon => (
                                                            <button
                                                                type="button"
                                                                key={icon.id}
                                                                onClick={() => setImagenUrl(icon.id)}
                                                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border-2 transition-all ${
                                                                    (imagenUrl === icon.id || (!imagenUrl && icon.id === '/services/reparacion.jpg')) 
                                                                        ? 'border-purple-500 bg-purple-100 shadow-sm scale-105' 
                                                                        : 'border-transparent hover:bg-purple-50 hover:border-purple-200'
                                                                }`}
                                                            >
                                                                <img src={icon.id} alt={icon.label} className="w-7 h-7 object-contain mb-1 opacity-90" />
                                                                <span className="text-[9px] text-purple-900 font-bold text-center leading-tight uppercase">{icon.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Explicación en letra pequeña sobre para qué sirve cada código de servicio */}
                                                    <div className="mt-2 text-[10px] text-slate-500 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100/50 italic leading-snug">
                                                        {(!imagenUrl || imagenUrl === '/services/reparacion.jpg') && "* REP: Código de Reparaciones. Para servicios que resuelven fallas mecánicas, eléctricas o electrónicas."}
                                                        {imagenUrl === '/services/instalacion.svg' && "* INS: Código de Instalación. Para el montaje, configuración inicial y puesta en marcha de nuevos equipos."}
                                                        {imagenUrl === '/services/soporte.svg' && "* DIAG: Código de Diagnóstico. Para revisiones de estado, inspecciones y diagnósticos técnicos de fallas."}
                                                        {imagenUrl === '/services/mantenimiento.svg' && "* MPV: Código de Mantenimiento Preventivo. Para rutinas de prevención y emisión de certificados de calibración."}
                                                        {imagenUrl === '/services/garantia.svg' && "* MCO: Código de Mantenimiento Correctivo. Para mantenimientos correctivos programados con certificación técnica posterior."}
                                                        {imagenUrl === '/services/mano_obra.svg' && "* MO: Código de Mano de Obra. Para cobro de horas de técnico laboradas y soporte in-situ."}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Código Grupo */}
                                            {(isEdit || tipoRegistro === 'reingreso') && (
                                              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <FieldLabel required={!isEdit && tipoRegistro === 'reingreso'}>
                                                        Producto / Código Grupo {!isEdit && tipoRegistro === 'nuevo' && <span className="font-normal text-slate-400 text-[10px] ml-1 uppercase opacity-70">(Opcional)</span>}
                                                    </FieldLabel>
                                                    {!isEdit && tipoRegistro === 'nuevo' && (
                                                        <button 
                                                            type="button" 
                                                            onClick={handleUnlockGrupo}
                                                            className="text-[10px] font-bold text-[#0500A3] bg-[#0500A3]/10 px-2 py-1 rounded hover:bg-[#0500A3]/20 transition-colors flex items-center gap-1"
                                                        >
                                                            {isGrupoLocked ? <><Unlock className="w-3 h-3" /> Desbloquear</> : <><Lock className="w-3 h-3" /> Bloquear</>}
                                                        </button>
                                                    )}
                                                </div>
                                                {isEdit ? (
                                                    <input
                                                        type="text"
                                                        disabled
                                                        value={codigoGrupo}
                                                        className={`${inputCls} font-mono bg-blue-50/10 font-bold tracking-widest text-[#0500A3] opacity-60 cursor-not-allowed border-transparent`}
                                                    />
                                                ) : tipoRegistro === 'nuevo' ? (
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            readOnly={isGrupoLocked}
                                                            value={codigoGrupo}
                                                            onChange={e => {
                                                                setCodigoGrupo(e.target.value.toUpperCase());
                                                                setGrupoError('');
                                                            }}
                                                            onBlur={validateGrupoManual}
                                                            className={`${inputCls} font-mono font-bold tracking-widest ${isGrupoLocked ? '!bg-purple-100 !text-purple-800 !border-purple-300 cursor-not-allowed focus:ring-0 focus:!border-purple-300 outline-none select-none shadow-inner opacity-90' : 'text-slate-900 focus:ring-[#0500A3] border-slate-300'} ${grupoError ? '!border-red-500 !ring-red-500 focus:ring-red-500' : ''}`}
                                                            placeholder="Ej: 080"
                                                        />
                                                        {isCheckingGrupo && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Combobox
                                                        options={gruposDisponibles.map(g => ({ value: g.codigoGrupo, label: `${g.codigoGrupo} - ${g.descripcionCorta} (${g.cantidad})` }))}
                                                        value={codigoGrupo}
                                                        onChange={(val) => {
                                                            setCodigoGrupo(val);
                                                            const match = gruposDisponibles.find(g => g.codigoGrupo === val);
                                                            if (match && match.descripcionCorta && !descripcionCorta) setDescripcionCorta(match.descripcionCorta);
                                                        }}
                                                        placeholder="Buscar por código o descripción..."
                                                        allowCustom={false}
                                                    />
                                                )}
                                                {grupoError && <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {grupoError}</p>}
                                                {!isEdit && tipoRegistro === 'nuevo' && !grupoError && <p className="text-[10px] text-[#0500A3]/60 mt-1.5 leading-tight">{isGrupoLocked ? 'Este será el código base de este producto y el de sus subsecuentes reingresos.' : 'Agrupa estos activos inventando un código si pertenece a una familia.'}</p>}
                                                {!isEdit && tipoRegistro === 'reingreso' && !grupoError && <p className="text-[10px] text-[#0500A3]/60 mt-1.5 leading-tight">Selecciona un producto obligatoriamente preexistente.</p>}
                                              </div>
                                            )}

                                            {/* Código de Barras / SKU Comercial */}
                                            {!isServiceMode && (
                                            <div>
                                                <div className="relative" ref={barcodeRef}>
                                                    <div className="flex items-center justify-between">
                                                        <FieldLabel>Código de Barras / UDI GS1</FieldLabel>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setIsScannerOpen(true)}
                                                                className="text-[#0500A3] bg-[#0500A3]/10 px-2 py-0.5 rounded-md flex items-center gap-1 text-xs font-semibold hover:bg-[#0500A3] hover:text-white transition-colors border border-[#0500A3]/20 mb-2"
                                                            >
                                                                <Camera className="w-3.5 h-3.5" /> Escanear
                                                            </button>
                                                            {!isEdit && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={handleAutogenerarSku}
                                                                    className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md flex items-center gap-1 text-xs font-semibold hover:bg-purple-600 hover:text-white transition-colors border border-purple-300 mb-2"
                                                                >
                                                                    ⚡ Autogenerar SKU
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                <input 
                                                    type="text" 
                                                    value={codigoBarras} 
                                                    onChange={e => setCodigoBarras(e.target.value)} 
                                                    placeholder="Escanea o escribe el código..." 
                                                    className={`${inputCls} font-mono font-bold tracking-widest text-[#0500A3] border-indigo-200 focus:ring-[#0500A3]`} 
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1.5">Escanea la caja o placa si tiene UDI / GTIN. Si es detectado, se autocompletará el equipo.</p>
                                            </div>
                                            </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* Área — Searchable / Locked */}
                                            {!isServiceMode && (
                                                <div>
                                                    <FieldLabel required>Área / Ubicación</FieldLabel>
                                                    <AreaSplitInput
                                                        id="area"
                                                        value={selectedArea}
                                                        onChange={val => setSelectedArea(val)}
                                                        required
                                                        dbAreas={dbAreas}
                                                    />
                                                    <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">Usa tu teclado numérico o Alfanumérico, avanza con Espacio.</p>
                                                </div>
                                            )}

                                            {/* Cantidad Input */}
                                            {!isServiceMode && (
                                                <div>
                                                    <FieldLabel required>Cantidad</FieldLabel>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={cantidad}
                                                        onChange={e => setCantidad(e.target.value)}
                                                        className={`${inputCls} font-mono font-bold text-center border-slate-200 focus:ring-blue-500`}
                                                    />
                                                    <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">Stock Inicial</p>
                                                </div>
                                            )}

                                            {/* Es Consumible Toggle */}
                                            <div className={isServiceMode ? "col-span-3 sm:col-span-1" : ""}>
                                                <FieldLabel>Tipo de Producto</FieldLabel>
                                                <button
                                                    type="button"
                                                    disabled={isExistingGroup}
                                                    onClick={() => setEsConsumible(!esConsumible)}
                                                    className={`w-full h-[42px] px-3 flex items-center justify-between rounded-xl border ${esConsumible ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-[#1b4332] border-[#081c15] text-white'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    <span className="text-xs">{esConsumible ? '🌸 Flor / Perecedero' : '📦 Insumos / Suministros'}</span>
                                                    <div className={`w-10 h-6 bg-black/20 rounded-full p-1 transition-all flex border border-black/10 ${esConsumible ? 'justify-end' : 'justify-start'}`}>
                                                        <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                                    </div>
                                                </button>
                                                <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">{esConsumible ? 'Flores de corte, rosas, follajes (Control de lote y vencimiento)' : 'Bases, espuma floral, empaques, cintas (Stock general)'}</p>
                                            </div>
                                        </div>

                                        {/* Categoría y Nombre Floral */}
                                        <div className="mb-4 flex gap-2 items-end">
                                            <div className="flex-1 min-w-0">
                                                <FieldLabel required>Categoría Floral / Insumos</FieldLabel>
                                                <Combobox
                                                    options={categorias}
                                                    value={categoriaId}
                                                    onChange={setCategoriaId}
                                                    placeholder="Ej: Rosas Importadas, Follajes, Bases..."
                                                    allowClear
                                                    disabled={isExistingGroup}
                                                />
                                            </div>
                                            <button type="button" onClick={() => setCatModalOpen(true)} disabled={isExistingGroup} className="bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] px-4 py-3.5 rounded-xl border border-emerald-200 transition-colors shrink-0 font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" title="Añadir Categoría Rápida">
                                                <Plus className="w-5 h-5"/>
                                            </button>
                                        </div>

                                        <div>
                                            <FieldLabel required>Nombre del Producto / Variedad <span className="opacity-50">(Ej: Rosa Freedom 70cm, Espuma Oasis)</span></FieldLabel>
                                            <input type="text" name="descripcionCorta" required
                                                disabled={isExistingGroup}
                                                value={descripcionCorta || ''}
                                                onChange={e => setDescripcionCorta(e.target.value)}
                                                placeholder="Ej: Rosa Freedom 70cm Ecuador, Lirio Oriental Blanco..."
                                                className={`${aiResult?.descripcionCorta ? inputAiCls : inputCls} ${isExistingGroup ? 'bg-slate-50 opacity-60 cursor-not-allowed border-transparent' : ''}`} />
                                        </div>

                                        {/* Variedad + Especificación Floral */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel>
                                                    Código de Barras / SKU / EAN
                                                    {placaUploadPhase === 'analyzing' && <Loader2 className="w-3 h-3 text-purple-500 animate-spin ml-2 inline" />}
                                                </FieldLabel>
                                                <div className="flex gap-2">
                                                    <input type="text" name="serie" value={serie || ''} onChange={e => setSerie(e.target.value)}
                                                        placeholder="EAN-13 o SKU interno" className={placaUploadPhase === 'done' && imagenPlacaUrl ? inputAiCls : inputCls} />

                                                    <input ref={placaCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePlacaUpload} />

                                                    {imagenPlacaUrl ? (
                                                        <div className="shrink-0 relative">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={imagenPlacaUrl} alt="Etiqueta" onClick={() => setLightboxImage(imagenPlacaUrl)} className="w-[42px] h-[42px] object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity" />
                                                            {(!isExistingGroup && (placaUploadPhase === 'idle' || placaUploadPhase === 'done')) ? (
                                                                <button type="button" onClick={() => {
                                                                    if (window.confirm('¿Eliminar la foto del empaque/etiqueta?')) {
                                                                        setImagenPlacaUrl('');
                                                                    }
                                                                }}
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
                                                        <button type="button" onClick={() => placaCameraRef.current?.click()} disabled={isExistingGroup || placaUploadPhase === 'uploading' || placaUploadPhase === 'analyzing'}
                                                            className="shrink-0 w-[42px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors disabled:opacity-50" title="Escanear barra/etiqueta con cámara">
                                                            {placaUploadPhase === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Camera className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <FieldLabel>
                                                    Variedad Floral / Marca
                                                    {aiResult?.marca && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                                </FieldLabel>
                                                <input type="text" name="marca"
                                                    value={marca || ''}
                                                    disabled={isExistingGroup}
                                                    onChange={e => setMarca(e.target.value)}
                                                    placeholder="Ej: Freedom, Mondial, Explorer, Oasis..."
                                                    className={`${aiResult?.marca ? inputAiCls : inputCls} ${isExistingGroup ? 'bg-slate-50 opacity-60 cursor-not-allowed border-transparent' : ''}`} />
                                            </div>
                                            <div>
                                                <FieldLabel>
                                                    Sub-variedad / Color / Tipo
                                                    {aiResult?.modelo && <span className="ml-2 text-[10px] font-normal text-purple-500 inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> IA</span>}
                                                </FieldLabel>
                                                <input type="text" name="modelo"
                                                    value={modelo || ''}
                                                    disabled={isExistingGroup}
                                                    onChange={e => setModelo(e.target.value)}
                                                    placeholder="Ej: Rojo Intenso, Blanco Nieve, XL..."
                                                    className={`${aiResult?.modelo ? inputAiCls : inputCls} ${isExistingGroup ? 'bg-slate-50 opacity-60 cursor-not-allowed border-transparent' : ''}`} />
                                            </div>
                                            <div>
                                                <FieldLabel>Referencia Comercial / Código Finca</FieldLabel>
                                                <input type="text" name="referencia"
                                                    value={referencia || ''}
                                                    disabled={isExistingGroup}
                                                    onChange={e => setReferencia(e.target.value)}
                                                    placeholder="Ej: FINCA-EC-089..."
                                                    className={`${inputCls} ${isExistingGroup ? 'bg-slate-50 opacity-60 cursor-not-allowed border-transparent' : ''}`} />
                                            </div>
                                            <div>
                                                <FieldLabel>Longitud del Tallo</FieldLabel>
                                                <input type="text" name="garantia"
                                                    value={garantia || ''}
                                                    onChange={e => setGarantia(e.target.value)}
                                                    placeholder="Ej: 50cm, 60cm, 70cm, 80cm, N/A"
                                                    className={inputCls} />
                                            </div>
                                            <div>
                                                <FieldLabel>Tallos por Bonche / Paquete</FieldLabel>
                                                <input type="number" name="mantenimientosIncluidos"
                                                    value={mantenimientosIncluidos || ''}
                                                    onChange={e => setMantenimientosIncluidos(e.target.value)}
                                                    placeholder="Ej: 25 tallos, 10 tallos..."
                                                    className={inputCls} />
                                            </div>
                                            <div>
                                                <FieldLabel>Temp. Almacenamiento (°C)</FieldLabel>
                                                <input type="number" name="frecuenciaMantenimientoMeses"
                                                    value={frecuenciaMantenimientoMeses || ''}
                                                    onChange={e => setFrecuenciaMantenimientoMeses(e.target.value)}
                                                    placeholder="Ej: 2°C a 4°C (Cámara Fría)"
                                                    className={inputCls} />
                                            </div>
                                        </div>

                                        {/* Tags de Ocasiones o Estilos Florales */}
                                        <div className={`bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 mt-2 mb-2 ${isExistingGroup ? 'opacity-60 pointer-events-none' : ''}`}>
                                            <FieldLabel>Etiquetas de Ocasión / Uso Recomendado</FieldLabel>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {compatibilidad.map(tag => (
                                                    <span key={tag} className="inline-flex items-center gap-1.5 bg-emerald-100 text-[#1b4332] px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-300">
                                                        {tag}
                                                        <button type="button" onClick={() => setCompatibilidad(compatibilidad.filter(t => t !== tag))} className="hover:text-red-500 hover:bg-white rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                                                    </span>
                                                ))}
                                                {compatibilidad.length === 0 && <span className="text-xs text-slate-400 italic py-1.5">Ej: BODAS, ANIVERSARIOS, EVENTOS, REGALOS...</span>}
                                            </div>
                                            <div className="flex gap-2">
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
                                                    placeholder="Ej: BODAS (Presionar Enter)" 
                                                    className={inputCls} 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const v = tagInput.trim().toUpperCase();
                                                        if (v && !compatibilidad.includes(v)) {
                                                            setCompatibilidad([...compatibilidad, v]);
                                                            setTagInput('');
                                                        }
                                                    }}
                                                    className="shrink-0 px-4 py-2 bg-[#1b4332] text-white font-bold rounded-xl shadow-sm hover:bg-[#2d6a4f] active:scale-95 transition-all text-sm flex items-center justify-center"
                                                >
                                                    Añadir
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Lote y Control de Frescura Perecedera */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                                            <div>
                                                <FieldLabel>Lote de Embarque / Finca</FieldLabel>
                                                <input type="text" value={lote || ''} onChange={e => setLote(e.target.value)} placeholder="Ej: LOTE-EC-2026-08A" className={inputCls} disabled={isExistingGroup} />
                                            </div>
                                            <div>
                                                <FieldLabel>Fecha de Corte / Recepción</FieldLabel>
                                                <DateInput value={fechaFabricacion} onChange={val => setFechaFabricacion(val)} className={inputCls} />
                                            </div>
                                            <div>
                                                <FieldLabel>Fecha Vencimiento (Frescura)</FieldLabel>
                                                <DateInput value={fechaVencimiento} onChange={val => setFechaVencimiento(val)} className={inputCls} />
                                            </div>
                                        </div>

                                        {/* Origen y Datos de Adquisición */}
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                                            <div className="md:col-span-2">
                                                <div className="flex justify-between items-center">
                                                    <FieldLabel>Finca / País de Origen</FieldLabel>
                                                    <button
                                                        type="button"
                                                        onClick={onManageOrigins}
                                                        className="text-[10px] text-[#1b4332] hover:text-[#2d6a4f] flex items-center gap-1 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors mb-1.5"
                                                        title="Administrar orígenes"
                                                    >
                                                        <Wrench className="w-3 h-3" /> Configurar
                                                    </button>
                                                </div>
                                                <select
                                                    value={origenActivo}
                                                    onChange={e => setOrigenActivo(e.target.value)}
                                                    className={selectCls}
                                                >
                                                    <option value="">Nacional (Honduras)</option>
                                                    <option value="Ecuador">Ecuador (Importado)</option>
                                                    <option value="Colombia">Colombia (Importado)</option>
                                                    <option value="Guatemala">Guatemala (Importado)</option>
                                                    <option value="Holanda">Holanda (Importado)</option>
                                                    {originsList.map(o => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <div className="flex justify-between items-center">
                                                    <FieldLabel>Grado de Calidad Floral</FieldLabel>
                                                    <button
                                                        type="button"
                                                        onClick={onManageConditions}
                                                        className="text-[10px] text-[#1b4332] hover:text-[#2d6a4f] flex items-center gap-1 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors mb-1.5"
                                                        title="Administrar condiciones"
                                                    >
                                                        <Wrench className="w-3 h-3" /> Configurar
                                                    </button>
                                                </div>
                                                <select
                                                    value={condicionActivo}
                                                    onChange={e => setCondicionActivo(e.target.value)}
                                                    className={selectCls}
                                                >
                                                    <option value="">Seleccionar Calidad</option>
                                                    <option value="Exportación Selecta">Exportación Selecta</option>
                                                    <option value="Grado A (Premium)">Grado A (Premium)</option>
                                                    <option value="Grado B">Grado B</option>
                                                    <option value="Estándar">Estándar</option>
                                                    {conditionsList.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <FieldLabel>Estatus en Bodega / Frío</FieldLabel>
                                                <select
                                                    value={estatusContable}
                                                    onChange={e => setEstatusContable(e.target.value)}
                                                    className={selectCls}
                                                >
                                                    <option value="VIGENTE">Disponible en Cámara Fría</option>
                                                    <option value="EN TRANSITO">En Tránsito / Importación</option>
                                                    <option value="DEPRECIADO">Merma / Descarte</option>
                                                    <option value="PROCESO DE BAJA">Muestra / Promoción</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-3">
                                                <FieldLabel>Costo de Compra por Bonche/Unidad (Lps)</FieldLabel>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={costoAdq}
                                                    onChange={e => setCostoAdq(e.target.value)}
                                                    placeholder="Lps. 0.00"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <FieldLabel>Fecha de Ingreso a Bodega</FieldLabel>
                                                <DateInput
                                                    value={fechaAdq}
                                                    onChange={val => setFechaAdq(val)}
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>

                                        {/* Descripción Detallada — AI controlled */}
                                        <div>
                                            <FieldLabel>
                                                Descripción Detallada
                                            </FieldLabel>
                                            <textarea name="descripcionDetallada" rows={3}
                                                value={descripcionDetallada || ''}
                                                disabled={isExistingGroup}
                                                onChange={e => setDescripcionDetallada(e.target.value)}
                                                placeholder="Marca, modelo, color, características adicionales..."
                                                className={`${aiResult?.descripcionDetallada ? inputAiCls : inputCls} resize-none ${isExistingGroup ? 'bg-slate-50 opacity-60 cursor-not-allowed border-transparent' : ''}`} />
                                        </div>
                                        
                                        {/* Inline Excel-like table for existing assets in group */}
                                        {isExistingGroup && activosGrupo.length > 0 && (
                                            <div className="mt-8 border border-[#0500A3]/30 bg-[#0500A3]/[0.02] rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-[#0500A3]/5 px-4 py-3 border-b border-[#0500A3]/10">
                                                    <h4 className="text-sm font-bold text-[#0500A3] flex items-center gap-2">
                                                        <Package className="w-5 h-5 text-[#0500A3]" />
                                                        Registro de Ubicaciones Existentes ({activosGrupo.reduce((acc, a) => acc + (a.stock||0), 0)} unidades)
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-1">Guarda cambios individualmente al modificar el área o stock.</p>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs min-w-[500px]">
                                                        <thead className="bg-white border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-bold w-24">ID QR</th>
                                                                <th className="px-4 py-3 text-left font-bold">Ubicación / Área</th>
                                                                <th className="px-4 py-3 text-center font-bold w-24">Stock Actual</th>
                                                                <th className="px-4 py-3 text-center font-bold w-16">Acción</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 bg-white">
                                                            {activosGrupo.map(ag => (
                                                                <tr key={ag.id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-4 py-3 font-mono text-slate-500 font-medium">{ag.idQr}</td>
                                                                    <td className="px-4 py-2">
                                                                        <input 
                                                                            type="text" 
                                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0500A3]/30 outline-none uppercase font-mono font-bold text-[#0500A3] text-xs transition-colors"
                                                                            defaultValue={ag.area}
                                                                            onChange={(e) => { ag._draftArea = e.target.value.toUpperCase(); }}
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        <input 
                                                                            type="number" min="0"
                                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0500A3]/30 outline-none font-bold text-center text-xs transition-colors"
                                                                            defaultValue={ag.stock}
                                                                            onChange={(e) => { ag._draftStock = e.target.value; }}
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <button type="button" 
                                                                            onClick={async (e) => {
                                                                                e.preventDefault();
                                                                                const btn = e.currentTarget;
                                                                                btn.disabled = true;
                                                                                btn.innerHTML = '...';
                                                                                const area = ag._draftArea ?? ag.area;
                                                                                const stock = ag._draftStock ?? String(ag.stock);
                                                                                const res = await updateActivoQuick(ag.id, area, stock);
                                                                                if (res.error) {
                                                                                    alert(res.error);
                                                                                    btn.innerHTML = '💾';
                                                                                } else { 
                                                                                    btn.innerHTML = '✅'; 
                                                                                    setTimeout(() => btn.innerHTML = '💾', 2000); 
                                                                                }
                                                                                btn.disabled = false;
                                                                            }}
                                                                            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50" title="Guardar cambios de esta ubicación">
                                                                            💾
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                                {/* ── FOOTER ── */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                                    <input type="hidden" name="esParaRenta" value={isRentaMode ? "true" : "false"} />
                                    <button type="button" onClick={onClose} className="flex-1 py-3.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors active:scale-95">
                                        Cancelar
                                    </button>
                                    {isEdit ? (
                                        <button type="submit" disabled={isPending || isLoading}
                                            className="flex-1 flex items-center justify-center gap-2 text-base font-bold bg-[#0500A3] text-white py-4 rounded-2xl hover:bg-[#0600c2] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg">
                                            {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                                            💾 Guardar Cambios
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                type="submit" 
                                                onClick={() => { printRef.current = false; }}
                                                disabled={isPending || isLoading}
                                                className="flex-1 flex items-center justify-center gap-2 text-base font-bold bg-white text-[#0500A3] border-2 border-[#0500A3] py-3.5 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm">
                                                {isPending && !printRef.current && <Loader2 className="w-5 h-5 animate-spin" />}
                                                Solo Registrar
                                            </button>
                                            <button 
                                                type="submit" 
                                                onClick={() => { printRef.current = true; }}
                                                disabled={isPending || isLoading}
                                                className="flex-1 flex items-center justify-center gap-2 text-base font-bold bg-[#0500A3] text-white py-4 rounded-2xl hover:bg-[#0600c2] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg">
                                                {isPending && printRef.current && <Loader2 className="w-5 h-5 animate-spin" />}
                                                Registrar e Imprimir
                                            </button>
                                        </>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div >
            </div >
            {/* ── Modal Reabastecer (cuando el código ya existe) ── */}
            {restockTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3">
                            <div className="bg-emerald-500 text-white rounded-full p-2">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-emerald-900 text-base">Producto ya registrado</p>
                                <p className="text-xs text-emerald-700">Se agregará cantidad al registro existente</p>
                            </div>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            {restockTarget.imagenUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={restockTarget.imagenUrl} alt="" className="w-16 h-16 object-cover rounded-xl border border-slate-200 mx-auto block" />
                            )}
                            <div className="text-center">
                                <p className="font-bold text-slate-800 text-base">{restockTarget.descripcionCorta}</p>
                                <p className="text-xs font-mono text-indigo-600 font-bold mt-0.5">{restockTarget.idQr}</p>
                                <p className="text-sm text-slate-500 mt-1">Stock actual: <span className="font-bold text-slate-700">{restockTarget.stock}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Cantidad a agregar</label>
                                <input
                                    type="number" min="1"
                                    value={restockCantidad}
                                    onChange={e => setRestockCantidad(e.target.value)}
                                    className="w-full px-4 py-3 text-center text-2xl font-bold rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                                />
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => { setRestockTarget(null); setRestockCantidad('1'); }}
                                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={isRestocking}
                                    onClick={async () => {
                                        setIsRestocking(true);
                                        try {
                                            const fd = new FormData();
                                            fd.set('codigoBarras', restockTarget!.codigoBarras ?? '');
                                            fd.set('cantidad', restockCantidad);
                                            fd.set('area', restockTarget!.area);
                                            fd.set('descripcionCorta', restockTarget!.descripcionCorta);
                                            fd.set('cuentaAct', 'INVENTARIO');
                                            fd.set('codigoGrupo', '001');
                                            const result = await createActivo(fd);
                                            if (result.success) {
                                                const msg = `✅ +${restockCantidad} unidades agregadas a ${restockTarget!.idQr}`;
                                                setRestockTarget(null);
                                                setRestockCantidad('1');
                                                onSuccess();
                                                onClose();
                                                alert(msg);
                                            }
                                        } catch (e: any) {
                                            alert('Error: ' + e.message);
                                        } finally {
                                            setIsRestocking(false);
                                        }
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isRestocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {isRestocking ? 'Guardando...' : `Agregar ${restockCantidad}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Modal overlay for images */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 lg:top-10 lg:right-10 bg-white/10 text-white p-3 rounded-full hover:bg-white/25 transition-colors border border-white/20"
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

            <BarcodeScannerModal
                onOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
            />

            {isClienteModalOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
                        
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-600" />
                                Registrar Nuevo Cliente / Contacto
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setIsClienteModalOpen(false)}
                                className="text-slate-400 hover:text-slate-650 text-sm font-bold bg-slate-100 hover:bg-slate-200 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCliente} className="p-6 overflow-y-auto space-y-4">
                            
                            {/* Nombre o Razón Social */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre o Empresa *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Hospital Bendaña S.A. o Juan Pérez"
                                    value={newClienteData.nombre}
                                    onChange={(e) => setNewClienteData(p => ({ ...p, nombre: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                />
                            </div>

                            {/* RTN y Teléfono */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">RTN (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 08011990123456"
                                        value={newClienteData.rtn}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, rtn: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. +504 9999-8888"
                                        value={newClienteData.telefono}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, telefono: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    placeholder="Ej. compras@hospital.hn"
                                    value={newClienteData.email}
                                    onChange={(e) => setNewClienteData(p => ({ ...p, email: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                />
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Dirección Completa</label>
                                <textarea
                                    rows={2}
                                    placeholder="Ej. Colonia Altamira, 12 Calle, San Pedro Sula"
                                    value={newClienteData.direccion}
                                    onChange={(e) => setNewClienteData(p => ({ ...p, direccion: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600 resize-none"
                                />
                            </div>

                            {/* Contacto Interno */}
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Persona de Contacto</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Ing. Carlos Aguilar"
                                        value={newClienteData.nombreContacto}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, nombreContacto: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono Contacto</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 9988-7766"
                                        value={newClienteData.telefonoContacto}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, telefonoContacto: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsClienteModalOpen(false)}
                                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition active:scale-95 shadow-sm shadow-indigo-150 cursor-pointer"
                                >
                                    Guardar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ activo, onClose, onSuccess }: { activo: Activo; onClose: () => void; onSuccess: () => void }) {
    const [isPending, startTransition] = useTransition();
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                    <button onClick={() => startTransition(async () => {
                        const res = await deleteActivo(activo.id);
                        if (res && !res.success) {
                            toast.error(res.error || 'Error al eliminar el activo');
                        } else {
                            toast.success('Activo de renta eliminado correctamente');
                            onSuccess();
                            onClose();
                        }
                    })}
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
    const [cantidad, setCantidad] = useState('');
    const [size, setSize] = useState('50x25');
    const [impresora, setImpresora] = useState('Niimbot');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const saved = localStorage.getItem('default_printer');
        if (saved) {
            setImpresora(saved);
        }
    }, []);

    const handlePrinterChange = (newPrinter: string) => {
        setImpresora(newPrinter);
        localStorage.setItem('default_printer', newPrinter);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
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
                    <div>
                        <FieldLabel required>Cantidad a imprimir</FieldLabel>
                        <input type="number" min="1" max={grupos.find(g => g.codigoGrupo === grupo)?.cantidad || undefined} value={cantidad} onChange={e => setCantidad(e.target.value)}
                            className={inputCls} placeholder="Ej: 50" />
                        <p className="text-[10px] text-slate-500 mt-1.5 ml-1 leading-tight">Se enviarán a imprimir automáticamente los {cantidad || 'N'} registros más recientes de este grupo.</p>
                    </div>
                    <div>
                        <FieldLabel required>Tamaño Etiqueta</FieldLabel>
                        <select 
                            value={size} 
                            onChange={(e) => setSize(e.target.value)}
                            className={selectCls}
                        >
                            <option value="70x40">70x40 mm</option>
                            <option value="50x33">50x33 mm</option>
                            <option value="50x25">50x25 mm</option>
                        </select>
                    </div>
                    <div>
                        <FieldLabel required>Impresora</FieldLabel>
                        <select 
                            value={impresora} 
                            onChange={(e) => handlePrinterChange(e.target.value)}
                            className={selectCls}
                        >
                            <option value="Niimbot">NIIMBOT K3</option>
                            <option value="TSC TE200">TSC TE200</option>
                        </select>
                    </div>
                </div>

                <button onClick={() => startTransition(async () => {
                    if (!grupo || !cantidad) return alert('Completa todos los campos');
                    if (Number(cantidad) < 1) return alert('Cantidad inválida');

                    try {
                        const res = await encolarLoteImpresion(grupo, Number(cantidad), size, impresora);
                        if (res.error) alert(res.error);
                        else {
                            alert(`Se enviaron ${cantidad} etiquetas a la cola de impresión exitosamente.`);
                            onSuccess();
                            onClose();
                        }
                    } catch (e) {
                        alert('Error conectando con el servidor');
                    }
                })}
                    disabled={isPending || !grupo || !cantidad}
                    className="w-full flex items-center justify-center gap-2 text-base font-bold bg-[#0500A3] text-white rounded-2xl py-4 hover:bg-[#0600c2] active:scale-[0.98] transition-all disabled:opacity-60">
                    {isPending && <Loader2 className="w-5 h-5 animate-spin" />} Enviar a Cola
                </button>
            </div>
        </div>
    );
}

// ─── PRODUCT SUMMARY MODAL ───────────────────────────────────────────────────
function ProductSummaryModal({
    initialIdQr,
    onClose
}: {
    initialIdQr: string | null;
    onClose: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState(initialIdQr || '');
    const [activos, setActivos] = useState<any[]>([]);
    const [loading, setLoading] = useState(!!initialIdQr);
    const [viewMode, setViewMode] = useState<'consolidated' | 'cards' | 'list'>('consolidated');
    const [hasSearched, setHasSearched] = useState(!!initialIdQr);
    const [isScanning, setIsScanning] = useState(false);
    const [showSold, setShowSold] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    async function handleSearch(evt?: React.FormEvent, customShowSold?: boolean) {
        if (evt) evt.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        setHasSearched(true);
        try {
            const activeShowSold = customShowSold !== undefined ? customShowSold : showSold;
            const data = await searchActivosGlobal(searchQuery.trim(), activeShowSold);
            setActivos(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!searchQuery.trim() && !hasSearched) return;
        
        if (!searchQuery.trim() && hasSearched) {
            setActivos([]);
            setHasSearched(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            handleSearch(undefined, showSold);
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, showSold]);

    // Handle scan result directly bypassing standard form submit if needed
    const onScanResult = async (code: string) => {
        let cleanCode = code.trim();
        if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
            try {
                const url = new URL(cleanCode);
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts.length > 0) cleanCode = parts[parts.length - 1];
            } catch {
                cleanCode = cleanCode.substring(cleanCode.lastIndexOf('/') + 1);
            }
        }
        cleanCode = cleanCode.toUpperCase().replace(/'/g, '-');
        
        setSearchQuery(cleanCode);
        setIsScanning(false);
        setLoading(true);
        setHasSearched(true);
        try {
            const data = await searchActivosGlobal(cleanCode, showSold);
            setActivos(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const totalStock = activos.reduce((acc, a) => acc + (a.stock || 1), 0);
    const totalAreas = new Set(activos.map(a => a.area)).size;

    // Group assets by description for consolidation
    const consolidated = useMemo(() => {
        const groups: Record<string, { 
            descripcionCorta: string; 
            totalStock: number; 
            areas: Set<string>; 
            items: any[]; 
            imagenUrl: string | null;
        }> = {};
        
        for (const a of activos) {
            const desc = a.descripcionCorta || 'Sin Descripción';
            if (!groups[desc]) {
                groups[desc] = {
                    descripcionCorta: desc,
                    totalStock: 0,
                    areas: new Set<string>(),
                    items: [],
                    imagenUrl: a.imagenUrl || null
                };
            }
            groups[desc].totalStock += a.stock ?? 1;
            if (a.area) groups[desc].areas.add(a.area);
            groups[desc].items.push(a);
            if (a.imagenUrl && !groups[desc].imagenUrl) {
                groups[desc].imagenUrl = a.imagenUrl;
            }
        }
        
        return Object.values(groups).sort((a, b) => b.totalStock - a.totalStock);
    }, [activos]);

    return (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
            <div className="bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] rounded-b-2xl animate-in slide-in-from-top-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-4 sticky top-0 bg-white/95 backdrop-blur z-10 sm:rounded-t-2xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700">
                                <Search className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 leading-tight">Consulta de Producto</h2>
                                <p className="text-xs font-semibold text-slate-500">Busca por código, nombre, modelo o ubicación (ej. C-2-3)</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
 
                    <form onSubmit={(e) => handleSearch(e)} className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    autoFocus={!initialIdQr}
                                    type="text"
                                    placeholder="Ej: BEA-000001, CIRCUITO, C-2-3..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase().replace(/'/g, '-'))}
                                    className="w-full pl-10 pr-12 py-3 text-sm font-mono tracking-widest text-[#0500A3] border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 bg-slate-50 transition-all placeholder:text-slate-300 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                                />
                                <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <button
                                    type="button"
                                    onClick={() => setIsScanning(true)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                    title="Escanear Código"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <button type="submit" disabled={loading || !searchQuery.trim()} className="bg-[#0500A3] hover:bg-[#0600c2] text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shrink-0">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 pl-1 select-none">
                            <input
                                type="checkbox"
                                id="show-sold-checkbox"
                                checked={showSold}
                                onChange={(e) => setShowSold(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="show-sold-checkbox" className="text-xs text-slate-600 font-semibold cursor-pointer">
                                Incluir productos vendidos / entregados
                            </label>
                        </div>
                    </form>
                </div>
 
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
                    {!hasSearched ? (
                        <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                            <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                <QrCode className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="font-medium text-sm max-w-xs leading-relaxed">Escribe un nombre, modelo, ubicación o escanea un código para ver su resumen de cantidades y distribución.</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#0500A3]" />
                            <p className="font-semibold">Buscando ubicaciones...</p>
                        </div>
                    ) : activos.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                            <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 border border-amber-100">
                                <AlertTriangle className="w-8 h-8 text-amber-400" />
                            </div>
                            <p className="font-medium text-sm text-slate-600">No se encontraron productos para <span className="font-bold font-mono text-slate-900 bg-white border px-1 py-0.5 rounded">{searchQuery}</span></p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white shadow-sm rounded-xl p-4 border border-slate-200 flex items-center gap-3">
                                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-500"><Package className="w-5 h-5"/></div>
                                    <div>
                                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Stock Total</div>
                                        <div className="text-xl font-black text-slate-800 leading-none">{totalStock} <span className="text-xs font-semibold text-slate-400">unids.</span></div>
                                    </div>
                                </div>
                                <div className="bg-white shadow-sm rounded-xl p-4 border border-slate-200 flex items-center gap-3">
                                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-500"><MapPin className="w-5 h-5"/></div>
                                    <div>
                                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Distribución</div>
                                        <div className="text-xl font-black text-slate-800 leading-none">{totalAreas} <span className="text-xs font-semibold text-slate-400">áreas</span></div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr className="border-slate-200" />
 
                            {/* View Toggle */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" /> Locaciones Actuales
                                </h3>
                                <div className="bg-white border border-slate-200 p-1 rounded-lg flex items-center shrink-0 shadow-sm">
                                    <button onClick={() => setViewMode('consolidated')} className={`p-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === 'consolidated' ? 'bg-slate-100 text-[#0500A3]' : 'text-slate-400 hover:text-slate-600'}`} title="Consolidado">
                                        Consolidado
                                    </button>
                                    <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-slate-100 text-[#0500A3]' : 'text-slate-400 hover:text-slate-600'}`} title="Cuadrícula Desglosada">
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-[#0500A3]' : 'text-slate-400 hover:text-slate-600'}`} title="Lista Desglosada">
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
 
                            {/* Consolidated View */}
                            {viewMode === 'consolidated' && (
                                <div className="space-y-3.5">
                                    {consolidated.map((group) => {
                                        const isExpanded = !!expandedGroups[group.descripcionCorta];
                                        const ubs = Array.from(group.areas).join(', ');
                                        return (
                                            <div key={group.descripcionCorta} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:border-[#0500A3]/20">
                                                {/* Header of Consolidated Card */}
                                                <div 
                                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group.descripcionCorta]: !isExpanded }))}
                                                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/55 select-none transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        {group.imagenUrl ? (
                                                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-50 relative">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={group.imagenUrl} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg shrink-0 border border-slate-150 bg-slate-100 flex items-center justify-center text-slate-400">
                                                                <Package className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-extrabold text-sm text-slate-800 leading-snug truncate">
                                                                {group.descripcionCorta}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 truncate mt-1 flex items-center gap-1">
                                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                <span className="font-medium">Ubicaciones: </span>
                                                                <span className="text-slate-600 font-semibold">{ubs || 'Sin ubicación'}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-3">
                                                        <div className="bg-blue-50 text-[#0500A3] border border-blue-100 font-extrabold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                                                            <span>{group.totalStock}</span>
                                                            <span className="text-[10px] uppercase font-bold text-[#0500A3]/75">U.</span>
                                                        </div>
                                                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-[#0500A3]' : ''}`} />
                                                    </div>
                                                </div>
 
                                                {/* Details Breakdown */}
                                                {isExpanded && (
                                                    <div className="border-t border-slate-150 bg-slate-50/50 p-3.5 space-y-2 divide-y divide-slate-100">
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-2">Desglose de Equipos Individuales</p>
                                                        {group.items.map((item) => (
                                                            <a 
                                                                key={item.id}
                                                                href={`/ficha-tecnica/${item.idQr}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-between py-2.5 hover:bg-slate-100/70 rounded-lg px-2 transition-colors gap-3 block cursor-pointer group"
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <span className="font-mono text-xs font-bold text-[#0500A3] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded shadow-sm group-hover:bg-[#0500A3] group-hover:text-white group-hover:border-[#0500A3] transition-all">
                                                                        {item.idQr}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-slate-700 truncate">
                                                                        {item.area}
                                                                    </span>
                                                                    {item.referencia && (
                                                                        <span className="text-[10px] text-slate-400 bg-slate-100 border px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                                                            Ref: {item.referencia}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="shrink-0 flex items-center gap-2">
                                                                    <span className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                                                                        x{item.stock ?? 1}
                                                                    </span>
                                                                    <EstatusBadge estatus={item.estatusContable} />
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Views */}
                            {viewMode === 'cards' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {activos.map(a => (
                                        <a href={`/ficha-tecnica/${a.idQr}`} target="_blank" rel="noopener noreferrer" key={a.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:border-[#0500A3]/30 hover:shadow-md transition-all block cursor-pointer">
                                            <div className="flex justify-between items-start gap-3">
                                                {a.imagenUrl ? (
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-slate-50 relative group-hover:scale-105 transition-transform"><Image src={a.imagenUrl} fill alt="" className="object-cover" sizes="40px" /></div>
                                                ) : null}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-slate-800 leading-tight group-hover:text-[#0500A3] transition-colors">{a.descripcionCorta}</div>
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <div className="font-mono text-[10px] font-bold text-[#0500A3] bg-blue-50 px-1.5 py-0.5 rounded shrink-0 ring-1 ring-[#0500A3]/10">{a.idQr}</div>
                                                        {a.estatusContable && <EstatusBadge estatus={a.estatusContable} />}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                    <MapPin className="w-3 h-3 text-slate-400 group-hover:text-[#0500A3] transition-colors" />
                                                    {a.area}
                                                </div>
                                                <div className="font-extrabold text-sm bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 shadow-inner group-hover:bg-[#0500A3] group-hover:text-white transition-colors block"> x {a.stock ?? 1} </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}

                            {viewMode === 'list' && (
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
                                    {activos.map(a => (
                                        <a 
                                            href={`/ficha-tecnica/${a.idQr}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            key={a.id} 
                                            className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors gap-3 cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="bg-slate-100 text-slate-700 font-extrabold px-2 py-1.5 rounded-lg text-xs shrink-0 w-10 text-center border border-slate-200 shadow-inner group-hover:bg-[#0500A3] group-hover:text-white transition-colors">{a.stock ?? 1}</div>
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                        <span className="font-bold text-xs text-slate-800 group-hover:text-[#0500A3] transition-colors">{a.area}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate group-hover:text-slate-700 transition-colors">{a.descripcionCorta}</div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                                                <span className="font-mono text-[9px] text-[#0500A3] font-bold bg-blue-50 px-1.5 py-0.5 rounded ring-1 ring-[#0500A3]/10 group-hover:bg-[#0500A3]/10 transition-all">{a.idQr}</span>
                                                <div className="scale-90 origin-right"><EstatusBadge estatus={a.estatusContable} /></div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isScanning && (
                <BarcodeScannerModal
                    onOpen={isScanning}
                    onScanSuccess={onScanResult}
                    onClose={() => setIsScanning(false)}
                />
            )}

        </div>
    );
}

// ─── Main Client Component ───────────────────────────────────────────────────
export function InventarioClient({ initialData, initialStats, dbAreas, userRole, isRentaMode = false, initialOrigins = ["Americano", "Chino", "Otro"], initialDefaultOrigin = "", initialConditions = ["Nuevo", "Usado", "Remanufacturado"], initialDefaultCondition = "", disableAiVision = false, clientes = [] }: { initialData: any, initialStats: any, dbAreas: any[], userRole: string, isRentaMode?: boolean, initialOrigins?: string[], initialDefaultOrigin?: string, initialConditions?: string[], initialDefaultCondition?: string, disableAiVision?: boolean, clientes?: any[] }) {
    const router = useRouter();   
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
    const [filtroOrigen, setFiltroOrigen] = useState('');
    const [filtroCondicion, setFiltroCondicion] = useState('');
    const [tipoInventario, setTipoInventario] = useState<'real' | 'cliente' | 'servicio' | 'importado'>('real');
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (fieldKey: string) => {
        if (fieldKey === '' || fieldKey === 'FOTO') return;
        if (sortField === fieldKey) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(fieldKey);
            setSortDirection((fieldKey === 'STOCK' || fieldKey === 'FECHA REGISTRO') ? 'desc' : 'asc');
        }
    };

    const sortedActivos = useMemo(() => {
        if (!sortField) return activos;

        return [...activos].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            switch (sortField) {
                case 'ID QR':
                    valA = a.idQr || '';
                    valB = b.idQr || '';
                    break;
                case 'DESCRIPCIÓN':
                    valA = a.descripcionCorta || '';
                    valB = b.descripcionCorta || '';
                    break;
                case 'REF.':
                    valA = a.referencia || '';
                    valB = b.referencia || '';
                    break;
                case 'LOTE':
                    valA = a.lote || '';
                    valB = b.lote || '';
                    break;
                case 'FECHA REGISTRO':
                    valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    break;
                case 'ÁREA':
                    valA = a.area || '';
                    valB = b.area || '';
                    break;
                case 'STOCK':
                    valA = Number(a.stock ?? 1);
                    valB = Number(b.stock ?? 1);
                    break;
                case 'CUENTA':
                    valA = a.cuentaAct || '';
                    valB = b.cuentaAct || '';
                    break;
                case 'ESTATUS':
                    valA = a.estatusContable || '';
                    valB = b.estatusContable || '';
                    break;
                case 'ESTADO':
                    valA = a.estadoDano || 'OK';
                    valB = b.estadoDano || 'OK';
                    break;
                case 'CREADO POR':
                    valA = a.createdBy?.nombre ? `${a.createdBy.nombre} ${a.createdBy.apellido || ''}`.trim() : (a.createdBy?.email || '');
                    valB = b.createdBy?.nombre ? `${b.createdBy.nombre} ${b.createdBy.apellido || ''}`.trim() : (b.createdBy?.email || '');
                    break;
                default:
                    return 0;
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            const comp = String(valA).localeCompare(String(valB), 'es', { sensitivity: 'base', numeric: true });
            return sortDirection === 'asc' ? comp : -comp;
        });
    }, [activos, sortField, sortDirection]);

    const [exportingExcel, setExportingExcel] = useState(false);
    const [originsList, setOriginsList] = useState<string[]>(initialOrigins);
    const [defaultOrigin, setDefaultOrigin] = useState<string>(initialDefaultOrigin);
    const [manageOriginsOpen, setManageOriginsOpen] = useState(false);
    const [conditionsList, setConditionsList] = useState<string[]>(initialConditions);
    const [defaultCondition, setDefaultCondition] = useState<string>(initialDefaultCondition);
    const [manageConditionsOpen, setManageConditionsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [editActivo, setEditActivo] = useState<Activo | null>(null);
    const [deleteActivo_, setDeleteActivo] = useState<Activo | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const [viewActivo, setViewActivo] = useState<Activo | null>(null);
    const [soldInvoiceInfo, setSoldInvoiceInfo] = useState<{ id: string; correlativo: string } | null>(null);
    const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

    const [moreActionsOpen, setMoreActionsOpen] = useState(false);
    const moreActionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreActionsRef.current && !moreActionsRef.current.contains(event.target as Node)) {
                setMoreActionsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (viewActivo && (viewActivo.estatusContable === 'VENDIDO' || viewActivo.estatusContable === 'VENDIDO/ENTREGADO')) {
            setIsLoadingInvoice(true);
            getFacturaByActivoId(viewActivo.id)
                .then(res => {
                    if (res?.success && res?.factura) {
                        setSoldInvoiceInfo(res.factura);
                    } else {
                        setSoldInvoiceInfo(null);
                    }
                })
                .catch(() => {
                    setSoldInvoiceInfo(null);
                })
                .finally(() => {
                    setIsLoadingInvoice(false);
                });
        } else {
            setSoldInvoiceInfo(null);
        }
    }, [viewActivo]);

    const [previewActivo, setPreviewActivo] = useState<Activo | null>(null);
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [searchModalQuery, setSearchModalQuery] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<{ index: number, images: string[] } | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [repairingActivo, setRepairingActivo] = useState<Activo | null>(null);
    const [repairReport, setRepairReport] = useState('');
    const [printStatus, setPrintStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [loteModalOpen, setLoteModalOpen] = useState(false);
    
    // CSV Bulk Import states
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importSuccessData, setImportSuccessData] = useState<{ count: number; batchTag: string; createdIds: string[] } | null>(null);
    
    const hasMounted = useRef(false);

    // Grupos autocompletables prefetch para el lote printer
    const [gruposDisponibles, setGruposDisponibles] = useState<any[]>([]);
    useEffect(() => { getGruposAutocompletado().then(res => setGruposDisponibles(res)); }, []);

    const searchParams = useSearchParams();

    useEffect(() => {
        const modal = searchParams?.get('modal');
        const reg = searchParams?.get('register');
        const cob = searchParams?.get('cobertura');
        const editId = searchParams?.get('edit') || searchParams?.get('id');

        if (editId) {
            getActivoForEdit(editId).then((act) => {
                if (act) {
                    setEditActivo(act);
                    setModalOpen(true);
                } else {
                    toast.error('No se encontró el equipo en el Inventario para editar.');
                }
            });
        } else if (modal === 'nuevo' || reg === 'equipo_cliente' || cob === 'externa' || searchParams?.get('nuevo') === 'true') {
            setModalOpen(true);
        }
    }, [searchParams]);

    // QR Area Control
    const [lockedArea, setLockedArea] = useState<string | null>(null);
    const [isCheckingArea, setIsCheckingArea] = useState(false);
    
    const [noAreaModalOpen, setNoAreaModalOpen] = useState(false);
    const [isClosingAct, startClosingAct] = useTransition();

    // Lógica para interceptar Deep Links y/o autocompletar área activa
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

    // The initial fetch is now handled Serverside on `page.tsx` directly!

    async function handlePrintLabel(activo: Activo, cantidad: number = 1, size: string = '50x25', impresora: string = 'Niimbot') {
        setPrintingId(activo.id);
        setPrintStatus('sending');
        try {
            const result = await encolarCopiasNiimbot(activo.id, cantidad, size, impresora);

            if (!result.success) throw new Error(result.error || 'Error al encolar impresión');
            
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
    const [labelPreviewOpen, setLabelPreviewOpen] = useState(false);

    async function handleClearQueue() {
        if (!confirm('¿Estás seguro que deseas limpiar TODA la cola de impresión de Bioelectrónica?')) return;
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
            const defaultPrinter = localStorage.getItem('default_printer') || 'Niimbot';
            const res = await fetch('/api/impresion/encolar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: '00000000-0000-0000-0000-000000000000', // ID placeholder para debug
                    urlImagen,
                    impresora: defaultPrinter,
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

    async function handleExportExcel() {
        setExportingExcel(true);
        try {
            const resolvedAreaFilter = filtroArea || (lockedArea || undefined);
            
            // 1. Fetch matching assets for export (without pagination)
            const data = await getActivosForExport(search, resolvedAreaFilter, filtroEstatus, filtroOrigen, filtroCondicion, tipoInventario);
            
            if (data.length === 0) {
                alert('No hay datos que exportar con los filtros actuales.');
                setExportingExcel(false);
                return;
            }

            // 2. Load SheetJS dynamically
            const XLSX = await import('xlsx');

            // 3. Prepare data for Excel columns
            const rows = data.map((a: any) => {
                const stock = a.stock || 1;
                const costo = a.costoAdq ? Number(a.costoAdq) : 0;
                const totalInversion = costo * stock;

                return {
                    'ID QR': a.idQr,
                    'Descripción Corta': a.descripcionCorta,
                    'Marca': a.marca || 'N/A',
                    'Modelo': a.modelo || 'N/A',
                    'Serie': a.serie || 'N/A',
                    'Ubicación / Área': a.area,
                    'Clasificación': a.esConsumible ? 'Flor / Perecedero' : 'Suministro / Insumo',
                    'Estatus Contable': a.estatusContable,
                    'Origen': a.origenActivo || 'Nacional / General',
                    'Condición': a.condicionActivo || 'N/A',
                    'Fecha de Ingreso': a.fechaAdq ? new Date(a.fechaAdq).toLocaleDateString('es-HN') : 'N/A',
                    'Costo Adquisición (Lps)': costo,
                    'Lote': a.lote || 'N/A',
                    'Fecha Vencimiento': a.fechaVencimiento ? new Date(a.fechaVencimiento).toLocaleDateString('es-HN') : 'N/A',
                    'Stock': stock,
                    'Total Inversión (Lps)': totalInversion,
                    'Fecha Registro': a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-HN') : 'N/A'
                };
            });

            // 4. Create worksheet and workbook
            const worksheet = XLSX.utils.json_to_sheet(rows);

            // 5. Add a summary row
            const totalStock = data.reduce((sum, a) => sum + (a.stock || 1), 0);
            const totalInversionVal = data.reduce((sum, a) => sum + ((a.costoAdq ? Number(a.costoAdq) : 0) * (a.stock || 1)), 0);

            // Add spacer row and summary row to sheet
            XLSX.utils.sheet_add_aoa(worksheet, [
                [],
                ['RESUMEN DE INVERSIONES Y CANTIDADES'],
                ['Total Ítems Registrados (Stock):', totalStock],
                ['Total Inversión Acumulada (Lps):', totalInversionVal]
            ], { origin: -1 });

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

            // 6. Download file
            const fileName = `Inventario_${filtroOrigen || 'Completo'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toast.success('Reporte de Excel exportado exitosamente.');
        } catch (error) {
            console.error('Error al exportar Excel:', error);
            alert('Ocurrió un error al generar el reporte de Excel.');
        } finally {
            setExportingExcel(false);
        }
    }

    // Helper functions for CSV Bulk Import
    function parseCSV(text: string): any[] {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return [];

        const headerLine = lines[0];
        const commas = (headerLine.match(/,/g) || []).length;
        const semicolons = (headerLine.match(/;/g) || []).length;
        const separator = semicolons > commas ? ';' : ',';

        const parseLine = (line: string) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === separator && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result.map(val => val.replace(/^"|"$/g, '').trim());
        };

        const headers = parseLine(headerLine).map(h => h.toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = parseLine(line);
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            const cleanRow: any = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") 
                    .replace(/\s+/g, '') 
                    .toLowerCase();
                cleanRow[cleanKey] = row[key];
            });
            
            const normalizedRow: any = {
                descripcionCorta: cleanRow.descripcioncorta || cleanRow.descripcion || cleanRow.nombre || '',
                descripcionDetallada: cleanRow.descripciondetallada || cleanRow.detalle || '',
                marca: cleanRow.marca || '',
                modelo: cleanRow.modelo || '',
                serie: cleanRow.serie || cleanRow.numerodeserie || '',
                area: cleanRow.area || cleanRow.ubicacion || '',
                cantidad: cleanRow.cantidad || cleanRow.stock || '1',
                esConsumible: cleanRow.esconsumible || cleanRow.consumible || 'NO',
                origenActivo: cleanRow.origenactivo || cleanRow.origen || '',
                condicionActivo: cleanRow.condicionactivo || cleanRow.condicion || '',
                garantia: cleanRow.garantia || '',
                observaciones: cleanRow.observaciones || cleanRow.comentarios || '',
                cuentaAct: cleanRow.cuentaact || cleanRow.cuenta || '',
                codigoGrupo: cleanRow.codigogrupo || cleanRow.grupo || '',
                codigoBarras: cleanRow.codigobarras || cleanRow.codigo || '',
                idQr: cleanRow.idqr || cleanRow.qr || '',
                lote: cleanRow.lote || '',
                fechaAdq: cleanRow.fechaingreso || cleanRow.fecha || ''
            };

            if (normalizedRow.descripcionCorta) {
                data.push(normalizedRow);
            }
        }
        return data;
    }

    function downloadCsvTemplate() {
        const headers = [
            'DescripcionCorta',
            'DescripcionDetallada',
            'Marca',
            'Modelo',
            'Serie',
            'Area',
            'Cantidad',
            'EsConsumible',
            'OrigenActivo',
            'CondicionActivo',
            'Garantia',
            'Observaciones',
            'CuentaAct',
            'CodigoGrupo',
            'CodigoBarras',
            'IdQr'
        ];
        const sampleRow = [
            'Monitor de Signos Vitales Masimo',
            'Monitor multiparametro con sensor SpO2 y pantalla tactil',
            'Masimo',
            'Rad-97',
            'SN-12345/SN-9999',
            'Bodega Guamilito',
            '1',
            'NO',
            'Americano',
            'Nuevo',
            '12 meses',
            'Importado de EE.UU.',
            'Equipos Diversos',
            '001',
            '750102030405',
            ''
        ];
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), sampleRow.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_inventario_bioelectronica.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBulkFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            setBulkData(parsed);
        };
        reader.readAsText(file);
    };

    async function handleImportSubmit() {
        if (bulkData.length === 0) {
            alert('No hay datos válidos para importar.');
            return;
        }
        setIsImporting(true);
        try {
            const res = await bulkImportActivos(bulkData);
            if (res.success && res.createdIds && res.batchTag) {
                toast.success(`Se importaron ${res.count} productos exitosamente.`);
                setImportSuccessData({
                    count: res.count || 0,
                    batchTag: res.batchTag,
                    createdIds: res.createdIds
                });
                
                // Fetch stats and update list
                const resolvedAreaFilter = filtroArea || (lockedArea || undefined);
                const updatedList = await getActivos(1, search, resolvedAreaFilter, filtroEstatus, filtroOrigen, filtroCondicion);
                setActivos(updatedList.activos);
                setTotal(updatedList.total);
                setTotalPages(updatedList.totalPages);
                const updatedStats = await getActivoStats(resolvedAreaFilter);
                setStats(updatedStats);
            } else {
                alert(res.error || 'Error al realizar la importación masiva.');
            }
        } catch (e: any) {
            console.error('Error importing bulk assets:', e);
            alert('Error en el servidor al realizar la importación.');
        } finally {
            setIsImporting(false);
        }
    }

    async function handleEncolarLoteImportado() {
        if (!importSuccessData || importSuccessData.createdIds.length === 0) return;
        setIsImporting(true);
        try {
            const res = await encolarLoteImportado(importSuccessData.createdIds);
            if (res.success) {
                toast.success(`Se encolaron ${res.count} etiquetas para impresión.`);
                setBulkModalOpen(false);
                setBulkFile(null);
                setBulkData([]);
                setImportSuccessData(null);
            } else {
                alert(res.error || 'Error al encolar etiquetas.');
            }
        } catch (e: any) {
            console.error('Error queuing import batch:', e);
            alert('Error al encolar las etiquetas en el servidor.');
        } finally {
            setIsImporting(false);
        }
    }

    async function refresh(p = page, s = search, a = filtroArea, e = filtroEstatus, currentLockedArea = lockedArea, o = filtroOrigen, c = filtroCondicion, refreshStats = true, tipoInv = tipoInventario) {
        setIsRefetching(true);
        setLoading(false); // Make sure blocking loader is off
        try {
            const resolvedAreaFilter = a || (currentLockedArea || undefined);
            if (refreshStats) {
                const [data, st] = await Promise.all([
                    isRentaMode 
                        ? getEquiposParaRenta(p, s, resolvedAreaFilter, e)
                        : getActivos(p, s, resolvedAreaFilter, e, o, c, tipoInv),
                    isRentaMode 
                        ? getRentaStats(resolvedAreaFilter)
                        : getActivoStats(currentLockedArea || undefined, tipoInv)
                ]);
                setActivos(data.activos as Activo[]);
                setTotal(data.total); setTotalPages(data.totalPages); setStats(st);
            } else {
                const data = await (isRentaMode 
                    ? getEquiposParaRenta(p, s, resolvedAreaFilter, e)
                    : getActivos(p, s, resolvedAreaFilter, e, o, c, tipoInv));
                setActivos(data.activos as Activo[]);
                setTotal(data.total); setTotalPages(data.totalPages);
            }
            router.refresh(); // Forces Next.js to re-fetch Server Components (like gruposDisponibles)
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
        const t = setTimeout(() => { setPage(1); refresh(1, search, filtroArea, filtroEstatus, lockedArea, filtroOrigen, filtroCondicion, true, tipoInventario); }, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filtroArea, filtroEstatus, filtroOrigen, filtroCondicion, tipoInventario]);

    function handlePageChange(p: number) {
        setPage(p);
        // We explicitly pass `lockedArea` here to maintain the area context when paginating
        refresh(p, search, filtroArea, filtroEstatus, lockedArea, filtroOrigen, filtroCondicion, false, tipoInventario);
    }
    const PER_PAGE = 10;

    const handleSuccess = () => { refresh(1); };

    return (
        <div className="min-h-screen bg-slate-50 px-0 py-4 sm:p-4 md:p-6 font-sans">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                    {isRentaMode && (
                        <button 
                            onClick={() => router.push('/rentas')}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0500A3] mb-3 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Volver al módulo de Rentas
                        </button>
                    )}
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2 sm:gap-3">
                        {isRentaMode ? (
                            <>
                                <ArrowRightLeft className="w-6 h-6 sm:w-8 sm:h-8 text-[#0500A3]" />
                                Equipos para Renta
                            </>
                        ) : (
                            <>
                                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-[#0500A3]" />
                                Catálogo de Productos
                            </>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isRentaMode 
                            ? 'Gestión del inventario dedicado exclusivamente para rentar a clientes.'
                            : 'Gestión y control de inventario general de ventas.'}
                    </p>
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                        {/* 1. Nuevo Producto */}
                        <button
                            onClick={() => setModalOpen(true)}
                            className="w-full sm:w-auto h-11 px-5 text-sm font-bold bg-[#0500A3] hover:bg-[#0600c2] text-white rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>{isRentaMode ? 'Nuevo Equipo' : 'Nuevo Producto'}</span>
                        </button>

                        {/* 2. Consultar */}
                        <button
                            onClick={() => setSearchModalOpen(true)}
                            className="w-full sm:w-auto h-11 px-5 text-sm font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0 hide-on-print"
                        >
                            <Search className="w-4.5 h-4.5 text-indigo-600" />
                            <span>Consultar</span>
                        </button>

                        {/* 3. Imprimir Lote */}
                        <button 
                            onClick={() => setLoteModalOpen(true)}
                            className="w-full sm:w-auto h-11 px-5 text-sm font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0 hide-on-print"
                        >
                            <Printer className="w-4.5 h-4.5 text-indigo-600" />
                            <span>Imprimir Lote</span>
                        </button>

                        {/* 4. Más Acciones (Dropdown Menu) */}
                        <div className="relative w-full sm:w-auto shrink-0 hide-on-print" ref={moreActionsRef}>
                            <button
                                type="button"
                                onClick={() => setMoreActionsOpen(prev => !prev)}
                                className={`w-full sm:w-auto h-11 px-5 text-sm font-bold border rounded-xl shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                                    moreActionsOpen 
                                        ? 'bg-slate-100 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/20' 
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span>Más Acciones</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${moreActionsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {moreActionsOpen && (
                                <div className="absolute right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <button
                                        onClick={() => {
                                            setMoreActionsOpen(false);
                                            setBulkModalOpen(true);
                                            setBulkFile(null);
                                            setBulkData([]);
                                            setImportSuccessData(null);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                                        <span>Cargar CSV / Excel</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setMoreActionsOpen(false);
                                            handleExportExcel();
                                        }}
                                        disabled={exportingExcel}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
                                        <span>Exportar Excel</span>
                                    </button>

                                    <Link
                                        href="/inventario/toma-fisica"
                                        onClick={() => setMoreActionsOpen(false)}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-pink-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <ClipboardList className="w-4 h-4 text-pink-600 shrink-0" />
                                        <span>Toma Física Tablet</span>
                                    </Link>

                                    {userRole === 'SUPER_ADMIN' && (
                                        <>
                                            <div className="h-px bg-slate-100 my-1" />
                                            
                                            <button
                                                onClick={() => {
                                                    setMoreActionsOpen(false);
                                                    setLabelPreviewOpen(true);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                                            >
                                                <Eye className="w-4 h-4 text-purple-600 shrink-0" />
                                                <span>Vista Etiqueta</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setMoreActionsOpen(false);
                                                    handleClearQueue();
                                                }}
                                                disabled={clearingQueue}
                                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {clearingQueue ? <Loader2 className="w-4 h-4 animate-spin text-rose-600 shrink-0" /> : <Eraser className="w-4 h-4 text-rose-600 shrink-0" />}
                                                <span>Limpiar Cola</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setMoreActionsOpen(false);
                                                    handleDebugPrint();
                                                }}
                                                disabled={debugPrinting}
                                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {debugPrinting ? <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" /> : <Printer className="w-4 h-4 text-amber-600 shrink-0" />}
                                                <span>{debugStatus === 'sent' ? '✅ Enviado' : debugStatus === 'error' ? '❌ Error' : 'Debug Impr.'}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 hide-on-print">
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

            {labelPreviewOpen && (
                <SuperAdminLabelPreviewModal
                    activo={activos[0] ?? null}
                    onClose={() => setLabelPreviewOpen(false)}
                />
            )}

            {manageOriginsOpen && (
                <div className="fixed inset-0 z-[110] bg-black/60 md:backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Wrench className="w-5 h-5 text-[#0500A3]" />
                                Administrar Orígenes
                            </h3>
                            <button onClick={() => setManageOriginsOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List of custom origins */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Orígenes Registrados</label>
                            
                            {/* Nacional/General */}
                            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm">
                                <span className="font-medium text-slate-700">Nacional / General (Base)</span>
                                <div className="flex items-center gap-2">
                                    {defaultOrigin === "" ? (
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100">Predeterminado</span>
                                    ) : (
                                        <button 
                                            onClick={() => setDefaultOrigin("")}
                                            className="text-xs text-[#0500A3] hover:underline font-semibold"
                                        >
                                            Hacer Predeterminado
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Custom list */}
                            {originsList.map((origin) => (
                                <div key={origin} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm">
                                    <span className="font-medium text-slate-700">{origin}</span>
                                    <div className="flex items-center gap-3">
                                        {defaultOrigin === origin ? (
                                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100">Predeterminado</span>
                                        ) : (
                                            <button 
                                                onClick={() => setDefaultOrigin(origin)}
                                                className="text-xs text-[#0500A3] hover:underline font-semibold"
                                            >
                                                Hacer Predeterminado
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                if (confirm(`¿Estás seguro de eliminar el origen "${origin}"? Esto no afectará a los productos existentes.`)) {
                                                    const updated = originsList.filter(o => o !== origin);
                                                    setOriginsList(updated);
                                                    if (defaultOrigin === origin) setDefaultOrigin("");
                                                }
                                            }}
                                            className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-md transition-colors"
                                            title="Eliminar origen"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add new origin */}
                        <div className="border-t pt-4">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Añadir Nuevo Origen</label>
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.currentTarget;
                                    const val = (form.elements.namedItem('newOrigin') as HTMLInputElement).value.trim();
                                    if (!val) return;
                                    if (val.toLowerCase() === 'nacional' || val.toLowerCase() === 'general') {
                                        alert('Nacional / General ya existe como base.');
                                        return;
                                    }
                                    if (originsList.some(o => o.toLowerCase() === val.toLowerCase())) {
                                        alert('Este origen ya está registrado.');
                                        return;
                                    }
                                    setOriginsList([...originsList, val]);
                                    form.reset();
                                }}
                                className="flex gap-2"
                            >
                                <input 
                                    name="newOrigin"
                                    type="text" 
                                    placeholder="Ej: Europeo, Coreano, etc."
                                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30"
                                    required
                                />
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-[#0500A3] hover:bg-[#0600c2] text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                                >
                                    Añadir
                                </button>
                            </form>
                        </div>

                        {/* Save / Actions */}
                        <div className="border-t pt-4 flex gap-2 justify-end">
                            <button 
                                onClick={() => setManageOriginsOpen(false)}
                                className="px-4 py-2.5 border-2 border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const res = await saveInventoryOriginsSetting(originsList, defaultOrigin);
                                        if (res.success) {
                                            toast.success('Configuración de orígenes guardada exitosamente.');
                                            setManageOriginsOpen(false);
                                        } else {
                                            alert(res.error || 'Error al guardar.');
                                        }
                                    } catch (err: any) {
                                        alert('Error al guardar: ' + err.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all"
                            >
                                Guardar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {manageConditionsOpen && (
                <div className="fixed inset-0 z-[110] bg-black/60 md:backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Wrench className="w-5 h-5 text-[#0500A3]" />
                                Administrar Condiciones
                            </h3>
                            <button onClick={() => setManageConditionsOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List of custom conditions */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Condiciones Registradas</label>

                            {/* Custom list */}
                            {conditionsList.map((condition) => (
                                <div key={condition} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm">
                                    <span className="font-medium text-slate-700">{condition}</span>
                                    <div className="flex items-center gap-3">
                                        {defaultCondition === condition ? (
                                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100">Predeterminado</span>
                                        ) : (
                                            <button 
                                                onClick={() => setDefaultCondition(condition)}
                                                className="text-xs text-[#0500A3] hover:underline font-semibold"
                                            >
                                                Hacer Predeterminado
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                if (confirm(`¿Estás seguro de eliminar la condición "${condition}"? Esto no afectará a los productos existentes.`)) {
                                                    const updated = conditionsList.filter(c => c !== condition);
                                                    setConditionsList(updated);
                                                    if (defaultCondition === condition) setDefaultCondition("");
                                                }
                                            }}
                                            className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-md transition-colors"
                                            title="Eliminar condición"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add new condition */}
                        <div className="border-t pt-4">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Añadir Nueva Condición</label>
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.currentTarget;
                                    const val = (form.elements.namedItem('newCondition') as HTMLInputElement).value.trim();
                                    if (!val) return;
                                    if (conditionsList.some(c => c.toLowerCase() === val.toLowerCase())) {
                                        alert('Esta condición ya está registrada.');
                                        return;
                                    }
                                    setConditionsList([...conditionsList, val]);
                                    form.reset();
                                }}
                                className="flex gap-2"
                            >
                                <input 
                                    name="newCondition"
                                    type="text" 
                                    placeholder="Ej: Reacondicionado, Demo, etc."
                                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30"
                                    required
                                />
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-[#0500A3] hover:bg-[#0600c2] text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                                >
                                    Añadir
                                </button>
                            </form>
                        </div>

                        {/* Save / Actions */}
                        <div className="border-t pt-4 flex gap-2 justify-end">
                            <button 
                                onClick={() => setManageConditionsOpen(false)}
                                className="px-4 py-2.5 border-2 border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const res = await saveInventoryConditionsSetting(conditionsList, defaultCondition);
                                        if (res.success) {
                                            toast.success('Configuración de condiciones guardada exitosamente.');
                                            setManageConditionsOpen(false);
                                        } else {
                                            alert(res.error || 'Error al guardar.');
                                        }
                                    } catch (err: any) {
                                        alert('Error al guardar: ' + err.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all"
                            >
                                Guardar Configuración
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
                    onPrint={(cantidad, size, impresora) => handlePrintLabel(previewActivo, cantidad, size, impresora)}
                />
            )}

            <div className="hide-on-print"><StatsCards stats={stats} /></div>

            {/* Search + filter toggle */}
            <div className="flex gap-2 mb-3 hide-on-print">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <DebouncedInput type="text" placeholder="Buscar por ID, SKU, descripción, marca, modelo..."
                        value={search} onChange={setSearch}
                        className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 bg-white" />
                </div>
                <button onClick={() => setShowFilters(f => !f)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${showFilters ? 'border-[#0500A3] text-[#0500A3] bg-blue-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                    <Filter className="w-4 h-4" /><span className="hidden sm:inline">Filtros</span>
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 p-4 bg-white rounded-xl border border-slate-200 hide-on-print">
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
                            className="w-full h-[46px] text-sm font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 text-slate-800 shadow-2xs">
                            <option value="">Todos</option>
                            {ESTATUS.map(e => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Origen / Proveedor Web</label>
                        <select value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}
                            className="w-full h-[46px] text-sm font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 text-slate-800 shadow-2xs">
                            <option value="">Todos los Orígenes / Proveedores</option>
                            <option value="SOMA-">Soma Tech (Equipos Médicos)</option>
                            <option value="SOMAPARTS-">Soma Medical Parts (Repuestos/Accesorios)</option>
                            <option value="PUKANG-">Pukang Medical (Muebles y Equipos Hospitalarios)</option>
                            <option value="JOSON-">Joson Care (Camas y Mobiliario Hospitalario)</option>
                            <option value="AERTI-">Aerti Oxygen (Equipos de Oxigenoterapia)</option>
                            <option value="DRE-">DRE Medical (Equipos Médicos e Imagenología)</option>
                            <option value="AMCAREMED-">AmcareMed (Gases Medicinales y Quirófano)</option>
                            <option value="RD-">R&D Batteries (Baterías Médicas y Lámparas)</option>
                            {originsList.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Condición del Equipo</label>
                        <select value={filtroCondicion} onChange={e => setFiltroCondicion(e.target.value)}
                            className="w-full h-[46px] text-sm font-semibold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 text-slate-800 shadow-2xs">
                            <option value="">Todas</option>
                            <option value="SIN_DEFINIR">Sin Definir</option>
                            {conditionsList.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Print Only Header */}
            <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-800">
                <h1 className="text-2xl font-bold text-slate-900">Reporte de Inventario de Activos Fijos</h1>
                <div className="text-zinc-600 mt-1">Iglesia Misión Cristiana Elim Central - San Pedro Sula, Honduras</div>
                <div className="mt-4 flex justify-between font-bold text-slate-800 text-sm">
                    <div>Filtro de Área: {filtroArea ? (AREAS.find((a: any) => a.value === filtroArea)?.label || filtroArea) : 'TODAS LAS ÁREAS'}</div>
                    <div suppressHydrationWarning>Fecha de Reporte: {new Date().toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto print-expand">
                <table className="w-full text-xs min-w-[800px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {['ID QR', 'FOTO', 'DESCRIPCIÓN', 'LOTE', 'FECHA REGISTRO', 'ÁREA', 'STOCK', 'CUENTA', 'ESTATUS', 'ESTADO', 'CREADO POR', ''].map(h => {
                                const isSortable = h !== '' && h !== 'FOTO';
                                const isSorted = sortField === h;
                                return (
                                    <th 
                                        key={h} 
                                        onClick={() => isSortable && handleSort(h)}
                                        className={`text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 ${h === '' || h === 'FOTO' ? 'hide-on-print' : 'cursor-pointer hover:bg-slate-100/80 hover:text-slate-900 transition-colors select-none'}`}
                                        title={isSortable ? `Ordenar por ${h}` : undefined}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>{h}</span>
                                            {isSortable && (
                                                <span className="shrink-0">
                                                    {isSorted ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="w-3 h-3 text-[#0500A3] font-bold" />
                                                        ) : (
                                                            <ArrowDown className="w-3 h-3 text-[#0500A3] font-bold" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 hover:opacity-100" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-50 transition-opacity duration-200 ${isRefetching ? 'opacity-40 pointer-events-none' : ''}`}>
                        {sortedActivos.length === 0 && !isRefetching ? (
                            <tr><td colSpan={12} className="text-center py-16 text-slate-400">
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <div className="text-sm font-medium">No se encontraron activos</div>
                                <div className="text-xs mt-1">Presiona "Registrar Activo" para comenzar el inventario</div>
                            </td></tr>
                        ) : sortedActivos.map(a => (
                            <tr key={a.id} onClick={() => setViewActivo(a)} className="hover:bg-slate-50/60 transition-colors group cursor-pointer">
                                <td className="px-3 py-3">
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); setSearchModalQuery(a.idQr); setSearchModalOpen(true); }}
                                        className="font-mono text-[10px] text-[#0500A3] font-bold bg-blue-50 hover:bg-[#0500A3] hover:text-white ring-1 ring-[#0500A3]/20 px-1.5 py-0.5 rounded w-fit whitespace-nowrap transition-all cursor-pointer shadow-sm"
                                        title="Consultar ubicaciones y stock general del producto"
                                    >
                                        {a.idQr}
                                    </div>
                                </td>
                                <td className="px-3 py-3 hide-on-print">
                                    {a.imagenUrl ? (
                                        <img 
                                            src={a.imagenUrl} 
                                            alt="Miniatura del Producto" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const imgs = [a.imagenUrl, a.imagenPlacaUrl].filter(Boolean) as string[];
                                                if (imgs.length > 0) setPreviewImage({ index: 0, images: imgs });
                                            }} 
                                            onError={(e) => {
                                                // Ocultar imagen rota y mostrar placeholder si falla el link externo
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 hover:border-[#0500A3] transition-colors cursor-pointer shadow-2xs bg-white" 
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200/60">
                                            <Eye className="w-4 h-4 text-slate-300" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-3 max-w-[200px]">
                                    <div className="font-semibold text-slate-800 truncate">{a.descripcionCorta}</div>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {a.esImportadoWeb && (
                                            <span className="text-indigo-700 font-extrabold text-[10px] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1 shadow-2xs">
                                                <Globe className="w-3 h-3 text-indigo-600" />
                                                <span>{a.providerName || '🌐 Importado Web'}</span>
                                            </span>
                                        )}
                                        {a.categoria && <span className="text-purple-600 font-bold text-[10px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{typeof a.categoria === 'string' ? a.categoria : a.categoria.nombre}</span>}
                                        {a.origenActivo && !a.esImportadoWeb && <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{a.origenActivo}</span>}
                                        {a.condicionActivo && <span className="text-blue-700 font-bold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{a.condicionActivo}</span>}
                                    </div>
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
                                <td className="px-3 py-3 max-w-[100px]">
                                    {a.lote ? <div className="text-[10px] text-slate-600 font-mono truncate">{a.lote}</div> : <div className="text-[10px] text-slate-300">—</div>}
                                </td>
                                <td className="px-3 py-3 max-w-[130px]">
                                    {a.createdAt ? (
                                        <div suppressHydrationWarning>
                                            <div suppressHydrationWarning className="text-[10px] text-slate-700 font-semibold whitespace-nowrap">
                                                {new Date(a.createdAt).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </div>
                                            <div suppressHydrationWarning className="text-[9px] text-slate-400 font-mono">
                                                {new Date(a.createdAt).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-slate-300">—</div>
                                    )}
                                </td>
                                <td className="px-3 py-3"><div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0" /><span className="text-slate-600 font-mono text-[10px] whitespace-nowrap">{a.area}</span></div></td>
                                <td className="px-3 py-3"><div className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-center w-fit">{a.stock ?? 1}</div></td>
                                <td className="px-3 py-3 max-w-[140px]"><div className="text-[10px] text-slate-600 truncate">{a.cuentaAct}</div></td>
                                <td className="px-3 py-3"><EstatusBadge estatus={a.estatusContable} /></td>
                                <td className="px-3 py-3"><DanoBadge dano={a.estadoDano} /></td>
                                <td className="px-3 py-3 max-w-[100px]"><div className="text-[10px] text-slate-600 truncate" title={a.createdBy?.nombre ? `${a.createdBy.nombre} ${a.createdBy.apellido || ''}`.trim() : (a.createdBy?.email?.split('@')[0] || '—')}>{a.createdBy?.nombre ? `${a.createdBy.nombre} ${a.createdBy.apellido || ''}`.trim() : (a.createdBy?.email?.split('@')[0] || '—')}</div></td>
                                <td className="px-3 py-3 hide-on-print" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                        {a.estatusContable === 'EN TRANSITO' && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`¿Marcar ${a.descripcionCorta} como VIGENTE / recibido?`)) {
                                                        try {
                                                            const res = await recibirActivoEnTransito(a.id);
                                                            if (res.success) {
                                                                toast.success('Equipo marcado como VIGENTE');
                                                                refresh();
                                                            } else {
                                                                toast.error(res.error || 'Error al recibir equipo');
                                                            }
                                                        } catch (err) {
                                                            toast.error('Error al recibir equipo');
                                                        }
                                                    }
                                                }}
                                                className="p-2 hover:bg-purple-50 rounded-lg transition-colors text-purple-500 hover:text-purple-700"
                                                title="Marcar como recibido / Vigente"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); setEditActivo(a); setModalOpen(true); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Editar"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteActivo(a); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600" title="Eliminar activo"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Compact Inline List View (< 768px) */}
            <div className="block md:hidden space-y-2">
                {sortedActivos.length === 0 && !isRefetching ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <div className="text-sm font-medium">No se encontraron activos</div>
                    </div>
                ) : (
                    sortedActivos.map(a => (
                        <div 
                            key={a.id} 
                            onClick={() => setViewActivo(a)} 
                            className="bg-white rounded-xl border border-slate-200/80 p-2.5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-2.5 cursor-pointer"
                        >
                            {/* Left Side Thumbnail + Main Info */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {a.imagenUrl ? (
                                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-slate-50 relative shadow-2xs">
                                        <Image 
                                            src={a.imagenUrl} 
                                            fill 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const imgs = [a.imagenUrl, a.imagenPlacaUrl].filter(Boolean) as string[];
                                                if (imgs.length > 0) setPreviewImage({ index: 0, images: imgs });
                                            }} 
                                            alt="" 
                                            className="object-cover" 
                                            sizes="44px"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div className="w-11 h-11 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200/60 shrink-0 text-slate-400">
                                        <Package className="w-4 h-4 text-slate-400" />
                                    </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-900 text-xs truncate leading-tight">
                                            {a.descripcionCorta}
                                        </span>
                                        <span className="font-mono text-[9px] font-bold text-[#0500A3] bg-blue-50 px-1 py-0.2 rounded border border-blue-200/60 shrink-0">
                                            {a.idQr}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                        <span className="font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded">
                                            {a.stock ?? 1} paq.
                                        </span>
                                        {a.origenActivo && (
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100/60">
                                                {a.origenActivo}
                                            </span>
                                        )}
                                        <span className="text-slate-400 flex items-center gap-0.5">
                                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                            {a.area}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side Status Badge + Arrow */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <div className="text-right">
                                    <EstatusBadge estatus={a.estatusContable} />
                                    {a.estadoDano && (
                                        <div className="mt-1">
                                            <DanoBadge dano={a.estadoDano} />
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination (Common) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-4 flex items-center justify-between px-4 py-3 hide-on-print">
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

            {restockModalOpen && (
                <RestockModal
                    open={restockModalOpen}
                    onClose={() => setRestockModalOpen(false)}
                    onSuccess={() => { 
                        alert('Inventario actualizado exitosamente'); 
                        refresh(1); 
                    }}
                    dbAreas={dbAreas}
                    gruposDisponibles={gruposDisponibles}
                />
            )}
            <ActivoModal
                disableAiVision={disableAiVision}
                dbAreas={dbAreas}
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditActivo(null); }}
                editActivo={editActivo}
                onSuccess={handleSuccess}
                lockedArea={lockedArea}
                onSelectRestock={() => { setModalOpen(false); setRestockModalOpen(true); }}
                isRentaMode={isRentaMode}
                originsList={originsList}
                defaultOrigin={defaultOrigin}
                onManageOrigins={() => setManageOriginsOpen(true)}
                conditionsList={conditionsList}
                defaultCondition={defaultCondition}
                onManageConditions={() => setManageConditionsOpen(true)}
                clientes={clientes}
            />
            {/* No Area Open Modal */}
            {noAreaModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
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
                <div className="fixed inset-0 z-[100] bg-black/60 md:backdrop-blur-sm overflow-y-auto" onClick={() => setViewActivo(null)}>
                    <div className="min-h-full flex items-center justify-center p-4">
                        <div className="bg-white w-full rounded-2xl shadow-2xl max-w-xl overflow-hidden transform translate-z-0" style={{ transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }} onClick={e => e.stopPropagation()}>
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
                                        <div className="text-xs text-slate-400 mb-1">Registrado por</div>
                                        <div className="font-medium text-slate-800 truncate" title={viewActivo.createdBy?.nombre ? `${viewActivo.createdBy.nombre} ${viewActivo.createdBy.apellido || ''}`.trim() : (viewActivo.createdBy?.email?.split('@')[0] || '—')}>{viewActivo.createdBy?.nombre ? `${viewActivo.createdBy.nombre} ${viewActivo.createdBy.apellido || ''}`.trim() : (viewActivo.createdBy?.email?.split('@')[0] || '—')}</div>
                                    </div>
                                    {viewActivo.updatedBy && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Modificado por</div>
                                            <div className="font-medium text-slate-800 truncate" title={viewActivo.updatedBy?.nombre ? `${viewActivo.updatedBy.nombre} ${viewActivo.updatedBy.apellido || ''}`.trim() : (viewActivo.updatedBy?.email?.split('@')[0] || '—')}>{viewActivo.updatedBy?.nombre ? `${viewActivo.updatedBy.nombre} ${viewActivo.updatedBy.apellido || ''}`.trim() : (viewActivo.updatedBy?.email?.split('@')[0] || '—')}</div>
                                        </div>
                                    )}
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
                                    {viewActivo.garantia && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Garantía</div>
                                            <div className="font-medium text-slate-800">{viewActivo.garantia}</div>
                                        </div>
                                    )}
                                    {viewActivo.mantenimientosIncluidos !== undefined && viewActivo.mantenimientosIncluidos !== null && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Mantenimientos Incluidos</div>
                                            <div className="font-medium text-slate-800">{viewActivo.mantenimientosIncluidos}</div>
                                        </div>
                                    )}
                                    {viewActivo.frecuenciaMantenimientoMeses !== undefined && viewActivo.frecuenciaMantenimientoMeses !== null && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Frecuencia Mantenimiento</div>
                                            <div className="font-medium text-slate-800">{viewActivo.frecuenciaMantenimientoMeses} {viewActivo.frecuenciaMantenimientoMeses === 1 ? 'mes' : 'meses'}</div>
                                        </div>
                                    )}
                                    {viewActivo.esEquipoCliente && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Cobertura del Equipo</div>
                                            <div className={`font-semibold text-xs px-2 py-0.5 rounded border w-fit ${
                                                viewActivo.cobertura === 'interna' 
                                                    ? 'text-amber-750 bg-amber-50 border-amber-200' 
                                                    : 'text-blue-700 bg-blue-50 border-blue-200'
                                            }`}>
                                                {viewActivo.cobertura === 'interna' ? '🏢 Interno (En Tienda)' : '🌍 Externo (Cliente)'}
                                            </div>
                                        </div>
                                    )}
                                    {viewActivo.origenActivo && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Origen</div>
                                            <div className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">{viewActivo.origenActivo}</div>
                                        </div>
                                    )}
                                    {viewActivo.condicionActivo && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Condición</div>
                                            <div className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit">{viewActivo.condicionActivo}</div>
                                        </div>
                                    )}
                                    {viewActivo.costoAdq !== undefined && viewActivo.costoAdq !== null && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Costo Adquisición / Inversión</div>
                                            <div className="font-medium text-slate-800">Lps. {Number(viewActivo.costoAdq).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        </div>
                                    )}
                                    {viewActivo.fechaAdq && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Fecha de Ingreso</div>
                                            <div className="font-medium text-slate-800">{new Date(viewActivo.fechaAdq).toLocaleDateString('es-HN')}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Sección de Venta (Factura y Entrega) */}
                                {viewActivo && (viewActivo.estatusContable === 'VENDIDO' || viewActivo.estatusContable === 'VENDIDO/ENTREGADO') && (
                                    <div className="mt-6 p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <div className="p-1.5 bg-blue-100 text-[#0500A3] rounded-lg mt-0.5 shrink-0">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Información de Venta</h5>
                                                {isLoadingInvoice ? (
                                                    <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0500A3]" />
                                                        <span>Cargando datos de venta...</span>
                                                    </div>
                                                ) : soldInvoiceInfo ? (
                                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                                        Equipo vendido mediante la factura <strong className="font-bold text-[#0500A3]">{soldInvoiceInfo.correlativo}</strong>. Puedes ver los documentos correspondientes abajo:
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-slate-400 mt-1 italic">
                                                        No se encontró el registro de la factura para este equipo.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {soldInvoiceInfo && (
                                            <div className="grid grid-cols-2 gap-3 mt-1">
                                                <a
                                                    href={`/facturas/ver/${soldInvoiceInfo.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-[#0500A3]/30 text-[#0500A3] bg-white hover:bg-blue-50/50 hover:border-[#0500A3]/50 rounded-lg text-xs font-bold transition-all active:scale-95"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    Ver Factura
                                                </a>
                                                <a
                                                    href={`/api/pdf/${soldInvoiceInfo.id}?type=entrega`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0500A3] hover:bg-[#0600c2] text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Orden de Entrega
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                {viewActivo?.estatusContable === 'EN REPARACION' && (
                                    <button
                                        onClick={() => {
                                            setRepairingActivo(viewActivo);
                                            setViewActivo(null);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all active:scale-95 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500 text-sm"
                                    >
                                        <Wrench className="w-4 h-4" />
                                        🛠️ Completar Reparación / Marcar Vigente
                                    </button>
                                )}
                                {viewActivo?.estatusContable === 'EN TRANSITO' && (
                                    <button
                                        onClick={async () => {
                                            const a = viewActivo;
                                            setViewActivo(null);
                                            if (window.confirm(`¿Confirmar la recepción de ${a.descripcionCorta}? Cambiará su estatus a VIGENTE.`)) {
                                                try {
                                                    const res = await recibirActivoEnTransito(a.id);
                                                    if (res.success) {
                                                        toast.success('El equipo ha sido marcado como VIGENTE y disponible en inventario');
                                                        refresh();
                                                    } else {
                                                        toast.error(res.error || 'Error al actualizar estatus');
                                                    }
                                                } catch (err) {
                                                    toast.error('Error al recibir equipo');
                                                }
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all active:scale-95 border-2 border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-500 text-sm"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        📦 Recibir Inventario / Marcar Vigente
                                    </button>
                                )}
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


            {(searchModalOpen || searchModalQuery) && (
                <ProductSummaryModal
                    initialIdQr={searchModalQuery}
                    onClose={() => { setSearchModalOpen(false); setSearchModalQuery(null); }}
                />
            )}

            {repairingActivo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/50">
                            <Wrench size={28} className="stroke-[2] text-emerald-600" />
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-900 text-center mb-1 tracking-tight">Completar Reparación</h3>
                        <p className="text-xs text-slate-500 text-center mb-4 font-medium px-2 leading-relaxed">
                            El equipo <span className="font-mono font-bold">{repairingActivo.idQr}</span> volverá a estar **VIGENTE** en inventario y disponible para la venta/renta.
                        </p>
                        
                        <div className="w-full space-y-2 mb-6 text-left">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporte Técnico / Solución</label>
                            <textarea
                                rows={3}
                                value={repairReport}
                                onChange={e => setRepairReport(e.target.value)}
                                placeholder="Explica qué se le reparó al equipo (ej. 'Cambio de placa de carga y baterías de respaldo. Pruebas de funcionamiento OK')."
                                className="w-full text-xs border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all resize-none placeholder:text-slate-300 text-slate-700"
                            />
                        </div>
                        
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => {
                                    setRepairingActivo(null);
                                    setRepairReport('');
                                }}
                                className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (!repairReport.trim()) {
                                        toast.error('El reporte técnico es obligatorio');
                                        return;
                                    }
                                    try {
                                        const res = await completarReparacionActivo(repairingActivo.id, repairReport);
                                        if (res.success) {
                                            toast.success('El equipo ha sido retornado a Vigente en inventario');
                                            setRepairingActivo(null);
                                            setRepairReport('');
                                            window.location.reload();
                                        } else {
                                            toast.error(res.error || 'Error al completar la reparación');
                                        }
                                    } catch (e) {
                                        toast.error('Error al conectar con el servidor');
                                    }
                                }}
                                className="flex-[1.5] py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                Sí, Completar Reparación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Carga Masiva (CSV) */}
            {bulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hide-on-print">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-indigo-600" />
                                    Importación Masiva de Inventario
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 font-medium">Carga un archivo CSV para registrar múltiples productos en segundos.</p>
                            </div>
                            <button onClick={() => setBulkModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                            {!importSuccessData ? (
                                <>
                                    {/* Pasos / Descarga de plantilla */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex gap-3">
                                            <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">1</div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-700">Descarga la Plantilla CSV</h4>
                                                <p className="text-xs text-slate-500 mt-0.5 font-medium">Usa nuestro formato con los encabezados correspondientes para recolectar tus datos.</p>
                                            </div>
                                        </div>
                                        <button onClick={downloadCsvTemplate} className="flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white border border-indigo-200 hover:border-indigo-300 shadow-sm px-4 py-2.5 rounded-xl transition-all active:scale-95">
                                            <Download className="w-4 h-4" /> Descargar Plantilla
                                        </button>
                                    </div>

                                    {/* Cargador de archivos */}
                                    <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-8 transition-colors text-center cursor-pointer relative">
                                        <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600 border border-indigo-50">
                                                <FileSpreadsheet className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 block">
                                                    {bulkFile ? bulkFile.name : 'Selecciona o arrastra tu archivo CSV'}
                                                </span>
                                                <span className="text-xs text-slate-400 block mt-1 font-medium">
                                                    {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : 'Solo archivos con formato .csv de Excel'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    {bulkData.length > 0 && (
                                        <div className="flex-1 flex flex-col border border-slate-100 rounded-2xl overflow-hidden min-h-[250px]">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-600">Previsualización de Datos ({bulkData.length} filas detectadas)</span>
                                            </div>
                                            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[300px] custom-scrollbar">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50/80 sticky top-0 border-b border-slate-100 text-slate-500 font-bold">
                                                            <th className="p-3">Descripción Corta</th>
                                                            <th className="p-3">Marca/Modelo</th>
                                                            <th className="p-3">Serie</th>
                                                            <th className="p-3">Área/Ubicación</th>
                                                            <th className="p-3 text-center">Cant</th>
                                                            <th className="p-3 text-center">Consumible</th>
                                                            <th className="p-3">Código Barras</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                                        {bulkData.map((row, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                                <td className="p-3 max-w-[200px] truncate font-bold text-slate-800">{row.descripcionCorta}</td>
                                                                <td className="p-3">{row.marca || 'N/A'} {row.modelo ? `/ ${row.modelo}` : ''}</td>
                                                                <td className="p-3 font-mono">{row.serie || 'N/A'}</td>
                                                                <td className="p-3"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{row.area}</span></td>
                                                                <td className="p-3 text-center font-bold">{row.cantidad}</td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${['si', 'sí', 'true', 'yes', '1', 's'].includes(String(row.esConsumible).toLowerCase().trim()) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                        {['si', 'sí', 'true', 'yes', '1', 's'].includes(String(row.esConsumible).toLowerCase().trim()) ? 'SÍ' : 'NO'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 font-mono text-slate-500">{row.codigoBarras || 'N/A'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Import Success Feedback screen */
                                <div className="text-center py-10 flex flex-col items-center gap-4">
                                    <div className="bg-green-100 text-green-600 p-4 rounded-full border-4 border-green-50 animate-bounce">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-800">¡Carga Masiva Exitosa!</h4>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">Se han importado exitosamente <strong>{importSuccessData.count}</strong> artículos al inventario.</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full max-w-md text-left flex flex-col gap-2.5 mt-2">
                                        <div className="text-xs font-bold text-slate-600 flex justify-between">
                                            <span>Identificador de Lote:</span>
                                            <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{importSuccessData.batchTag}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                            Los códigos de barra y correlativos QR fueron asignados de manera consecutiva. Puedes filtrar la tabla del catálogo para verlos en detalle o encolar su impresión ahora mismo.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-end">
                            {!importSuccessData ? (
                                <>
                                    <button onClick={() => setBulkModalOpen(false)} className="px-5 py-3 font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleImportSubmit} disabled={isImporting || bulkData.length === 0} className="px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Importar Productos
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => {
                                        setSearch(importSuccessData.batchTag);
                                        setBulkModalOpen(false);
                                        toast.success("Filtro de lote aplicado en la búsqueda.");
                                    }} className="px-5 py-3 font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <Filter className="w-4 h-4" /> Filtrar en la Tabla
                                    </button>
                                    <button onClick={handleEncolarLoteImportado} disabled={isImporting} className="px-6 py-3 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />} Imprimir Todas las Etiquetas
                                    </button>
                                    <button onClick={() => setBulkModalOpen(false)} className="px-5 py-3 font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                        Listo / Cerrar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CategoriaQuickModal({ open, onClose, onSuccess, categorias = [] }: { open: boolean, onClose: () => void, onSuccess: (id: string, name: string, isEdit?: boolean) => void, categorias?: { value: string, label: string }[] }) {
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [nombre, setNombre] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [isPending, startTransition] = useTransition();

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button 
                        type="button" 
                        onClick={() => { setMode('create'); setNombre(''); }}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'create' ? 'text-[#0500A3] border-b-2 border-[#0500A3] bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Nueva Categoría
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { setMode('edit'); setNombre(''); setSelectedId(''); }}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'edit' ? 'text-[#0500A3] border-b-2 border-[#0500A3] bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Editar Existente
                    </button>
                </div>
                
                <div className="p-6">
                    {mode === 'edit' && (
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seleccionar Categoría</label>
                            <select 
                                value={selectedId} 
                                onChange={e => {
                                    setSelectedId(e.target.value);
                                    const cat = categorias.find(c => c.value === e.target.value);
                                    if (cat) setNombre(cat.label);
                                }} 
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:border-[#0500A3] focus:ring-0 outline-none transition-colors"
                            >
                                <option value="" disabled>Selecciona una categoría...</option>
                                {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            {mode === 'create' ? 'Nombre de la Categoría' : 'Nuevo Nombre'}
                        </label>
                        <input 
                            type="text" 
                            value={nombre} 
                            onChange={e => setNombre(e.target.value)} 
                            placeholder="Ej: Sensores Médicos..." 
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:border-[#0500A3] focus:ring-0 outline-none transition-colors" 
                            autoFocus 
                        />
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl transition-colors">Cancelar</button>
                        <button type="button" onClick={() => startTransition(async () => {
                            if (!nombre.trim()) return alert('El nombre es obligatorio');
                            try {
                                if (mode === 'create') {
                                    const res = await createCategoria(nombre);
                                    if (res.error) alert(res.error);
                                    else if (res.categoria) { onSuccess(res.categoria.id, res.categoria.nombre, false); onClose(); }
                                } else {
                                    if (!selectedId) return alert('Debes seleccionar una categoría');
                                    const res = await updateCategoria(selectedId, nombre);
                                    if (res.error) alert(res.error);
                                    else if (res.categoria) { onSuccess(res.categoria.id, res.categoria.nombre, true); onClose(); }
                                }
                            } catch (e) { alert('Error interno'); }
                        })} disabled={isPending || !nombre.trim() || (mode === 'edit' && !selectedId)} className="flex-1 font-bold text-white bg-[#0500A3] hover:bg-[#0600c2] py-3 rounded-xl transition-colors flex justify-center items-center">
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
