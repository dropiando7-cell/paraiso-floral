'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Calendar, DollarSign, Text, Camera, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { createRenta } from '../actions2';

export default function NuevaRentaClient({ clientes, equipos }: { clientes: any[], equipos: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [mesesRenta, setMesesRenta] = useState(1);
    const [costoRenta, setCostoRenta] = useState(1500);
    const [isNewClient, setIsNewClient] = useState(false);
    const [fechaFin, setFechaFin] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
    });

    const [evidenciaFotos, setEvidenciaFotos] = useState<string[]>([]);
    const [uploadingFotos, setUploadingFotos] = useState(false);
    const fotoCameraRef = useRef<HTMLInputElement>(null);
    const fotoUploadRef = useRef<HTMLInputElement>(null);

    const handleFotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploadingFotos(true);
        const newUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('file', files[i]);
            try {
                const res = await fetch('/api/upload/inventario', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) newUrls.push(data.url);
            } catch (err) {
                console.error("Error uploading photo:", err);
            }
        }
        setEvidenciaFotos(prev => [...prev, ...newUrls]);
        setUploadingFotos(false);
        // Reset inputs
        if (fotoCameraRef.current) fotoCameraRef.current.value = '';
        if (fotoUploadRef.current) fotoUploadRef.current.value = '';
    };

    const removeFoto = (index: number) => {
        setEvidenciaFotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleMesesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const meses = parseInt(e.target.value) || 1;
        setMesesRenta(meses);
        setCostoRenta(meses * 1500);
        
        const d = new Date();
        d.setMonth(d.getMonth() + meses);
        setFechaFin(d.toISOString().split('T')[0]);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        
        startTransition(async () => {
            try {
                const renta = await createRenta(fd);
                router.push(`/rentas/${renta.id}/contrato`);
                router.refresh();
            } catch (err) {
                alert('Error al crear la renta');
            }
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 p-0 sm:p-4 md:p-6 pb-24">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6 pt-6 px-4 sm:pt-0 sm:px-0">
                    <Link href="/rentas" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Nueva Renta de Equipo</h1>
                        <p className="text-xs sm:text-sm text-slate-500">Asigna un equipo del inventario a un cliente.</p>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white sm:rounded-2xl shadow-sm sm:border border-slate-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="px-4 py-6 sm:p-6 md:p-8 space-y-8">
                        
                        {/* 1. Selección */}
                        <div className="space-y-5">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">1. Asignaciones</h2>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente / Doctor <span className="text-red-500">*</span></label>
                                    <select 
                                        name="clienteId" 
                                        required={!isNewClient}
                                        onChange={(e) => setIsNewClient(e.target.value === 'NEW')}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold"
                                    >
                                        <option value="">Selecciona un cliente...</option>
                                        <option value="NEW" className="font-bold text-[#0500A3]">+ Registrar Nuevo Cliente</option>
                                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>

                                    {isNewClient && (
                                        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-100 rounded-xl space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-2">Nombre Completo del Nuevo Cliente <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="text" 
                                                    name="nuevoClienteNombre" 
                                                    required={isNewClient} 
                                                    placeholder="Ej. Dr. Juan Pérez" 
                                                    className="w-full border-2 border-blue-200 rounded-lg px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-2">Identidad / RTN <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="text" 
                                                    name="nuevoClienteRtn" 
                                                    required={isNewClient} 
                                                    placeholder="Ej. 0801-1990-12345" 
                                                    className="w-full border-2 border-blue-200 rounded-lg px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Equipo Médico <span className="text-red-500">*</span></label>
                                    <select name="activoFijoId" required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold">
                                        <option value="">Selecciona un equipo disponible...</option>
                                        {equipos.map(e => <option key={e.id} value={e.id}>{e.descripcionCorta} {e.serie ? `(S/N: ${e.serie})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Datos del Cliente Adicionales */}
                            <div className="grid md:grid-cols-2 gap-5 mt-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono del Cliente (Opcional)</label>
                                    <input type="text" name="telefono" defaultValue="+504 " placeholder="Ej. +504 9999-9999" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección (Opcional)</label>
                                    <input type="text" name="direccion" placeholder="Ej. Col. Juan Lindo..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                            </div>
                        </div>

                        {/* 2. Fechas */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">2. Plazos</h2>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Alquiler</label>
                                    <select name="tipoAlquiler" defaultValue="Mensual" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold">
                                        <option value="Quincenal">Quincenal</option>
                                        <option value="Mensual">Mensual</option>
                                        <option value="Anual">Anual</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Meses a Rentar</label>
                                    <input type="number" name="mesesRenta" value={mesesRenta} onChange={handleMesesChange} min="1" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Fecha de Entrega Esperada <span className="text-red-500">*</span></label>
                                    <input type="date" name="fechaFinEsperada" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                            </div>
                        </div>

                        {/* 3. Costos */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">3. Financiero</h2>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /> Costo Total Renta (L.) <span className="text-red-500">*</span></label>
                                    <input type="number" step="0.01" name="costoRenta" value={costoRenta} onChange={e => setCostoRenta(parseFloat(e.target.value) || 0)} required min="0" placeholder="Ej. 1500" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-bold text-emerald-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /> Depósito en Garantía (L.)</label>
                                    <input type="number" step="0.01" name="deposito" min="0" defaultValue="1500" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                            </div>
                        </div>

                        {/* Detalles Físicos */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">4. Detalles del Equipo (Contrato)</h2>
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Horas de Trabajo de Salida</label>
                                    <input type="text" name="horasTrabajoSalida" placeholder="Ej. 1200 hrs" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Accesorios Incluidos</label>
                                    <input type="text" name="accesoriosIncluidos" placeholder="Ej. Manguera, Cable de poder..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Text className="w-4 h-4 text-slate-400" /> Notas Internas Adicionales</label>
                            <textarea name="notas" rows={2} placeholder="Condición del equipo al entregar..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-medium"></textarea>
                        </div>

                        {/* Evidencia Fotográfica */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">5. Evidencia de Entrega</h2>
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-full">{evidenciaFotos.length} Fotos</span>
                            </div>
                            
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                                <input type="hidden" name="evidenciaFotos" value={JSON.stringify(evidenciaFotos)} />
                                <input 
                                    ref={fotoCameraRef} 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment" 
                                    multiple 
                                    className="hidden" 
                                    onChange={handleFotosUpload} 
                                />
                                <input 
                                    ref={fotoUploadRef} 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    className="hidden" 
                                    onChange={handleFotosUpload} 
                                />

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fotoCameraRef.current?.click()}
                                        disabled={uploadingFotos}
                                        className="flex-1 py-4 flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-slate-600 disabled:opacity-50"
                                    >
                                        {uploadingFotos ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Camera className="w-6 h-6 text-slate-400" />}
                                        <span className="font-bold text-sm">Tomar Foto</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fotoUploadRef.current?.click()}
                                        disabled={uploadingFotos}
                                        className="flex-1 py-4 flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-slate-600 disabled:opacity-50"
                                    >
                                        {uploadingFotos ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Upload className="w-6 h-6 text-slate-400" />}
                                        <span className="font-bold text-sm">Subir Galería</span>
                                    </button>
                                </div>

                                {evidenciaFotos.length > 0 && (
                                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {evidenciaFotos.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 group">
                                                <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeFoto(idx)}
                                                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full md:w-auto flex justify-center items-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                            >
                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {isPending ? 'Guardando Registro...' : 'Confirmar Renta'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
