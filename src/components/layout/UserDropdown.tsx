'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Settings, LogOut } from 'lucide-react';
import { logout } from '@/app/auth/actions';

interface UserDropdownProps {
    dbUser: any;
}

export function UserDropdown({ dbUser }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-6 border-l border-slate-200 focus:outline-none"
            >
                <div className="flex flex-col items-end hidden md:flex text-right">
                    <span className="text-sm font-semibold text-slate-700 leading-tight">
                        Isaac Paz
                    </span>
                    <span className="text-[12px] text-slate-500 capitalize mt-0.5">
                        {dbUser?.role === 'SUPER_ADMIN' ? 'Administrador General' :
                            dbUser?.role === 'ORG_ADMIN' ? 'Admin. de Filial' : 'Usuario'}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shrink-0 relative transition-transform hover:scale-105">
                    <Image
                        src="https://i.ibb.co/99640p19/foto-isaac.png"
                        alt="Isaac Paz"
                        fill
                        className="object-cover"
                    />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 mb-2 md:hidden">
                        <p className="text-sm font-semibold text-slate-700">Isaac Paz</p>
                        <p className="text-xs text-slate-400 truncate">{dbUser?.email}</p>
                    </div>

                    <Link
                        href="/perfil"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                    >
                        <User className="w-4 h-4" />
                        <span>Mi Perfil</span>
                    </Link>

                    <Link
                        href="/configuracion"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Configuración de cuenta</span>
                    </Link>

                    <div className="border-t border-slate-100 my-2"></div>

                    <form action={logout}>
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
