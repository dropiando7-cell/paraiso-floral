'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Printer,
  RefreshCw,
  Sparkles,
  ClipboardPaste,
  Search,
  Calendar,
  Filter,
  ArrowUpDown,
  Tag,
  Receipt,
  FileCheck,
  Building2,
  Calculator,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import EscanearFacturaModal from './EscanearFacturaModal';
import PegarExcelModal from './PegarExcelModal';

export interface RegistroCompraFila {
  id: string;
  fecha: string;
  descripcion: string;
  factura: string | null;
  rtn?: string | null;
  categoria?: string | null;
  comprobanteUrl?: string | null;
  exenta: number;
  gravada: number;
  isv15: number;
  total: number;
  creadoPor?: {
    nombre: string;
    apellido: string;
  } | null;
}

const CATEGORIAS_CONFIG: Record<string, { label: string; icon: string; badgeClass: string }> = {
  FLORES_IMPORTACION: { label: 'Flores / Importación', icon: '🌸', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  INSUMOS_FLORISTERIA: { label: 'Insumos (Oasis)', icon: '🎀', badgeClass: 'bg-pink-100 text-pink-800 border-pink-200' },
  FLETES_TRANSPORTE: { label: 'Fletes y Envíos', icon: '🚚', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  COMBUSTIBLE: { label: 'Combustible', icon: '⛽', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  SERVICIOS_PUBLICOS: { label: 'Servicios Públicos', icon: '⚡', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  GASTOS_OPERATIVOS: { label: 'Gastos Operativos', icon: '📦', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ALIMENTACION_VIATICOS: { label: 'Alimentación / Viáticos', icon: '🍲', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  OTROS: { label: 'Otros Gastos', icon: '📁', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' },
  GENERAL: { label: 'General', icon: '📄', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' },
};

export default function ComprasExcelGrid() {
  const [compras, setCompras] = useState<RegistroCompraFila[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [ordenAsc, setOrdenAsc] = useState<boolean>(false);

  // Modales
  const [modalEscanearAbierto, setModalEscanearAbierto] = useState<boolean>(false);
  const [modalPegarAbierto, setModalPegarAbierto] = useState<boolean>(false);

  // Fila de Entrada Rápida estilo Excel
  const [nuevaFecha, setNuevaFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nuevaDesc, setNuevaDesc] = useState<string>('');
  const [nuevaFactura, setNuevaFactura] = useState<string>('');
  const [nuevoRtn, setNuevoRtn] = useState<string>('');
  const [nuevaCategoria, setNuevaCategoria] = useState<string>('GASTOS_OPERATIVOS');
  const [nuevaExenta, setNuevaExenta] = useState<string>('');
  const [nuevaGravada, setNuevaGravada] = useState<string>('');
  const [nuevoIsv15, setNuevoIsv15] = useState<string>('');
  const [nuevoTotal, setNuevoTotal] = useState<string>('');
  const [guardandoFila, setGuardandoFila] = useState<boolean>(false);

  // Edición Inline en celda
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const descInputRef = useRef<HTMLInputElement>(null);

  const cargarCompras = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (mesSeleccionado) params.append('mes', mesSeleccionado);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (categoriaFiltro !== 'TODAS') params.append('categoria', categoriaFiltro);
      params.append('order', ordenAsc ? 'asc' : 'desc');

      const res = await fetch(`/api/compras?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCompras(json.compras || []);
      }
    } catch (err) {
      console.error('Error cargando compras:', err);
      toast.error('Error al cargar registros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCompras();
  }, [mesSeleccionado, categoriaFiltro, ordenAsc]);

  // Búsqueda con debounce suave
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarCompras();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Autocalcular ISV y Total cuando cambian Exenta o Gravada
  useEffect(() => {
    const exenta = parseFloat(nuevaExenta || '0');
    const gravada = parseFloat(nuevaGravada || '0');
    const isvCalculado = gravada > 0 ? (gravada * 0.15) : 0;

    setNuevoIsv15(isvCalculado > 0 ? isvCalculado.toFixed(2) : '');
    const totalCalc = exenta + gravada + isvCalculado;

    if (totalCalc > 0) {
      setNuevoTotal(totalCalc.toFixed(2));
    } else {
      setNuevoTotal('');
    }
  }, [nuevaExenta, nuevaGravada]);

  // Si el usuario cambia el ISV manualmente, recalcular el total
  useEffect(() => {
    const exenta = parseFloat(nuevaExenta || '0');
    const gravada = parseFloat(nuevaGravada || '0');
    const isv = parseFloat(nuevoIsv15 || '0');
    const totalCalc = exenta + gravada + isv;

    if (totalCalc > 0) {
      setNuevoTotal(totalCalc.toFixed(2));
    }
  }, [nuevoIsv15]);

  const handleAgregarFila = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!nuevaDesc.trim()) {
      toast.error('La descripción (proveedor/concepto) es obligatoria');
      descInputRef.current?.focus();
      return;
    }

    const exentaNum = parseFloat(nuevaExenta || '0');
    const gravadaNum = parseFloat(nuevaGravada || '0');
    const isv15Num = parseFloat(nuevoIsv15 || '0');
    const totalNum = parseFloat(nuevoTotal || '0');

    if (totalNum <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    try {
      setGuardandoFila(true);
      const payload = {
        fecha: nuevaFecha,
        descripcion: nuevaDesc.trim(),
        factura: nuevaFactura.trim() || undefined,
        rtn: nuevoRtn.trim() || undefined,
        categoria: nuevaCategoria,
        exenta: exentaNum,
        gravada: gravadaNum,
        isv15: isv15Num,
        total: totalNum
      };

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar la fila');

      toast.success('Compra agregada');

      // Limpiar campos para la siguiente fila, conservando la fecha
      setNuevaDesc('');
      setNuevaFactura('');
      setNuevoRtn('');
      setNuevaExenta('');
      setNuevaGravada('');
      setNuevoIsv15('');
      setNuevoTotal('');
      descInputRef.current?.focus();

      cargarCompras();
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar registro');
    } finally {
      setGuardandoFila(false);
    }
  };

  // Guardar edición Inline de una celda
  const handleSaveInlineEdit = async (id: string, field: string) => {
    try {
      const payload: any = { id };

      if (['exenta', 'gravada', 'isv15', 'total'].includes(field)) {
        payload[field] = parseFloat(editValue || '0');
      } else {
        payload[field] = editValue;
      }

      const res = await fetch('/api/compras', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al actualizar');

      // Actualizar estado local inmediatamente
      setCompras((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: payload[field] } : c))
      );
      setEditingCell(null);
      toast.success('Celda actualizada');
    } catch (err) {
      toast.error('Error al guardar cambio');
    }
  };

  const handleEliminarCompra = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de compra?')) return;

    try {
      const res = await fetch(`/api/compras?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al eliminar');

      toast.success('Registro eliminado');
      cargarCompras();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar registro');
    }
  };

  // Exportar Excel Oficial
  const handleExportarExcel = () => {
    if (compras.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const wsData = [
      ['DISTRIBUIDORA PARAISO FLORAL - LIBRO DE COMPRAS'],
      [`PERÍODO: ${mesSeleccionado || 'TODOS'} | FECHA EXPORTACIÓN: ${new Date().toLocaleDateString('es-HN')}`],
      [],
      ['#', 'FECHA', 'PROVEEDOR / DESCRIPCIÓN', 'N° FACTURA', 'RTN', 'CATEGORÍA', 'EXENTA', 'GRAVADA 15%', 'ISV 15%', 'TOTAL (HNL)'],
      ...compras.map((c, i) => [
        i + 1,
        new Date(c.fecha).toLocaleDateString('es-HN'),
        c.descripcion,
        c.factura || '',
        c.rtn || '',
        CATEGORIAS_CONFIG[c.categoria || 'GENERAL']?.label || c.categoria || 'General',
        Number(c.exenta),
        Number(c.gravada),
        Number(c.isv15),
        Number(c.total)
      ]),
      [],
      [
        '',
        '',
        'TOTALES ACUMULADOS:',
        '',
        '',
        '',
        totalExenta,
        totalGravada,
        totalIsv15,
        granTotal
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Libro_Compras');
    XLSX.writeFile(wb, `Libro_Compras_${mesSeleccionado}_ParaisoFloral.xlsx`);
    toast.success('Excel descargado exitosamente');
  };

  const handleImprimir = () => {
    window.print();
  };

  // Totales acumulados
  const totalExenta = compras.reduce((acc, c) => acc + Number(c.exenta || 0), 0);
  const totalGravada = compras.reduce((acc, c) => acc + Number(c.gravada || 0), 0);
  const totalIsv15 = compras.reduce((acc, c) => acc + Number(c.isv15 || 0), 0);
  const granTotal = compras.reduce((acc, c) => acc + Number(c.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Tarjetas KPI de Resumen Contable */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Gran Total */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-rose-900 to-pink-950 text-white rounded-3xl p-4 shadow-lg shadow-rose-950/20 border border-rose-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
              Total Compras
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight">
              L. {granTotal.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-rose-300 font-medium mt-0.5">
              {compras.length} comprobantes en período
            </p>
          </div>
        </div>

        {/* Crédito Fiscal ISV 15% (Clave para impuestos) */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-purple-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
              Crédito ISV 15%
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
              %
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black font-mono text-purple-900">
              L. {totalIsv15.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Deducible de ventas
            </p>
          </div>
        </div>

        {/* Total Gravada */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Total Gravada 15%
            </span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black font-mono text-slate-800">
              L. {totalGravada.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Base imponible
            </p>
          </div>
        </div>

        {/* Total Exenta */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
              Total Exenta
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black font-mono text-emerald-900">
              L. {totalExenta.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Compras libres de ISV
            </p>
          </div>
        </div>

        {/* Total Registros */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Facturas / Tickets
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
              {compras.length}
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Registros en el libro
            </p>
          </div>
        </div>
      </div>

      {/* 2. Contenedor Principal Estilo Excel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[750px]">
        {/* Barra Superior con Acciones Pro e IA */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-pink-950 p-4 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 border-b border-rose-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-rose-300 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Libro de Compras y Gastos
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-400 text-slate-950">
                    EXCEL GRID
                  </span>
                </h2>
              </div>
              <p className="text-rose-200 text-xs font-medium">
                Edición de celdas en tiempo real, escaneo de comprobantes por IA y reportes fiscales.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón IA Destacado */}
            <button
              onClick={() => setModalEscanearAbierto(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 border border-purple-400/40"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Escanear Factura (IA)</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-[9px] rounded-full uppercase">
                Flash
              </span>
            </button>

            {/* Pegar desde Excel */}
            <button
              onClick={() => setModalPegarAbierto(true)}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-500/40"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Pegar de Excel</span>
            </button>

            {/* Exportar Excel */}
            <button
              onClick={handleExportarExcel}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-all border border-slate-600 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>Exportar .xlsx</span>
            </button>

            {/* Imprimir Reporte */}
            <button
              onClick={handleImprimir}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-all border border-slate-600 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros (Búsqueda, Mes, Categoría, Orden) */}
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar proveedor, factura, RTN o concepto..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* Selector de Mes */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="month"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="bg-transparent font-bold text-slate-800 text-xs outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setMesSeleccionado('')}
                className="text-[10px] text-slate-400 hover:text-rose-600 font-bold ml-1"
                title="Ver todos los meses"
              >
                (Todos)
              </button>
            </div>

            {/* Filtro de Categoría */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="bg-transparent font-bold text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="TODAS">Todas las categorías</option>
                {Object.entries(CATEGORIAS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.icon} {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botón de Orden Cronológico */}
          <button
            onClick={() => setOrdenAsc(!ordenAsc)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{ordenAsc ? 'Más antiguas primero' : 'Más recientes primero'}</span>
          </button>
        </div>

        {/* 3. Fila de Entrada Rápida de Datos (Estilo Excel en parte superior) */}
        <div className="bg-rose-50/60 p-3.5 border-b border-rose-200">
          <form onSubmit={handleAgregarFila} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-rose-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Plus className="w-4 h-4 text-rose-600" />
                Ingreso Rápido de Compra (Presiona Enter para guardar)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-xs">
              {/* Fecha */}
              <div className="md:col-span-2">
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none"
                  title="Fecha de Compra"
                  required
                />
              </div>

              {/* Proveedor / Descripción */}
              <div className="md:col-span-3">
                <input
                  ref={descInputRef}
                  type="text"
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  placeholder="Proveedor / Descripción *"
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none uppercase"
                />
              </div>

              {/* Nro Factura */}
              <div className="md:col-span-1">
                <input
                  type="text"
                  value={nuevaFactura}
                  onChange={(e) => setNuevaFactura(e.target.value)}
                  placeholder="N° Factura"
                  className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none uppercase"
                />
              </div>

              {/* Categoría */}
              <div className="md:col-span-1">
                <select
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  className="w-full px-1.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none truncate"
                  title="Categoría"
                >
                  {Object.entries(CATEGORIAS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exenta */}
              <div className="md:col-span-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevaExenta}
                  onChange={(e) => setNuevaExenta(e.target.value)}
                  placeholder="Exenta L."
                  className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none text-right"
                />
              </div>

              {/* Gravada */}
              <div className="md:col-span-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevaGravada}
                  onChange={(e) => setNuevaGravada(e.target.value)}
                  placeholder="Gravada L."
                  className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none text-right"
                />
              </div>

              {/* L0.15 (ISV) */}
              <div className="md:col-span-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoIsv15}
                  onChange={(e) => setNuevoIsv15(e.target.value)}
                  placeholder="ISV 15%"
                  className="w-full px-2 py-2 bg-purple-50 border border-purple-300 rounded-xl font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none text-right"
                />
              </div>

              {/* Total */}
              <div className="md:col-span-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={nuevoTotal}
                  onChange={(e) => setNuevoTotal(e.target.value)}
                  placeholder="Total L."
                  className="w-full px-2 py-2 bg-rose-100 border-2 border-rose-300 rounded-xl font-mono font-black text-rose-950 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none text-right"
                />
              </div>

              {/* Botón Guardar */}
              <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={guardandoFila}
                  className="w-full py-2 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                >
                  {guardandoFila ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Fila</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 4. Tabla de Datos Estilo Excel con Edición en Celda */}
        <div className="flex-1 overflow-auto bg-slate-50/30">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-600" />
              <p className="text-xs font-semibold text-slate-600">Cargando libro de compras...</p>
            </div>
          ) : compras.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-900 text-base">Sin registros de compra</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Utiliza el botón de escaneo con IA o la fila superior para registrar tus primeras compras.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead className="sticky top-0 z-10 bg-slate-200/95 border-b border-slate-300 backdrop-blur-xs text-[11px] font-black text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">#</th>
                  <th className="py-2.5 px-3 w-28 border-r border-slate-300">FECHA</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">PROVEEDOR / CONCEPTO</th>
                  <th className="py-2.5 px-3 w-28 border-r border-slate-300">FACTURA</th>
                  <th className="py-2.5 px-3 w-28 border-r border-slate-300">RTN</th>
                  <th className="py-2.5 px-3 w-32 border-r border-slate-300">CATEGORÍA</th>
                  <th className="py-2.5 px-3 w-24 text-right border-r border-slate-300">EXENTA</th>
                  <th className="py-2.5 px-3 w-24 text-right border-r border-slate-300">GRAVADA</th>
                  <th className="py-2.5 px-3 w-24 text-right border-r border-slate-300 text-purple-900 bg-purple-50/60 font-black">
                    L0.15 (ISV)
                  </th>
                  <th className="py-2.5 px-4 w-32 text-right border-r border-slate-300 bg-rose-100 text-rose-950 font-black">
                    TOTAL (HNL)
                  </th>
                  <th className="py-2.5 px-2 w-14 text-center">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {compras.map((c, index) => {
                  const catConfig = CATEGORIAS_CONFIG[c.categoria || 'GENERAL'] || CATEGORIAS_CONFIG.GENERAL;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-rose-50/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* # */}
                      <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-400 border-r border-slate-200">
                        {index + 1}
                      </td>

                      {/* Fecha (editable inline) */}
                      <td
                        onDoubleClick={() => {
                          setEditingCell({ id: c.id, field: 'fecha' });
                          setEditValue(new Date(c.fecha).toISOString().split('T')[0]);
                        }}
                        className="py-2 px-3 font-mono font-medium text-slate-800 border-r border-slate-200 cursor-pointer"
                        title="Doble clic para editar fecha"
                      >
                        {editingCell?.id === c.id && editingCell?.field === 'fecha' ? (
                          <input
                            type="date"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(c.id, 'fecha')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineEdit(c.id, 'fecha')}
                            className="w-full p-1 bg-white border border-rose-500 rounded text-xs font-mono outline-none"
                          />
                        ) : (
                          new Date(c.fecha).toLocaleDateString('es-HN')
                        )}
                      </td>

                      {/* Proveedor / Descripción (editable inline) */}
                      <td
                        onDoubleClick={() => {
                          setEditingCell({ id: c.id, field: 'descripcion' });
                          setEditValue(c.descripcion);
                        }}
                        className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 truncate max-w-xs cursor-pointer"
                        title="Doble clic para editar descripción"
                      >
                        {editingCell?.id === c.id && editingCell?.field === 'descripcion' ? (
                          <input
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(c.id, 'descripcion')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineEdit(c.id, 'descripcion')}
                            className="w-full p-1 bg-white border border-rose-500 rounded text-xs uppercase outline-none"
                          />
                        ) : (
                          c.descripcion
                        )}
                      </td>

                      {/* Factura (editable inline) */}
                      <td
                        onDoubleClick={() => {
                          setEditingCell({ id: c.id, field: 'factura' });
                          setEditValue(c.factura || '');
                        }}
                        className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200 cursor-pointer"
                        title="Doble clic para editar factura"
                      >
                        {editingCell?.id === c.id && editingCell?.field === 'factura' ? (
                          <input
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(c.id, 'factura')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineEdit(c.id, 'factura')}
                            className="w-full p-1 bg-white border border-rose-500 rounded text-xs font-mono outline-none"
                          />
                        ) : (
                          c.factura || '-'
                        )}
                      </td>

                      {/* RTN */}
                      <td className="py-2 px-3 font-mono text-slate-500 border-r border-slate-200">
                        {c.rtn || '-'}
                      </td>

                      {/* Categoría */}
                      <td className="py-2 px-3 border-r border-slate-200">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.badgeClass}`}>
                          <span>{catConfig.icon}</span>
                          <span className="truncate max-w-[100px]">{catConfig.label}</span>
                        </span>
                      </td>

                      {/* Exenta */}
                      <td
                        onDoubleClick={() => {
                          setEditingCell({ id: c.id, field: 'exenta' });
                          setEditValue(String(c.exenta));
                        }}
                        className="py-2 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 cursor-pointer"
                        title="Doble clic para editar"
                      >
                        {editingCell?.id === c.id && editingCell?.field === 'exenta' ? (
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(c.id, 'exenta')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineEdit(c.id, 'exenta')}
                            className="w-full p-1 bg-white border border-rose-500 rounded text-xs font-mono text-right outline-none"
                          />
                        ) : c.exenta > 0 ? (
                          c.exenta.toLocaleString('es-HN', { minimumFractionDigits: 2 })
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Gravada */}
                      <td
                        onDoubleClick={() => {
                          setEditingCell({ id: c.id, field: 'gravada' });
                          setEditValue(String(c.gravada));
                        }}
                        className="py-2 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 cursor-pointer"
                        title="Doble clic para editar"
                      >
                        {editingCell?.id === c.id && editingCell?.field === 'gravada' ? (
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(c.id, 'gravada')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineEdit(c.id, 'gravada')}
                            className="w-full p-1 bg-white border border-rose-500 rounded text-xs font-mono text-right outline-none"
                          />
                        ) : c.gravada > 0 ? (
                          c.gravada.toLocaleString('es-HN', { minimumFractionDigits: 2 })
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* L0.15 ISV */}
                      <td
                        onDoubleClick={() => {
                          setEditingCell({ id: c.id, field: 'isv15' });
                          setEditValue(String(c.isv15));
                        }}
                        className="py-2 px-3 text-right font-mono font-bold text-purple-900 bg-purple-50/30 border-r border-slate-200 cursor-pointer"
                        title="Doble clic para editar"
                      >
                        {editingCell?.id === c.id && editingCell?.field === 'isv15' ? (
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(c.id, 'isv15')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineEdit(c.id, 'isv15')}
                            className="w-full p-1 bg-white border border-rose-500 rounded text-xs font-mono text-right outline-none"
                          />
                        ) : c.isv15 > 0 ? (
                          c.isv15.toLocaleString('es-HN', { minimumFractionDigits: 2 })
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Total */}
                      <td
                        onDoubleClick={() => {
                          setEditingCell({ id: c.id, field: 'total' });
                          setEditValue(String(c.total));
                        }}
                        className="py-2 px-4 text-right font-mono font-black border-r border-slate-200 bg-rose-50/40 text-rose-900 cursor-pointer"
                        title="Doble clic para editar"
                      >
                        {editingCell?.id === c.id && editingCell?.field === 'total' ? (
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(c.id, 'total')}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineEdit(c.id, 'total')}
                            className="w-full p-1 bg-white border border-rose-500 rounded text-xs font-mono text-right outline-none"
                          />
                        ) : (
                          `L. ${c.total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleEliminarCompra(c.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar compra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Fila Inferior de Totales Estilo Excel */}
              <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-black text-slate-900">
                <tr>
                  <td colSpan={6} className="py-3 px-4 text-right text-xs uppercase tracking-wider border-r border-slate-300">
                    TOTALES ACUMULADOS:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs border-r border-slate-300">
                    L. {totalExenta.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs border-r border-slate-300">
                    L. {totalGravada.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs border-r border-slate-300 text-purple-900 bg-purple-100/70">
                    L. {totalIsv15.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm border-r border-slate-300 bg-rose-200/80 text-rose-950 font-black">
                    L. {granTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Modales */}
      <EscanearFacturaModal
        isOpen={modalEscanearAbierto}
        onClose={() => setModalEscanearAbierto(false)}
        onCompraGuardada={cargarCompras}
      />

      <PegarExcelModal
        isOpen={modalPegarAbierto}
        onClose={() => setModalPegarAbierto(false)}
        onImportadoExitoso={cargarCompras}
      />
    </div>
  );
}
