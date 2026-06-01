'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Phone, Search, Menu, X, ChevronDown, Settings, Wrench, Users, Package, HelpCircle } from 'lucide-react';

interface PublicHeaderProps {
    logoUrl: string;
    companyName: string;
    primaryPhone: string;
    cleanPhone: string;
    contactEmail: string;
}

export default function PublicHeader({
    logoUrl,
    companyName,
    primaryPhone,
    cleanPhone,
    contactEmail
}: PublicHeaderProps) {
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileEquiposOpen, setIsMobileEquiposOpen] = useState(false);
    const megaMenuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    // Close mega menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                megaMenuRef.current && 
                !megaMenuRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setIsMegaMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const megaMenuData = [
        {
            title: "QUIRÓFANO Y ANESTESIA",
            items: [
                { name: "Máquinas de Anestesia", href: "/productos?q=Anestesia" },
                { name: "Mesas Quirúrgicas", href: "/productos?q=Mesa" },
                { name: "Lámparas Quirúrgicas", href: "/productos?q=Lampara" },
                { name: "Electrobisturís", href: "/productos?q=Electrobisturi" },
                { name: "Vaporizadores", href: "/productos?q=Vaporizador" },
                { name: "Aspiradores de Succión", href: "/productos?q=Aspirador" }
            ]
        },
        {
            title: "CUIDADO CRÍTICO Y MONITOREO",
            items: [
                { name: "Monitores de Pacientes", href: "/productos?q=Monitor" },
                { name: "Desfibriladores", href: "/productos?q=Desfibrilador" },
                { name: "Electrocardiógrafos (ECG)", href: "/productos?q=Electrocardiografo" },
                { name: "Oxímetros de Pulso", href: "/productos?q=Oximetro" },
                { name: "Bombas de Infusión", href: "/productos?q=Bomba" },
                { name: "Camas Hospitalarias", href: "/productos?q=Cama" }
            ]
        },
        {
            title: "DIAGNÓSTICO E IMAGEN",
            items: [
                { name: "Ultrasonidos / Ecógrafos", href: "/productos?q=Ultrasonido" },
                { name: "Equipos de Rayos X", href: "/productos?q=Rayos" },
                { name: "Negatoscopios", href: "/productos?q=Negatoscopio" },
                { name: "Otoscopios y Oftalmos", href: "/productos?q=Diagnostico" },
                { name: "Esfigmomanómetros", href: "/productos?q=Presion" }
            ]
        },
        {
            title: "SOPORTE RESPIRATORIO Y SOPORTE",
            items: [
                { name: "Ventiladores Mecánicos", href: "/productos?q=Ventilador" },
                { name: "Concentradores de Oxígeno", href: "/productos?q=Oxigeno" },
                { name: "Autoclaves y Esterilizadores", href: "/productos?q=Esterilizador" },
                { name: "Compresores Médicos", href: "/productos?q=Compresor" },
                { name: "Reguladores de Vacío", href: "/productos?q=Vacio" }
            ]
        }
    ];

    return (
        <header className="sticky top-0 z-50 bg-white text-slate-800 border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-sm relative font-sans">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
                
                <Link href="/" className="flex items-center gap-3 shrink-0">
                    <div className="h-11 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={logoUrl || '/logo-bioelectronica.jpg'} 
                            alt={companyName} 
                            className="h-10 max-w-[200px] object-contain" 
                        />
                    </div>
                </Link>

                {/* Desktop Navigation Links */}
                <nav className="hidden lg:flex items-center gap-8 text-[12px] font-black uppercase tracking-wider text-slate-700">
                    <Link href="/" className="hover:text-[#00A8CC] transition-colors">INICIO</Link>
                    
                    {/* Equipos Trigger for Mega Menu */}
                    <div 
                        ref={triggerRef}
                        className="relative cursor-pointer flex items-center gap-1 py-2 hover:text-[#00A8CC] transition-colors"
                        onMouseEnter={() => setIsMegaMenuOpen(true)}
                        onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                    >
                        <span>EQUIPOS</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
                    </div>

                    <Link href="/servicios" className="hover:text-[#00A8CC] transition-colors">SERVICIOS</Link>
                    <Link href="/contacto" className="hover:text-[#00A8CC] transition-colors">CONTACTO</Link>
                </nav>

                {/* Right Area: Search, WhatsApp Support, Quote Button */}
                <div className="hidden lg:flex items-center gap-6">
                    {/* WhatsApp Support Badge */}
                    <a 
                        href={`https://wa.me/${cleanPhone}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity"
                    >
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/10 shrink-0">
                            <Phone size={14} className="fill-white" />
                        </div>
                        <div className="flex flex-col text-[10px] leading-tight">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">Soporte</span>
                            <span className="font-mono font-bold text-slate-800 text-xs">+{primaryPhone}</span>
                        </div>
                    </a>

                    {/* Search Bar Form */}
                    <form action="/productos" method="GET" className="relative">
                        <input 
                            type="text"
                            name="q"
                            placeholder="BUSCAR EQUIPO..."
                            className="w-36 bg-slate-100 border border-slate-200 rounded-full text-xs py-1.5 pl-8 pr-3 text-slate-800 focus:outline-none focus:border-[#00A8CC] focus:w-48 transition-all placeholder-slate-400 font-semibold"
                        />
                        <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
                    </form>

                    {/* Request Quote Button */}
                    <Link 
                        href="/contacto"
                        className="bg-[#00A8CC] hover:bg-[#008ba8] text-white text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all shadow-md shadow-cyan-500/10 active:scale-[0.98]"
                    >
                        Solicitar Cotización
                    </Link>
                </div>

                {/* Mobile Menu Buttons */}
                <div className="flex lg:hidden items-center gap-4">
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-1.5 text-slate-700 hover:text-slate-900 focus:outline-none"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* MEGA MENU CONTAINER (DEKSTOP) */}
            {isMegaMenuOpen && (
                <div 
                    ref={megaMenuRef}
                    className="absolute left-1/2 -translate-x-1/2 w-full max-w-7xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 z-50 mt-3"
                    onMouseLeave={() => setIsMegaMenuOpen(false)}
                >
                    {megaMenuData.map((col, idx) => (
                        <div key={idx} className="space-y-4">
                            <h4 className="font-black text-[#00A8CC] text-[11px] tracking-wider border-b border-cyan-100 pb-2 mb-2 uppercase">
                                {col.title}
                            </h4>
                            <ul className="flex flex-col gap-2">
                                {col.items.map((item, itemIdx) => (
                                    <li key={itemIdx}>
                                        <Link 
                                            href={item.href}
                                            onClick={() => setIsMegaMenuOpen(false)}
                                            className="text-slate-650 hover:text-[#00A8CC] hover:underline text-xs block font-semibold transition-all py-0.5"
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {/* MOBILE NAVIGATION DRAWER */}
            {isMobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 w-full bg-white border-b border-slate-200 shadow-lg p-6 lg:hidden z-50 flex flex-col gap-6">
                    <nav className="flex flex-col gap-4 text-xs font-black uppercase tracking-wider text-slate-700">
                        <Link 
                            href="/" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="hover:text-[#00A8CC] py-1 border-b border-slate-50"
                        >
                            INICIO
                        </Link>
                        
                        {/* Collapsible Mobile Equipos */}
                        <div className="flex flex-col">
                            <button 
                                onClick={() => setIsMobileEquiposOpen(!isMobileEquiposOpen)}
                                className="flex items-center justify-between w-full hover:text-[#00A8CC] py-1 border-b border-slate-50 font-black text-left"
                            >
                                <span>EQUIPOS</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileEquiposOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMobileEquiposOpen && (
                                <div className="pl-4 mt-3 flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 py-1 scrollbar-hide">
                                    {megaMenuData.map((col, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <h5 className="font-extrabold text-[#00A8CC] text-[10px] tracking-wider uppercase">
                                                {col.title}
                                            </h5>
                                            <ul className="flex flex-col gap-1.5 pl-2">
                                                {col.items.map((item, itemIdx) => (
                                                    <li key={itemIdx}>
                                                        <Link 
                                                            href={item.href}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className="text-slate-600 hover:text-[#00A8CC] text-xs block font-semibold"
                                                        >
                                                            {item.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Link 
                            href="/servicios" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="hover:text-[#00A8CC] py-1 border-b border-slate-50"
                        >
                            SERVICIOS
                        </Link>
                        <Link 
                            href="/contacto" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="hover:text-[#00A8CC] py-1 border-b border-slate-50"
                        >
                            CONTACTO
                        </Link>
                    </nav>

                    {/* Mobile Search Form */}
                    <form action="/productos" method="GET" className="relative w-full">
                        <input 
                            type="text"
                            name="q"
                            placeholder="BUSCAR EQUIPO..."
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl text-xs py-2.5 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-[#00A8CC] font-semibold"
                        />
                        <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
                    </form>

                    {/* Mobile Call Support & Quote buttons */}
                    <div className="flex flex-col gap-3 pt-2">
                        <a 
                            href={`https://wa.me/${cleanPhone}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
                        >
                            <Phone size={14} className="fill-white" />
                            Soporte WhatsApp: +{primaryPhone}
                        </a>
                        <Link 
                            href="/contacto"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-center py-3 rounded-xl bg-[#00A8CC] hover:bg-[#008ba8] text-white font-bold text-xs"
                        >
                            Solicitar Cotización
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
