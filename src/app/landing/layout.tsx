import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, ShieldAlert, ExternalLink } from 'lucide-react';
import PublicHeader from './components/PublicHeader';
import VisitorTracker from './components/VisitorTracker';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';


export async function generateMetadata(): Promise<Metadata> {
    let title = "Distribuidora Paraíso Floral - Flores Frescas y Arreglos en Honduras";
    let description = "Distribuidora mayorista y al detalle de rosas importadas, flores frescas de corte, follajes, bases, espuma floral y accesorios para floristerías y eventos.";
    let keywords = "paraiso floral, distribuidora de flores, flores honduras, rosas importadas, san pedro sula, arreglos florales, accesorios floristerias";
    let image = "/logo-paraiso-floral.png";
    let googleVerification = "";

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
            if (parsed.googleSearchConsole && parsed.googleSearchConsole.trim() !== '') {
                const match = parsed.googleSearchConsole.match(/content=["']([^"']+)["']/i);
                googleVerification = match ? match[1] : parsed.googleSearchConsole.trim();
            }
        }
    } catch (e) {
        console.error('Error generating dynamic metadata:', e);
    }

    const openGraphImages = image ? [{ url: image }] : [];

    return {
        title: title,
        description: description,
        keywords: keywords,
        verification: {
            google: googleVerification || undefined,
        },
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

async function getDynamicCategories(hideRealInventory: boolean, allowScrapedProducts: boolean) {
    try {
        const allCategoryNames = new Set<string>();

        // 1. Fetch physical categories only if physical inventory is NOT hidden
        if (!hideRealInventory) {
            const physicalCategories = await prisma.categoria.findMany({
                where: {
                    activos: {
                        some: {
                            estatusContable: 'VIGENTE',
                            NOT: {
                                area: { equals: 'SERVICIOS', mode: 'insensitive' }
                            }
                        }
                    }
                },
                select: { nombre: true }
            });
            physicalCategories.forEach(c => {
                if (c.nombre) allCategoryNames.add(c.nombre.trim());
            });
        }

        // 2. Fetch product categories only if hideRealInventory is true or allowScrapedProducts is true
        if (hideRealInventory || allowScrapedProducts) {
            const productWhere: any = {
                estado: 'ACTIVO',
                esServicio: false,
                categoria: { not: null }
            };

            if (hideRealInventory) {
                productWhere.OR = [
                    { sku: { startsWith: 'SOMA-' } },
                    { sku: { startsWith: 'REP-' } },
                    { sku: { startsWith: 'PUKANG-' } },
                    { sku: { startsWith: 'JOSON-' } },
                    { sku: { startsWith: 'AERTI-' } },
                    { sku: { startsWith: 'DRE-' } },
                    { sku: { startsWith: 'AMCARE-' } },
                    { sku: { startsWith: 'RD-' } }
                ];
            } else if (!allowScrapedProducts) {
                productWhere.AND = [
                    { sku: { not: { startsWith: 'SOMA-' } } },
                    { sku: { not: { startsWith: 'REP-' } } },
                    { sku: { not: { startsWith: 'PUKANG-' } } },
                    { sku: { not: { startsWith: 'JOSON-' } } },
                    { sku: { not: { startsWith: 'AERTI-' } } },
                    { sku: { not: { startsWith: 'DRE-' } } },
                    { sku: { not: { startsWith: 'AMCARE-' } } },
                    { sku: { not: { startsWith: 'RD-' } } }
                ];
            }

            const scrapedCategories = await prisma.producto.findMany({
                where: productWhere,
                select: { categoria: true },
                distinct: ['categoria']
            });

            scrapedCategories.forEach(p => {
                if (p.categoria) allCategoryNames.add(p.categoria.trim());
            });
        }

        return Array.from(allCategoryNames);
    } catch (e) {
        console.error('Error fetching dynamic categories in layout:', e);
        return [];
    }
}

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getLandingInfo();
    const org = await getCompanyProfile();
    const hideRealInventory = settings.hideRealInventory === true;
    const allowScrapedProducts = settings.allowScrapedProducts !== false;
    const categories = await getDynamicCategories(hideRealInventory, allowScrapedProducts);

    let isMaintenance = false;
    try {
        const mSetting = await prisma.systemSetting.findUnique({
            where: { key: 'maintenance_mode' }
        });
        isMaintenance = mSetting?.value === 'true';
    } catch (e) {
        console.error('Error fetching maintenance mode in layout:', e);
    }

    let isSuperAdmin = false;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const profile = await prisma.user.findFirst({
                where: { email: user.email },
                select: { role: true }
            });
            if (profile) {
                isSuperAdmin = true;
            }
        }
    } catch (err) {
        console.error('Error checking user role in layout:', err);
    }

    if (isMaintenance && !isSuperAdmin) {
        const wpNum = settings.whatsappNumbers?.[0] || '50431782368';
        const wpNum2 = settings.whatsappNumbers?.[1] || '50489246108';
        const contactEmail = settings.contactEmails?.[0] || 'ventas@bioelectronicahn.com';
        const contactEmail2 = settings.contactEmails?.[1] || 'gerencia@bioelectronicahn.com';
        const address = settings.physicalAddress || '7 Calle, 9 Avenida NO, San Pedro Sula, Cortés';
        const hours = settings.workingHours || 'Lunes a Viernes · 8:00 AM - 5:00 PM';

        return (
            <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 font-sans select-none">
                <div className="max-w-xl w-full flex flex-col items-center text-center space-y-6">
                    {/* Brand Logo */}
                    <div className="h-16 flex items-center justify-center overflow-hidden mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src="/logo-bioelectronica.jpg" 
                            alt="Bioelectrónica Honduras" 
                            className="h-14 object-contain" 
                        />
                    </div>

                    {/* Main Heading */}
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                            Sitio Web en <span className="text-blue-600">Construcción</span>
                        </h1>
                        <p className="text-xs text-slate-550 max-w-md mx-auto leading-relaxed">
                            Estamos diseñando una nueva experiencia digital y catálogo de equipos médicos para brindarte el mejor servicio.
                        </p>
                    </div>

                    {/* Construction details card */}
                    <div className="w-full bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
                        {/* Status Info */}
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-left">
                            <ShieldAlert className="text-blue-600 shrink-0 stroke-[1.5]" size={20} />
                            <div>
                                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Catálogo Temporalmente Inactivo</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                                    Nuestra tienda web se encuentra en mantenimiento. Puedes contactar a nuestro equipo por cualquiera de las siguientes vías.
                                </p>
                            </div>
                        </div>

                        {/* Contact Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                            {/* Dirección */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-wrap">
                                    <MapPin size={12} className="text-blue-600" />
                                    Dirección Física
                                </span>
                                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                                    {address}
                                </p>
                            </div>

                            {/* Horario */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-wrap">
                                    <Clock size={12} className="text-blue-600" />
                                    Horario de Atención
                                </span>
                                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                                    {hours}
                                </p>
                            </div>

                            {/* WhatsApp */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-wrap">
                                    <Phone size={12} className="text-blue-600" />
                                    WhatsApp de Ventas
                                </span>
                                <div className="flex flex-col gap-1 pt-0.5">
                                    <a 
                                        href={`https://wa.me/${wpNum}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-xs text-slate-700 hover:text-blue-600 font-mono font-bold transition-colors flex items-center gap-1"
                                    >
                                        +{wpNum.substring(0, 3)} {wpNum.substring(3, 7)}-{wpNum.substring(7)} <ExternalLink size={10} className="opacity-40" />
                                    </a>
                                    <a 
                                        href={`https://wa.me/${wpNum2}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-xs text-slate-700 hover:text-blue-600 font-mono font-bold transition-colors flex items-center gap-1"
                                    >
                                        +{wpNum2.substring(0, 3)} {wpNum2.substring(3, 7)}-{wpNum2.substring(7)} <ExternalLink size={10} className="opacity-40" />
                                    </a>
                                </div>
                            </div>

                            {/* Correos */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 flex-wrap">
                                    <Mail size={12} className="text-blue-600" />
                                    Correos de Contacto
                                </span>
                                <div className="flex flex-col gap-1">
                                    <a 
                                        href={`mailto:${contactEmail}`} 
                                        className="text-xs text-slate-700 hover:text-blue-600 font-semibold transition-colors truncate"
                                    >
                                        {contactEmail}
                                    </a>
                                    <a 
                                        href={`mailto:${contactEmail2}`} 
                                        className="text-xs text-slate-700 hover:text-blue-600 font-semibold transition-colors truncate"
                                    >
                                        {contactEmail2}
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Portal redirection block */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col items-center">
                            <a
                                href="https://sistema.bioelectronicahn.com"
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all"
                            >
                                Acceder al Portal Operativo (ERP)
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">
                        © {new Date().getFullYear()} Bioelectrónica Honduras. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        );
    }
    
    // Fallbacks from DB organization or settings
    const primaryPhone = org?.telefono || settings.whatsappNumbers?.[0] || '50431782368';
    // Clean phone for wa.me link
    const cleanPhone = primaryPhone.replace(/\D/g, '');
    const contactEmail = settings.topbarEmail || settings.contactEmails?.[0] || org?.correoContacto || 'ventas@paraisofloral.hn';
    const physicalAddress = org?.direccion || settings.physicalAddress || 'San Pedro Sula, Cortés, Honduras';
    const companyName = org?.name || 'Distribuidora Paraíso Floral';
    const logoUrl = org?.logoUrl || '/logo-paraiso-floral.png';

    const isSoma = settings.activeTheme === 'SOMA';

    // Tracking & Analytics helpers
    const rawGA = settings.googleAnalyticsId;
    const gaMatch = rawGA ? (rawGA.match(/G-[A-Z0-9]{4,15}/i) || rawGA.match(/GTM-[A-Z0-9]{4,12}/i)) : null;
    const gaId = gaMatch ? gaMatch[0].toUpperCase() : (rawGA && (rawGA.trim().toUpperCase().startsWith('G-') || rawGA.trim().toUpperCase().startsWith('GTM-')) ? rawGA.trim().toUpperCase() : null);

    const rawFB = settings.facebookPixelId;
    const fbMatch = rawFB ? (rawFB.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"]?(\d+)['"]?\s*\)/i) || rawFB.match(/\b\d{13,17}\b/)) : null;
    const fbId = fbMatch ? (Array.isArray(fbMatch) && fbMatch[1] ? fbMatch[1] : fbMatch[0]) : (rawFB && /^\d+$/.test(rawFB.trim()) ? rawFB.trim() : null);

    const customHeaderScripts = settings.customHeaderScripts;

    return (
        <div className={`min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-cyan-500/10 ${isSoma ? 'theme-soma' : ''}`}>
            {/* Analytics & Tracking Scripts */}
            {gaId && gaId.startsWith('G-') && (
                <>
                    <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${gaId}');
                            `
                        }}
                    />
                </>
            )}
            {gaId && gaId.startsWith('GTM-') && (
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                            })(window,document,'script','dataLayer','${gaId}');
                        `
                    }}
                />
            )}
            {fbId && (
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            !function(f,b,e,v,n,t,s)
                            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                            n.queue=[];t=b.createElement(e);t.async=!0;
                            t.src=v;s=b.getElementsByTagName(e)[0];
                            s.parentNode.insertBefore(t,s)}(window, document,'script',
                            'https://connect.facebook.net/en_US/fbevents.js');
                            fbq('init', '${fbId}');
                            fbq('track', 'PageView');
                        `
                    }}
                />
            )}
            {customHeaderScripts && (
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function(){
                                try {
                                    var div = document.createElement('div');
                                    div.innerHTML = ${JSON.stringify(customHeaderScripts)};
                                    Array.from(div.children).forEach(function(el){
                                        if (el.tagName === 'SCRIPT') {
                                            var s = document.createElement('script');
                                            Array.from(el.attributes).forEach(function(attr){ s.setAttribute(attr.name, attr.value); });
                                            s.innerHTML = el.innerHTML;
                                            document.head.appendChild(s);
                                        } else {
                                            document.head.appendChild(el);
                                        }
                                    });
                                } catch(e) { console.error('Tracking script error:', e); }
                            })();
                        `
                    }}
                />
            )}
            {isSoma && (
                <>
                    {/* Google Font Manrope Injection */}
                    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
                    <style dangerouslySetInnerHTML={{ __html: `
                        .theme-soma, .theme-soma * {
                            font-family: 'Manrope', sans-serif !important;
                        }
                    `}} />
                </>
            )}
            <VisitorTracker />
            {/* Top Info Bar */}
            {settings.activeTheme === 'SOMA' ? (
                <div className="bg-[#1b2a47] text-white text-[11px] font-bold py-2 px-4 sm:px-8 border-b border-slate-700 select-none">
                    <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-2">
                            <span>🇪🇸 ESPAÑOL</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <span>Catálogo 2026</span>
                            <span className="text-white/40">|</span>
                            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {primaryPhone.startsWith('+') ? primaryPhone : `+${primaryPhone}`}
                            </a>
                        </div>
                        <div>
                            <span className="hover:underline cursor-pointer">Carrito de cotizaciones</span>
                        </div>
                    </div>
                </div>
            ) : (
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
                                {primaryPhone.startsWith('+') ? primaryPhone : `+${primaryPhone}`}
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Header (Sleek White Header with Mega Menu) */}
            <PublicHeader 
                logoUrl={logoUrl}
                companyName={companyName}
                primaryPhone={primaryPhone}
                cleanPhone={cleanPhone}
                contactEmail={contactEmail}
                activeTheme={settings.activeTheme || 'DRE'}
                categories={categories}
            />

            {/* Public Page View */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-[#07162c] text-slate-350 border-t border-slate-800 py-16 px-4 sm:px-8 text-xs relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-900/10 rounded-full blur-[140px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
                    {/* Column 1: Info & Social Networks */}
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
                            Distribuidora mayorista y al detalle de rosas importadas, flores frescas de corte, follajes, espuma floral, bases y accesorios para floristerías y eventos en Honduras.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <a 
                                href="https://www.facebook.com/profile.php?id=100064250822579" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-blue-600 hover:border-blue-500 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200"
                                title="Facebook"
                            >
                                <Facebook size={16} />
                            </a>
                            <a 
                                href="https://www.instagram.com/bioelectronicahn/" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-pink-600 hover:border-pink-500 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200"
                                title="Instagram"
                            >
                                <Instagram size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Navigation */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Enlaces Rápidos</h4>
                        <div className="flex flex-col gap-2.5 font-semibold">
                            <Link href="/" className="text-slate-200 hover:text-cyan-400 transition-colors">Inicio</Link>
                            <Link href="/productos" className="text-slate-200 hover:text-cyan-400 transition-colors">Productos y Repuestos</Link>
                            <Link href="/servicios" className="text-slate-200 hover:text-cyan-400 transition-colors">Contratos de Mantenimiento</Link>
                            <Link href="/contacto" className="text-slate-200 hover:text-cyan-400 transition-colors">Formulario de Contacto</Link>
                        </div>
                    </div>

                    {/* Column 3: Contact Channels */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Canales Autorizados</h4>
                        <div className="space-y-3 font-semibold text-slate-200">
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                                    <MapPin size={11} className="text-cyan-400" /> Dirección
                                </span>
                                <p className="leading-normal">
                                    {physicalAddress}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                                    <Phone size={11} className="text-cyan-400" /> WhatsApp
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
                                                className="font-mono text-slate-200 hover:text-cyan-400 transition-colors font-bold flex items-center gap-1"
                                            >
                                                +{num.substring(0, 3)} {num.substring(3, 7)}-{num.substring(7)}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 4: Google Maps */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Ubicación</h4>
                        <div className="w-full h-[130px] rounded-2xl overflow-hidden border border-slate-800 shadow-lg relative">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.2007787311105!2d-88.028987!3d15.509876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f96b3f9ffb627df%3A0xe54d241768b556b6!2sBarrio%20Guamilito%2C%20San%20Pedro%20Sula!5e0!3m2!1ses!2shn!4v1700000000000!5m2!1ses!2shn"
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }} 
                                allowFullScreen={false} 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                            />
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
