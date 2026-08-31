'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    Package, 
    Truck, 
    ChevronRight, 
    ArrowLeft, 
    Layers, 
    CheckCircle2, 
    Clock, 
    Search,
    X,
    Building2,
    Calendar
} from 'lucide-react';
import SubirPackingModal from './SubirPackingModal';
import { ProveedorLogo } from '@/components/inventario/ProveedorLogo';

interface LoteItem {
    id: string;
    numeroEnvio: string;
    proveedor: string;
    estado: string;
    totalCajas: number;
    totalBonches: number;
    cajasVerificadas: number;
    porcentaje: number;
    createdAt: string;
}

export default function RecepcionListClient({ lotes }: { lotes: LoteItem[] }) {
    const [tabActiva, setTabActiva] = useState<'pendientes' | 'ingresados'>('pendientes');
    const [busqueda, setBusqueda] = useState<string>('');

    // Clasificar lotes por estado: pendientes vs ingresados al CEDI
    const lotesPendientes = lotes.filter(l => 
        l.estado !== 'COMPLETADO' && l.estado !== 'INGRESADO_CEDI' && l.porcentaje < 100
    );

    const lotesIngresados = lotes.filter(l => 
        l.estado === 'COMPLETADO' || l.estado === 'INGRESADO_CEDI' || l.porcentaje === 100
    );

    // Filtrar según el tab activo y el término de búsqueda
    const listadoActual = (tabActiva === 'pendientes' ? lotesPendientes : lotesIngresados).filter(l => {
        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase().trim();
        return (
            l.numeroEnvio.toLowerCase().includes(q) ||
            l.proveedor.toLowerCase().includes(q)
        );
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
            {/* Top Bar Header */}
            <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
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
                        Control digital y checklist de mercadería en tránsito y cajas ingresadas al CEDI.
                    </p>
                </div>

                {/* Botón IA Subir Nuevo Packing List (PDF / Foto Mano) */}
                <div>
                    <SubirPackingModal />
                </div>
            </div>

            {/* Pestañas de Filtrado + Buscador */}
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
                    {/* Tabs Selector */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button
                            onClick={() => setTabActiva('pendientes')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-extrabold transition-all cursor-pointer ${
                                tabActiva === 'pendientes'
                                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/50'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Truck className="w-4 h-4 text-emerald-600" />
                            <span>En Tránsito / Pendientes</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tabActiva === 'pendientes' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {lotesPendientes.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setTabActiva('ingresados')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-extrabold transition-all cursor-pointer ${
                                tabActiva === 'ingresados'
                                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/50'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <span>Ingresados al CEDI</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tabActiva === 'ingresados' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {lotesIngresados.length}
                            </span>
                        </button>
                    </div>

                    {/* Buscador de Lote por Envio o Proveedor */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por envío # o proveedor..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Subtítulo informativo */}
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        {tabActiva === 'pendientes' 
                            ? `Mercadería en Tránsito Lista para Check (${listadoActual.length})` 
                            : `Lotes Históricos Ingresados al CEDI (${listadoActual.length})`}
                    </h2>
                </div>

                {/* Grid de Tarjetas */}
                {listadoActual.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
                        <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="font-semibold text-slate-700 text-sm md:text-base">
                            {busqueda
                                ? `No se encontraron lotes que coincidan con "${busqueda}".`
                                : tabActiva === 'pendientes'
                                ? '¡Excelente! No hay lotes pendientes de recepción en este momento.'
                                : 'Aún no hay lotes archivados en el historial de Ingresados al CEDI.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listadoActual.map((lote) => {
                            const esIngresado = lote.estado === 'COMPLETADO' || lote.estado === 'INGRESADO_CEDI' || lote.porcentaje === 100;

                            return (
                                <Link
                                    key={lote.id}
                                    href={`/inventario/recepcion/${lote.id}`}
                                    className={`bg-white border rounded-2xl p-5 transition-all shadow-xs hover:shadow-md group flex flex-col justify-between ${
                                        esIngresado 
                                            ? 'border-slate-200 hover:border-emerald-500/50' 
                                            : 'border-emerald-200 hover:border-emerald-500 ring-1 ring-emerald-500/10'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black font-mono bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                                        ENVÍO #{lote.numeroEnvio}
                                                    </span>
                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                                                        esIngresado
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {esIngresado ? (
                                                            <>
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                INGRESADO AL CEDI
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                EN TRÁNSITO / RECEPCIÓN
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="mt-2.5">
                                                    <ProveedorLogo nombre={lote.proveedor} size="md" />
                                                </div>
                                            </div>

                                            <div className="p-2.5 bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white rounded-xl text-slate-500 transition-colors shrink-0">
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
                                                <div className="font-bold text-emerald-700 text-sm">{lote.cajasVerificadas} / {lote.totalCajas}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                                            <span className="font-bold text-slate-700">
                                                Progreso Checklist: <strong className="text-emerald-700 font-black text-sm">{lote.porcentaje}%</strong>
                                            </span>
                                            <span className="flex items-center gap-1 text-slate-400">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(lote.createdAt).toLocaleDateString('es-HN')}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
                                            <div 
                                                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${lote.porcentaje}%` }}
                                            />
                                        </div>
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
