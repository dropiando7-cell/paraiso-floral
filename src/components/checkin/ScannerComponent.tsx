import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera } from 'lucide-react';

export default function ScannerComponent({ onScan, onCancel }: { onScan: (code: string) => void, onCancel: () => void }) {
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-black/5 rounded-2xl border border-slate-200 mt-4 relative animate-in fade-in duration-300">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm font-bold w-full mb-4">
                    {error}
                </div>
            )}

            <div className="w-full max-w-sm overflow-hidden rounded-xl bg-black aspect-square">
                <Scanner 
                    onScan={(result) => {
                        if (result && result.length > 0) {
                            onScan(result[0].rawValue);
                        }
                    }}
                    formats={["qr_code", "code_128", "code_39", "ean_13"]}
                />
            </div>
            
            <button 
                onClick={onCancel}
                className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors font-bold text-sm"
            >
                <X className="w-4 h-4" /> Cancelar Cámara
            </button>
        </div>
    );
}
