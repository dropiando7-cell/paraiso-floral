'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Wrench, Plus, MoveRight, Receipt, 
    CheckCircle2, QrCode, Phone, Clock, AlertTriangle, MonitorSmartphone,
    Trash2, AlertCircle, Search, Archive, Laptop, UserPlus, ChevronDown, 
    ChevronRight, Filter, FolderPlus, BookOpen, FileText, LayoutGrid, 
    FolderArchive, Printer, Building2, ClipboardList, Trello, Pencil, Loader2
} from 'lucide-react';
import { eliminarOrdenTrabajo, crearEquipoClienteAction, crearClienteAction, editarActivoSimple, eliminarActivoSimple } from './actions';
import { toast } from 'react-hot-toast';

type Orden = any; // Tipado parcial
type Cliente = any;
type ActivoFijo = any;

const COLUMNAS = [
    { id: 'RECIBIDO', title: 'Recibidos', color: 'border-slate-500', bg: 'bg-slate-50 text-slate-700', textClass: 'text-slate-700' },
    { id: 'EN_EVALUACION', title: 'En Evaluación', color: 'border-yellow-500', bg: 'bg-yellow-50 text-yellow-700', textClass: 'text-yellow-750' },
    { id: 'ESPERANDO_APROBACION', title: 'Presupuesto', color: 'border-orange-500', bg: 'bg-orange-50 text-orange-700', textClass: 'text-orange-700' },
    { id: 'APROBACION_PRESUPUESTO', title: 'Aprobación Cliente', color: 'border-pink-500', bg: 'bg-pink-50 text-pink-700', textClass: 'text-pink-700' },
    { id: 'REPARACION', title: 'En Reparación', color: 'border-blue-500', bg: 'bg-blue-50 text-blue-700', textClass: 'text-blue-750' },
    { id: 'LISTO_ENTREGA', title: 'Reparado / Listo', color: 'border-green-500', bg: 'bg-green-50 text-green-700', textClass: 'text-green-750' },
];

export default function SoporteClient({ 
    initialData,
    deliveredData = [],
    clientes = [],
    activosClientes = [],
    userRole = 'USER',
    customRoleName = '',
    accessibleModules = [],
    userId
}: { 
    initialData: Orden[],
    deliveredData?: Orden[],
    clientes?: Cliente[],
    activosClientes?: ActivoFijo[],
    userRole?: string,
    customRoleName?: string,
    accessibleModules?: string[],
    userId?: string
}) {
    const router = useRouter();
    const [ordenes, setOrdenes] = useState<Orden[]>(initialData);
    const [entregadas, setEntregadas] = useState<Orden[]>(deliveredData);
    const [equiposClientes, setEquiposClientes] = useState<ActivoFijo[]>(activosClientes);
    const [activeView, setActiveView] = useState<'centro' | 'taller' | 'equipos' | 'registro' | 'historial'>('centro');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Vista móvil del taller
    const [columnaMovilSeleccionada, setColumnaMovilSeleccionada] = useState('RECIBIDO');

    // Estado del modal de registro de equipo de cliente
    const [clientesList, setClientesList] = useState<Cliente[]>(clientes);
    const [isEquipoModalOpen, setIsEquipoModalOpen] = useState(false);
    const [newEquipoData, setNewEquipoData] = useState({
        clienteId: '',
        nombre: '',
        marca: '',
        modelo: '',
        serie: '',
        idQr: '',
        observaciones: ''
    });

    // Estado del modal de registro de cliente
    const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
    const [newClienteData, setNewClienteData] = useState({
        nombre: '',
        rtn: '',
        telefono: '',
        email: '',
        direccion: '',
        notas: '',
        nombreContacto: '',
        telefonoContacto: ''
    });

    // Control de acordeón de clientes en el directorio
    const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);

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

    const filterEquiposBySearch = (list: ActivoFijo[]) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase().trim();
        return list.filter(e => 
            e.descripcionCorta?.toLowerCase().includes(q) ||
            e.marca?.toLowerCase().includes(q) ||
            e.modelo?.toLowerCase().includes(q) ||
            e.serie?.toLowerCase().includes(q) ||
            e.idQr?.toLowerCase().includes(q) ||
            e.cliente?.nombre?.toLowerCase().includes(q)
        );
    };

    const activeTallerOrdenes = ordenes.filter(o => o.estado !== 'REGISTRO');
    const registroOrdenes = ordenes.filter(o => o.estado === 'REGISTRO');

    const activeFiltered = filterBySearch(activeTallerOrdenes);
    const registroFiltered = filterBySearch(registroOrdenes);
    const deliveredFiltered = filterBySearch(entregadas);
    const equiposFiltered = filterEquiposBySearch(equiposClientes);

    const role = userRole;
    const canDeleteOrder = role === 'SUPER_ADMIN' || accessibleModules.includes('eliminar_ordenes');
    const canEditEquipo = role === 'SUPER_ADMIN' || accessibleModules.includes('editar_equipos');
    const canDeleteEquipo = role === 'SUPER_ADMIN' || accessibleModules.includes('eliminar_equipos');

    const [editingActivo, setEditingActivo] = useState<any | null>(null);
    const [editNombre, setEditNombre] = useState('');
    const [editMarca, setEditMarca] = useState('');
    const [editModelo, setEditModelo] = useState('');
    const [editSerie, setEditSerie] = useState('');
    const [editObservaciones, setEditObservaciones] = useState('');
    const [isSavingActivo, setIsSavingActivo] = useState(false);

    const [activeOrderModal, setActiveOrderModal] = useState<{
        isOpen: boolean;
        equipment: any | null;
        order: any | null;
    }>({
        isOpen: false,
        equipment: null,
        order: null
    });

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

    const handleCreateEquipoCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEquipoData.clienteId || !newEquipoData.nombre) {
            toast.error("Por favor completa los campos obligatorios (*).");
            return;
        }

        setLoading(true);
        try {
            const res = await crearEquipoClienteAction({
                ...newEquipoData,
                createdById: userId
            });

            if (res.success) {
                toast.success("Equipo de cliente registrado con éxito.");
                // Actualizar estado local
                const newAsset = {
                    ...res.asset,
                    cliente: clientesList.find(c => c.id === newEquipoData.clienteId),
                    ordenesTrabajo: []
                };
                setEquiposClientes(prev => [newAsset, ...prev]);
                // Reset form
                setNewEquipoData({
                    clienteId: '',
                    nombre: '',
                    marca: '',
                    modelo: '',
                    serie: '',
                    idQr: '',
                    observaciones: ''
                });
                setIsEquipoModalOpen(false);
            } else {
                toast.error(res.error || "No se pudo registrar el equipo.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error al registrar el equipo.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClienteData.nombre) {
            toast.error("Por favor ingresa el nombre del cliente.");
            return;
        }

        setLoading(true);
        try {
            const res = await crearClienteAction(newClienteData);

            if (res.success && res.cliente) {
                toast.success("Cliente registrado exitosamente.");
                const newCli = res.cliente;
                setClientesList(prev => [...prev, newCli].sort((a, b) => a.nombre.localeCompare(b.nombre)));
                
                // Pre-seleccionar el cliente creado
                setNewEquipoData(p => ({ ...p, clienteId: newCli.id }));
                
                // Reset form
                setNewClienteData({
                    nombre: '',
                    rtn: '',
                    telefono: '',
                    email: '',
                    direccion: '',
                    notas: '',
                    nombreContacto: '',
                    telefonoContacto: ''
                });
                setIsClienteModalOpen(false);
            } else {
                toast.error(res.error || "No se pudo registrar el cliente.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error al registrar el cliente.");
        } finally {
            setLoading(false);
        }
    };

    // Agrupar equipos por cliente
    const clientesConEquipos = clientesList.map(cli => {
        const eqDeCliente = equiposFiltered.filter(eq => eq.clienteId === cli.id);
        return {
            ...cli,
            equipos: eqDeCliente
        };
    }).filter(cli => cli.equipos.length > 0);

    const handleEditActivo = (activo: any) => {
        setEditingActivo(activo);
        setEditNombre(activo.descripcionCorta || '');
        setEditMarca(activo.marca || '');
        setEditModelo(activo.modelo || '');
        setEditSerie(activo.serie || '');
        setEditObservaciones(activo.observaciones || '');
    };

    const handleSaveActivo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingActivo) return;
        setIsSavingActivo(true);
        try {
            const res = await editarActivoSimple(editingActivo.id, {
                descripcionCorta: editNombre,
                marca: editMarca,
                modelo: editModelo,
                serie: editSerie,
                observaciones: editObservaciones
            });
            if (res.success) {
                toast.success('Equipo editado exitosamente.');
                setEquiposClientes(prev => prev.map(eq => eq.id === editingActivo.id ? {
                    ...eq,
                    descripcionCorta: editNombre,
                    marca: editMarca,
                    modelo: editModelo,
                    serie: editSerie,
                    observaciones: editObservaciones
                } : eq));
                setEditingActivo(null);
            } else {
                toast.error(res.error || 'Error al editar equipo.');
            }
        } catch (err) {
            toast.error('Error de conexión.');
        } finally {
            setIsSavingActivo(false);
        }
    };

    const handleDeleteActivo = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este equipo? Se desvinculará de las facturas y órdenes de trabajo asociadas.')) return;
        try {
            const res = await eliminarActivoSimple(id);
            if (res.success) {
                toast.success('Equipo eliminado exitosamente.');
                setEquiposClientes(prev => prev.filter(eq => eq.id !== id));
            } else {
                toast.error(res.error || 'Error al eliminar equipo.');
            }
        } catch (err) {
            toast.error('Error de conexión.');
        }
    };

    return (
        <div className="px-0 py-4 md:p-8 max-w-[1600px] mx-auto relative min-h-screen">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 px-4 md:px-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <Wrench className="w-8 h-8 text-blue-600 animate-spin-slow" />
                        Soporte Técnico y Taller
                    </h1>
                    <p className="text-slate-500 mt-2 text-base font-medium">
                        Unificado con Proyectos, Tareas e Historial de Mantenimientos por QR.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => router.push('/kanban')}
                        className="flex-1 sm:flex-initial bg-white border-2 border-slate-200 hover:border-indigo-650 hover:text-indigo-600 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Trello className="w-4 h-4 text-indigo-500" />
                        Proyectos y Tareas
                    </button>
                    <button
                        onClick={() => router.push('/inventario?register=equipo_cliente')}
                        className="flex-1 sm:flex-initial bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Laptop className="w-4 h-4" />
                        Registrar Equipo Externo
                    </button>
                    <button
                        onClick={() => router.push('/soporte/nuevo')}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer shadow-blue-150"
                    >
                        <Plus className="w-5 h-5" />
                        Recepcionar Equipo
                    </button>
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex flex-col gap-4 mb-8 px-4 md:px-0">
                <div className="flex overflow-x-auto gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0 w-fit max-w-full no-scrollbar">
                    <button
                        onClick={() => { setActiveView('centro'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeView === 'centro'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Centro de Operaciones</span>
                    </button>
                    <button
                        onClick={() => { setActiveView('taller'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeView === 'taller'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        <span>Taller Activo ({activeTallerOrdenes.length})</span>
                    </button>
                    <button
                        onClick={() => { setActiveView('equipos'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeView === 'equipos'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <Building2 className="w-4 h-4" />
                        <span>Equipos de Clientes ({equiposClientes.length})</span>
                    </button>
                    <button
                        onClick={() => { setActiveView('registro'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeView === 'registro'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <Archive className="w-4 h-4" />
                        <span>Registro de Equipos ({registroOrdenes.length})</span>
                    </button>
                    <button
                        onClick={() => { setActiveView('historial'); setSearchQuery(''); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeView === 'historial'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Entregas ({entregadas.length})</span>
                    </button>
                </div>

                {/* Buscador Contextual */}
                {activeView !== 'centro' && (
                    <div className="relative w-full max-w-lg">
                        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={activeView === 'equipos' ? "Buscar por marca, modelo, serie o cliente..." : "Buscar por código, serie, equipo o cliente..."}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* VISTA 1: CENTRO DE OPERACIONES (Dashboard Principal responsivo) */}
            {activeView === 'centro' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0 animate-fade-in">
                    
                    {/* Card 1: Recepcionar Equipo */}
                    <div 
                        onClick={() => router.push('/soporte/nuevo?tipo=TALLER&requiereAprobacion=true')}
                        className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg shadow-blue-100 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between h-[200px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-[10px] bg-white/20 text-white font-bold uppercase px-2.5 py-1 rounded-full border border-white/15">
                                Flujo de Taller
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight mt-4">Recepcionar Equipo</h3>
                            <p className="text-xs text-white/80 mt-1.5 leading-relaxed font-medium">
                                Registrar ingreso físico para reparaciones, evaluaciones o garantías con presupuesto.
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Trabajo Expreso / Tarea */}
                    <div 
                        onClick={() => router.push('/soporte/nuevo?tipo=DIRECTO&requiereAprobacion=false')}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between h-[200px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-amber-600">
                                <FolderPlus className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold uppercase px-2.5 py-1 rounded-full border border-amber-200">
                                Directo / Sin Cotizar
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Nueva Tarea de Servicio</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                                Crear orden directa para instalaciones, contratos o preventivos sin evaluación comercial.
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Proyectos y Tareas (Kanban) */}
                    <div 
                        onClick={() => router.push('/kanban')}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-indigo-400 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between h-[200px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 text-indigo-600">
                                <Trello className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold uppercase px-2.5 py-1 rounded-full border border-indigo-200">
                                Tareas
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Proyectos y Tareas</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                                Gestiona el tablero Kanban general, asigna tareas y consulta diagramas de avance del equipo.
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Taller Activo */}
                    <div 
                        onClick={() => setActiveView('taller')}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-indigo-400 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between h-[200px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 text-indigo-600">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold uppercase px-2.5 py-1 rounded-full border border-indigo-200">
                                Tablero
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Ver Tablero de Taller</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                                Supervisa el estado de reparación de los equipos en las diferentes fases físicas y presupuestos.
                            </p>
                        </div>
                    </div>

                    {/* Card 5: Directorio Equipos Cliente */}
                    <div 
                        onClick={() => setActiveView('equipos')}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between h-[200px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-blue-600">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold uppercase px-2.5 py-1 rounded-full border border-blue-200">
                                Clientes
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Equipos por Cliente</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                                Listado completo de clientes externos con sus autoclaves, UPS, aires acondicionados y su respectivo historial.
                            </p>
                        </div>
                    </div>

                    {/* Card 6: Registrar Activo Cliente */}
                    <div 
                        onClick={() => router.push('/inventario?register=equipo_cliente')}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-emerald-400 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between h-[200px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-emerald-600">
                                <UserPlus className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                                Registro
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Registrar Equipo Externo</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                                Da de alta un nuevo equipo de cliente en el sistema para asociarlo a futuros mantenimientos y códigos QR.
                            </p>
                        </div>
                    </div>

                </div>
            )}

            {/* VISTA 2: TABLERO DE TALLER (Kanban adaptado a pantallas móviles) */}
            {activeView === 'taller' && (
                <div className="animate-fade-in">
                    
                    {/* Selector de columna para pantallas móviles */}
                    <div className="block lg:hidden px-4 mb-4">
                        <label className="text-xs font-bold text-slate-500 block mb-1">Filtrar por Fase física:</label>
                        <div className="relative">
                            <select
                                value={columnaMovilSeleccionada}
                                onChange={(e) => setColumnaMovilSeleccionada(e.target.value)}
                                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 appearance-none outline-none"
                            >
                                {COLUMNAS.map(col => {
                                    const itemsCount = activeFiltered.filter(o => {
                                        if (col.id === 'EN_EVALUACION') return o.estado === 'EN_EVALUACION' || o.estado === 'EN_DIAGNOSTICO';
                                        if (col.id === 'REPARACION') return o.estado === 'REPARACION' || o.estado === 'EN_REPARACION';
                                        return o.estado === col.id;
                                    }).length;
                                    return (
                                        <option key={col.id} value={col.id}>
                                            {col.title} ({itemsCount})
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Contenedor Desktop/Mobile */}
                    <div className="overflow-x-auto pb-4 px-4 md:px-0">
                        {/* Desktop: Vista horizontal. Mobile: Ocultar y renderizar sólo la columna seleccionada */}
                        <div className="flex gap-4 lg:min-w-[1200px] flex-col lg:flex-row">
                            
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

                                // En móviles, ocultamos las columnas no seleccionadas
                                const isMobileHidden = columnaMovilSeleccionada !== col.id;

                                return (
                                    <div 
                                        key={col.id} 
                                        className={`flex-1 min-w-[300px] bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col ${
                                            isMobileHidden ? 'hidden lg:flex' : 'flex'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className={`text-xs font-black uppercase tracking-wider ${col.bg} px-3 py-1.5 rounded-full border ${col.color}`}>
                                                {col.title} ({items.length})
                                            </h3>
                                        </div>
                                        <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[650px] custom-scrollbar">
                                            {items.length === 0 ? (
                                                <div className="text-center py-10 text-slate-400 text-xs font-semibold border-2 border-dashed border-slate-200 rounded-2xl bg-white/40">
                                                    No hay equipos en esta fase
                                                </div>
                                            ) : (
                                                items.map(orden => (
                                                    <div 
                                                        key={orden.id} 
                                                        onClick={() => router.push(`/soporte/${orden.id}`)} 
                                                        className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative transition-all hover:shadow-md cursor-pointer hover:border-blue-400 flex flex-col justify-between"
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                                                    #{orden.codigoSeguridad}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span suppressHydrationWarning className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
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
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mt-1">
                                                                <MonitorSmartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                                {orden.equipoDano}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-450 mt-1 max-w-[250px] truncate">
                                                                Cliente: <span className="text-slate-700">{orden.cliente?.nombre}</span>
                                                            </div>
                                                            
                                                            {orden.activo && (
                                                                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-emerald-650 bg-emerald-50/50 border border-emerald-100 rounded px-1.5 py-0.5 w-fit">
                                                                    <QrCode className="w-2.5 h-2.5" />
                                                                    QR: {orden.activo.idQr}
                                                                </div>
                                                            )}

                                                            {orden.tipoOrden && orden.tipoOrden !== 'TALLER' && (
                                                                <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-purple-650 bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5 w-fit">
                                                                    Servicio: {orden.tipoOrden}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {(orden.costoReparacion || orden.costoRevision) && (
                                                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-3 text-[10px] font-bold">
                                                                <div><span className="text-slate-400">Rev:</span> <span className="text-slate-700">L. {orden.costoRevision}</span></div>
                                                                {orden.costoReparacion > 0 && (
                                                                    <div><span className="text-blue-500">Rep:</span> <span className="text-slate-800">L. {orden.costoReparacion}</span></div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                                    {orden.tecnicosAsignados && orden.tecnicosAsignados.length > 0 ? (
                                                                        orden.tecnicosAsignados.slice(0, 3).map((u: any) => {
                                                                            const initials = u.nombre
                                                                                ? u.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                                                                : '?';
                                                                            return (
                                                                                <div
                                                                                    key={u.id}
                                                                                    className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white bg-blue-50 border border-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700 uppercase overflow-hidden relative shrink-0"
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
                                                                        <div className="h-5.5 w-5.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] text-slate-400 font-bold" title="Sin asignar">
                                                                            ?
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="truncate max-w-[110px] text-[10px] font-semibold text-slate-500">
                                                                    {orden.tecnicosAsignados && orden.tecnicosAsignados.length > 0
                                                                        ? (orden.tecnicosAsignados.length === 1 ? orden.tecnicosAsignados[0].nombre : `${orden.tecnicosAsignados.length} asig.`)
                                                                        : 'Sin asignar'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-600 transition-colors uppercase">Ver Detalles</span>
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
                </div>
            )}

            {/* VISTA 3: EQUIPOS DE CLIENTES (Directorio) */}
            {activeView === 'equipos' && (
                <div className="px-4 md:px-0 animate-fade-in">
                    
                    {equiposClientes.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-16 text-center">
                            <Laptop className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-bounce" />
                            <h3 className="font-extrabold text-slate-800 text-base">No hay equipos de clientes externos</h3>
                            <p className="text-slate-400 text-xs mt-1 leading-normal font-medium mb-6">
                                Aún no has registrado ningún equipo propio de clientes externos.
                            </p>
                            <button
                                onClick={() => router.push('/inventario?register=equipo_cliente')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition active:scale-95"
                            >
                                Registrar Primer Equipo
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            
                            {/* Bucle agrupado por clientes */}
                            {clientesConEquipos.map(cli => {
                                const isExpanded = expandedClienteId === cli.id;
                                return (
                                    <div key={cli.id} className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden transition-all hover:border-slate-300">
                                        
                                        {/* Cabecera del Cliente */}
                                        <div 
                                            onClick={() => setExpandedClienteId(isExpanded ? null : cli.id)}
                                            className="px-5 py-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-800 text-xs tracking-tight">{cli.nombre}</h3>
                                                    <p className="text-[10px] text-slate-450 font-semibold">
                                                        {cli.equipos.length} {cli.equipos.length === 1 ? 'equipo registrado' : 'equipos registrados'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {cli.telefono && (
                                                    <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        {cli.telefono}
                                                    </span>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Listado de equipos de este cliente */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-100 p-4 bg-white">
                                                {cli.equipos.length === 0 ? (
                                                    <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                                                        No hay equipos registrados que coincidan.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {cli.equipos.map((eq: any) => (
                                                            <div 
                                                                key={eq.id}
                                                                className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 hover:shadow-sm transition-all"
                                                            >
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                            QR: {eq.idQr}
                                                                        </span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            {eq.ordenesTrabajo && eq.ordenesTrabajo.some((o: any) => o.estado !== 'ENTREGADO' && o.estado !== 'REGISTRO') && (
                                                                                <span className="text-[8px] bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded px-1.5 py-0.5 mr-1">
                                                                                    En Taller
                                                                                </span>
                                                                            )}
                                                                            {canEditEquipo && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleEditActivo(eq);
                                                                                    }}
                                                                                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition cursor-pointer"
                                                                                    title="Editar equipo"
                                                                                >
                                                                                    <Pencil className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                            {canDeleteEquipo && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteActivo(eq.id);
                                                                                    }}
                                                                                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-650 rounded transition cursor-pointer"
                                                                                    title="Eliminar equipo"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                                                                        <MonitorSmartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                                        {eq.descripcionCorta}
                                                                    </h4>
                                                                    <div className="space-y-1 mt-2 text-[10px] text-slate-500 font-bold">
                                                                        {eq.marca && <div>Marca: <span className="text-slate-800">{eq.marca}</span></div>}
                                                                        {eq.modelo && <div>Modelo: <span className="text-slate-800">{eq.modelo}</span></div>}
                                                                        {eq.serie && <div>Serie: <span className="text-slate-700 font-mono text-[9px]">{eq.serie}</span></div>}
                                                                        {eq.observaciones && <div className="line-clamp-2 text-slate-450 mt-1 font-medium italic">"{eq.observaciones}"</div>}
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                                                    <button
                                                                        onClick={() => router.push(`/ficha-tecnica/${eq.idQr}`)}
                                                                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-lg text-[10px] border border-slate-200 transition text-center cursor-pointer"
                                                                    >
                                                                        Ficha / Historial
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const activeOrder = eq.ordenesTrabajo?.find((o: any) => o.estado !== 'ENTREGADO' && o.estado !== 'REGISTRO');
                                                                            if (activeOrder) {
                                                                                setActiveOrderModal({ isOpen: true, equipment: eq, order: activeOrder });
                                                                            } else {
                                                                                router.push(`/soporte/nuevo?activoId=${eq.id}&clienteId=${cli.id}&clienteNombre=${encodeURIComponent(cli.nombre)}&equipoDano=${encodeURIComponent(eq.descripcionCorta)}&marca=${encodeURIComponent(eq.marca || '')}&modelo=${encodeURIComponent(eq.modelo || '')}&serie=${encodeURIComponent(eq.serie || '')}`);
                                                                            }
                                                                        }}
                                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-[10px] transition text-center cursor-pointer"
                                                                    >
                                                                        Crear ODT
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 4: REGISTRO HISTÓRICO */}
            {activeView === 'registro' && (
                <div className="animate-fade-in px-4 md:px-0">
                    {registroFiltered.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-16 text-center">
                            <Archive className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-extrabold text-slate-800 text-base">No hay equipos registrados</h3>
                            <p className="text-slate-450 text-xs mt-1 leading-normal font-medium">
                                Aún no se han movido equipos al registro histórico.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {registroFiltered.map(orden => (
                                <div 
                                    key={orden.id} 
                                    onClick={() => router.push(`/soporte/${orden.id}`)}
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative transition-all hover:shadow-lg hover:border-indigo-350 cursor-pointer flex flex-col justify-between min-h-[180px]"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3.5">
                                            <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full uppercase">
                                                #{orden.codigoSeguridad}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded text-[9px] font-bold border border-indigo-100">
                                                    Registro Histórico
                                                </span>
                                                {canDeleteOrder && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEliminarOrden(orden.id, orden.codigoSeguridad);
                                                        }}
                                                        className="p-1 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all border border-transparent hover:border-red-600 cursor-pointer active:scale-95"
                                                        title="Eliminar Registro"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="font-extrabold text-slate-850 text-[13px] flex items-center gap-2 mb-1.5">
                                            <MonitorSmartphone className="w-4 h-4 text-indigo-500 shrink-0" />
                                            {orden.equipoDano}
                                        </h4>

                                        <div className="space-y-1 text-xs text-slate-500 font-bold">
                                            <div>Cliente: <span className="text-slate-800 font-semibold">{orden.cliente?.nombre || 'Desconocido'}</span></div>
                                            {orden.serie && <div>Serie: <span className="text-slate-700 font-mono text-[11px]">{orden.serie}</span></div>}
                                            {orden.marcaModelo && <div>Especificación: <span className="text-slate-650">{orden.marcaModelo}</span></div>}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Registrado: {orden.fechaRecibido ? new Date(orden.fechaRecibido).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors uppercase">
                                            Ver Detalles →
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 5: ENTREGADOS / COMPLETADOS */}
            {activeView === 'historial' && (
                <div className="animate-fade-in px-4 md:px-0">
                    {deliveredFiltered.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-16 text-center">
                            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-extrabold text-slate-800 text-base">No hay equipos entregados</h3>
                            <p className="text-slate-450 text-xs mt-1 leading-normal font-medium">
                                Aún no se han completado ni entregado órdenes de trabajo.
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
                                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
                                                #{orden.codigoSeguridad}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-green-50 text-green-800 px-2.5 py-0.5 rounded text-[9px] font-bold border border-green-150">
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

                                        <h4 className="font-extrabold text-slate-850 text-[13px] flex items-center gap-2 mb-1.5">
                                            <MonitorSmartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                                            {orden.equipoDano}
                                        </h4>

                                        <div className="space-y-1 text-xs text-slate-500 font-bold">
                                            <div>Cliente: <span className="text-slate-800 font-semibold">{orden.cliente?.nombre || 'Desconocido'}</span></div>
                                            {orden.serie && <div>Serie: <span className="text-slate-700 font-mono text-[11px]">{orden.serie}</span></div>}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                                    <p className="text-xs text-slate-550 leading-relaxed">
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

            {/* MODAL 2: REGISTRAR NUEVO CLIENTE (CONTACTO) */}
            {isClienteModalOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
                        
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-600" />
                                Registrar Nuevo Cliente / Contacto
                            </h3>
                            <button 
                                onClick={() => setIsClienteModalOpen(false)}
                                className="text-slate-400 hover:text-slate-650 text-sm font-bold bg-slate-100 hover:bg-slate-200 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCliente} className="p-6 overflow-y-auto space-y-4">
                            
                            {/* Nombre o Razón Social */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre o Empresa *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Hospital Bendaña S.A. o Juan Pérez"
                                    value={newClienteData.nombre}
                                    onChange={(e) => setNewClienteData(p => ({ ...p, nombre: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                />
                            </div>

                            {/* RTN y Teléfono */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">RTN (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 08011990123456"
                                        value={newClienteData.rtn}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, rtn: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. +504 9999-8888"
                                        value={newClienteData.telefono}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, telefono: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    placeholder="Ej. compras@hospital.hn"
                                    value={newClienteData.email}
                                    onChange={(e) => setNewClienteData(p => ({ ...p, email: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                />
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Dirección Completa</label>
                                <textarea
                                    rows={2}
                                    placeholder="Ej. Colonia Altamira, 12 Calle, San Pedro Sula"
                                    value={newClienteData.direccion}
                                    onChange={(e) => setNewClienteData(p => ({ ...p, direccion: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600 resize-none"
                                />
                            </div>

                            {/* Contacto Interno */}
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Persona de Contacto</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Ing. Carlos Aguilar"
                                        value={newClienteData.nombreContacto}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, nombreContacto: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono Contacto</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 9988-7766"
                                        value={newClienteData.telefonoContacto}
                                        onChange={(e) => setNewClienteData(p => ({ ...p, telefonoContacto: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-600"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsClienteModalOpen(false)}
                                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition active:scale-95 shadow-sm shadow-indigo-150 cursor-pointer"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL: EDITAR ESPECIFICACIONES DE EQUIPO */}
            {editingActivo && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <Pencil className="w-4 h-4 text-blue-600" />
                                Editar Especificaciones de Equipo
                            </h3>
                            <button 
                                onClick={() => setEditingActivo(null)}
                                className="text-slate-400 hover:text-slate-650 text-xs font-bold bg-slate-100 hover:bg-slate-200 h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveActivo} className="p-6 space-y-4">
                            
                            {/* Equipo/Nombre */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Equipo *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Aire Acondicionado Philips"
                                    value={editNombre}
                                    onChange={(e) => setEditNombre(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-650"
                                />
                            </div>

                            {/* Marca y Modelo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Marca</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Philips"
                                        value={editMarca}
                                        onChange={(e) => setEditMarca(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-650"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modelo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. PX-1000"
                                        value={editModelo}
                                        onChange={(e) => setEditModelo(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-650"
                                    />
                                </div>
                            </div>

                            {/* Serie */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número de Serie</label>
                                <input
                                    type="text"
                                    placeholder="Ej. SN0003"
                                    value={editSerie}
                                    onChange={(e) => setEditSerie(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-650 font-mono"
                                />
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observaciones / Notas</label>
                                <textarea
                                    rows={3}
                                    placeholder="Detalles adicionales sobre el estado o accesorios..."
                                    value={editObservaciones}
                                    onChange={(e) => setEditObservaciones(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-650 resize-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingActivo(null)}
                                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingActivo}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition active:scale-95 shadow-sm flex items-center gap-2 cursor-pointer"
                                >
                                    {isSavingActivo ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ADVERTENCIA ORDEN ACTIVA */}
            {activeOrderModal.isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 animate-pulse" />
                        </div>
                        <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">
                            Equipo con Orden Activa
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                            Este equipo (<span className="font-bold text-slate-700">{activeOrderModal.equipment?.descripcionCorta}</span> - QR: <span className="font-bold text-slate-700">{activeOrderModal.equipment?.idQr}</span>) ya cuenta con una orden de trabajo activa (<span className="font-bold text-slate-700">#{activeOrderModal.order?.codigoSeguridad || activeOrderModal.order?.id}</span> en estado <span className="font-bold text-amber-600">{activeOrderModal.order?.estado}</span>).
                            <br /><br />
                            Por políticas de control de calidad y trazabilidad, se restringe a **una orden activa a la vez** por equipo. Debes completar o cerrar la orden existente antes de crear una nueva.
                        </p>
                        <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setActiveOrderModal({ isOpen: false, equipment: null, order: null })}
                                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 font-bold rounded-xl text-xs transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    router.push(`/soporte/${activeOrderModal.order?.id}`);
                                    setActiveOrderModal({ isOpen: false, equipment: null, order: null });
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition cursor-pointer"
                            >
                                Ver Orden Activa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
