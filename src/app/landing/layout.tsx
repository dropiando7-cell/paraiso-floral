import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, Search } from 'lucide-react';

async function getLandingInfo() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'landing_settings' }
        });
        if (setting) {
            return JSON.parse(setting.value);
        }
    } catch (e) {
        console.error('Error fetching landing settings in layout:', e);
    }
    return {
        whatsappNumbers: ['50431782368', '50489246108'],
        contactEmails: ['ventas@bioelectronicahn.com', 'gerencia@bioelectronicahn.com'],
        physicalAddress: '7 Calle, 9 Avenida NO, San Pedro Sula, Cortés',
        workingHours: 'Lunes a Viernes · 8:00 AM - 5:00 PM'
    };
}

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getLandingInfo();
    const primaryPhone = settings.whatsappNumbers?.[0] || '50431782368';

    return (
        <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col selection:bg-blue-600/10">
            {/* Top Info Bar */}
            <div className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 py-2.5 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-blue-600" />
                            {settings.workingHours}
                        </span>
                        <span className="hidden md:flex items-center gap-1.5">
                            <MapPin size={12} className="text-blue-600" />
                            {settings.physicalAddress}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href={`mailto:${settings.contactEmails?.[0]}`} className="hover:text-blue-600 transition-colors flex items-center gap-1">
                            <Mail size={12} className="text-blue-600" />
                            {settings.contactEmails?.[0]}
                        </a>
                        <a href={`https://wa.me/${primaryPhone}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors flex items-center gap-1 font-mono font-bold">
                            <Phone size={12} className="text-blue-600" />
                            +{primaryPhone.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1 $2-$3')}
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
                    {/* Logo / Title */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 text-sm">
                            BE
                        </div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-lg text-slate-900 leading-tight tracking-tight">
                                Bioelectrónica
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase -mt-0.5">
                                Honduras
                            </span>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600">
                        <Link href="/" className="hover:text-blue-600 transition-colors">Inicio</Link>
                        <Link href="/productos" className="hover:text-blue-600 transition-colors">Equipos y Catálogo</Link>
                        <Link href="/servicios" className="hover:text-blue-600 transition-colors">Servicios</Link>
                        <Link href="/contacto" className="hover:text-blue-600 transition-colors">Contacto</Link>
                    </nav>

                    {/* Quick Search & CTAs */}
                    <div className="flex items-center gap-3">
                        <form action="/productos" method="GET" className="relative hidden md:block">
                            <input 
                                type="text"
                                name="q"
                                placeholder="Buscar equipo médico..."
                                className="w-56 bg-slate-50 border border-slate-200 rounded-full text-xs py-2 pl-9 pr-4 text-slate-700 focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-400"
                            />
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                        </form>
                        <Link 
                            href="/contacto"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]"
                        >
                            Solicitar Cotización
                        </Link>
                    </div>
                </div>
            </header>

            {/* Public Page View */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-slate-50 border-t border-slate-200/80 py-12 px-4 sm:px-8 text-xs text-slate-500 mt-auto">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Column 1: Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs">
                                BE
                            </div>
                            <span className="font-extrabold text-sm text-slate-900 tracking-tight">Bioelectrónica HN</span>
                        </div>
                        <p className="leading-relaxed text-slate-500">
                            Líderes en venta, distribución y mantenimiento técnico de equipo biomédico en Honduras. Más de 20 años de experiencia respaldan nuestras soluciones.
                        </p>
                    </div>

                    {/* Column 2: Navigation */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Enlaces Rápidos</h4>
                        <div className="flex flex-col gap-2 font-semibold">
                            <Link href="/" className="hover:text-blue-600 transition-colors">Inicio</Link>
                            <Link href="/productos" className="hover:text-blue-600 transition-colors">Productos y Repuestos</Link>
                            <Link href="/servicios" className="hover:text-blue-600 transition-colors">Contratos de Mantenimiento</Link>
                            <Link href="/contacto" className="hover:text-blue-600 transition-colors">Formulario de Contacto</Link>
                        </div>
                    </div>

                    {/* Column 3: Contact Channels */}
                    <div className="space-y-3 col-span-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Canales Autorizados</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                    <MapPin size={10} className="text-blue-600" /> Dirección
                                </span>
                                <p className="leading-normal font-semibold text-slate-700">
                                    {settings.physicalAddress}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                    <Phone size={10} className="text-blue-600" /> WhatsApp de Soporte
                                </span>
                                <div className="flex flex-col gap-1">
                                    {settings.whatsappNumbers?.map((num: string) => (
                                        <a 
                                            key={num}
                                            href={`https://wa.me/${num}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-slate-700 hover:text-blue-600 transition-colors font-bold"
                                        >
                                            +{num.substring(0, 3)} {num.substring(3, 7)}-{num.substring(7)}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto border-t border-slate-200 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                    <span>© {new Date().getFullYear()} Bioelectrónica Honduras. Todos los derechos reservados.</span>
                    <a href="https://sistema.bioelectronicahn.com" className="text-blue-600 hover:text-blue-500">Acceso Personal Autorizado (ERP)</a>
                </div>
            </footer>
        </div>
    );
}
