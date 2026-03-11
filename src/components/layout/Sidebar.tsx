'use client';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  CircleDollarSign,
  Shield,
  Box,
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  HelpCircle,
  Baby,
  Stethoscope,
  Users,
  Key,
  ChevronRight,
  ChevronDown
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
      { name: 'Portal Elim', href: '/', icon: LayoutDashboard },
      { name: 'Conciliación Bancaria IA', href: '/conciliacion', icon: Sparkles },
      { name: 'Ingresos Congregacionales', href: '/ingresos', icon: CircleDollarSign },
    ]
  },
  {
    category: 'LEGAL & ACTIVOS',
    items: [
      { name: 'Gestor de Contraseñas', href: '/boveda', icon: Shield },
      {
        name: 'Recursos y Patrimonio',
        href: '#',
        icon: Box,
        subItems: [
          { name: 'Inventario de Activos', href: '/inventario' },
          { name: 'Editor Histórico', href: '/inventario/historico', roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'INVENTARIO_EDITOR'] },
          { name: 'Avance de Inventario', href: '/admin/inventario', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          { name: 'Bodegas y Áreas', href: '/admin/areas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] }
        ]
      },
      { name: 'Actas de Junta', href: '/actas', icon: FileText, badge: 'OCR', badgeColor: 'bg-dark-800 text-brand-100' },
    ]
  },
  {
    category: 'ESTRATEGIA',
    items: [
      { name: 'Predicción Financiera 2026', href: '/prediccion', icon: TrendingUp },
      {
        name: 'Calendario Centralizado',
        href: '/calendario',
        icon: Calendar,
        roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'EXECUTIVE_ASSISTANT']
      },
    ]
  },
  {
    category: 'EVENTOS & SERVICIO',
    items: [
      {
        name: 'Checkin Kids',
        href: '/checkin',
        icon: Baby,
        badge: 'RETIRO',
        badgeColor: 'bg-pink-500/20 text-pink-300',
        roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'CHECKIN_KIDS'],
      },
      {
        name: 'Asistencia Médica',
        href: '/medico',
        icon: Stethoscope,
        badge: 'NUEVO',
        badgeColor: 'bg-rose-500/20 text-rose-300',
        roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'MEDICAL_STAFF'],
      },
    ]
  },
  {
    category: 'ADMINISTRACIÓN',
    items: [
      {
        name: 'Usuarios y Roles',
        href: '/admin/users',
        icon: Users,
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
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    'Recursos y Patrimonio': true // Default open for now
  });

  const toggleMenu = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <aside className="w-[280px] bg-[#0500A3] border-r border-[#150ec4] flex flex-col h-full min-h-screen shrink-0 print:hidden">
      {/* Brand / Org Switcher */}
      <div className="h-[72px] flex items-center px-6 border-b border-[#150ec4] shrink-0">
        <div className="flex items-center gap-2 w-full pl-0.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
            SE
          </div>
          <div className="flex flex-col flex-1 overflow-hidden ml-0.5">
            <span style={{ fontFamily: 'Inter, "Inter Fallback", sans-serif', fontWeight: 600, fontSize: '22px', lineHeight: '32px', color: 'rgb(255, 255, 255)' }} className="truncate">
              SistemasElim
            </span>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden ml-auto text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              aria-label="Cerrar menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
          {/* Mock Switcher Icon for Super Admin ONLY */}
          {dbUser?.role === 'SUPER_ADMIN' && (
            <button className="text-white/60 hover:text-white transition-colors bg-[#1A14B8]/50 hover:bg-[#1A14B8] p-1.5 rounded-lg shrink-0">
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
            const allowed = dbUser?.accessibleModules || [];
            if (allowed.includes(item.href)) return true;

            // Also visibly enable the parent if any of its subItems are visible to the user
            if (item.subItems) {
              const visibleSubs = item.subItems.filter(subItem => {
                if (allowed.includes(subItem.href)) return true;
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
                <span className="text-[11px] font-semibold text-white/50 tracking-wider px-2">
                  {group.category}
                </span>
              )}
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));

                  // Filter subItems based on role or explicit module access
                  const visibleSubItems = item.subItems?.filter(subItem => {
                    if (dbUser?.role === 'SUPER_ADMIN') return true;
                    // Provide fallback if accessibleModules is undefined
                    const allowed = dbUser?.accessibleModules || [];
                    if (allowed.includes(subItem.href)) return true;
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
                                ? 'bg-white/10 text-white font-bold'
                                : 'text-white/90 hover:text-white hover:bg-[#1A14B8]'
                            )
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={clsx('w-4 h-4', (isEffectivelyActive || isChildActive) ? 'text-white' : 'text-white/90 group-hover:text-white')} />
                            <span>{item.name}</span>
                          </div>
                          <ChevronDown className={clsx("w-4 h-4 transition-transform duration-200", isOpen ? "rotate-180" : "rotate-0")} />
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={twMerge(
                            clsx(
                              'flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm',
                              isActive
                                ? 'bg-white text-[#0500A3] font-bold shadow-md'
                                : 'text-white/90 hover:text-white hover:bg-[#1A14B8]'
                            )
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={clsx('w-4 h-4', isActive ? 'text-[#0500A3]' : 'text-white/90 group-hover:text-white')} />
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
                        <div className="flex flex-col gap-1 pl-4 mt-1 border-l-2 border-[#1A14B8] ml-4">
                          {visibleSubItems.map((subItem) => {
                            const isExactMatch = pathname === subItem.href;
                            const isNestedMatch = pathname.startsWith(subItem.href + '/');
                            // Avoid `/inventario` showing active when user is in `/inventario/historico`
                            const isSpecificNestedMatch = subItem.href === '/inventario' ? false : isNestedMatch;
                            const isSubActive = isExactMatch || isSpecificNestedMatch;
                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                onClick={onClose}
                                className={twMerge(
                                  clsx(
                                    'flex items-center px-3 py-2 rounded-xl transition-all duration-200 group text-sm relative',
                                    isSubActive
                                      ? 'bg-white text-[#0500A3] font-bold shadow-sm'
                                      : 'text-white/70 hover:text-white hover:bg-[#1A14B8]'
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
      <div className="p-4 border-t border-[#150ec4] flex flex-col gap-1 shrink-0">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-[#1A14B8] transition-all duration-200 text-sm group"
            >
              <Icon className="w-4 h-4 text-white/90 group-hover:text-white" />
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
          background-color: #1A14B8;
          border-radius: 10px;
        }
      `}</style>
    </aside>
  );
}
