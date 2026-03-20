'use client';

import React, { useState, useTransition } from 'react';
import { registrarSalida } from './actions';
import { PackageMinus, Info, Check, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export function SalidasClient({ productos, recientes, orgId, userId }: any) {
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        productoId: '',
        cantidad: 1,
        motivo: 'Consumo Interno / Taller',
        referencia: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.productoId) {
            toast.error("Por favor seleccione un producto.");
            return;
        }
        
        startTransition(async () => {
             const res = await registrarSalida(orgId, userId, formData.productoId, formData.cantidad, formData.motivo, formData.referencia);
            if (res.success) {
                toast.success("Salida registrada y stock descontado.");
                setFormData({ ...formData, cantidad: 1, referencia: '' });
                // Note: The parent component will re-fetch data thanks to revalidatePath
            } else {
                toast.error(res.error || "Ocurrió un error");
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
                <div className="p-2 bg-rose-100 rounded-xl">
                    <PackageMinus className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registro de Salidas</h1>
                    <p className="text-sm text-slate-500 mt-1">Descuenta mercancía de la bodega por venta o consumo interno.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORM PANEL */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Send className="w-4 h-4 text-slate-400" /> Nueva Salida
                        </h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">
                        
                        <div className="space-y-1.5 flex flex-col">
                            <label className="text-sm font-medium text-slate-700">Producto / Modelo</label>
                            {productos.length === 0 ? (
                                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 text-center">
                                    No hay productos con stock disponible.
                                </div>
                            ) : (
                                <select 
                                    required
                                    value={formData.productoId}
                                    onChange={(e) => setFormData({...formData, productoId: e.target.value})}
                                    className="w-full rounded-xl border-slate-200 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm h-11 px-3 bg-white"
                                >
                                    <option value="" disabled>Seleccionar producto...</option>
                                    {productos.map((p: any) => (
                                        <option key={p.id} value={p.id}>
                                            {p.sku} - {p.nombre} (Disp: {p.stockActual})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-sm font-medium text-slate-700">Cantidad</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    required
                                    value={formData.cantidad}
                                    onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value) || 0})}
                                    className="w-full rounded-xl border-slate-200 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm h-11 px-3"
                                />
                            </div>
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-sm font-medium text-slate-700">Ref. (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="OT #45"
                                    value={formData.referencia}
                                    onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                                    className="w-full rounded-xl border-slate-200 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm h-11 px-3"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 flex flex-col">
                            <label className="text-sm font-medium text-slate-700">Motivo del Descargo</label>
                            <input 
                                type="text" 
                                required
                                value={formData.motivo}
                                onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                                className="w-full rounded-xl border-slate-200 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm h-11 px-3"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isPending || productos.length === 0}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-sm
                                ${isPending || productos.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 hover:shadow-md hover:shadow-rose-500/20 active:scale-[0.98]'}`}
                        >
                            {isPending ? 'Procesando...' : 'Descontar Stock'}
                            {!isPending && <Check className="w-4 h-4" />}
                        </button>
                    </form>
                </div>

                {/* RECENT MOVEMENTS PANEL */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Info className="w-4 h-4 text-slate-400" /> Últimos Descargos
                        </h2>
                        {recientes.length > 0 && (
                            <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                                Últimos {recientes.length}
                            </span>
                        )}
                    </div>
                    
                    {recientes.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                                <PackageMinus className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 text-sm font-medium">No hay salidas registradas aún.</p>
                            <p className="text-slate-400 text-xs mt-1">Registra la primera salida usando el panel izquierdo.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                                    <tr>
                                        <th className="px-5 py-3.5 font-semibold">Fecha</th>
                                        <th className="px-5 py-3.5 font-semibold">Producto</th>
                                        <th className="px-5 py-3.5 font-semibold text-right">Cant.</th>
                                        <th className="px-5 py-3.5 font-semibold hidden md:table-cell">Motivo / Ref</th>
                                        <th className="px-5 py-3.5 font-semibold hidden xl:table-cell">Usuario</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recientes.map((mov: any) => (
                                        <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                                                {new Date(mov.createdAt).toLocaleDateString('es-HN')}
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(mov.createdAt).toLocaleTimeString('es-HN', {hour: '2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-slate-800 line-clamp-1">{mov.producto?.nombre}</p>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">{mov.producto?.sku}</p>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200">
                                                    -{mov.cantidad}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <p className="text-slate-700 truncate max-w-[150px] md:max-w-[200px] text-sm">{mov.motivo}</p>
                                                {mov.referencia && <p className="text-[11px] text-slate-400 font-mono mt-0.5">Ref: {mov.referencia}</p>}
                                            </td>
                                            <td className="px-5 py-3 hidden xl:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200">
                                                        {mov.usuario?.email?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <span className="text-slate-500 text-xs truncate max-w-[120px]">
                                                        {mov.usuario?.email?.split('@')[0]}
                                                    </span>
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
    );
}
