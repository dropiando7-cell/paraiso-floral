'use client';

import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle2, RotateCcw, AlertTriangle, Loader2, DollarSign } from 'lucide-react';

export default function PresupuestoFirmaClient({ factura }: { factura: any }) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isRejectedSuccess, setIsRejectedSuccess] = useState(false);
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
            alert('Por favor dibuja tu firma antes de aceptar el presupuesto.');
            return;
        }

        setIsSaving(true);
        try {
            // Get data URL of the signature
            const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
            
            // Upload the base64 image via API
            const res = await fetch('/api/soporte/firmar-presupuesto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ facturaId: factura.id, firmaDataUrl: dataUrl })
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

    const handleReject = async () => {
        if (confirm('¿Estás seguro de que deseas rechazar este presupuesto? Se le notificará al taller para revisar los detalles.')) {
            setIsRejecting(true);
            try {
                const res = await fetch('/api/soporte/firmar-presupuesto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ facturaId: factura.id, action: 'reject' })
                });

                if (res.ok) {
                    setIsRejectedSuccess(true);
                } else {
                    const { error } = await res.json();
                    alert(error || 'Ocurrió un error al procesar el rechazo.');
                }
            } catch (e) {
                alert('Error de conexión.');
            } finally {
                setIsRejecting(false);
            }
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-3">¡Presupuesto Aprobado!</h1>
                <p className="text-slate-500 max-w-sm text-lg leading-relaxed mb-8">Hemos recibido tu firma exitosamente. Nuestro equipo técnico procederá de inmediato con la reparación de tu equipo.</p>
                <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600">Puedes cerrar esta ventana de forma segura.</p>
                </div>
            </div>
        );
    }

    if (isRejectedSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-3">Presupuesto Rechazado</h1>
                <p className="text-slate-500 max-w-sm text-lg leading-relaxed mb-8">El presupuesto ha sido rechazado. Nuestro equipo técnico se pondrá en contacto con usted para revisar las condiciones y ofrecerle una nueva propuesta.</p>
                <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-600">Puedes cerrar esta ventana de forma segura.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <div className="bg-[#0500A3] p-6 text-white shrink-0 shadow-md relative z-10">
                <h1 className="text-xl font-bold mb-1">Aprobación de Presupuesto</h1>
                <p className="text-blue-200 text-sm opacity-90">{factura.organization?.name || 'Bioelectrónica'}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-32">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                                <PenTool className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Hola, {factura.cliente?.nombre}</h2>
                                <p className="text-xs text-slate-500">Por favor revisa el detalle y aprueba abajo.</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <span className="text-slate-500 block mb-1 font-semibold text-xs uppercase tracking-wider">Orden de Trabajo</span>
                                <span className="font-bold text-slate-800 text-base">{factura.correlativo}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200">
                                <span className="text-slate-500 block mb-2 font-semibold text-xs uppercase tracking-wider">Detalle del Presupuesto</span>
                                <ul className="space-y-2">
                                    {factura.detalles?.map((detalle: any, idx: number) => (
                                        <li key={idx} className="flex justify-between items-start gap-2">
                                            <span className="text-slate-700 font-medium text-sm leading-snug">{detalle.cantidad}x {detalle.descripcion}</span>
                                            <span className="text-slate-900 font-semibold whitespace-nowrap">L {Number(detalle.totalLinea).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex justify-between items-center bg-slate-100 p-3 rounded-lg mt-2">
                                <span className="text-slate-600 font-bold uppercase tracking-wider text-xs">Total a Pagar</span>
                                <span className="font-bold text-slate-900 text-xl">L {Number(factura.total).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs leading-relaxed mb-6 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                            <p>
                                Al firmar, acepto el costo total del diagnóstico y reparación detallado en este documento y autorizo al equipo técnico a proceder con los trabajos descritos.
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
                <div className="flex gap-4 max-w-md mx-auto">
                    <button
                        onClick={handleReject}
                        disabled={isSaving || isRejecting}
                        className="flex-1 flex justify-center items-center gap-1.5 border-2 border-red-500 hover:bg-red-50 text-red-600 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 text-base"
                    >
                        Rechazar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isRejecting || !hasDrawn}
                        className="flex-[2] flex justify-center items-center gap-1.5 bg-[#0500A3] hover:bg-[#040080] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 text-base"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {isSaving ? 'Guardando...' : 'Firmar y Aprobar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
