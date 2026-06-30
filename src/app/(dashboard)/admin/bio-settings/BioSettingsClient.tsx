'use client';

import React, { useState, useRef } from 'react';
import { saveBioSettings } from './actions';
import QRCode from 'react-qr-code';
import { 
    Phone, Mail, MapPin, Globe, Facebook, Instagram, Video, 
    Link2, Plus, Trash2, ArrowUp, ArrowDown, Save, Upload, 
    Loader2, Check, Download, ExternalLink, QrCode, Smartphone,
    ChevronRight, ShoppingBag, HeartPulse
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Map icon strings to Lucide components for custom links
const ICON_OPTIONS = [
    { value: 'shopping-bag', label: 'Bolsa de Compras', icon: Globe },
    { value: 'message-circle', label: 'Mensaje / Chat', icon: Phone },
    { value: 'wrench', label: 'Técnico / Servicio', icon: Globe },
    { value: 'info', label: 'Información', icon: Globe },
    { value: 'file-text', label: 'Documento / Archivo', icon: Globe },
    { value: 'globe', label: 'Sitio Web', icon: Globe },
    { value: 'calendar', label: 'Calendario / Citas', icon: Globe },
];

export default function BioSettingsClient({ initialSettings }: { initialSettings: any }) {
    const [settings, setSettings] = useState(initialSettings);
    const [activeTab, setActiveTab] = useState<'general' | 'social' | 'links' | 'qr'>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);

    // Form Handlers
    const handleChange = (key: string, value: any) => {
        setSettings((prev: any) => ({
            ...prev,
            [key]: value
        }));
    };

    const handleCustomLinkChange = (index: number, key: string, value: string) => {
        setSettings((prev: any) => {
            const updatedLinks = [...prev.customLinks];
            updatedLinks[index] = { ...updatedLinks[index], [key]: value };
            return { ...prev, customLinks: updatedLinks };
        });
    };

    const addCustomLink = () => {
        setSettings((prev: any) => ({
            ...prev,
            customLinks: [
                ...prev.customLinks,
                { label: 'Nuevo Enlace', url: 'https://', icon: 'globe' }
            ]
        }));
    };

    const removeCustomLink = (index: number) => {
        setSettings((prev: any) => {
            const updatedLinks = prev.customLinks.filter((_: any, i: number) => i !== index);
            return { ...prev, customLinks: updatedLinks };
        });
    };

    const moveCustomLink = (index: number, direction: 'up' | 'down') => {
        setSettings((prev: any) => {
            const updatedLinks = [...prev.customLinks];
            if (direction === 'up' && index > 0) {
                const temp = updatedLinks[index];
                updatedLinks[index] = updatedLinks[index - 1];
                updatedLinks[index - 1] = temp;
            } else if (direction === 'down' && index < updatedLinks.length - 1) {
                const temp = updatedLinks[index];
                updatedLinks[index] = updatedLinks[index + 1];
                updatedLinks[index + 1] = temp;
            }
            return { ...prev, customLinks: updatedLinks };
        });
    };

    // Avatar Upload Handler
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // 1. Get presigned upload URL
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, contentType: file.type })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // 2. Put file to R2
            const uploadRes = await fetch(data.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!uploadRes.ok) throw new Error('Error al subir imagen al servidor S3');

            // 3. Update state
            handleChange('avatarUrl', data.publicUrl);
            toast.success('Imagen cargada correctamente');
        } catch (err: any) {
            toast.error(err.message || 'Error al subir imagen');
        } finally {
            setIsUploading(false);
        }
    };

    // Save configuration
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await saveBioSettings(settings);
            if (res.success) {
                toast.success('Configuración guardada correctamente');
            } else {
                throw new Error(res.error);
            }
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    // Download QR Code as PNG
    const downloadQR = () => {
        if (!qrRef.current) return;
        const svg = qrRef.current.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;
            const context = canvas.getContext('2d');
            if (context) {
                // Background white
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, 1000, 1000);
                context.drawImage(image, 50, 50, 900, 900);

                const pngURL = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = pngURL;
                downloadLink.download = 'QR_Bio_Bioelectronica.png';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
        };
        image.src = blobURL;
    };

    // Get live bio URL
    const getBioUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/bio`;
        }
        return 'https://bioelectronicahn.com/bio';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <Toaster position="bottom-right" />

            {/* Left Panel: Forms & Editing */}
            <div className="lg:col-span-7 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
                {/* Editor Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'general'
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                        }`}
                    >
                        Info General
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('social')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'social'
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                        }`}
                    >
                        Redes Sociales
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('links')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'links'
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                        }`}
                    >
                        Enlaces Extra
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('qr')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'qr'
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                        }`}
                    >
                        Código QR
                    </button>
                </div>

                <div className="p-6 flex-1 min-h-[380px]">
                    {/* Tab: General Info */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm mb-3">Información de Perfil</h3>
                            
                            {/* Avatar Picker */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={settings.avatarUrl || '/landing/bio-avatar.png'}
                                    alt="Avatar"
                                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 bg-white"
                                />
                                <div className="space-y-1.5">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-colors disabled:opacity-50"
                                    >
                                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                        <span>Subir Avatar</span>
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                    />
                                    <p className="text-[10px] text-slate-400">Recomendado: Imagen cuadrada de 300x300px o logotipo circular.</p>
                                </div>
                            </div>

                            {/* Avatar URL Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">URL de Imagen Alternativa</label>
                                <input
                                    type="text"
                                    value={settings.avatarUrl || ''}
                                    onChange={(e) => handleChange('avatarUrl', e.target.value)}
                                    placeholder="https://url-de-tu-imagen.com"
                                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Título del Bio</label>
                                    <input
                                        type="text"
                                        value={settings.title || ''}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="Ej: Bioelectrónica Honduras"
                                        className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Subtítulo / Bio</label>
                                    <input
                                        type="text"
                                        value={settings.subtitle || ''}
                                        onChange={(e) => handleChange('subtitle', e.target.value)}
                                        placeholder="Ej: Ingeniería clínica y servicio de reparación"
                                        className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Ubicación Física</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={settings.location || ''}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                        placeholder="Tegucigalpa, Francisco Morazán, Honduras"
                                        className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Teléfono Directo</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={settings.phone || ''}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            placeholder="+504 9900-0000"
                                            className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Correo de Contacto</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                                        <input
                                            type="email"
                                            value={settings.email || ''}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            placeholder="soporte@bioelectronicahn.com"
                                            className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Social Links */}
                    {activeTab === 'social' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm mb-3">Canales de Redes Sociales</h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">WhatsApp (Número limpio sin el + ni espacios)</label>
                                <div className="relative flex">
                                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold">+</span>
                                    <input
                                        type="text"
                                        value={settings.whatsapp || ''}
                                        onChange={(e) => handleChange('whatsapp', e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="50499000000"
                                        className="flex-1 text-xs font-semibold px-4 py-3 rounded-r-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Página de Facebook</label>
                                    <input
                                        type="text"
                                        value={settings.facebook || ''}
                                        onChange={(e) => handleChange('facebook', e.target.value)}
                                        placeholder="https://facebook.com/pagina"
                                        className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Cuenta de Instagram</label>
                                    <input
                                        type="text"
                                        value={settings.instagram || ''}
                                        onChange={(e) => handleChange('instagram', e.target.value)}
                                        placeholder="https://instagram.com/usuario"
                                        className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Canal de TikTok</label>
                                    <input
                                        type="text"
                                        value={settings.tiktok || ''}
                                        onChange={(e) => handleChange('tiktok', e.target.value)}
                                        placeholder="https://tiktok.com/@usuario"
                                        className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Sitio Web Oficial</label>
                                    <input
                                        type="text"
                                        value={settings.website || ''}
                                        onChange={(e) => handleChange('website', e.target.value)}
                                        placeholder="https://bioelectronicahn.com"
                                        className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Catálogo Digital de Equipos</label>
                                <input
                                    type="text"
                                    value={settings.catalog || ''}
                                    onChange={(e) => handleChange('catalog', e.target.value)}
                                    placeholder="https://bioelectronicahn.com/landing/productos"
                                    className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab: Custom Extra Links */}
                    {activeTab === 'links' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-sm">Enlaces Destacados Adicionales</h3>
                                <button
                                    type="button"
                                    onClick={addCustomLink}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 border border-brand-100 hover:bg-brand-100 text-brand-600 text-xs font-bold rounded-xl transition-all"
                                >
                                    <Plus size={14} />
                                    <span>Agregar Enlace</span>
                                </button>
                            </div>

                            {settings.customLinks.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                    <Link2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-slate-400">No hay enlaces adicionales creados.</p>
                                    <button type="button" onClick={addCustomLink} className="text-xs font-bold text-indigo-600 hover:underline mt-1.5">Crea uno ahora</button>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                    {settings.customLinks.map((link: any, index: number) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative group flex flex-col gap-3">
                                            
                                            {/* Reorder and Delete Row */}
                                            <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enlace #{index + 1}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveCustomLink(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveCustomLink(index, 'down')}
                                                        disabled={index === settings.customLinks.length - 1}
                                                        className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCustomLink(index)}
                                                        className="p-1 hover:bg-red-50 text-red-500 rounded ml-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inputs Row */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Etiqueta del Botón</label>
                                                    <input
                                                        type="text"
                                                        value={link.label}
                                                        onChange={(e) => handleCustomLinkChange(index, 'label', e.target.value)}
                                                        placeholder="Ej: Ver Ofertas Técnicas"
                                                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">URL de Destino</label>
                                                    <input
                                                        type="text"
                                                        value={link.url}
                                                        onChange={(e) => handleCustomLinkChange(index, 'url', e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Icon Select */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Ícono del Botón</label>
                                                <select
                                                    value={link.icon || 'globe'}
                                                    onChange={(e) => handleCustomLinkChange(index, 'icon', e.target.value)}
                                                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:outline-none bg-white"
                                                >
                                                    {ICON_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: QR Code Generation */}
                    {activeTab === 'qr' && (
                        <div className="space-y-4 text-center py-4">
                            <h3 className="font-bold text-slate-800 text-sm text-left">Código QR del Enlace</h3>
                            <p className="text-xs text-slate-400 text-left">
                                Descarga este código QR de alta resolución. Puedes insertarlo directamente en tus volantes físicos, brochures, tarjetas de presentación o pegatinas en equipos.
                            </p>

                            <div className="flex flex-col items-center gap-4 mt-6">
                                <div ref={qrRef} className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-md inline-block">
                                    <QRCode 
                                        value={getBioUrl()}
                                        size={200}
                                        level="H" // High correction capability
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-mono font-bold text-slate-700">{getBioUrl()}</p>
                                    <p className="text-[10px] text-slate-400">Escaneado: Redirige automáticamente a tu página optimizada.</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={downloadQR}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                                >
                                    <Download size={14} />
                                    <span>Descargar QR (PNG)</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Save Row */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <a
                        href="/bio"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
                    >
                        <ExternalLink size={14} />
                        <span>Ver Sitio en Vivo</span>
                    </a>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </button>
                </div>
            </div>

            {/* Right Panel: Live Mobile Mockup */}
            <div className="lg:col-span-5 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-3 text-slate-500 font-bold text-xs">
                    <Smartphone size={16} />
                    <span>Vista Previa Móvil (En Vivo)</span>
                </div>

                {/* iPhone Frame */}
                <div className="w-[310px] h-[610px] rounded-[42px] border-[10px] border-slate-900 shadow-2xl bg-[#090B1A] relative overflow-hidden flex flex-col select-none ring-4 ring-slate-900/5 select-none">
                    
                    {/* Speaker Camera Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-28 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center gap-1">
                        <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
                        <div className="w-2 h-2 bg-slate-950 rounded-full"></div>
                    </div>

                    {/* App / Website viewport */}
                    <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative select-none scrollbar-none bg-white">
                        
                        {/* 1. Header with Gradient Background & Top Bar */}
                        <div className="h-28 bg-gradient-to-tr from-[#3b82f6] via-[#8b5cf6] to-[#ec4899] relative shrink-0 flex flex-col justify-start">
                            <div className="absolute inset-0 bg-black/10"></div>
                            
                            {/* Navigation Top Bar (Miniature) */}
                            <div className="w-full flex items-center justify-between px-4 pt-3.5 relative z-20">
                                <div className="flex items-center gap-1 text-white">
                                    <HeartPulse size={12} className="text-white animate-pulse" />
                                    <span className="text-[9px] font-black tracking-tight uppercase">Bioelectrónica</span>
                                </div>
                                <button className="text-white">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* 2. Main Content Body overlapping the header with curved arch */}
                        <div 
                            style={{ borderTopLeftRadius: '50% 20px', borderTopRightRadius: '50% 20px' }}
                            className="flex-1 bg-white mt-[-20px] relative z-10 px-4 pt-10 pb-8 flex flex-col items-center"
                        >
                            
                            {/* Avatar positioned absolutely at the overlap */}
                            <div className="absolute top-[-36px] left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-md bg-white shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={settings.avatarUrl || '/landing/bio-avatar.png'}
                                    alt="Logo"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Title and Subtitle */}
                            <h2 className="text-sm font-black text-slate-800 tracking-tight text-center leading-tight">
                                {settings.title || 'Bioelectrónica Honduras'}
                            </h2>
                            <p className="text-[10px] text-slate-500 mt-1.5 text-center leading-relaxed max-w-[200px]">
                                {settings.subtitle || 'Servicio Técnico y Venta de Equipo Médico Profesional'}
                            </p>

                            {settings.location && (
                                <div className="inline-flex items-center gap-0.5 text-[8px] font-black text-slate-600 bg-slate-100 border border-slate-200/50 rounded-full px-2 py-0.5 mt-2">
                                    <MapPin size={9} className="text-brand-500" />
                                    <span className="truncate max-w-[150px]">{settings.location.split(',')[0]}</span>
                                </div>
                            )}

                            {/* Social Icons row (Black circular icons as in mockup) */}
                            <div className="flex justify-center gap-2.5 my-4 shrink-0">
                                {settings.whatsapp && (
                                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm">
                                        <Phone size={12} className="text-green-400" />
                                    </div>
                                )}
                                {settings.facebook && (
                                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm">
                                        <Facebook size={12} className="text-blue-400" />
                                    </div>
                                )}
                                {settings.instagram && (
                                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm">
                                        <Instagram size={12} className="text-pink-400" />
                                    </div>
                                )}
                                {settings.tiktok && (
                                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm">
                                        <Video size={12} className="text-purple-400" />
                                    </div>
                                )}
                                {settings.website && (
                                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm">
                                        <Globe size={12} className="text-brand-400" />
                                    </div>
                                )}
                            </div>

                            {/* Map Preview in Phone View */}
                            {settings.location && (
                                <div className="w-full bg-slate-50 border border-slate-200/80 rounded-[20px] p-2 flex flex-col gap-1.5 mt-2 mb-4 text-left">
                                    <div className="h-16 bg-[#cbd5e1]/45 rounded-[14px] relative overflow-hidden flex items-center justify-center">
                                        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:10px_10px]"></div>
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 animate-bounce relative z-10 shadow-sm">
                                            <MapPin size={10} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Dirección Física</p>
                                            <p className="text-[9px] font-bold text-slate-700 truncate pr-2">{settings.location}</p>
                                        </div>
                                        <span className="text-[8px] font-bold text-indigo-600 shrink-0">Ver Mapa</span>
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="h-px bg-slate-100 w-full mb-4 shrink-0"></div>

                            {/* Links List */}
                            <div className="w-full flex flex-col gap-2.5 px-1 flex-1">
                                {/* Static/Important Catalog Link first */}
                                {settings.catalog && (
                                    <div className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-black text-[10px] tracking-wide shadow-sm flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 truncate">
                                            <ShoppingBag size={12} className="text-white shrink-0" />
                                            <span className="truncate">🛒 Catálogo de Equipos</span>
                                        </span>
                                        <ChevronRight size={10} className="text-white/80" />
                                    </div>
                                )}

                                {/* Custom links loop */}
                                {settings.customLinks.map((link: any, i: number) => {
                                    return (
                                        <div
                                            key={i}
                                            className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-slate-900 to-black text-white font-bold text-[10px] tracking-wide shadow-sm flex items-center justify-between"
                                        >
                                            <span className="truncate pr-2">{link.label || 'Enlace adicional'}</span>
                                            <ChevronRight size={10} className="text-slate-400 shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bottom Link Badge matching mockup style */}
                            <div className="mt-8 z-10 shrink-0 flex flex-col items-center gap-1">
                                <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200 shadow-sm rounded-full text-[8px] font-black text-slate-800 tracking-wide">
                                    <span>bioelectronicahn.com/bio</span>
                                    <ChevronRight size={8} className="text-slate-500 rotate-[-45deg]" />
                                </div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Escanea para ingresar</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
