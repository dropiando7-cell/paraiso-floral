'use client';

import React from 'react';
import { ArrowRightLeft, Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export function KardexClient({ productos, movimientos }: any) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentProducto = searchParams.get('producto') || '';

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value) {
            router.push(`/inventario/kardex?producto=${e.target.value}`);
        } else {
            router.push(`/inventario/kardex`);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        <ArrowRightLeft className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Kardex de Movimientos</h1>
                        <p className="text-sm text-slate-500 mt-1">Bitácora completa y auditable de entradas y salidas.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
                    <Filter className="w-4 h-4 text-slate-400 ml-2" />
                    <select 
                        value={currentProducto}
                        onChange={handleFilterChange}
                        className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 w-[200px] md:w-[300px] cursor-pointer"
                    >
                        <option value="">Todos los productos...</option>
                        {productos.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.sku} - {p.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Fecha / Hora</th>
                                <th className="px-6 py-4 font-semibold">Tipo</th>
                                <th className="px-6 py-4 font-semibold">Producto</th>
                                <th className="px-6 py-4 font-semibold text-right">Cant.</th>
                                <th className="px-6 py-4 font-semibold">Motivo / Ref</th>
                                <th className="px-6 py-4 font-semibold">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No se encontraron movimientos registrados.
                                    </td>
                                </tr>
                            ) : (
                                movimientos.map((mov: any) => (
                                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            {new Date(mov.createdAt).toLocaleDateString('es-HN')}
                                            <span className="ml-2 text-xs text-slate-400 font-mono">
                                                {new Date(mov.createdAt).toLocaleTimeString('es-HN', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {mov.tipoMovimiento === 'ENTRADA' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-100/50 text-emerald-700 border border-emerald-200/50">ENTRADA</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase bg-rose-100/50 text-rose-700 border border-rose-200/50">SALIDA</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-800">{mov.producto?.nombre}</p>
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">{mov.producto?.sku}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex font-bold px-2 py-0.5 rounded ${mov.tipoMovimiento === 'ENTRADA' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {mov.tipoMovimiento === 'ENTRADA' ? '+' : '-'}{mov.cantidad}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-700 text-sm">{mov.motivo}</p>
                                            {mov.referencia && <p className="text-xs text-slate-400 mt-1 font-mono">{mov.referencia}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
                                                    {mov.usuario?.email?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-slate-600 text-sm">
                                                    {mov.usuario?.email?.split('@')[0]}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
