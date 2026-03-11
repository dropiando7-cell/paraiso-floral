'use client';

import { useState, useEffect, useTransition } from 'react';
import { getHistoricoPaginated, updateHistorico } from './actions';
import { uploadActivoImage } from '../actions';
import { Search, Loader2, Save, FileEdit, CheckCircle2, Package, Camera, Sparkles } from 'lucide-react';

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
    const limit = 10;

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
            setItems(res.items);
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
                        <div>Nombre / Desc. Corta</div>
                        <div>Marca / Modelo</div>
                        <div>Costo / Status</div>
                        <div className="text-center">Acción</div>
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

                        {total > limit && (
                            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-white">
                                <div className="text-sm text-slate-500 font-medium">
                                    Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} registros
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page === 1 || isLoading}
                                        onClick={() => setPage(p => p - 1)}
                                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:text-[#0500A3] disabled:opacity-50 transition-colors text-slate-700"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        disabled={page * limit >= total || isLoading}
                                        onClick={() => setPage(p => p + 1)}
                                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:text-[#0500A3] disabled:opacity-50 transition-colors text-slate-700"
                                    >
                                        Siguiente
                                    </button>
                                </div>
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
    const [descCorta, setDescCorta] = useState(item.descripcionCorta || '');
    const [descDetallada, setDescDetallada] = useState(item.descripcionDetallada || '');
    const [marca, setMarca] = useState(item.marca || '');
    const [modelo, setModelo] = useState(item.modelo || '');
    const [serie, setSerie] = useState(item.serie && item.serie !== item.serieOriginal ? item.serie : '');
    const [isSaving, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);

    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
    const [placaUploadPhase, setPlacaUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');

    const matchCount = item._count?.activosFijos || 0;

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadPhase('uploading');
            const form = new FormData();
            form.append('file', file);
            const { url } = await uploadActivoImage(form);

            setUploadPhase('analyzing');
            const aiRes = await fetch('/api/inventario/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
            });
            const data = await aiRes.json();

            if (aiRes.ok && !data.error) {
                const newData = {
                    descripcionCorta: data.descripcionCorta || descCorta,
                    marca: data.marca || marca,
                    modelo: data.modelo || modelo,
                    imagenUrl: url,
                    descripcionDetallada: data.descripcionDetallada || descDetallada,
                };
                setDescCorta(newData.descripcionCorta);
                setDescDetallada(newData.descripcionDetallada || '');
                setMarca(newData.marca);
                setModelo(newData.modelo);

                startTransition(async () => {
                    await updateHistorico(item.id, newData);
                    item.descripcionCorta = newData.descripcionCorta;
                    item.descripcionDetallada = newData.descripcionDetallada;
                    item.marca = newData.marca;
                    item.modelo = newData.modelo;
                    item.imagenUrl = url;
                    setSaved(true); setTimeout(() => setSaved(false), 2000);
                });
            } else {
                alert('No se pudo analizar la imagen: ' + data.error);
            }
        } catch (err: any) {
            alert('Error al analizar imagen: ' + err.message);
        } finally {
            setUploadPhase('done');
            setTimeout(() => setUploadPhase('idle'), 3000);
        }
    }

    async function handlePlacaUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setPlacaUploadPhase('uploading');
            const form = new FormData();
            form.append('file', file);
            const { url } = await uploadActivoImage(form);

            setPlacaUploadPhase('analyzing');
            const aiRes = await fetch('/api/inventario/analyze-placa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
            });
            const data = await aiRes.json();

            if (aiRes.ok && !data.error) {
                const newData = {
                    serie: data.serie || serie,
                    imagenPlacaUrl: url,
                    marca: data.marca || marca,
                    modelo: data.modelo || modelo,
                };
                setSerie(newData.serie);
                setMarca(newData.marca);
                setModelo(newData.modelo);

                startTransition(async () => {
                    await updateHistorico(item.id, newData);
                    item.serie = newData.serie;
                    item.marca = newData.marca;
                    item.modelo = newData.modelo;
                    item.imagenPlacaUrl = url;
                    setSaved(true); setTimeout(() => setSaved(false), 2000);
                });
            } else {
                alert('No se pudo analizar la placa: ' + data.error);
            }
        } catch (err: any) {
            alert('Error al analizar placa: ' + err.message);
        } finally {
            setPlacaUploadPhase('done');
            setTimeout(() => setPlacaUploadPhase('idle'), 3000);
        }
    }

    function handleSave() {
        if (
            marca === item.marca &&
            modelo === item.modelo &&
            descCorta === item.descripcionCorta &&
            descDetallada === (item.descripcionDetallada || '') &&
            serie === (item.serie !== item.serieOriginal ? item.serie : '')
        ) return;

        startTransition(async () => {
            try {
                await updateHistorico(item.id, {
                    marca: marca,
                    modelo: modelo,
                    descripcionCorta: descCorta,
                    descripcionDetallada: descDetallada || null,
                    serie: serie || null,
                });
                // local mutation
                item.descripcionCorta = descCorta;
                item.descripcionDetallada = descDetallada || null;
                item.marca = marca;
                item.modelo = modelo;
                item.serie = serie || null;
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch (e: any) {
                alert('Error al guardar: ' + e.message);
                setDescCorta(item.descripcionCorta || '');
                setDescDetallada(item.descripcionDetallada || '');
                setMarca(item.marca || '');
                setModelo(item.modelo || '');
                setSerie(item.serie !== item.serieOriginal ? item.serie : '');
            }
        });
    }

    return (
        <div className="grid grid-cols-[100px_minmax(300px,1fr)_minmax(200px,1fr)_200px_100px] gap-4 p-2 items-center hover:bg-slate-50/80 transition-colors group">
            {/* Cantidad/Serie */}
            <div className="text-center flex flex-col items-center justify-center gap-1.5">
                <div className="bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1 rounded-lg w-fit">
                    {item.cantidad}
                </div>
                <div className="flex items-center gap-1 w-full bg-white border border-slate-200 rounded px-1 group/serie hover:border-[#0500A3] transition-colors">
                    <input
                        type="text"
                        value={serie || ''}
                        onChange={e => setSerie(e.target.value)}
                        onBlur={handleSave}
                        className="w-full text-[10px] font-mono text-slate-600 bg-transparent focus:outline-none py-1 placeholder:text-slate-300"
                        placeholder="Serie..."
                    />
                    <label className="cursor-pointer p-1 text-slate-400 hover:text-[#0500A3] flex-shrink-0 relative">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePlacaUpload} />
                        {placaUploadPhase === 'idle' && <Camera className="w-3.5 h-3.5" />}
                        {placaUploadPhase === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0500A3]" />}
                        {placaUploadPhase === 'analyzing' && <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-600" />}
                        {placaUploadPhase === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    </label>
                </div>
                {item.serieOriginal && (
                    <div className="text-[9px] text-slate-400 mt-0.5" title="Serie guardada en CSV original">
                        CSV: {item.serieOriginal}
                    </div>
                )}
            </div>

            {/* Nombre estático y editables de IA */}
            <div className="flex flex-col gap-1 justify-center">
                <div className="w-full bg-transparent px-2 py-1 text-sm font-bold text-slate-800 leading-tight">
                    {item.nombrePropiedad}
                </div>

                <div className="flex items-center gap-1 bg-blue-50/50 border border-transparent hover:border-blue-200 focus-within:border-[#0500A3] focus-within:bg-white rounded-xl transition-all focus-within:ring-2 focus-within:ring-[#0500A3]/10">
                    <input
                        type="text"
                        value={descCorta || ''}
                        onChange={(e) => setDescCorta(e.target.value)}
                        onBlur={handleSave}
                        className="w-full bg-transparent px-2 py-1.5 text-xs font-semibold text-blue-700 placeholder:text-blue-300 focus:outline-none"
                        placeholder="Desc. Corta (IA Match)..."
                    />
                    <label className="cursor-pointer p-1.5 mr-1 text-slate-400 hover:text-[#0500A3] flex-shrink-0 relative bg-white shadow-sm rounded-lg border border-slate-100">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                        {uploadPhase === 'idle' && <Camera className="w-4 h-4" />}
                        {uploadPhase === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-[#0500A3]" />}
                        {uploadPhase === 'analyzing' && <Sparkles className="w-4 h-4 animate-pulse text-purple-600" />}
                        {uploadPhase === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </label>
                </div>
                <input
                    type="text"
                    value={descDetallada || ''}
                    onChange={(e) => setDescDetallada(e.target.value)}
                    onBlur={handleSave}
                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0500A3] focus:bg-white rounded-xl px-2 py-1 text-[11px] font-medium text-slate-500 placeholder:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-[#0500A3]/10 mt-0.5"
                    placeholder="Descripción detallada (Marca, color, estado)..."
                />
            </div>

            {/* Marca y Modelo editable */}
            <div className="flex flex-col gap-1">
                <input
                    type="text"
                    value={marca || ''}
                    onChange={(e) => setMarca(e.target.value)}
                    onBlur={handleSave}
                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0500A3] focus:bg-white rounded-xl px-2 py-1.5 text-xs font-bold text-slate-600 placeholder:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-[#0500A3]/10"
                    placeholder="Marca..."
                />
                <input
                    type="text"
                    value={modelo || ''}
                    onChange={(e) => setModelo(e.target.value)}
                    onBlur={handleSave}
                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0500A3] focus:bg-white rounded-xl px-2 py-1.5 text-xs text-slate-500 placeholder:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-[#0500A3]/10"
                    placeholder="Modelo..."
                />
            </div>

            {/* Atributos solo lectura (Sin costo) */}
            <div className="flex flex-col justify-center px-3">
                <span className="text-xs text-slate-500 font-medium">Cuenta: {item.cuentaContable || 'N/A'}</span>
                <span className="text-xs text-slate-400">Vida útil: {item.vidaUtil ? `${item.vidaUtil} años` : '0 años'}</span>
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
