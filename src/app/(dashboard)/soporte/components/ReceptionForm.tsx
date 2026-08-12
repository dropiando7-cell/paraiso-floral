'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Check, X, Wrench, Snowflake, Tags, Camera, Search, QrCode, Unlink, Edit, ExternalLink, ShieldCheck, ArrowLeft, UserPlus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage } from '@/utils/image';
import RichDescriptionEditor from '@/components/facturas/RichDescriptionEditor';
import { buscarEquiposInventarioGeneral, getActivoByIdForReception, getUltimaConfiguracionGarantia } from '../actions';
import { ContactoModal } from '@/app/(dashboard)/contactos/ContactosClient';
import { ActivoModal } from '@/app/(dashboard)/inventario/InventarioClient';

type PrefilledData = {
  clienteId?: string;
  clienteNombre?: string;
  equipoDano?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  tipo?: string;
  activoId?: string;
  tipoOrden?: string;
  requiereAprobacion?: boolean;
  cobertura?: string;
};

type ReceptionFormProps = {
  onSave: (data: any) => Promise<void>;
  onBack?: () => void;
  clientes?: any[];
  users?: any[];
  prefilledData?: PrefilledData;
};

export default function ReceptionForm({ onSave, onBack, clientes = [], users = [], prefilledData }: ReceptionFormProps) {
  const router = useRouter();
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const matchedClient = prefilledData?.clienteNombre 
    ? clientes.find(c => c.nombre.toLowerCase() === prefilledData.clienteNombre!.toLowerCase())
    : null;

  const [form, setForm] = useState({
    cliente: prefilledData?.clienteNombre || "", 
    telefono: matchedClient?.telefono || "+504 ", 
    equipo: prefilledData?.tipo === 'AIRE' ? 'AIRE' : (prefilledData?.tipo === 'MEDICO' ? 'MEDICO' : 'OTRO'), 
    nombreEquipo: prefilledData?.equipoDano || "", 
    modelo: prefilledData?.modelo || "", 
    serie: prefilledData?.serie || "",
    marca: prefilledData?.marca || "", 
    descripcionFalla: "", 
    prioridad: "normal",
    costoRevision: "0", 
    metodoPagoRevision: "Ninguno",
    tecnicoIds: [] as string[],
    tipoTrabajo: "NORMAL",
    cobertura: prefilledData?.cobertura || "interna",
    fechaRecibido: getLocalDateString(),
    aplicaMantenimientos: false,
    garantiaMeses: "",
    frecuenciaMantenimientoMeses: "3",
    cantidadMantenimientos: "",
    activoId: prefilledData?.activoId || "",
    tipoOrden: prefilledData?.tipoOrden || "TALLER",
    requiereAprobacion: prefilledData?.requiereAprobacion !== false,
    leyendaEstado: ""
  });
  const [photos, setPhotos] = useState<{name: string; file: File; url: string; size: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estado para la creación rápida de clientes en Directorio
  const [localClientesList, setLocalClientesList] = useState<any[]>(clientes);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);

  useEffect(() => {
    setLocalClientesList(clientes);
  }, [clientes]);

  // Estado para la búsqueda y vinculación de equipos en inventario
  const [searchEquipoQuery, setSearchEquipoQuery] = useState('');
  const [searchEquipoResults, setSearchEquipoResults] = useState<any[]>([]);
  const [isSearchingEquipos, setIsSearchingEquipos] = useState(false);
  const [showEquipoDropdown, setShowEquipoDropdown] = useState(false);
  const [selectedActivo, setSelectedActivo] = useState<any | null>(null);
  const equipoDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para la creación rápida de equipos en Inventario ERP
  const [showCreateEquipoModal, setShowCreateEquipoModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (equipoDropdownRef.current && !equipoDropdownRef.current.contains(event.target as Node)) {
        setShowEquipoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchEquiposChange = (q: string) => {
    setSearchEquipoQuery(q);
    if (!q || q.trim().length === 0) {
      setSearchEquipoResults([]);
      setShowEquipoDropdown(false);
      return;
    }
    setShowEquipoDropdown(true);
    setIsSearchingEquipos(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await buscarEquiposInventarioGeneral(q);
        setSearchEquipoResults(results);
      } catch (err) {
        console.error("Error buscando equipos:", err);
      } finally {
        setIsSearchingEquipos(false);
      }
    }, 250);
  };

  const handleSelectEquipo = (eq: any) => {
    setSelectedActivo(eq);
    setShowEquipoDropdown(false);
    setSearchEquipoQuery('');
    setForm(prev => ({
      ...prev,
      activoId: eq.id,
      nombreEquipo: eq.descripcionCorta || prev.nombreEquipo,
      marca: eq.marca || prev.marca,
      modelo: eq.modelo || prev.modelo,
      serie: eq.serie || prev.serie,
      cliente: eq.cliente?.nombre || prev.cliente,
      telefono: eq.cliente?.telefono || prev.telefono,
      cobertura: eq.cobertura || prev.cobertura,
      aplicaMantenimientos: eq.aplicaMantenimientos || prev.aplicaMantenimientos,
      frecuenciaMantenimientoMeses: eq.frecuenciaMantenimientoMeses ? eq.frecuenciaMantenimientoMeses.toString() : prev.frecuenciaMantenimientoMeses
    }));

    if (eq.id) {
      getUltimaConfiguracionGarantia(eq.id).then(config => {
        if (config) {
          setForm(prev => ({
            ...prev,
            aplicaMantenimientos: config.aplicaMantenimientos || false,
            garantiaMeses: config.garantiaMeses !== null && config.garantiaMeses !== undefined ? config.garantiaMeses.toString() : prev.garantiaMeses,
            frecuenciaMantenimientoMeses: config.frecuenciaMantenimientoMeses !== null && config.frecuenciaMantenimientoMeses !== undefined ? config.frecuenciaMantenimientoMeses.toString() : prev.frecuenciaMantenimientoMeses,
            cantidadMantenimientos: config.cantidadMantenimientos !== null && config.cantidadMantenimientos !== undefined ? config.cantidadMantenimientos.toString() : prev.cantidadMantenimientos
          }));
        }
      });
    }
  };

  const handleDesvincularActivo = () => {
    setSelectedActivo(null);
    setForm(prev => ({
      ...prev,
      activoId: ''
    }));
  };

  useEffect(() => {
    if (prefilledData?.activoId) {
      getActivoByIdForReception(prefilledData.activoId).then(activo => {
        if (activo) {
          setSelectedActivo(activo);
          setForm(prev => ({
            ...prev,
            activoId: activo.id,
            nombreEquipo: activo.descripcionCorta || prev.nombreEquipo,
            marca: activo.marca || prev.marca,
            modelo: activo.modelo || prev.modelo,
            serie: activo.serie || prev.serie,
            cliente: activo.cliente?.nombre || prev.cliente,
            telefono: activo.cliente?.telefono || prev.telefono,
            cobertura: activo.cobertura || prev.cobertura
          }));
        }
      });

      getUltimaConfiguracionGarantia(prefilledData.activoId).then(config => {
        if (config) {
          setForm(prev => ({
            ...prev,
            aplicaMantenimientos: config.aplicaMantenimientos || false,
            garantiaMeses: config.garantiaMeses !== null && config.garantiaMeses !== undefined ? config.garantiaMeses.toString() : "",
            frecuenciaMantenimientoMeses: config.frecuenciaMantenimientoMeses !== null && config.frecuenciaMantenimientoMeses !== undefined ? config.frecuenciaMantenimientoMeses.toString() : "3",
            cantidadMantenimientos: config.cantidadMantenimientos !== null && config.cantidadMantenimientos !== undefined ? config.cantidadMantenimientos.toString() : ""
          }));
        }
      });
    }
  }, [prefilledData?.activoId]);

  useEffect(() => {
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
        setPhotos(p => [...p, ...newPhotos]);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const filteredClientes = form.cliente 
    ? localClientesList.filter(c => c.nombre.toLowerCase().includes(form.cliente.toLowerCase()))
    : localClientesList;

  const handleChange = (k: string, v: string) => {
    if (k === 'cliente') {
      // Check if matched to autofill phone
      const matched = localClientesList.find(c => c.nombre.toLowerCase() === v.toLowerCase());
      if (matched && matched.telefono) {
        // autofill phone if current is empty or if it matches an existing one
        setForm(p => ({ ...p, cliente: v, telefono: matched.telefono }));
        return;
      }
    }
    if (k === 'cobertura') {
      setForm(p => ({ 
        ...p, 
        cobertura: v, 
        costoRevision: v === 'externa' ? '0' : '650'
      }));
      return;
    }
    setForm(p => ({ ...p, [k]: v }));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).map(f => ({
      name: f.name, file: f, url: URL.createObjectURL(f), size: (f.size / 1024).toFixed(0)
    }));
    setPhotos(p => [...p, ...newPhotos]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    const isFallaEmpty = !form.descripcionFalla || form.descripcionFalla.replace(/<[^>]*>/g, '').trim() === '';
    if (!form.cliente || !form.nombreEquipo || isFallaEmpty) {
      setShowErrors(true);
      setShowValidationModal(true);
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload photos to R2 first
      const uploadedUrls = [];
      for (const photo of photos) {
        try {
            let fileToUpload = photo.file;
            try {
                fileToUpload = await compressImage(photo.file);
            } catch (compErr) {
                console.error("Compression error:", compErr);
            }
            // Fetch pre-signed URL from our endpoint
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
            
            // Upload file to R2
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
            throw new Error(`Fallo al subir la imagen ${photo.name}. Revisa la configuración CORS en R2 o tu conexión. Detalles: ${uploadError.message}`);
        }
      }

      await onSave({ ...form, fotosEstadoInicial: uploadedUrls });
      
      setSaved(true);
      setTimeout(() => {
          setSaved(false);
          setShowErrors(false);
          setForm({ 
            cliente: "", 
            telefono: "+504 ", 
            equipo: "medico", 
            nombreEquipo: "",
            modelo: "", 
            serie: "", 
            marca: "", 
            descripcionFalla: "", 
            prioridad: "normal", 
            costoRevision: "0",
            metodoPagoRevision: "Ninguno",
            tecnicoIds: [],
            tipoTrabajo: "NORMAL",
            cobertura: "externa",
            fechaRecibido: getLocalDateString(),
            aplicaMantenimientos: false,
            garantiaMeses: "",
            frecuenciaMantenimientoMeses: "3",
            cantidadMantenimientos: "",
            activoId: "",
            tipoOrden: "TALLER",
            requiereAprobacion: true,
            leyendaEstado: ""
          });
          setPhotos([]);
      }, 3000);
    } catch (e: any) {
      console.error(e);
      alert("Hubo un error al guardar la orden de soporte: " + (e.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-3xl p-2.5 sm:p-5 md:p-6 shadow-xs h-full flex flex-col border border-slate-200/90">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="m-0 text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Recepción de Equipo</h4>
            <p className="m-0 text-[11px] sm:text-xs text-slate-500 font-medium">Crea una nueva orden de servicio</p>
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volver al Taller</span>
            <span className="sm:hidden">Volver</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cliente / Empresa *</label>
          <input 
             className={`w-full px-3.5 py-3 rounded-xl border text-sm min-h-[48px] focus:ring-2 outline-none transition-colors ${
               prefilledData?.clienteNombre
                 ? 'border-slate-200 bg-slate-50 cursor-not-allowed text-slate-500 font-semibold'
                 : (showErrors && !form.cliente) 
                   ? 'border-red-500 bg-white focus:border-red-500 focus:ring-red-100 font-medium' 
                   : 'border-slate-200 bg-white focus:ring-indigo-100 focus:border-indigo-600 font-medium'
             }`}
             value={form.cliente} 
             onChange={e => {
                 if (prefilledData?.clienteNombre) return;
                 handleChange("cliente", e.target.value);
                 setShowDropdown(true);
             }}
             onFocus={() => {
                 if (!prefilledData?.clienteNombre) {
                     setShowDropdown(true);
                 }
             }}
             placeholder="Ej. Hospital Centro"
             autoComplete="off"
             readOnly={!!prefilledData?.clienteNombre}
        />
        {showErrors && !form.cliente && (
          <p className="text-red-500 text-[10px] font-bold mt-1">Este campo es requerido.</p>
        )}
          {showDropdown && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto py-1">
                  {/* Botón destacado superior para registrar nuevo cliente */}
                  <div
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 cursor-pointer text-xs font-bold text-indigo-700 flex items-center justify-between border-b border-indigo-100 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowDropdown(false);
                      setShowCreateClientModal(true);
                    }}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <UserPlus className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Registrar Nuevo Cliente</span>
                    </span>
                    <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-md shrink-0">
                      + NUEVO
                    </span>
                  </div>

                  {filteredClientes.map((c: any) => (
                      <div 
                          key={c.id} 
                          className="px-4 py-2.5 hover:bg-indigo-50/60 cursor-pointer text-sm text-slate-700 font-medium transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between"
                          onMouseDown={(e) => {
                              e.preventDefault();
                              handleChange("cliente", c.nombre);
                              if (c.telefono) {
                                setForm(p => ({ ...p, cliente: c.nombre, telefono: c.telefono }));
                              }
                              setShowDropdown(false);
                          }}
                      >
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm">{c.nombre}</span>
                          {c.telefono && (
                            <span className="text-[11px] text-slate-400 font-medium">{c.telefono}</span>
                          )}
                      </div>
                  ))}

                  {filteredClientes.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400 font-medium">
                        Sin coincidencias en el directorio. Usa el botón de arriba para registrarlo.
                      </div>
                  )}
              </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Teléfono / WhatsApp</label>
          <input 
             className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm min-h-[48px] focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium"
             value={form.telefono} onChange={e => handleChange("telefono", e.target.value)} placeholder="+504 9999-0000"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de Recepción *</label>
          <input 
             type="date"
             className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm min-h-[48px] focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium"
             value={form.fechaRecibido} 
             onChange={e => handleChange("fechaRecibido", e.target.value)}
             required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cobertura de Orden</label>
          <div className="flex gap-2">
            {[["externa","🌍 Externa"],["interna","🏢 Interna"]].map(([v,l]) => (
              <button type="button" key={v} onClick={() => handleChange("cobertura", v)} className={`flex-1 py-3 px-2 rounded-xl border-2 text-xs font-bold min-h-[46px] flex items-center justify-center transition-all ${
                  form.cobertura === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Trabajo</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[["NORMAL","Normal"],["GARANTIA","Garantía"],["RECLAMO","Reclamo"],["MANTENIMIENTO","Mantenimiento"]].map(([v,l]) => (
              <button type="button" key={v} onClick={() => handleChange("tipoTrabajo", v)} className={`py-3 px-1.5 rounded-xl border-2 text-xs font-bold min-h-[46px] flex items-center justify-center transition-all ${
                  form.tipoTrabajo === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Equipo</label>
          <div className="grid grid-cols-3 gap-2">
            {[["MEDICO","🏥 Médico"],["AIRE","❄️ Aire Acond."],["OTRO","🔧 Otro"]].map(([v,l]) => (
              <button type="button" key={v} onClick={() => handleChange("equipo", v)} className={`py-3 px-1.5 rounded-xl border-2 text-xs font-bold min-h-[46px] flex items-center justify-center transition-all ${
                  form.equipo === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Leyenda de Estado en Reporte</label>
          <select
            value={form.leyendaEstado || ""}
            onChange={e => handleChange("leyendaEstado", e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm min-h-[48px] font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-colors bg-white text-slate-800"
          >
            <option value="">Por defecto (Según Cobertura)</option>
            <option value="RECIBIDO">RECIBIDO (En Taller)</option>
            <option value="REGISTRADO EXTERNO">REGISTRADO EXTERNO (En Sitio / Fuera de Taller)</option>
            <option value="MANTENIMIENTO POR CONTRATO">MANTENIMIENTO POR CONTRATO</option>
            <option value="SERVICIO EN CAMPO">SERVICIO EN CAMPO</option>
          </select>
        </div>
      </div>

      {/* SECCIÓN DE VINCULACIÓN CON INVENTARIO GENERAL (ActivoFijo) */}
      <div className="mb-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 rounded-xl border border-indigo-100/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tags className="w-4 h-4 text-indigo-600" />
            <h5 className="m-0 text-xs font-bold text-slate-800 uppercase tracking-wider">
              Información del Equipo y Ficha Técnica ERP
            </h5>
          </div>
          {selectedActivo ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
              <Check className="w-3 h-3" /> Equipo Vinculado a ERP
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              ⚡ Ficha Técnica & QR Automáticos
            </span>
          )}
        </div>

        {selectedActivo ? (
          <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-xs transition-all animate-in fade-in duration-200">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="m-0 text-sm font-extrabold text-slate-900 tracking-tight">
                    Detalle del Activo (Comprobación de Seguridad)
                  </h4>
                  <p className="m-0 text-[11px] text-slate-500 font-medium">
                    Ficha técnica oficial cargada desde el Inventario General
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/inventario?edit=${selectedActivo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs no-underline"
                  title="Editar los datos maestros de este equipo en el Inventario"
                >
                  <Edit className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Editar en Inventario</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <button
                  type="button"
                  onClick={handleDesvincularActivo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Desvincular este equipo de la recepción"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Desvincular</span>
                </button>
              </div>
            </div>

            {/* Layout Principal: Imagen + Info Header */}
            <div className="flex flex-col md:flex-row gap-5 items-start mb-4">
              {/* Imagen del Equipo en Inventario */}
              <div className="w-full md:w-36 h-36 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center relative shadow-2xs">
                {selectedActivo.imagenUrl || selectedActivo.imagenWeb ? (
                  <img
                    src={selectedActivo.imagenUrl || selectedActivo.imagenWeb}
                    alt={selectedActivo.descripcionCorta}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                    <Wrench className="w-8 h-8 mb-1 opacity-40" />
                    <span className="text-[10px] font-semibold">Sin Imagen en Inventario</span>
                  </div>
                )}
              </div>

              {/* Bloque de Información Principal */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs px-2.5 py-1 rounded-lg tracking-wide">
                    {selectedActivo.idQr}
                  </span>
                  <span className="bg-slate-100 text-slate-700 font-bold text-[11px] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    {selectedActivo.cuentaAct || selectedActivo.area || 'INVENTARIO'}
                  </span>
                  <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    {selectedActivo.estatusContable || 'VIGENTE'} OK
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight m-0 mb-2">
                  {selectedActivo.descripcionCorta}
                </h3>

                {/* Caja de Descripción Detallada (como en Imagen 2) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    DESCRIPCIÓN DETALLADA
                  </span>
                  <p className="text-xs text-slate-700 font-medium m-0">
                    {selectedActivo.descripcionDetallada || `Registro de ${selectedActivo.descripcionCorta.toLowerCase()}`}
                  </p>
                </div>

                {/* Grid de Datos Técnicos (Idéntico a Imagen 2) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Área</span>
                    <span className="font-bold text-slate-800">{selectedActivo.area || 'Taller / Soporte'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Registrado por</span>
                    <span className="font-bold text-slate-800">
                      {[selectedActivo.createdBy?.nombre, selectedActivo.createdBy?.apellido].filter(Boolean).join(" ") || 'Carlos Izaguirre'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Modelo</span>
                    <span className="font-bold text-slate-800">{selectedActivo.modelo || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">No. Serie</span>
                    <span className="font-bold text-slate-800">{selectedActivo.serie || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Origen</span>
                    <span className="inline-block bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                      {selectedActivo.origenActivo || 'Americano'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Condición</span>
                    <span className="inline-block bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[11px] border border-blue-200">
                      {selectedActivo.condicionActivo || 'Usado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso de Inmutabilidad */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium italic border-t border-slate-100 pt-3">
              <span>🔒</span>
              <span>
                Esta información proviene del Inventario y está bloqueada para evitar inconsistencias. Si necesitas hacer cambios maestros, usa el botón <strong>"Editar en Inventario"</strong>.
              </span>
            </div>
          </div>
        ) : (
          <div className="relative" ref={equipoDropdownRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              🔍 Buscar equipo existente en ERP (Por QR, N° Serie, Modelo, Marca o Cliente)
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-indigo-200 text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-colors bg-white text-slate-800 font-medium placeholder:text-slate-400"
                placeholder="Escribe para buscar equipo previamente registrado..."
                value={searchEquipoQuery}
                onChange={e => handleSearchEquiposChange(e.target.value)}
                onFocus={() => { if (searchEquipoResults.length > 0) setShowEquipoDropdown(true); }}
              />
              <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-3" />
            </div>

            {showEquipoDropdown && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto py-1">
                {/* Botón destacado superior para registrar nuevo equipo */}
                <div
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 cursor-pointer text-xs font-bold text-indigo-700 flex items-center justify-between border-b border-indigo-100 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowEquipoDropdown(false);
                    setShowCreateEquipoModal(true);
                  }}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Registrar Nuevo Equipo</span>
                  </span>
                  <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-md shrink-0">
                    + NUEVO
                  </span>
                </div>

                {isSearchingEquipos ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">Buscando equipos en el ERP...</div>
                ) : searchEquipoResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No se encontraron equipos coincidentes. Usa la opción de arriba para registrarlo.
                  </div>
                ) : (
                  searchEquipoResults.map((eq: any) => (
                    <div
                      key={eq.id}
                      className="px-4 py-2.5 hover:bg-indigo-50/70 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectEquipo(eq);
                      }}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-800">{eq.descripcionCorta}</span>
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                          {eq.idQr}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>
                          {eq.marca ? `Marca: ${eq.marca}` : ''} {eq.modelo ? `| Mod: ${eq.modelo}` : ''} {eq.serie ? `| S/N: ${eq.serie}` : ''}
                        </span>
                        {eq.cliente?.nombre && (
                          <span className="text-slate-600 font-medium text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                            👤 {eq.cliente.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            <p className="text-[11px] text-slate-500 mt-2 mb-0 font-medium flex items-center gap-1.5">
              <span>💡</span> Si el equipo ingresa al taller por primera vez, completa los campos de abajo. El ERP le asignará su Ficha Técnica y QR automáticamente.
            </p>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre del Equipo *</label>
        <input 
           className={`w-full px-3.5 py-3 rounded-xl border text-sm min-h-[48px] focus:ring-2 outline-none transition-colors font-medium ${
             selectedActivo 
               ? 'border-slate-200 bg-slate-50 cursor-not-allowed text-slate-600 font-semibold'
               : (showErrors && !form.nombreEquipo) 
                 ? 'border-red-500 bg-white focus:border-red-500 focus:ring-red-100' 
                 : 'border-slate-200 bg-white focus:ring-indigo-100 focus:border-indigo-600'
           }`}
           value={form.nombreEquipo} 
           onChange={e => {
             if (selectedActivo) return;
             handleChange("nombreEquipo", e.target.value);
           }}
           readOnly={!!selectedActivo}
           placeholder="Ej. Concentrador de Oxígeno"
           required
        />
        {showErrors && !form.nombreEquipo && (
          <p className="text-red-500 text-[10px] font-bold mt-1">Este campo es requerido.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {[["modelo","Modelo","Dash 4000"],["serie","N° Serie","SN-123"],["marca","Marca","GE"]].map(([k,l,ph]) => (
          <div key={k}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{l}</label>
            <input 
             className={`w-full px-3.5 py-3 rounded-xl border text-sm min-h-[48px] focus:ring-2 outline-none transition-colors ${
               selectedActivo
                 ? 'border-slate-200 bg-slate-50 cursor-not-allowed text-slate-600 font-semibold'
                 : 'border-slate-200 bg-white focus:ring-indigo-100 focus:border-indigo-600 font-medium'
             }`}
             value={(form as any)[k]} 
             onChange={e => {
               if (selectedActivo) return;
               handleChange(k, e.target.value);
             }}
             readOnly={!!selectedActivo}
             placeholder={ph}
            />
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descripción de Falla o Trabajo Realizado *</label>
        <div className={
          (showErrors && (!form.descripcionFalla || form.descripcionFalla.replace(/<[^>]*>/g, '').trim() === '')) 
            ? 'border-red-500 ring-2 ring-red-100 rounded-lg overflow-hidden' 
            : ''
        }>
          <RichDescriptionEditor 
            content={form.descripcionFalla} 
            onChange={(html) => handleChange("descripcionFalla", html)} 
            placeholder="¿Qué reporta el cliente?"
          />
        </div>
        {showErrors && (!form.descripcionFalla || form.descripcionFalla.replace(/<[^>]*>/g, '').trim() === '') && (
          <p className="text-red-500 text-[10px] font-bold mt-1">Este campo es requerido.</p>
        )}
      </div>

      {form.cobertura === 'interna' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 border-t border-slate-100 pt-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              Costo de Revisión / Diagnóstico (L.)
            </label>
            <input 
              type="number"
              step="0.01"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors font-bold text-slate-800"
              value={form.costoRevision} 
              onChange={e => handleChange("costoRevision", e.target.value)} 
              placeholder="Ej. 650"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Método de Pago (Revisión)</label>
            <select 
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-semibold"
              value={form.metodoPagoRevision}
              onChange={e => handleChange("metodoPagoRevision", e.target.value)}
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

      {/* Programación de Garantías y Mantenimientos */}
      <div className="mb-4 border-t border-slate-100 pt-4 mt-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="aplicaMantenimientos"
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-550 cursor-pointer"
            checked={form.aplicaMantenimientos}
            onChange={e => setForm(p => ({ ...p, aplicaMantenimientos: e.target.checked }))}
          />
          <label htmlFor="aplicaMantenimientos" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
            Aplica Garantía o Programación de Mantenimiento Preventivo Periódico
          </label>
        </div>

        {form.aplicaMantenimientos && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Garantía (Meses)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 outline-none focus:ring-indigo-100"
                value={form.garantiaMeses}
                onChange={e => handleChange("garantiaMeses", e.target.value)}
                placeholder="Ej. 12"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cada cuántos meses (Frecuencia) *</label>
              <input
                type="number"
                required
                min="1"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 outline-none focus:ring-indigo-100"
                value={form.frecuenciaMantenimientoMeses}
                onChange={e => handleChange("frecuenciaMantenimientoMeses", e.target.value)}
                placeholder="Ej. 3"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cantidad de Mantenimientos</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 outline-none focus:ring-indigo-100"
                value={form.cantidadMantenimientos}
                onChange={e => handleChange("cantidadMantenimientos", e.target.value)}
                placeholder="Vacío = Permanente / Ilimitado"
              />
            </div>
          </div>
        )}
      </div>

      {/* Asignación de Técnicos */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Asignar Técnicos</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.tecnicoIds.map(id => {
            const user = users.find(u => u.id === id);
            if (!user) return null;
            const displayName = [user.nombre, user.apellido].filter(Boolean).join(" ") || user.email;
            return (
              <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-sm">
                <span>{displayName.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      tecnicoIds: prev.tecnicoIds.filter(tid => tid !== id)
                    }));
                  }}
                  className="w-4 h-4 bg-indigo-200 hover:bg-indigo-300 text-indigo-800 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
          {form.tecnicoIds.length === 0 && (
            <span className="text-xs text-slate-400 italic">Ningún técnico asignado (se puede asignar más tarde)</span>
          )}
        </div>
        <select
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium"
          value=""
          onChange={e => {
            const val = e.target.value;
            if (val && !form.tecnicoIds.includes(val)) {
              setForm(prev => ({
                ...prev,
                tecnicoIds: [...prev.tecnicoIds, val]
              }));
            }
          }}
        >
          <option value="">-- Seleccionar Técnico para agregar --</option>
          {users.map(u => {
            const displayName = [u.nombre, u.apellido].filter(Boolean).join(" ") || u.email;
            const puestoText = u.puesto ? u.puesto.toUpperCase() : u.role;
            return (
              <option key={u.id} value={u.id} disabled={form.tecnicoIds.includes(u.id)}>
                {displayName.toUpperCase()} ({puestoText})
              </option>
            );
          })}
        </select>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fotos Estado Físico (R2)</label>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-5 text-center transition-colors"
        >
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)}/>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)}/>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Usar Cámara (Celular)
            </button>
            
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-slate-400" />
              Subir desde Galería / PC
            </button>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-3 mb-0">
            O arrastra y suelta tus imágenes directamente aquí.
          </p>
        </div>
        
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            {photos.map((p, i) => (
              <div 
                key={i} 
                className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer"
                onClick={() => setLightboxUrl(p.url)}
              >
                <img src={p.url} alt={p.name} className="w-full h-full object-cover"/>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPhotos(pp => pp.filter((_,j) => j !== i)); }}
                  className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            
            {/* Botón rápido de cámara al final de las miniaturas */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
              title="Tomar otra foto con la cámara"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <button onClick={handleSubmit} disabled={isSubmitting || saved}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            saved ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 disabled:opacity-50"
          }`}>
          {isSubmitting ? "Guardando archivos y enviando..." : saved ? <><Check className="w-4 h-4"/> Orden de Servicio Creada</> : "Crear Orden de Servicio"}
        </button>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/85 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button 
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors cursor-pointer border-0"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={lightboxUrl} 
              alt="Evidencia Ampliada" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      {/* Modal: Error de Validación */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="w-16 h-16 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-4 border border-red-100">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Campos Incompletos
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed font-medium">
              Por favor, completa todos los campos obligatorios marcados en rojo antes de crear la orden.
            </p>
            <button
              onClick={() => setShowValidationModal(false)}
              className="w-full py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer border-0"
            >
              Revisar Formulario
            </button>
          </div>
        </div>
      )}

      {/* MODAL OFICIAL DE CLIENTES (ContactoModal) */}
      <ContactoModal
        open={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        initialContacto={{ nombre: form.cliente }}
        onSuccess={(newContacto) => {
          if (newContacto?.nombre) {
            setLocalClientesList(prev => [newContacto, ...prev]);
            setForm(prev => ({
              ...prev,
              cliente: newContacto.nombre,
              telefono: newContacto.telefono || prev.telefono
            }));
            toast.success(`Cliente "${newContacto.nombre}" registrado y seleccionado.`);
          }
        }}
      />

      {/* MODAL OFICIAL DE INVENTARIO (ActivoModal) */}
      <ActivoModal
        open={showCreateEquipoModal}
        onClose={() => setShowCreateEquipoModal(false)}
        onSuccess={async () => {
          toast.success('Equipo registrado en inventario.');
          if (searchEquipoQuery) {
            handleSearchEquiposChange(searchEquipoQuery);
          }
        }}
      />
    </div>
  );
}
