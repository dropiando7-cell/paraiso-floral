'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    ItemTomaFisica, 
    guardarProgresoTomaFisica,
    enviarARevisionTomaFisica,
    aprobarTomaFisica,
    deshacerTomaFisica
} from '../actions';
import { 
    ArrowLeft, 
    Search, 
    CheckCircle2, 
    AlertTriangle, 
    RotateCcw, 
    Copy, 
    Save, 
    Filter, 
    Loader2,
    Calendar,
    UserCheck,
    Package,
    TrendingDown,
    TrendingUp,
    Check,
    X,
    Undo2,
    Camera,
    Plus,
    Trash2
} from 'lucide-react';

interface AuditHeader {
    id: string;
    correlativo: string;
    estado: string;
    notas: string | null;
    createdAt: Date;
    creadoPor: string;
    aprobadoPor: string | null;
}

interface TomaFisicaDetalleClientProps {
    initialItems: ItemTomaFisica[];
    auditoria: AuditHeader;
    usuarioNombre: string;
    isAdmin: boolean;
}

// Client-side image compression helper
const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                const MAX_HEIGHT = 1000;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        resolve(blob || file);
                    },
                    'image/jpeg',
                    0.6 // 60% quality compression (super lightweight!)
                );
            };
        };
    });
};

export default function TomaFisicaDetalleClient({ 
    initialItems, 
    auditoria, 
    usuarioNombre, 
    isAdmin 
}: TomaFisicaDetalleClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Local items list state (supports duplicating rows for different locations)
    const [items, setItems] = useState<ItemTomaFisica[]>(initialItems);

    // State for counted quantities (map of item.id -> number | null)
    const [conteos, setConteos] = useState<Record<string, number | null>>(() => {
        const initial: Record<string, number | null> = {};
        initialItems.forEach(item => {
            initial[item.id] = item.conteoFisico;
        });
        return initial;
    });

    // Mermas count state (map of item.id -> number)
    const [mermas, setMermas] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        initialItems.forEach(item => {
            initial[item.id] = item.merma;
        });
        return initial;
    });

    // Mermas dates state (map of item.id -> YYYY-MM-DD string)
    const [mermasFechas, setMermasFechas] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        initialItems.forEach(item => {
            if (item.mermaFecha) {
                initial[item.id] = item.mermaFecha.slice(0, 10);
            } else {
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                initial[item.id] = `${yyyy}-${mm}-${dd}`;
            }
        });
        return initial;
    });

    // Mermas photos state (map of item.id -> array of photo URLs)
    const [mermasFotos, setMermasFotos] = useState<Record<string, string[]>>(() => {
        const initial: Record<string, string[]> = {};
        initialItems.forEach(item => {
            initial[item.id] = item.mermaFotos || [];
        });
        return initial;
    });

    // Locations state (map of item.id -> string)
    const [ubicaciones, setUbicaciones] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        initialItems.forEach(item => {
            initial[item.id] = item.ubicacion || '';
        });
        return initial;
    });

    // Uploading states to show local spinners for photos
    const [uploadingItem, setUploadingItem] = useState<Record<string, boolean>>({});

    // Filters
    const [search, setSearch] = useState('');
    const [selectedArea, setSelectedArea] = useState('TODAS');
    const [selectedCategory, setSelectedCategory] = useState('TODAS');
    const [filterDiscrepancy, setFilterDiscrepancy] = useState<'TODOS' | 'SOLO_DESCUADRADOS' | 'SOLO_CONTADOS'>('TODOS');

    // UI state
    const [motivoNotas, setMotivoNotas] = useState('');
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const fechaHoy = new Date(auditoria.createdAt).toLocaleDateString('es-HN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Dynamic autocomplete suggestion list for locations
    const uniqueLocationsSuggestion = useMemo(() => {
        const set = new Set<string>();
        Object.values(ubicaciones).forEach(loc => {
            if (loc && loc.trim()) set.add(loc.trim());
        });
        return Array.from(set);
    }, [ubicaciones]);

    // Get unique Areas and Categories for filter dropdowns
    const areas = useMemo(() => {
        const set = new Set(initialItems.map(i => i.area));
        return ['TODAS', ...Array.from(set)];
    }, [initialItems]);

    const categorias = useMemo(() => {
        const set = new Set(initialItems.map(i => i.categoriaNombre));
        return ['TODAS', ...Array.from(set)];
    }, [initialItems]);

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (selectedArea !== 'TODAS' && item.area !== selectedArea) return false;
            if (selectedCategory !== 'TODAS' && item.categoriaNombre !== selectedCategory) return false;

            if (search.trim()) {
                const query = search.toLowerCase();
                const matchName = item.descripcionCorta.toLowerCase().includes(query);
                const matchQr = item.idQr.toLowerCase().includes(query);
                if (!matchName && !matchQr) return false;
            }

            const conteo = conteos[item.id];
            const isCounted = conteo !== null;
            const diff = isCounted ? (conteo - item.stockSistema) : 0;

            if (filterDiscrepancy === 'SOLO_DESCUADRADOS' && (!isCounted || diff === 0)) return false;
            if (filterDiscrepancy === 'SOLO_CONTADOS' && !isCounted) return false;

            return true;
        });
    }, [items, selectedArea, selectedCategory, search, filterDiscrepancy, conteos]);

    // KPI Metrics (Aggregated by flower variety)
    const metrics = useMemo(() => {
        let totalCounted = 0;
        let totalDiferencia = 0;
        let totalFaltantes = 0;
        let totalSobrantes = 0;

        // Group counts by variety ID to check total discrepancies correctly
        const varietyCounts: Record<string, { system: number; count: number }> = {};

        items.forEach(item => {
            const count = conteos[item.id];
            const vid = item.activoFijoId;

            if (!varietyCounts[vid]) {
                varietyCounts[vid] = { system: item.stockSistema, count: 0 };
            }

            if (count !== null) {
                varietyCounts[vid].count += count;
            }
        });

        // Loop varieties
        Object.keys(varietyCounts).forEach(vid => {
            const group = varietyCounts[vid];
            // If counted is 0, check if we counted at least one row for this variety
            const rows = items.filter(i => i.activoFijoId === vid);
            const isAnyRowCounted = rows.some(r => conteos[r.id] !== null);

            if (isAnyRowCounted) {
                totalCounted++;
                const diff = group.count - group.system;
                totalDiferencia += diff;
                if (diff < 0) totalFaltantes += Math.abs(diff);
                if (diff > 0) totalSobrantes += diff;
            }
        });

        return {
            totalItems: Array.from(new Set(items.map(i => i.activoFijoId))).length,
            totalCounted,
            totalDiferencia,
            totalFaltantes,
            totalSobrantes
        };
    }, [items, conteos]);

    // Handlers to update counts
    const handleSetCount = (id: string, val: number | null) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        setConteos(prev => ({
            ...prev,
            [id]: val === null ? null : Math.max(0, val)
        }));
    };

    const handleStepCount = (id: string, currentVal: number | null, step: number, systemVal: number) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const base = currentVal !== null ? currentVal : systemVal;
        const next = Math.max(0, base + step);
        handleSetCount(id, next);
    };

    // Merma adjusters
    const handleSetMerma = (id: string, val: number) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        setMermas(prev => ({
            ...prev,
            [id]: Math.max(0, val)
        }));
    };

    const handleStepMerma = (id: string, step: number) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const base = mermas[id] || 0;
        const next = Math.max(0, base + step);
        handleSetMerma(id, next);
    };

    // Upload photo for merma with Client-side compression
    const handleUploadPhoto = async (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        setUploadingItem(prev => ({ ...prev, [id]: true }));
        try {
            // Compress image client side
            const compressedBlob = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedBlob, 'merma_photo.jpg');

            const res = await fetch('/api/upload/inventario', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    setMermasFotos(prev => ({
                        ...prev,
                        [id]: [...(prev[id] || []), data.url]
                    }));
                }
            } else {
                alert('No se pudo subir la foto de merma.');
            }
        } catch (err) {
            console.error('Error compressing or uploading photo:', err);
            alert('Error en la conexión al subir foto.');
        } finally {
            setUploadingItem(prev => ({ ...prev, [id]: false }));
        }
    };

    // Remove photo from merma
    const handleRemovePhoto = (id: string, url: string) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        setMermasFotos(prev => ({
            ...prev,
            [id]: (prev[id] || []).filter(u => u !== url)
        }));
    };

    // Duplicate row for another location
    const handleDuplicateRow = (original: ItemTomaFisica) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        const newRow: ItemTomaFisica = {
            ...original,
            id: tempId,
            stockSistema: 0, // Duplicate starts with 0 so the first row holds the entire system stock
            conteoFisico: null,
            diferencia: null,
            merma: 0,
            mermaFecha: null,
            mermaFotos: [],
            ubicacion: ''
        };

        setItems(prev => {
            // Place new row directly under the original row
            const index = prev.findIndex(item => item.id === original.id);
            const updated = [...prev];
            updated.splice(index + 1, 0, newRow);
            return updated;
        });

        // Initialize states for new row
        setConteos(prev => ({ ...prev, [tempId]: null }));
        setMermas(prev => ({ ...prev, [tempId]: 0 }));
        
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setMermasFechas(prev => ({ ...prev, [tempId]: `${yyyy}-${mm}-${dd}` }));
        setMermasFotos(prev => ({ ...prev, [tempId]: [] }));
        setUbicaciones(prev => ({ ...prev, [tempId]: '' }));
    };

    // Remove a duplicated location row
    const handleRemoveRow = (id: string) => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        setItems(prev => prev.filter(item => item.id !== id));
        setConteos(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setMermas(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setMermasFechas(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setMermasFotos(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setUbicaciones(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    // Bulk Actions
    const handleCopiarStockSistema = () => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const next: Record<string, number | null> = {};
        filteredItems.forEach(item => {
            next[item.id] = item.stockSistema;
        });
        setConteos(prev => ({ ...prev, ...next }));
    };

    const handleLimpiarConteo = () => {
        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') return;
        const next: Record<string, number | null> = {};
        filteredItems.forEach(item => {
            next[item.id] = null;
        });
        setConteos(prev => ({ ...prev, ...next }));
    };

    // Map current local state to submit parameter structure
    const getSubmissionData = () => {
        return items.map(item => ({
            activoFijoId: item.activoFijoId,
            stockSistema: item.stockSistema,
            conteo: conteos[item.id],
            merma: mermas[item.id] || 0,
            mermaFecha: mermas[item.id] > 0 ? mermasFechas[item.id] : null,
            mermaFotos: mermasFotos[item.id] || [],
            ubicacion: ubicaciones[item.id] || null
        }));
    };

    // 1. Action: Save Progress
    const handleGuardarProgreso = () => {
        setActionError(null);
        setActionSuccess(null);

        const submissionList = getSubmissionData();

        startTransition(async () => {
            const res = await guardarProgresoTomaFisica(auditoria.id, submissionList);
            if (res.success) {
                setActionSuccess('¡Progreso de conteo, ubicaciones y mermas guardado con éxito!');
                router.refresh();
            } else {
                setActionError(res.error || 'Error al guardar progreso.');
            }
        });
    };

    // 2. Action: Submit for Review
    const handleEnviarARevision = () => {
        setActionError(null);
        setActionSuccess(null);

        const submissionList = getSubmissionData();
        const contadosCount = submissionList.filter(c => c.conteo !== null).length;
        
        if (contadosCount === 0) {
            alert('Por favor ingresa el conteo de al menos 1 producto antes de enviar a revisión.');
            return;
        }

        const confirmMsg = `¿Confirmas enviar a revisión esta toma con ${contadosCount} registros contados?\nEl conteo quedará bloqueado y listo para aprobación de administración.`;
        if (!confirm(confirmMsg)) return;

        startTransition(async () => {
            // First save progress
            const saveRes = await guardarProgresoTomaFisica(auditoria.id, submissionList);
            if (!saveRes.success) {
                setActionError(saveRes.error || 'Error al guardar progreso antes de enviar.');
                return;
            }

            // Then submit
            const res = await enviarARevisionTomaFisica(auditoria.id);
            if (res.success) {
                router.push('/inventario/toma-fisica');
            } else {
                setActionError(res.error || 'Error al enviar a revisión.');
            }
        });
    };

    // 3. Action: Approve Audit (Admin Only)
    const handleAprobarAuditoria = () => {
        setActionError(null);
        setActionSuccess(null);

        const submissionList = getSubmissionData();
        const contadosCount = submissionList.filter(c => c.conteo !== null).length;

        const confirmMsg = `¿Confirmas aprobar esta auditoría (${contadosCount} registros)?\nEsto aplicará el ajuste contable final y actualizará el stock disponible en el Kardex.`;
        if (!confirm(confirmMsg)) return;

        startTransition(async () => {
            // First save progress if it was in CONTEO state
            if (auditoria.estado === 'CONTEO') {
                const saveRes = await guardarProgresoTomaFisica(auditoria.id, submissionList);
                if (!saveRes.success) {
                    setActionError(saveRes.error || 'Error al guardar progreso antes de aprobar.');
                    return;
                }
            }

            const res = await aprobarTomaFisica(auditoria.id, motivoNotas);
            if (res.success) {
                router.push('/inventario/toma-fisica');
            } else {
                setActionError(res.error || 'Error al aprobar la auditoría.');
            }
        });
    };

    // 4. Action: Undo Audit (Admin Only)
    const handleDeshacerAuditoria = () => {
        setActionError(null);
        setActionSuccess(null);

        const confirmMsg = `⚠️ ¡ATENCIÓN! ¿Estás seguro de deshacer este ajuste de inventario?\nEsto restaurará el stock teórico anterior en el Kardex y anulará esta auditoría de forma permanente.`;
        if (!confirm(confirmMsg)) return;

        startTransition(async () => {
            const res = await deshacerTomaFisica(auditoria.id);
            if (res.success) {
                router.push('/inventario/toma-fisica');
            } else {
                setActionError(res.error || 'Error al revertir la auditoría.');
            }
        });
    };

    const isEditable = auditoria.estado === 'CONTEO' || auditoria.estado === 'PENDIENTE_APROBACION';

    const getEstadoHeaderPill = () => {
        switch (auditoria.estado) {
            case 'CONTEO':
                return 'bg-blue-100 text-blue-700';
            case 'PENDIENTE_APROBACION':
                return 'bg-amber-100 text-amber-700';
            case 'APROBADA':
                return 'bg-emerald-100 text-emerald-700';
            case 'ANULADA':
                return 'bg-rose-100 text-rose-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
            {/* ── DATALIST PARA AUTOCOMPLETAR UBICACIONES ── */}
            <datalist id="datalist-ubicaciones">
                {uniqueLocationsSuggestion.map(loc => (
                    <option key={loc} value={loc} />
                ))}
            </datalist>

            {/* ── HEADER DE NAVEGACIÓN ── */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 lg:px-8 py-3.5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/inventario/toma-fisica" 
                            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition active:scale-95 cursor-pointer"
                            title="Volver a Auditorías"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getEstadoHeaderPill()}`}>
                                    Toma {auditoria.correlativo} ({auditoria.estado})
                                </span>
                                <span className="text-xs text-slate-400 font-medium hidden sm:inline">| Paraíso Floral</span>
                            </div>
                            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                                Auditoría de Inventario Físico
                            </h1>
                        </div>
                    </div>

                    {/* Metadata Pill */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-600 bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-[#0500A3]" />
                            <span>Auditor: <strong className="text-slate-900">{auditoria.creadoPor}</strong></span>
                        </div>
                        <div className="w-px h-4 bg-slate-300 hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="capitalize">{fechaHoy}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">

                {/* ── MENSAJES DE ALERTA ÉXITO / ERROR ── */}
                {actionSuccess && (
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-bold">{actionSuccess}</p>
                        </div>
                        <button 
                            onClick={() => setActionSuccess(null)}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                            Entendido
                        </button>
                    </div>
                )}

                {actionError && (
                    <div className="bg-rose-500 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-bold">{actionError}</p>
                        </div>
                        <button 
                            onClick={() => setActionError(null)}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition"
                        >
                            Cerrar
                        </button>
                    </div>
                )}

                {/* ── METRICAS / KPIS FLOTANTES ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Variedades</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-900">
                                {metrics.totalCounted} <span className="text-xs font-normal text-slate-400">/ {metrics.totalItems}</span>
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            metrics.totalDiferencia === 0 
                                ? 'bg-slate-100 text-slate-600' 
                                : metrics.totalDiferencia < 0 
                                    ? 'bg-rose-50 text-rose-600' 
                                    : 'bg-emerald-50 text-emerald-600'
                        }`}>
                            {metrics.totalDiferencia < 0 ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ajuste Kardex Total</p>
                            <p className={`text-xl sm:text-2xl font-black ${
                                metrics.totalDiferencia === 0 ? 'text-slate-700' : metrics.totalDiferencia < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                                {metrics.totalDiferencia > 0 ? `+${metrics.totalDiferencia}` : metrics.totalDiferencia}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5 col-span-2 md:col-span-1">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Faltantes</p>
                            <p className="text-xl sm:text-2xl font-black text-rose-600">
                                {metrics.totalFaltantes} <span className="text-xs font-medium text-slate-400">paq.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── BARRA DE CONTROLES, FILTROS Y BOTONERAS ── */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Buscador */}
                        <div className="relative flex-1 min-w-[260px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="🔍 Buscar por variedad de flor o código QR..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0500A3] transition-all"
                            />
                        </div>

                        {/* Filtros dropdown */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                                <span>Cámara:</span>
                                <select 
                                    value={selectedArea}
                                    onChange={(e) => setSelectedArea(e.target.value)}
                                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    {areas.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                                <span>Categoría:</span>
                                <select 
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    {categorias.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                                <span>Ver:</span>
                                <select 
                                    value={filterDiscrepancy}
                                    onChange={(e) => setFilterDiscrepancy(e.target.value as any)}
                                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    <option value="TODOS">Todos los ítems</option>
                                    <option value="SOLO_DESCUADRADOS">Solo Descuadrados ⚠️</option>
                                    <option value="SOLO_CONTADOS">Solo Contados ✅</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Botonera de Acciones Táctiles Rápida */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {isEditable && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCopiarStockSistema}
                                        className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
                                    >
                                        <Copy className="w-4 h-4" />
                                        <span>Copiar Stock Kardex</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleLimpiarConteo}
                                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Resetear Conteo</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Botones de acción principales */}
                        <div className="flex items-center gap-2">
                            {isEditable && (
                                <>
                                    <button
                                        onClick={handleGuardarProgreso}
                                        disabled={isPending}
                                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>Guardar Progreso</span>
                                    </button>

                                    <button
                                        onClick={handleEnviarARevision}
                                        disabled={isPending}
                                        className="px-4 py-2.5 bg-[#0500A3] hover:bg-indigo-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Enviar a Revisión</span>
                                    </button>

                                    {isAdmin && (
                                        <button
                                            onClick={handleAprobarAuditoria}
                                            disabled={isPending || metrics.totalCounted === 0}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                        >
                                            {isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            <span>Aprobar y Ajustar Kardex ({metrics.totalCounted})</span>
                                        </button>
                                    )}
                                </>
                            )}

                            {auditoria.estado === 'APROBADA' && isAdmin && (
                                <button
                                    onClick={handleDeshacerAuditoria}
                                    disabled={isPending}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Undo2 className="w-4 h-4" />
                                    )}
                                    <span>Deshacer Ajuste (Revertir)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── TABLA MATRIZ TÁCTIL ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[992px]">
                            <thead>
                                <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                                    <th className="py-4 px-4 w-10 text-center font-mono">#</th>
                                    <th className="py-4 px-4">Producto / Variedad de Flor & Ubicación</th>
                                    <th className="py-4 px-3 text-center bg-slate-800">
                                        STOCK KARDEX <br />
                                        <span className="text-[10px] text-slate-300 font-medium uppercase">(Teórico)</span>
                                    </th>
                                    <th className="py-4 px-4 text-center bg-pink-700 text-white min-w-[210px]">
                                        CONTEO EN PISO <br />
                                        <span className="text-[10px] text-pink-200 font-bold uppercase">(Físico Real)</span>
                                    </th>
                                    <th className="py-4 px-4 text-center bg-amber-700 text-white min-w-[240px]">
                                        MERMA (DAÑADO) <br />
                                        <span className="text-[10px] text-amber-200 font-bold uppercase">(Mermas & Fotos)</span>
                                    </th>
                                    <th className="py-4 px-4 text-center">
                                        DIFERENCIA <br />
                                        <span className="text-[10px] text-slate-300 font-medium uppercase">(Ajuste)</span>
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200/80 text-sm">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p className="font-semibold text-base">No se encontraron flores con los filtros seleccionados.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, idx) => {
                                        const count = conteos[item.id];
                                        const isCounted = count !== null;
                                        const diff = isCounted ? (count - item.stockSistema) : 0;
                                        const currentMerma = mermas[item.id] || 0;

                                        // Check if this row is a duplicate or if we have multiple locations for this same product variety
                                        const sameProductRows = items.filter(i => i.activoFijoId === item.activoFijoId);
                                        const countForThisProduct = sameProductRows.length;
                                        const isDuplicatedRow = item.id.startsWith('temp_');
                                        const isDeleteable = countForThisProduct > 1 || isDuplicatedRow;

                                        return (
                                            <tr 
                                                key={item.id}
                                                className={`transition-colors hover:bg-blue-50/40 ${
                                                    isCounted 
                                                        ? diff === 0 
                                                            ? 'bg-emerald-50/30' 
                                                            : diff < 0 
                                                                ? 'bg-rose-50/40' 
                                                                : 'bg-amber-50/40'
                                                        : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                }`}
                                            >
                                                {/* Index */}
                                                <td className="py-4 px-4 text-xs font-bold text-slate-400 text-center font-mono">
                                                    {idx + 1}
                                                </td>

                                                {/* Producto y Ubicación */}
                                                <td className="py-4 px-4">
                                                    <div className="flex items-start gap-3.5">
                                                        {item.imagenUrl ? (
                                                            <img 
                                                                src={item.imagenUrl} 
                                                                alt={item.descripcionCorta}
                                                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs mt-0.5"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                                                                🌸
                                                            </div>
                                                        )}

                                                        <div className="flex-1 space-y-1.5">
                                                            <div>
                                                                <h3 className="font-bold text-slate-900 text-base leading-tight">
                                                                    {item.descripcionCorta}
                                                                </h3>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
                                                                        {item.idQr}
                                                                    </span>
                                                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-700">
                                                                        📍 {item.area}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400">
                                                                        • {item.categoriaNombre}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Campo de Ubicación con Autocompletar */}
                                                            <div className="flex items-center gap-1.5 max-w-[280px]">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Ubicación:</span>
                                                                <input
                                                                    type="text"
                                                                    list="datalist-ubicaciones"
                                                                    disabled={!isEditable}
                                                                    value={ubicaciones[item.id] || ''}
                                                                    onChange={(e) => {
                                                                        setUbicaciones(prev => ({ ...prev, [item.id]: e.target.value }));
                                                                    }}
                                                                    placeholder="Ej: Cuarto Frío 1, Entrada..."
                                                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
                                                                />
                                                            </div>

                                                            {/* Controles de fila: Duplicar / Eliminar */}
                                                            <div className="flex items-center gap-2 pt-0.5">
                                                                {isEditable && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDuplicateRow(item)}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-[#0500A3] hover:text-white rounded-lg text-[10px] font-black text-indigo-700 transition active:scale-95 cursor-pointer"
                                                                        title="Agregar este producto en otra ubicación diferente"
                                                                    >
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                        <span>+ Ubicación</span>
                                                                    </button>
                                                                )}

                                                                {isDeleteable && isEditable && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveRow(item.id)}
                                                                        className="inline-flex items-center justify-center p-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg transition active:scale-95 cursor-pointer"
                                                                        title="Eliminar esta ubicación para este producto"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* STOCK KARDEX */}
                                                <td className="py-4 px-3 text-center bg-slate-50 font-mono text-base font-black text-slate-700 border-x border-slate-200/60">
                                                    {item.stockSistema} <span className="text-xs font-normal text-slate-400">paq</span>
                                                </td>

                                                {/* CONTEO EN PISO */}
                                                <td className="py-4 px-4 text-center bg-pink-50/30 border-x border-pink-200/40">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {/* Restar -1 */}
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => handleStepCount(item.id, count, -1, item.stockSistema)}
                                                            className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 font-black text-base hover:bg-slate-100 active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            -1
                                                        </button>

                                                        {/* Input */}
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            disabled={!isEditable}
                                                            value={count === null ? '' : count}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                                handleSetCount(item.id, val);
                                                            }}
                                                            placeholder={item.stockSistema.toString()}
                                                            className={`w-16 sm:w-20 h-10 text-center text-base font-black font-mono rounded-xl border-2 transition-all focus:outline-none ${
                                                                isCounted 
                                                                    ? 'bg-white border-[#0500A3] text-slate-900 shadow-sm' 
                                                                    : 'bg-white/80 border-slate-300 text-slate-500 placeholder-slate-300'
                                                            } disabled:bg-slate-100 disabled:text-slate-500`}
                                                        />

                                                        {/* Sumar +1 */}
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => handleStepCount(item.id, count, 1, item.stockSistema)}
                                                            className="w-10 h-10 rounded-xl bg-pink-600 text-white font-black text-base hover:bg-pink-700 active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            +1
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* MERMAS (Dañados, Fotos, Fecha) */}
                                                <td className="py-4 px-4 bg-amber-50/20 border-x border-amber-200/40">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            {/* Control Numérico Merma */}
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    disabled={!isEditable}
                                                                    onClick={() => handleStepMerma(item.id, -1)}
                                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-black text-xs hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    disabled={!isEditable}
                                                                    value={currentMerma}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value, 10) || 0;
                                                                        handleSetMerma(item.id, val);
                                                                    }}
                                                                    className="w-11 h-8 text-center font-bold text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={!isEditable}
                                                                    onClick={() => handleStepMerma(item.id, 1)}
                                                                    className="w-8 h-8 rounded-lg bg-amber-600 text-white font-black text-xs hover:bg-amber-700 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>

                                                            {/* Cámara Button */}
                                                            <div className="flex items-center gap-1.5">
                                                                {uploadingItem[item.id] ? (
                                                                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                                                                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                                                    </div>
                                                                ) : (
                                                                    <label className={`w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center cursor-pointer hover:bg-slate-100 text-slate-500 transition relative shrink-0 shadow-3xs ${!isEditable ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}>
                                                                        <Camera className="w-4.5 h-4.5" />
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            capture="environment"
                                                                            disabled={!isEditable}
                                                                            className="hidden"
                                                                            onChange={(e) => handleUploadPhoto(item.id, e)}
                                                                        />
                                                                    </label>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Date selector (Only shown if merma > 0) */}
                                                        {currentMerma > 0 && (
                                                            <div className="space-y-1">
                                                                <div className="relative">
                                                                    <input
                                                                        type="date"
                                                                        disabled={!isEditable}
                                                                        value={mermasFechas[item.id] || ''}
                                                                        onChange={(e) => {
                                                                            setMermasFechas(prev => ({ ...prev, [item.id]: e.target.value }));
                                                                        }}
                                                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:outline-none focus:bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Photo Thumbnails */}
                                                        {mermasFotos[item.id]?.length > 0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-1.5">
                                                                {mermasFotos[item.id].map((url, uidx) => (
                                                                    <div key={uidx} className="relative group w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                                                        <img src={url} alt="Merma" className="w-full h-full object-cover" />
                                                                        {isEditable && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemovePhoto(item.id, url)}
                                                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 text-white flex items-center justify-center transition cursor-pointer"
                                                                                title="Eliminar foto"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* DIFERENCIA */}
                                                <td className="py-4 px-4 text-center">
                                                    {!isCounted ? (
                                                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-xs font-semibold">
                                                            Pendiente
                                                        </span>
                                                    ) : diff === 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                                                            <Check className="w-3.5 h-3.5" />
                                                            Cuadrado (0)
                                                        </span>
                                                    ) : diff < 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black border border-rose-200">
                                                            ⚠️ Faltan {diff} paq.
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-black border border-amber-200">
                                                            ℹ️ Sobran +{diff} paq.
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
