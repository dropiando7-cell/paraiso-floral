'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Folder, 
    Plus, 
    Users, 
    CheckSquare, 
    X, 
    ChevronRight, 
    Lock, 
    Briefcase,
    Activity,
    Trello as KanbanIcon,
    Archive,
    ArchiveRestore,
    AlertTriangle,
    Search
} from 'lucide-react';
import { createSpace, archiveSpace } from './actions';
import { toast } from 'react-hot-toast';

interface Space {
    id: string;
    nombre: string;
    clave: string;
    columnas: string[];
    tiposActividad: string[];
    taskCount: number;
    createdAt: string;
    archivado: boolean;
    acceso?: string;
}

interface OrganizationMember {
    id: string;
    nombre: string;
    email: string;
    avatarUrl: string | null;
}

interface Props {
    initialSpaces: Space[];
    currentUser: {
        id: string;
        email: string;
        role: string;
        puedeAsignarEspacios: boolean;
    };
    organizationMembers: OrganizationMember[];
}

export default function KanbanDashboardClient({ initialSpaces, currentUser, organizationMembers }: Props) {
    const router = useRouter();
    const [spaces, setSpaces] = useState<Space[]>(initialSpaces);
    const [isPending, startTransition] = useTransition();

    // States for custom archive confirmation modal
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [archiveTargetSpace, setArchiveTargetSpace] = useState<{ id: string; nombre: string; toArchive: boolean } | null>(null);

    // Estado del asistente de creación
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(1);

    // Campos del formulario
    const [nombre, setNombre] = useState('');
    const [clave, setClave] = useState('');
    const [acceso, setAcceso] = useState('Abierto');
    const [tiposActividad, setTiposActividad] = useState<string[]>(["Tarea", "Historia", "Funcionalidad", "Error / Falla", "Mantenimiento Preventivo", "Mantenimiento Correctivo", "Calibración", "Instalación", "Diagnóstico", "Soporte Técnico"]);
    const [columnas, setColumnas] = useState<string[]>(["Por hacer", "En curso", "En revisión", "Listo"]);
    const [selectedMiembroIds, setSelectedMiembroIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Campos temporales para agregar dinámicamente
    const [nuevaColumna, setNuevaColumna] = useState('');
    const [nuevaActividad, setNuevaActividad] = useState('');

    // Sugerir clave basada en el nombre
    const handleNombreChange = (val: string) => {
        setNombre(val);
        if (val.trim()) {
            const words = val.trim().split(/\s+/);
            let suggestedKey = '';
            if (words.length >= 2) {
                suggestedKey = words.slice(0, 2).map(w => w[0]).join('');
            } else {
                suggestedKey = val.substring(0, 3);
            }
            setClave(suggestedKey.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4));
        } else {
            setClave('');
        }
    };

    // Agregar/Remover Columnas
    const addColumna = () => {
        if (nuevaColumna.trim() && !columnas.includes(nuevaColumna.trim())) {
            setColumnas([...columnas, nuevaColumna.trim()]);
            setNuevaColumna('');
        }
    };

    const removeColumna = (index: number) => {
        setColumnas(columnas.filter((_, idx) => idx !== index));
    };

    // Agregar/Remover Tipos
    const addActividad = () => {
        if (nuevaActividad.trim() && !tiposActividad.includes(nuevaActividad.trim())) {
            setTiposActividad([...tiposActividad, nuevaActividad.trim()]);
            setNuevaActividad('');
        }
    };

    const removeActividad = (index: number) => {
        setTiposActividad(tiposActividad.filter((_, idx) => idx !== index));
    };

    const resetForm = () => {
        setNombre('');
        setClave('');
        setAcceso('Abierto');
        setTiposActividad(["Tarea", "Historia", "Funcionalidad", "Error / Falla", "Mantenimiento Preventivo", "Mantenimiento Correctivo", "Calibración", "Instalación", "Diagnóstico", "Soporte Técnico"]);
        setColumnas(["Por hacer", "En curso", "En revisión", "Listo"]);
        setSelectedMiembroIds([]);
        setSearchTerm('');
        setStep(1);
        setIsModalOpen(false);
    };

    // Enviar y Crear Espacio
    const handleSubmit = () => {
        if (!nombre.trim() || !clave.trim()) {
            toast.error('Nombre y Clave son obligatorios.');
            return;
        }
        if (columnas.length === 0) {
            toast.error('Debes tener al menos una columna de estado en el tablero.');
            return;
        }

        startTransition(async () => {
            const res = await createSpace({
                nombre,
                clave,
                tiposActividad,
                columnas,
                acceso,
                miembroIds: acceso === 'Restringido' ? selectedMiembroIds : []
            });

            if (res.success && res.spaceId) {
                toast.success('¡Espacio creado exitosamente!');
                resetForm();
                router.refresh();
                router.push(`/kanban/${res.spaceId}`);
            } else {
                toast.error(res.error || 'Error al crear el espacio.');
            }
        });
    };

    const [activeTab, setActiveTab] = useState<'activos' | 'archivados'>('activos');

    useEffect(() => {
        setSpaces(initialSpaces);
    }, [initialSpaces]);

    const handleArchiveSpaceClick = (spaceId: string, nombre: string, toArchive: boolean, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setArchiveTargetSpace({ id: spaceId, nombre, toArchive });
        setArchiveConfirmOpen(true);
    };

    const executeArchiveSpace = () => {
        if (!archiveTargetSpace) return;
        const { id, nombre, toArchive } = archiveTargetSpace;

        startTransition(async () => {
            const res = await archiveSpace(id, toArchive);

            if (res.success) {
                toast.success(toArchive ? 'Espacio de trabajo archivado.' : 'Espacio de trabajo restaurado.');
                setSpaces(prev => prev.map(s => s.id === id ? { ...s, archivado: toArchive } : s));
                router.refresh();
            } else {
                toast.error(res.error || 'Error al cambiar el estado del espacio.');
            }
            setArchiveConfirmOpen(false);
            setArchiveTargetSpace(null);
        });
    };

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <KanbanIcon className="h-7 w-7 text-brand-600" />
                        Tableros de Proyecto
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Crea espacios de tareas para coordinar desarrollo, mantenimiento y soporte técnico.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4.5 py-2.5 rounded-xl shadow-sm hover:shadow transition duration-200"
                >
                    <Plus className="h-5 w-5" />
                    Nuevo Espacio
                </button>
            </div>

            {/* Listado de Espacios */}
            {spaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-slate-200 rounded-2xl p-16 text-center bg-white">
                    <div className="bg-brand-50 p-4 rounded-full mb-4">
                        <Folder className="h-8 w-8 text-brand-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No hay espacios de trabajo</h3>
                    <p className="text-slate-500 text-sm mt-2 max-w-sm">
                        Comienza creando tu primer espacio de Tareas para gestionar actividades, bugs o solicitudes de clientes.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-6 flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl transition shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Crear Espacio de Trabajo
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Pestañas de Filtro */}
                    <div className="flex border-b border-slate-200 gap-6">
                        <button
                            onClick={() => setActiveTab('activos')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'activos' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Proyectos Activos ({spaces.filter(s => !s.archivado).length})
                        </button>
                        <button
                            onClick={() => setActiveTab('archivados')}
                            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'archivados' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Proyectos Archivados ({spaces.filter(s => s.archivado).length})
                        </button>
                    </div>

                    {spaces.filter(s => activeTab === 'activos' ? !s.archivado : s.archivado).length === 0 ? (
                        <div className="flex flex-col items-center justify-center border border-slate-200 rounded-2xl p-16 text-center bg-white animate-in fade-in duration-300">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Folder className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                {activeTab === 'activos' ? 'No hay proyectos activos' : 'No hay proyectos archivados'}
                            </h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm">
                                {activeTab === 'activos'
                                    ? 'Todos los proyectos están archivados o aún no has creado ninguno.'
                                    : 'Aquí aparecerán los proyectos que decidas archivar para liberar espacio en el dashboard.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-350">
                            {spaces
                                .filter(s => activeTab === 'activos' ? !s.archivado : s.archivado)
                                .map((space) => (
                                    <Link
                                        key={space.id}
                                        href={`/kanban/${space.id}`}
                                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-500/40 hover:shadow-md transition duration-300"
                                    >
                                        {/* Icono de fondo sutil */}
                                        <div className="absolute right-3 top-3 opacity-5 group-hover:opacity-10 transition duration-300">
                                            <KanbanIcon className="h-20 w-20 text-slate-400" />
                                        </div>

                                        {/* Botón de Archivar / Restaurar */}
                                        {space.archivado ? (
                                            <button
                                                onClick={(e) => handleArchiveSpaceClick(space.id, space.nombre, false, e)}
                                                className="absolute right-4 top-4 z-20 p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition duration-200"
                                                title="Restaurar proyecto"
                                            >
                                                <ArchiveRestore className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => handleArchiveSpaceClick(space.id, space.nombre, true, e)}
                                                className="absolute right-4 top-4 z-20 p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition duration-200"
                                                title="Archivar proyecto"
                                            >
                                                <Archive className="h-4 w-4" />
                                            </button>
                                        )}

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold group-hover:bg-brand-100 transition">
                                                    {space.clave}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-md font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-1.5">
                                                            {space.nombre.toUpperCase()}
                                                            {space.acceso === 'Restringido' && (
                                                                <span title="Espacio Restringido">
                                                                    <Lock className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                                </span>
                                                            )}
                                                        </h3>
                                                        {space.archivado && (
                                                            <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                                Archivado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-slate-400">
                                                        Creado: {new Date(space.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Resumen del Tablero */}
                                            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400">Actividades</span>
                                                    <span className="font-semibold text-slate-800">{space.taskCount} tareas</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400">Estructura</span>
                                                    <span className="font-semibold text-slate-800">{space.columnas.length} columnas</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Flecha interactiva */}
                                        <div className="mt-5 flex items-center justify-between text-xs font-semibold text-brand-600 group-hover:text-brand-700 transition pt-2 border-t border-slate-100">
                                            <span>Ver Tablero de Tareas</span>
                                            <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition duration-200" />
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Asistente Modal de Creación de Espacio */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px] max-h-[90vh]">
                        
                        {/* Lado Izquierdo: Formulario/Wizard */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
                            
                            {/* Cabecera del modal */}
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Configurar Espacio de Trabajo</h2>
                                    <p className="text-xs text-slate-400">Paso {step} de 3</p>
                                </div>
                                <button 
                                    onClick={resetForm}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* PASO 1: Datos Básicos */}
                            {step === 1 && (
                                <div className="my-6 space-y-5">
                                    <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex gap-3 text-xs text-brand-700">
                                        <Briefcase className="h-5 w-5 shrink-0 mt-0.5 text-brand-600" />
                                        <div>
                                            <span className="font-bold block">Configuración de Proyecto</span>
                                            Usa nombres representativos de tu equipo para organizar las asignaciones correctamente.
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre del espacio *</label>
                                        <input
                                            type="text"
                                            value={nombre}
                                            onChange={(e) => handleNombreChange(e.target.value)}
                                            placeholder="ej: Desarrollo Bioelectronica"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                                Clave * 
                                                <span className="text-[10px] text-slate-400 font-normal normal-case">(Prefijo de tareas)</span>
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={5}
                                                value={clave}
                                                onChange={(e) => setClave(e.target.value.toUpperCase().trim())}
                                                placeholder="ej: DB"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none uppercase font-semibold"
                                            />
                                        </div>

                                        {(() => {
                                            const canRestrict = currentUser.role === 'SUPER_ADMIN' || currentUser.email === 'emilia.zapata@bioelectronicahn.com' || currentUser.puedeAsignarEspacios === true;
                                            return (
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Acceso</label>
                                                    <select
                                                        value={acceso}
                                                        onChange={(e) => setAcceso(e.target.value)}
                                                        disabled={!canRestrict}
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                    >
                                                        <option value="Abierto">Abierto (Toda la Org)</option>
                                                        {canRestrict && <option value="Restringido">Restringido</option>}
                                                    </select>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {acceso === 'Restringido' && (
                                        <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                                                Asignar Miembros con Acceso
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Buscar miembros por nombre o correo..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                                                />
                                                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                                            </div>

                                            {/* Miembros Seleccionados como Tags */}
                                            {selectedMiembroIds.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-24 overflow-y-auto animate-in fade-in duration-200">
                                                    {selectedMiembroIds.map(id => {
                                                        const m = organizationMembers.find(u => u.id === id);
                                                        if (!m) return null;
                                                        return (
                                                            <span 
                                                                key={id}
                                                                className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                                                            >
                                                                <div className="h-4 w-4 rounded-full bg-brand-100 text-brand-850 flex items-center justify-center text-[9px] uppercase overflow-hidden shrink-0">
                                                                    {m.avatarUrl ? (
                                                                        <img src={m.avatarUrl} alt={m.nombre} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        m.nombre.substring(0, 2)
                                                                    )}
                                                                </div>
                                                                <span className="truncate max-w-[120px]">{m.nombre}</span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setSelectedMiembroIds(selectedMiembroIds.filter(uid => uid !== id))}
                                                                    className="hover:bg-brand-200/80 rounded p-0.5 text-brand-500 hover:text-brand-800 transition"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white shadow-sm">
                                                {organizationMembers
                                                    .filter(m => m.id !== currentUser.id && (m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || m.email.toLowerCase().includes(searchTerm.toLowerCase())))
                                                    .map(m => {
                                                        const isSelected = selectedMiembroIds.includes(m.id);
                                                        return (
                                                            <div 
                                                                key={m.id}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setSelectedMiembroIds(selectedMiembroIds.filter(id => id !== m.id));
                                                                    } else {
                                                                        setSelectedMiembroIds([...selectedMiembroIds, m.id]);
                                                                    }
                                                                }}
                                                                className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition ${isSelected ? 'bg-brand-50/40' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold border border-slate-200 uppercase overflow-hidden shrink-0">
                                                                        {m.avatarUrl ? (
                                                                            <img src={m.avatarUrl} alt={m.nombre} className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            m.nombre.substring(0, 2)
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <span className="text-xs font-semibold text-slate-800 block truncate leading-tight">{m.nombre}</span>
                                                                        <span className="text-[10px] text-slate-400 block truncate">{m.email}</span>
                                                                    </div>
                                                                </div>
                                                                <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-brand-600 border-brand-600 text-white font-bold' : 'border-slate-300'}`}>
                                                                    {isSelected && <span className="text-[10px]">✓</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                            <p className="text-[10px] text-slate-400">
                                                * El creador ({currentUser.email}) y administradores tienen acceso automático.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 2: Estados y Actividades */}
                            {step === 2 && (
                                <div className="my-6 space-y-6 overflow-y-auto pr-1">
                                    {/* Configurar Columnas / Estados */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Estados del Tablero (Columnas)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={nuevaColumna}
                                                onChange={(e) => setNuevaColumna(e.target.value)}
                                                placeholder="Agregar columna, ej: Listo para Pruebas"
                                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={addColumna}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 rounded-xl transition"
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {columnas.map((col, idx) => (
                                                <span 
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium"
                                                >
                                                    {col}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeColumna(idx)}
                                                        className="text-slate-400 hover:text-slate-700 transition ml-1 font-bold"
                                                    >
                                                        &times;
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Configurar Actividades */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Tipos de Actividad</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={nuevaActividad}
                                                onChange={(e) => setNuevaActividad(e.target.value)}
                                                placeholder="ej: Incidencia, Soporte"
                                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={addActividad}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 rounded-xl transition"
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {tiposActividad.map((act, idx) => (
                                                <span 
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium"
                                                >
                                                    {act}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeActividad(idx)}
                                                        className="text-slate-400 hover:text-slate-700 transition ml-1 font-bold"
                                                    >
                                                        &times;
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASO 3: Resumen Final */}
                            {step === 3 && (
                                <div className="my-6 space-y-6">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 text-xs text-emerald-700">
                                        <CheckSquare className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
                                        <div>
                                            <span className="font-bold block">Listo para iniciar</span>
                                            Revisa la configuración del espacio. Al guardar, se creará el tablero y podrás asignar tareas inmediatas.
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl bg-slate-50/50 divide-y divide-slate-200">
                                        <div className="p-4 grid grid-cols-2 text-sm">
                                            <span className="text-slate-500">Nombre:</span>
                                            <span className="text-slate-800 font-bold">{nombre}</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 text-sm">
                                            <span className="text-slate-500">Clave de Tareas:</span>
                                            <span className="text-brand-600 font-bold font-mono">{clave}</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 text-sm">
                                            <span className="text-slate-500">Flujo de Estados:</span>
                                            <span className="text-slate-700 font-medium">{columnas.join(' ➔ ')}</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 text-sm">
                                            <span className="text-slate-500">Tipos de Tareas:</span>
                                            <span className="text-slate-700">{tiposActividad.join(', ')}</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 text-sm">
                                            <span className="text-slate-500">Acceso:</span>
                                            <span className="font-bold flex items-center gap-1">
                                                {acceso === 'Restringido' ? (
                                                    <>
                                                        <span className="text-red-600 flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs">
                                                            <Lock className="h-3 w-3" />
                                                            Restringido
                                                        </span>
                                                        <span className="text-slate-400 text-xs font-normal">
                                                            ({selectedMiembroIds.length} miembros)
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                                                        Abierto (Todo el ERP)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Acciones de Navegación del Modal */}
                            <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => step > 1 ? setStep(step - 1) : resetForm()}
                                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-5 py-2 rounded-xl transition"
                                    disabled={isPending}
                                >
                                    {step > 1 ? 'Atrás' : 'Cancelar'}
                                </button>

                                {step < 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (step === 1 && (!nombre.trim() || !clave.trim())) {
                                                toast.error('Completa los campos obligatorios');
                                                return;
                                            }
                                            setStep(step + 1);
                                        }}
                                        className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2 rounded-xl transition"
                                    >
                                        Siguiente
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isPending}
                                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50"
                                    >
                                        {isPending ? 'Creando...' : 'Crear Espacio'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Lado Derecho: Preview Visual Dinámica (Estilo Clever) */}
                        <div className="w-full md:w-[420px] bg-slate-50 p-6 md:p-8 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-200">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Vista Previa del Tablero</h4>
                            
                            <div className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-800">{nombre || 'Desarrollo Bioelectronica'}</span>
                                    <div className="flex items-center gap-1.5 font-sans">
                                        {acceso === 'Restringido' && (
                                            <span className="text-[10px] bg-red-50 border border-red-200 text-red-600 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-in fade-in duration-200">
                                                <Lock className="h-2.5 w-2.5" />
                                                Restringido
                                            </span>
                                        )}
                                        <span className="text-[10px] bg-brand-50 border border-brand-200 text-brand-600 font-bold px-2 py-0.5 rounded">
                                            {clave || 'DB'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {columnas.slice(0, 3).map((col, cIdx) => (
                                        <div key={cIdx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col gap-1.5">
                                            <span className="text-[8px] font-bold text-slate-500 truncate uppercase">{col}</span>
                                            
                                            {cIdx === 0 && (
                                                <div className="bg-white border border-slate-200 rounded-md p-1.5 shadow-sm space-y-1">
                                                    <div className="h-1 w-6 bg-brand-500 rounded"></div>
                                                    <div className="h-1.5 w-10 bg-slate-200 rounded"></div>
                                                    <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono">
                                                        <span>{clave || 'DB'}-1</span>
                                                    </div>
                                                </div>
                                            )}

                                            {cIdx === 1 && (
                                                <div className="bg-white border border-slate-200 rounded-md p-1.5 shadow-sm space-y-1">
                                                    <div className="h-1 w-6 bg-amber-500 rounded"></div>
                                                    <div className="h-1.5 w-8 bg-slate-200 rounded"></div>
                                                    <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono">
                                                        <span>{clave || 'DB'}-2</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                                    <span>Plantilla de Tareas Jira</span>
                                    <span>3 Actividades</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
            {/* Modal de Confirmación de Archivado */}
            {archiveConfirmOpen && archiveTargetSpace && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Cabecera */}
                        <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-100 bg-slate-50/50">
                            <div className={`p-2 rounded-xl ${archiveTargetSpace.toArchive ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-slate-900">
                                {archiveTargetSpace.toArchive ? 'Archivar Proyecto' : 'Restaurar Proyecto'}
                            </h3>
                        </div>

                        {/* Contenido */}
                        <div className="p-6 space-y-3">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {archiveTargetSpace.toArchive ? (
                                    <>
                                        ¿Estás seguro de que deseas archivar el espacio de trabajo <strong className="text-slate-800 font-semibold">"{archiveTargetSpace.nombre.toUpperCase()}"</strong>?
                                        <span className="block mt-2 text-slate-500">
                                            Las tareas se conservarán en el historial pero el tablero se ocultará del listado activo. Podrás restaurarlo en cualquier momento desde la pestaña de archivados.
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        ¿Deseas restaurar el espacio de trabajo <strong className="text-slate-800 font-semibold">"{archiveTargetSpace.nombre.toUpperCase()}"</strong> al listado activo?
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Acciones */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setArchiveConfirmOpen(false);
                                    setArchiveTargetSpace(null);
                                }}
                                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={executeArchiveSpace}
                                disabled={isPending}
                                className={`px-5 py-2.5 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center min-w-[100px] ${
                                    archiveTargetSpace.toArchive 
                                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' 
                                        : 'bg-brand-600 hover:bg-brand-700 shadow-brand-100'
                                }`}
                            >
                                {isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    archiveTargetSpace.toArchive ? 'Archivar' : 'Restaurar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
