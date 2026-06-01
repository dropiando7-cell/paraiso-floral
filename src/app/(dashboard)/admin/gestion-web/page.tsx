import React from 'react';
import { getWebSettings } from './actions';
import GestionWebClient from './GestionWebClient';
import { Globe, ExternalLink } from 'lucide-react';

export const metadata = {
    title: 'Gestión Web - Bioelectrónica',
    description: 'Administración del sitio web público y tienda de cotizaciones',
};

export default async function GestionWebPage() {
    const response = await getWebSettings();

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
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-50 border border-brand-100 rounded-xl text-brand-600">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión Web y Tienda</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Controla el modo mantenimiento, el orden de las secciones y los canales de cotización de bioelectronicahn.com</p>
                    </div>
                </div>
                <a
                    href="/landing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all border border-slate-800 shadow-sm shrink-0 active:scale-95"
                >
                    <ExternalLink size={14} />
                    <span>Visitar Web Pública</span>
                </a>
            </div>

            <GestionWebClient 
                initialMaintenanceMode={response.maintenanceMode || false}
                initialReviews={response.reviews || []}
                initialSections={response.sections || []}
                initialLandingSettings={response.landingSettings || {}}
            />
        </div>
    );
}
