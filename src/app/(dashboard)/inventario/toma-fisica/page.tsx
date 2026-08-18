import React from 'react';
import AuditoriasListClient from './AuditoriasListClient';
import { getAuditoriasInventario } from './actions';

export const metadata = {
    title: 'Auditorías de Inventario Físico | Paraíso Floral',
    description: 'Historial y control de tomas físicas de flores en cuartos fríos',
};

export default async function TomaFisicaListPage() {
    const data = await getAuditoriasInventario();

    if (!data.success) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-600">Error cargando auditorías</h1>
                <p className="text-slate-500 mt-2">{data.error}</p>
            </div>
        );
    }

    return (
        <AuditoriasListClient 
            initialAuditorias={data.auditorias || []} 
            isAdmin={data.isAdmin || false}
        />
    );
}
