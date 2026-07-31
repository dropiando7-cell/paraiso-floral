'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Check, X, Wrench, Snowflake, Tags, Camera } from 'lucide-react';
import { compressImage } from '@/utils/image';
import RichDescriptionEditor from '@/components/facturas/RichDescriptionEditor';

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
};

type ReceptionFormProps = {
  onSave: (data: any) => Promise<void>;
  clientes?: any[];
  users?: any[];
  prefilledData?: PrefilledData;
};

export default function ReceptionForm({ onSave, clientes = [], users = [], prefilledData }: ReceptionFormProps) {
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
    cobertura: "externa",
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    ? clientes.filter(c => c.nombre.toLowerCase().includes(form.cliente.toLowerCase()))
    : clientes;

  const handleChange = (k: string, v: string) => {
    if (k === 'cliente') {
      // Check if matched to autofill phone
      const matched = clientes.find(c => c.nombre.toLowerCase() === v.toLowerCase());
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
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full flex flex-col border border-slate-200">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Wrench className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="m-0 text-[15px] font-bold text-slate-900 tracking-tight">Recepción de Equipo</h4>
          <p className="m-0 text-xs text-slate-500 font-medium">Crea una nueva orden de servicio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cliente / Empresa *</label>
          <input 
             className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 outline-none transition-colors bg-white ${
             (showErrors && !form.cliente) 
               ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
               : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-600'
           }`}
           value={form.cliente} 
           onChange={e => {
               handleChange("cliente", e.target.value);
               setShowDropdown(true);
           }}
           onFocus={() => setShowDropdown(true)}
           placeholder="Ej. Hospital Centro"
           autoComplete="off"
        />
        {showErrors && !form.cliente && (
          <p className="text-red-500 text-[10px] font-bold mt-1">Este campo es requerido.</p>
        )}
          {showDropdown && filteredClientes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1">
                  {filteredClientes.map((c: any) => (
                      <div 
                          key={c.id} 
                          className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 font-medium transition-colors border-b border-slate-100 last:border-0"
                          onMouseDown={(e) => {
                              e.preventDefault();
                              handleChange("cliente", c.nombre);
                              setShowDropdown(false);
                          }}
                      >
                          {c.nombre}
                      </div>
                  ))}
              </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Teléfono / WhatsApp</label>
          <input 
             className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white"
             value={form.telefono} onChange={e => handleChange("telefono", e.target.value)} placeholder="+504 9999-0000"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de Recepción *</label>
          <input 
             type="date"
             className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium"
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
              <button type="button" key={v} onClick={() => handleChange("cobertura", v)} className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                  form.cobertura === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Trabajo</label>
          <div className="flex gap-1.5">
            {[["NORMAL","Normal"],["GARANTIA","Garantía"],["RECLAMO","Reclamo"],["MANTENIMIENTO","Mantenimiento"]].map(([v,l]) => (
              <button type="button" key={v} onClick={() => handleChange("tipoTrabajo", v)} className={`flex-1 py-2.5 rounded-lg border-2 text-[10px] font-semibold transition-all ${
                  form.tipoTrabajo === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Equipo</label>
          <div className="flex gap-2">
            {[["MEDICO","🏥 Médico"],["AIRE","❄️ Aire Acond."],["OTRO","🔧 Otro"]].map(([v,l]) => (
              <button type="button" key={v} onClick={() => handleChange("equipo", v)} className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
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
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-colors bg-white font-medium"
          >
            <option value="">Por defecto (Según Cobertura)</option>
            <option value="RECIBIDO">RECIBIDO (En Taller)</option>
            <option value="REGISTRADO EXTERNO">REGISTRADO EXTERNO (En Sitio / Fuera de Taller)</option>
            <option value="MANTENIMIENTO POR CONTRATO">MANTENIMIENTO POR CONTRATO</option>
            <option value="SERVICIO EN CAMPO">SERVICIO EN CAMPO</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre del Equipo *</label>
        <input 
           className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 outline-none transition-colors bg-white font-medium ${
             (showErrors && !form.nombreEquipo) 
               ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
               : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-600'
           }`}
           value={form.nombreEquipo} 
           onChange={e => handleChange("nombreEquipo", e.target.value)} 
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
             className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors"
             value={(form as any)[k]} onChange={e => handleChange(k, e.target.value)} placeholder={ph}
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
    </div>
  );
}
