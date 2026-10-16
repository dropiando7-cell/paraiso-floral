'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Users, Plus, Search, Building2, 
    Mail, Phone, MapPin, 
    Pencil, Trash2, FileBadge,
    User, CreditCard, Clock,
    ChevronLeft, ChevronRight,
    CheckSquare, Square, Check,
    Filter, X, Sparkles, Navigation
} from 'lucide-react';
import { fetchContactos, deleteContacto, fetchVendedores, fetchRutasExistentes, asignarRutaYVendedorMasivo } from './actions';
import ContactoModal, { ClienteFormData, RUTAS_COMERCIALES } from '@/components/contactos/ContactoModal';
export { default as ContactoModal } from '@/components/contactos/ContactoModal';

type Cliente = {
    id: string;
    nombre: string;
    rtn?: string | null;
    email?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    departamento?: string | null;
    nombreContacto?: string | null;
    telefonoContacto?: string | null;
    emailsCC?: string | null;
    limiteCredito?: number | null;
    saldoInicial?: number | null;
    saldoFavor?: number | null;
    diasCredito?: number | null;
    notas?: string | null;
    ruta?: string | null;
    alias?: string | null;
    vendedorId?: string | null;
    vendedor?: {
        id: string;
        nombre: string | null;
        apellido: string | null;
        email: string;
    } | null;
    createdAt: Date;
};

interface ContactosClientProps {
    initialData: Cliente[];
    initialTotalCount?: number;
    initialTotalPages?: number;
    initialVendedores?: any[];
    initialRutas?: string[];
}

export default function ContactosClient({ 
    initialData, 
    initialTotalCount = 0, 
    initialTotalPages = 1,
    initialVendedores = [],
    initialRutas = []
}: ContactosClientProps) {
    const [contactos, setContactos] = useState<Cliente[]>(initialData);
    const [search, setSearch] = useState('');
    const [filtroRuta, setFiltroRuta] = useState<string>('TODOS');
    const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS');
    const [vendedores, setVendedores] = useState<any[]>(initialVendedores);
    const [rutas, setRutas] = useState<string[]>(initialRutas.length > 0 ? initialRutas : RUTAS_COMERCIALES);

    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(initialTotalPages || 1);
    const [totalCount, setTotalCount] = useState(initialTotalCount || initialData.length);

    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [currentContacto, setCurrentContacto] = useState<Partial<ClienteFormData>>({});

    // Selección múltiple para asignación masiva de rutas/vendedores
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkRuta, setBulkRuta] = useState<string>('');
    const [bulkVendedorId, setBulkVendedorId] = useState<string>('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

    const searchParams = useSearchParams();

    // Cargar listas de vendedores y rutas si vienen vacías
    useEffect(() => {
        if (vendedores.length === 0) {
            fetchVendedores().then(setVendedores).catch(console.error);
        }
        if (rutas.length === 0) {
            fetchRutasExistentes().then(setRutas).catch(console.error);
        }
    }, []);

    useEffect(() => {
        const modal = searchParams?.get('modal');
        const nuevo = searchParams?.get('nuevo');
        if (modal === 'nuevo' || nuevo === 'true') {
            setModalMode('create');
            const initialNombre = searchParams?.get('nombre') || '';
            setCurrentContacto({ nombre: initialNombre });
        }
    }, [searchParams]);

    // Recargar con debouncing y filtros
    const loadContactos = async (isManual = false) => {
        setLoading(true);
        try {
            const { params, totalPages: tp, count } = await fetchContactos(
                search, 
                page, 
                filtroRuta, 
                filtroVendedor
            );
            setContactos(params as any);
            setTotalPages(tp);
            setTotalCount(count);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadContactos();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, page, filtroRuta, filtroVendedor]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este contacto de forma permanente?')) return;
        setLoading(true);
        try {
            await deleteContacto(id);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            await loadContactos(true);
        } catch (e) {
            alert('No se pudo eliminar, posiblemente tiene facturas asociadas.');
        } finally {
            setLoading(false);
        }
    };

    // Manejo de Selección Múltiple
    const toggleSelectAllPage = () => {
        const pageIds = contactos.map(c => c.id);
        const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
        
        const next = new Set(selectedIds);
        if (allSelected) {
            pageIds.forEach(id => next.delete(id));
        } else {
            pageIds.forEach(id => next.add(id));
        }
        setSelectedIds(next);
    };

    const toggleSelectClient = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleApplyBulkAssignment = async () => {
        if (selectedIds.size === 0) return;
        if (!bulkRuta && !bulkVendedorId) {
            alert('Selecciona al menos una Ruta o un Vendedor para aplicar.');
            return;
        }

        setIsBulkUpdating(true);
        try {
            const payload: any = {};
            if (bulkRuta) {
                payload.ruta = bulkRuta === 'LIMPIAR_RUTA' ? null : bulkRuta;
            }
            if (bulkVendedorId) {
                payload.vendedorId = bulkVendedorId === 'LIMPIAR_VENDEDOR' ? null : bulkVendedorId;
            }

            await asignarRutaYVendedorMasivo(Array.from(selectedIds), payload);

            setBulkSuccessMsg(`Se asignaron ${selectedIds.size} clientes exitosamente.`);
            setTimeout(() => setBulkSuccessMsg(null), 4000);

            setSelectedIds(new Set());
            setBulkRuta('');
            setBulkVendedorId('');
            await loadContactos(true);
        } catch (e: any) {
            alert('Error en asignación masiva: ' + (e.message || 'Error desconocido'));
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const allPageSelected = contactos.length > 0 && contactos.every(c => selectedIds.has(c.id));

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-[1650px] mx-auto relative min-h-screen space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                        <Building2 className="w-4 h-4" /> Distribuidora Paraíso Floral
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Directorio de Clientes</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Gestión de clientes, rutas comerciales, vendedores asignados y control de crédito para CxC.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => { setCurrentContacto({}); setModalMode('create'); }}
                        className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                    {/* Buscador */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value.toUpperCase()); setPage(1); }}
                            placeholder="Buscar cliente, RTN, ruta, departamento, encargado o teléfono..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 uppercase placeholder:normal-case focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(''); setPage(1); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filtro por Ruta */}
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-[190px]">
                            <select
                                value={filtroRuta}
                                onChange={(e) => { setFiltroRuta(e.target.value); setPage(1); }}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer appearance-none"
                            >
                                <option value="TODOS">📍 Ruta: Todas las Rutas</option>
                                <option value="SIN_RUTA">⚠️ Sin Ruta Asignada</option>
                                {rutas.map(r => (
                                    <option key={r} value={r}>📍 {r}</option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
                        </div>

                        {/* Filtro por Vendedor */}
                        <div className="relative min-w-[210px]">
                            <select
                                value={filtroVendedor}
                                onChange={(e) => { setFiltroVendedor(e.target.value); setPage(1); }}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer appearance-none"
                            >
                                <option value="TODOS">👤 Vendedor: Todos</option>
                                <option value="SIN_VENDEDOR">⚠️ Sin Vendedor Asignado</option>
                                {vendedores.map(v => (
                                    <option key={v.id} value={v.id}>
                                        👤 {v.nombre ? `${v.nombre} ${v.apellido || ''}` : v.email}
                                    </option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
                        </div>

                        <div className="text-xs font-bold text-slate-500 px-2 shrink-0 hidden sm:block">
                            Total: <span className="text-emerald-600 font-black">{totalCount}</span> clientes
                        </div>
                    </div>
                </div>

                {/* Feedback de filtros activos */}
                {(filtroRuta !== 'TODOS' || filtroVendedor !== 'TODOS' || search) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
                        <span className="text-slate-400 font-semibold">Filtros aplicados:</span>
                        {filtroRuta !== 'TODOS' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                                {filtroRuta === 'SIN_RUTA' ? 'Sin Ruta' : filtroRuta}
                                <button onClick={() => setFiltroRuta('TODOS')} className="hover:text-emerald-950 ml-0.5">×</button>
                            </span>
                        )}
                        {filtroVendedor !== 'TODOS' && (
                            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full font-bold">
                                {filtroVendedor === 'SIN_VENDEDOR' 
                                    ? 'Sin Vendedor' 
                                    : (vendedores.find(v => v.id === filtroVendedor)?.nombre || 'Vendedor')}
                                <button onClick={() => setFiltroVendedor('TODOS')} className="hover:text-sky-950 ml-0.5">×</button>
                            </span>
                        )}
                        <button
                            onClick={() => { setSearch(''); setFiltroRuta('TODOS'); setFiltroVendedor('TODOS'); setPage(1); }}
                            className="text-slate-500 hover:text-slate-800 font-bold underline text-[11px] ml-auto"
                        >
                            Limpiar todos los filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Mensaje de éxito de asignación masiva */}
            {bulkSuccessMsg && (
                <div className="p-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>{bulkSuccessMsg}</span>
                    </div>
                    <button onClick={() => setBulkSuccessMsg(null)} className="text-white/80 hover:text-white">✕</button>
                </div>
            )}

            {/* BARRA DE ASIGNACIÓN MASIVA (Aparece cuando hay clientes seleccionados) */}
            {selectedIds.size > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-500/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-black text-sm">
                                {selectedIds.size} cliente{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
                            </div>
                            <div className="text-[11px] text-slate-300">
                                Asigna ruta o vendedor a todos los clientes seleccionados a la vez
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Selector de Ruta Masiva */}
                        <select
                            value={bulkRuta}
                            onChange={(e) => setBulkRuta(e.target.value)}
                            className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-xs font-bold text-white focus:bg-slate-900 focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
                        >
                            <option value="" className="text-slate-900">-- Asignar Ruta --</option>
                            {rutas.map(r => (
                                <option key={r} value={r} className="text-slate-900">📍 {r}</option>
                            ))}
                            <option value="LIMPIAR_RUTA" className="text-rose-600 font-bold">🚫 Quitar Ruta (Dejar vacío)</option>
                        </select>

                        {/* Selector de Vendedor Masivo */}
                        <select
                            value={bulkVendedorId}
                            onChange={(e) => setBulkVendedorId(e.target.value)}
                            className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-xs font-bold text-white focus:bg-slate-900 focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
                        >
                            <option value="" className="text-slate-900">-- Asignar Vendedor --</option>
                            {vendedores.map(v => (
                                <option key={v.id} value={v.id} className="text-slate-900">
                                    👤 {v.nombre ? `${v.nombre} ${v.apellido || ''}` : v.email}
                                </option>
                            ))}
                            <option value="LIMPIAR_VENDEDOR" className="text-rose-600 font-bold">🚫 Quitar Vendedor (Dejar vacío)</option>
                        </select>

                        <button
                            onClick={handleApplyBulkAssignment}
                            disabled={isBulkUpdating || (!bulkRuta && !bulkVendedorId)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                            {isBulkUpdating ? 'Aplicando...' : 'Aplicar en Lote'}
                        </button>

                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            Deseleccionar
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla de Clientes */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                                <th className="py-4 pl-6 pr-2 w-10 text-center">
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllPage}
                                        title={allPageSelected ? 'Deseleccionar todos' : 'Seleccionar página'}
                                        className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                                    >
                                        {allPageSelected ? (
                                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                    </button>
                                </th>
                                <th className="py-4 px-4">Cliente / Empresa</th>
                                <th className="py-4 px-4">Ruta & Vendedor</th>
                                <th className="py-4 px-4">Contacto Directo</th>
                                <th className="py-4 px-4">RTN & Depto</th>
                                <th className="py-4 px-4">Condición Crédito</th>
                                <th className="py-4 px-6 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-semibold">
                                        Cargando directorio de clientes...
                                    </td>
                                </tr>
                            ) : contactos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        No se encontraron contactos para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                contactos.map(c => {
                                    const isSelected = selectedIds.has(c.id);
                                    return (
                                        <tr 
                                            key={c.id} 
                                            className={`transition-colors group ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/60'}`}
                                        >
                                            {/* Checkbox de selección */}
                                            <td className="py-4 pl-6 pr-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSelectClient(c.id)}
                                                    className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                                    )}
                                                </button>
                                            </td>

                                            {/* Columna Cliente */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black shrink-0">
                                                        {c.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">{c.nombre}</div>
                                                        {c.alias && (
                                                            <div className="mt-0.5">
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-md shadow-2xs">
                                                                    🏷️ Alias: {c.alias}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {c.direccion && (
                                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                                <span className="truncate max-w-[220px]" title={c.direccion}>{c.direccion}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Columna RUTA & VENDEDOR */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {/* Badge de Ruta */}
                                                    {c.ruta ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2.5 py-0.5 rounded-lg shadow-2xs">
                                                            <Navigation className="w-3 h-3 text-emerald-600 shrink-0" />
                                                            <span>{c.ruta}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100/70 border border-dashed border-slate-300 px-2 py-0.5 rounded-md">
                                                            Sin Ruta
                                                        </span>
                                                    )}

                                                    {/* Badge de Vendedor */}
                                                    {c.vendedor ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200/90 px-2.5 py-0.5 rounded-lg shadow-2xs">
                                                            <User className="w-3 h-3 text-sky-600 shrink-0" />
                                                            <span>
                                                                {c.vendedor.nombre 
                                                                    ? `${c.vendedor.nombre} ${c.vendedor.apellido || ''}` 
                                                                    : c.vendedor.email}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100/70 border border-dashed border-slate-300 px-2 py-0.5 rounded-md">
                                                            Sin Vendedor
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Columna Contacto Directo */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1 font-medium text-slate-600">
                                                    {c.nombreContacto && (
                                                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                                            <User className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>{c.nombreContacto}</span>
                                                        </div>
                                                    )}
                                                    {c.telefono && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{c.telefono}</span>
                                                        </div>
                                                    )}
                                                    {c.email && (
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{c.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Columna RTN & Depto */}
                                            <td className="px-4 py-4 space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <FileBadge className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-mono font-bold text-slate-700">{c.rtn || 'Consumidor Final'}</span>
                                                </div>
                                                {c.departamento && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                        <MapPin className="w-3 h-3 text-slate-500" />
                                                        {c.departamento}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Columna Condición Crédito */}
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-slate-900 font-black">
                                                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>L. {(c.limiteCredito || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span>{c.diasCredito || 15} Días Plazo</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => { setCurrentContacto(c); setModalMode('edit'); }}
                                                        className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer"
                                                        title="Editar Cliente"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(c.id)}
                                                        className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors cursor-pointer"
                                                        title="Eliminar Cliente"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modern Pagination */}
                {totalCount > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                            Mostrando <span className="font-bold text-slate-900">{totalCount > 0 ? (page - 1) * 10 + 1 : 0}</span> a <span className="font-bold text-slate-900">{Math.min(page * 10, totalCount)}</span> de <span className="font-bold text-emerald-700">{totalCount}</span> clientes
                        </span>
                        
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                <button
                                    disabled={page === 1 || loading}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>Anterior</span>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                                    .map((p, idx, arr) => {
                                        const prev = arr[idx - 1];
                                        return (
                                            <React.Fragment key={p}>
                                                {prev && p - prev > 1 && (
                                                    <span className="px-1.5 text-xs text-slate-400 font-bold">...</span>
                                                )}
                                                <button
                                                    onClick={() => setPage(p)}
                                                    disabled={loading}
                                                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                        page === p
                                                            ? 'bg-emerald-600 text-white shadow-sm font-black'
                                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}

                                <button
                                    disabled={page === totalPages || totalPages === 0 || loading}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Siguiente</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Crear/Editar Reutilizable */}
            <ContactoModal
                open={!!modalMode}
                onClose={() => setModalMode(null)}
                initialContacto={currentContacto}
                onSuccess={async () => {
                    await loadContactos(true);
                }}
            />
        </div>
    );
}
