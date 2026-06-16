import React from 'react';
import { 
    MapPin, 
    Phone, 
    Mail, 
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
import FinderTool from './FinderTool';

interface DreLandingPageProps {
    data: {
        reviews: any[];
        landingSettings: any;
        assets: any[];
    };
}

export default function DreLandingPage({ data }: DreLandingPageProps) {
    const categorias = [
        { id: 1, titulo: "Máquinas de Anestesia", subtitulo: "Sistemas Completos", img: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=600" },
        { id: 2, titulo: "Monitores de Pacientes", subtitulo: "Signos Vitales y UCI", img: "/categorias/monitores.png" },
        { id: 3, titulo: "Mesas Quirúrgicas", subtitulo: "Hidráulicas y Eléctricas", img: "/categorias/mesas.png" },
        { id: 4, titulo: "Lámparas Quirúrgicas", subtitulo: "LED de alta intensidad", img: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600" },
        { id: 5, titulo: "Electrobisturís", subtitulo: "Corte y Coagulación", img: "/categorias/electrobisturi.png" },
        { id: 6, titulo: "Ultrasonidos", subtitulo: "Imágenes Diagnósticas", img: "/categorias/ultrasonidos.png" },
        { id: 7, titulo: "Desfibriladores", subtitulo: "DEA y Clínicos", img: "/categorias/desfibriladores.png" },
        { id: 8, titulo: "Terapia Respiratoria", subtitulo: "Ventiladores y CPAP", img: "/categorias/respiratoria.png" }
    ];

    const servicios = [
        { icon: <Settings className="w-8 h-8 text-[#00A8CC]" />, title: "Planificación de Equipos", desc: "Nuestros expertos le ayudan a diseñar y seleccionar la mejor configuración para su clínica o quirófano." },
        { icon: <Wrench className="w-8 h-8 text-[#00A8CC]" />, title: "Instalación", desc: "Técnicos certificados realizan la instalación completa y pruebas de calibración bajo normativas médicas." },
        { icon: <Users className="w-8 h-8 text-[#00A8CC]" />, title: "Entrenamiento", desc: "Brindamos capacitación técnica y operativa a su personal médico para el uso adecuado de los equipos." },
        { icon: <Package className="w-8 h-8 text-[#00A8CC]" />, title: "Partes y Accesorios", desc: "Contamos con un amplio inventario de repuestos originales y sensores para mantener sus equipos funcionando." }
    ];

    return (
        <div className="relative bg-gray-50 min-h-screen text-slate-800">
            {/* Hero Section */}
            <section className="relative bg-[#0B1E36] overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000"
                        alt="Doctores Quirófano"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0B1E36] via-[#0B1E36]/90 to-transparent"></div>
                </div>

                <div className="container mx-auto px-4 max-w-7xl relative z-10 py-24 md:py-32">
                    <div className="max-w-3xl">
                        <div className="inline-block bg-[#00A8CC]/20 border border-[#00A8CC]/50 text-[#00A8CC] text-xs font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
                            Tu Socio Tecnológico en Salud
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
                            Equipos Médicos Nuevos y <span className="text-[#00A8CC]">Remanufacturados</span>.
                            <br /> Una Sola Fuente. Opciones Ilimitadas.
                        </h2>
                        <p className="text-gray-300 text-lg mb-10 max-w-2xl leading-relaxed">
                            El proveedor de confianza para hospitales, clínicas de cirugía y centros de atención en Honduras. Equipos certificados, calibrados y listos para salvar vidas.
                        </p>

                        <div className="flex flex-wrap gap-4 mb-16">
                            <Link href="/productos" className="bg-[#00A8CC] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#008ba8] transition-colors flex items-center gap-2">
                                Ver Catálogo de Equipos <ChevronRight className="w-5 h-5" />
                            </Link>
                            <Link href="/contacto" className="bg-white/10 text-white backdrop-blur-sm border border-white/20 px-8 py-3.5 rounded-full font-bold hover:bg-white/20 transition-colors">
                                Solicitar Cotización
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-8 border-t border-white/10 pt-8">
                            <div>
                                <h4 className="text-3xl font-extrabold text-white mb-1">15+</h4>
                                <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Años de Experiencia</p>
                            </div>
                            <div>
                                <h4 className="text-3xl font-extrabold text-white mb-1">100+</h4>
                                <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Hospitales Equipados</p>
                            </div>
                            <div>
                                <h4 className="text-3xl font-extrabold text-white mb-1">12</h4>
                                <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Meses de Garantía</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Badges / Features Bar */}
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
                        <p className="text-gray-500 mt-2">Explora nuestra amplia gama de equipos por especialidad.</p>
                    </div>
                    <Link href="/productos" className="hidden md:flex items-center gap-2 text-[#00A8CC] font-bold hover:underline">
                        Ver todas las categorías <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categorias.map((cat) => (
                        <Link 
                            href={`/productos?q=${cat.titulo}`}
                            key={cat.id} 
                            className="group relative h-72 rounded-2xl overflow-hidden cursor-pointer shadow-md block"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={cat.img}
                                alt={cat.titulo}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            {/* GRADIENTE AZUL ESTILO IMAGEN ORIGINAL */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1E36] via-[#0B1E36]/60 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>

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

            {/* Find Right Equipment (60 Seconds) */}
            <section className="bg-[#0B1E36] py-20 relative overflow-hidden text-white">
                <div className="absolute right-0 top-0 w-1/2 h-full bg-[#00A8CC]/5 skew-x-12 translate-x-32 hidden lg:block"></div>
                <div className="container mx-auto px-4 max-w-7xl relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <h2 className="text-4xl font-extrabold mb-6 leading-tight">Encuentra el Equipo Adecuado en 60 Segundos</h2>
                            <p className="text-gray-300 mb-8 text-lg">
                                ¿No estás seguro de qué equipo se adapta a tus necesidades? Utiliza nuestra herramienta de recomendación para encontrar la solución perfecta para tu centro médico y presupuesto.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 font-semibold"><CheckCircle2 className="text-[#00A8CC]" /> Selección basada en tu especialidad</li>
                                <li className="flex items-center gap-3 font-semibold"><CheckCircle2 className="text-[#00A8CC]" /> Opciones nuevas y reacondicionadas</li>
                                <li className="flex items-center gap-3 font-semibold"><CheckCircle2 className="text-[#00A8CC]" /> Asistencia de expertos en Honduras</li>
                                <li className="flex items-center gap-3 font-semibold"><CheckCircle2 className="text-[#00A8CC]" /> Presupuestos rápidos y sin compromiso</li>
                            </ul>
                        </div>

                        <div className="lg:w-1/2 w-full text-slate-800">
                            <FinderTool />
                        </div>
                    </div>
                </div>
            </section>

            {/* Flexible Rental / Mantenimiento */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="md:w-1/2">
                            <div className="relative rounded-2xl overflow-hidden shadow-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/tecnico_biomedico.png"
                                    alt="Técnico Biomédico"
                                    className="w-full h-auto object-cover"
                                />
                                <div className="absolute inset-0 bg-[#00A8CC]/10 mix-blend-multiply"></div>
                            </div>
                        </div>

                        <div className="md:w-1/2">
                            <span className="text-[#00A8CC] font-bold text-sm tracking-wider uppercase mb-2 block">Servicio Técnico Especializado</span>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B1E36] mb-6 leading-tight">
                                Soluciones de Mantenimiento Preventivo y Correctivo
                            </h2>
                            <p className="text-gray-600 mb-8 text-lg font-semibold">
                                La vida útil y precisión de sus equipos médicos son cruciales. Nuestro equipo de ingenieros biomédicos en Bioelectrónica Honduras ofrece pólizas de mantenimiento que garantizan cero tiempo de inactividad.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-slate-650">
                                <div className="flex gap-4">
                                    <Clock className="w-8 h-8 text-[#00A8CC] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#0B1E36]">Respuesta Rápida</h4>
                                        <p className="text-xs text-gray-500 font-medium">Atención a emergencias en todo el territorio nacional.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <ShieldCheck className="w-8 h-8 text-[#00A8CC] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#0B1E36]">Calidad Certificada</h4>
                                        <p className="text-xs text-gray-500 font-medium">Calibración con analizadores de grado médico.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Wrench className="w-8 h-8 text-[#00A8CC] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#0B1E36]">Reparación de Tarjetas</h4>
                                        <p className="text-xs text-gray-500 font-medium">Especialistas en microelectrónica de equipos.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Package className="w-8 h-8 text-[#00A8CC] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-[#0B1E36]">Stock de Repuestos</h4>
                                        <p className="text-xs text-gray-500 font-medium">Inventario local para evitar largas esperas de importación.</p>
                                    </div>
                                </div>
                            </div>

                            <Link href="/contacto" className="inline-block bg-[#00A8CC] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#008ba8] transition-colors">
                                Contactar Servicio Técnico
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Complete Service Solutions */}
            <section className="py-20 bg-gray-50 border-t border-b">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[#00A8CC] font-bold text-sm tracking-wider uppercase mb-2 block">Más Que Solo Equipos</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B1E36] mb-4">
                            Más Allá del Equipo: Soluciones Integrales
                        </h2>
                        <p className="text-gray-600 text-lg font-medium">
                            Desde la conceptualización de su quirófano hasta el mantenimiento post-venta. Somos su aliado estratégico en cada paso del proceso médico-hospitalario.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {servicios.map((srv, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow text-center group">
                                <div className="w-16 h-16 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#00A8CC]/10 transition-colors">
                                    {srv.icon}
                                </div>
                                <h3 className="text-xl font-bold text-[#0B1E36] mb-3">{srv.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed font-medium">{srv.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Active Products in Catalog Section (Dynamic DB data) */}
            <section className="py-20 container mx-auto px-4 max-w-7xl bg-white">
                <div className="flex justify-between items-end mb-10 border-l-4 border-[#00A8CC] pl-4">
                    <div>
                        <h3 className="text-3xl font-extrabold text-[#0B1E36]">Catálogo de Equipos Destacados</h3>
                        <p className="text-gray-500 mt-2">Equipamiento biomédico disponible para entrega inmediata.</p>
                    </div>
                    <Link href="/productos" className="hidden md:flex items-center gap-2 text-[#00A8CC] font-bold hover:underline">
                        Ver Catálogo Completo <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {data.assets.map((item: any) => (
                        <div key={item.id} className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#00A8CC] transition-all relative duration-300">
                            <div className="aspect-[4/3] w-full bg-slate-50 border-b flex items-center justify-center relative overflow-hidden">
                                {item.imagenUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={item.imagenUrl} 
                                        alt={item.descripcionCorta} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <Activity className="text-slate-300 w-12 h-12 stroke-[1.2]" />
                                )}
                            </div>
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
                                        href={`/productos/${item.id}`}
                                        className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl transition-colors font-bold"
                                    >
                                        Ficha
                                    </Link>
                                    <Link
                                        href={`/productos/${item.id}?cotizar=true`}
                                        className="flex-1 text-center bg-[#00A8CC] hover:bg-[#008ba8] text-white py-2.5 rounded-xl transition-colors font-bold shadow-sm shadow-cyan-500/15"
                                    >
                                        Cotizar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials (Dynamic DB data) */}
            <section className="py-24 bg-[#0B1E36] text-white relative">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-16">
                        <span className="text-[#00A8CC] font-bold text-sm tracking-wider uppercase mb-2 block">Nuestra Reputación</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Confiados por Profesionales en Honduras</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {data.reviews.map((review: any) => (
                            <div key={review.id} className="bg-[#112a4a] p-8 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex gap-1 text-[#00A8CC] mb-2">
                                    {Array.from({ length: review.rating || 5 }).map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-current" />
                                    ))}
                                </div>
                                <p className="text-gray-300 leading-relaxed italic font-medium">
                                    "{review.text}"
                                </p>
                                <div className="flex items-center gap-4 pt-2">
                                    <div className="w-10 h-10 rounded-full bg-[#0B1E36] flex items-center justify-center font-bold text-[#00A8CC] text-sm shrink-0 border border-slate-700">
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

            {/* Serving Healthcare Worldwide / Local */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row items-center gap-16">
                    <div className="md:w-1/2">
                        <span className="text-[#00A8CC] font-bold text-sm tracking-wider uppercase mb-2 block">Alcance Nacional</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B1E36] mb-6 leading-tight">
                            Sirviendo a Instalaciones Médicas en Todo Honduras
                        </h2>
                        <p className="text-gray-650 mb-8 text-lg font-medium">
                            Desde grandes hospitales metropolitanos en Tegucigalpa y San Pedro Sula, hasta clínicas rurales y centros de atención primaria. Nuestro compromiso es democratizar el acceso a tecnología médica de punta, sin importar dónde se encuentre su facilidad.
                        </p>

                        <div className="flex gap-8">
                            <div className="bg-gray-50 p-6 rounded-xl border w-1/3 text-center">
                                <h4 className="text-3xl font-extrabold text-[#0B1E36]">18</h4>
                                <p className="text-gray-500 text-xs font-semibold mt-1">Departamentos Atendidos</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-xl border w-1/3 text-center">
                                <h4 className="text-3xl font-extrabold text-[#0B1E36]">15+</h4>
                                <p className="text-gray-500 text-xs font-semibold mt-1">Años de Servicio</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-xl border w-1/3 text-center">
                                <h4 className="text-3xl font-extrabold text-[#0B1E36]">500+</h4>
                                <p className="text-gray-500 text-xs font-semibold mt-1">Equipos Instalados</p>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-1/2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800"
                            alt="Healthcare Technology"
                            className="rounded-2xl shadow-xl w-full"
                        />
                    </div>
                </div>
            </section>

            {/* CTA Bottom */}
            <section className="bg-[#00A8CC] py-16">
                <div className="container mx-auto px-4 max-w-4xl text-center text-white">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-4">¿Listo para Equipar su Instalación Médica?</h2>
                    <p className="text-white/90 text-lg mb-8 font-medium">
                        Contáctenos hoy mismo. Nuestro equipo de asesores médicos e ingenieros está listo para brindarle la mejor solución tecnológica adaptada a su presupuesto.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/contacto" className="bg-white text-[#0B1E36] px-8 py-3.5 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg text-center">
                            Llamar a Ventas
                        </Link>
                        <Link href="/contacto" className="bg-[#0B1E36] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#112a4a] transition-colors shadow-lg text-center">
                            Solicitar Cotización Online
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
