'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getHistoricoPaginated, updateHistorico, splitHistorico } from './actions';
import { uploadActivoImage } from '../actions';
import { Search, Loader2, Save, FileEdit, CheckCircle2, Package, Camera, Sparkles, Maximize, Minimize, Split, X, RotateCcw, RotateCw } from 'lucide-react';
import { useLayoutControls } from '@/components/layout/MobileDashboardWrapper';
import { removeBackground } from '@imgly/background-removal';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const limit = 10;

    // Attempt to get LayoutControls. Since HistoricoEditorClient is usually wrapped in DashboardLayout,
    // this context will be available.
    const layoutControls = useLayoutControls();
    // Fallback in case it's used somewhere else without the provider
    const isFullscreen = layoutControls?.isFullscreen || false;
    const setIsFullscreen = layoutControls?.setIsFullscreen || (() => { });

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

    useEffect(() => {
        setPage(1);
        fetchData(debouncedQuery, 1);
    }, [debouncedQuery]);

    useEffect(() => {
        if (page > 1) {
            fetchData(debouncedQuery, page);
        }
    }, [page]);

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen w-full bg-[#f8fafc] overflow-hidden">
            <div className="flex-none p-6 bg-white border-b border-slate-200 shadow-sm z-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileEdit className="w-6 h-6 text-[#0500A3]" />
                        Editor de Histórico 2026
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Limpia las descripciones o agrega marcas para que la IA haga &quot;match&quot; automático más fácilmente. ({total} registros)
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 relative">
                    <div className="relative w-full md:w-80 shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, marca, modelo, descripción..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0500A3]/20 focus:border-[#0500A3] transition-all"
                        />
                        {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0500A3] animate-spin" />}
                    </div>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="hidden md:flex p-3 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#0500A3] transition-all shadow-sm shrink-0"
                        title={isFullscreen ? "Restaurar vista" : "Pantalla completa (Ocultar Menú)"}
                    >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-w-[800px]">
                    {/* Header removed for card layout */}

                    {/* Cards Container */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 bg-slate-50 relative min-h-[300px]">
                        {items.length === 0 && !isLoading && (
                            <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                                No se encontraron registros.
                            </div>
                        )}
                        {items.map(item => (
                            <EditableRow key={item.id} item={item} onSplit={() => fetchData(debouncedQuery, page)} onPreview={setPreviewImage} />
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

            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-5xl max-h-[95vh] w-full flex items-center justify-center">
                        <button
                            className="absolute -top-12 right-0 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 p-2 rounded-full transition-all"
                            onClick={() => setPreviewImage(null)}
                            title="Cerrar vista previa"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Vista ampliada"
                            className="w-[600px] max-w-full h-auto max-h-[80vh] object-contain bg-white p-4 rounded-xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}

// ─── Image Compression Utility (from InventarioClient pattern) ───
async function compressAndUpload(file: File, endpoint: 'activo.jpg' | 'placa.jpg', rotationDegrees: number = 0): Promise<string> {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.src = url;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    URL.revokeObjectURL(url);

    const canvas = document.createElement('canvas');
    const MAX_SIZE = 1568;
    
    const rot = ((rotationDegrees % 360) + 360) % 360;
    const swapDims = rot === 90 || rot === 270;

    let { width, height } = img;
    let calcWidth = swapDims ? height : width;
    let calcHeight = swapDims ? width : height;

    if (calcWidth > calcHeight && calcWidth > MAX_SIZE) { 
        calcHeight *= MAX_SIZE / calcWidth; 
        calcWidth = MAX_SIZE; 
    } else if (calcHeight > MAX_SIZE) { 
        calcWidth *= MAX_SIZE / calcHeight; 
        calcHeight = MAX_SIZE; 
    }

    canvas.width = calcWidth;
    canvas.height = calcHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        ctx.translate(calcWidth / 2, calcHeight / 2);
        ctx.rotate((rot * Math.PI) / 180);
        
        const drawWidth = swapDims ? calcHeight : calcWidth;
        const drawHeight = swapDims ? calcWidth : calcHeight;
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85));

    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: endpoint, contentType: 'image/jpeg' }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}: Falló URL de subida`);
    }

    const { uploadUrl, publicUrl } = await res.json();
    const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
    if (!uploadRes.ok) throw new Error('Error al enviar imagen a R2');

    return publicUrl;
}

async function uploadDirectly(blob: Blob, endpoint: 'activo.jpg' | 'placa.jpg'): Promise<string> {
    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: endpoint, contentType: 'image/jpeg' }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}: Falló URL de subida`);
    }

    const { uploadUrl, publicUrl } = await res.json();
    const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
    if (!uploadRes.ok) throw new Error('Error al enviar imagen a R2');

    return publicUrl;
}

// ─── CropModal ─────────────────────────────────────────────────────────────────
function CropModal({ imageSrc, onConfirm, onCancel }: {
    imageSrc: string;
    onConfirm: (blob: Blob) => void;
    onCancel: () => void;
}) {
    const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 });
    const imgRef = useRef<HTMLImageElement>(null);
    const dragRef = useRef<{ type: string; sx: number; sy: number; sc: typeof crop } | null>(null);
    const [isBgRemoving, setIsBgRemoving] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(imageSrc);

    async function removeBg() {
        if (isBgRemoving) return;
        setIsBgRemoving(true);
        try {
            const blob = await removeBackground(currentSrc);
            const newUrl = URL.createObjectURL(blob);
            setCurrentSrc(newUrl);
        } catch (err) {
            alert('Error al quitar el fondo. Asegúrate de tener conexión.');
        } finally {
            setIsBgRemoving(false);
        }
    }

    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

    function pct(e: React.PointerEvent) {
        const r = imgRef.current!.getBoundingClientRect();
        return { px: (e.clientX - r.left) / r.width * 100, py: (e.clientY - r.top) / r.height * 100 };
    }

    function startDrag(type: string, e: React.PointerEvent) {
        e.preventDefault(); e.stopPropagation();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        const { px, py } = pct(e);
        dragRef.current = { type, sx: px, sy: py, sc: { ...crop } };
    }

    function onMove(e: React.PointerEvent) {
        if (!dragRef.current) return;
        const { type, sx, sy, sc } = dragRef.current;
        const { px, py } = pct(e);
        const dx = px - sx, dy = py - sy, MIN = 15;
        setCrop(() => {
            let { x, y, w, h } = sc;
            if (type === 'move') {
                x = clamp(sc.x + dx, 0, 100 - w); y = clamp(sc.y + dy, 0, 100 - h);
            } else if (type === 'br') {
                w = clamp(sc.w + dx, MIN, 100 - x); h = clamp(sc.h + dy, MIN, 100 - y);
            } else if (type === 'tl') {
                const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN);
                const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
                w = sc.x + sc.w - nx; h = sc.y + sc.h - ny; x = nx; y = ny;
            } else if (type === 'tr') {
                const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
                w = clamp(sc.w + dx, MIN, 100 - sc.x); h = sc.y + sc.h - ny; y = ny;
            } else if (type === 'bl') {
                const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN);
                w = sc.x + sc.w - nx; x = nx; h = clamp(sc.h + dy, MIN, 100 - sc.y);
            }
            return { x, y, w, h };
        });
    }

    function apply(full: boolean) {
        const img = imgRef.current!;
        const { naturalWidth: nw, naturalHeight: nh } = img;
        const [sx, sy, sw, sh] = full
            ? [0, 0, nw, nh]
            : [Math.round(crop.x / 100 * nw), Math.round(crop.y / 100 * nh),
            Math.round(crop.w / 100 * nw), Math.round(crop.h / 100 * nh)];
        const MAX = 1568;
        const ratio = Math.min(1, MAX / Math.max(sw, sh));
        const dw = Math.round(sw * ratio), dh = Math.round(sh * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = dw; canvas.height = dh;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
        canvas.toBlob(blob => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.85);
    }

    const handles = [
        { id: 'tl', style: { top: -8, left: -8, cursor: 'nwse-resize' } as React.CSSProperties },
        { id: 'tr', style: { top: -8, right: -8, cursor: 'nesw-resize' } as React.CSSProperties },
        { id: 'bl', style: { bottom: -8, left: -8, cursor: 'nesw-resize' } as React.CSSProperties },
        { id: 'br', style: { bottom: -8, right: -8, cursor: 'nwse-resize' } as React.CSSProperties },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black" style={{ touchAction: 'none' }}>
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                <p className="text-white text-sm font-medium">📐 Arrastra el recuadro para recortar</p>
                <button onClick={onCancel} className="p-2 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto flex items-start justify-center"
                onPointerMove={onMove} onPointerUp={() => { dragRef.current = null; }}>
                <div className="relative" style={{ maxWidth: 640, width: '100%' }}>
                    <img ref={imgRef} src={currentSrc} className="block w-full select-none" draggable={false} alt="Vista previa" />
                    {isBgRemoving && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                <span className="text-white font-medium text-sm">Eliminando fondo... (la 1ª vez demora ~10s)</span>
                            </div>
                        </div>
                    )}
                    <div className="absolute border-2 border-white touch-none"
                        style={{
                            left: `${crop.x}%`, top: `${crop.y}%`,
                            width: `${crop.w}%`, height: `${crop.h}%`,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', cursor: 'move',
                        }}
                        onPointerDown={e => startDrag('move', e)}>
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                        </div>
                        {handles.map(h => (
                            <div key={h.id}
                                className="absolute w-7 h-7 bg-white rounded border-2 border-[#0500A3] touch-none"
                                style={{ ...h.style, position: 'absolute' }}
                                onPointerDown={e => startDrag(h.id, e)} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 bg-black/80">
                <button onClick={() => apply(true)} disabled={isBgRemoving}
                    className="border-2 border-white/30 text-white font-semibold py-4 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50">
                    Foto completa
                </button>
                <button onClick={() => apply(false)} disabled={isBgRemoving}
                    className="bg-[#0500A3] text-white font-semibold py-4 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50">
                    ✓ Confirmar recorte
                </button>
                <button onClick={removeBg} disabled={isBgRemoving || currentSrc !== imageSrc}
                    className="col-span-2 border-2 border-purple-500/50 text-purple-200 bg-purple-900/40 font-semibold py-3 rounded-2xl active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {currentSrc !== imageSrc ? 'Fondo eliminado' : '🪄 Magia: Eliminar Fondo'}
                </button>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EditableRow({ item, onSplit, onPreview }: { item: any, onSplit: () => void, onPreview: (url: string) => void }) {
    const [descCorta, setDescCorta] = useState(item.descripcionCorta || '');
    const [descDetallada, setDescDetallada] = useState(item.descripcionDetallada || '');
    const [marca, setMarca] = useState(item.marca || '');
    const [modelo, setModelo] = useState(item.modelo || '');
    const [serie, setSerie] = useState(item.serie && item.serie !== item.serieOriginal ? item.serie : '');
    const [imagenUrl, setImagenUrl] = useState<string | null>(item.imagenUrl || null);
    const [imagenPlacaUrl, setImagenPlacaUrl] = useState<string | null>(item.imagenPlacaUrl || null);
    const [observaciones, setObservaciones] = useState(item.observaciones || '');
    const [confirmDelete, setConfirmDelete] = useState<'activo' | 'placa' | null>(null);
    const [pendingFile, setPendingFile] = useState<{file: File, type: 'activo' | 'placa', previewUrl: string} | null>(null);
    const [rotation, setRotation] = useState(0);
    const [isSaving, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isSplitting, setIsSplitting] = useState(false);

    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
    const [placaUploadPhase, setPlacaUploadPhase] = useState<'idle' | 'uploading' | 'analyzing' | 'done'>('idle');
    const [cropImgSrc, setCropImgSrc] = useState<string | null>(null);

    const matchCount = item._count?.activosFijos || 0;

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile({ file, type: 'activo', previewUrl: URL.createObjectURL(file) });
        setRotation(0);
        e.target.value = '';
    }

    function handlePlacaUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile({ file, type: 'placa', previewUrl: URL.createObjectURL(file) });
        setRotation(0);
        e.target.value = '';
    }

    function closeRotateModal() {
        if (pendingFile) URL.revokeObjectURL(pendingFile.previewUrl);
        setPendingFile(null);
        setRotation(0);
    }

    async function confirmUpload() {
        if (!pendingFile) return;
        const file = pendingFile.file;
        const type = pendingFile.type;
        const currentRot = rotation;
        
        if (type === 'activo') {
            try {
                // Generate rotated image blob for CropModal
                const urlObj = URL.createObjectURL(file);
                const rot = ((currentRot % 360) + 360) % 360;
                
                if (rot === 0) {
                    closeRotateModal();
                    setCropImgSrc(urlObj);
                } else {
                    const img = new window.Image();
                    img.src = urlObj;
                    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
                    URL.revokeObjectURL(urlObj);
                    
                    const canvas = document.createElement('canvas');
                    const swapDims = rot === 90 || rot === 270;
                    canvas.width = swapDims ? img.height : img.width;
                    canvas.height = swapDims ? img.width : img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate((rot * Math.PI) / 180);
                        const drawWidth = swapDims ? canvas.height : canvas.width;
                        const drawHeight = swapDims ? canvas.width : canvas.height;
                        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                    }
                    canvas.toBlob(b => {
                        if (b) {
                            closeRotateModal();
                            setCropImgSrc(URL.createObjectURL(b));
                        }
                    }, 'image/jpeg', 1.0);
                }
            } catch (e) {
                alert('No se pudo procesar la imagen: ' + e);
            }
        } else {
            closeRotateModal();
            await processPlacaUpload(file, currentRot);
        }
    }

    async function handleCropConfirm(blob: Blob) {
        if (cropImgSrc) URL.revokeObjectURL(cropImgSrc);
        setCropImgSrc(null);
        try {
            setUploadPhase('uploading');
            const url = await uploadDirectly(blob, 'activo.jpg');

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
                    setImagenUrl(url);
                    setSaved(true); setTimeout(() => setSaved(false), 2000);
                });
            } else {
                alert('No se pudo analizar la imagen: ' + data.error);
            }
        } catch (err) {
            const error = err as Error;
            alert('Error al analizar imagen: ' + error.message);
        } finally {
            setUploadPhase('done');
            setTimeout(() => setUploadPhase('idle'), 3000);
        }
    }

    async function processPlacaUpload(file: File, rot: number) {
        try {
            setPlacaUploadPhase('uploading');
            const url = await compressAndUpload(file, 'placa.jpg', rot);

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
                    setImagenPlacaUrl(url);
                    setSaved(true); setTimeout(() => setSaved(false), 2000);
                });
            } else {
                alert('No se pudo analizar la placa: ' + data.error);
            }
        } catch (err) {
            const error = err as Error;
            alert('Error al analizar placa: ' + error.message);
        } finally {
            setPlacaUploadPhase('done');
            setTimeout(() => setPlacaUploadPhase('idle'), 3000);
        }
    }

    function handleDeleteImage(type: 'activo' | 'placa') {
        startTransition(async () => {
            try {
                const updateData = type === 'activo' ? { imagenUrl: null } : { imagenPlacaUrl: null };
                await updateHistorico(item.id, updateData);
                if (type === 'activo') {
                    setImagenUrl(null);
                    item.imagenUrl = null;
                } else {
                    setImagenPlacaUrl(null);
                    item.imagenPlacaUrl = null;
                }
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch (e) {
                const error = e as Error;
                alert('Error al eliminar imagen: ' + error.message);
            }
        });
    }

    function handleSave() {
        // Remove focus state when saving finishes
        setIsFocused(false);

        if (
            marca === item.marca &&
            modelo === item.modelo &&
            descCorta === item.descripcionCorta &&
            descDetallada === (item.descripcionDetallada || '') &&
            serie === (item.serie !== item.serieOriginal ? item.serie : '') &&
            observaciones === (item.observaciones || '')
        ) return;

        startTransition(async () => {
            try {
                await updateHistorico(item.id, {
                    marca: marca,
                    modelo: modelo,
                    descripcionCorta: descCorta,
                    descripcionDetallada: descDetallada || null,
                    serie: serie || null,
                    observaciones: observaciones || null,
                });
                item.descripcionCorta = descCorta;
                item.descripcionDetallada = descDetallada || null;
                item.marca = marca;
                item.modelo = modelo;
                item.serie = serie || null;
                item.observaciones = observaciones || null;
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } catch (e) {
                const err = e as Error;
                alert('Error al guardar: ' + err.message);
                setDescCorta(item.descripcionCorta || '');
                setDescDetallada(item.descripcionDetallada || '');
                setMarca(item.marca || '');
                setModelo(item.modelo || '');
                setSerie(item.serie !== item.serieOriginal ? item.serie : '');
                setObservaciones(item.observaciones || '');
            }
        });
    }

    async function handleSplit() {
        if (!confirm('¿Deseas extraer 1 unidad de este grupo en un registro individual nuevo?')) return;
        setIsSplitting(true);
        try {
            await splitHistorico(item.id);
            onSplit();
        } catch (error) {
            const err = error as Error;
            alert('Error al desdoblar: ' + err.message);
            setIsSplitting(false);
        }
    }

    return (
        <div
            className={`border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col gap-4 relative overflow-hidden group ${isFocused ? 'bg-indigo-50/60 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-white border-slate-200'
                }`}
        >

            {/* Header: Titulo Original y Matches */}
            <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
                <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800 leading-snug">
                        {item.nombrePropiedad}
                    </div>
                    {item.serieOriginal && (
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            SN Original: {item.serieOriginal}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        {item.cantidad > 1 && (
                            <button
                                onClick={handleSplit}
                                disabled={isSplitting}
                                className="flex items-center gap-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                title="Separar 1 unidad en un nuevo registro"
                            >
                                {isSplitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Split className="w-3.5 h-3.5" />}
                                Desdoblar
                            </button>
                        )}
                        <div className="bg-slate-100 text-slate-700 text-xs font-black px-2.5 py-1 rounded-md">
                            CANT: {item.cantidad}
                        </div>
                    </div>
                    {matchCount > 0 && (
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-bold" title={`${matchCount} activos ya emparejados con este registro`}>
                            <Package className="w-3 h-3" />
                            {matchCount} Match
                        </div>
                    )}
                </div>
            </div>

            {/* Inputs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna Izquierda: Descripciones e IA General */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-stretch gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Desc. Corta (IA Match)</label>
                            <input
                                type="text"
                                value={descCorta || ''}
                                onChange={(e) => setDescCorta(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={handleSave}
                                className={`w-full border rounded-xl px-3 py-2 text-sm font-bold text-blue-700 placeholder:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-[#0500A3]/10 ${isFocused ? 'bg-white border-[#0500A3]/50' : 'bg-slate-50 border-slate-200 focus:border-[#0500A3]'
                                    }`}
                                placeholder="..."
                            />
                        </div>
                        {imagenUrl ? (
                            <div className="relative self-end w-14 h-14 shrink-0 cursor-pointer group rounded-xl shadow-sm border border-slate-200 overflow-visible">
                                <img
                                    src={imagenUrl}
                                    alt="Activo"
                                    className="w-full h-full object-cover rounded-xl"
                                    onClick={() => onPreview(imagenUrl)}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete('activo'); }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all scale-95 hover:scale-105 z-10"
                                    title="Eliminar foto"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                {confirmDelete === 'activo' && (
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 rounded-xl flex flex-col items-center justify-center gap-1.5 border border-red-200">
                                        <span className="text-[9px] font-bold text-red-600 text-center leading-tight">¿Borrar?</span>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteImage('activo'); setConfirmDelete(null); }} className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">Sí</button>
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold">No</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <label className="cursor-pointer self-end w-14 h-14 shrink-0 flex items-center justify-center bg-blue-50 text-[#0500A3] hover:bg-[#0500A3] hover:text-white border border-blue-200 rounded-xl transition-all shadow-sm">
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                                {uploadPhase === 'idle' && <Camera className="w-6 h-6" />}
                                {uploadPhase === 'uploading' && <Loader2 className="w-6 h-6 animate-spin" />}
                                {uploadPhase === 'analyzing' && <Sparkles className="w-6 h-6 animate-pulse" />}
                                {uploadPhase === 'done' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                            </label>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Descripción Detallada</label>
                        <input
                            type="text"
                            value={descDetallada || ''}
                            onChange={(e) => setDescDetallada(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleSave}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium text-slate-600 placeholder:text-slate-300 transition-all focus:outline-none ${isFocused ? 'bg-white border-[#0500A3]/30' : 'bg-transparent border-transparent hover:border-slate-200 hover:bg-slate-50'
                                }`}
                            placeholder="Marca, color, estado..."
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Observaciones</label>
                        <input
                            type="text"
                            value={observaciones || ''}
                            onChange={(e) => setObservaciones(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleSave}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 placeholder:text-slate-300 transition-all focus:outline-none ${isFocused ? 'bg-white border-amber-500/40' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                            placeholder="Ej. Vendido, Baja, Roto..."
                        />
                    </div>
                </div>

                {/* Columna Derecha: Marca, Modelo, Serie */}
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Marca</label>
                            <input
                                type="text"
                                value={marca || ''}
                                onChange={(e) => setMarca(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={handleSave}
                                className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-300 transition-all focus:outline-none ${isFocused ? 'bg-white border-[#0500A3]/40' : 'bg-slate-50 border-slate-200'
                                    }`}
                                placeholder="..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Modelo</label>
                            <input
                                type="text"
                                value={modelo || ''}
                                onChange={(e) => setModelo(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={handleSave}
                                className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-300 transition-all focus:outline-none ${isFocused ? 'bg-white border-[#0500A3]/40' : 'bg-slate-50 border-slate-200'
                                    }`}
                                placeholder="..."
                            />
                        </div>
                    </div>

                    <div className="flex items-stretch gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Serie / Placa</label>
                            <input
                                type="text"
                                value={serie || ''}
                                onChange={e => setSerie(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={handleSave}
                                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-slate-300 transition-all focus:outline-none ${isFocused ? 'bg-white border-[#0500A3]/40' : 'bg-slate-50 border-slate-200'
                                    }`}
                                placeholder="S/N..."
                            />
                        </div>
                        {imagenPlacaUrl ? (
                            <div className="relative self-end w-14 h-14 shrink-0 cursor-pointer group rounded-xl shadow-sm border border-slate-200 overflow-visible">
                                <img
                                    src={imagenPlacaUrl}
                                    alt="Placa"
                                    className="w-full h-full object-cover rounded-xl"
                                    onClick={() => onPreview(imagenPlacaUrl)}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete('placa'); }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all scale-95 hover:scale-105 z-10"
                                    title="Eliminar placa"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                {confirmDelete === 'placa' && (
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 rounded-xl flex flex-col items-center justify-center gap-1.5 border border-red-200">
                                        <span className="text-[9px] font-bold text-red-600 text-center leading-tight">¿Borrar?</span>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteImage('placa'); setConfirmDelete(null); }} className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">Sí</button>
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold">No</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <label className="cursor-pointer self-end w-14 h-14 shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shadow-sm">
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePlacaUpload} />
                                {placaUploadPhase === 'idle' && <Camera className="w-6 h-6" />}
                                {placaUploadPhase === 'uploading' && <Loader2 className="w-6 h-6 animate-spin" />}
                                {placaUploadPhase === 'analyzing' && <Sparkles className="w-6 h-6 animate-pulse text-purple-600" />}
                                {placaUploadPhase === 'done' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer de Tarjeta: Info de Solo Lectura y Estado */}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 px-5 pb-4">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cuenta Contable</span>
                        <span className="text-xs text-slate-600 font-medium">{item.cuentaContable || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col hidden sm:flex">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vida útil</span>
                        <span className="text-xs text-slate-600 font-medium">{item.vidaUtil ? `${item.vidaUtil} años` : '0 años'}</span>
                    </div>
                    {item.costoAdquisicion && (
                        <div className="flex flex-col hidden sm:flex">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Costo Orig.</span>
                            <span className="text-xs text-slate-600 font-medium">L. {Number(item.costoAdquisicion).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* Guardado Status */}
                <div className="flex items-center">
                    {isSaving ? (
                        <div className="flex items-center gap-2 text-[#0500A3]">
                            <span className="text-[11px] font-bold">Guardando</span>
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                    ) : saved ? (
                        <div className="flex items-center gap-2 text-emerald-500">
                            <span className="text-[11px] font-bold">Guardado</span>
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    ) : (
                        <button onClick={handleSave} className="flex items-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white transition-colors py-1.5 px-3 rounded-lg shadow-sm">
                            <span className="text-[11px] font-bold">Guardar</span>
                            <Save className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Modal de Rotación y Previsualización */}
            {pendingFile && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={closeRotateModal}>
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col items-center gap-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Ajustar Imagen</h3>
                            <p className="text-xs text-slate-500 mt-1">Rota la foto si quedó volteada para ayudar a la IA a leerla mejor.</p>
                        </div>
                        <div className="relative w-full aspect-square border-2 border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50 shadow-inner">
                            <img 
                                src={pendingFile.previewUrl} 
                                style={{ transform: `rotate(${rotation}deg)` }} 
                                className="max-w-full max-h-full object-contain transition-transform duration-300" 
                                alt="Preview"
                            />
                        </div>
                        <div className="flex gap-4 w-full">
                            <button onClick={() => setRotation(r => (r - 90) % 360)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-slate-300">
                                <RotateCcw className="w-5 h-5" />
                                <span className="text-sm">Izquierda</span>
                            </button>
                            <button onClick={() => setRotation(r => (r + 90) % 360)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-slate-300">
                                <RotateCw className="w-5 h-5" />
                                <span className="text-sm">Derecha</span>
                            </button>
                        </div>
                        <div className="flex gap-3 w-full mt-2">
                            <button onClick={closeRotateModal} className="flex-1 py-3.5 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all">Cancelar</button>
                            <button onClick={confirmUpload} className="flex-[1.5] py-3.5 bg-[#0500A3] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                                {pendingFile?.type === 'activo' ? 'Ir a Recorte' : 'Subir'} <Sparkles className="w-4 h-4 text-blue-200" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {cropImgSrc && (
                <CropModal
                    imageSrc={cropImgSrc}
                    onConfirm={handleCropConfirm}
                    onCancel={() => {
                        if (cropImgSrc) URL.revokeObjectURL(cropImgSrc);
                        setCropImgSrc(null);
                    }}
                />
            )}
        </div>
    );
}
