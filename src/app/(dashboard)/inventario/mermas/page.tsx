'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingDown,
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  BarChart3,
  Flower2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Maximize2,
  Minimize2,
  LayoutDashboard,
  Zap,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { ProductAutocompleteCell, ProductCatalogItem } from '@/components/mermas/ProductAutocompleteCell';
import { MotivoSelectBadge, getMotivoInfo } from '@/components/mermas/MotivoSelectBadge';

interface RegistroMermaItem {
  id: string;
  fecha: string;
  productoId: string | null;
  nombreProducto: string;
  sku: string | null;
  categoria: string | null;
  cantidad: number;
  motivo: string;
  notas: string | null;
  costoUnitario: number | null;
  usuario?: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  } | null;
}

interface MermasKPIs {
  totalMermasMes: number;
  florMayorMerma: { nombre: string; cantidad: number };
  perdidasHoy: number;
  costoTotalEstimado: number;
  desglosePorMotivo: Record<string, number>;
  desglosePorCategoria: Record<string, number>;
  mesSeleccionado: string;
}

const fmtLps = (n: number) =>
  n.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 });

const formatFechaDMY = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
};

export default function MermasPage() {
  const [mermas, setMermas] = useState<RegistroMermaItem[]>([]);
  const [kpis, setKpis] = useState<MermasKPIs>({
    totalMermasMes: 0,
    florMayorMerma: { nombre: 'Ninguna', cantidad: 0 },
    perdidasHoy: 0,
    costoTotalEstimado: 0,
    desglosePorMotivo: {},
    desglosePorCategoria: {},
    mesSeleccionado: ''
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PLANILLA' | 'ANALISIS'>('PLANILLA');
  const [showCards, setShowCards] = useState<boolean>(false); // Ocultas por defecto
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);

  // Manejador de Modo Kiosko (Pantalla Completa)
  const toggleKioskMode = (enable?: boolean) => {
    const nextState = enable !== undefined ? enable : !isKioskMode;
    setIsKioskMode(nextState);

    try {
      if (nextState) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (e) {}
  };

  // Escuchar tecla Escape para salir de Kiosko
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isKioskMode) {
        toggleKioskMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKioskMode]);

  // Filtros
  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMes, setSelectedMes] = useState<string>(currentMonthValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [motivoFiltro, setMotivoFiltro] = useState('TODOS');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS');

  // Paginación
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Correlativo Oficial del Reporte Mensual
  const correlativoOficial = selectedMes === 'TODOS' ? 'MRM-HISTÓRICO' : `MRM-${selectedMes}`;
  const estadoReporte = selectedMes === 'TODOS'
    ? 'HISTÓRICO'
    : selectedMes >= currentMonthValue
      ? 'ABIERTO'
      : 'CERRADO';

  // Fila de Entrada Rápida Superior
  const todayStr = new Date().toISOString().split('T')[0];
  const [newFecha, setNewFecha] = useState(todayStr);
  const [newProductoNombre, setNewProductoNombre] = useState('');
  const [newProductoId, setNewProductoId] = useState<string | null>(null);
  const [newSku, setNewSku] = useState<string | null>(null);
  const [newCategoria, setNewCategoria] = useState('Misceláneo');
  const [newCantidad, setNewCantidad] = useState<string>('1');
  const [newMotivo, setNewMotivo] = useState('MADURACION_MARCHITA');
  const [newNotas, setNewNotas] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const newFlorInputRef = useRef<HTMLInputElement>(null);
  const newCantidadInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos desde la API
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMes) params.set('mes', selectedMes);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (motivoFiltro !== 'TODOS') params.set('motivo', motivoFiltro);
      if (categoriaFiltro !== 'TODOS') params.set('categoria', categoriaFiltro);

      const res = await fetch(`/api/inventario/mermas?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar mermas');

      const data = await res.json();
      setMermas(data.mermas || []);
      if (data.kpis) setKpis(data.kpis);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando registros de merma');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    cargarDatos();
  }, [selectedMes, motivoFiltro, categoriaFiltro]);

  // Manejar búsqueda con debounce leve
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      cargarDatos();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Selección de producto en la fila nueva
  const handleSelectProductNewRow = (p: ProductCatalogItem) => {
    setNewProductoId(p.id);
    setNewProductoNombre(p.name);
    setNewSku(p.code);
    setNewCategoria(p.category || 'Misceláneo');

    // Foco automático en cantidad para digitar de una vez
    setTimeout(() => {
      newCantidadInputRef.current?.focus();
      newCantidadInputRef.current?.select();
    }, 50);
  };

  // Guardar nueva fila
  const handleGuardarNuevaFila = async () => {
    if (!newProductoNombre.trim()) {
      toast.error('Escribe o selecciona una flor');
      newFlorInputRef.current?.focus();
      return;
    }

    const cantNum = parseInt(newCantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0');
      newCantidadInputRef.current?.focus();
      return;
    }

    try {
      setIsSubmittingNew(true);
      const res = await fetch('/api/inventario/mermas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: newFecha,
          productoId: newProductoId,
          nombreProducto: newProductoNombre.trim().toUpperCase(),
          sku: newSku,
          categoria: newCategoria,
          cantidad: cantNum,
          motivo: newMotivo,
          notas: newNotas.trim() || null
        })
      });

      if (!res.ok) throw new Error('Error al guardar registro');

      toast.success(`Merma registrada: ${cantNum} de ${newProductoNombre.toUpperCase()}`);

      // Limpiar campos de la fila de entrada rápida
      setNewProductoNombre('');
      setNewProductoId(null);
      setNewSku(null);
      setNewCategoria('Misceláneo');
      setNewCantidad('1');
      setNewNotas('');

      // Regresar a la página 1 para ver el registro arriba inmediatamente
      setCurrentPage(1);

      // Recargar datos
      await cargarDatos();

      // Devolver foco automático a la flor para captura continua
      setTimeout(() => {
        newFlorInputRef.current?.focus();
      }, 60);
    } catch (err: any) {
      toast.error(err.message || 'Error guardando merma');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Actualizar fila existente (inline edit)
  const handleUpdateItem = async (id: string, updates: Partial<RegistroMermaItem>) => {
    try {
      // Optimistic update
      setMermas(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));

      const res = await fetch('/api/inventario/mermas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });

      if (!res.ok) throw new Error('Error al actualizar');
      toast.success('Cambio guardado');
      cargarDatos();
    } catch (err) {
      toast.error('Error al actualizar registro');
      cargarDatos();
    }
  };

  // Eliminar fila
  const handleDeleteItem = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar registro de merma de "${nombre}"?`)) return;

    try {
      setMermas(prev => prev.filter(m => m.id !== id));
      const res = await fetch(`/api/inventario/mermas?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Registro eliminado');
      cargarDatos();
    } catch (err) {
      toast.error('Error al eliminar registro');
      cargarDatos();
    }
  };

  // Exportar a Excel
  const handleExportarExcel = () => {
    if (mermas.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const rows = mermas.map((m, idx) => ({
      '#': idx + 1,
      'Fecha': formatFechaDMY(m.fecha),
      'Código / SKU': m.sku || 'N/A',
      'Producto / Flor': m.nombreProducto,
      'Categoría': m.categoria || 'Misceláneo',
      'Cantidad (Tallos/Uds)': m.cantidad,
      'Motivo': getMotivoInfo(m.motivo).label,
      'Costo Unitario (HNL)': m.costoUnitario ? Number(m.costoUnitario).toFixed(2) : '0.00',
      'Costo Total Merma (HNL)': m.costoUnitario ? (m.cantidad * Number(m.costoUnitario)).toFixed(2) : '0.00',
      'Observaciones': m.notas || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mermas');

    // Nombre de archivo con mes
    const fileName = `Control_Mermas_Paraiso_Floral_${selectedMes || 'Historico'}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Reporte Excel descargado');
  };

  // Meses disponibles para el selector rápido
  const mesesOpciones = [
    { value: '2026-10', label: 'Octubre 2026' },
    { value: '2026-09', label: 'Septiembre 2026' },
    { value: '2026-08', label: 'Agosto 2026' },
    { value: '2026-07', label: 'Julio 2026' },
    { value: 'TODOS', label: 'Todos los Períodos' }
  ];

  // Cálculos de Paginación
  const totalItems = mermas.length;
  const totalPages = itemsPerPage === 9999 ? 1 : Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === 9999 ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedMermas = itemsPerPage === 9999 ? mermas : mermas.slice(startIndex, endIndex);

  return (
    <div className={isKioskMode 
      ? "fixed inset-0 z-50 bg-slate-50 overflow-y-auto p-4 sm:p-6 space-y-4"
      : "p-4 sm:p-6 max-w-7xl mx-auto space-y-5 bg-slate-50/60 min-h-screen"
    }>
      {/* Barra de Kiosko Activo */}
      {isKioskMode && (
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider">
              Modo Kiosko Activo • Digitación Rápida de Bodega
            </span>
          </div>
          <button
            onClick={() => toggleKioskMode(false)}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-white/20"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Salir de Kiosko (Esc)</span>
          </button>
        </div>
      )}
      {/* ========================================================================= */}
      {/* CABECERA & TITULO */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold border border-emerald-300">
            <Flower2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Módulo de Control de Inventario</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Control y Registro Rápido de Mermas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Captura ágil de pérdidas de flores en bodega, análisis de causas y cálculo de factores mensuales.
          </p>
        </div>

        {/* Botones de acción / exportación */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Ver / Ocultar Tarjetas KPI */}
          <button
            onClick={() => setShowCards(!showCards)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm border ${
              showCards
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Mostrar u ocultar indicadores numéricos"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
            <span>{showCards ? 'Ocultar Métricas' : 'Ver Métricas'}</span>
          </button>

          {/* Botón Modo Kiosko */}
          <button
            onClick={() => toggleKioskMode(!isKioskMode)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
              isKioskMode
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 active:scale-95 text-white'
            }`}
            title="Activar pantalla completa para digitación sin distracciones"
          >
            {isKioskMode ? (
              <>
                <Minimize2 className="w-4 h-4 text-slate-950" />
                <span>Salir Kiosko</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-emerald-300" />
                <span>Modo Kiosko</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'PLANILLA' ? 'ANALISIS' : 'PLANILLA')}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
              activeTab === 'ANALISIS'
                ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>{activeTab === 'ANALISIS' ? 'Ver Planilla' : 'Análisis y Factores'}</span>
          </button>

          <button
            onClick={handleExportarExcel}
            className="px-3.5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95 rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            title="Exportar a Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={cargarDatos}
            className="p-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95 rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center justify-center cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TARJETAS KPI (METRIC CARDS - OCULTAS POR DEFECTO PARA MAXIMA LIMPIEZA) */}
      {/* ========================================================================= */}
      {showCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* KPI 1: Total Mermas del Mes */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Mermas del Mes
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {kpis.totalMermasMes} <span className="text-sm font-semibold text-slate-500">tallos</span>
            </h3>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Acumulado de pérdidas en {selectedMes === 'TODOS' ? 'todo el histórico' : selectedMes}
            </p>
          </div>
        </div>

        {/* KPI 2: Flor con Mayor Merma */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Flor con Mayor Merma
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg">
              🌻
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate uppercase">
              {kpis.florMayorMerma.nombre}
            </h3>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
              {kpis.florMayorMerma.cantidad > 0
                ? `${kpis.florMayorMerma.cantidad} tallos perdidos este mes`
                : 'Sin pérdidas registradas'}
            </p>
          </div>
        </div>

        {/* KPI 3: Pérdidas Hoy */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pérdidas Registradas Hoy
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {kpis.perdidasHoy} <span className="text-sm font-semibold text-slate-500">uds</span>
            </h3>
            <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
              Reportadas en la fecha actual
            </p>
          </div>
        </div>

        {/* KPI 4: Impacto Financiero en Costo Base */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Costo Estimado Pérdida
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
              L
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {fmtLps(kpis.costoTotalEstimado)}
            </h3>
            <p className="text-[11px] text-purple-800 font-semibold mt-0.5">
              Valorizado según costo base de compra
            </p>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS, CORRELATIVO OFICIAL & SELECTOR DE MES */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Selector de Mes Rápido */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Mes:</span>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="bg-transparent border-none outline-none font-black text-slate-900 cursor-pointer"
            >
              {mesesOpciones.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Badge de Correlativo Oficial y Estado */}
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reporte:</span>
            <span className="font-mono font-black text-emerald-300 text-xs tracking-wider">
              {correlativoOficial}
            </span>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              estadoReporte === 'ABIERTO'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : estadoReporte === 'CERRADO'
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
            }`}>
              {estadoReporte === 'ABIERTO' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ABIERTO</span>
                </>
              ) : estadoReporte === 'CERRADO' ? (
                <>
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>CERRADO</span>
                </>
              ) : (
                <span>HISTÓRICO</span>
              )}
            </span>
          </div>

          {/* Filtro por Motivo */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={motivoFiltro}
              onChange={(e) => setMotivoFiltro(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer"
            >
              <option value="TODOS">Todos los Motivos</option>
              <option value="MADURACION_MARCHITA">Maduración / Marchita</option>
              <option value="TALLO_QUEBRADO">Tallo Quebrado</option>
              <option value="HONGO_BOTRYTIS">Hongo / Botrytis</option>
              <option value="TRANSPORTE">Daño Transporte</option>
              <option value="OTRO">Otro Motivo</option>
            </select>
          </div>

          {/* Buscador de texto */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por flor, código SKU o nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="text-right text-xs font-bold text-slate-500 self-center">
          Total registros: <span className="text-slate-900 font-extrabold">{totalItems}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: PLANILLA TIPO HOJA DE CÁLCULO ÁGIL */}
      {/* ========================================================================= */}
      {activeTab === 'PLANILLA' && (
        <div className="space-y-4">
          {/* ========================================================================= */}
          {/* BARRA SUPERIOR FIJA DE CAPTURA RÁPIDA (DIGITACIÓN CONTINUA EN BODEGA) */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-emerald-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Zap className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase text-white flex items-center gap-2">
                    <span>Ingreso Rápido de Merma</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      {correlativoOficial}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Escribe la flor, digita la cantidad y presiona <kbd className="px-1.5 py-0.5 bg-white/10 text-emerald-300 rounded font-mono font-bold border border-white/10">Enter</kbd> para guardar.
                  </p>
                </div>
              </div>

              {/* Indicador de atajos de teclado */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                <span>Atajos:</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono font-bold">
                  Enter ↵
                </kbd>
                <span>o</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono font-bold">
                  Ctrl + Enter
                </kbd>
              </div>
            </div>

            {/* Fila Principal de Entradas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* 1. Fecha */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Fecha
                </label>
                <input
                  type="date"
                  value={newFecha}
                  onChange={(e) => setNewFecha(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleGuardarNuevaFila();
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm"
                />
              </div>

              {/* 2. Flor / Producto (con Buscador Inteligente Coincidencias) */}
              <div className="lg:col-span-4 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  <span>Flor / Producto</span>
                  {newSku && (
                    <span className="font-mono text-emerald-300 text-[10px]">
                      SKU: {newSku}
                    </span>
                  )}
                </div>
                <ProductAutocompleteCell
                  value={newProductoNombre}
                  onChange={setNewProductoNombre}
                  onSelectProduct={handleSelectProductNewRow}
                  inputRef={newFlorInputRef}
                  placeholder="Escribe flor (ej. Girasol, Rosa)..."
                  className="border-white/20 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-400 shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleGuardarNuevaFila();
                    }
                  }}
                />
              </div>

              {/* 3. Cantidad */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Cantidad (Tallos)
                </label>
                <input
                  ref={newCantidadInputRef}
                  type="number"
                  min="1"
                  value={newCantidad}
                  onChange={(e) => setNewCantidad(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGuardarNuevaFila();
                    }
                  }}
                  className="w-full text-center py-2 px-3 font-mono font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none text-sm shadow-sm"
                  placeholder="1"
                />
              </div>

              {/* 4. Causa / Motivo */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Causa / Motivo
                </label>
                <div className="bg-white rounded-xl p-0.5 shadow-sm">
                  <MotivoSelectBadge
                    value={newMotivo}
                    onChange={setNewMotivo}
                  />
                </div>
              </div>

              {/* 5. Botón Insertar */}
              <div className="lg:col-span-2">
                <button
                  onClick={handleGuardarNuevaFila}
                  disabled={isSubmittingNew || !newProductoNombre.trim()}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-300"
                  title="Insertar línea de merma (Enter)"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isSubmittingNew ? 'Guardando...' : 'Insertar (Enter)'}</span>
                </button>
              </div>
            </div>

            {/* Fila Secundaria: Categoría y Notas */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2 text-slate-300 text-[11px] whitespace-nowrap">
                <span>Categoría:</span>
                <span className="bg-white/10 text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-white/10">
                  {newCategoria}
                </span>
              </div>
              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={newNotas}
                  onChange={(e) => setNewNotas(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGuardarNuevaFila();
                    }
                  }}
                  placeholder="Observación / nota opcional (ej: tallo roto en descarga)..."
                  className="w-full py-1.5 px-3 text-xs text-slate-100 bg-white/10 border border-white/10 rounded-xl focus:bg-slate-900 focus:border-emerald-400 outline-none placeholder:text-slate-400 transition"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABLA PRINCIPAL DE REGISTROS DE MERMAS */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-3 w-28">Fecha</th>
                    <th className="py-3 px-3 min-w-[240px]">Producto / Flor (Catálogo)</th>
                    <th className="py-3 px-3 w-28">Categoría</th>
                    <th className="py-3 px-3 text-center w-28">Cantidad (Tallos)</th>
                    <th className="py-3 px-3 w-44">Motivo de Pérdida</th>
                    <th className="py-3 px-3 min-w-[160px]">Observaciones / Notas</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedMermas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                        {loading ? 'Cargando registros...' : 'No hay registros de merma para este período o filtro.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedMermas.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* # Global */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {startIndex + idx + 1}
                        </td>

                        {/* Fecha */}
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <span className="font-mono">{formatFechaDMY(m.fecha)}</span>
                        </td>

                        {/* Producto */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs uppercase">
                              {m.nombreProducto}
                            </span>
                            {m.sku && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded font-bold">
                                {m.sku}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="py-2.5 px-3">
                          <span className="inline-block text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                            {m.categoria || 'Misceláneo'}
                          </span>
                        </td>

                        {/* Cantidad Editable */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            defaultValue={m.cantidad}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (val > 0 && val !== m.cantidad) {
                                handleUpdateItem(m.id, { cantidad: val });
                              }
                            }}
                            className="w-20 text-center py-1 px-2 font-mono font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </td>

                        {/* Motivo de Pérdida */}
                        <td className="py-2.5 px-3">
                          <MotivoSelectBadge
                            value={m.motivo}
                            onChange={(newMotivo) => handleUpdateItem(m.id, { motivo: newMotivo })}
                          />
                        </td>

                        {/* Observaciones */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            defaultValue={m.notas || ''}
                            placeholder="Sin notas..."
                            onBlur={(e) => {
                              if (e.target.value !== (m.notas || '')) {
                                handleUpdateItem(m.id, { notas: e.target.value });
                              }
                            }}
                            className="w-full py-1 px-2 text-xs text-slate-700 bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg focus:bg-white focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300"
                          />
                        </td>

                        {/* Botón Eliminar */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDeleteItem(m.id, m.nombreProducto)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Fila Totalizadora */}
                <tfoot>
                  <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-300">
                    <td colSpan={4} className="py-3 px-3 text-right uppercase text-slate-700">
                      TOTAL MERMAS EN EL PERÍODO:
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-950 bg-emerald-100 text-sm font-black">
                      {kpis.totalMermasMes} tallos
                    </td>
                    <td colSpan={3} className="py-3 px-3 text-slate-500 text-[11px] font-semibold">
                      Costo base estimado: <span className="font-bold text-slate-900">{fmtLps(kpis.costoTotalEstimado)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ========================================================================= */}
            {/* CONTROLES DE PAGINACIÓN */}
            {/* ========================================================================= */}
            <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              {/* Selector de registros por página */}
              <div className="flex items-center gap-2">
                <span>Por página:</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-xs">
                  {[10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setItemsPerPage(num);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        itemsPerPage === num
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setItemsPerPage(9999);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      itemsPerPage === 9999
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>

              {/* Rango numérico */}
              <div className="text-slate-500 font-medium">
                Mostrando{' '}
                <span className="font-bold text-slate-900">
                  {totalItems === 0 ? 0 : startIndex + 1} - {endIndex}
                </span>{' '}
                de <span className="font-bold text-slate-900">{totalItems}</span> registros
              </div>

              {/* Botones de Navegación */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 rounded-xl font-bold transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer border border-slate-200 shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <span className="px-2 font-mono font-bold text-slate-800">
                  Pág. {safePage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 rounded-xl font-bold transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer border border-slate-200 shadow-xs"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: ANÁLISIS & FACTORES DE PÉRDIDAS (FIN DE MES) */}
      {/* ========================================================================= */}
      {activeTab === 'ANALISIS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Desglose por Motivo de Pérdida */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Desglose por Causa de Pérdida
                </h3>
                <p className="text-xs text-slate-500">¿Por qué razón se están perdiendo las flores?</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(kpis.desglosePorMotivo).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No hay registros suficientes</p>
              ) : (
                Object.entries(kpis.desglosePorMotivo)
                  .sort((a, b) => b[1] - a[1])
                  .map(([motivoKey, cantidad]) => {
                    const info = getMotivoInfo(motivoKey);
                    const pct = kpis.totalMermasMes > 0 
                      ? Math.round((cantidad / kpis.totalMermasMes) * 100) 
                      : 0;

                    return (
                      <div key={motivoKey} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{info.label}</span>
                          <span className="font-mono font-black text-slate-900">
                            {cantidad} tallos ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${info.bg.replace('100', '500')}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Desglose por Categoría */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Pérdidas por Tipo de Flor / Categoría
                </h3>
                <p className="text-xs text-slate-500">Volumen de mermas según la variedad botánica</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(kpis.desglosePorCategoria).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No hay registros suficientes</p>
              ) : (
                Object.entries(kpis.desglosePorCategoria)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, cantidad]) => {
                    const pct = kpis.totalMermasMes > 0 
                      ? Math.round((cantidad / kpis.totalMermasMes) * 100) 
                      : 0;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{cat}</span>
                          <span className="font-mono font-black text-slate-900">
                            {cantidad} tallos ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIP DE USO RÁPIDO */}
      {/* ========================================================================= */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900">
        <Info className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <strong>Atajo de teclado para bodega:</strong> Escribe el nombre de la flor en la última fila, selecciónala con las flechas <span className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-emerald-300">↑↓</span> y presiona <span className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-emerald-300">Enter</span>. El cursor saltará a la cantidad para que escribas el número y presiones <span className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-emerald-300">Enter</span> para guardar inmediatamente.
        </div>
      </div>
    </div>
  );
}
