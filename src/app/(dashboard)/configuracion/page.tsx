'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { updatePreferences, getEmailTemplates, saveEmailTemplate, getCompanyProfile, saveCompanyProfile, uploadCompanyLogo } from './actions';
import { getUserPreferencesData } from './data';
import { Settings, Globe, LayoutDashboard, Palette, Check, Loader2, Mail, Save } from 'lucide-react';
import { EmailTemplateType } from '@prisma/client';

const allAvailableModules = [
    { id: '/', name: 'Portal Principal (Por defecto)' },
    { id: '/kanban', name: 'Proyectos & Kanban' },
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

    // Tab Navigation State
    const [activeTab, setActiveTab] = useState<'general' | 'company' | 'emails'>('general');
    
    // Whitelabel Company Profile
    const [companyProfile, setCompanyProfile] = useState({ name: '', direccion: '', telefono: '', correoContacto: '', rtn: '', logoUrl: '', qrPrefix: 'BEA' });
    const [isSavingCompany, setIsSavingCompany] = useState(false);
    const [saveCompanySuccess, setSaveCompanySuccess] = useState(false);

    const [filteredModules, setFilteredModules] = useState(allAvailableModules);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [preferences, setPreferences] = useState({
        defaultModule: '/',
        timezone: 'America/Tegucigalpa',
        theme: 'system',
        idleTimeoutEnabled: true
    });

    // Email Templates State
    const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
    const [activeEmailType, setActiveEmailType] = useState<EmailTemplateType>('CLASSIC_WELCOME');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [saveTemplateSuccess, setSaveTemplateSuccess] = useState(false);

    const [currentTemplateData, setCurrentTemplateData] = useState({
        subject: '',
        title: '',
        body: '',
        buttonText: '',
        isActive: true
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
                        theme: data.theme || 'system',
                        idleTimeoutEnabled: data.idleTimeoutEnabled ?? true
                    });

                    // Filter modules based on user access
                    setUserRole(dbData.role);
                    if (dbData.role === 'SUPER_ADMIN') {
                        setFilteredModules(allAvailableModules);

                        // Fetch Company Profile
                        const profile = await getCompanyProfile();
                        if (profile) setCompanyProfile(profile);

                        // Fetch Email Templates if Super Admin
                        const templates = await getEmailTemplates();
                        setEmailTemplates(templates);

                        // Load defaults for the initial view
                        const defaultClassic = templates.find((t: any) => t.type === 'CLASSIC_WELCOME');
                        if (defaultClassic) {
                            setCurrentTemplateData({
                                subject: defaultClassic.subject,
                                title: defaultClassic.title,
                                body: defaultClassic.body,
                                buttonText: defaultClassic.buttonText,
                                isActive: defaultClassic.isActive
                            });
                        } else {
                            // Fallback dummy structure if none exist yet
                            setCurrentTemplateData({
                                subject: '¡Bienvenido a Sistemas Elim!',
                                title: '¡Bienvenido a Sistemas Elim!',
                                body: 'Tu cuenta ha sido creada exitosamente. \\nTus credenciales son: \\nCorreo: {{email}} \\nContraseña Temporal: {{password}}',
                                buttonText: 'Iniciar Sesión Ahora',
                                isActive: true
                            });
                        }

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

    // Handle Template Type Switch
    const handleSwitchTemplateType = (type: EmailTemplateType) => {
        setActiveEmailType(type);
        const existing = emailTemplates.find(t => t.type === type);

        if (existing) {
            setCurrentTemplateData({
                subject: existing.subject,
                title: existing.title,
                body: existing.body,
                buttonText: existing.buttonText,
                isActive: existing.isActive
            });
        } else {
            // Defaults 
            if (type === 'CLASSIC_WELCOME') {
                setCurrentTemplateData({
                    subject: '¡Bienvenido a Sistemas Elim!',
                    title: '¡Bienvenido a Sistemas Elim!',
                    body: 'Tu cuenta ha sido creada exitosamente. \\nTus credenciales son: \\nCorreo: {{email}} \\nContraseña Temporal: {{password}}',
                    buttonText: 'Iniciar Sesión Ahora',
                    isActive: true
                });
            } else {
                setCurrentTemplateData({
                    subject: '¡Acceso Concedido a Sistemas Elim!',
                    title: '¡Acceso Concedido!',
                    body: 'Nos complace informarte que tu cuenta de Google Workspace ({{email}}) ha sido autorizada para ingresar a Sistemas Elim. \\n\\nYa puedes ingresar a la plataforma utilizando el botón de "Continuar con Google". No necesitas contraseña.',
                    buttonText: 'Entrar con Google Workspace',
                    isActive: true
                });
            }
        }
    };

    const handleSaveTemplate = async () => {
        setIsSavingTemplate(true);
        setSaveTemplateSuccess(false);

        const res = await saveEmailTemplate({
            type: activeEmailType,
            ...currentTemplateData
        });

        setIsSavingTemplate(false);

        if (res.success) {
            setSaveTemplateSuccess(true);

            // Refresh local state to ensure it switches correctly later
            const templates = await getEmailTemplates();
            setEmailTemplates(templates);

            setTimeout(() => setSaveTemplateSuccess(false), 3000);
        } else {
            alert(res?.error || 'Error al guardar la plantilla');
        }
    };

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        const res = await updatePreferences({
            defaultModule: preferences.defaultModule === '/' ? null : preferences.defaultModule,
            timezone: preferences.timezone,
            theme: preferences.theme,
            idleTimeoutEnabled: preferences.idleTimeoutEnabled
        });

        setIsSaving(false);

        if (res.success) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } else {
            alert(res.error || 'Error al guardar las preferencias');
        }
    };

    const handleSaveCompany = async () => {
        setIsSavingCompany(true);
        setSaveCompanySuccess(false);
        const res = await saveCompanyProfile(companyProfile);
        setIsSavingCompany(false);
        if (res.success) {
            setSaveCompanySuccess(true);
            setTimeout(() => setSaveCompanySuccess(false), 3000);
        } else {
            alert(res.error || 'Error al guardar perfil de empresa');
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsSavingCompany(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await uploadCompanyLogo(formData);
        setIsSavingCompany(false);
        
        if (res.success && res.url) {
            setCompanyProfile(prev => ({ ...prev, logoUrl: res.url! }));
            alert('Logo subido exitosamente.');
        } else {
            alert(res.error || 'Error al subir el logo');
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
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'general' ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Preferencias Generales
                    </button>
                    {userRole === 'SUPER_ADMIN' && (
                        <>
                            <button
                                onClick={() => setActiveTab('company')}
                                className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'company' ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Perfil de Empresa (Whitelabel)
                            </button>
                            <button
                                onClick={() => setActiveTab('emails')}
                                className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'emails' ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Plantillas de Correos (Admin)
                            </button>
                        </>
                    )}
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

                    {activeTab === 'general' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
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

                                {/* Modal de Inactividad */}
                                <div>
                                    <div className="flex items-center justify-between mb-1 max-w-md">
                                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Cierre por Inactividad
                                        </label>
                                        <button
                                            onClick={() => setPreferences({ ...preferences, idleTimeoutEnabled: !preferences.idleTimeoutEnabled })}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${preferences.idleTimeoutEnabled ? 'bg-brand-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.idleTimeoutEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3 max-w-md">
                                        Activa la ventana azul que avisa y cierra tu sesión tras un tiempo por seguridad. Si la desactivas, la sesión permanecerá abierta.
                                    </p>
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
                                    onClick={handleSaveGeneral}
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
                    )}

                    {activeTab === 'emails' && userRole === 'SUPER_ADMIN' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <h3 className="text-base font-semibold leading-6 text-slate-900">Plantillas de Bienvenida</h3>
                                        <p className="text-xs text-slate-500">Personaliza los correos automáticos.</p>
                                    </div>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleSwitchTemplateType('CLASSIC_WELCOME')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeEmailType === 'CLASSIC_WELCOME' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Correo Clásico
                                    </button>
                                    <button
                                        onClick={() => handleSwitchTemplateType('GOOGLE_WELCOME')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeEmailType === 'GOOGLE_WELCOME' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Google Workspace
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-5 space-y-4">

                                {isLoading ? (
                                    <div className="space-y-4">
                                        <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full"></div>
                                        <div className="h-32 bg-slate-100 rounded-lg animate-pulse w-full"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Status Toggle */}
                                        <div className="flex items-center justify-between bg-slate-50 p-3 flex-wrap gap-2 rounded-lg border border-slate-100 mb-2">
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">Estado de la Plantilla</span>
                                                <p className="text-xs text-slate-500">Si se desactiva, se enviará el diseño por defecto de código fuente.</p>
                                            </div>
                                            <button
                                                onClick={() => setCurrentTemplateData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${currentTemplateData.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${currentTemplateData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Asunto del Correo
                                                </label>
                                                <input
                                                    type="text"
                                                    value={currentTemplateData.subject}
                                                    onChange={(e) => setCurrentTemplateData(prev => ({ ...prev, subject: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Ej: ¡Bienvenido a Sistemas Elim!"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Título Principal (H1)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={currentTemplateData.title}
                                                    onChange={(e) => setCurrentTemplateData(prev => ({ ...prev, title: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Ej: ¡Acceso Concedido!"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                                                <span>Cuerpo del Mensaje</span>
                                                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex gap-2">
                                                    Variables permitidas:
                                                    <code className="font-mono font-bold">{"{{ firstName }}"}</code>
                                                    <code className="font-mono font-bold">{"{{ email }}"}</code>
                                                    {activeEmailType === 'CLASSIC_WELCOME' && <code className="font-mono font-bold">{"{{ password }}"}</code>}
                                                </span>
                                            </label>
                                            <textarea
                                                rows={5}
                                                value={currentTemplateData.body}
                                                onChange={(e) => setCurrentTemplateData(prev => ({ ...prev, body: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                                                placeholder={`Usa {{firstName}} para saludar al usuario. Puedes usar saltos de línea normales.`}
                                            />
                                            <p className="text-xs text-slate-500 mt-1.5">
                                                El bloque visual que muestra el Correo y <strong>Contraseña Temporal</strong> (o el aviso de no requerir contraseña en Google) se inyectará automáticamente debajo de este texto para mantener la seguridad y el formato en el diseño final.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Texto del Botón (Llamado a la acción)
                                            </label>
                                            <input
                                                type="text"
                                                value={currentTemplateData.buttonText}
                                                onChange={(e) => setCurrentTemplateData(prev => ({ ...prev, buttonText: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                placeholder="Ej: Entrar con Google Workspace"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer Action */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                                <button
                                    onClick={handleSaveTemplate}
                                    disabled={isLoading || isSavingTemplate}
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {isSavingTemplate ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                    ) : saveTemplateSuccess ? (
                                        <><Check className="w-4 h-4" /> Plantilla Guardada</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Guardar Plantilla</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'company' && userRole === 'SUPER_ADMIN' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-brand-500" />
                                <div>
                                    <h3 className="text-base font-semibold leading-6 text-slate-900">Perfil de Empresa (Whitelabel)</h3>
                                    <p className="text-xs text-slate-500">Estos datos aparecerán gráficamente en las cabeceras de facturas.</p>
                                </div>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial</label>
                                        <input type="text" value={companyProfile.name} onChange={e => setCompanyProfile({...companyProfile, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Ej. Bioelectrónica Honduras" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Prefijo de Etiquetas QR</label>
                                        <input type="text" maxLength={4} value={companyProfile.qrPrefix} onChange={e => setCompanyProfile({...companyProfile, qrPrefix: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none uppercase" placeholder="Ej: BEA, MED..." />
                                        <p className="text-[10px] text-slate-500 mt-1">De 3 a 4 letras. Define el prefijo de tus activos (ej. {companyProfile.qrPrefix || 'BEA'}-0001).</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">R.T.N. de la Empresa</label>
                                        <input type="text" value={companyProfile.rtn} onChange={e => setCompanyProfile({...companyProfile, rtn: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="08019003..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono Principal</label>
                                        <input type="text" value={companyProfile.telefono} onChange={e => setCompanyProfile({...companyProfile, telefono: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="+504 9999-9999" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                                    <input type="email" value={companyProfile.correoContacto} onChange={e => setCompanyProfile({...companyProfile, correoContacto: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="contacto@empresa.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Física</label>
                                    <textarea rows={2} value={companyProfile.direccion} onChange={e => setCompanyProfile({...companyProfile, direccion: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none" placeholder="Dirección física para encabezados de factura..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Logo de la Empresa</label>
                                    <div className="flex items-center gap-4">
                                        {companyProfile.logoUrl ? (
                                            <div className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg border border-slate-200 border-dashed bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                <Globe className="w-6 h-6 opacity-30" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm inline-block">
                                                    Subir Imagen (R2)
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isSavingCompany} />
                                                </label>
                                                {companyProfile.logoUrl && (
                                                    <button onClick={() => setCompanyProfile({...companyProfile, logoUrl: ''})} className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1.5 transition-colors">Quitar</button>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1.5">PNG, JPG o SVG (Max 2MB recomendado para facturas).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                                <button onClick={handleSaveCompany} disabled={isLoading || isSavingCompany} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all">
                                    {isSavingCompany ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : saveCompanySuccess ? <><Check className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> Guardar Perfil</>}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
