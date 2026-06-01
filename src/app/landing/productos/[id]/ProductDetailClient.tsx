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
import { sendQuoteEmailAction } from './actions';

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
        quoteWhatsappNumber?: string;
        quoteEmail?: string;
    };
    autoOpenCotizar?: boolean;
}

export default function ProductDetailClient({
    item,
    landingSettings,
    autoOpenCotizar = false
}: ProductDetailClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(autoOpenCotizar);
    const [modalView, setModalView] = useState<'select' | 'email'>('select');
    
    // Form fields
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientMessage, setClientMessage] = useState(
        `Hola, solicito una cotización formal para el equipo: ${item.name} (Marca: ${item.brand}, Modelo: ${item.model || 'N/A'}, Código: ${item.code}).`
    );
    const [sendingForm, setSendingForm] = useState(false);

    // Primary WhatsApp
    const primaryWp = landingSettings.quoteWhatsappNumber || landingSettings.whatsappNumbers?.[0] || '50431782368';

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalView('select');
    };

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

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !clientEmail || !clientPhone) {
            toast.error('Por favor, completa los campos requeridos');
            return;
        }

        setSendingForm(true);
        try {
            const res = await sendQuoteEmailAction({
                itemName: item.name,
                itemBrand: item.brand,
                itemModel: item.model || 'N/A',
                itemCode: item.code,
                clientName,
                clientEmail,
                clientPhone,
                clientMessage
            });
            
            if (res.success) {
                toast.success('¡Solicitud enviada con éxito! Nuestro equipo técnico se pondrá en contacto pronto.');
                setClientName('');
                setClientEmail('');
                setClientPhone('');
                handleCloseModal();
            } else {
                toast.error(res.error || 'Error al enviar la solicitud');
            }
        } catch (error: any) {
            toast.error('Ocurrió un error inesperado al enviar la solicitud');
        } finally {
            setSendingForm(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 bg-white text-slate-800 animate-fade-in">
            {/* Back Button */}
            <Link 
                href="/productos" 
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#00a8cc] transition-colors"
            >
                <ChevronLeft size={16} />
                <span>Volver al Catálogo</span>
            </Link>

            {/* Product Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                
                {/* Left Column: Image Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden aspect-[4/3] w-full">
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border border-slate-200 text-[9px] font-extrabold text-[#00a8cc] px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {item.typeName}
                    </div>
                    {item.imageUrl ? (
                        <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-contain rounded-2xl max-h-80"
                        />
                    ) : (
                        <HeartPulse className="text-slate-350 w-24 h-24 stroke-[1.2]" />
                    )}
                </div>

                {/* Right Column: Title & Info */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        {/* Gradiente en badge de categoría/marca */}
                        <span className="text-[8px] font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                            {item.brand}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">{item.name}</h1>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                            {item.model && <span>Modelo: <strong className="text-slate-800 font-mono">{item.model}</strong></span>}
                            <span>Código: <strong className="text-slate-800 font-mono">{item.code}</strong></span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3 border-t border-slate-100 pt-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción del Equipo</h3>
                        <p className="text-xs text-slate-650 leading-relaxed font-medium">
                            {item.description || 'Este equipo médico cuenta con altos estándares de calidad y mantenimiento preventivo al día. Cumple con los requerimientos críticos para el área clínica especificada. Solicita mayor información técnica o una cotización formal.'}
                        </p>
                    </div>

                    {/* Specifications list (dynamic properties) */}
                    {item.details && Object.keys(item.details).length > 0 && (
                        <div className="space-y-3 border-t border-slate-100 pt-6">
                            <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider">Especificaciones Técnicas</h3>
                            <div className="grid grid-cols-2 gap-4 text-[11px] font-medium text-slate-500">
                                {Object.entries(item.details).map(([key, val]: any) => (
                                    <div key={key} className="space-y-0.5">
                                        <span className="text-slate-455 uppercase text-[9px] font-bold tracking-wider">{key}</span>
                                        <p className="text-slate-800 font-semibold">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cotización Action Area */}
                    <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4 shadow-sm text-xs font-semibold text-slate-700">
                        <div>
                            <h3 className="font-extrabold text-sm text-slate-900">Solicitar Cotización de este Equipo</h3>
                            <p className="text-[11px] text-slate-550 mt-0.5">Selecciona el medio de contacto de tu preferencia para recibir tu cotización formal.</p>
                        </div>
                        
                        <button
                            onClick={() => {
                                setModalView('select');
                                setIsModalOpen(true);
                            }}
                            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#00a8cc] to-blue-600 hover:from-[#008ba8] hover:to-blue-700 text-white text-xs font-black py-4 rounded-2xl transition-all shadow-md shadow-cyan-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer uppercase tracking-wider"
                        >
                            <FileText size={16} />
                            <span>Solicitar Cotización</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quote Request Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs font-semibold text-slate-750">
                    <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
                        
                        {/* Close button */}
                        <button 
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>

                        {modalView === 'select' ? (
                            <div className="space-y-6 py-2">
                                <div className="space-y-1.5">
                                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                                        <FileText size={18} className="text-cyan-500" />
                                        Solicitud de Cotización
                                    </h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        ¿Cómo deseas solicitar la cotización para <strong>{item.name}</strong>? Selecciona una opción a continuación:
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* WhatsApp Option */}
                                    <button 
                                        onClick={() => {
                                            handleWpQuote();
                                            handleCloseModal();
                                        }}
                                        className="group p-5 border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/70 rounded-2xl text-left transition-all duration-200 cursor-pointer shadow-sm hover:shadow-emerald-100/50 flex flex-col justify-between min-h-[170px]"
                                    >
                                        <div>
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-md shadow-emerald-500/20">
                                                <Phone size={16} className="fill-white" />
                                            </div>
                                            <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-wider">
                                                Vía WhatsApp
                                            </h4>
                                            <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">
                                                Atención directa con un asesor técnico. Ideal para consultas rápidas.
                                            </p>
                                        </div>
                                        <span className="inline-block mt-3 text-[9px] font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full w-max">
                                            Respuesta Inmediata
                                        </span>
                                    </button>

                                    {/* Email Option */}
                                    <button 
                                        onClick={() => setModalView('email')}
                                        className="group p-5 border-2 border-cyan-100 hover:border-[#00a8cc] bg-cyan-50/20 hover:bg-cyan-50/70 rounded-2xl text-left transition-all duration-200 cursor-pointer shadow-sm hover:shadow-cyan-100/50 flex flex-col justify-between min-h-[170px]"
                                    >
                                        <div>
                                            <div className="w-10 h-10 rounded-xl bg-[#00a8cc] flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform shadow-md shadow-cyan-500/20">
                                                <Mail size={16} />
                                            </div>
                                            <h4 className="font-bold text-xs text-slate-900 group-hover:text-cyan-700 transition-colors uppercase tracking-wider">
                                                Por Correo
                                            </h4>
                                            <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">
                                                Recibe una cotización formal membretada en formato PDF por correo.
                                            </p>
                                        </div>
                                        <span className="inline-block mt-3 text-[9px] font-bold text-cyan-600 bg-cyan-100/60 px-2 py-0.5 rounded-full w-max">
                                            Oferta Formal PDF
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => setModalView('select')}
                                        className="text-[10px] font-extrabold text-[#00a8cc] hover:underline mb-1 flex items-center gap-1 uppercase tracking-wider"
                                    >
                                        ← Volver a opciones
                                    </button>
                                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                        <FileText size={18} className="text-cyan-500" />
                                        Solicitud de Cotización Formal
                                    </h3>
                                    <p className="text-[11px] text-slate-500">Ingresa tus datos y te enviaremos una oferta formal de inmediato por correo.</p>
                                </div>

                                <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-700">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre Completo o Razón Social</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            placeholder="Ej: Clínica San Felipe"
                                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-cyan-500"
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
                                                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-cyan-500"
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
                                                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-cyan-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensaje de Solicitud</label>
                                        <textarea 
                                            rows={4}
                                            value={clientMessage}
                                            onChange={(e) => setClientMessage(e.target.value)}
                                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-cyan-500 leading-relaxed font-medium"
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={sendingForm}
                                        className="w-full bg-[#00a8cc] hover:bg-[#00b4d8] disabled:bg-slate-300 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                    >
                                        <Send size={13} />
                                        <span>{sendingForm ? 'Enviando...' : 'Enviar Solicitud'}</span>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
