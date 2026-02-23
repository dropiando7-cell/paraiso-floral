'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AIBanner } from '@/components/dashboard/AIBanner';
import { EventBanner } from '@/components/dashboard/EventBanner';
import { KPIGrid } from '@/components/dashboard/KPIGrid';

export function DashboardHomeClient() {
    // Start blurred for privacy
    const [showValues, setShowValues] = useState(false);

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            {/* Header con toggle de privacidad */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Panorama General
                </h1>
                <button
                    onClick={() => setShowValues(v => !v)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${showValues
                            ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            : 'bg-[#0500A3] text-white border-[#0500A3] hover:bg-[#0600c2]'
                        }`}
                    title={showValues ? 'Ocultar valores' : 'Revelar valores'}
                >
                    {showValues ? (
                        <>
                            <EyeOff className="w-4 h-4" />
                            <span className="hidden sm:inline">Ocultar valores</span>
                        </>
                    ) : (
                        <>
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Revelar valores</span>
                        </>
                    )}
                </button>
            </div>

            <AIBanner />
            <EventBanner />
            <KPIGrid showValues={showValues} />

            {/* Espacio para gráficos y sistema más adelante */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-12">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm col-span-1 lg:col-span-2 min-h-[400px] flex flex-col items-center justify-center text-slate-400">
                    <p className="font-medium">Gráfico de Flujo de Caja Multisede en construcción...</p>
                    <span className="text-sm">Se integrará con Recharts próximamente.</span>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[400px] flex flex-col gap-4">
                    <h3 className="font-semibold text-slate-800">Estado del Sistema</h3>

                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="font-medium text-emerald-800 text-sm">Cloudflare Zero Trust</p>
                            <p className="text-xs text-emerald-600">Protección activa</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">100%</span>
                    </div>

                    <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl flex items-center justify-between opacity-80">
                        <div>
                            <p className="font-medium text-brand-800 text-sm">Database Backup</p>
                            <p className="text-xs text-brand-600">Último hace 2 horas</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
