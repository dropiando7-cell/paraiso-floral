import React from 'react';
import TomaFisicaClient from './TomaFisicaClient';
import { getDatosTomaFisica } from './actions';

export const metadata = {
    title: 'Toma de Inventario Físico | Paraíso Floral',
    description: 'Módulo táctil para conteo y conciliación física de cuartos fríos',
};

export default async function TomaFisicaPage() {
    const data = await getDatosTomaFisica();

    if (!data.success) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-600">Error cargando inventario</h1>
                <p className="text-slate-500 mt-2">{data.error}</p>
            </div>
        );
    }

    return (
        <TomaFisicaClient 
            initialItems={data.items || []} 
            usuarioNombre={data.usuarioNombre || 'Auditor'} 
        />
    );
}
