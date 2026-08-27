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
  Truck
} from 'lucide-react';
import { getRutas } from './inventario-ventas/rutas/actions';

interface HomeClientProps {
  dbUser: any;
  kanbanTasks: any[];
  workOrders: any[];
  totalPendingTasks: number;
  totalPendingOrders: number;
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

  // Predefined configuration of all main shortcuts
  const modulesConfig = [
    {
      name: 'Proyectos y Tareas',
      href: '/kanban',
      description: 'Tableros Kanban, asignación de tareas, seguimiento de avances y colaboración.',
      icon: Trello,
      color: 'blue',
      glow: 'shadow-blue-500/5 hover:shadow-blue-500/15 border-blue-100 hover:border-blue-300',
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Soporte y Reparaciones',
      href: '/soporte',
      description: 'Gestión de órdenes de trabajo, reparaciones y soporte técnico de equipos.',
      icon: Wrench,
      color: 'emerald',
      glow: 'shadow-emerald-500/5 hover:shadow-emerald-500/15 border-emerald-100 hover:border-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      name: 'Control de Inventario',
      href: '/inventario',
      description: 'Gestión de activos fijos, repuestos, stock mínimo y garantías de equipos.',
      icon: Box,
      color: 'indigo',
      glow: 'shadow-indigo-500/5 hover:shadow-indigo-500/15 border-indigo-100 hover:border-indigo-300',
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    {
      name: 'Facturación y Ventas',
      href: '/facturas',
      description: 'Emisión de facturas autorizadas por el CAI, cotizaciones y órdenes de entrega.',
      icon: Receipt,
      color: 'amber',
      glow: 'shadow-amber-500/5 hover:shadow-amber-500/15 border-amber-100 hover:border-amber-300',
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      name: 'Rentas de Equipos',
      href: '/rentas',
      description: 'Control de contratos de alquiler de equipos médicos, cobros y retornos.',
      icon: Box, // Reutilizando Box para coherencia o podemos poner otro
      color: 'cyan',
      glow: 'shadow-cyan-500/5 hover:shadow-cyan-500/15 border-cyan-100 hover:border-cyan-300',
      iconBg: 'bg-cyan-50 text-cyan-600',
    },
    {
      name: 'Caja Chica',
      href: '/caja-chica',
      description: 'Arqueos diarios, control de egresos rápidos y registro de ingresos.',
      icon: CircleDollarSign,
      color: 'rose',
      glow: 'shadow-rose-500/5 hover:shadow-rose-500/15 border-rose-100 hover:border-rose-300',
      iconBg: 'bg-rose-50 text-rose-600',
    },
    {
      name: 'Gráficas e Informes',
      href: '/graficas',
      description: 'Estadísticas de facturación, cierres de caja y rentabilidad del negocio.',
      icon: TrendingUp,
      color: 'violet',
      glow: 'shadow-violet-500/5 hover:shadow-violet-500/15 border-violet-100 hover:border-violet-300',
      iconBg: 'bg-violet-50 text-violet-600',
    },
    {
      name: 'Directorio de Contactos',
      href: '/contactos',
      description: 'Gestión y directorio de clientes, técnicos y proveedores autorizados.',
      icon: Users,
      color: 'sky',
      glow: 'shadow-sky-500/5 hover:shadow-sky-500/15 border-sky-100 hover:border-sky-300',
      iconBg: 'bg-sky-50 text-sky-600',
    },
    {
      name: 'Centro de Novedades',
      href: '/actualizaciones',
      description: 'Novedades, anuncios y videotutoriales explicativos del ERP.',
      icon: Tv,
      color: 'indigo',
      glow: 'shadow-indigo-500/5 hover:shadow-indigo-500/15 border-indigo-100 hover:border-indigo-300',
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
  ];

  // Filter shortcuts based on user role or modules permissions
  const allowedShortcuts = modulesConfig.filter(mod => {
    if (dbUser.role === 'SUPER_ADMIN') return true;
    if (mod.href === '/actualizaciones') return true;
    const allowed = dbUser.accessibleModules || [];
    if (allowed.includes(mod.href)) return true;
    // Permit access if any subpath is allowed
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
      
      {/* 1. WELCOME CARD (Modern gradient with glassmorphism) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 text-white p-6 md:p-8 shadow-lg shadow-brand-500/10">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-1/4 w-[150px] h-[150px] bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {dbUser.avatarUrl ? (
              <img 
                src={dbUser.avatarUrl} 
                alt="Avatar" 
                className="w-16 h-16 rounded-full border-2 border-white/20 shadow-md object-cover" 
              />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center shadow-md">
                <User className="w-8 h-8 text-white/80" />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {greeting}, {dbUser.nombre || 'Equipo'}! ☕
              </h1>
              <p className="text-white/80 text-sm md:text-base mt-1 capitalize font-medium">
                {formattedDate}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-green-300" />
              {dbUser.role === 'SUPER_ADMIN' ? 'Super Admin' : dbUser.puesto || 'Miembro del Equipo'}
            </span>
            {dbUser.organization?.name && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/10">
                🏢 {dbUser.organization.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS ROW (V0 Modern layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Stat 1: Soporte */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-medium text-slate-500 font-semibold">Reparaciones en Curso</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                {totalPendingOrders} ordenes
              </h2>
              {ordersSummary && (
                <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-bold">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                    Pendientes: {ordersSummary.pending}
                  </span>
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    En Reparación: {ordersSummary.inProgress}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    Listos: {ordersSummary.completed}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Link 
            href="/soporte"
            className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <span>Ver todo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Stat 2: Kanban Tasks */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-inner">
              <Trello className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-medium text-slate-500 font-semibold">Mis Tareas Pendientes</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                {totalPendingTasks} asignadas
              </h2>
              {tasksSummary && (
                <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-bold">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                    Por Ejecutar: {tasksSummary.pending}
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    En Ejecución: {tasksSummary.inProgress}
                  </span>
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                    Completadas: {tasksSummary.completed}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Link 
            href="/kanban"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <span>Ver todo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Stat 3: Camiones en Ruta */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-medium text-slate-500 font-semibold">Reparto y Auto-Venta</span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                {routeStats.active} activos
              </h2>
              <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-bold">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                  En Tránsito: L{routeStats.cash.toLocaleString('es-HN', { maximumFractionDigits: 0 })}
                </span>
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  Liquidar: {routeStats.pending}
                </span>
              </div>
            </div>
          </div>
          <Link 
            href="/inventario-ventas/rutas"
            className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <span>Ver todo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* 3. QUICK SHORTCUTS GRID (Modern cards with soft shadows and glow on hover) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Accesos Rápidos</h2>
            <p className="text-xs text-slate-500">Módulos habilitados en tu cuenta para navegación directa</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full border border-slate-200">
            {allowedShortcuts.length} Módulos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allowedShortcuts.map((mod) => {
            const IconComponent = mod.icon;
            return (
              <Link 
                key={mod.name} 
                href={mod.href}
                className={`group flex flex-col justify-between p-5 bg-white rounded-xl border border-slate-200 hover:border-transparent shadow-sm hover:shadow-md ${mod.glow} transition-all duration-300 min-h-[140px]`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${mod.iconBg} flex items-center justify-center shadow-sm font-bold`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-slate-400 group-hover:translate-x-1 group-hover:text-slate-700 transform">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">
                    {mod.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. ASSIGNED WORK & TASKS (Interactive Tabs) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-150 bg-slate-50/50 px-4 md:px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('soporte')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'soporte'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Soporte Técnico ({workOrders.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'kanban'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trello className="w-4 h-4" />
            <span>Tareas de Proyectos ({kanbanTasks.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 md:p-6">
          
          {/* TAB 1: SOPORTE Y REPARACIONES */}
          {activeTab === 'soporte' && (
            <div className="flex flex-col gap-4">
              {ordersSummary && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-600 font-medium">
                  <span className="font-bold text-slate-700 mr-1">Tus Órdenes de Trabajo:</span>
                  <span className="bg-slate-200/60 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80">
                    {ordersSummary.pending} Pendientes
                  </span>
                  <span className="bg-amber-100/60 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/50">
                    {ordersSummary.inProgress} En Reparación
                  </span>
                  <span className="bg-emerald-100/60 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/50">
                    {ordersSummary.completed} Entregados
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400 font-semibold">Total Asignado: {ordersSummary.pending + ordersSummary.inProgress + ordersSummary.completed}</span>
                </div>
              )}
              {workOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workOrders.map((orden) => (
                    <div 
                      key={orden.id}
                      className="border border-slate-150 rounded-xl p-4 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Trabajo de Soporte
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1">
                            {orden.equipoDano}
                          </h4>
                          {orden.marcaModelo && (
                            <p className="text-xs text-slate-500">
                              {orden.marcaModelo} {orden.serie ? `(S/N: ${orden.serie})` : ''}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getOrdenEstadoBadge(orden.estado)} shrink-0`}>
                          {getOrdenEstadoText(orden.estado)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                        <span className="flex items-center gap-1">
                          👤 <strong className="text-slate-700 font-medium">{orden.cliente?.nombre || 'Sin cliente'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          📅 {new Date(orden.fechaRecibido).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      <Link 
                        href={`/soporte/${orden.id}`}
                        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 shadow-sm p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-brand-600 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">¡Al día con las reparaciones!</h3>
                  <p className="text-xs text-slate-500 max-w-[280px] mt-1">
                    No tienes órdenes de soporte técnico asignadas con estado pendiente en este momento.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KANBAN TASKS */}
          {activeTab === 'kanban' && (
            <div className="flex flex-col gap-4">
              {tasksSummary && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-600 font-medium">
                  <span className="font-bold text-slate-700 mr-1">Tus Tareas en Tableros:</span>
                  <span className="bg-slate-200/60 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80">
                    {tasksSummary.pending} Por Ejecutar
                  </span>
                  <span className="bg-blue-100/60 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200/50">
                    {tasksSummary.inProgress} En Ejecución
                  </span>
                  <span className="bg-green-100/60 text-green-800 px-2 py-0.5 rounded-md border border-green-200/50">
                    {tasksSummary.completed} Completadas
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400 font-semibold">Total Asignado: {tasksSummary.pending + tasksSummary.inProgress + tasksSummary.completed}</span>
                </div>
              )}
              {kanbanTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kanbanTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="border border-slate-150 rounded-xl p-4 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Espacio: {task.space?.name || 'Kanban'}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1">
                            <span className="text-brand-600 mr-1.5 font-bold">[{task.codigo}]</span>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)} shrink-0`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                        <span className="flex items-center gap-1 font-medium">
                          📌 Status: <span className="text-slate-800">{task.status}</span>
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            📅 Límite: {new Date(task.dueDate).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <Link 
                        href={`/kanban`}
                        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 shadow-sm p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-brand-600 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">¡Tablero al día!</h3>
                  <p className="text-xs text-slate-500 max-w-[280px] mt-1">
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
