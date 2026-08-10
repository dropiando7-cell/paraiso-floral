'use client';

import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { enviarReportePorEmail, enviarReportePorWhatsApp } from '@/app/(dashboard)/soporte/actions';

interface CompartirInformeModalProps {
    isOpen: boolean;
    onClose: () => void;
    ordenId: string;
    codigoSeguridad: string;
    clienteNombre: string;
    clienteEmail?: string | null;
    clienteTelefono?: string | null;
    equipoDano: string;
    marcaModelo?: string | null;
}

export default function CompartirInformeModal({
    isOpen,
    onClose,
    ordenId,
    codigoSeguridad,
    clienteNombre,
    clienteEmail,
    clienteTelefono,
    equipoDano,
    marcaModelo
}: CompartirInformeModalProps) {
    const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Email state
    const [emailDestino, setEmailDestino] = useState(clienteEmail || '');
    const [emailAsunto, setEmailAsunto] = useState('');
    const [emailMensaje, setEmailMensaje] = useState('');
    const [enviandoEmail, setEnviandoEmail] = useState(false);

    // WhatsApp state
    const [telDestino, setTelDestino] = useState(clienteTelefono || '');
    const [waMensaje, setWaMensaje] = useState('');
    const [enviandoWa, setEnviandoWa] = useState(false);

    const equipoFull = [equipoDano, marcaModelo].filter(Boolean).join(' - ');

    // Reset fields when modal opens or inputs change
    useEffect(() => {
        if (isOpen) {
            setEmailDestino(clienteEmail || '');
            setEmailAsunto(`Informe Técnico #${codigoSeguridad || ordenId} - Bioelectrónica Honduras`);
            setEmailMensaje(
                `Hola, le adjuntamos el informe técnico detallado correspondiente al servicio del equipo ${equipoFull} bajo la orden de trabajo #${codigoSeguridad || ordenId}.\n\nQuedamos a su entera disposición.`
            );

            setTelDestino(clienteTelefono || '');
            
            // Generate public PDF download URL
            const domain = typeof window !== 'undefined' ? window.location.origin : 'https://sistema.bioelectronicahn.com';
            const pdfDownloadUrl = `${domain}/api/pdf/${ordenId}?type=historial`;
            setWaMensaje(
                `Estimado cliente, de parte de Bioelectrónica Honduras le hacemos llegar el informe técnico para la orden de trabajo *#${codigoSeguridad || ordenId}* del equipo *${equipoFull}*.\n\nPuede ver y descargar el informe en formato PDF ingresando al siguiente enlace:\n${pdfDownloadUrl}\n\nCualquier duda o consulta, quedamos a la orden.`
            );
        }
    }, [isOpen, ordenId, codigoSeguridad, clienteNombre, clienteEmail, clienteTelefono, equipoDano, marcaModelo]);

    if (!isOpen) return null;

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailDestino.trim()) {
            toast.error('Por favor ingresa un correo electrónico destinatario.');
            return;
        }
        setEnviandoEmail(true);
        try {
            const res = await enviarReportePorEmail(ordenId, emailDestino.trim(), emailAsunto.trim(), emailMensaje.trim());
            if (res.success) {
                toast.success('Informe técnico enviado por correo exitosamente.');
                onClose();
            } else {
                toast.error(res.error || 'Error al enviar el correo.');
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Error de conexión.');
        } finally {
            setEnviandoEmail(false);
        }
    };

    const handleSendWhatsApp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!telDestino.trim()) {
            toast.error('Por favor ingresa un número de teléfono destinatario.');
            return;
        }
        setEnviandoWa(true);
        try {
            const res = await enviarReportePorWhatsApp(ordenId, telDestino.trim(), waMensaje.trim());
            if (res.success) {
                toast.success('Informe técnico enviado por WhatsApp exitosamente.');
                onClose();
            } else {
                toast.error(res.error || 'Error al enviar el WhatsApp.');
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Error de conexión.');
        } finally {
            setEnviandoWa(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div 
                className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-sm md:text-base uppercase tracking-wider">
                            Compartir Informe Técnico
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Orden #{codigoSeguridad || ordenId}
                        </p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-150 bg-white">
                    <button
                        type="button"
                        onClick={() => setActiveTab('email')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
                            activeTab === 'email'
                                ? 'border-brand-600 text-brand-600 bg-brand-50/10'
                                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30'
                        }`}
                    >
                        <Mail size={14} /> Correo Electrónico
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('whatsapp')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition ${
                            activeTab === 'whatsapp'
                                ? 'border-brand-600 text-brand-600 bg-brand-50/10'
                                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30'
                        }`}
                    >
                        <MessageSquare size={14} /> WhatsApp
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6">
                    {activeTab === 'email' ? (
                        <form onSubmit={handleSendEmail} className="space-y-4 text-left">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Correo Destinatario *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={emailDestino}
                                    onChange={e => setEmailDestino(e.target.value)}
                                    placeholder="ejemplo@cliente.com"
                                    className="w-full text-xs border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition text-slate-700 font-semibold shadow-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Asunto
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={emailAsunto}
                                    onChange={e => setEmailAsunto(e.target.value)}
                                    placeholder="Asunto del correo..."
                                    className="w-full text-xs border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition text-slate-700 font-semibold shadow-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Mensaje Personalizado
                                </label>
                                <textarea
                                    rows={5}
                                    value={emailMensaje}
                                    onChange={e => setEmailMensaje(e.target.value)}
                                    placeholder="Escribe el cuerpo del mensaje..."
                                    className="w-full text-xs border border-slate-200 rounded-xl p-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition text-slate-700 font-semibold shadow-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={enviandoEmail}
                                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {enviandoEmail ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Enviando informe por correo...
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} />
                                        Enviar Informe por Correo
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSendWhatsApp} className="space-y-4 text-left">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Número de Teléfono (WhatsApp) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={telDestino}
                                    onChange={e => setTelDestino(e.target.value)}
                                    placeholder="ej: 31782368 u 89246108"
                                    className="w-full text-xs border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition text-slate-700 font-semibold shadow-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Mensaje Personalizado (Incluye enlace PDF)
                                </label>
                                <textarea
                                    rows={6}
                                    required
                                    value={waMensaje}
                                    onChange={e => setWaMensaje(e.target.value)}
                                    placeholder="Escribe el cuerpo del mensaje..."
                                    className="w-full text-xs border border-slate-200 rounded-xl p-4 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition text-slate-700 font-semibold shadow-sm font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={enviandoWa}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {enviandoWa ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Enviando por WhatsApp...
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} />
                                        Enviar Informe por WhatsApp
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
