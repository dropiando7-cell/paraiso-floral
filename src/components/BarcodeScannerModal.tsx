"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, Camera, RefreshCw, SwitchCamera, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { parseGS1, isGS1, gs1DateToISO, getGS1PrimaryId, type GS1Fields } from '@/lib/gs1';

interface BarcodeScannerModalProps {
    onOpen: boolean;
    onClose: () => void;
    /** Called after the user confirms which code to use */
    onScanSuccess: (decodedText: string, gs1?: GS1Fields) => void;
}

export function BarcodeScannerModal({ onOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [isRunning, setIsRunning] = useState(false);

    // GS1 review state — shown after a scan if it looks like GS1
    const [gs1Result, setGs1Result] = useState<GS1Fields | null>(null);
    const [rawScanned, setRawScanned] = useState<string>('');

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch { /* ignorar */ }
            scannerRef.current = null;
        }
        setIsRunning(false);
    };

    const startScanner = async (facing: 'environment' | 'user') => {
        setScannerError(null);
        const el = document.getElementById("reader");
        if (!el) return;

        try {
            if (scannerRef.current) await stopScanner();

            const scanner = new Html5Qrcode("reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: facing },
                { fps: 12, qrbox: { width: 280, height: 110 }, aspectRatio: 1.5 },
                (decodedText) => {
                    stopScanner().then(() => {
                        setRawScanned(decodedText);
                        if (isGS1(decodedText)) {
                            // Mostrar panel de revisión GS1
                            setGs1Result(parseGS1(decodedText));
                        } else {
                            // Código simple — entregar directamente
                            onScanSuccess(decodedText);
                        }
                    });
                },
                () => { /* ignorar errores de frame */ }
            );
            setIsRunning(true);
        } catch (err: any) {
            if (err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError') {
                setScannerError('Permiso de cámara denegado. Actívalo en ajustes del navegador.');
            } else if (facing === 'environment') {
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
            setGs1Result(null);
            setRawScanned('');
            return;
        }
        const timer = setTimeout(() => startScanner(facingMode), 200);
        return () => { clearTimeout(timer); stopScanner(); };
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
        setGs1Result(null);
        setRawScanned('');
        onClose();
    };

    const handleRescan = async () => {
        setGs1Result(null);
        setRawScanned('');
        await startScanner(facingMode);
    };

    // User picks which value to use as the barcode identifier
    const handleConfirmGs1 = (chosenCode: string) => {
        onScanSuccess(chosenCode, gs1Result ?? undefined);
        setGs1Result(null);
        setRawScanned('');
    };

    if (!onOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-zinc-200 dark:border-zinc-800">

                {/* Cabecera */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Escanear Código (UDI / GS1)
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {!gs1Result && (
                            <button onClick={handleFlipCamera} title="Cambiar cámara"
                                className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                <SwitchCamera className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={handleClose}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Panel GS1: se muestra al detectar un GS1 ── */}
                {gs1Result ? (
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            <p className="text-sm font-semibold text-zinc-800">
                                Código GS1 detectado — elige qué usar como código de producto:
                            </p>
                        </div>

                        <div className="space-y-2">
                            {gs1Result.gtin && (
                                <GS1OptionButton
                                    label="GTIN (Código Universal)"
                                    value={gs1Result.gtin}
                                    highlight
                                    onSelect={handleConfirmGs1}
                                />
                            )}
                            {gs1Result.ref && (
                                <GS1OptionButton
                                    label="REF (Referencia del Fabricante)"
                                    value={gs1Result.ref}
                                    onSelect={handleConfirmGs1}
                                />
                            )}
                            {gs1Result.serial && (
                                <GS1OptionButton
                                    label="Serie"
                                    value={gs1Result.serial}
                                    onSelect={handleConfirmGs1}
                                />
                            )}
                            {gs1Result.lote && (
                                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                                    <div>
                                        <p className="text-xs font-medium text-amber-700">Lote/Batch</p>
                                        <p className="text-sm font-bold text-amber-900 font-mono">{gs1Result.lote}</p>
                                    </div>
                                    <span className="text-xs text-amber-600 italic">Se autollenará</span>
                                </div>
                            )}
                            {gs1Result.fechaVenc && (
                                <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                                    <div>
                                        <p className="text-xs font-medium text-rose-700">Vencimiento (YYMMDD)</p>
                                        <p className="text-sm font-bold text-rose-900 font-mono">
                                            {gs1DateToISO(gs1Result.fechaVenc) || gs1Result.fechaVenc}
                                        </p>
                                    </div>
                                    <span className="text-xs text-rose-600 italic">Se autollenará</span>
                                </div>
                            )}
                        </div>

                        {/* Opción: usar el string completo */}
                        <div className="mt-3 pt-3 border-t border-zinc-100">
                            <button
                                onClick={() => handleConfirmGs1(rawScanned)}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-500 hover:bg-zinc-50 font-mono truncate transition-colors border border-zinc-200"
                                title="Usar código completo"
                            >
                                <span className="text-zinc-400 font-sans">Raw completo: </span>{rawScanned}
                            </button>
                        </div>

                        <button onClick={handleRescan}
                            className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors">
                            <RefreshCw className="w-4 h-4" />
                            Volver a escanear
                        </button>
                    </div>
                ) : (
                    /* ── Vista de cámara ── */
                    <div>
                        <div className="px-4 pt-3 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                facingMode === 'environment' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
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

                        <div className="p-4 bg-zinc-100 dark:bg-zinc-950 mt-3 flex flex-col items-center">
                            {scannerError && (
                                <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {scannerError}
                                </div>
                            )}
                            <div className="w-full overflow-hidden rounded-xl border-4 border-dashed border-zinc-300 dark:border-zinc-700 bg-black relative">
                                <div id="reader" className="w-full" style={{ minHeight: '280px', border: 'none' }} />
                            </div>
                            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 text-center flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Apunta al código GS1, EAN, REF o DataMatrix
                            </p>
                        </div>
                    </div>
                )}
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

function GS1OptionButton({ label, value, highlight, onSelect }: {
    label: string; value: string; highlight?: boolean; onSelect: (v: string) => void;
}) {
    return (
        <button
            onClick={() => onSelect(value)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] text-left ${
                highlight
                    ? 'border-indigo-500 bg-indigo-50 hover:bg-indigo-100'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50'
            }`}
        >
            <div>
                <p className={`text-xs font-medium ${highlight ? 'text-indigo-600' : 'text-zinc-500'}`}>{label}</p>
                <p className={`text-sm font-bold font-mono ${highlight ? 'text-indigo-900' : 'text-zinc-800'}`}>{value}</p>
            </div>
            <Package className={`w-4 h-4 shrink-0 ${highlight ? 'text-indigo-400' : 'text-zinc-300'}`} />
        </button>
    );
}
