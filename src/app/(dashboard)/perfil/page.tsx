'use client'

import { useState, useEffect } from 'react';
import { MfaSettings } from '@/components/perfil/MfaSettings';
import { PasswordChange } from '@/components/perfil/PasswordChange';
import { createClient } from '@/utils/supabase/client';
import { ExternalLink, ShieldAlert, Check, X, Bell } from 'lucide-react';
import { updateProfile, updateAvatarInDb } from './actions';
import { getUserProfileData } from './data';
import { registerOneSignalSubscription } from '@/app/(dashboard)/admin/notificaciones/actions';
import toast from 'react-hot-toast';

const roleTextMapping: Record<string, string> = {
    SUPER_ADMIN: 'Administrador General',
    ORG_ADMIN: 'Admin de Organización',
    USER: 'Usuario Estándar',
    CHECKIN_KIDS: 'Check-in Kids',
    CHECKIN_KIDS_ADMIN: 'Admin Check-in Kids',
    MEDICAL_STAFF: 'Staff Médico',
    EXECUTIVE_ASSISTANT: 'Asistente Ejecutivo'
};

export default function ProfilePage() {
    const [isUploading, setIsUploading] = useState(false);
    const [profilePic, setProfilePic] = useState("https://i.ibb.co/99640p19/foto-isaac.png");

    // Auth and User State
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [authProvider, setAuthProvider] = useState<string>('email');
    const [userEmail, setUserEmail] = useState<string>('');
    const [userFullName, setUserFullName] = useState<string>('');
    const [userPhone, setUserPhone] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('USER');

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const provider = user.app_metadata?.providers?.[0] || 'email';
                setAuthProvider(provider);
                setUserEmail(user.email || '');

                const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario';
                setUserFullName(name);

                const parts = name.split(' ');
                setEditFirstName(parts[0] || '');
                setEditLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');

                if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
                    setProfilePic(user.user_metadata?.avatar_url || user.user_metadata?.picture);
                } else {
                    setProfilePic(''); // Clear default to let initials show
                }

                // Fetch extra data from Prisma
                if (user.email) {
                    const dbData = await getUserProfileData(user.email);
                    if (dbData) {
                        setUserRole(dbData.customRoleName || dbData.role || 'USER');
                        const phone = dbData.phoneNumber || '';
                        setUserPhone(phone);
                        setEditPhone(phone);
                    }
                }
            }
            setLoadingAuth(false);
        };
        fetchUser();
    }, []);

    // Handles the native file picker
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB Limit
            alert('La imagen no debe pesar más de 2MB');
            return;
        }

        setIsUploading(true);

        try {
            // 1. Get Pre-Signed URL from our API
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                }),
            });

            if (!response.ok) throw new Error('Error solicitando URL de subida');

            const { uploadUrl, publicUrl } = await response.json();

            // 2. Upload file directly to Cloudflare R2 (Bypassing our Next.js Server)
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) throw new Error('Error subiendo imagen a Cloudflare R2');

            // 3. Success! Set the new image in the UI
            setProfilePic(publicUrl);

            // 4. Update Supabase User Metadata
            const supabase = createClient();
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    avatar_url: publicUrl,
                    picture: publicUrl
                }
            });

            if (updateError) {
                console.error("Error updates supabase metadata", updateError);
            }

            // 5. Update Prisma Database
            const dbRes = await updateAvatarInDb(publicUrl);
            if (!dbRes.success) {
                console.error("Error updating database avatar", dbRes.error);
            }

        } catch (error) {
            console.error("Error cambiando foto:", error);
            alert("Ocurrió un error al intentar subir la foto.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        const combinedName = `${editFirstName} ${editLastName}`.trim();
        const res = await updateProfile({ fullName: combinedName, phone: editPhone });
        if (res.success) {
            setUserFullName(combinedName);
            setUserPhone(editPhone);
            setIsEditing(false);
        } else {
            alert(res.error || 'Error al guardar el perfil');
        }
        setIsSaving(false);
    };

    const getInitials = (name: string) => {
        if (!name || name === 'Usuario') return 'US';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const [activeTab, setActiveTab] = useState<'info' | 'security' | 'notifications'>('info');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab === 'notifications' || tab === 'security') {
                setActiveTab(tab);
            }
        }
    }, []);

    const [subStatus, setSubStatus] = useState<'cargando' | 'suscrito' | 'no_suscrito' | 'bloqueado'>('cargando');

    useEffect(() => {
        if (activeTab !== 'notifications' || typeof window === 'undefined') return;

        let intervalId: any;

        const checkOneSignal = () => {
            if (window.OneSignal) {
                if (intervalId) clearInterval(intervalId);
                window.OneSignal.push(async () => {
                    try {
                        const subId = window.OneSignal.User?.PushSubscription?.id || 
                                      (window.OneSignal.getUserId ? await window.OneSignal.getUserId() : null);
                        
                        const hasPermission = window.OneSignal.Notifications?.permission === true ||
                                              (window.OneSignal.getNotificationPermission ? (await window.OneSignal.getNotificationPermission() === 'granted') : false) ||
                                              (typeof Notification !== 'undefined' && Notification.permission === 'granted');
                        
                        const isDenied = (typeof Notification !== 'undefined' && Notification.permission === 'denied') ||
                                         (window.OneSignal.getNotificationPermission && await window.OneSignal.getNotificationPermission() === 'denied');
                        
                        if (subId && hasPermission) {
                            setSubStatus('suscrito');
                        } else if (isDenied) {
                            setSubStatus('bloqueado');
                        } else {
                            setSubStatus('no_suscrito');
                        }
                    } catch (e) {
                        console.error("Error fetching OneSignal status:", e);
                        setSubStatus('no_suscrito');
                    }
                });
            }
        };

        checkOneSignal();

        if (!window.OneSignal) {
            intervalId = setInterval(checkOneSignal, 500);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeTab]);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Perfil y Seguridad</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Administra tu información personal y las opciones de seguridad de tu cuenta.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column - Navigation */}
                <div className="md:col-span-1 space-y-1">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'info' ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        Información General
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'security' ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        Seguridad y Contraseña
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'notifications' ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        Notificaciones
                    </button>
                </div>

                {/* Right Column - Content */}
                <div className="md:col-span-2 space-y-6">

                    {activeTab === 'info' ? (
                        <>
                            {authProvider === 'google' && (
                                <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex gap-3 text-brand-800 text-sm">
                                    <ShieldAlert className="w-5 h-5 shrink-0 text-brand-600" />
                                    <div>
                                        <p className="font-semibold mb-0.5">Información gestionada por Google Workspace</p>
                                        <p className="text-brand-700/80 mb-2">Para cambiar tu foto de perfil, nombre o configuración de seguridad, debes hacerlo directamente desde tu cuenta de Google.</p>
                                        <a href="https://myaccount.google.com/profile" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium bg-white px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-100 transition-colors shadow-sm">
                                            Ir a configuración de Google
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Main Info Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-base font-semibold leading-6 text-slate-900">Foto de Perfil</h3>
                                    {authProvider !== 'google' && (
                                        <button className="text-sm font-medium text-brand-600 hover:text-brand-500">Actualizar</button>
                                    )}
                                </div>
                                <div className="px-6 py-5 flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden relative shrink-0 flex items-center justify-center text-slate-400">
                                        {loadingAuth ? (
                                            <div className="w-full h-full bg-slate-200 animate-pulse"></div>
                                        ) : profilePic ? (
                                            <img src={profilePic} alt="Profile" className="object-cover w-full h-full" />
                                        ) : (
                                            <span className="text-2xl font-bold text-slate-500">{getInitials(userFullName)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 max-w-xs">
                                            {authProvider === 'google'
                                                ? 'La foto de perfil se sincroniza con tu cuenta de Google.'
                                                : 'Recomendamos una imagen cuadrada de al menos 400x400px en formato JPG o PNG.'}
                                        </p>
                                        {authProvider !== 'google' && (
                                            <div className="mt-3 flex gap-3 items-center">
                                                {/* Hidden File Input */}
                                                <input
                                                    type="file"
                                                    id="avatar-upload"
                                                    accept="image/png, image/jpeg, image/webp"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                    disabled={isUploading}
                                                />
                                                <label htmlFor="avatar-upload" className={`px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium ${isUploading ? 'text-slate-400 cursor-wait' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'} shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20`}>
                                                    {isUploading ? 'Subiendo a R2...' : 'Cambiar foto'}
                                                </label>
                                                <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="flex flex-col flex-1">
                                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-base font-semibold leading-6 text-slate-900">Detalles Personales</h3>
                                        {authProvider !== 'google' && (
                                            <div>
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsEditing(false);
                                                                setEditFirstName(userFullName.split(' ')[0] || '');
                                                                setEditLastName(userFullName.split(' ').slice(1).join(' '));
                                                                setEditPhone(userPhone);
                                                            }}
                                                            className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                                            disabled={isSaving}
                                                        >
                                                            <X className="w-4 h-4" /> Cancelar
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 ml-2"
                                                            disabled={isSaving || (!editFirstName && !editLastName)}
                                                        >
                                                            <Check className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => setIsEditing(true)} className="text-sm font-medium text-brand-600 hover:text-brand-500">
                                                        Editar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-6 py-5">
                                        <dl className="space-y-4">
                                            {/* SECCIÓN DE NOMBRE */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
                                                <dt className="text-sm font-medium text-slate-500 pt-2">Nombre completo</dt>
                                                <dd className="col-span-1 md:col-span-2">
                                                    {loadingAuth ? <div className="h-4 bg-slate-200 rounded animate-pulse w-32"></div> :
                                                        authProvider === 'email' ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                                                                    <input
                                                                        type="text"
                                                                        value={isEditing ? editFirstName : userFullName.split(' ')[0] || ''}
                                                                        onChange={(e) => setEditFirstName(e.target.value)}
                                                                        disabled={!isEditing}
                                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Apellido</label>
                                                                    <input
                                                                        type="text"
                                                                        value={isEditing ? editLastName : userFullName.split(' ').slice(1).join(' ')}
                                                                        onChange={(e) => setEditLastName(e.target.value)}
                                                                        disabled={!isEditing}
                                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    value={userFullName}
                                                                    disabled
                                                                    className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500 outline-none"
                                                                />
                                                                <p className="text-xs text-slate-500 mt-1">Este campo se gestiona desde tu cuenta de Google.</p>
                                                            </div>
                                                        )
                                                    }
                                                </dd>
                                            </div>

                                            {/* CORREO */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                                <dt className="text-sm font-medium text-slate-500">Correo Electrónico</dt>
                                                <dd className="text-sm text-slate-900 col-span-1 md:col-span-2">
                                                    {loadingAuth ? <div className="h-4 bg-slate-200 rounded animate-pulse w-48"></div> : userEmail}
                                                </dd>
                                            </div>

                                            {/* TELÉFONO */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                                <dt className="text-sm font-medium text-slate-500">Número de Teléfono</dt>
                                                <dd className="col-span-1 md:col-span-2">
                                                    {loadingAuth ? <div className="h-4 bg-slate-200 rounded animate-pulse w-32"></div> :
                                                        isEditing ? (
                                                            <input
                                                                type="tel"
                                                                value={editPhone}
                                                                onChange={(e) => setEditPhone(e.target.value)}
                                                                placeholder="+504 0000-0000"
                                                                className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                                                            />
                                                        ) : (
                                                            <span className="text-sm text-slate-900">{userPhone || 'No registrado'}</span>
                                                        )
                                                    }
                                                </dd>
                                            </div>

                                            {/* ROL */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                                <dt className="text-sm font-medium text-slate-500">Rol en el Sistema</dt>
                                                <dd className="col-span-1 md:col-span-2">
                                                    {loadingAuth ? <div className="h-6 bg-slate-200 rounded-full animate-pulse w-24"></div> :
                                                        <span className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-700/10">
                                                            {roleTextMapping[userRole] || userRole}
                                                        </span>
                                                    }
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : activeTab === 'security' ? (
                        <div className="flex flex-col gap-6">
                            {authProvider === 'email' && <PasswordChange />}
                            <MfaSettings />
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
                            <div className="px-6 py-5 border-b border-slate-100">
                                <h3 className="text-base font-semibold leading-6 text-slate-900">Notificaciones Push</h3>
                            </div>
                            <div className="px-6 py-6 space-y-4">
                                <p className="text-sm text-slate-650 leading-relaxed">
                                    Recibe alertas instantáneas en este dispositivo (computadora o celular) sobre órdenes de trabajo asignadas, actualizaciones de estado y vencimientos de alquileres.
                                </p>
                                
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de Suscripción</p>
                                        <p className="text-sm font-semibold text-slate-700">
                                            {subStatus === 'cargando' && 'Verificando estado...'}
                                            {subStatus === 'suscrito' && '✅ Suscripción Activa en este dispositivo'}
                                            {subStatus === 'no_suscrito' && '❌ Desactivado / Sin permisos'}
                                            {subStatus === 'bloqueado' && '🚫 Notificaciones Bloqueadas en tu navegador'}
                                        </p>
                                        <p className="text-xs text-slate-450 mt-1 leading-normal">
                                            {subStatus === 'suscrito' && 'Estás listo para recibir alertas en tiempo real.'}
                                            {subStatus === 'no_suscrito' && 'Haz clic en el botón de la derecha para solicitar el permiso.'}
                                            {subStatus === 'bloqueado' && 'Por favor, haz clic en el ícono de candado junto a la URL en la barra de direcciones de tu navegador y cambia el permiso de Notificaciones a "Permitir".'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            disabled={subStatus === 'suscrito' || subStatus === 'cargando'}
                                            onClick={async () => {
                                                toast.dismiss();
                                                toast.loading('Iniciando proceso de notificación...');
                                                console.log('[ONESIGNAL] Botón presionado.');
                                                
                                                if (typeof window !== 'undefined' && window.OneSignal) {
                                                    window.OneSignal.push(async () => {
                                                        try {
                                                            console.log('[ONESIGNAL] Pushed onClick handler to queue.');
                                                            localStorage.removeItem('onesignal_banner_dismissed');
                                                            
                                                            toast.loading('Solicitando permisos al navegador...');
                                                            
                                                            let subId = window.OneSignal.User?.PushSubscription?.id;

                                                            if (!subId) {
                                                                subId = await new Promise<string | null>((resolve) => {
                                                                    let resolved = false;
                                                                    console.log('[ONESIGNAL] Promise started. Initial ID:', window.OneSignal.User?.PushSubscription?.id);

                                                                    const cleanup = () => {
                                                                        resolved = true;
                                                                        if (window.OneSignal.User?.PushSubscription?.removeEventListener) {
                                                                            window.OneSignal.User.PushSubscription.removeEventListener('change', subChangeHandler);
                                                                        }
                                                                        clearTimeout(timeoutId);
                                                                    };

                                                                    const subChangeHandler = (event: any) => {
                                                                        console.log('[ONESIGNAL] subChangeHandler received event:', event);
                                                                        const currentId = event?.current?.id || (typeof event === 'string' ? event : null);
                                                                        console.log('[ONESIGNAL] currentId calculated:', currentId);
                                                                        if (currentId && !resolved) {
                                                                            console.log('[ONESIGNAL] Resolving promise in change handler with:', currentId);
                                                                            cleanup();
                                                                            resolve(currentId);
                                                                        }
                                                                    };

                                                                    if (window.OneSignal.User?.PushSubscription?.addEventListener) {
                                                                        console.log('[ONESIGNAL] Registering change event listener.');
                                                                        window.OneSignal.User.PushSubscription.addEventListener('change', subChangeHandler);
                                                                    }

                                                                    const timeoutId = setTimeout(() => {
                                                                        if (!resolved) {
                                                                            console.log('[ONESIGNAL] Timeout triggered. Resolving with current ID:', window.OneSignal.User?.PushSubscription?.id);
                                                                            cleanup();
                                                                            resolve(window.OneSignal.User?.PushSubscription?.id || null);
                                                                        }
                                                                    }, 12000);

                                                                    // Trigger prompt
                                                                    (async () => {
                                                                        try {
                                                                            console.log('[ONESIGNAL] Triggering browser permission prompt...');
                                                                            if (window.OneSignal.Notifications?.requestPermission) {
                                                                                const r = await window.OneSignal.Notifications.requestPermission();
                                                                                console.log('[ONESIGNAL] requestPermission resolved. Result:', r);
                                                                            } else if (window.OneSignal.registerForPushNotifications) {
                                                                                await window.OneSignal.registerForPushNotifications();
                                                                                console.log('[ONESIGNAL] registerForPushNotifications resolved.');
                                                                            }
                                                                        } catch (e) {
                                                                            console.error('[ONESIGNAL] Error prompting in profile page:', e);
                                                                            cleanup();
                                                                            resolve(null);
                                                                        }
                                                                    })();
                                                                });
                                                            } else {
                                                                if (window.OneSignal.Notifications?.requestPermission) {
                                                                    await window.OneSignal.Notifications.requestPermission();
                                                                } else if (window.OneSignal.registerForPushNotifications) {
                                                                    await window.OneSignal.registerForPushNotifications();
                                                                }
                                                            }
                                                            
                                                            toast.dismiss();
                                                            console.log('[ONESIGNAL] Subscription ID:', subId);
                                                            
                                                            if (subId) {
                                                                toast.loading('Sincronizando suscripción con base de datos...');
                                                                const supabase = createClient();
                                                                const { data: { user } } = await supabase.auth.getUser();
                                                                if (user && user.email) {
                                                                    const dbData = await getUserProfileData(user.email);
                                                                    if (dbData) {
                                                                        await window.OneSignal.login(dbData.id);
                                                                        const res = await registerOneSignalSubscription(subId);
                                                                        if (res.success) {
                                                                            setSubStatus('suscrito');
                                                                            toast.success('¡Notificaciones push activadas exitosamente!');
                                                                        } else {
                                                                            toast.error('Error al registrar la suscripción en base de datos.');
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                console.warn('[ONESIGNAL] Subscription ID was not generated.');
                                                                toast.error('No se pudo generar el ID de suscripción.');
                                                                (window as any).showOneSignalBanner?.();
                                                            }
                                                        } catch (err: any) {
                                                            console.error('[ONESIGNAL] Error caught in push handler:', err);
                                                            toast.dismiss();
                                                            toast.error(`Error: ${err.message || err}`);
                                                        }
                                                    });
                                                } else {
                                                    toast.dismiss();
                                                    toast.error('El servicio de OneSignal no está cargado.');
                                                }
                                            }}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                                                subStatus === 'suscrito' 
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed shadow-none' 
                                                    : subStatus === 'cargando'
                                                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-wait shadow-none'
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 cursor-pointer'
                                            }`}
                                        >
                                            {subStatus === 'suscrito' ? 'Ya Activo' : 'Activar en este Dispositivo'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
