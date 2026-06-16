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
    Users
} from 'lucide-react';
import Link from 'next/link';

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

interface SomaLandingPageProps {
    data: {
        reviews: any[];
        landingSettings: any;
        assets: any[];
    };
}

export default function SomaLandingPage({ data }: SomaLandingPageProps) {
    const categories = [
        { title: "Anestesia", img: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=400", href: "/productos?q=anestesia" },
        { title: "Autoclaves y Esterilizadores", img: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=400", href: "/productos?q=esterilizador" },
        { title: "Sistemas de Monitoreo Quirúrgico", img: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400", href: "/productos?q=monitoreo" },
        { title: "Bombas de Infusión", img: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=400", href: "/productos?q=infusion" },
        { title: "Cargadores de Baterías", img: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400", href: "/productos?q=cargador" },
        { title: "Calentadores y Mantas", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400", href: "/productos?q=calentador" },
        { title: "Camas de Parto", img: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80&w=400", href: "/productos?q=cama" },
        { title: "C-Arms / Arcos en C", img: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=400", href: "/productos?q=carm" },
        { title: "Desfibriladores", img: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=400", href: "/productos?q=desfibrilador" },
        { title: "Electrocardiógrafos (ECG)", img: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=400", href: "/productos?q=ecg" },
        { title: "Mesas Quirúrgicas", img: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=400", href: "/productos?q=mesa" },
        { title: "Ecógrafos y Ultrasonidos", img: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400", href: "/productos?q=ultrasonido" },
        { title: "Lámparas de Cirugía", img: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=400", href: "/productos?q=lampara" },
        { title: "Monitores de Pacientes", img: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400", href: "/productos?q=monitor" },
        { title: "Respiradores de Anestesia", img: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=400", href: "/productos?q=respirador" },
        { title: "Rayos X Portátiles", img: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=400", href: "/productos?q=rayos" },
        { title: "Mesas de Quirófano", img: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=400", href: "/productos?q=mesa" },
        { title: "Mesas de Tracción", img: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=400", href: "/productos?q=traccion" },
        { title: "Microscopios Quirúrgicos", img: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=400", href: "/productos?q=microscopio" },
        { title: "Vaporizadores de Anestesia", img: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=400", href: "/productos?q=vaporizador" },
        { title: "Sistemas de Fototerapia", img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400", href: "/productos?q=fototerapia" },
        { title: "Incubadoras", img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400", href: "/productos?q=incubadora" },
        { title: "Ultrasonidos", img: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400", href: "/productos?q=ultrasonido" },
        { title: "Ventiladores", img: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=400", href: "/productos?q=ventilador" }
    ];

    return (
        <div className="relative bg-white min-h-screen text-slate-800 theme-soma font-sans">
            {/* Google Font Manrope Injection */}
            <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
            <style dangerouslySetInnerHTML={{ __html: `
                body {
                    font-family: 'Manrope', sans-serif !important;
                }
                h1, h2, h3, h4, h5, h6, nav, a, button, span, p, input, select, textarea {
                    font-family: 'Manrope', sans-serif !important;
                }
                .theme-soma h1, .theme-soma h2, .theme-soma h3, .theme-soma h4 {
                    font-weight: 850;
                }
            `}} />

            {/* Hero Banner (Soma Tech Premium Dark Navy / Left-aligned layout matching screenshot) */}
            <section className="relative bg-[#0b1a30] overflow-hidden py-28 md:py-36 text-white border-b-4 border-[#00509d]">
                {/* Background Image of surgeon tinted blue */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=2000"
                        alt="Médico Cirujano"
                        className="w-full h-full object-cover opacity-35 object-[70%_25%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#03152d] via-[#03152d]/90 to-transparent"></div>
                </div>

                <div className="container mx-auto px-4 max-w-7xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-8 space-y-6 text-left">
                        <span className="text-[#00a8cc] text-xs font-black tracking-widest block uppercase">
                            FABRICANTES MÉDICOS LÍDERES
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white max-w-3xl">
                            Equipo confiable que su instalación necesita
                        </h1>
                        <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                            Nuevo, de demostración y reacondicionado por los mejores fabricantes. Hasta un 50 % por debajo del OEM con el mismo servicio y garantía.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link href="/productos" className="bg-white hover:bg-slate-100 text-[#0b1a30] px-8 py-3.5 rounded-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md uppercase tracking-wider text-xs">
                                Ver Equipo
                            </Link>
                            <Link href="/contacto" className="bg-transparent hover:bg-white/10 text-white border-2 border-white/50 hover:border-white px-8 py-3.5 rounded-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider text-xs">
                                Contacta con nosotros
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Banner Section */}
            <section className="bg-slate-50 border-b py-12">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto space-y-3">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0B1E36] leading-tight uppercase tracking-wide">
                            Soluciones completas de equipos médicos y planificación de nuevos proyectos
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm font-semibold max-w-xl mx-auto">
                            Entendemos todas sus necesidades y podemos ofrecer soluciones para todas sus instalaciones de principio a fin
                        </p>
                    </div>
                </div>
            </section>

            {/* Popular Categories Grid (4 Columns, Title on Top, Image on Bottom, no orange hover) */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex justify-between items-end border-b pb-4 mb-8">
                        <h3 className="text-lg sm:text-xl font-extrabold text-[#0B1E36] uppercase tracking-wide">
                            Categorías Populares
                        </h3>
                        <Link href="/productos" className="text-xs font-bold text-[#00509d] hover:underline flex items-center gap-1">
                            Ver todas las categorías →
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        {categories.map((cat, idx) => (
                            <Link 
                                key={idx}
                                href={cat.href}
                                className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between items-center text-center hover:border-[#00509d] hover:shadow-lg transition-all duration-300 group h-60"
                            >
                                <span className="font-extrabold text-[#0B1E36] text-[11px] sm:text-xs leading-tight mb-2 group-hover:text-[#00509d] transition-colors line-clamp-2">
                                    {cat.title}
                                </span>
                                <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-lg bg-slate-50/50 p-2">
                                    <img 
                                        src={cat.img} 
                                        alt={cat.title} 
                                        className="max-h-28 max-w-full object-contain transition-transform duration-500 group-hover:scale-105" 
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Specialties split screen section (no orange highlights) */}
            <section className="grid grid-cols-1 md:grid-cols-2 border-t border-b">
                <div className="relative min-h-[350px] md:min-h-full">
                    <img 
                        src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=1000" 
                        alt="Personal médico" 
                        className="absolute inset-0 w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-[#03152d]/10"></div>
                </div>
                <div className="bg-[#1b2a47] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center space-y-6">
                    <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wide border-b border-white/10 pb-4">
                        Especialidades de Equipos Médicos
                    </h3>
                    <div className="flex flex-col gap-3 font-semibold text-xs text-white/90">
                        {[
                            "Soluciones de Quirófano de Cirugía",
                            "Soluciones de Cuidado Crítico",
                            "Soluciones de Imagen Diagnóstica",
                            "Soluciones de Ginecología y Obstetricia",
                            "Soluciones de Equipos Médicos de Emergencia",
                            "Soluciones de Equipos Médicos de Neonatología",
                            "Soluciones de Ginecología y Parto"
                        ].map((specialty, index) => (
                            <Link 
                                key={index} 
                                href={`/productos?q=${encodeURIComponent(specialty.replace('Soluciones de ', ''))}`}
                                className="flex justify-between items-center py-2.5 border-b border-white/5 hover:text-[#00a8cc] transition-colors"
                            >
                                <span>{specialty}</span>
                                <ChevronRight size={14} className="text-slate-400" />
                            </Link>
                        ))}
                        <Link href="/productos" className="pt-2 text-xs font-bold text-[#00a8cc] hover:underline flex items-center gap-1">
                            Ver todas las especialidades →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Catalog Items (Dynamic) */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex justify-between items-end border-b pb-4 mb-8">
                        <h3 className="text-lg sm:text-xl font-extrabold text-[#0B1E36] uppercase tracking-wide">
                            Productos Destacados
                        </h3>
                        <Link href="/productos" className="text-xs font-bold text-[#00509d] hover:underline flex items-center gap-1">
                            Ver todos →
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {data.assets.map((item: any) => (
                            <div key={item.id} className="group bg-white border border-slate-200/85 rounded-xl overflow-hidden hover:shadow-lg hover:border-[#00509d] transition-all duration-300 flex flex-col justify-between h-96">
                                <div className="aspect-[4/3] w-full bg-slate-50 flex items-center justify-center border-b relative overflow-hidden p-4">
                                    {item.imagenUrl ? (
                                        <img 
                                            src={item.imagenUrl} 
                                            alt={item.descripcionCorta} 
                                            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-102"
                                        />
                                    ) : (
                                        <Activity className="text-slate-350 w-12 h-12 stroke-[1.2]" />
                                    )}
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-[#00509d] bg-[#00509d]/10 px-2.5 py-0.5 rounded uppercase tracking-wider inline-block">
                                            {item.marca || 'GENÉRICO'}
                                        </span>
                                        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-tight">
                                            {item.descripcionCorta}
                                        </h3>
                                        {item.modelo && (
                                            <p className="text-[10px] text-slate-400 font-mono font-medium">Modelo: {item.modelo}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 text-[10px] font-bold">
                                        <Link
                                            href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}`}
                                            className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-lg border border-slate-200 transition-colors"
                                        >
                                            Ver Ficha
                                        </Link>
                                        <Link
                                            href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.descripcionCorta || '')}?cotizar=true`}
                                            className="flex-1 text-center bg-[#00509d] hover:bg-[#003f7a] text-white py-2.5 rounded-lg transition-all shadow-sm shadow-[#00509d]/15 animate-none"
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

            {/* Blog Section (3 Columns, Spanish Headings) */}
            <section className="py-20 bg-slate-50 border-t border-b">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex justify-between items-end border-b pb-4 mb-8">
                        <h3 className="text-lg sm:text-xl font-extrabold text-[#0B1E36] uppercase tracking-wide">
                            Blog
                        </h3>
                        <Link href="/blog" className="text-xs font-bold text-[#00509d] hover:underline flex items-center gap-1">
                            Ver todo →
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Post 1 */}
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-[360px]">
                            <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                                <img 
                                    src="https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=600" 
                                    alt="Anestesia" 
                                    className="w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-bold text-[#00509d] uppercase tracking-wider block">ANESTESIA · 15 JUN, 2026</span>
                                    <h4 className="font-extrabold text-[#0B1E36] text-xs sm:text-sm leading-snug hover:text-[#00509d] transition-colors cursor-pointer line-clamp-2 uppercase">
                                        ¿CÓMO ELEGIR MÁQUINAS DE ANESTESIA PARA SU CLÍNICA?
                                    </h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3">
                                        Guía completa sobre requerimientos técnicos y normas para la selección de estaciones de anestesia de alto rendimiento.
                                    </p>
                                </div>
                                <Link href="/blog" className="text-xs font-bold text-[#00509d] hover:underline flex items-center gap-1 self-start">
                                    Leer más →
                                </Link>
                            </div>
                        </div>

                        {/* Post 2 */}
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-[360px]">
                            <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                                <img 
                                    src="https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80&w=600" 
                                    alt="Camas de Parto" 
                                    className="w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-bold text-[#00509d] uppercase tracking-wider block">CUIDADO CRÍTICO · 10 JUN, 2026</span>
                                    <h4 className="font-extrabold text-[#0B1E36] text-xs sm:text-sm leading-snug hover:text-[#00509d] transition-colors cursor-pointer line-clamp-2 uppercase">
                                        10 DETALLES DE CAMAS DE PARTO QUE DEBE CONSIDERAR
                                    </h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3">
                                        Consejos de ergonomía y seguridad para equipar salas de labor y parto de manera óptima para el personal y paciente.
                                    </p>
                                </div>
                                <Link href="/blog" className="text-xs font-bold text-[#00509d] hover:underline flex items-center gap-1 self-start">
                                    Leer más →
                                </Link>
                            </div>
                        </div>

                        {/* Post 3 */}
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-[360px]">
                            <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                                <img 
                                    src="https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=600" 
                                    alt="Equipos Médicos" 
                                    className="w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-bold text-[#00509d] uppercase tracking-wider block">NOVEDADES · 05 JUN, 2026</span>
                                    <h4 className="font-extrabold text-[#0B1E36] text-xs sm:text-sm leading-snug hover:text-[#00509d] transition-colors cursor-pointer line-clamp-2 uppercase">
                                        SOMA TECHNOLOGY ADQUIERE NUEVOS EQUIPOS
                                    </h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3">
                                        Nuestra afiliación con Soma Technology expande el portafolio local para cotización de equipos importados con garantía certificada.
                                    </p>
                                </div>
                                <Link href="/blog" className="text-xs font-bold text-[#00509d] hover:underline flex items-center gap-1 self-start">
                                    Leer más →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
