'use client';

import { useState, useEffect, useTransition } from 'react';
import { getHistoricoPaginated, updateHistorico } from './actions';
import { Search, Loader2, Save, FileEdit, CheckCircle2, Package } from 'lucide-react';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function HistoricoEditorClient() {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 500);
    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const limit = 50;

    useEffect(() => {
        setPage(1);
        fetchData(debouncedQuery, 1);
    }, [debouncedQuery]);

    useEffect(() => {
        if (page > 1) {
            fetchData(debouncedQuery, page);
        }
    }, [page]);

    async function fetchData(q: string, p: number) {
        setIsLoading(true);
        try {
            const res = await getHistoricoPaginated(q, p, limit);
            if (p === 1) {
                setItems(res.items);
            } else {
                setItems(prev => [...prev, ...res.items]);
            }
            setTotal(res.total);
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen w-full bg-[#f8fafc] overflow-hidden">
            <div className="flex-none p-6 bg-white border-b border-slate-200 shadow-sm z-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileEdit className="w-6 h-6 text-[#0500A3]" />
                        Editor de Histórico 2026
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Limpia las descripciones o agrega marcas para que la IA haga "match" automático más fácilmente. ({total} registros)
                    </p>
                </div>

                <div className="relative w-full md:w-96 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, modelo o serie..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] transition-all"
                    />
                    {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0500A3] animate-spin" />}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-w-[800px]">
                    {/* Header */}
                    <div className="grid grid-cols-[100px_minmax(300px,1fr)_minmax(200px,1fr)_200px_100px] gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="text-center">Cant.</div>
                        <div>Nombre / Descripción</div>
                        <div>Marca / Modelo</div>
                        <div>Costo / Vida</div>
                        <div className="text-center">Status</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-100 relative">
                        {items.length === 0 && !isLoading && (
                            <div className="p-12 text-center text-slate-400">
                                No se encontraron registros.
                            </div>
                        )}
                        {items.map(item => (
                            <EditableRow key={item.id} item={item} />
                        ))}

                        {page * limit < total && (
                            <div className="p-4 flex justify-center">
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={isLoading}
                                    className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0500A3] transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Cargando...' : 'Cargar más registros'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}

function EditableRow({ item }: { item: any }) {
    const [nombre, setNombre] = useState(item.nombrePropiedad || '');
    const [marca, setMarca] = useState(item.marcaModelo || '');
    const [isSaving, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);

    const matchCount = item._count?.activosFijos || 0;

    function handleSave() {
        if (nombre === item.nombrePropiedad && marca === item.marcaModelo) return;
        startTransition(async () => {
            try {
                await updateHistorico(item.id, { nombrePropiedad: nombre, marcaModelo: marca });
                // local mutation
                item.nombrePropiedad = nombre;
                item.marcaModelo = marca;
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch (e: any) {
                alert('Error al guardar: ' + e.message);
                setNombre(item.nombrePropiedad);
                setMarca(item.marcaModelo);
            }
        });
    }

    return (
        <div className="grid grid-cols-[100px_minmax(300px,1fr)_minmax(200px,1fr)_200px_100px] gap-4 p-2 items-center hover:bg-slate-50/80 transition-colors group">
            {/* Cantidad/Serie */}
            <div className="text-center flex flex-col items-center justify-center gap-1">
                <div className="bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1 rounded-lg w-fit">
                    {item.cantidad}
                </div>
                {item.serie && <div className="text-[10px] font-mono text-slate-400 truncate max-w-full print:hidden" title={item.serie}>{item.serie}</div>}
            </div>

            {/* Nombre editable */}
            <div>
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    onBlur={handleSave}
                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0500A3] focus:bg-white rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-300 transition-all focus:outline-none focus:ring-4 focus:ring-[#0500A3]/10"
                    placeholder="Escriba el nombre..."
                />
            </div>

            {/* Marca editable */}
            <div>
                <input
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    onBlur={handleSave}
                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0500A3] focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-600 placeholder:text-slate-300 transition-all focus:outline-none focus:ring-4 focus:ring-[#0500A3]/10"
                    placeholder="Escriba marca/modelo..."
                />
            </div>

            {/* Atributos solo lectura */}
            <div className="flex flex-col justify-center px-3">
                <span className="text-sm font-medium text-slate-700">L. {Number(item.costoAdquisicion || 0).toLocaleString()}</span>
                <span className="text-xs text-slate-400">{item.cuentaContable || 'Sin cuenta'} • {item.vidaUtil ? `${item.vidaUtil} años` : '0 años'}</span>
            </div>

            {/* Estado e interacciones */}
            <div className="flex items-center justify-center gap-2">
                {isSaving ? (
                    <Loader2 className="w-5 h-5 text-[#0500A3] animate-spin" />
                ) : saved ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                    <div className="w-5 h-5 flex items-center justify-center text-slate-300 group-hover:text-[#0500A3] transition-colors cursor-pointer" onClick={handleSave} title="Forzar guardado">
                        <Save className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                    </div>
                )}

                {matchCount > 0 && (
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold" title={`${matchCount} activos ya emparejados con este registro`}>
                        <Package className="w-3 h-3" />
                        {matchCount}
                    </div>
                )}
            </div>
        </div>
    );
}
