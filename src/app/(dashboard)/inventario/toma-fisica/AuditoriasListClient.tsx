'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    iniciarNuevaTomaFisica 
} from './actions';
import { 
    ClipboardList, 
    Plus, 
    Calendar, 
    User, 
    ChevronRight, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Search,
    Loader2,
    RefreshCw,
    X,
    TrendingUp,
    TrendingDown,
    ArrowLeft
} from 'lucide-react';

interface AuditItem {
    id: string;
    correlativo: string;
    estado: string;
    notas: string | null;
    creadoPor: string;
    aprobadoPor: string | null;
    createdAt: Date;
}

interface AuditoriasListClientProps {
    initialAuditorias: AuditItem[];
    isAdmin: boolean;
}

export default function AuditoriasListClient({ initialAuditorias, isAdmin }: AuditoriasListClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    // Modal & creation states
    const [modalOpen, setModalOpen] = useState(false);
    const [newNotas, setNewNotas] = useState('');
    const [creationError, setCreationError] = useState<string | null>(null);

    // Filter/Search states
    const [search, setSearch] = useState('');
    const [selectedEstado, setSelectedEstado] = useState<'TODOS' | 'CONTEO' | 'PENDIENTE_APROBACION' | 'APROBADA' | 'ANULADA'>('TODOS');

    // Counts for stats cards
    const stats = React.useMemo(() => {
        let conteo = 0;
        let pendiente = 0;
        let aprobada = 0;
        let anulada = 0;

        initialAuditorias.forEach(a => {
            if (a.estado === 'CONTEO') conteo++;
            else if (a.estado === 'PENDIENTE_APROBACION') pendiente++;
            else if (a.estado === 'APROBADA') aprobada++;
            else if (a.estado === 'ANULADA') anulada++;
        });

        return {
            conteo,
            pendiente,
            aprobada,
            anulada,
            total: initialAuditorias.length
        };
    }, [initialAuditorias]);

    // Handle initiating a new audit session
    const handleIniciarNuevaToma = () => {
        setCreationError(null);
        startTransition(async () => {
            const res = await iniciarNuevaTomaFisica(newNotas);
            if (res.success && res.auditoriaId) {
                setModalOpen(false);
                setNewNotas('');
                router.push(`/inventario/toma-fisica/${res.auditoriaId}`);
            } else {
                setCreationError(res.error || 'Error al iniciar la toma física.');
            }
        });
    };

    // Filter audits
    const filteredAuditorias = React.useMemo(() => {
        return initialAuditorias.filter(a => {
            if (selectedEstado !== 'TODOS' && a.estado !== selectedEstado) return false;
            
            if (search.trim()) {
                const q = search.toLowerCase();
                const matchCorr = a.correlativo.toLowerCase().includes(q);
                const matchUser = a.creadoPor.toLowerCase().includes(q);
                const matchNotes = (a.notas || '').toLowerCase().includes(q);
                if (!matchCorr && !matchUser && !matchNotes) return false;
            }

            return true;
        });
    }, [initialAuditorias, search, selectedEstado]);

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'CONTEO':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3.5 h-3.5" /> En Conteo
                    </span>
                );
            case 'PENDIENTE_APROBACION':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Pendiente Aprobación
                    </span>
                );
            case 'APROBADA':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobada y Aplicada
                    </span>
                );
            case 'ANULADA':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Anulada / Revertida
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
                        {estado}
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
            {/* ── HEADER DE NAVEGACIÓN ── */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 lg:px-8 py-3.5">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/inventario" 
                            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition active:scale-95 cursor-pointer"
                            title="Volver a Inventario"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                                    Auditorías de Inventario
                                </span>
                            </div>
                            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                                Toma Física & Auditoría de Kardex
                            </h1>
                        </div>
                    </div>

                    <button
                        onClick={() => setModalOpen(true)}
                        className="px-4 py-2.5 bg-[#0500A3] hover:bg-indigo-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-950/10 flex items-center gap-2 transition cursor-pointer"
                    >
                        <Plus className="w-4.5 h-4.5" />
                        <span>Iniciar Nueva Toma</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">

                {/* ── METRICAS / KPIS GENERALES ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Tomas</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">En Proceso (Conteo)</p>
                        <p className="text-2xl font-black text-blue-700 mt-1">{stats.conteo}</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pendientes de Aprobar</p>
                        <p className="text-2xl font-black text-amber-700 mt-1">{stats.pendiente}</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Aprobadas y Aplicadas</p>
                        <p className="text-2xl font-black text-emerald-700 mt-1">{stats.aprobada}</p>
                    </div>
                </div>

                {/* ── CONTROLES Y FILTROS ── */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Buscador */}
                    <div className="relative flex-1 min-w-[260px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="🔍 Buscar por correlativo, notas o creador..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0500A3] transition-all"
                        />
                    </div>

                    {/* Filtro por estado */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase mr-1">Filtrar Estado:</span>
                        <select 
                            value={selectedEstado}
                            onChange={(e) => setSelectedEstado(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                        >
                            <option value="TODOS">Todos los estados</option>
                            <option value="CONTEO">En Conteo</option>
                            <option value="PENDIENTE_APROBACION">Pendiente Aprobación</option>
                            <option value="APROBADA">Aprobada</option>
                            <option value="ANULADA">Anulada / Revertida</option>
                        </select>
                    </div>
                </div>

                {/* ── HISTORIAL / TABLA DE AUDITORÍAS ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[768px]">
                            <thead>
                                <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                                    <th className="py-4 px-5">Correlativo</th>
                                    <th className="py-4 px-5">Fecha Apertura</th>
                                    <th className="py-4 px-5">Notas / Descripción</th>
                                    <th className="py-4 px-5">Conteo / Creador</th>
                                    <th className="py-4 px-5">Estado</th>
                                    <th className="py-4 px-5 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/80 text-sm">
                                {filteredAuditorias.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p className="font-semibold text-base">No hay auditorías registradas.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAuditorias.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4.5 px-5 font-black text-slate-900">
                                                {item.correlativo}
                                            </td>
                                            <td className="py-4.5 px-5 text-xs font-semibold text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{new Date(item.createdAt).toLocaleDateString('es-HN', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}</span>
                                                </div>
                                            </td>
                                            <td className="py-4.5 px-5 text-xs text-slate-600 max-w-[280px] truncate">
                                                {item.notas || <span className="italic text-slate-400">Sin notas</span>}
                                            </td>
                                            <td className="py-4.5 px-5 text-xs font-semibold text-slate-700">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{item.creadoPor}</span>
                                                </div>
                                                {item.aprobadoPor && (
                                                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                                        Aprobó: {item.aprobadoPor}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-4.5 px-5">
                                                {getEstadoBadge(item.estado)}
                                            </td>
                                            <td className="py-4.5 px-5 text-right">
                                                <Link 
                                                    href={`/inventario/toma-fisica/${item.id}`}
                                                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-100 hover:bg-[#0500A3] hover:text-white rounded-xl text-xs font-bold text-slate-700 transition active:scale-95"
                                                >
                                                    <span>Ver Auditoría</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── MODAL NUEVA TOMA ── */}
            {modalOpen && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 relative">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[#0500A3] shrink-0 shadow-2xs">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 leading-tight">Iniciar Toma Física</h3>
                                <p className="text-xs font-bold text-indigo-600 uppercase mt-0.5">Crear sesión de conteo</p>
                            </div>
                        </div>

                        {creationError && (
                            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                                <span>{creationError}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                    Notas u Observaciones (Opcional)
                                </label>
                                <textarea
                                    value={newNotas}
                                    onChange={(e) => setNewNotas(e.target.value)}
                                    rows={3}
                                    placeholder="Ej: Auditoría mensual de cierre de cuarto frío principal..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0500A3] outline-none transition-all resize-none"
                                />
                            </div>

                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
                                * Nota: Al iniciar, el sistema copiará la cantidad teórica de flores en existencia para congelarla en esta auditoría.
                            </p>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleIniciarNuevaToma}
                                    disabled={isPending}
                                    className="px-5 py-2.5 bg-[#0500A3] hover:bg-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Inicializando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlayIcon className="w-4 h-4" />
                                            <span>Iniciar Toma</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple Play Icon Helper
function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
    );
}
