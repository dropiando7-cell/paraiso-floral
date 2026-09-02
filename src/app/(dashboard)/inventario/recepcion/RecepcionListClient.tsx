'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    Calendar,
    CheckSquare,
    Square,
    Sparkles,
    Loader2,
    AlertCircle,
    FileSpreadsheet,
    Layers2
} from 'lucide-react';
import SubirPackingModal from './SubirPackingModal';
import { ProveedorLogo } from '@/components/inventario/ProveedorLogo';
import { formatNombreProductoRecepcion, matchProductoRecepcion } from '@/utils/recepcionHelpers';
import { finalizarRecepcionLotesMasivo } from './actions';
import { playSuccessChime } from '@/utils/audioAlerts';

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
    const router = useRouter();
    const [tabActiva, setTabActiva] = useState<'pendientes' | 'revisados' | 'ingresados'>('pendientes');
    const [busqueda, setBusqueda] = useState<string>('');
    
    // Estado de selección masiva para pestaña Revisados
    const [seleccionados, setSeleccionados] = useState<string[]>([]);
    const [mostrarModalConfirmarMasivo, setMostrarModalConfirmarMasivo] = useState(false);
    const [mensajeFeedback, setMensajeFeedback] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
    const [isPendingMasivo, startTransitionMasivo] = useTransition();

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

    // Cálculos de selección en pestaña revisados
    const todosRevisadosSeleccionados = lotesRevisados.length > 0 && seleccionados.length === lotesRevisados.length;
    const lotesSeleccionadosObj = lotesRevisados.filter(l => seleccionados.includes(l.id));
    const totalCajasSeleccionadas = lotesSeleccionadosObj.reduce((sum, l) => sum + (l.totalCajas || 0), 0);
    const totalBonchesSeleccionados = lotesSeleccionadosObj.reduce((sum, l) => sum + (l.totalBonches || 0), 0);

    // Toggle individual de selección
    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setSeleccionados(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Toggle seleccionar todos en Revisados
    const handleToggleSelectAll = () => {
        if (todosRevisadosSeleccionados) {
            setSeleccionados([]);
        } else {
            setSeleccionados(lotesRevisados.map(l => l.id));
        }
    };

    // Ejecutar la carga masiva confirmada
    const handleConfirmarCargaMasiva = () => {
        const idsAProcesar = seleccionados.length > 0 ? seleccionados : lotesRevisados.map(l => l.id);
        if (idsAProcesar.length === 0) return;

        startTransitionMasivo(async () => {
            const res = await finalizarRecepcionLotesMasivo(idsAProcesar);
            if (res.success) {
                playSuccessChime();
                setMensajeFeedback({
                    tipo: 'exito',
                    texto: `¡Éxito! Se cargaron ${res.count} packing list(s) con ${res.totalBonches?.toLocaleString()} bonches directamente al stock del CEDI.`
                });
                setSeleccionados([]);
                setMostrarModalConfirmarMasivo(false);
                router.refresh();
            } else {
                setMensajeFeedback({
                    tipo: 'error',
                    texto: res.error || 'Error al procesar la carga masiva.'
                });
            }
        });
    };

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

            {/* Mensajes de Alerta/Feedback */}
            {mensajeFeedback && (
                <div className={`max-w-7xl mx-auto mb-4 p-3.5 md:p-4 rounded-xl md:rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
                    mensajeFeedback.tipo === 'exito' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    <div className="flex items-center gap-2.5">
                        {mensajeFeedback.tipo === 'exito' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <span className="text-xs md:text-sm font-bold">{mensajeFeedback.texto}</span>
                    </div>
                    <button 
                        onClick={() => setMensajeFeedback(null)} 
                        className="text-xs opacity-60 hover:opacity-100 p-1 font-bold cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            )}

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

                {/* Banner de Acción Masiva / Seleccionar Todo en pestaña 'revisados' */}
                {tabActiva === 'revisados' && lotesRevisados.length > 0 && !estaBuscando && (
                    <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleToggleSelectAll}
                                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl border border-white/20 transition-all font-bold text-xs sm:text-sm cursor-pointer select-none"
                            >
                                {todosRevisadosSeleccionados ? (
                                    <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                                ) : (
                                    <Square className="w-5 h-5 text-slate-300 shrink-0" />
                                )}
                                <span>
                                    {todosRevisadosSeleccionados
                                        ? 'Deseleccionar Todos'
                                        : `Seleccionar Todos (${lotesRevisados.length})`}
                                </span>
                            </button>

                            <div>
                                <div className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                                    <span className="bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">
                                        {seleccionados.length > 0 ? seleccionados.length : '0'}
                                    </span>
                                    <span>de {lotesRevisados.length} packing lists seleccionados</span>
                                </div>
                                {seleccionados.length > 0 && (
                                    <div className="text-indigo-200 text-[11px] sm:text-xs font-semibold mt-0.5">
                                        Total a ingresar: <strong>{totalCajasSeleccionadas} Cajas</strong> • <strong>{totalBonchesSeleccionados.toLocaleString()} Bonches</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    if (seleccionados.length === 0) {
                                        setSeleccionados(lotesRevisados.map(l => l.id));
                                    }
                                    setMostrarModalConfirmarMasivo(true);
                                }}
                                disabled={isPendingMasivo || lotesRevisados.length === 0}
                                className={`w-full md:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-95 cursor-pointer ${
                                    seleccionados.length > 0
                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-400/30'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/20'
                                }`}
                            >
                                <Sparkles className="w-4 h-4 text-emerald-100" />
                                <span>
                                    {seleccionados.length > 0
                                        ? `⚡ CARGAR ${seleccionados.length} SELECCIONADO(S) AL CEDI`
                                        : `⚡ CARGAR TODOS (${lotesRevisados.length}) AL CEDI`}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Subtítulo informativo */}
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        {tabActiva === 'pendientes' 
                            ? `Mercadería en Tránsito / Pendiente de Check (${listadoActual.length})` 
                            : tabActiva === 'revisados'
                            ? `Packing Lists Revisados al 100% • Listos para Cargar Stock (${listadoActual.length})`
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
                            const estaSeleccionado = seleccionados.includes(lote.id);

                            const fechaObj = new Date(lote.createdAt);
                            const fechaLegible = fechaObj.toLocaleDateString('es-HN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            });

                            return (
                                <div
                                    key={lote.id}
                                    className={`relative bg-white border rounded-2xl p-5 transition-all shadow-xs hover:shadow-md group flex flex-col justify-between ${
                                        esIngresado 
                                            ? 'border-slate-200 hover:border-emerald-500/50' 
                                            : estaSeleccionado
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20'
                                            : esRevisadoListo
                                            ? 'border-indigo-300 hover:border-indigo-500 ring-1 ring-indigo-500/10'
                                            : 'border-amber-200 hover:border-amber-400 ring-1 ring-amber-500/10'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                    {/* Checkbox de Selección en pestaña Revisados */}
                                                    {tabActiva === 'revisados' && esRevisadoListo && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => toggleSelect(lote.id, e)}
                                                            className="p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer text-indigo-600"
                                                            title={estaSeleccionado ? "Deseleccionar" : "Seleccionar para cargar"}
                                                        >
                                                            {estaSeleccionado ? (
                                                                <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-slate-400 hover:text-slate-600 shrink-0" />
                                                            )}
                                                        </button>
                                                    )}

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
                                                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-200 flex items-center gap-1.5">
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

                                            <Link
                                                href={`/inventario/recepcion/${lote.id}`}
                                                className={`p-2.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
                                                    esIngresado 
                                                        ? 'bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-500' 
                                                        : esRevisadoListo
                                                        ? 'bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700'
                                                        : 'bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-700'
                                                }`}
                                                title="Entrar a ver checklist"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </Link>
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
                                            <Link
                                                href={`/inventario/recepcion/${lote.id}`}
                                                className={`text-[11px] font-black px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                                    esIngresado 
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                                        : esRevisadoListo 
                                                        ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' 
                                                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                                }`}
                                            >
                                                {esIngresado ? 'Cargado en CEDI' : esRevisadoListo ? 'Listo para Cargar →' : 'En Verificación →'}
                                            </Link>
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
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Confirmación de Carga Masiva al CEDI */}
            {mostrarModalConfirmarMasivo && (() => {
                const idsAProcesar = seleccionados.length > 0 ? seleccionados : lotesRevisados.map(l => l.id);
                const lotesAProcesar = lotesRevisados.filter(l => idsAProcesar.includes(l.id));
                const totalCajas = lotesAProcesar.reduce((sum, l) => sum + (l.totalCajas || 0), 0);
                const totalBonches = lotesAProcesar.reduce((sum, l) => sum + (l.totalBonches || 0), 0);

                return (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                        <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-5 sm:p-7 text-slate-800 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                                        <Sparkles className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-900">
                                            Confirmar Carga de Stock al CEDI
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                            Se ingresarán al inventario general los {lotesAProcesar.length} packing lists seleccionados.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMostrarModalConfirmarMasivo(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Resumen Totales Card */}
                            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                <div>
                                    <div className="text-slate-400 text-xs font-bold uppercase">Packing Lists</div>
                                    <div className="text-xl sm:text-2xl font-black text-slate-900">{lotesAProcesar.length}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-xs font-bold uppercase">Total Cajas</div>
                                    <div className="text-xl sm:text-2xl font-black text-indigo-700">{totalCajas}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-xs font-bold uppercase">Total Bonches</div>
                                    <div className="text-xl sm:text-2xl font-black text-emerald-700">{totalBonches.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Lista de Envíos a Procesar */}
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                    Envíos que se abonarán al inventario:
                                </div>
                                {lotesAProcesar.map((lote) => (
                                    <div key={lote.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm">
                                        <div className="flex items-center gap-2.5">
                                            <span className="font-mono font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded border">
                                                #{lote.numeroEnvio}
                                            </span>
                                            <span className="font-bold text-slate-700">{lote.proveedor}</span>
                                        </div>
                                        <div className="text-slate-500 font-semibold text-xs">
                                            {lote.totalCajas} cajas • <strong className="text-emerald-700">{lote.totalBonches} bonches</strong>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Warning Note */}
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                    Al confirmar, se incrementará el stock disponible en bodega y cada lote pasará a la pestaña <strong>Ingresados al CEDI</strong> con bloqueo anti-duplicados.
                                </span>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setMostrarModalConfirmarMasivo(false)}
                                    disabled={isPendingMasivo}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmarCargaMasiva}
                                    disabled={isPendingMasivo}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                                >
                                    {isPendingMasivo ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>PROCESANDO CARGA...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>CONFIRMAR E INGRESAR AL CEDI</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
