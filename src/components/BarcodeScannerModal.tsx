"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Zap, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { parseGS1, isGS1, gs1DateToISO, type GS1Fields } from '@/lib/gs1';

interface BarcodeScannerModalProps {
    onOpen: boolean;
    onClose: () => void;
    /** Called after code is detected or confirmed */
    onScanSuccess: (decodedText: string, gs1?: GS1Fields) => void;
}

export function BarcodeScannerModal({ onOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
    const [error, setError] = useState<string | null>(null);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    const [hasTorch, setHasTorch] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // GS1 review state
    const [gs1Result, setGs1Result] = useState<GS1Fields | null>(null);
    const [rawScanned, setRawScanned] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const scannerContainerId = "reception-fast-scanner-container";
    const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
    const nativeDetectorRef = useRef<any>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastScanTimestampRef = useRef<number>(0);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // Reproducir pitido sónico + vibración de confirmación
    const playBeep = useCallback(() => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);

            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(60);
            }
        } catch (e) {
            // Restricciones de reproducción de audio ignoradas limpiamente
        }
    }, []);

    const handleDetectedText = useCallback(
        (rawText: string) => {
            const now = Date.now();
            // Prevenir lecturas duplicadas en bucle (1000ms cooldown)
            if (now - lastScanTimestampRef.current < 1000) return;
            lastScanTimestampRef.current = now;

            let cleanCode = rawText.trim().replace(/'/g, '-');
            if (cleanCode.includes('/')) {
                const parts = cleanCode.split('/').filter(Boolean);
                const lastPart = parts.pop();
                if (lastPart) cleanCode = lastPart.trim();
            }

            playBeep();
            setRawScanned(cleanCode);
            setLastScannedCode(cleanCode);

            if (isGS1(cleanCode)) {
                setGs1Result(parseGS1(cleanCode));
            } else {
                onScanSuccess(cleanCode);
            }
        },
        [onScanSuccess, playBeep]
    );

    const stopScanner = useCallback(async () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (html5QrcodeRef.current) {
            try {
                if (html5QrcodeRef.current.isScanning) {
                    await html5QrcodeRef.current.stop();
                }
                await html5QrcodeRef.current.clear();
            } catch (err) {
                // Ignorar errores de detención
            }
            html5QrcodeRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        setIsTorchOn(false);
        setHasTorch(false);
    }, []);

    const handleClose = () => {
        setGs1Result(null);
        setRawScanned('');
        stopScanner();
        onClose();
    };

    const handleRescan = () => {
        setGs1Result(null);
        setRawScanned('');
        setLastScannedCode(null);
    };

    const handleConfirmGs1 = (chosenCode: string) => {
        onScanSuccess(chosenCode, gs1Result ?? undefined);
        setGs1Result(null);
        setRawScanned('');
    };

    useEffect(() => {
        if (!onOpen) {
            stopScanner();
            return;
        }

        setIsInitializing(true);
        setError(null);
        setLastScannedCode(null);
        setGs1Result(null);

        let isMounted = true;

        async function initCamera() {
            await stopScanner();
            if (!isMounted) return;

            // 1. Usar API Nativa BarcodeDetector acelerada por GPU (Chrome/Android/Edge) a 30 FPS ultra-rápida
            if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
                try {
                    const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
                    const formatsToUse = [
                        'qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 
                        'upc_a', 'upc_e', 'data_matrix', 'aztec', 'pdf417', 'itf'
                    ].filter(f => supportedFormats.includes(f));

                    const detector = new (window as any).BarcodeDetector({ formats: formatsToUse });
                    nativeDetectorRef.current = detector;

                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: { ideal: 'environment' },
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                        },
                    });

                    if (!isMounted) {
                        stream.getTracks().forEach(t => t.stop());
                        return;
                    }

                    mediaStreamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        await videoRef.current.play();

                        const track = stream.getVideoTracks()[0];
                        if (track) {
                            const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
                            if (capabilities.torch) setHasTorch(true);
                        }
                    }

                    let lastDetectTime = 0;
                    const detectLoop = async () => {
                        if (!isMounted || !videoRef.current) return;
                        const now = performance.now();
                        // Escaneo continuo ultra-rápido cada 35ms (30 FPS)
                        if (now - lastDetectTime >= 35) {
                            lastDetectTime = now;
                            try {
                                if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                                    const barcodes = await detector.detect(videoRef.current);
                                    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                                        handleDetectedText(barcodes[0].rawValue);
                                    }
                                }
                            } catch (e) {
                                // Frame decode errors ignorados silenciosamente
                            }
                        }
                        if (isMounted) {
                            animFrameRef.current = requestAnimationFrame(detectLoop);
                        }
                    };

                    setIsInitializing(false);
                    animFrameRef.current = requestAnimationFrame(detectLoop);
                    return;
                } catch (nativeErr) {
                    console.warn("BarcodeDetector nativo no disponible, usando Html5Qrcode:", nativeErr);
                }
            }

            // 2. Fallback Html5Qrcode con resolución 720p HD y soporte específico para 1D Code128 / Code39 / EAN
            try {
                const container = document.getElementById(scannerContainerId);
                if (!container) return;

                const html5Qrcode = new Html5Qrcode(scannerContainerId, {
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.QR_CODE,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.DATA_MATRIX,
                        Html5QrcodeSupportedFormats.ITF
                    ],
                    verbose: false,
                });

                html5QrcodeRef.current = html5Qrcode;

                await html5Qrcode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 30,
                        qrbox: (w, h) => ({
                            width: Math.floor(Math.min(w, h) * 0.85),
                            height: Math.floor(Math.min(w, h) * 0.55),
                        }),
                        videoConstraints: {
                            facingMode: 'environment',
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                        },
                    },
                    (decodedText) => {
                        if (isMounted) handleDetectedText(decodedText);
                    },
                    () => {}
                );

                setIsInitializing(false);
            } catch (fallbackErr: any) {
                console.error("Html5Qrcode error:", fallbackErr);
                if (isMounted) {
                    setIsInitializing(false);
                    setError("No se pudo acceder a la cámara. Revisa los permisos.");
                }
            }
        }

        initCamera();

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, [onOpen, handleDetectedText, stopScanner]);

    const toggleTorch = async () => {
        if (!mediaStreamRef.current) return;
        const track = mediaStreamRef.current.getVideoTracks()[0];
        if (track) {
            try {
                const nextState = !isTorchOn;
                await (track as any).applyConstraints({
                    advanced: [{ torch: nextState }],
                });
                setIsTorchOn(nextState);
            } catch (e) {
                console.warn("Error al encender linterna:", e);
            }
        }
    };

    if (!onOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl relative flex flex-col text-white overflow-hidden max-h-[95vh]">
                
                {/* Cabecera del Escáner */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
                            <Camera size={18} />
                        </div>
                        <div>
                            <h3 className="font-black text-xs uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                                Escáner Ultra-Rápido CEDI
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold">
                                Detección instantánea 1D / Code128 / QR
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Cerrar escáner"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido scrolleable o visor de cámara */}
                <div className="overflow-y-auto flex-1">
                    {gs1Result ? (
                        <div className="p-2 text-slate-900 bg-white rounded-2xl p-4 my-2">
                            <div className="flex items-center justify-center mb-4">
                                <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                            </div>
                            <p className="text-sm font-bold text-emerald-800 mb-4 text-center">
                                ¡Código GS1 Detectado!
                            </p>

                            <div className="space-y-2 mb-4 text-xs font-semibold">
                                {gs1Result.gtin && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                                        <p className="text-[10px] text-emerald-700">GTIN Universal</p>
                                        <p className="text-sm font-bold font-mono text-emerald-950">{gs1Result.gtin}</p>
                                    </div>
                                )}
                                {gs1Result.ref && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                                        <p className="text-[10px] text-slate-500">Referencia</p>
                                        <p className="text-sm font-bold font-mono text-slate-900">{gs1Result.ref}</p>
                                    </div>
                                )}
                                {gs1Result.lote && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                                        <p className="text-[10px] text-amber-700">Lote</p>
                                        <p className="text-sm font-bold font-mono text-amber-950">{gs1Result.lote}</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleConfirmGs1(gs1Result.gtin || gs1Result.ref || rawScanned)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Usar este código
                            </button>

                            <button
                                onClick={handleRescan}
                                className="mt-2 w-full text-xs font-bold text-slate-500 hover:text-slate-800 py-2 flex items-center justify-center gap-1"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Escanear otro código
                            </button>
                        </div>
                    ) : (
                        <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                            {/* Stream de video nativo */}
                            <video
                                ref={videoRef}
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            {/* Contenedor Fallback Html5Qrcode */}
                            <div
                                id={scannerContainerId}
                                className="absolute inset-0 w-full h-full overflow-hidden [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
                            />

                            {/* Overlay de Guía Láser Acelerado por GPU */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-between p-4 z-10">
                                <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                                    <div className="text-[10px] font-black uppercase text-emerald-300 tracking-wider bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-emerald-500/30 shadow-md">
                                        Ubica el Código de Barras Aquí
                                    </div>
                                </div>

                                <div
                                    className="absolute left-4 right-4 h-[2.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.9)] pointer-events-none z-10"
                                    style={{
                                        animation: 'cedi-scan-laser 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                        willChange: 'transform',
                                        transform: 'translateZ(0)',
                                    }}
                                />
                            </div>

                            {/* Indicador de Carga */}
                            {isInitializing && (
                                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20">
                                    <RefreshCw size={28} className="text-emerald-400 animate-spin" />
                                    <span className="text-xs font-bold text-slate-300 tracking-wide">
                                        Iniciando cámara HD CEDI...
                                    </span>
                                </div>
                            )}

                            {/* Banner de Error */}
                            {error && (
                                <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center gap-3 z-20">
                                    <AlertCircle size={32} className="text-rose-500" />
                                    <p className="text-xs font-semibold text-rose-300 leading-relaxed">
                                        {error}
                                    </p>
                                    <button
                                        onClick={handleClose}
                                        className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-white"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Animación Láser CSS */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                        @keyframes cedi-scan-laser {
                            0% { transform: translate3d(0, 16px, 0); opacity: 0.8; }
                            50% { transform: translate3d(0, 240px, 0); opacity: 1; }
                            100% { transform: translate3d(0, 16px, 0); opacity: 0.8; }
                        }
                    `
                }} />

                {/* Footer de Controles (Linterna + Cierre) */}
                <div className="mt-3 flex flex-col gap-2 shrink-0">
                    {lastScannedCode && !gs1Result && (
                        <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs animate-in zoom-in-95">
                            <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span className="font-mono font-bold text-emerald-200 truncate">
                                    {lastScannedCode}
                                </span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-500/40 shrink-0">
                                ¡Leído!
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {hasTorch && (
                            <button
                                type="button"
                                onClick={toggleTorch}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                                    isTorchOn
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                <Zap size={15} className={isTorchOn ? 'fill-amber-400 text-amber-400' : ''} />
                                <span>{isTorchOn ? 'Linterna ON' : 'Linterna'}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer text-center border border-slate-700"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
