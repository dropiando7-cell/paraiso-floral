import React from 'react';
import GarantiasClient from './GarantiasClient';
import { getHistorialGarantias } from './actions';

export const dynamic = 'force-dynamic';

export default async function GarantiasPage() {
    const logs = await getHistorialGarantias();

    return (
        <GarantiasClient inicialLogs={logs} />
    );
}
