'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Calendar, User as UserIcon, CheckCircle2, AlertTriangle, ArrowRightLeft, DollarSign, Clock, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { returnRenta, editRenta } from './actions';

export default function RentasClient({ initialRentas }: { initialRentas: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [editingRenta, setEditingRenta] = useState<any | null>(null);
    const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);

    const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            tipoAlquiler: formData.get('tipoAlquiler') as string,
            mesesRenta: Number(formData.get('mesesRenta')),
            costoRenta: Number(formData.get('costoRenta')),
            deposito: Number(formData.get('deposito')),
            fechaFinEsperada: new Date(formData.get('fechaFinEsperada') as string),
        };

        startTransition(async () => {
            try {
                await editRenta(editingRenta.id, payload);
                setEditingRenta(null);
                router.refresh();
            } catch (e) {
                alert('Error al actualizar la renta');
            }
        });
    };

    const handleReturn = (id: string) => {
        setConfirmReturnId(id);
    };

    const confirmAndExecuteReturn = () => {
        if (!confirmReturnId) return;
        startTransition(async () => {
            try {
                await returnRenta(confirmReturnId);
                setConfirmReturnId(null);
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

        const tresDias = new Date();
        tresDias.setDate(tresDias.getDate() + 3);
        const isExpiringSoon = new Date(fechaFinEsperada) <= tresDias;

        if (isExpiringSoon) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700"><AlertTriangle className="w-3.5 h-3.5" /> Por Vencer</span>;
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
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link 
                        href="/rentas/equipos"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                        <Package className="w-5 h-5" />
                        Equipos
                    </Link>
                    <Link 
                        href="/rentas/nueva"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Renta
                    </Link>
                </div>
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setEditingRenta(renta)}
                                                    className="text-slate-500 hover:text-[#0500A3] p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                                    title="Editar Renta"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleReturn(renta.id)}
                                                    disabled={isPending}
                                                    className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    Marcar Devuelto
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingRenta && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-[#0500A3]" /> Editar Renta
                            </h3>
                            <button onClick={() => setEditingRenta(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Alquiler</label>
                                    <select name="tipoAlquiler" defaultValue={editingRenta.tipoAlquiler} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]">
                                        <option value="Quincenal">Quincenal</option>
                                        <option value="Mensual">Mensual</option>
                                        <option value="Anual">Anual</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Meses/Periodos</label>
                                    <input type="number" name="mesesRenta" defaultValue={editingRenta.mesesRenta} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Costo Total (L.)</label>
                                    <input type="number" name="costoRenta" defaultValue={editingRenta.costoRenta} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 outline-none focus:border-[#0500A3]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Depósito (L.)</label>
                                    <input type="number" name="deposito" defaultValue={editingRenta.deposito} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Esperada de Devolución</label>
                                <input type="date" name="fechaFinEsperada" defaultValue={new Date(editingRenta.fechaFinEsperada).toISOString().split('T')[0]} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditingRenta(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={isPending} className="bg-[#0500A3] hover:bg-blue-800 text-white px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-50">
                                    {isPending ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirmation Return Modal */}
            {confirmReturnId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all border border-slate-100">
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2.5 rounded-full shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Confirmar Devolución</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 text-[15px] leading-relaxed">
                                ¿Confirmas que el equipo médico fue devuelto por el cliente en <strong className="text-slate-800">buen estado</strong> y completo?
                            </p>
                            <p className="text-sm text-slate-500 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                Al confirmar, la renta se marcará como devuelta y el equipo estará nuevamente disponible en el catálogo de equipos para renta.
                            </p>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setConfirmReturnId(null)}
                                    disabled={isPending}
                                    className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors active:scale-95 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmAndExecuteReturn}
                                    disabled={isPending}
                                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5" />
                                    )}
                                    {isPending ? 'Confirmando...' : 'Sí, Equipo Devuelto'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
