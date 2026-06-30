import React from 'react';
import { getBioSettings } from './actions';
import BioSettingsClient from './BioSettingsClient';
import { Link2 } from 'lucide-react';

export const metadata = {
    title: 'Configuración de Link en Bio (QR) - Bioelectrónica',
    description: 'Administración de la página de enlaces para folletos y redes sociales',
};

export default async function BioSettingsPage() {
    const response = await getBioSettings();

    if (!response.success) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                    <h3 className="font-bold text-sm">Error al cargar la configuración</h3>
                    <p className="text-xs mt-1">{response.error || 'No se pudieron recuperar las configuraciones del servidor.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 border border-brand-100 rounded-xl text-brand-600">
                    <Link2 size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración de Link en Bio</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Diseña y edita la tarjeta digital móvil pública (bioelectronicahn.com/bio) que se enlaza desde tus códigos QR en volantes.</p>
                </div>
            </div>

            <BioSettingsClient initialSettings={response.settings} />
        </div>
    );
}
