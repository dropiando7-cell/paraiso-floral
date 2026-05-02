import Link from 'next/link';
import { QrCode, Building2 } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#04007a] to-slate-900 flex flex-col items-center justify-center px-4 text-center">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
                <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-8 h-8 text-slate-400" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">Activo no encontrado</h1>
                <p className="text-sm text-slate-500 mb-6">
                    El código QR escaneado no corresponde a ningún activo registrado en el inventario.
                </p>
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0500A3]">
                    <Building2 className="w-3.5 h-3.5" />
                    Misión Cristiana Elim Honduras
                </div>
            </div>
            <p className="mt-6 text-xs text-white/30">bioelectronicahn.vercel.app</p>
        </div>
    );
}
