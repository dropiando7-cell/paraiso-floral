import { useEffect, useRef, useState, useTransition } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { validateAndOpenArea } from './actions';

export function AreaScannerModal({
    open,
    onClose,
    onSuccess
}: {
    open: boolean;
    onClose: () => void;
    onSuccess: (areaCode: string) => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!open) return;

        const scannerId = "qr-reader-area";

        // Timeout para asegurar que el div renderizó
        const timeout = setTimeout(() => {
            const html5QrcodeScanner = new Html5QrcodeScanner(
                scannerId,
                { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
                /* verbose= */ false
            );

            html5QrcodeScanner.render(
                (decodedText) => {
                    // Evitar escaneos múltiples seguidos
                    if (isPending) return;

                    startTransition(async () => {
                        html5QrcodeScanner.pause();
                        setError(null);

                        try {
                            const res = await validateAndOpenArea(decodedText.trim());
                            if (res.success && res.areaCode) {
                                html5QrcodeScanner.clear();
                                onSuccess(res.areaCode);
                            } else {
                                setError(res.error || 'Código inválido.');
                                setTimeout(() => html5QrcodeScanner.resume(), 2500);
                            }
                        } catch (err: any) {
                            setError(err.message || 'Error de conexión');
                            setTimeout(() => html5QrcodeScanner.resume(), 2500);
                        }
                    });
                },
                (errorMessage) => {
                    // ignores frame errors
                }
            );

            return () => {
                html5QrcodeScanner.clear().catch(() => { });
            };
        }, 100);

        return () => clearTimeout(timeout);
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <QrCode className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Escanear Llave de Área</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 bg-black">
                    <div id="qr-reader-area" className="w-full text-white bg-black min-h-[300px] flex items-center justify-center rounded-xl overflow-hidden [&_video]:object-cover" />
                </div>

                <div className="p-5 flex flex-col items-center justify-center border-t border-slate-100 text-center">
                    {isPending ? (
                        <div className="flex flex-col items-center gap-2 text-blue-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-sm font-semibold">Validando autorización...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-2 text-red-600">
                            <AlertTriangle className="w-8 h-8" />
                            <p className="text-sm font-semibold">{error}</p>
                            <p className="text-xs text-slate-500 mt-1">Busque otro código QR e intente de nuevo.</p>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-600">
                            Apunta la cámara al <strong>código QR de la puerta del área</strong> para desbloquearla y comenzar a registrar activos.
                        </div>
                    )}
                </div>
            </div>

            {/* Inyectamos estilos para sobreescribir el diseño feo por defecto de html5-qrcode */}
            <style dangerouslySetInnerHTML={{
                __html: `
                #qr-reader-area__scan_region { min-height: 250px; display: flex; align-items: center; justify-content: center; background: #000; }
                #qr-reader-area__scan_region img { display: none; }
                #qr-reader-area__dashboard_section_csr button { background: #0500A3 !important; color: white !important; border: none !important; padding: 10px 16px !important; border-radius: 12px !important; font-weight: bold !important; font-family: inherit !important; margin-top: 10px !important; cursor: pointer; }
                #qr-reader-area__dashboard_section_csr select { padding: 8px !important; border-radius: 8px !important; border: 1px solid #ccc !important; font-family: inherit !important; max-width: 100%; }
                #qr-reader-area a { display: none !important; }
            `}} />
        </div>
    );
}
