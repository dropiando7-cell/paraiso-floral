'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    DollarSign,
    AlertCircle,
    Calendar,
    User,
    TrendingUp,
    CheckCircle,
    Clock,
    Lock,
    Unlock,
    FileText,
    TrendingDown,
    Activity,
    HelpCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { abrirCaja, cerrarCaja, getCajaSessionSummary, getProductRotationReport } from './actions';

interface CierreCajaClientProps {
    initialActiveSession: any;
    initialHistory: any[];
}

export default function CierreCajaClient({ initialActiveSession, initialHistory }: CierreCajaClientProps) {
    const router = useRouter();
    const [activeSession, setActiveSession] = useState<any>(initialActiveSession);
    const [history, setHistory] = useState<any[]>(initialHistory);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // States for opening session
    const [saldoInicial, setSaldoInicial] = useState<string>('0');
    const [isOpening, setIsOpening] = useState(false);

    // States for active session dashboard
    const [summaryData, setSummaryData] = useState<any>(null);
    const [rotationData, setRotationData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'saldos' | 'productos'>('saldos');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    // States for closing session
    const [saldoReal, setSaldoReal] = useState<string>('');
    const [observaciones, setObservaciones] = useState<string>('');
    const [isClosing, setIsClosing] = useState(false);

    // Selected past session for detailed view modal/drawer
    const [selectedPastSession, setSelectedPastSession] = useState<any>(null);
    const [pastSummaryData, setPastSummaryData] = useState<any>(null);
    const [isLoadingPastDetails, setIsLoadingPastDetails] = useState(false);

    // Fetch active session summary and product rotation if session exists
    const fetchActiveSessionDetails = async (sessionId: string) => {
        setIsLoadingSummary(true);
        try {
            const [sum, rot] = await Promise.all([
                getCajaSessionSummary(sessionId),
                getProductRotationReport(sessionId)
            ]);
            setSummaryData(sum);
            setRotationData(rot);
            // Default physical count to expected cash for easier editing
            setSaldoReal(sum.totals.esperadoEfectivo.toFixed(2));
        } catch (e: any) {
            toast.error(e.message || "Error al cargar resumen del turno activo");
        } finally {
            setIsLoadingSummary(false);
        }
    };

    useEffect(() => {
        if (activeSession) {
            fetchActiveSessionDetails(activeSession.id);
        }
    }, [activeSession]);

    // Handle Open Turno
    const handleOpen = async (e: React.FormEvent) => {
        e.preventDefault();
        const initialAmt = parseFloat(saldoInicial);
        if (isNaN(initialAmt) || initialAmt < 0) {
            toast.error("El saldo inicial debe ser un número válido mayor o igual a 0");
            return;
        }

        setIsOpening(true);
        try {
            const result = await abrirCaja(initialAmt);
            toast.success("Turno de caja abierto correctamente");
            setActiveSession({
                id: result.id,
                estado: result.estado,
                saldoInicial: Number(result.saldoInicial),
                aperturaAt: result.aperturaAt,
                creadoPor: null
            });
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Error al abrir turno");
        } finally {
            setIsOpening(false);
        }
    };

    // Handle Close Turno
    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        const realAmt = parseFloat(saldoReal);
        if (isNaN(realAmt) || realAmt < 0) {
            toast.error("El saldo físico contado debe ser un número válido mayor o igual a 0");
            return;
        }

        if (!window.confirm("¿Está seguro de que desea cerrar el turno de caja actual? Esta acción no se puede deshacer y bloqueará las transacciones en este turno.")) {
            return;
        }

        setIsClosing(true);
        try {
            await cerrarCaja(activeSession.id, realAmt, observaciones);
            toast.success("Caja cerrada correctamente y reporte archivado.");
            setActiveSession(null);
            setSummaryData(null);
            setRotationData([]);
            setSaldoReal('');
            setObservaciones('');
            // Reload page and state
            window.location.reload();
        } catch (e: any) {
            toast.error(e.message || "Error al cerrar caja");
        } finally {
            setIsClosing(false);
        }
    };

    // View detailed past session
    const handleViewPastSession = async (session: any) => {
        setSelectedPastSession(session);
        setIsLoadingPastDetails(true);
        try {
            const sum = await getCajaSessionSummary(session.id);
            setPastSummaryData(sum);
        } catch (e: any) {
            toast.error("Error al obtener detalle del histórico");
        } finally {
            setIsLoadingPastDetails(false);
        }
    };

    // Live calculations for cash register reconciliation
    const esperadoEfectivo = summaryData?.totals?.esperadoEfectivo || 0;
    const realCash = parseFloat(saldoReal) || 0;
    const diferencia = realCash - esperadoEfectivo;

    // Formatting helpers
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(val);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        if (!isMounted) return '';
        const d = new Date(dateStr);
        const formatted = d.toLocaleDateString('es-HN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return formatted.replace(/\s+/g, ' ');
    };

    return (
        <div className="space-y-8">
            {/* ACTIVE SESSION ROW OR OPEN SHIFT SCREEN */}
            {!activeSession ? (
                /* OPEN SESSION FORM */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
                    <div className="bg-slate-900 px-6 py-5 text-white flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Unlock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Abrir Turno de Caja</h2>
                            <p className="text-xs text-slate-400">Inicia una nueva jornada para registrar ventas y cobranzas</p>
                        </div>
                    </div>
                    <form onSubmit={handleOpen} className="p-6 space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                            <div>
                                <p className="font-semibold">Fondo de Caja Requerido</p>
                                <p className="text-blue-700/90 mt-0.5">Ingrese el efectivo inicial disponible en la gaveta física para dar vueltos. Una vez abierto, el sistema enlazará automáticamente las facturas y pagos de renta emitidos.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Saldo Inicial en Efectivo (Lempiras HNL)
                            </label>
                            <div className="relative rounded-lg shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-slate-400 font-medium">L.</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="block w-full pl-8 pr-3 py-3 border border-slate-300 rounded-lg text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    placeholder="0.00"
                                    value={saldoInicial}
                                    onChange={(e) => setSaldoInicial(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isOpening}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-base cursor-pointer"
                        >
                            {isOpening ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Unlock className="w-5 h-5" />
                            )}
                            Abrir Turno de Caja Diario
                        </button>
                    </form>
                </div>
            ) : (
                /* ACTIVE SESSION DASHBOARD */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* DASHBOARD SUMMARY AND TRANSACTIONS (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* ACTIVE SHIFT STATUS */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-700">
                                    <Activity className="w-7 h-7 animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-slate-950">Turno de Caja Activo</h2>
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                                            Abierto
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5" suppressHydrationWarning>
                                        <Calendar className="w-3.5 h-3.5" />
                                        Iniciado el {formatDate(activeSession.aperturaAt)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        Operador: {activeSession.creadoPor ? `${activeSession.creadoPor.nombre || ''} ${activeSession.creadoPor.apellido || ''}`.trim() : 'Usuario Activo'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Fondo Inicial</span>
                                <span className="text-2xl font-black text-slate-900">{formatCurrency(activeSession.saldoInicial)}</span>
                            </div>
                        </div>

                        {/* TABS SELECTOR */}
                        <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => setActiveTab('saldos')}
                                className={`py-2 px-4 font-bold text-sm border-b-2 transition-all ${
                                    activeTab === 'saldos'
                                        ? 'border-brand-600 text-brand-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                Resumen de Flujos
                            </button>
                            <button
                                onClick={() => setActiveTab('productos')}
                                className={`py-2 px-4 font-bold text-sm border-b-2 transition-all ${
                                    activeTab === 'productos'
                                        ? 'border-brand-600 text-brand-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                Rotación de Productos Estelares
                            </button>
                        </div>

                        {isLoadingSummary ? (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center space-y-3">
                                <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-semibold text-slate-500">Calculando balance de caja en tiempo real...</span>
                            </div>
                        ) : activeTab === 'saldos' ? (
                            /* FLOWS TAB */
                            <div className="space-y-6">
                                {/* METRICS GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col justify-between h-32">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Esperado en Caja (Efectivo)</span>
                                            <DollarSign className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <span className="text-[25px] font-black tracking-tight">{formatCurrency(esperadoEfectivo)}</span>
                                            <p className="text-[10px] text-slate-400 mt-1">Fondo + Ventas y Rentas en efectivo</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ingresos Electrónicos</span>
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <span className="text-[25px] font-black text-slate-950 tracking-tight">
                                                {formatCurrency(
                                                    (summaryData?.totals?.totalIngresos || 0) - 
                                                    (summaryData?.totals?.ventasEfectivo || 0) - 
                                                    (summaryData?.totals?.rentasEfectivo || 0)
                                                )}
                                            </span>
                                            <p className="text-[10px] text-slate-500 mt-1">Tarjetas, transferencias y links</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Facturas Emitidas</span>
                                            <FileText className="w-4 h-4 text-slate-600" />
                                        </div>
                                        <div>
                                            <span className="text-[25px] font-black text-slate-950 tracking-tight">
                                                {summaryData?.session?.facturas?.length || 0}
                                            </span>
                                            <p className="text-[10px] text-slate-500 mt-1">Documentos oficiales en el turno</p>
                                        </div>
                                    </div>
                                </div>

                                {/* TABLE BY PAYMENT METHOD */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200">
                                        <h3 className="text-base font-bold text-slate-950">Desglose por Métodos de Pago</h3>
                                        <p className="text-xs text-slate-500">Montos clasificados recaudados en el turno de caja</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-600">
                                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                                                <tr>
                                                    <th className="px-6 py-3">Método de Pago</th>
                                                    <th className="px-6 py-3 text-right">Ventas POS / Facturación</th>
                                                    <th className="px-6 py-3 text-right">Cobros de Rentas</th>
                                                    <th className="px-6 py-3 text-right">Total Acumulado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago de Occidente'].map((metodo) => {
                                                    const v = summaryData?.summary?.ventas?.[metodo] || 0;
                                                    const r = summaryData?.summary?.rentas?.[metodo] || 0;
                                                    const total = v + r;
                                                    return (
                                                        <tr key={metodo} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-3.5 font-bold text-slate-900">{metodo}</td>
                                                            <td className="px-6 py-3.5 text-right text-slate-800">{formatCurrency(v)}</td>
                                                            <td className="px-6 py-3.5 text-right text-slate-800">{formatCurrency(r)}</td>
                                                            <td className={`px-6 py-3.5 text-right font-bold ${metodo === 'Efectivo' ? 'text-emerald-700 bg-emerald-50/40' : 'text-slate-900'}`}>{formatCurrency(total)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="bg-slate-900 text-white font-bold text-sm">
                                                    <td className="px-6 py-4">TOTALES DEL TURNO</td>
                                                    <td className="px-6 py-4 text-right">{formatCurrency(summaryData?.totals?.totalVentas || 0)}</td>
                                                    <td className="px-6 py-4 text-right">{formatCurrency(summaryData?.totals?.totalRentas || 0)}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-400">{formatCurrency(summaryData?.totals?.totalIngresos || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* STAR PRODUCTS ROTATION TAB */
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-950">Desempeño y Rotación de Productos</h3>
                                        <p className="text-xs text-slate-500">Artículos y servicios estrellas vendidos durante el turno activo</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-brand-100 text-brand-800 text-xs font-bold rounded-md">
                                        Ventas del Turno
                                    </span>
                                </div>
                                {rotationData.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <HelpCircle className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                        <p className="font-semibold text-sm">No se han registrado ventas de productos en este turno.</p>
                                        <p className="text-xs text-slate-400 mt-1">Los productos comprados mediante facturación POS aparecerán aquí.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-600">
                                            <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-semibold">
                                                <tr>
                                                    <th className="px-6 py-3">Detalle / Producto o Servicio</th>
                                                    <th className="px-6 py-3 text-center">Tipo</th>
                                                    <th className="px-6 py-3 text-center">Cantidad Vendida</th>
                                                    <th className="px-6 py-3 text-right">Monto Recaudado (Lempiras)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {rotationData.map((prod, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                                        <td className="px-6 py-3.5">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-900">{prod.nombre}</span>
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{prod.sku}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                prod.esServicio 
                                                                    ? 'bg-purple-100 text-purple-800' 
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {prod.esServicio ? 'Servicio / Renta' : 'Producto Físico'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-center font-bold text-slate-800">
                                                            {prod.cantidad}
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                                                            {formatCurrency(prod.total)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* PHYSICAL CASH COUNT AND CLOSURE SHIFT RECONCILIATION (1/3 width) */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-red-950 px-6 py-5 text-white flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg text-red-300">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">Arqueo y Cierre</h3>
                                    <p className="text-[10px] text-slate-400">Verificación física y cuadre de caja diario</p>
                                </div>
                            </div>

                            <form onSubmit={handleClose} className="p-6 space-y-5">
                                <div>
                                    <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider mb-2">Efectivo Teórico Esperado</span>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex justify-between items-center">
                                        <span className="text-xs text-slate-600 font-medium">Calculado por sistema:</span>
                                        <span className="font-black text-slate-800 text-lg">{formatCurrency(esperadoEfectivo)}</span>
                                    </div>
                                </div>

                                <hr className="border-slate-100" />

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Efectivo Real Contado (Físico)
                                    </label>
                                    <div className="relative rounded-lg shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">L.</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="block w-full pl-8 pr-3 py-3 border border-slate-300 rounded-lg text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="0.00"
                                            value={saldoReal}
                                            onChange={(e) => setSaldoReal(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* DISCREPANCY STATUS BOX */}
                                <div className={`p-4 rounded-xl border flex gap-3 text-sm transition-colors ${
                                    diferencia === 0
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : diferencia < 0
                                        ? 'bg-red-50 border-red-200 text-red-800'
                                        : 'bg-blue-50 border-blue-200 text-blue-800'
                                }`}>
                                    <div className="shrink-0 mt-0.5">
                                        {diferencia === 0 ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                                        ) : diferencia < 0 ? (
                                            <TrendingDown className="w-5 h-5 text-red-600" />
                                        ) : (
                                            <TrendingUp className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold">Reconciliación:</p>
                                        <p className="font-semibold text-xs mt-0.5">
                                            {diferencia === 0 ? (
                                                <span>Caja Cuadrada Perfecta (L. 0.00 de diferencia).</span>
                                            ) : diferencia < 0 ? (
                                                <span>Faltante detectado de: <strong className="text-red-700 font-black">{formatCurrency(Math.abs(diferencia))}</strong></span>
                                            ) : (
                                                <span>Sobrante detectado de: <strong className="text-blue-700 font-black">{formatCurrency(diferencia)}</strong></span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                        Observaciones / Notas del Cierre
                                    </label>
                                    <textarea
                                        className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        rows={3}
                                        placeholder="Escribe comentarios sobre el turno, incidencias con tarjetas o diferencias de efectivo..."
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isClosing}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-base cursor-pointer"
                                >
                                    {isClosing ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Lock className="w-5 h-5" />
                                    )}
                                    Cerrar Turno de Caja
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* CLOSURE HISTORY SECTION */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-950">Historial de Cierres de Caja</h2>
                    <p className="text-xs text-slate-500">Historial de los últimos turnos de caja completados</p>
                </div>
                {history.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Clock className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                        <p className="font-semibold text-sm">No hay cierres de caja archivados.</p>
                        <p className="text-xs text-slate-400 mt-1">Los turnos que cierres se listarán en esta sección para auditoría.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Fecha y Hora de Cierre</th>
                                    <th className="px-6 py-3">Apertura</th>
                                    <th className="px-6 py-3">Operadores</th>
                                    <th className="px-6 py-3 text-right">Fondo Inicial</th>
                                    <th className="px-6 py-3 text-right">Efectivo Contado</th>
                                    <th className="px-6 py-3 text-right">Diferencia</th>
                                    <th className="px-6 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {history.map((corte) => {
                                    const diff = corte.diferencia || 0;
                                    return (
                                        <tr key={corte.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900" suppressHydrationWarning>{formatDate(corte.cierreAt)}</span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Archivado
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-xs text-slate-500" suppressHydrationWarning>
                                                {formatDate(corte.aperturaAt)}
                                            </td>
                                            <td className="px-6 py-3.5 text-xs text-slate-800">
                                                <div className="flex flex-col">
                                                    <span>Abre: {corte.creadoPor ? `${corte.creadoPor.nombre || ''} ${corte.creadoPor.apellido || ''}`.trim() : 'N/D'}</span>
                                                    <span className="text-slate-400">Cierra: {corte.cerradoPor ? `${corte.cerradoPor.nombre || ''} ${corte.cerradoPor.apellido || ''}`.trim() : 'N/D'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-slate-900 font-bold">
                                                {formatCurrency(corte.saldoInicial)}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-slate-900 font-bold">
                                                {corte.saldoFinalEfectivo !== null ? formatCurrency(corte.saldoFinalEfectivo) : 'N/D'}
                                            </td>
                                            <td className={`px-6 py-3.5 text-right font-black ${
                                                diff === 0 
                                                    ? 'text-emerald-700' 
                                                    : diff < 0 
                                                    ? 'text-red-700 bg-red-50/50' 
                                                    : 'text-blue-700 bg-blue-50/50'
                                            }`}>
                                                {diff === 0 ? 'Cuadrada' : formatCurrency(diff)}
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <button
                                                    onClick={() => handleViewPastSession(corte)}
                                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition duration-200 cursor-pointer"
                                                >
                                                    Ver Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* DETAIL MODAL FOR PAST CLOSED SESSION */}
            {selectedPastSession && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl w-full">
                        <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">Detalles del Cierre de Caja</h3>
                                <p className="text-xs text-slate-400">ID del Turno: {selectedPastSession.id.substring(0, 8)}...</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedPastSession(null);
                                    setPastSummaryData(null);
                                }}
                                className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* GENERAL STATISTICS OF DETAILED SHIFT */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Fondo Inicial</span>
                                    <span className="font-black text-slate-900 text-sm mt-0.5 block">{formatCurrency(selectedPastSession.saldoInicial)}</span>
                                </div>
                                <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Efectivo Contado</span>
                                    <span className="font-black text-slate-900 text-sm mt-0.5 block">{selectedPastSession.saldoFinalEfectivo ? formatCurrency(selectedPastSession.saldoFinalEfectivo) : 'L. 0.00'}</span>
                                </div>
                                <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Diferencia</span>
                                    <span className={`font-black text-sm mt-0.5 block ${
                                        selectedPastSession.diferencia === 0
                                            ? 'text-emerald-700'
                                            : selectedPastSession.diferencia < 0
                                            ? 'text-red-700 font-black'
                                            : 'text-blue-700 font-black'
                                    }`}>{selectedPastSession.diferencia === 0 ? 'Sin diff.' : formatCurrency(selectedPastSession.diferencia)}</span>
                                </div>
                                <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Cierre Registrado</span>
                                    <span className="font-bold text-slate-800 text-xs mt-1 block truncate" suppressHydrationWarning>{formatDate(selectedPastSession.cierreAt)}</span>
                                </div>
                            </div>

                            {/* WORKFLOW METADATA */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
                                <p suppressHydrationWarning><strong>Abierto por:</strong> {selectedPastSession.creadoPor ? `${selectedPastSession.creadoPor.nombre || ''} ${selectedPastSession.creadoPor.apellido || ''} (${selectedPastSession.creadoPor.email})` : 'N/D'} el {formatDate(selectedPastSession.aperturaAt)}</p>
                                <p suppressHydrationWarning><strong>Cerrado por:</strong> {selectedPastSession.cerradoPor ? `${selectedPastSession.cerradoPor.nombre || ''} ${selectedPastSession.cerradoPor.apellido || ''} (${selectedPastSession.cerradoPor.email})` : 'N/D'} el {formatDate(selectedPastSession.cierreAt)}</p>
                                {selectedPastSession.observaciones && (
                                    <p className="mt-2 pt-2 border-t border-slate-200"><strong>Observaciones de cierre:</strong> <span className="italic text-slate-600">"{selectedPastSession.observaciones}"</span></p>
                                )}
                            </div>

                            {/* DETAIL METHOD ACCORDION FOR PAST CLOSED SESSION */}
                            {isLoadingPastDetails ? (
                                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                                    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-slate-500">Recuperando detalles del desglose...</span>
                                </div>
                            ) : pastSummaryData ? (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Desglose Final de Métodos de Pago</h4>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-xs text-slate-600">
                                            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                                <tr>
                                                    <th className="px-4 py-2">Método de Pago</th>
                                                    <th className="px-4 py-2 text-right">Facturación</th>
                                                    <th className="px-4 py-2 text-right">Rentas</th>
                                                    <th className="px-4 py-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago de Occidente'].map((metodo) => {
                                                    const v = pastSummaryData?.summary?.ventas?.[metodo] || 0;
                                                    const r = pastSummaryData?.summary?.rentas?.[metodo] || 0;
                                                    const total = v + r;
                                                    return (
                                                        <tr key={metodo} className="hover:bg-slate-50">
                                                            <td className="px-4 py-2.5 font-bold text-slate-900">{metodo}</td>
                                                            <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(v)}</td>
                                                            <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(r)}</td>
                                                            <td className={`px-4 py-2.5 text-right font-bold ${metodo === 'Efectivo' ? 'text-emerald-700 bg-emerald-50/20' : 'text-slate-900'}`}>{formatCurrency(total)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="bg-slate-900 text-white font-bold">
                                                    <td className="px-4 py-3">TOTALES</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pastSummaryData?.totals?.totalVentas || 0)}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pastSummaryData?.totals?.totalRentas || 0)}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(pastSummaryData?.totals?.totalIngresos || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
                            <button
                                onClick={() => {
                                    setSelectedPastSession(null);
                                    setPastSummaryData(null);
                                }}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition duration-200 cursor-pointer"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
