'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { 
    Package, 
    Calendar, 
    RefreshCw, 
    DollarSign, 
    FileText,
    Award,
    Search,
    Flame,
    Sparkles,
    ShieldAlert,
    X
} from 'lucide-react';
import { getGraficasReportData, TimeRangeType } from './actions';

interface GraficasClientProps {
    initialData: any;
    initialMonth: number;
    initialYear: number;
}

export default function GraficasClient({ initialData, initialMonth, initialYear }: GraficasClientProps) {
    const [period, setPeriod] = useState<TimeRangeType>('15d');
    const [month, setMonth] = useState(initialMonth);
    const [year, setYear] = useState(initialYear);
    const [data, setData] = useState(initialData);
    const [isPending, startTransition] = useTransition();

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'flores' | 'abastecimiento' | 'vendedores' | 'clientes' | 'tendencia'>('flores');

    // Sub-filters inside tabs
    const [flowerSortBy, setFlowerSortBy] = useState<'volumen' | 'monto'>('volumen');
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

    // Drilldown Modals
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
    const [selectedClient, setSelectedClient] = useState<any | null>(null);

    const formatLempiras = (val: number) => {
        return new Intl.NumberFormat('es-HN', {
            style: 'currency',
            currency: 'HNL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val || 0);
    };

    const formatNumber = (val: number) => {
        return new Intl.NumberFormat('es-HN').format(val || 0);
    };

    const handleRefresh = (newPeriod: TimeRangeType = period, newMonth: number = month, newYear: number = year) => {
        startTransition(async () => {
            try {
                const res = await getGraficasReportData(newPeriod, newMonth, newYear);
                setData(res);
            } catch (err) {
                console.error("Error refreshing data:", err);
            }
        });
    };

    const handlePeriodChange = (p: TimeRangeType) => {
        setPeriod(p);
        handleRefresh(p, month, year);
    };

    const {
        totalVentasMonto = 0,
        facturasCount = 0,
        ticketPromedio = 0,
        totalPaquetesVendidos = 0,
        totalVentasContado = 0,
        totalVentasCredito = 0,
        pctContado = 0,
        pctCredito = 0,
        timelineStats = [],
        topProductosPorVolumen = [],
        topProductosPorMonto = [],
        categoriasList = [],
        sugerenciasReabastecimiento = [],
        vendedoresList = [],
        clientesList = [],
        clientesParetoCount = 0,
        totalMermasUnidades = 0,
        topMermasFlores = []
    } = data || {};

    // Filtered lists based on search
    const filteredProducts = useMemo(() => {
        const list = flowerSortBy === 'volumen' ? topProductosPorVolumen : topProductosPorMonto;
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter((p: any) => p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
    }, [flowerSortBy, topProductosPorVolumen, topProductosPorMonto, searchQuery]);

    const filteredSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return sugerenciasReabastecimiento;
        const q = searchQuery.toLowerCase();
        return sugerenciasReabastecimiento.filter((p: any) => p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
    }, [sugerenciasReabastecimiento, searchQuery]);

    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return clientesList;
        const q = searchQuery.toLowerCase();
        return clientesList.filter((c: any) => c.nombre.toLowerCase().includes(q) || (c.telefono && c.telefono.includes(q)));
    }, [clientesList, searchQuery]);

    // Timeline SVG computations
    const timelineSvg = useMemo(() => {
        if (!timelineStats || timelineStats.length === 0) return null;
        const width = 850;
        const height = 240;
        const padding = { top: 30, right: 30, bottom: 40, left: 60 };
        const maxVal = Math.max(...timelineStats.map((d: any) => d.totalVentas), 1000);

        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const points = timelineStats.map((d: any, idx: number) => {
            const x = padding.left + (idx / Math.max(1, timelineStats.length - 1)) * chartW;
            const y = padding.top + chartH - (d.totalVentas / maxVal) * chartH;
            return { x, y, ...d };
        });

        const linePath = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaPath = points.length > 0 
            ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
            : '';

        return { width, height, padding, maxVal, points, linePath, areaPath };
    }, [timelineStats]);

    // Donut chart calculations for categories
    const donutData = useMemo(() => {
        const colors = ['#e11d48', '#059669', '#2563eb', '#d97706', '#7c3aed'];
        const total = categoriasList.reduce((acc: number, c: any) => acc + c.monto, 0);
        if (total === 0) return [];

        let currentOffset = 0;
        const circumference = 2 * Math.PI * 45; // r=45

        return categoriasList.map((c: any, i: number) => {
            const pct = c.monto / total;
            const dashLength = pct * circumference;
            const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += dashLength;
            return {
                ...c,
                pct: (pct * 100).toFixed(1),
                color: colors[i % colors.length],
                strokeDasharray,
                strokeDashoffset
            };
        });
    }, [categoriasList]);

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
            
            {/* ============================================================== */}
            {/* 1. HEADER EXECUTIVE BAR (DAY LIGHT STYLE) */}
            {/* ============================================================== */}
            <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-50 to-transparent rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-50 to-transparent rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                                Inteligencia de Ventas & Inventario
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                En Vivo
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            Paraíso Floral <span className="text-rose-600 font-semibold">Analytics</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                            Centro de decisiones comerciales: rotación de rosas, qué variedades pedir al proveedor, clientes clave y desempeño de vendedores.
                        </p>
                    </div>

                    {/* Period Selector (Clean Light Pills) */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => handlePeriodChange('15d')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                period === '15d'
                                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <Flame className="w-3.5 h-3.5" />
                            Últimos 15 Días
                        </button>
                        <button
                            onClick={() => handlePeriodChange('30d')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                                period === '30d'
                                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            Últimos 30 Días
                        </button>
                        <button
                            onClick={() => handlePeriodChange('month')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                period === 'month'
                                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Mes Calendario
                        </button>
                        <button
                            onClick={() => handlePeriodChange('all')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                                period === 'all'
                                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            Trimestre
                        </button>

                        <button
                            onClick={() => handleRefresh(period, month, year)}
                            disabled={isPending}
                            title="Actualizar datos"
                            className="p-2 ml-1 text-slate-500 hover:text-rose-600 hover:bg-white rounded-xl transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-rose-600' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* 2. EXECUTIVE METRIC CARDS (DAY LIGHT STYLE) */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* KPI 1: Facturación Total */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>Total Facturado</span>
                        <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                            {formatLempiras(totalVentasMonto)}
                        </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Contado: {pctContado}%
                        </span>
                        <span className="text-amber-700 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Crédito: {pctCredito}%
                        </span>
                    </div>
                </div>

                {/* KPI 2: Flores & Paquetes Vendidos */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>Paquetes Despachados</span>
                        <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                            {formatNumber(totalPaquetesVendidos)} <span className="text-base font-bold text-slate-400">paq.</span>
                        </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Precio prom./paquete:</span>
                        <span className="text-emerald-700 font-black">
                            {formatLempiras(totalPaquetesVendidos > 0 ? totalVentasMonto / totalPaquetesVendidos : 0)}
                        </span>
                    </div>
                </div>

                {/* KPI 3: Facturas & Ticket Promedio */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>Pedidos Facturados</span>
                        <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                            {formatNumber(facturasCount)} <span className="text-base font-bold text-slate-400">tickets</span>
                        </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Ticket promedio:</span>
                        <span className="text-blue-700 font-black">{formatLempiras(ticketPromedio)}</span>
                    </div>
                </div>

                {/* KPI 4: Mermas Registradas */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>Pérdida por Merma</span>
                        <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-amber-700 tracking-tight">
                            {formatNumber(totalMermasUnidades)} <span className="text-base font-bold text-slate-400">flores/paq.</span>
                        </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Ratio de descarte:</span>
                        <span className="text-amber-700 font-bold">
                            {totalPaquetesVendidos > 0 ? ((totalMermasUnidades / (totalPaquetesVendidos + totalMermasUnidades)) * 100).toFixed(1) : '0.0'}%
                        </span>
                    </div>
                </div>

            </div>

            {/* ============================================================== */}
            {/* 3. TABS NAVIGATION (DAY LIGHT STYLE) */}
            {/* ============================================================== */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 overflow-x-auto gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setActiveTab('flores'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'flores'
                                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/25'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200/60'
                        }`}
                    >
                        <span>🌹</span>
                        Rosas & Flores Estrella
                    </button>
                    <button
                        onClick={() => { setActiveTab('abastecimiento'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'abastecimiento'
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200/60'
                        }`}
                    >
                        <span>📦</span>
                        ¿Qué Pedir Más? (Compras)
                    </button>
                    <button
                        onClick={() => { setActiveTab('vendedores'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'vendedores'
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200/60'
                        }`}
                    >
                        <span>👥</span>
                        Vendedores & Rutas
                    </button>
                    <button
                        onClick={() => { setActiveTab('clientes'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'clientes'
                                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/25'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200/60'
                        }`}
                    >
                        <span>🏆</span>
                        Clientes VIP (Pareto)
                    </button>
                    <button
                        onClick={() => { setActiveTab('tendencia'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === 'tendencia'
                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200/60'
                        }`}
                    >
                        <span>📈</span>
                        Curva de Ventas Diarias
                    </button>
                </div>

                {/* Search input in Light Mode */}
                <div className="relative min-w-[220px] hidden md:block">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={`Buscar en ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 shadow-sm transition-colors"
                    />
                </div>
            </div>

            {/* ============================================================== */}
            {/* TAB 1: ROSAS & FLORES ESTRELLA (LIGHT MODE) */}
            {/* ============================================================== */}
            {activeTab === 'flores' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                    {/* Left: Varieties Ranking */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <span>🌹</span> Flores Más Vendidas
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Ordenado por preferencia de compra en floristerías
                                </p>
                            </div>
                            
                            {/* Toggle Volume vs Amount */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <button
                                    onClick={() => setFlowerSortBy('volumen')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        flowerSortBy === 'volumen'
                                            ? 'bg-white text-rose-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Por Paquetes
                                </button>
                                <button
                                    onClick={() => setFlowerSortBy('monto')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        flowerSortBy === 'monto'
                                            ? 'bg-white text-rose-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Por Monto (L.)
                                </button>
                            </div>
                        </div>

                        {/* List with Progress Bars */}
                        <div className="mt-6 space-y-3.5">
                            {filteredProducts.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm">
                                    No se encontraron variedades en este período.
                                </div>
                            ) : (
                                filteredProducts.map((p: any, idx: number) => {
                                    const maxVal = flowerSortBy === 'volumen' 
                                        ? (topProductosPorVolumen[0]?.cantidadVendida || 1)
                                        : (topProductosPorMonto[0]?.montoTotal || 1);
                                    const currentVal = flowerSortBy === 'volumen' ? p.cantidadVendida : p.montoTotal;
                                    const pct = Math.min(100, Math.max(5, (currentVal / maxVal) * 100));

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedProduct(p)}
                                            className="group p-3.5 rounded-2xl bg-slate-50/70 hover:bg-rose-50/40 border border-slate-200/80 hover:border-rose-200 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between text-xs mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] ${
                                                        idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                                        idx === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                                                        idx === 2 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                                        'bg-slate-200/70 text-slate-600'
                                                    }`}>
                                                        #{idx + 1}
                                                    </span>
                                                    <div>
                                                        <span className="font-extrabold text-sm text-slate-900 group-hover:text-rose-600 transition-colors">
                                                            {p.nombre}
                                                        </span>
                                                        <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-600 border border-slate-200">
                                                            {p.categoria}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="font-black text-sm text-slate-900">
                                                        {flowerSortBy === 'volumen' ? `${formatNumber(p.cantidadVendida)} paq.` : formatLempiras(p.montoTotal)}
                                                    </span>
                                                    <div className="text-[11px] text-slate-500">
                                                        {flowerSortBy === 'volumen' ? formatLempiras(p.montoTotal) : `${formatNumber(p.cantidadVendida)} paq.`}
                                                        {' • '}
                                                        <span className="text-emerald-700 font-bold">Prom: {formatLempiras(p.precioPromedio)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bar */}
                                            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Category Distribution Donut */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <span>🍩</span> Participación por Categoría
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Distribución de ingresos por tipo de flor
                                </p>
                            </div>

                            {/* SVG Donut */}
                            <div className="my-6 flex justify-center items-center relative">
                                <svg width="220" height="220" viewBox="0 0 120 120" className="transform -rotate-90">
                                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                                    {donutData.map((d: any, i: number) => (
                                        <circle
                                            key={i}
                                            cx="60"
                                            cy="60"
                                            r="45"
                                            fill="none"
                                            stroke={d.color}
                                            strokeWidth="14"
                                            strokeDasharray={d.strokeDasharray}
                                            strokeDashoffset={d.strokeDashoffset}
                                            className="transition-all duration-500 hover:opacity-80"
                                        />
                                    ))}
                                </svg>

                                <div className="absolute flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                                    <span className="text-sm font-black text-slate-900">{formatLempiras(totalVentasMonto).split(',')[0]}</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                {donutData.map((d: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                            <span className="text-slate-700 font-semibold">{d.categoria}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-extrabold text-slate-900">{d.pct}%</span>
                                            <span className="text-slate-400 text-[10px] ml-1.5">({formatLempiras(d.monto).split(',')[0]})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Mermas Alert Box */}
                        {topMermasFlores.length > 0 && (
                            <div className="bg-amber-50/50 rounded-3xl border border-amber-200 p-6 shadow-sm">
                                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
                                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                                    Flores con Mayor Pérdida (Merma)
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                    Variedades descartadas por marchitamiento en este período:
                                </p>
                                <div className="mt-3 space-y-2">
                                    {topMermasFlores.slice(0, 4).map((m: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-amber-200/80">
                                            <span className="text-slate-800 font-medium">{m.nombre}</span>
                                            <span className="text-amber-800 font-black">{m.cantidad} descartadas</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: ¿QUÉ PEDIR MÁS? (ABASTECIMIENTO LIGHT) */}
            {/* ============================================================== */}
            {activeTab === 'abastecimiento' && (
                <div className="space-y-6">
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-3xl p-6 sm:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-800 border border-emerald-200 mb-2">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Algoritmo de Pedido para Próximo Camión
                                </span>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                                    Sugerencia de Reabastecimiento a Proveedores
                                </h2>
                                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                                    Calculado con base en la velocidad de venta diaria (Run-Rate) de los últimos 15 días frente al stock actual. Ayuda a no quedarse sin las rosas clave y evitar sobre-comprar lo que rota lento.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                                    🔴 Crítico / Agotado
                                </span>
                                <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                                    🟡 Stock &lt; 3 días
                                </span>
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                                    🟢 Estable
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Table Light */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-extrabold border-b border-slate-200">
                                    <tr>
                                        <th className="py-4 px-6">Variedad / Flor</th>
                                        <th className="py-4 px-4 text-center">Velocidad Diaria</th>
                                        <th className="py-4 px-4 text-center">Stock Actual</th>
                                        <th className="py-4 px-4 text-center">Días de Cobertura</th>
                                        <th className="py-4 px-4 text-center">Sugerencia (Pedido 7 Días)</th>
                                        <th className="py-4 px-6 text-right">Diagnóstico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {filteredSuggestions.map((item: any, idx: number) => {
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${
                                                            item.nivelPrioridad === 'CRITICA' ? 'bg-rose-500 animate-ping' :
                                                            item.nivelPrioridad === 'ALTA' ? 'bg-amber-400' :
                                                            item.nivelPrioridad === 'MODERADA' ? 'bg-blue-400' :
                                                            item.nivelPrioridad === 'EXCESO' ? 'bg-purple-400' :
                                                            'bg-emerald-500'
                                                        }`} />
                                                        <div>
                                                            <span className="font-extrabold text-sm text-slate-900 block">
                                                                {item.nombre}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500">
                                                                {item.categoria}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 border border-slate-200">
                                                        ~{item.velocidadDiaria} paq./día
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <span className={`font-black text-sm ${item.stockActual <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                                        {item.stockActual} paq.
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                                        item.diasCobertura <= 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                                        item.diasCobertura < 3 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                        item.diasCobertura > 15 ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    }`}>
                                                        {item.diasCobertura <= 0 ? 'Sin Cobertura' : `~${item.diasCobertura} días`}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-sm">
                                                        +{item.cantidadRecomendadaPedir} paq.
                                                    </span>
                                                </td>

                                                <td className="py-4 px-6 text-right">
                                                    <span className="text-slate-600 text-xs font-semibold">
                                                        {item.sugerenciaTexto}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: VENDEDORES & RUTAS (LIGHT) */}
            {/* ============================================================== */}
            {activeTab === 'vendedores' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vendedoresList.map((v: any, idx: number) => {
                            return (
                                <div 
                                    key={idx}
                                    onClick={() => setSelectedSeller(v)}
                                    className="bg-white rounded-3xl border border-slate-200 hover:border-blue-300 p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/20">
                                                    {v.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {v.nombre}
                                                    </h3>
                                                    <span className="text-xs text-slate-500">
                                                        {v.facturasCount} pedidos despachados
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                                                #{idx + 1}
                                            </span>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Total Vendido:</span>
                                                <span className="font-black text-sm text-slate-900">{formatLempiras(v.montoTotal)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Flores / Paquetes:</span>
                                                <span className="font-bold text-slate-800">{formatNumber(v.unidadesVendidas)} paq.</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Ticket Promedio:</span>
                                                <span className="font-bold text-blue-700">{formatLempiras(v.ticketPromedio)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdown Contado vs Credito */}
                                    <div className="mt-6 pt-3 border-t border-slate-100">
                                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                                            <span className="text-emerald-700">Contado ({v.pctContado}%)</span>
                                            <span className="text-amber-700">Crédito ({(100 - v.pctContado).toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500" style={{ width: `${v.pctContado}%` }} />
                                            <div className="h-full bg-amber-500" style={{ width: `${100 - v.pctContado}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: CLIENTES VIP & PARETO (LIGHT) */}
            {/* ============================================================== */}
            {activeTab === 'clientes' && (
                <div className="space-y-6">
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-amber-800 border border-amber-200 mb-2">
                                <Award className="w-3.5 h-3.5 text-amber-600" /> Principio de Pareto (80/20)
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                                Clientes & Floristerías Estratégicas
                            </h2>
                            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                                Hay <span className="text-amber-800 font-bold">{clientesParetoCount} clientes clave</span> que generan aproximadamente el 80% de toda la facturación de Paraíso Floral.
                            </p>
                        </div>
                    </div>

                    {/* Table Light */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-extrabold border-b border-slate-200">
                                    <tr>
                                        <th className="py-4 px-6">Ranking & Cliente</th>
                                        <th className="py-4 px-4 text-center">Frecuencia</th>
                                        <th className="py-4 px-4 text-right">Total Facturado</th>
                                        <th className="py-4 px-4 text-right">Ticket Promedio</th>
                                        <th className="py-4 px-4 text-right">Saldo en Cartera</th>
                                        <th className="py-4 px-6 text-center">Categoría VIP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {filteredClients.map((c: any, idx: number) => {
                                        return (
                                            <tr 
                                                key={idx}
                                                onClick={() => setSelectedClient(c)}
                                                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            >
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px] border border-slate-200">
                                                            #{c.ranking}
                                                        </span>
                                                        <div>
                                                            <span className="font-extrabold text-sm text-slate-900 block hover:text-amber-700 transition-colors">
                                                                {c.nombre}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500">
                                                                {c.telefono || c.direccion || 'Sin contacto'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 border border-slate-200">
                                                        {c.facturasCount} pedidos
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4 text-right">
                                                    <span className="font-black text-sm text-slate-900">
                                                        {formatLempiras(c.montoTotal)}
                                                    </span>
                                                    <div className="text-[10px] text-slate-500">{c.pctDelTotal}% del total</div>
                                                </td>

                                                <td className="py-4 px-4 text-right font-bold text-slate-700">
                                                    {formatLempiras(c.ticketPromedio)}
                                                </td>

                                                <td className="py-4 px-4 text-right">
                                                    <span className={`font-bold ${c.saldoPendiente > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                                        {formatLempiras(c.saldoPendiente)}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-6 text-center">
                                                    {c.esPareto80 ? (
                                                        <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                                            ⭐ VIP Pareto 80
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                            Regular
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: CURVA DE VENTAS DIARIAS (LIGHT) */}
            {/* ============================================================== */}
            {activeTab === 'tendencia' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <span>📈</span> Evolución Diaria de Facturación
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Identifica los días pico de venta (llegada de camiones y abastecimiento a floristerías)
                            </p>
                        </div>
                        {hoveredDayIndex !== null && timelineStats[hoveredDayIndex] && (
                            <div className="bg-rose-50 px-4 py-2 rounded-2xl border border-rose-200 text-xs">
                                <span className="text-slate-600 font-medium">{timelineStats[hoveredDayIndex].diaLabel}: </span>
                                <span className="text-rose-700 font-black ml-1">{formatLempiras(timelineStats[hoveredDayIndex].totalVentas)}</span>
                                <span className="text-slate-500 ml-2">({timelineStats[hoveredDayIndex].unidades} paq. / {timelineStats[hoveredDayIndex].facturasCount} facturas)</span>
                            </div>
                        )}
                    </div>

                    {/* SVG Spline Chart Light */}
                    {timelineSvg && (
                        <div className="mt-8 relative overflow-x-auto">
                            <svg 
                                viewBox={`0 0 ${timelineSvg.width} ${timelineSvg.height}`} 
                                className="w-full h-64 sm:h-80"
                            >
                                <defs>
                                    <linearGradient id="roseGradientLight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Grid Horizontal Lines */}
                                <line x1="60" y1="30" x2="820" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                                <line x1="60" y1="115" x2="820" y2="115" stroke="#f1f5f9" strokeWidth="1" />
                                <line x1="60" y1="200" x2="820" y2="200" stroke="#f1f5f9" strokeWidth="1" />

                                {/* Area */}
                                {timelineSvg.areaPath && (
                                    <path d={timelineSvg.areaPath} fill="url(#roseGradientLight)" />
                                )}

                                {/* Line */}
                                {timelineSvg.linePath && (
                                    <path 
                                        d={timelineSvg.linePath} 
                                        fill="none" 
                                        stroke="#e11d48" 
                                        strokeWidth="3" 
                                        strokeLinecap="round" 
                                    />
                                )}

                                {/* Points */}
                                {timelineSvg.points.map((p: any, idx: number) => (
                                    <circle
                                        key={idx}
                                        cx={p.x}
                                        cy={p.y}
                                        r={hoveredDayIndex === idx ? 6 : 3}
                                        fill={hoveredDayIndex === idx ? "#ffffff" : "#e11d48"}
                                        stroke="#e11d48"
                                        strokeWidth={hoveredDayIndex === idx ? 3 : 1}
                                        className="cursor-pointer transition-all duration-150"
                                        onMouseEnter={() => setHoveredDayIndex(idx)}
                                        onMouseLeave={() => setHoveredDayIndex(null)}
                                    />
                                ))}
                            </svg>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================== */}
            {/* DRILLDOWN MODAL: FLOR / VARIEDAD (LIGHT) */}
            {/* ============================================================== */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl text-left space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                                    {selectedProduct.categoria}
                                </span>
                                <h3 className="text-xl font-black text-slate-900">
                                    {selectedProduct.nombre}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                <span className="text-slate-500 block mb-1">Paquetes Vendidos</span>
                                <span className="text-xl font-black text-slate-900">{formatNumber(selectedProduct.cantidadVendida)}</span>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                <span className="text-slate-500 block mb-1">Total Generado</span>
                                <span className="text-xl font-black text-emerald-700">{formatLempiras(selectedProduct.montoTotal)}</span>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                <span className="text-slate-500 block mb-1">Precio Promedio Real</span>
                                <span className="text-base font-bold text-blue-700">{formatLempiras(selectedProduct.precioPromedio)} / paq.</span>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                <span className="text-slate-500 block mb-1">Stock Actual en Bodega</span>
                                <span className="text-base font-bold text-amber-700">{selectedProduct.stockActual} paq.</span>
                            </div>
                        </div>

                        <div className="pt-2 text-right">
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* DRILLDOWN MODAL: VENDEDOR O CLIENTE (LIGHT) */}
            {/* ============================================================== */}
            {(selectedSeller || selectedClient) && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl text-left space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                    {selectedSeller ? 'Desempeño de Vendedor' : 'Ficha de Cliente'}
                                </span>
                                <h3 className="text-xl font-black text-slate-900">
                                    {selectedSeller ? selectedSeller.nombre : selectedClient.nombre}
                                </h3>
                            </div>
                            <button
                                onClick={() => { setSelectedSeller(null); setSelectedClient(null); }}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                <span className="text-slate-500 block mb-1">Facturas Registradas</span>
                                <span className="text-xl font-black text-slate-900">
                                    {selectedSeller ? selectedSeller.facturasCount : selectedClient.facturasCount} pedidos
                                </span>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                <span className="text-slate-500 block mb-1">Monto Acumulado</span>
                                <span className="text-xl font-black text-emerald-700">
                                    {formatLempiras(selectedSeller ? selectedSeller.montoTotal : selectedClient.montoTotal)}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 text-right">
                            <button
                                onClick={() => { setSelectedSeller(null); setSelectedClient(null); }}
                                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
