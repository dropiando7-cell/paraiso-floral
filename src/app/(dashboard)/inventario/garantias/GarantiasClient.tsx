'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { 
    ShieldCheck, 
    Search, 
    Tag, 
    Calendar, 
    User, 
    AlertTriangle, 
    CheckCircle2, 
    HelpCircle,
    ChevronRight,
    Loader2,
    Settings,
    FileText,
    Wrench,
    Clock,
    X,
    Package,
    Printer,
    RotateCcw,
    PenTool
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';
import { 
    buscarActivoPorSerieOQr, 
    procesarReemplazoGarantia, 
    getHistorialGarantias,
    buscarActivosParaGarantia
} from './actions';

interface LogItem {
    id: string;
    activoId: string;
    idQr: string;
    descripcion: string;
    serie: string;
    estadoAnterior: string;
    estadoNuevo: string;
    motivo: string;
    usuario: string;
    createdAt: string;
}

interface GarantiasClientProps {
    inicialLogs: LogItem[];
}

export default function GarantiasClient({ inicialLogs }: GarantiasClientProps) {
    const [logs, setLogs] = useState<LogItem[]>(inicialLogs);
    const [isPending, startTransition] = useTransition();

    // Defective Asset Search
    const [defectuosoQuery, setDefectuosoQuery] = useState('');
    const [defectuosoActivo, setDefectuosoActivo] = useState<any | null>(null);
    const [isSearchingDef, setIsSearchingDef] = useState(false);

    // Replacement Asset Search
    const [reemplazoQuery, setReemplazoQuery] = useState('');
    const [reemplazoActivo, setReemplazoActivo] = useState<any | null>(null);
    const [isSearchingRep, setIsSearchingRep] = useState(false);

    // Autocomplete states
    const [defectuosoSuggestions, setDefectuosoSuggestions] = useState<any[]>([]);
    const [reemplazoSuggestions, setReemplazoSuggestions] = useState<any[]>([]);
    const [showDefDropdown, setShowDefDropdown] = useState(false);
    const [showRepDropdown, setShowRepDropdown] = useState(false);

    // Signature and Modal states
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [replacementResult, setReplacementResult] = useState<any | null>(null);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Swap details
    const [motivo, setMotivo] = useState('');

    // Debounce search for Defective
    useEffect(() => {
        if (!defectuosoQuery.trim() || defectuosoQuery.length < 2) {
            setDefectuosoSuggestions([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await buscarActivosParaGarantia(defectuosoQuery);
                setDefectuosoSuggestions(res);
            } catch (e) {
                console.error(e);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [defectuosoQuery]);

    // Debounce search for Replacement
    useEffect(() => {
        if (!reemplazoQuery.trim() || reemplazoQuery.length < 2) {
            setReemplazoSuggestions([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            try {
                // Show matching vigentes
                const res = await buscarActivosParaGarantia(reemplazoQuery, 'VIGENTE');
                setReemplazoSuggestions(res);
            } catch (e) {
                console.error(e);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [reemplazoQuery]);

    const handleSelectDefectuoso = (activo: any) => {
        setDefectuosoActivo(activo);
        setDefectuosoQuery(activo.serie || activo.idQr);
        setShowDefDropdown(false);
    };

    const handleSelectReemplazo = (activo: any) => {
        if (activo.estatusContable !== 'VIGENTE') {
            toast.error(`El equipo de reemplazo debe estar VIGENTE (actualmente está: ${activo.estatusContable})`);
            return;
        }
        setReemplazoActivo(activo);
        setReemplazoQuery(activo.serie || activo.idQr);
        setShowRepDropdown(false);
    };

    const handleSearchDefectuoso = async () => {
        if (!defectuosoQuery.trim()) return;
        setIsSearchingDef(true);
        try {
            const res = await buscarActivoPorSerieOQr(defectuosoQuery.trim());
            if (res) {
                setDefectuosoActivo(res);
                toast.success('Equipo defectuoso encontrado');
            } else {
                toast.error('No se encontró ningún equipo con ese código o número de serie');
                setDefectuosoActivo(null);
            }
        } catch (e) {
            toast.error('Error al buscar el equipo');
        } finally {
            setIsSearchingDef(false);
        }
    };

    const handleSearchReemplazo = async () => {
        if (!reemplazoQuery.trim()) return;
        setIsSearchingRep(true);
        try {
            const res = await buscarActivoPorSerieOQr(reemplazoQuery.trim());
            if (res) {
                if (res.estatusContable !== 'VIGENTE') {
                    toast.error(`El equipo de reemplazo debe estar VIGENTE (actualmente está: ${res.estatusContable})`);
                    setReemplazoActivo(null);
                } else {
                    setReemplazoActivo(res);
                    toast.success('Equipo de reemplazo válido encontrado');
                }
            } else {
                toast.error('No se encontró ningún equipo de reemplazo con ese código o número de serie');
                setReemplazoActivo(null);
            }
        } catch (e) {
            toast.error('Error al buscar el equipo');
        } finally {
            setIsSearchingRep(false);
        }
    };

    const handleConfirmReplacement = () => {
        if (!defectuosoActivo) {
            toast.error('Debes seleccionar el equipo defectuoso original');
            return;
        }
        if (!reemplazoActivo) {
            toast.error('Debes seleccionar el equipo nuevo de reemplazo');
            return;
        }
        if (!motivo.trim()) {
            toast.error('Debes explicar los hallazgos o motivo del reemplazo');
            return;
        }

        // Open signature modal
        setShowSignatureModal(true);
    };

    const executeReplacement = async (firmaBase64: string | null, nombreSigner: string | null) => {
        if (!defectuosoActivo || !reemplazoActivo) return;

        startTransition(async () => {
            try {
                const res = await procesarReemplazoGarantia(
                    defectuosoActivo.id,
                    reemplazoActivo.id,
                    motivo,
                    firmaBase64,
                    nombreSigner
                );
                
                if (res.success) {
                    toast.success('Reemplazo por garantía procesado exitosamente');
                    setReplacementResult(res);
                    setShowSignatureModal(false);
                    
                    // Refresh logs list
                    const updatedLogs = await getHistorialGarantias();
                    setLogs(updatedLogs);
                } else {
                    toast.error(res.error || 'Error al procesar la garantía');
                }
            } catch (e) {
                toast.error('Error de conexión con el servidor');
            }
        });
    };

    const handleCloseSuccess = () => {
        setDefectuosoQuery('');
        setDefectuosoActivo(null);
        setReemplazoQuery('');
        setReemplazoActivo(null);
        setMotivo('');
        setSignerName('');
        setReplacementResult(null);
        setHasDrawn(false);
    };

    // Helper to format status text nicely
    const formatStatus = (status: string) => {
        if (status === 'EN REPARACION') return 'En Reparación';
        if (status === 'VENDIDO') return 'Vendido';
        if (status === 'VIGENTE') return 'Inventario / Vigente';
        return status;
    };

    const getStatusStyle = (status: string) => {
        if (status === 'VIGENTE') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        if (status === 'EN REPARACION') return 'bg-blue-50 text-blue-700 border border-blue-100';
        if (status === 'VENDIDO') return 'bg-slate-50 text-slate-600 border border-slate-100';
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                    <ShieldCheck size={28} className="text-white" strokeWidth={2} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Garantías y Reemplazos</h1>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">
                        Registra los reemplazos de equipos defectuosos por garantía y visualiza su trazabilidad histórica.
                    </p>
                </div>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Module */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Wrench size={18} className="text-indigo-600 animate-pulse" />
                        <h2 className="text-base font-bold text-slate-800">Registrar Reemplazo por Garantía</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Box 1: Defective */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    1. Equipo Defectuoso (Original)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={defectuosoQuery}
                                            onChange={e => {
                                                setDefectuosoQuery(e.target.value);
                                                setShowDefDropdown(true);
                                            }}
                                            onFocus={() => setShowDefDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowDefDropdown(false), 200)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearchDefectuoso()}
                                            placeholder="Escribe Serie, QR o descripción..."
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 text-xs transition-all font-mono"
                                        />
                                        
                                        {/* Dropdown list for Defective */}
                                        {showDefDropdown && defectuosoSuggestions.length > 0 && (
                                            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Coincidencias</span>
                                                    <span className="text-[9px] font-medium text-slate-400">{defectuosoSuggestions.length}</span>
                                                </div>
                                                <div className="p-1 space-y-0.5">
                                                    {defectuosoSuggestions.map((activo) => (
                                                        <button
                                                            key={activo.id}
                                                            type="button"
                                                            onClick={() => handleSelectDefectuoso(activo)}
                                                            className="w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 hover:bg-slate-50 transition-colors"
                                                        >
                                                            {/* Thumbnail */}
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                                                {activo.imagenUrl ? (
                                                                    <img src={activo.imagenUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Package size={14} className="text-slate-400" />
                                                                )}
                                                            </div>
                                                            
                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                                <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                                                                    {activo.descripcionCorta}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1 rounded">
                                                                        {activo.idQr}
                                                                    </span>
                                                                    {activo.serie && (
                                                                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded flex items-center gap-0.5">
                                                                            <Tag size={8} />
                                                                            S/N: {activo.serie}
                                                                        </span>
                                                                    )}
                                                                    <span className={`text-[9px] font-bold px-1 rounded-full ${getStatusStyle(activo.estatusContable)}`}>
                                                                        {formatStatus(activo.estatusContable)}
                                                                    </span>
                                                                    {activo.fechaVencimiento && (
                                                                        <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1 rounded flex items-center gap-0.5">
                                                                            <Calendar size={8} />
                                                                            Vence: {new Date(activo.fechaVencimiento).toLocaleDateString('es-HN')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSearchDefectuoso}
                                        disabled={isSearchingDef}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
                                    >
                                        {isSearchingDef ? <Loader2 size={12} className="animate-spin" /> : 'Buscar'}
                                    </button>
                                </div>
                            </div>

                            {/* Defective details */}
                            {defectuosoActivo ? (
                                <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-3 relative group animate-in fade-in slide-in-from-top-1 duration-200">
                                    <button 
                                        onClick={() => setDefectuosoActivo(null)}
                                        className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 transition-colors p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded">
                                            {defectuosoActivo.idQr}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusStyle(defectuosoActivo.estatusContable)}`}>
                                            {formatStatus(defectuosoActivo.estatusContable)}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 leading-tight">
                                            {defectuosoActivo.descripcionCorta}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                            Modelo: {defectuosoActivo.modelo || '—'} · S/N: <span className="font-mono text-slate-600">{defectuosoActivo.serie || '—'}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-white">
                                    <Package size={16} className="opacity-40" />
                                    <span>Busca por S/N o código QR para cargar detalles.</span>
                                </div>
                            )}
                        </div>

                        {/* Box 2: Replacement */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    2. Equipo de Reemplazo (Nuevo)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={reemplazoQuery}
                                            onChange={e => {
                                                setReemplazoQuery(e.target.value);
                                                setShowRepDropdown(true);
                                            }}
                                            onFocus={() => setShowRepDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowRepDropdown(false), 200)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearchReemplazo()}
                                            placeholder="Escribe Serie, QR o descripción..."
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 text-xs transition-all font-mono"
                                        />
                                        
                                        {/* Dropdown list for Replacement */}
                                        {showRepDropdown && reemplazoSuggestions.length > 0 && (
                                            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Coincidencias</span>
                                                    <span className="text-[9px] font-medium text-slate-400">{reemplazoSuggestions.length}</span>
                                                </div>
                                                <div className="p-1 space-y-0.5">
                                                    {reemplazoSuggestions.map((activo) => (
                                                        <button
                                                            key={activo.id}
                                                            type="button"
                                                            onClick={() => handleSelectReemplazo(activo)}
                                                            className="w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 hover:bg-slate-50 transition-colors"
                                                        >
                                                            {/* Thumbnail */}
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                                                {activo.imagenUrl ? (
                                                                    <img src={activo.imagenUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Package size={14} className="text-slate-400" />
                                                                )}
                                                            </div>
                                                            
                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                                <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                                                                    {activo.descripcionCorta}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1 rounded">
                                                                        {activo.idQr}
                                                                    </span>
                                                                    {activo.serie && (
                                                                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded flex items-center gap-0.5">
                                                                            <Tag size={8} />
                                                                            S/N: {activo.serie}
                                                                        </span>
                                                                    )}
                                                                    <span className={`text-[9px] font-bold px-1 rounded-full ${getStatusStyle(activo.estatusContable)}`}>
                                                                        {formatStatus(activo.estatusContable)}
                                                                    </span>
                                                                    {activo.fechaVencimiento && (
                                                                        <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1 rounded flex items-center gap-0.5">
                                                                            <Calendar size={8} />
                                                                            Vence: {new Date(activo.fechaVencimiento).toLocaleDateString('es-HN')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSearchReemplazo}
                                        disabled={isSearchingRep}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
                                    >
                                        {isSearchingRep ? <Loader2 size={12} className="animate-spin" /> : 'Buscar'}
                                    </button>
                                </div>
                            </div>

                            {/* Replacement details */}
                            {reemplazoActivo ? (
                                <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-3 relative group animate-in fade-in slide-in-from-top-1 duration-200">
                                    <button 
                                        onClick={() => setReemplazoActivo(null)}
                                        className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 transition-colors p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
                                            {reemplazoActivo.idQr}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusStyle(reemplazoActivo.estatusContable)}`}>
                                            {formatStatus(reemplazoActivo.estatusContable)}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 leading-tight">
                                            {reemplazoActivo.descripcionCorta}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                            Modelo: {reemplazoActivo.modelo || '—'} · S/N: <span className="font-mono text-slate-600">{reemplazoActivo.serie || '—'}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-white">
                                    <Package size={16} className="opacity-40" />
                                    <span>Busca por S/N o código QR para cargar detalles.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Explicación / Motivo */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                            3. Hallazgos o Explicación del Cambio
                        </label>
                        <textarea
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                            rows={3}
                            placeholder="Detalla lo sucedido con el equipo malo (ej: 'El UPS se apagaba a los 5 minutos de corte eléctrico por batería hinchada') e instrucciones especiales..."
                            className="w-full text-xs border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none placeholder:text-slate-300 text-slate-700 whitespace-pre-wrap"
                        />
                    </div>

                    {/* Action button */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleConfirmReplacement}
                            disabled={isPending || !defectuosoActivo || !reemplazoActivo || !motivo.trim()}
                            className={`flex items-center justify-center gap-2 px-6 py-3.5 text-white rounded-2xl font-bold text-xs shadow-md transition-all ${
                                isPending || !defectuosoActivo || !reemplazoActivo || !motivo.trim()
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={14} />
                                    Confirmar Reemplazo por Garantía
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Audit side card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Clock size={16} className="text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-800">¿Cómo funciona?</h3>
                    </div>
                    <div className="text-xs text-slate-500 space-y-4 leading-relaxed">
                        <div className="flex gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-bold text-[10px] shrink-0">1</span>
                            <p>
                                El **Equipo Defectuoso** se retira de la posesión del cliente y su estatus cambia a **"En Reparación"**. Esto previene que vuelva a ser facturado o alquilado.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] shrink-0">2</span>
                            <p>
                                El **Equipo de Reemplazo** sale del almacén y su estatus cambia a **"Vendido"** para asociarlo a la cuenta del cliente en sustitución del malo.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[10px] shrink-0">3</span>
                            <p>
                                Se guardan de forma segura los **motivos y detalles** de la transacción en la bitácora auditora para control de marcas y lotes.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold text-[10px] shrink-0">4</span>
                            <p>
                                Cuando el técnico solucione la falla, podrá buscar el equipo malo en el inventario y cambiar su estatus a **"Vigente"** documentando la solución.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-indigo-600" />
                        <span className="text-sm font-bold text-slate-700">Bitácora de Trazabilidad e Historial</span>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full font-mono">
                        {logs.length} registros
                    </span>
                </div>

                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                            <Clock size={20} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-semibold text-xs">No hay movimientos registrados en la bitácora.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Los cambios de estado aparecerán aquí automáticamente.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código QR</th>
                                    <th className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo</th>
                                    <th className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No. Serie</th>
                                    <th className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Estado Ant.</th>
                                    <th className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Estado Nuevo</th>
                                    <th className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Explicación / Detalle</th>
                                    <th className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modificado Por</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold text-[10px]">
                                                {log.idQr}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-semibold text-slate-800 max-w-[200px] truncate" title={log.descripcion}>
                                            {log.descripcion}
                                        </td>
                                        <td className="px-4 py-4 text-xs font-mono text-slate-500 font-semibold">
                                            {log.serie}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusStyle(log.estadoAnterior)}`}>
                                                {formatStatus(log.estadoAnterior)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusStyle(log.estadoNuevo)}`}>
                                                {formatStatus(log.estadoNuevo)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-xs text-slate-600 leading-relaxed max-w-[320px] whitespace-pre-wrap break-words">
                                            {log.motivo}
                                        </td>
                                        <td className="px-4 py-4 text-xs font-medium text-slate-700 flex items-center gap-1.5 mt-1.5">
                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center"><User size={10} className="text-slate-400" /></div>
                                            {log.usuario}
                                        </td>
                                        <td className="px-6 py-4 text-right text-[10px] font-semibold text-slate-400 font-mono whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString('es-HN', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ================= MODAL: FIRMA DIGITAL DEL CLIENTE ================= */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
                    <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <PenTool size={16} className="text-indigo-600" />
                                Firma Digital del Cliente
                            </h3>
                            <button 
                                onClick={() => {
                                    setShowSignatureModal(false);
                                    setSignerName('');
                                    setHasDrawn(false);
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            Por favor solicita al cliente que dibuje su firma de recibido en el recuadro inferior, o escribe su nombre y haz clic en **Saltar Firma** para registrar verbalmente.
                        </p>

                        <div className="space-y-4 flex-1">
                            {/* Input Nombre */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Receptor / Cliente</label>
                                <input
                                    type="text"
                                    value={signerName}
                                    onChange={e => setSignerName(e.target.value)}
                                    placeholder="Nombre completo..."
                                    className="w-full text-xs border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 font-semibold"
                                />
                            </div>

                            {/* Canvas Recuadro */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-end">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firma sobre la línea</label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            sigCanvas.current?.clear();
                                            setHasDrawn(false);
                                        }}
                                        className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 bg-indigo-50 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors"
                                    >
                                        <RotateCcw size={10} />
                                        Limpiar
                                    </button>
                                </div>
                                <div className="border border-dashed border-slate-300 rounded-2xl bg-slate-50/50 h-40 relative touch-none overflow-hidden">
                                    <SignatureCanvas 
                                        ref={sigCanvas}
                                        penColor="#0600c2"
                                        canvasProps={{
                                            className: 'w-full h-full cursor-crosshair touch-none'
                                        }}
                                        onBegin={() => setHasDrawn(true)}
                                    />
                                    {!hasDrawn && (
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                                            <span className="font-serif italic text-xs text-slate-400">Dibuja la firma aquí</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col gap-2 mt-6">
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={async () => {
                                    if (!hasDrawn || sigCanvas.current?.isEmpty()) {
                                        toast.error('Por favor dibuja una firma para registrarla.');
                                        return;
                                    }
                                    if (!signerName.trim()) {
                                        toast.error('Por favor escribe el nombre de quien recibe.');
                                        return;
                                    }
                                    const canvas = sigCanvas.current;
                                    if (!canvas) return;
                                    const dataUrl = canvas.getTrimmedCanvas().toDataURL('image/png');
                                    await executeReplacement(dataUrl, signerName.trim());
                                }}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1"
                            >
                                {isPending ? <Loader2 size={12} className="animate-spin" /> : <PenTool size={12} />}
                                Aceptar y Firmar Reemplazo
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => {
                                        // Skip signature: pass nulls
                                        executeReplacement(null, signerName.trim() || 'Firma Omitida');
                                    }}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                >
                                    Saltar / Omitir Firma
                                </button>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => {
                                        setShowSignatureModal(false);
                                        setSignerName('');
                                        setHasDrawn(false);
                                    }}
                                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL: ÉXITO Y DESCARGA DE COMPROBANTE ================= */}
            {replacementResult && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center animate-in fade-in p-4 print:hidden">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/50">
                            <CheckCircle2 size={28} className="stroke-[2] text-emerald-600" />
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-900 text-center mb-2 tracking-tight">¡Reemplazo Procesado!</h3>
                        <p className="text-xs text-slate-500 text-center mb-6 font-medium px-4 leading-relaxed">
                            El cambio físico del activo ha sido registrado en el inventario y guardado en la bitácora auditora exitosamente.
                        </p>
                        
                        <div className="flex flex-col gap-2.5 w-full">
                            <button
                                onClick={() => window.print()}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-md bg-slate-900 text-white hover:bg-slate-800 text-xs"
                            >
                                <Printer size={14} />
                                Imprimir / Descargar Comprobante Físico
                            </button>
                            <button
                                onClick={handleCloseSuccess}
                                className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                            >
                                Cerrar y Volver
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= COMPONENTE IMPRIMIBLE OCULTO (SOLO PRINT) ================= */}
            {replacementResult && (
                <div className="hidden print:block bg-white text-black p-8 font-sans w-full max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 font-sans">
                        <div>
                            {replacementResult.org?.logoUrl ? (
                                <img src={replacementResult.org.logoUrl} alt="Logo" className="max-h-16 max-w-[200px] object-contain mb-2" />
                            ) : (
                                <h2 className="text-xl font-black tracking-tight">{replacementResult.org?.name || 'BIOELECTRÓNICA'}</h2>
                            )}
                            <p className="text-[10px] font-semibold text-slate-700 max-w-sm mt-1 leading-relaxed whitespace-pre-line">
                                {replacementResult.org?.direccion || 'Honduras'}
                            </p>
                            {replacementResult.org?.telefono && (
                                <p className="text-[10px] font-semibold text-slate-700 mt-0.5">Tel: {replacementResult.org.telefono}</p>
                            )}
                            {replacementResult.org?.rtn && (
                                <p className="text-[10px] font-semibold text-slate-700">RTN: {replacementResult.org.rtn}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <h1 className="text-base font-black tracking-wider text-slate-950 uppercase">COMPROBANTE DE REEMPLAZO</h1>
                            <p className="text-[9px] font-bold text-slate-500 tracking-widest mt-1">SOPORTE POR GARANTÍA</p>
                            <div className="mt-4 bg-slate-50 border border-slate-200 p-2 rounded-xl text-left inline-block">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Fecha de Emisión</p>
                                <p className="text-[10px] font-mono font-bold text-slate-800">
                                    {new Date(replacementResult.fecha).toLocaleString('es-HN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Comparación de Equipos */}
                    <div className="grid grid-cols-2 gap-8 pt-4">
                        {/* Defectuoso */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                            <h3 className="text-[11px] font-bold text-red-600 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">
                                1. Equipo Devuelto (Defectuoso)
                            </h3>
                            <div className="space-y-1.5 text-[10px]">
                                <p><span className="font-bold text-slate-500">Descripción:</span> {replacementResult.defectuoso.descripcionCorta}</p>
                                <p><span className="font-bold text-slate-500">Marca/Modelo:</span> {replacementResult.defectuoso.marca} · {replacementResult.defectuoso.modelo}</p>
                                <p><span className="font-bold text-slate-500">Número de Serie:</span> <span className="font-mono font-bold text-slate-800">{replacementResult.defectuoso.serie}</span></p>
                                <p><span className="font-bold text-slate-500">Código QR:</span> <span className="font-mono font-bold text-slate-800">{replacementResult.defectuoso.idQr}</span></p>
                            </div>
                        </div>

                        {/* Reemplazo */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                            <h3 className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">
                                2. Equipo Entregado (Reemplazo)
                            </h3>
                            <div className="space-y-1.5 text-[10px]">
                                <p><span className="font-bold text-slate-500">Descripción:</span> {replacementResult.reemplazo.descripcionCorta}</p>
                                <p><span className="font-bold text-slate-500">Marca/Modelo:</span> {replacementResult.reemplazo.marca} · {replacementResult.reemplazo.modelo}</p>
                                <p><span className="font-bold text-slate-500">Número de Serie:</span> <span className="font-mono font-bold text-slate-800">{replacementResult.reemplazo.serie}</span></p>
                                <p><span className="font-bold text-slate-500">Código QR:</span> <span className="font-mono font-bold text-slate-800">{replacementResult.reemplazo.idQr}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Motivo de Garantía */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-2">
                            Reporte Técnico / Motivo de Garantía
                        </h3>
                        <p className="text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {replacementResult.motivo}
                        </p>
                    </div>

                    {/* Declaración */}
                    <div className="text-[9px] text-slate-500 border border-slate-200 p-3 rounded-xl bg-slate-50/30 leading-relaxed text-center font-sans">
                        Este comprobante deja constancia del cambio físico de equipo por concepto de garantía. El cliente declara recibir el equipo de reemplazo de entera conformidad y en perfectas condiciones de operación.
                    </div>

                    {/* Firmas */}
                    <div className="grid grid-cols-2 gap-16 pt-16">
                        {/* Firma Técnico */}
                        <div className="text-center border-t border-slate-400 pt-3">
                            <p className="text-xs font-bold text-slate-800 font-sans">Firma del Técnico</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-semibold">Técnico Autorizado</p>
                        </div>

                        {/* Firma Cliente */}
                        <div className="text-center flex flex-col items-center">
                            <div className="h-16 flex items-end justify-center mb-1">
                                {replacementResult.firmaBase64 ? (
                                    <img src={replacementResult.firmaBase64} alt="Firma Cliente" className="max-h-16 object-contain" />
                                ) : (
                                    <span className="text-[9px] italic text-slate-400 pb-2">(Firma Omitida / Autorización Verbal)</span>
                                )}
                            </div>
                            <div className="w-full border-t border-slate-400 pt-3">
                                <p className="text-xs font-bold text-slate-800 font-sans">{replacementResult.firmaNombre || 'Firma de Recibido'}</p>
                                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Cliente / Receptor</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
