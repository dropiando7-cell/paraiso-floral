'use client';

import { useState } from 'react';
import {
    Package, TrendingDown, AlertTriangle, DollarSign,
    Search, Upload, Plus, Download, LayoutGrid, Table2,
    ChevronLeft, ChevronRight, MoreHorizontal, Filter
} from 'lucide-react';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ACTIVOS = [
    { id: 'ACT-0001', cant: 1, articulo: 'Mesa P/Conferencias', marca: 'Euromobilia / Madera', serie: '—', fCompra: '01/08/2002', valorLibros: 4480.00, valorResidual: 44.80, depAnterior: 4435.20, depActual: 0, depAcumulada: 4435.20, valorReal: 44.80, vidaUtil: 10, depAnual: 443.52, pctDep: 99, estado: 'Crítico' },
    { id: 'ACT-0002', cant: 1, articulo: 'Escritorio 4 Gavetas', marca: 'Semi-Ejecutivo / Beige', serie: '—', fCompra: '31/08/2003', valorLibros: 2090.00, valorResidual: 20.90, depAnterior: 1980.00, depActual: 0, depAcumulada: 1980.00, valorReal: 20.90, vidaUtil: 10, depAnual: 198.00, pctDep: 99, estado: 'Al límite' },
    { id: 'ACT-0003', cant: 1, articulo: 'Mini Split (Planta Alta)', marca: 'Evaporador - W0402', serie: 'W0482-6000813', fCompra: '06/08/2004', valorLibros: 22649.60, valorResidual: 226.49, depAnterior: 22422.61, depActual: 0, depAcumulada: 22422.61, valorReal: 226.49, vidaUtil: 10, depAnual: 2242.25, pctDep: 99, estado: 'Al límite' },
    { id: 'ACT-0004', cant: 1, articulo: 'Aire Acondicionado', marca: 'Comfort Star RAVO24', serie: '1419050000943', fCompra: '05/05/2006', valorLibros: 7220.64, valorResidual: 72.21, depAnterior: 7148.33, depActual: 0, depAcumulada: 7148.33, valorReal: 72.21, vidaUtil: 10, depAnual: 714.83, pctDep: 99, estado: 'Activo' },
    { id: 'ACT-0005', cant: 1, articulo: 'Aire Acondicionado Whisper', marca: 'Whisper', serie: '103001280', fCompra: '17/04/2007', valorLibros: 19714.28, valorResidual: 197.14, depAnterior: 19007.14, depActual: 0, depAcumulada: 19007.14, valorReal: 197.14, vidaUtil: 10, depAnual: 1069.71, pctDep: 99, estado: 'Activo' },
    { id: 'ACT-0006', cant: 6, articulo: 'Mesas Rectangulares', marca: '29006', serie: '—', fCompra: '20/09/2006', valorLibros: 8400.00, valorResidual: 84.00, depAnterior: 8318.00, depActual: 0, depAcumulada: 8318.00, valorReal: 84.00, vidaUtil: 10, depAnual: 831.00, pctDep: 99, estado: 'Activo' },
    { id: 'ACT-0007', cant: 1, articulo: 'Fotocopiadora', marca: 'Kyocera KM8010A', serie: '—', fCompra: '15/03/2008', valorLibros: 26071.65, valorResidual: 260.71, depAnterior: 25811.00, depActual: 0, depAcumulada: 25811.00, valorReal: 260.71, vidaUtil: 10, depAnual: 2581.00, pctDep: 99, estado: 'Disponible' },
    { id: 'ACT-0008', cant: 1, articulo: 'Piano Digital Yamaha P-125', marca: 'Yamaha', serie: 'INS-YAM-P125-003', fCompra: '05/05/2024', valorLibros: 19007.14, valorResidual: 190.07, depAnterior: 0, depActual: 1069.71, depAcumulada: 1069.71, valorReal: 10714.28, vidaUtil: 10, depAnual: 1069.71, pctDep: 10, estado: 'Disponible' },
];

const KANBAN_COLUMNS = [
    { id: 'disponible', label: 'Disponible', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
    { id: 'al-limite', label: 'Al límite (80-99%)', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
    { id: 'critico', label: 'Depreciación Crítica', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', dot: '#dc2626' },
    { id: 'mantenimiento', label: 'En Revisión / Mantenimiento', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb' },
];

const estadoToKanban: Record<string, string> = {
    'Disponible': 'disponible',
    'Al límite': 'al-limite',
    'Crítico': 'critico',
    'Activo': 'disponible',
    'Mantenimiento': 'mantenimiento',
};

const estadoColor: Record<string, string> = {
    'Activo': 'bg-emerald-100 text-emerald-700',
    'Disponible': 'bg-emerald-100 text-emerald-700',
    'Al límite': 'bg-amber-100 text-amber-700',
    'Crítico': 'bg-red-100 text-red-700',
    'Mantenimiento': 'bg-blue-100 text-blue-700',
};

function fmt(n: number) {
    return 'L. ' + n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function StatsCards() {
    const totalValor = MOCK_ACTIVOS.reduce((s, a) => s + a.valorLibros, 0);
    const totalDep = MOCK_ACTIVOS.reduce((s, a) => s + a.depAcumulada, 0);
    const criticos = MOCK_ACTIVOS.filter(a => a.pctDep >= 80).length;

    const cards = [
        { label: 'Valor Total en Libros', value: fmt(totalValor), sub: '+3 activos nuevos este mes', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total de Activos', value: MOCK_ACTIVOS.reduce((s, a) => s + a.cant, 0).toString(), sub: '12 categorías registradas', icon: Package, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Depreciación Acumulada', value: fmt(totalDep), sub: 'Año fiscal 2025', icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Activos Depreciados >80%', value: criticos.toString(), sub: 'Requieren revisión', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {cards.map(c => (
                <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
                    <div className={`${c.bg} p-2.5 rounded-lg shrink-0`}>
                        <c.icon className={`w-5 h-5 ${c.color}`} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs text-slate-500 font-medium mb-0.5">{c.label}</div>
                        <div className="text-2xl font-bold text-slate-900 truncate">{c.value}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{c.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Action Cards ─────────────────────────────────────────────────────────────
function ActionCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Import CSV */}
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 flex items-center gap-4">
                <div className="bg-slate-100 p-3 rounded-lg shrink-0">
                    <Upload className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-700 mb-0.5">Importar activos desde CSV</div>
                    <div className="text-xs text-slate-400">El sistema mapea automáticamente las columnas</div>
                </div>
                <button className="shrink-0 text-xs bg-[#0500A3] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#0600c2] transition-colors">
                    Importar CSV
                </button>
            </div>

            {/* Reporte Mayor */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="text-sm font-semibold text-slate-800 mb-1">📊 Generar Reporte Mayor de Propiedad</div>
                        <div className="text-xs text-slate-400">Exporta el mayor completo con depreciaciones calculadas por periodo.</div>
                    </div>
                    <div className="text-right shrink-0 ml-4 pl-4 border-l border-slate-200">
                        <div className="text-xs font-medium text-red-500 mb-1">⚠️ Alertas Pendientes</div>
                        <div className="space-y-0.5 text-right">
                            <div className="text-xs text-slate-600"><span className="text-red-500 font-bold">17</span> depreciación completa</div>
                            <div className="text-xs text-slate-600"><span className="text-amber-500 font-bold">8</span> sin responsable</div>
                            <div className="text-xs text-slate-600"><span className="text-slate-500 font-bold">23</span> sin número de serie</div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="text-xs bg-[#0500A3] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#0600c2] transition-colors">Generar Excel</button>
                    <button className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-50 transition-colors">Ver PDF</button>
                </div>
            </div>
        </div>
    );
}

// ─── Table Tab ────────────────────────────────────────────────────────────────
function TablaActivos() {
    const [search, setSearch] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [page, setPage] = useState(1);
    const PER_PAGE = 6;

    const filtered = MOCK_ACTIVOS.filter(a => {
        const matchSearch = a.articulo.toLowerCase().includes(search.toLowerCase()) ||
            a.marca.toLowerCase().includes(search.toLowerCase()) ||
            a.serie.toLowerCase().includes(search.toLowerCase());
        const matchEstado = filtroEstado === 'Todos' || a.estado === filtroEstado;
        return matchSearch && matchEstado;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por artículo, serie, marca..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30 bg-white"
                    />
                </div>
                <select
                    value={filtroEstado}
                    onChange={e => { setFiltroEstado(e.target.value); setPage(1); }}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0500A3]/30"
                >
                    {['Todos', 'Activo', 'Disponible', 'Al límite', 'Crítico', 'Mantenimiento'].map(e => (
                        <option key={e}>{e}</option>
                    ))}
                </select>
                <button className="flex items-center gap-1.5 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white hover:bg-slate-50 transition-colors text-slate-600">
                    <Filter className="w-3.5 h-3.5" /> Todas las categorías
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-xs min-w-[1100px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {['CANT.', 'ARTÍCULO', 'MARCA / MODELO', 'SERIE', 'F. COMPRA',
                                'VALOR\nLIBROS (L)', 'DEP.\nANTERIOR', 'DEP.\nACTUAL', 'DEP.\nACUMULADA',
                                'VALOR\nREAL (L)', 'VIDA\nÚTIL', 'DEP.\nANUAL', '% DEP.', 'ESTADO'].map(h => (
                                    <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2.5 whitespace-pre-line leading-tight">{h}</th>
                                ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginated.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-3 py-2.5 text-slate-500 font-medium">{a.cant}</td>
                                <td className="px-3 py-2.5">
                                    <div className="font-semibold text-slate-800">{a.articulo}</div>
                                    <div className="text-slate-400 text-[10px]">{a.id}</div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{a.marca}</td>
                                <td className="px-3 py-2.5 text-slate-500 font-mono text-[10px]">{a.serie}</td>
                                <td className="px-3 py-2.5 text-slate-500">{a.fCompra}</td>
                                <td className="px-3 py-2.5 text-slate-700 font-mono">{a.valorLibros.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2.5 text-slate-500 font-mono">{a.depAnterior.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2.5 text-slate-500 font-mono">{a.depActual > 0 ? a.depActual.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '—'}</td>
                                <td className="px-3 py-2.5 text-slate-700 font-mono">{a.depAcumulada.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2.5 text-slate-700 font-mono font-medium">{a.valorReal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2.5 text-slate-500 text-center">{a.vidaUtil}</td>
                                <td className="px-3 py-2.5 text-slate-500 font-mono">{a.depAnual.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-3 py-2.5 text-center">
                                    <span className={`font-bold ${a.pctDep >= 99 ? 'text-red-500' : a.pctDep >= 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                        {a.pctDep}%
                                    </span>
                                </td>
                                <td className="px-3 py-2.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${estadoColor[a.estado] || 'bg-slate-100 text-slate-600'}`}>
                                        {a.estado}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                        Mostrando {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length} activos
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                            <button key={n} onClick={() => setPage(n)}
                                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${page === n ? 'bg-[#0500A3] text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                                {n}
                            </button>
                        ))}
                        {totalPages > 5 && <span className="text-slate-400 text-xs px-1">...</span>}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Kanban Tab ───────────────────────────────────────────────────────────────
function KanbanActivos() {
    const columns = KANBAN_COLUMNS.map(col => ({
        ...col,
        items: MOCK_ACTIVOS.filter(a => estadoToKanban[a.estado] === col.id),
    }));

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[900px]">
                {columns.map(col => (
                    <div key={col.id} className="flex-1 min-w-[220px]">
                        {/* Column header */}
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.dot }} />
                            <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{col.items.length}</span>
                        </div>

                        {/* Cards */}
                        <div className="flex flex-col gap-3">
                            {col.items.map(a => (
                                <div key={a.id}
                                    className="bg-white rounded-xl border shadow-sm p-3.5 hover:shadow-md transition-shadow cursor-pointer"
                                    style={{ borderColor: col.border }}>
                                    <div className="text-[10px] text-slate-400 font-mono mb-1">{a.id}</div>
                                    <div className="text-sm font-semibold text-slate-800 mb-0.5">{a.articulo}</div>
                                    <div className="text-xs text-slate-500 mb-2">{a.marca}</div>

                                    {/* Depreciation bar */}
                                    <div className="mb-2">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                            <span>Depreciación</span>
                                            <span className="font-bold" style={{ color: col.color }}>{a.pctDep}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all"
                                                style={{ width: `${a.pctDep}%`, backgroundColor: col.color }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-slate-600">{fmt(a.valorReal)}</span>
                                        <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                                            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add placeholder */}
                            <button className="w-full text-center text-xs text-slate-400 py-3 border border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:text-slate-500 transition-colors">
                                + Agregar activo
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InventarioClient() {
    const [tab, setTab] = useState<'tabla' | 'kanban'>('tabla');

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-6 h-6 text-[#0500A3]" />
                        Inventario de Activos
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestiona y controla todos los bienes de la iglesia. Genera reportes de depreciación o importa desde CSV.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button className="flex items-center gap-1.5 text-sm border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                        <Upload className="w-4 h-4" /> Importar CSV
                    </button>
                    <button className="flex items-center gap-1.5 text-sm bg-[#0500A3] text-white px-3 py-2 rounded-lg hover:bg-[#0600c2] transition-colors shadow-sm font-medium">
                        <Plus className="w-4 h-4" /> Nuevo Activo
                    </button>
                    <button className="flex items-center gap-1.5 text-sm border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                        <Download className="w-4 h-4" /> Exportar Excel
                    </button>
                </div>
            </div>

            {/* Stats */}
            <StatsCards />

            {/* Action Cards */}
            <ActionCards />

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5">
                {[
                    { key: 'tabla', label: 'Tabla', icon: Table2 },
                    { key: 'kanban', label: 'Kanban — Estado de Depreciación', icon: LayoutGrid },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as 'tabla' | 'kanban')}
                        className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-all ${tab === t.key
                                ? 'bg-[#0500A3] text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200'
                            }`}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'tabla' ? <TablaActivos /> : <KanbanActivos />}
        </div>
    );
}
