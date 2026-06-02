'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
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
    Info,
    Paperclip,
    Send,
    MessageSquare,
    Download,
    FileText,
    Image as ImageIcon,
    Loader2,
    Camera,
    Users,
    SlidersHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
    getTaskCommentsAndAttachments, 
    createKanbanComment, 
    deleteKanbanComment, 
    createKanbanAttachment, 
    deleteKanbanAttachment 
} from '@/app/(dashboard)/kanban/actions';

interface Member {
    id: string;
    nombre: string;
    avatarUrl: string | null;
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
    startDate: string | null;
    etiquetas: string[];
    team: string;
    parentId: string | null;
    asignado: {
        id: string;
        nombre: string;
        avatarUrl?: string | null;
    } | null;
    asignados: {
        id: string;
        nombre: string;
        avatarUrl?: string | null;
    }[];
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
    activities: any[];
    userRole?: string;
    tasks: { id: string; codigo: string; title: string }[];
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
    activities,
    userRole,
    tasks
}: Props) {
    const [isPending, startTransition] = useTransition();
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN';
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [status, setStatus] = useState(task.status);
    const [type, setType] = useState(task.type);
    const [priority, setPriority] = useState(task.priority);
    const [asignadoId, setAsignadoId] = useState(task.asignado?.id || '');
    const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    // Advanced fields
    const [startDate, setStartDate] = useState(task.startDate ? task.startDate.split('T')[0] : '');
    const [team, setTeam] = useState(task.team || '');
    const [etiquetasInput, setEtiquetasInput] = useState(task.etiquetas ? task.etiquetas.join(', ') : '');
    const [parentId, setParentId] = useState(task.parentId || '');
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    // Estados para colaboración
    const [activeTab, setActiveTab] = useState<'comentarios' | 'actividad'>('comentarios');
    const [comments, setComments] = useState<any[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loadingCollab, setLoadingCollab] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Estados para cámara web
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Cargar comentarios y adjuntos al montar o cuando cambia la tarea/apertura
    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description);
        setStatus(task.status);
        setType(task.type);
        setPriority(task.priority);
        setAsignadoId(task.asignado?.id || '');
        setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
        setStartDate(task.startDate ? task.startDate.split('T')[0] : '');
        setTeam(task.team || '');
        setEtiquetasInput(task.etiquetas ? task.etiquetas.join(', ') : '');
        setParentId(task.parentId || '');
        setSelectedAssigneeIds(task.asignados ? task.asignados.map(a => a.id) : (task.asignado ? [task.asignado.id] : []));
        setShowAssigneeDropdown(false);
        setAssigneeSearch('');
        setIsEditingDesc(false);
        setShowDeleteConfirm(false);
        setActiveTab('comentarios');
        setShowSidebar(true);

        // Detener la cámara si cambia la tarea o se cierra el modal
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            setShowCameraModal(false);
        }

        if (isOpen && task.id) {
            loadCommentsAndAttachments();
        }
    }, [task, isOpen]);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const openCamera = async () => {
        setShowCameraModal(true);
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }, // preferir cámara trasera si está disponible
                    audio: false
                });
                setCameraStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                toast.error("No se pudo iniciar la cámara web. Puedes usar la cámara nativa con el botón 'Cámara de Dispositivo'.");
            }
        }, 300);
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCameraModal(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 1280;
            canvas.height = videoRef.current.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        await handleFileUpload(file);
                        closeCamera();
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    const loadCommentsAndAttachments = async () => {
        setLoadingCollab(true);
        try {
            const res = await getTaskCommentsAndAttachments(task.id);
            if (res.success && res.comments && res.attachments) {
                setComments(res.comments);
                setAttachments(res.attachments);
            }
        } catch (error) {
            console.error("Error al cargar colaboración:", error);
            toast.error("Error al cargar comentarios");
        } finally {
            setLoadingCollab(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) { // 20MB limit
            toast.error(`El archivo "${file.name}" supera el límite de 20MB`);
            return;
        }

        setIsUploading(true);
        try {
            // 1. Obtener URL pre-firmada de subida
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                }),
            });

            if (!response.ok) throw new Error('Error solicitando URL de subida');
            const { uploadUrl, publicUrl } = await response.json();

            // 2. Subir directamente a R2
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) throw new Error('Error al subir el archivo');

            // 3. Guardar registro en la base de datos
            const dbRes = await createKanbanAttachment({
                taskId: task.id,
                nombre: file.name,
                url: publicUrl,
                tipo: file.type,
                tamano: file.size
            });

            if (dbRes.success && dbRes.attachment) {
                setAttachments(prev => [dbRes.attachment, ...prev]);
                toast.success(`Archivo "${file.name}" subido con éxito`);
            } else {
                throw new Error(dbRes.error || 'Error al registrar el archivo');
            }
        } catch (err: any) {
            console.error('[Upload Error]:', err);
            toast.error(`Error al subir "${file.name}": ${err.message || err}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                await handleFileUpload(files[i]);
            }
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const commentText = newComment;
        setNewComment("");

        try {
            const res = await createKanbanComment(task.id, commentText);
            if (res.success && res.comment) {
                setComments(prev => [...prev, res.comment]);
                toast.success('Comentario añadido');
            } else {
                toast.error(res.error || 'Error al guardar comentario');
                setNewComment(commentText);
            }
        } catch (error) {
            console.error("Error al crear comentario:", error);
            toast.error('Error de servidor al guardar comentario');
            setNewComment(commentText);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('¿Confirmas que deseas eliminar este comentario?')) return;
        try {
            const res = await deleteKanbanComment(commentId);
            if (res.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                toast.success('Comentario eliminado');
            } else {
                toast.error(res.error || 'Error al eliminar comentario');
            }
        } catch (error) {
            console.error("Error al eliminar comentario:", error);
            toast.error('Error al eliminar comentario');
        }
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (!window.confirm('¿Confirmas que deseas eliminar este archivo adjunto?')) return;
        try {
            const res = await deleteKanbanAttachment(attachmentId);
            if (res.success) {
                setAttachments(prev => prev.filter(a => a.id !== attachmentId));
                toast.success('Archivo adjunto eliminado');
            } else {
                toast.error(res.error || 'Error al eliminar archivo');
            }
        } catch (error) {
            console.error("Error al eliminar adjunto:", error);
            toast.error('Error al eliminar archivo');
        }
    };

    const getFileIcon = (tipo: string) => {
        if (tipo.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
        if (tipo.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
        if (tipo.includes('excel') || tipo.includes('spreadsheet') || tipo.includes('sheet') || tipo.includes('csv')) return <FileText className="h-6 w-6 text-emerald-500" />;
        return <FileText className="h-6 w-6 text-slate-400" />;
    };

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
                if (fieldName === 'startDate') setStartDate(value);
                if (fieldName === 'team') setTeam(value);
                if (fieldName === 'etiquetas') setEtiquetasInput(value ? value.join(', ') : '');
                if (fieldName === 'parentId') setParentId(value);
            }
        });
    };

    const handleToggleAssignee = (id: string) => {
        const updatedIds = selectedAssigneeIds.includes(id)
            ? selectedAssigneeIds.filter(aId => aId !== id)
            : [...selectedAssigneeIds, id];
        setSelectedAssigneeIds(updatedIds);
        
        startTransition(async () => {
            const success = await onUpdate(task.id, { asignadoIds: updatedIds });
            if (success) {
                setAsignadoId(updatedIds.length > 0 ? updatedIds[0] : '');
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] max-h-[90vh]">
                
                {/* Lado Izquierdo: Contenido Editable de Tarea */}
                <div 
                    className="relative flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-slate-100 bg-white"
                    onDragOver={handleDragOver}
                >
                    {isDragging && (
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className="absolute inset-0 bg-brand-500/10 backdrop-blur-[2px] border-2 border-dashed border-brand-500 rounded-l-2xl flex flex-col items-center justify-center z-50 transition-all duration-300"
                        >
                            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 animate-bounce">
                                <Paperclip className="h-10 w-10 text-brand-600 animate-pulse" />
                                <p className="text-sm font-bold text-slate-700">Suelta tus archivos aquí</p>
                                <p className="text-xs text-slate-400">Imágenes, PDFs, Excels, etc. (Máx 20MB)</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        
                        {/* Cabecera: Código de la tarea y Botón de Cerrar */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                                    {task.codigo}
                                </span>
                                
                                {/* Botón para ocultar/mostrar panel lateral en móvil */}
                                <button
                                    type="button"
                                    onClick={() => setShowSidebar(!showSidebar)}
                                    className="md:hidden flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-brand-600 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-50 transition border border-slate-200"
                                >
                                    <SlidersHorizontal className="h-3 w-3 text-slate-500" />
                                    {showSidebar ? 'Ocultar Opciones' : 'Ver Opciones'}
                                </button>
                            </div>
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

                        {/* Actividad / Colaboración (Tabs) */}
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div className="flex gap-4 border-b border-slate-100 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('comentarios')}
                                    className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition ${
                                        activeTab === 'comentarios' 
                                            ? 'border-brand-600 text-brand-600' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Conversación ({comments.length + attachments.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('actividad')}
                                    className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition ${
                                        activeTab === 'actividad' 
                                            ? 'border-brand-600 text-brand-600' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Historial ({taskActivities.length})
                                </button>
                            </div>

                            {activeTab === 'actividad' ? (
                                <div className="space-y-3">
                                    {taskActivities.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No hay registros de actividad para esta tarea.</p>
                                    ) : (
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
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
                            ) : (
                                <div className="space-y-4">
                                    {/* Lista de adjuntos */}
                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archivos Adjuntos ({attachments.length})</h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {attachments.map((att) => {
                                                    const isImg = att.tipo.startsWith('image/');
                                                    return (
                                                        <div key={att.id} className="group relative rounded-xl border border-slate-100 bg-slate-50 hover:bg-white p-2 transition flex flex-col gap-1.5 shadow-sm hover:shadow">
                                                            {isImg ? (
                                                                <a 
                                                                    href={att.url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="relative block aspect-video rounded-lg overflow-hidden border border-slate-200/50 bg-white"
                                                                >
                                                                    <img src={att.url} alt={att.nombre} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                                                </a>
                                                            ) : (
                                                                <div className="aspect-video rounded-lg border border-slate-200/50 bg-slate-100 flex items-center justify-center">
                                                                    {getFileIcon(att.tipo)}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col gap-0.5 min-w-0 px-1">
                                                                <p className="text-[10px] font-bold text-slate-700 truncate" title={att.nombre}>{att.nombre}</p>
                                                                <p className="text-[8px] text-slate-400">{(att.tamano / 1024).toFixed(1)} KB • {att.subidoPor.nombre}</p>
                                                            </div>
                                                            
                                                            {/* Acciones del Adjunto */}
                                                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                <a 
                                                                    href={att.url} 
                                                                    download={att.nombre} 
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1 bg-white border border-slate-150 rounded-md text-slate-500 hover:text-slate-700 shadow-sm transition"
                                                                    title="Descargar/Ver"
                                                                >
                                                                    <Download className="h-3 w-3" />
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteAttachment(att.id)}
                                                                    className="p-1 bg-white border border-slate-150 hover:border-red-100 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 shadow-sm transition"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hilo de Comentarios */}
                                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                                        {loadingCollab ? (
                                            <div className="flex items-center justify-center py-6">
                                                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                                            </div>
                                        ) : comments.length === 0 ? (
                                            <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-xs text-slate-500 font-medium">No hay comentarios aún</p>
                                                <p className="text-[10px] text-slate-400">Inicia la conversación o arrastra archivos aquí para interactuar.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {comments.map((comm) => {
                                                    const initials = comm.usuario.nombre
                                                        ? comm.usuario.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                                        : '?';
                                                    return (
                                                        <div key={comm.id} className="flex gap-2.5 items-start group">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                                                                {initials}
                                                            </div>
                                                            <div className="flex-1 bg-slate-50/60 border border-slate-100 rounded-xl px-3.5 py-2 hover:bg-slate-50 transition relative">
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className="text-[10px] font-bold text-slate-800">{comm.usuario.nombre}</span>
                                                                    <span className="text-[9px] text-slate-400">
                                                                        {new Date(comm.createdAt).toLocaleDateString()} {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{comm.contenido}</p>
                                                                
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteComment(comm.id)}
                                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-red-600"
                                                                    title="Eliminar comentario"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Editor de comentarios */}
                                    <div className="space-y-2">
                                        <form onSubmit={handleAddComment} className="flex gap-2 items-end pt-2">
                                            <div className="flex-1 bg-slate-50 hover:bg-slate-100/75 border border-slate-200 focus-within:border-brand-500 focus-within:bg-white rounded-xl px-3 py-1.5 transition flex items-end gap-2">
                                                <textarea
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Escribe los hallazgos o comentarios aquí..."
                                                    rows={3}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleAddComment(e);
                                                        }
                                                    }}
                                                    className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none min-h-[75px] max-h-[200px] py-1"
                                                />
                                                
                                                <input 
                                                    type="file" 
                                                    id="kanban-file-upload" 
                                                    multiple 
                                                    className="hidden" 
                                                    onChange={async (e) => {
                                                        const files = e.target.files;
                                                        if (files && files.length > 0) {
                                                            for (let i = 0; i < files.length; i++) {
                                                                await handleFileUpload(files[i]);
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={openCamera}
                                                    className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition shrink-0"
                                                    title="Tomar fotografía"
                                                >
                                                    <Camera className="h-3.5 w-3.5" />
                                                </button>

                                                <label 
                                                    htmlFor="kanban-file-upload"
                                                    className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition shrink-0"
                                                    title="Adjuntar archivos"
                                                >
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                </label>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!newComment.trim()}
                                                className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 text-white disabled:text-slate-300 rounded-xl transition shadow-sm shrink-0"
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                            </button>
                                        </form>

                                        {isUploading && (
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 justify-center py-1">
                                                <Loader2 className="h-3 w-3 animate-spin text-brand-500" />
                                                Subiendo archivo a Cloudflare R2...
                                            </div>
                                        )}
                                    </div>

                                    {/* Solapa flotante inferior para volver a ver el panel de opciones si está oculto en móvil */}
                                    {!showSidebar && (
                                        <button
                                            type="button"
                                            onClick={() => setShowSidebar(true)}
                                            className="md:hidden w-full text-center py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition mt-3 flex items-center justify-center gap-1.5"
                                        >
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-brand-600" />
                                            Mostrar Opciones (Estado, Asignados, etc.) ↓
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Lado Derecho: Panel de Metadatos y Acciones */}
                <div className={`w-full md:w-[320px] bg-slate-50 p-6 md:p-8 flex-col justify-between overflow-y-auto border-t md:border-t-0 border-slate-100 ${
                    showSidebar ? 'flex' : 'hidden md:flex'
                }`}>
                    
                    {/* Controles de Metadatos */}
                    <div className="space-y-5">
                        {/* Cabecera del Panel lateral para Móviles para colapsarlo */}
                        <div className="flex md:hidden items-center justify-between pb-3 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Opciones & Detalles</span>
                            <button
                                type="button"
                                onClick={() => setShowSidebar(false)}
                                className="text-[10px] font-black text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-md border border-brand-200 transition uppercase tracking-wider"
                            >
                                Ocultar panel ↑
                            </button>
                        </div>

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

                        {/* Personas Asignadas (Multi-select) */}
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
                                    <span className="text-slate-400 text-xs">Seleccionar responsables...</span>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {selectedAssigneeIds.map(id => {
                                            const member = members.find(m => m.id === id);
                                            if (!member) return null;
                                            const initials = member.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                            return (
                                                <div 
                                                    key={id} 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleAssignee(id); }}
                                                    className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg pl-1 pr-1.5 py-0.5 text-[10px] text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                                                    title="Haga clic para remover"
                                                >
                                                    <div className="h-3.5 w-3.5 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-[6px] font-bold text-brand-700 uppercase overflow-hidden relative shrink-0">
                                                        {member.avatarUrl ? (
                                                            <img src={member.avatarUrl} alt={member.nombre} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{initials}</span>
                                                        )}
                                                    </div>
                                                    <span className="font-semibold truncate max-w-[80px]">{member.nombre}</span>
                                                    <span className="text-[9px] opacity-60 font-bold">&times;</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <span className="text-[10px] text-slate-400 font-bold">▼</span>
                            </div>

                            {showAssigneeDropdown && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-48 flex flex-col">
                                    <input
                                        type="text"
                                        placeholder="Buscar miembro..."
                                        value={assigneeSearch}
                                        onChange={(e) => setAssigneeSearch(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 mb-1.5 shrink-0"
                                    />
                                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                                        {members.filter(m => m.nombre.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 ? (
                                            <p className="text-[10px] text-slate-400 text-center py-2 italic">No se encontraron miembros</p>
                                        ) : (
                                            members.filter(m => m.nombre.toLowerCase().includes(assigneeSearch.toLowerCase())).map(m => {
                                                const isChecked = selectedAssigneeIds.includes(m.id);
                                                const initials = m.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                                return (
                                                    <div
                                                        key={m.id}
                                                        onClick={() => handleToggleAssignee(m.id)}
                                                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${isChecked ? 'bg-brand-50/50 text-brand-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="h-4.5 w-4.5 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-[7px] font-bold text-brand-700 uppercase overflow-hidden relative shrink-0">
                                                                {m.avatarUrl ? (
                                                                    <img src={m.avatarUrl} alt={m.nombre} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <span>{initials}</span>
                                                                )}
                                                            </div>
                                                            <span className="font-medium">{m.nombre}</span>
                                                        </div>
                                                        {isChecked && <Check className="h-3 w-3 text-brand-600 shrink-0" />}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
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

                        {/* Tarea Principal (Parent) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tarea Principal</label>
                            <select
                                value={parentId}
                                onChange={(e) => handleFieldChange('parentId', e.target.value || null)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            >
                                <option value="">Ninguna (Tarea raíz)</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id}>{t.codigo} - {t.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Equipo (Team) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Equipo (Team)</label>
                            <input
                                type="text"
                                value={team}
                                onChange={(e) => setTeam(e.target.value)}
                                onBlur={() => {
                                    if (team !== (task.team || '')) {
                                        handleFieldChange('team', team.trim() || null);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (team !== (task.team || '')) {
                                            handleFieldChange('team', team.trim() || null);
                                        }
                                    }
                                }}
                                placeholder="ej: Mantenimiento, Software"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        {/* Fecha de Inicio */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                Fecha de Inicio
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleFieldChange('startDate', e.target.value || null)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        {/* Fecha de vencimiento */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                Fecha Límite
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => handleFieldChange('dueDate', e.target.value || null)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        {/* Etiquetas */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Etiquetas (Separadas por comas)</label>
                            <input
                                type="text"
                                value={etiquetasInput}
                                onChange={(e) => setEtiquetasInput(e.target.value)}
                                onBlur={() => {
                                    const arrayVal = etiquetasInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
                                    const oldArrayVal = task.etiquetas || [];
                                    if (JSON.stringify(arrayVal) !== JSON.stringify(oldArrayVal)) {
                                        handleFieldChange('etiquetas', arrayVal);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const arrayVal = etiquetasInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
                                        const oldArrayVal = task.etiquetas || [];
                                        if (JSON.stringify(arrayVal) !== JSON.stringify(oldArrayVal)) {
                                            handleFieldChange('etiquetas', arrayVal);
                                        }
                                    }
                                }}
                                placeholder="ej: urgente, soporte, base-de-datos"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Botones de acción inferior */}
                    {isAdmin && (
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
                        </div>
                    )}
                    <span className="text-[10px] text-slate-400 block text-center mt-3 font-medium">
                        Creado: {new Date(task.createdAt).toLocaleDateString()}
                    </span>

                </div>

            </div>

            {/* Modal de Cámara */}
            {showCameraModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-955/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <Camera className="h-4 w-4 text-brand-600 animate-pulse" />
                                Tomar Fotografía
                            </h3>
                            <button 
                                type="button"
                                onClick={closeCamera}
                                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="relative aspect-video bg-black flex flex-col items-center justify-center overflow-hidden">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover"
                            />
                            {!cameraStream && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-900 gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                                    <span>Iniciando cámara...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 flex gap-2 justify-center">
                            <button
                                type="button"
                                onClick={capturePhoto}
                                disabled={!cameraStream}
                                className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
                            >
                                <Camera className="h-3.5 w-3.5" />
                                Capturar
                            </button>
                            
                            {/* Mobile camera fallback */}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                id="mobile-camera-input"
                                className="hidden"
                                onChange={async (e) => {
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                        await handleFileUpload(files[0]);
                                        closeCamera();
                                    }
                                }}
                            />
                            <label
                                htmlFor="mobile-camera-input"
                                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition flex items-center gap-1.5"
                            >
                                Cámara de Dispositivo
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
