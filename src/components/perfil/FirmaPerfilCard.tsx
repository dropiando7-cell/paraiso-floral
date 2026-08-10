'use client';

import { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, Upload, Trash2, Check, RotateCcw, Image as ImageIcon, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FirmaPerfilCardProps {
    initialFirmaUrl?: string | null;
    onSaveFirma: (firmaUrlOrBase64: string) => Promise<{ success: boolean; error?: string }>;
}

export function FirmaPerfilCard({ initialFirmaUrl, onSaveFirma }: FirmaPerfilCardProps) {
    const [firmaUrl, setFirmaUrl] = useState<string | null>(initialFirmaUrl || null);
    const [mode, setMode] = useState<'preview' | 'draw' | 'upload'>(initialFirmaUrl ? 'preview' : 'draw');
    const [penColor, setPenColor] = useState<string>('#0500A3');
    const [penWidth, setPenWidth] = useState<number>(2.0);
    const [isSaving, setIsSaving] = useState(false);
    const sigCanvasRef = useRef<SignatureCanvas | null>(null);

    // Guardar firma desde el canvas interactivo
    const handleSaveCanvasSignature = async () => {
        if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
            toast.error('Por favor dibuja tu firma antes de guardar.');
            return;
        }

        setIsSaving(true);
        try {
            const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
            const res = await onSaveFirma(dataUrl);
            if (res.success) {
                setFirmaUrl(dataUrl);
                setMode('preview');
                toast.success('¡Firma digital guardada correctamente!');
            } else {
                toast.error(res.error || 'Error al guardar la firma.');
            }
        } catch (e) {
            console.error('Error saving signature:', e);
            toast.error('Error al procesar la firma digital.');
        } finally {
            setIsSaving(false);
        }
    };

    // Subir archivo de imagen de firma
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Selecciona una imagen válida (PNG, JPG, SVG).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no debe pesar más de 5MB.');
            return;
        }

        setIsSaving(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Url = event.target?.result as string;
                if (base64Url) {
                    const res = await onSaveFirma(base64Url);
                    if (res.success) {
                        setFirmaUrl(base64Url);
                        setMode('preview');
                        toast.success('¡Firma digital subida correctamente!');
                    } else {
                        toast.error(res.error || 'Error al subir la imagen de firma.');
                    }
                }
                setIsSaving(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Error uploading signature file:', err);
            toast.error('Error al leer la imagen.');
            setIsSaving(false);
        }
    };

    // Eliminar la firma guardada
    const handleDeleteFirma = async () => {
        if (!confirm('¿Seguro que deseas eliminar tu firma digital oficial?')) return;
        setIsSaving(true);
        try {
            const res = await onSaveFirma('');
            if (res.success) {
                setFirmaUrl(null);
                setMode('draw');
                toast.success('Firma eliminada.');
            } else {
                toast.error(res.error || 'Error al eliminar la firma.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearCanvas = () => {
        if (sigCanvasRef.current) {
            sigCanvasRef.current.clear();
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">Firma Digital Oficial</h3>
                        <p className="text-xs text-slate-500">Se utilizará en órdenes de entrega, órdenes de trabajo y documentos oficiales.</p>
                    </div>
                </div>

                {firmaUrl && mode === 'preview' && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMode('draw')}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
                        >
                            Cambiar / Redibujar
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteFirma}
                            disabled={isSaving}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar Firma"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="p-6">
                {/* Modo Vista Previa / Firma Activa */}
                {mode === 'preview' && firmaUrl ? (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Firma Digital Oficial Activa en el Sistema</span>
                        </div>

                        {/* Visualizador con patrón transparente */}
                        <div className="relative w-full max-w-md h-40 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-4 overflow-hidden shadow-inner bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                            <img
                                src={firmaUrl}
                                alt="Firma Digital Guardada"
                                className="max-h-full max-w-full object-contain filter drop-shadow-md"
                            />
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('draw')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
                            >
                                <PenTool className="w-4 h-4" />
                                Dibujar Nueva Firma
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('upload')}
                                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4 text-slate-500" />
                                Subir Imagen de Firma
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Selector de Modo: Dibujar o Subir */}
                        <div className="flex p-1 bg-slate-100 rounded-xl max-w-xs mx-auto mb-4 border border-slate-200/80">
                            <button
                                type="button"
                                onClick={() => setMode('draw')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition ${
                                    mode === 'draw'
                                        ? 'bg-white text-indigo-700 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <PenTool className="w-3.5 h-3.5" />
                                <span>Dibujar en Pantalla</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('upload')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition ${
                                    mode === 'upload'
                                        ? 'bg-white text-indigo-700 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Subir Imagen</span>
                            </button>
                        </div>

                        {/* Opción A: Canvas Interactivo */}
                        {mode === 'draw' && (
                            <div className="flex flex-col items-center space-y-4">
                                <div className="w-full max-w-lg space-y-3">
                                    {/* Opciones de trazo */}
                                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex-wrap gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-600">Color del Trazo:</span>
                                            <div className="flex items-center gap-1.5">
                                                {[
                                                    { color: '#0500A3', label: 'Azul Oficial' },
                                                    { color: '#000000', label: 'Negro' },
                                                    { color: '#1E3A8A', label: 'Azul Marino' }
                                                ].map((c) => (
                                                    <button
                                                        key={c.color}
                                                        type="button"
                                                        onClick={() => setPenColor(c.color)}
                                                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                                            penColor === c.color ? 'scale-110 border-indigo-600 ring-2 ring-indigo-300' : 'border-white'
                                                        }`}
                                                        style={{ backgroundColor: c.color }}
                                                        title={c.label}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-600">Grosor:</span>
                                            <input
                                                type="range"
                                                min="1"
                                                max="5"
                                                step="0.5"
                                                value={penWidth}
                                                onChange={(e) => setPenWidth(parseFloat(e.target.value))}
                                                className="w-20 accent-indigo-600 cursor-pointer"
                                            />
                                            <span className="font-bold text-indigo-700 w-8">{penWidth}px</span>
                                        </div>
                                    </div>

                                    {/* Canvas interactivo */}
                                    <div className="relative w-full h-48 bg-white border-2 border-dashed border-indigo-200 rounded-2xl overflow-hidden shadow-inner flex flex-col justify-between">
                                        <SignatureCanvas
                                            ref={(ref) => { sigCanvasRef.current = ref; }}
                                            penColor={penColor}
                                            minWidth={penWidth * 0.8}
                                            maxWidth={penWidth * 1.5}
                                            canvasProps={{
                                                className: 'w-full h-full cursor-crosshair touch-none'
                                            }}
                                        />
                                        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center pointer-events-none text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                                            <span>Firma sobre esta línea</span>
                                            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-300" /> Trazo Suave</span>
                                        </div>
                                    </div>

                                    {/* Botones de acción */}
                                    <div className="flex items-center justify-between gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleClearCanvas}
                                            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Limpiar Trazo
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {firmaUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setMode('preview')}
                                                    className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSaveCanvasSignature}
                                                disabled={isSaving}
                                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Guardando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        <span>Guardar Firma Digital</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Opción B: Subir Archivo */}
                        {mode === 'upload' && (
                            <div className="flex flex-col items-center space-y-4 max-w-md mx-auto py-2">
                                <label className="w-full h-44 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 hover:bg-indigo-50/60 transition flex flex-col items-center justify-center p-6 text-center cursor-pointer group">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={isSaving}
                                    />
                                    <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform mb-2">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 block">Haz clic o arrastra tu imagen de firma</span>
                                    <span className="text-[11px] text-slate-400 mt-1 block">Formatos recomendados: PNG o SVG con fondo transparente (Máx. 5MB)</span>
                                </label>

                                {firmaUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setMode('preview')}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                                    >
                                        Cancelar y Mantener Firma Actual
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
