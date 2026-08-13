'use client';

import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle2, RotateCcw, Building2, Upload, UserCheck, ShieldCheck, Sparkles, Loader2, FileCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ClienteFirmaViewProps {
  cliente: {
    id: string;
    nombre: string;
    rtn?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
    nombreContacto?: string | null;
    telefonoContacto?: string | null;
    firmaDigitalUrl?: string | null;
    firmaDigitalNombre?: string | null;
    firmaDigitalFecha?: string | null;
    organization?: {
      name?: string;
      logoUrl?: string | null;
    };
  };
}

export default function ClienteFirmaView({ cliente }: ClienteFirmaViewProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [repNombre, setRepNombre] = useState(
    cliente.firmaDigitalNombre || cliente.nombreContacto || ''
  );
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [canvasSize, setCanvasSize] = useState({ width: 340, height: 200 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.clientWidth - 8, 520);
        setCanvasSize({ width: Math.max(width, 280), height: 210 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setHasDrawn(false);
    setUploadedBase64(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione una imagen de firma válida (PNG, JPG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setUploadedBase64(base64);
      toast.success('Imagen de firma cargada');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!repNombre.trim()) {
      toast.error('Por favor ingrese el nombre del representante o contacto autorizado');
      return;
    }

    let finalDataUrl = '';
    if (mode === 'upload') {
      if (!uploadedBase64) {
        toast.error('Por favor suba la imagen de la firma');
        return;
      }
      finalDataUrl = uploadedBase64;
    } else {
      if (!hasDrawn || sigCanvas.current?.isEmpty()) {
        toast.error('Por favor dibuje su firma sobre la línea antes de guardar');
        return;
      }
      finalDataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png') || '';
    }

    if (!finalDataUrl) {
      toast.error('No se pudo procesar la imagen de firma');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmaDataUrl: finalDataUrl,
          firmaNombre: repNombre.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSuccess(true);
        toast.success('¡Firma digital registrada exitosamente!');
      } else {
        toast.error(data.error || 'Ocurrió un error al guardar la firma digital.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de conexión al servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Firma Digital Verificada
          </span>

          <h1 className="text-2xl font-black text-slate-900 mt-3 mb-2">¡Firma Registrada!</h1>
          
          <p className="text-slate-600 text-xs leading-relaxed mb-6">
            La firma digital de <strong className="text-slate-900 font-bold">{repNombre}</strong> para la empresa{' '}
            <strong className="text-blue-700 font-extrabold">{cliente.nombre}</strong> ha sido guardada correctamente y se vinculará de forma automática en los reportes técnicos unificados.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Cliente:</span>
              <span className="text-slate-800 font-bold">{cliente.nombre}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Representante:</span>
              <span className="text-slate-800 font-bold">{repNombre}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Estado:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" /> Activa en Reporte Unificado
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium">Puedes cerrar esta pestaña de forma segura.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 font-sans">
      
      {/* Cabecera Superior con Branding */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between py-2 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-sm tracking-tight">
              {cliente.organization?.name || 'Bioelectrónica Honduras'}
            </h2>
            <p className="text-slate-400 text-[10px] font-semibold">Portal Oficial de Firma Digital de Cliente</p>
          </div>
        </div>
        <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Seguro SSL 256-bit
        </span>
      </div>

      {/* Tarjeta Principal */}
      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          
          {/* Banner de Empresa */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Representante Empresa / Cliente
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{cliente.nombre}</h1>
            {cliente.rtn && (
              <p className="text-xs text-blue-200 mt-0.5 font-semibold">RTN: {cliente.rtn}</p>
            )}
          </div>

          <div className="p-6 space-y-5">

            {/* Input Nombre del Representante */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Nombre Completo del Representante
                </span>
                <span className="text-[10px] font-bold text-red-500">*Requerido</span>
              </label>
              <input
                type="text"
                value={repNombre}
                onChange={(e) => setRepNombre(e.target.value)}
                placeholder="Ej. Ing. Juan Pérez (Gerente / Biomédico)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Este nombre figurará junto a su firma en los Reportes Técnicos Unificados.
              </p>
            </div>

            {/* Selector de Modo (Dibujar / Subir Imagen) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-blue-600" />
                  Firma Digital Oficial
                </label>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setMode('draw')}
                    className={`px-3 py-1 rounded-lg transition ${
                      mode === 'draw' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Dibujar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('upload')}
                    className={`px-3 py-1 rounded-lg transition ${
                      mode === 'upload' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Subir Imagen
                  </button>
                </div>
              </div>

              {/* Area de Lienzo de Dibujo */}
              {mode === 'draw' ? (
                <div ref={containerRef} className="flex flex-col items-center">
                  <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden shadow-inner cursor-crosshair">
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        className: 'signature-canvas'
                      }}
                      penColor="#0f172a"
                      onBegin={() => setHasDrawn(true)}
                    />
                    
                    {/* Línea guía de firma */}
                    <div className="absolute bottom-8 left-6 right-6 border-b border-slate-300 pointer-events-none flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-slate-400">Firmar sobre esta línea</span>
                      <span className="text-[9px] font-bold text-slate-300">X</span>
                    </div>

                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-semibold">
                        Dibuje su firma aquí con el dedo o mouse
                      </div>
                    )}
                  </div>

                  {/* Acciones del Lienzo */}
                  <div className="flex items-center justify-between w-full mt-2 px-1">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Borrar y Repetir
                    </button>
                    <span className="text-[10px] text-slate-400 font-semibold">Trazo Digital HD</span>
                  </div>
                </div>
              ) : (
                /* Modo Subir Imagen */
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 text-center">
                  {uploadedBase64 ? (
                    <div className="space-y-3">
                      <div className="max-h-36 max-w-full mx-auto p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                        <img src={uploadedBase64} alt="Firma Subida" className="max-h-28 object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedBase64(null)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Cambiar Imagen
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-bounce" />
                      <span className="text-xs font-extrabold text-slate-800 block">Subir Imagen de Firma</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Formato PNG transparente, JPG o WEBP</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Aviso legal de aceptación */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[10px] text-slate-500 leading-relaxed font-medium">
              Al guardar, autorizo el registro de esta firma digital oficial en representación de{' '}
              <strong className="text-slate-800 font-bold">{cliente.nombre}</strong> para validar los informes técnicos, órdenes de servicio y mantenimientos realizados.
            </div>

            {/* Botón de Guardar */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs transition shadow-lg shadow-blue-700/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Firma Digital...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>Guardar Firma del Representante</span>
                </>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Footer general */}
      <div className="max-w-xl mx-auto w-full text-center py-4">
        <p className="text-[10px] text-slate-500 font-semibold">
          Bioelectrónica Honduras — Sistema de Trazabilidad Técnica
        </p>
      </div>

    </div>
  );
}
