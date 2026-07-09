'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
    TrendingUp, 
    TrendingDown, 
    Users, 
    Box, 
    Wallet, 
    Calendar, 
    RefreshCw, 
    DollarSign, 
    Wrench,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Award,
    Activity,
    AlertCircle,
    Printer,
    ExternalLink,
    MapPin,
    User,
    Clock
} from 'lucide-react';
import { getGraficasReportData, anularFactura, anularRenta, anularOrden } from './actions';

interface GraficasClientProps {
    initialData: any;
    initialMonth: number;
    initialYear: number;
}

export default function GraficasClient({ initialData, initialMonth, initialYear }: GraficasClientProps) {
    const [month, setMonth] = useState(initialMonth);
    const [year, setYear] = useState(initialYear);
    const [reportData, setReportData] = useState(initialData);
    const [isPending, startTransition] = useTransition();
    const [activeHoverDay, setActiveHoverDay] = useState<number | null>(null);
    const [activeModal, setActiveModal] = useState<'ventas' | 'rentas' | 'soporte' | 'cajachica' | 'cotizaciones' | null>(null);
    const [modalSearch, setModalSearch] = useState('');
    const [actionPending, setActionPending] = useState(false);
    const [previewDocId, setPreviewDocId] = useState<string | null>(null);
    const [previewDocCorrelativo, setPreviewDocCorrelativo] = useState<string>('');

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-HN', {
            style: 'currency',
            currency: 'HNL'
        }).format(val);
    };

    const handleRefresh = () => {
        startTransition(async () => {
            try {
                const data = await getGraficasReportData(month, year);
                setReportData(data);
            } catch (e) {
                console.error("Error al refrescar datos:", e);
            }
        });
    };

    // Refetch data when month/year changes
    useEffect(() => {
        handleRefresh();
    }, [month, year]);

    // Data for charts
    const {
        responsable = 'Cargando...',
        ventasCount = 0,
        ventasMonto = 0,
        cotizacionesCount = 0,
        cotizacionesMonto = 0,
        cotizacionesConvertidasCount = 0,
        rentasCount = 0,
        rentasMonto = 0,
        soporteCount = 0,
        soporteMonto = 0,
        cajaChicaIngresos = 0,
        cajaChicaEgresos = 0,
        cajaChicaMovimientos = [],
        dailyStats = [],
        employeeStats = [],
        cajaGastosPorCategoria = [],
        rawFacturas = [],
        rawCotizaciones = [],
        rawRentas = [],
        rawOrdenes = []
    } = reportData || {};

    const totalIngresos = ventasMonto + rentasMonto + soporteMonto;

    // Donut chart calculations
    const pVentas = totalIngresos > 0 ? (ventasMonto / totalIngresos) * 100 : 0;
    const pRentas = totalIngresos > 0 ? (rentasMonto / totalIngresos) : 0; // standard fraction
    const pRentasPct = pRentas * 100;
    const pSoporte = totalIngresos > 0 ? (soporteMonto / totalIngresos) * 100 : 0;

    // SVG Donut settings
    const radius = 50;
    const circ = 2 * Math.PI * radius; // ~314.16
    const dashVentas = `${(pVentas / 100) * circ} ${circ}`;
    const dashRentas = `${(pRentasPct / 100) * circ} ${circ}`;
    const dashSoporte = `${(pSoporte / 100) * circ} ${circ}`;

    const offsetVentas = 0;
    const offsetRentas = -((pVentas / 100) * circ);
    const offsetSoporte = -(((pVentas + pRentasPct) / 100) * circ);

    // Wave Line Chart calculations (similar to home page but dynamic)
    const chartHeight = 220;
    const chartWidth = 800;
    const maxDailyIncome = Math.max(...dailyStats.map((d: any) => d.ventas + d.rentas + d.soporte), 1000);

    const getCoordinates = (statsArray: typeof dailyStats, type: 'total' | 'rentasSoporte') => {
        if (!statsArray || statsArray.length === 0) return [];
        return statsArray.map((d: any, index: number) => {
            const x = (index / (statsArray.length - 1)) * (chartWidth - 60) + 30;
            const val = type === 'total' 
                ? (d.ventas + d.rentas + d.soporte)
                : (d.rentas + d.soporte);
            const y = chartHeight - ((val / maxDailyIncome) * (chartHeight - 60)) - 30;
            return { x, y, val, dia: d.dia, d };
        });
    };

    const pointsTotal = getCoordinates(dailyStats, 'total');
    const pointsRentasSoporte = getCoordinates(dailyStats, 'rentasSoporte');

    // Build SVG paths
    const linePathTotal = pointsTotal.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPathTotal = pointsTotal.length > 0 
        ? `${linePathTotal} L ${pointsTotal[pointsTotal.length - 1].x} ${chartHeight - 20} L ${pointsTotal[0].x} ${chartHeight - 20} Z` 
        : '';

    const linePathRentasSoporte = pointsRentasSoporte.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPathRentasSoporte = pointsRentasSoporte.length > 0 
        ? `${linePathRentasSoporte} L ${pointsRentasSoporte[pointsRentasSoporte.length - 1].x} ${chartHeight - 20} L ${pointsRentasSoporte[0].x} ${chartHeight - 20} Z` 
        : '';

    // Active hover day values
    const hoverDayData = activeHoverDay !== null ? dailyStats[activeHoverDay - 1] : null;
    const totalDays = new Date(year, month, 0).getDate();

    // Months translation
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="flex flex-col animate-in fade-in duration-500 ease-out py-6 px-8 w-full max-w-7xl mx-auto space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-brand-600" />
                        Gráficas e Informes de Bioelectrónica
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <p className="text-xs text-slate-500">
                            Estadísticas financieras, flujos de caja chica y rendimientos de personal del mes seleccionado.
                        </p>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden md:inline" />
                        <p className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            Responsable: {responsable}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <Calendar className="w-4 h-4 text-slate-400 ml-1" />
                        <select 
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        >
                            {meses.map((m, idx) => (
                                <option key={m} value={idx + 1}>{m}</option>
                            ))}
                        </select>
                        <select 
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer border-l border-slate-200 pl-1.5"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                        >
                            {[2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition disabled:opacity-50 cursor-pointer"
                        title="Refrescar datos"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* KPI 1 - Ventas POS */}
                <div 
                    onClick={() => { setActiveModal('ventas'); setModalSearch(''); }}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ventas / POS</span>
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                            <FileText className="w-4 h-4 text-brand-600" />
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Total Facturado</span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{formatCurrency(ventasMonto)}</h2>
                        <div className="mt-4 flex items-center justify-between text-[10px] border-t border-slate-100 pt-2.5">
                            <span className="text-slate-500">Documentos emitidos:</span>
                            <span className="font-bold text-slate-800">{ventasCount}</span>
                        </div>
                    </div>
                </div>

                {/* KPI - Cotizaciones */}
                <div 
                    onClick={() => { setActiveModal('cotizaciones'); setModalSearch(''); }}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cotizaciones</span>
                        <div className="p-1.5 bg-amber-50 rounded-lg">
                            <FileText className="w-4 h-4 text-amber-600" />
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Total Cotizado</span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{formatCurrency(cotizacionesMonto)}</h2>
                        <div className="mt-4 flex items-center justify-between text-[10px] border-t border-slate-100 pt-2.5">
                            <span className="text-slate-500">Convertidas a Factura:</span>
                            <span className="font-bold text-emerald-700">{cotizacionesConvertidasCount} / {cotizacionesCount}</span>
                        </div>
                    </div>
                </div>

                {/* KPI 2 - Alquileres */}
                <div 
                    onClick={() => { setActiveModal('rentas'); setModalSearch(''); }}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alquileres</span>
                        <div className="p-1.5 bg-emerald-50 rounded-lg">
                            <Box className="w-4 h-4 text-emerald-600" />
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Contratos en el Mes</span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{formatCurrency(rentasMonto)}</h2>
                        <div className="mt-4 flex items-center justify-between text-[10px] border-t border-slate-100 pt-2.5">
                            <span className="text-slate-500">Equipos rentados:</span>
                            <span className="font-bold text-slate-800">{rentasCount}</span>
                        </div>
                    </div>
                </div>

                {/* KPI 3 - Soporte Técnico */}
                <div 
                    onClick={() => { setActiveModal('soporte'); setModalSearch(''); }}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Soporte Técnico</span>
                        <div className="p-1.5 bg-indigo-50 rounded-lg">
                            <Wrench className="w-4 h-4 text-indigo-600" />
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Revisiones & Reparación</span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{formatCurrency(soporteMonto)}</h2>
                        <div className="mt-4 flex items-center justify-between text-[10px] border-t border-slate-100 pt-2.5">
                            <span className="text-slate-500">Órdenes atendidas:</span>
                            <span className="font-bold text-slate-800">{soporteCount}</span>
                        </div>
                    </div>
                </div>

                {/* KPI 4 - Caja Chica */}
                <div 
                    onClick={() => { setActiveModal('cajachica'); setModalSearch(''); }}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Caja Chica</span>
                        <div className="p-1.5 bg-purple-50 rounded-lg">
                            <Wallet className="w-4 h-4 text-purple-600" />
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Egresos de Caja Chica</span>
                        <h2 className="text-2xl font-black text-rose-700 tracking-tight mt-0.5">{formatCurrency(cajaChicaEgresos)}</h2>
                        <div className="mt-4 flex items-center justify-between text-[10px] border-t border-slate-100 pt-2.5">
                            <span className="text-slate-500">Fondeos / Ingresos:</span>
                            <span className="font-bold text-emerald-700">+{formatCurrency(cajaChicaIngresos)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Graphics Section Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Wave Area Graph - Left 2 Columns */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[380px]">
                    <div className="p-6 pb-2 flex justify-between items-center border-b border-slate-100">
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm">Flujo de Ingresos Diario</h3>
                            <p className="text-[11px] text-slate-500">Evolución temporal de ingresos combinados por día en Lempiras</p>
                        </div>
                        {hoverDayData && (
                            <div className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Día {hoverDayData.dia}</span>
                                <span className="text-[11px] font-black text-brand-700">{formatCurrency(hoverDayData.ventas + hoverDayData.rentas + hoverDayData.soporte)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 relative w-full flex items-end px-4 pb-12 pt-6">
                        {/* Y-Axis guide lines */}
                        <div className="absolute inset-x-8 top-6 bottom-12 flex flex-col justify-between pointer-events-none select-none">
                            <div className="border-t border-dashed border-slate-100 w-full text-[9px] text-slate-300 pt-1">
                                {formatCurrency(maxDailyIncome)}
                            </div>
                            <div className="border-t border-dashed border-slate-100 w-full text-[9px] text-slate-300 pt-1">
                                {formatCurrency(maxDailyIncome * 0.5)}
                            </div>
                            <div className="border-t border-dashed border-slate-100 w-full text-[9px] text-slate-300 pt-1">
                                0.00
                            </div>
                        </div>

                        {/* Interactive Wave SVG Chart */}
                        <div className="w-full h-full relative z-10">
                            <svg 
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                                className="w-full h-full"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                    </linearGradient>
                                    <linearGradient id="chartGradientRentas" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Back Wave (Rentas + Soporte) */}
                                {areaPathRentasSoporte && (
                                    <path 
                                        d={areaPathRentasSoporte} 
                                        fill="url(#chartGradientRentas)"
                                        className="stroke-emerald-400 stroke-1.5 opacity-80"
                                    />
                                )}

                                {/* Front Main Wave (Total) */}
                                {areaPathTotal && (
                                    <path 
                                        d={areaPathTotal} 
                                        fill="url(#chartGradient)"
                                        className="stroke-brand-500 stroke-2.5"
                                    />
                                )}

                                {/* Interactive circles on hover */}
                                {pointsTotal.map((p: any, idx: number) => (
                                    <circle
                                        key={idx}
                                        cx={p.x}
                                        cy={p.y}
                                        r={activeHoverDay === p.dia ? 5 : 2}
                                        fill={activeHoverDay === p.dia ? "#3b82f6" : "#ffffff"}
                                        stroke="#3b82f6"
                                        strokeWidth={activeHoverDay === p.dia ? 2.5 : 1}
                                        className="cursor-pointer transition-all duration-150"
                                        onMouseEnter={() => setActiveHoverDay(p.dia)}
                                        onMouseLeave={() => setActiveHoverDay(null)}
                                    />
                                ))}
                            </svg>
                        </div>

                        {/* X-Axis labels */}
                        <div className="absolute bottom-3 inset-x-8 flex justify-between text-[10px] font-bold text-slate-400 z-20">
                            <span>Día 1</span>
                            <span>Día 10</span>
                            <span>Día 20</span>
                            <span>Día {totalDays}</span>
                        </div>
                    </div>
                </div>

                {/* Donut Chart - Right Column */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[380px] justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">Distribución de Ingresos</h3>
                        <p className="text-[11px] text-slate-500">Participación porcentual de facturación por servicio</p>
                    </div>

                    <div className="flex justify-center items-center relative my-4">
                        {totalIngresos > 0 ? (
                            <>
                                <svg width="150" height="150" viewBox="0 0 120 120" className="transform -rotate-90">
                                    {/* Background Ring */}
                                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
                                    
                                    {/* Ventas Slice */}
                                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#3b82f6" strokeWidth="12" 
                                            strokeDasharray={dashVentas} strokeDashoffset={offsetVentas} strokeLinecap="round" />
                                            
                                    {/* Rentas Slice */}
                                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#10b981" strokeWidth="12" 
                                            strokeDasharray={dashRentas} strokeDashoffset={offsetRentas} strokeLinecap="round" />

                                    {/* Soporte Slice */}
                                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#6366f1" strokeWidth="12" 
                                            strokeDasharray={dashSoporte} strokeDashoffset={offsetSoporte} strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingreso Neto</span>
                                    <span className="text-sm font-black text-slate-900">{formatCurrency(totalIngresos).split(',')[0]}</span>
                                </div>
                            </>
                        ) : (
                            <div className="h-32 flex flex-col justify-center items-center text-slate-400 text-xs">
                                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                                Sin transacciones registradas
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span>Ventas / POS</span>
                            </div>
                            <span>{pVentas.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span>Alquileres</span>
                            </div>
                            <span>{pRentasPct.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                <span>Soporte Técnico</span>
                            </div>
                            <span>{pSoporte.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row - Employee Matrix & Caja Chica gastos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Employee performance card - 2 Columns */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <div className="mb-4">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-yellow-600" /> Matriz de Actividad y Desempeño
                        </h3>
                        <p className="text-[11px] text-slate-500">Métricas acumuladas del personal registradas en base de datos</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2.5">Empleado</th>
                                    <th className="px-4 py-2.5 text-center">Rol</th>
                                    <th className="px-4 py-2.5 text-center" title="Facturas Creadas">Ventas</th>
                                    <th className="px-4 py-2.5 text-center" title="Alquileres Creados">Rentas</th>
                                    <th className="px-4 py-2.5 text-center" title="Órdenes Reparadas o Recibidas">Soporte</th>
                                    <th className="px-4 py-2.5 text-center" title="Movimientos de Caja Chica">Caja Chica</th>
                                    <th className="px-4 py-2.5 text-center">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {employeeStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                            No hay personal registrado en esta organización.
                                        </td>
                                    </tr>
                                ) : (
                                    employeeStats.map((emp: any) => {
                                        // Dynamic score calculation
                                        const score = Math.min(
                                            (emp.ventasCount * 5) + (emp.rentasCount * 8) + (emp.soporteCount * 4) + (emp.cajaChicaCount * 2),
                                            100
                                        );
                                        return (
                                            <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{emp.nombre}</span>
                                                        <span className="text-[9px] text-slate-400">{emp.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded uppercase">
                                                        {emp.role.replace('ORG_', '')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{emp.ventasCount}</span>
                                                        <span className="text-[9px] text-slate-400">{formatCurrency(emp.ventasMonto).split(',')[0]}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{emp.rentasCount}</span>
                                                        <span className="text-[9px] text-slate-400">{formatCurrency(emp.rentasMonto).split(',')[0]}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{emp.soporteCount}</span>
                                                        <span className="text-[9px] text-slate-400">{formatCurrency(emp.soporteMonto).split(',')[0]}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-700">
                                                    {emp.cajaChicaCount}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-[10px] font-black ${score > 60 ? 'text-emerald-700' : score > 20 ? 'text-brand-700' : 'text-slate-400'}`}>
                                                            {score}%
                                                        </span>
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${score > 60 ? 'bg-emerald-500' : score > 20 ? 'bg-brand-500' : 'bg-slate-300'}`}
                                                                style={{ width: `${score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Caja chica expenses list */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[350px] justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">Categoría de Gastos (Caja Chica)</h3>
                        <p className="text-[11px] text-slate-500">Distribución de egresos menores en este mes</p>
                    </div>

                    <div className="flex-1 my-4 overflow-y-auto space-y-3 pr-1">
                        {cajaGastosPorCategoria.length === 0 ? (
                            <div className="h-full flex flex-col justify-center items-center text-slate-400 text-xs">
                                <Wallet className="w-8 h-8 text-slate-300 mb-2" />
                                Sin egresos de caja chica registrados.
                            </div>
                        ) : (
                            cajaGastosPorCategoria.map((item: any, idx: number) => {
                                const pct = cajaChicaEgresos > 0 ? (item.total / cajaChicaEgresos) * 100 : 0;
                                return (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                            <span className="truncate max-w-[120px]">{item.categoria}</span>
                                            <span>{formatCurrency(item.total).split(',')[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold w-8 text-right">
                                                {pct.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Petty cash audit movement log */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="mb-4">
                    <h3 className="font-bold text-slate-900 text-sm">Registro Auditor de Caja Chica</h3>
                    <p className="text-[11px] text-slate-500">Últimos movimientos del mes detallados por sucursal</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2.5">Fecha</th>
                                <th className="px-4 py-2.5">Tipo</th>
                                <th className="px-4 py-2.5">Categoría</th>
                                <th className="px-4 py-2.5">Descripción / Concepto</th>
                                <th className="px-4 py-2.5">Registrado por</th>
                                <th className="px-4 py-2.5 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {cajaChicaMovimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                                        No hay movimientos de caja chica en este mes.
                                    </td>
                                </tr>
                            ) : (
                                cajaChicaMovimientos.slice(0, 10).map((mov: any) => (
                                    <tr key={mov.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-4 py-3 text-slate-400" suppressHydrationWarning>
                                            {new Date(mov.createdAt).toLocaleDateString('es-HN', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                mov.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">
                                            {mov.categoria}
                                        </td>
                                        <td className="px-4 py-3 text-slate-800">
                                            {mov.descripcion}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {mov.creadorPor}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${
                                            mov.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                                        }`}>
                                            {mov.tipo === 'INGRESO' ? '+' : '-'} {formatCurrency(mov.total)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle */}
            {activeModal && (() => {
                // Calcular stats para el header
                const modalItems = activeModal === 'cotizaciones' ? rawCotizaciones
                    : activeModal === 'ventas' ? rawFacturas
                    : activeModal === 'rentas' ? rawRentas
                    : activeModal === 'soporte' ? rawOrdenes
                    : cajaChicaMovimientos;

                const filtered = modalItems.filter((item: any) => {
                    const q = modalSearch.toLowerCase();
                    if (!q) return true;
                    const fields = [item.correlativo, item.cliente, item.creadoPor, item.equipo, item.tecnico, item.categoria, item.descripcion, item.recepcionadoPor].filter(Boolean);
                    return fields.some((f: string) => f.toLowerCase().includes(q));
                });

                const totalMonto = activeModal === 'ventas' ? filtered.filter((f:any) => f.estado !== 'ANULADA').reduce((a:number,f:any) => a + (f.total||0), 0)
                    : activeModal === 'cotizaciones' ? filtered.filter((c:any) => c.estado !== 'ANULADA').reduce((a:number,c:any) => a + (c.total||0), 0)
                    : activeModal === 'rentas' ? filtered.filter((r:any) => r.estado !== 'ANULADA').reduce((a:number,r:any) => a + (r.costoRenta||0), 0)
                    : activeModal === 'soporte' ? filtered.filter((o:any) => o.estado !== 'ANULADA').reduce((a:number,o:any) => a + (o.costoRevision||0) + (o.aprobado ? (o.costoReparacion||0) : 0), 0)
                    : filtered.filter((m:any) => m.tipo === 'EGRESO').reduce((a:number,m:any) => a + (m.total||0), 0);

                const anuladas = filtered.filter((item: any) => item.estado === 'ANULADA').length;
                const activas = filtered.length - anuladas;

                const modalLabel = activeModal === 'ventas' ? 'Ventas / POS' : activeModal === 'rentas' ? 'Alquileres' : activeModal === 'soporte' ? 'Soporte Técnico' : activeModal === 'cotizaciones' ? 'Cotizaciones' : 'Caja Chica';
                const modalColor = activeModal === 'ventas' ? 'blue' : activeModal === 'rentas' ? 'emerald' : activeModal === 'soporte' ? 'indigo' : activeModal === 'cotizaciones' ? 'amber' : 'purple';

                return (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        {/* Header rico con stats */}
                        <div className={`px-6 pt-5 pb-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${
                                        modalColor === 'blue' ? 'bg-blue-100' : 
                                        modalColor === 'emerald' ? 'bg-emerald-100' : 
                                        modalColor === 'indigo' ? 'bg-indigo-100' : 
                                        modalColor === 'amber' ? 'bg-amber-100' : 'bg-purple-100'
                                    }`}>
                                        <FileText className={`w-5 h-5 ${
                                            modalColor === 'blue' ? 'text-blue-700' : 
                                            modalColor === 'emerald' ? 'text-emerald-700' : 
                                            modalColor === 'indigo' ? 'text-indigo-700' : 
                                            modalColor === 'amber' ? 'text-amber-700' : 'text-purple-700'
                                        }`} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base tracking-tight">
                                            Detalle de {modalLabel}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            Período: {new Date(year, month - 1).toLocaleString('es-HN', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setActiveModal(null)}
                                    className="text-slate-400 hover:text-slate-700 font-bold bg-white hover:bg-slate-100 p-2 rounded-xl border border-slate-200 transition cursor-pointer shadow-sm shrink-0"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Stats row */}
                            <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registros</div>
                                    <div className="text-lg font-black text-slate-900 mt-0.5">{filtered.length}</div>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Activos</div>
                                    <div className={`text-lg font-black mt-0.5 ${
                                        modalColor === 'blue' ? 'text-blue-700' : 
                                        modalColor === 'emerald' ? 'text-emerald-700' : 
                                        modalColor === 'indigo' ? 'text-indigo-700' : 
                                        modalColor === 'amber' ? 'text-amber-700' : 'text-purple-700'
                                    }`}>{activas}</div>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Neto</div>
                                    <div className="text-sm font-black text-slate-900 mt-0.5 truncate">{formatCurrency(totalMonto).split(',')[0]}</div>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
                            <div className="relative flex-1">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input 
                                    type="text"
                                    placeholder="Buscar por código, cliente, técnico o creador..."
                                    className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-medium text-slate-800 transition-all"
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                />
                            </div>
                            {anuladas > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                    {anuladas} anulada{anuladas !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-2 bg-slate-50/40">

                            {/* ── COTIZACIONES ── */}
                            {activeModal === 'cotizaciones' && (
                                <>
                                    {filtered.length === 0 && (
                                        <div className="text-center py-16 text-slate-400 text-sm">No se encontraron resultados.</div>
                                    )}
                                    {filtered.map((c: any) => (
                                        <div key={c.id} className={`rounded-2xl border transition-all ${
                                            c.estado === 'ANULADA' ? 'bg-rose-50/60 border-rose-100 opacity-70' : 
                                            c.estado === 'CONVERTIDA' ? 'bg-emerald-50/40 border-emerald-200 shadow-sm' :
                                            'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md shadow-sm'
                                        }`}>
                                            {/* Top row */}
                                            <div className="px-4 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="font-black text-sm text-slate-900 font-mono">{c.correlativo}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        c.estado === 'ANULADA' ? 'bg-rose-100 text-rose-800' : 
                                                        c.estado === 'CONVERTIDA' ? 'bg-emerald-100 text-emerald-800' :
                                                        'bg-amber-100 text-amber-800'
                                                    }`}>{c.estado}</span>
                                                </div>
                                                <span className={`font-black text-base ${c.estado === 'ANULADA' ? 'text-rose-700 line-through' : 'text-slate-900'}`}>
                                                    {formatCurrency(c.total)}
                                                </span>
                                            </div>
                                            {/* Info grid */}
                                            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Cliente:</span> {c.cliente}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Creado por:</span> {c.creadoPor}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Fecha:</span> {new Date(c.fechaEmision).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            {/* Status notes */}
                                            {c.estado === 'CONVERTIDA' && c.convertidoAt && (
                                                <div className="mx-4 mb-3 text-emerald-700 text-[10px] font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                                                    ✓ Convertida a factura el {new Date(c.convertidoAt).toLocaleDateString('es-HN')}
                                                </div>
                                            )}
                                            {c.estado === 'ANULADA' && (
                                                <div className="mx-4 mb-3 text-rose-700 text-[10px] font-bold bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-1.5">
                                                    🚫 Anulada por: {c.anuladaPor || 'Sistema'} {c.anuladaAt ? `· ${new Date(c.anuladaAt).toLocaleDateString('es-HN')}` : ''}
                                                </div>
                                            )}
                                            {/* Actions */}
                                            <div className="px-4 pb-4 flex items-center gap-2 justify-end border-t border-slate-100 pt-3">
                                                <a
                                                    href={`/facturas/${c.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg transition border border-slate-200 cursor-pointer"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Ver Detalle
                                                </a>
                                                <button
                                                    onClick={() => { setPreviewDocId(c.id); setPreviewDocCorrelativo(c.correlativo); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg transition cursor-pointer shadow-sm"
                                                >
                                                    <Printer className="w-3 h-3" />
                                                    Vista Previa
                                                </button>
                                                {c.estado !== 'ANULADA' && c.estado !== 'CONVERTIDA' && (
                                                    <button
                                                        disabled={actionPending}
                                                        onClick={async () => {
                                                            if (confirm(`¿Anular cotización ${c.correlativo}?`)) {
                                                                setActionPending(true);
                                                                const res = await anularFactura(c.id);
                                                                setActionPending(false);
                                                                if (res.success) handleRefresh();
                                                                else alert(res.error || 'Error al anular');
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition disabled:opacity-50 cursor-pointer"
                                                    >
                                                        Anular
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ── VENTAS ── */}
                            {activeModal === 'ventas' && (
                                <>
                                    {filtered.length === 0 && (
                                        <div className="text-center py-16 text-slate-400 text-sm">No se encontraron resultados.</div>
                                    )}
                                    {filtered.map((f: any) => (
                                        <div key={f.id} className={`rounded-2xl border transition-all ${
                                            f.estado === 'ANULADA' ? 'bg-rose-50/60 border-rose-100 opacity-70' : 
                                            'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md shadow-sm'
                                        }`}>
                                            <div className="px-4 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="font-black text-sm text-slate-900 font-mono">{f.correlativo}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        f.estado === 'ANULADA' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>{f.estado}</span>
                                                </div>
                                                <span className={`font-black text-base ${f.estado === 'ANULADA' ? 'text-rose-700 line-through' : 'text-slate-900'}`}>
                                                    {formatCurrency(f.total)}
                                                </span>
                                            </div>
                                            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Cliente:</span> {f.cliente}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Creado por:</span> {f.creadoPor}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Fecha:</span> {new Date(f.fechaEmision).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            {f.estado === 'ANULADA' && (
                                                <div className="mx-4 mb-3 text-rose-700 text-[10px] font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
                                                    🚫 Anulada por: {f.anuladaPor || 'Sistema'} {f.anuladaAt ? `· ${new Date(f.anuladaAt).toLocaleDateString('es-HN')}` : ''}
                                                </div>
                                            )}
                                            <div className="px-4 pb-4 flex items-center gap-2 justify-end border-t border-slate-100 pt-3">
                                                <a
                                                    href={`/facturas/${f.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg transition border border-slate-200 cursor-pointer"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Ver Detalle
                                                </a>
                                                <button
                                                    onClick={() => { setPreviewDocId(f.id); setPreviewDocCorrelativo(f.correlativo); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition cursor-pointer shadow-sm"
                                                >
                                                    <Printer className="w-3 h-3" />
                                                    Vista Previa
                                                </button>
                                                {f.estado !== 'ANULADA' && (
                                                    <button
                                                        disabled={actionPending}
                                                        onClick={async () => {
                                                            if (confirm(`¿Anular factura ${f.correlativo}?`)) {
                                                                setActionPending(true);
                                                                const res = await anularFactura(f.id);
                                                                setActionPending(false);
                                                                if (res.success) handleRefresh();
                                                                else alert(res.error || 'Error al anular');
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition disabled:opacity-50 cursor-pointer"
                                                    >
                                                        Anular
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ── RENTAS ── */}
                            {activeModal === 'rentas' && (
                                <>
                                    {filtered.length === 0 && (
                                        <div className="text-center py-16 text-slate-400 text-sm">No se encontraron resultados.</div>
                                    )}
                                    {filtered.map((r: any) => (
                                        <div key={r.id} className={`rounded-2xl border transition-all ${
                                            r.estado === 'ANULADA' ? 'bg-rose-50/60 border-rose-100 opacity-70' : 
                                            'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md shadow-sm'
                                        }`}>
                                            <div className="px-4 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="font-black text-sm text-slate-900">{r.equipo}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        r.estado === 'ANULADA' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                    }`}>{r.estado}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-black text-base ${r.estado === 'ANULADA' ? 'text-rose-700 line-through' : 'text-slate-900'}`}>
                                                        {formatCurrency(r.costoRenta)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 block">+ depósito {formatCurrency(r.deposito)}</span>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Cliente:</span> {r.cliente}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Creado por:</span> {r.creadoPor}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Inicio:</span> {new Date(r.fechaInicio).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-4 flex items-center gap-2 justify-end border-t border-slate-100 pt-3">
                                                <a
                                                    href={`/rentas/${r.id}/contrato`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg transition border border-slate-200 cursor-pointer"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Ver Contrato
                                                </a>
                                                    {r.estado !== 'ANULADA' && (
                                                    <button
                                                        disabled={actionPending}
                                                        onClick={async () => {
                                                            if (confirm(`¿Anular contrato de renta de ${r.equipo}?`)) {
                                                                setActionPending(true);
                                                                const res = await anularRenta(r.id);
                                                                setActionPending(false);
                                                                if (res.success) handleRefresh();
                                                                else alert(res.error || 'Error al anular');
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition disabled:opacity-50 cursor-pointer"
                                                    >
                                                        Anular
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ── SOPORTE ── */}
                            {activeModal === 'soporte' && (
                                <>
                                    {filtered.length === 0 && (
                                        <div className="text-center py-16 text-slate-400 text-sm">No se encontraron resultados.</div>
                                    )}
                                    {filtered.map((o: any) => (
                                        <div key={o.id} className={`rounded-2xl border transition-all ${
                                            o.estado === 'ANULADA' ? 'bg-rose-50/60 border-rose-100 opacity-70' : 
                                            'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md shadow-sm'
                                        }`}>
                                            <div className="px-4 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="font-black text-sm text-slate-900">{o.equipo}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        o.estado === 'ANULADA' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                                                    }`}>{o.estado}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] text-slate-400 block font-bold">Revisión + Reparación</span>
                                                    <span className={`font-black text-base ${o.estado === 'ANULADA' ? 'text-rose-700 line-through' : 'text-slate-900'}`}>
                                                        {formatCurrency(o.costoRevision + (o.aprobado ? o.costoReparacion : 0))}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Cliente:</span> {o.cliente}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Wrench className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Técnico:</span> {o.tecnico}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Recepción:</span> {o.recepcionadoPor}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                                                    <span className="text-[10px] text-slate-500"><span className="text-slate-400 font-bold">Fecha:</span> {new Date(o.fechaRecibido).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}</span>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-4 flex items-center gap-2 justify-end border-t border-slate-100 pt-3">
                                                <a
                                                    href={`/soporte/${o.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg transition border border-slate-200 cursor-pointer"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    Ver Orden
                                                </a>
                                                {o.estado !== 'ANULADA' && (
                                                    <button
                                                        disabled={actionPending}
                                                        onClick={async () => {
                                                            if (confirm(`¿Anular orden de trabajo para ${o.equipo}?`)) {
                                                                setActionPending(true);
                                                                const res = await anularOrden(o.id);
                                                                setActionPending(false);
                                                                if (res.success) handleRefresh();
                                                                else alert(res.error || 'Error al anular');
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition disabled:opacity-50 cursor-pointer"
                                                    >
                                                        Anular
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ── CAJA CHICA ── */}
                            {activeModal === 'cajachica' && (
                                <>
                                    {filtered.length === 0 && (
                                        <div className="text-center py-16 text-slate-400 text-sm">No se encontraron resultados.</div>
                                    )}
                                    {filtered.map((m: any) => (
                                        <div key={m.id} className={`rounded-2xl border shadow-sm transition-all ${
                                            m.tipo === 'INGRESO' ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300' : 
                                            'bg-white border-slate-200 hover:border-rose-200 hover:shadow-md'
                                        }`}>
                                            <div className="px-4 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="font-black text-sm text-slate-900">{m.categoria}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        m.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                    }`}>{m.tipo}</span>
                                                </div>
                                                <span className={`font-black text-base ${
                                                    m.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                                                }`}>
                                                    {m.tipo === 'INGRESO' ? '+' : '-'} {formatCurrency(m.total)}
                                                </span>
                                            </div>
                                            <p className="px-4 pb-2 text-[11px] text-slate-700 font-medium">{m.descripcion}</p>
                                            <div className="px-4 pb-4 flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-slate-300" />
                                                    <span className="text-[10px] text-slate-400 font-semibold">{m.creadorPor}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-slate-300" />
                                                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(m.createdAt).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                );
            })()}
            {/* Modal de Vista Previa de Factura/Cotización */}
            {previewDocId && (
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        {/* Header */}
                        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                                        Vista Previa
                                        <span className="font-mono text-xs bg-white/10 text-white/90 px-2 py-0.5 rounded border border-white/20">
                                            {previewDocCorrelativo}
                                        </span>
                                    </h3>
                                    <p className="text-[10px] text-slate-400">Listo para imprimir o compartir</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const iframe = document.querySelector('iframe[title="preview-doc"]') as HTMLIFrameElement;
                                        if (iframe?.contentWindow) iframe.contentWindow.print();
                                        else window.open(`/print/${previewDocId}`, '_blank');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                </button>
                                <a 
                                    href={`/print/${previewDocId}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all border border-white/20"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Abrir
                                </a>
                                <button 
                                    onClick={() => { setPreviewDocId(null); setPreviewDocCorrelativo(''); }}
                                    className="text-slate-400 hover:text-white font-extrabold text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition cursor-pointer border border-white/10"
                                >
                                    ✕ Cerrar
                                </button>
                            </div>
                        </div>

                        {/* Content Area (Iframe) */}
                        <div className="flex-1 bg-slate-100 relative">
                            <iframe 
                                src={`/api/pdf/${previewDocId}`} 
                                className="w-full h-full border-none"
                                title="preview-doc"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
