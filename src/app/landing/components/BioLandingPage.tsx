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
        <div className="relative bg-gray-50 min-h-screen text-slate-800 font-sans">
            {/* Premium Hybrid Hero Banner */}
            <section className="relative bg-[#07162c] overflow-hidden py-24 md:py-32 border-b-4 border-cyan-550">
                {/* Background Image with elegant overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000"
                        alt="Doctores Quirófano"
                        className="w-full h-full object-cover opacity-15"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#07162c] via-[#07162c]/90 to-transparent"></div>
                </div>

                <div className="container mx-auto px-4 max-w-7xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            Tu Socio Tecnológico en Salud
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                            Equipos Médicos Nuevos y <span className="text-[#00A8CC]">Remanufacturados</span>.
                        </h1>
                        <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-xl mb-6">
                            El proveedor de confianza para hospitales, clínicas de cirugía y centros de atención en Honduras. Equipos certificados, calibrados y listos para salvar vidas.
                        </p>

                        <form action="/productos" method="GET" className="max-w-md w-full relative mb-8">
                            <input 
                                type="text"
                                name="q"
                                placeholder="Buscar equipos médicos (ej. Ultrasonido)..."
                                className="w-full bg-white/10 focus:bg-white text-white focus:text-slate-900 border border-white/20 focus:border-[#00A8CC] rounded-full text-xs sm:text-sm py-3.5 pl-12 pr-4 transition-all placeholder-gray-400 font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A8CC]/20"
                            />
                            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                        </form>

                        <div className="flex flex-wrap gap-4 pt-2">
                            <Link href="/productos" className="bg-[#00A8CC] hover:bg-[#008ba8] text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-cyan-550/20 transition-all flex items-center gap-2">
                                Ver Catálogo Completo <ChevronRight className="w-5 h-5" />
                            </Link>
                            <Link href="/contacto" className="bg-white/10 text-white backdrop-blur-sm border border-white/20 px-8 py-3.5 rounded-full font-bold hover:bg-white/20 transition-colors">
                                Solicitar Cotización
                            </Link>
                        </div>
                    </div>

                    <div className="hidden lg:block relative">
                        {/* Dynamic Interactive Stats Dashboard style widget */}
                        <div className="bg-[#0e223d]/80 backdrop-blur border border-slate-700/50 rounded-3xl p-8 space-y-6 shadow-2xl relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider border-b border-slate-800 pb-2">Alcance & Respaldo</h3>
                            
                            <div className="grid grid-cols-3 gap-6 text-center">
                                <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 hover:border-cyan-500/30 transition-all">
                                    <h4 className="text-3xl font-extrabold text-cyan-400">15+</h4>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Años de Exp.</p>
                                </div>
                                <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 hover:border-cyan-500/30 transition-all">
                                    <h4 className="text-3xl font-extrabold text-cyan-400">100+</h4>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Hospitales</p>
                                </div>
                                <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 hover:border-cyan-500/30 transition-all">
                                    <h4 className="text-3xl font-extrabold text-cyan-400">12</h4>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Meses Gar.</p>
                                </div>
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-300 leading-normal flex items-start gap-3">
                                <ShieldCheck size={18} className="shrink-0 text-cyan-400" />
                                <span>Calibración verificada con analizadores de grado médico antes de cada entrega para asegurar precisión absoluta.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Trust Bar */}
            <div className="bg-white border-b py-6 hidden md:block">
                <div className="container mx-auto px-4 max-w-7xl flex justify-between items-center text-sm font-semibold text-[#0B1E36]">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#00A8CC]" /> Nuevos y Remanufacturados</div>
                    <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#00A8CC]" /> Calidad Certificada</div>
                    <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-[#00A8CC]" /> Soporte Técnico 24/7</div>
                    <div className="flex items-center gap-2"><Package className="w-5 h-5 text-[#00A8CC]" /> Envío a Nivel Nacional</div>
                    <div className="flex items-center gap-2"><Wrench className="w-5 h-5 text-[#00A8CC]" /> Mantenimiento Preventivo</div>
                </div>
            </div>

            {/* Popular Categories */}
            <section className="py-20 container mx-auto px-4 max-w-7xl">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h3 className="text-3xl font-extrabold text-[#0B1E36]">Categorías Populares</h3>
                        <p className="text-slate-500 mt-2">Explora nuestra amplia gama de equipos por especialidad.</p>
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
                            className="group relative h-72 rounded-2xl overflow-hidden cursor-pointer shadow-md block"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={cat.img}
                                alt={cat.titulo}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#07162c] via-[#07162c]/60 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>

                            <div className="absolute bottom-0 left-0 w-full p-6">
                                <h4 className="text-white font-bold text-xl mb-1">{cat.titulo}</h4>
                                <p className="text-[#00A8CC] text-sm font-semibold flex items-center gap-1 opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                    Explorar Equipos <ChevronRight className="w-4 h-4" />
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* DRE Finder Tool Integration (The 60-Second Equipment Finder) */}
            <section className="bg-[#07162c] py-20 text-white relative">
                <div className="container mx-auto px-4 max-w-7xl relative z-10 flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2 space-y-6">
                        <h2 className="text-4xl font-extrabold text-white leading-tight">Encuentra el Equipo Adecuado en 60 Segundos</h2>
                        <p className="text-gray-300 text-base leading-relaxed">
                            ¿No estás seguro de qué equipo se adapta a tus necesidades? Utiliza nuestra herramienta de recomendación para encontrar la solución perfecta para tu centro médico y presupuesto.
                        </p>
                        <ul className="space-y-4 font-semibold text-xs">
                            <li className="flex items-center gap-3"><CheckCircle2 className="text-[#00A8CC]" /> Selección basada en tu especialidad</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="text-[#00A8CC]" /> Opciones nuevas y reacondicionadas</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="text-[#00A8CC]" /> Asistencia de expertos en Honduras</li>
                        </ul>
                    </div>
                    <div className="lg:w-1/2 w-full text-slate-800">
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
                        <div key={item.id} className="group flex flex-col bg-white border border-gray-250 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#00A8CC] transition-all relative duration-300">
                            <Link 
                                href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}`}
                                className="aspect-[4/3] w-full bg-slate-50 border-b flex items-center justify-center relative overflow-hidden block hover:opacity-95 transition-opacity"
                            >
                                {item.imagenUrl ? (
                                    <img 
                                        src={item.imagenUrl} 
                                        alt={item.descripcionCorta} 
                                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                                    />
                                ) : (
                                    <Activity className="text-slate-300 w-12 h-12 stroke-[1.2]" />
                                )}
                            </Link>
                            <div className="p-5 flex-1 flex flex-col gap-4 text-xs font-semibold">
                                <div className="space-y-1.5 flex-1">
                                    <span className="text-[9px] font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                                        {item.marca || 'GENÉRICO'}
                                    </span>
                                    <h3 className="font-extrabold text-slate-800 line-clamp-2 leading-tight">
                                        {item.descripcionCorta}
                                    </h3>
                                    {item.modelo && (
                                        <p className="text-[10px] text-slate-400 font-mono font-medium">Mod: {item.modelo}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}`}
                                        className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl transition-colors font-bold"
                                    >
                                        Ficha
                                    </Link>
                                    <Link
                                        href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}?cotizar=true`}
                                        className="flex-1 text-center bg-[#00A8CC] hover:bg-[#008ba8] text-white py-2.5 rounded-xl transition-colors font-bold shadow-sm shadow-cyan-550/15"
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
            <section className="py-20 bg-gray-50 border-t border-b animate-fade-in">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[#00A8CC] font-bold text-sm tracking-wider uppercase mb-2 block">Más Que Solo Equipos</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B1E36] mb-4">
                            Más Allá del Equipo: Soluciones Integrales
                        </h2>
                        <p className="text-slate-500 text-lg font-medium">
                            Desde la conceptualización de su quirófano hasta el mantenimiento post-venta. Somos su aliado estratégico en cada paso del proceso médico-hospitalario.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {servicios.map((srv, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow text-center group">
                                <div className="w-16 h-16 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#00A8CC]/10 transition-colors">
                                    {srv.icon}
                                </div>
                                <h3 className="text-xl font-bold text-[#0B1E36] mb-3">{srv.title}</h3>
                                <p className="text-slate-450 text-xs leading-relaxed font-medium">{srv.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials (Reviews slider) */}
            <section className="py-24 bg-[#07162c] text-white relative">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-16 space-y-2">
                        <span className="text-[#00A8CC] font-bold text-sm tracking-wider uppercase mb-2 block">Nuestra Reputación</span>
                        <h2 className="text-3xl font-black">Confiados por Profesionales en Honduras</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {data.reviews.map((review: any) => (
                            <div key={review.id} className="bg-[#0e223d] p-8 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
                                <div className="flex gap-1 text-[#00A8CC] mb-2">
                                    {Array.from({ length: review.rating || 5 }).map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-current" />
                                    ))}
                                </div>
                                <p className="text-slate-350 leading-relaxed italic font-medium">
                                    "{review.text}"
                                </p>
                                <div className="flex items-center gap-4 pt-2">
                                    <div className="w-10 h-10 rounded-full bg-[#07162c] flex items-center justify-center font-bold text-[#00A8CC] text-sm shrink-0 border border-slate-850">
                                        {review.author.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-xs">{review.author}</h4>
                                        <p className="text-[#00A8CC] text-[10px] font-medium">{review.date}</p>
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
