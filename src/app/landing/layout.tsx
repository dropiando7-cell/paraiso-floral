import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import PublicHeader from './components/PublicHeader';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
    let title = "Bioelectrónica Honduras - Enterprise Platform";
    let description = "Estamos diseñando nuestro nuevo sitio corporativo y catálogo médico en línea. Muy pronto podrás explorar todas nuestras soluciones y productos médicos.";
    let keywords = "bioelectronica, equipo medico, honduras, biomedico, soporte tecnico";
    let image = "";

    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'landing_settings' }
        });
        if (setting) {
            const parsed = JSON.parse(setting.value);
            if (parsed.seoTitle && parsed.seoTitle.trim() !== '') title = parsed.seoTitle;
            if (parsed.seoDescription && parsed.seoDescription.trim() !== '') description = parsed.seoDescription;
            if (parsed.seoKeywords && parsed.seoKeywords.trim() !== '') keywords = parsed.seoKeywords;
            if (parsed.seoImage && parsed.seoImage.trim() !== '') image = parsed.seoImage;
        }
    } catch (e) {
        console.error('Error generating dynamic metadata:', e);
    }

    const openGraphImages = image ? [{ url: image }] : [];

    return {
        title: title,
        description: description,
        keywords: keywords,
        openGraph: {
            title: title,
            description: description,
            images: openGraphImages,
            type: 'website',
            siteName: 'Bioelectrónica Honduras',
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: image ? [image] : [],
        }
    };
}

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

async function getCompanyProfile() {
    try {
        const org = await prisma.organization.findFirst({
            select: {
                logoUrl: true,
                name: true,
                telefono: true,
                correoContacto: true,
                direccion: true
            }
        });
        return org;
    } catch (e) {
        console.error('Error fetching organization profile:', e);
        return null;
    }
}

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getLandingInfo();
    const org = await getCompanyProfile();
    
    // Fallbacks from DB organization or settings
    const primaryPhone = org?.telefono || settings.whatsappNumbers?.[0] || '50431782368';
    // Clean phone for wa.me link
    const cleanPhone = primaryPhone.replace(/\D/g, '');
    const contactEmail = org?.correoContacto || settings.contactEmails?.[0] || 'ventas@bioelectronicahn.com';
    const physicalAddress = org?.direccion || settings.physicalAddress || '7 Calle, 9 Avenida NO, San Pedro Sula, Cortés';
    const companyName = org?.name || 'Bioelectrónica Honduras';
    const logoUrl = org?.logoUrl || '';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-cyan-500/10">
            {/* Top Info Bar */}
            <div className="bg-[#030d1a] border-b border-slate-900 text-[11px] font-semibold text-slate-400 py-2.5 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-cyan-400" />
                            {settings.workingHours}
                        </span>
                        <span className="hidden md:flex items-center gap-1.5">
                            <MapPin size={12} className="text-cyan-400" />
                            {physicalAddress}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href={`mailto:${contactEmail}`} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                            <Mail size={12} className="text-cyan-400" />
                            {contactEmail}
                        </a>
                        <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors flex items-center gap-1 font-mono">
                            <Phone size={12} className="text-cyan-400" />
                            +{primaryPhone}
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Header (Sleek White Header with Mega Menu) */}
            <PublicHeader 
                logoUrl={logoUrl}
                companyName={companyName}
                primaryPhone={primaryPhone}
                cleanPhone={cleanPhone}
                contactEmail={contactEmail}
            />

            {/* Public Page View */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-[#07162c] text-slate-350 border-t border-slate-800 py-16 px-4 sm:px-8 text-xs relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-900/10 rounded-full blur-[140px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
                    {/* Column 1: Info */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-3">
                            {logoUrl ? (
                                <div className="h-9 px-2 py-1 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={logoUrl} alt={companyName} className="h-7 max-w-[120px] object-contain" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-xs">
                                        BE
                                    </div>
                                    <span className="font-extrabold text-sm text-white tracking-tight">{companyName}</span>
                                </div>
                            )}
                        </Link>
                        <p className="leading-relaxed text-slate-400">
                            Líderes en venta, distribución y mantenimiento técnico de equipo biomédico en Honduras. Más de 20 años de experiencia respaldan nuestras soluciones.
                        </p>
                    </div>

                    {/* Column 2: Navigation */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Enlaces Rápidos</h4>
                        <div className="flex flex-col gap-2.5 font-semibold">
                            <Link href="/" className="hover:text-cyan-400 transition-colors">Inicio</Link>
                            <Link href="/productos" className="hover:text-cyan-400 transition-colors">Productos y Repuestos</Link>
                            <Link href="/servicios" className="hover:text-cyan-400 transition-colors">Contratos de Mantenimiento</Link>
                            <Link href="/contacto" className="hover:text-cyan-400 transition-colors">Formulario de Contacto</Link>
                        </div>
                    </div>

                    {/* Column 3: Contact Channels */}
                    <div className="space-y-4 col-span-2">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Canales Autorizados</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                                    <MapPin size={11} className="text-cyan-400" /> Dirección
                                </span>
                                <p className="leading-normal font-semibold text-slate-300">
                                    {physicalAddress}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                                    <Phone size={11} className="text-cyan-400" /> WhatsApp de Soporte
                                </span>
                                <div className="flex flex-col gap-1.5">
                                    {settings.whatsappNumbers?.map((num: string) => {
                                        const cleanNum = num.replace(/\D/g, '');
                                        return (
                                            <a 
                                                key={num}
                                                href={`https://wa.me/${cleanNum}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-mono text-slate-350 hover:text-cyan-400 transition-colors font-bold flex items-center gap-1"
                                            >
                                                +{num.substring(0, 3)} {num.substring(3, 7)}-{num.substring(7)}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto border-t border-slate-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-bold tracking-wider uppercase relative z-10">
                    <span>© {new Date().getFullYear()} {companyName}. Todos los derechos reservados.</span>
                    <a href="https://sistema.bioelectronicahn.com" className="text-cyan-500 hover:text-cyan-400">Acceso Personal Autorizado (ERP)</a>
                </div>
            </footer>
        </div>
    );
}
