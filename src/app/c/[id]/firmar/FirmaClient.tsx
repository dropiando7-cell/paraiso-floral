'use client';

import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle2, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';

export default function FirmaClient({ renta }: { renta: any }) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Resize canvas on mount and window resize to fit mobile screen
    const [canvasSize, setCanvasSize] = useState({ width: 300, height: 200 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const resize = () => {
            if (containerRef.current) {
                const width = containerRef.current.clientWidth - 4; // subtracting border
                setCanvasSize({ width, height: 250 });
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const clearSignature = () => {
        sigCanvas.current?.clear();
        setHasDrawn(false);
    };

    const handleSave = async () => {
        if (!hasDrawn || sigCanvas.current?.isEmpty()) {
            alert('Por favor dibuja tu firma antes de aceptar.');
            return;
        }

        setIsSaving(true);
        try {
            // Get data URL of the signature
            const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
            
            // Upload the base64 image via API
            const res = await fetch('/api/rentas/firmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rentaId: renta.id, firmaDataUrl: dataUrl })
            });

            if (res.ok) {
                setIsSuccess(true);
            } else {
                const { error } = await res.json();
                alert(error || 'Ocurrió un error al guardar tu firma.');
            }
        } catch (e) {
            alert('Error de conexión.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-3">¡Firma Exitosa!</h1>
                <p className="text-slate-500 max-w-sm text-lg leading-relaxed mb-8">Hemos recibido tu firma. El contrato ha sido activado y recibirás tu comprobante pronto.</p>
                <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600">Puedes cerrar esta ventana de forma segura.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <div className="bg-[#0500A3] p-6 text-white shrink-0 shadow-md relative z-10">
                <h1 className="text-xl font-bold mb-1">Contrato de Arrendamiento</h1>
                <p className="text-blue-200 text-sm opacity-90">{renta.organization?.name || 'Bioelectrónica'}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                                <PenTool className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Hola, {renta.cliente?.nombre}</h2>
                                <p className="text-xs text-slate-500">Por favor revisa y firma abajo.</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <span className="text-slate-500 block mb-1 font-semibold text-xs uppercase tracking-wider">Equipo</span>
                                <span className="font-bold text-slate-800 text-base">{renta.activoFijo?.descripcionCorta}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                                <div>
                                    <span className="text-slate-500 block mb-1 font-semibold text-xs uppercase tracking-wider">Tipo Alquiler</span>
                                    <span className="font-bold text-slate-800">{renta.tipoAlquiler}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-1 font-semibold text-xs uppercase tracking-wider">Vencimiento</span>
                                    <span className="font-bold text-slate-800">{new Date(renta.fechaFinEsperada).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {renta.evidenciaFotos && renta.evidenciaFotos.length > 0 && (
                            <div className="mb-6">
                                <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wider">Condición del Equipo (Fotos)</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {renta.evidenciaFotos.map((url: string, i: number) => (
                                        <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                            <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs leading-relaxed mb-6 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                            <p>
                                Al firmar, acepto los términos del contrato de arrendamiento, asumo la responsabilidad del cuidado del equipo y garantizo su devolución en las fechas establecidas.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end mb-2">
                                <label className="font-bold text-slate-700">Dibuja tu firma aquí <span className="text-red-500">*</span></label>
                                <button 
                                    onClick={clearSignature}
                                    className="text-xs text-blue-600 font-semibold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md active:bg-blue-100 transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Limpiar
                                </button>
                            </div>
                            <div 
                                ref={containerRef} 
                                className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden relative touch-none"
                            >
                                <SignatureCanvas 
                                    ref={sigCanvas}
                                    penColor="#0500A3"
                                    canvasProps={{
                                        width: canvasSize.width, 
                                        height: canvasSize.height, 
                                        className: 'sigCanvas touch-none'
                                    }}
                                    onBegin={() => setHasDrawn(true)}
                                />
                                {!hasDrawn && (
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                                        <span className="font-serif italic text-2xl text-slate-400">Firmar aquí</span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasDrawn}
                    className="w-full max-w-md mx-auto flex justify-center items-center gap-2 bg-[#0500A3] text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 text-lg"
                >
                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                    {isSaving ? 'Guardando...' : 'Aceptar y Firmar Contrato'}
                </button>
            </div>
        </div>
    );
}
