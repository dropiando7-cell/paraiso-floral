'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Package, MapPin, Tag, Calendar, Hash,
    User, CheckCircle2, AlertTriangle, TrendingDown,
    FileText, Layers, ChevronLeft, ChevronRight, X,
    QrCode, Building2, Shield, Barcode, Laptop, Plus,
    Printer, Clock, MessageSquare, Paperclip, Wrench, Download, Image, Play, Music, Pencil
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type Activo = {
    id: string;
    idQr: string;
    descripcionCorta: string;
    descripcionDetallada?: string | null;
    serie?: string | null;
    codigoBarras?: string | null;
    modelo?: string | null;
    marca?: string | null;
    area: string;
    cuentaAct: string;
    estatusContable: string;
    estadoDano?: string | null;
    tipoIncidencia?: string | null;
    accionRecomendada?: string | null;
    responsable?: string | null;
    observaciones?: string | null;
    imagenUrl?: string | null;
    imagenPlacaUrl?: string | null;
    fechaAdq?: string | null;
    fechaLevantamiento?: string | null;
    integrado: boolean;
    costoAdq?: number | null;
    createdAt: string;
    garantia?: string | null;
    mantenimientosIncluidos?: number | null;
    frecuenciaMantenimientoMeses?: number | null;
    esEquipoCliente: boolean;
    clienteId?: string | null;
    cliente?: {
        id: string;
        nombre: string;
        telefono?: string | null;
        direccion?: string | null;
    } | null;
    ordenesTrabajo?: any[];
    detallesFactura?: {
        factura: {
            id: string;
            fechaEmision: string;
            numeroDocumento?: string | null;
            correlativo?: string | null;
            creadoPor?: {
                nombre?: string | null;
                apellido?: string | null;
                email: string;
            } | null;
            cliente?: {
                nombre: string;
                telefono?: string | null;
                direccion?: string | null;
                rtn?: string | null;
            } | null;
            ordenEntrega?: {
                correlativo: string;
                aplicaMantenimientos: boolean;
                evidenciaFotos: string[];
            } | null;
        };
    }[];
};

function EstatusBadge({ estatus, esCliente }: { estatus: string, esCliente: boolean }) {
    if (esCliente) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                <Laptop className="w-3.5 h-3.5" />
                Equipo de Cliente
            </span>
        );
    }
    const configs: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
        'VIGENTE': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Vigente' },
        'DEPRECIADO': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: TrendingDown, label: 'Depreciado' },
        'PROCESO DE BAJA': { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle, label: 'Proceso de Baja' },
    };
    const cfg = configs[estatus] || { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Package, label: estatus };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
        </span>
    );
}

function Field({ label, value, mono, icon: Icon }: {
    label: string;
    value?: string | null;
    mono?: boolean;
    icon?: typeof MapPin;
}) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {Icon && <Icon className="w-3 h-3" />}
                {label}
            </div>
            <div className={`text-xs font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>
                {value}
            </div>
        </div>
    );
}

export default function FichaTecnicaClient({ 
    activo, 
    distribucion,
    userPermissions = [],
    isSuperAdmin = false
}: { 
    activo: Activo, 
    distribucion?: { idQr: string, serie?: string | null, area: string, stock: number, estatusContable: string }[],
    userPermissions?: string[],
    isSuperAdmin?: boolean
}) {
    const router = useRouter();
    const [downloadingReport, setDownloadingReport] = useState(false);

    const canEdit = isSuperAdmin || userPermissions.includes('editar_ordenes_ficha') || userPermissions.includes('editar_ordenes');

    const handleBack = () => {
        const hasHistory = typeof window !== 'undefined' && window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host);
        if (hasHistory) {
            router.back();
        } else {
            router.push('/soporte');
        }
    };

    const handleClose = () => {
        router.push('/soporte');
    };

    useEffect(() => {
        // Prevent back button from exiting if user landed directly (history length 1 and no app referrer)
        const hasHistory = typeof window !== 'undefined' && window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host);
        
        if (!hasHistory) {
            window.history.pushState({ prevented: true }, '');
            
            const handlePopState = () => {
                router.push('/soporte');
            };
            
            window.addEventListener('popstate', handlePopState);
            
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [router]);

    const images = [activo.imagenUrl, activo.imagenPlacaUrl].filter(Boolean) as string[];
    const [imgIdx, setImgIdx] = useState(0);

    // Combine original images and sales evidence photos for the Lightbox
    const salesFotos = activo.detallesFactura?.flatMap(df => df.factura.ordenEntrega?.evidenciaFotos || []) || [];
    const allImages = [...images, ...salesFotos];

    const [lightboxIdx, setLightboxIdx] = useState(0);
    const [lightbox, setLightbox] = useState(false);

    const fecha = (d?: string | null) => {
        if (!d) return null;
        return new Date(d).toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const hasDano = !!activo.estadoDano;

    const groupedDistribucion = distribucion?.reduce((acc, curr) => {
        if (!acc[curr.area]) acc[curr.area] = { stockTotal: 0, items: [] };
        acc[curr.area].stockTotal += curr.stock || 1;
        acc[curr.area].items.push(curr);
        return acc;
    }, {} as Record<string, { stockTotal: number, items: NonNullable<typeof distribucion>[0][] }>) || {};

    const lastSaleDetail = activo.detallesFactura && activo.detallesFactura.length > 0 ? activo.detallesFactura[activo.detallesFactura.length - 1] : null;
    const sale = lastSaleDetail?.factura;
    const ordenEntrega = sale?.ordenEntrega;

    const baseDate = sale?.fechaEmision ? new Date(sale.fechaEmision) : new Date();
    const maintenanceDates = [];
    if (ordenEntrega?.aplicaMantenimientos && activo.mantenimientosIncluidos && activo.frecuenciaMantenimientoMeses) {
        for (let i = 1; i <= activo.mantenimientosIncluidos; i++) {
            const scheduledDate = new Date(baseDate);
            scheduledDate.setMonth(scheduledDate.getMonth() + i * activo.frecuenciaMantenimientoMeses);
            maintenanceDates.push({
                num: i,
                date: scheduledDate.toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' })
            });
        }
    }

    const handleDownloadReport = async () => {
        setDownloadingReport(true);
        try {
            // Invocar la descarga del PDF del historial
            const reportUrl = `/api/pdf/${activo.id}?type=historial`;
            window.open(reportUrl, '_blank');
            toast.success("Generando reporte de historial...");
        } catch (err) {
            console.error(err);
            toast.error("Error al descargar el informe histórico.");
        } finally {
            setDownloadingReport(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-6 px-4">

            {/* Lightbox */}
            {lightbox && allImages.length > 0 && (
                <div
                    className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setLightbox(false)}
                >
                    <button className="absolute top-4 right-4 p-3 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors" onClick={() => setLightbox(false)}>
                        <X className="w-6 h-6" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={allImages[lightboxIdx]}
                        alt="Vista ampliada"
                        className="w-[600px] max-w-full h-auto max-h-[80vh] object-contain bg-white p-4 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    />
                    {allImages.length > 1 && (
                        <div className="absolute bottom-6 flex gap-2">
                            {allImages.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={e => { e.stopPropagation(); setLightboxIdx(i); }}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === lightboxIdx ? 'bg-white scale-125' : 'bg-white/30'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Ficha Card */}
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-6 text-white text-left">
                    {/* Navigation Actions */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 transition-all px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Atrás
                        </button>
                        
                        <button
                            onClick={handleClose}
                            className="flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 transition-all px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm"
                            title="Cerrar Ficha"
                        >
                            <X className="w-3.5 h-3.5" />
                            Cerrar
                        </button>
                    </div>

                    {/* Logo + Brand */}
                    <div className="flex items-center gap-2 mb-4 opacity-80">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Bioelectrónica Honduras</span>
                    </div>

                    {/* ID QR */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="rounded-lg px-2.5 py-1">
                            <span className="text-sm font-mono font-black tracking-widest text-white">{activo.idQr}</span>
                        </div>
                        <QrCode className="w-4 h-4 text-white/60 animate-pulse" />
                    </div>

                    {/* Asset name */}
                    <h1 className="text-2xl font-black leading-tight mb-3 tracking-tight">{activo.descripcionCorta}</h1>

                    {/* Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <EstatusBadge estatus={activo.estatusContable} esCliente={activo.esEquipoCliente} />
                        {hasDano && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-500/20 text-red-200 border border-red-450/30">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {activo.estadoDano}
                            </span>
                        )}
                    </div>

                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                    <div className="absolute -bottom-16 -right-6 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
                </div>

                {/* Photo */}
                {images.length > 0 && (
                    <div className="relative bg-slate-950 h-64 overflow-hidden flex items-center justify-center border-b border-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={images[imgIdx]}
                            alt={activo.descripcionCorta}
                            className="w-full h-full object-contain cursor-zoom-in"
                            onClick={() => {
                                setLightboxIdx(imgIdx);
                                setLightbox(true);
                            }}
                        />
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setImgIdx(i => (i + 1) % images.length)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {images.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                        <div className="absolute top-3 right-3 bg-black/60 text-white text-[9px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm">
                            {imgIdx === 0 ? '📷 Foto de Evidencia' : '🏷️ Placa Técnica / Serie'}
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-6 space-y-6 text-left">

                    {/* Banner Cliente Externo (SI APLICA) */}
                    {activo.esEquipoCliente && activo.cliente && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                            <div>
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold uppercase px-2 py-0.5 rounded">Propietario Externo</span>
                                <h3 className="text-sm font-black text-slate-800 mt-1 tracking-tight">{activo.cliente.nombre}</h3>
                                {activo.cliente.telefono && <p className="text-xs text-slate-500 font-semibold mt-1">Teléfono: {activo.cliente.telefono}</p>}
                                {activo.cliente.direccion && <p className="text-[11px] text-slate-450 leading-relaxed font-semibold mt-0.5">Ubicación: {activo.cliente.direccion}</p>}
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                                <button
                                    onClick={handleDownloadReport}
                                    disabled={downloadingReport}
                                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-black px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Descargar PDF
                                </button>
                                <button
                                    onClick={() => router.push(`/soporte/nuevo?activoId=${activo.id}&clienteId=${activo.cliente?.id}&clienteNombre=${encodeURIComponent(activo.cliente?.nombre || '')}&equipoDano=${encodeURIComponent(activo.descripcionCorta)}&marca=${encodeURIComponent(activo.marca || '')}&modelo=${encodeURIComponent(activo.modelo || '')}&serie=${encodeURIComponent(activo.serie || '')}`)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shadow-blue-150"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Generar ODT
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Descripción detallada */}
                    {activo.descripcionDetallada && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                <FileText className="w-3 h-3" />
                                Descripción Detallada
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{activo.descripcionDetallada}</p>
                        </div>
                    )}

                    {/* Identificación Técnica */}
                    <div>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-100" />
                            Datos Técnicos del Activo
                            <div className="h-px flex-1 bg-slate-100" />
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Marca / Modelo" value={[activo.marca, activo.modelo].filter(Boolean).join(" ") || "No especificado"} icon={Tag} />
                            <Field label="Número de Serie" value={activo.serie || "Sin Serie"} mono icon={Hash} />
                            {activo.codigoBarras && (
                                <div className="col-span-2">
                                    <Field label="Cód. Barras Fábrica" value={activo.codigoBarras} mono icon={Barcode} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TIMELINE HISTÓRICO DE MANTENIMIENTO (Soporte Técnico) */}
                    {activo.ordenesTrabajo && activo.ordenesTrabajo.length > 0 && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                <div className="h-px flex-1 bg-slate-100" />
                                Historial de Servicios y ODTs ({activo.ordenesTrabajo.length})
                                <div className="h-px flex-1 bg-slate-100" />
                            </h2>

                            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                                {activo.ordenesTrabajo.map((orden, idx) => {
                                    const task = orden.kanbanTasks?.[0];
                                    const attachments = task?.attachments || [];
                                    const comments = task?.comments || [];
                                    
                                    const statusColors: Record<string, string> = {
                                        'RECIBIDO': 'bg-slate-100 text-slate-700 border-slate-200',
                                        'EN_EVALUACION': 'bg-yellow-50 text-yellow-800 border-yellow-250',
                                        'REPARACION': 'bg-blue-50 text-blue-800 border-blue-200',
                                        'LISTO_ENTREGA': 'bg-emerald-50 text-emerald-800 border-emerald-250',
                                        'ENTREGADO': 'bg-green-100 text-green-800 border-green-200',
                                    };
                                    
                                    return (
                                        <div key={orden.id} className="relative pl-6">
                                            {/* Circulo indicador en la linea temporal */}
                                            <div className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                                            
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:border-slate-350">
                                                
                                                {/* Header ODT */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                                            #{orden.codigoSeguridad}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {new Date(orden.fechaRecibido).toLocaleDateString()}
                                                        </span>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => router.push(`/soporte/${orden.id}`)}
                                                                className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-0.5 ml-2 transition-colors cursor-pointer border-0 bg-transparent py-0.5 px-1 hover:bg-blue-50 rounded"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                                Editar
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] font-bold border rounded px-2 py-0.5 ${statusColors[orden.estado] || 'bg-slate-100 text-slate-700'}`}>
                                                        {orden.estado}
                                                    </span>
                                                </div>

                                                {/* Fallas y diagnósticos */}
                                                <div className="space-y-2 text-xs">
                                                    <div>
                                                        <span className="block text-slate-450 font-bold text-[9px] uppercase tracking-wider">Reporte de Falla</span>
                                                        <p className="text-slate-700 font-medium">{orden.descripcionFalla}</p>
                                                    </div>
                                                    {orden.diagnosticoTecnico && (
                                                        <div className="border-t border-slate-200/50 pt-1.5">
                                                            <span className="block text-slate-450 font-bold text-[9px] uppercase tracking-wider">Diagnóstico Técnico</span>
                                                            <p className="text-slate-800 font-semibold">{orden.diagnosticoTecnico}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Componentes/Materiales Utilizados */}
                                                {orden.repuestos && orden.repuestos.length > 0 && (
                                                    <div className="mt-3 pt-2.5 border-t border-slate-200/50">
                                                        <span className="block text-slate-450 font-bold text-[9px] uppercase tracking-wider mb-1.5">Materiales / Repuestos Utilizados</span>
                                                        <div className="space-y-1">
                                                            {orden.repuestos.map((rep: any) => (
                                                                <div key={rep.id} className="flex justify-between text-[11px] font-bold text-slate-700 bg-white border border-slate-100 rounded px-2 py-1">
                                                                    <span>{rep.descripcion}</span>
                                                                    <span className="text-slate-500">x{rep.cantidad}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Evidencias multimedia (Fotos / Videos / Audios del Kanban) */}
                                                {attachments.length > 0 && (
                                                    <div className="mt-3 pt-2.5 border-t border-slate-200/50">
                                                        <span className="block text-slate-450 font-bold text-[9px] uppercase tracking-wider mb-2">Adjuntos de Evidencia</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {attachments.map((att: any) => {
                                                                const isImage = att.tipo?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|gif|png)$/i);
                                                                const isVideo = att.tipo?.startsWith('video/') || att.url?.match(/\.(mp4|webm)$/i);
                                                                const isAudio = att.tipo?.startsWith('audio/') || att.url?.match(/\.(mp3|wav|ogg)$/i);
                                                                
                                                                if (isImage) {
                                                                    return (
                                                                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors flex shrink-0">
                                                                            <img src={att.url} alt={att.nombre} className="w-full h-full object-cover" />
                                                                        </a>
                                                                    );
                                                                } else if (isVideo) {
                                                                    return (
                                                                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg border border-slate-200 hover:border-blue-500 transition-colors flex items-center justify-center bg-slate-900 text-white shrink-0" title={att.nombre}>
                                                                            <Play className="w-5 h-5 text-indigo-400" />
                                                                        </a>
                                                                    );
                                                                } else if (isAudio) {
                                                                    return (
                                                                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg border border-slate-200 hover:border-blue-500 transition-colors flex items-center justify-center bg-slate-100 text-slate-600 shrink-0" title={att.nombre}>
                                                                            <Music className="w-5 h-5 text-emerald-500" />
                                                                        </a>
                                                                    );
                                                                }
                                                                return (
                                                                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg border border-slate-200 hover:border-blue-500 transition-colors flex items-center justify-center bg-slate-200 text-slate-500 shrink-0" title={att.nombre}>
                                                                        <Paperclip className="w-4 h-4" />
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Comentarios del equipo (Jira/Slack style) */}
                                                {comments.length > 0 && (
                                                    <div className="mt-3 pt-2.5 border-t border-slate-200/50">
                                                        <span className="block text-slate-450 font-bold text-[9px] uppercase tracking-wider mb-2 flex items-center gap-1">
                                                            <MessageSquare className="w-3 h-3" />
                                                            Comentarios de Ejecución
                                                        </span>
                                                        <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                                                            {comments.map((com: any) => (
                                                                <div key={com.id} className="bg-white border border-slate-100 rounded-lg p-2 text-[10px]">
                                                                    <div className="flex items-center justify-between text-slate-400 font-bold mb-0.5">
                                                                        <span>{com.usuario?.nombre || 'Técnico'}</span>
                                                                        <span>{new Date(com.createdAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-slate-650 font-medium leading-relaxed">{com.contenido}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Técnicos Asignados */}
                                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-450 font-bold">
                                                    <span>Técnico Responsable:</span>
                                                    <div className="flex -space-x-1.5 overflow-hidden">
                                                        {orden.tecnicosAsignados && orden.tecnicosAsignados.length > 0 ? (
                                                            orden.tecnicosAsignados.map((u: any) => (
                                                                <div key={u.id} className="inline-block h-5 w-5 rounded-full ring-2 ring-slate-50 bg-blue-50 border border-blue-100 flex items-center justify-center text-[7px] text-blue-700 uppercase" title={u.nombre}>
                                                                    {u.avatarUrl ? <img src={u.avatarUrl} alt={u.nombre} className="h-full w-full object-cover" /> : u.nombre[0]}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-slate-500 font-normal">Sin asignar</span>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Trazabilidad de Venta (SI NO ES EQUIPO CLIENTE Y TIENE VENTA) */}
                    {!activo.esEquipoCliente && sale && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-4">
                            <h2 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-blue-100 pb-2">
                                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                Trazabilidad de Venta y Entrega
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Orden de Entrega</span>
                                    <span className="font-mono font-bold text-blue-900 text-sm">{ordenEntrega?.correlativo || 'ODE-PENDIENTE'}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Fecha de Venta</span>
                                    <span className="font-medium text-slate-800">{fecha(sale.fechaEmision)}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Vendido por</span>
                                    <span className="font-medium text-slate-800">
                                        {sale.creadoPor ? `${sale.creadoPor.nombre || ''} ${sale.creadoPor.apellido || ''} (${sale.creadoPor.email})`.trim() : 'Asesor Comercial'}
                                    </span>
                                </div>
                                <div className="col-span-2 border-t border-blue-100/50 pt-2">
                                    <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Cliente Cotizó</span>
                                    <span className="font-bold text-slate-800 text-sm block">{sale.cliente?.nombre || 'Cliente Particular'}</span>
                                </div>
                                
                                {activo.garantia && (
                                    <div className="col-span-2 border-t border-blue-100/50 pt-2 flex items-center justify-between">
                                        <div>
                                            <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Garantía de Fábrica</span>
                                            <span className="font-bold text-emerald-700 text-sm">{activo.garantia} meses</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Ubicación Contable */}
                    <div>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-100" />
                            Ubicación y Clasificación
                            <div className="h-px flex-1 bg-slate-100" />
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Field label="Área / Ubicación" value={activo.area} icon={MapPin} />
                            </div>
                            <div className="col-span-2">
                                <Field label="Cuenta Contable" value={activo.cuentaAct} icon={Layers} />
                            </div>
                            <Field label="Responsable / Custodio" value={activo.responsable} icon={User} />
                        </div>
                    </div>

                    {/* Observaciones */}
                    {activo.observaciones && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1.5">Observaciones</div>
                            <p className="text-xs text-amber-800 whitespace-pre-wrap font-medium">{activo.observaciones}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-405 font-bold">
                        Registrado: {fecha(activo.createdAt)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                        <Building2 className="w-4 h-4" />
                        bioelectronicahn.com
                    </div>
                </div>
            </div>

            {/* Sub-brand */}
            <p className="mt-6 text-xs text-slate-400 text-center font-medium">
                Inventario Comercial & Taller · Bioelectrónica Honduras
            </p>
        </div>
    );
}
