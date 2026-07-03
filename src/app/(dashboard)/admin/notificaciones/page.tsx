'use client';

import React, { useState, useEffect } from 'react';
import { 
    Bell, 
    Send, 
    Users, 
    Smartphone, 
    MessageSquare, 
    CheckCircle2, 
    XCircle,
    UserCheck,
    Link as LinkIcon,
    AlertCircle,
    ShieldAlert
} from 'lucide-react';
import { getNotificationsAdminData, sendManualNotification } from './actions';
import toast from 'react-hot-toast';

export default function NotificationsAdminPage() {
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [adminData, setAdminData] = useState<any>(null);

    // Diagnostics states
    const [diagAppId, setDiagAppId] = useState<string | null>(null);
    const [diagSdkLoaded, setDiagSdkLoaded] = useState(false);
    const [diagPermission, setDiagPermission] = useState<string>('unknown');
    const [diagSubscriptionId, setDiagSubscriptionId] = useState<string | null>(null);

    // Form states
    const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');

    const loadData = async () => {
        setLoading(true);
        const res = await getNotificationsAdminData();
        if (res.success) {
            setAdminData(res);
        } else {
            toast.error(res.error || 'Error al cargar datos administrativos');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateDiagnostics = async () => {
            const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || null;
            setDiagAppId(appId);

            const sdkLoaded = !!(window as any).OneSignal;
            setDiagSdkLoaded(sdkLoaded);

            if (sdkLoaded && (window as any).OneSignal) {
                (window as any).OneSignal.push(async () => {
                    const os = (window as any).OneSignal;
                    const subId = os.User?.PushSubscription?.id || 
                                  (os.getUserId ? await os.getUserId() : null);
                    setDiagSubscriptionId(subId);
                });
            }

            if (typeof Notification !== 'undefined') {
                setDiagPermission(Notification.permission);
            }
        };

        updateDiagnostics();
        const interval = setInterval(updateDiagnostics, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleForceBanner = () => {
        if (typeof window !== 'undefined' && (window as any).showOneSignalBanner) {
            (window as any).showOneSignalBanner();
            toast.success('Forzando banner de suscripción...');
        } else {
            toast.error('El cargador de banner no está disponible. Asegúrate de que el script SDK no esté bloqueado.');
        }
    };

    const handleRequestNativePermission = () => {
        if (typeof window !== 'undefined' && (window as any).OneSignal) {
            const os = (window as any).OneSignal;
            os.push(async () => {
                try {
                    let granted = false;
                    if (os.Notifications?.requestPermission) {
                        granted = await os.Notifications.requestPermission();
                    } else if (os.registerForPushNotifications) {
                        await os.registerForPushNotifications();
                        granted = true;
                    }
                    if (granted) {
                        toast.success('Permiso concedido');
                    } else {
                        toast.error('Permiso no concedido');
                    }
                } catch (err: any) {
                    toast.error('Error al solicitar permiso: ' + err.message);
                }
            });
        } else {
            toast.error('SDK de OneSignal no disponible en la página.');
        }
    };

    const handleClearDismissCache = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('onesignal_banner_dismissed');
            toast.success('Caché de descarte local eliminada.');
        }
    };

    const handleUserSelectToggle = (userId: string) => {
        setSelectedUserIds(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId) 
                : [...prev, userId]
        );
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !message.trim()) {
            toast.error('El título y el mensaje son requeridos');
            return;
        }

        if (targetType === 'specific' && selectedUserIds.length === 0) {
            toast.error('Debes seleccionar al menos un usuario destinatario');
            return;
        }

        setSending(true);
        try {
            const targets = targetType === 'all' ? 'all' : selectedUserIds;
            const res = await sendManualNotification(targets, title, message, link || undefined);
            
            if (res.success) {
                toast.success(`Alerta enviada con éxito a ${res.count} destinatarios`);
                // Reset form
                setTitle('');
                setMessage('');
                setLink('');
                setSelectedUserIds([]);
                // Reload stats
                loadData();
            } else {
                toast.error(res.error || 'Error al despachar la notificación');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error de conexión');
        }
        setSending(false);
    };

    if (loading && !adminData) {
        return (
            <div className="p-6 space-y-6 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-brand-500 animate-spin" />
                <p className="text-xs text-slate-500 font-semibold">Cargando módulo de notificaciones...</p>
            </div>
        );
    }

    const stats = adminData?.stats || { totalUsers: 0, registeredPushUsers: 0, totalSentCount: 0, readCount: 0 };
    const users = adminData?.users || [];

    const readPercentage = stats.totalSentCount > 0 
        ? Math.round((stats.readCount / stats.totalSentCount) * 100) 
        : 0;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-brand-500" />
                    <span>Administración de Notificaciones</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-sans leading-relaxed">
                    Monitorea la suscripción Push de los técnicos y envía alertas manuales, recordatorios y anuncios importantes en tiempo real.
                </p>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Personal Total</span>
                        <span className="text-xl font-extrabold text-slate-800">{stats.totalUsers}</span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5 text-emerald-600 animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispositivos Push</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-extrabold text-slate-800">{stats.registeredPushUsers}</span>
                            <span className="text-[10px] text-slate-400 font-bold">
                                ({stats.totalUsers > 0 ? Math.round((stats.registeredPushUsers / stats.totalUsers) * 100) : 0}%)
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensajes Enviados</span>
                        <span className="text-xl font-extrabold text-slate-800">{stats.totalSentCount}</span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Lectura</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-extrabold text-slate-800">{readPercentage}%</span>
                            <span className="text-[10px] text-slate-400 font-bold">({stats.readCount} leídos)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Form Column & Diagnostics Column */}
                <div className="lg:col-span-1 space-y-6">
                    <form onSubmit={handleSend} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">Enviar Alerta Manual</h3>
                        
                        {/* Destination Selection */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Destinatarios</label>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-150 select-none">
                                <button
                                    type="button"
                                    onClick={() => setTargetType('all')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${targetType === 'all' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Todos (Broadcast)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetType('specific')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${targetType === 'specific' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    Seleccionar Técnicos
                                </button>
                            </div>
                        </div>

                        {/* Specific target list selector */}
                        {targetType === 'specific' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">
                                    Seleccionar Destinatarios ({selectedUserIds.length})
                                </label>
                                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2.5 divide-y divide-slate-100 bg-slate-50/20 custom-scrollbar space-y-0.5">
                                    {users.map((user: any) => {
                                        const isSelected = selectedUserIds.includes(user.id);
                                        return (
                                            <label 
                                                key={user.id} 
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${isSelected ? 'bg-cyan-50/20 text-cyan-800' : 'hover:bg-slate-50 text-slate-650'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleUserSelectToggle(user.id)}
                                                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer w-3.5 h-3.5"
                                                    />
                                                    <span>{user.nombre || 'Sin nombre'} {user.apellido || ''}</span>
                                                </div>
                                                {user.oneSignalSubscriptionId && (
                                                    <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">Push</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Notification Title */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Título de la Alerta</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Nueva Orden Asignada"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2.5 px-3.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 font-semibold"
                                required
                            />
                        </div>

                        {/* Notification Message */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Mensaje / Contenido</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribe el cuerpo del mensaje aquí..."
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2.5 px-3.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 font-semibold font-sans leading-relaxed resize-none"
                                required
                            />
                        </div>

                        {/* Redirection Link */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block flex items-center gap-1">
                                <LinkIcon size={10} />
                                <span>Enlace de Redirección (Opcional)</span>
                            </label>
                            <input
                                type="text"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                placeholder="Ej: /soporte o /kanban"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2.5 px-3.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 font-semibold"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={sending}
                            className={`w-full py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                                sending 
                                    ? 'bg-slate-400 cursor-not-allowed' 
                                    : 'bg-brand-600 hover:bg-brand-700 active:scale-95 shadow-brand-500/10'
                            }`}
                        >
                            <Send size={13} />
                            <span>{sending ? 'Despachando Alertas...' : 'Despachar Notificaciones'}</span>
                        </button>
                    </form>

                    {/* Diagnostics Panel */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between uppercase tracking-wider">
                            <span>Diagnóstico Push (Tu Navegador)</span>
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        </h3>

                        <div className="space-y-2.5 text-xs">
                            {/* App ID Status */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="font-semibold text-slate-500 text-[10px]">App ID (Vercel)</span>
                                {diagAppId ? (
                                    <span className="font-mono bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[9px] truncate max-w-[130px]" title={diagAppId}>
                                        {diagAppId.substring(0, 8)}...
                                    </span>
                                ) : (
                                    <span className="font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                        No configurado
                                    </span>
                                )}
                            </div>

                            {/* SDK Status */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="font-semibold text-slate-500 text-[10px]">SDK OneSignal</span>
                                {diagSdkLoaded ? (
                                    <span className="font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                        Cargado
                                    </span>
                                ) : (
                                    <span className="font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                        No Detectado
                                    </span>
                                )}
                            </div>

                            {/* Browser Permission Status */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="font-semibold text-slate-500 text-[10px]">Permiso Navegador</span>
                                {diagPermission === 'granted' ? (
                                    <span className="font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                        Permitido
                                    </span>
                                ) : diagPermission === 'denied' ? (
                                    <span className="font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                        Bloqueado
                                    </span>
                                ) : (
                                    <span className="font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                        No Solicitado
                                    </span>
                                )}
                            </div>

                            {/* Subscription Status */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="font-semibold text-slate-500 text-[10px]">Suscripción Push</span>
                                {diagSubscriptionId ? (
                                    <span className="font-mono bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[9px] truncate max-w-[130px]" title={diagSubscriptionId}>
                                        {diagSubscriptionId.substring(0, 8)}...
                                    </span>
                                ) : (
                                    <span className="font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                        Inactiva
                                    </span>
                                )}
                            </div>

                            {/* Warning for Brave / Adblockers */}
                            {!diagSdkLoaded && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-[10px] leading-relaxed">
                                    <p className="font-bold flex items-center gap-1 mb-0.5 text-amber-900">
                                        <AlertCircle size={11} />
                                        <span>¿Usas Brave o Adblockers?</span>
                                    </p>
                                    Brave Shields y los adblockers bloquean la carga del SDK de OneSignal por defecto. Desactiva los escudos para esta página para probar notificaciones push.
                                </div>
                            )}

                            {diagAppId && !diagSdkLoaded && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[10px] leading-relaxed">
                                    <p className="font-bold mb-0.5 text-rose-900 flex items-center gap-1">
                                        <ShieldAlert size={11} />
                                        <span>SDK no cargado</span>
                                    </p>
                                    Aunque la variable está configurada, el SDK de OneSignal no ha podido cargarse. Revisa la consola de desarrollador (F12) por errores de red.
                                </div>
                            )}

                            {/* Diagnostics Actions */}
                            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100">
                                <button
                                    onClick={handleForceBanner}
                                    type="button"
                                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all text-[10px] active:scale-95 border border-slate-200 cursor-pointer text-center uppercase tracking-wider"
                                >
                                    Forzar Banner
                                </button>
                                <button
                                    onClick={handleRequestNativePermission}
                                    type="button"
                                    className="w-full py-2 bg-gradient-to-r from-brand-500/10 to-cyan-500/10 hover:from-brand-500/20 hover:to-cyan-500/20 text-brand-700 font-bold rounded-xl transition-all text-[10px] active:scale-95 cursor-pointer text-center border border-brand-500/20 uppercase tracking-wider"
                                >
                                    Solicitar Permiso Nativo
                                </button>
                                <button
                                    onClick={handleClearDismissCache}
                                    type="button"
                                    className="w-full py-1.5 text-slate-400 hover:text-slate-650 transition-colors text-[9px] text-center"
                                >
                                    Limpiar descarte de banner
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users List Column */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                        <span>Personal y Estado Push</span>
                        <button 
                            onClick={loadData}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                        >
                            Refrescar
                        </button>
                    </h3>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-[380px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                                    <th className="p-3 pl-4">Colaborador</th>
                                    <th className="p-3">Puesto / Rol</th>
                                    <th className="p-3 text-center">Notificaciones Push</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 bg-white">
                                {users.map((user: any) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3 pl-4 font-bold text-slate-800">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0 uppercase">
                                                    {user.nombre ? user.nombre[0] : 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{user.nombre} {user.apellido}</span>
                                                    <span className="text-[10px] text-slate-400 font-sans font-medium">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 font-semibold text-slate-500">
                                            <div className="flex flex-col">
                                                <span>{user.puesto || 'Colaborador'}</span>
                                                <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider w-max scale-90 -ml-1 mt-0.5">
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {user.oneSignalSubscriptionId ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-150 uppercase tracking-wider">
                                                    <UserCheck size={11} />
                                                    <span>Suscrito (Activo)</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold border border-rose-150 uppercase tracking-wider">
                                                    <AlertCircle size={11} />
                                                    <span>No Suscrito</span>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
