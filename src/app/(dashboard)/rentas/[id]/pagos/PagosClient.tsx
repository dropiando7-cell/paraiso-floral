'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Calendar, DollarSign, Plus, Trash2, FileText, CheckCircle2, Edit, X } from 'lucide-react';
import Link from 'next/link';
import { registrarPagoRenta, eliminarPagoRenta, editarPagoRenta } from './actions';

export default function PagosClient({ renta }: { renta: any }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
    const [editModalOpen, setEditModalOpen] = useState<any | null>(null);

    const [monto, setMonto] = useState('');
    const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().split('T')[0]);
    const [metodoPago, setMetodoPago] = useState('Transferencia');

    // Cálculos
    const msPerDay = 1000 * 60 * 60 * 24;
    const startDate = new Date(renta.fechaInicio);
    const endDate = renta.fechaDevolucion ? new Date(renta.fechaDevolucion) : new Date();
    
    // Si la fecha de inicio es en el futuro, no ha transcurrido nada
    const diasTranscurridos = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay));
    // Promedio de días por mes
    const mesesTranscurridos = +(diasTranscurridos / 30.44).toFixed(2);
    
    const pagoMensual = renta.costoRenta / renta.mesesRenta;
    const deudaEstimada = mesesTranscurridos * pagoMensual;
    const totalPagado = renta.pagos.reduce((acc: number, p: any) => acc + Number(p.monto), 0);
    const saldoPendiente = Math.max(0, deudaEstimada - totalPagado); // No mostramos saldo negativo si pagan por adelantado, o sí?
    const pagoAdelantado = totalPagado > deudaEstimada ? totalPagado - deudaEstimada : 0;

    async function handleAddPago(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.append('rentaId', renta.id);
        
        startTransition(async () => {
            try {
                await registrarPagoRenta(fd);
                setMonto('');
                setFechaPago(new Date().toISOString().split('T')[0]);
            } catch (err: any) {
                alert(err.message || 'Error al registrar pago');
            }
        });
    }

    async function handleDeleteConfirm() {
        if (!deleteModalOpen) return;
        setIsDeleting(deleteModalOpen);
        try {
            await eliminarPagoRenta(deleteModalOpen, renta.id);
            setDeleteModalOpen(null);
        } catch (err: any) {
            alert(err.message || 'Error al eliminar pago');
        } finally {
            setIsDeleting(null);
        }
    }

    async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editModalOpen) return;
        const fd = new FormData(e.currentTarget);
        fd.append('rentaId', renta.id);
        
        startTransition(async () => {
            try {
                await editarPagoRenta(editModalOpen.id, fd);
                setEditModalOpen(null);
            } catch (err: any) {
                alert(err.message || 'Error al editar pago');
            }
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 p-0 sm:p-4 md:p-6 pb-24">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center gap-4 pt-6 px-4 sm:pt-0 sm:px-0">
                    <Link href="/rentas" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Estado de Cuenta de Renta</h1>
                        <p className="text-xs sm:text-sm text-slate-500">{renta.cliente?.nombre} - {renta.activoFijo?.descripcionCorta}</p>
                    </div>
                </div>

                <div className="space-y-6 px-4 sm:px-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        {/* Panel Izquierdo: Analíticas */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-full">
                            <div className="space-y-6">
                                <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">Resumen Financiero</h2>
                                
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-600">Tiempo Transcurrido</span>
                                        <span className="font-bold text-slate-800">{mesesTranscurridos} meses</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-600">Deuda Calculada</span>
                                        <span className="font-bold text-slate-800">L. {deudaEstimada.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-emerald-700">Total Pagado</span>
                                        <span className="font-bold text-emerald-700">L. {totalPagado.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    </div>
                                    {pagoAdelantado > 0 ? (
                                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                                            <span className="text-sm font-bold text-blue-700">Saldo a Favor</span>
                                            <span className="font-black text-xl text-blue-700">L. {pagoAdelantado.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex justify-between items-center">
                                            <span className="text-sm font-bold text-red-700">Saldo Pendiente</span>
                                            <span className="font-black text-xl text-red-700">L. {saldoPendiente.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-2 mt-6">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Inicio de Renta:</span>
                                    <span className="font-medium text-slate-700">{new Date(renta.fechaInicio).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Cuota Mensual Base:</span>
                                    <span className="font-medium text-slate-700">L. {pagoMensual.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Depósito Entregado:</span>
                                    <span className="font-medium text-slate-700">L. {renta.deposito.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                            </div>
                        </div>

                        {/* Nuevo Pago */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-full">
                            <div>
                                <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400 mb-4 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Registrar Nuevo Abono
                                </h2>
                                <form onSubmit={handleAddPago} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Monto (L.) *</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                name="monto" 
                                                value={monto} 
                                                onChange={e => setMonto(e.target.value)}
                                                required 
                                                min="0.01"
                                                placeholder="Ej. 3500" 
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold text-emerald-700 focus:border-[#0500A3]" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Pago *</label>
                                            <input 
                                                type="date" 
                                                name="fechaPago" 
                                                value={fechaPago} 
                                                onChange={e => setFechaPago(e.target.value)}
                                                required 
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago</label>
                                            <select 
                                                name="metodoPago" 
                                                value={metodoPago} 
                                                onChange={e => setMetodoPago(e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]"
                                            >
                                                <option value="Efectivo">Efectivo</option>
                                                <option value="Transferencia">Transferencia</option>
                                                <option value="Tarjeta">Tarjeta</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="Link de pago de Occidente">Link de pago de Occidente</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Referencia / Recibo</label>
                                            <input 
                                                type="text" 
                                                name="referencia" 
                                                placeholder="Nº Transferencia o cheque..." 
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Notas</label>
                                        <input 
                                            type="text" 
                                            name="notas" 
                                            placeholder="Ej. Pago correspondiente al mes de Febrero..." 
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className="flex items-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70"
                                        >
                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Registrar Abono
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Historial */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Historial de Pagos Recibidos
                            </h2>
                        </div>
                        
                        {renta.pagos.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                No hay pagos registrados para esta renta.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Monto</th>
                                            <th className="px-6 py-4">Método</th>
                                            <th className="px-6 py-4">Referencia / Notas</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {renta.pagos.map((pago: any) => (
                                            <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-700">
                                                        {new Date(pago.fechaPago).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-emerald-700">
                                                        L. {Number(pago.monto).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded inline-block">
                                                        {pago.metodoPago}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-700">{pago.referencia || '-'}</div>
                                                    <div className="text-xs text-slate-500 mt-1">{pago.notas}</div>
                                                    {(pago.creadoPor || pago.modificadoPor) && (
                                                        <div className="text-[10px] text-slate-400 mt-2 space-y-0.5">
                                                            {pago.creadoPor && <div>Registrado por: <span className="font-medium text-slate-500">{pago.creadoPor.nombre} {pago.creadoPor.apellido}</span></div>}
                                                            {pago.modificadoPor && <div>Editado por: <span className="font-medium text-slate-500">{pago.modificadoPor.nombre} {pago.modificadoPor.apellido}</span></div>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-1">
                                                        <button 
                                                            onClick={() => setEditModalOpen(pago)}
                                                            className="text-slate-400 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors"
                                                            title="Editar Abono"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => setDeleteModalOpen(pago.id)}
                                                            disabled={isDeleting === pago.id}
                                                            className="text-slate-400 hover:text-red-500 p-2 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                                                            title="Eliminar Abono"
                                                        >
                                                            {isDeleting === pago.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Eliminar */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar Abono</h3>
                        <p className="text-sm text-slate-600 mb-6">¿Estás seguro de eliminar este pago? Esta acción recalculará los saldos de la renta y no se puede deshacer.</p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDeleteModalOpen(null)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting === deleteModalOpen}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                                {isDeleting === deleteModalOpen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Eliminar Abono
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición */}
            {editModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-0 animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Edit className="w-5 h-5 text-blue-600" /> Editar Abono
                            </h3>
                            <button type="button" onClick={() => setEditModalOpen(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Monto (L.) *</label>
                                    <input 
                                        type="number" step="0.01" name="monto" required min="0.01"
                                        defaultValue={editModalOpen.monto}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold text-emerald-700 focus:border-[#0500A3]" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Pago *</label>
                                    <input 
                                        type="date" name="fechaPago" required 
                                        defaultValue={new Date(editModalOpen.fechaPago).toISOString().split('T')[0]}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago</label>
                                    <select 
                                        name="metodoPago" 
                                        defaultValue={editModalOpen.metodoPago}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]"
                                    >
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Link de pago de Occidente">Link de pago de Occidente</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Referencia / Recibo</label>
                                    <input 
                                        type="text" name="referencia" 
                                        defaultValue={editModalOpen.referencia}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Notas</label>
                                <input 
                                    type="text" name="notas" 
                                    defaultValue={editModalOpen.notas}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold focus:border-[#0500A3]" 
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(null)}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="flex items-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
