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
    Wrench,
    Activity,
    Package,
    ShieldCheck,
    ChevronRight,
    Settings,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import FinderTool from './components/FinderTool';
import DreLandingPage from './components/DreLandingPage';
import SomaLandingPage from './components/SomaLandingPage';
import BioLandingPage from './components/BioLandingPage';

// Fallback Featured Products (Activos Fijos)
const mockAssets = [
    {
        id: 'mock-1',
        descripcionCorta: 'Ultrasonido General Electric Logiq E9',
        marca: 'General Electric',
        modelo: 'Logiq E9',
        imagenUrl: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=600&q=80',
        category: 'equipos'
    },
    {
        id: 'mock-2',
        descripcionCorta: 'Desfibrilador Zoll M Series CCT',
        marca: 'Zoll Medical',
        modelo: 'M Series CCT',
        imagenUrl: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80',
        category: 'equipos'
    },
    {
        id: 'mock-3',
        descripcionCorta: 'Monitor de Signos Vitales Mindray BeneView T5',
        marca: 'Mindray',
        modelo: 'BeneView T5',
        imagenUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
        category: 'equipos'
    },
    {
        id: 'mock-4',
        descripcionCorta: 'Máquina de Anestesia Dräger Fabius GS Premium',
        marca: 'Dräger',
        modelo: 'Fabius GS',
        imagenUrl: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=600&q=80',
        category: 'equipos'
    }
];

// Fallback Reviews
const defaultReviews = [
    {
        id: 'rev-1',
        author: 'Dr. Carlos Mendoza',
        date: 'Director Médico · San Pedro Sula',
        rating: 5,
        text: 'El nivel de profesionalismo de Bioelectrónica Honduras es excepcional. Remodelamos nuestro bloque quirúrgico con sus máquinas de anestesia y monitores, la relación calidad-precio y el respaldo técnico no tienen comparación.'
    },
    {
        id: 'rev-2',
        author: 'Dra. Ana Flores',
        date: 'Clínica de Especialidades · Tegucigalpa',
        rating: 5,
        text: 'Como clínica en expansión, necesitábamos un proveedor que no solo vendiera el equipo, sino que nos capacitara. Los ecógrafos que adquirimos llegaron impecables y la calibración fue precisa.'
    },
    {
        id: 'rev-3',
        author: 'Ing. Luis Castillo',
        date: 'Jefe de Mantenimiento Hospitalario',
        rating: 5,
        text: 'El soporte técnico es su mayor fortaleza. Se nos dañó el electrobisturí un sábado por la noche y el técnico estuvo a primera hora del domingo resolviendo el problema en la tarjeta principal. Totalmente recomendados.'
    }
];

async function getLandingData() {
    try {
        const settings = await prisma.systemSetting.findMany();
        
        const maintenanceMode = settings.find(s => s.key === 'maintenance_mode')?.value === 'true';
        
        const reviewsRaw = settings.find(s => s.key === 'google_reviews')?.value || '[]';
        const reviews = JSON.parse(reviewsRaw);

        const landingSettingsRaw = settings.find(s => s.key === 'landing_settings')?.value || '{}';
        const landingSettings = JSON.parse(landingSettingsRaw);
        const hideRealInventory = landingSettings.hideRealInventory === true;
        const allowScrapedProducts = landingSettings.allowScrapedProducts !== false;

        // Fetch real active inventory assets (ActivoFijo) or SOMA products depending on configuration
        let realAssets: any[] = [];
        if (hideRealInventory) {
            try {
                const queryProducts = await prisma.producto.findMany({
                    where: {
                        estado: 'ACTIVO',
                        esServicio: false,
                        OR: [
                            { sku: { startsWith: 'SOMA-' } },
                            { sku: { startsWith: 'REP-' } },
                            { sku: { startsWith: 'PUKANG-' } },
                            { sku: { startsWith: 'JOSON-' } },
                            { sku: { startsWith: 'AERTI-' } },
                            { sku: { startsWith: 'DRE-' } }
                        ]
                    },
                    take: 4,
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
                realAssets = queryProducts.map(p => ({
                    id: p.id,
                    descripcionCorta: p.nombre,
                    marca: p.marca || 'GENÉRICO',
                    modelo: p.modelo || 'N/A',
                    idQr: p.sku ? p.sku.replace(/^(SOMA-|PUKANG-|JOSON-|AERTI-|DRE-)/, '') : '',
                    imagenUrl: p.imagenWeb || null,
                    category: p.categoria || 'consumibles'
                }));
            } catch (dbErr) {
                console.error('Error loading SOMA products for homepage:', dbErr);
            }
        } else {
            try {
                const queryAssets = await prisma.activoFijo.findMany({
                    where: {
                        estatusContable: 'VIGENTE',
                        NOT: [
                            { area: { equals: 'SERVICIOS', mode: 'insensitive' } }
                        ]
                    },
                    take: 4,
                    select: {
                        id: true,
                        descripcionCorta: true,
                        marca: true,
                        modelo: true,
                        idQr: true,
                        imagenUrl: true,
                        categoria: {
                            select: {
                                nombre: true
                            }
                        }
                    }
                });
                realAssets = queryAssets.map(a => ({
                    id: a.id,
                    descripcionCorta: a.descripcionCorta,
                    marca: a.marca,
                    modelo: a.modelo,
                    idQr: a.idQr,
                    imagenUrl: a.imagenUrl,
                    category: a.categoria?.nombre || 'equipos'
                }));
            } catch (dbErr) {
                console.error('Error loading inventory assets:', dbErr);
            }
        }

        // Fetch unique categories
        let uniqueCategories: string[] = [];
        if (!hideRealInventory) {
            try {
                const afCategories = await prisma.activoFijo.findMany({
                    where: {
                        estatusContable: 'VIGENTE',
                        NOT: [
                            { area: { equals: 'SERVICIOS', mode: 'insensitive' } }
                        ]
                    },
                    select: {
                        categoria: {
                            select: { nombre: true }
                        }
                    }
                });
                afCategories.forEach(af => {
                    if (af.categoria?.nombre) {
                        uniqueCategories.push(af.categoria.nombre.trim());
                    }
                });
            } catch (afCatErr) {
                console.error('Error loading AF categories for homepage:', afCatErr);
            }
        }

        if (hideRealInventory || allowScrapedProducts) {
            try {
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
                        { sku: { startsWith: 'DRE-' } }
                    ];
                } else if (!allowScrapedProducts) {
                    productWhere.AND = [
                        { sku: { not: { startsWith: 'SOMA-' } } },
                        { sku: { not: { startsWith: 'REP-' } } },
                        { sku: { not: { startsWith: 'PUKANG-' } } },
                        { sku: { not: { startsWith: 'JOSON-' } } },
                        { sku: { not: { startsWith: 'AERTI-' } } },
                        { sku: { not: { startsWith: 'DRE-' } } }
                    ];
                }

                const prodCategories = await prisma.producto.findMany({
                    where: productWhere,
                    select: { categoria: true },
                    distinct: ['categoria']
                });
                prodCategories.forEach(p => {
                    if (p.categoria) {
                        uniqueCategories.push(p.categoria.trim());
                    }
                });
            } catch (prodCatErr) {
                console.error('Error loading product categories for homepage:', prodCatErr);
            }
        }

        // Deduplicate case-insensitively
        const categoryMap = new Map<string, string>();
        uniqueCategories.forEach(cat => {
            const norm = cat.toUpperCase();
            if (!categoryMap.has(norm)) {
                categoryMap.set(norm, cat);
            }
        });

        const consolidatedCategoryNames = Array.from(categoryMap.values());
        
        const CATEGORY_IMAGES: Record<string, string> = {
            'anestesia': 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=600',
            'monitor': '/categorias/monitores.png',
            'mesa': '/categorias/mesas.png',
            'lampara': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600',
            'lámpara': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600',
            'electrobisturi': '/categorias/electrobisturi.png',
            'electrobisturí': '/categorias/electrobisturi.png',
            'ultrasonido': '/categorias/ultrasonidos.png',
            'ecógrafo': '/categorias/ultrasonidos.png',
            'ecografo': '/categorias/ultrasonidos.png',
            'desfibrilador': '/categorias/desfibriladores.png',
            'respiratoria': '/categorias/respiratoria.png',
            'ventilador': '/categorias/respiratoria.png',
            'esterilizador': 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=600',
            'autoclave': 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=600',
            'incubadora': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600'
        };

        const capitalize = (str: string) => {
            return str
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        const categoriesData: any[] = [];
        for (const catName of consolidatedCategoryNames) {
            let img = '';
            const clean = catName.toLowerCase();
            const matchedKey = Object.keys(CATEGORY_IMAGES).find(k => clean.includes(k));
            
            if (matchedKey) {
                img = CATEGORY_IMAGES[matchedKey];
            } else {
                try {
                    const firstProd = await prisma.producto.findFirst({
                        where: {
                            categoria: catName,
                            estado: 'ACTIVO',
                            imagenWeb: { not: null }
                        },
                        select: { imagenWeb: true }
                    });
                    if (firstProd?.imagenWeb) {
                        img = firstProd.imagenWeb;
                    } else {
                        const firstAsset = await prisma.activoFijo.findFirst({
                            where: {
                                categoria: { nombre: catName },
                                estatusContable: 'VIGENTE',
                                OR: [
                                    { imagenWeb: { not: null } },
                                    { imagenUrl: { not: null } }
                                ]
                            },
                            select: { imagenWeb: true, imagenUrl: true }
                        });
                        if (firstAsset) {
                            img = firstAsset.imagenWeb || firstAsset.imagenUrl || '';
                        }
                    }
                } catch (dbErr) {
                    console.error('Error resolving category image from DB:', dbErr);
                }
            }

            if (!img) {
                img = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600';
            }

            categoriesData.push({
                titulo: capitalize(catName),
                subtitulo: clean.includes('anestesia') ? 'Sistemas Completos' : 
                           clean.includes('monitor') ? 'Signos Vitales y UCI' : 
                           clean.includes('mesa') ? 'Hidráulicas y Eléctricas' : 
                           clean.includes('lampara') || clean.includes('lámpara') ? 'LED de alta intensidad' : 
                           clean.includes('electrobisturi') ? 'Corte y Coagulación' : 
                           clean.includes('ultrasonido') ? 'Imágenes Diagnósticas' : 
                           clean.includes('desfibrilador') ? 'DEA y Clínicos' : 
                           clean.includes('ventilador') ? 'Ventiladores y CPAP' : 
                           'Equipamiento de Calidad',
                img,
                href: `/productos?category=${encodeURIComponent(catName)}`
            });
        }

        return {
            maintenanceMode,
            reviews: reviews.length > 0 ? reviews : defaultReviews,
            landingSettings,
            assets: realAssets.length > 0 ? realAssets : mockAssets,
            categories: categoriesData
        };
    } catch (e) {
        console.error('Error fetching landing data:', e);
        return {
            maintenanceMode: false,
            reviews: defaultReviews,
            landingSettings: {},
            assets: mockAssets,
            categories: []
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
                // Allow any authenticated system user to bypass maintenance mode to preview the site
                isSuperAdmin = true;
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

    const activeTheme = data.landingSettings?.activeTheme || 'DRE';

    if (activeTheme === 'SOMA') {
        return <SomaLandingPage data={data} />;
    }

    if (activeTheme === 'BIO') {
        return <BioLandingPage data={data} />;
    }

    return <DreLandingPage data={data} />;
}
