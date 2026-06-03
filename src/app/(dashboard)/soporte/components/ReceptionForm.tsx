'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Check, X, Wrench, Snowflake, Tags } from 'lucide-react';

type ReceptionFormProps = {
  onSave: (data: any) => Promise<void>;
  clientes?: any[];
  users?: any[];
};

export default function ReceptionForm({ onSave, clientes = [], users = [] }: ReceptionFormProps) {
  const [form, setForm] = useState({
    cliente: "", telefono: "+504 ", equipo: "medico", nombreEquipo: "", modelo: "", serie: "",
    marca: "", descripcionFalla: "", prioridad: "normal",
    costoRevision: "650", metodoPagoRevision: "Ninguno",
    tecnicoIds: [] as string[]
  });
  const [photos, setPhotos] = useState<{name: string; file: File; url: string; size: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
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
    if (!form.cliente || !form.nombreEquipo || !form.descripcionFalla) return alert("Faltan campos obligatorios");
    setIsSubmitting(true);
    try {
      // Upload photos to R2 first
      const uploadedUrls = [];
      for (const photo of photos) {
        try {
            // Fetch pre-signed URL from our endpoint
            const contentType = photo.file.type || 'application/octet-stream';
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: photo.name, contentType })
            });
            if (!res.ok) {
                const errData = await res.json().catch(()=>({}));
                throw new Error(`Error del servidor al obtener URL: ${res.status} ${errData.error || ''}`);
            }
            const { uploadUrl, publicUrl } = await res.json();
            
            // Upload file to R2
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: photo.file,
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
            costoRevision: "650",
            metodoPagoRevision: "Ninguno",
            tecnicoIds: []
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cliente / Empresa *</label>
          <input 
             className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white"
             value={form.cliente} 
             onChange={e => {
                 handleChange("cliente", e.target.value);
                 setShowDropdown(true);
             }}
             onFocus={() => setShowDropdown(true)}
             placeholder="Ej. Hospital Centro"
             autoComplete="off"
          />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Equipo</label>
          <div className="flex gap-2">
            {[["MEDICO","🏥 Médico"],["AIRE","❄️ Aire Acond."],["OTRO","🔧 Otro"]].map(([v,l]) => (
              <button type="button" key={v} onClick={() => handleChange("equipo", v)} className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                  form.equipo === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
              }`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre del Equipo *</label>
          <input 
             className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white font-medium"
             value={form.nombreEquipo} 
             onChange={e => handleChange("nombreEquipo", e.target.value)} 
             placeholder="Ej. Concentrador de Oxígeno"
             required
          />
        </div>
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
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descripción de Falla (Recibido) *</label>
        <textarea 
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors h-16 resize-none"
          value={form.descripcionFalla} onChange={e => handleChange("descripcionFalla", e.target.value)}
          placeholder="¿Qué reporta el cliente?"
        />
      </div>

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

      {/* Asignación de Técnicos */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Asignar Técnicos</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.tecnicoIds.map(id => {
            const user = users.find(u => u.id === id);
            if (!user) return null;
            const displayName = [user.nombre, user.apellido].filter(Boolean).join(" ");
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
            const displayName = [u.nombre, u.apellido].filter(Boolean).join(" ");
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
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 bg-slate-50 rounded-xl p-4 text-center cursor-pointer transition-colors"
        >
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)}/>
          <UploadCloud className="w-6 h-6 mx-auto mb-2 text-slate-400" />
          <p className="text-xs text-slate-500 font-medium m-0">
            Click o arrastra fotos. <span className="text-indigo-600 font-bold">Evidencia física.</span>
          </p>
        </div>
        
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {photos.map((p, i) => (
              <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 relative group">
                <img src={p.url} alt={p.name} className="w-full h-full object-cover"/>
                <button onClick={(e) => { e.stopPropagation(); setPhotos(pp => pp.filter((_,j) => j !== i)); }}
                    className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                </button>
              </div>
            ))}
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
    </div>
  );
}
