/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Settings, LogOut, Loader2, Smartphone, X, ExternalLink } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface UserDropdownProps {
    dbUser: any;
}

export function UserDropdown({ dbUser }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIosInstructions, setShowIosInstructions] = useState(false);

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

    // PWA installability detection
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check if captured globally on window
            if ((window as any).deferredPrompt) {
                setDeferredPrompt((window as any).deferredPrompt);
            }

            const handleInstallable = () => {
                setDeferredPrompt((window as any).deferredPrompt);
            };

            const handleAppInstalled = () => {
                setDeferredPrompt(null);
                (window as any).deferredPrompt = null;
            };

            window.addEventListener('pwa-installable', handleInstallable);
            window.addEventListener('appinstalled', handleAppInstalled);

            // iOS detection
            const userAgent = window.navigator.userAgent.toLowerCase();
            const ios = /iphone|ipad|ipod/.test(userAgent);
            const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
            
            setIsIos(ios);
            setIsStandalone(standalone);

            return () => {
                window.removeEventListener('pwa-installable', handleInstallable);
                window.removeEventListener('appinstalled', handleAppInstalled);
            };
        }
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

    async function handleInstallApp() {
        if (deferredPrompt) {
            setIsOpen(false);
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA install prompt user choice: ${outcome}`);
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                (window as any).deferredPrompt = null;
            }
        } else if (isIos) {
            setIsOpen(false);
            setShowIosInstructions(true);
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
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#0500A3] transition-colors"
                    >
                        <User className="w-4 h-4" />
                        <span>Mi Perfil</span>
                    </Link>

                    <Link
                        href="/configuracion"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#0500A3] transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Configuración de cuenta</span>
                    </Link>

                    {/* Elegant PWA Install Button */}
                    {(deferredPrompt || (isIos && !isStandalone)) && (
                        <button
                            type="button"
                            onClick={handleInstallApp}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#0500A3] hover:bg-blue-50 font-bold transition-colors text-left cursor-pointer"
                        >
                            <Smartphone className="w-4 h-4 text-[#0500A3] shrink-0 animate-bounce" />
                            <span>Instalar App Móvil</span>
                        </button>
                    )}

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

            {/* iOS Installation Instructions Modal */}
            {showIosInstructions && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-100">
                        <button
                            onClick={() => setShowIosInstructions(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="text-center mb-5">
                            <div className="w-12 h-12 bg-blue-50 text-[#0500A3] rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <Smartphone size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Instalar en tu iPhone / iPad</h3>
                            <p className="text-xs text-slate-500 mt-1">Sigue estos sencillos pasos para agregar el ERP a tu pantalla de inicio:</p>
                        </div>
                        
                        <div className="space-y-4 text-sm text-slate-700">
                            <div className="flex gap-3 items-start">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                                <p className="leading-relaxed">
                                    Abre este sitio en el navegador **Safari**.
                                </p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                                <p className="leading-relaxed flex items-center gap-1.5 flex-wrap">
                                    Toca el botón **Compartir** <span className="inline-flex p-1 bg-slate-50 border border-slate-200 rounded text-xs"><ExternalLink className="w-3.5 h-3.5 inline text-slate-500" /></span> (el cuadrado con la flecha hacia arriba).
                                </p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                                <p className="leading-relaxed">
                                    Selecciona la opción &quot;Agregar a pantalla de inicio&quot; 📲.
                                </p>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setShowIosInstructions(false)}
                            className="mt-6 w-full py-3 bg-[#0500A3] hover:bg-[#0600c2] text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-md shadow-blue-900/10"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
