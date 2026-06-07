'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Wrench, Plus, MoveRight, Receipt, 
    CheckCircle2, QrCode, Phone, Clock, AlertTriangle, MonitorSmartphone
} from 'lucide-react';

type Orden = any; // Tipado parcial

const COLUMNAS = [
    { id: 'RECIBIDO', title: 'Recibidos', color: 'border-slate-500', bg: 'bg-slate-50 text-slate-700' },
    { id: 'EN_EVALUACION', title: 'En Evaluación', color: 'border-yellow-500', bg: 'bg-yellow-50 text-yellow-700' },
    { id: 'ESPERANDO_APROBACION', title: 'Presupuesto', color: 'border-orange-500', bg: 'bg-orange-50 text-orange-700' },
    { id: 'APROBACION_PRESUPUESTO', title: 'Aprobación Cliente', color: 'border-pink-500', bg: 'bg-pink-50 text-pink-700' },
    { id: 'REPARACION', title: 'En Reparación', color: 'border-blue-500', bg: 'bg-blue-50 text-blue-700' },
    { id: 'LISTO_ENTREGA', title: 'Reparado / Listo', color: 'border-green-500', bg: 'bg-green-50 text-green-700' },
];

export default function SoporteClient({ initialData }: { initialData: Orden[] }) {
    const router = useRouter();
    const [ordenes, setOrdenes] = useState<Orden[]>(initialData);

    return (
        <div className="px-0 py-4 md:p-8 max-w-[1600px] mx-auto relative min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Wrench className="w-8 h-8 text-blue-600" />
                        Soporte Técnico y Taller
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Órdenes de trabajo, reparaciones y mantenimiento de equipo.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/soporte/escaner')}
                        className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <QrCode className="w-5 h-5" />
                        Escáner de Salida
                    </button>
                    <button
                        onClick={() => router.push('/soporte/nuevo')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm shadow-blue-200"
                    >
                        <Plus className="w-5 h-5" />
                        Recepcionar Equipo
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-[1200px]">
                    {COLUMNAS.map(col => {
                        const items = ordenes.filter(o => {
                            if (col.id === 'EN_EVALUACION') {
                                return o.estado === 'EN_EVALUACION' || o.estado === 'EN_DIAGNOSTICO';
                            }
                            if (col.id === 'REPARACION') {
                                return o.estado === 'REPARACION' || o.estado === 'EN_REPARACION';
                            }
                            return o.estado === col.id;
                        });
                        return (
                            <div key={col.id} className="flex-1 min-w-[300px] bg-slate-50/50 rounded-2xl p-4 border border-slate-200 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`text-sm font-bold uppercase tracking-wider ${col.bg} px-3 py-1 rounded-full border ${col.color}`}>
                                        {col.title} ({items.length})
                                    </h3>
                                </div>
                                <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[650px] custom-scrollbar">
                                    {items.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl">
                                            No hay equipos aquí
                                        </div>
                                    ) : (
                                        items.map(orden => (
                                            <div key={orden.id} onClick={() => router.push(`/soporte/${orden.id}`)} className={`group bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative transition-all hover:shadow-md cursor-pointer hover:border-indigo-300`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                                        #{orden.codigoSeguridad}
                                                    </span>
                                                    <span suppressHydrationWarning className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(orden.fechaRecibido).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2 mt-1">
                                                    <MonitorSmartphone className="w-4 h-4 text-blue-500 shrink-0" />
                                                    {orden.equipoDano}
                                                </div>
                                                <div className="text-xs font-medium text-slate-500 mt-1 max-w-[250px] truncate">
                                                    Cliente: <span className="text-slate-700">{orden.cliente?.nombre}</span>
                                                </div>
                                                
                                                {/* Precios si esta en cotizacion */}
                                                {(orden.costoReparacion || orden.costoRevision) && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs font-semibold">
                                                        <div><span className="text-slate-400">Rev:</span> <span className="text-slate-700">L. {orden.costoRevision}</span></div>
                                                        {orden.costoReparacion > 0 && (
                                                            <div><span className="text-blue-500">Rep:</span> <span className="text-slate-800">L. {orden.costoReparacion}</span></div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="mt-4 pt-3 text-center border-t border-slate-100/50">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">Ver Detalles →</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
