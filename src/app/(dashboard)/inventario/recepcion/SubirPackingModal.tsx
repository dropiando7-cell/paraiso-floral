'use client';

import React, { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Upload, 
    FileText, 
    Sparkles, 
    Loader2, 
    X, 
    CheckCircle2, 
    AlertTriangle, 
    Package,
    Building2,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { crearLoteDesdeSubidaAI } from './actions';
import { formatNombreProductoRecepcion } from '@/utils/recepcionHelpers';

export default function SubirPackingModal() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [datosExtraidos, setDatosExtraidos] = useState<any | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);
        setDatosExtraidos(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/inventario/recepcion/procesar-packing-pdf', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Error al analizar el documento con IA.');
            }

            setDatosExtraidos(data.datosExtraidos);
        } catch (err: any) {
            console.error('Error al procesar packing list:', err);
            setError(err.message || 'Error al procesar el archivo');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmarCreacion = () => {
        if (!datosExtraidos) return;

        startTransition(async () => {
            const res = await crearLoteDesdeSubidaAI(datosExtraidos);
            if (res.success && res.loteId) {
                setIsOpen(false);
                setDatosExtraidos(null);
                router.push(`/inventario/recepcion/${res.loteId}`);
            } else {
                setError(res.error || 'Error al guardar el nuevo lote.');
            }
        });
    };

    return (
        <>
            {/* Botón Principal para Abrir Modal de Carga de Packing List */}
            <button
                onClick={() => { setIsOpen(true); setError(null); setDatosExtraidos(null); }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-xs transition-all"
            >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>+ Subir Nuevo Packing List (PDF / Foto Mano)</span>
            </button>

            {/* Modal de Carga e Interpretación IA */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-800 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
                        
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-600" />
                                    Subir Nuevo Packing List con IA
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Formatos compatibles: PDFs digitales, hojas escaneadas o fotos tomadas a mano de cualquier finca o proveedor.
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Banner de error */}
                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Área de Selección / Carga de Archivo */}
                        {!datosExtraidos && (
                            <div className="space-y-4">
                                <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {isAnalyzing ? (
                                    <div className="p-10 border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl text-center space-y-3">
                                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-900">Interpretando Documento con IA...</h4>
                                            <p className="text-xs text-emerald-700 mt-1">
                                                Identificando número de envío, finca, cajas y detalle de flores o follajes.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-8 sm:p-12 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl text-center cursor-pointer transition-all space-y-3 group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                Haz clic aquí para seleccionar el PDF o Foto de la Hoja
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Admite documentos digitales de flores o fotos manuscritas de hojas de despacho de follajes.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pre-Vista Editable de Datos Extraídos por la IA */}
                        {datosExtraidos && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        ¡Documento interpretado con éxito!
                                    </span>
                                    <button 
                                        onClick={() => setDatosExtraidos(null)} 
                                        className="text-emerald-700 font-bold underline hover:text-emerald-900"
                                    >
                                        Subir otro archivo
                                    </button>
                                </div>

                                {/* Formulario Ajustable de Cabecera */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <label className="text-slate-700 font-semibold block mb-1">Número de Envío / Guía</label>
                                        <input
                                            type="text"
                                            value={datosExtraidos.numeroEnvio || ''}
                                            onChange={(e) => setDatosExtraidos({ ...datosExtraidos, numeroEnvio: e.target.value })}
                                            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs focus:border-emerald-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-700 font-semibold block mb-1">Proveedor / Finca</label>
                                        <input
                                            type="text"
                                            value={datosExtraidos.proveedor || ''}
                                            onChange={(e) => setDatosExtraidos({ ...datosExtraidos, proveedor: e.target.value })}
                                            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs focus:border-emerald-600"
                                        />
                                    </div>
                                </div>

                                {/* Tabla de Cajas e Ítems Extraídos */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                                        Detalle de Cajas Detectadas ({datosExtraidos.cajas?.length || 0})
                                    </h4>

                                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                                        {datosExtraidos.cajas?.map((caja: any, cIdx: number) => (
                                            <div key={cIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                                                <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-1">
                                                    <span>Caja #{caja.numeroCaja}</span>
                                                    {caja.codigoProveedor && (
                                                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                            Sticker: {caja.codigoProveedor}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-1 pt-1">
                                                    {caja.items?.map((item: any, iIdx: number) => (
                                                        <div key={iIdx} className="flex items-center justify-between gap-2 text-[11px] text-slate-700">
                                                            <div>
                                                                <span className="font-bold text-slate-900">{formatNombreProductoRecepcion(item.descripcion)}</span>
                                                                <span className="text-slate-400 ml-1.5">({item.cultivo})</span>
                                                            </div>
                                                            <div className="font-bold text-emerald-700 shrink-0">
                                                                {item.bonches} pqt
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Modal */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                            >
                                Cancelar
                            </button>

                            {datosExtraidos && (
                                <button
                                    onClick={handleConfirmarCreacion}
                                    disabled={isPending}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                                >
                                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                    <span>Confirmar y Crear Lote de Recepción</span>
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
