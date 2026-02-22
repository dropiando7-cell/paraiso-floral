'use client';

import { useState } from 'react';
import {
    Sparkles,
    Download,
    Clock,
    CheckCircle2,
    XCircle,
    FileSpreadsheet,
    Calendar as CalendarIcon,
    RefreshCw,
    ShieldCheck,
    ShieldAlert
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

type ReportStatus = 'COMPLETED' | 'PROCESSING' | 'FAILED';

interface ReportHistoryItem {
    id: string;
    fileName: string;
    generatedAt: string;
    status: ReportStatus;
    isApproved: boolean;
}

const mockHistory: ReportHistoryItem[] = [
    {
        id: '3',
        fileName: 'Reporte_Febrero2026.xlsx',
        generatedAt: '2026-02-28',
        status: 'COMPLETED',
        isApproved: false
    },
    {
        id: '2',
        fileName: 'Reporte_Enero2026.xlsx',
        generatedAt: '2026-01-31',
        status: 'COMPLETED',
        isApproved: true
    },
    {
        id: '1',
        fileName: 'Reporte_Diciembre2025.xlsx',
        generatedAt: '2025-12-31',
        status: 'COMPLETED',
        isApproved: true
    }
];

export default function ConciliacionPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('03');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [history, setHistory] = useState<ReportHistoryItem[]>(mockHistory);

    const handleGenerate = async () => {
        setIsGenerating(true);

        // Simulate n8n webhook request
        const newReportId = Math.random().toString(36).substring(7);
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const monthIndex = parseInt(selectedMonth, 10) - 1;
        const fileName = `Reporte_${monthNames[monthIndex]}${selectedYear}.xlsx`;
        const today = new Date().toISOString().split('T')[0];

        // Add "Processing" item to history immediately
        const processingItem: ReportHistoryItem = {
            id: newReportId,
            fileName,
            generatedAt: today,
            status: 'PROCESSING',
            isApproved: false
        };

        setHistory(prev => [processingItem, ...prev]);

        // Simulate async wait for n8n to finish processing
        setTimeout(() => {
            setHistory(prev => prev.map(item =>
                item.id === newReportId ? { ...item, status: 'COMPLETED' } : item
            ));
            setIsGenerating(false);
        }, 4500);
    };

    const handleApprove = (id: string) => {
        setHistory(prev => prev.map(item =>
            item.id === id ? { ...item, isApproved: true } : item
        ));
    };

    const getStatusBadge = (status: ReportStatus) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completado</span>
                    </div>
                );
            case 'PROCESSING':
                return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>En Proceso</span>
                    </div>
                );
            case 'FAILED':
                return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Fallido</span>
                    </div>
                );
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-[#F8FAFC]">
            <main className="max-w-5xl mx-auto p-8 lg:p-12 space-y-10">

                {/* Header Section */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Conciliación Bancaria con IA</h1>
                    <p className="text-slate-500 text-lg max-w-2xl mt-4 leading-relaxed">
                        Mantén tus finanzas al día con total precisión. Sube los estados de cuenta mensuales a Drive y deja que nuestra IA los analice, cruce y consolide por ti, con resultados listos para revisión y autorización.
                    </p>
                </div>

                {/* Action Card */}
                <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">

                        {/* Period Selector */}
                        <div className="flex-1 md:flex-none">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Período a Conciliar</label>
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0500A3]">
                                        <CalendarIcon className="w-5 h-5" />
                                    </div>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 text-base bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] appearance-none border transition-colors font-medium min-w-[140px] cursor-pointer"
                                    >
                                        <option value="01">Enero</option>
                                        <option value="02">Febrero</option>
                                        <option value="03">Marzo</option>
                                        <option value="04">Abril</option>
                                        <option value="05">Mayo</option>
                                        <option value="06">Junio</option>
                                        <option value="07">Julio</option>
                                        <option value="08">Agosto</option>
                                        <option value="09">Septiembre</option>
                                        <option value="10">Octubre</option>
                                        <option value="11">Noviembre</option>
                                        <option value="12">Diciembre</option>
                                    </select>
                                </div>

                                <div className="relative group">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="block w-full px-4 py-3 text-base bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] appearance-none border transition-colors font-medium cursor-pointer"
                                    >
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={twMerge(
                                clsx(
                                    "flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-md shadow-[#0500A3]/20 md:ml-auto w-full md:w-auto",
                                    isGenerating
                                        ? "bg-[#0500A3]/70 cursor-not-allowed"
                                        : "bg-[#0500A3] hover:bg-[#04008A] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                )
                            )}
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin text-white/80" />
                                    <span>Procesando en n8n...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 text-blue-200" />
                                    <span>Generar Reporte con IA</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Historial de Reportes</h2>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                            <Clock className="w-4 h-4" />
                            <span>Últimos 30 días</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 text-sm border-b border-slate-100">
                                    <th className="px-8 py-4 font-semibold">Archivo</th>
                                    <th className="px-8 py-4 font-semibold">Fecha de Solicitud</th>
                                    <th className="px-8 py-4 font-semibold">Estado</th>
                                    <th className="px-8 py-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0 group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <span className="font-medium text-slate-700">{item.fileName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-slate-500 text-sm">
                                            {item.generatedAt}
                                        </td>
                                        <td className="px-8 py-5">
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
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {item.status === 'COMPLETED' && !item.isApproved && (
                                                    <button
                                                        onClick={() => handleApprove(item.id)}
                                                        className="p-2 flex items-center gap-1.5 text-xs font-bold text-[#0500A3] hover:text-white hover:bg-[#0500A3] rounded-lg transition-colors cursor-pointer mr-2 border border-[#0500A3]/20 hover:border-transparent"
                                                        title="Aprobar Conciliación"
                                                    >
                                                        <ShieldCheck className="w-4 h-4" />
                                                        Autorizar
                                                    </button>
                                                )}
                                                {item.status === 'COMPLETED' ? (
                                                    <button className="p-2 flex-shrink-0 text-slate-400 hover:text-[#0500A3] hover:bg-[#0500A3]/5 rounded-lg transition-colors cursor-pointer" title="Descargar Excel">
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                ) : item.status === 'FAILED' ? (
                                                    <button className="p-2 flex-shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Reintentar">
                                                        <RefreshCw className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <div className="p-2 flex-shrink-0 text-slate-300">
                                                        <Download className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-slate-500">
                                            No hay reportes generados recientemente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}
