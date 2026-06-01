import React from 'react';
import { prisma } from '@/lib/prisma';
import { 
    MapPin, 
    Phone, 
    Mail, 
    Clock, 
    ShieldAlert, 
    ExternalLink, 
    Search, 
    CheckCircle2, 
    Star, 
    ArrowRight,
    Wrench,
    Activity,
    Layers,
    HeartPulse
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

// Mock/Fallback Featured Products
const mockAssets = [
    {
        id: 'mock-1',
        descripcionCorta: 'Ultrasonido General Electric Logiq E9',
        marca: 'General Electric',
        modelo: 'Logiq E9',
        idQr: 'BE-US-001',
        imagenUrl: '',
    },
    {
        id: 'mock-2',
        descripcionCorta: 'Defibrilador Zoll M Series CCT',
        marca: 'Zoll Medical',
        modelo: 'M Series CCT',
        idQr: 'BE-DF-002',
        imagenUrl: '',
    },
    {
        id: 'mock-3',
        descripcionCorta: 'Monitor de Signos Vitales Mindray BeneView T5',
        marca: 'Mindray',
        modelo: 'BeneView T5',
        idQr: 'BE-MON-003',
        imagenUrl: '',
    },
    {
        id: 'mock-4',
        descripcionCorta: 'Máquina de Anestesia Dräger Fabius GS Premium',
        marca: 'Dräger',
        modelo: 'Fabius GS',
        idQr: 'BE-AN-004',
        imagenUrl: '',
    }
];

async function getLandingData() {
    try {
        const settings = await prisma.systemSetting.findMany();
        
        const maintenanceMode = settings.find(s => s.key === 'maintenance_mode')?.value === 'true';
        
        const reviewsRaw = settings.find(s => s.key === 'google_reviews')?.value || '[]';
        const reviews = JSON.parse(reviewsRaw);

        const sectionsRaw = settings.find(s => s.key === 'landing_sections')?.value || '[]';
        const sections = JSON.parse(sectionsRaw);

        const landingSettingsRaw = settings.find(s => s.key === 'landing_settings')?.value || '{}';
        const landingSettings = JSON.parse(landingSettingsRaw);

        // Fetch real active inventory assets (ActivoFijo)
        let realAssets: any[] = [];
        try {
            realAssets = await prisma.activoFijo.findMany({
                where: {
                    estatusContable: 'VIGENTE'
                },
                take: 8,
                select: {
                    id: true,
                    descripcionCorta: true,
                    marca: true,
                    modelo: true,
                    idQr: true,
                    imagenUrl: true
                }
            });
        } catch (dbErr) {
            console.error('Error loading inventory assets:', dbErr);
        }

        return {
            maintenanceMode,
            reviews,
            sections,
            landingSettings,
            assets: realAssets.length > 0 ? realAssets : mockAssets
        };
    } catch (e) {
        console.error('Error fetching landing data:', e);
        return {
            maintenanceMode: true,
            reviews: [],
            sections: [],
            landingSettings: {},
            assets: mockAssets
        };
    }
}

export default async function LandingPage() {
    const data = await getLandingData();

    // Check if user is Super Admin or Org Admin to bypass maintenance mode (WordPress style)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let isSuperAdmin = false;
    if (user) {
        try {
            const profile = await prisma.user.findFirst({
                where: { email: user.email },
                select: { role: true }
            });
            if (profile) {
                isSuperAdmin = profile.role === 'SUPER_ADMIN' || profile.role === 'ORG_ADMIN';
            }
        } catch (err) {
            console.error('Error checking user role in landing page:', err);
        }
    }

    // Render under construction layout if maintenance mode is enabled and user is not a superadmin
    if (data.maintenanceMode && !isSuperAdmin) {
        const wpNum = data.landingSettings?.whatsappNumbers?.[0] || '50431782368';
        const wpNum2 = data.landingSettings?.whatsappNumbers?.[1] || '50489246108';
        const contactEmail = data.landingSettings?.contactEmails?.[0] || 'ventas@bioelectronicahn.com';
        const contactEmail2 = data.landingSettings?.contactEmails?.[1] || 'gerencia@bioelectronicahn.com';
        const address = data.landingSettings?.physicalAddress || '7 Calle, 9 Avenida NO, San Pedro Sula, Cortés';
        const hours = data.landingSettings?.workingHours || 'Lunes a Viernes · 8:00 AM - 5:00 PM';

        return (
            <div className="min-h-[85vh] bg-white text-slate-800 flex flex-col items-center justify-center p-6 font-sans select-none">
                <div className="max-w-xl w-full flex flex-col items-center text-center space-y-6">
                    {/* Brand Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Bioelectrónica Honduras
                    </div>

                    {/* Main Heading */}
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                            Sitio Web en <span className="text-blue-600">Construcción</span>
                        </h1>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
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
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} className="text-blue-600" />
                                    Dirección Física
                                </span>
                                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                                    {address}
                                </p>
                            </div>

                            {/* Horario */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={12} className="text-blue-600" />
                                    Horario de Atención
                                </span>
                                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                                    {hours}
                                </p>
                            </div>

                            {/* WhatsApp */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
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
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
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

    // Otherwise, render public-facing premium landing homepage with white theme
    const heroTitle = data.landingSettings?.heroTitle || 'Equipamiento Médico y Soporte Biomédico Lider en Honduras';
    const heroSubtitle = data.landingSettings?.heroSubtitle || 'Diseñando soluciones integrales en venta, distribución y soporte técnico especializado para hospitales y clínicas a nivel nacional.';

    const renderSection = (sectionId: string) => {
        switch (sectionId) {
            case 'hero':
                return (
                    <section key="hero" className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-20 overflow-hidden bg-slate-50">
                        {/* Glow patches */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[140px] pointer-events-none" />
                        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-50 rounded-full blur-[120px] pointer-events-none" />

                        <div className="max-w-4xl w-full space-y-8 relative z-10">
                            {/* Tag */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/50 text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                Especialistas en Biomedicina
                            </div>

                            {/* Headline */}
                            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-none">
                                {heroTitle.split(' ').slice(0, -2).join(' ')} <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-650 font-black">
                                    {heroTitle.split(' ').slice(-2).join(' ')}
                                </span>
                            </h1>

                            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
                                {heroSubtitle}
                            </p>

                            {/* Center Search Bar */}
                            <div className="max-w-2xl mx-auto w-full">
                                <form action="/productos" method="GET" className="flex flex-col sm:flex-row items-center gap-2.5 bg-white border border-slate-200 p-2 rounded-2xl sm:rounded-full shadow-lg focus-within:border-blue-500/50 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 w-full pl-3 py-2 sm:py-0">
                                        <Search className="text-slate-400 shrink-0" size={18} />
                                        <input 
                                            type="text" 
                                            name="q"
                                            placeholder="Buscar ultrasonidos, desfibriladores, monitores, repuestos..." 
                                            className="bg-transparent text-xs w-full text-slate-800 placeholder-slate-450 focus:outline-none"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-8 py-3 rounded-xl sm:rounded-full transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                                    >
                                        Buscar Catálogo
                                    </button>
                                </form>
                            </div>
                        </div>
                    </section>
                );

            case 'reviews':
                return (
                    <section key="reviews" className="bg-white border-y border-slate-100 py-12 overflow-hidden relative">
                        {/* Transparent side fade overlays (light mode) */}
                        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

                        <div className="max-w-7xl mx-auto px-4 mb-6 flex flex-col items-center">
                            <div className="flex items-center gap-2">
                                <div className="flex text-amber-500 text-sm">
                                    <Star size={12} className="fill-amber-500" />
                                    <Star size={12} className="fill-amber-500" />
                                    <Star size={12} className="fill-amber-500" />
                                    <Star size={12} className="fill-amber-500" />
                                    <Star size={12} className="fill-amber-500" />
                                </div>
                                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                    Calificación de 4.9 estrellas en Google
                                </span>
                            </div>
                        </div>

                        {/* Scrolling Review Marquee */}
                        <div className="w-full relative overflow-hidden flex py-2">
                            <div className="flex gap-6 animate-marquee shrink-0">
                                {data.reviews.concat(data.reviews).map((review: any, idx: number) => (
                                    <div 
                                        key={`${review.id}-${idx}`}
                                        className="w-85 bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm shrink-0 hover:border-slate-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-bold text-slate-500 text-xs shrink-0 border border-slate-100">
                                                {review.author.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xs text-slate-800 leading-tight">{review.author}</h4>
                                                <span className="text-[9px] text-slate-400">{review.date}</span>
                                            </div>
                                            <div className="ml-auto flex text-amber-500 text-[10px]">
                                                {'★'.repeat(review.rating)}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                            "{review.text}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                );

            case 'categories':
                return (
                    <section key="categories" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-12 bg-white">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Equipos Biomédicos Especializados</h2>
                            <p className="text-xs text-slate-500 max-w-lg mx-auto">Soluciones de alto nivel estructuradas para atender las necesidades críticas de tu centro de salud.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Card 1 */}
                            <div className="group relative p-6 bg-slate-50 border border-slate-100 hover:border-blue-500/20 rounded-3xl transition-all hover:bg-white overflow-hidden shadow-sm hover:shadow-md">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center mb-4">
                                    <HeartPulse size={20} />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">Monitoreo de Pacientes</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Monitores multiparámetros, ECG, oxímetros y sensores biomédicos certificados.</p>
                            </div>

                            {/* Card 2 */}
                            <div className="group relative p-6 bg-slate-50 border border-slate-100 hover:border-blue-500/20 rounded-3xl transition-all hover:bg-white overflow-hidden shadow-sm hover:shadow-md">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mb-4">
                                    <Activity size={20} />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">Imagenología y Diagnóstico</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Sistemas de ultrasonido portátiles y estacionarios, transductores y repuestos.</p>
                            </div>

                            {/* Card 3 */}
                            <div className="group relative p-6 bg-slate-50 border border-slate-100 hover:border-blue-500/20 rounded-3xl transition-all hover:bg-white overflow-hidden shadow-sm hover:shadow-md">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-all" />
                                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-500 flex items-center justify-center mb-4">
                                    <Layers size={20} />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 group-hover:text-cyan-600 transition-colors">Soporte de Vida</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Máquinas de anestesia, desfibriladores y ventiladores mecánicos.</p>
                            </div>

                            {/* Card 4 */}
                            <div className="group relative p-6 bg-slate-50 border border-slate-100 hover:border-blue-500/20 rounded-3xl transition-all hover:bg-white overflow-hidden shadow-sm hover:shadow-md">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center mb-4">
                                    <Wrench size={20} />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">Servicio Técnico</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Contratos anuales, calibración con equipos patrones y repuestos originales.</p>
                            </div>
                        </div>
                    </section>
                );

            case 'products':
                return (
                    <section key="products" className="py-20 bg-slate-50 border-y border-slate-100 px-4 sm:px-8">
                        <div className="max-w-7xl mx-auto space-y-12">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="space-y-1 text-center sm:text-left">
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Equipos Destacados en Inventario</h2>
                                    <p className="text-xs text-slate-500">Equipamiento disponible de entrega inmediata o bajo pedido cotizable.</p>
                                </div>
                                <Link 
                                    href="/productos"
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors group"
                                >
                                    <span>Ver Todo el Catálogo</span>
                                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>

                            {/* Product grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {data.assets.slice(0, 4).map((item: any) => (
                                    <div key={item.id} className="group flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-slate-350 hover:shadow-md transition-all relative">
                                        
                                        {/* Image preview */}
                                        <div className="aspect-[4/3] w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center relative overflow-hidden">
                                            {item.imagenUrl ? (
                                                <img 
                                                    src={item.imagenUrl} 
                                                    alt={item.descripcionCorta} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <HeartPulse className="text-slate-300 w-12 h-12 stroke-[1.2]" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-5 flex-1 flex flex-col gap-4">
                                            <div className="space-y-1.5 flex-1">
                                                <span className="text-[9px] font-extrabold bg-blue-550/10 border border-blue-500/20 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                                                    {item.marca || 'Genérico'}
                                                </span>
                                                <h3 className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight">
                                                    {item.descripcionCorta}
                                                </h3>
                                                {item.modelo && (
                                                    <p className="text-[10px] text-slate-400 font-mono">Mod: {item.modelo}</p>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/productos/${item.id}`}
                                                    className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold py-2 rounded-xl border border-slate-200 transition-colors"
                                                >
                                                    Ficha
                                                </Link>
                                                <Link
                                                    href={`/productos/${item.id}?cotizar=true`}
                                                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 rounded-xl transition-colors shadow-sm shadow-blue-500/15"
                                                >
                                                    Cotizar
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                );

            case 'services':
                return (
                    <section key="services" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-12 bg-white">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Servicio Técnico Biomédico Certificado</h2>
                            <p className="text-xs text-slate-500 max-w-lg mx-auto">Garantizamos la operatividad continua de tus equipos médicos con calibración patronada y soporte de emergencia.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Service 1 */}
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center">
                                    <CheckCircle2 size={20} />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900">Mantenimiento Preventivo</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">Inspecciones de seguridad, limpieza interna profunda, pruebas funcionales y lubricación según parámetros del fabricante para extender la vida útil del equipo.</p>
                            </div>

                            {/* Service 2 */}
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-550 flex items-center justify-center">
                                    <Wrench size={20} />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900">Reparación Correctiva</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">Diagnóstico y corrección inmediata de fallas por ingenieros electrónicos calificados. Disponibilidad de repuestos originales importados en tiempo récord.</p>
                            </div>

                            {/* Service 3 */}
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-550 flex items-center justify-center">
                                    <Activity size={20} />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900">Calibración y Certificación</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">Verificación de rangos y entrega de reportes de calibración con analizadores biomédicos patrones para auditorías de salud y licencias de operación.</p>
                            </div>
                        </div>
                    </section>
                );

            case 'contact':
                return (
                    <section key="contact" className="py-20 bg-slate-50 border-t border-slate-100 px-4 sm:px-8">
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            
                            {/* Contact text */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">Contacto Directo</span>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">¿Tienes dudas o necesitas un presupuesto formal?</h2>
                                    <p className="text-xs text-slate-505 leading-relaxed">Estamos a tu disposición para asesorarte. Contáctanos por cualquiera de nuestros medios autorizados y un ingeniero biomédico te atenderá.</p>
                                </div>

                                <div className="space-y-3 font-semibold text-xs text-slate-600">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <span>{data.landingSettings?.physicalAddress}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                                            <Clock size={16} />
                                        </div>
                                        <span>{data.landingSettings?.workingHours}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                                            <Mail size={16} />
                                        </div>
                                        <a href={`mailto:${data.landingSettings?.contactEmails?.[0]}`} className="hover:underline text-blue-600">{data.landingSettings?.contactEmails?.[0]}</a>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form card (light) */}
                            <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-lg space-y-4">
                                <h3 className="font-bold text-sm text-slate-900">Envíanos un mensaje rápido</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="Nombre completo" 
                                        className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Teléfono (ej: 9988-7766)" 
                                        className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <input 
                                    type="email" 
                                    placeholder="Correo electrónico" 
                                    className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                                <textarea 
                                    placeholder="Detalla qué equipo necesitas cotizar o el soporte técnico que buscas..." 
                                    rows={4}
                                    className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
                                />

                                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-sm shadow-blue-500/15">
                                    Enviar Solicitud
                                </button>
                            </div>
                        </div>
                    </section>
                );

            default:
                return null;
        }
    };

    return (
        <div className="relative">
            {/* Render sections in the precise order specified by the user's Drag and Drop */}
            {data.sections.filter((s: any) => s.visible).map((s: any) => renderSection(s.id))}
        </div>
    );
}
