import React from 'react';
import { getGraficasReportData } from './actions';
import GraficasClient from './GraficasClient';

export default async function GraficasPage() {
    // Default to current calendar month & year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let initialData = null;
    try {
        initialData = await getGraficasReportData(currentMonth, currentYear);
    } catch (e) {
        console.error("Error loading initial graficas data server-side:", e);
    }

    return (
        <GraficasClient 
            initialData={initialData} 
            initialMonth={currentMonth} 
            initialYear={currentYear} 
        />
    );
}
