'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { Bell, X, ShieldAlert } from 'lucide-react';
import { registerOneSignalSubscription } from '@/app/(dashboard)/admin/notificaciones/actions';
import toast from 'react-hot-toast';

interface RegisterOneSignalProps {
    dbUser: any;
}

declare global {
    interface Window {
        OneSignal: any;
    }
}

export function RegisterOneSignal({ dbUser }: RegisterOneSignalProps) {
    const [showBanner, setShowBanner] = useState(false);
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).showOneSignalBanner = () => {
                console.log('[ONESIGNAL] Forzando banner de suscripción...');
                localStorage.removeItem('onesignal_banner_dismissed');
                setShowBanner(true);
            };

            // Limpieza automática de Service Workers antiguos en conflicto (que no sean /sw.js)
            if (navigator.serviceWorker) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const registration of registrations) {
                        const scriptURL = registration.active?.scriptURL;
                        if (scriptURL && !scriptURL.endsWith('/sw.js')) {
                            registration.unregister().then((success) => {
                                if (success) {
                                    console.log('[ONESIGNAL] Se desinstaló service worker obsoleto:', scriptURL);
                                }
                            });
                        }
                    }
                }).catch(err => {
                    console.error('[ONESIGNAL] Error limpiando service workers obsoletos:', err);
                });
            }
        }
    }, []);

    useEffect(() => {
        if (!appId) {
            console.warn('[ONESIGNAL] NEXT_PUBLIC_ONESIGNAL_APP_ID no definido en las variables de entorno.');
            return;
        }

        // Si ya está cargado el objeto en window, marcar cargado
        if (window.OneSignal) {
            setSdkLoaded(true);
        }
    }, [appId]);

    useEffect(() => {
        if (sdkLoaded) {
            initOneSignal();
        }
    }, [sdkLoaded]);

    const initOneSignal = () => {
        if (!appId || !window.OneSignal || isInitialized) return;
        setIsInitialized(true);

        window.OneSignal.push(async function () {
            try {
                await window.OneSignal.init({
                    appId: appId,
                    allowLocalhostAsSecureOrigin: true,
                    serviceWorkerParam: { scope: '/' },
                    serviceWorkerPath: '/sw.js',
                });

                // Verificar si ya está suscrito
                const subscriptionId = window.OneSignal.User?.PushSubscription?.id || 
                                       (window.OneSignal.getUserId ? await window.OneSignal.getUserId() : null);
                
                const hasPermission = window.OneSignal.Notifications?.permission === true ||
                                      (window.OneSignal.getNotificationPermission ? (await window.OneSignal.getNotificationPermission() === 'granted') : false);

                if (!subscriptionId || !hasPermission) {
                    // Mostrar banner de invitación si no tiene suscripción activa o permiso bloqueado
                    const dismissed = localStorage.getItem('onesignal_banner_dismissed');
                    if (!dismissed) {
                        setTimeout(() => {
                            setShowBanner(true);
                        }, 5000); // 5 segundos de gracia para no interrumpir carga inicial
                    }
                } else {
                    // Usuario ya suscrito: Asegurar vinculación del External ID con el ID de usuario de base de datos
                    await window.OneSignal.login(dbUser.id);
                    await registerOneSignalSubscription(subscriptionId);
                }

                // Escuchar cambios en la suscripción del usuario
                const subListener = async (event: any) => {
                    const currentId = event?.current?.id || event;
                    if (currentId) {
                        await window.OneSignal.login(dbUser.id);
                        await registerOneSignalSubscription(currentId);
                    } else {
                        await registerOneSignalSubscription(null);
                    }
                };

                if (window.OneSignal.User?.PushSubscription?.addEventListener) {
                    window.OneSignal.User.PushSubscription.addEventListener('change', subListener);
                } else if (window.OneSignal.on) {
                    window.OneSignal.on('subscriptionChange', subListener);
                }

            } catch (err) {
                console.error('[ONESIGNAL] Error durante la inicialización:', err);
            }
        });
    };

    const handleAcceptPush = async () => {
        if (typeof window === 'undefined') return;

        // 1. Solicitar permiso nativo de inmediato para preservar el contexto de interacción del usuario (User Gesture)
        let permission = 'default';
        if (typeof Notification !== 'undefined') {
            permission = Notification.permission;
            if (permission === 'default') {
                try {
                    permission = await Notification.requestPermission();
                    console.log('[ONESIGNAL] Banner accept clicked. Native permission result:', permission);
                } catch (e) {
                    console.error('[ONESIGNAL] Error requesting native permission from banner:', e);
                }
            }
        }

        if (permission === 'denied') {
            toast.error('Las notificaciones están bloqueadas en tu navegador.');
            setShowBanner(false);
            return;
        }

        // 2. Ejecutar la cola de OneSignal
        if (window.OneSignal) {
            window.OneSignal.push(async function () {
                try {
                    if (window.OneSignal.Notifications?.requestPermission) {
                        await window.OneSignal.Notifications.requestPermission();
                    } else if (window.OneSignal.registerForPushNotifications) {
                        await window.OneSignal.registerForPushNotifications();
                    }

                    let subscriptionId = window.OneSignal.User?.PushSubscription?.id;

                    if (!subscriptionId) {
                        subscriptionId = await new Promise<string | null>((resolve) => {
                            let resolved = false;

                            const cleanup = () => {
                                resolved = true;
                                if (window.OneSignal.User?.PushSubscription?.removeEventListener) {
                                    window.OneSignal.User.PushSubscription.removeEventListener('change', subChangeHandler);
                                }
                                clearTimeout(timeoutId);
                            };

                            const subChangeHandler = (event: any) => {
                                const currentId = event?.current?.id || (typeof event === 'string' ? event : null);
                                if (currentId && !resolved) {
                                    cleanup();
                                    resolve(currentId);
                                }
                            };

                            if (window.OneSignal.User?.PushSubscription?.addEventListener) {
                                window.OneSignal.User.PushSubscription.addEventListener('change', subChangeHandler);
                            }

                            const timeoutId = setTimeout(() => {
                                if (!resolved) {
                                    cleanup();
                                    resolve(window.OneSignal.User?.PushSubscription?.id || null);
                                }
                            }, 10000);
                        });
                    }

                    if (subscriptionId) {
                        // Sincronizar ID de usuario y registrar en la DB
                        await window.OneSignal.login(dbUser.id);
                        const res = await registerOneSignalSubscription(subscriptionId);
                        if (res.success) {
                            toast.success('¡Suscripción a notificaciones push exitosa!');
                        } else {
                            toast.error('Error al registrar la suscripción en base de datos.');
                        }
                    } else {
                        toast.error('No se pudo generar el ID de suscripción. Asegúrate de dar los permisos.');
                    }
                    
                    setShowBanner(false);
                } catch (err: any) {
                    console.error('[ONESIGNAL] Error al suscribirse desde banner:', err);
                    toast.error('Error al activar notificaciones');
                }
            });
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        // Recordar el descarte por 7 días para no molestar continuamente
        localStorage.setItem('onesignal_banner_dismissed', 'true');
    };

    if (!appId) {
        if (showBanner) {
            return (
                <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-rose-900/50 p-5 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-3.5 right-3.5 text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        aria-label="Cerrar"
                    >
                        <X size={15} />
                    </button>

                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-5 h-5 text-rose-450 animate-pulse" />
                        </div>
                        <div className="space-y-1 pr-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">Falta Configuración</h4>
                            <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                                No se pudo inicializar OneSignal en producción porque la variable <code className="bg-slate-950 px-1 py-0.5 rounded text-rose-400 font-mono text-[9px]">NEXT_PUBLIC_ONESIGNAL_APP_ID</code> no está configurada en tu panel de Vercel.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    }

    return (
        <>
            <Script
                src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
                defer
                onLoad={() => {
                    setSdkLoaded(true);
                    initOneSignal();
                }}
            />

            {showBanner && (
                <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-5 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        aria-label="Cerrar"
                    >
                        <X size={15} />
                    </button>

                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                            <Bell className="w-5 h-5 text-brand-400 animate-bounce" />
                        </div>
                        <div className="space-y-1 pr-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Alertas en tu Celular</h4>
                            <p className="text-[11px] text-slate-350 leading-relaxed">
                                Mantente al día. Activa las notificaciones automáticas para recibir recordatorios de órdenes de trabajo, asignación de tareas, avances y límites de entrega.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3.5 mt-1 select-none">
                        <button
                            onClick={handleDismiss}
                            className="px-3.5 py-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            Ahora no
                        </button>
                        <button
                            onClick={handleAcceptPush}
                            className="px-4 py-2 bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 text-white text-[10px] font-bold rounded-xl transition-all shadow-md shadow-brand-500/10 active:scale-95 cursor-pointer"
                        >
                            Activar Alertas
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
