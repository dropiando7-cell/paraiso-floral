'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  Search,
  MessageCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Flower2,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Plus,
  Download,
  Filter,
  MapPin,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalAbono from '@/components/cxc/ModalAbono';
import ModalNotaCredito from '@/components/cxc/ModalNotaCredito';
import ModalSaldoInicial from '@/components/cxc/ModalSaldoInicial';
import ModalRegistrarFactura from '@/components/cxc/ModalRegistrarFactura';
import ExcelLiveGrid from '@/components/cxc/ExcelLiveGrid';
import { exportarCarteraGeneralExcel } from '@/utils/cxcExportUtils';

interface ClienteCxC {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  departamento?: string | null;
  ruta?: string | null;
  vendedorId?: string | null;
  vendedorNombre?: string | null;
  rtn?: string | null;
  limiteCredito: number;
  saldoInicial?: number;
  fechaSaldoInicial?: string | Date | null;
  diasCredito: number;
  saldoTotal: number;
  saldoVencido: number;
  facturasPendientesCount: number;
  maxDiasMora: number;
  ultimoPago: {
    monto: number;
    fecha: string;
  } | null;
}

interface ResumenCxC {
  totalCartera: number;
  totalVencido: number;
  cobradoEsteMes: number;
  clientesMorososCount: number;
  antiguedad: {
    alDia: number;
    porVencer: number;
    vencido: number;
    enRiesgo: number;
  };
}

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  role: string;
  puesto?: string;
  rutasAsignadas: string[];
  puedeVerTodasCxC: boolean;
}

interface VendedorOption {
  id: string;
  nombre: string;
  email: string;
  puesto?: string;
  rutasAsignadas: string[];
}

export default function CuentasPorCobrarPage() {
  const [resumen, setResumen] = useState<ResumenCxC | null>(null);
  const [clientes, setClientes] = useState<ClienteCxC[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filtro, setFiltro] = useState<string>('CON_SALDO');
  const [departamentoFiltro, setDepartamentoFiltro] = useState<string>('TODOS');
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('TODOS');
  const [rutaFiltro, setRutaFiltro] = useState<string>('TODOS');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [vendedores, setVendedores] = useState<VendedorOption[]>([]);
  const [viewMode, setViewMode] = useState<'INLINE' | 'CARDS' | 'EXCEL'>('INLINE');

  // Modales
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCxC | null>(null);
  const [modalAbonoOpen, setModalAbonoOpen] = useState<boolean>(false);
  const [modalNCOpen, setModalNCOpen] = useState<boolean>(false);
  const [modalSaldoInicialOpen, setModalSaldoInicialOpen] = useState<boolean>(false);
  const [modalFacturaOpen, setModalFacturaOpen] = useState<boolean>(false);

  // Cargar perfil y lista de vendedores
  useEffect(() => {
    fetch('/api/cxc/vendedores')
      .then(res => res.json())
      .then(data => {
        if (data.currentUser) setCurrentUser(data.currentUser);
        if (data.vendedores) setVendedores(data.vendedores);
      })
      .catch(err => console.error('Error cargando vendedores:', err));
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const paramsResumen = new URLSearchParams();
      if (vendedorFiltro !== 'TODOS') paramsResumen.set('vendedorId', vendedorFiltro);
      if (rutaFiltro !== 'TODOS') paramsResumen.set('ruta', rutaFiltro);
      const urlResumen = `/api/cxc/resumen${paramsResumen.toString() ? `?${paramsResumen.toString()}` : ''}`;

      const resResumen = await fetch(urlResumen);
      if (resResumen.ok) {
        const dataResumen = await resResumen.json();
        setResumen(dataResumen);
      } else {
        console.error('Error al obtener resumen de CxC:', resResumen.status);
      }

      const paramsClientes = new URLSearchParams();
      if (search.trim()) paramsClientes.set('q', search.trim());
      if (filtro) paramsClientes.set('filtro', filtro);
      if (departamentoFiltro !== 'TODOS') paramsClientes.set('departamento', departamentoFiltro);
      if (vendedorFiltro !== 'TODOS') paramsClientes.set('vendedorId', vendedorFiltro);
      if (rutaFiltro !== 'TODOS') paramsClientes.set('ruta', rutaFiltro);
      const url = `/api/cxc/clientes?${paramsClientes.toString()}`;

      const resClientes = await fetch(url);
      if (resClientes.ok) {
        const dataClientes = await resClientes.json();
        setClientes(dataClientes);
      } else {
        console.error('Error al obtener clientes de CxC:', resClientes.status);
      }
    } catch (err) {
      console.error('Error cargando cuentas por cobrar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtro, departamentoFiltro, vendedorFiltro, rutaFiltro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Lista de departamentos únicos para filtro de rutas
  const departamentosDisponibles = React.useMemo(() => {
    const depts = new Set<string>();
    clientes.forEach(c => {
      if (c.departamento && c.departamento.trim()) {
        depts.add(c.departamento.trim().toUpperCase());
      }
    });
    return Array.from(depts);
  }, [clientes]);

  const generarWhatsAppLink = (cliente: ClienteCxC) => {
    if (!cliente.telefono) return null;
    const cleanPhone = cliente.telefono.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 8 ? `504${cleanPhone}` : cleanPhone;
    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${cliente.id}/cxc` : '';

    const texto = `*DISTRIBUIDORA PARAISO FLORAL*
*Estado de Cuenta Oficial*

Cliente: *${cliente.nombre}*

• *Saldo Pendiente Total:* L. ${cliente.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
• *Facturas Pendientes:* ${cliente.facturasPendientesCount} factura(s)
${cliente.saldoVencido > 0 ? `• *Saldo Vencido:* L. ${cliente.saldoVencido.toLocaleString('es-HN', { minimumFractionDigits: 2 })}` : '• *Estado:* Al día'}

• *Ver o Descargar Estado de Cuenta en PDF:*
${publicUrl}

¡Agradecemos su preferencia y puntualidad!`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(texto)}`;
  };

  const getStatusBadge = (diasMora: number, saldoTotal: number) => {
    if (saldoTotal <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <CheckCircle className="w-3.5 h-3.5 text-slate-500" /> Solventado
        </span>
      );
    }
    if (diasMora <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Clock className="w-3.5 h-3.5 text-emerald-600" /> Al Día (0-7d)
        </span>
      );
    }
    if (diasMora <= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" /> Por Vencer (8-15d)
        </span>
      );
    }
    if (diasMora <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> Vencido (16-30d)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> En Riesgo (&gt;30d)
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-lg shadow-emerald-700/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-white backdrop-blur-sm">
            <Coins className="w-4 h-4 text-emerald-200" /> Control Financiero Paraíso Floral
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Cuentas por Cobrar (CxC)
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm font-medium">
            Seguimiento de saldo de clientes, modo hoja de cálculo interactiva y recuperación de cartera.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón + Registrar Factura */}
          <button
            onClick={() => {
              setClienteSeleccionado(null);
              setModalFacturaOpen(true);
            }}
            className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 rounded-2xl transition-all flex items-center gap-2 text-xs font-black shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ Registrar Factura</span>
          </button>

          {/* Botón Exportar a Excel */}
          <button
            onClick={() => {
              exportarCarteraGeneralExcel(clientes as any);
              toast.success('Descargando archivo Excel de Cartera CxC...');
            }}
            className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-2xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm shrink-0 cursor-pointer"
            title="Exportar cartera a Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          {/* Botón Ver Reportes */}
          <Link
            href="/cxc/reportes"
            className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-2xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm shrink-0"
          >
            <span>📊 Reportes</span>
          </Link>

          {/* Botón Actualizar */}
          <button
            onClick={cargarDatos}
            className="p-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-2xl transition-all flex items-center justify-center text-xs font-bold shadow-sm shrink-0 cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen de Cartera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Cartera */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total por Cobrar</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              L
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              L. {resumen ? resumen.totalCartera.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Cartera activa distribuida</p>
          </div>
        </div>

        {/* KPI 2: Saldo Vencido / Morosos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Vencido</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
              L. {resumen ? resumen.totalVencido.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-rose-700/80 font-medium mt-0.5">
              {resumen?.clientesMorososCount || 0} cliente(s) en mora (&gt;15 días)
            </p>
          </div>
        </div>

        {/* KPI 3: Recaudado Este Mes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cobrado Este Mes</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-teal-700 font-mono">
              L. {resumen ? resumen.cobradoEsteMes.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Ingresos recuperados en caja</p>
          </div>
        </div>

        {/* KPI 4: Al Día */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Al Día (0-7 días)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
              L. {resumen ? resumen.antiguedad.alDia.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-emerald-800 font-medium mt-0.5">Crédito dentro del plazo habitual</p>
          </div>
        </div>
      </div>

      {/* Selector de Modo de Vista & Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Fila 1: Selector de Vistas + Buscador */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nombre, teléfono, RTN o ubicación..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
            />
          </div>

          {/* Switcher de 3 Modos de Vista: Lista Inline | Tarjetas | Hoja de Cálculo Excel Live */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('EXCEL')}
              title="Modo Hoja de Cálculo Interactiva (Excel Live Grid)"
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'EXCEL'
                  ? 'bg-emerald-600 text-white shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Hoja de Cálculo (Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('INLINE')}
              title="Vista Lista Tabla"
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'INLINE'
                  ? 'bg-white text-emerald-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              title="Vista Tarjetas Móvil"
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-white text-emerald-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Tarjetas</span>
            </button>
          </div>
        </div>

        {/* Fila 2: Pestañas de Filtros Avanzados (Top Deudores, Morosos, Rutas) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Pestañas de Filtro */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'CON_SALDO', label: 'Con Saldo' },
              { id: 'TOP_DEUDORES', label: '🔥 Top Deudores (Mayor Deuda)' },
              { id: 'MOROSOS', label: '⚠️ Morosos (>15d)' },
              { id: 'TODOS', label: 'Todos' },
              { id: 'AL_DIA', label: '0-7d Al Día' },
              { id: 'POR_VENCER', label: '8-15d Por Vencer' },
              { id: 'VENCIDO', label: '16-30d Vencido' },
              { id: 'RIESGO', label: '>30d En Riesgo' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFiltro(tab.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filtro === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtros de Vendedor y Ruta para Gerencia / Badge para Vendedor */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {currentUser?.puedeVerTodasCxC ? (
              <>
                {/* Selector de Vendedor */}
                <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-black text-slate-500 uppercase">Vendedor:</span>
                  <select
                    value={vendedorFiltro}
                    onChange={(e) => setVendedorFiltro(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="TODOS">Todos los Vendedores</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} {v.puesto ? `(${v.puesto})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Ruta Comercial */}
                <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-black text-slate-500 uppercase">Ruta:</span>
                  <select
                    value={rutaFiltro}
                    onChange={(e) => setRutaFiltro(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="TODOS">Todas las Rutas</option>
                    <option value="Ruta Occidente">Ruta Occidente (José Méndez)</option>
                    <option value="Ruta La Esperanza">Ruta La Esperanza (Isamara Vigil)</option>
                    <option value="Ruta Guamilito / Progreso">Ruta Guamilito / Progreso (Erick Saavedra)</option>
                    <option value="Cartera Francis Carías">Cartera Francis Carías</option>
                    <option value="Nacional / Todas las Rutas">Nacional / Todas las Rutas</option>
                  </select>
                </div>
              </>
            ) : (
              currentUser && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                  <span>👤 Cartera de {currentUser.nombre}</span>
                  <span>•</span>
                  <span>📍 {currentUser.rutasAsignadas?.[0] || 'Ruta Asignada'}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* RENDERIZADO SEGÚN MODO DE VISTA */}
      {viewMode === 'EXCEL' ? (
        /* VISTA 1: MODO HOJA DE CÁLCULO (EXCEL LIVE GRID) */
        <ExcelLiveGrid
          initialClienteId={clientes[0]?.id || null}
          onOpenModalFactura={(c) => {
            setClienteSeleccionado(c || null);
            setModalFacturaOpen(true);
          }}
          onOpenModalAbono={(c) => {
            setClienteSeleccionado(c || null);
            setModalAbonoOpen(true);
          }}
          onOpenModalNC={(c) => {
            setClienteSeleccionado(c || null);
            setModalNCOpen(true);
          }}
        />
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <p className="text-xs font-semibold text-slate-600">Cargando cuentas por cobrar de Paraíso Floral...</p>
        </div>
      ) : clientes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No se encontraron clientes con este filtro</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Intenta cambiar el término de búsqueda o selecciona el filtro &quot;Todos&quot;.
          </p>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* VISTA 2: MODO TARJETAS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map(c => {
            const waLink = generarWhatsAppLink(c);

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Header Cliente */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/cxc/cliente/${c.id}`}
                      className="font-bold text-base text-slate-900 hover:text-emerald-600 transition-colors line-clamp-1"
                    >
                      {c.nombre}
                    </Link>
                    {getStatusBadge(c.maxDiasMora, c.saldoTotal)}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      📱 {c.telefono || 'Sin teléfono'} {c.departamento && `• 📍 ${c.departamento}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                      <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                      {c.ruta || 'Ruta Occidente'}
                    </span>
                    {c.vendedorNombre && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        👤 {c.vendedorNombre}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bloque de Saldos */}
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Saldo Pendiente:</span>
                    <span className="font-black text-base text-slate-900 font-mono">
                      L. {c.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {c.saldoVencido > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                      <span className="text-rose-600 font-bold">De los cuales Vencido:</span>
                      <span className="font-bold text-rose-600 font-mono">
                        L. {c.saldoVencido.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>{c.facturasPendientesCount} factura(s) pendiente(s)</span>
                    <span>Máx: {c.maxDiasMora} días</span>
                  </div>
                </div>

                {/* Botones Rápidos Touch Móviles */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                  {/* Botón Abonar */}
                  <button
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setModalAbonoOpen(true);
                    }}
                    className="py-2 px-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] rounded-xl transition-all shadow-2xs flex items-center justify-center gap-0.5 cursor-pointer"
                    title="Registrar Pago o Abono"
                  >
                    <span>Abonar</span>
                  </button>

                  {/* Botón Nota Crédito */}
                  <button
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setModalNCOpen(true);
                    }}
                    className="py-2 px-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-[11px] rounded-xl transition-all shadow-2xs flex items-center justify-center gap-0.5 cursor-pointer"
                    title="Registrar Ajuste por Flor Dañada"
                  >
                    <span>Ajuste</span>
                  </button>

                  {/* Botón Saldo Inicial Excel */}
                  <button
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setModalSaldoInicialOpen(true);
                    }}
                    className="py-2 px-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-[11px] rounded-xl transition-all shadow-2xs flex items-center justify-center gap-0.5 cursor-pointer"
                    title="Asignar o editar Saldo Inicial"
                  >
                    <span>Saldo</span>
                  </button>

                  {/* Botón WhatsApp Directo */}
                  {waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[11px] rounded-xl transition-all shadow-2xs flex items-center justify-center gap-0.5"
                      title="Enviar Estado de Cuenta por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WApp</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="py-2 px-1 bg-slate-100 text-slate-300 font-bold text-[11px] rounded-xl cursor-not-allowed flex items-center justify-center gap-0.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WApp</span>
                    </button>
                  )}
                </div>

                {/* Enlace a Detalle */}
                <Link
                  href={`/cxc/cliente/${c.id}`}
                  className="w-full py-1.5 text-center text-xs font-semibold text-emerald-600 hover:underline flex items-center justify-center gap-1"
                >
                  <span>Ver Estado de Cuenta Completo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA 3: MODO LISTA INLINE (FILAS) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cliente / Contacto</th>
                  <th className="py-3.5 px-3">Estado Morosidad</th>
                  <th className="py-3.5 px-3">Facturas Pendientes</th>
                  <th className="py-3.5 px-3 text-right">Saldo Pendiente</th>
                  <th className="py-3.5 px-4 text-center">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map(c => {
                  const waLink = generarWhatsAppLink(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      {/* Cliente Name & Phone & Route */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/cxc/cliente/${c.id}`}
                          className="font-extrabold text-sm text-slate-900 hover:text-emerald-600 transition-colors block"
                        >
                          {c.nombre}
                        </Link>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[11px] text-slate-500 font-medium">
                            📱 {c.telefono || 'Sin teléfono'} {c.departamento && `• 📍 ${c.departamento}`}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                            {c.ruta || 'Ruta Occidente'}
                          </span>
                          {c.vendedorNombre && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                              👤 {c.vendedorNombre}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        {getStatusBadge(c.maxDiasMora, c.saldoTotal)}
                      </td>

                      {/* Facturas Pendientes Info */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {c.facturasPendientesCount} factura(s)
                        </div>
                        {c.maxDiasMora > 0 ? (
                          <span className="text-[10px] text-amber-700 font-semibold">
                            Máx: {c.maxDiasMora} días
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Al día</span>
                        )}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="text-base font-black text-slate-900 font-mono">
                          L. {c.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                        </div>
                        {c.saldoVencido > 0 && (
                          <div className="text-[10px] font-bold text-rose-600 font-mono">
                            Vencido: L. {c.saldoVencido.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons Row */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* 1. Factura */}
                          <button
                            onClick={() => {
                              setClienteSeleccionado(c);
                              setModalFacturaOpen(true);
                            }}
                            className="w-[84px] h-8 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer shrink-0"
                            title="Registrar Factura / Cargo"
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Factura</span>
                          </button>

                          {/* 2. Abonar */}
                          <button
                            onClick={() => {
                              setClienteSeleccionado(c);
                              setModalAbonoOpen(true);
                            }}
                            className="w-[84px] h-8 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer shrink-0"
                            title="Abonar"
                          >
                            <DollarSign className="w-3.5 h-3.5 shrink-0" />
                            <span>Abonar</span>
                          </button>

                          {/* 3. Ajuste */}
                          <button
                            onClick={() => {
                              setClienteSeleccionado(c);
                              setModalNCOpen(true);
                            }}
                            className="w-[80px] h-8 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer shrink-0"
                            title="Ajuste por Flor Dañada"
                          >
                            <Flower2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Ajuste</span>
                          </button>

                          {/* 4. WApp */}
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-[78px] h-8 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 shrink-0"
                              title="Enviar por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>WApp</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="w-[78px] h-8 bg-slate-100 text-slate-300 font-bold text-xs rounded-xl cursor-not-allowed flex items-center justify-center gap-1 shrink-0 border border-slate-200/50"
                              title="Sin teléfono registrado"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>WApp</span>
                            </button>
                          )}

                          {/* 5. Chevron */}
                          <Link
                            href={`/cxc/cliente/${c.id}`}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
                            title="Ver Estado de Cuenta Completo"
                          >
                            <ChevronRight className="w-4 h-4 shrink-0" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <ModalRegistrarFactura
        isOpen={modalFacturaOpen}
        onClose={() => {
          setModalFacturaOpen(false);
          setClienteSeleccionado(null);
        }}
        onSuccess={cargarDatos}
        clientePreseleccionado={clienteSeleccionado}
      />

      <ModalAbono
        isOpen={modalAbonoOpen}
        onClose={() => {
          setModalAbonoOpen(false);
          setClienteSeleccionado(null);
        }}
        onSuccess={cargarDatos}
        cliente={clienteSeleccionado}
      />

      <ModalNotaCredito
        isOpen={modalNCOpen}
        onClose={() => {
          setModalNCOpen(false);
          setClienteSeleccionado(null);
        }}
        onSuccess={cargarDatos}
        cliente={clienteSeleccionado}
      />

      <ModalSaldoInicial
        isOpen={modalSaldoInicialOpen}
        onClose={() => {
          setModalSaldoInicialOpen(false);
          setClienteSeleccionado(null);
        }}
        onSuccess={cargarDatos}
        cliente={clienteSeleccionado}
      />
    </div>
  );
}
