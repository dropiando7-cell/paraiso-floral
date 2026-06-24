import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Search, Shield, Settings, Zap, Cpu, RefreshCw, Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface FeaturedPart {
    id: string;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    sku: string;
    imagenWeb: string | null;
    categoria: string | null;
}

const CATEGORIES = [
    {
        title: "Baterías Médicas",
        desc: "Baterías recargables para desfibriladores, monitores de signos vitales, ventiladores y más.",
        image: "https://somamedicalparts.com/wp-content/uploads/2022/12/Batteries.jpg",
        query: "Batteries",
        icon: Zap,
        color: "from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30"
    },
    {
        title: "Sensores y Cables SpO2",
        desc: "Sensores reutilizables y desechables, cables de extensión de las principales marcas.",
        image: "https://somamedicalparts.com/wp-content/uploads/2025/02/Spo2.jpg",
        query: "SpO2 Sensors",
        icon: Shield,
        color: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30"
    },
    {
        title: "Cables y Derivaciones ECG",
        desc: "Cables troncales, leadwires y latiguillos de 3, 5 y 10 derivaciones para telemetría.",
        image: "https://somamedicalparts.com/wp-content/uploads/2025/02/ECG-Accessories.jpg",
        query: "ECG One-Piece Cables",
        icon: Layers,
        color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30"
    },
    {
        title: "Displays y Pantallas Touch",
        desc: "Pantallas de reemplazo LCD, paneles táctiles y ensambles para monitores de paciente.",
        image: "https://somamedicalparts.com/wp-content/uploads/2022/12/Display-Touch-Screen.jpg",
        query: "Display & Touch Screen",
        icon: Cpu,
        color: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30"
    },
    {
        title: "Tarjetas de Circuito (Boards)",
        desc: "Placas madre, fuentes de poder internas y módulos de procesamiento originales.",
        image: "https://somamedicalparts.com/wp-content/uploads/2022/12/Circuit-Boards-Boards.jpg",
        query: "Circuit Boards",
        icon: Cpu,
        color: "from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30"
    },
    {
        title: "Brazaletes y Hoses NIBP",
        desc: "Brazaletes de presión no invasiva de múltiples tamaños y mangueras con conectores.",
        image: "https://somamedicalparts.com/wp-content/uploads/2025/02/NIBP-Cuffs.jpg",
        query: "NIBP Cuffs",
        icon: Settings,
        color: "from-blue-500/20 to-violet-500/20 text-blue-400 border-blue-500/30"
    },
    {
        title: "Celdas de Oxígeno",
        desc: "Sensores de O2 de larga duración para ventiladores y máquinas de anestesia.",
        image: "https://somamedicalparts.com/wp-content/uploads/2023/04/Oxygen-cells-e1737306233519.png",
        query: "Oxygen Cell",
        icon: RefreshCw,
        color: "from-sky-500/20 to-cyan-500/20 text-sky-400 border-sky-500/30"
    },
    {
        title: "Ruedas y Rodos",
        desc: "Rodos y ruedas de repuesto de alta resistencia para camillas, camas y carros de paro.",
        image: "https://somamedicalparts.com/wp-content/uploads/2025/02/Wheels-Casters.png",
        query: "Wheels & Casters",
        icon: Settings,
        color: "from-slate-500/20 to-zinc-500/20 text-slate-400 border-slate-500/30"
    }
];

async function getFeaturedParts(): Promise<FeaturedPart[]> {
    try {
        const products = await prisma.producto.findMany({
            where: {
                sku: { startsWith: 'REP-' },
                estado: 'ACTIVO',
                imagenWeb: { not: null }
            },
            take: 8,
            select: {
                id: true,
                nombre: true,
                marca: true,
                modelo: true,
                sku: true,
                imagenWeb: true,
                categoria: true
            }
        });
        return products;
    } catch (e) {
        console.error('Error fetching featured parts:', e);
        return [];
    }
}

export default async function RepuestosPage() {
    const featuredParts = await getFeaturedParts();

    return (
        <div className="bg-slate-900 text-white min-h-screen pb-20 select-none">
            {/* Hero Search Banner */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#0b172a] to-[#12233c] border-b border-slate-800 py-20 px-4 sm:px-8">
                {/* Background radial highlight */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
                
                <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Catálogo de Repuestos y Accesorios
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
                        Encuentra Repuestos Médicos <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">Originales y Compatibles</span>
                    </h1>
                    <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                        Explora miles de accesorios, baterías, sensores y partes electrónicas críticas para tus equipos de hospital y clínica.
                    </p>

                    {/* Search Field */}
                    <form action="/productos" method="GET" className="max-w-2xl mx-auto flex gap-2 pt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
                            <input 
                                type="text"
                                name="q"
                                placeholder="Escribe el número de parte, marca, modelo o palabra clave..."
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder-slate-500 font-medium shadow-inner"
                            />
                            <input type="hidden" name="type" value="producto" />
                        </div>
                        <button 
                            type="submit"
                            className="bg-[#00a8cc] hover:bg-[#00b4d8] text-white text-xs font-bold px-8 py-3.5 rounded-2xl transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer uppercase tracking-wider"
                        >
                            Buscar
                        </button>
                    </form>
                </div>
            </div>

            {/* Main Categories Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 space-y-12">
                <div className="text-center sm:text-left space-y-2 border-l-4 border-cyan-500 pl-4">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Categorías Populares</h2>
                    <p className="text-xs text-slate-400">Navega a través de las categorías de partes más buscadas por el personal de biomédica.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {CATEGORIES.map((cat, i) => {
                        const Icon = cat.icon;
                        return (
                            <Link 
                                href={`/productos?category=${encodeURIComponent(cat.query)}&type=producto`}
                                key={i}
                                className="group relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950/40 hover:bg-slate-950 transition-all duration-300 hover:border-cyan-500/40 shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-1 flex flex-col justify-between"
                            >
                                <div className="p-6 space-y-4">
                                    {/* Icon Box */}
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cat.color} border flex items-center justify-center`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors leading-tight">
                                            {cat.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-normal">
                                            {cat.desc}
                                        </p>
                                    </div>
                                </div>

                                {/* Card Image */}
                                <div className="h-32 w-full overflow-hidden relative border-t border-slate-900 bg-slate-900">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={cat.image} 
                                        alt={cat.title} 
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Featured Parts from DB */}
            {featuredParts.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10 border-t border-slate-800">
                    <div className="text-center sm:text-left space-y-2 border-l-4 border-cyan-500 pl-4">
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">Repuestos Destacados Recientes</h2>
                        <p className="text-xs text-slate-400">Equipos importados y disponibles en catálogo con sus especificaciones técnicas de fábrica.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                        {featuredParts.map((part) => (
                            <Link 
                                href={`/productos/${encodeURIComponent(part.categoria || 'Repuestos')}/${part.id}`}
                                key={part.id}
                                className="group bg-slate-950/30 border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-md"
                            >
                                <div className="space-y-4">
                                    {/* Image */}
                                    <div className="w-full h-40 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-900 relative">
                                        {part.imagenWeb ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={part.imagenWeb} 
                                                alt={part.nombre} 
                                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-all duration-300 p-2" 
                                            />
                                        ) : (
                                            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Sin Imagen</span>
                                        )}
                                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                                            {part.marca || 'Soma Parts'}
                                        </div>
                                    </div>

                                    {/* Title and Category */}
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                                            {part.categoria || 'Repuestos'}
                                        </span>
                                        <h3 className="font-bold text-xs text-white group-hover:text-cyan-400 transition-colors line-clamp-2 leading-relaxed">
                                            {part.nombre}
                                        </h3>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-between border-t border-slate-900 mt-4">
                                    <span className="text-[10px] font-bold text-[#00a8cc] tracking-wide font-mono block">
                                        SKU: {part.sku}
                                    </span>
                                    <span className="text-[9px] text-slate-400 group-hover:text-white transition-colors hover:underline font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer">
                                        Ver Ficha
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
