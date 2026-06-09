'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// TODO: ajustar tiempo final con Isaac
const INACTIVITY_TIMEOUT_MS = 600_000; // 10 min → mostrará el modal
const COUNTDOWN_SECONDS = 30;      // segundos para hacer logout automático

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function InactivityGuard({ children, enabled = true }: { children: React.ReactNode, enabled?: boolean }) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    // Refs — no queremos re-renders por cada cambio de timer
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const modalShown = useRef(false); // evitar doble disparo

    /* ── Logout ─────────────────────────────────────────────────────────── */
    const doLogout = useCallback(async () => {
        clearTimeout(inactivityTimer.current!);
        clearInterval(countdownTimer.current!);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    }, [router]);

    /* ── Muestra el modal + inicia countdown ────────────────────────────── */
    const showInactivityModal = useCallback(() => {
        if (modalShown.current) return;
        modalShown.current = true;
        setCountdown(COUNTDOWN_SECONDS);
        setShowModal(true);

        let remaining = COUNTDOWN_SECONDS;
        countdownTimer.current = setInterval(() => {
            remaining -= 1;
            setCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(countdownTimer.current!);
                doLogout();
            }
        }, 1000);
    }, [doLogout]);

    /* ── Reinicia el timer de inactividad ───────────────────────────────── */
    const resetInactivityTimer = useCallback(() => {
        if (!enabled) return; // Si la opción está apagada, ignoramos
        if (modalShown.current) return; // si el modal está visible, no reiniciar
        clearTimeout(inactivityTimer.current!);
        inactivityTimer.current = setTimeout(showInactivityModal, INACTIVITY_TIMEOUT_MS);
    }, [showInactivityModal, enabled]);

    /* ── Sí, continuar ──────────────────────────────────────────────────── */
    const handleContinue = () => {
        clearInterval(countdownTimer.current!);
        modalShown.current = false;
        setShowModal(false);
        resetInactivityTimer();
    };

    /* ── Montar listeners de actividad ──────────────────────────────────── */
    useEffect(() => {
        // --- 1. Supabase Auth Listener (Prevención de Sesión Fantasma) ---
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Si la sesión expiró naturalmente (computadora suspendida) o cerraron sesión en otra pestaña
            if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                router.push('/login');
            }
        });

        // --- 2. Inactivity Timers (Solo si está activado) ---
        const handler = () => resetInactivityTimer();
        
        let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
        
        if (enabled) {
            resetInactivityTimer();
            ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
        } else {
            clearTimeout(inactivityTimer.current!);
            clearInterval(countdownTimer.current!);
            
            // Mantener sesión activa indefinidamente si "Cierre por Inactividad" está desactivado
            keepAliveTimer = setInterval(async () => {
                try {
                    const { error } = await supabase.auth.refreshSession();
                    if (error) {
                        console.error("InactivityGuard: Error al refrescar token en keep-alive:", error);
                    }
                } catch (e) {
                    console.error("InactivityGuard: Error en keep-alive de sesión:", e);
                }
            }, 10 * 60 * 1000); // Cada 10 minutos
        }

        return () => {
            // Limpiar todo al desmontar o cambiar dependencias
            clearTimeout(inactivityTimer.current!);
            clearInterval(countdownTimer.current!);
            if (keepAliveTimer) clearInterval(keepAliveTimer);
            if (enabled) {
                ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handler));
            }
            subscription.unsubscribe();
        };
    }, [resetInactivityTimer, enabled, router]);

    /* ── Verificar validez de la sesión al enfocar ventana ────────────────── */
    useEffect(() => {
        const supabase = createClient();
        let isChecking = false;
        let lastCheckTime = 0;

        const checkSession = async () => {
            const now = Date.now();
            // Evitar validaciones concurrentes y espaciar consultas (mínimo 15 segundos entre comprobaciones)
            if (isChecking || (now - lastCheckTime < 15000)) {
                return;
            }

            isChecking = true;
            lastCheckTime = now;

            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error("InactivityGuard: Error al verificar sesión en focus:", error);
                    
                    // Si es un error de red o de límite de solicitudes (rate limit), NO cerrar sesión
                    const isTransientError = 
                        error.status === 429 || 
                        error.status === 500 || 
                        error.status === 503 ||
                        error.message?.toLowerCase().includes('fetch') ||
                        error.message?.toLowerCase().includes('network') ||
                        error.message?.toLowerCase().includes('rate limit') ||
                        error.message?.toLowerCase().includes('rate_limit');

                    if (isTransientError) {
                        return; // Omitir redirección y mantener sesión activa
                    }
                }

                if (!session) {
                    router.push('/login');
                }
            } catch (e) {
                console.error("InactivityGuard: Error inesperado al verificar sesión en focus:", e);
            } finally {
                isChecking = false;
            }
        };

        window.addEventListener('focus', checkSession);
        document.addEventListener('visibilitychange', checkSession);

        return () => {
            window.removeEventListener('focus', checkSession);
            document.removeEventListener('visibilitychange', checkSession);
        };
    }, [router]);

    /* ── Dígitos del countdown ──────────────────────────────────────────── */
    const tens = Math.floor(countdown / 10);
    const ones = countdown % 10;
    const isUrgent = countdown <= 10;

    return (
        <>
            {children}

            {showModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{
                        background: 'rgba(15,20,40,0.45)',
                        backdropFilter: 'blur(6px)',
                        animation: 'igFadeIn 0.3s ease',
                    }}
                >
                    {/* Modal card */}
                    <div
                        className="bg-white rounded-[24px] w-full max-w-[380px] relative overflow-hidden text-center"
                        style={{
                            padding: '32px 28px 28px',
                            boxShadow: '0 16px 48px rgba(15,20,40,0.12)',
                            animation: 'igSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                        }}
                    >
                        {/* Soft blob backgrounds */}
                        <div className="absolute top-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full pointer-events-none"
                            style={{ background: 'radial-gradient(circle,#EEF2FF 0%,transparent 70%)' }} />
                        <div className="absolute bottom-[-30px] left-[-30px] w-[120px] h-[120px] rounded-full pointer-events-none"
                            style={{ background: 'radial-gradient(circle,#EEF2FF 0%,transparent 70%)' }} />

                        {/* Lock icon with spinning ring */}
                        <div className="relative z-10 w-[72px] h-[72px] mx-auto mb-[18px] flex items-center justify-center rounded-full"
                            style={{ background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)' }}>
                            {/* spinning border */}
                            <div className="absolute inset-[-4px] rounded-full border-2 border-[#C7D2FE] border-t-[#1B3FE0]"
                                style={{ animation: 'igSpin 3s linear infinite' }} />
                            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" className="relative z-10">
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#1B3FE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#1B3FE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="16" r="1.5" fill="#1B3FE0" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h2 className="relative z-10 text-[18px] font-semibold text-[#0f1428] tracking-[-0.3px] mb-1.5">
                            ¿Sigues ahí?
                        </h2>
                        <p className="relative z-10 text-[13px] text-[#9ca3af] mb-5" style={{ fontFamily: 'monospace' }}>
                            Tu sesión se cerrará automáticamente
                        </p>

                        {/* Flip countdown */}
                        <div className="relative z-10 flex items-center justify-center gap-1.5 mb-5">
                            {/* tens digit */}
                            <div className="w-12 h-[52px] rounded-[10px] flex items-center justify-center text-[26px] font-semibold relative overflow-hidden"
                                style={{
                                    background: '#F5F7FF',
                                    border: `1.5px solid ${isUrgent ? '#FCA5A5' : '#E0E7FF'}`,
                                    color: isUrgent ? '#EF4444' : '#1B3FE0',
                                    fontFamily: 'monospace',
                                    transition: 'color 0.3s, border-color 0.3s',
                                }}>
                                {tens}
                                <div className="absolute top-1/2 left-0 right-0 h-[1px]"
                                    style={{ background: isUrgent ? '#FCA5A5' : '#C7D2FE' }} />
                            </div>
                            {/* ones digit */}
                            <div className="w-12 h-[52px] rounded-[10px] flex items-center justify-center text-[26px] font-semibold relative overflow-hidden"
                                style={{
                                    background: '#F5F7FF',
                                    border: `1.5px solid ${isUrgent ? '#FCA5A5' : '#E0E7FF'}`,
                                    color: isUrgent ? '#EF4444' : '#1B3FE0',
                                    fontFamily: 'monospace',
                                    transition: 'color 0.3s, border-color 0.3s',
                                }}>
                                {ones}
                                <div className="absolute top-1/2 left-0 right-0 h-[1px]"
                                    style={{ background: isUrgent ? '#FCA5A5' : '#C7D2FE' }} />
                            </div>
                            <span className="text-[22px] font-bold mb-1"
                                style={{ color: isUrgent ? '#FCA5A5' : '#C7D2FE', fontFamily: 'monospace' }}>
                                s
                            </span>
                        </div>

                        {/* Description */}
                        <p className="relative z-10 text-[13.5px] text-[#6b7280] leading-relaxed mb-6">
                            No hemos detectado actividad reciente. Por seguridad cerraremos tu sesión en breve.
                            ¿Deseas continuar trabajando?
                        </p>

                        {/* Actions */}
                        <div className="relative z-10 flex gap-2.5">
                            <button
                                onClick={doLogout}
                                className="flex-1 py-[11px] rounded-[10px] text-[13.5px] font-medium text-[#374151] bg-white border border-[#E5E7EB] transition-all hover:border-[#C7D2FE] hover:text-[#1B3FE0] hover:bg-[#F5F7FF] cursor-pointer"
                                style={{ fontFamily: 'inherit' }}
                            >
                                Salir
                            </button>
                            <button
                                onClick={handleContinue}
                                className="flex-[1.4] py-[11px] rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer transition-all hover:-translate-y-px"
                                style={{
                                    background: 'linear-gradient(135deg,#1B3FE0,#4C6EF5)',
                                    boxShadow: '0 4px 14px rgba(27,63,224,0.3)',
                                    fontFamily: 'inherit',
                                    border: 'none',
                                }}
                            >
                                Sí, continuar
                            </button>
                        </div>
                    </div>

                    {/* Keyframes — scoped via style tag to avoid globals */}
                    <style>{`
                        @keyframes igFadeIn  { from { opacity:0; } to { opacity:1; } }
                        @keyframes igSlideUp { from { opacity:0; transform:translateY(20px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
                        @keyframes igSpin    { to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            )}
        </>
    );
}
