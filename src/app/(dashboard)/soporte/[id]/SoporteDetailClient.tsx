'use client';

import React, { useState, useRef, useEffect } from 'react';
import StatusStepper from '../components/StatusStepper';
import TechnicalWorkbench from '../components/TechnicalWorkbench';
import ApprovalCard from '../components/ApprovalCard';
import AprobacionClienteCard from '../components/AprobacionClienteCard';
import QRGenerator from '../components/QRGenerator';
import RichDescriptionEditor from '@/components/facturas/RichDescriptionEditor';
import { Wrench, ArrowRight, CheckCircle2, ArrowLeft, Pencil, X, UploadCloud, Camera, Image as ImageIcon, Trash2, Layout, AlertCircle, Loader2, Sparkles, Plus, Smartphone, Send, Archive, Building2, Phone, Calendar, Shield, Tag, Package, Hash, FileText, RotateCcw, PenTool } from 'lucide-react';
import { updateEstadoOrden, finalizarReparacion, asignarTecnicos, updateDatosOrden, eliminarOrdenTrabajo, notificarClienteListo, convertirCotizacionAServicioFactura, enviarNotificacionRecepcionTwilio, guardarFirmaOrden } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { compressImage } from '@/utils/image';
import SignatureCanvas from 'react-signature-canvas';

type Orden = any;

export default function SoporteDetailClient({ 
  orden, 
  userRole, 
  customRoleName,
  userEmail = '',
  organizationUsers = [],
  budgetFactura,
  finalFactura,
  accessibleModules = []
}: { 
  orden: Orden; 
  userRole: string; 
  customRoleName?: string;
  userEmail?: string;
  organizationUsers?: any[];
  budgetFactura?: { id: string; correlativo: string; total: number; estado: string } | null;
  finalFactura?: { id: string; correlativo: string; total: number; estado: string } | null;
  accessibleModules?: string[];
}) {
  const role = userRole;
  const cRole = customRoleName?.toUpperCase() || '';

  const isGlobal = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
  const canDeleteOrder = role === 'SUPER_ADMIN' || accessibleModules.includes('eliminar_ordenes');
  
  // Custom support admin check: super/org admin, emilia.zapata, or custom role names matching support admin keywords
  const isSoporteAdmin = isGlobal || 
                         userEmail === 'emilia.zapata@bioelectronicahn.com' || 
                         cRole.includes('SOPORTE_GLOBAL') || 
                         cRole.includes('SOPORTE COMPLETO') || 
                         cRole.includes('SOPORTE_ADMIN') || 
                         cRole.includes('COORDINADOR') || 
                         cRole.includes('SOPORTE TOTAL') ||
                         cRole.includes('ADMINISTRADOR DE SOPORTE') ||
                         cRole.includes('ADMINISTRADOR SOPORTE');

  const isRecepcion = isSoporteAdmin || role === 'RECEPCION' || cRole === 'RECEPCION' || cRole.includes('RECEPCION');
  const isTecnico = isSoporteAdmin || role === 'TECNICO' || role === 'INVENTARIO_EDITOR' || cRole === 'TECNICO' || cRole.includes('TECNICO');
  const isGerente = isSoporteAdmin || role === 'GERENTE' || cRole === 'GERENTE' || cRole.includes('GERENTE');
  const canEditOrder = isGlobal || isRecepcion || accessibleModules.includes('editar_ordenes');

  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [assignedTecnicos, setAssignedTecnicos] = React.useState<any[]>(orden.tecnicosAsignados || []);
  const [updatingTecnicos, setUpdatingTecnicos] = React.useState(false);

  // helper to parse marca and modelo
  const parseMarcaModelo = (val: string) => {
    if (!val) return { marca: '', modelo: '' };
    const parts = val.trim().split(/\s+/);
    return {
      marca: parts[0] || '',
      modelo: parts.slice(1).join(' ') || ''
    };
  };

  const formatForDateInput = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Edit states for Work Order Datos
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editCliente, setEditCliente] = React.useState('');
  const [editTelefono, setEditTelefono] = React.useState('');
  const [editFechaRecibido, setEditFechaRecibido] = React.useState('');
  const [editTipoAparato, setEditTipoAparato] = React.useState('MEDICO');
  const [editTipoTrabajo, setEditTipoTrabajo] = React.useState('NORMAL');
  const [editCobertura, setEditCobertura] = React.useState('externa');
  const [editEquipoDano, setEditEquipoDano] = React.useState('');
  const [editMarca, setEditMarca] = React.useState('');
  const [editModelo, setEditModelo] = React.useState('');
  const [editSerie, setEditSerie] = React.useState('');
  const [editDescripcionFalla, setEditDescripcionFalla] = React.useState('');
  const [editCostoRevision, setEditCostoRevision] = React.useState('650');
  const [editMetodoPagoRevision, setEditMetodoPagoRevision] = React.useState('Ninguno');
  const [editExistingPhotos, setEditExistingPhotos] = React.useState<string[]>([]);
  const [editPhotos, setEditPhotos] = React.useState<{name: string; file: File; url: string; size: string}[]>([]);
  const [savingDatos, setSavingDatos] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  const [editAplicaMantenimientos, setEditAplicaMantenimientos] = React.useState(false);
  const [editGarantiaMeses, setEditGarantiaMeses] = React.useState('');
  const [editFrecuenciaMantenimientoMeses, setEditFrecuenciaMantenimientoMeses] = React.useState('3');
  const [editCantidadMantenimientos, setEditCantidadMantenimientos] = React.useState('');
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const [isPreviewRecepcionTwilioOpen, setIsPreviewRecepcionTwilioOpen] = React.useState(false);
  const [isSendingRecepcionTwilio, setIsSendingRecepcionTwilio] = React.useState(false);
  const [recepcionTwilioSent, setRecepcionTwilioSent] = React.useState(false);

  // Client signature states
  const sigClientCanvasRef = useRef<SignatureCanvas>(null);
  const [clientSignerName, setClientSignerName] = useState(orden.firmaClienteNombre || orden.cliente?.nombreContacto || orden.cliente?.nombre || '');
  const [saveFirmaFuture, setSaveFirmaFuture] = useState(false);
  const [clientHasDrawn, setClientHasDrawn] = useState(false);
  const [isSavingClientFirma, setIsSavingClientFirma] = useState(false);
  const [clientFirmaOverride, setClientFirmaOverride] = useState(false);

  // Technician signature states
  const sigTechCanvasRef = useRef<SignatureCanvas>(null);
  const [techSignerName, setTechSignerName] = useState(orden.firmaTecnicoNombre || '');
  const [techHasDrawn, setTechHasDrawn] = useState(false);
  const [isSavingTechFirma, setIsSavingTechFirma] = useState(false);
  const [techFirmaOverride, setTechFirmaOverride] = useState(false);

  // Pre-fill default tech from assigned techs if not signed
  useEffect(() => {
    if (!orden.firmaTecnicoNombre && assignedTecnicos.length > 0) {
      const firstTech = assignedTecnicos[0];
      const name = [firstTech.nombre, firstTech.apellido].filter(Boolean).join(' ') || firstTech.email;
      setTechSignerName(name);
    } else if (!orden.firmaTecnicoNombre) {
      const currentUser = organizationUsers.find((u: any) => u.email === userEmail);
      if (currentUser) {
        const name = [currentUser.nombre, currentUser.apellido].filter(Boolean).join(' ') || currentUser.email;
        setTechSignerName(name);
      }
    }
  }, [assignedTecnicos, organizationUsers, userEmail, orden.firmaTecnicoNombre]);

  React.useEffect(() => {
    if (!isEditModalOpen) return;
    
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      
      if (files.length > 0) {
        const newPhotos = files.map(f => {
          const name = f.name && f.name !== 'image.png' 
            ? f.name 
            : `pegado-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
          return {
            name,
            file: f,
            url: URL.createObjectURL(f),
            size: (f.size / 1024).toFixed(0)
          };
        });
        setEditPhotos(p => [...p, ...newPhotos]);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isEditModalOpen]);

  const [confirmModal, setConfirmModal] = React.useState<{
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

  const handleOpenEditModal = () => {
    const parsed = parseMarcaModelo(orden.marcaModelo || '');
    setEditCliente(orden.cliente?.nombre || '');
    setEditTelefono(orden.cliente?.telefono || '');
    setEditTipoAparato(orden.tipoAparato || 'MEDICO');
    setEditEquipoDano(orden.equipoDano || '');
    setEditMarca(parsed.marca);
    setEditModelo(parsed.modelo);
    setEditSerie(orden.serie || '');
    setEditDescripcionFalla(orden.descripcionFalla || '');
    setEditCostoRevision(orden.costoRevision?.toString() || '650');
    setEditMetodoPagoRevision(orden.metodoPagoRevision || 'Ninguno');
    setEditExistingPhotos(orden.fotosEstadoInicial || []);
    setEditPhotos([]);
    setLightboxUrl(null);
    setEditTipoTrabajo(orden.tipoTrabajo || 'NORMAL');
    setEditCobertura(orden.cobertura || 'externa');
    setEditFechaRecibido(formatForDateInput(orden.fechaRecibido));
    setEditAplicaMantenimientos(orden.aplicaMantenimientos || false);
    setEditGarantiaMeses(orden.garantiaMeses?.toString() || '');
    setEditFrecuenciaMantenimientoMeses(orden.frecuenciaMantenimientoMeses?.toString() || '3');
    setEditCantidadMantenimientos(orden.cantidadMantenimientos?.toString() || '');
    setIsEditModalOpen(true);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).map(f => ({
      name: f.name, file: f, url: URL.createObjectURL(f), size: (f.size / 1024).toFixed(0)
    }));
    setEditPhotos(p => [...p, ...newPhotos]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleSaveDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDatos(true);
    try {
      // Upload new photos to R2 first
      const uploadedUrls: string[] = [];
      for (const photo of editPhotos) {
        try {
          let fileToUpload = photo.file;
          try {
            fileToUpload = await compressImage(photo.file);
          } catch (compErr) {
            console.error("Compression error:", compErr);
          }
          const contentType = fileToUpload.type || 'application/octet-stream';
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: fileToUpload.name, contentType })
          });
          if (!res.ok) {
            const errData = await res.json().catch(()=>({}));
            throw new Error(`Error del servidor al obtener URL: ${res.status} ${errData.error || ''}`);
          }
          const { uploadUrl, publicUrl } = await res.json();
          
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: fileToUpload,
            headers: { 'Content-Type': contentType }
          });
          
          if (!uploadRes.ok) {
            throw new Error(`Error de Cloudflare R2: ${uploadRes.status} ${uploadRes.statusText}`);
          }
          
          uploadedUrls.push(publicUrl);
        } catch (uploadError: any) {
          console.error("Upload error detail:", uploadError);
          throw new Error(`Fallo al subir la imagen ${photo.name}. Detalles: ${uploadError.message}`);
        }
      }

      const combinedPhotos = [...editExistingPhotos, ...uploadedUrls];
      const combinedMarcaModelo = [editMarca.trim(), editModelo.trim()].filter(Boolean).join(" ") || null;
      const res = await updateDatosOrden(orden.id, {
        tipoAparato: editTipoAparato,
        equipoDano: editEquipoDano,
        marcaModelo: combinedMarcaModelo,
        serie: editSerie,
        clienteNombre: editCliente,
        clienteTelefono: editTelefono,
        descripcionFalla: editDescripcionFalla,
        costoRevision: parseFloat(editCostoRevision) || 650,
        metodoPagoRevision: editMetodoPagoRevision,
        fotosEstadoInicial: combinedPhotos,
        tipoTrabajo: editTipoTrabajo,
        cobertura: editCobertura,
        fechaRecibido: editFechaRecibido,
        aplicaMantenimientos: editAplicaMantenimientos,
        garantiaMeses: editGarantiaMeses ? parseInt(editGarantiaMeses) : null,
        frecuenciaMantenimientoMeses: editFrecuenciaMantenimientoMeses ? parseInt(editFrecuenciaMantenimientoMeses) : null,
        cantidadMantenimientos: editCantidadMantenimientos ? parseInt(editCantidadMantenimientos) : null,
      });
      if (res.success) {
        toast.success("Datos de la orden actualizados con éxito");
        setIsEditModalOpen(false);
        window.location.reload();
      } else {
        toast.error("Error al actualizar la orden");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al actualizar la orden");
    } finally {
      setSavingDatos(false);
    }
  };

  const handleToggleTecnico = async (tecnicoId: string) => {
    setUpdatingTecnicos(true);
    try {
      let nextList;
      if (assignedTecnicos.some(t => t.id === tecnicoId)) {
        nextList = assignedTecnicos.filter(t => t.id !== tecnicoId);
      } else {
        const found = organizationUsers.find(u => u.id === tecnicoId);
        nextList = found ? [...assignedTecnicos, found] : assignedTecnicos;
      }
      setAssignedTecnicos(nextList);
      await asignarTecnicos(orden.id, nextList.map(t => t.id));
    } catch (e) {
      console.error(e);
      alert("Error al actualizar asignación de técnicos");
    } finally {
      setUpdatingTecnicos(false);
    }
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
    const filename = `signature-${orden.id}-${Date.now()}.png`;
    
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

    setIsSavingClientFirma(true);
    try {
      const dataUrl = sigClientCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
      const publicUrl = await uploadSignatureToR2(dataUrl);
      
      const res = await guardarFirmaOrden({
        ordenId: orden.id,
        tipo: 'cliente',
        firmaUrl: publicUrl,
        nombreSigner: clientSignerName.trim(),
        guardarDigital: saveFirmaFuture
      });

      if (res.success) {
        toast.success('Firma del cliente guardada exitosamente.');
        window.location.reload();
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
    if (!orden.cliente?.firmaDigitalUrl) return;
    
    setIsSavingClientFirma(true);
    try {
      const res = await guardarFirmaOrden({
        ordenId: orden.id,
        tipo: 'cliente',
        firmaUrl: orden.cliente.firmaDigitalUrl,
        nombreSigner: orden.cliente.firmaDigitalNombre || orden.cliente.nombreContacto || orden.cliente.nombre || 'Cliente',
        guardarDigital: false
      });

      if (res.success) {
        toast.success('Firma guardada del cliente aplicada exitosamente.');
        window.location.reload();
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

    setIsSavingTechFirma(true);
    try {
      const dataUrl = sigTechCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
      const publicUrl = await uploadSignatureToR2(dataUrl);
      
      const res = await guardarFirmaOrden({
        ordenId: orden.id,
        tipo: 'tecnico',
        firmaUrl: publicUrl,
        nombreSigner: techSignerName.trim()
      });

      if (res.success) {
        toast.success('Firma del técnico guardada exitosamente.');
        window.location.reload();
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

  const handleAvanzar = async (nuevoEstado: string) => {
    setLoading(true);
    if (nuevoEstado === 'LISTO_ENTREGA') {
        await finalizarReparacion(orden.id);
    } else {
        await updateEstadoOrden(orden.id, nuevoEstado);
    }
    setLoading(false);
    window.location.reload();
  };

  const getEstadoAnterior = (estado: string): string | null => {
    switch (estado) {
      case 'EN_EVALUACION':
        return 'RECIBIDO';
      case 'ESPERANDO_APROBACION':
        return 'EN_EVALUACION';
      case 'APROBACION_PRESUPUESTO':
        return 'ESPERANDO_APROBACION';
      case 'REPARACION':
        return 'APROBACION_PRESUPUESTO';
      case 'LISTO_ENTREGA':
        return 'REPARACION';
      case 'ENTREGADO':
        return 'LISTO_ENTREGA';
      default:
        return null;
    }
  };

  const handleRetroceder = async (estadoAnterior: string) => {
    showConfirm({
      title: `¿Regresar al estado anterior?`,
      description: `¿Estás seguro de que deseas regresar esta orden al estado anterior (${estadoAnterior})?`,
      confirmText: 'Regresar Estado',
      cancelText: 'Cancelar',
      type: 'warning',
      onConfirm: async () => {
        setLoading(true);
        await updateEstadoOrden(orden.id, estadoAnterior);
        setLoading(false);
        window.location.reload();
      }
    });
  };

  const handleEliminarOrden = async () => {
    showConfirm({
      title: '¿Eliminar orden permanentemente?',
      description: '¿Estás absolutamente seguro de que deseas ELIMINAR permanentemente esta orden de trabajo? Esta acción borrará la orden, todos sus repuestos, las tareas/comentarios en Kanban y el presupuesto generado, y NO se puede deshacer.',
      confirmText: 'Sí, Eliminar permanentemente',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await eliminarOrdenTrabajo(orden.id);
          if (res.success) {
            toast.success("Orden de trabajo eliminada exitosamente.");
            router.push('/soporte');
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

  const FichaField = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col gap-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
        </div>
        <div className="text-sm font-semibold text-slate-800">
          {value}
        </div>
      </div>
    );
  };

  return (
    <div className="px-0 py-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50">
      <button 
        onClick={() => router.push('/soporte')}
        className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4 md:mb-6 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al Taller
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <Wrench className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="m-0 text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              Módulo Técnico · Orden #{orden.codigoSeguridad}
              <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${
                orden.cobertura === 'interna' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {orden.cobertura === 'interna' ? '🏢 Interna' : '🌍 Externa'}
              </span>
              <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${
                orden.tipoTrabajo === 'GARANTIA' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : orden.tipoTrabajo === 'RECLAMO'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : orden.tipoTrabajo === 'MANTENIMIENTO'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {orden.tipoTrabajo === 'GARANTIA' 
                  ? '🎖️ Garantía' 
                  : orden.tipoTrabajo === 'RECLAMO' 
                  ? '⚠️ Reclamo' 
                  : orden.tipoTrabajo === 'MANTENIMIENTO' 
                  ? '🔧 Mantenimiento' 
                  : '⚙️ Normal'}
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Bioelectrónica Honduras · Reparaciones y Mantenimiento
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {orden.estado !== 'RECIBIDO' && orden.estado !== 'REGISTRO' && (isGlobal || isRecepcion || isTecnico || isGerente) && (
            <button
              type="button"
              onClick={() => {
                const prev = getEstadoAnterior(orden.estado);
                if (prev) handleRetroceder(prev);
              }}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm shrink-0 active:scale-95 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Estado Anterior
            </button>
          )}
          {orden.estado === 'REGISTRO' ? (
            <button
              type="button"
              onClick={() => {
                showConfirm({
                  title: '¿Mover a taller activo?',
                  description: '¿Deseas mover esta orden de regreso al taller activo (como RECIBIDO)? Volverá a aparecer en el tablero Kanban.',
                  confirmText: 'Mover a Taller',
                  cancelText: 'Cancelar',
                  onConfirm: async () => {
                    setLoading(true);
                    await updateEstadoOrden(orden.id, 'RECIBIDO');
                    setLoading(false);
                    window.location.reload();
                  }
                });
              }}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95 disabled:opacity-50"
            >
              <Wrench className="w-3.5 h-3.5" /> Activar en Taller
            </button>
          ) : (
            (isGlobal || isRecepcion || isGerente) && (
              <button
                type="button"
                onClick={() => {
                  showConfirm({
                    title: '¿Mover a Registro de Equipos?',
                    description: 'Esta orden se moverá fuera del flujo del taller activo al Registro de Equipos Histórico para su seguimiento a largo plazo. Desaparecerá de las columnas del Kanban.',
                    confirmText: 'Sí, Mover a Registro',
                    cancelText: 'Cancelar',
                    onConfirm: async () => {
                      setLoading(true);
                      await updateEstadoOrden(orden.id, 'REGISTRO');
                      setLoading(false);
                      window.location.reload();
                    }
                  });
                }}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95 disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" /> Archivar en Registro
              </button>
            )
          )}
          {canEditOrder && (
            <button
              type="button"
              onClick={() => handleOpenEditModal()}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar Datos
            </button>
          )}
          {orden.kanbanTasks && orden.kanbanTasks.length > 0 && (
            <a
              href={`/kanban/${orden.kanbanTasks[0].spaceId}?task=${orden.kanbanTasks[0].id}`}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95"
            >
              <Layout className="w-3.5 h-3.5 text-indigo-500" /> Orden de Trabajo ({orden.kanbanTasks[0].codigo})
            </a>
          )}
          {orden.activoId && (
            <a
              href={`/api/pdf/${orden.activoId}?type=historial`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" /> Historial de Mantenimientos
            </a>
          )}
          {canDeleteOrder && (
            <button
              type="button"
              onClick={() => handleEliminarOrden()}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar Orden
            </button>
          )}
        </div>
      </div>

      {orden.cobertura === 'externa' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 md:p-8 animate-in fade-in duration-200 mb-6">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800">Ficha de Registro de Orden Externa</h2>
            <p className="text-xs text-slate-500 mt-1">Detalle de registro para contratos de mantenimiento y soporte externo.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <FichaField label="Cliente / Empresa" value={orden.cliente?.nombre} icon={Building2} />
            <FichaField label="Teléfono / WhatsApp" value={orden.cliente?.telefono} icon={Phone} />
            <FichaField label="Fecha de Recepción" value={new Date(orden.fechaRecibido).toLocaleDateString()} icon={Calendar} />
            
            <FichaField label="Cobertura de Orden" value={orden.cobertura === 'interna' ? '🏢 Interna' : '🌍 Externa'} icon={Shield} />
            <FichaField label="Tipo de Trabajo" value={orden.tipoTrabajo === 'MANTENIMIENTO' ? '🔧 Mantenimiento' : orden.tipoTrabajo === 'GARANTIA' ? '🎖️ Garantía' : orden.tipoTrabajo === 'RECLAMO' ? '⚠️ Reclamo' : '⚙️ Normal'} icon={Tag} />
            <FichaField label="Tipo de Equipo" value={orden.tipoAparato === 'MEDICO' ? '🏥 Médico' : orden.tipoAparato === 'AIRE' ? '❄️ Aire Acond.' : '🔧 Otro'} icon={Wrench} />
            
            <FichaField label="Nombre del Equipo" value={orden.equipoDano} icon={Package} />
            <FichaField label="Marca / Modelo" value={orden.marcaModelo || "No especificado"} icon={Tag} />
            <FichaField label="Número de Serie" value={orden.serie} icon={Hash} />
          </div>
          
          <div className="mt-6 border-t border-slate-100 pt-6">
            <span className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">Descripción de Falla o Trabajo Realizado</span>
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4">
              <RichDescriptionEditor content={orden.descripcionFalla || ''} readOnly onChange={() => {}} />
            </div>
          </div>
          
          {orden.fotosEstadoInicial && orden.fotosEstadoInicial.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <span className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-3">Fotos de Evidencia ({orden.fotosEstadoInicial.length})</span>
              <div className="flex flex-wrap gap-3">
                {orden.fotosEstadoInicial.map((img: string, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => setLightboxUrl(img)}
                    className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:border-indigo-500 transition-colors shadow-sm"
                  >
                    <img src={img} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <StatusStepper 
            estadoActual={orden.estado} 
            ordenId={orden.codigoSeguridad} 
            equipoInfo={`${orden.equipoDano} — S/N: ${orden.serie || 'N/A'}`}
          />

          <div className="grid grid-cols-12 gap-4 md:gap-5">
        
        {/* Column 1: Primary Action & Tech Assignment (left) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          
          {/* A. Current state content card */}
          {(isRecepcion || isTecnico) && orden.estado === 'RECIBIDO' && (
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Recepción completada</h2>
              <p className="text-slate-600 text-sm mb-4">La orden ya fue recibida. Entrega la etiqueta al cliente y avísale al técnico.</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewRecepcionTwilioOpen(true)}
                  disabled={loading}
                  className={`flex-1 py-3 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                    recepcionTwilioSent
                      ? "bg-green-50 hover:bg-green-100 text-green-800 border-green-200"
                      : "bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {recepcionTwilioSent ? "Notificación de Recepción Enviada ✓" : "Avisar Recepción por WhatsApp"}
                </button>
                
                <button 
                  onClick={() => handleAvanzar('EN_EVALUACION')}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition active:scale-95 cursor-pointer"
                >
                  Pasar a Diagnóstico Técnico <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isTecnico && ['EN_EVALUACION', 'REPARACION'].includes(orden.estado) && (
            <div>
              <TechnicalWorkbench orderData={orden} />
            </div>
          )}

          {isTecnico && !isGerente && orden.estado === 'ESPERANDO_APROBACION' && (
            <div className="bg-white rounded-2xl p-5 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Presupuesto Enviado</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                La cotización de repuestos y mano de obra fue enviada exitosamente a la gerencia para su revisión y contacto con el cliente.
              </p>
              <button 
                onClick={() => router.push('/soporte')}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al Taller
              </button>
            </div>
          )}

          {isGerente && orden.estado === 'ESPERANDO_APROBACION' && (
            <ApprovalCard 
              orderData={orden} 
              isGerente={isGerente}
              budgetFactura={budgetFactura}
              onApprove={() => {
                handleAvanzar('REPARACION');
              }}
              onReject={() => {
                handleRetroceder('EN_EVALUACION');
              }}
            />
          )}

          {orden.estado === 'APROBACION_PRESUPUESTO' && (
            <AprobacionClienteCard
              orderData={orden}
              budgetFactura={budgetFactura}
              isGerente={isGerente}
              onApprove={() => {
                window.location.reload();
              }}
              onReject={() => {
                handleRetroceder('ESPERANDO_APROBACION');
              }}
            />
          )}

          {orden.estado === 'LISTO_ENTREGA' && (
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="m-0 text-sm md:text-[15px] font-bold text-slate-900 tracking-tight">Notificación de Retiro de Equipo</h4>
                  <p className="m-0 text-xs text-slate-500 font-medium">Notificación automatizada por WhatsApp Twilio</p>
                </div>
                {orden.notificadoWhatsApp && (
                  <div className="shrink-0 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                    Avisado ✓
                  </div>
                )}
              </div>

              <div className="mb-5 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <div className="text-slate-600 text-xs md:text-sm leading-relaxed">
                  El equipo <strong>{orden.equipoDano}</strong> ha sido reparado con éxito y se encuentra listo para que el cliente pase a recogerlo.
                </div>
                
                {orden.notificadoWhatsApp ? (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
                    <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-emerald-900 block mb-0.5">¡Cliente notificado exitosamente!</span>
                      <p className="text-emerald-700 leading-normal">
                        Se envió el mensaje con la plantilla de Twilio indicando que el equipo está listo para entrega. El cliente fue avisado para que lo vaya a recoger ya.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      El cliente aún no ha recibido la notificación. Pulse el botón inferior para enviarle una alerta por WhatsApp a su número registrado: <strong>{orden.cliente?.telefono || 'Sin teléfono'}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Sección de Facturación Final */}
              <div className="mb-5 border-t border-slate-100 pt-5">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Facturación de Entrega</h5>
                {finalFactura ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-emerald-900 text-sm block">Factura Oficial Emitida</span>
                        <p className="text-xs text-emerald-700 mt-0.5 font-semibold">
                          Correlativo: <span className="font-mono text-emerald-800 font-bold">{finalFactura.correlativo}</span> · Total: <span className="font-bold">L {finalFactura.total.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/facturas/ver/${finalFactura.id}`)}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 font-bold rounded-xl text-xs shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      Ver Factura
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3.5">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed m-0">
                      Antes de entregar el equipo, por favor genere la factura final para el pago del cliente. Puede convertir la cotización previamente autorizada o crear una nueva factura enlazada con este servicio.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        disabled={loading || !budgetFactura}
                        onClick={() => {
                          if (!budgetFactura) return;
                          showConfirm({
                            title: `¿Convertir cotización a factura?`,
                            description: `Se convertirá el presupuesto ${budgetFactura.correlativo} (por un total de L ${budgetFactura.total.toFixed(2)}) en una Factura Oficial emitida. Esta acción no se puede deshacer.`,
                            confirmText: 'Convertir a Factura',
                            cancelText: 'Cancelar',
                            type: 'info',
                            onConfirm: async () => {
                              setLoading(true);
                              try {
                                const res = await convertirCotizacionAServicioFactura(budgetFactura.id);
                                if (res.success && res.nuevoId) {
                                  toast.success("Factura generada exitosamente.");
                                  window.location.reload();
                                } else {
                                  toast.error(res.error || "Error al convertir la cotización.");
                                }
                              } catch (err) {
                                console.error(err);
                                toast.error("Error al conectar con el servidor.");
                              } finally {
                                setLoading(false);
                              }
                            }
                          });
                        }}
                        className="flex-1 py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        {budgetFactura ? `Convertir Cotización (${budgetFactura.correlativo})` : 'Sin Cotización'}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/facturas/nuevo?ordenTrabajoId=${orden.id}`)}
                        className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Crear Nueva Factura
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await notificarClienteListo(orden.id);
                      if (res.success) {
                        toast.success("Notificación enviada por WhatsApp con éxito.");
                        window.location.reload();
                      } else {
                        toast.error(res.error || "Error al enviar la notificación.");
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Error de conexión al notificar al cliente.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !orden.cliente?.telefono}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                    orden.notificadoWhatsApp
                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent"
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.618-1.01-5.078-2.854-6.924C16.379 2.036 13.924 1.02 11.3 1.02 5.895 1.02 1.493 5.415 1.49 10.82c-.001 1.554.412 3.072 1.199 4.4l-.979 3.57 3.661-.96c1.288.703 2.656 1.077 4.276 1.079zM17.65 14.54c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.58.13-.17.26-.67.85-.82 1.02-.15.17-.3.2-.56.07-.26-.13-1.1-.41-2.1-1.3-.78-.7-1.3-1.56-1.45-1.82-.15-.26-.02-.4.11-.53.12-.11.26-.3.39-.46.13-.17.17-.28.26-.46.09-.17.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.22-.53-.45-.45-.61-.46h-.52c-.17 0-.46.07-.7.33-.24.26-.92.9-1.02 2.18-.09 1.27.83 2.5 1.02 2.75.19.25 1.83 2.8 4.43 3.93.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.07-.12-.26-.18-.52-.3z"/>
                    </svg>
                  )}
                  <span>
                    {orden.notificadoWhatsApp
                      ? "Re-enviar Notificación de Retiro"
                      : "Avisar al Cliente por WhatsApp (Twilio)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAvanzar('ENTREGADO')}
                  disabled={loading}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Entregar Equipo al Cliente (Finalizar)
                </button>
              </div>
            </div>
          )}

          {/* B. Tarjeta de Técnicos Asignados (Always directly below the action card) */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h4 className="m-0 text-sm font-bold text-slate-900">Personal Técnico Asignado</h4>
                <p className="m-0 text-[11px] text-slate-500 font-medium">Asigna uno o más técnicos a este trabajo</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {assignedTecnicos.map(t => {
                const displayName = [t.nombre, t.apellido].filter(Boolean).join(" ") || t.email;
                return (
                  <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold shadow-sm">
                    <span>{displayName.toUpperCase()}</span>
                    {isGlobal || isGerente || isRecepcion || isTecnico ? (
                      <button
                        disabled={updatingTecnicos}
                        onClick={() => handleToggleTecnico(t.id)}
                        className="w-3.5 h-3.5 bg-indigo-200 hover:bg-indigo-300 text-indigo-800 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors"
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                );
              })}
              {assignedTecnicos.length === 0 && (
                <span className="text-xs text-slate-400 italic">Sin técnicos asignados</span>
              )}
            </div>

            {(isGlobal || isGerente || isRecepcion || isTecnico) && (
              <div>
                <select
                  disabled={updatingTecnicos}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium disabled:opacity-50"
                  value=""
                  onChange={e => {
                    const val = e.target.value;
                    if (val) handleToggleTecnico(val);
                  }}
                >
                  <option value="">+ Agregar Técnico...</option>
                  {organizationUsers.map(u => {
                    const displayName = [u.nombre, u.apellido].filter(Boolean).join(" ") || u.email;
                    const puestoText = u.puesto ? u.puesto.toUpperCase() : u.role;
                    return (
                      <option key={u.id} value={u.id} disabled={assignedTecnicos.some(t => t.id === u.id)}>
                        {displayName.toUpperCase()} ({puestoText})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: QRGenerator & Printing (right) */}
        <div className="col-span-12 lg:col-span-4">
          {(isRecepcion || isTecnico || isGerente) && (
            <QRGenerator 
              orderId={orden.codigoSeguridad} 
              serie={orden.serie || "N/A"} 
              cliente={orden.cliente?.nombre || ""} 
              equipo={orden.equipoDano}
              marcaModelo={orden.marcaModelo || ""}
              fecha={new Date(orden.fechaRecibido || new Date()).toLocaleDateString("es-HN")}
              kanbanCodigo={orden.kanbanTasks?.[0]?.codigo}
            />
          )}
        </div>
      </div>
      </>
      )}

      {/* ================= SECCIÓN DE FIRMAS DIGITALES ================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 md:p-8 mt-6 mb-6">
        <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PenTool className="text-indigo-600 w-5 h-5" />
              Firma Digital de Trabajo Realizado
            </h2>
            <p className="text-xs text-slate-500 mt-1">Registra la conformidad del cliente y del técnico biomédico asignado.</p>
          </div>
          
          <a
            href={`/api/pdf/${orden.id}?type=historial`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <FileText className="w-4 h-4 text-emerald-500" /> Generar Informe Técnico
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* A. Firma del Cliente */}
          <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Firma del Cliente de Recibido</span>
            </h3>
            
            {orden.firmaClienteUrl && !clientFirmaOverride ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-center h-40">
                  <img src={orden.firmaClienteUrl} alt="Firma del Cliente" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-center bg-green-50 text-green-800 text-[11px] p-2.5 rounded-xl border border-green-200 font-semibold shadow-sm">
                  Firmado por {orden.firmaClienteNombre} el {new Date(orden.firmaClienteFecha).toLocaleString('es-HN')}
                </div>
                <button
                  type="button"
                  onClick={() => setClientFirmaOverride(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer mt-1"
                >
                  Volver a firmar / Cambiar firma
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {orden.cliente?.firmaDigitalUrl && (
                  <button
                    type="button"
                    disabled={isSavingClientFirma}
                    onClick={handleUseSavedFirma}
                    className="w-full py-2.5 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                    Utilizar Firma Digital Guardada de {orden.cliente.firmaDigitalNombre}
                  </button>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Firmante *</label>
                  <input
                    type="text"
                    value={clientSignerName}
                    onChange={e => setClientSignerName(e.target.value)}
                    placeholder="Escribe el nombre del cliente..."
                    className="w-full text-xs border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 font-semibold shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dibuje la firma abajo</label>
                    <button
                      type="button"
                      onClick={() => {
                        sigClientCanvasRef.current?.clear();
                        setClientHasDrawn(false);
                      }}
                      className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 bg-indigo-50 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={10} /> Limpiar
                    </button>
                  </div>
                  <div className="border border-dashed border-slate-300 rounded-2xl bg-white h-40 relative touch-none overflow-hidden shadow-inner">
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveFirmaFuture"
                    checked={saveFirmaFuture}
                    onChange={e => setSaveFirmaFuture(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="saveFirmaFuture" className="text-xs text-slate-600 font-medium select-none cursor-pointer">
                    Guardar firma para futuros servicios de este cliente
                  </label>
                </div>

                <div className="flex gap-2">
                  {orden.firmaClienteUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setClientFirmaOverride(false);
                        setClientHasDrawn(false);
                      }}
                      className="w-1/3 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer font-semibold shadow-sm"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSavingClientFirma}
                    onClick={handleSaveClientFirma}
                    className={`py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer ${orden.firmaClienteUrl ? 'w-2/3' : 'w-full'}`}
                  >
                    {isSavingClientFirma ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <PenTool size={14} />
                    )}
                    Registrar Firma del Cliente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. Firma del Técnico */}
          <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Firma del Técnico Biomédico</span>
            </h3>

            {orden.firmaTecnicoUrl && !techFirmaOverride ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-center h-40">
                  <img src={orden.firmaTecnicoUrl} alt="Firma del Técnico" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-center bg-green-50 text-green-800 text-[11px] p-2.5 rounded-xl border border-green-200 font-semibold shadow-sm">
                  Firmado por {orden.firmaTecnicoNombre} el {new Date(orden.firmaTecnicoFecha).toLocaleString('es-HN')}
                </div>
                <button
                  type="button"
                  onClick={() => setTechFirmaOverride(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer mt-1"
                >
                  Volver a firmar / Cambiar firma
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Biomédico Asignado *</label>
                  <input
                    type="text"
                    value={techSignerName}
                    onChange={e => setTechSignerName(e.target.value)}
                    placeholder="Nombre completo del técnico..."
                    className="w-full text-xs border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 font-semibold shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dibuje la firma abajo</label>
                    <button
                      type="button"
                      onClick={() => {
                        sigTechCanvasRef.current?.clear();
                        setTechHasDrawn(false);
                      }}
                      className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 bg-indigo-50 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={10} /> Limpiar
                    </button>
                  </div>
                  <div className="border border-dashed border-slate-300 rounded-2xl bg-white h-40 relative touch-none overflow-hidden shadow-inner">
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
                  {orden.firmaTecnicoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setTechFirmaOverride(false);
                        setTechHasDrawn(false);
                      }}
                      className="w-1/3 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer font-semibold shadow-sm"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSavingTechFirma}
                    onClick={handleSaveTechFirma}
                    className={`py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer ${orden.firmaTecnicoUrl ? 'w-2/3' : 'w-full'}`}
                  >
                    {isSavingTechFirma ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <PenTool size={14} />
                    )}
                    Registrar Firma del Técnico
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para Editar Datos de la Orden */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-full sm:h-auto max-h-screen sm:max-h-[90vh] animate-in slide-in-from-bottom-56 sm:zoom-in-95 duration-300">
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Editar Datos de la Orden #{orden.codigoSeguridad}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 transition-colors"
              >
                <X className="w-5.5 h-5.5 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDatos} className="p-4 sm:p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cliente / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCliente}
                    onChange={(e) => setEditCliente(e.target.value)}
                    placeholder="Ej. Hospital Centro"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                    placeholder="+504 "
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Fecha de Recepción *
                  </label>
                  <input
                    type="date"
                    required
                    value={editFechaRecibido}
                    onChange={(e) => setEditFechaRecibido(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cobertura de Orden
                  </label>
                  <div className="flex gap-2">
                    {[["externa","🌍 Externa"],["interna","🏢 Interna"]].map(([v,l]) => (
                      <button 
                        type="button" 
                        key={v} 
                        onClick={() => {
                          setEditCobertura(v);
                          if (v === 'externa') {
                            setEditCostoRevision('0');
                            setEditMetodoPagoRevision('Ninguno');
                          }
                        }} 
                        className={`flex-1 py-3 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all ${
                          editCobertura === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tipo de Trabajo
                  </label>
                  <div className="flex gap-2">
                    {[["NORMAL","Normal"],["GARANTIA","Garantía"],["RECLAMO","Reclamo"],["MANTENIMIENTO","Mantenimiento"]].map(([v,l]) => (
                      <button 
                        type="button" 
                        key={v} 
                        onClick={() => setEditTipoTrabajo(v)} 
                        className={`flex-1 py-3 rounded-xl border-2 text-[10px] sm:text-xs font-bold transition-all ${
                          editTipoTrabajo === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tipo de Equipo
                  </label>
                  <div className="flex gap-2">
                    {[["MEDICO","🏥 Médico"],["AIRE","❄️ Aire Acond."],["OTRO","🔧 Otro"]].map(([v,l]) => (
                      <button 
                        type="button" 
                        key={v} 
                        onClick={() => setEditTipoAparato(v)} 
                        className={`flex-1 py-3 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all ${
                          editTipoAparato === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nombre del Equipo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEquipoDano}
                    onChange={(e) => setEditEquipoDano(e.target.value)}
                    placeholder="Ej. Concentrador de Oxígeno"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={editMarca}
                    onChange={(e) => setEditMarca(e.target.value)}
                    placeholder="Ej. GE"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={editModelo}
                    onChange={(e) => setEditModelo(e.target.value)}
                    placeholder="Ej. Dash 4000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Número de Serie (S/N)
                  </label>
                  <input
                    type="text"
                    value={editSerie}
                    onChange={(e) => setEditSerie(e.target.value)}
                    placeholder="Ej. SN-123"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descripción de Falla o Trabajo Realizado *
                </label>
                <RichDescriptionEditor 
                  content={editDescripcionFalla} 
                  onChange={(html) => setEditDescripcionFalla(html)} 
                  placeholder="¿Qué reporta el cliente?"
                />
              </div>
              {editCobertura === 'interna' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Costo de Revisión / Diagnóstico (L.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editCostoRevision}
                      onChange={(e) => setEditCostoRevision(e.target.value)}
                      placeholder="Ej. 650"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors font-bold text-slate-800 bg-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Método de Pago (Revisión)
                    </label>
                    <select
                      value={editMetodoPagoRevision}
                      onChange={(e) => setEditMetodoPagoRevision(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-semibold shadow-sm"
                    >
                      <option value="Ninguno">Ninguno / Pendiente</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Link de pago de Occidente">Link de pago de Occidente</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Programación de Garantías y Mantenimientos (Edición) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editAplicaMantenimientos"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    checked={editAplicaMantenimientos}
                    onChange={(e) => setEditAplicaMantenimientos(e.target.checked)}
                  />
                  <label htmlFor="editAplicaMantenimientos" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                    Aplica Garantía o Programación de Mantenimiento Preventivo Periódico
                  </label>
                </div>

                {editAplicaMantenimientos && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Garantía (Meses)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-350 text-xs font-semibold focus:ring-2 outline-none focus:ring-indigo-100 bg-white"
                        value={editGarantiaMeses}
                        onChange={(e) => setEditGarantiaMeses(e.target.value)}
                        placeholder="Ej. 12"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cada cuántos meses (Frecuencia) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-350 text-xs font-semibold focus:ring-2 outline-none focus:ring-indigo-100 bg-white"
                        value={editFrecuenciaMantenimientoMeses}
                        onChange={(e) => setEditFrecuenciaMantenimientoMeses(e.target.value)}
                        placeholder="Ej. 3"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cantidad de Mantenimientos</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-350 text-xs font-semibold focus:ring-2 outline-none focus:ring-indigo-100 bg-white"
                        value={editCantidadMantenimientos}
                        onChange={(e) => setEditCantidadMantenimientos(e.target.value)}
                        placeholder="Vacío = Permanente / Ilimitado"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fotos Estado Físico (R2) */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Fotos Estado Físico (Evidencia)
                </label>
                
                <input 
                  ref={fileRef} 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFiles(e.target.files)}
                />
                
                <input 
                  ref={cameraRef} 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => handleFiles(e.target.files)}
                />

                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-5 text-center transition-colors mb-4"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer border-0"
                    >
                      <Camera className="w-4 h-4" />
                      Usar Cámara (Celular)
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      Subir desde Galería / PC
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-3 mb-0">
                    O arrastra y suelta tus imágenes directamente aquí. Puedes pegar con Ctrl+V.
                  </p>
                </div>

                {/* Previsualización de imágenes */}
                {(editExistingPhotos.length > 0 || editPhotos.length > 0) && (
                  <div className="flex flex-wrap gap-2.5 mt-3 items-center">
                    {/* Fotos Existentes */}
                    {editExistingPhotos.map((url, i) => (
                      <div 
                        key={`existing-${i}`} 
                        className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer"
                        onClick={() => setLightboxUrl(url)}
                      >
                        <img src={url} alt={`Evidencia existente ${i + 1}`} className="w-full h-full object-cover"/>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditExistingPhotos(prev => prev.filter((_, j) => j !== i)); 
                          }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[8px] text-center font-bold py-0.5 pointer-events-none">
                          Guardada
                        </div>
                      </div>
                    ))}

                    {/* Fotos Nuevas */}
                    {editPhotos.map((p, i) => (
                      <div 
                        key={`new-${i}`} 
                        className="w-14 h-14 rounded-lg overflow-hidden border border-indigo-200 relative group cursor-pointer"
                        onClick={() => setLightboxUrl(p.url)}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover"/>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditPhotos(prev => prev.filter((_, j) => j !== i)); 
                          }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Botón rápido de cámara al final de las miniaturas */}
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-all cursor-pointer animate-in fade-in"
                      title="Tomar otra foto con la cámara"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDatos || !editCliente || !editEquipoDano || !editDescripcionFalla}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] text-sm"
                >
                  {savingDatos ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            type="button" 
            onClick={() => setLightboxUrl(null)} 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-30"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxUrl} 
              alt="Evidencia ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
            />
          </div>
        </div>
      )}

      {/* Modal Vista Previa Twilio WhatsApp Recepción */}
      {isPreviewRecepcionTwilioOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-xs md:text-sm flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" /> Vista Previa del Mensaje (WhatsApp)
              </h3>
              <button 
                onClick={() => setIsPreviewRecepcionTwilioOpen(false)} 
                className="text-slate-400 hover:text-slate-650 p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-100 flex-1 overflow-y-auto space-y-4 text-left">
              <p className="text-xs text-slate-500 font-medium m-0">
                Este mensaje se enviará automáticamente al número de WhatsApp registrado: <strong className="text-slate-700">{orden.cliente?.telefono || 'Sin número'}</strong>
              </p>
              
              {/* WhatsApp Chat Bubble */}
              <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-100 max-w-sm ml-0 mr-auto relative">
                {/* Mock media attachment */}
                <div className="bg-white rounded-lg p-2 mb-3 border border-emerald-200 flex items-center gap-2">
                  <div className="w-10 h-10 bg-slate-50 border rounded flex items-center justify-center text-slate-400 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M8 12h.01M8 16h.01M16 16h.01M12 16h.01"></path></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-700 text-[11px] block truncate">Etiqueta_Soporte_{orden.codigoSeguridad}.png</span>
                    <span className="text-[10px] text-slate-400">Imagen de trazabilidad</span>
                  </div>
                </div>

                <div className="text-slate-800 text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                  {`Hola ${orden.cliente?.nombre || 'Cliente'} 👋\n\nRecibimos tu equipo en el taller de *Bioelectrónica Honduras*.\n\n📋 *Orden:* ${orden.codigoSeguridad}\n🔧 *Equipo:* ${orden.equipoDano}\n🏷️ *N° Serie:* ${orden.serie || 'No especificado'}\n👨‍🔧 *Técnico asignado:* ${assignedTecnicos.map(t => [t.nombre, t.apellido].filter(Boolean).join(" ")).join(", ") || 'Por asignar'}\n\nGuarda la imagen de arriba — el *código QR* es tu comprobante para retirar el equipo cuando esté listo.\n\nTe avisaremos en cada etapa del proceso. ⚙️`}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-55 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewRecepcionTwilioOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSendingRecepcionTwilio || !orden.cliente?.telefono}
                onClick={async () => {
                  setIsSendingRecepcionTwilio(true);
                  try {
                    const res = await enviarNotificacionRecepcionTwilio(orden.id);
                    if (res.success) {
                      setRecepcionTwilioSent(true);
                      setIsPreviewRecepcionTwilioOpen(false);
                      toast.success("Notificación de recepción enviada con éxito.");
                    } else {
                      toast.error(res.error || "Error al enviar notificación de recepción.");
                    }
                  } catch (e) {
                    console.error(e);
                    toast.error("Error de conexión al enviar notificación de recepción.");
                  } finally {
                    setIsSendingRecepcionTwilio(false);
                  }
                }}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSendingRecepcionTwilio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <Layout className="h-6 w-6 stroke-[2.2]" />
                  )}
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
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
    </div>
  );
}
