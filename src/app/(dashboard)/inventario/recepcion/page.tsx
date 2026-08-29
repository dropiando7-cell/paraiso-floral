import React from 'react';
import Link from 'next/link';
import { getLotesRecepcion } from './actions';
import { Package, Truck, ChevronRight, ArrowLeft, Layers } from 'lucide-react';

import SubirPackingModal from './SubirPackingModal';

export const revalidate = 0;

export default async function RecepcionPage() {
    const res = await getLotesRecepcion();
    const lotes = res.success ? (res.lotes || []) : [];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/inventario" className="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors shadow-xs">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <Truck className="w-8 h-8 text-emerald-600" />
                            Recepción de Lotes / Packing Lists
                        </h1>
                    </div>
                    <p className="text-slate-500 text-sm pl-12">
                        Control digital y checklist de mercadería en tránsito y cajas recibidas en bodega.
                    </p>
                </div>

                {/* Botón IA Subir Nuevo Packing List (PDF / Foto Mano) */}
                <div>
                    <SubirPackingModal />
                </div>
            </div>

            {/* Listado de Lotes */}
            <div className="max-w-7xl mx-auto space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Lotes Registrados en Sistema ({lotes.length})
                </h2>

                {lotes.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
                        <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="font-semibold text-slate-700">No hay packing lists o lotes registrados en tránsito.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lotes.map((lote: any) => {
                            const estaCompletado = lote.estado === 'COMPLETADO';

                            return (
                                <Link
                                    key={lote.id}
                                    href={`/inventario/recepcion/${lote.id}`}
                                    className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-xs hover:shadow-md group"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold font-mono bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-200">
                                                    ENVÍO #{lote.numeroEnvio}
                                                </span>
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                                    estaCompletado
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {estaCompletado ? 'COMPLETADO' : 'EN TRÁNSITO / RECEPCIÓN'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mt-1.5 group-hover:text-emerald-600 transition-colors">
                                                {lote.proveedor}
                                            </h3>
                                        </div>

                                        <div className="p-2.5 bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white rounded-xl text-slate-500 transition-colors">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs">
                                        <div>
                                            <div className="text-slate-400 font-medium">Total Cajas</div>
                                            <div className="font-bold text-slate-800 text-sm">{lote.totalCajas} Cajas</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 font-medium">Total Bonches</div>
                                            <div className="font-bold text-slate-800 text-sm">{lote.totalBonches} Bonches</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 font-medium">Verificadas</div>
                                            <div className="font-bold text-emerald-600 text-sm">{lote.cajasVerificadas} / {lote.totalCajas}</div>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
                                        <span>Progreso Checklist: <strong className="text-slate-800 font-bold">{lote.porcentaje}%</strong></span>
                                        <span>{new Date(lote.createdAt).toLocaleDateString('es-HN')}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
                                        <div 
                                            className="bg-emerald-600 h-full rounded-full transition-all"
                                            style={{ width: `${lote.porcentaje}%` }}
                                        />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
