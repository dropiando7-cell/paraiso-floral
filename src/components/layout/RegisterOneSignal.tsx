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

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

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

    const initOneSignal = () => {
        if (!appId || !window.OneSignal) return;

        window.OneSignal.push(async function () {
            try {
                await window.OneSignal.init({
                    appId: appId,
                    allowLocalhostAsSecureOrigin: true,
                    serviceWorkerParam: { scope: '/' },
                    serviceWorkerPath: 'OneSignalSDKWorker.js',
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
        if (!window.OneSignal) return;

        window.OneSignal.push(async function () {
            try {
                // Solicitar permisos nativos
                let granted = false;
                if (window.OneSignal.Notifications?.requestPermission) {
                    granted = await window.OneSignal.Notifications.requestPermission();
                } else if (window.OneSignal.registerForPushNotifications) {
                    await window.OneSignal.registerForPushNotifications();
                    granted = true; // asumimos true si se completa
                }

                const subscriptionId = window.OneSignal.User?.PushSubscription?.id || 
                                       (window.OneSignal.getUserId ? await window.OneSignal.getUserId() : null);

                if (subscriptionId) {
                    // Sincronizar ID de usuario y registrar en la DB
                    await window.OneSignal.login(dbUser.id);
                    const res = await registerOneSignalSubscription(subscriptionId);
                    if (res.success) {
                        toast.success('¡Suscripción a notificaciones push exitosa!');
                    }
                }
                
                setShowBanner(false);
            } catch (err: any) {
                console.error('[ONESIGNAL] Error al suscribirse:', err);
                toast.error('Error al activar notificaciones');
            }
        });
    };

    const handleDismiss = () => {
        setShowBanner(false);
        // Recordar el descarte por 7 días para no molestar continuamente
        localStorage.setItem('onesignal_banner_dismissed', 'true');
    };

    if (!appId) return null;

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
