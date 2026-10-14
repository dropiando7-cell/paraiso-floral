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
  Unlock,
  FolderArchive,
  Eye,
  ArrowLeft,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { ProductAutocompleteCell, ProductCatalogItem } from '@/components/mermas/ProductAutocompleteCell';
import { MotivoSelectBadge, getMotivoInfo } from '@/components/mermas/MotivoSelectBadge';
import { crearProducto } from '@/app/(dashboard)/precios/actions';

interface RegistroMermaItem {
  id: string;
  fecha: string;
  productoId: string | null;
  nombreProducto: string;
  sku: string | null;
  categoria: string | null;
  cantidad: number;
  unidadMedida: UnidadMedida;
  motivo: string;
  notas: string | null;
  costoUnitario: number | null;
  usuario?: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  } | null;
}

type UnidadMedida = 'UNIDAD' | 'PAQUETE';
type ConteoUnidad = { unidades: number; paquetes: number };
const conteoVacio: ConteoUnidad = { unidades: 0, paquetes: 0 };

interface MermasKPIs {
  totalesMes: ConteoUnidad;
  florMayorMerma: { nombre: string } & ConteoUnidad;
  perdidasHoy: ConteoUnidad;
  costoTotalEstimado: number;
  desglosePorMotivo: Record<string, ConteoUnidad>;
  desglosePorCategoria: Record<string, ConteoUnidad>;
  mesSeleccionado: string;
}

interface ReporteMensualHistorico {
  mes: string;
  totalRegistros: number;
  totalUnidades: number;
  totalPaquetes: number;
  costoEstimado: number;
  correlativo: string;
  estado: 'ABIERTO' | 'CERRADO';
}

const labelUnidad = (u: UnidadMedida, n: number) =>
  u === 'PAQUETE' ? (n === 1 ? 'paquete' : 'paquetes') : (n === 1 ? 'unidad' : 'unidades');

/** "12 uds · 3 paq" — unidades y paquetes nunca se suman entre sí */
const fmtConteo = (c?: ConteoUnidad | null) => {
  const u = c?.unidades || 0;
  const p = c?.paquetes || 0;
  if (!u && !p) return '0';
  return [u ? `${u} uds` : null, p ? `${p} paq` : null].filter(Boolean).join(' · ');
};

const pesoConteo = (c: ConteoUnidad) => c.paquetes * 1000 + c.unidades;

/** Selector segmentado Unidades / Paquetes */
function UnidadToggle({
  value,
  onChange,
  size = 'md'
}: {
  value: UnidadMedida;
  onChange: (u: UnidadMedida) => void;
  size?: 'sm' | 'md';
}) {
  const base = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-2.5 h-full text-[11px]';
  return (
    <div
      role="radiogroup"
      aria-label="Unidad de medida"
      className={`inline-flex items-stretch bg-white border border-emerald-300 rounded-xl p-0.5 shadow-2xs ${size === 'md' ? 'h-10' : ''}`}
    >
      {(['UNIDAD', 'PAQUETE'] as UnidadMedida[]).map(u => (
        <button
          key={u}
          type="button"
          role="radio"
          aria-checked={value === u}
          tabIndex={-1}
          onClick={() => onChange(u)}
          title={u === 'UNIDAD' ? 'Unidades sueltas (atajo: U)' : 'Paquetes completos (atajo: P)'}
          className={`${base} rounded-lg font-black uppercase tracking-wide transition-all cursor-pointer flex items-center ${
            value === u
              ? u === 'PAQUETE'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {u === 'UNIDAD' ? 'Uds' : 'Paq'}
        </button>
      ))}
    </div>
  );
}

const fmtLps = (n: number) =>
  n.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 });

const formatMonthName = (mesStr: string): string => {
  if (!mesStr || mesStr === 'TODOS') return 'Todos los Períodos';
  const parts = mesStr.split('-');
  if (parts.length < 2) return mesStr;
  const year = parts[0];
  const month = parts[1];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mIndex = parseInt(month, 10) - 1;
  if (mIndex >= 0 && mIndex < 12) {
    return `${monthNames[mIndex]} ${year}`;
  }
  return mesStr;
};

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
  const [historicoReportes, setHistoricoReportes] = useState<ReporteMensualHistorico[]>([]);
  const [kpis, setKpis] = useState<MermasKPIs>({
    totalesMes: conteoVacio,
    florMayorMerma: { nombre: 'Ninguna', ...conteoVacio },
    perdidasHoy: conteoVacio,
    costoTotalEstimado: 0,
    desglosePorMotivo: {},
    desglosePorCategoria: {},
    mesSeleccionado: ''
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PLANILLA' | 'HISTORICO' | 'ANALISIS'>('PLANILLA');
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
  const [fechaDisplay, setFechaDisplay] = useState(formatFechaDMY(todayStr));
  const hiddenDatePickerRef = useRef<HTMLInputElement>(null);

  const handleFechaDisplayChange = (val: string) => {
    setFechaDisplay(val);
    const parts = val.trim().split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d && m && y && y.length === 4) {
        const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        setNewFecha(iso);
      }
    }
  };

  const [newProductoNombre, setNewProductoNombre] = useState('');
  const [newProductoId, setNewProductoId] = useState<string | null>(null);
  const [newSku, setNewSku] = useState<string | null>(null);
  const [newCategoria, setNewCategoria] = useState('Misceláneo');
  const [newCantidad, setNewCantidad] = useState<string>('1');
  const [newUnidad, setNewUnidad] = useState<UnidadMedida>('UNIDAD');
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
      if (data.historicoReportes) setHistoricoReportes(data.historicoReportes);
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

  // Si el usuario vuelve a escribir, se pierde el vínculo con el catálogo
  const handleNombreNewRowChange = (val: string) => {
    setNewProductoNombre(val);
    if (newProductoId) {
      setNewProductoId(null);
      setNewSku(null);
      setNewCategoria('Misceláneo');
    }
  };

  // ===== Modal: Crear producto nuevo en el catálogo de Inventario =====
  const [crearOpen, setCrearOpen] = useState(false);
  const [crearNombre, setCrearNombre] = useState('');
  const [crearCodigo, setCrearCodigo] = useState('');
  const [crearCategoria, setCrearCategoria] = useState('');
  const [crearCosto, setCrearCosto] = useState('');
  const [crearGuardando, setCrearGuardando] = useState(false);

  const abrirCrearProducto = (nombre: string) => {
    setCrearNombre(nombre.toUpperCase());
    setCrearCodigo('FLR-' + String(Date.now()).slice(-6));
    setCrearCategoria('');
    setCrearCosto('');
    setCrearOpen(true);
  };

  const handleCrearProducto = async () => {
    const nombre = crearNombre.trim().toUpperCase();
    const codigo = crearCodigo.trim().toUpperCase();
    if (!nombre || !codigo) {
      toast.error('Nombre y código son obligatorios');
      return;
    }
    const costo = crearCosto.trim() ? Number(crearCosto) : 0;
    if (isNaN(costo) || costo < 0) {
      toast.error('Precio base inválido');
      return;
    }
    try {
      setCrearGuardando(true);
      const r = await crearProducto({
        codigo,
        descripcion: nombre,
        categoria: crearCategoria.trim() || undefined,
        costoBase: costo,
        precioVenta: 0
      });
      if (!r.success || !r.producto) {
        toast.error(r.message);
        return;
      }
      toast.success(`Producto creado: ${nombre}`);
      setCrearOpen(false);
      handleSelectProductNewRow({
        id: r.producto.id,
        code: r.producto.sku,
        name: r.producto.nombre,
        category: crearCategoria.trim() || 'Misceláneo',
        stock: 0,
        costoBase: costo || null
      });
    } catch (err: any) {
      toast.error(err.message || 'Error creando producto');
    } finally {
      setCrearGuardando(false);
    }
  };

  // Guardar nueva fila
  const handleGuardarNuevaFila = async () => {
    if (!newProductoNombre.trim()) {
      toast.error('Escribe o selecciona una flor');
      newFlorInputRef.current?.focus();
      return;
    }

    if (!newProductoId) {
      toast.error('Selecciona la flor de la lista del catálogo, o usa "Crear producto nuevo"');
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
          unidadMedida: newUnidad,
          motivo: newMotivo,
          notas: newNotas.trim() || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Error al guardar registro');
      }

      toast.success(`Merma registrada: ${cantNum} ${labelUnidad(newUnidad, cantNum)} de ${newProductoNombre.toUpperCase()}`);

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
      'Cantidad': m.cantidad,
      'Unidad': m.unidadMedida === 'PAQUETE' ? 'Paquete' : 'Unidad',
      'Motivo': getMotivoInfo(m.motivo).label,
      'Costo Paquete (HNL)': m.costoUnitario ? Number(m.costoUnitario).toFixed(2) : '0.00',
      'Costo Total Merma (HNL)': m.costoUnitario && m.unidadMedida === 'PAQUETE'
        ? (m.cantidad * Number(m.costoUnitario)).toFixed(2)
        : '',
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

    // Meses disponibles para el selector rápido (dinámicos desde el histórico)
    const mesesOpciones = [
      ...(historicoReportes.length > 0
        ? historicoReportes.map(r => ({
            value: r.mes,
            label: `${formatMonthName(r.mes)} (${r.correlativo})`
          }))
        : [
            { value: currentMonthValue, label: `${formatMonthName(currentMonthValue)} (MRM-${currentMonthValue})` }
          ]),
      { value: 'TODOS', label: 'Todos los Períodos (Histórico Completo)' }
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

          {/* Navegación por Pestañas */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab('PLANILLA')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'PLANILLA'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Planilla</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORICO')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'HISTORICO'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
              <span>Histórico {historicoReportes.length > 0 && `(${historicoReportes.length})`}</span>
            </button>

            <button
              onClick={() => setActiveTab('ANALISIS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ANALISIS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Análisis</span>
            </button>
          </div>

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
              {kpis.totalesMes.unidades} <span className="text-sm font-semibold text-slate-500">uds</span>
              {' '}
              <span className="text-amber-700">{kpis.totalesMes.paquetes}</span> <span className="text-sm font-semibold text-slate-500">paq</span>
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
              {pesoConteo(kpis.florMayorMerma) > 0
                ? `${fmtConteo(kpis.florMayorMerma)} perdidos en el período`
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
              {kpis.perdidasHoy.unidades} <span className="text-sm font-semibold text-slate-500">uds</span>
              {' '}
              <span className="text-amber-700">{kpis.perdidasHoy.paquetes}</span> <span className="text-sm font-semibold text-slate-500">paq</span>
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
              Valorizado según costo por paquete (solo líneas en paquetes)
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

          {/* Badge de Correlativo Oficial y Estado (Estilo Reporte Suave) */}
          <div className="flex items-center gap-2 bg-emerald-50/90 text-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
            <span className="text-[10px] text-emerald-800/80 font-bold uppercase tracking-wider">Reporte:</span>
            <span className="font-mono font-black text-emerald-950 text-xs tracking-wider">
              {correlativoOficial}
            </span>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              estadoReporte === 'ABIERTO'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : estadoReporte === 'CERRADO'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              {estadoReporte === 'ABIERTO' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>ABIERTO</span>
                </>
              ) : estadoReporte === 'CERRADO' ? (
                <>
                  <Lock className="w-2.5 h-2.5 text-slate-600" />
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
          {/* Banner Informativo cuando se está consultando un Mes Histórico Pasado */}
          {selectedMes !== currentMonthValue && selectedMes !== 'TODOS' && (
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                  <FolderArchive className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                      Consultando Reporte Histórico:
                    </span>
                    <span className="font-mono font-bold text-xs bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md border border-amber-300">
                      {correlativoOficial} • {formatMonthName(selectedMes)}
                    </span>
                    <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                      <span>Reporte Cerrado</span>
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 font-medium mt-1">
                    Estás auditando los registros de este período anterior. Tu reporte del mes actual sigue 100% a salvo e intacto.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedMes(currentMonthValue);
                  toast.success(`Regresando al mes activo: ${formatMonthName(currentMonthValue)}`);
                }}
                className="px-4 py-2.5 bg-white hover:bg-amber-100 active:scale-95 text-amber-950 border border-amber-300 rounded-2xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-amber-700" />
                <span>Volver al Mes en Curso ({formatMonthName(currentMonthValue)})</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BARRA SUPERIOR FIJA DE CAPTURA RÁPIDA (DISEÑO VERDE SUAVE TIPO REPORTE) */}
          {/* ========================================================================= */}
          <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-emerald-200">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 shadow-2xs">
                  <Zap className="w-4 h-4 text-emerald-700" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase text-emerald-950 flex items-center gap-2">
                    <span>Ingreso Rápido de Merma</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                      {correlativoOficial}
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-800/80 font-medium">
                    Escribe la flor, digita la cantidad, elige <strong>Uds</strong> o <strong>Paq</strong> (teclas <kbd className="px-1 py-0.5 bg-white text-emerald-900 rounded font-mono font-bold border border-emerald-300">U</kbd>/<kbd className="px-1 py-0.5 bg-white text-emerald-900 rounded font-mono font-bold border border-emerald-300">P</kbd>) y presiona <kbd className="px-1.5 py-0.5 bg-white text-emerald-900 rounded font-mono font-bold border border-emerald-300 shadow-2xs">Enter</kbd> para guardar.
                  </p>
                </div>
              </div>

              {/* Indicador de atajos de teclado */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald-800/80 font-medium">
                <span>Atajos:</span>
                <kbd className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-emerald-900 font-mono font-bold shadow-2xs">
                  Enter ↵
                </kbd>
                <span>o</span>
                <kbd className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-emerald-900 font-mono font-bold shadow-2xs">
                  Ctrl + Enter
                </kbd>
              </div>
            </div>

            {/* Fila Principal de Entradas - Altura Uniforme h-10 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* 1. Fecha (dd/mm/yyyy) */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Fecha (dd/mm/aaaa)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fechaDisplay}
                    onChange={(e) => handleFechaDisplayChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleGuardarNuevaFila();
                      }
                    }}
                    placeholder="dd/mm/aaaa"
                    className="w-full h-10 pl-3 pr-8 text-xs font-bold text-slate-900 bg-white border border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-mono"
                  />
                  {/* Selector nativo oculto vinculado */}
                  <input
                    ref={hiddenDatePickerRef}
                    type="date"
                    value={newFecha}
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewFecha(e.target.value);
                        setFechaDisplay(formatFechaDMY(e.target.value));
                      }
                    }}
                    className="sr-only"
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        hiddenDatePickerRef.current?.showPicker();
                      } catch {
                        hiddenDatePickerRef.current?.focus();
                      }
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer transition-colors"
                    title="Seleccionar fecha en calendario"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. Flor / Producto (con Buscador Inteligente Coincidencias) */}
              <div className="lg:col-span-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                  <span>Flor / Producto</span>
                  {newSku && (
                    <span className="font-mono text-emerald-700 text-[10px] font-bold">
                      SKU: {newSku}
                    </span>
                  )}
                </div>
                <ProductAutocompleteCell
                  value={newProductoNombre}
                  onChange={handleNombreNewRowChange}
                  onSelectProduct={handleSelectProductNewRow}
                  onCreateNew={abrirCrearProducto}
                  inputRef={newFlorInputRef}
                  placeholder="Escribe y elige de la lista (ej. Girasol, Rosa)..."
                  className={`!h-10 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs ${
                    newProductoNombre.trim() && !newProductoId ? 'border-amber-400' : 'border-emerald-300'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleGuardarNuevaFila();
                    }
                  }}
                />
              </div>

              {/* 3. Cantidad + Unidad de medida */}
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Cantidad ({newUnidad === 'PAQUETE' ? 'Paquetes' : 'Unidades'})
                </label>
                <div className="flex items-stretch gap-1.5">
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
                      } else if (e.key.toLowerCase() === 'u') {
                        e.preventDefault();
                        setNewUnidad('UNIDAD');
                      } else if (e.key.toLowerCase() === 'p') {
                        e.preventDefault();
                        setNewUnidad('PAQUETE');
                      }
                    }}
                    className="flex-1 min-w-0 h-10 text-center px-3 font-mono font-black text-slate-900 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-2xs"
                    placeholder="1"
                  />
                  <UnidadToggle value={newUnidad} onChange={setNewUnidad} />
                </div>
              </div>

              {/* 4. Causa / Motivo */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Causa / Motivo
                </label>
                <MotivoSelectBadge
                  value={newMotivo}
                  onChange={setNewMotivo}
                  className="!h-10 text-xs shadow-2xs"
                />
              </div>

              {/* 5. Botón Insertar */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider block opacity-0 select-none hidden lg:block">
                  &nbsp;
                </label>
                <button
                  onClick={handleGuardarNuevaFila}
                  disabled={isSubmittingNew || !newProductoId}
                  className="w-full h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500"
                  title="Insertar línea de merma (Enter)"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isSubmittingNew ? 'Guardando...' : 'Insertar (Enter)'}</span>
                </button>
              </div>
            </div>

            {/* Fila Secundaria: Categoría y Notas */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 text-[11px] whitespace-nowrap font-medium">
                <span>Categoría:</span>
                <span className="bg-white text-emerald-900 font-bold px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
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
                  className="w-full py-1.5 px-3 text-xs text-slate-800 bg-white border border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-400 transition shadow-2xs"
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
                    <th className="py-3 px-3 text-center w-40">Cantidad / Unidad</th>
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

                        {/* Cantidad + Unidad Editables */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
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
                              className="w-16 text-center py-1 px-2 font-mono font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <UnidadToggle
                              size="sm"
                              value={m.unidadMedida === 'PAQUETE' ? 'PAQUETE' : 'UNIDAD'}
                              onChange={(u) => {
                                if (u !== m.unidadMedida) handleUpdateItem(m.id, { unidadMedida: u });
                              }}
                            />
                          </div>
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
                    <td className="py-3 px-3 text-center font-mono text-emerald-950 bg-emerald-100 text-sm font-black whitespace-nowrap">
                      {kpis.totalesMes.unidades} uds
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-amber-800">{kpis.totalesMes.paquetes} paq</span>
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
      {/* VISTA 3: HISTÓRICO DE REPORTES MENSUALES (BANDEJA DE REPORTES MRM) */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORICO' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Banner explicativo del Archivo Histórico */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <FolderArchive className="w-6 h-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Archivo Histórico de Reportes de Merma (MRM)</span>
                </h3>
                <p className="text-xs text-slate-500 max-w-2xl font-medium leading-relaxed">
                  Al llegar la medianoche de cada fin de mes, el reporte mensual se consolida automáticamente. Al iniciar el nuevo mes, la planilla comienza en limpio para los nuevos registros sin perder ningún dato anterior. Haz clic en <strong>Cargar Planilla</strong> para revisar cualquier mes previo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
              <span>Total de Reportes:</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {historicoReportes.length}
              </span>
            </div>
          </div>

          {/* Grilla de Tarjetas de Reportes Mensuales */}
          {historicoReportes.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <FolderArchive className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">No se encontraron reportes anteriores</h4>
              <p className="text-xs text-slate-400">A medida que registres mermas, aparecerán aquí agrupados por cada mes calendario.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historicoReportes.map((rep) => {
                const esMesActual = rep.mes === currentMonthValue;
                const estaSeleccionado = selectedMes === rep.mes;

                return (
                  <div
                    key={rep.mes}
                    className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                      estaSeleccionado
                        ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Encabezado de la Tarjeta */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                            {rep.correlativo}
                          </span>
                          {estaSeleccionado && (
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                              En Pantalla
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          rep.estado === 'ABIERTO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {rep.estado === 'ABIERTO' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>EN CURSO</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                              <span>CERRADO</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Nombre del Mes */}
                      <div>
                        <h4 className="text-lg font-black text-slate-900 capitalize">
                          {formatMonthName(rep.mes)}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {esMesActual ? 'Período actual en proceso de llenado' : 'Período archivado en historial'}
                        </p>
                      </div>

                      {/* Métricas del Reporte */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Uds / Paq</span>
                          <span className="text-sm font-black text-slate-900 font-mono">
                            {rep.totalUnidades}<span className="text-slate-400"> / </span><span className="text-amber-700">{rep.totalPaquetes}</span>
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Filas</span>
                          <span className="text-sm font-black text-slate-900 font-mono">
                            {rep.totalRegistros}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Costo</span>
                          <span className="text-xs font-black text-purple-900 font-mono">
                            {fmtLps(rep.costoEstimado)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botón para Cargar en la Planilla */}
                    <div className="pt-4">
                      <button
                        onClick={() => {
                          setSelectedMes(rep.mes);
                          setActiveTab('PLANILLA');
                          toast.success(`Cargando reporte ${rep.correlativo} (${formatMonthName(rep.mes)})`);
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                          estaSeleccionado
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{estaSeleccionado ? 'Ver Planilla Detallada (Activo)' : 'Cargar y Ver Planilla Detallada'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  .sort((a, b) => pesoConteo(b[1]) - pesoConteo(a[1]))
                  .map(([motivoKey, conteo]) => {
                    const info = getMotivoInfo(motivoKey);
                    const totalRef = kpis.totalesMes.paquetes > 0
                      ? { val: conteo.paquetes, tot: kpis.totalesMes.paquetes }
                      : { val: conteo.unidades, tot: kpis.totalesMes.unidades };
                    const pct = totalRef.tot > 0 ? Math.round((totalRef.val / totalRef.tot) * 100) : 0;

                    return (
                      <div key={motivoKey} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{info.label}</span>
                          <span className="font-mono font-black text-slate-900">
                            {fmtConteo(conteo)} ({pct}%)
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
                  .sort((a, b) => pesoConteo(b[1]) - pesoConteo(a[1]))
                  .map(([cat, conteo]) => {
                    const totalRef = kpis.totalesMes.paquetes > 0
                      ? { val: conteo.paquetes, tot: kpis.totalesMes.paquetes }
                      : { val: conteo.unidades, tot: kpis.totalesMes.unidades };
                    const pct = totalRef.tot > 0 ? Math.round((totalRef.val / totalRef.tot) * 100) : 0;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{cat}</span>
                          <span className="font-mono font-black text-slate-900">
                            {fmtConteo(conteo)} ({pct}%)
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
      {/* MODAL: CREAR PRODUCTO NUEVO EN CATÁLOGO */}
      {/* ========================================================================= */}
      {crearOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !crearGuardando) setCrearOpen(false); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !crearGuardando) setCrearOpen(false);
              if (e.key === 'Enter') { e.preventDefault(); handleCrearProducto(); }
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                <Plus className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Crear producto nuevo</h3>
                <p className="text-[11px] text-slate-500">Se agrega al catálogo de Inventario y queda seleccionado.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nombre / Flor *</span>
                <input
                  autoFocus
                  value={crearNombre}
                  onChange={(e) => setCrearNombre(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 text-xs font-bold uppercase text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Código / SKU *</span>
                  <input
                    value={crearCodigo}
                    onChange={(e) => setCrearCodigo(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Categoría</span>
                  <input
                    value={crearCategoria}
                    onChange={(e) => setCrearCategoria(e.target.value)}
                    placeholder="Ej. Rosas"
                    className="w-full h-10 px-3 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Precio base por paquete (L)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={crearCosto}
                  onChange={(e) => setCrearCosto(e.target.value)}
                  placeholder="Opcional — se puede completar luego en Inventario"
                  className="w-full h-10 px-3 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCrearOpen(false)}
                disabled={crearGuardando}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearProducto}
                disabled={crearGuardando}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md cursor-pointer disabled:opacity-40 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {crearGuardando ? 'Creando...' : 'Crear y seleccionar'}
              </button>
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
