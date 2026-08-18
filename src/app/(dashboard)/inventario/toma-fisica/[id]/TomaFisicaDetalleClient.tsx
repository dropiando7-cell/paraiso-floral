'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    ItemTomaFisica, 
    guardarProgresoTomaFisica,
    enviarARevisionTomaFisica,
    aprobarTomaFisica,
    deshacerTomaFisica
} from '../actions';
import { 
    ArrowLeft, 
    Search, 
    CheckCircle2, 
    AlertTriangle, 
    RotateCcw, 
    Copy, 
    Save, 
    Filter, 
    Loader2,
    Calendar,
    UserCheck,
    Package,
    TrendingDown,
    TrendingUp,
    Check,
    X,
    Undo2
} from 'lucide-react';

interface AuditHeader {
    id: string;
    correlativo: string;
    estado: string;
    notas: string | null;
    createdAt: Date;
    creadoPor: string;
    aprobadoPor: string | null;
}

interface TomaFisicaDetalleClientProps {
    initialItems: ItemTomaFisica[];
    auditoria: AuditHeader;
    usuarioNombre: string;
    isAdmin: boolean;
}

export default function TomaFisicaDetalleClient({ 
    initialItems, 
    auditoria, 
    usuarioNombre, 
    isAdmin 
}: TomaFisicaDetalleClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // State for counted quantities (map of item.id -> number | null)
    const [conteos, setConteos] = useState<Record<string, number | null>>(() => {
        const initial: Record<string, number | null> = {};
        initialItems.forEach(item => {
            initial[item.id] = item.conteoFisico; // loaded from DB
        });
        return initial;
    });

    // Filters
    const [search, setSearch] = useState('');
    const [selectedArea, setSelectedArea] = useState('TODAS');
    const [selectedCategory, setSelectedCategory] = useState('TODAS');
    const [filterDiscrepancy, setFilterDiscrepancy] = useState<'TODOS' | 'SOLO_DESCUADRADOS' | 'SOLO_CONTADOS'>('TODOS');

    // UI state
    const [motivoNotas, setMotivoNotas] = useState('');
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const fechaHoy = new Date(auditoria.createdAt).toLocaleDateString('es-HN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Get unique Areas and Categories for filter dropdowns
    const areas = useMemo(() => {
        const set = new Set(initialItems.map(i => i.area));
        return ['TODAS', ...Array.from(set)];
    }, [initialItems]);

    const categorias = useMemo(() => {
        const set = new Set(initialItems.map(i => i.categoriaNombre));
        return ['TODAS', ...Array.from(set)];
    }, [initialItems]);

    // Filter items
    const filteredItems = useMemo(() => {
        return initialItems.filter(item => {
            if (selectedArea !== 'TODAS' && item.area !== selectedArea) return false;
            if (selectedCategory !== 'TODAS' && item.categoriaNombre !== selectedCategory) return false;

            if (search.trim()) {
                const query = search.toLowerCase();
                const matchName = item.descripcionCorta.toLowerCase().includes(query);
                const matchQr = item.idQr.toLowerCase().includes(query);
                if (!matchName && !matchQr) return false;
            }

            const conteo = conteos[item.id];
            const isCounted = conteo !== null;
            const diff = isCounted ? (conteo - item.stockSistema) : 0;

            if (filterDiscrepancy === 'SOLO_DESCUADRADOS' && (!isCounted || diff === 0)) return false;
            if (filterDiscrepancy === 'SOLO_CONTADOS' && !isCounted) return false;

            return true;
        });
    }, [initialItems, selectedArea, selectedCategory, search, filterDiscrepancy, conteos]);

    // KPI Metrics (Value/Cost completely removed)
    const metrics = useMemo(() => {
        let totalCounted = 0;
        let totalDiferencia = 0;
        let totalFaltantes = 0;
        let totalSobrantes = 0;

        initialItems.forEach(item => {
            const count = conteos[item.id];
            if (count !== null) {
                totalCounted++;
                const diff = count - item.stockSistema;
                totalDiferencia += diff;
                if (diff < 0) totalFaltantes += Math.abs(diff);
                if (diff > 0) totalSobrantes += diff;
            }
        });

        return {
            totalItems: initialItems.length,
            totalCounted,
            totalDiferencia,
            totalFaltantes,
            totalSobrantes
        };
    }, [initialItems, conteos]);

    // Handlers to update counts
    const handleSetCount = (id: string, val: number | null) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        setConteos(prev => ({
            ...prev,
            [id]: val === null ? null : Math.max(0, val)
        }));
    };

    const handleStepCount = (id: string, currentVal: number | null, step: number, systemVal: number) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const base = currentVal !== null ? currentVal : systemVal;
        const next = Math.max(0, base + step);
        handleSetCount(id, next);
    };

    // Bulk Actions
    const handleCopiarStockSistema = () => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const next: Record<string, number | null> = {};
        filteredItems.forEach(item => {
            next[item.id] = item.stockSistema;
        });
        setConteos(prev => ({ ...prev, ...next }));
    };

    const handleLimpiarConteo = () => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const next: Record<string, number | null> = {};
        filteredItems.forEach(item => {
            next[item.id] = null;
        });
        setConteos(prev => ({ ...prev, ...next }));
    };

    // 1. Action: Save Progress
    const handleGuardarProgreso = () => {
        setActionError(null);
        setActionSuccess(null);

        const conteosArray = Object.keys(conteos).map(id => ({
            id,
            conteo: conteos[id]
        }));

        startTransition(async () => {
            const res = await guardarProgresoTomaFisica(auditoria.id, conteosArray);
            if (res.success) {
                setActionSuccess('¡Progreso de conteo guardado con éxito!');
                router.refresh();
            } else {
                setActionError(res.error || 'Error al guardar progreso.');
            }
        });
    };

    // 2. Action: Submit for Review
    const handleEnviarARevision = () => {
        setActionError(null);
        setActionSuccess(null);

        const conteosArray = Object.keys(conteos).map(id => ({
            id,
            conteo: conteos[id]
        }));

        const contadosCount = conteosArray.filter(c => c.conteo !== null).length;
        if (contadosCount === 0) {
            alert('Por favor ingresa el conteo de al menos 1 producto antes de enviar a revisión.');
            return;
        }

        const confirmMsg = `¿Confirmas enviar a revisión esta toma con ${contadosCount} productos contados?\nEl conteo quedará bloqueado y listo para aprobación de administración.`;
        if (!confirm(confirmMsg)) return;

        startTransition(async () => {
            // First save progress
            const saveRes = await guardarProgresoTomaFisica(auditoria.id, conteosArray);
            if (!saveRes.success) {
                setActionError(saveRes.error || 'Error al guardar progreso antes de enviar.');
                return;
            }

            // Then submit
            const res = await enviarARevisionTomaFisica(auditoria.id);
            if (res.success) {
                router.push('/inventario/toma-fisica');
            } else {
                setActionError(res.error || 'Error al enviar a revisión.');
            }
        });
    };

    // 3. Action: Approve Audit (Admin Only)
    const handleAprobarAuditoria = () => {
        setActionError(null);
        setActionSuccess(null);

        const conteosArray = Object.keys(conteos).map(id => ({
            id,
            conteo: conteos[id]
        }));

        const contadosCount = conteosArray.filter(c => c.conteo !== null).length;

        const confirmMsg = `¿Confirmas aprobar esta auditoría (${contadosCount} items)?\nEsto aplicará el ajuste contable final y actualizará el stock disponible en el Kardex.`;
        if (!confirm(confirmMsg)) return;

        startTransition(async () => {
            // First save progress if it was in CONTEO state
            if (auditoria.estado === 'CONTEO') {
                const saveRes = await guardarProgresoTomaFisica(auditoria.id, conteosArray);
                if (!saveRes.success) {
                    setActionError(saveRes.error || 'Error al guardar progreso antes de aprobar.');
                    return;
                }
            }

            const res = await aprobarTomaFisica(auditoria.id, motivoNotas);
            if (res.success) {
                router.push('/inventario/toma-fisica');
            } else {
                setActionError(res.error || 'Error al aprobar la auditoría.');
            }
        });
    };

    // 4. Action: Undo Audit (Admin Only)
    const handleDeshacerAuditoria = () => {
        setActionError(null);
        setActionSuccess(null);

        const confirmMsg = `⚠️ ¡ATENCIÓN! ¿Estás seguro de deshacer este ajuste de inventario?\nEsto restaurará el stock teórico anterior en el Kardex y anulará esta auditoría de forma permanente.`;
        if (!confirm(confirmMsg)) return;

        startTransition(async () => {
            const res = await deshacerTomaFisica(auditoria.id);
            if (res.success) {
                router.push('/inventario/toma-fisica');
            } else {
                setActionError(res.error || 'Error al revertir la auditoría.');
            }
        });
    };

    const isEditable = auditoria.estado === 'CONTEO' || auditoria.estado === 'PENDIENTE_APROBACION';

    const getEstadoHeaderPill = () => {
        switch (auditoria.estado) {
            case 'CONTEO':
                return 'bg-blue-100 text-blue-700';
            case 'PENDIENTE_APROBACION':
                return 'bg-amber-100 text-amber-700';
            case 'APROBADA':
                return 'bg-emerald-100 text-emerald-700';
            case 'ANULADA':
                return 'bg-rose-100 text-rose-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
            {/* ── HEADER DE NAVEGACIÓN ── */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 lg:px-8 py-3.5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/inventario/toma-fisica" 
                            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition active:scale-95 cursor-pointer"
                            title="Volver a Auditorías"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getEstadoHeaderPill()}`}>
                                    Toma {auditoria.correlativo} ({auditoria.estado})
                                </span>
                                <span className="text-xs text-slate-400 font-medium hidden sm:inline">| Paraíso Floral</span>
                            </div>
                            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                                Auditoría de Inventario Físico
                            </h1>
                        </div>
                    </div>

                    {/* Metadata Pill */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-600 bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-[#0500A3]" />
                            <span>Auditor: <strong className="text-slate-900">{auditoria.creadoPor}</strong></span>
                        </div>
                        <div className="w-px h-4 bg-slate-300 hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="capitalize">{fechaHoy}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">

                {/* ── MENSAJES DE ALERTA ÉXITO / ERROR ── */}
                {actionSuccess && (
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-bold">{actionSuccess}</p>
                        </div>
                        <button 
                            onClick={() => setActionSuccess(null)}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                            Entendido
                        </button>
                    </div>
                )}

                {actionError && (
                    <div className="bg-rose-500 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-bold">{actionError}</p>
                        </div>
                        <button 
                            onClick={() => setActionError(null)}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                            Cerrar
                        </button>
                    </div>
                )}

                {/* ── METRICAS / KPIS FLOTANTES (IMPACTO COSTO COMPLETAMENTE REMOVIDO) ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Variedades</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-900">
                                {metrics.totalCounted} <span className="text-xs font-normal text-slate-400">/ {metrics.totalItems}</span>
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            metrics.totalDiferencia === 0 
                                ? 'bg-slate-100 text-slate-600' 
                                : metrics.totalDiferencia < 0 
                                    ? 'bg-rose-50 text-rose-600' 
                                    : 'bg-emerald-50 text-emerald-600'
                        }`}>
                            {metrics.totalDiferencia < 0 ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ajuste Kardex Total</p>
                            <p className={`text-xl sm:text-2xl font-black ${
                                metrics.totalDiferencia === 0 ? 'text-slate-700' : metrics.totalDiferencia < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                                {metrics.totalDiferencia > 0 ? `+${metrics.totalDiferencia}` : metrics.totalDiferencia}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 col-span-2 md:col-span-1">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Faltantes</p>
                            <p className="text-xl sm:text-2xl font-black text-rose-600">
                                {metrics.totalFaltantes} <span className="text-xs font-medium text-slate-400">paq.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── BARRA DE CONTROLES, FILTROS Y BOTONERAS ── */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Buscador */}
                        <div className="relative flex-1 min-w-[260px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="🔍 Buscar por variedad de flor o código QR..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0500A3] transition-all"
                            />
                        </div>

                        {/* Filtros dropdown */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                                <span>Cámara:</span>
                                <select 
                                    value={selectedArea}
                                    onChange={(e) => setSelectedArea(e.target.value)}
                                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    {areas.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                                <span>Categoría:</span>
                                <select 
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    {categorias.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                                <span>Ver:</span>
                                <select 
                                    value={filterDiscrepancy}
                                    onChange={(e) => setFilterDiscrepancy(e.target.value as any)}
                                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    <option value="TODOS">Todos los ítems</option>
                                    <option value="SOLO_DESCUADRADOS">Solo Descuadrados ⚠️</option>
                                    <option value="SOLO_CONTADOS">Solo Contados ✅</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Botonera de Acciones Táctiles Rápida */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {isEditable && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCopiarStockSistema}
                                        className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
                                    >
                                        <Copy className="w-4 h-4" />
                                        <span>Copiar Stock Kardex</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleLimpiarConteo}
                                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Resetear Conteo</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Botones de acción principales según estado y rol */}
                        <div className="flex items-center gap-2">
                            {/* Actions for CONTEO / PENDIENTE (Editable) */}
                            {isEditable && (
                                <>
                                    <button
                                        onClick={handleGuardarProgreso}
                                        disabled={isPending}
                                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>Guardar Progreso</span>
                                    </button>

                                    {/* Helper triggers Submit to Review */}
                                    <button
                                        onClick={handleEnviarARevision}
                                        disabled={isPending}
                                        className="px-4 py-2.5 bg-[#0500A3] hover:bg-indigo-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Enviar a Revisión</span>
                                    </button>

                                    {/* Admin triggers direct Approval */}
                                    {isAdmin && (
                                        <button
                                            onClick={handleAprobarAuditoria}
                                            disabled={isPending || metrics.totalCounted === 0}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-700/10 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                        >
                                            {isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            <span>Aprobar y Ajustar Kardex ({metrics.totalCounted})</span>
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Undo Action (Only for APROBADA state and ADMINS) */}
                            {auditoria.estado === 'APROBADA' && isAdmin && (
                                <button
                                    onClick={handleDeshacerAuditoria}
                                    disabled={isPending}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Undo2 className="w-4 h-4" />
                                    )}
                                    <span>Deshacer Ajuste (Revertir)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── TABLA MATRIZ TÁCTIL (STOCK KARDEX VS CONTEO EN PISO) ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[768px]">
                            <thead>
                                <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                                    <th className="py-4 px-5 w-12 text-center">#</th>
                                    <th className="py-4 px-5">Producto / Variedad de Flor</th>
                                    <th className="py-4 px-4 text-center bg-slate-800">
                                        STOCK KARDEX <br />
                                        <span className="text-[10px] text-slate-300 font-medium uppercase">(Teórico en Sistema)</span>
                                    </th>
                                    <th className="py-4 px-6 text-center bg-pink-700 text-white min-w-[260px]">
                                        CONTEO EN PISO <br />
                                        <span className="text-[10px] text-pink-200 font-bold uppercase">(Inventario Físico Real)</span>
                                    </th>
                                    <th className="py-4 px-5 text-center">
                                        DIFERENCIA KARDEX <br />
                                        <span className="text-[10px] text-slate-300 font-medium uppercase">(Ajuste de Kardex)</span>
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200/80 text-sm">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p className="font-semibold text-base">No se encontraron flores con los filtros seleccionados.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, idx) => {
                                        const count = conteos[item.id];
                                        const isCounted = count !== null;
                                        const diff = isCounted ? (count - item.stockSistema) : 0;

                                        return (
                                            <tr 
                                                key={item.id}
                                                className={`transition-colors hover:bg-blue-50/40 ${
                                                    isCounted 
                                                        ? diff === 0 
                                                            ? 'bg-emerald-50/30' 
                                                            : diff < 0 
                                                                ? 'bg-rose-50/40' 
                                                                : 'bg-amber-50/40'
                                                        : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                }`}
                                            >
                                                {/* Index */}
                                                <td className="py-4 px-5 text-xs font-bold text-slate-400 text-center">
                                                    {idx + 1}
                                                </td>

                                                {/* Producto / Variedad */}
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3.5">
                                                        {item.imagenUrl ? (
                                                            <img 
                                                                src={item.imagenUrl} 
                                                                alt={item.descripcionCorta}
                                                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center font-black text-sm shrink-0">
                                                                🌸
                                                            </div>
                                                        )}

                                                        <div>
                                                            <h3 className="font-bold text-slate-900 text-base leading-tight">
                                                                {item.descripcionCorta}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
                                                                    {item.idQr}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-700">
                                                                    📍 {item.area}
                                                                </span>
                                                                <span className="text-xs text-slate-400">
                                                                    • {item.categoriaNombre}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* STOCK KARDEX */}
                                                <td className="py-4 px-4 text-center bg-slate-50 font-mono text-base font-black text-slate-700 border-x border-slate-200/60">
                                                    {item.stockSistema} <span className="text-xs font-normal text-slate-400">paq</span>
                                                </td>

                                                {/* CONTEO EN PISO (Tactil) */}
                                                <td className="py-4 px-6 text-center bg-pink-50/50 border-x border-pink-200/60">
                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                                        {/* Botón Restar -1 */}
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => handleStepCount(item.id, count, -1, item.stockSistema)}
                                                            className="w-11 h-11 rounded-xl bg-white border border-slate-300 text-slate-800 font-black text-lg hover:bg-slate-100 active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="Restar 1"
                                                        >
                                                            -1
                                                        </button>

                                                        {/* Input Numérico */}
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            disabled={!isEditable}
                                                            value={count === null ? '' : count}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                                handleSetCount(item.id, val);
                                                            }}
                                                            placeholder={item.stockSistema.toString()}
                                                            className={`w-20 sm:w-24 h-12 text-center text-lg font-black font-mono rounded-xl border-2 transition-all focus:outline-none ${
                                                                isCounted 
                                                                    ? 'bg-white border-[#0500A3] text-slate-900 shadow-sm' 
                                                                    : 'bg-white/80 border-slate-300 text-slate-500 placeholder-slate-300'
                                                            } disabled:bg-slate-100 disabled:text-slate-500`}
                                                        />

                                                        {/* Botón Sumar +1 */}
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => handleStepCount(item.id, count, 1, item.stockSistema)}
                                                            className="w-11 h-11 rounded-xl bg-pink-600 text-white font-black text-lg hover:bg-pink-700 active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="Sumar 1"
                                                        >
                                                            +1
                                                        </button>

                                                        {/* Botón Atajo +5 */}
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => handleStepCount(item.id, count, 5, item.stockSistema)}
                                                            className="w-10 h-11 rounded-xl bg-pink-100 border border-pink-200 text-pink-700 font-bold text-xs hover:bg-pink-200 active:scale-95 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hidden sm:flex"
                                                            title="Sumar 5"
                                                        >
                                                            +5
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* DIFERENCIA */}
                                                <td className="py-4 px-5 text-center">
                                                    {!isCounted ? (
                                                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-xs font-semibold">
                                                            Pendiente
                                                        </span>
                                                    ) : diff === 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                                                            <Check className="w-3.5 h-3.5" />
                                                            Cuadrado (0)
                                                        </span>
                                                    ) : diff < 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black border border-rose-200">
                                                            ⚠️ Faltan {diff} paq.
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-black border border-amber-200">
                                                            ℹ️ Sobran +{diff} paq.
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
