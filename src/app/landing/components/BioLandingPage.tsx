import React from 'react';
import { 
    Clock, 
    CheckCircle2, 
    Star, 
    Wrench,
    Activity,
    Package,
    ShieldCheck,
    ChevronRight,
    Settings,
    Users,
    Search
} from 'lucide-react';
import Link from 'next/link';
import FinderTool from './FinderTool';

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

interface BioLandingPageProps {
    data: {
        reviews: any[];
        landingSettings: any;
        assets: any[];
        categories?: any[];
    };
}

export default function BioLandingPage({ data }: BioLandingPageProps) {
    const dbCategories = data.categories || [];

    const fallbackCategories = [
        { titulo: "Máquinas de Anestesia", subtitulo: "Sistemas Completos", img: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=600", href: "/productos?category=Máquinas de Anestesia" },
        { titulo: "Monitores de Pacientes", subtitulo: "Signos Vitales y UCI", img: "/categorias/monitores.png", href: "/productos?category=Monitores de Pacientes" },
        { titulo: "Mesas Quirúrgicas", subtitulo: "Hidráulicas y Eléctricas", img: "/categorias/mesas.png", href: "/productos?category=Mesas Quirúrgicas" },
        { titulo: "Lámparas Quirúrgicas", subtitulo: "LED de alta intensidad", img: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600", href: "/productos?category=Lámparas Quirúrgicas" },
        { titulo: "Electrobisturís", subtitulo: "Corte y Coagulación", img: "/categorias/electrobisturi.png", href: "/productos?category=Electrobisturís" },
        { titulo: "Ultrasonidos", subtitulo: "Imágenes Diagnósticas", img: "/categorias/ultrasonidos.png", href: "/productos?category=Ultrasonidos" },
        { titulo: "Desfibriladores", subtitulo: "DEA y Clínicos", img: "/categorias/desfibriladores.png", href: "/productos?category=Desfibriladores" },
        { titulo: "Terapia Respiratoria", subtitulo: "Ventiladores y CPAP", img: "/categorias/respiratoria.png", href: "/productos?category=Terapia Respiratoria" }
    ];

    const categorias = dbCategories.length > 0 ? dbCategories.slice(0, 8) : fallbackCategories;

    const servicios = [
        { icon: <Settings className="w-8 h-8 text-[#00A8CC]" />, title: "Planificación de Equipos", desc: "Nuestros expertos le ayudan a diseñar y seleccionar la mejor configuración para su clínica o quirófano." },
        { icon: <Wrench className="w-8 h-8 text-[#00A8CC]" />, title: "Instalación", desc: "Técnicos certificados realizan la instalación completa y pruebas de calibración bajo normativas médicas." },
        { icon: <Users className="w-8 h-8 text-[#00A8CC]" />, title: "Entrenamiento", desc: "Brindamos capacitación técnica y operativa a su personal médico para el uso adecuado de los equipos." },
        { icon: <Package className="w-8 h-8 text-[#00A8CC]" />, title: "Partes y Accesorios", desc: "Contamos con un amplio inventario de repuestos originales y sensores para mantener sus equipos funcionando." }
    ];

    return (
        <div className="relative bg-white min-h-screen text-slate-800 font-sans">
            {/* Premium Hybrid Hero Banner (Inspirado en DREMED) */}
            <section className="relative bg-[#07162c] overflow-hidden py-16 md:py-24 lg:py-32 border-b-4 border-cyan-500">
                {/* Background Image with elegant overlay */}
                <div className="absolute inset-0 z-0 select-none">
                    <img
                        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000"
                        alt="Doctores Quirófano"
                        className="w-full h-full object-cover opacity-15"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#07162c] via-[#07162c]/90 to-transparent"></div>
                </div>

                <div className="container mx-auto px-4 max-w-7xl relative z-10">
                    <div className="max-w-3xl space-y-6">
                        
                        {/* 1. MOBILE SEARCH INPUT (Visible ONLY on mobile, placed FIRST) */}
                        <div className="block lg:hidden w-full">
                            <form action="/productos" method="GET" className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-lg">
                                <div className="relative flex-1 flex items-center">
                                    <Search className="absolute left-3.5 text-slate-400 shrink-0" size={16} />
                                    <input 
                                        type="text"
                                        name="q"
                                        placeholder="BUSCAR EQUIPO..."
                                        className="w-full bg-transparent text-slate-800 text-xs py-2.5 pl-9 pr-3 transition-colors placeholder-slate-400 font-semibold focus:outline-none"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="bg-[#00A8CC] hover:bg-[#0092b3] active:scale-[0.98] text-white text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-cyan-500/10 cursor-pointer uppercase tracking-wider shrink-0"
                                >
                                    <span>Buscar</span>
                                </button>
                            </form>
                        </div>

                        {/* Tagline */}
                        <div className="inline-flex bg-cyan-500/10 border border-cyan-500/35 text-cyan-400 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider select-none">
                            Tu Socio Tecnológico en Salud
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                            Equipos Médicos Nuevos y <span className="text-[#00A8CC]">Remanufacturados</span>.
                        </h1>

                        {/* Description */}
                        <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl">
                            El proveedor de confianza para hospitales, clínicas de cirugía y centros de atención en Honduras. Equipos certificados, calibrados y listos para salvar vidas.
                        </p>

                        {/* 2. DESKTOP SEARCH INPUT (Visible ONLY on desktop, placed after description) */}
                        <div className="hidden lg:block w-full max-w-lg">
                            <form action="/productos" method="GET" className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-3xl shadow-sm focus-within:shadow-md focus-within:border-cyan-400 transition-all duration-300">
                                <div className="relative flex-1 flex items-center">
                                    <Search className="absolute left-4 text-slate-400 shrink-0" size={18} />
                                    <input 
                                        type="text"
                                        name="q"
                                        placeholder="Buscar equipos (ej. Monitores, Camas, Ecógrafos)..."
                                        className="w-full bg-transparent text-slate-800 text-xs sm:text-sm py-3.5 pl-11 pr-3 transition-colors placeholder-slate-400 font-semibold focus:outline-none"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="bg-[#00A8CC] hover:bg-[#0092b3] active:scale-[0.98] text-white text-xs sm:text-sm font-bold px-6 py-3.5 rounded-2xl transition-all shadow-sm shadow-cyan-550/15 cursor-pointer uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                                >
                                    <span>Buscar</span>
                                </button>
                            </form>
                        </div>

                        {/* Quick Search Pills (Scrollable horizontally on mobile, matching dark banner) */}
                        <div className="w-full max-w-xl overflow-hidden pt-1">
                            <div className="flex items-center justify-start gap-2 overflow-x-auto pb-3 -mb-3 scrollbar-none snap-x snap-mandatory">
                                {[
                                    { label: "Camas de Hospital", category: "Cama de Hospital", icon: <Package size={13} /> },
                                    { label: "Monitores", category: "Monitores de Pacientes", icon: <Activity size={13} /> },
                                    { label: "Ultrasonidos", category: "Ultrasonidos", icon: <Wrench size={13} /> },
                                    { label: "Anestesia", category: "Máquinas de Anestesia", icon: <Clock size={13} /> },
                                    { label: "Desfibriladores", category: "Desfibriladores", icon: <ShieldCheck size={13} /> },
                                    { label: "Quirófano", category: "Mesas Quirúrgicas", icon: <Settings size={13} /> }
                                ].map((pill, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/productos?category=${encodeURIComponent(pill.category)}`}
                                        className="snap-center flex items-center gap-1.5 px-3.5 py-1.5 border border-white/10 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0"
                                    >
                                        <span className="text-gray-450 group-hover:text-cyan-400">{pill.icon}</span>
                                        <span>{pill.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 pt-2">
                            <Link href="/productos" className="bg-[#00A8CC] hover:bg-[#008ba8] text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-cyan-500/10 transition-all flex items-center gap-2 text-xs uppercase tracking-wider">
                                Ver Catálogo Completo <ChevronRight className="w-4 h-4" />
                            </Link>
                            <Link href="/contacto" className="bg-white/10 text-white backdrop-blur-sm border border-white/10 px-8 py-3.5 rounded-full font-bold hover:bg-white/20 transition-colors text-xs uppercase tracking-wider">
                                Solicitar Cotización
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Trust Bar */}
            <div className="bg-white border-b py-5 hidden md:block select-none">
                <div className="container mx-auto px-4 max-w-7xl flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#00A8CC]" /> Nuevos y Remanufacturados</div>
                    <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#00A8CC]" /> Calidad Certificada</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#00A8CC]" /> Soporte Técnico 24/7</div>
                    <div className="flex items-center gap-1.5"><Package className="w-4 h-4 text-[#00A8CC]" /> Envío a Nivel Nacional</div>
                    <div className="flex items-center gap-1.5"><Wrench className="w-4 h-4 text-[#00A8CC]" /> Mantenimiento Preventivo</div>
                </div>
            </div>

            {/* Popular Categories */}
            <section className="py-20 container mx-auto px-4 max-w-7xl bg-white">
                <div className="flex justify-between items-end mb-10 border-l-4 border-[#00A8CC] pl-4">
                    <div>
                        <h3 className="text-3xl font-extrabold text-[#0B1E36]">Categorías Populares</h3>
                        <p className="text-slate-550 mt-2">Explora nuestra amplia gama de equipos por especialidad.</p>
                    </div>
                    <Link href="/productos" className="hidden md:flex items-center gap-2 text-[#00A8CC] font-bold hover:underline">
                        Ver todas las categorías <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categorias.map((cat, idx) => (
                        <Link 
                            href={cat.href || `/productos?category=${encodeURIComponent(cat.titulo)}`}
                            key={idx} 
                            className="group relative h-72 rounded-2xl overflow-hidden cursor-pointer shadow-sm block"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={cat.img}
                                alt={cat.titulo}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#07162c] via-[#07162c]/65 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>

                            <div className="absolute bottom-0 left-0 w-full p-6">
                                <h4 className="text-white font-bold text-lg mb-1">{cat.titulo}</h4>
                                <p className="text-[#00A8CC] text-xs font-bold flex items-center gap-1 opacity-0 translate-y-3 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                    Explorar Equipos <ChevronRight className="w-3.5 h-3.5" />
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* DRE Finder Tool Integration (The 60-Second Equipment Finder - Light Theme) */}
            <section className="bg-slate-50 py-20 text-slate-800 relative border-t border-b border-slate-100 select-none">
                <div className="container mx-auto px-4 max-w-7xl relative z-10 flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2 space-y-6">
                        <span className="text-[#00A8CC] font-bold text-xs tracking-wider uppercase block">Asesoría Inteligente</span>
                        <h2 className="text-3xl md:text-4xl font-black text-[#0B1E36] leading-tight">Encuentra el Equipo Adecuado en 60 Segundos</h2>
                        <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium">
                            ¿No estás seguro de qué equipo se adapta a tus necesidades? Utiliza nuestra herramienta interactiva para encontrar la solución perfecta para tu centro médico y presupuesto.
                        </p>
                        <ul className="space-y-3 font-semibold text-xs text-slate-600">
                            <li className="flex items-center gap-3"><CheckCircle2 className="text-[#00A8CC]" size={16} /> Selección basada en tu especialidad</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="text-[#00A8CC]" size={16} /> Opciones nuevas y reacondicionadas</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="text-[#00A8CC]" size={16} /> Asistencia de expertos en Honduras</li>
                        </ul>
                    </div>
                    <div className="lg:w-1/2 w-full">
                        <FinderTool />
                    </div>
                </div>
            </section>

            {/* Featured Catalog Items (Dynamic) */}
            <section className="py-20 container mx-auto px-4 max-w-7xl bg-white">
                <div className="flex justify-between items-end mb-10 border-l-4 border-[#00A8CC] pl-4">
                    <div>
                        <h3 className="text-3xl font-extrabold text-[#0B1E36]">Catálogo de Equipos Destacados</h3>
                        <p className="text-slate-550 mt-2">Equipamiento biomédico disponible para entrega inmediata.</p>
                    </div>
                    <Link href="/productos" className="hidden md:flex items-center gap-2 text-[#00A8CC] font-bold hover:underline">
                        Ver Catálogo Completo <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {data.assets.map((item: any) => (
                        <div key={item.id} className="group flex flex-col bg-white border border-slate-150 rounded-2xl overflow-hidden hover:shadow-md hover:border-[#00A8CC]/40 transition-all duration-300 hover:-translate-y-0.5">
                            <Link 
                                href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}`}
                                className="aspect-[4/3] w-full bg-slate-50 border-b flex items-center justify-center relative overflow-hidden block hover:opacity-95 transition-opacity"
                            >
                                {item.imagenUrl ? (
                                    <img 
                                        src={item.imagenUrl} 
                                        alt={item.descripcionCorta} 
                                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                    />
                                ) : (
                                    <Activity className="text-slate-350 w-10 h-10 stroke-[1.2]" />
                                )}
                            </Link>
                            <div className="p-5 flex-1 flex flex-col gap-4 text-xs font-semibold">
                                <div className="space-y-1.5 flex-1">
                                    <span className="text-[9px] font-black bg-cyan-50 border border-cyan-150 text-[#00A8CC] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                                        {item.marca || 'GENÉRICO'}
                                    </span>
                                    <h3 className="font-extrabold text-[#0B1E36] line-clamp-2 leading-tight">
                                        {item.descripcionCorta}
                                    </h3>
                                    {item.modelo && (
                                        <p className="text-[10px] text-slate-400 font-mono font-medium">Mod: {item.modelo}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}`}
                                        className="flex-1 text-center border border-slate-200 hover:bg-slate-50 text-slate-655 py-2.5 rounded-xl transition-colors font-bold"
                                    >
                                        Ficha
                                    </Link>
                                    <Link
                                        href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}?cotizar=true`}
                                        className="flex-1 text-center bg-[#00A8CC] hover:bg-[#0092b3] text-white py-2.5 rounded-xl transition-colors font-bold shadow-sm shadow-cyan-500/10"
                                    >
                                        Cotizar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Support and Services */}
            <section className="py-20 bg-white border-t border-b border-slate-100 animate-fade-in select-none">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[#00A8CC] font-bold text-xs tracking-wider uppercase mb-2 block">Más Que Solo Equipos</span>
                        <h2 className="text-3xl md:text-4xl font-black text-[#0B1E36] mb-4">
                            Soluciones Integrales para tu Quirófano y Clínica
                        </h2>
                        <p className="text-slate-550 text-sm sm:text-base font-medium">
                            Desde la conceptualización hasta el mantenimiento post-venta. Somos tu aliado estratégico en cada paso del proceso médico-hospitalario.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {servicios.map((srv, idx) => (
                            <div key={idx} className="bg-slate-50/50 p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow text-center group">
                                <div className="w-14 h-14 mx-auto bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#00A8CC]/5 group-hover:border-cyan-300 transition-colors">
                                    {srv.icon}
                                </div>
                                <h3 className="text-base font-bold text-[#0B1E36] mb-2">{srv.title}</h3>
                                <p className="text-slate-450 text-[11px] leading-relaxed font-semibold">{srv.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials (Reviews slider - Light Theme) */}
            <section className="py-20 bg-slate-50 text-slate-800 relative border-t border-slate-100 select-none">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-16 space-y-2">
                        <span className="text-[#00A8CC] font-bold text-xs tracking-wider uppercase mb-2 block">Nuestra Reputación</span>
                        <h2 className="text-3xl font-black text-[#0B1E36]">Confiados por Profesionales en Honduras</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {data.reviews.map((review: any) => (
                            <div key={review.id} className="bg-white p-8 rounded-2xl border border-slate-200/60 space-y-4 shadow-sm">
                                <div className="flex gap-1 text-amber-500 mb-2">
                                    {Array.from({ length: review.rating || 5 }).map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                                    ))}
                                </div>
                                <p className="text-slate-550 leading-relaxed italic text-xs font-semibold">
                                    "{review.text}"
                                </p>
                                <div className="flex items-center gap-3 pt-2">
                                    <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center font-bold text-[#00A8CC] text-xs shrink-0 border border-cyan-100">
                                        {review.author.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#0B1E36] text-[11px]">{review.author}</h4>
                                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">{review.date}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
