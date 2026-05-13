'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';

export default function AutoPrint() {
    const router = useRouter();

    useEffect(() => {
        // Añadir un pequeño retraso para asegurar que los estilos de fuente/css se carguen
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="print:hidden bg-slate-100 p-4 flex items-center justify-between shadow-sm border-b border-slate-200">
            <button 
                onClick={() => router.push('/rentas')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold px-4 py-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
                <ArrowLeft className="w-5 h-5" /> Volver a Rentas
            </button>
            <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500 hidden sm:block">El documento está listo para imprimirse.</p>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm active:scale-95"
                >
                    <Printer className="w-5 h-5" /> Imprimir Contrato
                </button>
            </div>
        </div>
    );
}
