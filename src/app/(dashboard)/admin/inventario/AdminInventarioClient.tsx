'use client';

import { useState, useTransition } from 'react';
import { Loader2, Unlock, Lock, Clock, CheckCircle2, User, Eye } from 'lucide-react';
import { reopenArea } from '@/app/(dashboard)/inventario/actions';

type AreaStatus = {
    id: string;
    areaCode: string;
    qrCode: string;
    status: string;
    openedBy?: { email: string } | null;
    closedBy?: { email: string } | null;
    approvedBy?: { email: string } | null;
    openedAt?: Date | null;
    closedAt?: Date | null;
};

export default function AdminInventarioClient({ initialStatuses, dbAreas = [] }: { initialStatuses: any[], dbAreas?: any[] }) {
    const [statuses, setStatuses] = useState<AreaStatus[]>(initialStatuses);
    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleReopen = (areaCode: string) => {
        if (!confirm('¿Estás seguro de autorizar la re-apertura de esta área? Cualquier usuario podrá volver a escanear el QR y registrar activos.')) return;

        setLoadingId(areaCode);
        startTransition(async () => {
            try {
                await reopenArea(areaCode);
                // Actualizar localmente para respuesta rápida sin recargar
                setStatuses(prev => prev.map(s =>
                    s.areaCode === areaCode
                        ? { ...s, status: 'IN_PROGRESS' }
                        : s
                ));
            } catch (error) {
                alert('Ocurrió un error al reabrir el área.');
            } finally {
                setLoadingId(null);
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">Estado de Áreas de Inventario</h2>
                <p className="text-sm text-slate-500">Visualiza qué áreas ya fueron inventariadas y cerradas, y autoriza su reapertura si quedaron pendientes activos por registrar.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3">Área / Ubicación</th>
                            <th className="px-5 py-3">Código QR</th>
                            <th className="px-5 py-3">Estado</th>
                            <th className="px-5 py-3">Usuarios involucrados</th>
                            <th className="px-5 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {statuses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                                    <Clock className="w-8 h-8 animate-pulse mx-auto mb-2 opacity-50" />
                                    No hay áreas registradas por el momento.<br />
                                    <span className="text-xs">El estado aparecerá cuando un usuario escanee una llave QR por primera vez.</span>
                                </td>
                            </tr>
                        ) : (
                            statuses.map((s) => {
                                const foundArea = dbAreas.find(a => a.name === s.areaCode);
                                const areaName = foundArea ? (foundArea.description ? `${foundArea.name} — ${foundArea.description}` : foundArea.name) : s.areaCode;
                                const isCompleted = s.status === 'COMPLETED';

                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4 font-medium text-slate-800">
                                            {areaName}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                {s.qrCode}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {isCompleted ? (
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                                                    <Lock className="w-3.5 h-3.5" /> Cerrado / Completado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-[#0500A3] px-3 py-1 rounded-full text-xs font-bold">
                                                    <Unlock className="w-3.5 h-3.5" /> Abierto / En progreso
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-xs">
                                            <div className="flex flex-col gap-1 text-slate-500">
                                                {s.openedBy && (
                                                    <div className="flex items-center gap-1.5" title="Abierto por">
                                                        <Unlock className="w-3 h-3 text-blue-500" /> {s.openedBy.email}
                                                    </div>
                                                )}
                                                {s.closedBy && (
                                                    <div className="flex items-center gap-1.5" title="Cerrado por">
                                                        <Lock className="w-3 h-3 text-emerald-600" /> {s.closedBy.email}
                                                    </div>
                                                )}
                                                {s.approvedBy && (
                                                    <div className="flex items-center gap-1.5" title="Reabierto por">
                                                        <CheckCircle2 className="w-3 h-3 text-purple-500" /> {s.approvedBy.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`/inventario?area=${encodeURIComponent(s.areaCode)}`}
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 border-2 border-transparent text-slate-700 font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Ver Activos
                                                </a>
                                                {isCompleted && (
                                                    <button
                                                        disabled={isPending && loadingId === s.areaCode}
                                                        onClick={() => handleReopen(s.areaCode)}
                                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-[#0500A3]/20 text-[#0500A3] font-bold rounded-xl hover:bg-blue-50 hover:border-[#0500A3]/40 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        {isPending && loadingId === s.areaCode ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Unlock className="w-4 h-4" />
                                                        )}
                                                        Reabrir Área
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
