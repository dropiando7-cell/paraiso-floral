'use client';

import { useState, useEffect, useTransition } from 'react';
import { getActivosPorReclasificar, getResumenReclasificacion, setEquipoMenor, getReporteEquipoMenor } from './actions';
import { calcDepreciacion } from '@/lib/depreciation';
import { PackageOpen, ArrowDownToLine, Loader2, RefreshCcw, FileText, CheckCircle2, Filter, LayoutGrid, List } from 'lucide-react';

export default function ReclasificacionClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [items, setItems] = useState<any[]>([]);
    const [resumen, setResumen] = useState({ equipoMenor: { cantidad: 0, total: 0 }, pendientesDeRevisar: { cantidad: 0, total: 0 } });
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [view, setView] = useState<'bandeja' | 'reporte'>('bandeja');
    
    // Layout Preferencia
    const [layout, setLayout] = useState<'grid' | 'list'>('grid');

    // Filtros dinámicos
    const [umbral, setUmbral] = useState(2000);
    const [operador, setOperador] = useState<'lte' | 'gte'>('lte');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reporteItems, setReporteItems] = useState<any[]>([]);
    const [isReporteLoading, setIsReporteLoading] = useState(false);

    async function loadData() {
        setIsLoading(true);
        const [res, pends] = await Promise.all([
            getResumenReclasificacion(umbral, operador),
            getActivosPorReclasificar(50, umbral, operador)
        ]);
        setResumen(res);
        setItems(pends);
        setIsLoading(false);
    }

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSetEquipoMenor(id: string) {
        // Animado Optimistic Deletion
        setItems(prev => prev.filter(item => item.id !== id));
        
        // Optimistic Resumen Update
        const itemToMove = items.find(i => i.id === id);
        if(itemToMove) {
            setResumen(r => ({
                equipoMenor: {
                    cantidad: r.equipoMenor.cantidad + 1,
                    total: r.equipoMenor.total + Number(itemToMove.costoAdquisicion || 0)
                },
                pendientesDeRevisar: {
                    cantidad: Math.max(0, r.pendientesDeRevisar.cantidad - 1),
                    total: Math.max(0, r.pendientesDeRevisar.total - Number(itemToMove.costoAdquisicion || 0))
                }
            }));
        }

        startTransition(async () => {
             await setEquipoMenor(id);
             // Solo recargar por debajo silenciosamente si la bandeja se esta quedando vacía
             if(items.length < 5) {
                 const extra = await getActivosPorReclasificar(50, umbral, operador);
                 // Evitar duplicados (aunque el backend ya ignora los actualizados)
                 // Se usa map id -> filter para evitar dupes x UI si hay race conditions
                 const currentIds = new Set(items.map(i => i.id));
                 setItems(prev => [...prev, ...extra.filter(nx => !currentIds.has(nx.id))]);
             }
        });
    }

    async function loadReporte() {
        setIsReporteLoading(true);
        const data = await getReporteEquipoMenor(1, 100);
        setReporteItems(data.items);
        setIsReporteLoading(false);
    }
    
    // Función auxiliar para obtener los calculos de depreciacion in-line
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function obtenerStatsDepreciacion(item: any) {
        if(!item.costoAdquisicion || !item.fechaAdquisicion || !item.vidaUtil) return null;
        return calcDepreciacion({
            costoAdq: Number(item.costoAdquisicion),
            fechaAdq: new Date(item.fechaAdquisicion),
            vidaUtilAnios: Number(item.vidaUtil)
        });
    }

    return (
        <div className="flex flex-col h-full md:h-[calc(100vh-80px)] w-full bg-[#f8fafc] p-4 md:p-8 overflow-y-auto">
            
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ArrowDownToLine className="w-8 h-8 text-amber-500" />
                        Reclasificación de Activos
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm max-w-xl">
                        Auditoría rápida para saneamiento de bienes históricos. Ajuste el filtro de costo para buscar grupos de activos y reclasificarlos como "Equipo Menor".
                    </p>
                </div>
                
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full md:w-auto shrink-0">
                    <button 
                        onClick={() => setView('bandeja')}
                        className={`flex-1 md:w-32 py-2 text-sm font-bold rounded-xl transition-all ${view === 'bandeja' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Bandeja
                    </button>
                    <button 
                        onClick={() => { setView('reporte'); loadReporte(); }}
                        className={`flex-1 md:w-32 py-2 text-sm font-bold rounded-xl transition-all ${view === 'reporte' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Reporte
                    </button>
                </div>
            </div>

            {/* Resumen Financiero */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <PackageOpen className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Activos {operador === 'lte' ? '≤' : '≥'} L. {umbral}
                        </p>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-3xl font-black text-slate-800">L. {resumen.pendientesDeRevisar.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                            <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{resumen.pendientesDeRevisar.cantidad} items</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
                        <ArrowDownToLine className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-600/80 uppercase tracking-widest mb-1">Reclasificado</p>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-3xl font-black text-amber-600">L. {resumen.equipoMenor.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                            <span className="text-sm font-semibold text-amber-700/60 bg-amber-50 px-3 py-1 rounded-full">{resumen.equipoMenor.cantidad} equipo menor</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros de Busqueda Dinamicos y Toggles de Vista */}
            {view === 'bandeja' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 px-3 text-slate-400 shrink-0">
                            <Filter className="w-5 h-5" />
                            <span className="text-sm font-bold shrink-0">Filtro de Costo:</span>
                        </div>
                        <select 
                            value={operador} 
                            onChange={(e) => setOperador(e.target.value as 'lte' | 'gte')}
                            className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0500A3]/20"
                        >
                            <option value="lte">Menor o igual a (≤)</option>
                            <option value="gte">Mayor o igual a (≥)</option>
                        </select>
                        
                        <div className="relative w-full sm:max-w-xs">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">L.</span>
                            <input 
                                type="number" 
                                min="0"
                                value={umbral}
                                onChange={(e) => setUmbral(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 text-sm font-bold rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0500A3]/20"
                            />
                        </div>
                        
                        <button 
                            onClick={loadData}
                            disabled={isLoading}
                            className="w-full sm:w-auto bg-[#0500A3] hover:bg-blue-800 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 shrink-0"
                        >
                            Aplicar Filtro
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
                        <button 
                            onClick={() => setLayout('grid')}
                            className={`p-2 rounded-lg transition-all ${layout === 'grid' ? 'bg-white shadow-sm text-[#0500A3]' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista de Tarjetas"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setLayout('list')}
                            className={`p-2 rounded-lg transition-all ${layout === 'list' ? 'bg-white shadow-sm text-[#0500A3]' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista de Lista Horizontal"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Bandeja de Trabajo */}
            {view === 'bandeja' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden flex flex-col flex-1 min-h-[500px]">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-black text-slate-800">
                            Resultados {operador === 'lte' ? '≤' : '≥'} L. {umbral.toLocaleString()}
                        </h3>
                        <button onClick={loadData} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full border border-slate-200 hover:shadow-sm transition-all" title="Recargar">
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center flex-col gap-4 text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <span className="font-bold">Cargando histórico...</span>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="h-full flex items-center justify-center flex-col gap-4 text-slate-400">
                                <CheckCircle2 className="w-16 h-16 text-emerald-300" />
                                <span className="font-bold text-lg text-slate-500">¡Bandeja Vacia! Ajuste los filtros para ver más ítems.</span>
                            </div>
                        ) : (
                            <div className={layout === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "flex flex-col gap-3"}>
                                {items.map(item => {
                                    const costoTotal = Number(item.costoAdquisicion || 0);
                                    const cantidad = Number(item.cantidad || 1);
                                    const costoUnitario = cantidad > 1 ? costoTotal / cantidad : costoTotal;
                                    const calcDep = obtenerStatsDepreciacion(item);

                                    if (layout === 'list') {
                                        return (
                                            <div key={item.id} className="group flex flex-col sm:flex-row bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-all duration-300 p-4 gap-4 items-start sm:items-center">
                                                
                                                <div className="flex gap-4 items-center w-full min-w-0">
                                                    <div className="shrink-0 w-16 text-center bg-slate-50 border border-slate-100 rounded-lg p-2">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">Cant.</p>
                                                        <p className="font-black text-lg text-slate-700">{cantidad}</p>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-[#0500A3] transition-colors">{item.nombrePropiedad}</h4>
                                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide shrink-0">
                                                                {item.fechaAdquisicion ? new Date(item.fechaAdquisicion).toLocaleDateString('es-HN') : 'Sin Fecha'}
                                                            </span>
                                                            {(item.marca || item.descripcionCorta) && (
                                                                <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                                                    {[item.marca, item.descripcionCorta].filter(Boolean).join(' • ')}
                                                                </span>
                                                            )}
                                                            {calcDep && (
                                                                <span className="text-[11px] font-mono text-emerald-600/80 mx-2 tracking-tight">
                                                                    D.M: L.{calcDep.deprecMensual.toFixed(2)} / D.Acum: L.{calcDep.deprecAcum.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 text-right pr-4 border-r border-slate-100">
                                                        <p className="font-black text-lg text-slate-800">L. {costoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                        {cantidad > 1 && (
                                                            <p className="text-[10px] font-bold text-slate-400">@ L. {costoUnitario.toLocaleString('en-US', { minimumFractionDigits: 2 })} c/u</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => handleSetEquipoMenor(item.id)}
                                                    disabled={isPending}
                                                    className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-lg font-black text-xs transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    <ArrowDownToLine className="w-4 h-4" />
                                                    Equipo Menor
                                                </button>
                                            </div>
                                        );
                                    }

                                    // Grid Layout (Cards)
                                    return (
                                        <div key={item.id} className="group relative flex flex-col sm:flex-row bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 p-5 gap-5 items-start sm:items-center">
                                            
                                            <div className="flex-1">
                                                <div className="flex gap-2 items-center mb-1 flex-wrap">
                                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                        {item.fechaAdquisicion ? new Date(item.fechaAdquisicion).toLocaleDateString('es-HN') : 'Sin Fecha'}
                                                    </span>
                                                    {cantidad > 1 && (
                                                        <span className="bg-[#0500A3]/10 text-[#0500A3] text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                            {cantidad} uds.
                                                        </span>
                                                    )}
                                                    {item.cuentaContable && <span className="text-xs text-slate-400 font-mono">{item.cuentaContable}</span>}
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-base leading-snug group-hover:text-[#0500A3] transition-colors">{item.nombrePropiedad}</h4>
                                                
                                                {item.descripcionCorta || item.marca ? (
                                                    <p className="text-xs text-slate-500 mt-2 line-clamp-1">{[item.marca, item.descripcionCorta].filter(Boolean).join(' • ')}</p>
                                                ) : null}
                                                
                                                {calcDep && (
                                                    <div className="mt-3 flex items-center gap-2 bg-emerald-50/50 border border-emerald-100 p-2 rounded-xl">
                                                        <div className="flex-1 flex flex-col">
                                                            <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Deprec. Mensual</span>
                                                            <span className="text-xs font-bold text-emerald-700 font-mono">L. {calcDep.deprecMensual.toFixed(2)}</span>
                                                        </div>
                                                        <div className="w-px h-6 bg-emerald-200" />
                                                        <div className="flex-1 flex flex-col">
                                                            <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Deprec. Acumul</span>
                                                            <span className="text-xs font-bold text-emerald-700 font-mono">L. {calcDep.deprecAcum.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 sm:gap-2">
                                                <div className="text-left sm:text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Costo Adq. Total</p>
                                                    <p className="font-black text-xl text-slate-800">L. {costoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                    {cantidad > 1 && (
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                                                            L. {costoUnitario.toLocaleString('en-US', { minimumFractionDigits: 2 })} c/u
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <button 
                                                    onClick={() => handleSetEquipoMenor(item.id)}
                                                    disabled={isPending}
                                                    className="shrink-0 flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-3 rounded-xl font-black text-xs transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    <ArrowDownToLine className="w-4 h-4" />
                                                    Es Equipo Menor
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View de Reporte */}
             {view === 'reporte' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden flex flex-col flex-1 min-h-[500px]">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-amber-50/30">
                        <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-amber-500" />
                            <h3 className="text-lg font-black text-slate-800">Reporte de Equipo Menor ({reporteItems.length})</h3>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto min-h-0">
                         {isReporteLoading ? (
                             <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
                         ) : reporteItems.length === 0 ? (
                             <div className="p-12 text-center text-slate-500 font-bold">No hay registros clasificados.</div>
                         ) : (
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-black tracking-wider sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-xl truncate max-w-[300px]">Descripción</th>
                                        <th className="px-6 py-4">Fecha Adq.</th>
                                        <th className="px-6 py-4 text-center">Cant.</th>
                                        <th className="px-6 py-4">Cuenta</th>
                                        <th className="px-6 py-4">Depreciación (Mes / Acum)</th>
                                        <th className="px-6 py-4 text-right rounded-tr-xl">Costo L.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reporteItems.map((item, i) => {
                                        const calcDep = obtenerStatsDepreciacion(item);
                                        return (
                                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-700 truncate max-w-[300px]">
                                                {item.nombrePropiedad}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                 {item.fechaAdquisicion ? new Date(item.fechaAdquisicion).toLocaleDateString('es-HN') : '-'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 text-center">
                                                {item.cantidad || 1}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                {item.cuentaContable || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {calcDep ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] text-emerald-600 font-semibold uppercase">Mens: L.{calcDep.deprecMensual.toFixed(2)}</span>
                                                        <span className="text-[10px] text-emerald-700 font-black uppercase">Acum: L.{calcDep.deprecAcum.toFixed(2)}</span>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 font-black text-amber-600 text-right">
                                                {Number(item.costoAdquisicion || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                         )}
                    </div>
                </div>
             )}

        </div>
    );
}
