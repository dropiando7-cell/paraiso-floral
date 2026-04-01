'use client';

import { useState } from 'react';
import {
    Package, MapPin, Tag, Calendar, Hash,
    User, CheckCircle2, AlertTriangle, TrendingDown,
    FileText, Layers, ChevronLeft, ChevronRight, X,
    QrCode, Building2, Shield, Barcode
} from 'lucide-react';

type Activo = {
    idQr: string;
    descripcionCorta: string;
    descripcionDetallada?: string | null;
    serie?: string | null;
    codigoBarras?: string | null;
    modelo?: string | null;
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
};

function EstatusBadge({ estatus }: { estatus: string }) {
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
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {Icon && <Icon className="w-3 h-3" />}
                {label}
            </div>
            <div className={`text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>
                {value}
            </div>
        </div>
    );
}

export default function FichaTecnicaClient({ activo, distribucion }: { 
    activo: Activo, 
    distribucion?: { idQr: string, serie?: string | null, area: string, stock: number, estatusContable: string }[] 
}) {
    const images = [activo.imagenUrl, activo.imagenPlacaUrl].filter(Boolean) as string[];
    const [imgIdx, setImgIdx] = useState(0);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-start py-8 px-4">

            {/* Lightbox */}
            {lightbox && images.length > 0 && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setLightbox(false)}
                >
                    <button className="absolute top-4 right-4 p-3 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors" onClick={() => setLightbox(false)}>
                        <X className="w-6 h-6" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={images[imgIdx]}
                        alt="Vista ampliada"
                        className="max-h-[90vh] max-w-full object-contain rounded-xl shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    />
                    {images.length > 1 && (
                        <div className="absolute bottom-6 flex gap-2">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/30'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Card */}
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-white">
                    {/* Logo + Brand */}
                    <div className="flex items-center gap-2 mb-6 opacity-80">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Bioelectrónica Honduras</span>
                    </div>

                    {/* ID QR */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="rounded-lg px-2.5 py-1">
                            <span className="text-sm font-mono font-bold tracking-widest text-white">{activo.idQr}</span>
                        </div>
                        <QrCode className="w-4 h-4 text-white/60" />
                    </div>

                    {/* Asset name */}
                    <h1 className="text-2xl font-bold leading-tight mb-3">{activo.descripcionCorta}</h1>

                    {/* Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <EstatusBadge estatus={activo.estatusContable} />
                        {hasDano && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-500/20 text-red-200 border border-red-400/30">
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
                    <div className="relative bg-slate-900 h-56 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={images[imgIdx]}
                            alt={activo.descripcionCorta}
                            className="w-full h-full object-contain cursor-zoom-in"
                            onClick={() => setLightbox(true)}
                        />
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setImgIdx(i => (i + 1) % images.length)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
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
                        <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                            {imgIdx === 0 ? '📷 Foto del activo' : '🏷️ Placa / Número de serie'}
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-6 space-y-6">

                    {/* Descripción detallada */}
                    {activo.descripcionDetallada && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                <FileText className="w-3 h-3" />
                                Descripción Detallada
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{activo.descripcionDetallada}</p>
                        </div>
                    )}

                    {/* Identificación */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-100" />
                            Identificación
                            <div className="h-px flex-1 bg-slate-100" />
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Modelo / Marca" value={activo.modelo} icon={Tag} />
                            <Field label="Número de Serie" value={activo.serie} mono icon={Hash} />
                            {activo.codigoBarras && (
                                <div className="col-span-2">
                                    <Field label="Cód. Barras Fábrica" value={activo.codigoBarras} mono icon={Barcode} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ubicación y Contabilidad */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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
                            {activo.integrado && (
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</div>
                                    <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                                        <Shield className="w-3.5 h-3.5" />
                                        Activo Integrado
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fechas */}
                    {(fecha(activo.fechaAdq) || fecha(activo.fechaLevantamiento)) && (
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <div className="h-px flex-1 bg-slate-100" />
                                Fechas
                                <div className="h-px flex-1 bg-slate-100" />
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Fecha de Adquisición" value={fecha(activo.fechaAdq)} icon={Calendar} />
                                <Field label="Levantamiento" value={fecha(activo.fechaLevantamiento)} icon={Calendar} />
                            </div>
                        </div>
                    )}

                    {/* Estado físico (si aplica) */}
                    {(hasDano || activo.tipoIncidencia || activo.accionRecomendada) && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                            <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Estado / Incidencia Reportada
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {activo.estadoDano && (
                                    <div>
                                        <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-0.5">Estado</div>
                                        <div className="text-sm font-semibold text-red-700">{activo.estadoDano}</div>
                                    </div>
                                )}
                                {activo.tipoIncidencia && (
                                    <div>
                                        <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-0.5">Incidencia</div>
                                        <div className="text-sm font-medium text-red-700">{activo.tipoIncidencia}</div>
                                    </div>
                                )}
                                {activo.accionRecomendada && (
                                    <div className="col-span-2">
                                        <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-0.5">Acción Recomendada</div>
                                        <div className="text-sm font-medium text-red-700">{activo.accionRecomendada}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Distribucion de Inventario Físico */}
                    {distribucion && distribucion.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                            <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" />
                                Existencias Físicas ({distribucion.length > 1 ? 'Múltiples unidades' : 'Unidad única'})
                            </h2>
                            <div className="flex flex-col gap-3">
                                {Object.entries(groupedDistribucion).map(([area, data]: [string, any], i) => (
                                    <div key={i} className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="flex items-center justify-between px-3 py-2 bg-emerald-100/30 border-b border-emerald-100/50">
                                            <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                                                <MapPin className="w-4 h-4 text-emerald-600" />
                                                {area}
                                            </div>
                                            <span className="bg-emerald-100 text-emerald-800 rounded-md px-2 py-0.5 text-xs font-black">
                                                {data.stockTotal} ud.
                                            </span>
                                        </div>
                                        <div className="px-3 py-2 flex flex-col gap-1.5">
                                            {data.items.map((item: any, idx: number) => (
                                                <div key={idx} className={`flex items-center justify-between text-xs font-medium ${item.idQr === activo.idQr ? 'text-blue-600 bg-blue-50 px-2 py-1 -mx-2 rounded' : 'text-slate-600'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <QrCode className="w-3 h-3 opacity-60" />
                                                        <span>{item.idQr}</span>
                                                        {item.idQr === activo.idQr && <span className="bg-blue-200 text-blue-800 text-[9px] uppercase px-1.5 py-0.5 rounded-sm font-bold">Actual</span>}
                                                    </div>
                                                    {item.serie && (
                                                        <div className="flex items-center gap-1 font-mono text-slate-500">
                                                            <Hash className="w-3 h-3" />
                                                            {item.serie}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-emerald-200/50 flex justify-between items-center text-xs font-bold text-emerald-800">
                                <span className="uppercase tracking-widest">Total Global en Institución:</span>
                                <span className="text-sm bg-emerald-600 text-white px-2.5 py-0.5 rounded-md shadow-sm">
                                    {distribucion.reduce((acc, d) => acc + (d.stock || 0), 0)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Observaciones */}
                    {activo.observaciones && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1.5">Observaciones</div>
                            <p className="text-sm text-amber-800 whitespace-pre-wrap">{activo.observaciones}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                        Registrado: {fecha(activo.createdAt)}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                        <Building2 className="w-4 h-4" />
                        bioelectronicahn.com
                    </div>
                </div>
            </div>

            {/* Sub-brand */}
            <p className="mt-6 text-xs text-white/30 text-center">
                Inventario Comercial · Bioelectrónica Honduras
            </p>
        </div>
    );
}
