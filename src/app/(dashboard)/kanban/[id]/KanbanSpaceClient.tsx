'use client';

import { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
    ArrowLeft, 
    Plus, 
    Search, 
    Filter, 
    Briefcase, 
    Calendar,
    User as UserIcon,
    AlertCircle,
    Layout,
    BarChart2,
    Clock,
    X,
    Check,
    MoreHorizontal,
    ChevronRight,
    Trash2,
    Lock,
    Users,
    Pencil
} from 'lucide-react';
import { 
    createKanbanTask, 
    updateTaskStatus, 
    updateTaskFields, 
    deleteKanbanTask,
    addColumnToSpace,
    deleteColumnFromSpace,
    moveTaskToSpace,
    updateSpaceMembers,
    updateSpaceName,
    renameColumnInSpace
} from '../actions';
import TaskDetailModal from '@/components/kanban/TaskDetailModal';
import CreateTaskModal from '@/components/kanban/CreateTaskModal';
import { toast } from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';

interface Task {
    id: string;
    codigo: string;
    title: string;
    description: string;
    status: string;
    type: string;
    priority: string;
    dueDate: string | null;
    startDate: string | null;
    etiquetas: string[];
    team: string;
    parentId: string | null;
    modulo: string | null;
    asignado: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    } | null;
    asignados: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    }[];
    createdAt: string;
}

interface Activity {
    id: string;
    taskId: string | null;
    usuario: string;
    accion: string;
    detalles: string;
    createdAt: string;
}

interface Member {
    id: string;
    nombre: string;
    email?: string;
    avatarUrl: string | null;
}

interface Space {
    id: string;
    nombre: string;
    clave: string;
    columnas: string[];
    tiposActividad: string[];
    acceso?: string;
    miembros?: {
        id: string;
        nombre: string;
        email: string;
        avatarUrl: string | null;
    }[];
    creadoPorId?: string | null;
}

interface Props {
    initialData: {
        space: Space;
        spaces: Space[];
        tasks: Task[];
        activities: Activity[];
        members: Member[];
        currentUserRole?: string;
        currentUserCanManageAccess?: boolean;
    };
}

function CardContextMenu({
    task,
    columnas,
    spaces,
    currentSpaceId,
    onClose,
    onStatusChange,
    onSpaceChange,
    onDeleteClick
}: {
    task: any;
    columnas: string[];
    spaces: any[];
    currentSpaceId: string;
    onClose: () => void;
    onStatusChange: (status: string) => void;
    onSpaceChange: (spaceId: string) => void;
    onDeleteClick: () => void;
}) {
    const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'status' | 'space'>('main');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            // Si el elemento cliqueado ya no está en el documento, es muy probable que haya
            // sido deshechado/desmontado del DOM durante el render provocado por el click
            // (como cuando se hace clic en "Cambiar estado" y se cambia de submenú).
            if (e.target && !document.body.contains(e.target as Node)) {
                return;
            }
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [onClose]);

    return (
        <div 
            ref={menuRef}
            onClick={(e) => e.stopPropagation()} 
            className="absolute right-0 mt-1 w-52 sm:w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left animate-in fade-in duration-100"
        >
            {activeSubmenu === 'main' && (
                <>
                    <button
                        onClick={() => setActiveSubmenu('status')}
                        className="w-full text-left px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition flex items-center justify-between cursor-pointer"
                    >
                        <span>Cambiar estado</span>
                        <ChevronRight className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    </button>
                    <button
                        onClick={() => setActiveSubmenu('space')}
                        className="w-full text-left px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition flex items-center justify-between cursor-pointer"
                    >
                        <span>Mover actividad</span>
                        <ChevronRight className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    </button>
                    <button
                        onClick={onDeleteClick}
                        className="w-full text-left px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs text-red-650 hover:bg-red-50 hover:text-red-750 transition cursor-pointer"
                    >
                        Eliminar tarea
                    </button>
                </>
            )}

            {activeSubmenu === 'status' && (
                <>
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="w-full text-left px-4 py-2 sm:px-3 sm:py-1 text-xs sm:text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-1.5 mb-1 hover:text-slate-600 cursor-pointer"
                    >
                        ← Volver
                    </button>
                    {columnas.filter(c => c !== task.status).map(col => (
                        <button
                            key={col}
                            onClick={() => {
                                onStatusChange(col);
                                onClose();
                            }}
                            className="w-full text-left px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition truncate cursor-pointer"
                        >
                            {col}
                        </button>
                    ))}
                </>
            )}

            {activeSubmenu === 'space' && (
                <>
                    <button
                        onClick={() => setActiveSubmenu('main')}
                        className="w-full text-left px-4 py-2 sm:px-3 sm:py-1 text-xs sm:text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-1.5 mb-1 hover:text-slate-600 cursor-pointer"
                    >
                        ← Volver
                    </button>
                    {spaces.filter(s => s.id !== currentSpaceId).map(s => (
                        <button
                            key={s.id}
                            onClick={() => {
                                onSpaceChange(s.id);
                                onClose();
                            }}
                            className="w-full text-left px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition truncate cursor-pointer"
                            title={s.nombre}
                        >
                            {s.nombre.toUpperCase()} ({s.clave})
                        </button>
                    ))}
                    {spaces.filter(s => s.id !== currentSpaceId).length === 0 && (
                        <p className="px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs text-slate-400 italic">No hay otros espacios</p>
                    )}
                </>
            )}
        </div>
    );
}

const translateType = (type: string) => {
    switch (type) {
        case 'Task': return 'Tarea';
        case 'Story': return 'Historia';
        case 'Feature': return 'Funcionalidad';
        case 'Bug': return 'Error / Falla';
        default: return type;
    }
};

export default function KanbanSpaceClient({ initialData }: Props) {
    const space = initialData.space;
    const router = useRouter();
    const [spaceName, setSpaceName] = useState(space.nombre);
    const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
    const [activities, setActivities] = useState<Activity[]>(initialData.activities);
    const [members] = useState<Member[]>(initialData.members);
    
    // Columnas dinamicas
    const [columnas, setColumnas] = useState<string[]>(space.columnas);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'tablero' | 'resumen'>('tablero');
    const [isPending, startTransition] = useTransition();

    // Modal de Gestión de Accesos
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [accessType, setAccessType] = useState(space.acceso || 'Abierto');
    const [selectedMiembros, setSelectedMiembros] = useState<string[]>(
        space.miembros?.map(m => m.id) || []
    );
    const [accessSearchTerm, setAccessSearchTerm] = useState('');

    const handleSaveAccess = () => {
        startTransition(async () => {
            const res = await updateSpaceMembers(
                space.id,
                accessType,
                accessType === 'Restringido' ? selectedMiembros : []
            );
            if (res.success) {
                toast.success('Accesos actualizados correctamente.');
                setIsAccessModalOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || 'Error al actualizar accesos.');
            }
        });
    };

    const handleRenameSpace = () => {
        const nuevoNombre = prompt("Editar nombre del espacio de trabajo:", spaceName);
        if (nuevoNombre === null) return;
        const trimmed = nuevoNombre.trim();
        if (!trimmed) {
            toast.error("El nombre no puede estar vacío");
            return;
        }

        startTransition(async () => {
            const res = await updateSpaceName(space.id, trimmed);
            if (res.success && res.space) {
                setSpaceName(res.space.nombre);
                toast.success("Espacio de trabajo renombrado con éxito");
                router.refresh();
            } else {
                toast.error(res.error || "Error al renombrar el espacio de trabajo");
            }
        });
    };

    // Filtros
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState('');

    // Tarea activa en modal
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const searchParams = useSearchParams();
    const taskIdParam = searchParams.get('task');

    useEffect(() => {
        if (taskIdParam && tasks.length > 0) {
            const foundTask = tasks.find(t => t.id === taskIdParam || t.codigo === taskIdParam);
            if (foundTask) {
                setSelectedTask(foundTask);
            }
        }
    }, [taskIdParam, tasks]);

    // Modal de Creación Avanzada
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState<string | undefined>(undefined);

    // Menú de 3 puntos en tarjeta
    const [activeCardMenuTaskId, setActiveCardMenuTaskId] = useState<string | null>(null);

    // Controles de creación rápida por columna
    const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState('Task');
    const [newPriority, setNewPriority] = useState('MEDIUM');

    // Helper para identificar si es una columna "LISTO" (completado)
    const isDoneColumn = (columnName: string) => {
        const lower = columnName.toLowerCase();
        return lower === 'listo' || lower === 'completado' || lower === 'done' || lower === 'terminado' || lower === 'finalizado';
    };

    // Agregar nueva columna
    const handleAddColumn = () => {
        const name = newColumnName.trim();
        if (!name) {
            toast.error('El nombre de la columna no puede estar vacío.');
            return;
        }

        // Validar duplicados localmente
        const isDuplicate = columnas.some(
            col => col.toLowerCase() === name.toLowerCase()
        );

        if (isDuplicate) {
            toast.error(`La columna "${name}" ya existe.`);
            return;
        }

        startTransition(async () => {
            const res = await addColumnToSpace(space.id, name);
            if (res.success && res.columnas) {
                setColumnas(res.columnas);
                setIsAddingColumn(false);
                setNewColumnName('');
                toast.success(`Columna "${name}" agregada.`);

                // Registrar actividad local
                const newAct: Activity = {
                    id: Math.random().toString(),
                    taskId: null,
                    usuario: 'Tú',
                    accion: 'ACTUALIZACION',
                    detalles: `Agregó la columna "${name}" al tablero`,
                    createdAt: new Date().toISOString()
                };
                setActivities(prev => [newAct, ...prev].slice(0, 30));
            } else {
                toast.error(res.error || 'Error al agregar columna.');
            }
        });
    };

    // Eliminar columna
    const handleDeleteColumn = (columnName: string) => {
        if (columnas.length <= 1) {
            toast.error('Debe haber al menos una columna en el tablero.');
            return;
        }

        const remaining = columnas.filter(c => c !== columnName);
        const fallback = remaining[0];

        startTransition(async () => {
            const res = await deleteColumnFromSpace(space.id, columnName);
            if (res.success && res.columnas) {
                setColumnas(res.columnas);
                setColumnToDelete(null);
                toast.success(`Columna "${columnName}" eliminada.`);

                // Actualizar las tareas localmente
                setTasks(prev => prev.map(t => t.status === columnName ? { ...t, status: res.fallbackColumn || fallback } : t));

                // Registrar actividad local
                const newAct: Activity = {
                    id: Math.random().toString(),
                    taskId: null,
                    usuario: 'Tú',
                    accion: 'ACTUALIZACION',
                    detalles: `Eliminó la columna "${columnName}" (las tareas fueron movidas a "${res.fallbackColumn || fallback}")`,
                    createdAt: new Date().toISOString()
                };
                setActivities(prev => [newAct, ...prev].slice(0, 30));
            } else {
                toast.error(res.error || 'Error al eliminar la columna.');
            }
        });
    };

    // Renombrar columna
    const handleRenameColumn = (oldName: string) => {
        const newName = prompt(`Renombrar columna "${oldName}" a:`, oldName);
        if (newName === null) return;
        const trimmedNew = newName.trim();
        if (!trimmedNew) {
            toast.error("El nombre de la columna no puede estar vacío");
            return;
        }
        if (trimmedNew === oldName) return;

        // Validar duplicado localmente
        const isDuplicate = columnas.some(
            col => col.toLowerCase() === trimmedNew.toLowerCase() && col.toLowerCase() !== oldName.toLowerCase()
        );
        if (isDuplicate) {
            toast.error(`La columna "${trimmedNew}" ya existe.`);
            return;
        }

        startTransition(async () => {
            const res = await renameColumnInSpace(space.id, oldName, trimmedNew);
            if (res.success && res.columnas) {
                setColumnas(res.columnas);
                toast.success(`Columna renombrada a "${trimmedNew}"`);

                // Actualizar el status de las tareas cargadas en memoria localmente
                setTasks(prev => prev.map(t => t.status === oldName ? { ...t, status: trimmedNew } : t));

                // Registrar actividad local
                const newAct: Activity = {
                    id: Math.random().toString(),
                    taskId: null,
                    usuario: 'Tú',
                    accion: 'ACTUALIZACION',
                    detalles: `Renombró la columna "${oldName}" a "${trimmedNew}"`,
                    createdAt: new Date().toISOString()
                };
                setActivities(prev => [newAct, ...prev].slice(0, 30));

                router.refresh();
            } else {
                toast.error(res.error || 'Error al renombrar la columna.');
            }
        });
    };

    // 1. Filtrar y ordenar tareas
    const filteredTasks = useMemo(() => {
        const query = search.trim().toLowerCase();

        const filtered = tasks.filter(task => {
            const matchesSearch = !query || 
                task.title.toLowerCase().includes(query) ||
                task.codigo.toLowerCase().includes(query) ||
                (task.asignado && task.asignado.nombre.toLowerCase().includes(query)) ||
                (task.asignados && task.asignados.some(m => m.nombre.toLowerCase().includes(query)));

            const matchesType = selectedType ? task.type === selectedType : true;
            const matchesPriority = selectedPriority ? task.priority === selectedPriority : true;
            const matchesAssignee = selectedAssignee ? 
                (selectedAssignee === 'unassigned' ? !task.asignado : task.asignado?.id === selectedAssignee) 
                : true;

            return matchesSearch && matchesType && matchesPriority && matchesAssignee;
        });

        if (query) {
            filtered.sort((a, b) => {
                const aName = a.asignado?.nombre.toLowerCase() || '';
                const bName = b.asignado?.nombre.toLowerCase() || '';
                
                const aMatchesAssigneeOnly = aName.includes(query) && (a.asignados.length === 0 || (a.asignados.length === 1 && a.asignados[0].id === a.asignado?.id));
                const bMatchesAssigneeOnly = bName.includes(query) && (b.asignados.length === 0 || (b.asignados.length === 1 && b.asignados[0].id === b.asignado?.id));
                
                if (aMatchesAssigneeOnly && !bMatchesAssigneeOnly) return -1;
                if (!aMatchesAssigneeOnly && bMatchesAssigneeOnly) return 1;

                const aMatchesAssignee = aName.includes(query);
                const bMatchesAssignee = bName.includes(query);

                if (aMatchesAssignee && !bMatchesAssignee) return -1;
                if (!aMatchesAssignee && bMatchesAssignee) return 1;

                const aMatchesParticipant = a.asignados ? a.asignados.some(m => m.nombre.toLowerCase().includes(query)) : false;
                const bMatchesParticipant = b.asignados ? b.asignados.some(m => m.nombre.toLowerCase().includes(query)) : false;

                if (aMatchesParticipant && !bMatchesParticipant) return -1;
                if (!aMatchesParticipant && bMatchesParticipant) return 1;

                return 0;
            });
        }

        return filtered;
    }, [tasks, search, selectedType, selectedPriority, selectedAssignee]);


    // 2. Drag & Drop nativo de HTML5
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const originalTasks = [...tasks];
        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove || taskToMove.status === targetColumn) return;

        // 1. Optimistic Update en UI para respuesta instantánea
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetColumn } : t));

        // 2. Enviar cambio al servidor
        startTransition(async () => {
            const res = await updateTaskStatus(taskId, targetColumn);
            if (res.success && res.task) {
                // Registrar nueva actividad localmente en la lista de actividades
                const newAct: Activity = {
                    id: Math.random().toString(),
                    taskId: taskId,
                    usuario: 'Tú',
                    accion: 'MOVIMIENTO',
                    detalles: `Mover de "${taskToMove.status}" a "${targetColumn}"`,
                    createdAt: new Date().toISOString()
                };
                setActivities(prev => [newAct, ...prev].slice(0, 30));
            } else {
                // Revertir en caso de fallo
                setTasks(originalTasks);
                toast.error('Error al actualizar el estado de la tarea.');
            }
        });
    };

    // 3. Crear Tarea Rápida
    const handleCreateQuickTask = (column: string) => {
        if (!newTitle.trim()) {
            toast.error('El título es requerido.');
            return;
        }

        startTransition(async () => {
            const res = await createKanbanTask({
                spaceId: space.id,
                title: newTitle.trim(),
                status: column,
                type: newType,
                priority: newPriority
            });

            if (res.success && res.task) {
                const createdTask: Task = {
                    id: res.task.id,
                    codigo: res.task.codigo,
                    title: res.task.title,
                    description: res.task.description || '',
                    status: res.task.status,
                    type: res.task.type,
                    priority: res.task.priority,
                    dueDate: res.task.dueDate ? res.task.dueDate.toISOString() : null,
                    startDate: res.task.startDate ? res.task.startDate.toISOString() : null,
                    etiquetas: res.task.etiquetas || [],
                    team: res.task.team || '',
                    parentId: res.task.parentId || null,
                    modulo: res.task.modulo || null,
                    asignado: null,
                    asignados: [],
                    createdAt: res.task.createdAt.toISOString()
                };

                setTasks(prev => [createdTask, ...prev]);
                
                // Registrar actividad local
                const newAct: Activity = {
                    id: Math.random().toString(),
                    taskId: createdTask.id,
                    usuario: 'Tú',
                    accion: 'CREACION_TAREA',
                    detalles: `Creó la tarea ${createdTask.codigo}: "${createdTask.title}" en "${column}"`,
                    createdAt: new Date().toISOString()
                };
                setActivities(prev => [newAct, ...prev].slice(0, 30));

                // Limpiar inputs
                setNewTitle('');
                setAddingInColumn(null);
                toast.success(`Tarea ${createdTask.codigo} creada.`);
            } else {
                toast.error(res.error || 'Error al crear la tarea');
            }
        });
    };

    // 4. Actualizar Tarea desde el Modal
    const handleUpdateTaskFromModal = async (taskId: string, fields: any): Promise<boolean> => {
        const res = await updateTaskFields(taskId, fields);
        if (res.success && res.task) {
            setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    const assignedUser = fields.asignadoId !== undefined ? 
                        members.find(m => m.id === fields.asignadoId) || null : t.asignado;
                    const assignedUsers = fields.asignadoIds !== undefined ?
                        fields.asignadoIds.map((id: string) => members.find(m => m.id === id)).filter(Boolean) : t.asignados;
                    return {
                        ...t,
                        title: fields.title !== undefined ? fields.title : t.title,
                        description: fields.description !== undefined ? fields.description : t.description,
                        status: fields.status !== undefined ? fields.status : t.status,
                        type: fields.type !== undefined ? fields.type : t.type,
                        priority: fields.priority !== undefined ? fields.priority : t.priority,
                        dueDate: fields.dueDate !== undefined ? fields.dueDate : t.dueDate,
                        startDate: fields.startDate !== undefined ? fields.startDate : t.startDate,
                        etiquetas: fields.etiquetas !== undefined ? fields.etiquetas : t.etiquetas,
                        team: fields.team !== undefined ? fields.team : t.team,
                        modulo: fields.modulo !== undefined ? fields.modulo : t.modulo,
                        parentId: fields.parentId !== undefined ? fields.parentId : t.parentId,
                        asignado: assignedUser ? { id: assignedUser.id, nombre: assignedUser.nombre, avatarUrl: assignedUser.avatarUrl || null } : null,
                        asignados: assignedUsers.map((u: any) => ({ id: u.id, nombre: u.nombre, avatarUrl: u.avatarUrl || null }))
                    };
                }
                return t;
            }));

            // Agregar log local
            const newAct: Activity = {
                id: Math.random().toString(),
                taskId: taskId,
                usuario: 'Tú',
                accion: 'ACTUALIZACION',
                detalles: `Actualizó campos de la tarea`,
                createdAt: new Date().toISOString()
            };
            setActivities(prev => [newAct, ...prev].slice(0, 30));

            // Sincronizar tarea abierta en modal
            if (selectedTask && selectedTask.id === taskId) {
                const assignedUser = fields.asignadoId !== undefined ? 
                    members.find(m => m.id === fields.asignadoId) || null : selectedTask.asignado;
                const assignedUsers = fields.asignadoIds !== undefined ?
                    fields.asignadoIds.map((id: string) => members.find(m => m.id === id)).filter(Boolean) : selectedTask.asignados;
                const updatedTask = {
                    ...selectedTask,
                    ...fields,
                    asignado: assignedUser ? { id: assignedUser.id, nombre: assignedUser.nombre, avatarUrl: assignedUser.avatarUrl || null } : null,
                    asignados: assignedUsers.map((u: any) => ({ id: u.id, nombre: u.nombre, avatarUrl: u.avatarUrl || null }))
                };
                setSelectedTask(updatedTask as Task);
            }
            return true;
        } else {
            toast.error(res.error || 'Error al actualizar tarea');
            return false;
        }
    };

    // Mover Tarea de Estado (sin Drag & Drop)
    const handleMoveTaskStatus = async (taskId: string, targetStatus: string) => {
        const originalTasks = [...tasks];
        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove || taskToMove.status === targetStatus) return;

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

        startTransition(async () => {
            const res = await updateTaskStatus(taskId, targetStatus);
            if (res.success && res.task) {
                const newAct: Activity = {
                    id: Math.random().toString(),
                    taskId: taskId,
                    usuario: 'Tú',
                    accion: 'MOVIMIENTO',
                    detalles: `Mover de "${taskToMove.status}" a "${targetStatus}"`,
                    createdAt: new Date().toISOString()
                };
                setActivities(prev => [newAct, ...prev].slice(0, 30));
                toast.success(`Tarea movida a "${targetStatus}"`);
            } else {
                setTasks(originalTasks);
                toast.error('Error al mover la tarea.');
            }
        });
    };

    // Trasladar Tarea a otro Espacio de Trabajo
    const handleMoveTaskSpace = async (taskId: string, targetSpaceId: string) => {
        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove) return;

        const targetSpace = (initialData.spaces || []).find(s => s.id === targetSpaceId);
        if (!targetSpace) return;

        startTransition(async () => {
            const res = await moveTaskToSpace(taskId, targetSpaceId);
            if (res.success && res.task) {
                setTasks(prev => prev.filter(t => t.id !== taskId));
                const newAct: Activity = {
                    id: Math.random().toString(),
                    taskId: null,
                    usuario: 'Tú',
                    accion: 'MOVIMIENTO',
                    detalles: `Trasladó la tarea ${taskToMove.codigo} al espacio "${targetSpace.nombre}"`,
                    createdAt: new Date().toISOString()
                };
                setActivities(prev => [newAct, ...prev].slice(0, 30));
                toast.success(`Tarea trasladada a ${targetSpace.nombre}`);
            } else {
                toast.error(res.error || 'Error al trasladar la tarea de espacio.');
            }
        });
    };

    // Crear Tarea desde el modal avanzado
    const handleCreateTaskFromModal = async (taskData: any): Promise<boolean> => {
        const res = await createKanbanTask(taskData);
        if (res.success && res.task) {
            const taskAssignees = (taskData.asignadoIds || []).map((id: string) => {
                const member = members.find(m => m.id === id);
                return member ? {
                    id: member.id,
                    nombre: member.nombre,
                    avatarUrl: member.avatarUrl || null
                } : null;
            }).filter(Boolean);

            const primaryAssignee = taskAssignees.length > 0 ? taskAssignees[0] : null;

            const createdTask: Task = {
                id: res.task.id,
                codigo: res.task.codigo,
                title: res.task.title,
                description: res.task.description || '',
                status: res.task.status,
                type: res.task.type,
                priority: res.task.priority,
                dueDate: res.task.dueDate ? res.task.dueDate.toISOString() : null,
                startDate: res.task.startDate ? res.task.startDate.toISOString() : null,
                etiquetas: res.task.etiquetas || [],
                team: res.task.team || '',
                parentId: res.task.parentId || null,
                modulo: res.task.modulo || null,
                asignado: primaryAssignee,
                asignados: taskAssignees,
                createdAt: res.task.createdAt.toISOString()
            };

            if (taskData.spaceId === space.id) {
                setTasks(prev => [createdTask, ...prev]);
            }

            const newAct: Activity = {
                id: Math.random().toString(),
                taskId: createdTask.id,
                usuario: 'Tú',
                accion: 'CREACION_TAREA',
                detalles: `Creó la tarea ${createdTask.codigo}: "${createdTask.title}" en "${taskData.status}"`,
                createdAt: new Date().toISOString()
            };
            setActivities(prev => [newAct, ...prev].slice(0, 30));
            toast.success(`Tarea ${createdTask.codigo} creada.`);
            return true;
        } else {
            toast.error(res.error || 'Error al crear la tarea');
            return false;
        }
    };

    // 5. Eliminar Tarea desde el Modal
    const handleDeleteTaskFromModal = async (taskId: string): Promise<boolean> => {
        const res = await deleteKanbanTask(taskId);
        if (res.success) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            
            // Agregar log local
            const newAct: Activity = {
                id: Math.random().toString(),
                taskId: null,
                usuario: 'Tú',
                accion: 'ELIMINACION',
                detalles: `Eliminó la tarea`,
                createdAt: new Date().toISOString()
            };
            setActivities(prev => [newAct, ...prev].slice(0, 30));

            setSelectedTask(null);
            toast.success('Tarea eliminada correctamente.');
            return true;
        } else {
            toast.error(res.error || 'Error al eliminar la tarea');
            return false;
        }
    };

    // 6. Estadísticas para la pestaña de Resumen
    const stats = useMemo(() => {
        const total = tasks.length;
        const columnCounts = columnas.reduce((acc, col) => {
            acc[col] = tasks.filter(t => t.status === col).length;
            return acc;
        }, {} as Record<string, number>);

        const priorityCounts = {
            LOW: tasks.filter(t => t.priority === 'LOW').length,
            MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
            HIGH: tasks.filter(t => t.priority === 'HIGH').length,
            URGENT: tasks.filter(t => t.priority === 'URGENT').length
        };

        const urgentCount = priorityCounts.HIGH + priorityCounts.URGENT;

        return {
            total,
            columnCounts,
            priorityCounts,
            urgentCount
        };
    }, [tasks, columnas]);

    // Colores para prioridades
    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-50 border-red-200 text-red-600';
            case 'HIGH': return 'bg-amber-50 border-amber-200 text-amber-700';
            case 'MEDIUM': return 'bg-blue-50 border-blue-200 text-blue-600';
            default: return 'bg-slate-50 border-slate-200 text-slate-500';
        }
    };

    // Colores para tipos
    const getTypeBadgeClass = (type: string) => {
        const t = type.toLowerCase();
        if (t === 'bug' || t === 'error / falla') return 'bg-red-100 text-red-700 border border-red-200';
        if (t === 'feature' || t === 'funcionalidad') return 'bg-purple-100 text-purple-700 border border-purple-200';
        if (t === 'story' || t === 'historia') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        return 'bg-blue-100 text-blue-700 border border-blue-200';
    };

    // Helper to parse date-only strings without timezone shifts
    const parseLocalDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date(dateStr);
    };

    // Formatear fecha para la tarjeta
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = parseLocalDate(dateStr);
        if (!date) return '';
        return date.toLocaleDateString('es-HN', { day: '2-digit', month: 'short' });
    };

    // Alertas de vencimiento
    const getDueDateAlert = (dueDateStr: string | null) => {
        if (!dueDateStr) return null;
        const dueDate = parseLocalDate(dueDateStr);
        if (!dueDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(dueDate);
        compareDate.setHours(0, 0, 0, 0);

        const diffTime = compareDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                text: 'Vencida',
                className: 'bg-red-50 text-red-700 border-red-200'
            };
        } else if (diffDays === 0) {
            return {
                text: 'Vence hoy',
                className: 'bg-orange-50 text-orange-700 border-orange-200'
            };
        } else if (diffDays <= 2) {
            return {
                text: `Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`,
                className: 'bg-amber-50 text-amber-700 border-amber-200'
            };
        }
        return null;
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
            {/* Cabecera del Espacio */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/kanban"
                        className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg md:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                {spaceName.toUpperCase()}
                                {initialData.currentUserCanManageAccess && (
                                    <button
                                        onClick={handleRenameSpace}
                                        title="Renombrar espacio de trabajo"
                                        className="p-1 hover:bg-slate-105 rounded-lg text-slate-450 hover:text-slate-700 transition"
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-slate-650" />
                                    </button>
                                )}
                                {space.acceso === 'Restringido' && (
                                    <span className="text-[10px] bg-red-50 border border-red-200 text-red-600 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Espacio Restringido">
                                        <Lock className="h-2.5 w-2.5" />
                                        Restringido
                                    </span>
                                )}
                            </h1>
                            <span className="text-[10px] bg-brand-50 border border-brand-200 text-brand-600 font-mono font-bold px-2 py-0.5 rounded shrink-0">
                                {space.clave}
                            </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">Espacio de Trabajo / Tablero de Tareas</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-center w-full md:w-auto">
                    {/* Botón "Gestionar Acceso" (solo si tiene permisos) */}
                    {initialData.currentUserCanManageAccess && (
                        <button
                            onClick={() => {
                                // Sincronizar estado inicial al abrir modal
                                setAccessType(space.acceso || 'Abierto');
                                setSelectedMiembros(space.miembros?.map(m => m.id) || []);
                                setIsAccessModalOpen(true);
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2.5 md:py-2 rounded-xl text-sm md:text-xs shadow-sm hover:shadow transition duration-200 cursor-pointer"
                        >
                            <Users className="h-4.5 w-4.5 md:h-4 md:w-4 text-slate-500" />
                            Gestionar Acceso
                        </button>
                    )}

                    {/* Botón "+ Crear Tarea" */}
                    <button
                        onClick={() => {
                            setCreateModalDefaultStatus(undefined);
                            setIsCreateModalOpen(true);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 md:py-2 rounded-xl text-sm md:text-xs shadow-sm hover:shadow transition duration-200 cursor-pointer"
                    >
                        <Plus className="h-4.5 w-4.5 md:h-4 md:w-4" />
                        Crear Tarea
                    </button>
                </div>
            </div>

            {/* VISTA TABLERO */}
            {activeTab === 'tablero' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Barra de Filtros */}
                    <div className="bg-white border-b border-slate-200 px-4 py-2.5 md:px-6 md:py-3 flex flex-wrap items-center gap-3 shrink-0">
                        {/* Buscador */}
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-3.5 md:w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por título o código..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 md:py-2 text-sm md:text-xs text-slate-850 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        {/* Tipo */}
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 md:py-2 text-sm md:text-xs text-slate-705 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                            <option value="">Todos los Tipos</option>
                            {space.tiposActividad.map(t => (
                                <option key={t} value={t}>{translateType(t)}</option>
                            ))}
                        </select>

                        {/* Prioridad */}
                        <select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 md:py-2 text-sm md:text-xs text-slate-705 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                            <option value="">Todas las Prioridades</option>
                            <option value="LOW">Baja</option>
                            <option value="MEDIUM">Media</option>
                            <option value="HIGH">Alta</option>
                            <option value="URGENT">Urgente</option>
                        </select>

                        {/* Responsable */}
                        <select
                            value={selectedAssignee}
                            onChange={(e) => setSelectedAssignee(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 md:py-2 text-sm md:text-xs text-slate-705 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                            <option value="">Todos los Responsables</option>
                            <option value="unassigned">Sin asignar</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>

                        {/* Botón resetear filtros */}
                        {(search || selectedType || selectedPriority || selectedAssignee) && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setSelectedType('');
                                    setSelectedPriority('');
                                    setSelectedAssignee('');
                                }}
                                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold px-2 py-1 rounded-lg hover:bg-slate-50 transition"
                            >
                                <X className="h-3.5 w-3.5" />
                                Limpiar Filtros
                            </button>
                        )}
                    </div>

                    {/* Columnas del Tablero Kanban */}
                    <div className="flex-1 overflow-x-auto p-3.5 sm:p-6 flex gap-3.5 sm:gap-6 items-start">
                        {columnas.map((columna) => {
                            const columnTasks = filteredTasks.filter(t => t.status === columna);

                            // Helper para icono del tipo de tarea
                            const getTypeIcon = (type: string) => {
                                const t = type.toLowerCase();
                                if (t === 'bug' || t === 'error / falla') {
                                    return <AlertCircle className="h-3.5 w-3.5 text-red-500 fill-red-50 shrink-0" />;
                                }
                                if (t === 'feature' || t === 'funcionalidad') {
                                    return <div className="h-2.5 w-2.5 bg-purple-500 rotate-45 rounded-sm shrink-0 mt-0.5" />;
                                }
                                if (t === 'story' || t === 'historia') {
                                    return <div className="h-3 w-3 bg-emerald-500 rounded-full shrink-0" />;
                                }
                                return (
                                    <div className="h-3.5 w-3.5 bg-blue-500 rounded flex items-center justify-center shrink-0">
                                        <Check className="h-2.5 w-2.5 text-white stroke-[4]" />
                                    </div>
                                );
                            };

                            return (
                                <div
                                    key={columna}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, columna)}
                                    className="w-[86vw] xs:w-[325px] sm:w-80 shrink-0 bg-slate-100/60 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col max-h-[calc(100vh-170px)] sm:max-h-[calc(100vh-190px)]"
                                >
                                    {/* Cabecera Columna */}
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 group/header">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm sm:text-xs font-extrabold text-slate-800 uppercase tracking-wider">{columna}</span>
                                            <span className="text-xs sm:text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                                {columnTasks.length}
                                            </span>
                                            {isDoneColumn(columna) && (
                                                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                                            )}
                                        </div>
                                        {/* Acciones de columna */}
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition duration-150">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRenameColumn(columna);
                                                }}
                                                title="Renombrar Columna"
                                                className="p-1 hover:bg-slate-200 text-slate-450 hover:text-brand-650 rounded-md transition duration-150 cursor-pointer"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            {columnas.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setColumnToDelete(columna);
                                                    }}
                                                    title="Eliminar Columna"
                                                    className="p-1 hover:bg-red-50 text-slate-450 hover:text-red-500 rounded-md transition duration-150 cursor-pointer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Listado de Tarjetas */}
                                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                                        {columnTasks.length === 0 ? (
                                            <div className="h-20 flex items-center justify-center border border-dashed border-slate-300 rounded-xl bg-white/40">
                                                <span className="text-[10px] text-slate-400 italic">Arrastra tareas aquí</span>
                                            </div>
                                        ) : (
                                            columnTasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                                    onClick={() => setSelectedTask(task)}
                                                    className={`relative border hover:border-brand-500/30 hover:shadow-md rounded-xl p-4 sm:p-3.5 pl-5.5 sm:pl-4.5 shadow-sm cursor-grab active:cursor-grabbing transition duration-150 group ${
                                                        task.type === 'Orden de Trabajo' 
                                                            ? 'bg-blue-50/40 border-blue-200/70' 
                                                            : 'bg-white border-slate-200'
                                                    }`}
                                                >
                                                    {/* Indicador de Prioridad Lateral */}
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
                                                        task.priority === 'URGENT' ? 'bg-red-500' :
                                                        task.priority === 'HIGH' ? 'bg-amber-500' :
                                                        task.priority === 'MEDIUM' ? 'bg-brand-500' :
                                                        'bg-slate-300'
                                                     }`} />
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            {/* Tipo de Tarea */}
                                                            <div className="flex items-center gap-1.5">
                                                                {getTypeIcon(task.type)}
                                                                <span className={`text-[9.5px] sm:text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getTypeBadgeClass(task.type)}`}>
                                                                    {translateType(task.type)}
                                                                </span>
                                                            </div>
 
                                                            {/* Código Tarea y Menú de Tres Puntos */}
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs sm:text-[9px] font-bold font-mono text-slate-400 group-hover:text-brand-600 transition-colors">
                                                                    {task.codigo}
                                                                </span>
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveCardMenuTaskId(activeCardMenuTaskId === task.id ? null : task.id);
                                                                        }}
                                                                        className="p-2 sm:p-1 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                                                    >
                                                                        <MoreHorizontal className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5" />
                                                                    </button>
 
                                                                    {/* Menú Popup Contextual */}
                                                                    {activeCardMenuTaskId === task.id && (
                                                                        <CardContextMenu
                                                                            task={task}
                                                                            columnas={columnas}
                                                                            spaces={initialData.spaces || []}
                                                                            currentSpaceId={space.id}
                                                                            onClose={() => setActiveCardMenuTaskId(null)}
                                                                            onStatusChange={(targetStatus) => {
                                                                                handleMoveTaskStatus(task.id, targetStatus);
                                                                            }}
                                                                            onSpaceChange={(targetSpaceId) => {
                                                                                handleMoveTaskSpace(task.id, targetSpaceId);
                                                                            }}
                                                                            onDeleteClick={() => {
                                                                                if (window.confirm(`¿Confirmas eliminar la tarea ${task.codigo}?`)) {
                                                                                    handleDeleteTaskFromModal(task.id);
                                                                                }
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
 
                                                        {/* Título */}
                                                        <h4 className="text-sm sm:text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-brand-900 transition-colors">
                                                            {task.title}
                                                        </h4>
 
                                                        {/* Fechas de Inicio y Vencimiento */}
                                                        {(task.startDate || task.dueDate) && (
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-[9px] text-slate-500 bg-slate-50/50 border border-slate-100 rounded-lg p-1.5">
                                                                {task.startDate && (
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <Calendar className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-slate-400" />
                                                                        <span>{formatDate(task.startDate)}</span>
                                                                    </div>
                                                                )}
                                                                {task.startDate && task.dueDate && <ChevronRight className="h-2.5 w-2.5 text-slate-350 shrink-0" />}
                                                                {task.dueDate && (
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-slate-400" />
                                                                        <span className={getDueDateAlert(task.dueDate) ? 'font-bold' : ''}>
                                                                            {formatDate(task.dueDate)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {/* Alerta de Vencimiento */}
                                                                {(() => {
                                                                    if (isDoneColumn(columna)) return null;
                                                                    const alert = getDueDateAlert(task.dueDate);
                                                                    if (!alert) return null;
                                                                    return (
                                                                        <span className={`text-[9px] sm:text-[7.5px] font-extrabold px-1 py-0.5 rounded border leading-none ml-auto shrink-0 ${alert.className}`}>
                                                                            {alert.text}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}

                                                        {/* Detalle Inferior: Responsable + Prioridad */}
                                                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                                                            {/* Asignados (Multi-avatar stack) */}
                                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                                    {task.asignados && task.asignados.length > 0 ? (
                                                                        task.asignados.map((u) => {
                                                                            const initials = u.nombre
                                                                                ? u.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                                                                : '?';
                                                                            return (
                                                                                <div
                                                                                    key={u.id}
                                                                                    className="inline-block h-6 w-6 sm:h-5 sm:w-5 rounded-full ring-2 ring-white bg-brand-50 border border-brand-100 flex items-center justify-center text-[9px] sm:text-[8px] font-bold text-brand-700 uppercase overflow-hidden relative shrink-0"
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
                                                                        <div className="h-6 w-6 sm:h-5 sm:w-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] sm:text-[8px] text-slate-400 font-bold" title="Sin asignar">
                                                                            ?
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="truncate max-w-[110px] sm:max-w-[85px] text-xs sm:text-[10px] font-medium text-slate-650">
                                                                    {task.asignados && task.asignados.length > 0
                                                                        ? (task.asignados.length === 1 ? task.asignados[0].nombre : `${task.asignados.length} asignados`)
                                                                        : 'Sin asignar'}
                                                                </span>
                                                            </div>

                                                            {/* Prioridad y Check si es LISTO */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {isDoneColumn(columna) ? (
                                                                    <span className="border px-2 py-0.5 rounded text-[9.5px] sm:text-[8px] font-extrabold uppercase tracking-wider bg-emerald-50 border-emerald-250 text-emerald-700 animate-fade-in">
                                                                        Completado
                                                                    </span>
                                                                ) : (
                                                                    <span className={`border px-2 py-0.5 rounded text-[9.5px] sm:text-[8px] font-extrabold uppercase tracking-wider ${getPriorityBadgeClass(task.priority)}`}>
                                                                        {task.priority === 'URGENT' ? 'Urgente' : 
                                                                         task.priority === 'HIGH' ? 'Alta' : 
                                                                         task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Botón de Creación Rápida al pie */}
                                    <div className="mt-3 border-t border-slate-200 pt-3">
                                        {addingInColumn === columna ? (
                                            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
                                                <input
                                                    type="text"
                                                    value={newTitle}
                                                    onChange={(e) => setNewTitle(e.target.value)}
                                                    placeholder="Título de la tarea..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                                                    autoFocus
                                                />
                                                <div className="flex justify-between items-center gap-1.5">
                                                    <div className="flex gap-1">
                                                        <select
                                                            value={newType}
                                                            onChange={(e) => setNewType(e.target.value)}
                                                            className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] text-slate-700"
                                                        >
                                                            {space.tiposActividad.map(t => (
                                                                <option key={t} value={t}>{translateType(t)}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={newPriority}
                                                            onChange={(e) => setNewPriority(e.target.value)}
                                                            className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] text-slate-700"
                                                        >
                                                            <option value="LOW">Baja</option>
                                                            <option value="MEDIUM">Media</option>
                                                            <option value="HIGH">Alta</option>
                                                            <option value="URGENT">Urgente</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleCreateQuickTask(columna)}
                                                            disabled={isPending}
                                                            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold p-1.5 rounded-lg transition"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setAddingInColumn(null)}
                                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setCreateModalDefaultStatus(columna);
                                                    setIsCreateModalOpen(true);
                                                }}
                                                className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-850 font-bold py-2.5 sm:py-1.5 rounded-xl text-sm sm:text-xs transition shadow-sm cursor-pointer"
                                            >
                                                <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                                Crear tarea
                                            </button>
                                        )}
                                    </div>

                                </div>
                            );
                        })}

                        {/* Botón para crear nueva columna */}
                        <div className="shrink-0 pb-4">
                            {isAddingColumn ? (
                                <div className="w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Nueva Columna</h5>
                                    <input
                                        type="text"
                                        placeholder="Nombre de la columna (ej. Listo)..."
                                        value={newColumnName}
                                        onChange={(e) => setNewColumnName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddColumn();
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => setIsAddingColumn(false)}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleAddColumn}
                                            disabled={isPending}
                                            className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                                        >
                                            Crear
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsAddingColumn(true);
                                        setNewColumnName('');
                                    }}
                                    title="Agregar Columna"
                                    className="h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-500/40 rounded-xl text-slate-500 hover:text-brand-600 transition shadow-sm cursor-pointer"
                                >
                                    <Plus className="h-5.5 w-5.5 sm:h-5 sm:w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA RESUMEN (DASHBOARD) */}
            {activeTab === 'resumen' && (
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    
                    {/* Tarjetas de Métricas Principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Actividades</span>
                            <span className="text-3xl font-extrabold text-slate-800 mt-1 block">{stats.total}</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Tareas Críticas</span>
                            <span className={`text-3xl font-extrabold mt-1 block ${stats.urgentCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                {stats.urgentCount}
                            </span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Estados Definidos</span>
                            <span className="text-3xl font-extrabold text-slate-800 mt-1 block">{columnas.length}</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Miembros Activos</span>
                            <span className="text-3xl font-extrabold text-slate-800 mt-1 block">{members.length}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Donut de Estados (Hecho con SVG) */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between min-h-[300px] shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800">Distribución de Estados</h3>
                            
                            {stats.total === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">No hay datos de tareas</div>
                            ) : (
                                <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 my-4">
                                    {/* Gráfico Donut SVG */}
                                    <div className="relative w-36 h-36">
                                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                            {/* Circulo de fondo */}
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            
                                            {/* Segmentos de color */}
                                            {(() => {
                                                let accumulatedPercentage = 0;
                                                const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6'];
                                                
                                                return columnas.map((col, idx) => {
                                                    const count = stats.columnCounts[col] || 0;
                                                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                                    const strokeDashArray = `${percentage} ${100 - percentage}`;
                                                    const strokeDashOffset = 100 - accumulatedPercentage;
                                                    accumulatedPercentage += percentage;

                                                    if (percentage === 0) return null;

                                                    return (
                                                        <circle
                                                            key={col}
                                                            cx="18"
                                                            cy="18"
                                                            r="15.915"
                                                            fill="none"
                                                            stroke={colors[idx % colors.length]}
                                                            strokeWidth="3.2"
                                                            strokeDasharray={strokeDashArray}
                                                            strokeDashoffset={strokeDashOffset}
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-slate-800">{stats.total}</span>
                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Tareas</span>
                                        </div>
                                    </div>

                                    {/* Leyenda */}
                                    <div className="flex flex-col gap-2">
                                        {columnas.map((col, idx) => {
                                            const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6'];
                                            const count = stats.columnCounts[col] || 0;
                                            return (
                                                <div key={col} className="flex items-center gap-2 text-xs">
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                                                    <span className="text-slate-600 font-medium truncate max-w-[100px]">{col}</span>
                                                    <span className="text-slate-800 font-bold">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Listado de Actividades del Espacio */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between shadow-sm">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Registro de Actividad del Espacio</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Auditoría en tiempo real de los cambios del equipo</p>
                            </div>

                            <div className="flex-1 overflow-y-auto mt-4 space-y-4 max-h-[220px] pr-1">
                                {activities.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No hay historial disponible</div>
                                ) : (
                                    activities.map((act) => (
                                        <div key={act.id} className="flex gap-3 text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                            <div className="mt-0.5 bg-brand-50 text-brand-600 p-1 rounded-md shrink-0 h-6 w-6 flex items-center justify-center">
                                                <Clock className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-slate-700 leading-relaxed">
                                                    <span className="font-bold text-slate-800">{act.usuario}</span>{' '}
                                                    {act.detalles}
                                                </p>
                                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                                    {new Date(act.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Tarea */}
            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    task={selectedTask}
                    members={members}
                    tiposActividad={space.tiposActividad}
                    columnas={columnas}
                    onUpdate={handleUpdateTaskFromModal}
                    onDelete={handleDeleteTaskFromModal}
                    activities={activities}
                    userRole={initialData.currentUserRole}
                    tasks={tasks.filter(t => t.id !== selectedTask.id).map(t => ({ id: t.id, codigo: t.codigo, title: t.title }))}
                    spaceId={space.id}
                />
            )}

            {/* Modal de Creación de Tarea */}
            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                currentSpaceId={space.id}
                spaces={initialData.spaces || []}
                members={members}
                tasks={tasks.map(t => ({ id: t.id, codigo: t.codigo, title: t.title }))}
                defaultStatus={createModalDefaultStatus}
                onCreate={handleCreateTaskFromModal}
            />
            {/* Modal de confirmación para eliminar columna */}
            {columnToDelete && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-red-600">
                            <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 stroke-[2.5]" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">¿Eliminar columna "{columnToDelete}"?</h3>
                        </div>
                        
                        <p className="text-xs text-slate-500 leading-relaxed">
                            ¿Estás seguro de que deseas eliminar esta columna? Esta acción no se puede deshacer. 
                            {columnas.filter(c => c !== columnToDelete).length > 0 && (
                                <span> Las tareas que se encuentran en esta columna serán movidas automáticamente a la columna <strong>"{columnas.filter(c => c !== columnToDelete)[0]}"</strong>.</span>
                            )}
                        </p>

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                onClick={() => setColumnToDelete(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteColumn(columnToDelete)}
                                disabled={isPending}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
                            >
                                {isPending ? 'Eliminando...' : 'Eliminar Columna'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Gestión de Accesos */}
            {isAccessModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Cabecera */}
                        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Gestionar Accesos del Espacio</h3>
                                    <p className="text-[11px] text-slate-400">Controla quién puede visualizar e interactuar en este tablero.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAccessModalOpen(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Tipo de Acceso</label>
                                <select
                                    value={accessType}
                                    onChange={(e) => setAccessType(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:border-brand-500 focus:outline-none text-sm"
                                >
                                    <option value="Abierto">Abierto (Toda la Org)</option>
                                    <option value="Restringido">Restringido</option>
                                </select>
                            </div>

                            {accessType === 'Restringido' && (
                                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                                        Miembros con Acceso Autorizado
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={accessSearchTerm}
                                            onChange={(e) => setAccessSearchTerm(e.target.value)}
                                            placeholder="Buscar por nombre o correo..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-brand-500 focus:outline-none transition"
                                        />
                                        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                                    </div>

                                    {/* Miembros Seleccionados como Tags */}
                                    {selectedMiembros.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-24 overflow-y-auto animate-in fade-in duration-200">
                                            {selectedMiembros.map(id => {
                                                const m = members.find(u => u.id === id);
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
                                                            onClick={() => setSelectedMiembros(selectedMiembros.filter(uid => uid !== id))}
                                                            className="hover:bg-brand-200/80 rounded p-0.5 text-brand-500 hover:text-brand-800 transition"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                                        {members
                                            .filter(m => m.id !== space.creadoPorId && (m.nombre.toLowerCase().includes(accessSearchTerm.toLowerCase()) || m.email?.toLowerCase().includes(accessSearchTerm.toLowerCase())))
                                            .map(m => {
                                                const isSelected = selectedMiembros.includes(m.id);
                                                return (
                                                    <div 
                                                        key={m.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedMiembros(selectedMiembros.filter(id => id !== m.id));
                                                            } else {
                                                                setSelectedMiembros([...selectedMiembros, m.id]);
                                                            }
                                                        }}
                                                        className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition ${isSelected ? 'bg-brand-50/30' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold border border-slate-200 uppercase overflow-hidden shrink-0">
                                                                {m.avatarUrl ? (
                                                                    <img src={m.avatarUrl} alt={m.nombre} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    m.nombre.substring(0, 2)
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-semibold text-slate-800 block leading-tight">{m.nombre}</span>
                                                                {m.email && <span className="text-[10px] text-slate-400">{m.email}</span>}
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
                                        * Super administradores, Ing. Emilia Zapata y el creador del espacio tienen acceso total garantizado por defecto.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Botones de Acción */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsAccessModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAccess}
                                disabled={isPending}
                                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                            >
                                {isPending ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

