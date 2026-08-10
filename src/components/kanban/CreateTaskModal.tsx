'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { 
    X, 
    Check, 
    User as UserIcon, 
    Calendar, 
    Tag, 
    Users, 
    AlignLeft, 
    Briefcase,
    Loader2,
    Camera,
    Video,
    Mic,
    Play,
    Square,
    RefreshCw,
    Volume2,
    Paperclip,
    Trash2,
    Image as ImageIcon,
    Plus,
    Download,
    Pencil,
    FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { compressImage } from '@/utils/image';
import { useRouter } from 'next/navigation';
import { 
    addActivityTypeToSpace,
    getTaskCommentsAndAttachments,
    createKanbanAttachment,
    deleteKanbanAttachment,
    updateKanbanAttachmentDescription
} from '@/app/(dashboard)/kanban/actions';


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
    defaultStatus?: string;
    onCreate: (taskData: any) => Promise<boolean>;
    taskToEdit?: any;
    onUpdate?: (taskId: string, taskData: any) => Promise<boolean>;
}

export default function CreateTaskModal({
    isOpen,
    onClose,
    currentSpaceId,
    spaces,
    members,
    tasks,
    defaultStatus,
    onCreate,
    taskToEdit,
    onUpdate
}: CreateTaskModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

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

    // Módulo / Área states
    const [selectedModulo, setSelectedModulo] = useState('');
    
    // Attachments & Upload states
    const [attachments, setAttachments] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Lightbox states
    const [lightboxItem, setLightboxItem] = useState<{ nombre: string; url: string; tipo: string; tamano: number; descripcion: string } | null>(null);
    const [lightboxDescText, setLightboxDescText] = useState('');
    const [isEditingLightboxDesc, setIsEditingLightboxDesc] = useState(false);

    useEffect(() => {
        if (lightboxItem) {
            setLightboxDescText(lightboxItem.descripcion || '');
            setIsEditingLightboxDesc(!lightboxItem.descripcion);
        }
    }, [lightboxItem]);

    const getFileIcon = (tipo: string) => {
        if (tipo.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
        if (tipo.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
        if (tipo.includes('excel') || tipo.includes('spreadsheet') || tipo.includes('sheet') || tipo.includes('csv')) return <FileText className="h-6 w-6 text-emerald-500" />;
        return <FileText className="h-6 w-6 text-slate-400" />;
    };

    // Estados para cámara web
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

    // Local spaces state to update dynamically when adding new activity types
    const [localSpaces, setLocalSpaces] = useState<Space[]>(spaces);
    const assigneeDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalSpaces(spaces);
    }, [spaces]);

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

    const activeSpace = localSpaces.find(s => s.id === selectedSpaceId) || localSpaces[0];


    // Reset or update state when space changes
    useEffect(() => {
        if (activeSpace) {
            if (!activeSpace.tiposActividad.includes(type)) {
                setType(activeSpace.tiposActividad[0] || 'Task');
            }
            if (!defaultStatus) {
                setStatus(activeSpace.columnas[0] || 'Por hacer');
            }
        }
    }, [selectedSpaceId, activeSpace, defaultStatus]);

    // Initialize/Reset form on open
    useEffect(() => {
        if (isOpen) {
            if (taskToEdit) {
                setSelectedSpaceId(taskToEdit.spaceId || currentSpaceId);
                setTitle(taskToEdit.title || '');
                setDescription(taskToEdit.description || '');
                setPriority(taskToEdit.priority || 'MEDIUM');
                setSelectedAssigneeIds(taskToEdit.asignados?.map((a: any) => a.id) || (taskToEdit.asignadoId ? [taskToEdit.asignadoId] : []));
                setParentId(taskToEdit.parentId || '');
                setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.split('T')[0] : '');
                setStartDate(taskToEdit.startDate ? taskToEdit.startDate.split('T')[0] : '');
                setEtiquetasInput(taskToEdit.etiquetas?.join(', ') || '');
                setTeam(taskToEdit.team || '');
                setSelectedModulo(taskToEdit.modulo || '');
                setStatus(taskToEdit.status || '');
                setType(taskToEdit.type || 'Tarea');

                // Cargar adjuntos desde el servidor
                const fetchAttachments = async () => {
                    try {
                        const res = await getTaskCommentsAndAttachments(taskToEdit.id);
                        if (res.success && res.attachments) {
                            setAttachments(res.attachments);
                        }
                    } catch (e) {
                        console.error("Error loading task attachments:", e);
                    }
                };
                fetchAttachments();
            } else {
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
                setSelectedModulo('');
                setAttachments([]);
                setType('Tarea');
                if (defaultStatus) {
                    setStatus(defaultStatus);
                } else if (activeSpace) {
                    setStatus(activeSpace.columnas[0] || 'Por hacer');
                }
            }

            setShowAssigneeDropdown(false);
            setAssigneeSearch('');

            // Clean up media streams if open
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                setCameraStream(null);
            }
            setShowCameraModal(false);
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop());
                setVideoStream(null);
            }
            setShowVideoRecordModal(false);
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                setAudioStream(null);
            }
            setShowAudioRecordModal(false);
        }
    }, [isOpen, currentSpaceId, defaultStatus, taskToEdit]);

    // Cleanup media on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
            if (videoStream) videoStream.getTracks().forEach(track => track.stop());
            if (audioStream) audioStream.getTracks().forEach(track => track.stop());
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (audioTimerIntervalRef.current) clearInterval(audioTimerIntervalRef.current);
        };
    }, [cameraStream, videoStream, audioStream]);

    const handleFileUploadLocal = async (file: File) => {
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

            // 3. Agregar a adjuntos locales
            let newAttachment: any = {
                nombre: fileToUpload.name,
                url: publicUrl,
                tipo: fileToUpload.type,
                tamano: fileToUpload.size,
                descripcion: ''
            };

            if (taskToEdit) {
                const dbRes = await createKanbanAttachment({
                    taskId: taskToEdit.id,
                    nombre: fileToUpload.name,
                    url: publicUrl,
                    tipo: fileToUpload.type,
                    tamano: fileToUpload.size
                });
                if (dbRes.success && dbRes.attachment) {
                    newAttachment = dbRes.attachment;
                } else {
                    throw new Error(dbRes.error || 'Error al guardar adjunto en la base de datos');
                }
            }

            setAttachments(prev => [newAttachment, ...prev]);
            toast.success(`Archivo "${file.name}" cargado`);
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
                            await handleFileUploadLocal(renamedFile);
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
    }, [isOpen]);

    const handleUpdateAttachmentDescription = async (index: number, desc: string) => {
        const att = attachments[index];
        if (taskToEdit && att.id) {
            const res = await updateKanbanAttachmentDescription(att.id, desc);
            if (!res.success) {
                toast.error(res.error || "Error al actualizar descripción");
                return;
            }
        }
        setAttachments(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], descripcion: desc };
            return updated;
        });
    };

    const handleRemoveAttachment = async (index: number) => {
        const att = attachments[index];
        if (taskToEdit && att.id) {
            const res = await deleteKanbanAttachment(att.id);
            if (!res.success) {
                toast.error(res.error || "Error al eliminar adjunto");
                return;
            }
        }
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveAttachmentByUrl = async (url: string) => {
        const att = attachments.find(a => a.url === url);
        if (taskToEdit && att && att.id) {
            const res = await deleteKanbanAttachment(att.id);
            if (!res.success) {
                toast.error(res.error || "Error al eliminar adjunto");
                return;
            }
        }
        setAttachments(prev => prev.filter(att => att.url !== url));
        setLightboxItem(null);
    };

    const handleUpdateAttachmentDescriptionByUrl = async (url: string, desc: string) => {
        const att = attachments.find(a => a.url === url);
        if (taskToEdit && att && att.id) {
            const res = await updateKanbanAttachmentDescription(att.id, desc);
            if (!res.success) {
                toast.error(res.error || "Error al actualizar descripción");
                return;
            }
        }
        setAttachments(prev => prev.map(att => att.url === url ? { ...att, descripcion: desc } : att));
        if (lightboxItem && lightboxItem.url === url) {
            setLightboxItem(prev => prev ? { ...prev, descripcion: desc } : null);
        }
    };

    // Camera Web handlers
    const openCamera = async () => {
        setShowCameraModal(true);
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false
                });
                setCameraStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                toast.error("No se pudo iniciar la cámara web. Puedes usar la cámara nativa.");
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
                        await handleFileUploadLocal(file);
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

    // Video recording handlers
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
        
        await handleFileUploadLocal(file);
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

    // Audio recording handlers
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
        
        await handleFileUploadLocal(file);
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

    if (!isOpen) return null;

    const filteredMembers = members.filter(m => 
        m.nombre.toLowerCase().includes(assigneeSearch.toLowerCase())
    );

    const handleToggleAssignee = (id: string) => {
        setSelectedAssigneeIds(prev => 
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const handleAddActivityTypePrompt = () => {
        const name = prompt("Escribe el nombre del nuevo tipo de actividad (ej. Calibración):");
        if (!name) return;
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error("El nombre no puede estar vacío");
            return;
        }

        startTransition(async () => {
            const res = await addActivityTypeToSpace(selectedSpaceId, trimmed);
            if (res.success && res.tiposActividad) {
                // Actualizar localSpaces
                setLocalSpaces(prev => prev.map(s => s.id === selectedSpaceId ? { ...s, tiposActividad: res.tiposActividad! } : s));
                setType(trimmed); // Seleccionar el nuevo tipo inmediatamente
                toast.success(`Tipo de actividad "${trimmed}" agregado con éxito`);
                router.refresh(); // Sincronizar servidor
            } else {
                toast.error(res.error || "Error al agregar tipo de actividad");
            }
        });
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

        const taskData: any = {
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
            team: team.trim() || undefined,
            modulo: selectedModulo || undefined,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        startTransition(async () => {
            if (taskToEdit && onUpdate) {
                // Exclude attachments as they are managed directly
                const { attachments: _, ...updateFields } = taskData;
                const success = await onUpdate(taskToEdit.id, updateFields);
                if (success) {
                    onClose();
                }
            } else {
                const success = await onCreate(taskData);
                if (success) {
                    onClose();
                }
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Cabecera */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
                    <div>
                        <h3 className="text-base font-extrabold text-slate-900">{taskToEdit ? 'Editar Incidencia / Actividad' : 'Crear Incidencia / Actividad'}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{taskToEdit ? 'Edita los detalles y reasigna recursos de tu tarea' : 'Define los detalles y asigna recursos en tu espacio de trabajo'}</p>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold rounded-xl text-xs transition border border-red-200 shadow-sm"
                    >
                        <X className="h-4 w-4 shrink-0" /> Cerrar Ventana
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Multimedia Actions */}
                    <div className="space-y-3 pb-4 border-b border-slate-100">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Agregar Multimedia / Capturas (Pegar Ctrl+V)</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={openCamera}
                                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
                            >
                                <Camera className="h-3.5 w-3.5 text-brand-605" />
                                Tomar Foto
                            </button>
                            <button
                                type="button"
                                onClick={openVideoRecorder}
                                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
                            >
                                <Video className="h-3.5 w-3.5 text-red-650" />
                                Grabar Video
                            </button>
                            <button
                                type="button"
                                onClick={openAudioRecorder}
                                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
                            >
                                <Mic className="h-3.5 w-3.5 text-blue-650" />
                                Grabar Audio
                            </button>
                            <label className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm cursor-pointer transition active:scale-95">
                                <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                Subir Archivos
                                <input
                                    type="file"
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                        const files = e.target.files;
                                        if (files && files.length > 0) {
                                            for (let i = 0; i < files.length; i++) {
                                                await handleFileUploadLocal(files[i]);
                                            }
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        {isUploading && (
                            <div className="flex items-center gap-2 text-xs text-brand-600 font-semibold animate-pulse mt-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Subiendo archivo a Cloudflare R2...
                            </div>
                        )}
                    </div>

                    {/* Local Attachments List */}
                    {attachments.length > 0 && (
                        <div className="space-y-2.5 pb-4 border-b border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Archivos Adjuntos / Capturas ({attachments.length})
                            </label>
                            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 max-h-60 overflow-y-auto">
                                {attachments.map((att, index) => {
                                    const isImage = att.tipo.startsWith('image/');
                                    return (
                                        <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-2.5 rounded-lg border border-slate-150 shadow-sm relative group">
                                            <div 
                                                onClick={() => setLightboxItem(att)}
                                                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition duration-150"
                                                title="Haga clic para previsualizar"
                                            >
                                                {isImage ? (
                                                    <img src={att.url} alt={att.nombre} className="h-10 w-10 rounded object-cover border border-slate-200 shrink-0" />
                                                ) : att.tipo.startsWith('video/') ? (
                                                    <div className="h-10 w-10 bg-black rounded flex items-center justify-center border border-slate-200 shrink-0 relative overflow-hidden">
                                                        <video src={att.url} className="h-full w-full object-cover opacity-80" preload="metadata" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                                            <Play className="h-4 w-4 text-white fill-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center border border-slate-200 shrink-0">
                                                        {getFileIcon(att.tipo)}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-slate-700 truncate" title={att.nombre}>{att.nombre}</p>
                                                    <p className="text-[10px] text-slate-400">{(att.tamano / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                                <input
                                                    type="text"
                                                    value={att.descripcion}
                                                    onChange={(e) => handleUpdateAttachmentDescription(index, e.target.value)}
                                                    placeholder="Añadir descripción..."
                                                    className="flex-1 sm:w-64 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAttachment(index)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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
                                {localSpaces.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre.toUpperCase()} ({s.clave})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-slate-400" />
                                    Tipo de Actividad *
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddActivityTypePrompt}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-brand-600 hover:text-brand-700 transition flex items-center justify-center cursor-pointer"
                                    title="Agregar nuevo tipo de actividad"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition shadow-sm"
                            >
                                {activeSpace?.tiposActividad.map(t => {
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
                    <div ref={assigneeDropdownRef} className="space-y-1.5 relative">
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

                    {/* Fila 3: Tarea Principal (Parent) */}
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
                                {taskToEdit ? 'Guardando...' : 'Creando...'}
                            </>
                        ) : (
                            taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'
                        )}
                    </button>
                </div>

                {/* Modal de Cámara */}
                {showCameraModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                                    id="mobile-camera-input-create"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const files = e.target.files;
                                        if (files && files.length > 0) {
                                            await handleFileUploadLocal(files[0]);
                                            closeCamera();
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="mobile-camera-input-create"
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
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                                        <span>Iniciando cámara...</span>
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
                                            id="video-gallery-input-create"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const files = e.target.files;
                                                if (files && files.length > 0) {
                                                    await handleFileUploadLocal(files[0]);
                                                    closeVideoRecorder();
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="video-gallery-input-create"
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
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                                            className="bg-red-650 hover:bg-red-755 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
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
            </div>

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
                            if (confirm('¿Eliminar este archivo adjunto permanentemente?')) {
                                handleRemoveAttachmentByUrl(lightboxItem.url);
                            }
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
                                        onClick={() => {
                                            handleUpdateAttachmentDescriptionByUrl(lightboxItem.url, lightboxDescText);
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
        </div>
    );
}
