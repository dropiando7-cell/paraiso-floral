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
    activeTheme?: string;
    categories?: string[];
}

export default function PublicHeader({
    logoUrl,
    companyName,
    primaryPhone,
    cleanPhone,
    contactEmail,
    activeTheme = 'DRE',
    categories = []
}: PublicHeaderProps) {
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileEquiposOpen, setIsMobileEquiposOpen] = useState(false);
    const megaMenuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const isSoma = activeTheme === 'SOMA';

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

    // Helper to capitalize category names nicely for display
    const capitalize = (str: string) => {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    function categorizeCategory(name: string) {
        const clean = name.toLowerCase();
        if (
            clean.includes('anestesia') || 
            clean.includes('quirurg') || 
            clean.includes('quiró') || 
            clean.includes('mesa') || 
            clean.includes('lampara') || 
            clean.includes('lámpara') || 
            clean.includes('electrobisturi') || 
            clean.includes('electrobisturí') || 
            clean.includes('vaporizador') || 
            clean.includes('aspirador') || 
            clean.includes('surgical') || 
            clean.includes('anesthesia') || 
            clean.includes('operating')
        ) {
            return 'quirofano';
        }
        if (
            clean.includes('monitor') || 
            clean.includes('desfibrilador') || 
            clean.includes('defibrillator') || 
            clean.includes('electrocardiog') || 
            clean.includes('electrocardióg') || 
            clean.includes('ecg') || 
            clean.includes('oximetro') || 
            clean.includes('oxímetro') || 
            clean.includes('bomba') || 
            clean.includes('cama') || 
            clean.includes('critico') || 
            clean.includes('crítico') || 
            clean.includes('telemetria') || 
            clean.includes('telemetría') || 
            clean.includes('fetal')
        ) {
            return 'monitoreo';
        }
        if (
            clean.includes('ultrasonido') || 
            clean.includes('ecografo') || 
            clean.includes('ecógrafo') || 
            clean.includes('rayos') || 
            clean.includes('x-ray') || 
            clean.includes('negatoscopio') || 
            clean.includes('otoscopio') || 
            clean.includes('oftalmoscopio') || 
            clean.includes('diagnostico') || 
            clean.includes('diagnóstico') || 
            clean.includes('ultrasound') || 
            clean.includes('imaging') || 
            clean.includes('cuna') || 
            clean.includes('incubadora') || 
            clean.includes('microscopio') || 
            clean.includes('c-arm') || 
            clean.includes('arco en c')
        ) {
            return 'diagnostico';
        }
        if (
            clean.includes('ventilador') || 
            clean.includes('oxigeno') || 
            clean.includes('oxígeno') || 
            clean.includes('respirador') || 
            clean.includes('respiratory') || 
            clean.includes('ventilator')
        ) {
            return 'respiratorio';
        }
        return 'otros';
    }

    // Dynamic grouping
    const grouped = {
        quirofano: [] as { name: string; href: string }[],
        monitoreo: [] as { name: string; href: string }[],
        diagnostico: [] as { name: string; href: string }[],
        respiratorio: [] as { name: string; href: string }[],
        otros: [] as { name: string; href: string }[],
    };

    categories.forEach(cat => {
        const bucket = categorizeCategory(cat);
        const item = {
            name: capitalize(cat),
            href: `/productos?category=${encodeURIComponent(cat)}`
        };
        grouped[bucket].push(item);
    });

    const fallbackDRE = [
        {
            title: "QUIRÓFANO Y ANESTESIA",
            items: [
                { name: "Máquinas de Anestesia", href: "/productos?category=Máquinas de Anestesia" },
                { name: "Mesas Quirúrgicas", href: "/productos?category=Mesas Quirúrgicas" },
                { name: "Lámparas Quirúrgicas", href: "/productos?category=Lámparas Quirúrgicas" },
                { name: "Electrobisturís", href: "/productos?category=Electrobisturís" }
            ]
        },
        {
            title: "CUIDADO CRÍTICO Y MONITOREO",
            items: [
                { name: "Monitores de Pacientes", href: "/productos?category=Monitores de Pacientes" },
                { name: "Desfibriladores", href: "/productos?category=Desfibriladores" },
                { name: "Camas Hospitalarias", href: "/productos?category=Camas Hospitalarias" }
            ]
        },
        {
            title: "DIAGNÓSTICO E IMAGEN",
            items: [
                { name: "Ultrasonidos / Ecógrafos", href: "/productos?category=Ultrasonidos / Ecógrafos" },
                { name: "Equipos de Rayos X", href: "/productos?category=Equipos de Rayos X" }
            ]
        },
        {
            title: "SOPORTE RESPIRATORIO Y SOPORTE",
            items: [
                { name: "Ventiladores Mecánicos", href: "/productos?category=Ventiladores Mecánicos" },
                { name: "Concentradores de Oxígeno", href: "/productos?category=Concentradores de Oxígeno" }
            ]
        }
    ];

    const fallbackSOMA = [
        {
            title: "Equipos de Quirófano",
            items: [
                { name: "Máquinas de Anestesia", href: "/productos?category=Máquinas de Anestesia" },
                { name: "Mesas Quirúrgicas", href: "/productos?category=Mesas Quirúrgicas" }
            ]
        },
        {
            title: "Cuidado Crítico",
            items: [
                { name: "Monitores de Pacientes", href: "/productos?category=Monitores de Pacientes" },
                { name: "Desfibriladores", href: "/productos?category=Desfibriladores" }
            ]
        },
        {
            title: "Diagnóstico e Imagen",
            items: [
                { name: "Ultrasonidos / Ecógrafos", href: "/productos?category=Ultrasonidos / Ecógrafos" }
            ]
        },
        {
            title: "Soporte Respiratorio",
            items: [
                { name: "Ventiladores Mecánicos", href: "/productos?category=Ventiladores Mecánicos" }
            ]
        },
        {
            title: "Otros Equipamientos",
            items: [
                { name: "Más equipo médico", href: "/productos" }
            ]
        }
    ];

    let dynamicMenu: { title: string; items: { name: string; href: string }[] }[] = [];

    if (isSoma) {
        dynamicMenu = [
            { title: "Equipos de Quirófano", items: grouped.quirofano },
            { title: "Cuidado Crítico", items: grouped.monitoreo },
            { title: "Diagnóstico e Imagen", items: grouped.diagnostico },
            { title: "Soporte Respiratorio", items: grouped.respiratorio },
            { title: "Otros Equipamientos", items: grouped.otros }
        ].filter(col => col.items.length > 0);

        if (dynamicMenu.length === 0) {
            dynamicMenu = fallbackSOMA;
        }
    } else {
        dynamicMenu = [
            { title: "QUIRÓFANO Y ANESTESIA", items: grouped.quirofano },
            { title: "CUIDADO CRÍTICO Y MONITOREO", items: grouped.monitoreo },
            { title: "DIAGNÓSTICO E IMAGEN", items: grouped.diagnostico },
            { title: "SOPORTE RESPIRATORIO Y SOPORTE", items: [...grouped.respiratorio, ...grouped.otros] }
        ].filter(col => col.items.length > 0);

        if (dynamicMenu.length === 0) {
            dynamicMenu = fallbackDRE;
        }
    }

    const currentMegaMenu = dynamicMenu;

    return (
        <header className={`sticky top-0 z-50 bg-white text-slate-800 border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-sm relative font-sans ${isSoma ? 'theme-soma' : ''}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
                
                <Link href="/" className="flex items-center gap-3 shrink-0">
                    <div className="h-16 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={logoUrl || '/logo-bioelectronica.jpg'} 
                            alt={companyName} 
                            className="h-14 max-w-[320px] object-contain" 
                        />
                    </div>
                </Link>

                {/* SOMA SPECIFIC MENU NAVIGATION */}
                {isSoma ? (
                    <>
                        <nav className="hidden lg:flex items-center gap-8 text-[13px] font-bold text-slate-700">
                            {/* Dropdown Productos */}
                            <div 
                                ref={triggerRef}
                                className="relative cursor-pointer flex items-center gap-1 py-2 hover:text-[#00509d] transition-colors"
                                onMouseEnter={() => setIsMegaMenuOpen(true)}
                                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                            >
                                <span className={isMegaMenuOpen ? 'text-[#00509d] border-b-2 border-[#00509d] pb-0.5' : ''}>Productos</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
                            </div>

                            <Link href="/servicios" className="hover:text-[#00509d] transition-colors">Servicios</Link>
                            <Link href="/repuestos" className="hover:text-[#00509d] transition-colors">Repuestos</Link>
                            <Link href="/blog" className="hover:text-[#00509d] transition-colors">Blog</Link>
                            <Link href="/contacto" className="hover:text-[#00509d] transition-colors">Contacto</Link>
                            <Link href="/nosotros" className="hover:text-[#00509d] transition-colors">Nosotros</Link>
                        </nav>

                        {/* Right Area: Soma Search Bar ONLY */}
                        <div className="hidden lg:flex items-center gap-6 flex-1 max-w-[280px]">
                            <form action="/productos" method="GET" className="relative w-full">
                                <input 
                                    type="text"
                                    name="q"
                                    placeholder="¿Qué busca?"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 pl-9 pr-3 text-slate-800 focus:outline-none focus:border-[#00509d] focus:bg-white transition-all placeholder-slate-400 font-semibold"
                                />
                                <Search className="absolute left-3 top-2.5 text-slate-450" size={13} />
                            </form>
                        </div>
                    </>
                ) : (
                    <>
                        {/* DRE Navigation Links */}
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
                                    <span className="text-slate-450 font-bold uppercase tracking-wider">Soporte</span>
                                    <span className="font-mono font-bold text-slate-800 text-xs">
                                        {primaryPhone.startsWith('+') ? primaryPhone : `+${primaryPhone}`}
                                    </span>
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
                    </>
                )}

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

            {/* Mobile Search Row (always visible on mobile) */}
            <div className="mt-2.5 lg:hidden border-t border-slate-100 pt-2.5">
                <form action="/productos" method="GET" className="relative w-full">
                    <input 
                        type="text"
                        name="q"
                        placeholder={isSoma ? "¿Qué busca?" : "BUSCAR EQUIPO..."}
                        className={`w-full bg-slate-100 border border-slate-200 rounded-xl text-xs py-2.5 pl-10 pr-4 text-slate-800 focus:outline-none font-semibold ${isSoma ? 'focus:border-[#00509d]' : 'focus:border-[#00A8CC]'}`}
                    />
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
                </form>
            </div>

            {/* MEGA MENU CONTAINER (DEKSTOP) */}
            {isMegaMenuOpen && (
                <div 
                    ref={megaMenuRef}
                    className={`absolute left-1/2 -translate-x-1/2 w-full max-w-7xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-8 z-50 mt-3 grid ${isSoma ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-4'} gap-8`}
                    onMouseLeave={() => setIsMegaMenuOpen(false)}
                >
                    {currentMegaMenu.map((col, idx) => (
                        <div key={idx} className="space-y-4">
                            <h4 className={`font-black text-xs tracking-wider border-b pb-2 mb-2 uppercase ${isSoma ? 'text-[#00509d] border-blue-100' : 'text-[#00A8CC] border-cyan-100'}`}>
                                {col.title}
                            </h4>
                            <ul className="flex flex-col gap-2">
                                {col.items.map((item, itemIdx) => (
                                    <li key={itemIdx}>
                                        <Link 
                                            href={item.href}
                                            onClick={() => setIsMegaMenuOpen(false)}
                                            className={`text-slate-650 text-xs block font-semibold transition-all py-0.5 hover:underline ${isSoma ? 'hover:text-[#00509d]' : 'hover:text-[#00A8CC]'}`}
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
                            className={`py-1 border-b border-slate-50 ${isSoma ? 'hover:text-[#00509d]' : 'hover:text-[#00A8CC]'}`}
                        >
                            INICIO
                        </Link>
                        
                        {/* Collapsible Mobile Equipos */}
                        <div className="flex flex-col">
                            <button 
                                onClick={() => setIsMobileEquiposOpen(!isMobileEquiposOpen)}
                                className={`flex items-center justify-between w-full py-1 border-b border-slate-50 font-black text-left ${isSoma ? 'hover:text-[#00509d]' : 'hover:text-[#00A8CC]'}`}
                            >
                                <span>EQUIPOS</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileEquiposOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMobileEquiposOpen && (
                                <div className="pl-4 mt-3 flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 py-1 scrollbar-hide">
                                    {currentMegaMenu.map((col, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <h5 className={`font-extrabold text-[10px] tracking-wider uppercase ${isSoma ? 'text-[#00509d]' : 'text-[#00A8CC]'}`}>
                                                {col.title}
                                            </h5>
                                            <ul className="flex flex-col gap-1.5 pl-2">
                                                {col.items.map((item, itemIdx) => (
                                                    <li key={itemIdx}>
                                                        <Link 
                                                            href={item.href}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className={`text-xs block font-semibold ${isSoma ? 'text-slate-650 hover:text-[#00509d]' : 'text-slate-600 hover:text-[#00A8CC]'}`}
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
                            className={`py-1 border-b border-slate-50 ${isSoma ? 'hover:text-[#00509d]' : 'hover:text-[#00A8CC]'}`}
                        >
                            SERVICIOS
                        </Link>
                        <Link 
                            href="/contacto" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`py-1 border-b border-slate-50 ${isSoma ? 'hover:text-[#00509d]' : 'hover:text-[#00A8CC]'}`}
                        >
                            CONTACTO
                        </Link>
                    </nav>

                    {/* Mobile Search Form */}
                    <form action="/productos" method="GET" className="relative w-full">
                        <input 
                            type="text"
                            name="q"
                            placeholder={isSoma ? "¿Qué busca?" : "BUSCAR EQUIPO..."}
                            className={`w-full bg-slate-100 border border-slate-200 rounded-xl text-xs py-2.5 pl-10 pr-4 text-slate-800 focus:outline-none font-semibold ${isSoma ? 'focus:border-[#00509d]' : 'focus:border-[#00A8CC]'}`}
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
                            Soporte WhatsApp: {primaryPhone.startsWith('+') ? primaryPhone : `+${primaryPhone}`}
                        </a>
                        <Link 
                            href="/contacto"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`text-center py-3 rounded-xl text-white font-bold text-xs ${isSoma ? 'bg-[#00509d] hover:bg-[#003f7a]' : 'bg-[#00A8CC] hover:bg-[#008ba8]'}`}
                        >
                            Solicitar Cotización
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
