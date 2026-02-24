'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    Sparkles, ExternalLink, Clock, CheckCircle2, XCircle,
    FileSpreadsheet, Calendar as CalendarIcon, RefreshCw,
    ShieldCheck, ShieldAlert, Building2, CreditCard,
    AlertTriangle, TrendingUp, TrendingDown, FileText, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// ─── Types matching TemplateReconciliationData from claude-reconciliation.ts ──

interface ReconciliationItem {
    fecha: string;
    referencia: string;
    descripcion: string;
    monto: number;
}

interface ReconciliationReport {
    informacion_general: {
        banco_nombre: string;
        cuenta_numero: string;
        fecha_conciliacion: string;
        moneda: string;
        saldo_banco: number;
        saldo_libros: number;
    };
    debitos_libros_no_banco: ReconciliationItem[];
    creditos_libros_no_banco: ReconciliationItem[];
    debitos_banco_no_libros: ReconciliationItem[];
    creditos_banco_no_libros: ReconciliationItem[];
    autorizaciones: {
        elaborado_nombre: string;
        elaborado_fecha: string;
    };
}

interface DriveFile {
    fileName: string;
    fileId: string;
    webViewLink: string;
}

interface ReportHistoryItem {
    id: string;
    banco: string;
    tipoCuenta: string;
    fileName: string;
    generatedAt: string;
    status: ReportStatus;
    isApproved: boolean;
    report?: ReconciliationReport;
    filesFound?: string[];
    errorMsg?: string;
    driveFile?: DriveFile | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type ReportStatus = 'COMPLETED' | 'PROCESSING' | 'FAILED';

const BANKS = [
    'Banpais', 'Davivienda', 'BAC Honduras',
    'AFP Atlántida', 'Banco de Occidente', 'PayPal',
];

const ACCOUNT_TYPES = ['Cuenta de Ahorro', 'Cuenta de Cheques'];

const MONTH_NAMES: Record<string, string> = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemTable({ title, items, colorClass }: { title: string; items: ReconciliationItem[]; colorClass: string }) {
    if (!items || items.length === 0) return null;
    const total = items.reduce((s, i) => s + (i.monto ?? 0), 0);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colorClass}`}>
                    L. {total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                    <tr>
                        <th className="px-5 py-2.5 text-left font-semibold">Fecha</th>
                        <th className="px-5 py-2.5 text-left font-semibold">Referencia</th>
                        <th className="px-5 py-2.5 text-left font-semibold">Descripción</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, i) => (
                        <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                            <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{item.fecha}</td>
                            <td className="px-5 py-3 text-slate-500 font-mono text-xs">{item.referencia}</td>
                            <td className="px-5 py-3 text-slate-700">{item.descripcion}</td>
                            <td className="px-5 py-3 text-right font-mono font-medium text-slate-800">
                                L. {(item.monto ?? 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ReportPanel({ report, filesFound }: { report: ReconciliationReport; filesFound?: string[] }) {
    const info = report.informacion_general ?? {};
    const saldoBanco = info.saldo_banco ?? 0;
    const saldoLibros = info.saldo_libros ?? 0;
    const diferencia = saldoBanco - saldoLibros;
    const isBalanced = Math.abs(diferencia) < 0.01;

    const fmt = (n: number) => n.toLocaleString('es-HN', { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6">
            {/* Summary banner */}
            <div className={clsx(
                "rounded-2xl p-6 border",
                isBalanced ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
            )}>
                <div className="flex items-start gap-4">
                    <div className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        isBalanced ? "bg-emerald-100" : "bg-amber-100"
                    )}>
                        {isBalanced
                            ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            : <AlertTriangle className="w-6 h-6 text-amber-600" />
                        }
                    </div>
                    <div>
                        <p className={clsx("font-bold text-lg", isBalanced ? "text-emerald-800" : "text-amber-800")}>
                            {isBalanced ? 'Conciliación Cuadrada ✓' : 'Diferencias Encontradas'}
                        </p>
                        <p className={clsx("text-sm mt-1", isBalanced ? "text-emerald-700" : "text-amber-700")}>
                            {info.banco_nombre} — {info.cuenta_numero} — {info.fecha_conciliacion}
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { label: 'Saldo Banco', value: `L. ${fmt(saldoBanco)}`, icon: Building2, color: 'blue' },
                    { label: 'Saldo Libros', value: `L. ${fmt(saldoLibros)}`, icon: FileText, color: 'indigo' },
                    { label: 'Diferencia', value: `L. ${fmt(diferencia)}`, icon: isBalanced ? CheckCircle2 : TrendingDown, color: isBalanced ? 'emerald' : 'red' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className={`w-9 h-9 rounded-lg bg-${color}-50 flex items-center justify-center mb-3`}>
                            <Icon className={`w-5 h-5 text-${color}-600`} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{label}</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5 truncate">{value}</p>
                    </div>
                ))}
            </div>

            {/* Four reconciliation sections */}
            <ItemTable
                title="Depósitos en tránsito (en libros, no en banco)"
                items={report.debitos_libros_no_banco}
                colorClass="bg-blue-50 text-blue-700"
            />
            <ItemTable
                title="Cheques en circulación (en libros, no cobrados en banco)"
                items={report.creditos_libros_no_banco}
                colorClass="bg-purple-50 text-purple-700"
            />
            <ItemTable
                title="Cargos bancarios no registrados en libros"
                items={report.debitos_banco_no_libros}
                colorClass="bg-red-50 text-red-700"
            />
            <ItemTable
                title="Abonos bancarios no registrados en libros"
                items={report.creditos_banco_no_libros}
                colorClass="bg-emerald-50 text-emerald-700"
            />

            {/* Files used */}
            {filesFound && filesFound.length > 0 && (
                <div className="text-xs text-slate-400">
                    <span className="font-semibold">Archivos analizados:</span>{' '}
                    {filesFound.join(' · ')}
                </div>
            )}
        </div>
    );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConciliacionPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedBanco, setSelectedBanco] = useState('');
    const [selectedTipoCuenta, setSelectedTipoCuenta] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('03');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [history, setHistory] = useState<ReportHistoryItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('USER');
    const [duplicateConfirm, setDuplicateConfirm] = useState<{ banco: string; tipoCuenta: string; month: string; year: string } | null>(null);

    const LOADING_STEPS = [
        { icon: '📂', text: 'Conectando con Google Drive...' },
        { icon: '📄', text: 'Leyendo documentos contables...' },
        { icon: '🤖', text: 'Analizando con Inteligencia Artificial...' },
        { icon: '🔍', text: 'Identificando diferencias y movimientos...' },
        { icon: '📊', text: 'Generando conciliación bancaria...' },
        { icon: '☁️', text: 'Guardando reporte en Google Drive...' },
    ];

    const startLoading = () => {
        setLoadingStep(0);
        setIsGenerating(true);
        const interval = setInterval(() => {
            setLoadingStep(prev => {
                if (prev >= LOADING_STEPS.length - 1) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 7000);
        return interval;
    };

    const finishLoading = (intervalId: ReturnType<typeof setInterval>, success: boolean) => {
        clearInterval(intervalId);
        setIsGenerating(false);
        if (success) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3500);
        }
    };

    // Fetch user role on mount
    useEffect(() => {
        const fetchRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) return;
            const res = await fetch('/api/user/role');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.role ?? 'USER');
            }
        };
        fetchRole();
    }, []);

    const canApprove = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN';

    const handleGenerate = async () => {
        if (!selectedBanco || !selectedTipoCuenta) {
            setError('Selecciona un banco y tipo de cuenta antes de continuar.');
            return;
        }

        setError(null);
        const intervalId = startLoading();

        const monthName = MONTH_NAMES[selectedMonth];
        const newId = `temp-${Date.now()}`;
        const fileName = `Conciliacion_${selectedBanco.replace(/ /g, '_')}_${monthName}${selectedYear}.json`;

        // Add processing item
        const processingItem: ReportHistoryItem = {
            id: newId,
            banco: selectedBanco,
            tipoCuenta: selectedTipoCuenta,
            fileName,
            generatedAt: new Date().toISOString().split('T')[0],
            status: 'PROCESSING',
            isApproved: false,
        };
        setHistory(prev => [processingItem, ...prev]);

        try {
            const res = await fetch('/api/conciliacion/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    banco: selectedBanco,
                    tipoCuenta: selectedTipoCuenta,
                    month: selectedMonth,
                    year: selectedYear,
                }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                if (res.status === 409 && data.duplicate && !data.approved) {
                    setHistory(prev => prev.filter(item => item.id !== newId));
                    finishLoading(intervalId, false);
                    setDuplicateConfirm({ banco: selectedBanco, tipoCuenta: selectedTipoCuenta, month: selectedMonth, year: selectedYear });
                    return;
                }
                setHistory(prev => prev.map(item =>
                    item.id === newId
                        ? { ...item, status: 'FAILED', errorMsg: data.error ?? 'Error desconocido' }
                        : item
                ));
                finishLoading(intervalId, false);
                return;
            }

            setHistory(prev => prev.map(item =>
                item.id === newId
                    ? { ...item, id: data.id, status: 'COMPLETED', report: data.report, filesFound: data.filesFound, driveFile: data.driveFile }
                    : item
            ));
            setExpandedId(data.id);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setHistory(prev => prev.map(item =>
                item.id === newId ? { ...item, status: 'FAILED', errorMsg: msg } : item
            ));
        }

        finishLoading(intervalId, true);
    };

    const handleGenerateForce = async () => {
        if (!duplicateConfirm) return;
        setDuplicateConfirm(null);
        const { banco, tipoCuenta, month, year } = duplicateConfirm;
        const monthName = MONTH_NAMES[month];
        const newId = `temp-${Date.now()}`;
        const processingItem: ReportHistoryItem = {
            id: newId, banco, tipoCuenta,
            fileName: `Conciliacion_${banco}_${monthName}${year}.xlsx`,
            generatedAt: new Date().toISOString().split('T')[0],
            status: 'PROCESSING', isApproved: false,
        };
        setHistory(prev => [processingItem, ...prev]);
        const intervalId = startLoading();
        try {
            const res = await fetch('/api/conciliacion/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ banco, tipoCuenta, month, year, force: true }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setHistory(prev => prev.map(item =>
                    item.id === newId ? { ...item, status: 'FAILED', errorMsg: data.error } : item
                ));
                finishLoading(intervalId, false);
            } else {
                setHistory(prev => prev.map(item =>
                    item.id === newId
                        ? { ...item, id: data.id, status: 'COMPLETED', report: data.report, filesFound: data.filesFound, driveFile: data.driveFile }
                        : item
                ));
                setExpandedId(data.id);
                finishLoading(intervalId, true);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setHistory(prev => prev.map(item =>
                item.id === newId ? { ...item, status: 'FAILED', errorMsg: msg } : item
            ));
            finishLoading(intervalId, false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch('/api/conciliacion/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                setHistory(prev => prev.filter(item => item.id !== id));
                if (expandedId === id) setExpandedId(null);
            } else {
                const d = await res.json();
                setError(d.error ?? 'No se pudo eliminar la conciliación.');
            }
        } catch {
            setError('Error al eliminar.');
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await fetch('/api/conciliacion/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            setHistory(prev => prev.map(item =>
                item.id === id ? { ...item, isApproved: true } : item
            ));
        } catch {
            // silently fail — optimistic UI already updated
        }
    };

    const getStatusBadge = (status: ReportStatus) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" /><span>Completado</span>
                    </div>
                );
            case 'PROCESSING':
                return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Analizando con IA...</span>
                    </div>
                );
            case 'FAILED':
                return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        <XCircle className="w-3.5 h-3.5" /><span>Fallido</span>
                    </div>
                );
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-[#F8FAFC]">
            <main className="max-w-5xl mx-auto p-8 lg:p-12 space-y-10">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Conciliación Bancaria con IA</h1>
                    <p className="text-slate-500 text-lg max-w-2xl mt-4 leading-relaxed">
                        Selecciona el banco, tipo de cuenta y período. La IA buscará los archivos en Google Drive,
                        los analizará y generará el reporte automáticamente para revisión y autorización.
                    </p>
                </div>

                {/* Action Card */}
                <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 space-y-6">

                    {/* Row 1: Bank + Account Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bank selector */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Banco</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <select
                                    value={selectedBanco}
                                    onChange={(e) => setSelectedBanco(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 text-base bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] appearance-none border transition-colors font-medium cursor-pointer"
                                >
                                    <option value="">Seleccionar banco...</option>
                                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Account type selector */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Cuenta</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <select
                                    value={selectedTipoCuenta}
                                    onChange={(e) => setSelectedTipoCuenta(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 text-base bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] appearance-none border transition-colors font-medium cursor-pointer"
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Period + Button */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Período a Conciliar</label>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <CalendarIcon className="w-5 h-5" />
                                    </div>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 text-base bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] appearance-none border transition-colors font-medium min-w-[140px] cursor-pointer"
                                    >
                                        {Object.entries(MONTH_NAMES).map(([v, label]) => (
                                            <option key={v} value={v}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="block px-4 py-3 text-base bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] appearance-none border transition-colors font-medium cursor-pointer"
                                >
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={twMerge(clsx(
                                "flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-md shadow-[#0500A3]/20 md:ml-auto w-full md:w-auto",
                                isGenerating
                                    ? "bg-[#0500A3]/70 cursor-not-allowed"
                                    : "bg-[#0500A3] hover:bg-[#04008A] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            ))}
                        >
                            {isGenerating ? (
                                <><RefreshCw className="w-5 h-5 animate-spin text-white/80" /><span>Analizando con IA...</span></>
                            ) : (
                                <><Sparkles className="w-5 h-5 text-blue-200" /><span>Generar Reporte con IA</span></>
                            )}
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* History + Inline Report View */}
                {history.length > 0 && (
                    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Reportes Generados</h2>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                                <Clock className="w-4 h-4" />
                                <span>Esta sesión</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-500 text-sm border-b border-slate-100">
                                        <th className="px-8 py-4 font-semibold">Banco / Cuenta</th>
                                        <th className="px-6 py-4 font-semibold">Período</th>
                                        <th className="px-6 py-4 font-semibold">Estado</th>
                                        <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((item) => (
                                        <​React.Fragment key={item.id}>
                                            <tr
                                                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                                onClick={() => item.status === 'COMPLETED' && setExpandedId(expandedId === item.id ? null : item.id)}
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-[#0500A3]/8 flex items-center justify-center shrink-0">
                                                            <FileSpreadsheet className="w-5 h-5 text-[#0500A3]" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{item.banco}</p>
                                                            <p className="text-xs text-slate-500">{item.tipoCuenta}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-slate-500 text-sm">
                                                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-2 items-start">
                                                        {getStatusBadge(item.status)}
                                                        {item.status === 'COMPLETED' && (
                                                            <div className={clsx(
                                                                "flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-sm",
                                                                item.isApproved ? "text-[#0500A3] bg-[#0500A3]/10" : "text-amber-600 bg-amber-50"
                                                            )}>
                                                                {item.isApproved ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                                                <span>{item.isApproved ? 'Autorizado' : 'Pendiente Rev.'}</span>
                                                            </div>
                                                        )}
                                                        {item.status === 'FAILED' && item.errorMsg && (
                                                            <p className="text-xs text-red-500 max-w-[200px] truncate">{item.errorMsg}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {item.status === 'COMPLETED' && !item.isApproved && canApprove && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                                                                className="p-2 flex items-center gap-1.5 text-xs font-bold text-[#0500A3] hover:text-white hover:bg-[#0500A3] rounded-lg transition-colors cursor-pointer mr-2 border border-[#0500A3]/20 hover:border-transparent"
                                                            >
                                                                <ShieldCheck className="w-4 h-4" />Autorizar
                                                            </button>
                                                        )}
                                                        {item.status === 'COMPLETED' && item.isApproved && item.driveFile && (
                                                            <a
                                                                href={item.driveFile.webViewLink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-2 flex-shrink-0 text-slate-400 hover:text-[#0500A3] hover:bg-[#0500A3]/5 rounded-lg transition-colors cursor-pointer"
                                                                title="Abrir en Google Drive"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <ExternalLink className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {item.status === 'COMPLETED' && !item.isApproved && !canApprove && (
                                                            <div className="p-2 flex-shrink-0 text-slate-300" title="Pendiente de autorización">
                                                                <ExternalLink className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                        {canApprove && !item.isApproved && item.status !== 'PROCESSING' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar esta conciliación?')) handleDelete(item.id); }}
                                                                className="p-2 flex-shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-1"
                                                                title="Eliminar conciliación"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Inline expanded report */}
                                            {expandedId === item.id && item.report && (
                                                <tr key={`${item.id}-expanded`}>
                                                    <td colSpan={4} className="px-8 py-8 bg-slate-50/50 border-b border-slate-100">
                                                        <ReportPanel report={item.report} filesFound={item.filesFound} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {history.length === 0 && (
                    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 px-8 py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#0500A3]/8 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-[#0500A3]" />
                        </div>
                        <p className="text-slate-600 font-medium">Selecciona el banco, tipo de cuenta y período para generar tu primera conciliación.</p>
                        <p className="text-slate-400 text-sm mt-2">La IA buscará los archivos en Google Drive y generará el análisis automáticamente.</p>
                    </div>
                )}

            </main>

            {/* ── Premium AI Loading Overlay ────────────────────────────────── */}
            {isGenerating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0a0520 0%, #0500A3 50%, #050080 100%)' }}>

                    {/* Animated background particles */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="absolute rounded-full opacity-10"
                                style={{
                                    width: `${Math.random() * 8 + 2}px`,
                                    height: `${Math.random() * 8 + 2}px`,
                                    background: 'white',
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
                                    animationDelay: `${Math.random() * 3}s`,
                                }} />
                        ))}
                    </div>

                    <div className="relative flex flex-col items-center gap-10 px-8 text-center max-w-lg">

                        {/* Orbital animation */}
                        <div className="relative w-40 h-40 flex items-center justify-center">
                            {/* Outer ring */}
                            <div className="absolute inset-0 rounded-full border-2 border-white/10"
                                style={{ animation: 'spin 8s linear infinite' }} />
                            {/* Middle ring */}
                            <div className="absolute inset-4 rounded-full border-2 border-blue-400/30"
                                style={{ animation: 'spin 5s linear infinite reverse' }}>
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-400 shadow-lg"
                                    style={{ boxShadow: '0 0 12px 4px rgba(96, 165, 250, 0.8)' }} />
                            </div>
                            {/* Inner ring */}
                            <div className="absolute inset-8 rounded-full border-2 border-white/20"
                                style={{ animation: 'spin 3s linear infinite' }}>
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg"
                                    style={{ boxShadow: '0 0 12px 4px rgba(255,255,255,0.8)' }} />
                            </div>
                            {/* Center orb */}
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl z-10"
                                style={{
                                    background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(96,165,250,0.15) 100%)',
                                    boxShadow: '0 0 40px 10px rgba(96,165,250,0.3), inset 0 0 20px rgba(255,255,255,0.1)',
                                    animation: 'pulse 2s ease-in-out infinite',
                                }}>
                                {LOADING_STEPS[loadingStep]?.icon}
                            </div>
                        </div>

                        {/* Step indicator pills */}
                        <div className="flex gap-2">
                            {LOADING_STEPS.map((_, i) => (
                                <div key={i} className="h-1.5 rounded-full transition-all duration-700"
                                    style={{
                                        width: i === loadingStep ? '32px' : '8px',
                                        background: i <= loadingStep ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                                    }} />
                            ))}
                        </div>

                        {/* Step text */}
                        <div className="space-y-3">
                            <h2 className="text-white text-2xl font-bold tracking-tight">
                                Analizando con IA
                            </h2>
                            <p className="text-blue-200 text-base font-medium min-h-[24px] transition-all duration-500">
                                {LOADING_STEPS[loadingStep]?.text}
                            </p>
                            <p className="text-white/40 text-sm">
                                Esto puede tomar entre 30 y 60 segundos
                            </p>
                        </div>
                    </div>

                    {/* Keyframes */}
                    <style>{`
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }
                    `}</style>
                </div>
            )}

            {/* ── Success Overlay ───────────────────────────────────────────── */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-6 px-12 py-10 rounded-3xl text-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(5,0,163,0.97) 0%, rgba(4,120,87,0.95) 100%)',
                            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
                            animation: 'fadeInScale 0.4s ease',
                        }}>
                        {/* Checkmark */}
                        <div className="w-20 h-20 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 0 40px rgba(52,211,153,0.4)' }}>
                            <svg className="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white text-2xl font-bold">¡Reporte Completado!</p>
                            <p className="text-emerald-200 text-sm mt-1">La conciliación fue generada y guardada en Drive</p>
                        </div>
                    </div>
                    <style>{`
                        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
                    `}</style>
                </div>
            )}

            {/* ── Duplicate Confirmation Modal ─────────────────────────────── */}
            {duplicateConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Conciliación ya existe</h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    Ya existe un reporte para <span className="font-semibold text-slate-700">{duplicateConfirm.banco}</span> ({duplicateConfirm.tipoCuenta}) del período{' '}
                                    <span className="font-semibold text-slate-700">{MONTH_NAMES[duplicateConfirm.month]} {duplicateConfirm.year}</span>.
                                </p>
                                <p className="text-slate-500 text-sm mt-2">
                                    ¿Desea eliminar el anterior y generar uno nuevo? Esta acción no se puede deshacer.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDuplicateConfirm(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGenerateForce}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0500A3] text-white font-bold hover:bg-[#04008A] transition-colors"
                            >
                                Sí, Regenerar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
