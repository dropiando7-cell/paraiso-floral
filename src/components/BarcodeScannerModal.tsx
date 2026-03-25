"use client";

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera, RefreshCw, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { parseGS1, isGS1, gs1DateToISO, type GS1Fields } from '@/lib/gs1';

interface BarcodeScannerModalProps {
    onOpen: boolean;
    onClose: () => void;
    /** Called after the user confirms which code to use */
    onScanSuccess: (decodedText: string, gs1?: GS1Fields) => void;
}

export function BarcodeScannerModal({ onOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
    const [scannerError, setScannerError] = useState<string | null>(null);

    // GS1 review state — shown after a scan if it looks like GS1
    const [gs1Result, setGs1Result] = useState<GS1Fields | null>(null);
    const [rawScanned, setRawScanned] = useState<string>('');

    const handleClose = () => {
        setGs1Result(null);
        setRawScanned('');
        onClose();
    };

    const handleRescan = () => {
        setGs1Result(null);
        setRawScanned('');
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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">

                {/* Cabecera */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Escanear Código (UDI / GS1)
                        </h3>
                    </div>
                    <button onClick={handleClose}
                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Contenido scrolleable */}
                <div className="overflow-y-auto flex-1">
                    {/* ── Panel GS1: se muestra al detectar un GS1 ── */}
                    {gs1Result ? (
                        <div className="p-5">
                            <div className="flex items-center justify-center mb-6">
                                <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-zinc-800 mb-4 text-center">
                                Código Identificado exitosamente. <br/>¿Qué deseas usar como identificador principal?
                            </p>

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
                            <div className="mt-4 pt-4 border-t border-zinc-100">
                                <button
                                    onClick={() => handleConfirmGs1(rawScanned)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs text-zinc-600 bg-zinc-50 hover:bg-zinc-100 font-mono truncate transition-colors border border-zinc-200"
                                    title="Usar código completo de fabricante"
                                >
                                    <span className="text-zinc-400 font-sans block mb-1">Escaner Directo: </span>
                                    {rawScanned}
                                </button>
                            </div>

                            <button onClick={handleRescan}
                                className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 py-3 rounded-xl hover:bg-indigo-50 transition-colors">
                                <RefreshCw className="w-5 h-5" />
                                Volver a escanear
                            </button>
                        </div>
                    ) : (
                        /* ── Vista de cámara ZXing ── */
                        <div className="p-4 bg-black flex flex-col items-center justify-center min-h-[400px]">
                            {scannerError && (
                                <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {scannerError}
                                </div>
                            )}
                            
                            <div className="w-full overflow-hidden rounded-xl border-2 border-zinc-700 relative shadow-2xl bg-zinc-900" style={{aspectRatio: '1'}}>
                                <Scanner 
                                    onScan={(detectedCodes) => {
                                        if (detectedCodes && detectedCodes.length > 0) {
                                            const text = detectedCodes[0].rawValue || '';
                                            if (!text) return;
                                            setRawScanned(text);
                                            if (isGS1(text)) {
                                                setGs1Result(parseGS1(text));
                                            } else {
                                                onScanSuccess(text);
                                            }
                                        }
                                    }}
                                    onError={(err: any) => {
                                        console.warn(err);
                                        if (err?.name === 'NotAllowedError') {
                                            setScannerError('Permisos de cámara denegados.');
                                        }
                                    }}
                                    constraints={{ facingMode: 'environment' }}
                                />
                            </div>
                            <p className="mt-6 text-sm text-zinc-400 text-center flex items-center justify-center gap-2 font-medium">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse block" />
                                Ubica el código QR, DataMatrix o 1D en el recuadro libre.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GS1OptionButton({ label, value, highlight, onSelect }: {
    label: string; value: string; highlight?: boolean; onSelect: (v: string) => void;
}) {
    return (
        <button
            onClick={() => onSelect(value)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-[0.98] text-left ${
                highlight
                    ? 'border-indigo-500 bg-indigo-50 hover:bg-indigo-100'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300'
            }`}
        >
            <div>
                <p className={`text-xs font-medium mb-0.5 ${highlight ? 'text-indigo-600' : 'text-zinc-500'}`}>{label}</p>
                <p className={`text-sm font-bold font-mono ${highlight ? 'text-indigo-900' : 'text-zinc-800'}`}>{value}</p>
            </div>
            <Package className={`w-5 h-5 shrink-0 ${highlight ? 'text-indigo-500' : 'text-zinc-300'}`} />
        </button>
    );
}
