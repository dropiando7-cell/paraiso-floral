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
    ChevronUp,
    ChevronRight,
    Pencil,
    Plus,
    Trash2,
    Search,
    ArrowUpCircle,
    ArrowDownCircle
} from 'lucide-react';
import { abrirCaja, cerrarCaja, getCajaSessionSummary, getProductRotationReport, actualizarSaldoInicial, getActiveCajaSession, getPendingDeposits, registrarCorteMovimiento, anularCorteMovimiento } from './actions';

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
    
    // States for editing initial balance in active session
    const [isEditingSaldoInicial, setIsEditingSaldoInicial] = useState(false);
    const [nuevoSaldoInicial, setNuevoSaldoInicial] = useState<string>('');
    const [isSavingSaldoInicial, setIsSavingSaldoInicial] = useState(false);

    // Selected past session for detailed view modal/drawer
    const [selectedPastSession, setSelectedPastSession] = useState<any>(null);
    const [pastSummaryData, setPastSummaryData] = useState<any>(null);
    const [isLoadingPastDetails, setIsLoadingPastDetails] = useState(false);

    // Expandable methods for active and past sessions desglose
    const [expandedMethods, setExpandedMethods] = useState<Record<string, boolean>>({});
    const [expandedPastMethods, setExpandedPastMethods] = useState<Record<string, boolean>>({});

    // States for extraordinary movements
    const [showModalRetiro, setShowModalRetiro] = useState(false);
    const [showModalReembolso, setShowModalReembolso] = useState(false);
    const [montoRetiro, setMontoRetiro] = useState('');
    const [descripcionRetiro, setDescripcionRetiro] = useState('');
    const [referenciaRetiro, setReferenciaRetiro] = useState('');
    const [metodoPagoRetiro, setMetodoPagoRetiro] = useState('Efectivo');
    const [isSavingRetiro, setIsSavingRetiro] = useState(false);

    // States for manual cash register income/adjustment
    const [showModalIngreso, setShowModalIngreso] = useState(false);
    const [montoIngreso, setMontoIngreso] = useState('');
    const [descripcionIngreso, setDescripcionIngreso] = useState('');
    const [referenciaIngreso, setReferenciaIngreso] = useState('');
    const [metodoPagoIngreso, setMetodoPagoIngreso] = useState('Efectivo');
    const [isSavingIngreso, setIsSavingIngreso] = useState(false);

    const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
    const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
    const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
    const [montoReembolso, setMontoReembolso] = useState('');
    const [descripcionReembolso, setDescripcionReembolso] = useState('');
    const [metodoPagoReembolso, setMetodoPagoReembolso] = useState('Efectivo');
    const [isSavingReembolso, setIsSavingReembolso] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    // Start Edit Initial Balance
    const handleStartEdit = () => {
        if (!activeSession) return;
        setNuevoSaldoInicial(activeSession.saldoInicial.toString());
        setIsEditingSaldoInicial(true);
    };

    // Save Initial Balance
    const handleSaveSaldoInicial = async () => {
        if (!activeSession) return;
        const val = parseFloat(nuevoSaldoInicial);
        if (isNaN(val) || val < 0) {
            toast.error("El saldo inicial debe ser un número válido mayor o igual a 0");
            return;
        }

        setIsSavingSaldoInicial(true);
        try {
            const res = await actualizarSaldoInicial(activeSession.id, val);
            toast.success("Saldo inicial actualizado correctamente");
            // Fetch fully updated active session to sync modifier and updatedAt fields
            const updatedSession = await getActiveCajaSession();
            if (updatedSession) {
                setActiveSession(updatedSession);
            } else {
                setActiveSession((prev: any) => ({
                    ...prev,
                    saldoInicial: res.saldoInicial
                }));
            }
            
            // Reload the session details (which recalculates esperadoEfectivo, etc.)
            await fetchActiveSessionDetails(activeSession.id);
            
            setIsEditingSaldoInicial(false);
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Error al actualizar saldo inicial");
        } finally {
            setIsSavingSaldoInicial(false);
        }
    };

    const loadPendingDeposits = async () => {
        setIsLoadingDeposits(true);
        try {
            const data = await getPendingDeposits();
            setPendingDeposits(data);
        } catch (e) {
            toast.error("Error al cargar depósitos pendientes.");
        } finally {
            setIsLoadingDeposits(false);
        }
    };

    const handleSaveRetiro = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(montoRetiro);
        if (isNaN(amt) || amt <= 0) {
            toast.error("El monto del retiro debe ser un número válido mayor a 0");
            return;
        }
        setIsSavingRetiro(true);
        try {
            await registrarCorteMovimiento({
                sessionId: activeSession.id,
                tipo: 'EGRESO',
                concepto: 'RETIRO_BANCARIO',
                descripcion: descripcionRetiro || 'Retiro Bancario / Remesa',
                monto: amt,
                metodoPago: metodoPagoRetiro,
                referenciaId: referenciaRetiro || undefined
            });
            toast.success("Retiro registrado correctamente");
            setShowModalRetiro(false);
            setMontoRetiro('');
            setDescripcionRetiro('');
            setReferenciaRetiro('');
            await fetchActiveSessionDetails(activeSession.id);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Error al registrar retiro");
        } finally {
            setIsSavingRetiro(false);
        }
    };

    const handleSaveIngreso = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(montoIngreso);
        if (isNaN(amt) || amt <= 0) {
            toast.error("El monto del ingreso debe ser un número válido mayor a 0");
            return;
        }
        setIsSavingIngreso(true);
        try {
            await registrarCorteMovimiento({
                sessionId: activeSession.id,
                tipo: 'INGRESO',
                concepto: 'OTRO',
                descripcion: descripcionIngreso || 'Ingreso Extraordinario / Ajuste',
                monto: amt,
                metodoPago: metodoPagoIngreso,
                referenciaId: referenciaIngreso || undefined
            });
            toast.success("Ingreso registrado correctamente");
            setShowModalIngreso(false);
            setMontoIngreso('');
            setDescripcionIngreso('');
            setReferenciaIngreso('');
            await fetchActiveSessionDetails(activeSession.id);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Error al registrar ingreso");
        } finally {
            setIsSavingIngreso(false);
        }
    };

    const handleSaveReembolso = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeposit) {
            toast.error("Por favor seleccione el equipo/renta original.");
            return;
        }
        const amt = parseFloat(montoReembolso);
        if (isNaN(amt) || amt <= 0) {
            toast.error("El monto del reembolso debe ser un número válido mayor a 0");
            return;
        }
        if (amt > selectedDeposit.saldoPendiente) {
            toast.error(`El monto no puede superar el saldo pendiente de L. ${selectedDeposit.saldoPendiente.toFixed(2)}`);
            return;
        }
        if (metodoPagoReembolso === 'Efectivo' && amt >= 2000) {
            toast.error("Los reembolsos de L. 2,000.00 o más no se pueden realizar en Efectivo. Use Transferencia Bancaria.");
            return;
        }
        setIsSavingReembolso(true);
        try {
            await registrarCorteMovimiento({
                sessionId: activeSession.id,
                tipo: 'EGRESO',
                concepto: 'REEMBOLSO_GARANTIA',
                descripcion: descripcionReembolso || `Reembolso de Garantía: ${selectedDeposit.equipoNombre} (Serie: ${selectedDeposit.equipoSerie})`,
                monto: amt,
                metodoPago: metodoPagoReembolso,
                referenciaId: selectedDeposit.id
            });
            toast.success("Reembolso registrado correctamente");
            setShowModalReembolso(false);
            setSelectedDeposit(null);
            setMontoReembolso('');
            setDescripcionReembolso('');
            await fetchActiveSessionDetails(activeSession.id);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Error al registrar reembolso");
        } finally {
            setIsSavingReembolso(false);
        }
    };

    const handleAnularMovimiento = async (movId: string) => {
        if (!window.confirm("¿Está seguro de que desea anular este movimiento? Esta acción restaurará los saldos en el sistema.")) {
            return;
        }
        try {
            await anularCorteMovimiento(movId);
            toast.success("Movimiento anulado correctamente");
            await fetchActiveSessionDetails(activeSession.id);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Error al anular movimiento");
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

    // Unified transactional history search for a payment method
    const getMethodTransactions = (metodo: string, session: any) => {
        if (!session) return [];
        const txList: Array<{
            id: string;
            fechaStr: string;
            concepto: string;
            cliente: string;
            monto: number;
        }> = [];

        // Add invoices
        const facturas = session.facturas || [];
        facturas.filter((f: any) => (f.metodoPago || 'Efectivo') === metodo)
            .forEach((f: any) => {
                txList.push({
                    id: f.id,
                    fechaStr: f.fechaEmision,
                    concepto: `Facturación POS (${f.correlativo})`,
                    cliente: f.clienteNombre || 'Cliente General',
                    monto: f.total
                });
            });

        // Add rent payments
        const rentasPagos = session.rentasPagos || [];
        rentasPagos.filter((p: any) => (p.metodoPago || 'Efectivo') === metodo)
            .forEach((p: any) => {
                txList.push({
                    id: p.id,
                    fechaStr: p.fechaPago,
                    concepto: p.notas || `Pago de Renta (${p.equipoNombre})`,
                    cliente: p.clienteNombre || 'Cliente General',
                    monto: p.monto
                });
            });

        // Add support revisions
        const ordenesTrabajo = session.ordenesTrabajo || [];
        ordenesTrabajo.filter((o: any) => (o.metodoPagoRevision || 'Efectivo') === metodo)
            .forEach((o: any) => {
                txList.push({
                    id: o.id,
                    fechaStr: o.fechaRecibido,
                    concepto: `Revisión Soporte #${o.codigoSeguridad} (${o.equipoDano})`,
                    cliente: o.clienteNombre || 'Cliente General',
                    monto: o.total
                });
            });

        // Add extra movements (except REEMBOLSO_GARANTIA which is already in rentasPagos as negative payments)
        const movimientos = session.movimientos || [];
        movimientos.filter((m: any) => m.metodoPago === metodo && m.concepto !== 'REEMBOLSO_GARANTIA')
            .forEach((m: any) => {
                const isNegative = m.tipo === 'EGRESO';
                txList.push({
                    id: m.id,
                    fechaStr: m.createdAt,
                    concepto: `${m.concepto === 'RETIRO_BANCARIO' ? 'Retiro Bancario / Remesa' : m.concepto === 'OTRO' ? 'Ingreso / Ajuste' : 'Movimiento de Caja'} ${m.anuladaAt ? '(ANULADO)' : ''}`,
                    cliente: m.descripcion || 'Movimiento de Caja',
                    monto: isNegative ? -m.monto : m.monto
                });
            });

        // Sort by date descending
        return txList.sort((a, b) => new Date(b.fechaStr).getTime() - new Date(a.fechaStr).getTime());
    };

    const renderBreakdownRow = (metodo: string, session: any, isExpanded: boolean, colSpan: number = 5) => {
        const txs = getMethodTransactions(metodo, session);

        if (!isExpanded) return null;

        return (
            <tr className="bg-slate-50/30">
                <td colSpan={colSpan} className="px-6 py-3 border-t border-b border-slate-100">
                    <div className="bg-white/95 rounded-xl border border-slate-200 shadow-inner p-3 space-y-2">
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Desglose de Transacciones
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                {txs.length} item{txs.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {txs.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-2">
                                No se encontraron transacciones registradas para este método de pago.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] text-slate-600">
                                    <thead>
                                        <tr className="text-slate-400 font-bold uppercase border-b border-slate-100 bg-slate-50/50">
                                            <th className="px-2 py-1">Hora</th>
                                            <th className="px-2 py-1">Concepto</th>
                                            <th className="px-2 py-1">Cliente</th>
                                            <th className="px-2 py-1 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-medium">
                                        {txs.map((tx) => {
                                            const isNegative = tx.monto < 0;
                                            return (
                                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-2 py-1.5 text-slate-500 font-normal">
                                                        {new Date(tx.fechaStr).toLocaleTimeString('es-HN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-slate-900 font-semibold">{tx.concepto}</td>
                                                    <td className="px-2 py-1.5 text-slate-600">{tx.cliente}</td>
                                                    <td className={`px-2 py-1.5 text-right font-bold ${isNegative ? 'text-rose-600' : 'text-slate-800'}`}>
                                                        {isNegative ? '-' : '+'} {formatCurrency(Math.abs(tx.monto))}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        );
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
                                    {activeSession.modificadoPor && (
                                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5" suppressHydrationWarning>
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                            <span>Última mod.: {`${activeSession.modificadoPor.nombre || ''} ${activeSession.modificadoPor.apellido || ''}`.trim()} ({activeSession.modificadoPor.email}) el {formatDate(activeSession.updatedAt)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Fondo Inicial</span>
                                {isEditingSaldoInicial ? (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="relative rounded-lg shadow-sm w-32">
                                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                <span className="text-slate-400 font-bold text-xs">L.</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="block w-full pl-5 pr-1.5 py-1 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-right"
                                                value={nuevoSaldoInicial}
                                                onChange={(e) => setNuevoSaldoInicial(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <button
                                            onClick={handleSaveSaldoInicial}
                                            disabled={isSavingSaldoInicial}
                                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
                                            title="Guardar"
                                        >
                                            {isSavingSaldoInicial ? (
                                                <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setIsEditingSaldoInicial(false)}
                                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
                                            title="Cancelar"
                                        >
                                            <span className="text-xs font-black px-0.5">X</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-2xl font-black text-slate-900">{formatCurrency(activeSession.saldoInicial)}</span>
                                        <button 
                                            onClick={handleStartEdit}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-950 transition cursor-pointer"
                                            title="Editar fondo inicial"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
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
                                            <p className="text-[10px] text-slate-400 mt-1">Fondo + Ventas, Rentas y Soporte en efectivo</p>
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
                                                    (summaryData?.totals?.rentasEfectivo || 0) -
                                                    (summaryData?.totals?.soporteEfectivo || 0)
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
                                                    <th className="px-6 py-3 text-right">Cobros de Soporte</th>
                                                    <th className="px-6 py-3 text-right">Total Acumulado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago de Occidente'].map((metodo) => {
                                                    const v = summaryData?.summary?.ventas?.[metodo] || 0;
                                                    const r = summaryData?.summary?.rentas?.[metodo] || 0;
                                                    const s = summaryData?.summary?.soporte?.[metodo] || 0;
                                                    const total = v + r + s;
                                                    const isExpanded = !!expandedMethods[metodo];
                                                    return (
                                                        <React.Fragment key={metodo}>
                                                            <tr 
                                                                onClick={() => setExpandedMethods(prev => ({ ...prev, [metodo]: !prev[metodo] }))}
                                                                className="hover:bg-slate-50/80 transition bg-white cursor-pointer select-none"
                                                            >
                                                                <td className="px-6 py-3.5 font-bold text-slate-900">
                                                                    <div className="flex items-center gap-2">
                                                                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                                                                        <span>{metodo}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3.5 text-right text-slate-800">{formatCurrency(v)}</td>
                                                                <td className="px-6 py-3.5 text-right text-slate-800">{formatCurrency(r)}</td>
                                                                <td className="px-6 py-3.5 text-right text-slate-800">{formatCurrency(s)}</td>
                                                                <td className={`px-6 py-3.5 text-right font-bold ${metodo === 'Efectivo' ? 'text-emerald-700 bg-emerald-50/40' : 'text-slate-900'}`}>{formatCurrency(total)}</td>
                                                            </tr>
                                                            {renderBreakdownRow(metodo, summaryData?.session, isExpanded, 5)}
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <tr className="bg-slate-900 text-white font-bold text-sm">
                                                    <td className="px-6 py-4">TOTALES DEL TURNO</td>
                                                    <td className="px-6 py-4 text-right">{formatCurrency(summaryData?.totals?.totalVentas || 0)}</td>
                                                    <td className="px-6 py-4 text-right">{formatCurrency(summaryData?.totals?.totalRentas || 0)}</td>
                                                    <td className="px-6 py-4 text-right">{formatCurrency(summaryData?.totals?.totalSoporte || 0)}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-400">{formatCurrency(summaryData?.totals?.totalIngresos || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* MOVIMIENTOS EXTRAORDINARIOS */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-950">Movimientos Extraordinarios (Remesas y Reembolsos)</h3>
                                            <p className="text-xs text-slate-500">Retiros de efectivo a bancos, reembolsos de depósitos en garantía y otros ajustes de caja</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setMontoIngreso('');
                                                    setDescripcionIngreso('');
                                                    setReferenciaIngreso('');
                                                    setMetodoPagoIngreso('Efectivo');
                                                    setShowModalIngreso(true);
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Registrar Ingreso / Ajuste
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setMontoRetiro('');
                                                    setDescripcionRetiro('');
                                                    setReferenciaRetiro('');
                                                    setMetodoPagoRetiro('Efectivo');
                                                    setShowModalRetiro(true);
                                                }}
                                                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Registrar Retiro / Remesa
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedDeposit(null);
                                                    setMontoReembolso('');
                                                    setDescripcionReembolso('');
                                                    setMetodoPagoReembolso('Efectivo');
                                                    setSearchQuery('');
                                                    setShowModalReembolso(true);
                                                    loadPendingDeposits();
                                                }}
                                                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Reembolsar Garantía
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {!summaryData?.session?.movimientos || summaryData.session.movimientos.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">
                                            <Activity className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                            <p className="font-semibold text-xs">No hay movimientos extraordinarios registrados en este turno.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-slate-600">
                                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                                                    <tr>
                                                        <th className="px-6 py-2.5">Fecha / Hora</th>
                                                        <th className="px-6 py-2.5">Tipo</th>
                                                        <th className="px-6 py-2.5">Concepto</th>
                                                        <th className="px-6 py-2.5">Descripción / Referencia</th>
                                                        <th className="px-6 py-2.5">Método</th>
                                                        <th className="px-6 py-2.5 text-right">Monto</th>
                                                        <th className="px-6 py-2.5 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-medium">
                                                    {summaryData.session.movimientos.map((mov: any) => {
                                                        const isAnulado = !!mov.anuladaAt;
                                                        return (
                                                            <tr key={mov.id} className={`hover:bg-slate-50/80 transition ${isAnulado ? 'opacity-50 line-through bg-slate-50/20' : ''}`}>
                                                                <td className="px-6 py-3 text-xs text-slate-500" suppressHydrationWarning>
                                                                    {formatDate(mov.createdAt)}
                                                                </td>
                                                                <td className="px-6 py-3 text-xs">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                        mov.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                                    }`}>
                                                                        {mov.tipo}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3 text-xs font-bold text-slate-900">
                                                                    {mov.concepto === 'RETIRO_BANCARIO' ? 'Retiro Bancario / Remesa' : mov.concepto === 'REEMBOLSO_GARANTIA' ? 'Reembolso de Garantía' : mov.concepto === 'OTRO' ? 'Ingreso / Ajuste' : 'Otro Movimiento'}
                                                                </td>
                                                                <td className="px-6 py-3 text-xs">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-slate-800 font-semibold">{mov.descripcion}</span>
                                                                        <span className="text-[10px] text-slate-400">Creado por: {mov.creadoPor?.nombre || 'Usuario'}</span>
                                                                        {isAnulado && <span className="text-[10px] text-rose-600 font-bold">Anulado por: {mov.anuladaPor?.nombre || 'Usuario'}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3 text-xs text-slate-700">
                                                                    {mov.metodoPago}
                                                                </td>
                                                                <td className={`px-6 py-3 text-right font-black text-xs ${mov.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                                    {mov.tipo === 'INGRESO' ? '+' : '-'} {formatCurrency(mov.monto)}
                                                                </td>
                                                                <td className="px-6 py-3 text-center">
                                                                    {!isAnulado && (
                                                                        <button
                                                                            onClick={() => handleAnularMovimiento(mov.id)}
                                                                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                                                            title="Anular Movimiento"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
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
                                {selectedPastSession.modificadoPor && (
                                    <p suppressHydrationWarning><strong>Modificado por:</strong> {`${selectedPastSession.modificadoPor.nombre || ''} ${selectedPastSession.modificadoPor.apellido || ''}`.trim()} ({selectedPastSession.modificadoPor.email}) el {formatDate(selectedPastSession.updatedAt)}</p>
                                )}
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
                                                    <th className="px-4 py-2 text-right">Soporte</th>
                                                    <th className="px-4 py-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago de Occidente'].map((metodo) => {
                                                    const v = pastSummaryData?.summary?.ventas?.[metodo] || 0;
                                                    const r = pastSummaryData?.summary?.rentas?.[metodo] || 0;
                                                    const s = pastSummaryData?.summary?.soporte?.[metodo] || 0;
                                                    const total = v + r + s;
                                                    const isExpanded = !!expandedPastMethods[metodo];
                                                    return (
                                                        <React.Fragment key={metodo}>
                                                            <tr 
                                                                onClick={() => setExpandedPastMethods(prev => ({ ...prev, [metodo]: !prev[metodo] }))}
                                                                className="hover:bg-slate-50 transition cursor-pointer select-none"
                                                            >
                                                                <td className="px-4 py-2.5 font-bold text-slate-900">
                                                                    <div className="flex items-center gap-1.5">
                                                                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                                                                        <span>{metodo}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(v)}</td>
                                                                <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(r)}</td>
                                                                <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(s)}</td>
                                                                <td className={`px-4 py-2.5 text-right font-bold ${metodo === 'Efectivo' ? 'text-emerald-700 bg-emerald-50/20' : 'text-slate-900'}`}>{formatCurrency(total)}</td>
                                                            </tr>
                                                            {renderBreakdownRow(metodo, pastSummaryData?.session, isExpanded, 5)}
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <tr className="bg-slate-900 text-white font-bold">
                                                    <td className="px-4 py-3">TOTALES</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pastSummaryData?.totals?.totalVentas || 0)}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pastSummaryData?.totals?.totalRentas || 0)}</td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(pastSummaryData?.totals?.totalSoporte || 0)}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(pastSummaryData?.totals?.totalIngresos || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* MOVIMIENTOS REGISTRADOS EN ESTA SESION PASADA */}
                                    {pastSummaryData?.session?.movimientos?.length > 0 && (
                                        <div className="space-y-4 mt-6">
                                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Movimientos Extraordinarios del Turno</h4>
                                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                <table className="w-full text-left text-xs text-slate-600">
                                                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                                        <tr>
                                                            <th className="px-4 py-2">Fecha</th>
                                                            <th className="px-4 py-2">Tipo</th>
                                                            <th className="px-4 py-2">Concepto</th>
                                                            <th className="px-4 py-2">Descripción</th>
                                                            <th className="px-4 py-2">Método</th>
                                                            <th className="px-4 py-2 text-right">Monto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 font-medium">
                                                        {pastSummaryData.session.movimientos.map((mov: any) => {
                                                            const isAnulado = !!mov.anuladaAt;
                                                            return (
                                                                <tr key={mov.id} className={`${isAnulado ? 'opacity-50 line-through bg-slate-50/20' : ''}`}>
                                                                    <td className="px-4 py-2 text-slate-500" suppressHydrationWarning>{formatDate(mov.createdAt)}</td>
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                                            mov.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                                        }`}>
                                                                            {mov.tipo}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 font-bold text-slate-800">
                                                                        {mov.concepto === 'RETIRO_BANCARIO' ? 'Retiro Bancario' : mov.concepto === 'REEMBOLSO_GARANTIA' ? 'Reembolso Garantía' : mov.concepto === 'OTRO' ? 'Ingreso / Ajuste' : 'Otro'}
                                                                    </td>
                                                                    <td className="px-4 py-2">
                                                                        <div className="flex flex-col">
                                                                            <span>{mov.descripcion}</span>
                                                                            {isAnulado && <span className="text-[9px] text-rose-600 font-bold">ANULADO</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-slate-600">{mov.metodoPago}</td>
                                                                    <td className={`px-4 py-2 text-right font-bold ${mov.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                                        {mov.tipo === 'INGRESO' ? '+' : '-'} {formatCurrency(mov.monto)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
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

            {/* MODAL RETIRO / REMESA BANCARIA */}
            {showModalRetiro && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-md w-full animate-scale-in">
                        <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-base">Registrar Retiro / Remesa Bancaria</h3>
                            <button
                                onClick={() => setShowModalRetiro(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveRetiro} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Método de Retiro
                                </label>
                                <select
                                    className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={metodoPagoRetiro}
                                    onChange={(e) => setMetodoPagoRetiro(e.target.value)}
                                >
                                    <option value="Efectivo">Efectivo (Gaveta diaria)</option>
                                    <option value="Transferencia">Transferencia Bancaria</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Monto del Retiro (Lempiras)
                                </label>
                                <div className="relative rounded-lg shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-medium">L.</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="0.00"
                                        value={montoRetiro}
                                        onChange={(e) => setMontoRetiro(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Referencia Bancaria / Cuenta (Opcional)
                                </label>
                                <input
                                    type="text"
                                    className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="Ej. Depósito BAC #123456"
                                    value={referenciaRetiro}
                                    onChange={(e) => setReferenciaRetiro(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Notas / Observaciones
                                </label>
                                <textarea
                                    className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    rows={2}
                                    placeholder="Detalles sobre el retiro de efectivo o remesa..."
                                    value={descripcionRetiro}
                                    onChange={(e) => setDescripcionRetiro(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModalRetiro(false)}
                                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg text-xs transition duration-200 cursor-pointer text-center"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingRetiro}
                                    className="w-1/2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSavingRetiro && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Guardar Retiro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL INGRESO EXTRAORDINARIO / AJUSTE */}
            {showModalIngreso && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-md w-full animate-scale-in">
                        <div className="bg-emerald-900 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-base text-white">Registrar Ingreso / Ajuste Extraordinario</h3>
                            <button
                                onClick={() => setShowModalIngreso(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveIngreso} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Método de Ingreso
                                </label>
                                <select
                                    className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={metodoPagoIngreso}
                                    onChange={(e) => setMetodoPagoIngreso(e.target.value)}
                                >
                                    <option value="Efectivo">Efectivo (Gaveta diaria)</option>
                                    <option value="Transferencia">Transferencia Bancaria</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Link de pago de Occidente">Link de pago de Occidente</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Monto del Ingreso (Lempiras) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative rounded-lg shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-medium">L.</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="0.00"
                                        value={montoIngreso}
                                        onChange={(e) => setMontoIngreso(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Referencia Bancaria / Captura (Opcional)
                                </label>
                                <input
                                    type="text"
                                    className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Ej. Depósito Atlántida #987654"
                                    value={referenciaIngreso}
                                    onChange={(e) => setReferenciaIngreso(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Notas / Justificación
                                </label>
                                <textarea
                                    className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    rows={2}
                                    placeholder="Ej. Cobro parcial de proforma PRO-SO00001279..."
                                    value={descripcionIngreso}
                                    onChange={(e) => setDescripcionIngreso(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModalIngreso(false)}
                                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg text-xs transition duration-200 cursor-pointer text-center"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingIngreso}
                                    className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSavingIngreso && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Guardar Ingreso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL REEMBOLSO DE GARANTIA */}
            {showModalReembolso && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-md w-full animate-scale-in">
                        <div className="bg-brand-950 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-base text-white">Reembolsar Depósito en Garantía</h3>
                            <button
                                onClick={() => setShowModalReembolso(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveReembolso} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Buscar Alquiler Original (Serie / QR / Cliente / Equipo)
                                </label>
                                <div className="relative rounded-lg shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="Escriba número de serie, QR..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {!selectedDeposit ? (
                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                                    {isLoadingDeposits ? (
                                        <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                                            <span>Buscando depósitos...</span>
                                        </div>
                                    ) : pendingDeposits.filter((d: any) => {
                                        const query = searchQuery.toLowerCase();
                                        return (
                                            d.equipoSerie.toLowerCase().includes(query) ||
                                            d.equipoIdQr.toLowerCase().includes(query) ||
                                            d.equipoNombre.toLowerCase().includes(query) ||
                                            d.clienteNombre.toLowerCase().includes(query)
                                        );
                                    }).length === 0 ? (
                                        <div className="p-6 text-center text-xs text-slate-500">
                                            No se encontraron alquileres activos con saldo pendiente.
                                        </div>
                                    ) : (
                                        pendingDeposits.filter((d: any) => {
                                            const query = searchQuery.toLowerCase();
                                            return (
                                                d.equipoSerie.toLowerCase().includes(query) ||
                                                d.equipoIdQr.toLowerCase().includes(query) ||
                                                d.equipoNombre.toLowerCase().includes(query) ||
                                                d.clienteNombre.toLowerCase().includes(query)
                                            );
                                        }).map((d: any) => (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDeposit(d);
                                                    setMontoReembolso(d.saldoPendiente.toFixed(2));
                                                }}
                                                className="w-full text-left p-3 hover:bg-slate-100 flex justify-between items-center transition bg-white"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{d.equipoNombre}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        Serie: <strong className="text-slate-800">{d.equipoSerie}</strong> | QR: <strong className="text-slate-800">{d.equipoIdQr}</strong>
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">Cliente: {d.clienteNombre}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-brand-700 block">{formatCurrency(d.saldoPendiente)}</span>
                                                    <span className="text-[9px] text-slate-400 block">Depósito: {formatCurrency(d.deposito)}</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 relative">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDeposit(null)}
                                        className="absolute top-3 right-3 text-slate-500 hover:text-slate-950 font-bold text-xs"
                                    >
                                        Cambiar
                                    </button>
                                    <h4 className="text-xs font-bold text-slate-900 pr-12">{selectedDeposit.equipoNombre}</h4>
                                    <div className="grid grid-cols-2 gap-3 mt-3 text-[11px] text-slate-700">
                                        <div>
                                            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Número de Serie</span>
                                            <strong className="text-slate-950">{selectedDeposit.equipoSerie}</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Código QR</span>
                                            <strong className="text-slate-950">{selectedDeposit.equipoIdQr}</strong>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Cliente original</span>
                                            <span className="text-slate-950 font-bold block truncate">{selectedDeposit.clienteNombre}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Depósito Total</span>
                                            <span className="text-slate-950 block">{formatCurrency(selectedDeposit.deposito)}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Saldo Devolución</span>
                                            <strong className="text-emerald-700 block text-xs">{formatCurrency(selectedDeposit.saldoPendiente)}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedDeposit && (
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                            Método de Reembolso
                                        </label>
                                        <select
                                            className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            value={metodoPagoReembolso}
                                            onChange={(e) => setMetodoPagoReembolso(e.target.value)}
                                        >
                                            <option value="Efectivo">Efectivo (Gaveta diaria)</option>
                                            <option value="Transferencia">Transferencia Bancaria</option>
                                        </select>
                                        {metodoPagoReembolso === 'Efectivo' && (
                                            <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 font-semibold">
                                                <AlertCircle className="w-3.5 h-3.5" /> Límite en efectivo: Menor a L. 2,000.00
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                            Monto a Reembolsar
                                        </label>
                                        <div className="relative rounded-lg shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-slate-400 font-medium">L.</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                max={selectedDeposit.saldoPendiente}
                                                className="block w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                value={montoReembolso}
                                                onChange={(e) => setMontoReembolso(e.target.value)}
                                                required
                                            />
                                        </div>
                                        {metodoPagoReembolso === 'Efectivo' && parseFloat(montoReembolso) >= 2000 && (
                                            <p className="text-rose-600 font-bold text-[10px] mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5" /> Reembolsos ≥ L. 2,000.00 requieren Transferencia Bancaria.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                                            Notas / Observaciones del Reembolso
                                        </label>
                                        <textarea
                                            className="block w-full border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            rows={2}
                                            placeholder="Detalles de la entrega del equipo y devolución..."
                                            value={descripcionReembolso}
                                            onChange={(e) => setDescripcionReembolso(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModalReembolso(false)}
                                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg text-xs transition duration-200 cursor-pointer text-center"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingReembolso || (metodoPagoReembolso === 'Efectivo' && parseFloat(montoReembolso) >= 2000)}
                                    className="w-1/2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSavingReembolso && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Guardar Reembolso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
