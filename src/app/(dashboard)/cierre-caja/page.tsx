import React from 'react';
import { getActiveCajaSession, getHistorialCortes } from './actions';
import CierreCajaClient from './CierreCajaClient';

export const metadata = {
    title: 'Cierre de Caja Diario (Ventas) | Bioelectrónica',
    description: 'Módulo de arqueo y cierre diario de caja para ventas y rentas de equipos.',
};

export default async function CierreCajaPage() {
    const activeSession = await getActiveCajaSession();
    const history = await getHistorialCortes();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Cierre de Caja Diario (Ventas)
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Controla el flujo de caja diario comercial. Abre turnos, realiza arqueo de efectivo y genera reportes de rendimiento fidedignos.
                </p>
            </div>

            <CierreCajaClient 
                initialActiveSession={activeSession} 
                initialHistory={history} 
            />
        </div>
    );
}
