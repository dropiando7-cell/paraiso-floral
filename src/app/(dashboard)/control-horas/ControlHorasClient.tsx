'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ChevronRight,
    LayoutDashboard,
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
    Cpu,
    Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';
import XLSX from 'xlsx';
import {
    procesarArchivoHoras,
    cargarReporteReferenciaAgosto,
    cargarReporteReferenciaTegucigalpa,
    anularReporteHoras,
    renombrarEmpleadoEnReporte,
    EmpleadoResumen,
    DiaDetalle
} from './actions';

export function formatMinutos(minutos: number): string {
    if (!minutos || minutos <= 0) return '—';
    const hrs = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${hrs}.${String(mins).padStart(2, '0')} hrs`;
}

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
    const [activeTab, setActiveTab] = useState<'CARGAR' | 'RESUMEN' | 'HISTORIAL'>(
        initialHistorial.length > 0 ? 'RESUMEN' : 'CARGAR'
    );
    const [isPending, startTransition] = useTransition();

    // Reporte activo
    const [selectedReporte, setSelectedReporte] = useState<any>(initialHistorial.length > 0 ? initialHistorial[0] : null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmpModal, setSelectedEmpModal] = useState<EmpleadoResumen | null>(null);

    // Búsqueda por día dentro del modal de detalle
    const [modalDaySearchQuery, setModalDaySearchQuery] = useState('');

    // Visor Interactivo de Excel en Modal
    const [showExcelViewerModal, setShowExcelViewerModal] = useState(false);
    const [excelSearchQuery, setExcelSearchQuery] = useState('');

    // Estados para Drag & Drop, Modal de Eliminación, Edición de Nombre y Modal de Procesamiento Animado
    const [isDragging, setIsDragging] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; titulo: string } | null>(null);
    const [editEmpModal, setEditEmpModal] = useState<{ open: boolean; oldNombre: string; empId: string } | null>(null);
    const [newEmpNameInput, setNewEmpNameInput] = useState('');

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

        const interval = setInterval(() => {
            setProcessingModal((prev) => {
                if (!prev || prev.completed) return prev;
                let nextProgress = prev.progress + Math.floor(Math.random() * 12) + 8;
                if (nextProgress > 88) nextProgress = 88;

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

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

    const handleCargarReferenciaAgosto = () => {
        startProgressAnimation("Reporte Horas Agosto Paraiso Floral 2026.xls", () => cargarReporteReferenciaAgosto());
    };

    const handleCargarReferenciaTegucigalpa = () => {
        startProgressAnimation("Informe Completo_001_08 TGU.XLS (Sede Tegucigalpa)", () => cargarReporteReferenciaTegucigalpa());
    };

    const promptDeleteModal = (id: string, titulo: string) => {
        setDeleteModal({ open: true, id, titulo });
    };

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

    // Renombrar empleado
    const promptEditEmpName = (oldNombre: string, empId: string) => {
        setNewEmpNameInput(oldNombre);
        setEditEmpModal({ open: true, oldNombre, empId });
    };

    const confirmRenameEmp = async () => {
        if (!editEmpModal || !selectedReporte || !newEmpNameInput.trim()) return;

        startTransition(async () => {
            const res = await renombrarEmpleadoEnReporte(selectedReporte.id, editEmpModal.oldNombre, newEmpNameInput);
            if (res.error || !res.newNombre) {
                toast.error(res.error || 'Error al renombrar');
            } else {
                const updatedName: string = res.newNombre;
                toast.success(`Nombre actualizado a "${updatedName}"`);

                const updatedEmpleados = selectedReporte.resumenJSON.empleados.map((emp: EmpleadoResumen) => {
                    if (emp.nombre === editEmpModal.oldNombre || emp.empId === editEmpModal.empId) {
                        return { ...emp, nombre: updatedName };
                    }
                    return emp;
                });

                const updatedReporte = {
                    ...selectedReporte,
                    resumenJSON: { ...selectedReporte.resumenJSON, empleados: updatedEmpleados }
                };
                setSelectedReporte(updatedReporte);

                if (selectedEmpModal && (selectedEmpModal.nombre === editEmpModal.oldNombre || selectedEmpModal.empId === editEmpModal.empId)) {
                    setSelectedEmpModal({ ...selectedEmpModal, nombre: updatedName });
                }

                setEditEmpModal(null);
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
            'Horas Extras Mañana': emp.extrasTempranoFormatted || `${fmtNum(emp.horasExtrasTemprano)} h`,
            'Horas Extras Tarde': emp.extrasTardeFormatted || `${fmtNum(emp.horasExtrasTarde)} h`,
            'TOTAL HORAS EXTRAS': emp.totalExtrasFormatted || `${fmtNum(emp.totalHorasExtras)} hrs`
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Horas Extras");
        XLSX.writeFile(wb, `${selectedReporte.titulo || 'Reporte_Horas_Extras'}.xlsx`);
        toast.success("Archivo Excel exportado");
    };

    const handlePrint = () => {
        window.print();
    };

    const empleados: EmpleadoResumen[] = selectedReporte?.resumenJSON?.empleados || [];
    const filteredEmpleados = empleados.filter(emp =>
        emp.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.empId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalMinutosGenerales = empleados.reduce((acc, e) => acc + (e.totalMinutos || Math.round(e.totalHorasExtras * 60)), 0);
    const totalMinutosTemprano = empleados.reduce((acc, e) => acc + (e.totalMinutosTemprano || Math.round(e.horasExtrasTemprano * 60)), 0);
    const totalMinutosTarde = empleados.reduce((acc, e) => acc + (e.totalMinutosTarde || Math.round(e.horasExtrasTarde * 60)), 0);

    const filteredModalDias = selectedEmpModal?.dias.filter((dia: DiaDetalle) => {
        if (!modalDaySearchQuery.trim()) return true;
        const q = modalDaySearchQuery.toLowerCase();
        return (
            dia.fecha.toLowerCase().includes(q) ||
            dia.diaSemana.toLowerCase().includes(q) ||
            dia.primeraEntrada.toLowerCase().includes(q) ||
            dia.ultimaSalida.toLowerCase().includes(q) ||
            (dia.extrasTempranoFormatted && dia.extrasTempranoFormatted.toLowerCase().includes(q)) ||
            (dia.extrasTardeFormatted && dia.extrasTardeFormatted.toLowerCase().includes(q)) ||
            (dia.totalExtrasFormatted && dia.totalExtrasFormatted.toLowerCase().includes(q))
        );
    }) || [];

    const filteredExcelRows = empleados.filter((emp: EmpleadoResumen) => {
        if (!excelSearchQuery.trim()) return true;
        const q = excelSearchQuery.toLowerCase();
        return (
            emp.nombre.toLowerCase().includes(q) ||
            emp.empId.toLowerCase().includes(q) ||
            (emp.totalExtrasFormatted && emp.totalExtrasFormatted.toLowerCase().includes(q))
        );
    });

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
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700/80 shrink-0"
                            title="Regresar al Portal Principal"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-white" />
                            <span className="hidden sm:inline">Regresar</span>
                        </Link>

                        <div className="h-4 w-[1px] bg-slate-700/80 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                                <Flower2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                    <Link href="/" className="hover:underline hover:text-slate-300">Inicio</Link>
                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                    <span>Administración</span>
                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                    <span className="text-emerald-400 font-bold">Horas Extras</span>
                                </div>
                                <p className="text-xs font-black uppercase tracking-wider text-white truncate max-w-[180px] sm:max-w-none">
                                    Control de Horas Extras ZKteco
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {selectedReporte && (
                            <button
                                onClick={() => {
                                    setSelectedReporte(null);
                                    setActiveTab('CARGAR');
                                }}
                                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-500/40 transition-all cursor-pointer active:scale-95"
                                title="Volver a la pantalla principal para subir otro archivo Excel"
                            >
                                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline">Subir Excel</span>
                            </button>
                        )}
                        <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Seleccionar Excel</span>
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
                            <span className="hidden md:inline">Imprimir / PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Document Content Container */}
            <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-4 print:p-0 print:space-y-4">

                {/* Global Navigation Tabs Ribbon (Always Visible at Top) */}
                <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                        <button
                            onClick={() => {
                                setSelectedReporte(null);
                                setActiveTab('CARGAR');
                            }}
                            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'CARGAR' && !selectedReporte
                                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>1. Subir Archivo Excel</span>
                        </button>

                        <button
                            onClick={() => {
                                if (!selectedReporte && historial.length > 0) {
                                    setSelectedReporte(historial[0]);
                                }
                                setActiveTab('RESUMEN');
                            }}
                            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'RESUMEN' && selectedReporte
                                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>2. Resumen por Empleado</span>
                            {selectedReporte && (
                                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
                                    {empleados.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                setActiveTab('HISTORIAL');
                            }}
                            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'HISTORIAL'
                                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                        >
                            <History className="w-3.5 h-3.5" />
                            <span>3. Historial de Reportes</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === 'HISTORIAL' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                                {historial.length}
                            </span>
                        </button>
                    </div>

                    {selectedReporte && (
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                                onClick={() => setShowExcelViewerModal(true)}
                                className="py-1.5 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-300 transition-all cursor-pointer shadow-xs active:scale-95"
                                title="Abrir visor interactivo de Excel"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Ver Excel</span>
                            </button>

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
                    )}
                </div>

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

                    {/* ZONA DRAG AND DROP (VISTA CARGAR O SIN REPORTE) */}
                    {(activeTab === 'CARGAR' || (!selectedReporte && activeTab !== 'HISTORIAL')) && (
                        <div className="space-y-6">
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`p-8 sm:p-12 border-2 border-dashed rounded-3xl text-center space-y-4 transition-all duration-200 print:hidden ${isDragging
                                        ? 'border-emerald-600 bg-emerald-100/50 scale-[1.01] shadow-lg'
                                        : 'border-emerald-400/80 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-500'
                                    }`}
                            >
                                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div className="max-w-md mx-auto space-y-1.5">
                                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                                        Arrastra tu archivo Excel ZKteco aquí
                                    </h3>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Suelta el archivo `.xls` o `.xlsx` en esta zona o haz clic en el botón para explorar tus carpetas.
                                    </p>
                                </div>

                                <div className="pt-3 flex items-center justify-center">
                                    <label className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md inline-flex items-center gap-2 transition cursor-pointer active:scale-95">
                                        <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span>Seleccionar Archivo Excel</span>
                                        <input
                                            type="file"
                                            accept=".xls,.xlsx,.csv"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={isPending}
                                        />
                                    </label>
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
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">{formatMinutos(Math.round(rep.totalHorasExtras * 60))}</td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedReporte(rep);
                                                                        setActiveTab('RESUMEN');
                                                                    }}
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

                    {/* VISTA DE RESUMEN CON REPORTE SELECCIONADO */}
                    {activeTab === 'RESUMEN' && (
                        selectedReporte ? (
                            <>
                                {/* Banner de Identificación del Reporte Activo */}
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs print:hidden">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="font-bold text-emerald-950">Viendo Reporte Activo:</span>
                                        <span className="font-extrabold text-emerald-800">{selectedReporte.titulo}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedReporte(null);
                                            setActiveTab('CARGAR');
                                        }}
                                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                    >
                                        Cambiar o Subir Otro Archivo
                                    </button>
                                </div>

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
                                                <span className="font-bold text-amber-800">{formatMinutos(totalMinutosTemprano)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs py-0.5">
                                                <span className="text-slate-600">Extras Tarde (Salida):</span>
                                                <span className="font-bold text-blue-800">{formatMinutos(totalMinutosTarde)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-emerald-300 font-black text-emerald-900">
                                            <span className="uppercase tracking-wider">TOTAL HORAS EXTRAS:</span>
                                            <span className="text-xl font-mono font-black text-emerald-700">{formatMinutos(totalMinutosGenerales)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* RESUMEN INDIVIDUAL DE HORAS EXTRAS POR EMPLEADO */}
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
                                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] ${index === 0 ? 'bg-emerald-100 text-emerald-900 font-black border border-emerald-300' :
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
                                                            <div className="flex items-center gap-1.5">
                                                                <span>{emp.nombre}</span>
                                                                {['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE'].includes(userRole) && (
                                                                    <button
                                                                        onClick={() => promptEditEmpName(emp.nombre, emp.empId)}
                                                                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition print:hidden cursor-pointer"
                                                                        title="Editar nombre de empleado"
                                                                    >
                                                                        <Pencil className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                                            {emp.diasTrabajados} días
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                                                            {emp.extrasTempranoFormatted || (emp.horasExtrasTemprano > 0 ? `${fmtNum(emp.horasExtrasTemprano)} h` : '—')}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                                                            {emp.extrasTardeFormatted || (emp.horasExtrasTarde > 0 ? `${fmtNum(emp.horasExtrasTarde)} h` : '—')}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/40">
                                                            {emp.totalExtrasFormatted || `${fmtNum(emp.totalHorasExtras)} hrs`}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center print:hidden">
                                                            <button
                                                                onClick={() => {
                                                                    setModalDaySearchQuery('');
                                                                    setSelectedEmpModal(emp);
                                                                }}
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
                        ) : (
                            <div className="p-12 text-center space-y-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 print:hidden">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-900 text-sm">No hay ningún reporte seleccionado</h4>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                        Para ver el resumen por empleado, selecciona un reporte de la pestaña <strong>Historial de Reportes</strong> o <strong>Sube un nuevo archivo Excel ZKteco</strong>.
                                    </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <button
                                        onClick={() => setActiveTab('CARGAR')}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-xs"
                                    >
                                        Subir Archivo Excel
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('HISTORIAL')}
                                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
                                    >
                                        Ver Historial ({historial.length})
                                    </button>
                                </div>
                            </div>
                        )
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
                                                    {formatMinutos(Math.round(rep.totalHorasExtras * 60))}
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
                </div>
            </main>

            {/* MODAL MODERNO HIGH-TECH DE PROCESAMIENTO Y PROGRESO ANIMADO AI */}
            {processingModal?.open && (
                <div className="fixed inset-0 z-[4000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-800 text-white space-y-6 relative overflow-hidden">
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

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

                            <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/50 relative overflow-hidden"
                                    style={{ width: `${processingModal.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 relative z-10 text-xs">
                            {processingSteps.map((step, idx) => {
                                const isDone = processingModal.progress >= step.percentage;
                                const isCurrent = idx === processingModal.stepIndex && !processingModal.completed;

                                return (
                                    <div
                                        key={step.label}
                                        className={`flex items-center gap-2.5 transition-all duration-200 ${isDone ? 'text-emerald-300 font-medium' : isCurrent ? 'text-white font-bold' : 'text-slate-600'
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

                        <div className="text-center pt-1 text-[10px] text-slate-500 font-mono tracking-wider uppercase relative z-10">
                            Distribuidora Paraíso Floral • Algoritmo ZKteco v2.0
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALLE DIARIO POR EMPLEADO (CON BUSCADOR POR DÍA) */}
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
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-base text-emerald-900">
                                            DESGLOSE DIARIO — {selectedEmpModal.nombre}
                                        </h3>
                                        {['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE'].includes(userRole) && (
                                            <button
                                                onClick={() => promptEditEmpName(selectedEmpModal.nombre, selectedEmpModal.empId)}
                                                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                                                title="Editar nombre del empleado"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
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
                                <span className="text-base font-black text-amber-900">{selectedEmpModal.extrasTempranoFormatted || `${fmtNum(selectedEmpModal.horasExtrasTemprano)} hrs`}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Extras Tarde</span>
                                <span className="text-base font-black text-blue-900">{selectedEmpModal.extrasTardeFormatted || `${fmtNum(selectedEmpModal.horasExtrasTarde)} hrs`}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Horas Extras</span>
                                <span className="text-base font-black text-emerald-900">{selectedEmpModal.totalExtrasFormatted || `${fmtNum(selectedEmpModal.totalHorasExtras)} hrs`}</span>
                            </div>
                        </div>

                        {/* Buscador de Días / Fechas */}
                        <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={modalDaySearchQuery}
                                    onChange={(e) => setModalDaySearchQuery(e.target.value)}
                                    placeholder="Filtrar por día (ej. 'Jueves', '06', 'Sábado', '04:38')..."
                                    className="w-full pl-9 pr-8 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                                />
                                {modalDaySearchQuery && (
                                    <button
                                        onClick={() => setModalDaySearchQuery('')}
                                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 shrink-0">
                                {filteredModalDias.length} de {selectedEmpModal.dias.length} días
                            </span>
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
                                    {filteredModalDias.map((dia: DiaDetalle) => (
                                        <tr key={dia.fecha} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                                {dia.fecha}
                                            </td>
                                            <td className="py-2.5 px-3 font-bold">
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${dia.diaSemana === 'Sábado' ? 'bg-amber-100 text-amber-800 font-extrabold' :
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
                                                {dia.extrasTempranoFormatted || (dia.extrasTemprano > 0 ? `${fmtNum(dia.extrasTemprano)} h` : '—')}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-blue-800 font-semibold">
                                                {dia.extrasTardeFormatted || (dia.extrasTarde > 0 ? `${fmtNum(dia.extrasTarde)} h` : '—')}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/40">
                                                {dia.totalExtrasFormatted || (dia.totalExtras > 0 ? `${fmtNum(dia.totalExtras)} hrs` : '—')}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredModalDias.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                                                No hay días coincidentes con la búsqueda &quot;{modalDaySearchQuery}&quot;.
                                            </td>
                                        </tr>
                                    )}
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

            {/* MODAL DE EDICIÓN DE NOMBRE DE EMPLEADO */}
            {editEmpModal?.open && (
                <div className="fixed inset-0 z-[3700] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-900 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <Pencil className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                                    Editar Nombre de Empleado
                                </h3>
                                <p className="text-xs text-slate-500">
                                    ID ZKteco: <span className="font-mono font-bold">{editEmpModal.empId}</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                Nombre Oficial / Asignado
                            </label>
                            <input
                                type="text"
                                value={newEmpNameInput}
                                onChange={(e) => setNewEmpNameInput(e.target.value)}
                                placeholder="Ejemplo: JUAN PÉREZ"
                                className="w-full px-3.5 py-2 text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                                autoFocus
                            />
                            <p className="text-[11px] text-slate-500 italic">
                                Este nombre reemplazará la etiqueta inicial exportada del reloj biométrico.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button
                                type="button"
                                onClick={confirmRenameEmp}
                                disabled={isPending || !newEmpNameInput.trim()}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                            >
                                {isPending ? 'Guardando...' : 'Guardar Nombre'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditEmpModal(null)}
                                disabled={isPending}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 text-center border border-slate-200 cursor-pointer"
                            >
                                Cancelar
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

                    {/* VISOR INTERACTIVO EN MODAL DE HOJA DE CÁLCULO EXCEL */}
                    {showExcelViewerModal && selectedReporte && (
                        <div className="fixed inset-0 z-[3800] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
                            <div className="bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 text-white overflow-hidden">
                                {/* Header Ribbon estilo Microsoft Excel */}
                                <div className="bg-emerald-950 border-b border-emerald-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                                            <FileSpreadsheet className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-emerald-800 text-emerald-200 text-[10px] font-black uppercase rounded tracking-wider">
                                                    Visor de Hoja de Cálculo Excel
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono">.XLSX</span>
                                            </div>
                                            <h3 className="font-extrabold text-base text-white tracking-tight">
                                                {selectedReporte.titulo}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <button
                                            onClick={handleExportExcel}
                                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                                            title="Descargar archivo en formato Excel .xlsx"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Descargar .xlsx</span>
                                        </button>
                                        <button
                                            onClick={() => setShowExcelViewerModal(false)}
                                            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                                            title="Cerrar Visor"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Barra de herramientas / Búsqueda dentro del Excel */}
                                <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                    <div className="relative w-full sm:w-80">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            value={excelSearchQuery}
                                            onChange={(e) => setExcelSearchQuery(e.target.value)}
                                            placeholder="Buscar en la hoja de cálculo (ej. ID, Nombre)..."
                                            className="w-full pl-9 pr-8 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs"
                                        />
                                        {excelSearchQuery && (
                                            <button
                                                onClick={() => setExcelSearchQuery('')}
                                                className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                                        <span>Hoja 1: <strong>Horas Extras Auditadas</strong></span>
                                        <span>•</span>
                                        <span>{filteredExcelRows.length} Filas × 7 Columnas</span>
                                    </div>
                                </div>

                                {/* Grilla / Contenedor estilo Excel */}
                                <div className="flex-1 overflow-auto p-4 bg-slate-950 custom-scrollbar">
                                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-inner">
                                        <table className="w-full text-left border-collapse text-xs font-mono">
                                            <thead>
                                                {/* Cabecera de Letras de Columna de Excel A B C D E F G */}
                                                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[10px] text-center select-none">
                                                    <th className="w-12 py-1 bg-slate-950 border-r border-slate-800 text-slate-600">#</th>
                                                    <th className="py-1 border-r border-slate-800">A</th>
                                                    <th className="py-1 border-r border-slate-800">B</th>
                                                    <th className="py-1 border-r border-slate-800">C</th>
                                                    <th className="py-1 border-r border-slate-800">D</th>
                                                    <th className="py-1 border-r border-slate-800">E</th>
                                                    <th className="py-1 border-r border-slate-800">F</th>
                                                    <th className="py-1">G</th>
                                                </tr>
                                                {/* Nombres de las Columnas del Reporte */}
                                                <tr className="bg-emerald-950/60 text-emerald-300 font-black border-b-2 border-emerald-700 uppercase tracking-wider text-[11px]">
                                                    <th className="py-2.5 px-3 text-center border-r border-slate-800 bg-slate-950 text-slate-500">1</th>
                                                    <th className="py-2.5 px-3 border-r border-slate-800">Ranking</th>
                                                    <th className="py-2.5 px-3 border-r border-slate-800">ID ZKteco</th>
                                                    <th className="py-2.5 px-3 border-r border-slate-800">Nombre Empleado</th>
                                                    <th className="py-2.5 px-3 text-center border-r border-slate-800">Días Trab.</th>
                                                    <th className="py-2.5 px-3 text-right border-r border-slate-800 text-amber-300">Extras Mañana</th>
                                                    <th className="py-2.5 px-3 text-right border-r border-slate-800 text-blue-300">Extras Tarde</th>
                                                    <th className="py-2.5 px-3 text-right text-emerald-400 bg-emerald-900/40">TOTAL EXTRAS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800 text-slate-200">
                                                {filteredExcelRows.map((emp: EmpleadoResumen, idx: number) => (
                                                    <tr
                                                        key={emp.nombre}
                                                        className="hover:bg-emerald-950/40 transition-colors group"
                                                    >
                                                        {/* Número de Fila Excel */}
                                                        <td className="py-2 px-3 text-center font-bold bg-slate-950 text-slate-500 border-r border-slate-800 select-none group-hover:text-emerald-400">
                                                            {idx + 2}
                                                        </td>
                                                        {/* A: Ranking */}
                                                        <td className="py-2 px-3 border-r border-slate-800 font-bold text-center">
                                                            #{idx + 1}
                                                        </td>
                                                        {/* B: ID ZKteco */}
                                                        <td className="py-2 px-3 border-r border-slate-800 font-bold text-slate-400">
                                                            {emp.empId}
                                                        </td>
                                                        {/* C: Nombre Empleado */}
                                                        <td className="py-2 px-3 border-r border-slate-800 font-bold text-white">
                                                            {emp.nombre}
                                                        </td>
                                                        {/* D: Días Trabajados */}
                                                        <td className="py-2 px-3 border-r border-slate-800 text-center text-slate-300">
                                                            {emp.diasTrabajados} días
                                                        </td>
                                                        {/* E: Extras Mañana */}
                                                        <td className="py-2 px-3 border-r border-slate-800 text-right font-bold text-amber-300">
                                                            {emp.extrasTempranoFormatted || (emp.horasExtrasTemprano > 0 ? `${fmtNum(emp.horasExtrasTemprano)} h` : '—')}
                                                        </td>
                                                        {/* F: Extras Tarde */}
                                                        <td className="py-2 px-3 border-r border-slate-800 text-right font-bold text-blue-300">
                                                            {emp.extrasTardeFormatted || (emp.horasExtrasTarde > 0 ? `${fmtNum(emp.horasExtrasTarde)} h` : '—')}
                                                        </td>
                                                        {/* G: Total Horas Extras */}
                                                        <td className="py-2 px-3 text-right font-black text-emerald-400 bg-emerald-950/40">
                                                            {emp.totalExtrasFormatted || `${fmtNum(emp.totalHorasExtras)} hrs`}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredExcelRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                                                            No hay filas coincidentes en la hoja de cálculo.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Pie del Visor */}
                                <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
                                    <span className="text-[11px] font-mono">
                                        Hoja de Cálculo Autogenerada • Distribuidora Paraíso Floral
                                    </span>
                                    <button
                                        onClick={() => setShowExcelViewerModal(false)}
                                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer text-xs"
                                    >
                                        Cerrar Visor
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
}
