import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Search, HeartPulse, SlidersHorizontal } from 'lucide-react';

interface SearchParams {
    q?: string;
    brand?: string;
    type?: string;
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

async function getInventory(searchParams: SearchParams) {
    const query = searchParams.q || '';
    const selectedBrand = searchParams.brand || '';
    const selectedType = searchParams.type || '';

    try {
        let assets: any[] = [];
        let consumables: any[] = [];

        // Query database filtering by brand and type
        if (selectedType === '' || selectedType === 'activo') {
            assets = await prisma.activoFijo.findMany({
                where: {
                    estatusContable: 'VIGENTE',
                    marca: selectedBrand ? { equals: selectedBrand, mode: 'insensitive' } : undefined,
                    NOT: [
                        { area: { equals: 'SERVICIOS', mode: 'insensitive' } }
                    ]
                },
                select: {
                    id: true,
                    descripcionCorta: true,
                    marca: true,
                    modelo: true,
                    idQr: true,
                    imagenUrl: true,
                    imagenWeb: true,
                    tituloWeb: true,
                    costoAdq: true
                }
            });
        }

        if (selectedType === '' || selectedType === 'producto') {
            consumables = await prisma.producto.findMany({
                where: {
                    estado: 'ACTIVO',
                    esServicio: false,
                    marca: selectedBrand ? { equals: selectedBrand, mode: 'insensitive' } : undefined
                },
                select: {
                    id: true,
                    nombre: true,
                    marca: true,
                    modelo: true,
                    sku: true,
                    precioVenta: true,
                    imagenWeb: true,
                    tituloWeb: true
                }
            });
        }

        const unifiedItems = [
            ...assets.map(a => ({
                id: a.id,
                name: a.tituloWeb || a.descripcionCorta,
                brand: a.marca || 'Genérico',
                model: a.modelo || 'N/A',
                code: a.idQr || '',
                imageUrl: a.imagenWeb || a.imagenUrl,
                type: 'activo' as const,
                typeName: 'Equipo Médico / Activo',
            })),
            ...consumables.map(c => ({
                id: c.id,
                name: c.tituloWeb || c.nombre,
                brand: c.marca || 'Genérico',
                model: c.modelo || 'N/A',
                code: c.sku || '',
                imageUrl: c.imagenWeb || null,
                type: 'producto' as const,
                typeName: 'Consumible / Repuesto',
            }))
        ];

        // Brands are calculated from the unified list matching selected categories (prior to search query)
        const allBrands = Array.from(new Set(unifiedItems.map(item => item.brand).filter(Boolean)));

        // Perform smart search algorithm
        let filteredItems = unifiedItems;
        if (query.trim()) {
            const cleanQuery = cleanString(query);
            const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

            if (queryTokens.length > 0) {
                const scoredItems = unifiedItems.map(item => {
                    const brandWords = cleanString(item.brand).split(/\s+/).filter(Boolean);
                    const nameWords = cleanString(item.name).split(/\s+/).filter(Boolean);
                    const modelWords = cleanString(item.model).split(/\s+/).filter(Boolean);
                    const codeWords = cleanString(item.code).split(/\s+/).filter(Boolean);

                    const allWords = [...brandWords, ...nameWords, ...modelWords, ...codeWords];
                    const uniqueWords = Array.from(new Set(allWords));

                    let score = 0;
                    let matchedTokensCount = 0;

                    for (const token of queryTokens) {
                        let maxTokenScore = 0;

                        // Check word matches
                        for (const word of uniqueWords) {
                            const tokenScore = matchToken(token, word);
                            if (tokenScore > maxTokenScore) {
                                maxTokenScore = tokenScore;
                            }
                        }

                        // Acronym/abbreviation synonyms for GE -> General Electric
                        if (token === 'ge') {
                            const hasGeneralElectric = brandWords.includes('general') || brandWords.includes('electric');
                            if (hasGeneralElectric && maxTokenScore < 15) {
                                maxTokenScore = 15;
                            }
                        }

                        // General acronym detection (e.g. "zoll cct" matching "Zoll Medical M Series CCT")
                        if (token.length >= 2 && brandWords.length >= 2) {
                            const brandAcronym = brandWords.map(w => w[0]).join('');
                            if (brandAcronym.startsWith(token)) {
                                if (maxTokenScore < 12) maxTokenScore = 12;
                            }
                        }

                        if (maxTokenScore > 0) {
                            score += maxTokenScore;
                            matchedTokensCount++;
                        }
                    }

                    // Exact query phrase matching bonus
                    const fullItemString = cleanString(`${item.brand} ${item.name} ${item.model} ${item.code}`);
                    if (fullItemString.includes(cleanQuery)) {
                        score += 50;
                    }

                    // Multiplier bonus for matching all query words
                    if (matchedTokensCount === queryTokens.length) {
                        score *= 1.5;
                    }

                    return { item, score };
                });

                filteredItems = scoredItems
                    .filter(si => si.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .map(si => si.item);
            }
        }

        return {
            items: filteredItems,
            brands: allBrands
        };
    } catch (e) {
        console.error('Error fetching catalog:', e);
        return { items: [], brands: [] };
    }
}

export default async function ProductosPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const resolvedParams = await searchParams;
    const { items, brands } = await getInventory(resolvedParams);
    const query = resolvedParams.q || '';
    const activeBrand = resolvedParams.brand || '';
    const activeType = resolvedParams.type || '';    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-8 bg-white text-slate-800">
            {/* Header */}
            <div className="border-l-4 border-cyan-500 pl-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Catálogo de Equipos y Consumibles</h1>
                <p className="text-xs text-slate-500 mt-1">Busca, filtra y solicita cotizaciones formales para equipos y repuestos médicos.</p>
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
                        {(query || activeBrand || activeType) && (
                            <Link href="/productos" className="text-[10px] text-cyan-600 font-bold hover:underline">
                                Limpiar todo
                            </Link>
                        )}
                    </div>

                    {/* Filter by Category/Type */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Tipo de Producto</label>
                        <div className="flex flex-col gap-1 text-xs text-slate-605 font-medium">
                            <Link 
                                href={{ query: { ...resolvedParams, type: undefined } }}
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
                                        <svg xmlns="http://www.w3.org/2050/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <span>Todos</span>
                            </Link>
                            <Link 
                                href={{ query: { ...resolvedParams, type: 'activo' } }}
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
                                <span>Equipos Biomédicos</span>
                            </Link>
                            <Link 
                                href={{ query: { ...resolvedParams, type: 'producto' } }}
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
                                <span>Consumibles y Repuestos</span>
                            </Link>
                        </div>
                    </div>
 
                    {/* Filter by Brand */}
                    {brands.length > 0 && (
                        <div className="space-y-2 border-t border-slate-200 pt-4">
                            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Marcas Disponibles</label>
                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar text-xs text-slate-600 font-medium pr-1">
                                <Link 
                                    href={{ query: { ...resolvedParams, brand: undefined } }}
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
                                    <span>Cualquier Marca</span>
                                </Link>
                                {brands.map(brand => {
                                    const isBrandActive = activeBrand.toLowerCase() === brand.toLowerCase();
                                    return (
                                        <Link 
                                            key={brand}
                                            href={{ query: { ...resolvedParams, brand } }}
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
                        <span>Se encontraron <strong className="text-slate-900">{items.length}</strong> productos</span>
                    </div>

                    {/* Grid */}
                    {items.length === 0 ? (
                        <div className="border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                            <HeartPulse size={36} className="text-slate-350 stroke-[1.2]" />
                            <span>No se encontraron equipos para los filtros aplicados.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map(item => (
                                <div key={item.id} className="group bg-white border border-slate-200/80 hover:border-slate-300 hover:border-[#00a8cc] rounded-3xl overflow-hidden hover:shadow-lg transition-all flex flex-col relative duration-300">
                                    {/* Type badge */}
                                    <div className="absolute top-3 left-3 bg-slate-100/90 backdrop-blur text-[8px] font-extrabold text-slate-550 px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200 z-10">
                                        {item.typeName}
                                    </div>

                                    {/* Image */}
                                    <div className="aspect-[4/3] w-full bg-slate-50 flex items-center justify-center border-b border-slate-200/60 relative overflow-hidden">
                                        {item.imageUrl ? (
                                            <img 
                                                src={item.imageUrl} 
                                                alt={item.name} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <HeartPulse className="text-slate-300 w-12 h-12 stroke-[1.2]" />
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="p-5 flex-1 flex flex-col gap-4 text-xs font-semibold">
                                        <div className="space-y-1.5 flex-1">
                                            {/* Badges degradados tal como pidió el usuario */}
                                            <span className="text-[8px] font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                                                {item.brand}
                                            </span>
                                            <h3 className="font-extrabold text-slate-850 leading-snug line-clamp-2">{item.name}</h3>
                                            {item.model && (
                                                <p className="text-[10px] text-slate-400 font-mono font-medium">Modelo: {item.model}</p>
                                            )}
                                        </div>

                                        <div className="flex gap-2 text-[10px] font-bold">
                                            <Link
                                                href={`/productos/${item.id}`}
                                                className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl border border-slate-200 transition-colors"
                                            >
                                                Ver Ficha
                                            </Link>
                                            <Link
                                                href={`/productos/${item.id}?cotizar=true`}
                                                className="flex-1 text-center bg-[#00a8cc] hover:bg-[#00b4d8] text-white py-2.5 rounded-xl transition-colors shadow-sm shadow-cyan-500/10 cursor-pointer"
                                            >
                                                Cotizar
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
