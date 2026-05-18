'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, Camera, Upload, Trash2, Text, ShieldAlert, BadgeDollarSign, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { processRecepcion } from '../actions';

export default function RecepcionClient({ renta }: { renta: any }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [recepcionFotos, setRecepcionFotos] = useState<string[]>([]);
    const [uploadingFotos, setUploadingFotos] = useState(false);
    const fotoCameraRef = useRef<HTMLInputElement>(null);
    const fotoUploadRef = useRef<HTMLInputElement>(null);

    const [tieneDeposito, setTieneDeposito] = useState(Number(renta.deposito) > 0);
    const [depositoDevuelto, setDepositoDevuelto] = useState(Number(renta.deposito));

    const handleFotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingFotos(true);
        const newUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Client-side compression
                const url = URL.createObjectURL(file);
                const img = new window.Image();
                img.src = url;
                await new Promise((resolve) => { img.onload = resolve; });
                URL.revokeObjectURL(url);

                const canvas = document.createElement('canvas');
                const MAX_SIZE = 1200;
                let { width, height } = img;
                if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.80));

                const formData = new FormData();
                formData.append('file', blob, 'recepcion.jpg');
                
                const res = await fetch('/api/upload/inventario', { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) newUrls.push(data.url);
                }
            } catch (err) {
                console.error("Error procesando foto:", err);
            }
        }
        setRecepcionFotos(prev => [...prev, ...newUrls]);
        setUploadingFotos(false);
        if (fotoCameraRef.current) fotoCameraRef.current.value = '';
        if (fotoUploadRef.current) fotoUploadRef.current.value = '';
    };

    const removeFoto = (index: number) => {
        setRecepcionFotos(prev => prev.filter((_, i) => i !== index));
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.append('rentaId', renta.id);
        fd.append('recepcionFotos', JSON.stringify(recepcionFotos));
        if (!tieneDeposito) {
            fd.append('depositoDevuelto', '0');
        } else {
            fd.append('depositoDevuelto', depositoDevuelto.toString());
        }

        startTransition(async () => {
            try {
                await processRecepcion(fd);
                router.push('/rentas');
                router.refresh();
            } catch (err) {
                alert('Error al procesar la recepción');
            }
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 p-0 sm:p-4 md:p-6 pb-24">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-6 pt-6 px-4 sm:pt-0 sm:px-0">
                    <Link href="/rentas" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Recibir Equipo Rentado</h1>
                        <p className="text-xs sm:text-sm text-slate-500">Registra las condiciones de devolución de {renta.cliente?.nombre}</p>
                    </div>
                </div>

                <div className="bg-white sm:rounded-2xl shadow-sm sm:border border-slate-200 overflow-hidden">
                    <div className="bg-blue-50/50 p-6 border-b border-blue-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div>
                            <div className="text-sm font-bold text-[#0500A3]">{renta.activoFijo?.descripcionCorta}</div>
                            <div className="text-xs text-slate-500 mt-1">S/N: {renta.activoFijo?.serie || 'N/A'}</div>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 text-sm">
                            <span className="text-slate-400 font-semibold mr-2">Entregado con:</span>
                            <span className="font-bold text-slate-700">{renta.accesoriosIncluidos || 'Sin accesorios'}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-4 py-6 sm:p-6 md:p-8 space-y-8">
                        {/* Evidencia Fotográfica */}
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">1. Evidencia de Recepción</h2>
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-full">{recepcionFotos.length} Fotos</span>
                            </div>
                            
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                                <input ref={fotoCameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFotosUpload} />
                                <input ref={fotoUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotosUpload} />
                                
                                {recepcionFotos.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                        {recepcionFotos.map((foto, i) => (
                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                                                <img src={foto} alt={`Evidencia ${i+1}`} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeFoto(i)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 font-medium">No se han agregado fotos de cómo viene el equipo.</p>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button type="button" onClick={() => fotoCameraRef.current?.click()} disabled={uploadingFotos} className="flex items-center justify-center gap-2 py-3 border-2 border-blue-100 bg-white text-[#0500A3] hover:bg-blue-50 font-bold rounded-xl transition-colors disabled:opacity-50">
                                        {uploadingFotos ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />} Tomar Foto
                                    </button>
                                    <button type="button" onClick={() => fotoUploadRef.current?.click()} disabled={uploadingFotos} className="flex items-center justify-center gap-2 py-3 border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-colors disabled:opacity-50">
                                        <Upload className="w-5 h-5" /> Subir Galería
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Estado y Destino */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">2. Destino del Equipo</h2>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <label className="cursor-pointer">
                                    <input type="radio" name="nuevoEstadoEquipo" value="VIGENTE" defaultChecked className="peer sr-only" />
                                    <div className="p-4 rounded-xl border-2 border-slate-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 transition-all">
                                        <div className="flex items-center gap-3 mb-1">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            <span className="font-bold text-emerald-900">Listo para Renta</span>
                                        </div>
                                        <p className="text-xs text-slate-500 pl-8">El equipo viene limpio y 100% funcional. Volverá a estar disponible inmediatamente.</p>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input type="radio" name="nuevoEstadoEquipo" value="MANTENIMIENTO" className="peer sr-only" />
                                    <div className="p-4 rounded-xl border-2 border-slate-200 peer-checked:border-amber-500 peer-checked:bg-amber-50 transition-all">
                                        <div className="flex items-center gap-3 mb-1">
                                            <HeartPulse className="w-5 h-5 text-amber-600" />
                                            <span className="font-bold text-amber-900">Requiere Mantenimiento</span>
                                        </div>
                                        <p className="text-xs text-slate-500 pl-8">Necesita limpieza, filtros o reparación antes de rentarse de nuevo.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Financiero */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">3. Financiero (Depósito)</h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={tieneDeposito}
                                        onChange={(e) => setTieneDeposito(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded" 
                                    />
                                    <span className="text-sm font-bold text-slate-700">Dejó Depósito</span>
                                </label>
                            </div>

                            {tieneDeposito ? (
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-500 mb-1">Depósito Original Registrado</div>
                                            <div className="text-xl font-black text-slate-800">L. {Number(renta.deposito).toLocaleString('en-US')}</div>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-slate-700 mb-2">Monto a Devolver al Cliente <span className="text-red-500">*</span></label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={depositoDevuelto}
                                                onChange={(e) => setDepositoDevuelto(parseFloat(e.target.value) || 0)}
                                                max={Number(renta.deposito)}
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white outline-none font-bold text-emerald-700 focus:border-[#0500A3]" 
                                            />
                                        </div>
                                    </div>
                                    {depositoDevuelto < Number(renta.deposito) && (
                                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-800 text-sm">
                                            <ShieldAlert className="w-5 h-5 shrink-0" />
                                            <div>
                                                <strong>Retención de Depósito:</strong> Estás reteniendo L. {(Number(renta.deposito) - depositoDevuelto).toLocaleString('en-US')}. Asegúrate de anotar la razón en las observaciones abajo.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 text-sm flex items-center gap-3">
                                    <BadgeDollarSign className="w-5 h-5" />
                                    <span>Se ha marcado que este cliente <strong>no dejó depósito en garantía</strong>.</span>
                                </div>
                            )}
                        </div>

                        {/* Observaciones */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Text className="w-4 h-4 text-slate-400" /> Notas u Observaciones de Recepción</label>
                            <textarea 
                                name="recepcionNotas" 
                                rows={3} 
                                placeholder="Anotar si faltó un accesorio, si venía sucio, o la razón por la que se retiene parte del depósito..." 
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-medium"
                            ></textarea>
                        </div>

                        <div className="pt-6 mt-6 border-t border-slate-100">
                            <button 
                                type="submit" 
                                disabled={isPending}
                                className="w-full py-4 bg-[#0500A3] hover:bg-blue-800 text-white font-black text-lg rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                {isPending ? 'Guardando Recepción...' : 'Completar Recepción del Equipo'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
