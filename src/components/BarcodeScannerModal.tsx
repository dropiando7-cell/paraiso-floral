"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerModalProps {
    onOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

export function BarcodeScannerModal({ onOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [scannerError, setScannerError] = useState<string | null>(null);

    useEffect(() => {
        if (!onOpen) {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
            return;
        }

        if (!document.getElementById("reader")) return;

        // Limpiamos cualquier montura previa
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
        }

        scannerRef.current = new Html5QrcodeScanner(
            "reader", 
            { 
                fps: 10, 
                qrbox: { width: 250, height: 100 }, // Formato rectangular ideal para Codigo de Barras GS1
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                rememberLastUsedCamera: true
            }, 
            false
        );

        scannerRef.current.render(
            (decodedText) => {
                // Éxito de Escaneo
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error);
                }
                onScanSuccess(decodedText);
            },
            (error) => {
                // Ignorar errores esporádicos de cuadros vacíos, solo mostrar si es grave
                if (typeof error === 'string' && error.includes('NotFoundError')) {
                    setScannerError('Cámara no encontrada. Otorga permisos.');
                }
            }
        );

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [onOpen, onScanSuccess]);

    if (!onOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-zinc-200 dark:border-zinc-800">
                
                {/* Cabecera */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Escanear Fábrica (UDI)
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-4 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center">
                    {scannerError && (
                        <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold flex items-center gap-2">
                            {scannerError}
                        </div>
                    )}
                    
                    <div className="w-full overflow-hidden rounded-xl border-4 border-dashed border-zinc-300 dark:border-zinc-700 bg-black relative">
                        <div id="reader" className="w-full h-full min-h-[300px]" style={{ border: 'none' }}></div>
                    </div>
                    
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 text-center flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Apunta tu cámara al código GS1 o DataMatrix
                    </p>
                </div>
            </div>
            
            <style jsx global>{`
                /* Ocultar elementos feos nativos de la librería html5-qrcode */
                #reader__dashboard_section_csr span { color: transparent !important; }
                #reader button {
                    background-color: #4f46e5 !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                    margin-bottom: 8px !important;
                    cursor: pointer !important;
                }
                #reader a { display: none !important; }
                #reader__camera_selection {
                    padding: 8px !important;
                    border-radius: 8px !important;
                    border: 1px solid #ccc !important;
                    margin-bottom: 12px !important;
                    width: 100% !important;
                    color: #000 !important;
                }
            `}</style>
        </div>
    );
}
