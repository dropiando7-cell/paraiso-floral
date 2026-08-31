import React from 'react';
import { getLotesRecepcion } from './actions';
import RecepcionListClient from './RecepcionListClient';

export const revalidate = 0;

export default async function RecepcionPage() {
    const res = await getLotesRecepcion();
    const lotes = res.success ? (res.lotes || []) : [];

    return <RecepcionListClient lotes={lotes} />;
}
