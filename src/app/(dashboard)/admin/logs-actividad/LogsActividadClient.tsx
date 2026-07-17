'use client';

import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Clock, User as UserIcon, Terminal, 
    Eye, Activity, Wifi, Globe, X, ChevronLeft, ChevronRight,
    RefreshCw, Calendar, Monitor, Shield, ArrowRight
} from 'lucide-react';
import { getLiveUsers, getActivityLogs } from './actions';
import { toast } from 'react-hot-toast';

interface UserSelectOption {
    id: string;
    email: string;
    nombre: string | null;
    apellido: string | null;
}

interface ActivityLogWithUser {
    id: string;
    organizationId: string;
    userId: string | null;
    action: string;
    module: string;
    description: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: any;
    createdAt: Date;
    user?: {
        id: string;
        email: string;
        nombre: string | null;
        apellido: string | null;
        role: string;
        customRoleName: string | null;
        puesto: string | null;
        avatarUrl: string | null;
    } | null;
}

interface OnlineUser {
    id: string;
    email: string;
    nombre: string | null;
    apellido: string | null;
    role: string;
    customRoleName: string | null;
    puesto: string | null;
    avatarUrl: string | null;
    lastActiveAt: Date | null;
    currentModule: string | null;
    isIdle: boolean;
}

interface LogsActividadClientProps {
    initialLogs: any[];
    initialTotal: number;
    initialTotalPages: number;
    allUsers: UserSelectOption[];
}

const actionBadges: Record<string, { bg: string; text: string; border: string }> = {
    NAVIGATE: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    UPDATE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    DELETE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    LOGIN: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    LOGOUT: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    EXPORT: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
};

const moduleLabels: Record<string, string> = {
    '/': 'Portal Principal',
    '/kanban': 'Proyectos & Kanban',
    '/inventario-ia': 'Inventario IA',
    '/rentas': 'Rentas de Equipos',
    '/graficas': 'Gráficas e Informes',
    '/inventario': 'Control de Inventario',
    '/inventario/modelos': 'Catálogo de Modelos',
    '/inventario/entradas': 'Entradas / Compras',
    '/inventario/salidas': 'Salidas / Descargas',
    '/inventario/kardex': 'Kardex de Movimientos',
    '/precios': 'Gestor de Precios',
    '/admin/areas': 'Ubicaciones y Sucursales',
    '/inventario/historico': 'Inventario Histórico (Odoo)',
    '/contactos': 'Directorio de Contactos',
    '/soporte': 'Soporte y Reparaciones',
    '/cotizaciones': 'Cotizaciones',
    '/facturas': 'Facturación',
    '/caja-chica': 'Caja Chica',
    '/admin/gestion-web': 'Gestión Web / Tienda',
    '/admin/tarjetas-digitales': 'Tarjetas Digitales',
    '/admin/notificaciones': 'Módulo de Notificaciones',
    '/admin/logs-actividad': 'Bitácora de Actividad',
    '/configuracion': 'Configuración',
};

const getModuleLabel = (path: string | null) => {
    if (!path) return 'Ninguno';
    if (moduleLabels[path]) return moduleLabels[path];
    
    // Check dynamic routes
    if (path.startsWith('/rentas/')) return 'Detalle de Renta';
    if (path.startsWith('/soporte/')) return 'Detalle de Soporte';
    if (path.startsWith('/facturas/')) return 'Detalle de Factura';
    
    return path;
};

export function LogsActividadClient({ 
    initialLogs, 
    initialTotal, 
    initialTotalPages,
    allUsers 
}: LogsActividadClientProps) {
    // Live Presence State
    const [liveUsers, setLiveUsers] = useState<OnlineUser[]>([]);
    const [loadingLive, setLoadingLive] = useState(false);

    // History Log State
    const [logs, setLogs] = useState<ActivityLogWithUser[]>(initialLogs);
    const [totalLogs, setTotalLogs] = useState(initialTotal);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Filter States
    const [userId, setUserId] = useState('ALL');
    const [action, setAction] = useState('ALL');
    const [moduleFilter, setModuleFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Selected log details (Modal)
    const [selectedLog, setSelectedLog] = useState<ActivityLogWithUser | null>(null);

    // Poll live users every 15 seconds
    const fetchLiveUsers = async () => {
        const res = await getLiveUsers();
        if (res.success && res.onlineUsers) {
            setLiveUsers(res.onlineUsers as any[]);
        }
    };

    useEffect(() => {
        fetchLiveUsers();
        const interval = setInterval(fetchLiveUsers, 15000);
        return () => clearInterval(interval);
    }, []);

    // Fetch history logs based on filters
    const fetchHistoryLogs = async (page = 1) => {
        setLoadingLogs(true);
        try {
            const res = await getActivityLogs({
                userId,
                action,
                module: moduleFilter,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                search: search || undefined,
                page,
                pageSize: 30
            });

            if (res.success && res.logs) {
                setLogs(res.logs as any[]);
                setTotalLogs(res.total || 0);
                setTotalPages(res.totalPages || 1);
                setCurrentPage(page);
            } else {
                toast.error(res.error || 'Error al filtrar bitácora');
            }
        } catch (err) {
            toast.error('Error inesperado al buscar logs');
        } finally {
            setLoadingLogs(false);
        }
    };

    // Trigger search when filters change
    const handleApplyFilters = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        fetchHistoryLogs(1);
    };

    const handleClearFilters = () => {
        setUserId('ALL');
        setAction('ALL');
        setModuleFilter('ALL');
        setStartDate('');
        setEndDate('');
        setSearch('');
        // We delay the fetch slightly or run synchronously
        setTimeout(() => {
            setLoadingLogs(true);
            getActivityLogs({ page: 1, pageSize: 30 }).then(res => {
                if (res.success && res.logs) {
                    setLogs(res.logs as any[]);
                    setTotalLogs(res.total || 0);
                    setTotalPages(res.totalPages || 1);
                    setCurrentPage(1);
                }
                setLoadingLogs(false);
            });
        }, 50);
    };

    const formatTimestamp = (dateInput: any) => {
        const date = new Date(dateInput);
        return date.toLocaleString('es-HN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    // Helper to get initials
    const getUserInitials = (user: any) => {
        if (!user) return '?';
        const parts = [];
        if (user.nombre) parts.push(user.nombre[0]);
        if (user.apellido) parts.push(user.apellido[0]);
        if (parts.length === 0) return user.email[0].toUpperCase();
        return parts.join('').toUpperCase();
    };

    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-brand-600 animate-pulse" />
                        Bitácora y Monitoreo de Actividad
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Monitorea en tiempo real quiénes están en línea y audita el historial detallado de acciones del sistema.
                    </p>
                </div>
                <button
                    onClick={() => {
                        fetchLiveUsers();
                        fetchHistoryLogs(currentPage);
                        toast.success('Datos actualizados');
                    }}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95"
                >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    Actualizar Todo
                </button>
            </div>

            {/* LIVE CONNECTED USERS PANEL */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Wifi className="w-5 h-5 text-emerald-500" />
                            Usuarios Conectados en Vivo
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Personal navegando o trabajando activamente en el sistema (pings en los últimos 45 segundos).
                        </p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        {liveUsers.length} En línea
                    </span>
                </div>

                {liveUsers.length > 0 ? (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {liveUsers.map((user) => (
                            <div 
                                key={user.id} 
                                className="relative flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-white hover:shadow-md hover:shadow-slate-100/50 transition-all duration-300 group"
                            >
                                {/* Active status badge dot */}
                                <div className="absolute top-4 right-4">
                                    <span className="relative flex h-3.5 w-3.5">
                                        {user.isIdle ? (
                                            <>
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" title="Inactivo hace más de 5 minutos"></span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" title="Activo"></span>
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Avatar */}
                                <div className="w-11 h-11 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center font-bold text-brand-700 text-sm overflow-hidden shadow-inner shrink-0">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={`${user.nombre}`} className="w-full h-full object-cover" />
                                    ) : (
                                        getUserInitials(user)
                                    )}
                                </div>

                                {/* Details */}
                                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm truncate">
                                            {user.nombre ? `${user.nombre} ${user.apellido || ''}` : user.email.split('@')[0]}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            <Shield className="w-2.5 h-2.5" />
                                            {user.customRoleName || user.role}
                                        </span>
                                        {user.puesto && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[120px]">
                                                {user.puesto.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="pt-1.5 border-t border-slate-100 mt-1 flex flex-col gap-1 text-xs">
                                        <span className="text-slate-400 font-medium">Ubicación Actual:</span>
                                        <span className="font-semibold text-slate-700 flex items-center gap-1 truncate">
                                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            {getModuleLabel(user.currentModule)}
                                        </span>
                                        {user.lastActiveAt && (
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3 text-slate-300" />
                                                Ping hace {Math.round((Date.now() - new Date(user.lastActiveAt).getTime()) / 1000)} seg
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <Wifi className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <p className="text-sm font-medium">No hay usuarios en línea actualmente</p>
                        <p className="text-xs text-slate-400">Los usuarios activos aparecerán aquí en cuanto carguen cualquier pantalla.</p>
                    </div>
                )}
            </div>

            {/* AUDIT LOGS HISTORY PANEL */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        Historial de Auditoría
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Filtra y explora las transacciones, inicios de sesión y flujos de navegación registrados en la base de datos.
                    </p>
                </div>

                {/* Filters Form */}
                <form onSubmit={handleApplyFilters} className="p-6 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Search query */}
                    <div className="flex flex-col gap-1 xl:col-span-2">
                        <label htmlFor="search-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="search-input"
                                type="text"
                                placeholder="Ej: creado, editado, factura..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* User dropdown */}
                    <div className="flex flex-col gap-1">
                        <label htmlFor="user-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</label>
                        <select
                            id="user-filter"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                        >
                            <option value="ALL">Todos los Usuarios</option>
                            {allUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.nombre ? `${u.nombre} ${u.apellido || ''}` : u.email.split('@')[0]}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action types */}
                    <div className="flex flex-col gap-1">
                        <label htmlFor="action-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</label>
                        <select
                            id="action-filter"
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                        >
                            <option value="ALL">Todas las Acciones</option>
                            <option value="NAVIGATE">NAVIGATE (Navegación)</option>
                            <option value="CREATE">CREATE (Creación)</option>
                            <option value="UPDATE">UPDATE (Edición)</option>
                            <option value="DELETE">DELETE (Anulación/Borrado)</option>
                            <option value="LOGIN">LOGIN (Inicio Sesión)</option>
                            <option value="LOGOUT">LOGOUT (Cierre Sesión)</option>
                            <option value="EXPORT">EXPORT (Exportación)</option>
                        </select>
                    </div>

                    {/* Module */}
                    <div className="flex flex-col gap-1">
                        <label htmlFor="module-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Módulo</label>
                        <select
                            id="module-filter"
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                        >
                            <option value="ALL">Todos los Módulos</option>
                            {Object.entries(moduleLabels).map(([path, label]) => (
                                <option key={path} value={path}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-end gap-2 xl:col-span-1 mt-4 sm:mt-0">
                        <button
                            type="submit"
                            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            <Filter className="w-4 h-4" />
                            Filtrar
                        </button>
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center"
                            title="Limpiar filtros"
                        >
                            Limpiar
                        </button>
                    </div>
                </form>

                {/* Logs History Table */}
                <div className="overflow-x-auto relative">
                    {loadingLogs && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
                        </div>
                    )}

                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Tipo Acción</th>
                                <th className="px-6 py-4">Módulo</th>
                                <th className="px-6 py-4">Descripción</th>
                                <th className="px-6 py-4">Fecha y Hora</th>
                                <th className="px-6 py-4 text-right">Metadatos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length > 0 ? (
                                logs.map((log) => {
                                    const badge = actionBadges[log.action] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                {log.user ? (
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden shrink-0 shadow-inner">
                                                            {log.user.avatarUrl ? (
                                                                <img src={log.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                getUserInitials(log.user)
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-700 text-xs">
                                                                {log.user.nombre ? `${log.user.nombre} ${log.user.apellido || ''}` : log.user.email.split('@')[0]}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{log.user.email}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">Sistema / Desconocido</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                                {getModuleLabel(log.module)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs font-medium max-w-[280px] truncate" title={log.description}>
                                                {log.description}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {formatTimestamp(log.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 p-2 rounded-lg transition-all"
                                                    title="Ver detalles de metadatos"
                                                >
                                                    <Eye className="w-4.5 h-4.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No se encontraron registros en la bitácora que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
                        <span className="text-slate-500 font-medium">
                            Mostrando {logs.length} de {totalLogs} registros en total
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => fetchHistoryLogs(currentPage - 1)}
                                disabled={currentPage === 1 || loadingLogs}
                                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="px-4 py-1.5 bg-slate-50 rounded-xl font-bold border border-slate-100 text-slate-700">
                                Página {currentPage} de {totalPages}
                            </span>

                            <button
                                onClick={() => fetchHistoryLogs(currentPage + 1)}
                                disabled={currentPage === totalPages || loadingLogs}
                                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* METADATA INSPECTOR MODAL */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-100">
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-base">
                                    <Terminal className="w-5 h-5 text-brand-600" />
                                    Detalle del Registro de Auditoría
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">ID: {selectedLog.id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedLog(null)} 
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuario Autor</span>
                                    <p className="font-bold text-slate-800 text-sm">
                                        {selectedLog.user ? `${selectedLog.user.nombre || ''} ${selectedLog.user.apellido || ''}` : 'Sistema / Desconocido'}
                                    </p>
                                    <p className="text-xs text-slate-500">{selectedLog.user?.email || 'N/A'}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora</span>
                                    <p className="font-bold text-slate-800 text-sm">
                                        {formatTimestamp(selectedLog.createdAt)}
                                    </p>
                                    <p className="text-xs text-slate-500">Módulo: {getModuleLabel(selectedLog.module)}</p>
                                </div>
                            </div>

                            {/* Details row */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción de la Actividad</span>
                                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-sm font-semibold text-slate-700 leading-relaxed">
                                    {selectedLog.description}
                                </div>
                            </div>

                            {/* Connection Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                                        Dirección IP
                                    </span>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={selectedLog.ipAddress || 'No registrada'} 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                        <Monitor className="w-3.5 h-3.5 text-slate-400" />
                                        Agente de Usuario (Dispositivo)
                                    </span>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={selectedLog.userAgent || 'No registrado'} 
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 outline-none truncate"
                                        title={selectedLog.userAgent || ''}
                                    />
                                </div>
                            </div>

                            {/* JSON Meta */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metadatos de la Transacción (Cambios)</span>
                                <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100 p-4 font-mono text-[11px] leading-relaxed max-h-[220px] overflow-y-auto">
                                    <pre>
                                        {selectedLog.metadata 
                                            ? JSON.stringify(selectedLog.metadata, null, 2) 
                                            : '// Sin metadatos adicionales en esta acción'}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
