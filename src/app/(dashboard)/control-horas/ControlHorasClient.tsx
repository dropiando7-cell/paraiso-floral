'use client';

import React, { useState, useTransition } from 'react';
import {
    Flower2,
    Printer,
    Upload,
    Clock,
    Users,
    Sparkles,
    Search,
    Download,
    Eye,
    Trash2,
    CheckCircle2,
    FileText,
    History,
    Sun,
    Moon,
    FileSpreadsheet,
    ShieldCheck,
    Info,
    ChevronDown,
    X,
    AlertTriangle,
    Loader2,
    Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import XLSX from 'xlsx';
import {
    procesarArchivoHoras,
    cargarReporteReferenciaAgosto,
    anularReporteHoras,
    EmpleadoResumen,
    DiaDetalle
} from './actions';

interface ControlHorasClientProps {
    userRole: string;
    initialHistorial: any[];
}

const processingSteps = [
    { label: 'Lectura de estructura biométrica Excel...', percentage: 20 },
    { label: 'Decodificando marcas de entrada y salida por empleado...', percentage: 45 },
    { label: 'Evaluando reglas de jornada (L-V 7am-4pm, Sáb 7am-11am, Dom 6am-6pm)...', percentage: 70 },
    { label: 'Calculando horas extras temprano (mañana) y tarde (salida)...', percentage: 90 },
    { label: 'Guardando reporte auditado y generando vista membretada...', percentage: 100 }
];

export function ControlHorasClient({ userRole, initialHistorial }: ControlHorasClientProps) {
    const [historial, setHistorial] = useState<any[]>(initialHistorial);
    const [activeTab, setActiveTab] = useState<'RESUMEN' | 'DESGLOSE' | 'HISTORIAL'>('RESUMEN');
    const [isPending, startTransition] = useTransition();

    // Reporte activo
    const [selectedReporte, setSelectedReporte] = useState<any>(initialHistorial.length > 0 ? initialHistorial[0] : null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmpModal, setSelectedEmpModal] = useState<EmpleadoResumen | null>(null);

    // Estados para Drag & Drop, Modal de Eliminación y Modal de Procesamiento Animado
    const [isDragging, setIsDragging] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; titulo: string } | null>(null);
    const [processingModal, setProcessingModal] = useState<{
        open: boolean;
        fileName: string;
        progress: number;
        stepIndex: number;
        completed: boolean;
    } | null>(null);

    const fmtNum = (val: number) => val.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fechaHoy = new Date().toLocaleDateString('es-HN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Función auxiliar para animar la barra de progreso
    const startProgressAnimation = (fileName: string, onCompleteAction: () => Promise<any>) => {
        setProcessingModal({
            open: true,
            fileName,
            progress: 15,
            stepIndex: 0,
            completed: false
        });

        // Intervalo para simular progreso dinámico
        const interval = setInterval(() => {
            setProcessingModal((prev) => {
                if (!prev || prev.completed) return prev;
                let nextProgress = prev.progress + Math.floor(Math.random() * 12) + 8;
                if (nextProgress > 88) nextProgress = 88; // Mantener en 88% hasta que el servidor responda

                let nextStep = 0;
                if (nextProgress >= 70) nextStep = 3;
                else if (nextProgress >= 45) nextStep = 2;
                else if (nextProgress >= 20) nextStep = 1;

                return {
                    ...prev,
                    progress: nextProgress,
                    stepIndex: nextStep
                };
            });
        }, 250);

        startTransition(async () => {
            const res = await onCompleteAction();
            clearInterval(interval);

            if (res.error) {
                setProcessingModal(null);
                toast.error(res.error);
            } else {
                // Completar al 100% con animación visual
                setProcessingModal({
                    open: true,
                    fileName,
                    progress: 100,
                    stepIndex: 4,
                    completed: true
                });

                setTimeout(() => {
                    toast.success(`¡Reporte "${res.titulo || 'Horas Extras'}" generado exitosamente!`);
                    window.location.reload();
                }, 900);
            }
        });
    };

    // Función genérica para procesar un objeto File
    const processFile = (file: File) => {
        if (!file.name.match(/\.(xls|xlsx|csv)$/i)) {
            toast.error('Por favor selecciona o arrastra un archivo Excel válido (.xls / .xlsx).');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        startProgressAnimation(file.name, () => procesarArchivoHoras(formData));
    };

    // Manejar evento de selección manual
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // Eventos Drag and Drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    // Manejar carga rápida del reporte de referencia (Agosto 2026)
    const handleCargarReferenciaAgosto = () => {
        startProgressAnimation("Reporte Horas Agosto Paraiso Floral 2026.xls", () => cargarReporteReferenciaAgosto());
    };

    // Abrir Modal de Confirmación de Eliminación
    const promptDeleteModal = (id: string, titulo: string) => {
        setDeleteModal({ open: true, id, titulo });
    };

    // Confirmar eliminación en el modal
    const confirmDelete = async () => {
        if (!deleteModal) return;
        const { id } = deleteModal;

        startTransition(async () => {
            const res = await anularReporteHoras(id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Reporte eliminado correctamente");
                const remaining = historial.filter(r => r.id !== id);
                setHistorial(remaining);
                if (selectedReporte?.id === id) {
                    setSelectedReporte(remaining.length > 0 ? remaining[0] : null);
                }
                setDeleteModal(null);
            }
        });
    };

    // Exportar tabla a Excel
    const handleExportExcel = () => {
        if (!selectedReporte || !selectedReporte.resumenJSON?.empleados) return;

        const data = selectedReporte.resumenJSON.empleados.map((emp: EmpleadoResumen, idx: number) => ({
            'Ranking': idx + 1,
            'ID ZKteco': emp.empId,
            'Nombre Empleado': emp.nombre,
            'Días Trabajados': emp.diasTrabajados,
            'Horas Extras Mañana': emp.horasExtrasTemprano,
            'Horas Extras Tarde': emp.horasExtrasTarde,
            'TOTAL HORAS EXTRAS': emp.totalHorasExtras
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Horas Extras");
        XLSX.writeFile(wb, `${selectedReporte.titulo || 'Reporte_Horas_Extras'}.xlsx`);
        toast.success("Archivo Excel exportado");
    };

    // Imprimir el estado / reporte de horas extras
    const handlePrint = () => {
        window.print();
    };

    const empleados: EmpleadoResumen[] = selectedReporte?.resumenJSON?.empleados || [];
    const filteredEmpleados = empleados.filter(emp =>
        emp.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.empId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalHorasGenerales = selectedReporte?.totalHorasExtras || 0;
    const totalTempranoGeneral = selectedReporte?.totalExtrasTemprano || 0;
    const totalTardeGeneral = selectedReporte?.totalExtrasTarde || 0;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 font-sans print:bg-white print:pb-0">
            {/* Estilos Específicos para Impresión Oficial de Documento */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-size: 11px !important;
                    }
                    .print\\:hidden, .no-print {
                        display: none !important;
                    }
                    .print-header {
                        border-bottom: 2px solid #059669 !important;
                        padding-bottom: 12px !important;
                        margin-bottom: 16px !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border-bottom: 1px solid #e2e8f0 !important;
                        padding: 6px 8px !important;
                    }
                    th {
                        background-color: #f8fafc !important;
                        color: #1e293b !important;
                        font-weight: 700 !important;
                    }
                }
            `}</style>

            {/* Top Fixed Bar (Hidden in Print) */}
            <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md print:hidden">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                            <Flower2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Distribuidora Paraíso Floral</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px] sm:max-w-none">
                                Reporte Oficial de Control de Horas Extras & Asistencia ZKteco
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Subir Excel ZKteco</span>
                            <input
                                type="file"
                                accept=".xls,.xlsx,.csv"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isPending}
                            />
                        </label>
                        <button
                            onClick={handlePrint}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir / PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Document Content Container */}
            <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 print:p-0 print:space-y-4">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 print:shadow-none print:border-none print:p-0">

                    {/* Encabezado Membretado Oficial con Logo */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-emerald-600 pb-4">
                        <div className="flex items-center gap-3.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/logo-paraiso-floral.png"
                                alt="Paraíso Floral"
                                className="w-14 h-14 object-contain rounded-full border border-slate-200 shrink-0"
                            />
                            <div className="space-y-0.5">
                                <h1 className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                                    DISTRIBUIDORA PARAÍSO FLORAL
                                </h1>
                                <p className="text-xs font-bold text-slate-700">Venta de Flores al Mayoreo y Detalle</p>
                                <p className="text-[11px] text-slate-600">8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula, Cortés</p>
                                <p className="text-[11px] text-slate-600">Teléfono / WhatsApp: +(504) 8854-2199 | +(504) 9645-3095</p>
                            </div>
                        </div>

                        <div className="sm:text-right space-y-1 shrink-0">
                            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-lg border border-emerald-300">
                                REPORTE DE HORAS EXTRAS
                            </span>
                            <p className="text-[11px] text-slate-500 pt-1">Emisión: {fechaHoy}</p>
                        </div>
                    </div>

                    {/* ZONA DRAG AND DROP Y BOTÓN DE REFERENCIA */}
                    {!selectedReporte && (
                        <div className="space-y-6">
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`p-8 border-2 border-dashed rounded-3xl text-center space-y-4 transition-all duration-200 print:hidden ${
                                    isDragging
                                        ? 'border-emerald-600 bg-emerald-100/50 scale-[1.01] shadow-lg'
                                        : 'border-emerald-400/80 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-500'
                                }`}
                            >
                                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30">
                                    <Upload className="w-7 h-7" />
                                </div>
                                <div className="max-w-md mx-auto space-y-1">
                                    <h3 className="text-base font-black text-slate-900">
                                        Arrastra tu archivo Excel ZKteco aquí
                                    </h3>
                                    <p className="text-xs text-slate-600">
                                        Suelta el archivo `.xls` o `.xlsx` en esta zona o haz clic en el botón para explorar tus carpetas.
                                    </p>
                                </div>

                                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <label className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center gap-2 transition cursor-pointer active:scale-95">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        <span>Seleccionar Archivo Excel</span>
                                        <input
                                            type="file"
                                            accept=".xls,.xlsx,.csv"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={isPending}
                                        />
                                    </label>

                                    <span className="text-xs font-bold text-slate-400 uppercase">o</span>

                                    <button
                                        onClick={handleCargarReferenciaAgosto}
                                        disabled={isPending}
                                        className="px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-100 border-2 border-emerald-300 font-extrabold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 transition cursor-pointer active:scale-95"
                                    >
                                        <Sparkles className="w-4 h-4 text-emerald-600" />
                                        <span>Cargar Reporte Agosto 2026 (Paraíso Floral)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Mostrar tabla del historial si hay reportes existentes */}
                            {historial.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <History className="w-4 h-4 text-emerald-600" /> REPORTES GUARDADOS PREVIAMENTE ({historial.length})
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                                                    <th className="py-2.5 px-3">Título</th>
                                                    <th className="py-2.5 px-3">Archivo Original</th>
                                                    <th className="py-2.5 px-3 text-center">Empleados</th>
                                                    <th className="py-2.5 px-3 text-right">Total Horas Extras</th>
                                                    <th className="py-2.5 px-3 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {historial.map(rep => (
                                                    <tr key={rep.id} className="hover:bg-slate-50">
                                                        <td className="py-2.5 px-3 font-bold text-slate-900">{rep.titulo}</td>
                                                        <td className="py-2.5 px-3 font-mono text-slate-600">{rep.nombreArchivoOriginal}</td>
                                                        <td className="py-2.5 px-3 text-center font-bold">{rep.totalEmpleados}</td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">{fmtNum(rep.totalHorasExtras)} hrs</td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => setSelectedReporte(rep)}
                                                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg transition active:scale-95 cursor-pointer"
                                                                >
                                                                    Abrir
                                                                </button>
                                                                {['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE'].includes(userRole) && (
                                                                    <button
                                                                        onClick={() => promptDeleteModal(rep.id, rep.titulo)}
                                                                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-[10px] rounded-lg border border-red-200 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-3 h-3 text-red-600" />
                                                                        Eliminar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedReporte && (
                        <>
                            {/* Datos del Reporte y Resumen Financiero / Horas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-300 rounded-2xl bg-slate-50/70 space-y-1">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 tracking-wider">
                                        DATOS DEL REPORTE
                                    </h3>
                                    <p className="text-base font-black text-slate-900">{selectedReporte.titulo}</p>
                                    <p className="text-xs text-slate-700"><strong>Archivo Origen:</strong> {selectedReporte.nombreArchivoOriginal}</p>
                                    <p className="text-xs text-slate-700"><strong>Jornadas Aplicadas:</strong> L-V (7am-4pm) | Sáb (7am-11am) | Dom (6am-6pm)</p>
                                    <p className="text-xs text-slate-700"><strong>Auditado Por:</strong> {selectedReporte.usuarioCreador || 'Gerencia General'}</p>
                                </div>

                                <div className="p-4 border border-emerald-300 rounded-2xl bg-emerald-50/40 space-y-1 text-right flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between text-xs py-0.5">
                                            <span className="text-slate-600">Total Empleados Auditados:</span>
                                            <span className="font-bold">{selectedReporte.totalEmpleados} personal</span>
                                        </div>
                                        <div className="flex justify-between text-xs py-0.5">
                                            <span className="text-slate-600">Extras Mañana (Antes Inicio):</span>
                                            <span className="font-bold text-amber-800">{fmtNum(totalTempranoGeneral)} hrs</span>
                                        </div>
                                        <div className="flex justify-between text-xs py-0.5">
                                            <span className="text-slate-600">Extras Tarde (Salida):</span>
                                            <span className="font-bold text-blue-800">{fmtNum(totalTardeGeneral)} hrs</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-emerald-300 font-black text-emerald-900">
                                        <span className="uppercase tracking-wider">TOTAL HORAS EXTRAS:</span>
                                        <span className="text-xl font-mono font-black text-emerald-700">{fmtNum(totalHorasGenerales)} hrs</span>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Tabs & Actions (Pills - Hidden in Print) */}
                            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-200 print:hidden">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setActiveTab('RESUMEN')}
                                        className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                            activeTab === 'RESUMEN'
                                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        📊 1. Resumen por Empleado ({empleados.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('HISTORIAL')}
                                        className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                            activeTab === 'HISTORIAL'
                                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        📜 2. Historial de Reportes ({historial.length})
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExportExcel}
                                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
                                    >
                                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Excel</span>
                                    </button>

                                    {/* Botón de Eliminar Reporte en Vista Principal para Francis */}
                                    {['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE'].includes(userRole) && (
                                        <button
                                            onClick={() => promptDeleteModal(selectedReporte.id, selectedReporte.titulo)}
                                            className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-red-200 transition-all cursor-pointer active:scale-95 shadow-xs"
                                            title="Eliminar este reporte"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                            <span>Eliminar</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* TAB 1: RESUMEN POR EMPLEADO */}
                            {activeTab === 'RESUMEN' && (
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-300 pb-2 print:hidden">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                            <Users className="w-4 h-4 text-emerald-600" /> RESUMEN INDIVIDUAL DE HORAS EXTRAS POR EMPLEADO
                                        </h3>
                                        <div className="relative w-full sm:w-64">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Buscar por nombre o ID..."
                                                className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                                                    <th className="py-2.5 px-3 text-center">Rank</th>
                                                    <th className="py-2.5 px-3">ID ZKteco</th>
                                                    <th className="py-2.5 px-3">Nombre del Empleado</th>
                                                    <th className="py-2.5 px-3 text-center">Días Trab.</th>
                                                    <th className="py-2.5 px-3 text-right">Extras Mañana</th>
                                                    <th className="py-2.5 px-3 text-right">Extras Tarde</th>
                                                    <th className="py-2.5 px-3 text-right">Total Horas Extras</th>
                                                    <th className="py-2.5 px-3 text-center print:hidden">Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredEmpleados.map((emp, index) => (
                                                    <tr key={emp.nombre} className="hover:bg-slate-50">
                                                        <td className="py-2.5 px-3 text-center font-bold">
                                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] ${
                                                                index === 0 ? 'bg-emerald-100 text-emerald-900 font-black border border-emerald-300' :
                                                                index === 1 ? 'bg-slate-200 text-slate-800 font-bold' :
                                                                index === 2 ? 'bg-amber-100 text-amber-800 font-bold' :
                                                                'text-slate-400'
                                                            }`}>
                                                                #{index + 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                                                            {emp.empId}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-bold text-slate-900">
                                                            {emp.nombre}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                                            {emp.diasTrabajados} días
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                                                            {emp.horasExtrasTemprano > 0 ? `${fmtNum(emp.horasExtrasTemprano)} h` : '—'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                                                            {emp.horasExtrasTarde > 0 ? `${fmtNum(emp.horasExtrasTarde)} h` : '—'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/40">
                                                            {fmtNum(emp.totalHorasExtras)} hrs
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center print:hidden">
                                                            <button
                                                                onClick={() => setSelectedEmpModal(emp)}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg transition active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                Ver Días
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredEmpleados.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                                                            No hay empleados registrados o coincidentes con la búsqueda.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: HISTORIAL DE REPORTES */}
                            {activeTab === 'HISTORIAL' && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-2">
                                        <History className="w-4 h-4 text-emerald-600" /> HISTORIAL DE REPORTES ALMACENADOS EN BASE DE DATOS
                                    </h3>

                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                                                    <th className="py-2.5 px-3">Título / Mes</th>
                                                    <th className="py-2.5 px-3">Archivo Original</th>
                                                    <th className="py-2.5 px-3 text-center">Empleados</th>
                                                    <th className="py-2.5 px-3 text-right">Total Horas Extras</th>
                                                    <th className="py-2.5 px-3">Auditado Por</th>
                                                    <th className="py-2.5 px-3">Fecha Emisión</th>
                                                    <th className="py-2.5 px-3 text-center print:hidden">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {historial.map((rep) => (
                                                    <tr key={rep.id} className="hover:bg-slate-50">
                                                        <td className="py-2.5 px-3 font-bold text-slate-900">
                                                            {rep.titulo}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono text-slate-600">
                                                            {rep.nombreArchivoOriginal}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                                            {rep.totalEmpleados}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                                                            {fmtNum(rep.totalHorasExtras)} hrs
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-700">
                                                            {rep.usuarioCreador}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-500 font-medium">
                                                            {new Date(rep.createdAt).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center print:hidden">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedReporte(rep);
                                                                        setActiveTab('RESUMEN');
                                                                    }}
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg transition active:scale-95 cursor-pointer shadow-xs"
                                                                >
                                                                    Abrir Reporte
                                                                </button>
                                                                {['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE'].includes(userRole) && (
                                                                    <button
                                                                        onClick={() => promptDeleteModal(rep.id, rep.titulo)}
                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-[10px] rounded-lg border border-red-200 transition active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs"
                                                                        title="Eliminar Reporte"
                                                                    >
                                                                        <Trash2 className="w-3 h-3 text-red-600" />
                                                                        Eliminar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {historial.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                                                            No hay reportes de horas extras guardados previamente.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Cuentas / Notas de Control Interno */}
                            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50 text-[11px] space-y-1">
                                <p className="font-bold text-slate-800 uppercase">JORNADAS DE TRABAJO Y NORMATIVA DE AUDITORÍA:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                                    <div>• <strong>Lunes a Viernes:</strong> 7:00 AM – 4:00 PM (16:00)</div>
                                    <div>• <strong>Sábados:</strong> 7:00 AM – 11:00 AM</div>
                                    <div>• <strong>Domingos:</strong> 6:00 AM – 6:00 PM (Jornada Normal)</div>
                                </div>
                            </div>

                            {/* Firmas de Conformidad */}
                            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-600">
                                <div className="border-t border-slate-400 pt-1">
                                    <p className="font-bold text-slate-800">Gerencia General / Recursos Humanos</p>
                                    <p className="text-[10px] text-slate-400">Distribuidora Paraíso Floral</p>
                                </div>
                                <div className="border-t border-slate-400 pt-1">
                                    <p className="font-bold text-slate-800">Firma de Auditoría y Verificación</p>
                                    <p className="text-[10px] text-slate-400">Control de Asistencia ZKteco</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* MODAL MODERNO HIGH-TECH DE PROCESAMIENTO Y PROGRESO ANIMADO AI */}
            {processingModal?.open && (
                <div className="fixed inset-0 z-[4000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-800 text-white space-y-6 relative overflow-hidden">
                        {/* Background Glowing Gradients */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

                        {/* Header Icon Ring */}
                        <div className="flex flex-col items-center text-center space-y-3 relative z-10">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                                        {processingModal.completed ? (
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                                        ) : (
                                            <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                                        )}
                                    </div>
                                </div>
                                {!processingModal.completed && (
                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-lg font-black tracking-tight text-white">
                                    {processingModal.completed ? '¡Reporte Generado Exitosamente!' : 'Procesando Reporte de Horas Extras'}
                                </h3>
                                <p className="text-xs text-slate-400 font-medium truncate max-w-xs mx-auto">
                                    {processingModal.fileName}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar Area */}
                        <div className="space-y-2 relative z-10">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-emerald-400 flex items-center gap-1.5">
                                    <Cpu className="w-3.5 h-3.5 animate-pulse" />
                                    <span>Motor de Auditoría ZKteco</span>
                                </span>
                                <span className="font-mono text-emerald-400 font-extrabold text-sm">
                                    {processingModal.progress}%
                                </span>
                            </div>

                            {/* Outer Track */}
                            <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden shadow-inner">
                                {/* Inner Animated Bar */}
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/50 relative overflow-hidden"
                                    style={{ width: `${processingModal.progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Dynamic Step Indicator List */}
                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 relative z-10 text-xs">
                            {processingSteps.map((step, idx) => {
                                const isDone = processingModal.progress >= step.percentage;
                                const isCurrent = idx === processingModal.stepIndex && !processingModal.completed;

                                return (
                                    <div
                                        key={step.label}
                                        className={`flex items-center gap-2.5 transition-all duration-200 ${
                                            isDone ? 'text-emerald-300 font-medium' : isCurrent ? 'text-white font-bold' : 'text-slate-600'
                                        }`}
                                    >
                                        <div className="shrink-0">
                                            {isDone ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            ) : isCurrent ? (
                                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-600">
                                                    {idx + 1}
                                                </div>
                                            )}
                                        </div>
                                        <span className="truncate">{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer note */}
                        <div className="text-center pt-1 text-[10px] text-slate-500 font-mono tracking-wider uppercase relative z-10">
                            Distribuidora Paraíso Floral • Algoritmo ZKteco v2.0
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle Diario por Empleado */}
            {selectedEmpModal && (
                <div className="fixed inset-0 z-[3500] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 text-slate-900">
                        {/* Header Modal */}
                        <div className="p-5 border-b-2 border-emerald-600 flex items-center justify-between bg-slate-50 rounded-t-3xl">
                            <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/logo-paraiso-floral.png"
                                    alt="Paraíso Floral"
                                    className="w-10 h-10 object-contain rounded-full border border-slate-200 shrink-0"
                                />
                                <div>
                                    <h3 className="font-black text-base text-emerald-900">
                                        DESGLOSE DIARIO — {selectedEmpModal.nombre}
                                    </h3>
                                    <p className="text-xs text-slate-600 font-medium">
                                        ID ZKteco: <span className="font-mono font-bold">{selectedEmpModal.empId}</span> &nbsp;•&nbsp; {selectedEmpModal.diasTrabajados} días trabajados en el mes
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedEmpModal(null)}
                                className="text-slate-400 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 p-1.5 rounded-full transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Summary Badges */}
                        <div className="p-4 bg-emerald-50/70 border-b border-emerald-200 grid grid-cols-3 gap-4 text-center">
                            <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Extras Mañana</span>
                                <span className="text-base font-black text-amber-900">{fmtNum(selectedEmpModal.horasExtrasTemprano)} hrs</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Extras Tarde</span>
                                <span className="text-base font-black text-blue-900">{fmtNum(selectedEmpModal.horasExtrasTarde)} hrs</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Horas Extras</span>
                                <span className="text-base font-black text-emerald-900">{fmtNum(selectedEmpModal.totalHorasExtras)} hrs</span>
                            </div>
                        </div>

                        {/* Table of Daily Punches */}
                        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                                        <th className="py-2.5 px-3">Fecha</th>
                                        <th className="py-2.5 px-3">Día</th>
                                        <th className="py-2.5 px-3">Entrada (1ra)</th>
                                        <th className="py-2.5 px-3">Salida (Última)</th>
                                        <th className="py-2.5 px-3 text-right">Ex. Mañana</th>
                                        <th className="py-2.5 px-3 text-right">Ex. Tarde</th>
                                        <th className="py-2.5 px-3 text-right">Total Ex. Día</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedEmpModal.dias.map((dia: DiaDetalle) => (
                                        <tr key={dia.fecha} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                                {dia.fecha}
                                            </td>
                                            <td className="py-2.5 px-3 font-bold">
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                    dia.diaSemana === 'Sábado' ? 'bg-amber-100 text-amber-800 font-extrabold' :
                                                    dia.diaSemana === 'Domingo' ? 'bg-emerald-100 text-emerald-800 font-extrabold' :
                                                    'text-slate-700'
                                                }`}>
                                                    {dia.diaSemana}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 font-mono font-bold text-amber-900">
                                                {dia.primeraEntrada}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                                                {dia.ultimaSalida}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-amber-800 font-semibold">
                                                {dia.extrasTemprano > 0 ? `${fmtNum(dia.extrasTemprano)} h` : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-blue-800 font-semibold">
                                                {dia.extrasTarde > 0 ? `${fmtNum(dia.extrasTarde)} h` : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/40">
                                                {dia.totalExtras > 0 ? `${fmtNum(dia.totalExtras)} hrs` : '0.00 hrs'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-3xl">
                            <button
                                onClick={() => setSelectedEmpModal(null)}
                                className="bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition active:scale-95 cursor-pointer"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PERSONALIZADO DE CONFIRMACIÓN DE ELIMINACIÓN */}
            {deleteModal?.open && (
                <div className="fixed inset-0 z-[3600] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-900 space-y-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                                    ¿Eliminar Reporte de Horas Extras?
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Confirmación para Gerencia / Auditoría
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1.5 text-xs text-slate-700">
                            <p className="font-bold text-red-950">
                                {deleteModal.titulo}
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                                Este reporte será desmovilizado y archivado por la bitácora de trazabilidad. Podrás volver a subir cualquier archivo Excel de ZKteco en cualquier momento.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={isPending}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isPending ? 'Eliminando...' : 'Sí, Eliminar Reporte'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteModal(null)}
                                disabled={isPending}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition active:scale-95 text-center border border-slate-200 cursor-pointer"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
