import React from 'react';
import TomaFisicaDetalleClient from './TomaFisicaDetalleClient';
import { getAuditoriaInventarioDetalle } from '../actions';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params;
    return {
        title: `Detalle Auditoría Físicas | Paraíso Floral`,
        description: `Visualización y conteo de la toma física con ID ${id}`,
    };
}

export default async function TomaFisicaDetailPage({ params }: PageProps) {
    const { id } = await params;
    const data = await getAuditoriaInventarioDetalle(id);

    if (!data.success || !data.auditoria) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-600">Error cargando auditoría</h1>
                <p className="text-slate-500 mt-2">{data.error || 'La auditoría solicitada no existe.'}</p>
            </div>
        );
    }

    return (
        <TomaFisicaDetalleClient 
            initialItems={data.items || []} 
            auditoria={data.auditoria}
            usuarioNombre={data.usuarioNombre || 'Auditor'}
            isAdmin={data.isAdmin || false}
        />
    );
}
