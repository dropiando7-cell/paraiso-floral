'use client';

import React from 'react';
import StatusStepper from '../components/StatusStepper';
import TechnicalWorkbench from '../components/TechnicalWorkbench';
import ApprovalCard from '../components/ApprovalCard';
import QRGenerator from '../components/QRGenerator';
import { Wrench, ArrowRight, CheckCircle2, ArrowLeft, Pencil, X, UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';
import { updateEstadoOrden, finalizarReparacion, asignarTecnicos, updateDatosOrden } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { compressImage } from '@/utils/image';

type Orden = any;

export default function SoporteDetailClient({ 
  orden, 
  userRole, 
  customRoleName,
  userEmail = '',
  organizationUsers = []
}: { 
  orden: Orden; 
  userRole: string; 
  customRoleName?: string;
  userEmail?: string;
  organizationUsers?: any[];
}) {
  const role = userRole;
  const cRole = customRoleName?.toUpperCase() || '';

  // Determine visible blocks based on role (for demo they used isGlobal/isYensi, we use real roles)
  const isGlobal = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
  
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

  // Edit states for Work Order Datos
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editCliente, setEditCliente] = React.useState('');
  const [editTelefono, setEditTelefono] = React.useState('');
  const [editTipoAparato, setEditTipoAparato] = React.useState('MEDICO');
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
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

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
          if (photo.file.type.startsWith('image/')) {
            try {
              fileToUpload = await compressImage(photo.file);
            } catch (compErr) {
              console.error("Compression error:", compErr);
            }
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
      });
      if (res.success) {
        toast.success("Datos de la orden actualizados con éxito");
        setIsEditModalOpen(false);
        router.refresh();
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

  const handleAvanzar = async (nuevoEstado: string) => {
    setLoading(true);
    if (nuevoEstado === 'LISTO_ENTREGA') {
        await finalizarReparacion(orden.id);
    } else {
        await updateEstadoOrden(orden.id, nuevoEstado);
    }
    setLoading(false);
    router.refresh();
  };

  const getEstadoAnterior = (estado: string): string | null => {
    switch (estado) {
      case 'EN_EVALUACION':
        return 'RECIBIDO';
      case 'ESPERANDO_APROBACION':
        return 'EN_EVALUACION';
      case 'REPARACION':
        return 'ESPERANDO_APROBACION';
      case 'LISTO_ENTREGA':
        return 'REPARACION';
      case 'ENTREGADO':
        return 'LISTO_ENTREGA';
      default:
        return null;
    }
  };

  const handleRetroceder = async (estadoAnterior: string) => {
    if (confirm(`¿Estás seguro de que deseas regresar esta orden al estado anterior (${estadoAnterior})?`)) {
      setLoading(true);
      await updateEstadoOrden(orden.id, estadoAnterior);
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <div className="px-0 py-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50">
      <button 
        onClick={() => router.push('/soporte')}
        className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4 md:mb-6 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al Taller
      </button>

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <Wrench className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="m-0 text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Módulo Técnico · Orden #{orden.codigoSeguridad}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Bioelectrónica Honduras · Reparaciones y Mantenimiento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orden.estado !== 'RECIBIDO' && (isGlobal || isRecepcion || isTecnico) && (
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
          {(isGlobal || isRecepcion) && (
            <button
              type="button"
              onClick={() => handleOpenEditModal()}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar Datos
            </button>
          )}
        </div>
      </div>

      <StatusStepper 
        estadoActual={orden.estado} 
        ordenId={orden.codigoSeguridad} 
        equipoInfo={`${orden.equipoDano} — S/N: ${orden.serie || 'N/A'}`}
      />

      <div className="grid grid-cols-12 gap-4 md:gap-5">
        
        {/* Column 1: Primary Action & Tech Assignment (left) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          
          {/* A. Current state content card */}
          {isRecepcion && orden.estado === 'RECIBIDO' && (
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Recepción completada</h2>
              <p className="text-slate-600 text-sm mb-4">La orden ya fue recibida. Entrega la etiqueta al cliente y avísale al técnico.</p>
              <button 
                onClick={() => handleAvanzar('EN_EVALUACION')}
                disabled={loading}
                className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
              >
                Pasar a Diagnóstico Técnico <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {isTecnico && ['EN_EVALUACION', 'REPARACION'].includes(orden.estado) && (
            <div>
              <TechnicalWorkbench orderData={orden} />
              <div className="mt-4 flex justify-end gap-3">
                {orden.estado === 'REPARACION' && (
                  <button 
                    onClick={() => handleAvanzar('LISTO_ENTREGA')}
                    disabled={loading}
                    className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition"
                  >
                    Marcar como REPARADO / LISTO <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              onApprove={() => {
                handleAvanzar('REPARACION');
              }}
            />
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
            />
          )}
        </div>

      </div>

      {/* Modal para Editar Datos de la Orden */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-full sm:h-auto max-h-screen sm:max-h-[90vh] animate-in slide-in-from-bottom-56 sm:zoom-in-95 duration-300">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  Descripción de Falla (Recibido) *
                </label>
                <textarea
                  required
                  value={editDescripcionFalla}
                  onChange={(e) => setEditDescripcionFalla(e.target.value)}
                  placeholder="¿Qué reporta el cliente?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors h-32 resize-none bg-white shadow-sm"
                />
              </div>

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

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center justify-center gap-2.5 px-3 py-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-[0.98]"
                  >
                    <ImageIcon className="w-4 h-4 sm:w-5 h-5 text-slate-500" />
                    <span>Subir de Galería</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="flex items-center justify-center gap-2.5 px-3 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-[0.98]"
                  >
                    <Camera className="w-4 h-4 sm:w-5 h-5" />
                    <span>Tomar Foto</span>
                  </button>
                </div>

                {/* Previsualización de imágenes */}
                {(editExistingPhotos.length > 0 || editPhotos.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-3">
                    {/* Fotos Existentes */}
                    {editExistingPhotos.map((url, i) => (
                      <div 
                        key={`existing-${i}`} 
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer bg-slate-100 shadow-sm"
                        onClick={() => setLightboxUrl(url)}
                      >
                        <img src={url} alt={`Evidencia existente ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"/>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditExistingPhotos(prev => prev.filter((_, j) => j !== i)); 
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[9px] text-center font-bold py-1 pointer-events-none">
                          Guardada
                        </div>
                      </div>
                    ))}

                    {/* Fotos Nuevas */}
                    {editPhotos.map((p, i) => (
                      <div 
                        key={`new-${i}`} 
                        className="aspect-square rounded-xl overflow-hidden border border-indigo-200 relative group cursor-pointer bg-slate-100 shadow-sm"
                        onClick={() => setLightboxUrl(p.url)}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"/>
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditPhotos(prev => prev.filter((_, j) => j !== i)); 
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-indigo-600/80 text-white text-[9px] text-center font-bold py-1 pointer-events-none">
                          Nueva
                        </div>
                      </div>
                    ))}
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
    </div>
  );
}
