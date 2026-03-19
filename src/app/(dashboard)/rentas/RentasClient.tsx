'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Calendar, User as UserIcon, CheckCircle2, AlertTriangle, ArrowRightLeft, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';
import { returnRenta } from './actions';

export default function RentasClient({ initialRentas }: { initialRentas: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleReturn = (id: string) => {
        if (!confirm('¿Confirmas que el equipo fue devuelto en buen estado?')) return;
        
        startTransition(async () => {
            try {
                await returnRenta(id);
                router.refresh(); // Reload data
            } catch (e) {
                alert('Error al devolver la renta');
            }
        });
    };

    function getStatusBadge(estado: string, fechaFinEsperada: Date) {
        if (estado === 'DEVUELTO') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5" /> Devuelto</span>;
        }

        const isOverdue = new Date() > new Date(fechaFinEsperada);
        if (isOverdue) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> Vencida</span>;
        }

        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#0500A3]"><Clock className="w-3.5 h-3.5" /> Activa</span>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <ArrowRightLeft className="w-8 h-8 text-[#0500A3]" />
                        Rentas de Equipos
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Control de arrendamiento de equipo médico a clínicas y doctores</p>
                </div>
                
                <Link 
                    href="/rentas/nueva"
                    className="flex items-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Renta
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Cliente</th>
                                <th className="px-5 py-4 font-semibold">Equipo Rentado</th>
                                <th className="px-5 py-4 font-semibold">Fechas</th>
                                <th className="px-5 py-4 font-semibold">Costo Total</th>
                                <th className="px-5 py-4 font-semibold">Estado</th>
                                <th className="px-5 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {initialRentas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="font-semibold text-lg text-slate-700">No hay rentas activas</p>
                                        <p className="text-sm mt-1">Presiona "Nueva Renta" para registrar un arrendamiento.</p>
                                    </td>
                                </tr>
                            ) : initialRentas.map(renta => (
                                <tr key={renta.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0500A3] flex items-center justify-center font-bold text-xs shrink-0">
                                                {renta.cliente?.nombre?.substring(0, 2).toUpperCase() || 'CX'}
                                            </div>
                                            <span className="truncate max-w-[150px]">{renta.cliente?.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-[#0500A3]">{renta.activoFijo?.descripcionCorta}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">S/N: {renta.activoFijo?.serie || 'N/A'}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <span className="text-slate-600"><span className="font-semibold text-slate-400">Sale:</span> {new Date(renta.fechaInicio).toLocaleDateString()}</span>
                                            <span className="text-slate-800 font-semibold"><span className="font-semibold text-slate-400">Vence:</span> {new Date(renta.fechaFinEsperada).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-emerald-700">L. {Number(renta.costoRenta).toLocaleString()}</div>
                                        {Number(renta.deposito) > 0 && <div className="text-[10px] text-slate-500 font-semibold">Depósito: L. {Number(renta.deposito).toLocaleString()}</div>}
                                    </td>
                                    <td className="px-5 py-4">
                                        {getStatusBadge(renta.estado, renta.fechaFinEsperada)}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        {renta.estado === 'ACTIVA' && (
                                            <button 
                                                onClick={() => handleReturn(renta.id)}
                                                disabled={isPending}
                                                className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                Marcar Devuelto
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
