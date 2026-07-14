'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Wrench, Plus, MoveRight, Receipt, 
    CheckCircle2, QrCode, Phone, Clock, AlertTriangle, MonitorSmartphone,
    Trash2, AlertCircle, Search
} from 'lucide-react';
import { eliminarOrdenTrabajo } from './actions';
import { toast } from 'react-hot-toast';

type Orden = any; // Tipado parcial

const COLUMNAS = [
    { id: 'RECIBIDO', title: 'Recibidos', color: 'border-slate-500', bg: 'bg-slate-50 text-slate-700' },
    { id: 'EN_EVALUACION', title: 'En Evaluación', color: 'border-yellow-500', bg: 'bg-yellow-50 text-yellow-700' },
    { id: 'ESPERANDO_APROBACION', title: 'Presupuesto', color: 'border-orange-500', bg: 'bg-orange-50 text-orange-700' },
    { id: 'APROBACION_PRESUPUESTO', title: 'Aprobación Cliente', color: 'border-pink-500', bg: 'bg-pink-50 text-pink-700' },
    { id: 'REPARACION', title: 'En Reparación', color: 'border-blue-500', bg: 'bg-blue-50 text-blue-700' },
    { id: 'LISTO_ENTREGA', title: 'Reparado / Listo', color: 'border-green-500', bg: 'bg-green-50 text-green-700' },
];

export default function SoporteClient({ 
    initialData,
    deliveredData = [],
    userRole = 'USER',
    customRoleName = '',
    accessibleModules = []
}: { 
    initialData: Orden[],
    deliveredData?: Orden[],
    userRole?: string,
    customRoleName?: string,
    accessibleModules?: string[]
}) {
    const router = useRouter();
    const [ordenes, setOrdenes] = useState<Orden[]>(initialData);
    const [entregadas, setEntregadas] = useState<Orden[]>(deliveredData);
    const [activeView, setActiveView] = useState<'taller' | 'historial'>('taller');
    const [searchQuery, setSearchQuery] = useState('');

    const filterBySearch = (list: Orden[]) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase().trim();
        return list.filter(o => 
            o.codigoSeguridad?.toLowerCase().includes(q) ||
            o.equipoDano?.toLowerCase().includes(q) ||
            o.cliente?.nombre?.toLowerCase().includes(q) ||
            o.cliente?.telefono?.toLowerCase().includes(q) ||
            o.serie?.toLowerCase().includes(q) ||
            o.diagnosticoTecnico?.toLowerCase().includes(q)
        );
    };

    const activeFiltered = filterBySearch(ordenes);
    const deliveredFiltered = filterBySearch(entregadas);

    const role = userRole;
    const cRole = customRoleName?.toUpperCase() || '';
    const canDeleteOrder = role === 'SUPER_ADMIN' || accessibleModules.includes('eliminar_ordenes');

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        confirmText: string;
        cancelText: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        description: '',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        onConfirm: () => {},
        type: 'info'
    });

    const [loading, setLoading] = useState(false);

    const showConfirm = (options: {
        title: string;
        description: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }) => {
        setConfirmModal({
            isOpen: true,
            title: options.title,
            description: options.description,
            confirmText: options.confirmText || 'Confirmar',
            cancelText: options.cancelText || 'Cancelar',
            onConfirm: options.onConfirm,
            type: options.type || 'info'
        });
    };

    const handleEliminarOrden = (ordenId: string, codigoSeguridad: string) => {
        showConfirm({
            title: '¿Eliminar orden permanentemente?',
            description: `¿Estás absolutamente seguro de que deseas ELIMINAR permanentemente la orden de trabajo #${codigoSeguridad}? Esta acción borrará la orden, todos sus repuestos, las tareas/comentarios en Kanban y el presupuesto generado, y NO se puede deshacer.`,
            confirmText: 'Sí, Eliminar permanentemente',
            cancelText: 'Cancelar',
            type: 'danger',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await eliminarOrdenTrabajo(ordenId);
                    if (res.success) {
                        toast.success("Orden de trabajo eliminada exitosamente.");
                        setOrdenes(prev => prev.filter(o => o.id !== ordenId));
                        setEntregadas(prev => prev.filter(o => o.id !== ordenId));
                    } else {
                        toast.error("Error al eliminar la orden de trabajo.");
                    }
                } catch (e) {
                    console.error(e);
                    toast.error("Error de conexión al eliminar la orden.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="px-0 py-4 md:p-8 max-w-[1600px] mx-auto relative min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Wrench className="w-8 h-8 text-blue-600" />
                        Soporte Técnico y Taller
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Órdenes de trabajo, reparaciones y mantenimiento de equipo.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/soporte/escaner')}
                        className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <QrCode className="w-5 h-5" />
                        Escáner de Salida
                    </button>
                    <button
                        onClick={() => router.push('/soporte/nuevo')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm shadow-blue-200"
                    >
                        <Plus className="w-5 h-5" />
                        Recepcionar Equipo
                    </button>
                </div>
            </div>

            {/* View switcher and Search bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-fade-in">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveView('taller')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeView === 'taller'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-655 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                    >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>En Taller ({ordenes.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('historial')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeView === 'historial'
                                ? "bg-white text-emerald-650 shadow-sm"
                                : "text-slate-655 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Historial Entregados ({entregadas.length})</span>
                    </button>
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por QR, Serie, Equipo, Cliente..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Views content */}
            {activeView === 'taller' && (
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-[1200px]">
                        {COLUMNAS.map(col => {
                            const items = activeFiltered.filter(o => {
                                if (col.id === 'EN_EVALUACION') {
                                return o.estado === 'EN_EVALUACION' || o.estado === 'EN_DIAGNOSTICO';
                            }
                            if (col.id === 'REPARACION') {
                                return o.estado === 'REPARACION' || o.estado === 'EN_REPARACION';
                            }
                            return o.estado === col.id;
                        });
                        return (
                            <div key={col.id} className="flex-1 min-w-[300px] bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`text-sm font-bold uppercase tracking-wider ${col.bg} px-3 py-1 rounded-full border ${col.color}`}>
                                        {col.title} ({items.length})
                                    </h3>
                                </div>
                                <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[650px] custom-scrollbar">
                                    {items.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl">
                                            No hay equipos aquí
                                        </div>
                                    ) : (
                                        items.map(orden => (
                                            <div key={orden.id} onClick={() => router.push(`/soporte/${orden.id}`)} className={`group bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative transition-all hover:shadow-md cursor-pointer hover:border-indigo-300`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                                        #{orden.codigoSeguridad}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span suppressHydrationWarning className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(orden.fechaRecibido).toLocaleDateString()}
                                                        </span>
                                                        {canDeleteOrder && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEliminarOrden(orden.id, orden.codigoSeguridad);
                                                                }}
                                                                className="p-1 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all border border-transparent hover:border-red-600 cursor-pointer active:scale-95"
                                                                title="Eliminar Orden"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2 mt-1">
                                                    <MonitorSmartphone className="w-4 h-4 text-blue-500 shrink-0" />
                                                    {orden.equipoDano}
                                                </div>
                                                <div className="text-xs font-medium text-slate-500 mt-1 max-w-[250px] truncate">
                                                    Cliente: <span className="text-slate-700">{orden.cliente?.nombre}</span>
                                                </div>
                                                
                                                {/* Precios si esta en cotizacion */}
                                                {(orden.costoReparacion || orden.costoRevision) && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs font-semibold">
                                                        <div><span className="text-slate-400">Rev:</span> <span className="text-slate-700">L. {orden.costoRevision}</span></div>
                                                        {orden.costoReparacion > 0 && (
                                                            <div><span className="text-blue-500">Rep:</span> <span className="text-slate-800">L. {orden.costoReparacion}</span></div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Asignados (Multi-avatar stack) */}
                                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <div className="flex -space-x-1.5 overflow-hidden">
                                                            {orden.tecnicosAsignados && orden.tecnicosAsignados.length > 0 ? (
                                                                orden.tecnicosAsignados.map((u: any) => {
                                                                    const initials = u.nombre
                                                                        ? u.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                                                        : '?';
                                                                    return (
                                                                        <div
                                                                            key={u.id}
                                                                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 uppercase overflow-hidden relative shrink-0"
                                                                            title={u.nombre}
                                                                        >
                                                                            {u.avatarUrl ? (
                                                                                <img src={u.avatarUrl} alt={u.nombre} className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                <span>{initials}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold" title="Sin asignar">
                                                                    ?
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="truncate max-w-[125px] text-xs font-semibold text-slate-600">
                                                            {orden.tecnicosAsignados && orden.tecnicosAsignados.length > 0
                                                                ? (orden.tecnicosAsignados.length === 1 ? orden.tecnicosAsignados[0].nombre : `${orden.tecnicosAsignados.length} asignados`)
                                                                : 'Sin asignar'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 text-center border-t border-slate-100/50">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">Ver Detalles →</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeView === 'historial' && (
                <div className="animate-fade-in">
                    {deliveredFiltered.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-16 text-center">
                            <CheckCircle2 className="w-12 h-12 text-slate-350 mx-auto mb-4 animate-pulse" />
                            <h3 className="font-extrabold text-slate-800 text-base">No se encontraron equipos entregados</h3>
                            <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1 leading-normal font-medium">
                                {searchQuery 
                                    ? `No hay coincidencias para "${searchQuery}" en el historial.` 
                                    : 'Aún no se han completado ni entregado órdenes de trabajo en el taller.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {deliveredFiltered.map(orden => (
                                <div 
                                    key={orden.id} 
                                    onClick={() => router.push(`/soporte/${orden.id}`)}
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative transition-all hover:shadow-lg hover:border-emerald-300 cursor-pointer flex flex-col justify-between min-h-[180px]"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3.5">
                                            <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
                                                #{orden.codigoSeguridad}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-green-200">
                                                    Entregado ✓
                                                </span>
                                                {canDeleteOrder && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEliminarOrden(orden.id, orden.codigoSeguridad);
                                                        }}
                                                        className="p-1 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all border border-transparent hover:border-red-600 cursor-pointer active:scale-95"
                                                        title="Eliminar Orden"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="font-extrabold text-slate-850 text-[14px] flex items-center gap-2 mb-1.5">
                                            <MonitorSmartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                                            {orden.equipoDano}
                                        </h4>

                                        <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                                            <div>Cliente: <span className="text-slate-800 font-semibold">{orden.cliente?.nombre || 'Desconocido'}</span></div>
                                            {orden.serie && <div>Serie: <span className="text-slate-700 font-mono text-[11px]">{orden.serie}</span></div>}
                                            
                                            {/* Asignados (Multi-avatar stack) */}
                                            <div className="pt-2 flex items-center justify-between text-[11px]" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <div className="flex -space-x-1.5 overflow-hidden">
                                                        {orden.tecnicosAsignados && orden.tecnicosAsignados.length > 0 ? (
                                                            orden.tecnicosAsignados.map((u: any) => {
                                                                const initials = u.nombre
                                                                    ? u.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                                                    : '?';
                                                                return (
                                                                    <div
                                                                        key={u.id}
                                                                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 uppercase overflow-hidden relative shrink-0"
                                                                        title={u.nombre}
                                                                    >
                                                                        {u.avatarUrl ? (
                                                                            <img src={u.avatarUrl} alt={u.nombre} className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            <span>{initials}</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold" title="Sin asignar">
                                                                ?
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="truncate max-w-[125px] text-xs font-semibold text-slate-650">
                                                        {orden.tecnicosAsignados && orden.tecnicosAsignados.length > 0
                                                            ? (orden.tecnicosAsignados.length === 1 ? orden.tecnicosAsignados[0].nombre : `${orden.tecnicosAsignados.length} asignados`)
                                                            : 'Sin asignar'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-450" />
                                            <span>Entregado: {orden.fechaEntregado ? new Date(orden.fechaEntregado).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors uppercase">
                                            Ver Historial →
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Confirmación */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl shrink-0 ${
                                    confirmModal.type === 'danger' ? 'bg-red-50 text-red-600 border border-red-200/50' :
                                    confirmModal.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-200/50' :
                                    'bg-indigo-50 text-indigo-600 border border-indigo-200/50'
                                }`}>
                                    {confirmModal.type === 'danger' ? (
                                        <Trash2 className="h-6 w-6 stroke-[2.2]" />
                                    ) : confirmModal.type === 'warning' ? (
                                        <AlertCircle className="h-6 w-6 stroke-[2.2]" />
                                    ) : (
                                        <Wrench className="h-6 w-6 stroke-[2.2]" />
                                    )}
                                </div>
                                <div className="space-y-1.5 min-w-0 flex-1">
                                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                                        {confirmModal.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {confirmModal.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition active:scale-95 cursor-pointer"
                            >
                                {confirmModal.cancelText}
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => {
                                    confirmModal.onConfirm();
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }}
                                className={`px-5 py-2 font-bold rounded-xl text-xs transition active:scale-95 shadow-sm hover:shadow flex items-center justify-center cursor-pointer ${
                                    confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                    confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                                    'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
