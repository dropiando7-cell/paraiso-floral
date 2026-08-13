import React from 'react';
import { 
    Phone, 
    Mail, 
    Clock, 
    CheckCircle2, 
    Star, 
    Wrench,
    Package,
    ShieldCheck,
    ChevronRight,
    Settings,
    Users,
    Search,
    Flower2,
    Truck,
    Sparkles,
    HeartHandshake
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

interface DreLandingPageProps {
    data: {
        reviews: any[];
        landingSettings: any;
        assets: any[];
        categories?: any[];
    };
}

export default function DreLandingPage({ data }: DreLandingPageProps) {
    const dbCategories = data.categories || [];
    
    const fallbackCategories = [
        { 
            titulo: "Rosas Importadas", 
            subtitulo: "Selección Premium Ecuador & Colombia", 
            img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Rosas Importadas" 
        },
        { 
            titulo: "Flores de Corte", 
            subtitulo: "Lirios, Girasoles, Claveles y Orquídeas", 
            img: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Flores de Corte" 
        },
        { 
            titulo: "Follajes y Verdes", 
            subtitulo: "Eucalipto, Ruscus y Helechos Frescos", 
            img: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Follajes y Verdes" 
        },
        { 
            titulo: "Bases y Jarrones", 
            subtitulo: "Cerámica, Vidrio, Madera y Canastas", 
            img: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Bases y Jarrones" 
        },
        { 
            titulo: "Espuma y Material Técnico", 
            subtitulo: "Espuma Floral Oasis, Alambres y Herramientas", 
            img: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Espuma Floral" 
        },
        { 
            titulo: "Empaques y Envoltorios", 
            subtitulo: "Papel Koreano, Cintas Satinadas y Cajas", 
            img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Empaques" 
        },
        { 
            titulo: "Arreglos para Eventos", 
            subtitulo: "Diseños Exclusivos para Bodas y Fiestas", 
            img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Arreglos Exclusivos" 
        },
        { 
            titulo: "Orquídeas y Exóticas", 
            subtitulo: "Plantas Vivas y Ramos Premium", 
            img: "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&q=80&w=600", 
            href: "/productos?category=Orquídeas" 
        }
    ];

    const categorias = dbCategories.length > 0 ? dbCategories.slice(0, 8) : fallbackCategories;

    const servicios = [
        { icon: <Truck className="w-8 h-8 text-[#e05688]" />, title: "Venta Mayorista y al Detalle", desc: "Distribución directa de flores importadas y follajes frescos para floristerías, decoradores y organizadores de eventos." },
        { icon: <Sparkles className="w-8 h-8 text-[#e05688]" />, title: "Asesoría en Arreglos", desc: "Le orientamos en la elección de combinación de flores, colores y follajes según la ocasión o temporada." },
        { icon: <Flower2 className="w-8 h-8 text-[#e05688]" />, title: "Cadena de Frío Garantizada", desc: "Conservación a temperatura idónea desde el cultivo importado hasta la entrega final en sus instalaciones." },
        { icon: <Package className="w-8 h-8 text-[#e05688]" />, title: "Suministros y Accesorios", desc: "Amplio catálogo de espuma floral, bases de cerámica/vidrio, listones, papel koreano y tijeras especializadas." }
    ];

    return (
        <div className="relative bg-stone-50 min-h-screen text-slate-800 font-sans">
            {/* Hero Section */}
            <section className="relative bg-[#081c15] overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=2000"
                        alt="Flores Distribuidora Paraíso Floral"
                        className="w-full h-full object-cover opacity-25"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#081c15] via-[#081c15]/90 to-transparent"></div>
                </div>

                <div className="container mx-auto px-4 max-w-7xl relative z-10 py-24 md:py-32">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 bg-[#e05688]/20 border border-[#e05688]/40 text-[#ff70a6] text-xs font-bold px-3.5 py-1.5 rounded-full mb-6 uppercase tracking-wider">
                            <Sparkles size={14} /> Distribuidora Mayorista y al Detalle
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
                            Flores Frescas, Arreglos y <span className="text-[#ff70a6]">Suministros Florales</span> en Honduras.
                        </h2>
                        <p className="text-emerald-100/90 text-lg mb-8 max-w-2xl leading-relaxed font-medium">
                            El aliado principal para floristerías, decoradores y organizadores de eventos. Rosas importadas de selección, follajes frescos, bases, espuma floral y empaques premium.
                        </p>

                        <form action="/productos" method="GET" className="max-w-md w-full relative mb-8">
                            <input 
                                type="text"
                                name="q"
                                placeholder="Buscar rosas, lirios, bases, espuma floral..."
                                className="w-full bg-white/10 focus:bg-white text-white focus:text-slate-900 border border-white/20 focus:border-[#e05688] rounded-full text-xs sm:text-sm py-3.5 pl-12 pr-4 transition-all placeholder-emerald-100/60 font-semibold focus:outline-none focus:ring-2 focus:ring-[#e05688]/30"
                            />
                            <Search className="absolute left-4 top-3.5 text-emerald-100/60" size={18} />
                        </form>

                        <div className="flex flex-wrap gap-4 mb-16">
                            <Link href="/productos" className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 border border-emerald-500/30">
                                Ver Catálogo Floral <ChevronRight className="w-5 h-5" />
                            </Link>
                            <Link href="/contacto" className="bg-white/10 text-white backdrop-blur-sm border border-white/20 px-8 py-3.5 rounded-full font-bold hover:bg-white/20 transition-all">
                                Cotizar Pedido Mayorista
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-8 border-t border-emerald-800/40 pt-8">
                            <div>
                                <h4 className="text-3xl font-extrabold text-white mb-1">10+</h4>
                                <p className="text-emerald-200/70 text-xs uppercase tracking-wider font-semibold">Años de Trayectoria</p>
                            </div>
                            <div>
                                <h4 className="text-3xl font-extrabold text-white mb-1">200+</h4>
                                <p className="text-emerald-200/70 text-xs uppercase tracking-wider font-semibold">Floristerías Atendidas</p>
                            </div>
                            <div>
                                <h4 className="text-3xl font-extrabold text-white mb-1">100%</h4>
                                <p className="text-emerald-200/70 text-xs uppercase tracking-wider font-semibold">Cadena de Frío</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Badges / Features Bar */}
            <div className="bg-white border-b py-6 hidden md:block">
                <div className="container mx-auto px-4 max-w-7xl flex justify-between items-center text-sm font-semibold text-[#1b4332]">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#e05688]" /> Rosas Importadas de Calidad</div>
                    <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#e05688]" /> Frescura 100% Garantizada</div>
                    <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-[#e05688]" /> Despachos Rápidos a Nivel Nacional</div>
                    <div className="flex items-center gap-2"><Package className="w-5 h-5 text-[#e05688]" /> Suministros y Accesorios Florales</div>
                    <div className="flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-[#e05688]" /> Precios Especiales a Mayoristas</div>
                </div>
            </div>

            {/* Popular Categories */}
            <section className="py-20 container mx-auto px-4 max-w-7xl">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h3 className="text-3xl font-extrabold text-[#1b4332]">Categorías Destacadas</h3>
                        <p className="text-gray-500 mt-2">Explora nuestra colección de flores, follajes y suministros florales.</p>
                    </div>
                    <Link href="/productos" className="hidden md:flex items-center gap-2 text-[#e05688] font-bold hover:underline">
                        Ver todo el catálogo <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categorias.map((cat, idx) => (
                        <Link 
                            href={cat.href || `/productos?category=${encodeURIComponent(cat.titulo)}`}
                            key={idx} 
                            className="group relative h-72 rounded-2xl overflow-hidden cursor-pointer shadow-md block border border-slate-200/60"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={cat.img}
                                alt={cat.titulo}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#081c15] via-[#081c15]/60 to-transparent opacity-85 transition-opacity group-hover:opacity-95"></div>

                            <div className="absolute bottom-0 left-0 w-full p-6">
                                <h4 className="text-white font-bold text-xl mb-1">{cat.titulo}</h4>
                                <p className="text-emerald-200 text-xs font-semibold mb-2 opacity-90">{cat.subtitulo}</p>
                                <p className="text-[#ff70a6] text-xs font-bold flex items-center gap-1 opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                    Explorar Sección <ChevronRight className="w-4 h-4" />
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Find Right Flowers & Supplies */}
            <section className="bg-[#081c15] py-20 relative overflow-hidden text-white">
                <div className="absolute right-0 top-0 w-1/2 h-full bg-[#e05688]/5 skew-x-12 translate-x-32 hidden lg:block"></div>
                <div className="container mx-auto px-4 max-w-7xl relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <h2 className="text-4xl font-extrabold mb-6 leading-tight">Encuentra los Productos Adecuados para tu Negocio</h2>
                            <p className="text-emerald-100/90 mb-8 text-lg font-medium">
                                ¿Buscas abastecer tu floristería o armar un pedido especial para un evento o boda? Utiliza nuestro recomendador rápido.
                            </p>
                            <ul className="space-y-4 text-emerald-100 font-semibold">
                                <li className="flex items-center gap-3"><CheckCircle2 className="text-[#ff70a6]" /> Selección de rosas por color y longitud de tallo</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="text-[#ff70a6]" /> Suministros completos (espuma floral, bases y papel)</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="text-[#ff70a6]" /> Envíos asegurados en San Pedro Sula y todo Honduras</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="text-[#ff70a6]" /> Precios preferenciales por volumen y paquetes</li>
                            </ul>
                        </div>

                        <div className="lg:w-1/2 w-full text-slate-800">
                            <FinderTool />
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Solutions */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="md:w-1/2">
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800"
                                    alt="Diseños Florales Paraíso Floral"
                                    className="w-full h-auto object-cover"
                                />
                                <div className="absolute inset-0 bg-[#1b4332]/10 mix-blend-multiply"></div>
                            </div>
                        </div>

                        <div className="md:w-1/2">
                            <span className="text-[#e05688] font-bold text-xs tracking-wider uppercase mb-2 block">Atención Mayorista y Detallista</span>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1b4332] mb-6 leading-tight">
                                Calidad, Frescura y Variedad en Cada Entrega
                            </h2>
                            <p className="text-gray-600 mb-8 text-lg font-medium">
                                En Distribuidora Paraíso Floral nos especializamos en proveer flores de la más alta calidad con conservación impecable. Desde la floristería de vecindario hasta producciones a gran escala de bodas y banquetes.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-slate-700">
                                <div className="flex gap-4">
                                    <Clock className="w-8 h-8 text-[#e05688] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#1b4332]">Recepción Constante</h4>
                                        <p className="text-xs text-gray-500 font-medium">Llegadas periódicas de flores recién cortadas.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <ShieldCheck className="w-8 h-8 text-[#e05688] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#1b4332]">Control de Frescura</h4>
                                        <p className="text-xs text-gray-500 font-medium">Inspección de botón, tallo y hoja antes del empaque.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Sparkles className="w-8 h-8 text-[#e05688] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#1b4332]">Empaques Especiales</h4>
                                        <p className="text-xs text-gray-500 font-medium">Papeles koreanos, cintas satinadas y envoltorios de lujo.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Package className="w-8 h-8 text-[#e05688] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#1b4332]">Stock Completo</h4>
                                        <p className="text-xs text-gray-500 font-medium">Disponibilidad de insumos para entrega inmediata.</p>
                                    </div>
                                </div>
                            </div>

                            <Link href="/contacto" className="inline-block bg-[#1b4332] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#2d6a4f] transition-all shadow-md">
                                Contactar un Asesor Floral
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Complete Service Solutions Grid */}
            <section className="py-20 bg-stone-100/70 border-t border-b">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[#e05688] font-bold text-xs tracking-wider uppercase mb-2 block">Nuestros Servicios</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#1b4332] mb-4">
                            Todo lo que Tu Negocio Floral Necesita
                        </h2>
                        <p className="text-gray-600 text-lg font-medium">
                            Ofrecemos soluciones integrales para que tus eventos y arreglos luzcan espectaculares.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {servicios.map((srv, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200/80 hover:shadow-xl transition-all text-center group">
                                <div className="w-16 h-16 mx-auto bg-stone-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#e05688]/10 transition-colors">
                                    {srv.icon}
                                </div>
                                <h3 className="text-xl font-bold text-[#1b4332] mb-3">{srv.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed font-medium">{srv.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 bg-[#081c15] text-white relative">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-16">
                        <span className="text-[#ff70a6] font-bold text-xs tracking-wider uppercase mb-2 block">Testimonios de Clientes</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Opiniones de Floristerías y Diseñadores</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {data.reviews.map((review: any) => (
                            <div key={review.id} className="bg-[#112d22] p-8 rounded-2xl border border-emerald-800/40 space-y-4">
                                <div className="flex gap-1 text-[#ff70a6] mb-2">
                                    {Array.from({ length: review.rating || 5 }).map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-current" />
                                    ))}
                                </div>
                                <p className="text-emerald-100/90 leading-relaxed italic font-medium">
                                    "{review.text}"
                                </p>
                                <div className="flex items-center gap-4 pt-2">
                                    <div className="w-10 h-10 rounded-full bg-[#1b4332] flex items-center justify-center font-bold text-[#ff70a6] text-sm shrink-0 border border-emerald-700">
                                        {review.author.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-xs">{review.author}</h4>
                                        <p className="text-emerald-300 text-[10px] font-medium">{review.date}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Bottom */}
            <section className="bg-[#1b4332] py-16">
                <div className="container mx-auto px-4 max-w-4xl text-center text-white">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4">¿Listo para Realizar tu Pedido de Flores?</h2>
                    <p className="text-emerald-100 text-lg mb-8 font-medium">
                        Contáctanos hoy mismo. Nuestro equipo de asesores florales está listo para brindarte precios mayoristas y cotizaciones a medida.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/contacto" className="bg-[#e05688] hover:bg-[#d81b60] text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-lg text-center">
                            Solicitar Cotización por WhatsApp
                        </Link>
                        <Link href="/contacto" className="bg-[#081c15] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#112d22] transition-all shadow-lg text-center border border-emerald-500/20">
                            Ver Datos de Contacto
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
