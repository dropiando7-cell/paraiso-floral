'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  X, FileSpreadsheet, FileText, Printer, Calendar, 
  Users, CreditCard, ShoppingBag, 
  Filter, CheckCircle2, ChevronRight, AlertCircle, Sparkles, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getReporteContableData, 
  FacturaReporteItem, 
  ReporteFiltros 
} from '@/app/(dashboard)/facturas/reportes-actions';
import { 
  TipoReporte, 
  exportarReporteExcel, 
  exportarReportePDF, 
  imprimirReporteHTML 
} from '@/utils/facturasReportesExport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  organizationName?: string;
}

export default function ReportesContablesModal({ isOpen, onClose, organizationName = 'Paraíso Floral' }: Props) {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('VENTAS_SAR');
  const [isPending, startTransition] = useTransition();

  // Presets de fecha
  const getInitialDates = () => {
    const now = new Date();
    // Primer día del mes actual
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return {
      desde: `${y}-${m}-01`,
      hasta: `${y}-${m}-${d}`
    };
  };

  const initialDates = getInitialDates();
  const [fechaInicio, setFechaInicio] = useState(initialDates.desde);
  const [fechaFin, setFechaFin] = useState(initialDates.hasta);
  const [presetActivo, setPresetActivo] = useState<'HOY' | 'ESTA_SEMANA' | 'ESTE_MES' | 'MES_ANTERIOR' | 'PERSONALIZADO'>('ESTE_MES');

  // Filtros secundarios
  const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | 'PARAISO' | 'HF'>('TODOS');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'VALIDAS' | 'ANULADAS'>('TODOS');
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<'TODOS' | 'FACTURA' | 'PROFORMA' | 'COTIZACION'>('FACTURA');

  // Datos y KPIs
  const [data, setData] = useState<FacturaReporteItem[]>([]);
  const [kpis, setKpis] = useState({
    totalDocumentos: 0,
    totalFacturado: 0,
    totalGravado15: 0,
    totalIsv15: 0,
    totalExento: 0,
    totalExonerado: 0,
    totalDescuentos: 0,
    totalEfectivo: 0,
    totalTransferenciaConfirmada: 0,
    totalTransferenciaPendiente: 0,
    totalTarjeta: 0,
    totalCredito: 0,
    totalAnuladas: 0
  });

  const availableVendedores = ["Jose Mendez", "Isamara Vigil", "Erick Saavedra", "Lucio Barahona", "Francis Carias"];

  // Aplicar Presets de Fechas
  const aplicarPreset = (preset: 'HOY' | 'ESTA_SEMANA' | 'ESTE_MES' | 'MES_ANTERIOR' | 'PERSONALIZADO') => {
    setPresetActivo(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'HOY') {
      const hoyStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
    } else if (preset === 'ESTA_SEMANA') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const today = new Date();
      setFechaInicio(`${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`);
      setFechaFin(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    } else if (preset === 'ESTE_MES') {
      const y = now.getFullYear();
      const m = pad(now.getMonth() + 1);
      const d = pad(now.getDate());
      setFechaInicio(`${y}-${m}-01`);
      setFechaFin(`${y}-${m}-${d}`);
    } else if (preset === 'MES_ANTERIOR') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const y = prevMonthDate.getFullYear();
      const m = pad(prevMonthDate.getMonth() + 1);
      setFechaInicio(`${y}-${m}-01`);
      setFechaFin(`${y}-${m}-${pad(lastDayPrevMonth.getDate())}`);
    }
  };

  // Carga reactiva de datos al cambiar cualquier filtro
  const cargarDatos = () => {
    startTransition(async () => {
      const filtros: ReporteFiltros = {
        fechaInicio,
        fechaFin,
        origen: filtroOrigen,
        vendedor: filtroVendedor,
        estado: filtroEstado,
        tipoDocumento: filtroTipoDoc
      };

      const res = await getReporteContableData(filtros);
      if (res.success) {
        setData(res.data);
        setKpis(res.kpis);
      } else {
        toast.error(res.error || 'Error al cargar datos del reporte');
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen, fechaInicio, fechaFin, filtroOrigen, filtroVendedor, filtroEstado, filtroTipoDoc]);

  // Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentFiltros: ReporteFiltros = {
    fechaInicio,
    fechaFin,
    origen: filtroOrigen,
    vendedor: filtroVendedor,
    estado: filtroEstado,
    tipoDocumento: filtroTipoDoc
  };

  const handleDescargarExcel = () => {
    if (data.length === 0) {
      toast.error('No hay registros en el rango seleccionado');
      return;
    }
    try {
      exportarReporteExcel({
        tipo: tipoReporte,
        data,
        filtros: currentFiltros,
        organizationName
      });
      toast.success('Reporte Excel generado exitosamente');
    } catch (e: any) {
      toast.error('Error al generar Excel: ' + (e.message || ''));
    }
  };

  const handleDescargarPDF = async () => {
    if (data.length === 0) {
      toast.error('No hay registros en el rango seleccionado');
      return;
    }
    const toastId = toast.loading('Generando documento PDF formal...');
    try {
      await exportarReportePDF({
        tipo: tipoReporte,
        data,
        filtros: currentFiltros,
        organizationName
      });
      toast.success('Reporte PDF descargado', { id: toastId });
    } catch (e: any) {
      toast.error('Error al generar PDF: ' + (e.message || ''), { id: toastId });
    }
  };

  const handleImprimir = () => {
    if (data.length === 0) {
      toast.error('No hay registros en el rango seleccionado');
      return;
    }
    imprimirReporteHTML({
      tipo: tipoReporte,
      data,
      filtros: currentFiltros,
      organizationName
    });
  };

  const formatLempiras = (val: number) => {
    return `L. ${Number(val || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center animate-in fade-in p-2 sm:p-4 print:hidden">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Centro de Reportes Contables
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Contabilidad & SAR
                </span>
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium">
                Genera libros fiscales de venta, arqueo de cobros y liquidación de comisiones
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all shadow-xs"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* 1. SELECCIÓN DE REPORTE (4 Cards Planas y Elegantes) */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-500" />
              1. Selecciona el Tipo de Reporte
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Reporte 1: Libro SAR */}
              <button
                type="button"
                onClick={() => setTipoReporte('VENTAS_SAR')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  tipoReporte === 'VENTAS_SAR'
                    ? 'border-blue-500 bg-blue-50/30 shadow-md ring-2 ring-blue-500/10'
                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                    <FileText size={20} />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm">Libro de Ventas SAR</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Correlativos, CAI, RTN, Exento, Gravado 15%/18%, ISV y Facturas Anuladas.
                  </p>
                </div>
                {tipoReporte === 'VENTAS_SAR' && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                    <CheckCircle2 size={13} /> Seleccionado
                  </div>
                )}
              </button>

              {/* Reporte 2: Métodos de Pago */}
              <button
                type="button"
                onClick={() => setTipoReporte('METODOS_PAGO')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  tipoReporte === 'METODOS_PAGO'
                    ? 'border-emerald-500 bg-emerald-50/30 shadow-md ring-2 ring-emerald-500/10'
                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                    <CreditCard size={20} />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm">Cobros y Métodos de Pago</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Efectivo, Transferencias (confirmadas vs pendientes), Tarjeta y Ventas a Crédito.
                  </p>
                </div>
                {tipoReporte === 'METODOS_PAGO' && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 size={13} /> Seleccionado
                  </div>
                )}
              </button>

              {/* Reporte 3: Vendedores */}
              <button
                type="button"
                onClick={() => setTipoReporte('VENDEDORES')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  tipoReporte === 'VENDEDORES'
                    ? 'border-indigo-500 bg-indigo-50/30 shadow-md ring-2 ring-indigo-500/10'
                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
                    <Users size={20} />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm">Ventas por Vendedor</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Comisiones, total vendido por cada vendedor, ventas de contado vs crédito.
                  </p>
                </div>
                {tipoReporte === 'VENDEDORES' && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                    <CheckCircle2 size={13} /> Seleccionado
                  </div>
                )}
              </button>

              {/* Reporte 4: Productos */}
              <button
                type="button"
                onClick={() => setTipoReporte('PRODUCTOS')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  tipoReporte === 'PRODUCTOS'
                    ? 'border-amber-500 bg-amber-50/30 shadow-md ring-2 ring-amber-500/10'
                    : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5">
                    <ShoppingBag size={20} />
                  </div>
                  <h5 className="font-bold text-slate-800 text-sm">Salidas de Productos</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Unidades vendidas de cada producto, precio promedio, subtotales y auditoría Kárdex.
                  </p>
                </div>
                {tipoReporte === 'PRODUCTOS' && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-600">
                    <CheckCircle2 size={13} /> Seleccionado
                  </div>
                )}
              </button>

            </div>
          </div>

          {/* 2. RANGO DE FECHAS & FILTROS */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            
            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                Rango de Fechas:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'HOY', label: 'Hoy' },
                  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
                  { id: 'ESTE_MES', label: 'Este Mes' },
                  { id: 'MES_ANTERIOR', label: 'Mes Anterior' },
                  { id: 'PERSONALIZADO', label: 'Personalizado' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => aplicarPreset(p.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      presetActivo === p.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs de Fecha y Filtros Secundarios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    setPresetActivo('PERSONALIZADO');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value);
                    setPresetActivo('PERSONALIZADO');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Empresa / Alias
                </label>
                <select
                  value={filtroOrigen}
                  onChange={(e) => setFiltroOrigen(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                >
                  <option value="TODOS">Todas las Empresas</option>
                  <option value="PARAISO">Solo Paraíso Floral</option>
                  <option value="HF">Solo HonduFlores</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Vendedor
                </label>
                <select
                  value={filtroVendedor}
                  onChange={(e) => setFiltroVendedor(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                >
                  <option value="TODOS">Todos los Vendedores</option>
                  <option value="CON_VENDEDOR">Con Vendedor Asignado</option>
                  <option value="SIN_VENDEDOR">Sin Vendedor Asignado</option>
                  <optgroup label="Vendedores">
                    {availableVendedores.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Estado Fiscal
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                >
                  <option value="TODOS">Todas (Vigentes + Anuladas)</option>
                  <option value="VALIDAS">Solo Facturas Vigentes</option>
                  <option value="ANULADAS">Solo Facturas Anuladas</option>
                </select>
              </div>

            </div>
          </div>

          {/* 3. RESUMEN DE MÉTRICAS (KPIS EN VIVO) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Facturado</span>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">
                {formatLempiras(kpis.totalFacturado)}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold">{kpis.totalDocumentos} documentos encontrados</span>
            </div>

            <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">ISV 15% Cobrado</span>
              <p className="text-base sm:text-lg font-black text-emerald-600 mt-1 tabular-nums">
                {formatLempiras(kpis.totalIsv15)}
              </p>
              <span className="text-[10px] text-emerald-700/80 font-semibold">Gravado 15%: {formatLempiras(kpis.totalGravado15)}</span>
            </div>

            <div className="bg-blue-50/40 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Efectivo vs Bancos</span>
              <p className="text-xs sm:text-sm font-black text-blue-900 mt-1 truncate">
                Efec: <span className="text-blue-600">{formatLempiras(kpis.totalEfectivo)}</span>
              </p>
              <span className="text-[10px] text-blue-700/80 font-semibold truncate block mt-0.5">
                Transf: {formatLempiras(kpis.totalTransferenciaConfirmada)}
              </span>
            </div>

            <div className="bg-indigo-50/40 p-3.5 rounded-2xl border border-indigo-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Ventas a Crédito (CxC)</span>
              <p className="text-base sm:text-lg font-black text-indigo-600 mt-1 tabular-nums">
                {formatLempiras(kpis.totalCredito)}
              </p>
              <span className="text-[10px] text-indigo-700/80 font-semibold">{kpis.totalAnuladas} facturas anuladas</span>
            </div>
          </div>

          {/* 4. VISTA PREVIA DE LOS PRIMEROS REGISTROS */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Vista Previa Rápida ({data.length} registros cargados)
              </span>
              {isPending && (
                <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                  Actualizando datos...
                </span>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 sticky top-0 font-bold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Fecha</th>
                    <th className="py-2 px-3">Correlativo</th>
                    <th className="py-2 px-3">Cliente</th>
                    <th className="py-2 px-3">Vendedor</th>
                    <th className="py-2 px-3">Estado</th>
                    <th className="py-2 px-3 text-right">ISV 15%</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.slice(0, 8).map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-600">{d.fechaEmision.split('T')[0]}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{d.correlativo}</td>
                      <td className="py-2 px-3 text-slate-700 max-w-[180px] truncate" title={d.cliente.nombre}>
                        {d.cliente.nombre}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{d.vendedorNombre || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.estado === 'ANULADA' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-600">
                        {d.estado === 'ANULADA' ? '0.00' : d.isv15.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {d.estado === 'ANULADA' ? '0.00' : d.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        No se encontraron facturas en el rango de fechas seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data.length > 8 && (
              <div className="bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100 text-center font-medium">
                Mostrando las primeras 8 de {data.length} facturas. Al descargar Excel o PDF se exportará el listado completo.
              </div>
            )}
          </div>

        </div>

        {/* Footer / Botones de Acción */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Formato de salida: <strong className="text-slate-700">Libro Contable Oficial (.xlsx / .pdf)</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Imprimir Vista Contable */}
            <button
              type="button"
              onClick={handleImprimir}
              disabled={data.length === 0 || isPending}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>

            {/* Descargar PDF */}
            <button
              type="button"
              onClick={handleDescargarPDF}
              disabled={data.length === 0 || isPending}
              className="px-4 py-2 rounded-xl border-2 border-blue-100 hover:border-blue-500 bg-white text-blue-700 text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <FileText size={16} className="text-blue-600" />
              <span>Descargar PDF</span>
            </button>

            {/* Descargar Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleDescargarExcel}
              disabled={data.length === 0 || isPending}
              className="px-4 py-2 rounded-xl border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/20 hover:shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>Descargar Excel (.xlsx)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
