'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Settings, LogOut, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface UserDropdownProps {
    dbUser: any;
}

export function UserDropdown({ dbUser }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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

    async function handleLogout() {
        if (isPending) return;
        setIsPending(true);
        setIsOpen(false);
        
        try {
            const supabase = createClient();
            // Wait max 800ms for Supabase to sign out
            await Promise.race([
                supabase.auth.signOut(),
                new Promise(resolve => setTimeout(resolve, 800))
            ]);
        } catch (e) {
            console.error("Error al cerrar sesión:", e);
        } finally {
            // Force immediate hard redirect to login page
            window.location.href = '/login';
        }
    }

    // Generate initials for fallback avatar
    const getInitials = (name: string) => {
        if (!name) return 'SE';
        const parts = name.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    const displayName = dbUser?.fullName || 'Usuario Elim';
    const initials = getInitials(displayName);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-6 border-l border-slate-200 focus:outline-none cursor-pointer"
            >
                <span className="flex flex-col items-end hidden md:flex text-right">
                    <span className="text-sm font-semibold text-slate-700 leading-tight">
                        {displayName}
                    </span>
                    <span className="text-[12px] text-slate-500 capitalize mt-0.5">
                        {dbUser?.customRoleName || (
                            dbUser?.role === 'SUPER_ADMIN' ? 'Administrador General' :
                                dbUser?.role === 'ORG_ADMIN' ? 'Admin. de Filial' :
                                    dbUser?.role === 'CHECKIN_KIDS' ? 'Check-In Kids' :
                                        dbUser?.role === 'MEDICAL_STAFF' ? 'Asistencia Médica' :
                                            dbUser?.role === 'EXECUTIVE_ASSISTANT' ? 'Asistente Ejecutivo' :
                                                'Usuario Limitado'
                        )}
                    </span>
                </span>
                <span className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shrink-0 relative transition-transform hover:scale-105 bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                    {isPending ? (
                        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                    ) : dbUser?.avatarUrl ? (
                        <Image
                            src={dbUser.avatarUrl}
                            alt={displayName}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized={dbUser.avatarUrl.includes('googleusercontent.com') || dbUser.avatarUrl.includes('lh3.google')}
                        />
                    ) : (
                        <span>{initials}</span>
                    )}
                </span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 mb-2 md:hidden">
                        <p className="text-sm font-semibold text-slate-700 truncate">{displayName}</p>
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

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isPending}
                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
                    >
                        <span className="flex items-center gap-3">
                            <LogOut className="w-4 h-4" />
                            <span>{isPending ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
                        </span>
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    </button>
                </div>
            )}
        </div>
    );
}
