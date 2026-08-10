'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Calendar, DollarSign, Text, Camera, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { createRenta } from '../actions2';

export default function NuevaRentaClient({ clientes, equipos }: { clientes: any[], equipos: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [tipoAlquiler, setTipoAlquiler] = useState('Mensual');
    const [mesesRenta, setMesesRenta] = useState(1);

    // Tarifas base editables
    const [tarifaSemanal, setTarifaSemanal] = useState(2500);
    const [tarifaQuincenal, setTarifaQuincenal] = useState(2500);
    const [tarifaMensual, setTarifaMensual] = useState(3500);
    const [tarifaAnual, setTarifaAnual] = useState(42000);
    const [tarifaDeposito, setTarifaDeposito] = useState(1500);

    const [costoRenta, setCostoRenta] = useState(3500);
    const [deposito, setDeposito] = useState(1500);
    const [isNewClient, setIsNewClient] = useState(false);
    const [horasTrabajoSalida, setHorasTrabajoSalida] = useState('');
    
    const [isDirecto, setIsDirecto] = useState(false);
    const [fechaInicio, setFechaInicio] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

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
            const file = files[i];
            try {
                // Comprimir imagen en el lado del cliente
                const url = URL.createObjectURL(file);
                const img = new window.Image();
                img.src = url;
                await new Promise((resolve, reject) => {
                    img.onload = () => resolve(null);
                    img.onerror = () => reject(new Error("Formato de imagen no soportado (ej. HEIC/HEIF de iPhone) o archivo corrupto. Intenta con JPG/PNG."));
                });
                URL.revokeObjectURL(url);

                const canvas = document.createElement('canvas');
                const MAX_SIZE = 1200; // Un poco más pequeño para renta múltiple
                let { width, height } = img;
                if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(b => {
                        if (b) resolve(b);
                        else reject(new Error("Error al convertir la imagen a Blob."));
                    }, 'image/jpeg', 0.80);
                });

                const formData = new FormData();
                formData.append('file', blob, 'evidencia.jpg');
                
                const res = await fetch('/api/upload/inventario', { method: 'POST', body: formData });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) newUrls.push(data.url);
                } else {
                    const errorText = await res.text();
                    console.error("Error del servidor al subir foto:", errorText);
                    alert(`Error del servidor al subir foto: ${errorText}`);
                }
            } catch (err: any) {
                console.error("Error procesando foto:", err);
                alert(`Error procesando foto "${file.name}": ${err.message || err}`);
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

    // Recalcular costo sugerido y fecha esperada utilizando las tarifas base editables
    const recalcularValoresRenta = (
        tipo: string = tipoAlquiler,
        cantidad: number = mesesRenta,
        fInicio: string = fechaInicio,
        tSem: number = tarifaSemanal,
        tQuin: number = tarifaQuincenal,
        tMen: number = tarifaMensual,
        tAnual: number = tarifaAnual,
        tDep: number = tarifaDeposito
    ) => {
        const cant = Math.max(1, cantidad);
        setTipoAlquiler(tipo);
        setMesesRenta(cant);

        const d = new Date((fInicio || fechaInicio) + 'T12:00:00Z');
        let costoBase = tMen;

        if (tipo === 'Semanal') {
            costoBase = tSem;
            d.setUTCDate(d.getUTCDate() + (7 * cant));
        } else if (tipo === 'Quincenal') {
            costoBase = tQuin;
            d.setUTCDate(d.getUTCDate() + (14 * cant));
        } else if (tipo === 'Mensual') {
            costoBase = tMen;
            d.setUTCMonth(d.getUTCMonth() + cant);
        } else if (tipo === 'Anual') {
            costoBase = tAnual;
            d.setUTCFullYear(d.getUTCFullYear() + cant);
        } else { // Otro
            costoBase = tMen;
            d.setUTCMonth(d.getUTCMonth() + cant);
        }

        setFechaFin(d.toISOString().split('T')[0]);
        setCostoRenta(costoBase * cant);
        setDeposito(tDep);
    };

    const handleTipoAlquilerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        recalcularValoresRenta(e.target.value, mesesRenta, fechaInicio);
    };

    const handleMesesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cant = parseInt(e.target.value) || 1;
        recalcularValoresRenta(tipoAlquiler, cant, fechaInicio);
    };

    const handleResetTarifasEstandar = () => {
        setTarifaSemanal(2500);
        setTarifaQuincenal(2500);
        setTarifaMensual(3500);
        setTarifaAnual(42000);
        setTarifaDeposito(1500);
        recalcularValoresRenta(tipoAlquiler, mesesRenta, fechaInicio, 2500, 2500, 3500, 42000, 1500);
    };

    const handleFechaInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nuevaFecha = e.target.value;
        setFechaInicio(nuevaFecha);
        recalcularValoresRenta(tipoAlquiler, mesesRenta, nuevaFecha);
    };

    const handleEquipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const equipoId = e.target.value;
        const equipo = equipos.find(eq => eq.id === equipoId);
        if (equipo && equipo.horasTrabajoActuales) {
            setHorasTrabajoSalida(equipo.horasTrabajoActuales);
        } else {
            setHorasTrabajoSalida('');
        }
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        
        startTransition(async () => {
            try {
                const renta = await createRenta(fd);
                if (isDirecto) {
                    router.push(`/rentas/${renta.id}/pagos`);
                } else {
                    router.push(`/rentas/${renta.id}/firma`);
                }
                router.refresh();
            } catch (err: any) {
                console.error("Error al crear renta:", err);
                alert(err.message || 'Error al crear la renta');
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
                                    <select name="activoFijoId" required onChange={handleEquipoChange} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold">
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
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">2. Plazos y Fechas</h2>
                                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                    <input type="checkbox" name="isDirecto" checked={isDirecto} onChange={e => setIsDirecto(e.target.checked)} className="w-4 h-4 text-[#0500A3] rounded border-blue-300 focus:ring-[#0500A3]" value="true" />
                                    <span className="text-xs font-bold text-[#0500A3]">Registro Histórico / Directo</span>
                                </label>
                            </div>

                            {/* Banner Informativo y Tarifas Base Editables */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tarifas Base de Alquiler (Editables)</h4>
                                            <p className="text-[11px] text-slate-500">Puedes modificar cualquier tarifa base o el precio final si deseas aplicar un descuento especial.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetTarifasEstandar}
                                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs transition"
                                        title="Restablecer tarifas predeterminadas de la empresa (L. 2500, L. 2500, L. 3500, L. 1500)"
                                    >
                                        ↺ Restablecer Precios Base Estándar
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    {/* Card 1: 1 Semana */}
                                    <div 
                                        onClick={() => recalcularValoresRenta('Semanal', mesesRenta, fechaInicio, tarifaSemanal, tarifaQuincenal, tarifaMensual, tarifaAnual, tarifaDeposito)}
                                        className={`p-3 rounded-2xl border-2 transition-all text-center cursor-pointer relative group ${
                                            tipoAlquiler === 'Semanal' 
                                                ? 'bg-blue-50/90 border-blue-600 shadow-md ring-4 ring-blue-500/10' 
                                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs'
                                        }`}
                                    >
                                        {tipoAlquiler === 'Semanal' && (
                                            <span className="absolute -top-2.5 right-2 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                                                ✓ Activo
                                            </span>
                                        )}
                                        <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider mb-1.5 cursor-pointer">
                                            1 Semana (7 Días)
                                        </label>
                                        <div className="relative flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400 absolute left-2 pointer-events-none">L.</span>
                                            <input
                                                type="number"
                                                value={tarifaSemanal}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    recalcularValoresRenta('Semanal', mesesRenta, fechaInicio, tarifaSemanal, tarifaQuincenal, tarifaMensual, tarifaAnual, tarifaDeposito);
                                                }}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setTarifaSemanal(val);
                                                    recalcularValoresRenta('Semanal', mesesRenta, fechaInicio, val, tarifaQuincenal, tarifaMensual, tarifaAnual, tarifaDeposito);
                                                }}
                                                className="w-full pl-6 pr-2 py-1.5 text-center font-black text-blue-700 bg-white border border-slate-200 focus:border-blue-600 rounded-xl outline-none text-base shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Card 2: 2 Semanas */}
                                    <div 
                                        onClick={() => recalcularValoresRenta('Quincenal', mesesRenta, fechaInicio, tarifaSemanal, tarifaQuincenal, tarifaMensual, tarifaAnual, tarifaDeposito)}
                                        className={`p-3 rounded-2xl border-2 transition-all text-center cursor-pointer relative group ${
                                            tipoAlquiler === 'Quincenal' 
                                                ? 'bg-blue-50/90 border-blue-600 shadow-md ring-4 ring-blue-500/10' 
                                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs'
                                        }`}
                                    >
                                        {tipoAlquiler === 'Quincenal' && (
                                            <span className="absolute -top-2.5 right-2 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                                                ✓ Activo
                                            </span>
                                        )}
                                        <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider mb-1.5 cursor-pointer">
                                            2 Semanas (14 Días)
                                        </label>
                                        <div className="relative flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400 absolute left-2 pointer-events-none">L.</span>
                                            <input
                                                type="number"
                                                value={tarifaQuincenal}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    recalcularValoresRenta('Quincenal', mesesRenta, fechaInicio, tarifaSemanal, tarifaQuincenal, tarifaMensual, tarifaAnual, tarifaDeposito);
                                                }}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setTarifaQuincenal(val);
                                                    recalcularValoresRenta('Quincenal', mesesRenta, fechaInicio, tarifaSemanal, val, tarifaMensual, tarifaAnual, tarifaDeposito);
                                                }}
                                                className="w-full pl-6 pr-2 py-1.5 text-center font-black text-blue-700 bg-white border border-slate-200 focus:border-blue-600 rounded-xl outline-none text-base shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Card 3: 30 Días */}
                                    <div 
                                        onClick={() => recalcularValoresRenta('Mensual', mesesRenta, fechaInicio, tarifaSemanal, tarifaQuincenal, tarifaMensual, tarifaAnual, tarifaDeposito)}
                                        className={`p-3 rounded-2xl border-2 transition-all text-center cursor-pointer relative group ${
                                            tipoAlquiler === 'Mensual' 
                                                ? 'bg-emerald-50/90 border-emerald-600 shadow-md ring-4 ring-emerald-500/10' 
                                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80 shadow-2xs'
                                        }`}
                                    >
                                        {tipoAlquiler === 'Mensual' && (
                                            <span className="absolute -top-2.5 right-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                                                ✓ Activo
                                            </span>
                                        )}
                                        <label className="text-[10px] font-extrabold text-emerald-800 block uppercase tracking-wider mb-1.5 cursor-pointer">
                                            30 Días (Mensual)
                                        </label>
                                        <div className="relative flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400 absolute left-2 pointer-events-none">L.</span>
                                            <input
                                                type="number"
                                                value={tarifaMensual}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    recalcularValoresRenta('Mensual', mesesRenta, fechaInicio, tarifaSemanal, tarifaQuincenal, tarifaMensual, tarifaAnual, tarifaDeposito);
                                                }}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setTarifaMensual(val);
                                                    recalcularValoresRenta('Mensual', mesesRenta, fechaInicio, tarifaSemanal, tarifaQuincenal, val, tarifaAnual, tarifaDeposito);
                                                }}
                                                className="w-full pl-6 pr-2 py-1.5 text-center font-black text-emerald-700 bg-white border border-slate-200 focus:border-emerald-600 rounded-xl outline-none text-base shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Card 4: Depósito Garantía */}
                                    <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 text-center shadow-2xs">
                                        <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider mb-1.5">
                                            Depósito Garantía
                                        </label>
                                        <div className="relative flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400 absolute left-2 pointer-events-none">L.</span>
                                            <input
                                                type="number"
                                                value={tarifaDeposito}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setTarifaDeposito(val);
                                                    setDeposito(val);
                                                }}
                                                className="w-full pl-6 pr-2 py-1.5 text-center font-black text-slate-800 bg-white border border-slate-200 focus:border-slate-500 rounded-xl outline-none text-base shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-amber-800 bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <span>ℹ️</span> <strong>Regla de cobro:</strong> No existe tarifa de 3 semanas. Si el equipo se devuelve a las 3 semanas, se aplica la tarifa estándar de 30 días (L. 3,500).
                                </p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Alquiler</label>
                                    <select 
                                        name="tipoAlquiler" 
                                        value={tipoAlquiler} 
                                        onChange={handleTipoAlquilerChange} 
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold"
                                    >
                                        <option value="Semanal">1 Semana (7 Días) — L. 2,500</option>
                                        <option value="Quincenal">2 Semanas / Quincenal (14 Días) — L. 2,500</option>
                                        <option value="Mensual">30 Días / Mensual — L. 3,500</option>
                                        <option value="Anual">Anual (12 Meses) — L. 42,000</option>
                                        <option value="Otro">Otro (Precio Personalizado)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        {tipoAlquiler === 'Semanal' ? 'Semanas a Rentar' : 
                                         tipoAlquiler === 'Quincenal' ? 'Quincenas a Rentar (2 sem. c/u)' : 
                                         tipoAlquiler === 'Anual' ? 'Años a Rentar' : 
                                         'Meses / Periodos (30 Días) a Rentar'}
                                    </label>
                                    <input type="number" name="mesesRenta" value={mesesRenta} onChange={handleMesesChange} min="1" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Fecha de Inicio <span className="text-red-500">*</span></label>
                                    <input type="date" name="fechaInicio" value={fechaInicio} onChange={handleFechaInicioChange} readOnly={!isDirecto} className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold ${!isDirecto ? 'bg-slate-100 text-slate-500' : 'bg-slate-50'}`} />
                                    {!isDirecto && <p className="text-[10px] text-slate-400 mt-1">Activa "Registro Histórico" para editar esta fecha.</p>}
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
                                    <input type="number" step="0.01" name="costoRenta" value={costoRenta} onChange={e => setCostoRenta(parseFloat(e.target.value) || 0)} required min="0" placeholder="Ej. 3500" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-bold text-emerald-700" />
                                    <p className="text-[10px] text-slate-400 mt-1">Puedes modificar este precio libremente si aplica un descuento o acuerdo especial.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">Método de Pago de Renta</label>
                                    <select 
                                        name="metodoPagoRenta"
                                        defaultValue="Ninguno"
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold"
                                    >
                                        <option value="Ninguno">No registrar en Caja (Ninguno)</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /> Depósito en Garantía (L.)</label>
                                    <input type="number" step="0.01" name="deposito" value={deposito} onChange={e => setDeposito(parseFloat(e.target.value) || 0)} min="0" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                    <p className="text-[10px] text-slate-400 mt-1">Valor por defecto: L. 1,500 (modificable).</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">Método de Pago del Depósito</label>
                                    <select 
                                        name="metodoPagoDeposito"
                                        defaultValue="Ninguno"
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold"
                                    >
                                        <option value="Ninguno">No registrar en Caja (Ninguno)</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Detalles Físicos */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">4. Detalles del Equipo (Contrato)</h2>
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Horas de Trabajo de Salida</label>
                                    <input type="text" name="horasTrabajoSalida" value={horasTrabajoSalida} onChange={e => setHorasTrabajoSalida(e.target.value)} placeholder="Ej. 1200 hrs" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
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
