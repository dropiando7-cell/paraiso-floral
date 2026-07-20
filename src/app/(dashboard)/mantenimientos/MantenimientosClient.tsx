'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Calendar, Wrench, Clock, Plus, Search, Settings,
    MessageSquare, Smartphone, User, Tag, Trash2, Edit3,
    AlertTriangle, Activity, CheckCircle2, ChevronRight, X, Info,
    Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    registrarEquipoExterno,
    programarMantenimientoManual,
    registrarMantenimientoRealizado,
    editarMantenimiento,
    eliminarMantenimiento,
    eliminarEquipoCliente,
    updateConfiguracionMantenimientos,
    enviarNotificacionMantenimientoAction
} from './actions';
import PreviewEtiquetaEquipoModal from './PreviewEtiquetaEquipoModal';

type Cliente = {
    id: string;
    nombre: string;
    telefono?: string | null;
    email?: string | null;
};

type Equipo = {
    id: string;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    serie: string | null;
    codigoEtiqueta: string | null;
    fechaInstalacion: Date | null;
    garantiaMeses: number | null;
    fechaVencimientoGarantia: Date | null;
    mantenimientosGratisTotales: number;
    mantenimientosGratisRealizados: number;
    clienteId: string;
    cliente: Cliente;
    activoFijoId: string | null;
    _count: { mantenimientos: number };
};

type Mantenimiento = {
    id: string;
    equipoClienteId: string;
    fechaProgramada: Date;
    fechaRealizada: Date | null;
    tipo: string;
    estado: string;
    notas: string | null;
    costo: number | null;
    realizadoPorId: string | null;
    esGratis: boolean;
    notificado: boolean;
    fechaNotificacion: Date | null;
    whatsappSid: string | null;
    equipo: {
        id: string;
        nombre: string;
        serie: string | null;
        codigoEtiqueta: string | null;
        cliente: {
            id: string;
            nombre: string;
            telefono: string | null;
        };
    };
    realizadoPor: {
        id: string;
        nombre: string | null;
        apellido: string | null;
    } | null;
};

type UserInfo = {
    id: string;
    nombre: string | null;
    apellido: string | null;
    role: string;
    puesto: string | null;
};

interface MantenimientosClientProps {
    initialEquipos: Equipo[];
    initialMantenimientos: Mantenimiento[];
    clientes: Cliente[];
    usuarios: UserInfo[];
    config: { notificarDias: number; whatsappTemplateSid: string };
    userRole: string;
}

export default function MantenimientosClient({
    initialEquipos,
    initialMantenimientos,
    clientes,
    usuarios,
    config,
    userRole
}: MantenimientosClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'equipos' | 'config'>('dashboard');
    const [equipos, setEquipos] = useState<Equipo[]>(initialEquipos);
    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>(initialMantenimientos);
    const [currentConfig, setCurrentConfig] = useState(config);

    // Search and filters states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterEstado, setFilterEstado] = useState<string>('ALL');
    const [filterTipo, setFilterTipo] = useState<string>('ALL');

    // Selected items for details modals
    const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);

    // Modals visibility
    const [isEquipoModalOpen, setIsEquipoModalOpen] = useState(false);
    const [isMantenimientoModalOpen, setIsMantenimientoModalOpen] = useState(false);
    const [isRealizarModalOpen, setIsRealizarModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Form inputs state
    const [newEquipo, setNewEquipo] = useState({
        clienteId: '',
        nombre: '',
        marca: '',
        modelo: '',
        serie: '',
        codigoEtiqueta: '',
        fechaInstalacion: '',
        garantiaMeses: ''
    });

    const [newMantenimiento, setNewMantenimiento] = useState({
        equipoClienteId: '',
        fechaProgramada: '',
        tipo: 'PREVENTIVO',
        notas: '',
        costo: '',
        realizadoPorId: ''
    });

    const [realizarData, setRealizarData] = useState({
        mantenimientoId: '',
        fechaRealizada: new Date().toISOString().split('T')[0],
        notas: '',
        realizadoPorId: '',
        costo: ''
    });

    const [loading, setLoading] = useState(false);

    // Calculations for dashboard metrics
    const today = new Date();
    const notificationThresholdDate = new Date();
    notificationThresholdDate.setDate(today.getDate() + currentConfig.notificarDias);

    const totalEquipos = equipos.length;
    const mantenimientosRealizadosCount = mantenimientos.filter(m => m.estado === 'REALIZADO').length;
    const totalPendientes30Dias = mantenimientos.filter(m => {
        const sched = new Date(m.fechaProgramada);
        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 30);
        return m.estado === 'PROGRAMADO' && sched >= today && sched <= limitDate;
    }).length;

    const mantenimientosAtrasadosCount = mantenimientos.filter(m => {
        const sched = new Date(m.fechaProgramada);
        sched.setHours(23, 59, 59, 999);
        return m.estado === 'PROGRAMADO' && sched < today;
    }).length;

    const notificacionesEnviadasCount = mantenimientos.filter(m => m.notificado).length;

    // Filter upcoming mantenimientos for alerts (scheduled in the next X days, not notified, not completed)
    const alertMantenimientos = mantenimientos.filter(m => {
        if (m.estado !== 'PROGRAMADO' || m.notificado) return false;
        const schedDate = new Date(m.fechaProgramada);
        // Compare dates without time
        const cleanSched = new Date(schedDate.getFullYear(), schedDate.getMonth(), schedDate.getDate());
        const cleanToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const cleanLimit = new Date(notificationThresholdDate.getFullYear(), notificationThresholdDate.getMonth(), notificationThresholdDate.getDate());
        return cleanSched >= cleanToday && cleanSched <= cleanLimit;
    });

    // Handle Quick WhatsApp Notification
    const handleSendNotification = async (mantenimientoId: string) => {
        setLoading(true);
        try {
            const res = await enviarNotificacionMantenimientoAction(mantenimientoId);
            if (res.success) {
                toast.success('Notificación de WhatsApp enviada con éxito');
                // Update local state
                setMantenimientos(prev => prev.map(m =>
                    m.id === mantenimientoId
                        ? { ...m, notificado: true, fechaNotificacion: new Date() }
                        : m
                ));
            } else {
                toast.error(res.error || 'No se pudo enviar la notificación');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    // Filter logic for general agenda
    const filteredMantenimientos = mantenimientos.filter(m => {
        // Query filter
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = !q ? true : (
            m.equipo.nombre.toLowerCase().includes(q) ||
            m.equipo.cliente.nombre.toLowerCase().includes(q) ||
            (m.equipo.serie && m.equipo.serie.toLowerCase().includes(q)) ||
            (m.equipo.codigoEtiqueta && m.equipo.codigoEtiqueta.toLowerCase().includes(q)) ||
            (m.notas && m.notas.toLowerCase().includes(q))
        );

        // Status filter
        let matchesStatus = true;
        if (filterEstado === 'REALIZADO') matchesStatus = m.estado === 'REALIZADO';
        else if (filterEstado === 'PROGRAMADO') {
            const sched = new Date(m.fechaProgramada);
            sched.setHours(23, 59, 59, 999);
            matchesStatus = m.estado === 'PROGRAMADO' && sched >= today;
        } else if (filterEstado === 'ATRASADO') {
            const sched = new Date(m.fechaProgramada);
            sched.setHours(23, 59, 59, 999);
            matchesStatus = m.estado === 'PROGRAMADO' && sched < today;
        } else if (filterEstado === 'CANCELADO') matchesStatus = m.estado === 'CANCELADO';

        // Type filter
        const matchesType = filterTipo === 'ALL' ? true : m.tipo === filterTipo;

        return matchesQuery && matchesStatus && matchesType;
    });

    // Filter logic for equipments
    const filteredEquipos = equipos.filter(eq => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            eq.nombre.toLowerCase().includes(q) ||
            eq.cliente.nombre.toLowerCase().includes(q) ||
            (eq.marca && eq.marca.toLowerCase().includes(q)) ||
            (eq.modelo && eq.modelo.toLowerCase().includes(q)) ||
            (eq.serie && eq.serie.toLowerCase().includes(q)) ||
            (eq.codigoEtiqueta && eq.codigoEtiqueta.toLowerCase().includes(q))
        );
    });

    // Save manual equipment
    const handleCreateEquipo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEquipo.clienteId || !newEquipo.nombre) {
            return toast.error('Favor completar los campos obligatorios');
        }

        setLoading(true);
        try {
            const res = await registrarEquipoExterno({
                clienteId: newEquipo.clienteId,
                nombre: newEquipo.nombre,
                marca: newEquipo.marca || undefined,
                modelo: newEquipo.modelo || undefined,
                serie: newEquipo.serie || undefined,
                codigoEtiqueta: newEquipo.codigoEtiqueta || undefined,
                fechaInstalacion: newEquipo.fechaInstalacion ? new Date(newEquipo.fechaInstalacion) : undefined,
                garantiaMeses: newEquipo.garantiaMeses ? parseInt(newEquipo.garantiaMeses) : undefined
            });

            if (res.success && res.equipo) {
                toast.success('Equipo registrado exitosamente');
                // Refresh local equipment state
                const newEq: Equipo = {
                    ...(res.equipo as any),
                    _count: { mantenimientos: 0 }
                };
                setEquipos(prev => [newEq, ...prev]);
                setIsEquipoModalOpen(false);
                setNewEquipo({
                    clienteId: '',
                    nombre: '',
                    marca: '',
                    modelo: '',
                    serie: '',
                    codigoEtiqueta: '',
                    fechaInstalacion: '',
                    garantiaMeses: ''
                });
            } else {
                toast.error(res.error || 'Error al registrar equipo');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error del servidor');
        } finally {
            setLoading(false);
        }
    };

    // Save scheduled maintenance
    const handleCreateMantenimiento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMantenimiento.equipoClienteId || !newMantenimiento.fechaProgramada) {
            return toast.error('Favor completar los campos obligatorios');
        }

        setLoading(true);
        try {
            const res = await programarMantenimientoManual({
                equipoClienteId: newMantenimiento.equipoClienteId,
                fechaProgramada: newMantenimiento.fechaProgramada,
                tipo: newMantenimiento.tipo,
                notas: newMantenimiento.notas || undefined,
                costo: newMantenimiento.costo ? parseFloat(newMantenimiento.costo) : undefined,
                realizadoPorId: newMantenimiento.realizadoPorId || undefined
            });

            if (res.success && res.mantenimiento) {
                toast.success('Mantenimiento programado exitosamente');
                // Update local state by finding the equipment full info
                const eq = equipos.find(e => e.id === newMantenimiento.equipoClienteId);
                const fullMantenimiento: Mantenimiento = {
                    ...(res.mantenimiento as any),
                    costo: res.mantenimiento.costo ? Number(res.mantenimiento.costo) : null,
                    equipo: {
                        id: eq?.id || '',
                        nombre: eq?.nombre || '',
                        serie: eq?.serie || null,
                        codigoEtiqueta: eq?.codigoEtiqueta || null,
                        cliente: {
                            id: eq?.cliente?.id || '',
                            nombre: eq?.cliente?.nombre || '',
                            telefono: eq?.cliente?.telefono || null
                        }
                    },
                    realizadoPor: usuarios.find(u => u.id === newMantenimiento.realizadoPorId) || null
                };

                setMantenimientos(prev => [...prev, fullMantenimiento].sort((a, b) =>
                    new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime()
                ));
                setIsMantenimientoModalOpen(false);
                setNewMantenimiento({
                    equipoClienteId: '',
                    fechaProgramada: '',
                    tipo: 'PREVENTIVO',
                    notas: '',
                    costo: '',
                    realizadoPorId: ''
                });

                // If currently viewing equipment details, refresh it
                if (selectedEquipo && selectedEquipo.id === newMantenimiento.equipoClienteId) {
                    setSelectedEquipo(prev => prev ? {
                        ...prev,
                        _count: { mantenimientos: prev._count.mantenimientos + 1 }
                    } : null);
                }
            } else {
                toast.error(res.error || 'Error al programar mantenimiento');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error del servidor');
        } finally {
            setLoading(false);
        }
    };

    // Save completed maintenance
    const handleRealizarMantenimiento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!realizarData.fechaRealizada) {
            return toast.error('La fecha en que se realizó es obligatoria');
        }

        setLoading(true);
        try {
            const res = await registrarMantenimientoRealizado(realizarData.mantenimientoId, {
                fechaRealizada: realizarData.fechaRealizada,
                notas: realizarData.notas || undefined,
                realizadoPorId: realizarData.realizadoPorId || undefined,
                costo: realizarData.costo ? parseFloat(realizarData.costo) : undefined
            });

            if (res.success) {
                toast.success('Mantenimiento registrado como realizado');

                // Update local state
                const originalMant = mantenimientos.find(m => m.id === realizarData.mantenimientoId);
                const tech = usuarios.find(u => u.id === realizarData.realizadoPorId) || null;

                setMantenimientos(prev => prev.map(m =>
                    m.id === realizarData.mantenimientoId
                        ? {
                            ...m,
                            estado: 'REALIZADO',
                            fechaRealizada: new Date(realizarData.fechaRealizada),
                            notas: realizarData.notas || m.notas,
                            costo: realizarData.costo ? parseFloat(realizarData.costo) : m.costo,
                            realizadoPor: tech ? { id: tech.id, nombre: tech.nombre, apellido: tech.apellido } : m.realizadoPor
                        }
                        : m
                ));

                // If it was gratis/garantía, update the gratis counter on the equipment locally
                if (originalMant?.esGratis) {
                    setEquipos(prev => prev.map(eq => {
                        if (eq.id === originalMant.equipoClienteId) {
                            const newCount = eq.mantenimientosGratisRealizados + 1;
                            return {
                                ...eq,
                                mantenimientosGratisRealizados: newCount > eq.mantenimientosGratisTotales ? eq.mantenimientosGratisTotales : newCount
                            };
                        }
                        return eq;
                    }));

                    // Update currently open detail modal if applicable
                    if (selectedEquipo && selectedEquipo.id === originalMant.equipoClienteId) {
                        setSelectedEquipo(prev => {
                            if (!prev) return null;
                            const newCount = prev.mantenimientosGratisRealizados + 1;
                            return {
                                ...prev,
                                mantenimientosGratisRealizados: newCount > prev.mantenimientosGratisTotales ? prev.mantenimientosGratisTotales : newCount
                            };
                        });
                    }
                }

                setIsRealizarModalOpen(false);
            } else {
                toast.error(res.error || 'Error al registrar mantenimiento realizado');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error del servidor');
        } finally {
            setLoading(false);
        }
    };

    // Delete equipment
    const handleDeleteEquipo = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este equipo de cliente? Se borrarán permanentemente todos sus mantenimientos programados e historial.')) return;
        setLoading(true);
        try {
            const res = await eliminarEquipoCliente(id);
            if (res.success) {
                toast.success('Equipo eliminado exitosamente');
                setEquipos(prev => prev.filter(e => e.id !== id));
                setMantenimientos(prev => prev.filter(m => m.equipoClienteId !== id));
                setSelectedEquipo(null);
            } else {
                toast.error(res.error || 'Error al eliminar equipo');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    // Save system configurations
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await updateConfiguracionMantenimientos(
                currentConfig.notificarDias,
                currentConfig.whatsappTemplateSid
            );
            if (res.success) {
                toast.success('Configuración guardada exitosamente');
            } else {
                toast.error(res.error || 'Error al guardar la configuración');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error de servidor');
        } finally {
            setLoading(false);
        }
    };

    // Helper for days left formatting
    const getDaysLeftText = (scheduledDate: Date) => {
        const diffTime = new Date(scheduledDate).getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';
        if (diffDays < 0) return `Hace ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'día' : 'días'}`;
        return `En ${diffDays} días`;
    };

    return (
        <div className="px-4 py-6 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Shield className="w-8 h-8 text-indigo-600" />
                        Garantías y Mantenimientos
                    </h1>
                    <p className="text-slate-500 mt-2 text-base font-medium leading-relaxed">
                        Control de mantenimientos preventivos y garantías para equipos vendidos y dispositivos externos con etiqueta.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsEquipoModalOpen(true)}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                        <Plus className="w-5 h-5 text-slate-500" />
                        Registrar Equipo Externo
                    </button>
                    <button
                        onClick={() => {
                            if (equipos.length === 0) {
                                return toast.error('Debe registrar al menos un equipo primero.');
                            }
                            // Default to first equipment if not set
                            setNewMantenimiento(p => ({ ...p, equipoClienteId: equipos[0]?.id || '' }));
                            setIsMantenimientoModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm shadow-indigo-200 cursor-pointer active:scale-95"
                    >
                        <Calendar className="w-5 h-5" />
                        Programar Mantenimiento
                    </button>
                </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[
                    { title: 'Equipos Registrados', val: totalEquipos, icon: Tag, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                    { title: 'Pendientes (30d)', val: totalPendientes30Dias, icon: Calendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                    { title: 'Atrasados / Vencidos', val: mantenimientosAtrasadosCount, icon: AlertTriangle, color: mantenimientosAtrasadosCount > 0 ? 'text-red-600 bg-red-50 border-red-100 animate-pulse' : 'text-slate-600 bg-slate-50 border-slate-100' },
                    { title: 'Servicios Realizados', val: mantenimientosRealizadosCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                    { title: 'WhatsApp Enviados', val: notificacionesEnviadasCount, icon: MessageSquare, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                ].map((m, idx) => {
                    const Icon = m.icon;
                    return (
                        <div key={idx} className={`bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm`}>
                            <div className="space-y-1">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">{m.title}</span>
                                <span className="text-2xl font-black text-slate-800 leading-none">{m.val}</span>
                            </div>
                            <div className={`p-3 rounded-xl shrink-0 border ${m.color}`}>
                                <Icon className="w-5 h-5 stroke-[2.2]" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabs Selector & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 w-fit">
                    {[
                        { id: 'dashboard', label: 'Dashboard / Alertas', icon: Activity },
                        { id: 'agenda', label: 'Agenda de Mantenimiento', icon: Calendar },
                        { id: 'equipos', label: 'Equipos de Clientes', icon: Tag },
                        { id: 'config', label: 'Configuración', icon: Settings },
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === tab.id
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {activeTab !== 'config' && (
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={
                                activeTab === 'equipos'
                                    ? "Buscar equipo por serie, QR/etiqueta, marca, cliente..."
                                    : "Buscar mantenimiento por cliente, equipo, serie, notas..."
                            }
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-2 text-slate-400 hover:text-slate-650 text-xs font-bold"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* TAB: DASHBOARD / ALERTAS */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 gap-6 animate-fade-in">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-indigo-500" />
                                    Alertas Próximas: Mantenimientos del Cliente
                                </h3>
                                <p className="text-slate-400 text-xs mt-1 font-medium">
                                    Equipos que requieren mantenimiento preventivo en los próximos <strong className="text-slate-700 font-black">{currentConfig.notificarDias} días</strong> y no han sido notificados.
                                </p>
                            </div>
                            <span className="bg-indigo-50 text-indigo-800 text-[10px] font-bold px-3 py-1 rounded-full border border-indigo-100">
                                {alertMantenimientos.length} alertas activas
                            </span>
                        </div>

                        {alertMantenimientos.length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                                <h4 className="font-bold text-slate-700 text-sm">¡Al día con las notificaciones!</h4>
                                <p className="text-slate-400 text-xs mt-1">No hay mantenimientos pendientes por notificar para los próximos {currentConfig.notificarDias} días.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-medium text-slate-600">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                                            <th className="py-3.5 px-4 rounded-l-xl">Equipo / Marca / Serie</th>
                                            <th className="py-3.5 px-4">Cliente</th>
                                            <th className="py-3.5 px-4">Fecha Programada</th>
                                            <th className="py-3.5 px-4">Plazo</th>
                                            <th className="py-3.5 px-4">Contacto</th>
                                            <th className="py-3.5 px-4 text-center rounded-r-xl">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150">
                                        {alertMantenimientos.map(m => (
                                            <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-900 text-xs">{m.equipo.nombre}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                                                        {m.equipo.serie && <span>Serie: {m.equipo.serie}</span>}
                                                        {m.equipo.codigoEtiqueta && (
                                                            <span className="flex items-center gap-0.5 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                                <Tag className="w-2.5 h-2.5" />
                                                                {m.equipo.codigoEtiqueta}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 font-bold text-slate-700">{m.equipo.cliente.nombre}</td>
                                                <td className="py-3.5 px-4 font-semibold text-slate-700">
                                                    {new Date(m.fechaProgramada).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                                                        <Clock className="w-3 h-3" />
                                                        {getDaysLeftText(m.fechaProgramada)}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {m.equipo.cliente.telefono ? (
                                                        <a href={`tel:${m.equipo.cliente.telefono}`} className="text-slate-800 hover:text-indigo-600 flex items-center gap-1">
                                                            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                                                            {m.equipo.cliente.telefono}
                                                        </a>
                                                    ) : (
                                                        <span className="text-red-500 text-[10px] font-bold italic">Sin teléfono</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        disabled={loading || !m.equipo.cliente.telefono}
                                                        onClick={() => handleSendNotification(m.id)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-[11px] shadow-sm shadow-green-100 mx-auto cursor-pointer"
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        Enviar WhatsApp
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: AGENDA / CALENDARIO */}
            {activeTab === 'agenda' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in">
                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
                        <div className="flex flex-wrap gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Estatus</label>
                                <select
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    value={filterEstado}
                                    onChange={(e) => setFilterEstado(e.target.value)}
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="PROGRAMADO">Programado (Activo)</option>
                                    <option value="REALIZADO">Realizado</option>
                                    <option value="ATRASADO">Vencido / Atrasado</option>
                                    <option value="CANCELADO">Cancelado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tipo de Servicio</label>
                                <select
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    value={filterTipo}
                                    onChange={(e) => setFilterTipo(e.target.value)}
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="GARANTIA">Garantía Gratis</option>
                                    <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                                    <option value="CORRECTIVO">Mantenimiento Correctivo</option>
                                </select>
                            </div>
                        </div>

                        <span className="text-xs text-slate-400 font-bold self-end sm:self-center">
                            Mostrando {filteredMantenimientos.length} de {mantenimientos.length} mantenimientos
                        </span>
                    </div>

                    {filteredMantenimientos.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h4 className="font-bold text-slate-700 text-sm">No se encontraron mantenimientos</h4>
                            <p className="text-slate-400 text-xs mt-1">Intente cambiar los filtros o realizar otra búsqueda.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs font-medium text-slate-600">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                                        <th className="py-3.5 px-4 rounded-l-xl">Equipo / Serie / QR</th>
                                        <th className="py-3.5 px-4">Cliente</th>
                                        <th className="py-3.5 px-4">Fecha Programada</th>
                                        <th className="py-3.5 px-4">Tipo</th>
                                        <th className="py-3.5 px-4">Estado / Notificación</th>
                                        <th className="py-3.5 px-4">Técnico / Notas</th>
                                        <th className="py-3.5 px-4 text-center rounded-r-xl">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150">
                                    {filteredMantenimientos.map(m => {
                                        const isAtrasado = m.estado === 'PROGRAMADO' && new Date(m.fechaProgramada).setHours(23, 59, 59, 999) < today.getTime();
                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-900 text-xs">{m.equipo.nombre}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                                                        {m.equipo.serie && <span>Serie: {m.equipo.serie}</span>}
                                                        {m.equipo.codigoEtiqueta && (
                                                            <span className="flex items-center gap-0.5 text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                                <Tag className="w-2.5 h-2.5" />
                                                                {m.equipo.codigoEtiqueta}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-700">{m.equipo.cliente.nombre}</div>
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-slate-700">
                                                    {new Date(m.fechaProgramada).toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                                        m.tipo === 'GARANTIA' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                                        m.tipo === 'PREVENTIVO' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                                                        'bg-orange-50 text-orange-800 border-orange-100'
                                                    }`}>
                                                        {m.tipo === 'GARANTIA' ? 'Garantía Gratis' : m.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 space-y-1.5">
                                                    {/* State */}
                                                    <div>
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            m.estado === 'REALIZADO' ? 'bg-green-100 text-green-800 border-green-200' :
                                                            isAtrasado ? 'bg-red-100 text-red-800 border-red-200 animate-pulse' :
                                                            m.estado === 'CANCELADO' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                            'bg-indigo-100 text-indigo-850 border-indigo-200'
                                                        }`}>
                                                            {m.estado === 'REALIZADO' ? 'Realizado' :
                                                             isAtrasado ? 'Vencido' :
                                                             m.estado === 'CANCELADO' ? 'Cancelado' : 'Programado'}
                                                        </span>
                                                    </div>
                                                    {/* WhatsApp status */}
                                                    {m.notificado ? (
                                                        <div className="text-[9px] font-semibold text-emerald-700 flex items-center gap-1">
                                                            <MessageSquare className="w-3 h-3 text-emerald-500" />
                                                            Notificado el {m.fechaNotificacion ? new Date(m.fechaNotificacion).toLocaleDateString() : ''}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[9px] font-semibold text-slate-400">
                                                            Sin notificar
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 max-w-[250px]">
                                                    {m.realizadoPor && (
                                                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                                                            <User className="w-3 h-3 text-slate-400" />
                                                            {m.realizadoPor.nombre} {m.realizadoPor.apellido}
                                                        </div>
                                                    )}
                                                    {m.notas ? (
                                                        <div className="text-[10px] text-slate-500 italic truncate" title={m.notas}>{m.notas}</div>
                                                    ) : (
                                                        <div className="text-[10px] text-slate-400 italic">Sin observaciones</div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="flex justify-center items-center gap-2">
                                                        {m.estado === 'PROGRAMADO' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setRealizarData(p => ({
                                                                        ...p,
                                                                        mantenimientoId: m.id,
                                                                        notas: m.notas || '',
                                                                        costo: m.costo ? m.costo.toString() : '',
                                                                        realizadoPorId: m.realizadoPorId || ''
                                                                    }));
                                                                    setIsRealizarModalOpen(true);
                                                                }}
                                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 px-2.5 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer"
                                                                title="Completar mantenimiento"
                                                            >
                                                                Marcar Completado
                                                            </button>
                                                        )}
                                                        {m.estado === 'PROGRAMADO' && !m.notificado && m.equipo.cliente.telefono && (
                                                            <button
                                                                type="button"
                                                                disabled={loading}
                                                                onClick={() => handleSendNotification(m.id)}
                                                                className="p-1.5 bg-slate-50 border border-slate-200 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                                                title="Notificar por WhatsApp"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (confirm('¿Eliminar esta sesión de mantenimiento?')) {
                                                                    setLoading(true);
                                                                    const res = await eliminarMantenimiento(m.id);
                                                                    if (res.success) {
                                                                        toast.success('Mantenimiento eliminado');
                                                                        setMantenimientos(prev => prev.filter(x => x.id !== m.id));
                                                                    } else {
                                                                        toast.error(res.error || 'Error al eliminar');
                                                                    }
                                                                    setLoading(false);
                                                                }
                                                            }}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 cursor-pointer"
                                                            title="Eliminar registro"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: EQUIPOS DE CLIENTES */}
            {activeTab === 'equipos' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-lg">Catálogo de Equipos y Dispositivos de Clientes</h3>
                            <p className="text-slate-400 text-xs mt-1">Listado general de equipos en garantía (ventas) y equipos de climatización u otros de terceros.</p>
                        </div>
                        <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                            {filteredEquipos.length} equipos registrados
                        </span>
                    </div>

                    {filteredEquipos.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                            <Tag className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                            <h4 className="font-bold text-slate-700 text-sm">No se encontraron equipos</h4>
                            <p className="text-slate-400 text-xs mt-1">Registra un nuevo equipo externo o refina la búsqueda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredEquipos.map(eq => {
                                const tieneGarantiaActiva = eq.fechaVencimientoGarantia && new Date(eq.fechaVencimientoGarantia) > today;
                                return (
                                    <div
                                        key={eq.id}
                                        onClick={() => setSelectedEquipo(eq)}
                                        className="group bg-white p-5 rounded-2xl border border-slate-250 hover:border-indigo-400/50 shadow-sm relative transition-all hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[200px]"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cliente / Propietario</span>
                                                    <div className="font-bold text-slate-800 text-xs truncate max-w-[200px]">{eq.cliente.nombre}</div>
                                                </div>
                                                {eq.codigoEtiqueta && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-50 border border-indigo-150 text-indigo-700">
                                                        <Tag className="w-3 h-3 shrink-0" />
                                                        {eq.codigoEtiqueta}
                                                    </span>
                                                )}
                                            </div>

                                            <h4 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-indigo-650 transition-colors mt-2">
                                                {eq.nombre}
                                            </h4>

                                            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-medium text-slate-500">
                                                {eq.marca && <div>Marca: <span className="text-slate-700 font-semibold">{eq.marca}</span></div>}
                                                {eq.modelo && <div>Modelo: <span className="text-slate-700 font-semibold">{eq.modelo}</span></div>}
                                                {eq.serie && <div className="col-span-2">Serie: <span className="text-slate-700 font-mono text-xs">{eq.serie}</span></div>}
                                            </div>

                                            {/* Free maintenances bar if applicable */}
                                            {eq.mantenimientosGratisTotales > 0 && (
                                                <div className="mt-4 pt-3 border-t border-slate-100">
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                        <span>Mants. Gratis Garantía</span>
                                                        <span className="text-indigo-700">{eq.mantenimientosGratisRealizados} / {eq.mantenimientosGratisTotales}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                                                            style={{ width: `${(eq.mantenimientosGratisRealizados / eq.mantenimientosGratisTotales) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                            {eq.fechaVencimientoGarantia ? (
                                                <div className="flex items-center gap-1 text-[11px]">
                                                    <Shield className={`w-3.5 h-3.5 ${tieneGarantiaActiva ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                    <span className={tieneGarantiaActiva ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                                                        {tieneGarantiaActiva ? 'Garantía Activa' : 'Garantía Vencida'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">Sin garantía</span>
                                            )}
                                            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-0.5">
                                                Ver Historial <ChevronRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: CONFIGURACIÓN */}
            {activeTab === 'config' && (
                <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in">
                    <h3 className="font-extrabold text-slate-900 text-lg border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-500" />
                        Configuración de Garantías y Notificaciones
                    </h3>

                    <form onSubmit={handleSaveConfig} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Días de Anticipación para WhatsApp</label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-150 outline-none focus:border-indigo-600 font-bold text-slate-800"
                                value={currentConfig.notificarDias}
                                onChange={(e) => setCurrentConfig(p => ({ ...p, notificarDias: parseInt(e.target.value) || 5 }))}
                            />
                            <p className="text-[11px] text-slate-400 font-semibold mt-1.5 ml-1">
                                Establece cuántos días antes de la fecha programada del mantenimiento se dispararán las alertas en el Dashboard y la API automática.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">WhatsApp Template SID (Twilio)</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-150 outline-none focus:border-indigo-600 font-mono font-bold text-slate-800"
                                value={currentConfig.whatsappTemplateSid}
                                onChange={(e) => setCurrentConfig(p => ({ ...p, whatsappTemplateSid: e.target.value }))}
                            />
                            <p className="text-[11px] text-slate-400 font-semibold mt-1.5 ml-1 leading-relaxed">
                                SID de plantilla de WhatsApp aprobada en Twilio Console. Si se mantiene la plantilla predeterminada (<code className="bg-slate-150 px-1 py-0.5 rounded font-bold font-mono">HXa363e371108b8cd13811d22b75ccbc74</code>), el sistema enviará un texto estructurado multipropósito.
                            </p>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                            <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-indigo-600" />
                                Automatización mediante Vercel Cron
                            </h4>
                            <p className="text-[11px] text-indigo-700 leading-relaxed font-semibold">
                                Puedes configurar un Cron Job automático que se ejecute a diario llamando a la API del sistema para disparar las notificaciones de WhatsApp sin intervención manual:
                            </p>
                            <div className="bg-slate-900 text-white rounded-lg p-2.5 font-mono text-[10px] select-all whitespace-pre-wrap leading-relaxed">
                                POST /api/mantenimientos/auto-notify
                                Authorization: Bearer CRON_SECRET
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </form>
                </div>
            )}

            {/* MODAL: REGISTRAR EQUIPO EXTERNO */}
            {isEquipoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                <Tag className="w-5 h-5 text-indigo-600" />
                                Registrar Equipo de Cliente
                            </h3>
                            <button onClick={() => setIsEquipoModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEquipo} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Cliente Propietario *</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-100 bg-white"
                                    value={newEquipo.clienteId}
                                    onChange={(e) => setNewEquipo(p => ({ ...p, clienteId: e.target.value }))}
                                >
                                    <option value="">-- Seleccionar Cliente --</option>
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre / Tipo de Equipo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Aire Acondicionado Split 18K BTU"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                                    value={newEquipo.nombre}
                                    onChange={(e) => setNewEquipo(p => ({ ...p, nombre: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Marca</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Carrier"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                                        value={newEquipo.marca}
                                        onChange={(e) => setNewEquipo(p => ({ ...p, marca: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 38HDC018"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                                        value={newEquipo.modelo}
                                        onChange={(e) => setNewEquipo(p => ({ ...p, modelo: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Número de Serie</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: SN-4991823"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                                        value={newEquipo.serie}
                                        onChange={(e) => setNewEquipo(p => ({ ...p, serie: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Código de Etiqueta (QR/Barra)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: AAC-0012"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 font-mono"
                                        value={newEquipo.codigoEtiqueta}
                                        onChange={(e) => setNewEquipo(p => ({ ...p, codigoEtiqueta: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Instalación</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 bg-white"
                                        value={newEquipo.fechaInstalacion}
                                        onChange={(e) => setNewEquipo(p => ({ ...p, fechaInstalacion: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Meses de Garantía</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 12"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                                        value={newEquipo.garantiaMeses}
                                        onChange={(e) => setNewEquipo(p => ({ ...p, garantiaMeses: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition text-xs shadow-md shadow-indigo-100 cursor-pointer"
                            >
                                {loading ? 'Registrando...' : 'Registrar Equipo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: PROGRAMAR MANTENIMIENTO MANUAL */}
            {isMantenimientoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                Programar Mantenimiento de Equipo
                            </h3>
                            <button onClick={() => setIsMantenimientoModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMantenimiento} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Equipo *</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-100 bg-white"
                                    value={newMantenimiento.equipoClienteId}
                                    onChange={(e) => setNewMantenimiento(p => ({ ...p, equipoClienteId: e.target.value }))}
                                >
                                    {equipos.map(eq => (
                                        <option key={eq.id} value={eq.id}>
                                            {eq.nombre.toUpperCase()} ({eq.cliente.nombre.toUpperCase()}) {eq.serie ? `- SN: ${eq.serie}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Programada *</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 bg-white"
                                        value={newMantenimiento.fechaProgramada}
                                        onChange={(e) => setNewMantenimiento(p => ({ ...p, fechaProgramada: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Servicio</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-100 bg-white"
                                        value={newMantenimiento.tipo}
                                        onChange={(e) => setNewMantenimiento(p => ({ ...p, tipo: e.target.value }))}
                                    >
                                        <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                                        <option value="CORRECTIVO">Mantenimiento Correctivo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Costo Estimado (L.)</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 1500"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                                        value={newMantenimiento.costo}
                                        onChange={(e) => setNewMantenimiento(p => ({ ...p, costo: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Técnico Asignado</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-100 bg-white"
                                        value={newMantenimiento.realizadoPorId}
                                        onChange={(e) => setNewMantenimiento(p => ({ ...p, realizadoPorId: e.target.value }))}
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        {usuarios.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {[u.nombre, u.apellido].filter(Boolean).join(" ").toUpperCase()} ({u.puesto || u.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Instrucciones</label>
                                <textarea
                                    placeholder="¿Qué revisiones se deben realizar?"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 h-16 resize-none"
                                    value={newMantenimiento.notas}
                                    onChange={(e) => setNewMantenimiento(p => ({ ...p, notas: e.target.value }))}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition text-xs shadow-md shadow-indigo-100 cursor-pointer"
                            >
                                {loading ? 'Programando...' : 'Programar Mantenimiento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: REGISTRAR MANTENIMIENTO REALIZADO */}
            {isRealizarModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                Registrar Mantenimiento Realizado
                            </h3>
                            <button onClick={() => setIsRealizarModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRealizarMantenimiento} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Realización *</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 bg-white"
                                        value={realizarData.fechaRealizada}
                                        onChange={(e) => setRealizarData(p => ({ ...p, fechaRealizada: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Técnico Ejecutor</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-100 bg-white"
                                        value={realizarData.realizadoPorId}
                                        onChange={(e) => setRealizarData(p => ({ ...p, realizadoPorId: e.target.value }))}
                                    >
                                        <option value="">-- Seleccionar Técnico --</option>
                                        {usuarios.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {[u.nombre, u.apellido].filter(Boolean).join(" ").toUpperCase()} ({u.puesto || u.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Costo Real de Mano de Obra / Repuestos (L.)</label>
                                <input
                                    type="number"
                                    placeholder="Ej: 1200"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
                                    value={realizarData.costo}
                                    onChange={(e) => setRealizarData(p => ({ ...p, costo: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Reporte / Observaciones Técnicas *</label>
                                <textarea
                                    required
                                    placeholder="¿Qué servicio se realizó? Detalla repuestos cambiados, condiciones finales del equipo, etc."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 h-24 resize-none"
                                    value={realizarData.notas}
                                    onChange={(e) => setRealizarData(p => ({ ...p, notas: e.target.value }))}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition text-xs shadow-md shadow-emerald-100 cursor-pointer"
                            >
                                {loading ? 'Guardando...' : 'Completar Mantenimiento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* PANEL LATERAL: HISTORIAL / DETALLES DE UN EQUIPO */}
            {selectedEquipo && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedEquipo(null)}>
                    <div
                        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="px-6 py-5 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Historial de Mantenimientos</span>
                                <h3 className="font-extrabold text-slate-800 text-base truncate max-w-[350px]">{selectedEquipo.nombre}</h3>
                            </div>
                            <button onClick={() => setSelectedEquipo(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Metadata overview */}
                            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Marca / Modelo</span>
                                        <span className="font-bold text-slate-850">{selectedEquipo.marca || 'N/A'} {selectedEquipo.modelo ? `/ ${selectedEquipo.modelo}` : ''}</span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">N° de Serie</span>
                                        <span className="font-mono text-slate-800 font-semibold">{selectedEquipo.serie || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Código Etiqueta (QR)</span>
                                        <span className="font-mono text-indigo-700 font-bold flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            {selectedEquipo.codigoEtiqueta || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Propietario</span>
                                        <span className="font-bold text-slate-850 truncate block" title={selectedEquipo.cliente.nombre}>
                                            {selectedEquipo.cliente.nombre}
                                        </span>
                                    </div>
                                    <div className="col-span-2 border-t border-slate-200/50 pt-2 flex items-center justify-between">
                                        <div>
                                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Garantía Vence</span>
                                            <span className="font-semibold text-slate-700">
                                                {selectedEquipo.fechaVencimientoGarantia
                                                    ? new Date(selectedEquipo.fechaVencimientoGarantia).toLocaleDateString()
                                                    : 'Sin Garantía'}
                                            </span>
                                        </div>
                                        {selectedEquipo.mantenimientosGratisTotales > 0 && (
                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-100">
                                                Garantía Gratis: {selectedEquipo.mantenimientosGratisRealizados}/{selectedEquipo.mantenimientosGratisTotales}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline of maintenance */}
                            <div className="space-y-4">
                                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                    <Activity className="w-4.5 h-4.5 text-indigo-650" />
                                    Línea de Tiempo del Equipo
                                </h4>

                                {mantenimientos.filter(m => m.equipoClienteId === selectedEquipo.id).length === 0 ? (
                                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs italic">
                                        No hay mantenimientos registrados ni programados para este equipo.
                                    </div>
                                ) : (
                                    <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-5">
                                        {mantenimientos
                                            .filter(m => m.equipoClienteId === selectedEquipo.id)
                                            .map((m, mIdx) => {
                                                const isCompleted = m.estado === 'REALIZADO';
                                                return (
                                                    <div key={m.id} className="relative">
                                                        {/* Dot marker */}
                                                        <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 bg-white ${
                                                            isCompleted ? 'border-green-500' : 'border-indigo-600 animate-pulse'
                                                        }`} />

                                                        <div className="bg-slate-50 hover:bg-slate-100/50 border border-slate-150 rounded-xl p-3.5 space-y-2 transition-colors">
                                                            <div className="flex items-center justify-between text-[10px] font-bold">
                                                                <span className="text-slate-400">
                                                                    {new Date(m.fechaProgramada).toLocaleDateString('es-HN', {
                                                                        day: '2-digit',
                                                                        month: 'long',
                                                                        year: 'numeric'
                                                                    })}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded text-[8px] border uppercase ${
                                                                    isCompleted ? 'bg-green-50 text-green-700 border-green-150' : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                                                                }`}>
                                                                    {isCompleted ? 'Realizado' : 'Programado'}
                                                                </span>
                                                            </div>

                                                            <div className="text-xs font-bold text-slate-800 flex justify-between">
                                                                <span>{m.tipo === 'GARANTIA' ? 'Mantenimiento de Garantía Gratis' : m.tipo}</span>
                                                                {m.costo && <span className="text-slate-900 font-black">L. {m.costo}</span>}
                                                            </div>

                                                            {m.notas && (
                                                                <p className="text-[10px] text-slate-500 italic bg-white border border-slate-100 p-2 rounded-lg leading-relaxed whitespace-pre-wrap">
                                                                    {m.notas}
                                                                </p>
                                                            )}

                                                            {m.realizadoPor && (
                                                                <div className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5 pt-1">
                                                                    <User className="w-3.5 h-3.5 stroke-[2.2]" />
                                                                    Téc. {m.realizadoPor.nombre} {m.realizadoPor.apellido}
                                                                </div>
                                                            )}

                                                            {m.notificado && (
                                                                <div className="text-[8px] font-bold text-emerald-700 bg-emerald-50 w-fit px-1.5 py-0.5 rounded border border-emerald-100 mt-1">
                                                                    Mensaje WhatsApp Enviado
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => handleDeleteEquipo(selectedEquipo.id)}
                                className="text-red-605 hover:text-red-700 hover:bg-red-50 px-3 py-2 border border-transparent hover:border-red-100 rounded-xl transition flex items-center gap-1 font-bold text-xs cursor-pointer active:scale-95"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPrintModalOpen(true)}
                                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 px-3 py-2 rounded-xl font-bold transition text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                    <Printer className="w-4 h-4" />
                                    Imprimir QR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewMantenimiento(p => ({ ...p, equipoClienteId: selectedEquipo.id }));
                                        setIsMantenimientoModalOpen(true);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-750 text-white px-3.5 py-2 rounded-xl font-bold transition text-xs shadow-sm shadow-indigo-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Programar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isPrintModalOpen && selectedEquipo && (
                <PreviewEtiquetaEquipoModal
                    equipo={selectedEquipo}
                    onClose={() => setIsPrintModalOpen(false)}
                />
            )}
        </div>
    );
}
