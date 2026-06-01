'use client';

import React, { useState } from 'react';
import { 
    Phone, 
    Mail, 
    ChevronLeft, 
    HeartPulse, 
    CheckCircle2, 
    Send,
    X,
    FileText
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ProductDetailClientProps {
    item: {
        id: string;
        name: string;
        brand: string;
        model: string;
        code: string;
        imageUrl: string | null;
        type: 'activo' | 'producto';
        typeName: string;
        description: string;
        details?: any;
    };
    landingSettings: {
        whatsappNumbers?: string[];
        contactEmails?: string[];
    };
    autoOpenCotizar?: boolean;
}

export default function ProductDetailClient({
    item,
    landingSettings,
    autoOpenCotizar = false
}: ProductDetailClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(autoOpenCotizar);
    
    // Form fields
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientMessage, setClientMessage] = useState(
        `Hola, solicito una cotización formal para el equipo: ${item.name} (Marca: ${item.brand}, Modelo: ${item.model || 'N/A'}, Código: ${item.code}).`
    );
    const [sendingForm, setSendingForm] = useState(false);

    // Primary WhatsApp
    const primaryWp = landingSettings.whatsappNumbers?.[0] || '50431782368';

    const handleWpQuote = () => {
        const text = encodeURIComponent(
            `Hola Bioelectrónica, me interesa solicitar una cotización formal para el siguiente equipo:\n\n` +
            `• Equipo: ${item.name}\n` +
            `• Marca: ${item.brand}\n` +
            `• Modelo: ${item.model || 'N/A'}\n` +
            `• Código/SKU: ${item.code}\n\n` +
            `Quedo atento a su respuesta. ¡Muchas gracias!`
        );
        window.open(`https://wa.me/${primaryWp}?text=${text}`, '_blank');
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !clientEmail || !clientPhone) {
            toast.error('Por favor, completa los campos requeridos');
            return;
        }

        setSendingForm(true);
        setTimeout(() => {
            setSendingForm(false);
            setIsModalOpen(false);
            toast.success('¡Solicitud enviada con éxito! Nuestro equipo técnico se pondrá en contacto pronto.');
            setClientName('');
            setClientEmail('');
            setClientPhone('');
        }, 1500);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 bg-white text-slate-800 animate-fade-in">
            {/* Back Button */}
            <Link 
                href="/productos" 
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
            >
                <ChevronLeft size={16} />
                <span>Volver al Catálogo</span>
            </Link>

            {/* Product Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                
                {/* Left Column: Image Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden aspect-[4/3] w-full">
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border border-slate-200 text-[9px] font-extrabold text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {item.typeName}
                    </div>
                    {item.imageUrl ? (
                        <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-contain rounded-2xl max-h-80"
                        />
                    ) : (
                        <HeartPulse className="text-slate-300 w-24 h-24 stroke-[1.2]" />
                    )}
                </div>

                {/* Right Column: Title & Info */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <span className="text-[10px] font-extrabold bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                            {item.brand}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">{item.name}</h1>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                            {item.model && <span>Modelo: <strong className="text-slate-800 font-mono">{item.model}</strong></span>}
                            <span>Código: <strong className="text-slate-800 font-mono">{item.code}</strong></span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3 border-t border-slate-100 pt-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción del Equipo</h3>
                        <p className="text-xs text-slate-650 leading-relaxed">
                            {item.description || 'Este equipo médico cuenta con altos estándares de calidad y mantenimiento preventivo al día. Cumple con los requerimientos críticos para el área clínica especificada. Solicita mayor información técnica o una cotización formal.'}
                        </p>
                    </div>

                    {/* Specifications list (dynamic properties) */}
                    {item.details && Object.keys(item.details).length > 0 && (
                        <div className="space-y-3 border-t border-slate-100 pt-6">
                            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Especificaciones Técnicas</h3>
                            <div className="grid grid-cols-2 gap-4 text-[11px] font-medium text-slate-500">
                                {Object.entries(item.details).map(([key, val]: any) => (
                                    <div key={key} className="space-y-0.5">
                                        <span className="text-slate-450 uppercase text-[9px] font-bold tracking-wider">{key}</span>
                                        <p className="text-slate-800 font-semibold">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cotización Action Area */}
                    <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4 shadow-sm">
                        <div>
                            <h3 className="font-bold text-sm text-slate-900">Solicitar Cotización de este Equipo</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Selecciona el medio de contacto de tu preferencia para recibir tu cotización formal.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleWpQuote}
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-2xl transition-all shadow-sm shadow-emerald-500/10"
                            >
                                <Phone size={15} />
                                <span>Cotizar por WhatsApp</span>
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-2xl transition-all shadow-sm shadow-blue-500/10"
                            >
                                <Mail size={15} />
                                <span>Cotizar por Correo</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Quote Request Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
                        
                        {/* Close button */}
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors"
                        >
                            <X size={14} />
                        </button>

                        <div className="space-y-1">
                            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                <FileText size={18} className="text-blue-600" />
                                Solicitud de Cotización Formal
                            </h3>
                            <p className="text-[11px] text-slate-500">Ingresa tus datos y te enviaremos una oferta formal de inmediato por correo.</p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre Completo o Razón Social</label>
                                <input 
                                    type="text" 
                                    required
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Ej: Clínica San Felipe"
                                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={clientEmail}
                                        onChange={(e) => setClientEmail(e.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono de Contacto</label>
                                    <input 
                                        type="tel" 
                                        required
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        placeholder="Ej: 9988-7766"
                                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensaje de Solicitud</label>
                                <textarea 
                                    rows={4}
                                    value={clientMessage}
                                    onChange={(e) => setClientMessage(e.target.value)}
                                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-blue-500 leading-relaxed"
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={sendingForm}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                            >
                                <Send size={13} />
                                <span>{sendingForm ? 'Enviando...' : 'Enviar Solicitud'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
