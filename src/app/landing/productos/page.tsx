import React from 'react';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import ProductGridClient from './ProductGridClient';

interface SearchParams {
    q?: string;
    brand?: string;
    type?: string;
    category?: string;
    page?: string;
}

function cleanString(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^a-z0-9\s]/g, " ")   // Replace punctuation with spaces
        .trim();
}

function getLevenshteinDistance(a: string, b: string): number {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = a[i - 1] === b[j - 1] 
                ? tmp[i - 1][j - 1] 
                : Math.min(tmp[i - 1][j - 1] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j] + 1);
        }
    }
    return tmp[a.length][b.length];
}

function matchToken(token: string, word: string): number {
    if (word === token) return 10;
    if (word.startsWith(token)) return 5;
    if (token.length >= 3) {
        const dist = getLevenshteinDistance(token, word);
        const maxAllowed = Math.floor(token.length * 0.3); // up to 30% spelling errors
        if (dist <= maxAllowed) return 3;
    }
    return 0;
}

const ITEMS_PER_PAGE = 24;

async function getInventory(searchParams: SearchParams, isAdmin = false) {
    const query = searchParams.q || '';
    const selectedBrand = searchParams.brand || '';
    const selectedType = searchParams.type || '';
    const selectedCategory = searchParams.category || '';
    const page = parseInt(searchParams.page || '1', 10) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const take = skip + ITEMS_PER_PAGE; // Fetch up to current page's end in merged space

    let allowScrapedProducts = true;
    let hideRealInventory = false;
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'landing_settings' }
        });
        if (setting) {
            const parsed = JSON.parse(setting.value);
            allowScrapedProducts = parsed.allowScrapedProducts !== false;
            hideRealInventory = parsed.hideRealInventory === true;
        }
    } catch (e) {
        console.error('Error loading landing settings in getInventory:', e);
    }

    try {
        // Build base filters
        const assetWhere: Prisma.ActivoFijoWhereInput = {
            estatusContable: isAdmin ? { in: ['VIGENTE', 'OCULTO'] } : 'VIGENTE',
            NOT: [
                { area: { equals: 'SERVICIOS', mode: 'insensitive' } }
            ]
        };

        const productWhere: Prisma.ProductoWhereInput = {
            estado: isAdmin ? { in: ['ACTIVO', 'OCULTO'] } : 'ACTIVO',
            esServicio: false
        };

        // Enforce active catalog configurations
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

        // Apply filters in database level
        if (selectedBrand) {
            assetWhere.marca = { equals: selectedBrand, mode: 'insensitive' };
            productWhere.marca = { equals: selectedBrand, mode: 'insensitive' };
        }

        if (selectedCategory) {
            assetWhere.categoria = {
                nombre: { equals: selectedCategory, mode: 'insensitive' }
            };
            productWhere.categoria = { equals: selectedCategory, mode: 'insensitive' };
        }

        if (query.trim()) {
            const queryFilter = { contains: query, mode: 'insensitive' as const };
            assetWhere.OR = [
                { descripcionCorta: queryFilter },
                { marca: queryFilter },
                { modelo: queryFilter },
                { idQr: queryFilter }
            ];
            
            if (productWhere.OR) {
                // If we already have OR from catalog filters, merge it under AND
                productWhere.AND = [
                    { OR: productWhere.OR },
                    {
                        OR: [
                            { nombre: queryFilter },
                            { marca: queryFilter },
                            { modelo: queryFilter },
                            { sku: queryFilter }
                        ]
                    }
                ];
                delete productWhere.OR;
            } else {
                productWhere.OR = [
                    { nombre: queryFilter },
                    { marca: queryFilter },
                    { modelo: queryFilter },
                    { sku: queryFilter }
                ];
            }
        }

        // 1. Fetch count totals and filter options in parallel
        const [assetBrands, productBrands, assetCategories, productCategories] = await Promise.all([
            prisma.activoFijo.findMany({
                where: { estatusContable: 'VIGENTE' },
                select: { marca: true },
                distinct: ['marca']
            }),
            prisma.producto.findMany({
                where: { estado: 'ACTIVO' },
                select: { marca: true },
                distinct: ['marca']
            }),
            prisma.categoria.findMany({
                select: { nombre: true }
            }),
            prisma.producto.findMany({
                where: { estado: 'ACTIVO', categoria: { not: null } },
                select: { categoria: true },
                distinct: ['categoria']
            })
        ]);

        const allBrands = Array.from(new Set([
            ...assetBrands.map(b => (b.marca || 'GENÉRICO').trim().toUpperCase()),
            ...productBrands.map(b => (b.marca || 'GENÉRICO').trim().toUpperCase())
        ].filter(Boolean))).sort();

        const allCategories = Array.from(new Set([
            ...assetCategories.map(c => c.nombre.trim().toUpperCase()),
            ...productCategories.map(c => (c.categoria || '').trim().toUpperCase())
        ].filter(Boolean))).sort();

        // Count for pagination
        const assetsCount = (selectedType === '' || selectedType === 'activo') 
            ? await prisma.activoFijo.count({ where: assetWhere })
            : 0;

        const productsCount = (selectedType === '' || selectedType === 'producto')
            ? await prisma.producto.count({ where: productWhere })
            : 0;

        const totalItems = assetsCount + productsCount;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        // 2. Fetch page items with limited take
        let assets: any[] = [];
        let consumables: any[] = [];

        if (!hideRealInventory && (selectedType === '' || selectedType === 'activo')) {
            assets = await prisma.activoFijo.findMany({
                where: assetWhere,
                take: take,
                select: {
                    id: true,
                    descripcionCorta: true,
                    marca: true,
                    modelo: true,
                    idQr: true,
                    imagenUrl: true,
                    imagenWeb: true,
                    tituloWeb: true,
                    costoAdq: true,
                    categoria: {
                        select: {
                            nombre: true
                        }
                    },
                    estatusContable: true
                }
            });
        }

        if (selectedType === '' || selectedType === 'producto') {
            consumables = await prisma.producto.findMany({
                where: productWhere,
                take: take,
                select: {
                    id: true,
                    nombre: true,
                    marca: true,
                    modelo: true,
                    sku: true,
                    precioVenta: true,
                    imagenWeb: true,
                    tituloWeb: true,
                    categoria: true,
                    estado: true
                }
            });
        }

        // Merge and sort in memory, then paginate
        const unifiedItems = [
            ...assets.map(a => ({
                id: a.id,
                name: a.tituloWeb || a.descripcionCorta,
                brand: (a.marca || 'GENÉRICO').trim(),
                model: a.modelo || 'N/A',
                code: a.idQr || '',
                imageUrl: a.imagenWeb || a.imagenUrl,
                type: 'activo' as const,
                typeName: 'Equipo Médico / Activo',
                category: (a.categoria?.nombre || 'EQUIPOS').trim(),
                hidden: a.estatusContable === 'OCULTO',
            })),
            ...consumables.map(c => ({
                id: c.id,
                name: c.tituloWeb || c.nombre,
                brand: (c.marca || 'GENÉRICO').trim(),
                model: c.modelo || 'N/A',
                code: c.sku ? c.sku.replace(/^(SOMA-|PUKANG-|JOSON-|AERTI-|DRE-|AMCARE-|RD-)/, '') : '',
                imageUrl: c.imagenWeb || null,
                type: 'producto' as const,
                typeName: c.sku.startsWith('SOMA-') 
                    ? (c.categoria || 'Máquinas de anestesia') 
                    : c.sku.startsWith('PUKANG-')
                        ? (c.categoria || 'Muebles Hospitalarios')
                        : c.sku.startsWith('JOSON-')
                            ? (c.categoria || 'Camas y Mobiliario Hospitalario')
                            : c.sku.startsWith('AERTI-')
                                ? (c.categoria || 'Equipos de Oxigenoterapia')
                                : c.sku.startsWith('DRE-')
                                    ? (c.categoria || 'Equipos Médicos Quirúrgicos DRE')
                                    : c.sku.startsWith('AMCARE-')
                                        ? (c.categoria || 'Gases Medicinales y Quirófano')
                                        : c.sku.startsWith('RD-')
                                            ? `Baterías / ${c.categoria || 'Baterías Médicas'}`
                                            : c.sku.startsWith('REP-') 
                                                ? `Repuesto / ${c.categoria || 'Accesorios'}` 
                                                : 'Consumible / Repuesto',
                category: (c.categoria || 'CONSUMIBLES').trim(),
                hidden: c.estado === 'OCULTO',
            }))
        ];

        // Sort unified alphabetically
        unifiedItems.sort((a, b) => a.name.localeCompare(b.name));

        const itemsForPage = unifiedItems.slice(skip, skip + ITEMS_PER_PAGE);

        return {
            items: itemsForPage,
            brands: allBrands,
            categories: allCategories,
            totalPages,
            currentPage: page,
            totalItems
        };
    } catch (e) {
        console.error('Error fetching catalog:', e);
        return { items: [], brands: [], categories: [], totalPages: 0, currentPage: page, totalItems: 0 };
    }
}

export default async function ProductosPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const resolvedParams = await searchParams;
    const page = parseInt(resolvedParams.page || '1', 10) || 1;

    // Check if user is administrator to see hidden items and toggle them
    let isAdmin = false;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            const dbUser = await prisma.user.findUnique({
                where: { email: user.email },
                select: { role: true, accessibleModules: true }
            });
            if (dbUser && (dbUser.role === 'SUPER_ADMIN' || dbUser.role === 'ORG_ADMIN' || dbUser.accessibleModules.includes('/admin/gestion-web'))) {
                isAdmin = true;
            }
        }
    } catch (e) {
        console.error('Error checking user session in public catalog:', e);
    }

    const { items, brands, categories, totalPages, totalItems } = await getInventory(resolvedParams, isAdmin);
    const query = resolvedParams.q || '';
    const activeBrand = resolvedParams.brand || '';
    const activeType = resolvedParams.type || '';
    const activeCategory = resolvedParams.category || '';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-8 bg-white text-slate-800">
            <div className="border-l-4 border-cyan-500 pl-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Catálogo de Equipos y Consumibles</h1>
                <p className="text-xs text-slate-550 mt-1">Busca, filtra y solicita cotizaciones formales para equipos y repuestos médicos.</p>
            </div>

            {/* Catalog Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Filters Sidebar */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 space-y-6 lg:sticky lg:top-24 h-fit">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <SlidersHorizontal size={14} className="text-cyan-500" />
                            Filtros
                        </span>
                        {(query || activeBrand || activeType || activeCategory || page > 1) && (
                            <Link href="/productos" className="text-[10px] text-cyan-600 font-bold hover:underline">
                                Limpiar todo
                            </Link>
                        )}
                    </div>

                    {/* Filter by Category/Type */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest block">Tipo de Producto</label>
                        <div className="flex flex-col gap-1 text-xs text-slate-605 font-medium">
                            <Link 
                                href={{ query: { ...resolvedParams, type: undefined, page: undefined } }}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    !activeType 
                                        ? 'bg-cyan-50/70 text-cyan-600 font-bold' 
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-905'
                                }`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    !activeType 
                                        ? 'bg-[#00a8cc] border-[#00a8cc] text-white' 
                                        : 'border-slate-300 bg-white'
                                }`}>
                                    {!activeType && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <span>TODOS</span>
                            </Link>
                            <Link 
                                href={{ query: { ...resolvedParams, type: activeType === 'activo' ? undefined : 'activo', page: undefined } }}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    activeType === 'activo' 
                                        ? 'bg-cyan-50/70 text-cyan-600 font-bold' 
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-905'
                                }`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    activeType === 'activo' 
                                        ? 'bg-[#00a8cc] border-[#00a8cc] text-white' 
                                        : 'border-slate-300 bg-white'
                                }`}>
                                    {activeType === 'activo' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <span>EQUIPOS BIOMÉDICOS</span>
                            </Link>
                            <Link 
                                href={{ query: { ...resolvedParams, type: activeType === 'producto' ? undefined : 'producto', page: undefined } }}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    activeType === 'producto' 
                                        ? 'bg-cyan-50/70 text-cyan-600 font-bold' 
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-905'
                                }`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    activeType === 'producto' 
                                        ? 'bg-[#00a8cc] border-[#00a8cc] text-white' 
                                        : 'border-slate-300 bg-white'
                                }`}>
                                    {activeType === 'producto' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <span>CONSUMIBLES Y REPUESTOS</span>
                            </Link>
                        </div>
                    </div>

                    {/* Filter by Brand */}
                    {brands.length > 0 && (
                        <div className="space-y-2 border-t border-slate-200 pt-4">
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest block">Marcas Disponibles</label>
                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar text-xs text-slate-600 font-medium pr-1">
                                <Link 
                                    href={{ query: { ...resolvedParams, brand: undefined, page: undefined } }}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                        !activeBrand 
                                            ? 'bg-cyan-50/70 text-cyan-600 font-bold' 
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-905'
                                    }`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                        !activeBrand 
                                            ? 'bg-[#00a8cc] border-[#00a8cc] text-white' 
                                            : 'border-slate-300 bg-white'
                                    }`}>
                                        {!activeBrand && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span>CUALQUIER MARCA</span>
                                </Link>
                                {brands.map(brand => {
                                    const isBrandActive = activeBrand.toUpperCase() === brand.toUpperCase();
                                    return (
                                        <Link 
                                            key={brand}
                                            href={{ query: { ...resolvedParams, brand: isBrandActive ? undefined : brand, page: undefined } }}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all truncate ${
                                                isBrandActive 
                                                    ? 'bg-cyan-50/70 text-cyan-600 font-bold' 
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-905'
                                            }`}
                                        >
                                            <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                                isBrandActive 
                                                    ? 'bg-[#00a8cc] border-[#00a8cc] text-white' 
                                                    : 'border-slate-300 bg-white'
                                            }`}>
                                                {isBrandActive && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="truncate">{brand}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Filter by Category */}
                    {categories.length > 0 && (
                        <div className="space-y-2 border-t border-slate-200 pt-4">
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest block">Categorías Disponibles</label>
                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar text-xs text-slate-600 font-medium pr-1">
                                <Link 
                                    href={{ query: { ...resolvedParams, category: undefined, page: undefined } }}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                        !activeCategory 
                                            ? 'bg-cyan-50/70 text-cyan-600 font-bold' 
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-905'
                                    }`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                        !activeCategory 
                                            ? 'bg-[#00a8cc] border-[#00a8cc] text-white' 
                                            : 'border-slate-300 bg-white'
                                    }`}>
                                        {!activeCategory && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span>CUALQUIER CATEGORÍA</span>
                                </Link>
                                {categories.map(category => {
                                    const isCategoryActive = activeCategory.toUpperCase() === category.toUpperCase();
                                    return (
                                        <Link 
                                            key={category}
                                            href={{ query: { ...resolvedParams, category: isCategoryActive ? undefined : category, page: undefined } }}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all truncate ${
                                                isCategoryActive 
                                                    ? 'bg-cyan-50/70 text-cyan-600 font-bold' 
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-905'
                                            }`}
                                        >
                                            <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                                isCategoryActive 
                                                    ? 'bg-[#00a8cc] border-[#00a8cc] text-white' 
                                                    : 'border-slate-300 bg-white'
                                            }`}>
                                                {isCategoryActive && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="truncate">{category}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Products Grid & Search */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Search Field */}
                    <form action="/productos" method="GET" className="flex gap-2">
                        <div className="relative flex-1 text-xs">
                            <Search className="absolute left-3.5 top-3.5 text-slate-450" size={16} />
                            <input 
                                type="text"
                                name="q"
                                defaultValue={query}
                                placeholder="Buscar por nombre, marca, modelo o código..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-slate-800 focus:outline-none focus:border-cyan-500 transition-colors font-medium placeholder-slate-400"
                            />
                            {activeType && <input type="hidden" name="type" value={activeType} />}
                            {activeBrand && <input type="hidden" name="brand" value={activeBrand} />}
                            {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
                        </div>
                        <button 
                            type="submit"
                            className="bg-[#00a8cc] hover:bg-[#00b4d8] text-white text-xs font-bold px-8 py-3 rounded-2xl transition-colors shadow-sm shadow-cyan-500/15 cursor-pointer uppercase tracking-wider"
                        >
                            Buscar
                        </button>
                    </form>

                    {/* Results Count */}
                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Se encontraron <strong className="text-slate-900">{totalItems}</strong> productos</span>
                    </div>

                    {/* Grid */}
                    <ProductGridClient items={items} isAdmin={isAdmin} />

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 pt-8 border-t border-slate-100">
                            {page > 1 && (
                                <Link
                                    href={{
                                        pathname: '/productos',
                                        query: { ...resolvedParams, page: page - 1 }
                                    }}
                                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                                >
                                    Anterior
                                </Link>
                            )}
                            <span className="text-xs text-slate-550 font-bold px-2">
                                Página {page} de {totalPages}
                            </span>
                            {page < totalPages && (
                                <Link
                                    href={{
                                        pathname: '/productos',
                                        query: { ...resolvedParams, page: page + 1 }
                                    }}
                                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                                >
                                    Siguiente
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
