'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Check, X, Wrench, Snowflake, Tags } from 'lucide-react';

type ReceptionFormProps = {
  onSave: (data: any) => Promise<void>;
};

export default function ReceptionForm({ onSave }: ReceptionFormProps) {
  const [form, setForm] = useState({
    cliente: "", telefono: "", equipo: "medico", modelo: "", serie: "",
    marca: "", descripcionFalla: "", prioridad: "normal", tecnico: ""
  });
  const [photos, setPhotos] = useState<{name: string; file: File; url: string; size: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

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
    if (!form.cliente || !form.descripcionFalla) return alert("Faltan campos obligatorios");
    setIsSubmitting(true);
    try {
      // Upload photos to R2 first
      const uploadedUrls = [];
      for (const photo of photos) {
        // Fetch pre-signed URL from our endpoint
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: photo.name, contentType: photo.file.type })
        });
        if (!res.ok) throw new Error("Error obteniendo URL de subida");
        const { uploadUrl, publicUrl } = await res.json();
        
        // Upload file to R2
        await fetch(uploadUrl, {
            method: 'PUT',
            body: photo.file,
            headers: { 'Content-Type': photo.file.type }
        });
        uploadedUrls.push(publicUrl);
      }

      await onSave({ ...form, fotosEstadoInicial: uploadedUrls });
      
      setSaved(true);
      setTimeout(() => {
          setSaved(false);
          setForm({ cliente: "", telefono: "", equipo: "medico", modelo: "", serie: "", marca: "", descripcionFalla: "", prioridad: "normal", tecnico: "" });
          setPhotos([]);
      }, 3000);
    } catch (e) {
      console.error(e);
      alert("Hubo un error al guardar la orden de soporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Wrench className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="m-0 text-[15px] font-bold text-slate-900 tracking-tight">Recepción de Equipo</h4>
          <p className="m-0 text-xs text-slate-500 font-medium">Crea una nueva orden de servicio</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cliente / Empresa *</label>
          <input 
             className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white"
             value={form.cliente} onChange={e => handleChange("cliente", e.target.value)} placeholder="Ej. Hospital Centro"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Teléfono / WhatsApp</label>
          <input 
             className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 outline-none focus:ring-indigo-100 focus:border-indigo-600 transition-colors bg-white"
             value={form.telefono} onChange={e => handleChange("telefono", e.target.value)} placeholder="+504 9999-0000"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Equipo</label>
        <div className="flex gap-2">
          {[["MEDICO","🏥 Médico"],["AIRE","❄️ Aire Acond."],["OTRO","🔧 Otro"]].map(([v,l]) => (
            <button key={v} onClick={() => handleChange("equipo", v)} className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                form.equipo === v ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
            }`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
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
