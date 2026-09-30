'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trello, 
  Wrench, 
  Box, 
  Receipt, 
  CircleDollarSign, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ClipboardList, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  User,
  Zap,
  Tv,
  Truck,
  ShoppingBag,
  Wallet,
  Coins,
  Package,
  FileText,
  Settings,
  Boxes,
  BarChart3,
  Layers,
  Sparkles
} from 'lucide-react';
import { getRutas } from './inventario-ventas/rutas/actions';

interface HomeClientProps {
  dbUser: any;
  kanbanTasks: any[];
  workOrders: any[];
  totalPendingTasks: number;
  totalPendingOrders: number;
  pendingPedidos?: any[];
  tasksSummary?: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  ordersSummary?: {
    pending: number;
    inProgress: number;
    completed: number;
  };
}

export default function HomeClient({
  dbUser,
  kanbanTasks,
  workOrders,
  totalPendingTasks,
  totalPendingOrders,
  pendingPedidos = [],
  tasksSummary,
  ordersSummary
}: HomeClientProps) {
  const [activeTab, setActiveTab] = useState<'soporte' | 'kanban'>('soporte');
  const [greeting, setGreeting] = useState('¡Hola!');
  const [routeStats, setRouteStats] = useState({ active: 0, cash: 0, pending: 0 });

  useEffect(() => {
    getRutas().then(rutas => {
      const active = rutas.filter(r => r.estado === 'EN_RUTA').length;
      const cash = rutas.reduce((acc, curr) => 
        acc + (curr.estado === 'EN_RUTA' || curr.estado === 'EN_LIQUIDACION' ? Number(curr.ventasContado) + Number(curr.abonosCxC) : 0), 0
      );
      const pending = rutas.filter(r => r.estado === 'EN_LIQUIDACION').length;
      setRouteStats({ active, cash, pending });
    }).catch(() => {});
  }, []);

  // Set greeting based on local hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('¡Buenos días');
    } else if (hour < 19) {
      setGreeting('¡Buenas tardes');
    } else {
      setGreeting('¡Buenas noches');
    }
  }, []);

  const formattedDate = new Date().toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Main 3-card-per-row ERP Modules grid inspired by Monica 11 structure with ultra-modern design
  const modulesConfig = [
    {
      name: 'Facturación y Ventas',
      href: '/facturas',
      description: 'Emisión de facturas autorizadas SAR (CAI), ventas en caja rápida POS, proformas y notas de crédito.',
      icon: Receipt,
      badgeText: 'Facturación & POS',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20',
      hoverGlow: 'hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1',
      quickAction: 'Cobrar en POS'
    },
    {
      name: 'Cuentas por Cobrar',
      href: '/cxc',
      description: 'Gestión de saldos a favor/deuda de clientes, estados de cuenta, abonos y antigüedad de saldos.',
      icon: Wallet,
      badgeText: 'CxC & Saldos',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20',
      hoverGlow: 'hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1',
      quickAction: 'Ver CxC'
    },
    {
      name: 'Cierre y Control de Caja',
      href: '/caja-chica',
      description: 'Arqueos diarios de caja, aperturas, cierres, egresos rápidos y control de flujo de efectivo.',
      icon: Coins,
      badgeText: 'Caja Chica & Arqueos',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20',
      hoverGlow: 'hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1',
      quickAction: 'Abrir / Cerrar'
    },
    {
      name: 'Control de Inventario',
      href: '/inventario',
      description: 'Catálogo de productos, stock de almacén, repuestos, mermas, garantías y tomas físicas.',
      icon: Package,
      badgeText: 'Stock & Almacén',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20',
      hoverGlow: 'hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1',
      quickAction: 'Ver Catálogo'
    },
    {
      name: 'Rutas y Auto-Venta',
      href: '/inventario-ventas/rutas',
      description: 'Gestión de unidades repartidoras, camiones en tránsito, cobros en campo y liquidación.',
      icon: Truck,
      badgeText: routeStats.active > 0 ? `${routeStats.active} En Tránsito` : 'Unidades & Campo',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20',
      hoverGlow: 'hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 hover:-translate-y-1',
      quickAction: 'Ver Rutas',
      liveStat: routeStats.active > 0 ? `L${routeStats.cash.toLocaleString('es-HN', { maximumFractionDigits: 0 })} en tránsito` : null
    },
    {
      name: 'Soporte y Reparaciones',
      href: '/soporte',
      description: 'Recepción de equipos en taller, órdenes de trabajo, presupuestos de reparación y estado técnico.',
      icon: Wrench,
      badgeText: totalPendingOrders > 0 ? `${totalPendingOrders} Órdenes Activas` : 'Taller & Equipos',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      iconBg: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20',
      hoverGlow: 'hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1',
      quickAction: 'Ver Taller',
      liveStat: ordersSummary ? `${ordersSummary.inProgress} en reparación • ${ordersSummary.pending} pend.` : null
    },
    {
      name: 'Proyectos y Tareas Kanban',
      href: '/kanban',
      description: 'Tableros de trabajo en equipo, asignación de tareas, columnas de avance y colaboración.',
      icon: Trello,
      badgeText: totalPendingTasks > 0 ? `${totalPendingTasks} Tareas Pendientes` : 'Tableros Kanban',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20',
      hoverGlow: 'hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 hover:-translate-y-1',
      quickAction: 'Ver Tableros',
      liveStat: tasksSummary ? `${tasksSummary.inProgress} en ejecución • ${tasksSummary.pending} por hacer` : null
    },
    {
      name: 'Cotizaciones y Proformas',
      href: '/facturas',
      description: 'Elaboración de cotizaciones para clientes y proformas con descuento de inventario reservado.',
      icon: FileText,
      badgeText: 'Proformas & Promesas',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md shadow-purple-500/20',
      hoverGlow: 'hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1',
      quickAction: 'Nueva Cotización'
    },
    {
      name: 'Directorio de Clientes',
      href: '/contactos',
      description: 'Directorio de clientes, contactos de empresas, rutas comerciales y límites de crédito asignados.',
      icon: Users,
      badgeText: 'Expedientes & Clientes',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20',
      hoverGlow: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1',
      quickAction: 'Ver Clientes'
    },
    {
      name: 'Rentas de Equipos',
      href: '/rentas',
      description: 'Gestión de contratos de alquiler de equipos médicos, cobros mensuales y control de activos.',
      icon: Boxes,
      badgeText: 'Alquileres & Retornos',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/20',
      hoverGlow: 'hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1',
      quickAction: 'Ver Contratos'
    },
    {
      name: 'Gráficas e Informes',
      href: '/graficas',
      description: 'Métricas de ventas, volumen de facturación, gráficos de ingresos y rentabilidad por periodo.',
      icon: TrendingUp,
      badgeText: 'Reportes & Métricas',
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-md shadow-violet-500/20',
      hoverGlow: 'hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1',
      quickAction: 'Ver Informes'
    },
    {
      name: 'Configuración del Sistema',
      href: '/configuracion',
      description: 'Administración del régimen fiscal SAR, CAI, datos de empresa (Whitelabel), usuarios y perfiles.',
      icon: Settings,
      badgeText: 'SAR & Ajustes ERP',
      badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
      iconBg: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md shadow-slate-600/20',
      hoverGlow: 'hover:border-slate-400 hover:shadow-lg hover:shadow-slate-500/10 hover:-translate-y-1',
      quickAction: 'Ajustes'
    }
  ];

  // Filter shortcuts based on user role or modules permissions
  const allowedShortcuts = modulesConfig.filter(mod => {
    if (dbUser.role === 'SUPER_ADMIN') return true;
    const allowed = dbUser.accessibleModules || [];
    if (allowed.includes(mod.href)) return true;
    if (allowed.some((path: string) => path.startsWith(mod.href))) return true;
    return false;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT': return 'Urgente';
      case 'HIGH': return 'Alta';
      case 'MEDIUM': return 'Media';
      default: return 'Baja';
    }
  };

  const getOrdenEstadoBadge = (estado: string) => {
    switch (estado?.toUpperCase()) {
      case 'RECIBIDO':
        return 'bg-blue-150 text-blue-800 border-blue-200';
      case 'EN_EVALUACION':
      case 'ESPERANDO_APROBACION':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'APROBACION_PRESUPUESTO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'REPARACION':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'LISTO_ENTREGA':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getOrdenEstadoText = (estado: string) => {
    switch (estado?.toUpperCase()) {
      case 'RECIBIDO': return 'Recibido';
      case 'EN_EVALUACION': return 'En Evaluación';
      case 'ESPERANDO_APROBACION': return 'Esp. Aprobación';
      case 'APROBACION_PRESUPUESTO': return 'Presupuesto Listo';
      case 'REPARACION': return 'En Reparación';
      case 'LISTO_ENTREGA': return 'Listo para Entrega';
      default: return estado || 'Pendiente';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 ease-out py-2 w-full max-w-7xl mx-auto">
      
      {/* 1. WELCOME BANNER (Modern gradient header) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-900 text-white p-6 md:p-8 shadow-xl shadow-emerald-900/10">
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-1/3 w-[180px] h-[180px] bg-teal-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {dbUser.avatarUrl ? (
              <img 
                src={dbUser.avatarUrl} 
                alt="Avatar" 
                className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-md object-cover" 
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl border-2 border-white/20 bg-white/10 flex items-center justify-center shadow-md">
                <User className="w-8 h-8 text-white/90" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  {greeting}, {dbUser.nombre || 'Equipo'}! ☕
                </h1>
              </div>
              <p className="text-emerald-100/90 text-xs md:text-sm mt-1 capitalize font-medium flex items-center gap-2">
                <span>📅 {formattedDate}</span>
                <span className="hidden sm:inline-block">•</span>
                <span className="hidden sm:inline-block text-emerald-200 font-semibold">Módulos del Sistema Operativo ERP</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2.5 items-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md text-xs font-bold border border-white/15 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              {dbUser.role === 'SUPER_ADMIN' ? 'Super Admin' : dbUser.puesto || 'Miembro del Equipo'}
            </span>
            {dbUser.organization?.name && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md text-xs font-bold border border-white/15 shadow-2xs">
                🏢 {dbUser.organization.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Pedido Nuevo Asignado para Auxiliares de Bodega */}
      {(dbUser.role === 'AUXILIAR_BODEGA' || dbUser.role === 'SUPER_ADMIN') && pendingPedidos && pendingPedidos.length > 0 && (
        <div className="animate-alert-shake relative overflow-hidden rounded-2xl border border-emerald-500 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute inset-0 bg-emerald-50/20 pointer-events-none animate-pulse"></div>
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner shrink-0">
              <ShoppingBag className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                  ¡Nuevo Pedido Asignado!
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {pendingPedidos[0].codigoPedido}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                {pendingPedidos[0].cliente?.nombre || 'Cliente sin nombre'}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  📍 Destino: {pendingPedidos[0].destino}
                </span>
                <span className="flex items-center gap-1 border-l border-slate-200 pl-4">
                  📦 Ítems: {pendingPedidos[0].items?.length || 0} productos
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 shrink-0">
            <Link
              href={`/inventario-ventas/pedidos/preparar/${pendingPedidos[0].id}`}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              📦 Iniciar Preparación
            </Link>
          </div>
        </div>
      )}

      {/* 2. MAIN MODULE CARDS (3 CARDS PER ROW GRID) - REPLACING THE OLD TOP SUMMARY STAT CARDS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 px-1">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Módulos Principales del ERP
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Acceso directo a todos los procesos operativos y administrativos de la empresa
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200/80 shadow-2xs">
              {allowedShortcuts.length} Módulos Activos
            </span>
          </div>
        </div>

        {/* 3 CARDS PER ROW GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {allowedShortcuts.map((mod) => {
            const IconComponent = mod.icon;
            return (
              <Link 
                key={mod.name} 
                href={mod.href}
                className={`group flex flex-col justify-between p-6 bg-white rounded-3xl border border-slate-200/90 shadow-sm transition-all duration-300 ${mod.hoverGlow} min-h-[190px] relative overflow-hidden`}
              >
                {/* Accent background highlight on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:bg-emerald-50/50 transition-colors pointer-events-none -mr-10 -mt-10"></div>

                <div>
                  {/* Top card header: Large Icon Container + Badge + Arrow */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${mod.iconBg} flex items-center justify-center font-bold shrink-0 transition-transform duration-300 group-hover:scale-105`}>
                      <IconComponent className="w-7 h-7" />
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${mod.badgeColor} shadow-2xs`}>
                        {mod.badgeText}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors tracking-tight">
                    {mod.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-medium">
                    {mod.description}
                  </p>
                </div>

                {/* Card Footer: Live Stat or Quick Action */}
                <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between text-xs font-bold text-slate-600">
                  {mod.liveStat ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 text-[11px] font-extrabold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      {mod.liveStat}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium text-[11px]">
                      Módulo Integrado
                    </span>
                  )}

                  <span className="text-emerald-600 group-hover:text-emerald-700 font-extrabold text-xs flex items-center gap-1 group-hover:underline">
                    {mod.quickAction}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. ASSIGNED WORK & TASKS (Interactive Tabs at the Bottom) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mt-2">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-150 bg-slate-50/70 px-4 md:px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('soporte')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'soporte'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Tus Órdenes de Soporte Técnico ({workOrders.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'kanban'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trello className="w-4 h-4" />
            <span>Tus Tareas Asignadas en Proyectos ({kanbanTasks.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 md:p-6">
          
          {/* TAB 1: SOPORTE Y REPARACIONES */}
          {activeTab === 'soporte' && (
            <div className="flex flex-col gap-4">
              {ordersSummary && (
                <div className="flex flex-wrap items-center gap-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-150 text-xs text-slate-600 font-medium">
                  <span className="font-extrabold text-slate-800 mr-1">Resumen de Soporte Técnico:</span>
                  <span className="bg-slate-200/60 text-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 font-bold">
                    {ordersSummary.pending} Pendientes
                  </span>
                  <span className="bg-amber-100/70 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200/60 font-bold">
                    {ordersSummary.inProgress} En Reparación
                  </span>
                  <span className="bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/60 font-bold">
                    {ordersSummary.completed} Listos
                  </span>
                  <span className="ml-auto text-[11px] text-slate-400 font-bold">Total Asignado: {ordersSummary.pending + ordersSummary.inProgress + ordersSummary.completed}</span>
                </div>
              )}
              {workOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workOrders.map((orden) => (
                    <div 
                      key={orden.id}
                      className="border border-slate-150 rounded-2xl p-4.5 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Trabajo de Soporte
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-sm mt-0.5 line-clamp-1">
                            {orden.equipoDano}
                          </h4>
                          {orden.marcaModelo && (
                            <p className="text-xs text-slate-500 font-medium">
                              {orden.marcaModelo} {orden.serie ? `(S/N: ${orden.serie})` : ''}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getOrdenEstadoBadge(orden.estado)} shrink-0`}>
                          {getOrdenEstadoText(orden.estado)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                        <span className="flex items-center gap-1 font-medium">
                          👤 <strong className="text-slate-700 font-bold">{orden.cliente?.nombre || 'Sin cliente'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          📅 {new Date(orden.fechaRecibido).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      <Link 
                        href={`/soporte/${orden.id}`}
                        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 shadow-sm p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-emerald-700 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">¡Al día con las reparaciones!</h3>
                  <p className="text-xs text-slate-500 max-w-[280px] mt-1 font-medium">
                    No tienes órdenes de soporte técnico asignadas pendientes en este momento.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KANBAN TASKS */}
          {activeTab === 'kanban' && (
            <div className="flex flex-col gap-4">
              {tasksSummary && (
                <div className="flex flex-wrap items-center gap-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-150 text-xs text-slate-600 font-medium">
                  <span className="font-extrabold text-slate-800 mr-1">Resumen de Tareas Kanban:</span>
                  <span className="bg-slate-200/60 text-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 font-bold">
                    {tasksSummary.pending} Por Ejecutar
                  </span>
                  <span className="bg-blue-100/70 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200/60 font-bold">
                    {tasksSummary.inProgress} En Ejecución
                  </span>
                  <span className="bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/60 font-bold">
                    {tasksSummary.completed} Completadas
                  </span>
                  <span className="ml-auto text-[11px] text-slate-400 font-bold">Total Asignado: {tasksSummary.pending + tasksSummary.inProgress + tasksSummary.completed}</span>
                </div>
              )}
              {kanbanTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kanbanTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="border border-slate-150 rounded-2xl p-4.5 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Espacio: {task.space?.name || 'Kanban'}
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-sm mt-0.5 line-clamp-1">
                            <span className="text-emerald-700 mr-1.5 font-black">[{task.codigo}]</span>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-medium">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getPriorityColor(task.priority)} shrink-0`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                        <span className="flex items-center gap-1 font-medium">
                          📌 Status: <span className="text-slate-800 font-bold">{task.status}</span>
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            📅 Límite: {new Date(task.dueDate).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <Link 
                        href={`/kanban`}
                        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 shadow-sm p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-emerald-700 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">¡Tablero al día!</h3>
                  <p className="text-xs text-slate-500 max-w-[280px] mt-1 font-medium">
                    No tienes tareas pendientes asignadas en tus proyectos de Kanban hoy.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
