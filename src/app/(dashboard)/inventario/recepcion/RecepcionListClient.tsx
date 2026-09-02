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
import { formatNombreProductoRecepcion, matchProductoRecepcion } from '@/utils/recepcionHelpers';

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
    productosLista?: string[];
}

export default function RecepcionListClient({ lotes }: { lotes: LoteItem[] }) {
    const [tabActiva, setTabActiva] = useState<'pendientes' | 'revisados' | 'ingresados'>('pendientes');
    const [busqueda, setBusqueda] = useState<string>('');

    // 1. En Tránsito / Pendientes: Lotes no completados y con checklist incompleto (< 100%)
    const lotesPendientes = lotes.filter(l => 
        l.estado !== 'COMPLETADO' && l.estado !== 'INGRESADO_CEDI' && l.porcentaje < 100
    );

    // 2. Revisados / Listos para Cargar: Checklist al 100% verificado, pero AÚN no ingresado al CEDI
    const lotesRevisados = lotes.filter(l => 
        (l.estado !== 'COMPLETADO' && l.estado !== 'INGRESADO_CEDI') && l.porcentaje === 100
    );

    // 3. Ingresados al CEDI: Ya se presionó "PROCESAR Y CARGAR STOCK" (Estado COMPLETADO en BD)
    const lotesIngresados = lotes.filter(l => 
        l.estado === 'COMPLETADO' || l.estado === 'INGRESADO_CEDI'
    );

    // Búsqueda global en TODOS los proveedores y lotes cuando hay un término de búsqueda
    const estaBuscando = busqueda.trim().length > 0;

    const listadoFiltradoGlobal = lotes.filter(l => {
        if (!estaBuscando) return true;
        const q = busqueda.toLowerCase().trim();
        const coincideEnvio = l.numeroEnvio.toLowerCase().includes(q);
        const coincideProveedor = l.proveedor.toLowerCase().includes(q);
        const coincideProducto = (l.productosLista || []).some(prod => matchProductoRecepcion(prod, q));

        return coincideEnvio || coincideProveedor || coincideProducto;
    });

    // Listado actual según pestaña activa o búsqueda global
    const listadoActual = estaBuscando 
        ? listadoFiltradoGlobal 
        : (tabActiva === 'pendientes' 
            ? lotesPendientes 
            : (tabActiva === 'revisados' ? lotesRevisados : lotesIngresados));

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
                        Control digital y checklist de mercadería en tránsito, revisión física y stock ingresado al CEDI.
                    </p>
                </div>

                {/* Botón IA Subir Nuevo Packing List (PDF / Foto Mano) */}
                <div>
                    <SubirPackingModal />
                </div>
            </div>

            {/* Pestañas de Filtrado + Buscador */}
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
                    {/* Tabs Selector: 3 Pestañas */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                        <button
                            onClick={() => setTabActiva('pendientes')}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-extrabold transition-all cursor-pointer shrink-0 ${
                                tabActiva === 'pendientes'
                                    ? 'bg-white text-amber-800 shadow-xs ring-1 ring-slate-200/50'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Truck className="w-4 h-4 text-amber-600" />
                            <span>1. En Tránsito / Pendientes</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tabActiva === 'pendientes' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {lotesPendientes.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setTabActiva('revisados')}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-extrabold transition-all cursor-pointer shrink-0 ${
                                tabActiva === 'revisados'
                                    ? 'bg-white text-indigo-800 shadow-xs ring-1 ring-slate-200/50'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            <span>2. Revisados (Listos para Cargar)</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tabActiva === 'revisados' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {lotesRevisados.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setTabActiva('ingresados')}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-extrabold transition-all cursor-pointer shrink-0 ${
                                tabActiva === 'ingresados'
                                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/50'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <span>3. Ingresados al CEDI</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                tabActiva === 'ingresados' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {lotesIngresados.length}
                            </span>
                        </button>
                    </div>

                    {/* Buscador de Lote por Envio, Proveedor o Producto */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por envío #, proveedor o producto..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                            ? `Mercadería en Tránsito / Pendiente de Check (${listadoActual.length})` 
                            : tabActiva === 'revisados'
                            ? `Packing Lists Revisados al 100% • Pendientes de Cargar Stock (${listadoActual.length})`
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
                                ? 'No hay lotes pendientes de revisión en este momento.'
                                : tabActiva === 'revisados'
                                ? 'No hay lotes en espera de cargar stock. Todos los revisados ya han sido ingresados al CEDI.'
                                : 'Aún no hay lotes archivados en el historial de Ingresados al CEDI.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listadoActual.map((lote) => {
                            const esIngresado = lote.estado === 'COMPLETADO' || lote.estado === 'INGRESADO_CEDI';
                            const esRevisadoListo = !esIngresado && lote.porcentaje === 100;
                            const fechaObj = new Date(lote.createdAt);
                            const fechaLegible = fechaObj.toLocaleDateString('es-HN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            });

                            return (
                                <Link
                                    key={lote.id}
                                    href={`/inventario/recepcion/${lote.id}`}
                                    className={`bg-white border rounded-2xl p-5 transition-all shadow-xs hover:shadow-md group flex flex-col justify-between ${
                                        esIngresado 
                                            ? 'border-slate-200 hover:border-emerald-500/50' 
                                            : esRevisadoListo
                                            ? 'border-indigo-300 hover:border-indigo-500 ring-2 ring-indigo-500/10'
                                            : 'border-amber-200 hover:border-amber-400 ring-1 ring-amber-500/10'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                    <span className="text-xs font-black font-mono bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                                        ENVÍO #{lote.numeroEnvio}
                                                    </span>

                                                    {/* Badge de Estado del Ciclo de Vida */}
                                                    {esIngresado ? (
                                                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            INGRESADO AL CEDI
                                                        </span>
                                                    ) : esRevisadoListo ? (
                                                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-200 flex items-center gap-1.5 animate-pulse">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                                            REVISADO 100% • LISTO PARA CARGAR
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                            EN TRÁNSITO / RECEPCIÓN ({lote.porcentaje}%)
                                                        </span>
                                                    )}

                                                    {/* Badge Fecha de Recepción / Subida */}
                                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        {fechaLegible}
                                                    </span>
                                                </div>

                                                <div className="mt-1">
                                                    <ProveedorLogo nombre={lote.proveedor} size="md" />
                                                </div>

                                                {/* Coincidencias de Productos Encontrados / Lista de Flores */}
                                                {lote.productosLista && lote.productosLista.length > 0 && (
                                                    <div className="mt-2.5 flex flex-wrap items-center gap-1">
                                                        {lote.productosLista
                                                            .filter(p => busqueda.trim() ? matchProductoRecepcion(p, busqueda) : true)
                                                            .slice(0, 4)
                                                            .map((prodMatch, idx) => (
                                                                <span key={idx} className="bg-emerald-50/90 text-emerald-900 border border-emerald-200 text-[11px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    <Package className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                    {formatNombreProductoRecepcion(prodMatch)}
                                                                </span>
                                                            ))}
                                                        {lote.productosLista.filter(p => busqueda.trim() ? matchProductoRecepcion(p, busqueda) : true).length > 4 && (
                                                            <span className="text-[10px] text-slate-400 font-bold px-1">
                                                                +{lote.productosLista.filter(p => busqueda.trim() ? matchProductoRecepcion(p, busqueda) : true).length - 4} más
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                                                esIngresado 
                                                    ? 'bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-500' 
                                                    : esRevisadoListo
                                                    ? 'bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700'
                                                    : 'bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-700'
                                            }`}>
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
                                                <div className={`font-bold text-sm ${esRevisadoListo || esIngresado ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    {lote.cajasVerificadas} / {lote.totalCajas}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar & Footer */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                                            <span className="font-bold text-slate-700">
                                                Progreso Checklist: <strong className={`font-black text-sm ${esIngresado || esRevisadoListo ? 'text-emerald-700' : 'text-amber-700'}`}>{lote.porcentaje}%</strong>
                                            </span>
                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
                                                esIngresado 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : esRevisadoListo 
                                                    ? 'bg-indigo-100 text-indigo-800' 
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {esIngresado ? 'Cargado en CEDI' : esRevisadoListo ? 'Listo para Cargar' : 'En Verificación'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    esIngresado 
                                                        ? 'bg-emerald-600' 
                                                        : esRevisadoListo 
                                                        ? 'bg-indigo-600' 
                                                        : 'bg-amber-500'
                                                }`}
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
