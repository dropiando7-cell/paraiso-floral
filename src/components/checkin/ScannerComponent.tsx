import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function ScannerComponent({ onScan, onCancel }: { onScan: (code: string) => void, onCancel: () => void }) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraLoading, setCameraLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        const startScanner = async () => {
            try {
                // Initialize the library
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                };

                // Prefer back camera
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (isMounted) {
                            html5QrCode.stop().then(() => {
                                onScan(decodedText);
                            }).catch(err => {
                                console.error("Failed to stop scanner", err);
                                onScan(decodedText);
                            });
                        }
                    },
                    (errorMessage) => {
                        // ignore scan errors, they happen continuously before a qr is found
                    }
                );
                
                if (isMounted) {
                    setCameraActive(true);
                    setCameraLoading(false);
                }
            } catch (err) {
                console.error("Error starting camera:", err);
                if (isMounted) {
                    setError("No se pudo acceder a la cámara. Revisa los permisos.");
                    setCameraLoading(false);
                }
            }
        };

        // Added slight delay to ensure UI is ready
        setTimeout(startScanner, 200);

        return () => {
            isMounted = false;
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [onScan]);

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-black/5 rounded-2xl border border-slate-200 mt-4 relative animate-in fade-in duration-300">
            {cameraLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-2xl">
                    <div className="flex flex-col items-center text-[#3B6FE8]">
                        <Camera className="w-8 h-8 animate-pulse mb-2" />
                        <span className="text-sm font-bold">Iniciando cámara...</span>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm font-bold w-full mb-4">
                    {error}
                </div>
            )}

            <div id="reader" className="w-full max-w-sm overflow-hidden rounded-xl bg-black"></div>
            
            <button 
                onClick={() => {
                   if (scannerRef.current && scannerRef.current.isScanning) {
                       scannerRef.current.stop();
                   }
                   onCancel();
                }}
                className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors font-bold text-sm"
            >
                <X className="w-4 h-4" /> Cancelar Cámara
            </button>
        </div>
    );
}
