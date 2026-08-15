'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    ItemTomaFisica, 
    conciliarTomaFisica 
} from './actions';
import { 
    ArrowLeft, 
    Search, 
    CheckCircle2, 
    AlertTriangle, 
    RotateCcw, 
    Copy, 
    Save, 
    Filter, 
    Sparkles,
    Loader2,
    Calendar,
    UserCheck,
    Package,
    TrendingDown,
    TrendingUp,
    Check
} from 'lucide-react';

interface TomaFisicaClientProps {
    initialItems: ItemTomaFisica[];
    usuarioNombre: string;
}

export default function TomaFisicaClient({ initialItems, usuarioNombre }: TomaFisicaClientProps) {
    // State for counted quantities (map of item.id -> number | null)
    const [conteos, setConteos] = useState<Record<string, number | null>>(() => {
        const initial: Record<string, number | null> = {};
        initialItems.forEach(item => {
            initial[item.id] = null; // null means not counted yet
        });
        return initial;
    });

    // Filters
    const [search, setSearch] = useState('');
    const [selectedArea, setSelectedArea] = useState('TODAS');
    const [selectedCategory, setSelectedCategory] = useState('TODAS');
    const [filterDiscrepancy, setFilterDiscrepancy] = useState<'TODOS' | 'SOLO_DESCUADRADOS' | 'SOLO_CONTADOS'>('TODOS');

    // UI & Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const [motivoNotas, setMotivoNotas] = useState('');

    const fechaHoy = new Date().toLocaleDateString('es-HN', {
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

    // KPI Metrics
    const metrics = useMemo(() => {
        let totalCounted = 0;
        let totalDiferencia = 0;
        let totalFaltantes = 0;
        let totalSobrantes = 0;
        let costoImpacto = 0;

        initialItems.forEach(item => {
            const count = conteos[item.id];
            if (count !== null) {
                totalCounted++;
                const diff = count - item.stockSistema;
                totalDiferencia += diff;
                if (diff < 0) totalFaltantes += Math.abs(diff);
                if (diff > 0) totalSobrantes += diff;
                costoImpacto += (diff * item.costoAdq);
            }
        });

        return {
            totalItems: initialItems.length,
            totalCounted,
            totalDiferencia,
            totalFaltantes,
            totalSobrantes,
            costoImpacto
        };
    }, [initialItems, conteos]);

    // Handlers to update counts
    const handleSetCount = (id: string, val: number | null) => {
        setConteos(prev => ({
            ...prev,
            [id]: val === null ? null : Math.max(0, val)
        }));
    };

    const handleStepCount = (id: string, currentVal: number | null, step: number, systemVal: number) => {
        const base = currentVal !== null ? currentVal : systemVal;
        const next = Math.max(0, base + step);
        handleSetCount(id, next);
    };

    // Bulk Actions
    const handleCopiarStockSistema = () => {
        const next: Record<string, number | null> = {};
        filteredItems.forEach(item => {
            next[item.id] = item.stockSistema;
        });
        setConteos(prev => ({ ...prev, ...next }));
    };

    const handleLimpiarConteo = () => {
        const next: Record<string, number | null> = {};
        filteredItems.forEach(item => {
            next[item.id] = null;
        });
        setConteos(prev => ({ ...prev, ...next }));
    };

    // Submit handler
    const handleSubmitConciliacion = async () => {
        const toSubmit = initialItems
            .filter(item => conteos[item.id] !== null)
            .map(item => ({
                id: item.id,
                stockConfeccion: conteos[item.id] as number,
                diferencia: (conteos[item.id] as number) - item.stockSistema
            }));

        if (toSubmit.length === 0) {
            alert('Por favor ingresa el conteo de al menos 1 producto antes de conciliar.');
            return;
        }

        const confirmMsg = `¿Confirmas aplicar la conciliación de ${toSubmit.length} productos?\nEsto actualizará el inventario disponible en la base de datos ERP.`;
        if (!confirm(confirmMsg)) return;

        setIsSubmitting(true);
        setSubmitSuccess(null);

        const res = await conciliarTomaFisica(toSubmit, motivoNotas);
        setIsSubmitting(false);

        if (res.success) {
            setSubmitSuccess(`¡Conciliación aplicada con éxito! Se ajustaron ${res.totalAjustados} productos (${res.totalFaltantes} faltantes, ${res.totalSobrantes} sobrantes).`);
        } else {
            alert(res.error || 'Ocurrió un error al conciliar la toma física.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
            {/* ── HEADER DE NAVEGACIÓN ── */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 lg:px-8 py-3.5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/inventario" 
                            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition active:scale-95 cursor-pointer"
                            title="Volver a Inventario"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider">
                                    Módulo Auditoría Tablet
                                </span>
                                <span className="text-xs text-slate-400 font-medium hidden sm:inline">| Paraíso Floral</span>
                            </div>
                            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                                Toma de Inventario Físico (Auditoría Kardex)
                            </h1>
                        </div>
                    </div>

                    {/* Metadata Pill */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-600 bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-[#0500A3]" />
                            <span>Auditor: <strong className="text-slate-900">{usuarioNombre}</strong></span>
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

                {/* ── ALERTA ÉXITO DE CONCILIACIÓN ── */}
                {submitSuccess && (
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 shrink-0" />
                            <div>
                                <h3 className="font-bold text-sm sm:text-base">¡Conciliación Completada!</h3>
                                <p className="text-xs sm:text-sm text-emerald-100">{submitSuccess}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSubmitSuccess(null)}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                            Entendido
                        </button>
                    </div>
                )}

                {/* ── METRICAS / KPIS FLOTANTES ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
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

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
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

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impacto Costo</p>
                            <p className={`text-xl sm:text-2xl font-black ${
                                metrics.costoImpacto < 0 ? 'text-rose-600' : metrics.costoImpacto > 0 ? 'text-emerald-600' : 'text-slate-800'
                            }`}>
                                L {Math.abs(metrics.costoImpacto).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── BARRA DE CONTROLES, FILTROS Y BOTONES MÓVILES ── */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Buscador de Alto Impacto */}
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

                        {/* Selectores de Filtro */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
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
                            <button
                                type="button"
                                onClick={handleCopiarStockSistema}
                                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
                                title="Pre-llenar con la cantidad teórica del Kardex"
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
                        </div>

                        {/* Botón de Conciliación Principal */}
                        <button
                            type="button"
                            onClick={handleSubmitConciliacion}
                            disabled={isSubmitting || metrics.totalCounted === 0}
                            className={`px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2.5 shadow-md transition active:scale-95 cursor-pointer ${
                                isSubmitting || metrics.totalCounted === 0
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                    : 'bg-[#0500A3] hover:bg-indigo-900 text-white shadow-indigo-950/20'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Ajustando Kardex...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>Aprobar y Ajustar Kardex ({metrics.totalCounted})</span>
                                </>
                            )}
                        </button>
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

                                                {/* STOCK KARDEX (Teórico en Sistema) */}
                                                <td className="py-4 px-4 text-center bg-slate-50 font-mono text-base font-black text-slate-700 border-x border-slate-200/60">
                                                    {item.stockSistema} <span className="text-xs font-normal text-slate-400">paq</span>
                                                </td>

                                                {/* P. NUEVO (Conteo Físico Real - BOTONERA TÁCTIL) */}
                                                <td className="py-4 px-6 text-center bg-pink-50/50 border-x border-pink-200/60">
                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                                        {/* Botón Restar -1 */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStepCount(item.id, count, -1, item.stockSistema)}
                                                            className="w-11 h-11 rounded-xl bg-white border border-slate-300 text-slate-800 font-black text-lg hover:bg-slate-100 active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
                                                            title="Restar 1"
                                                        >
                                                            -1
                                                        </button>

                                                        {/* Input Numérico Amplio */}
                                                        <input 
                                                            type="number"
                                                            min="0"
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
                                                            }`}
                                                        />

                                                        {/* Botón Sumar +1 */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStepCount(item.id, count, 1, item.stockSistema)}
                                                            className="w-11 h-11 rounded-xl bg-pink-600 text-white font-black text-lg hover:bg-pink-700 active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
                                                            title="Sumar 1"
                                                        >
                                                            +1
                                                        </button>

                                                        {/* Botón Atajo +5 */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStepCount(item.id, count, 5, item.stockSistema)}
                                                            className="w-10 h-11 rounded-xl bg-pink-100 border border-pink-200 text-pink-700 font-bold text-xs hover:bg-pink-200 active:scale-95 flex items-center justify-center shrink-0 cursor-pointer hidden sm:flex"
                                                            title="Sumar 5"
                                                        >
                                                            +5
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* DIFERENCIA (Variancia Badge) */}
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
