'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Menu, ArrowRight } from 'lucide-react';
import { UserDropdown } from './UserDropdown';

interface HeaderProps {
    dbUser: any;
    onMenuClick?: () => void;
}

interface SearchItem {
    name: string;
    category: string;
    href: string;
    roles?: string[];
    keywords: string[];
}

const searchItems: SearchItem[] = [
    { name: 'Portal Bioelectrónica', category: 'General', href: '/', keywords: ['dashboard', 'portal', 'inicio', 'home', 'main'] },
    { name: 'Proyectos & Tareas (Kanban)', category: 'Core', href: '/kanban', keywords: ['kanban', 'tareas', 'proyectos', 'board', 'tasks', 'projects', 'desarrollo', 'actividades'] },
    { name: 'Mantenimiento y Reparaciones', category: 'Core', href: '/soporte', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['soporte', 'mantenimiento', 'reparaciones', 'tickets', 'taller', 'repair'] },
    { name: 'Inventario IA', category: 'Core', href: '/inventario-ia', keywords: ['ia', 'inventario', 'inteligencia', 'artificial', 'scanner', 'copilot', 'analisis'] },
    { name: 'Rentas de Equipos', category: 'Core', href: '/rentas', keywords: ['rentas', 'alquiler', 'equipos', 'rent', 'lease'] },
    { name: 'Control de Caja Chica', category: 'Core', href: '/caja-chica', keywords: ['caja', 'chica', 'gastos', 'flujo', 'dinero', 'petty cash'] },
    { name: 'Gráficas e Informes', category: 'Core', href: '/graficas', keywords: ['graficas', 'informes', 'reportes', 'analisis', 'charts', 'reports'] },
    { name: 'Control de Inventario', category: 'Inventario', href: '/inventario', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['inventario', 'activos', 'stock', 'control'] },
    { name: 'Garantías y Reemplazos', category: 'Inventario', href: '/inventario/garantias', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['garantias', 'reemplazos', 'rma', 'warranty'] },
    { name: 'Catálogo de Modelos', category: 'Inventario', href: '/inventario/modelos', roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'INVENTARIO_EDITOR'], keywords: ['modelos', 'catalogo', 'marcas', 'devices'] },
    { name: 'Entradas / Compras', category: 'Inventario', href: '/inventario/entradas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['entradas', 'compras', 'proveedores', 'buy', 'incoming'] },
    { name: 'Salidas / Descargas', category: 'Inventario', href: '/inventario/salidas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['salidas', 'descargas', 'entregas', 'outgoing'] },
    { name: 'Kardex de Movimientos', category: 'Inventario', href: '/inventario/kardex', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['kardex', 'movimientos', 'historico', 'transactions'] },
    { name: 'Gestor de Precios', category: 'Inventario', href: '/precios', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['precios', 'tarifas', 'gestor', 'listas', 'prices'] },
    { name: 'Ubicaciones y Sucursales', category: 'Inventario', href: '/admin/areas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['ubicaciones', 'sucursales', 'areas', 'bodegas', 'locations'] },
    { name: 'Inventario (Odoo)', category: 'Inventario', href: '/inventario/historico', roles: ['SUPER_ADMIN'], keywords: ['odoo', 'historico', 'referencia'] },
    { name: 'Directorio de Contactos', category: 'Ventas y Servicios', href: '/contactos', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['contactos', 'clientes', 'directorio', 'telefono', 'address book'] },
    { name: 'Cotizaciones', category: 'Ventas y Servicios', href: '/cotizaciones', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['cotizaciones', 'presupuestos', 'quotes', 'proposals'] },
    { name: 'Facturación', category: 'Ventas y Servicios', href: '/facturas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['facturas', 'ventas', 'billing', 'invoices'] },
    { name: 'Órdenes de Entrega', category: 'Ventas y Servicios', href: '/facturas?tab=facturas', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['ordenes', 'entrega', 'delivery', 'shipping'] },
    { name: 'Cierre de Caja', category: 'Ventas y Servicios', href: '/cierre-caja', keywords: ['cierre', 'caja', 'cortes', 'arqueo', 'cash close'] },
    { name: 'Usuarios y Roles', category: 'Administración', href: '/admin/users', roles: ['SUPER_ADMIN', 'CHECKIN_KIDS_ADMIN'], keywords: ['usuarios', 'roles', 'permisos', 'users', 'staff'] },
    { name: 'Avances del Desarrollo', category: 'Administración', href: '/admin/avances', roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE', 'EXECUTIVE_ASSISTANT'], keywords: ['avances', 'desarrollo', 'progreso', 'manuel tejada', 'erp', 'completion', 'usabilidad', 'ux'] },
    { name: 'Gestión Web / Tienda', category: 'Administración', href: '/admin/gestion-web', roles: ['SUPER_ADMIN', 'ORG_ADMIN'], keywords: ['web', 'tienda', 'shop', 'configuracion web'] },
    { name: 'Configuración', category: 'Ajustes', href: '/configuracion', keywords: ['configuracion', 'ajustes', 'system settings'] },
    { name: 'Ayuda y Soporte', category: 'Soporte', href: '/soporte', keywords: ['ayuda', 'soporte', 'faq', 'help', 'docs'] }
];

export function Header({ dbUser, onMenuClick }: HeaderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const userRole = dbUser?.role || 'USER';
    const userAllowedModules = dbUser?.accessibleModules || [];

    const isAllowed = (item: SearchItem) => {
        if (userRole === 'SUPER_ADMIN') return true;
        if (userAllowedModules.includes(item.href)) return true;
        if (item.roles && item.roles.includes(userRole)) return true;
        if (!item.roles) return true;
        return false;
    };

    const filteredItems = searchItems
        .filter(isAllowed)
        .filter(item => {
            if (!query) return true;
            const lowerQuery = query.toLowerCase().trim();
            return (
                item.name.toLowerCase().includes(lowerQuery) ||
                item.category.toLowerCase().includes(lowerQuery) ||
                item.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))
            );
        });

    const categoriesMap: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item, index) => {
        const itemWithIndex = { ...item, originalIndex: index };
        if (!categoriesMap[item.category]) {
            categoriesMap[item.category] = [];
        }
        categoriesMap[item.category].push(itemWithIndex);
    });

    useEffect(() => {
        const handleGlobalKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKey);
        return () => window.removeEventListener('keydown', handleGlobalKey);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleModalKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    handleNavigate(filteredItems[selectedIndex].href);
                }
            }
        };

        window.addEventListener('keydown', handleModalKey);
        return () => window.removeEventListener('keydown', handleModalKey);
    }, [isOpen, filteredItems, selectedIndex]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleNavigate = (href: string) => {
        setIsOpen(false);
        setQuery('');
        router.push(href);
    };

    return (
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-[60] w-full gap-3 print:hidden">

            {/* Hamburger */}
            <button
                onClick={onMenuClick}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Alternar menú"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="hidden sm:flex flex-1 max-w-2xl cursor-pointer" onClick={() => setIsOpen(true)}>
                <div className="relative flex items-center w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4" />
                    <input
                        type="text"
                        placeholder="Buscar en toda la plataforma..."
                        readOnly
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-2.5 text-sm text-slate-600 focus:outline-none cursor-pointer transition-all placeholder:text-slate-400"
                    />
                    <div className="absolute right-4 flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-400">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Mobile: show app name when search is hidden */}
            <div className="sm:hidden flex-1 font-semibold text-slate-700 text-sm">Bioelectrónica</div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 md:gap-6 ml-auto">

                {/* System Status Badge */}
                <div className="hidden md:flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-xs font-medium text-brand-700">Sistema Operativo</span>
                </div>

                {/* Notifications */}
                <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                </button>

                <UserDropdown dbUser={dbUser} />

            </div>

            {/* Command Palette Modal */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-150"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsOpen(false);
                    }}
                >
                    <div 
                        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[60vh]"
                    >
                        {/* Search input header */}
                        <div className="relative flex items-center w-full border-b border-slate-100 shrink-0">
                            <Search className="w-5 h-5 text-slate-400 absolute left-4" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                placeholder="Escribe el nombre de un módulo para buscar..."
                                className="w-full pl-12 pr-20 py-4 text-slate-800 text-sm focus:outline-none placeholder:text-slate-400"
                            />
                            <div className="absolute right-4 flex items-center gap-1.5 pointer-events-none">
                                <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-400 uppercase">ESC</kbd>
                                <span className="text-[10px] text-slate-300 font-bold">cerrar</span>
                            </div>
                        </div>

                        {/* Search Results list */}
                        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar bg-slate-50/30">
                            {filteredItems.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 animate-in fade-in duration-150">
                                    <p className="text-sm font-medium">No se encontraron coincidencias para "{query}"</p>
                                    <p className="text-xs text-slate-300 mt-1">Prueba buscando por palabras clave o categorías</p>
                                </div>
                            ) : (
                                Object.entries(categoriesMap).map(([categoryName, items]) => (
                                    <div key={categoryName} className="mb-4">
                                        <h3 className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-y border-slate-200/50">
                                            {categoryName}
                                        </h3>
                                        <div className="mt-1.5 space-y-1 px-3">
                                            {items.map((item: any) => {
                                                const isSelected = item.originalIndex === selectedIndex;
                                                return (
                                                    <button
                                                        key={item.href}
                                                        onClick={() => handleNavigate(item.href)}
                                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all text-left group border ${
                                                            isSelected 
                                                                ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-500/20 border-brand-600' 
                                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 bg-white border-slate-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-medium">{item.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isSelected ? (
                                                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                                                                    Ir <ArrowRight className="w-3.5 h-3.5" />
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] text-slate-400 bg-slate-100 group-hover:bg-slate-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                    abrir
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
