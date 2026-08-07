'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { 
    X, 
    Trash2, 
    Calendar, 
    User as UserIcon, 
    AlertTriangle, 
    AlertCircle,
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
    SlidersHorizontal,
    Pencil,
    Video,
    Mic,
    Play,
    Square,
    RefreshCw,
    Volume2,
    Plus,
    Package,
    Wrench,
    RotateCcw,
    PenTool,
    Sparkles,
    Share2,
    ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { compressImage } from '@/utils/image';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { getOrdenDetalleSimplificado, guardarFirmaOrden } from '@/app/(dashboard)/soporte/actions';
import CompartirInformeModal from '@/components/soporte/CompartirInformeModal';
import ReportConfigModal from '@/components/pdf/ReportConfigModal';
import CronometroTrabajo from '@/components/soporte/CronometroTrabajo';
import { 
    getTaskCommentsAndAttachments, 
    createKanbanComment, 
    deleteKanbanComment, 
    updateKanbanComment,
    createKanbanAttachment, 
    deleteKanbanAttachment,
    updateKanbanAttachmentDescription,
    addActivityTypeToSpace,
    getTaskMaterials,
    consumeMaterialForTask,
    cancelMaterialConsumptionForTask,
    searchMaterialsForTask,
    getTaskTiempos
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
    modulo: string | null;
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
    ordenTrabajoId?: string | null;
}

const SIDEBAR_MODULES = [
    "Portal Bioelectrónica",
    "Órdenes de Trabajo",
    "Soporte Técnico",
    "Inventario IA",
    "Rentas de Equipos",
    "Control de Caja Chica",
    "Gráficas e Informes",
    "Control de Inventario",
    "Garantías y Reemplazos",
    "Catálogo de Modelos",
    "Entradas / Compras",
    "Salidas / Descargas",
    "Kardex de Movimientos",
    "Gestor de Precios",
    "Ubicaciones y Sucursales",
    "Inventario (Odoo)",
    "Directorio de Contactos",
    "Cotizaciones",
    "Facturación",
    "Cierre de Caja",
    "Usuarios y Roles",
    "Gestión Web / Tienda"
];

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
    userAccessibleModules?: string[];
    tasks: { id: string; codigo: string; title: string }[];
    spaceId: string;
}

const formatTaskDescription = (desc: string) => {
  if (!desc) return '';
  if (!desc.includes('<')) return desc;
  return desc
    .replace(/<li>\s*<p>/gi, '\n- ')
    .replace(/<li>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
};

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
    userAccessibleModules,
    tasks,
    spaceId
}: Props) {
    const router = useRouter();
    const isDoneColumn = (columnName: string) => {
        const lower = (columnName || '').toLowerCase();
        return lower === 'listo' || lower === 'completado' || lower === 'done' || lower === 'terminado' || lower === 'finalizado';
    };

    const isDone = isDoneColumn(task.status);
    const canReopenCompletedOrders = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN' || (userAccessibleModules || []).includes('reabrir_ordenes_completadas');
    const isLocked = isDone && !!task.ordenTrabajoId && !canReopenCompletedOrders;

    const [isPending, startTransition] = useTransition();
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN';
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [status, setStatus] = useState(task.status);
    const [type, setType] = useState(task.type);
    
    const [localTiposActividad, setLocalTiposActividad] = useState<string[]>(tiposActividad);

    useEffect(() => {
        setLocalTiposActividad(tiposActividad);
    }, [tiposActividad]);

    const [priority, setPriority] = useState(task.priority);
    const [asignadoId, setAsignadoId] = useState(task.asignado?.id || '');
    const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState<{ value: string; isCompleting: boolean; isReopening: boolean } | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);

    // Advanced fields
    const [startDate, setStartDate] = useState(task.startDate ? task.startDate.split('T')[0] : '');
    const [team, setTeam] = useState(task.team || '');
    const [selectedModulo, setSelectedModulo] = useState(task.modulo || '');
    const [etiquetasInput, setEtiquetasInput] = useState(task.etiquetas ? task.etiquetas.join(', ') : '');
    const [parentId, setParentId] = useState(task.parentId || '');
    const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    // Estados para colaboración
    const [activeTab, setActiveTab] = useState<'comentarios' | 'actividad' | 'materiales' | 'firmas' | 'tiempos'>('comentarios');
    const [ordenDetalle, setOrdenDetalle] = useState<any | null>(null);
    const [loadingOrdenDetalle, setLoadingOrdenDetalle] = useState(false);
    const [localTiempos, setLocalTiempos] = useState<any[]>([]);
    const [loadingTiempos, setLoadingTiempos] = useState(false);

    // Client signature states
    const sigClientCanvasRef = useRef<SignatureCanvas>(null);
    const [clientSignerName, setClientSignerName] = useState('');
    const [saveFirmaFuture, setSaveFirmaFuture] = useState(false);
    const [clientHasDrawn, setClientHasDrawn] = useState(false);
    const [isSavingClientFirma, setIsSavingClientFirma] = useState(false);
    const [clientFirmaOverride, setClientFirmaOverride] = useState(false);

    // Technician signature states
    const sigTechCanvasRef = useRef<SignatureCanvas>(null);
    const [techSignerName, setTechSignerName] = useState('');
    const [techHasDrawn, setTechHasDrawn] = useState(false);
    const [isSavingTechFirma, setIsSavingTechFirma] = useState(false);
    const [techFirmaOverride, setTechFirmaOverride] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const loadOrdenDetalle = async () => {
        if (!task.ordenTrabajoId) return;
        setLoadingOrdenDetalle(true);
        try {
            const res = await getOrdenDetalleSimplificado(task.ordenTrabajoId);
            if (res.success && res.orden) {
                setOrdenDetalle(res.orden);
                setLocalTiempos(res.orden.tiempos || []);
                setClientSignerName(res.orden.firmaClienteNombre || res.orden.cliente?.nombreContacto || res.orden.cliente?.nombre || '');
                if (res.orden.firmaTecnicoNombre) {
                    setTechSignerName(res.orden.firmaTecnicoNombre);
                } else if (res.orden.tecnicosAsignados?.length > 0) {
                    const firstTech = res.orden.tecnicosAsignados[0];
                    const name = [firstTech.nombre, firstTech.apellido].filter(Boolean).join(' ') || firstTech.email;
                    setTechSignerName(name);
                }
            }
        } catch (error) {
            console.error("Error al cargar orden para firmas:", error);
        } finally {
            setLoadingOrdenDetalle(false);
        }
    };

    const loadTiempos = async () => {
        if (task.ordenTrabajoId) {
            await loadOrdenDetalle();
        } else {
            setLoadingTiempos(true);
            try {
                const res = await getTaskTiempos(task.id);
                if (res.success && res.tiempos) {
                    setLocalTiempos(res.tiempos);
                }
            } catch (error) {
                console.error("Error al cargar tiempos de la tarea:", error);
            } finally {
                setLoadingTiempos(false);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (task.ordenTrabajoId) {
                loadOrdenDetalle();
            } else {
                loadTiempos();
            }
        }
    }, [isOpen, task.ordenTrabajoId]);

    const [comments, setComments] = useState<any[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loadingCollab, setLoadingCollab] = useState(false);

    // Estados para consumo de materiales/inventario
    const [materials, setMaterials] = useState<any[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [materialSearchQuery, setMaterialSearchQuery] = useState("");
    const [materialSearchResults, setMaterialSearchResults] = useState<any[]>([]);
    const [searchingMaterials, setSearchingMaterials] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState<any | null>(null);
    const [consumeQuantity, setConsumeQuantity] = useState(1);
    const [consumingMaterial, setConsumingMaterial] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [lightboxItem, setLightboxItem] = useState<{ id: string; url: string; nombre: string; tipo: string; descripcion?: string | null } | null>(null);
    const [isEditingLightboxDesc, setIsEditingLightboxDesc] = useState(false);
    const [lightboxDescText, setLightboxDescText] = useState("");
    const [attachmentToDelete, setAttachmentToDelete] = useState<any | null>(null);

    useEffect(() => {
        if (lightboxItem) {
            setLightboxDescText(lightboxItem.descripcion || "");
            setIsEditingLightboxDesc(!lightboxItem.descripcion);
        } else {
            setLightboxDescText("");
            setIsEditingLightboxDesc(false);
        }
    }, [lightboxItem]);

    const handleSaveAttachmentDescription = async (attachmentId: string, text: string) => {
        try {
            const res = await updateKanbanAttachmentDescription(attachmentId, text);
            if (res.success && res.attachment) {
                // Update locally in attachments state
                setAttachments(prev => prev.map(att => att.id === attachmentId ? { ...att, descripcion: res.attachment.descripcion } : att));
                // Update inside the open lightbox item
                if (lightboxItem && lightboxItem.id === attachmentId) {
                    setLightboxItem(prev => prev ? { ...prev, descripcion: res.attachment.descripcion } : null);
                }
                toast.success('Descripción actualizada');
            } else {
                toast.error(res.error || 'Error al actualizar descripción');
            }
        } catch (error) {
            console.error("Error al actualizar descripción:", error);
            toast.error('Error al actualizar descripción');
        }
    };
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Estados para grabación de video
    const [showVideoRecordModal, setShowVideoRecordModal] = useState(false);
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [recordedVideoChunks, setRecordedVideoChunks] = useState<Blob[]>([]);
    const [videoRecordingTimer, setVideoRecordingTimer] = useState(0);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
    const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoStreamRef = useRef<HTMLVideoElement>(null);
    const timerIntervalRef = useRef<any>(null);

    // Estados para grabación de audio
    const [showAudioRecordModal, setShowAudioRecordModal] = useState(false);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [recordedAudioChunks, setRecordedAudioChunks] = useState<Blob[]>([]);
    const [audioRecordingTimer, setAudioRecordingTimer] = useState(0);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const audioMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioTimerIntervalRef = useRef<any>(null);
    const assigneeDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
                setShowAssigneeDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
        setSelectedModulo(task.modulo || '');
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
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            setVideoStream(null);
            setShowVideoRecordModal(false);
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
            setShowAudioRecordModal(false);
        }

        if (isOpen && task.id) {
            loadCommentsAndAttachments();
            loadTaskMaterials();
        }
        setMaterialSearchQuery("");
        setMaterialSearchResults([]);
        setSelectedInventoryItem(null);
        setConsumeQuantity(1);
    }, [task, isOpen]);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
            if (videoStream) videoStream.getTracks().forEach(track => track.stop());
            if (audioStream) audioStream.getTracks().forEach(track => track.stop());
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (audioTimerIntervalRef.current) clearInterval(audioTimerIntervalRef.current);
        };
    }, [cameraStream, videoStream, audioStream]);

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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // --- GRABACIÓN DE VIDEO ---
    const openVideoRecorder = async () => {
        setShowVideoRecordModal(true);
        setRecordedVideoUrl(null);
        setRecordedVideoBlob(null);
        setRecordedVideoChunks([]);
        setVideoRecordingTimer(0);
        
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: true
                });
                setVideoStream(stream);
                if (videoStreamRef.current) {
                    videoStreamRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Video recorder camera/mic access error:", err);
                toast.error("No se pudo acceder a la cámara y/o micrófono.");
            }
        }, 300);
    };

    const startVideoRecording = () => {
        if (!videoStream) return;
        
        const chunks: Blob[] = [];
        setRecordedVideoChunks([]);
        
        let mimeType = 'video/webm';
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4',
            'video/quicktime'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                break;
            }
        }

        try {
            const options = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(videoStream, options);
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setRecordedVideoBlob(blob);
                setRecordedVideoUrl(url);
                
                if (videoStream) {
                    videoStream.getTracks().forEach(track => track.stop());
                    setVideoStream(null);
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start(1000);
            setIsRecordingVideo(true);
            setVideoRecordingTimer(0);

            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = setInterval(() => {
                setVideoRecordingTimer(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error starting video recorder:", err);
            toast.error("No se pudo iniciar la grabación de video.");
        }
    };

    const stopVideoRecording = () => {
        if (mediaRecorderRef.current && isRecordingVideo) {
            mediaRecorderRef.current.stop();
            setIsRecordingVideo(false);
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }
    };

    const saveRecordedVideo = async () => {
        if (!recordedVideoBlob) return;
        
        let extension = '.webm';
        if (recordedVideoBlob.type.includes('mp4')) extension = '.mp4';
        else if (recordedVideoBlob.type.includes('quicktime')) extension = '.mov';

        const file = new File(
            [recordedVideoBlob], 
            `grabacion_video_${Date.now()}${extension}`, 
            { type: recordedVideoBlob.type || 'video/webm' }
        );
        
        await handleFileUpload(file);
        closeVideoRecorder();
    };

    const closeVideoRecorder = () => {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            setVideoStream(null);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl);
        }
        
        setShowVideoRecordModal(false);
        setRecordedVideoUrl(null);
        setRecordedVideoBlob(null);
        setRecordedVideoChunks([]);
        setIsRecordingVideo(false);
    };

    // --- GRABACIÓN DE AUDIO ---
    const openAudioRecorder = async () => {
        setShowAudioRecordModal(true);
        setRecordedAudioUrl(null);
        setRecordedAudioBlob(null);
        setRecordedAudioChunks([]);
        setAudioRecordingTimer(0);
        
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setAudioStream(stream);
            } catch (err) {
                console.error("Audio recorder mic access error:", err);
                toast.error("No se pudo acceder al micrófono.");
            }
        }, 300);
    };

    const startAudioRecording = () => {
        if (!audioStream) return;
        
        const chunks: Blob[] = [];
        setRecordedAudioChunks([]);
        
        let mimeType = 'audio/webm';
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                break;
            }
        }

        try {
            const options = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(audioStream, options);
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setRecordedAudioBlob(blob);
                setRecordedAudioUrl(url);
                
                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                    setAudioStream(null);
                }
            };

            audioMediaRecorderRef.current = recorder;
            recorder.start(1000);
            setIsRecordingAudio(true);
            setAudioRecordingTimer(0);

            if (audioTimerIntervalRef.current) clearInterval(audioTimerIntervalRef.current);
            audioTimerIntervalRef.current = setInterval(() => {
                setAudioRecordingTimer(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error starting audio recorder:", err);
            toast.error("No se pudo iniciar la grabación de audio.");
        }
    };

    const stopAudioRecording = () => {
        if (audioMediaRecorderRef.current && isRecordingAudio) {
            audioMediaRecorderRef.current.stop();
            setIsRecordingAudio(false);
            if (audioTimerIntervalRef.current) {
                clearInterval(audioTimerIntervalRef.current);
                audioTimerIntervalRef.current = null;
            }
        }
    };

    const saveRecordedAudio = async () => {
        if (!recordedAudioBlob) return;
        
        let extension = '.webm';
        if (recordedAudioBlob.type.includes('ogg')) extension = '.ogg';
        else if (recordedAudioBlob.type.includes('mp4') || recordedAudioBlob.type.includes('m4a')) extension = '.m4a';
        else if (recordedAudioBlob.type.includes('wav')) extension = '.wav';
        else if (recordedAudioBlob.type.includes('mpeg')) extension = '.mp3';

        const file = new File(
            [recordedAudioBlob], 
            `grabacion_audio_${Date.now()}${extension}`, 
            { type: recordedAudioBlob.type || 'audio/webm' }
        );
        
        await handleFileUpload(file);
        closeAudioRecorder();
    };

    const closeAudioRecorder = () => {
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }
        if (audioMediaRecorderRef.current && audioMediaRecorderRef.current.state !== 'inactive') {
            audioMediaRecorderRef.current.stop();
        }
        if (audioTimerIntervalRef.current) {
            clearInterval(audioTimerIntervalRef.current);
            audioTimerIntervalRef.current = null;
        }
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
        }
        
        setShowAudioRecordModal(false);
        setRecordedAudioUrl(null);
        setRecordedAudioBlob(null);
        setRecordedAudioChunks([]);
        setIsRecordingAudio(false);
    };

    const dataURLtoBlob = (dataurl: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const uploadSignatureToR2 = async (dataUrl: string) => {
        const blob = dataURLtoBlob(dataUrl);
        const filename = `signature-${task.ordenTrabajoId}-${Date.now()}.png`;
        
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: filename, contentType: 'image/png' })
        });
        if (!res.ok) throw new Error("Error al obtener URL de subida");
        const { uploadUrl, publicUrl } = await res.json();
        
        const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'image/png' }
        });
        if (!uploadRes.ok) throw new Error("Error al subir a Cloudflare R2");
        
        return publicUrl;
    };

    const handleSaveClientFirma = async () => {
        if (!clientHasDrawn || !sigClientCanvasRef.current || sigClientCanvasRef.current.isEmpty()) {
            toast.error('Por favor dibuja tu firma en el recuadro.');
            return;
        }
        if (!clientSignerName.trim()) {
            toast.error('Por favor escribe el nombre de la persona que firma.');
            return;
        }
        if (!task.ordenTrabajoId) return;

        setIsSavingClientFirma(true);
        try {
            const dataUrl = sigClientCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
            const publicUrl = await uploadSignatureToR2(dataUrl);
            
            const res = await guardarFirmaOrden({
                ordenId: task.ordenTrabajoId,
                tipo: 'cliente',
                firmaUrl: publicUrl,
                nombreSigner: clientSignerName.trim(),
                guardarDigital: saveFirmaFuture
            });

            if (res.success) {
                toast.success('Firma del cliente guardada exitosamente.');
                setClientFirmaOverride(false);
                loadOrdenDetalle();
            } else {
                toast.error(res.error || 'Error al guardar la firma.');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Error de conexión.');
        } finally {
            setIsSavingClientFirma(false);
        }
    };

    const handleUseSavedFirma = async () => {
        if (!ordenDetalle?.cliente?.firmaDigitalUrl || !task.ordenTrabajoId) return;
        
        setIsSavingClientFirma(true);
        try {
            const res = await guardarFirmaOrden({
                ordenId: task.ordenTrabajoId,
                tipo: 'cliente',
                firmaUrl: ordenDetalle.cliente.firmaDigitalUrl,
                nombreSigner: ordenDetalle.cliente.firmaDigitalNombre || ordenDetalle.cliente.nombreContacto || ordenDetalle.cliente.nombre || 'Cliente',
                guardarDigital: false
            });

            if (res.success) {
                toast.success('Firma guardada del cliente aplicada exitosamente.');
                setClientFirmaOverride(false);
                loadOrdenDetalle();
            } else {
                toast.error(res.error || 'Error al aplicar la firma guardada.');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Error de conexión.');
        } finally {
            setIsSavingClientFirma(false);
        }
    };

    const handleSaveTechFirma = async () => {
        if (!techHasDrawn || !sigTechCanvasRef.current || sigTechCanvasRef.current.isEmpty()) {
            toast.error('Por favor dibuja tu firma en el recuadro.');
            return;
        }
        if (!techSignerName.trim()) {
            toast.error('Por favor ingresa o selecciona el nombre del técnico biomédico.');
            return;
        }
        if (!task.ordenTrabajoId) return;

        setIsSavingTechFirma(true);
        try {
            const dataUrl = sigTechCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
            const publicUrl = await uploadSignatureToR2(dataUrl);
            
            const res = await guardarFirmaOrden({
                ordenId: task.ordenTrabajoId,
                tipo: 'tecnico',
                firmaUrl: publicUrl,
                nombreSigner: techSignerName.trim()
            });

            if (res.success) {
                toast.success('Firma del técnico guardada exitosamente.');
                setTechFirmaOverride(false);
                loadOrdenDetalle();
            } else {
                toast.error(res.error || 'Error al guardar la firma.');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Error de conexión.');
        } finally {
            setIsSavingTechFirma(false);
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

    const loadTaskMaterials = async () => {
        setLoadingMaterials(true);
        try {
            const res = await getTaskMaterials(task.id);
            if (res.success && res.materials) {
                setMaterials(res.materials);
            } else {
                toast.error(res.error || "Error al cargar materiales");
            }
        } catch (error) {
            console.error("Error al cargar materiales:", error);
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleSearchMaterials = async (q: string) => {
        setMaterialSearchQuery(q);
        if (!q.trim() || q.trim().length < 2) {
            setMaterialSearchResults([]);
            return;
        }
        setSearchingMaterials(true);
        try {
            const results = await searchMaterialsForTask(q);
            setMaterialSearchResults(results);
        } catch (err) {
            console.error("Error searching materials:", err);
        } finally {
            setSearchingMaterials(false);
        }
    };

    const handleConsumeMaterial = async () => {
        if (!selectedInventoryItem) return;
        if (consumeQuantity <= 0) {
            toast.error("La cantidad debe ser mayor que cero.");
            return;
        }
        if (consumeQuantity > selectedInventoryItem.stock) {
            toast.error(`La cantidad excede el stock disponible (${selectedInventoryItem.stock}).`);
            return;
        }

        setConsumingMaterial(true);
        try {
            const res = await consumeMaterialForTask(task.id, selectedInventoryItem.id, consumeQuantity);
            if (res.success && res.material) {
                toast.success("Componente descontado de inventario correctamente.");
                setMaterials(prev => [res.material, ...prev]);
                setSelectedInventoryItem(null);
                setConsumeQuantity(1);
                if (materialSearchQuery) {
                    handleSearchMaterials(materialSearchQuery);
                }
                router.refresh();
            } else {
                toast.error(res.error || "Error al registrar consumo");
            }
        } catch (err: any) {
            console.error("Error consuming material:", err);
            toast.error(err.message || "Error al registrar consumo");
        } finally {
            setConsumingMaterial(false);
        }
    };

    const handleCancelMaterial = async (materialId: string) => {
        if (!window.confirm("¿Estás seguro de que deseas anular esta descarga de inventario? El stock se devolverá automáticamente.")) return;
        
        try {
            const res = await cancelMaterialConsumptionForTask(materialId);
            if (res.success) {
                toast.success("Descarga de inventario anulada y stock devuelto.");
                setMaterials(prev => prev.filter(m => m.id !== materialId));
                if (materialSearchQuery) {
                    handleSearchMaterials(materialSearchQuery);
                }
                router.refresh();
            } else {
                toast.error(res.error || "Error al anular");
            }
        } catch (err: any) {
            console.error("Error cancelling material:", err);
            toast.error(err.message || "Error al anular");
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const limitSize = isVideo ? 500 * 1024 * 1024 : 30 * 1024 * 1024; // 500MB for video, 30MB for others
        const limitLabel = isVideo ? '500MB' : '30MB';
        if (file.size > limitSize) {
            toast.error(`El archivo "${file.name}" supera el límite de ${limitLabel}`);
            return;
        }

        setIsUploading(true);
        try {
            let fileToUpload = file;
            try {
                fileToUpload = await compressImage(file);
            } catch (compErr) {
                console.error("Compression error:", compErr);
            }

            // 1. Obtener URL pre-firmada de subida
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: fileToUpload.name,
                    contentType: fileToUpload.type,
                }),
            });

            if (!response.ok) throw new Error('Error solicitando URL de subida');
            const { uploadUrl, publicUrl } = await response.json();

            // 2. Subir directamente a R2
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': fileToUpload.type,
                },
                body: fileToUpload,
            });

            if (!uploadResponse.ok) throw new Error('Error al subir el archivo');

            // 3. Guardar registro en la base de datos
            const dbRes = await createKanbanAttachment({
                taskId: task.id,
                nombre: fileToUpload.name,
                url: publicUrl,
                tipo: fileToUpload.type,
                tamano: fileToUpload.size
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

    // Paste handler for Ctrl+V screenshots
    useEffect(() => {
        if (!isOpen) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        toast.loading('Subiendo captura de pantalla...', { id: 'paste-upload' });
                        try {
                            const renamedFile = new File([file], `captura_${Date.now()}.png`, { type: 'image/png' });
                            await handleFileUpload(renamedFile);
                            toast.success('Captura de pantalla subida', { id: 'paste-upload' });
                        } catch (err) {
                            toast.error('Error al subir captura', { id: 'paste-upload' });
                        }
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [isOpen, task.id]);

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
        if (!window.confirm('¿Estás seguro de que deseas eliminar este comentario? Esta acción es irreversible.')) return;
        try {
            const res = await deleteKanbanComment(commentId);
            if (res.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                toast.success('Comentario eliminado');
                // Recargar adjuntos y comentarios (incluyendo historial de actividades)
                loadCommentsAndAttachments();
            } else {
                toast.error(res.error || 'Error al eliminar comentario');
            }
        } catch (error) {
            console.error("Error al eliminar comentario:", error);
            toast.error('Error al eliminar comentario');
        }
    };

    const handleUpdateComment = async (commentId: string) => {
        if (!editingCommentText.trim()) return;
        try {
            const res = await updateKanbanComment(commentId, editingCommentText);
            if (res.success && res.comment) {
                setComments(prev => prev.map(c => c.id === commentId ? { ...c, contenido: res.comment.contenido } : c));
                setEditingCommentId(null);
                setEditingCommentText("");
                toast.success('Comentario actualizado');
                // Recargar adjuntos y comentarios (incluyendo historial de actividades)
                loadCommentsAndAttachments();
            } else {
                toast.error(res.error || 'Error al actualizar comentario');
            }
        } catch (error) {
            console.error("Error al actualizar comentario:", error);
            toast.error('Error al actualizar comentario');
        }
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        const attObj = attachments.find(a => a.id === attachmentId);
        if (attObj) {
            setAttachmentToDelete(attObj);
        }
    };

    const handleConfirmDeleteAttachment = async (attachmentId: string) => {
        try {
            const res = await deleteKanbanAttachment(attachmentId);
            if (res.success) {
                setAttachments(prev => prev.filter(a => a.id !== attachmentId));
                toast.success('Archivo adjunto eliminado');
                
                // Si el adjunto eliminado estaba activo en el Lightbox, cerrarlo
                if (lightboxItem && lightboxItem.id === attachmentId) {
                    setLightboxItem(null);
                }
                
                // Recargar adjuntos y comentarios (historial) para reflejar la eliminación
                loadCommentsAndAttachments();
            } else {
                toast.error(res.error || 'Error al eliminar archivo');
            }
        } catch (error) {
            console.error("Error al eliminar adjunto:", error);
            toast.error('Error al eliminar archivo');
        } finally {
            setAttachmentToDelete(null);
        }
    };

    const getFileIcon = (tipo: string) => {
        if (tipo.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
        if (tipo.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
        if (tipo.includes('excel') || tipo.includes('spreadsheet') || tipo.includes('sheet') || tipo.includes('csv')) return <FileText className="h-6 w-6 text-emerald-500" />;
        return <FileText className="h-6 w-6 text-slate-400" />;
    };

    if (!isOpen) return null;

    const handleAddActivityTypePrompt = () => {
        const name = prompt("Escribe el nombre del nuevo tipo de actividad (ej. Calibración):");
        if (!name) return;
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error("El nombre no puede estar vacío");
            return;
        }

        startTransition(async () => {
            const res = await addActivityTypeToSpace(spaceId, trimmed);
            if (res.success && res.tiposActividad) {
                // Actualizar localTiposActividad
                setLocalTiposActividad(res.tiposActividad);
                // Cambiar el tipo de la tarea actual al nuevo tipo
                handleFieldChange('type', trimmed);
                toast.success(`Tipo de actividad "${trimmed}" agregado con éxito`);
                router.refresh(); // Sincronizar servidor
            } else {
                toast.error(res.error || "Error al agregar tipo de actividad");
            }
        });
    };

    const executeFieldChange = (fieldName: string, value: any) => {
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
                if (fieldName === 'modulo') setSelectedModulo(value);
                if (fieldName === 'etiquetas') setEtiquetasInput(value ? value.join(', ') : '');
                if (fieldName === 'parentId') setParentId(value);
            }
        });
    };

    // Actualizar campo individual de forma inmediata
    const handleFieldChange = (fieldName: string, value: any) => {
        if (fieldName === 'status' && task.ordenTrabajoId) {
            const currentStatus = status;
            const targetStatus = value;
            const isReopening = isDoneColumn(currentStatus) && !isDoneColumn(targetStatus);
            const isCompleting = !isDoneColumn(currentStatus) && isDoneColumn(targetStatus);

            if (isReopening) {
                if (!canReopenCompletedOrders) {
                    toast.error("No tienes privilegios para reabrir órdenes de trabajo completadas.");
                    return;
                }
                setPendingStatusChange({ value, isCompleting: false, isReopening: true });
                return;
            }

            if (isCompleting) {
                setPendingStatusChange({ value, isCompleting: true, isReopening: false });
                return;
            }
        }

        executeFieldChange(fieldName, value);
    };

    const handleToggleAssignee = (id: string) => {
        if (isLocked) return;
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
        if (isLocked) return;
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
        if (isLocked) return;
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4">
            <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[90vh] md:min-h-[500px] max-w-none md:max-w-5xl rounded-none md:rounded-2xl border-0 md:border border-slate-200 bg-white shadow-none md:shadow-2xl overflow-hidden flex flex-col md:flex-row">
                
                {/* Lado Izquierdo: Contenido Editable de Tarea */}
                <div 
                    className="relative flex-1 p-4 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-slate-100 bg-white"
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
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold font-mono text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                                    {task.codigo}
                                </span>
                                
                                <a
                                    href={`/trazabilidad/${task.ordenTrabajoId || task.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition shadow-sm cursor-pointer"
                                    title="Abrir vista pública de trazabilidad del cliente"
                                >
                                    <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                                    <span>Ver Trazabilidad</span>
                                </a>

                                {task.ordenTrabajoId && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/soporte/${task.ordenTrabajoId}`)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition shadow-sm cursor-pointer"
                                        >
                                            <Wrench className="h-3.5 w-3.5 text-indigo-500" />
                                            Ver Orden Relacionada
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsReportModalOpen(true)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition shadow-sm cursor-pointer"
                                        >
                                            <FileText className="h-3.5 w-3.5 text-emerald-500" />
                                            Generar Reporte
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsShareModalOpen(true)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition shadow-sm cursor-pointer"
                                        >
                                            <Share2 className="h-3.5 w-3.5 text-indigo-500" />
                                            Compartir
                                        </button>
                                    </>
                                )}
                                
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
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold rounded-xl text-xs transition border border-red-200 shadow-sm md:hidden"
                            >
                                <X className="h-4 w-4 shrink-0" /> Cerrar
                            </button>
                        </div>

                        {/* Título editable */}
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={title}
                                disabled={isLocked}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleSaveTitle}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                className={`w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 text-2xl font-bold text-slate-800 px-1 py-0.5 focus:outline-none transition ${isLocked ? 'opacity-70 cursor-not-allowed hover:border-transparent' : ''}`}
                            />
                        </div>

                        {isLocked && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm text-xs font-semibold animate-fadeIn mt-2">
                                <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                <div>
                                    Esta orden de trabajo está completada y cerrada. No se permite la edición ni reabrir el estado sin privilegios especiales.
                                </div>
                            </div>
                        )}

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
                                    onClick={() => !isLocked && setIsEditingDesc(true)}
                                    className={`w-full min-h-[80px] bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-xl p-3 text-sm text-slate-700 transition whitespace-pre-wrap ${isLocked ? 'opacity-60 cursor-not-allowed hover:border-slate-100' : 'cursor-pointer'}`}
                                >
                                    {formatTaskDescription(description) || <span className="text-slate-400 italic">No hay descripción detallada. Haz clic aquí para añadir una.</span>}
                                </div>
                            )}
                        </div>

                        {/* Actividad / Colaboración (Tabs) */}
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div className="flex gap-2 sm:gap-4 border-b border-slate-100 pb-2 overflow-x-auto whitespace-nowrap scrollbar-none">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('comentarios')}
                                    className={`text-[9px] sm:text-xs shrink-0 font-bold uppercase tracking-wider pb-1.5 border-b-2 transition ${
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
                                    className={`text-[9px] sm:text-xs shrink-0 font-bold uppercase tracking-wider pb-1.5 border-b-2 transition ${
                                        activeTab === 'actividad' 
                                            ? 'border-brand-600 text-brand-600' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Historial ({taskActivities.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('materiales')}
                                    className={`text-[9px] sm:text-xs shrink-0 font-bold uppercase tracking-wider pb-1.5 border-b-2 transition ${
                                        activeTab === 'materiales' 
                                            ? 'border-brand-600 text-brand-600' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Materiales ({materials.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('tiempos')}
                                    className={`text-[9px] sm:text-xs shrink-0 font-bold uppercase tracking-wider pb-1.5 border-b-2 transition ${
                                        activeTab === 'tiempos' 
                                            ? 'border-brand-600 text-brand-600' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Tiempo Laborado
                                </button>
                                {task.ordenTrabajoId && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('firmas')}
                                        className={`text-[9px] sm:text-xs shrink-0 font-bold uppercase tracking-wider pb-1.5 border-b-2 transition ${
                                            activeTab === 'firmas' 
                                                ? 'border-brand-600 text-brand-600' 
                                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        Firmas
                                    </button>
                                )}
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
                            ) : activeTab === 'materiales' ? (
                                <div className="space-y-4 animate-fadeIn">
                                    {!isLocked ? (
                                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 space-y-3.5 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Package className="h-4 w-4 text-brand-600 animate-pulse" />
                                                    Descargar Componente / Material
                                                </h5>
                                                <span className="text-[10px] text-slate-400 font-medium">Búsqueda rápida en inventario</span>
                                            </div>
                                            
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por descripción, barras o código QR..."
                                                    value={materialSearchQuery}
                                                    onChange={(e) => handleSearchMaterials(e.target.value)}
                                                    className="w-full h-10 pl-3 pr-10 bg-white border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-sm transition-all shadow-sm outline-none"
                                                />
                                                {searchingMaterials && (
                                                    <div className="absolute right-3 top-2.5">
                                                        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Resultados de la búsqueda */}
                                            {materialSearchResults.length > 0 && (
                                                <div className="border border-slate-150 rounded-xl overflow-hidden bg-white max-h-[220px] overflow-y-auto divide-y divide-slate-100 shadow-inner">
                                                    {materialSearchResults.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedInventoryItem(item);
                                                                setConsumeQuantity(1);
                                                            }}
                                                            className={`w-full px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-left hover:bg-slate-50 transition-colors ${selectedInventoryItem?.id === item.id ? 'bg-brand-50/50 hover:bg-brand-50' : ''}`}
                                                        >
                                                            <div className="min-w-0 pr-2">
                                                                <p className="text-xs font-bold text-slate-800 truncate">{item.descripcionCorta}</p>
                                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                                    SKU: <span className="font-mono">{item.codigoBarras || 'N/A'}</span> • QR: <span className="font-mono">{item.idQr}</span>
                                                                </p>
                                                            </div>
                                                            <div className="mt-1 sm:mt-0 flex items-center gap-2 shrink-0">
                                                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                                    📍 {item.area}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.stock > 0 ? 'bg-green-55 text-green-700' : 'bg-red-55 text-red-700'}`}>
                                                                    {item.stock} disp.
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Formulario de consumo del ítem seleccionado */}
                                            {selectedInventoryItem && (
                                                <div className="bg-brand-50/30 border border-brand-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                                                    <div className="min-w-0 pr-2">
                                                        <p className="text-xs font-bold text-brand-900 truncate">Seleccionado: {selectedInventoryItem.descripcionCorta}</p>
                                                        <p className="text-[10px] text-brand-700/80 mt-0.5">
                                                            Ubicación: <span className="font-semibold">{selectedInventoryItem.area}</span> (Disponibles: {selectedInventoryItem.stock})
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden h-9 shadow-sm">
                                                            <button
                                                                type="button"
                                                                disabled={consumeQuantity <= 1}
                                                                onClick={() => setConsumeQuantity(prev => Math.max(1, prev - 1))}
                                                                className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:hover:bg-transparent transition-colors font-bold text-sm border-r border-slate-100"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={selectedInventoryItem.stock}
                                                                value={consumeQuantity}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    if (!isNaN(val)) {
                                                                        setConsumeQuantity(Math.max(1, Math.min(selectedInventoryItem.stock, val)));
                                                                    }
                                                                }}
                                                                className="w-12 h-full text-center text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={consumeQuantity >= selectedInventoryItem.stock}
                                                                onClick={() => setConsumeQuantity(prev => Math.min(selectedInventoryItem.stock, prev + 1))}
                                                                className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:hover:bg-transparent transition-colors font-bold text-sm border-l border-slate-100"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            disabled={consumingMaterial}
                                                            onClick={handleConsumeMaterial}
                                                            className="h-9 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {consumingMaterial ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Check className="h-3.5 w-3.5" />
                                                            )}
                                                            Descargar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedInventoryItem(null)}
                                                            className="h-9 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs transition"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400">
                                            La asignación y descarga de materiales en esta orden cerrada están inhabilitadas.
                                        </div>
                                    )}

                                    {/* Listado de Materiales Usados */}
                                    <div className="space-y-2">
                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            Materiales Consumidos en esta Tarea ({materials.length})
                                        </h5>
                                        
                                        {loadingMaterials ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                                            </div>
                                        ) : materials.length === 0 ? (
                                            <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-xs text-slate-500 font-medium">No se han registrado consumos</p>
                                                <p className="text-[10px] text-slate-400">Usa el buscador de arriba para descargar materiales de inventario.</p>
                                            </div>
                                        ) : (
                                            <div className="border border-slate-150 rounded-2xl bg-white overflow-hidden shadow-sm divide-y divide-slate-100">
                                                {materials.map((m) => (
                                                    <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                                                        <div className="min-w-0 pr-3 text-left">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-bold text-slate-800 truncate">{m.descripcionCorta}</p>
                                                                <span className="text-[9px] font-bold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">
                                                                    Cant: {m.cantidad}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9px] text-slate-400 mt-1">
                                                                <span>📍 Ubicac: <span className="font-semibold text-slate-600">{m.area}</span></span>
                                                                <span>•</span>
                                                                <span>Barras/QR: <span className="font-mono text-slate-650">{m.codigoBarras || m.idQr}</span></span>
                                                                <span>•</span>
                                                                <span>Por: <span className="text-slate-600 font-medium">{m.creadoPor.nombre}</span></span>
                                                                <span>•</span>
                                                                <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        {!isLocked && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelMaterial(m.id)}
                                                                className="p-1.5 border border-slate-150 hover:border-red-100 hover:bg-red-50 text-slate-450 hover:text-red-650 rounded-lg shadow-sm transition"
                                                                title="Anular descarga y regresar a inventario"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : activeTab === 'tiempos' ? (
                                <div className="space-y-6 pt-2">
                                    {loadingTiempos || loadingOrdenDetalle ? (
                                        <div className="flex items-center justify-center py-10">
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                        </div>
                                    ) : (
                                        <CronometroTrabajo
                                            ordenId={task.ordenTrabajoId}
                                            taskId={task.id}
                                            tiempos={localTiempos}
                                            onRefresh={loadTiempos}
                                        />
                                    )}
                                </div>
                            ) : activeTab === 'firmas' && task.ordenTrabajoId ? (
                                <div className="space-y-6 pt-2">
                                    {loadingOrdenDetalle ? (
                                        <div className="flex items-center justify-center py-10">
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                        </div>
                                    ) : !ordenDetalle ? (
                                        <div className="text-center text-xs text-slate-400 py-6">
                                            No se pudo cargar el detalle de la orden de trabajo para las firmas.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                                            {/* A. Firma del Cliente */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm">
                                                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <PenTool size={12} className="text-indigo-600" />
                                                    Firma Cliente de Recibido
                                                </h4>
                                                
                                                {ordenDetalle.firmaClienteUrl && !clientFirmaOverride ? (
                                                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                                                        <div className="border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-center h-32">
                                                            <img src={ordenDetalle.firmaClienteUrl} alt="Firma del Cliente" className="max-h-full max-w-full object-contain" />
                                                        </div>
                                                        <div className="text-center bg-green-50 text-green-800 text-[10px] p-2.5 rounded-xl border border-green-200 font-semibold shadow-sm">
                                                            Firmado por {ordenDetalle.firmaClienteNombre} el {new Date(ordenDetalle.firmaClienteFecha).toLocaleString('es-HN')}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setClientFirmaOverride(true)}
                                                            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition active:scale-95 cursor-pointer mt-1"
                                                        >
                                                            Volver a firmar / Cambiar firma
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                                                        {ordenDetalle.cliente?.firmaDigitalUrl && (
                                                            <button
                                                                type="button"
                                                                disabled={isSavingClientFirma}
                                                                onClick={handleUseSavedFirma}
                                                                className="w-full py-2 px-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                                                            >
                                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                                                                Usar Firma Guardada ({ordenDetalle.cliente.firmaDigitalNombre})
                                                            </button>
                                                        )}

                                                        <div className="space-y-1">
                                                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Firmante</label>
                                                            <input
                                                                type="text"
                                                                value={clientSignerName}
                                                                onChange={e => setClientSignerName(e.target.value)}
                                                                placeholder="Nombre del cliente..."
                                                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 font-semibold shadow-sm"
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-end">
                                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dibuja la firma</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        sigClientCanvasRef.current?.clear();
                                                                        setClientHasDrawn(false);
                                                                    }}
                                                                    className="text-[9px] text-indigo-600 font-semibold flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                                                                >
                                                                    <RotateCcw size={8} /> Limpiar
                                                                </button>
                                                            </div>
                                                            <div className="border border-dashed border-slate-300 rounded-xl bg-white h-32 relative touch-none overflow-hidden shadow-inner">
                                                                <SignatureCanvas
                                                                    ref={sigClientCanvasRef}
                                                                    penColor="#0600c2"
                                                                    canvasProps={{
                                                                        className: 'w-full h-full cursor-crosshair touch-none'
                                                                    }}
                                                                    onBegin={() => setClientHasDrawn(true)}
                                                                />
                                                                {!clientHasDrawn && (
                                                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                                                                        <span className="font-serif italic text-xs text-slate-400">Firmar aquí</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="checkbox"
                                                                id="modalSaveFirmaFuture"
                                                                checked={saveFirmaFuture}
                                                                onChange={e => setSaveFirmaFuture(e.target.checked)}
                                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                                            />
                                                            <label htmlFor="modalSaveFirmaFuture" className="text-[11px] text-slate-500 font-medium select-none cursor-pointer">
                                                                Guardar firma de cliente
                                                            </label>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            {ordenDetalle.firmaClienteUrl && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setClientFirmaOverride(false);
                                                                        setClientHasDrawn(false);
                                                                    }}
                                                                    className="w-1/3 py-2 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer font-semibold shadow-sm"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={isSavingClientFirma}
                                                                onClick={handleSaveClientFirma}
                                                                className={`py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer ${ordenDetalle.firmaClienteUrl ? 'w-2/3' : 'w-full'}`}
                                                            >
                                                                {isSavingClientFirma ? <Loader2 size={12} className="animate-spin" /> : <PenTool size={12} />}
                                                                Guardar Firma
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* B. Firma del Técnico */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm">
                                                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <PenTool size={12} className="text-indigo-600" />
                                                    Firma Técnico / Biomédico
                                                </h4>
                                                
                                                {ordenDetalle.firmaTecnicoUrl && !techFirmaOverride ? (
                                                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                                                        <div className="border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-center h-32">
                                                            <img src={ordenDetalle.firmaTecnicoUrl} alt="Firma del Técnico" className="max-h-full max-w-full object-contain" />
                                                        </div>
                                                        <div className="text-center bg-green-50 text-green-800 text-[10px] p-2.5 rounded-xl border border-green-200 font-semibold shadow-sm">
                                                            Firmado por {ordenDetalle.firmaTecnicoNombre} el {new Date(ordenDetalle.firmaTecnicoFecha).toLocaleString('es-HN')}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setTechFirmaOverride(true)}
                                                            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition active:scale-95 cursor-pointer mt-1"
                                                        >
                                                            Volver a firmar / Cambiar firma
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                                                        <div className="space-y-1">
                                                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Técnico</label>
                                                            <input
                                                                type="text"
                                                                value={techSignerName}
                                                                onChange={e => setTechSignerName(e.target.value)}
                                                                placeholder="Nombre del técnico..."
                                                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 font-semibold shadow-sm"
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-end">
                                                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Firma</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        sigTechCanvasRef.current?.clear();
                                                                        setTechHasDrawn(false);
                                                                    }}
                                                                    className="text-[9px] text-indigo-600 font-semibold flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                                                                >
                                                                    <RotateCcw size={8} /> Limpiar
                                                                </button>
                                                            </div>
                                                            <div className="border border-dashed border-slate-300 rounded-xl bg-white h-32 relative touch-none overflow-hidden shadow-inner">
                                                                <SignatureCanvas
                                                                    ref={sigTechCanvasRef}
                                                                    penColor="#0600c2"
                                                                    canvasProps={{
                                                                        className: 'w-full h-full cursor-crosshair touch-none'
                                                                    }}
                                                                    onBegin={() => setTechHasDrawn(true)}
                                                                />
                                                                {!techHasDrawn && (
                                                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                                                                        <span className="font-serif italic text-xs text-slate-400">Firmar aquí</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            {ordenDetalle.firmaTecnicoUrl && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTechFirmaOverride(false);
                                                                        setTechHasDrawn(false);
                                                                    }}
                                                                    className="w-1/3 py-2 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer font-semibold shadow-sm"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={isSavingTechFirma}
                                                                onClick={handleSaveTechFirma}
                                                                className={`py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer ${ordenDetalle.firmaTecnicoUrl ? 'w-2/3' : 'w-full'}`}
                                                            >
                                                                {isSavingTechFirma ? <Loader2 size={12} className="animate-spin" /> : <PenTool size={12} />}
                                                                Guardar Firma
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
                                                    const isVideo = att.tipo.startsWith('video/');
                                                    const isAudio = att.tipo.startsWith('audio/');
                                                    return (
                                                        <div key={att.id} className="group relative rounded-xl border border-slate-100 bg-slate-50 hover:bg-white p-2 transition flex flex-col gap-1.5 shadow-sm hover:shadow">
                                                            {isImg ? (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setLightboxItem({ id: att.id, url: att.url, nombre: att.nombre, tipo: att.tipo, descripcion: att.descripcion })}
                                                                    className="relative block w-full aspect-video rounded-lg overflow-hidden border border-slate-200/50 bg-white cursor-pointer"
                                                                >
                                                                    <img src={att.url} alt={att.nombre} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                                                </button>
                                                            ) : isVideo ? (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setLightboxItem({ id: att.id, url: att.url, nombre: att.nombre, tipo: att.tipo, descripcion: att.descripcion })}
                                                                    className="relative block w-full aspect-video rounded-lg overflow-hidden border border-slate-200/50 bg-black cursor-pointer"
                                                                >
                                                                    <video src={att.url} className="w-full h-full object-cover opacity-85" preload="metadata" />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition">
                                                                        <Play className="h-8 w-8 text-white drop-shadow-md opacity-90 group-hover:scale-110 transition duration-300" />
                                                                    </div>
                                                                </button>
                                                            ) : isAudio ? (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setLightboxItem({ id: att.id, url: att.url, nombre: att.nombre, tipo: att.tipo, descripcion: att.descripcion })}
                                                                    className="aspect-video w-full rounded-lg border border-slate-200/50 bg-indigo-50/50 flex flex-col items-center justify-center p-1.5 gap-1 cursor-pointer hover:bg-indigo-100/50 transition select-none"
                                                                >
                                                                    <Mic className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                                                                    <span className="text-[9px] text-indigo-650 font-semibold font-mono">Audio Grabado</span>
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setLightboxItem({ id: att.id, url: att.url, nombre: att.nombre, tipo: att.tipo, descripcion: att.descripcion })}
                                                                    className="aspect-video w-full rounded-lg border border-slate-200/50 bg-slate-100 hover:bg-slate-150 transition flex items-center justify-center cursor-pointer"
                                                                >
                                                                    {getFileIcon(att.tipo)}
                                                                </button>
                                                            )}
                                                            <div className="flex flex-col gap-0.5 min-w-0 px-1">
                                                                <p 
                                                                    onClick={() => setLightboxItem({ id: att.id, url: att.url, nombre: att.nombre, tipo: att.tipo, descripcion: att.descripcion })}
                                                                    className="text-[10px] font-bold text-slate-700 truncate cursor-pointer hover:text-brand-600 transition-colors" 
                                                                    title="Click para ver en lightbox"
                                                                >
                                                                    {att.nombre}
                                                                </p>
                                                                <p className="text-[8px] text-slate-400">{(att.tamano / 1024).toFixed(1)} KB • {att.subidoPor.nombre}</p>
                                                                {att.descripcion ? (
                                                                    <p 
                                                                        onClick={() => setLightboxItem({ id: att.id, url: att.url, nombre: att.nombre, tipo: att.tipo, descripcion: att.descripcion })}
                                                                        className="text-[9px] text-slate-650 bg-white border border-slate-100 rounded px-1.5 py-1 mt-1.5 leading-normal italic text-wrap break-words cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                                                        title="Click para ver en lightbox"
                                                                    >
                                                                        {att.descripcion}
                                                                    </p>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setLightboxItem({ id: att.id, url: att.url, nombre: att.nombre, tipo: att.tipo, descripcion: att.descripcion })}
                                                                        className="text-[8px] text-brand-600 hover:text-brand-700 hover:underline font-bold mt-1.5 text-left w-fit transition-all flex items-center gap-0.5"
                                                                    >
                                                                        + Añadir descripción
                                                                    </button>
                                                                )}
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
                                                                {!isLocked && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                                        className="p-1 bg-white border border-slate-150 hover:border-red-100 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 shadow-sm transition"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                )}
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
                                                        <div key={comm.id} className="flex gap-2.5 items-start group animate-in fade-in duration-200">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm overflow-hidden relative">
                                                                {comm.usuario.avatarUrl ? (
                                                                    <img src={comm.usuario.avatarUrl} alt={comm.usuario.nombre} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    initials
                                                                )}
                                                            </div>
                                                            <div className="flex-1 bg-slate-50/60 border border-slate-100 rounded-xl px-3.5 py-2 hover:bg-slate-50 transition relative">
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className="text-[10px] font-bold text-slate-800">{comm.usuario.nombre}</span>
                                                                    <span className="text-[9px] text-slate-400 font-mono">
                                                                        {new Date(comm.createdAt).toLocaleDateString()} {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                
                                                                {editingCommentId === comm.id ? (
                                                                    <div className="mt-2 space-y-2">
                                                                        <textarea
                                                                            value={editingCommentText}
                                                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                                                            rows={5}
                                                                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm md:text-xs text-slate-800 focus:border-brand-500 focus:outline-none shadow-sm min-h-[120px]"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateComment(comm.id)}
                                                                                className="bg-brand-600 hover:bg-brand-700 text-white text-xs md:text-[10px] font-bold px-4 py-2 md:px-3 md:py-1.5 rounded-lg transition shadow-sm active:scale-95"
                                                                            >
                                                                                Guardar
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingCommentId(null);
                                                                                    setEditingCommentText("");
                                                                                }}
                                                                                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs md:text-[10px] font-bold px-4 py-2 md:px-3 md:py-1.5 rounded-lg transition"
                                                                            >
                                                                                Cancelar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-1 pr-14 pb-1.5">{comm.contenido}</p>
                                                                )}
                                                                
                                                                {editingCommentId !== comm.id && !isLocked && (
                                                                    <div className="absolute bottom-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition flex gap-1.5 md:gap-1 z-10">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditingCommentId(comm.id);
                                                                                setEditingCommentText(comm.contenido);
                                                                            }}
                                                                            className="p-2 md:p-1 bg-white md:bg-transparent shadow-sm md:shadow-none border border-slate-100 md:border-0 rounded-lg md:rounded text-slate-500 hover:text-brand-600 md:text-slate-400 transition flex items-center justify-center"
                                                                            title="Editar comentario"
                                                                        >
                                                                            <Pencil className="h-4 w-4 md:h-3 md:w-3" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteComment(comm.id)}
                                                                            className="p-2 md:p-1 bg-white md:bg-transparent shadow-sm md:shadow-none border border-slate-100 md:border-0 rounded-lg md:rounded text-slate-500 hover:text-red-600 md:text-slate-400 transition flex items-center justify-center"
                                                                            title="Eliminar comentario"
                                                                        >
                                                                            <Trash2 className="h-4 w-4 md:h-3 md:w-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Editor de comentarios */}
                                    <div className="space-y-2">
                                        {!isLocked ? (
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
                                                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
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
                                                        onClick={openVideoRecorder}
                                                        className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition shrink-0"
                                                        title="Grabar video"
                                                    >
                                                        <Video className="h-3.5 w-3.5" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={openAudioRecorder}
                                                        className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition shrink-0"
                                                        title="Grabar audio"
                                                    >
                                                        <Mic className="h-3.5 w-3.5" />
                                                    </button>

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
                                        ) : (
                                            <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400">
                                                Los comentarios y evidencias en esta orden cerrada están inhabilitados.
                                            </div>
                                        )}

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
                <div className={`w-full md:w-[320px] bg-slate-50 p-4 md:p-8 flex-col justify-between overflow-y-auto border-t md:border-t-0 border-slate-100 ${
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
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold rounded-xl text-xs transition border border-red-200 shadow-sm"
                            >
                                <X className="h-4 w-4 shrink-0" /> Cerrar Ventana
                            </button>
                        </div>

                        {/* Selector de Estado */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Estado</label>
                            <select
                                value={status}
                                disabled={isLocked}
                                onChange={(e) => handleFieldChange('status', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {columnas.map((col) => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>

                        {/* Personas Asignadas (Multi-select) */}
                        <div ref={assigneeDropdownRef} className="space-y-1.5 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                Personas Asignadas ({selectedAssigneeIds.length})
                            </label>
                            
                            <div 
                                onClick={() => !isLocked && setShowAssigneeDropdown(!showAssigneeDropdown)}
                                className={`min-h-[42px] w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 transition shadow-sm flex flex-wrap gap-1.5 items-center justify-between ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 focus:border-brand-500'}`}
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
                                                    onClick={(e) => { e.stopPropagation(); if (!isLocked) handleToggleAssignee(id); }}
                                                    className={`inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg pl-1 pr-1.5 py-0.5 text-[10px] text-slate-700 transition ${isLocked ? 'cursor-not-allowed' : 'hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
                                                    title={isLocked ? "" : "Haga clic para remover"}
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
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    Tipo de Actividad
                                </label>
                                {!isLocked && (
                                    <button
                                        type="button"
                                        onClick={handleAddActivityTypePrompt}
                                        className="p-1 hover:bg-slate-100 rounded-lg text-brand-600 hover:text-brand-700 transition flex items-center justify-center cursor-pointer"
                                        title="Agregar nuevo tipo de actividad"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <select
                                value={type}
                                disabled={isLocked}
                                onChange={(e) => handleFieldChange('type', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {localTiposActividad.map((t) => {
                                    const translateType = (typeStr: string) => {
                                        switch (typeStr) {
                                            case 'Task': return 'Tarea';
                                            case 'Story': return 'Historia';
                                            case 'Feature': return 'Funcionalidad';
                                            case 'Bug': return 'Error / Falla';
                                            default: return typeStr;
                                        }
                                    };
                                    return (
                                        <option key={t} value={t}>{translateType(t)}</option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Prioridad */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Prioridad</label>
                            <select
                                value={priority}
                                disabled={isLocked}
                                onChange={(e) => handleFieldChange('priority', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
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
                                disabled={isLocked}
                                onChange={(e) => handleFieldChange('parentId', e.target.value || null)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="">Ninguna (Tarea raíz)</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id}>{t.codigo} - {t.title}</option>
                                ))}
                            </select>
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
                                disabled={isLocked}
                                onChange={(e) => handleFieldChange('startDate', e.target.value || null)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
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
                                disabled={isLocked}
                                onChange={(e) => handleFieldChange('dueDate', e.target.value || null)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Botones de acción inferior */}
                    {isAdmin && !isLocked && (
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
                                <Camera className="h-3.5 w-3.5" />
                                Cámara de Dispositivo
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Grabación de Video */}
            {showVideoRecordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <Video className="h-4.5 w-4.5 text-red-600 animate-pulse" />
                                Grabar Video
                            </h3>
                            <button 
                                type="button"
                                onClick={closeVideoRecorder}
                                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="relative aspect-video bg-black flex flex-col items-center justify-center overflow-hidden">
                            {recordedVideoUrl ? (
                                <video 
                                    src={recordedVideoUrl} 
                                    controls 
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <video 
                                    ref={videoStreamRef} 
                                    autoPlay 
                                    muted 
                                    playsInline 
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />
                            )}

                            {isRecordingVideo && (
                                <div className="absolute top-4 left-4 bg-red-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow animate-pulse">
                                    <span className="h-2 w-2 rounded-full bg-white block animate-ping" />
                                    GRABANDO • {formatTime(videoRecordingTimer)}
                                </div>
                            )}
                            
                            {!videoStream && !recordedVideoUrl && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-900 gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                                    <span>Iniciando cámara y micrófono...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 flex gap-3 justify-center">
                            {!recordedVideoUrl ? (
                                !isRecordingVideo ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={startVideoRecording}
                                            disabled={!videoStream}
                                            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                        >
                                            <div className="h-3.5 w-3.5 rounded-full bg-white shrink-0 animate-pulse" />
                                            Iniciar Grabación
                                        </button>

                                        <input
                                            type="file"
                                            accept="video/*"
                                            id="video-gallery-input-detail"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const files = e.target.files;
                                                if (files && files.length > 0) {
                                                    await handleFileUpload(files[0]);
                                                    closeVideoRecorder();
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="video-gallery-input-detail"
                                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition flex items-center gap-2 active:scale-95"
                                        >
                                            <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                            Cargar desde Galería
                                        </label>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={stopVideoRecording}
                                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                    >
                                        <Square className="h-3.5 w-3.5 text-white fill-white shrink-0" />
                                        Detener
                                    </button>
                                )
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={saveRecordedVideo}
                                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                    >
                                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                        Adjuntar Video
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRecordedVideoUrl(null);
                                            setRecordedVideoBlob(null);
                                            setRecordedVideoChunks([]);
                                            setTimeout(async () => {
                                                try {
                                                    const stream = await navigator.mediaDevices.getUserMedia({
                                                        video: { facingMode: 'user' },
                                                        audio: true
                                                    });
                                                    setVideoStream(stream);
                                                    if (videoStreamRef.current) {
                                                        videoStreamRef.current.srcObject = stream;
                                                    }
                                                } catch (err) {
                                                    console.error("Camera access error:", err);
                                                    toast.error("No se pudo iniciar la cámara.");
                                                }
                                            }, 100);
                                        }}
                                        className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                                        Grabar de Nuevo
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Grabación de Audio */}
            {showAudioRecordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <Mic className="h-4.5 w-4.5 text-brand-600 animate-pulse" />
                                Grabar Audio
                            </h3>
                            <button 
                                type="button"
                                onClick={closeAudioRecorder}
                                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-slate-900 flex flex-col items-center justify-center gap-4 min-h-[160px] relative">
                            {recordedAudioUrl ? (
                                <audio 
                                    src={recordedAudioUrl} 
                                    controls 
                                    className="w-full mt-4"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className={`h-16 w-16 rounded-full bg-brand-500/10 border-2 border-brand-500 flex items-center justify-center transition-all duration-300 ${isRecordingAudio ? 'animate-pulse scale-110 bg-brand-500/20 border-red-500' : ''}`}>
                                        <Mic className={`h-8 w-8 ${isRecordingAudio ? 'text-red-500' : 'text-brand-500'}`} />
                                    </div>
                                    <span className="text-white text-xs font-semibold">
                                        {isRecordingAudio ? 'Grabando audio...' : 'Listo para grabar'}
                                    </span>
                                </div>
                            )}

                            {isRecordingAudio && (
                                <div className="absolute top-4 left-4 bg-red-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow animate-pulse">
                                    <span className="h-2 w-2 rounded-full bg-white block animate-ping" />
                                    {formatTime(audioRecordingTimer)}
                                </div>
                            )}
                            
                            {!audioStream && !recordedAudioUrl && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-900 gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                                    <span>Iniciando micrófono...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 flex gap-3 justify-center">
                            {!recordedAudioUrl ? (
                                !isRecordingAudio ? (
                                    <button
                                        type="button"
                                        onClick={startAudioRecording}
                                        disabled={!audioStream}
                                        className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                    >
                                        <Mic className="h-3.5 w-3.5 shrink-0" />
                                        Iniciar Grabación
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={stopAudioRecording}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                    >
                                        <Square className="h-3.5 w-3.5 text-white fill-white shrink-0" />
                                        Detener
                                    </button>
                                )
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={saveRecordedAudio}
                                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                    >
                                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                        Adjuntar Audio
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRecordedAudioUrl(null);
                                            setRecordedAudioBlob(null);
                                            setRecordedAudioChunks([]);
                                            setTimeout(async () => {
                                                try {
                                                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                                    setAudioStream(stream);
                                                } catch (err) {
                                                    console.error("Audio access error:", err);
                                                    toast.error("No se pudo iniciar el micrófono.");
                                                }
                                            }, 100);
                                        }}
                                        className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                                        Grabar de Nuevo
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Modal de Imágenes y Descripción */}
            {lightboxItem && (
                <div 
                    className="fixed inset-0 z-[10005] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200"
                    onClick={() => setLightboxItem(null)}
                >
                    {/* Botón de Eliminar */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setAttachmentToDelete(lightboxItem);
                        }}
                        className="absolute top-4 right-20 z-[10010] p-3 rounded-full bg-red-600/20 text-red-200 hover:bg-red-650/35 transition-all hover:scale-105 shadow-md active:scale-95 cursor-pointer border border-red-500/20"
                        title="Eliminar archivo"
                    >
                        <Trash2 className="h-6 w-6" />
                    </button>

                    {/* Botón de Cerrar */}
                    <button
                        type="button"
                        onClick={() => setLightboxItem(null)}
                        className="absolute top-4 right-4 z-[10010] p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:scale-105 shadow-md active:scale-95 cursor-pointer"
                        title="Cerrar vista previa"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    {/* Contenedor del Adjunto */}
                    <div 
                        className="relative max-w-4xl w-full max-h-[70vh] flex items-center justify-center animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {lightboxItem.tipo.startsWith('image/') ? (
                            <img 
                                src={lightboxItem.url} 
                                alt={lightboxItem.nombre} 
                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
                            />
                        ) : lightboxItem.tipo.startsWith('video/') ? (
                            <video 
                                src={lightboxItem.url} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
                            />
                        ) : lightboxItem.tipo.startsWith('audio/') ? (
                            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center gap-4 w-full max-w-md backdrop-blur-sm">
                                <div className="h-16 w-16 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full flex items-center justify-center">
                                    <Mic className="h-8 w-8" />
                                </div>
                                <span className="text-white text-sm font-semibold font-mono">Audio Grabado</span>
                                <audio src={lightboxItem.url} controls autoPlay className="w-full mt-2" />
                            </div>
                        ) : (
                            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center gap-4 w-full max-w-md backdrop-blur-sm">
                                <div className="h-16 w-16 bg-white/5 border border-white/10 text-slate-400 rounded-full flex items-center justify-center">
                                    {getFileIcon(lightboxItem.tipo)}
                                </div>
                                <span className="text-white text-sm font-semibold text-center truncate w-full">{lightboxItem.nombre}</span>
                                <a 
                                    href={lightboxItem.url} 
                                    download={lightboxItem.nombre} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
                                >
                                    <Download className="h-4 w-4" />
                                    Descargar / Abrir Archivo
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Barra de Información (Nombre + Descripción) */}
                    <div 
                        className="max-w-2xl w-full text-center mt-6 space-y-2.5 select-text animate-in slide-in-from-bottom-3 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-white text-base font-bold tracking-tight truncate px-4" title={lightboxItem.nombre}>
                            {lightboxItem.nombre}
                        </h4>
                        
                        {isEditingLightboxDesc ? (
                            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-inner max-w-xl mx-auto space-y-3 text-left">
                                <textarea
                                    value={lightboxDescText}
                                    onChange={(e) => setLightboxDescText(e.target.value)}
                                    placeholder="Escribe una descripción para este archivo..."
                                    rows={5}
                                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 resize-y font-medium leading-relaxed min-h-[120px]"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await handleSaveAttachmentDescription(lightboxItem.id, lightboxDescText);
                                            setIsEditingLightboxDesc(false);
                                        }}
                                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLightboxDescText(lightboxItem.descripcion || "");
                                            setIsEditingLightboxDesc(false);
                                        }}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => {
                                    setLightboxDescText(lightboxItem.descripcion || "");
                                    setIsEditingLightboxDesc(true);
                                }}
                                className="group relative bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-4 shadow-inner max-h-[25vh] overflow-y-auto max-w-xl mx-auto transition-all text-left cursor-pointer hover:bg-white/10"
                            >
                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap select-text selection:bg-brand-500/30 selection:text-white pr-8">
                                    {lightboxItem.descripcion || <span className="text-slate-500 italic">Sin descripción adjunta. Toca o haz clic aquí para añadir una.</span>}
                                </p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxDescText(lightboxItem.descripcion || "");
                                        setIsEditingLightboxDesc(true);
                                    }}
                                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition duration-200 cursor-pointer"
                                    title="Editar descripción"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación de Adjunto */}
            {attachmentToDelete && (
                <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-red-50 text-red-700">
                            <AlertTriangle className="h-6 w-6 shrink-0 animate-bounce text-red-600" />
                            <h3 className="text-sm font-bold uppercase tracking-wider">
                                ¿Eliminar archivo permanentemente?
                            </h3>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                Esta acción es irreversible y no se puede deshacer. Se guardará constancia en el historial de trazabilidad.
                            </p>
                            
                            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500">
                                        {getFileIcon(attachmentToDelete.tipo)}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 truncate block max-w-[300px]">
                                        {attachmentToDelete.nombre}
                                    </span>
                                </div>
                                {attachmentToDelete.descripcion && (
                                    <div className="text-[10px] text-slate-650 italic bg-white border border-slate-100 rounded px-2.5 py-1.5 leading-normal break-words">
                                        <strong>Descripción previa:</strong> {attachmentToDelete.descripcion}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setAttachmentToDelete(null)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConfirmDeleteAttachment(attachmentToDelete.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                            >
                                Confirmar Eliminación
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {task.ordenTrabajoId && (
                <CompartirInformeModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    ordenId={task.ordenTrabajoId}
                    codigoSeguridad={ordenDetalle?.codigoSeguridad || task.ordenTrabajoId}
                    clienteNombre={ordenDetalle?.cliente?.nombre || 'Cliente'}
                    clienteEmail={ordenDetalle?.cliente?.email}
                    clienteTelefono={ordenDetalle?.cliente?.telefono}
                    equipoDano={ordenDetalle?.equipoDano || 'Equipo'}
                    marcaModelo={ordenDetalle?.marcaModelo}
                />
            )}
            {task.ordenTrabajoId && (
                <ReportConfigModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    activoIdQr={(ordenDetalle as any)?.activo?.idQr || 'N/A'}
                    currentOrderId={task.ordenTrabajoId}
                    currentOrderCode={ordenDetalle?.codigoSeguridad || ''}
                    allowOnlyCurrent={true}
                />
            )}
            {/* Modal de confirmación para cambiar estado de orden */}
            {pendingStatusChange && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                            pendingStatusChange.isReopening ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-950">
                            {pendingStatusChange.isReopening ? '¿Reabrir Orden de Trabajo?' : '¿Completar Orden de Trabajo?'}
                        </h3>
                        <p className="text-slate-500 text-xs mt-2 leading-relaxed font-medium">
                            {pendingStatusChange.isReopening 
                                ? '¿Estás seguro de reabrir esta orden de trabajo completada y moverla a un estado activo?'
                                : 'La orden de trabajo se cerrará y no podrás revertir su estado o seguir editándola sin privilegios especiales.'
                            }
                        </p>
                        <div className="flex gap-2 w-full mt-6">
                            <button
                                onClick={() => {
                                    const val = pendingStatusChange.value;
                                    setPendingStatusChange(null);
                                    executeFieldChange('status', val);
                                }}
                                className={`flex-1 font-bold py-2.5 px-4 rounded-xl text-xs text-white transition-colors ${
                                    pendingStatusChange.isReopening ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {pendingStatusChange.isReopening ? 'Sí, reabrir' : 'Sí, completar'}
                            </button>
                            <button
                                onClick={() => setPendingStatusChange(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
