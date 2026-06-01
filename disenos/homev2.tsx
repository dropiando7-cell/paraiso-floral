import React, { useState } from 'react';
import {
  Search, Phone, Mail, ChevronDown, Wrench, Package, ShieldCheck,
  Clock, Activity, Settings, Users, Star,
  Globe2, CheckCircle2, ChevronRight, Menu, X
} from 'lucide-react';

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Datos Hardcodeados
  const categorias = [
    { id: 1, titulo: "Máquinas de Anestesia", subtitulo: "Sistemas Completos", img: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=600" },
    { id: 2, titulo: "Monitores de Pacientes", subtitulo: "Signos Vitales y UCI", img: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600" },
    { id: 3, titulo: "Mesas Quirúrgicas", subtitulo: "Hidráulicas y Eléctricas", img: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600" },
    { id: 4, titulo: "Lámparas Quirúrgicas", subtitulo: "LED de alta intensidad", img: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=600" },
    { id: 5, titulo: "Electrobisturís", subtitulo: "Corte y Coagulación", img: "https://images.unsplash.com/photo-1583324113626-70df0f4deaab?auto=format&fit=crop&q=80&w=600" },
    { id: 6, titulo: "Ultrasonidos", subtitulo: "Imágenes Diagnósticas", img: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=600" },
    { id: 7, titulo: "Desfibriladores", subtitulo: "DEA y Clínicos", img: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=600" },
    { id: 8, titulo: "Terapia Respiratoria", subtitulo: "Ventiladores y CPAP", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600" }
  ];

  const servicios = [
    { icon: <Settings className="w-8 h-8 text-[#00A8CC]" />, title: "Planificación de Equipos", desc: "Nuestros expertos le ayudan a diseñar y seleccionar la mejor configuración para su clínica o quirófano." },
    { icon: <Wrench className="w-8 h-8 text-[#00A8CC]" />, title: "Instalación", desc: "Técnicos certificados realizan la instalación completa y pruebas de calibración bajo normativas médicas." },
    { icon: <Users className="w-8 h-8 text-[#00A8CC]" />, title: "Entrenamiento", desc: "Brindamos capacitación técnica y operativa a su personal médico para el uso adecuado de los equipos." },
    { icon: <Package className="w-8 h-8 text-[#00A8CC]" />, title: "Partes y Accesorios", desc: "Contamos con un amplio inventario de repuestos originales y sensores para mantener sus equipos funcionando." }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">

      {/* Top Bar */}
      <div className="bg-[#0B1E36] text-white text-xs py-2 px-4 flex justify-between items-center hidden md:flex">
        <div className="flex gap-6 container mx-auto px-4 max-w-7xl">
          <span className="flex items-center gap-2"><Phone className="w-3 h-3 text-[#00A8CC]" /> +504 9999-9999</span>
          <span className="flex items-center gap-2"><Mail className="w-3 h-3 text-[#00A8CC]" /> ventas@bioelectronicahonduras.com</span>
        </div>
        <div className="flex gap-4 px-4">
          <button className="bg-[#00A8CC] hover:bg-[#008ba8] px-4 py-1 rounded-sm font-semibold transition-colors">Centro de Soporte</button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 max-w-7xl py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#0B1E36] rounded-full flex items-center justify-center">
              <Activity className="text-[#00A8CC] w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-[#0B1E36] leading-tight">BIOELECTRONICA</h1>
              <span className="text-[#00A8CC] text-xs font-bold tracking-widest">HONDURAS</span>
            </div>
          </div>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-6 font-semibold text-sm text-[#0B1E36]">
            <a href="#" className="flex items-center gap-1 hover:text-[#00A8CC]">Equipos <ChevronDown className="w-4 h-4" /></a>
            <a href="#" className="flex items-center gap-1 hover:text-[#00A8CC]">Especialidades <ChevronDown className="w-4 h-4" /></a>
            <a href="#" className="flex items-center gap-1 hover:text-[#00A8CC]">Servicios <ChevronDown className="w-4 h-4" /></a>
            <a href="#" className="hover:text-[#00A8CC]">Repuestos</a>
            <a href="#" className="hover:text-[#00A8CC]">Sobre Nosotros</a>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <input
              type="text"
              placeholder="Buscar por equipo, marca o modelo..."
              className="w-full bg-gray-100 border-none py-2.5 pl-4 pr-12 rounded-full focus:ring-2 focus:ring-[#00A8CC] outline-none text-sm"
            />
            <button className="absolute right-1 top-1 bottom-1 bg-[#00A8CC] text-white w-10 rounded-full flex items-center justify-center hover:bg-[#008ba8]">
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden text-[#0B1E36]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu Content */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t p-4 flex flex-col gap-4 shadow-lg absolute w-full">
            <input
              type="text"
              placeholder="Buscar equipos..."
              className="w-full bg-gray-100 py-2 px-4 rounded-md focus:ring-2 focus:ring-[#00A8CC] outline-none text-sm"
            />
            <a href="#" className="font-semibold text-[#0B1E36]">Equipos</a>
            <a href="#" className="font-semibold text-[#0B1E36]">Especialidades</a>
            <a href="#" className="font-semibold text-[#0B1E36]">Servicios Técnicos</a>
            <a href="#" className="font-semibold text-[#0B1E36]">Contacto</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative bg-[#0B1E36] overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
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
            <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              Equipos Médicos Nuevos y <span className="text-[#00A8CC]">Remanufacturados</span>.
              <br /> Una Sola Fuente. Opciones Ilimitadas.
            </h2>
            <p className="text-gray-300 text-lg mb-10 max-w-2xl leading-relaxed">
              El proveedor de confianza para hospitales, clínicas de cirugía y centros de atención en Honduras. Equipos certificados, calibrados y listos para salvar vidas.
            </p>

            <div className="flex flex-wrap gap-4 mb-16">
              <button className="bg-[#00A8CC] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#008ba8] transition-colors flex items-center gap-2">
                Ver Catálogo de Equipos <ChevronRight className="w-5 h-5" />
              </button>
              <button className="bg-white/10 text-white backdrop-blur-sm border border-white/20 px-8 py-3.5 rounded-full font-bold hover:bg-white/20 transition-colors">
                Solicitar Cotización
              </button>
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
          <a href="#" className="hidden md:flex items-center gap-2 text-[#00A8CC] font-bold hover:underline">
            Ver todas las categorías <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categorias.map((cat) => (
            <div key={cat.id} className="group relative h-72 rounded-2xl overflow-hidden cursor-pointer shadow-md">
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
            </div>
          ))}
        </div>
      </section>

      {/* Find Right Equipment (60 Seconds) */}
      <section className="bg-[#0B1E36] py-20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-[#00A8CC]/5 skew-x-12 translate-x-32 hidden lg:block"></div>
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            <div className="lg:w-1/2 text-white">
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

            <div className="lg:w-1/2 w-full">
              <div className="bg-white rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold text-[#0B1E36] text-center mb-6 border-b pb-4">Buscador de Equipos Médicos</h3>
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Instalación</label>
                    <select className="w-full border-gray-300 bg-gray-50 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#00A8CC] outline-none">
                      <option>Seleccione su tipo de clínica...</option>
                      <option>Hospital Privado</option>
                      <option>Clínica de Especialidades</option>
                      <option>Centro Quirúrgico Ambulatorio</option>
                      <option>Consultorio Médico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Categoría del Equipo</label>
                    <select className="w-full border-gray-300 bg-gray-50 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#00A8CC] outline-none">
                      <option>¿Qué está buscando?</option>
                      <option>Máquinas de Anestesia</option>
                      <option>Monitores de Signos Vitales</option>
                      <option>Electrocauterios</option>
                      <option>Lámparas / Mesas Quirúrgicas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Presupuesto Estimado</label>
                    <select className="w-full border-gray-300 bg-gray-50 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#00A8CC] outline-none">
                      <option>Seleccione un rango...</option>
                      <option>Menos de $5,000</option>
                      <option>$5,000 - $15,000</option>
                      <option>Más de $15,000</option>
                    </select>
                  </div>
                  <button type="button" className="w-full bg-[#00A8CC] text-white font-bold py-3.5 rounded-lg hover:bg-[#008ba8] transition-colors mt-4">
                    Buscar Soluciones Ahora
                  </button>
                </form>
              </div>
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
                <img
                  src="https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=800"
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
              <p className="text-gray-600 mb-8 text-lg">
                La vida útil y precisión de sus equipos médicos son cruciales. Nuestro equipo de ingenieros biomédicos en Bioelectrónica Honduras ofrece pólizas de mantenimiento que garantizan cero tiempo de inactividad.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="flex gap-4">
                  <Clock className="w-8 h-8 text-[#00A8CC] shrink-0" />
                  <div>
                    <h4 className="font-bold text-[#0B1E36]">Respuesta Rápida</h4>
                    <p className="text-sm text-gray-500">Atención a emergencias en todo el territorio nacional.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ShieldCheck className="w-8 h-8 text-[#00A8CC] shrink-0" />
                  <div>
                    <h4 className="font-bold text-[#0B1E36]">Calidad Certificada</h4>
                    <p className="text-sm text-gray-500">Calibración con analizadores de grado médico.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Wrench className="w-8 h-8 text-[#00A8CC] shrink-0" />
                  <div>
                    <h4 className="font-bold text-[#0B1E36]">Reparación de Tarjetas</h4>
                    <p className="text-sm text-gray-500">Especialistas en microelectrónica de equipos.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Package className="w-8 h-8 text-[#00A8CC] shrink-0" />
                  <div>
                    <h4 className="font-bold text-[#0B1E36]">Stock de Repuestos</h4>
                    <p className="text-sm text-gray-500">Inventario local para evitar largas esperas de importación.</p>
                  </div>
                </div>
              </div>

              <button className="bg-[#00A8CC] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#008ba8] transition-colors">
                Contactar Servicio Técnico
              </button>
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
            <p className="text-gray-600 text-lg">
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
                <p className="text-gray-500 text-sm leading-relaxed">{srv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#0B1E36] text-white relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <span className="text-[#00A8CC] font-bold text-sm tracking-wider uppercase mb-2 block">Nuestra Reputación</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Confiados por Profesionales en Honduras</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-[#112a4a] p-8 rounded-2xl border border-white/5">
              <div className="flex gap-1 text-[#00A8CC] mb-4">
                <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
              </div>
              <p className="text-gray-300 mb-6 italic">
                "El nivel de profesionalismo de Bioelectrónica Honduras es excepcional. Remodelamos nuestro bloque quirúrgico con sus máquinas de anestesia y monitores, la relación calidad-precio y el respaldo técnico no tienen comparación."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-400 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150" alt="Doctor" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Dr. Carlos Mendoza</h4>
                  <p className="text-[#00A8CC] text-sm">Director Médico, San Pedro Sula</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-[#112a4a] p-8 rounded-2xl border border-white/5">
              <div className="flex gap-1 text-[#00A8CC] mb-4">
                <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
              </div>
              <p className="text-gray-300 mb-6 italic">
                "Como clínica en expansión, necesitábamos un proveedor que no solo vendiera el equipo, sino que nos capacitara. Los ecógrafos que adquirimos llegaron impecables y la calibración fue precisa."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-400 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150" alt="Doctora" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Dra. Ana Flores</h4>
                  <p className="text-[#00A8CC] text-sm">Clínica de Especialidades, Tegucigalpa</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-[#112a4a] p-8 rounded-2xl border border-white/5">
              <div className="flex gap-1 text-[#00A8CC] mb-4">
                <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
              </div>
              <p className="text-gray-300 mb-6 italic">
                "El soporte técnico es su mayor fortaleza. Se nos dañó el electrobisturí un sábado por la noche y el técnico estuvo a primera hora del domingo resolviendo el problema en la tarjeta principal. Totalmente recomendados."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-400 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150" alt="Ingeniero" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Ing. Luis Castillo</h4>
                  <p className="text-[#00A8CC] text-sm">Jefe de Mantenimiento Hospitalario</p>
                </div>
              </div>
            </div>
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
            <p className="text-gray-600 mb-8 text-lg">
              Desde grandes hospitales metropolitanos en Tegucigalpa y San Pedro Sula, hasta clínicas rurales y centros de atención primaria. Nuestro compromiso es democratizar el acceso a tecnología médica de punta, sin importar dónde se encuentre su facilidad.
            </p>

            <div className="flex gap-8">
              <div className="bg-gray-50 p-6 rounded-xl border w-1/3 text-center">
                <h4 className="text-3xl font-extrabold text-[#0B1E36]">18</h4>
                <p className="text-gray-500 text-sm font-semibold mt-1">Departamentos Atendidos</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border w-1/3 text-center">
                <h4 className="text-3xl font-extrabold text-[#0B1E36]">15+</h4>
                <p className="text-gray-500 text-sm font-semibold mt-1">Años de Servicio</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border w-1/3 text-center">
                <h4 className="text-3xl font-extrabold text-[#0B1E36]">500+</h4>
                <p className="text-gray-500 text-sm font-semibold mt-1">Equipos Instalados</p>
              </div>
            </div>
          </div>

          <div className="md:w-1/2">
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
          <p className="text-white/90 text-lg mb-8">
            Contáctenos hoy mismo. Nuestro equipo de asesores médicos e ingenieros está listo para brindarle la mejor solución tecnológica adaptada a su presupuesto.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-white text-[#0B1E36] px-8 py-3.5 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg">
              Llamar a Ventas
            </button>
            <button className="bg-[#0B1E36] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#112a4a] transition-colors shadow-lg">
              Solicitar Cotización Online
            </button>
          </div>
        </div>
      </section>

      {/* Footer Basic */}
      <footer className="bg-[#051120] text-gray-400 py-12 text-sm border-t border-white/10">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-[#00A8CC] w-6 h-6" />
                <h3 className="font-extrabold text-lg text-white">BIOELECTRONICA</h3>
              </div>
              <p className="mb-4">Especialistas en venta, reparación y mantenimiento de equipos médicos en Honduras.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Enlaces Rápidos</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Equipos Nuevos</a></li>
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Equipos Remanufacturados</a></li>
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Servicio Técnico</a></li>
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Soporte</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Solicitar Manuales</a></li>
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Portal de Clientes</a></li>
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Garantías</a></li>
                <li><a href="#" className="hover:text-[#00A8CC] transition-colors">Políticas de Privacidad</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Contacto</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#00A8CC]" /> +504 9999-9999</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#00A8CC]" /> ventas@bioelectronicahonduras.com</li>
                <li className="flex items-start gap-2"><Globe2 className="w-4 h-4 text-[#00A8CC] mt-1 shrink-0" /> San Pedro Sula, Cortés, Honduras.</li>
              </ul>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-white/10">
            <p>&copy; {new Date().getFullYear()} Bioelectrónica Honduras. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}