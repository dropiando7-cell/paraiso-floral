'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
    X, 
    Check, 
    User as UserIcon, 
    Calendar, 
    Tag, 
    Users, 
    AlignLeft, 
    Briefcase,
    Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Space {
    id: string;
    nombre: string;
    clave: string;
    columnas: string[];
    tiposActividad: string[];
}

interface Member {
    id: string;
    nombre: string;
    avatarUrl: string | null;
}

interface Task {
    id: string;
    codigo: string;
    title: string;
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSpaceId: string;
    spaces: Space[];
    members: Member[];
    tasks: Task[]; // Para asociar a tarea principal
    onCreate: (taskData: any) => Promise<boolean>;
}

export default function CreateTaskModal({
    isOpen,
    onClose,
    currentSpaceId,
    spaces,
    members,
    tasks,
    onCreate
}: CreateTaskModalProps) {
    const [isPending, startTransition] = useTransition();

    // Form states
    const [selectedSpaceId, setSelectedSpaceId] = useState(currentSpaceId);
    const [type, setType] = useState('Task');
    const [status, setStatus] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    
    // Multi assignees
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    // Advanced metadata fields
    const [parentId, setParentId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [etiquetasInput, setEtiquetasInput] = useState('');
    const [team, setTeam] = useState('');

    const activeSpace = spaces.find(s => s.id === selectedSpaceId) || spaces[0];

    // Reset or update state when space changes
    useEffect(() => {
        if (activeSpace) {
            if (!activeSpace.tiposActividad.includes(type)) {
                setType(activeSpace.tiposActividad[0] || 'Task');
            }
            setStatus(activeSpace.columnas[0] || 'Por hacer');
        }
    }, [selectedSpaceId, activeSpace]);

    // Initialize/Reset form on open
    useEffect(() => {
        if (isOpen) {
            setSelectedSpaceId(currentSpaceId);
            setTitle('');
            setDescription('');
            setPriority('MEDIUM');
            setSelectedAssigneeIds([]);
            setParentId('');
            setDueDate('');
            setStartDate('');
            setEtiquetasInput('');
            setTeam('');
            setShowAssigneeDropdown(false);
            setAssigneeSearch('');
        }
    }, [isOpen, currentSpaceId]);

    if (!isOpen) return null;

    const filteredMembers = members.filter(m => 
        m.nombre.toLowerCase().includes(assigneeSearch.toLowerCase())
    );

    const handleToggleAssignee = (id: string) => {
        setSelectedAssigneeIds(prev => 
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('El resumen (título) es obligatorio.');
            return;
        }

        // Convertir etiquetas comma-separated en array
        const etiquetas = etiquetasInput
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        const taskData = {
            spaceId: selectedSpaceId,
            title: title.trim(),
            description: description.trim() || undefined,
            status,
            type,
            priority,
            asignadoIds: selectedAssigneeIds,
            dueDate: dueDate || undefined,
            startDate: startDate || undefined,
            parentId: parentId || undefined,
            etiquetas,
            team: team.trim() || undefined
        };

        startTransition(async () => {
            const success = await onCreate(taskData);
            if (success) {
                onClose();
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Cabecera */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
                    <div>
                        <h3 className="text-base font-extrabold text-slate-900">Crear Incidencia / Actividad</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Define los detalles y asigna recursos en tu espacio de trabajo</p>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-250 rounded-xl text-slate-400 hover:text-slate-700 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Fila 1: Espacio de Trabajo & Tipo de Actividad */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Briefcase className="h-3 w-3 text-slate-400" />
                                Espacio de Trabajo *
                            </label>
                            <select
                                value={selectedSpaceId}
                                onChange={(e) => setSelectedSpaceId(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            >
                                {spaces.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre} ({s.clave})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Tag className="h-3 w-3 text-slate-400" />
                                Tipo de Actividad *
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            >
                                {activeSpace?.tiposActividad.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Fila 2: Estado Inicial & Prioridad */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Estado Inicial *</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            >
                                {activeSpace?.columnas.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Prioridad</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            >
                                <option value="LOW">Baja</option>
                                <option value="MEDIUM">Media</option>
                                <option value="HIGH">Alta</option>
                                <option value="URGENT">Urgente</option>
                            </select>
                        </div>
                    </div>

                    {/* Resumen / Título */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Resumen *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Escribe un breve resumen de la tarea..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            required
                        />
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                            <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
                            Descripción
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provee una descripción detallada de los requisitos y criterios de aceptación..."
                            rows={4}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition shadow-sm"
                        />
                    </div>

                    {/* Personas Asignadas (Multi-select personalizado) */}
                    <div className="space-y-1.5 relative">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            Personas Asignadas ({selectedAssigneeIds.length})
                        </label>
                        
                        <div 
                            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                            className="min-h-[42px] w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 cursor-pointer focus:border-brand-500 transition shadow-sm flex flex-wrap gap-1.5 items-center justify-between"
                        >
                            {selectedAssigneeIds.length === 0 ? (
                                <span className="text-slate-400">Seleccionar responsables...</span>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedAssigneeIds.map(id => {
                                        const member = members.find(m => m.id === id);
                                        if (!member) return null;
                                        const initials = member.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                        return (
                                            <div 
                                                key={id} 
                                                onClick={(e) => { e.stopPropagation(); handleToggleAssignee(id); }}
                                                className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg pl-1.5 pr-2 py-0.5 text-xs text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                                                title="Haga clic para remover"
                                            >
                                                <div className="h-4.5 w-4.5 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-[7px] font-bold text-brand-700 uppercase overflow-hidden relative shrink-0">
                                                    {member.avatarUrl ? (
                                                        <img src={member.avatarUrl} alt={member.nombre} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span>{initials}</span>
                                                    )}
                                                </div>
                                                <span className="font-semibold">{member.nombre}</span>
                                                <span className="text-[10px] opacity-60 font-bold ml-0.5">&times;</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <span className="text-xs text-slate-400 px-1 font-bold">▼</span>
                        </div>

                        {showAssigneeDropdown && (
                            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-56 flex flex-col">
                                <input
                                    type="text"
                                    placeholder="Buscar miembro..."
                                    value={assigneeSearch}
                                    onChange={(e) => setAssigneeSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 mb-2 shrink-0"
                                />
                                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                                    {filteredMembers.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-2 italic">No se encontraron miembros</p>
                                    ) : (
                                        filteredMembers.map(m => {
                                            const isChecked = selectedAssigneeIds.includes(m.id);
                                            const initials = m.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                            return (
                                                <div
                                                    key={m.id}
                                                    onClick={() => handleToggleAssignee(m.id)}
                                                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${isChecked ? 'bg-brand-50/50 text-brand-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-5 w-5 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-[8px] font-bold text-brand-700 uppercase overflow-hidden relative shrink-0">
                                                            {m.avatarUrl ? (
                                                                <img src={m.avatarUrl} alt={m.nombre} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span>{initials}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-medium">{m.nombre}</span>
                                                    </div>
                                                    {isChecked && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fila 3: Tarea Principal (Parent) & Equipo (Team) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tarea Principal (Principal)</label>
                            <select
                                value={parentId}
                                onChange={(e) => setParentId(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            >
                                <option value="">Ninguna (Tarea raíz)</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id}>{t.codigo} - {t.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Equipo (Team)</label>
                            <input
                                type="text"
                                value={team}
                                onChange={(e) => setTeam(e.target.value)}
                                placeholder="ej: Mantenimiento, Software"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Fila 4: Fecha de Inicio & Fecha de Vencimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                Fecha de Inicio
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                Fecha de Vencimiento
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Etiquetas (Tags) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Etiquetas (Separadas por comas)</label>
                        <input
                            type="text"
                            value={etiquetasInput}
                            onChange={(e) => setEtiquetasInput(e.target.value)}
                            placeholder="ej: urgente, soporte, base-de-datos"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition shadow-sm"
                        />
                    </div>
                </form>

                {/* Acciones de Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition"
                        disabled={isPending}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleFormSubmit}
                        disabled={isPending}
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 min-w-[100px] justify-center"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            'Crear Tarea'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
