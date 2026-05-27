'use client';

import React from 'react';
import { MapPin, Phone, Mail, Clock, ShieldAlert, ExternalLink } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
            {/* Glowing background circles */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-2xl w-full flex flex-col items-center text-center relative z-10 space-y-8">
                {/* Brand Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-bold text-blue-400 uppercase tracking-widest shadow-inner animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Bioelectrónica Honduras
                </div>

                {/* Main Heading */}
                <div className="space-y-3">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                        Nueva Experiencia <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
                            Digital en Camino
                        </span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Estamos diseñando nuestro nuevo sitio corporativo y catálogo médico en línea. Muy pronto podrás explorar todas nuestras soluciones y productos médicos.
                    </p>
                </div>

                {/* Construction details card */}
                <div className="w-full bg-white/[0.02] backdrop-blur-lg border border-white/10 shadow-2xl rounded-[2.5rem] p-6 sm:p-8 space-y-6">
                    {/* Status Info */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-left">
                        <ShieldAlert className="text-amber-500 shrink-0 stroke-[1.5]" size={20} />
                        <div>
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Sitio Web en Construcción</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                                Nuestro catálogo de tienda está temporalmente inactivo. Puedes contactarnos por nuestros canales autorizados detallados a continuación.
                            </p>
                        </div>
                    </div>

                    {/* Contact Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        {/* Dirección */}
                        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <MapPin size={12} className="text-blue-400" />
                                Dirección Física
                            </span>
                            <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                                7 Calle, 9 Avenida NO,<br />
                                San Pedro Sula, Cortés
                            </p>
                        </div>

                        {/* Horario */}
                        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} className="text-blue-400" />
                                Horario de Atención
                            </span>
                            <p className="text-xs text-slate-300 font-semibold">
                                Lunes a Viernes · 8:00 AM - 5:00 PM
                            </p>
                            <span className="inline-block text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                                Cerrado · Abre a las 8 a.m. del mié
                            </span>
                        </div>

                        {/* WhatsApp */}
                        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Phone size={12} className="text-blue-400" />
                                WhatsApp de Ventas / Soporte
                            </span>
                            <div className="flex flex-col gap-1.5 pt-0.5">
                                <a 
                                    href="https://wa.me/50431782368" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-slate-300 hover:text-white font-mono font-bold transition-colors flex items-center gap-1"
                                >
                                    +504 3178-2368 <ExternalLink size={10} className="opacity-40" />
                                </a>
                                <a 
                                    href="https://wa.me/50489246108" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-slate-300 hover:text-white font-mono font-bold transition-colors flex items-center gap-1"
                                >
                                    +504 8924-6108 <ExternalLink size={10} className="opacity-40" />
                                </a>
                            </div>
                        </div>

                        {/* Correos */}
                        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Mail size={12} className="text-blue-400" />
                                Correos de Contacto
                            </span>
                            <div className="flex flex-col gap-1">
                                <a 
                                    href="mailto:ventas@bioelectronicahn.com" 
                                    className="text-xs text-slate-300 hover:text-white font-semibold transition-colors truncate"
                                >
                                    ventas@bioelectronicahn.com
                                </a>
                                <a 
                                    href="mailto:gerencia@bioelectronicahn.com" 
                                    className="text-xs text-slate-300 hover:text-white font-semibold transition-colors truncate"
                                >
                                    gerencia@bioelectronicahn.com
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Portal redirection block */}
                    <div className="pt-4 border-t border-white/5 flex flex-col items-center">
                        <a
                            href="https://sistema.bioelectronicahn.com"
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all"
                        >
                            Acceder al Portal Operativo (ERP)
                            <ExternalLink size={12} />
                        </a>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">
                            Acceso restringido únicamente para personal autorizado de Bioelectrónica.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-[10px] text-slate-600 font-semibold tracking-wider uppercase">
                    © 2026 Bioelectrónica Honduras. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
