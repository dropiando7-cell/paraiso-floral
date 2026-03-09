'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { updatePreferences } from './actions';
import { getUserPreferencesData } from './data';
import { Settings, Globe, LayoutDashboard, Palette, Check, Loader2 } from 'lucide-react';

const allAvailableModules = [
    { id: '/', name: 'Portal Principal (Por defecto)' },
    { id: '/checkin', name: 'Check-in Kids' },
    { id: '/medico', name: 'Asistencia Médica' },
    { id: '/inventario', name: 'Inventario de Activos' },
    { id: '/conciliacion', name: 'Conciliación Bancaria' },
    { id: '/boveda', name: 'Bóveda de Contraseñas' },
    { id: '/calendario', name: 'Calendario Centralizado' }
];

const timezones = [
    { id: 'America/Tegucigalpa', name: 'Honduras (America/Tegucigalpa)' },
    { id: 'America/Mexico_City', name: 'México Central (America/Mexico_City)' },
    { id: 'America/Bogota', name: 'Colombia (America/Bogota)' },
    { id: 'America/New_York', name: 'Este de EE.UU. (America/New_York)' },
    { id: 'UTC', name: 'Tiempo Universal Coordinado (UTC)' }
];

export default function ConfiguracionPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [filteredModules, setFilteredModules] = useState(allAvailableModules);

    const [preferences, setPreferences] = useState({
        defaultModule: '/',
        timezone: 'America/Tegucigalpa',
        theme: 'system'
    });

    useEffect(() => {
        const loadPreferences = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user?.email) {
                const dbData = await getUserPreferencesData(user.email);
                if (dbData) {
                    const data = dbData as any;
                    setPreferences({
                        defaultModule: data.defaultModule || '/',
                        timezone: data.timezone || 'America/Tegucigalpa',
                        theme: data.theme || 'system'
                    });

                    // Filter modules based on user access
                    if (dbData.role === 'SUPER_ADMIN') {
                        setFilteredModules(allAvailableModules);
                    } else {
                        const accessibleRoutes = dbData.accessibleModules || [];
                        const filtered = allAvailableModules.filter(
                            mod => accessibleRoutes.includes(mod.id)
                        );
                        // If they have no accessible modules but somehow logged in, at least show checkin or something, or just leave it empty.
                        // Based on user request "solo debes mostrar los modulos a los que tiene acceso".

                        // Si la lista filtrada no incluye el defaultModule actual, lo actualizamos al primero que tenga acceso
                        if (filtered.length > 0 && !filtered.some(m => m.id === (dbData as any).defaultModule)) {
                            setPreferences(prev => ({ ...prev, defaultModule: filtered[0].id }));
                        }

                        setFilteredModules(filtered);
                    }
                }
            }
            setIsLoading(false);
        };
        loadPreferences();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        const res = await updatePreferences({
            defaultModule: preferences.defaultModule === '/' ? null : preferences.defaultModule,
            timezone: preferences.timezone,
            theme: preferences.theme
        });

        setIsSaving(false);

        if (res.success) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } else {
            alert(res.error || 'Error al guardar las preferencias');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración de Cuenta</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Personaliza cómo se comporta la plataforma para ti.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column - Navigation */}
                <div className="md:col-span-1 space-y-1">
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors text-brand-600 bg-brand-50">
                        Preferencias Generales
                    </button>
                    {/* Placeholder for future sections like Notifications, Integrations */}
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed rounded-xl transition-colors" disabled>
                        Notificaciones (Próximamente)
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed rounded-xl transition-colors" disabled>
                        Integraciones (Próximamente)
                    </button>
                </div>

                {/* Right Column - Content */}
                <div className="md:col-span-2 space-y-6">

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-slate-400" />
                            <h3 className="text-base font-semibold leading-6 text-slate-900">Preferencias Generales</h3>
                        </div>

                        <div className="px-6 py-5 space-y-6">

                            {/* Pantalla de Inicio */}
                            <div>
                                <label htmlFor="defaultModule" className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                    <LayoutDashboard className="w-4 h-4 text-slate-400" />
                                    Pantalla de Inicio
                                </label>
                                <p className="text-sm text-slate-500 mb-3">
                                    ¿A dónde quieres ir inmediatamente después de iniciar sesión?
                                </p>
                                {isLoading ? (
                                    <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full max-w-md"></div>
                                ) : (
                                    <select
                                        id="defaultModule"
                                        value={preferences.defaultModule}
                                        onChange={(e) => setPreferences({ ...preferences, defaultModule: e.target.value })}
                                        className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                    >
                                        {filteredModules.map(mod => (
                                            <option key={mod.id} value={mod.id}>{mod.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <hr className="border-slate-100" />

                            {/* Zona Horaria */}
                            <div>
                                <label htmlFor="timezone" className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    Zona Horaria
                                </label>
                                <p className="text-sm text-slate-500 mb-3">
                                    Ajuste de hora para registros, check-in y conciliaciones.
                                </p>
                                {isLoading ? (
                                    <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full max-w-md"></div>
                                ) : (
                                    <select
                                        id="timezone"
                                        value={preferences.timezone}
                                        onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                                        className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                    >
                                        {timezones.map(tz => (
                                            <option key={tz.id} value={tz.id}>{tz.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                        </div>

                        {/* Footer Action */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isLoading || isSaving}
                                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isSaving ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                ) : saveSuccess ? (
                                    <><Check className="w-4 h-4" /> Guardado exitosamente</>
                                ) : (
                                    'Guardar Preferencias'
                                )}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
