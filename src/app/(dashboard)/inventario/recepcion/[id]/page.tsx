import React from 'react';
import { notFound } from 'next/navigation';
import { getLoteRecepcionDetalle } from '../actions';
import ChecklistBodegaClient from '../ChecklistBodegaClient';

export const revalidate = 0;

export default async function ChecklistPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const resolvedParams = await params;
    const res = await getLoteRecepcionDetalle(resolvedParams.id);

    if (!res.success || !res.lote) {
        notFound();
    }

    return (
        <ChecklistBodegaClient 
            loteInitial={res.lote as any}
            usuarioNombre={res.usuarioNombre || 'Auxiliar de Bodega'}
            resumenInitial={res.resumen as any}
        />
    );
}
