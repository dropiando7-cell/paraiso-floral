'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Calendar, DollarSign, Text } from 'lucide-react';
import Link from 'next/link';
import { createRenta } from '../actions2';

export default function NuevaRentaClient({ clientes, equipos }: { clientes: any[], equipos: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        
        startTransition(async () => {
            try {
                await createRenta(fd);
                router.push('/rentas');
                router.refresh();
            } catch (err) {
                alert('Error al crear la renta');
            }
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-24">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/rentas" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Nueva Renta de Equipo</h1>
                        <p className="text-sm text-slate-500">Asigna un equipo del inventario a un cliente.</p>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                        
                        {/* 1. Selección */}
                        <div className="space-y-5">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">1. Asignaciones</h2>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Cliente / Doctor <span className="text-red-500">*</span></label>
                                    <select name="clienteId" required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold">
                                        <option value="">Selecciona un cliente...</option>
                                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Equipo Médico <span className="text-red-500">*</span></label>
                                    <select name="activoFijoId" required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold">
                                        <option value="">Selecciona un equipo disponible...</option>
                                        {equipos.map(e => <option key={e.id} value={e.id}>{e.descripcionCorta} {e.serie ? `(S/N: ${e.serie})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. Fechas */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">2. Plazos</h2>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Fecha de Entrega Esperada <span className="text-red-500">*</span></label>
                                    <input type="date" name="fechaFinEsperada" required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                            </div>
                        </div>

                        {/* 3. Costos */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-400">3. Financiero</h2>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /> Costo Total Renta (L.) <span className="text-red-500">*</span></label>
                                    <input type="number" step="0.01" name="costoRenta" required min="0" placeholder="Ej. 1500" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-bold text-emerald-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /> Depósito en Garantía (L.)</label>
                                    <input type="number" step="0.01" name="deposito" min="0" defaultValue="0" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-semibold" />
                                </div>
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-5 pt-6 border-t border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Text className="w-4 h-4 text-slate-400" /> Notas y Condiciones Adicionales</label>
                            <textarea name="notas" rows={3} placeholder="Condición del equipo al entregar, accesorios incluidos..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:border-slate-300 focus:bg-white transition-colors outline-none font-medium"></textarea>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full md:w-auto flex justify-center items-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                            >
                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {isPending ? 'Guardando Registro...' : 'Confirmar Renta'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
