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
    ArrowRight,
    Barcode,
    Layers,
    Plus,
    Trash2,
    Check
} from 'lucide-react';
import { crearLoteDesdeSubidaAI, crearLotesDesdeSubidaAIMasivo } from './actions';
import { formatNombreProductoRecepcion } from '@/utils/recepcionHelpers';
import { playSuccessChime } from '@/utils/audioAlerts';

export default function SubirPackingModal() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [lotesExtraidos, setLotesExtraidos] = useState<any[]>([]);
    const [selectedFilesCount, setSelectedFilesCount] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setSelectedFilesCount(files.length);
        setIsAnalyzing(true);
        setError(null);
        setLotesExtraidos([]);

        try {
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));

            const res = await fetch('/api/inventario/recepcion/procesar-packing-pdf', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Error al analizar los documentos con IA.');
            }

            const extraidos = data.lotesExtraidos || (data.datosExtraidos ? [data.datosExtraidos] : []);
            setLotesExtraidos(extraidos);
            playSuccessChime();
        } catch (err: any) {
            console.error('Error al procesar packing lists:', err);
            setError(err.message || 'Error al procesar los archivos');
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCrearTodos = () => {
        if (lotesExtraidos.length === 0) return;

        startTransition(async () => {
            const res = await crearLotesDesdeSubidaAIMasivo(lotesExtraidos);
            if (res.success) {
                playSuccessChime();
                setIsOpen(false);
                setLotesExtraidos([]);
                router.refresh();
                if (res.lotes && res.lotes.length === 1) {
                    router.push(`/inventario/recepcion/${res.lotes[0].id}`);
                }
            } else {
                setError(res.error || (res.errores ? res.errores.join(', ') : 'Error al registrar los packing lists.'));
            }
        });
    };

    const handleEliminarLotePrevia = (index: number) => {
        setLotesExtraidos(prev => prev.filter((_, i) => i !== index));
    };

    const handleActualizarLote = (index: number, campo: string, valor: any) => {
        setLotesExtraidos(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [campo]: valor };
            return copy;
        });
    };

    const totalCajasGlobal = lotesExtraidos.reduce((sum, l) => sum + (l.cajas?.length || l.totalCajas || 0), 0);
    const totalBonchesGlobal = lotesExtraidos.reduce((sum, l) => sum + (l.totalBonches || 0), 0);

    return (
        <>
            {/* Botón Principal para Abrir Modal de Carga de Packing List */}
            <button
                onClick={() => { setIsOpen(true); setError(null); setLotesExtraidos([]); }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>+ Subir Packing List(s) (PDF / Foto)</span>
            </button>

            {/* Modal de Carga e Interpretación IA */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-4 sm:p-6 text-slate-800 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
                        
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-600" />
                                    Subir Packing List(s) con IA Gemini
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Carga uno o múltiples PDFs/Facturas de cualquier proveedor (Ecuador, Colombia, Local). Escaneo ultra-rápido en sub-segundos.
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer">
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

                        {/* Área de Selección / Carga de Archivo(s) */}
                        {lotesExtraidos.length === 0 && (
                            <div className="space-y-4">
                                <input
                                    type="file"
                                    multiple
                                    accept="application/pdf,image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {isAnalyzing ? (
                                    <div className="p-10 border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl text-center space-y-3">
                                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-900">
                                                Escaneando {selectedFilesCount > 1 ? `${selectedFilesCount} documentos` : 'documento'} con IA...
                                            </h4>
                                            <p className="text-xs text-emerald-700 mt-1">
                                                Extrayendo cajas, bonches, fincas y cotejando automáticamente con códigos de barra de inventario.
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
                                                Haz clic o arrastra aquí tus PDFs o Fotos de Packing Lists
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Puedes seleccionar <b>varios archivos a la vez</b> (Lucio SPS, Quality Flowers, Florequisa, Florsani, Galápagos, etc.).
                                            </p>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-medium text-slate-600">
                                            <Sparkles className="w-3 h-3 text-emerald-600" />
                                            Reconocimiento de códigos de barra y variedades integrado
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pre-Vista Editable de Datos Extraídos por la IA */}
                        {lotesExtraidos.length > 0 && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        ¡{lotesExtraidos.length} packing list(s) interpretado(s) exitosamente! ({totalCajasGlobal} cajas • {totalBonchesGlobal.toLocaleString()} bonches)
                                    </span>
                                    <button 
                                        onClick={() => setLotesExtraidos([])} 
                                        className="text-emerald-700 font-bold underline hover:text-emerald-900 cursor-pointer"
                                    >
                                        Subir otros archivos
                                    </button>
                                </div>

                                {/* Lista de Lotes Extraídos */}
                                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                                    {lotesExtraidos.map((lote, lIdx) => (
                                        <div key={lIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3">
                                            
                                            {/* Header de Tarjeta de Lote */}
                                            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                        {lIdx + 1}
                                                    </span>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-800">
                                                            {lote.archivoOrigen || `Envío #${lote.numeroEnvio}`}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 ml-2 font-medium">
                                                            ({lote.cajas?.length || 0} cajas • {lote.totalBonches || 0} bonches)
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleEliminarLotePrevia(lIdx)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                                    title="Eliminar este packing list de la pre-vista"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Campos Editables de Cabecera */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <label className="text-slate-600 font-semibold block mb-0.5 text-[11px]">Número de Envío / Guía</label>
                                                    <input
                                                        type="text"
                                                        value={lote.numeroEnvio || ''}
                                                        onChange={(e) => handleActualizarLote(lIdx, 'numeroEnvio', e.target.value)}
                                                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-bold text-slate-900 text-xs focus:border-emerald-600"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-slate-600 font-semibold block mb-0.5 text-[11px]">Proveedor / Finca</label>
                                                    <input
                                                        type="text"
                                                        value={lote.proveedor || ''}
                                                        onChange={(e) => handleActualizarLote(lIdx, 'proveedor', e.target.value)}
                                                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-xs focus:border-emerald-600"
                                                    />
                                                </div>
                                            </div>

                                            {/* Desglose de Cajas e Ítems con Cotejo de Códigos de Barra */}
                                            <div className="space-y-1.5">
                                                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-white text-xs">
                                                    {lote.cajas?.map((caja: any, cIdx: number) => (
                                                        <div key={cIdx} className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                                                            <div className="font-bold text-slate-800 flex items-center justify-between text-[11px]">
                                                                <span>Caja #{caja.numeroCaja}</span>
                                                                {caja.codigoProveedor && (
                                                                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                                        Sticker: {caja.codigoProveedor}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                {caja.items?.map((item: any, iIdx: number) => (
                                                                    <div key={iIdx} className="flex items-center justify-between gap-2 text-[11px] text-slate-700 py-0.5">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="font-semibold text-slate-900">{formatNombreProductoRecepcion(item.descripcion)}</span>
                                                                            {item.matchedQr ? (
                                                                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[9px] font-bold">
                                                                                    <Barcode className="w-2.5 h-2.5" />
                                                                                    {item.matchedQr}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-1 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-medium">
                                                                                    Variedad Nueva
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="font-bold text-emerald-700 shrink-0 text-[11px]">
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
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer Modal */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Cancelar
                            </button>

                            {lotesExtraidos.length > 0 && (
                                <button
                                    onClick={handleCrearTodos}
                                    disabled={isPending}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Guardando en Inventario...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 text-emerald-200" />
                                            <span>
                                                {lotesExtraidos.length > 1 
                                                    ? `Crear Todos los Packing Lists (${lotesExtraidos.length})` 
                                                    : 'Confirmar y Crear Lote de Recepción'}
                                            </span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}

