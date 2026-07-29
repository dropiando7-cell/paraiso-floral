'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowLeft, Send } from 'lucide-react';
import { createOrdenTrabajo } from '../actions';
import ReceptionForm from '../components/ReceptionForm';
import QRGenerator from '../components/QRGenerator';

export default function NuevoSoporteClient({ userId, clientes = [], users = [] }: { userId: string, clientes?: any[], users?: any[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [result, setResult] = useState<any>(null);

    // Obtener parámetros de prellenado desde la URL
    const prefilledData = {
        clienteId: searchParams.get('clienteId') || '',
        clienteNombre: searchParams.get('clienteNombre') || '',
        equipoDano: searchParams.get('equipoDano') || '',
        marca: searchParams.get('marca') || '',
        modelo: searchParams.get('modelo') || '',
        serie: searchParams.get('serie') || '',
        tipo: searchParams.get('tipo') || '',
        activoId: searchParams.get('activoId') || '',
        tipoOrden: searchParams.get('tipoOrden') || 'TALLER',
        requiereAprobacion: searchParams.get('requiereAprobacion') !== 'false'
    };

    const handleSave = async (data: any) => {
        // inject user ID
        const finalData = { 
            ...data, 
            usuarioRecepcionId: userId,
            activoId: prefilledData.activoId || data.activoId,
            tipoOrden: prefilledData.tipoOrden || data.tipoOrden,
            requiereAprobacion: prefilledData.requiereAprobacion
        };
        const orden = await createOrdenTrabajo(finalData);
        setResult(orden);
    };

    if (result) {
        // Pantalla de Éxito
        // Pantalla de Éxito

        return (
            <div className="p-8 max-w-2xl mx-auto min-h-[80vh] flex flex-col items-center justify-center text-center">
                <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center w-full animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">¡Equipo Recepcionado!</h2>
                    <p className="text-slate-500 mt-2 mb-8">La orden de trabajo ha sido generada con éxito. Cargo a aplicar: L. {result?.costoRevision}.</p>

                    <div className="w-full max-w-sm mb-8 text-left">
                        <QRGenerator 
                            orderId={result.codigoSeguridad} 
                            serie={result.serie || "N/A"} 
                            cliente={result.cliente?.nombre || result.cliente || ""} 
                            equipo={result.equipoDano}
                            marcaModelo={result.marcaModelo || ""}
                            fecha={new Date().toLocaleDateString("es-HN")}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button 
                            onClick={() => {
                                setResult(null);
                                router.refresh(); // Refresh to get the updated clients list
                            }}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            Registrar Nueva Orden
                        </button>
                        <button 
                            onClick={() => router.push('/soporte')}
                            className="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-xl transition-colors"
                        >
                            Volver al Taller
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-0 py-4 md:p-8 max-w-6xl mx-auto">
            <button 
                onClick={() => router.push('/soporte')}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-6 font-medium transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Volver al Taller
            </button>
            <ReceptionForm onSave={handleSave} clientes={clientes} users={users} prefilledData={prefilledData} />
        </div>
    );
}
