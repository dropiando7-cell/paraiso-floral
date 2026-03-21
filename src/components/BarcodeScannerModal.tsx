"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, Camera, RefreshCw, SwitchCamera } from 'lucide-react';

interface BarcodeScannerModalProps {
    onOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

export function BarcodeScannerModal({ onOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scannerError, setScannerError] = useState<string | null>(null);
    // 'environment' = trasera, 'user' = frontal
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [isRunning, setIsRunning] = useState(false);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) {
                // Ignorar errores al detener
            }
            scannerRef.current = null;
        }
        setIsRunning(false);
    };

    const startScanner = async (facing: 'environment' | 'user') => {
        setScannerError(null);
        const el = document.getElementById("reader");
        if (!el) return;

        try {
            if (scannerRef.current) {
                await stopScanner();
            }

            const scanner = new Html5Qrcode("reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: facing },
                {
                    fps: 12,
                    qrbox: { width: 280, height: 110 }, // Rectangular ideal para GS1/EAN
                    aspectRatio: 1.5,
                },
                (decodedText) => {
                    stopScanner().then(() => {
                        onScanSuccess(decodedText);
                    });
                },
                () => { /* Ignorar errores de frame vacío */ }
            );
            setIsRunning(true);
        } catch (err: any) {
            console.error('Scanner error:', err);
            if (err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError') {
                setScannerError('Permiso de cámara denegado. Actívalo en ajustes del navegador.');
            } else if (facing === 'environment') {
                // Si falla la trasera, intentar con cualquier cámara disponible
                setScannerError('Cámara trasera no disponible. Intenta cambiar de cámara.');
            } else {
                setScannerError('No se pudo acceder a la cámara: ' + (err?.message || err));
            }
            setIsRunning(false);
        }
    };

    useEffect(() => {
        if (!onOpen) {
            stopScanner();
            return;
        }

        // Pequeño delay para que el DOM esté listo
        const timer = setTimeout(() => {
            startScanner(facingMode);
        }, 200);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onOpen]);

    const handleFlipCamera = async () => {
        const newFacing = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newFacing);
        await stopScanner();
        await startScanner(newFacing);
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    if (!onOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-zinc-200 dark:border-zinc-800">

                {/* Cabecera */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Escanear Código (UDI)
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Botón para cambiar entre cámara trasera/frontal */}
                        <button
                            onClick={handleFlipCamera}
                            title={facingMode === 'environment' ? 'Cambiar a cámara frontal' : 'Cambiar a cámara trasera'}
                            className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors"
                        >
                            <SwitchCamera className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Badge: qué cámara está activa */}
                <div className="px-4 pt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        facingMode === 'environment'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700'
                    }`}>
                        <Camera className="w-3 h-3" />
                        {facingMode === 'environment' ? 'Cámara Trasera' : 'Cámara Frontal'}
                    </span>
                    {isRunning && (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Activa
                        </span>
                    )}
                </div>

                {/* Contenido */}
                <div className="p-4 bg-zinc-100 dark:bg-zinc-950 mt-3 flex flex-col items-center">
                    {scannerError && (
                        <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                            {scannerError}
                        </div>
                    )}

                    <div className="w-full overflow-hidden rounded-xl border-4 border-dashed border-zinc-300 dark:border-zinc-700 bg-black relative">
                        <div id="reader" className="w-full" style={{ minHeight: '280px', border: 'none' }} />
                    </div>

                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 text-center flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Apunta al código GS1, EAN o DataMatrix
                    </p>
                </div>
            </div>

            <style jsx global>{`
                #reader video { border-radius: 8px !important; }
                #reader__dashboard { display: none !important; }
                #reader__header_message { display: none !important; }
                #reader__status_span { display: none !important; }
                #reader img { display: none !important; }
                #reader__camera_selection { display: none !important; }
                #reader__filescan_input { display: none !important; }
            `}</style>
        </div>
    );
}
