'use client';

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
  HelpCircle
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
  dbUser: any;
}

const menuItems = [
  {
    category: 'CORE',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Conciliación IA', href: '/conciliacion', icon: Sparkles, badge: 'Live', badgeColor: 'bg-brand-600 text-white' },
      { name: 'Ingresos y Diezmos', href: '/ingresos', icon: CircleDollarSign },
    ]
  },
  {
    category: 'LEGAL & ACTIVOS',
    items: [
      { name: 'Bóveda de Contraseñas', href: '/boveda', icon: Shield },
      { name: 'Inventario de Activos', href: '/inventario', icon: Box },
      { name: 'Actas de Junta', href: '/actas', icon: FileText, badge: 'OCR', badgeColor: 'bg-dark-800 text-brand-100' },
    ]
  },
  {
    category: 'ESTRATEGIA',
    items: [
      { name: 'Predicción Financiera 2026', href: '/prediccion', icon: TrendingUp },
      { name: 'Calendario Centralizado', href: '/calendario', icon: Calendar },
    ]
  }
];

const bottomItems = [
  { name: 'Configuración', href: '/configuracion', icon: Settings },
  { name: 'Ayuda y Soporte', href: '/soporte', icon: HelpCircle },
];

export function Sidebar({ dbUser }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] bg-dark-900 border-r border-dark-800 flex flex-col h-screen shrink-0 sticky top-0">
      {/* Brand / Org Switcher */}
      <div className="h-[72px] flex items-center px-6 border-b border-dark-800 shrink-0">
        <div className="flex items-center gap-3 w-full">
          <div className="relative w-9 h-9 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
            <Image
              src={dbUser?.organization?.logoUrl || "https://i.ibb.co/XkWfG1SF/elim-logo-blue-1.png"}
              alt="Logo"
              fill
              className="object-contain p-1"
            />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-white font-semibold text-sm leading-tight truncate">
              {dbUser?.role === 'SUPER_ADMIN' ? 'Misión Cristiana Elim' : dbUser?.organization?.name || 'Sistemas Elim'}
            </span>
            <span className="text-slate-400 text-xs text-[11px] truncate">
              {dbUser?.role === 'SUPER_ADMIN' ? 'Sede Nacional' : 'Enterprise Platform'}
            </span>
          </div>
          {/* Mock Switcher Icon for Super Admin ONLY */}
          {dbUser?.role === 'SUPER_ADMIN' && (
            <button className="text-slate-500 hover:text-white transition-colors bg-dark-800/50 hover:bg-dark-800 p-1.5 rounded-lg shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 px-4 custom-scrollbar">
        {menuItems.map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider px-2">
              {group.category}
            </span>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={twMerge(
                      clsx(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm',
                        isActive
                          ? 'bg-dark-800 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-dark-800/50'
                      )
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={clsx('w-4 h-4', isActive ? 'text-brand-500' : 'text-slate-500 group-hover:text-slate-300')} />
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
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-dark-800 flex flex-col gap-1 shrink-0">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800/50 transition-all duration-200 text-sm group"
            >
              <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
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
          background-color: #334155;
          border-radius: 10px;
        }
      `}</style>
    </aside>
  );
}
