import React from 'react';
import { prisma } from '@/lib/prisma';
import { MapPin, Phone, Mail, Clock, Send, ShieldCheck } from 'lucide-react';
import ContactFormClient from './ContactFormClient';

export const metadata = {
    title: 'Contacto - Bioelectrónica Honduras',
    description: 'Ponte en contacto con nosotros. Oficinas físicas en San Pedro Sula, Honduras.',
};

async function getLandingSettings() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'landing_settings' }
        });
        if (setting) {
            return JSON.parse(setting.value);
        }
    } catch (e) {
        console.error('Error fetching settings:', e);
    }
    return {
        whatsappNumbers: ['50431782368', '50489246108'],
        contactEmails: ['ventas@bioelectronicahn.com', 'gerencia@bioelectronicahn.com'],
        physicalAddress: '7 Calle, 9 Avenida NO, San Pedro Sula, Cortés',
        workingHours: 'Lunes a Viernes · 8:00 AM - 5:00 PM'
    };
}

export default async function ContactoPage() {
    const settings = await getLandingSettings();

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-12 animate-fade-in">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ponte en Contacto</h1>
                <p className="text-xs text-slate-500">¿Tienes dudas o deseas solicitar un presupuesto biomédico formal? Completa el formulario o contáctanos directamente.</p>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
                
                {/* Contact Channels (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-6 shadow-sm">
                        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3">Canales de Atención</h3>
                        
                        <div className="space-y-4">
                            {/* Dirección */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-650 flex items-center justify-center shrink-0">
                                    <MapPin size={16} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Ubicación Física</span>
                                    <p className="text-xs font-semibold text-slate-700 leading-normal">{settings.physicalAddress}</p>
                                </div>
                            </div>

                            {/* Horario */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Clock size={16} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Horario de Oficina</span>
                                    <p className="text-xs font-semibold text-slate-700 leading-normal">{settings.workingHours}</p>
                                </div>
                            </div>

                            {/* WhatsApp */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Phone size={16} />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">WhatsApp Ventas / Soporte</span>
                                    <div className="flex flex-col gap-1 text-xs font-bold font-mono">
                                        {settings.whatsappNumbers?.map((num: string) => (
                                            <a 
                                                key={num}
                                                href={`https://wa.me/${num}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-slate-700 hover:text-blue-650 transition-colors"
                                            >
                                                +{num.substring(0, 3)} {num.substring(3, 7)}-{num.substring(7)}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Emails */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Mail size={16} />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Correos Electrónicos</span>
                                    <div className="flex flex-col gap-1 text-xs font-semibold">
                                        {settings.contactEmails?.map((email: string) => (
                                            <a 
                                                key={email}
                                                href={`mailto:${email}`}
                                                className="text-slate-700 hover:text-blue-650 transition-colors"
                                            >
                                                {email}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex gap-3 text-[11px] text-blue-700 leading-normal">
                        <ShieldCheck className="shrink-0 text-blue-600" size={16} />
                        <span>Toda cotización enviada por nuestros canales oficiales incluye su respectiva factura CAI e informes técnicos firmados.</span>
                    </div>
                </div>

                {/* Form Component (3 cols) */}
                <div className="lg:col-span-3">
                    <ContactFormClient />
                </div>
            </div>
        </div>
    );
}
