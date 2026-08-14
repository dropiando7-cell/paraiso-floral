'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  CircleDollarSign,
  Box,
  FileText,
  TrendingUp,
  Receipt,
  FileSignature,
  Settings,
  HelpCircle,
  Users,
  Key,
  ChevronRight,
  ChevronDown,
  Wrench,
  Trello,
  Globe,
  QrCode,
  Bell,
  Megaphone,
  Coins,
  Tv
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
  dbUser: any;
  onClose?: () => void;
}

interface SubMenuItem {
  name: string;
  href: string;
  roles?: string[];
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  roles?: string[];
  subItems?: SubMenuItem[];
}

const menuItems: { category: string; items: MenuItem[] }[] = [
  {
    category: 'CORE',
    items: [
      { name: 'Portal Paraíso Floral', href: '/', icon: LayoutDashboard },
      { name: 'Órdenes de Trabajo', href: '/kanban', icon: Trello },
      { name: 'Soporte Técnico', href: '/soporte', icon: Wrench, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
      { name: 'Marketing IA', href: '#', icon: Megaphone, badge: 'PLANIFICADO', badgeColor: 'bg-amber-500/10 text-amber-700' },
      { name: 'Rentas de Equipos', href: '/rentas', icon: Box },
      { name: 'Control de Caja Chica', href: '/caja-chica', icon: CircleDollarSign },
      { name: 'Gráficas e Informes', href: '/graficas', icon: TrendingUp },
      { name: 'Centro de Novedades', href: '/actualizaciones', icon: Tv, badge: 'NUEVO', badgeColor: 'bg-indigo-500/10 text-indigo-600 font-bold' },
    ]
  },
  {
    category: 'INVENTARIO Y VENTAS',
    items: [
      {
        name: 'Inventario y Catálogos',
        href: '#',
        icon: Box,
        subItems: [
          { name: 'Control de Inventario', href: '/inventario', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Garantías y Reemplazos', href: '/inventario/garantias', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Catálogo de Modelos', href: '/inventario/modelos', roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'INVENTARIO_EDITOR'] },
          { name: 'Entradas / Compras', href: '/inventario/entradas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Salidas / Descargas', href: '/inventario/salidas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Kardex de Movimientos', href: '/inventario/kardex', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Gestor de Precios', href: '/precios', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Ubicaciones y Sucursales', href: '/admin/areas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Inventario (Odoo)', href: '/inventario/historico', roles: ['SUPER_ADMIN'] }
        ]
      },
      {
        name: 'Ventas y Servicios',
        href: '#',
        icon: Receipt,
        subItems: [
          { name: 'Directorio de Contactos', href: '/contactos', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Cotizaciones', href: '/cotizaciones', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Facturación', href: '/facturas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Órdenes de Entrega', href: '/facturas?tab=facturas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Garantías y Mantenimientos', href: '/mantenimientos', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Cierre de Caja', href: '/cierre-caja' }
        ]
      },
      { name: 'Cuentas por Cobrar', href: '#', icon: Coins, badge: 'PLANIFICADO', badgeColor: 'bg-slate-500/10 text-slate-700' },
    ]
  },
  {
    category: 'ADMINISTRACIÓN',
    items: [
      {
        name: 'Avances del Desarrollo',
        href: '/admin/avances',
        icon: TrendingUp,
        roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE', 'EXECUTIVE_ASSISTANT'],
      },
      {
        name: 'Usuarios y Roles',
        href: '/admin/users',
        icon: Users,
        roles: ['SUPER_ADMIN', 'CHECKIN_KIDS_ADMIN'],
      },
      {
        name: 'Gestión Web / Tienda',
        href: '/admin/gestion-web',
        icon: Globe,
        roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
      },
      {
        name: 'Link en Bio (QR)',
        href: '/admin/bio-settings',
        icon: QrCode,
        roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
      },
      {
        name: 'Tarjetas Digitales',
        href: '/admin/tarjetas-digitales',
        icon: FileSignature,
        roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
      },
      {
        name: 'Notificaciones',
        href: '/admin/notificaciones',
        icon: Bell,
        roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
      },
      {
        name: 'Bitácora de Actividad',
        href: '/admin/logs-actividad',
        icon: FileText,
        roles: ['SUPER_ADMIN'],
      }
    ]
  }
];

const bottomItems = [
  { name: 'Configuración', href: '/configuracion', icon: Settings },
  { name: 'Ayuda y Soporte', href: '/soporte', icon: HelpCircle },
];

export function Sidebar({ dbUser, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col h-full min-h-screen shrink-0 print:hidden z-10">
      {/* Brand / Org Switcher */}
      <div className="h-[72px] flex items-center px-6 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 w-full pl-0.5">
          <div className="h-10 w-10 flex items-center justify-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={dbUser?.organization?.logoUrl || "/logo-paraiso-floral.png"} 
              alt={dbUser?.organization?.name || "Paraíso Floral"} 
              className="h-9 w-9 object-contain" 
            />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden ml-0.5">
            <span className="truncate font-bold text-[17px] leading-6 text-slate-900 tracking-tight">
              {dbUser?.organization?.name || "Paraíso Floral"}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              ERP & Catálogo
            </span>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden ml-auto text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Cerrar menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
          {/* Mock Switcher Icon for Super Admin ONLY */}
          {dbUser?.role === 'SUPER_ADMIN' && (
            <button className="text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 px-4 custom-scrollbar">
        {menuItems.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (dbUser?.role === 'SUPER_ADMIN') return true;
            if (item.href === '/' || item.href === '/actualizaciones') return true;
            const allowed = dbUser?.accessibleModules || [];
            if (allowed.includes(item.href)) return true;
            if (item.roles && item.roles.includes(dbUser?.role)) return true;

            // Also visibly enable the parent if any of its subItems are visible to the user
            if (item.subItems) {
              const visibleSubs = item.subItems.filter(subItem => {
                if (allowed.includes(subItem.href)) return true;
                if (subItem.href === '/facturas' && allowed.includes('facturas_propias')) return true;
                if (!subItem.roles) return true;
                return subItem.roles.includes(dbUser?.role);
              });
              if (visibleSubs.length > 0) return true;
            }

            return false;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.category} className="flex flex-col gap-2">
              {group.category !== 'CORE' && (
                <span className="text-[11px] font-bold text-slate-400 tracking-wider px-3">
                  {group.category}
                </span>
              )}
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));

                  // Filter subItems based on role or explicit module access
                  const visibleSubItems = item.subItems?.filter(subItem => {
                    if (dbUser?.role === 'SUPER_ADMIN') return true;
                    const allowed = dbUser?.accessibleModules || [];
                    if (allowed.includes(subItem.href)) return true;
                    if (subItem.href === '/facturas' && allowed.includes('facturas_propias')) return true;
                    if (!subItem.roles) return true;
                    return subItem.roles.includes(dbUser?.role);
                  }) || [];

                  const hasSubMenu = visibleSubItems.length > 0;
                  const isOpen = openMenus[item.name];
                  // If we are currently on a submenu page, we should highlight the parent differently or keep it open
                  const isChildActive = hasSubMenu && visibleSubItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'));
                  const isEffectivelyActive = isActive && !isChildActive;

                  const Icon = item.icon;

                  return (
                    <div key={item.name} className="flex flex-col gap-1">
                      {hasSubMenu ? (
                        <button
                          onClick={(e) => toggleMenu(item.name, e)}
                          className={twMerge(
                            clsx(
                              'flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm w-full',
                              isEffectivelyActive || isChildActive
                                ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-500/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            )
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={clsx('w-4 h-4', (isEffectivelyActive || isChildActive) ? 'text-white' : 'text-slate-400 group-hover:text-slate-600')} />
                            <span>{item.name}</span>
                          </div>
                          <ChevronDown className={clsx("w-4 h-4 transition-transform duration-200", (isEffectivelyActive || isChildActive) ? "text-white/80" : "text-slate-400", isOpen ? "rotate-180" : "rotate-0")} />
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={twMerge(
                            clsx(
                              'flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm',
                              isActive
                                ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-500/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            )
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={clsx('w-4 h-4', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600')} />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className={clsx(
                              'text-[10px] px-2 py-0.5 rounded-full font-medium',
                              item.badgeColor
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}

                      {/* Render SubMenu */}
                      {hasSubMenu && isOpen && (
                        <div className="flex flex-col gap-1 pl-4 mt-1 border-l-2 border-slate-100 ml-4">
                          {visibleSubItems.map((subItem) => {
                            const hasQueryParams = subItem.href.includes('?');
                            let isSubActive = false;
                            
                            const hasMoreSpecificMatch = visibleSubItems.some(other => 
                                other.href !== subItem.href && 
                                other.href.length > subItem.href.length && 
                                (pathname === other.href || pathname.startsWith(other.href + '/'))
                            );

                            if (hasQueryParams) {
                              const [basePath, queryStr] = subItem.href.split('?');
                              const isPathMatch = pathname === basePath;
                              const params = new URLSearchParams(queryStr);
                              const allParamsMatch = Array.from(params.entries()).every(([key, val]) => searchParams.get(key) === val);
                              isSubActive = isPathMatch && allParamsMatch;
                            } else {
                              const isMatch = pathname === subItem.href || (subItem.href !== '/' && pathname.startsWith(subItem.href + '/'));
                              
                              const matchesOtherWithQuery = visibleSubItems.some(other => 
                                other.href !== subItem.href && 
                                other.href.startsWith(subItem.href + '?')
                              );

                              let isOtherQueryActive = false;
                              if (matchesOtherWithQuery) {
                                isOtherQueryActive = visibleSubItems.some(other => {
                                  if (!other.href.includes('?')) return false;
                                  const [_, qStr] = other.href.split('?');
                                  const p = new URLSearchParams(qStr);
                                  return Array.from(p.entries()).every(([k, v]) => searchParams.get(k) === v);
                                });
                              }

                              isSubActive = isMatch && !hasMoreSpecificMatch && !isOtherQueryActive;
                            }
                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                onClick={onClose}
                                className={twMerge(
                                  clsx(
                                    'flex items-center px-3 py-2 rounded-xl transition-all duration-200 group text-sm relative',
                                    isSubActive
                                      ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-500/20'
                                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                  )
                                )}
                              >
                                <span>{subItem.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-200 flex flex-col gap-1 shrink-0">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isBottomActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={twMerge(
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm group font-medium',
                  isBottomActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )
              )}
            >
              <Icon className={clsx("w-4 h-4", isBottomActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </aside>
  );
}
