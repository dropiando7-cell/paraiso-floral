'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
    X, 
    Trash2, 
    Calendar, 
    User as UserIcon, 
    AlertTriangle, 
    Tag, 
    Clock, 
    Check, 
    AlignLeft, 
    Save, 
    Info 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Member {
    id: string;
    nombre: string;
}

interface Task {
    id: string;
    codigo: string;
    title: string;
    description: string;
    status: string;
    type: string;
    priority: string;
    dueDate: string | null;
    asignado: {
        id: string;
        nombre: string;
    } | null;
    createdAt: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    task: Task;
    members: Member[];
    tiposActividad: string[];
    columnas: string[];
    onUpdate: (taskId: string, fields: any) => Promise<boolean>;
    onDelete: (taskId: string) => Promise<boolean>;
    activities: any[]; // Historial de actividades de esta tarea
}

export default function TaskDetailModal({
    isOpen,
    onClose,
    task,
    members,
    tiposActividad,
    columnas,
    onUpdate,
    onDelete,
    activities
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [status, setStatus] = useState(task.status);
    const [type, setType] = useState(task.type);
    const [priority, setPriority] = useState(task.priority);
    const [asignadoId, setAsignadoId] = useState(task.asignado?.id || '');
    const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Sincronizar estados locales cuando cambia la tarea seleccionada
    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description);
        setStatus(task.status);
        setType(task.type);
        setPriority(task.priority);
        setAsignadoId(task.asignado?.id || '');
        setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
        setIsEditingDesc(false);
        setShowDeleteConfirm(false);
    }, [task]);

    if (!isOpen) return null;

    // Actualizar campo individual de forma inmediata
    const handleFieldChange = (fieldName: string, value: any) => {
        startTransition(async () => {
            const success = await onUpdate(task.id, { [fieldName]: value });
            if (success) {
                // Sincronizar estado local en caso de que sea exitoso
                if (fieldName === 'status') setStatus(value);
                if (fieldName === 'type') setType(value);
                if (fieldName === 'priority') setPriority(value);
                if (fieldName === 'asignadoId') setAsignadoId(value);
                if (fieldName === 'dueDate') setDueDate(value);
            }
        });
    };

    // Guardar Título
    const handleSaveTitle = () => {
        if (!title.trim()) {
            setTitle(task.title);
            return;
        }
        if (title.trim() !== task.title) {
            handleFieldChange('title', title.trim());
        }
    };

    // Guardar Descripción
    const handleSaveDescription = () => {
        if (description !== task.description) {
            handleFieldChange('description', description);
        }
        setIsEditingDesc(false);
    };

    // Eliminar Tarea
    const handleDeleteTask = () => {
        startTransition(async () => {
            const success = await onDelete(task.id);
            if (success) {
                onClose();
            }
        });
    };

    // Filtrar actividades relativas a esta tarea específica
    const taskActivities = activities.filter(act => act.taskId === task.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] max-h-[90vh]">
                
                {/* Lado Izquierdo: Contenido Editable de Tarea */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-slate-100 bg-white">
                    <div className="space-y-6">
                        
                        {/* Cabecera: Código de la tarea y Botón de Cerrar */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                                {task.codigo}
                            </span>
                            <button 
                                onClick={onClose}
                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition md:hidden"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Título editable */}
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleSaveTitle}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 text-2xl font-bold text-slate-800 px-1 py-0.5 focus:outline-none transition"
                            />
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <AlignLeft className="h-4 w-4 text-slate-400" />
                                Descripción
                            </div>
                            
                            {isEditingDesc ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={5}
                                        placeholder="Describe de qué trata esta actividad..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveDescription}
                                            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                                        >
                                            <Save className="h-3.5 w-3.5" />
                                            Guardar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDescription(task.description);
                                                setIsEditingDesc(false);
                                            }}
                                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg transition"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setIsEditingDesc(true)}
                                    className="w-full min-h-[80px] bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-xl p-3 text-sm text-slate-700 cursor-pointer transition whitespace-pre-wrap"
                                >
                                    {description || <span className="text-slate-400 italic">No hay descripción detallada. Haz clic aquí para añadir una.</span>}
                                </div>
                            )}
                        </div>

                        {/* Actividad / Historial */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                Actividad Reciente
                            </h4>

                            {taskActivities.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No hay registros de actividad para esta tarea.</p>
                            ) : (
                                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                                    {taskActivities.map((act) => (
                                        <div key={act.id} className="text-xs flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800">{act.usuario}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(act.createdAt).toLocaleDateString()} {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-slate-600">{act.detalles}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Lado Derecho: Panel de Metadatos y Acciones */}
                <div className="w-full md:w-[320px] bg-slate-50 p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 border-slate-100">
                    
                    {/* Controles de Metadatos */}
                    <div className="space-y-5">
                        <div className="hidden md:flex justify-end pb-2 border-b border-slate-200">
                            <button 
                                onClick={onClose}
                                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Selector de Estado */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Estado</label>
                            <select
                                value={status}
                                onChange={(e) => handleFieldChange('status', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            >
                                {columnas.map((col) => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de Asignado */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                Responsable
                            </label>
                            <select
                                value={asignadoId}
                                onChange={(e) => handleFieldChange('asignadoId', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            >
                                <option value="">Sin asignar</option>
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de Tipo */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                Tipo de Actividad
                            </label>
                            <select
                                value={type}
                                onChange={(e) => handleFieldChange('type', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            >
                                {tiposActividad.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Prioridad */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Prioridad</label>
                            <select
                                value={priority}
                                onChange={(e) => handleFieldChange('priority', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            >
                                <option value="LOW" className="text-slate-500">Baja</option>
                                <option value="MEDIUM" className="text-blue-600 font-semibold">Media</option>
                                <option value="HIGH" className="text-amber-700 font-semibold">Alta</option>
                                <option value="URGENT" className="text-red-600 font-bold">Urgente</option>
                            </select>
                        </div>

                        {/* Fecha de vencimiento */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Fecha Límite
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => handleFieldChange('dueDate', e.target.value || null)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Botones de acción inferior */}
                    <div className="pt-6 border-t border-slate-200 mt-5">
                        {showDeleteConfirm ? (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2.5">
                                <div className="text-xs text-red-700 font-bold flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    ¿Confirmas eliminar la tarea?
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDeleteTask}
                                        disabled={isPending}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition"
                                    >
                                        Eliminar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] py-1.5 rounded-lg transition"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 text-slate-500 font-semibold py-2 rounded-xl text-sm transition"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar Tarea
                            </button>
                        )}
                        <span className="text-[10px] text-slate-400 block text-center mt-3 font-medium">
                            Creado: {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                    </div>

                </div>

            </div>
        </div>
    );
}
