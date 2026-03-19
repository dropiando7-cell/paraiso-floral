'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Wrench, Plus, MoveRight, Receipt, 
    CheckCircle2, QrCode, Phone, Clock, AlertTriangle, MonitorSmartphone
} from 'lucide-react';
import { updateEstadoOrden, updateCostoReparacion } from './actions';

type Orden = any; // Tipado parcial

const COLUMNAS = [
    { id: 'RECIBIDO', title: 'Recibidos', color: 'border-slate-500', bg: 'bg-slate-50 text-slate-700' },
    { id: 'EN_EVALUACION', title: 'En Evaluación', color: 'border-yellow-500', bg: 'bg-yellow-50 text-yellow-700' },
    { id: 'ESPERANDO_APROBACION', title: 'Aprobación Pendiente', color: 'border-orange-500', bg: 'bg-orange-50 text-orange-700' },
    { id: 'LISTO_ENTREGA', title: 'Reparado / Listo', color: 'border-green-500', bg: 'bg-green-50 text-green-700' },
];

export default function SoporteClient({ initialData }: { initialData: Orden[] }) {
    const router = useRouter();
    const [ordenes, setOrdenes] = useState<Orden[]>(initialData);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const [modalCostoParams, setModalCostoParams] = useState<{ id: string, actual?: number } | null>(null);
    const [nuevoCosto, setNuevoCosto] = useState<string>('');

    const handleAvanzar = async (id: string, estadoActual: string) => {
        const nextIdx = COLUMNAS.findIndex(c => c.id === estadoActual) + 1;
        if (nextIdx >= COLUMNAS.length) return; // Ya está al final
        
        const nextState = COLUMNAS[nextIdx].id;
        
        // Si pasa a Aprobación, preguntar si quiere cotizar
        if (nextState === 'ESPERANDO_APROBACION') {
            const orden = ordenes.find(o => o.id === id);
            setModalCostoParams({ id, actual: orden?.costoReparacion || 0 });
            return;
        }

        await ejecutarAvance(id, nextState);
    };

    const ejecutarAvance = async (id: string, nextState: string) => {
        setLoadingId(id);
        try {
            await updateEstadoOrden(id, nextState);
            setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nextState } : o));
            router.refresh();
        } catch (e) {
            alert('Error actualizando el estado de la orden.');
        } finally {
            setLoadingId(null);
        }
    };

    const handleGuardarCosto = async () => {
        if (!modalCostoParams) return;
        const v = parseFloat(nuevoCosto);
        if (isNaN(v)) return alert('Ingrese un número válido');
        
        setLoadingId(modalCostoParams.id);
        try {
            await updateCostoReparacion(modalCostoParams.id, v);
            await ejecutarAvance(modalCostoParams.id, 'ESPERANDO_APROBACION');
            setModalCostoParams(null);
            setNuevoCosto('');
        } catch (e) {
            alert('Error al cotizar');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto relative min-h-screen">
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
                        const items = ordenes.filter(o => o.estado === col.id);
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
                                            <div key={orden.id} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative transition-opacity ${loadingId === orden.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                                        #{orden.codigoSeguridad}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
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

                                                <div className="mt-4 pt-3 flex justify-end gap-2 border-t border-slate-100">
                                                    {col.id !== 'LISTO_ENTREGA' ? (
                                                        <button 
                                                            onClick={() => handleAvanzar(orden.id, col.id)}
                                                            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            Avanzar <MoveRight className="w-3 h-3" />
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                                                            Listo <CheckCircle2 className="w-3 h-3" />
                                                        </div>
                                                    )}
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

            {/* Modal de Cotización */}
            {modalCostoParams && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Cotizar Reparación</h2>
                        <p className="text-sm text-slate-500 mb-4">Ingrese el costo base de la reparación. (Adicional a los L. 650 de revisión visual).</p>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Monto (Lempiras)</label>
                            <input
                                type="number"
                                placeholder="Ej: 1500"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800 text-xl"
                                value={nuevoCosto}
                                onChange={e => setNuevoCosto(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setModalCostoParams(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardarCosto}
                                disabled={!!loadingId}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                Guardar y Avanzar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
