'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Producto } from '@prisma/client';
import { searchWebCatalogProducts } from './actions';
import { Search, Loader2, Globe, AlertCircle } from 'lucide-react';

interface BuscadorCatWebProps {
    onSelect: (producto: Producto) => void;
}

export default function BuscadorCatWeb({ onSelect }: BuscadorCatWebProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Producto[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Simple debounce
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const data = await searchWebCatalogProducts(query);
                    setResults(data);
                    setIsOpen(true);
                } catch (error) {
                    console.error("Failed to search web catalog", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="relative w-full mb-6 z-50 bg-[#0500A3]/5 p-4 rounded-xl border border-[#0500A3]/10" ref={dropdownRef}>
            <div className="flex items-center gap-2 mb-2 text-[#0500A3] font-semibold">
                <Globe className="w-5 h-5" />
                <h2>Buscar en Catálogo Web Importado (Soma / Pukang / etc.)</h2>
            </div>
            <p className="text-sm text-slate-600 mb-3">
                Busca un producto scrapeado/importado de los catálogos externos para copiar sus fotos, descripción y referencias.
            </p>
            
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-indigo-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-indigo-200 rounded-lg leading-5 bg-white placeholder-indigo-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0500A3] focus:border-[#0500A3] sm:text-sm transition duration-150 ease-in-out shadow-sm"
                    placeholder="Buscar por nombre, SKU, marca o modelo..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClick={() => { if(results.length > 0) setIsOpen(true) }}
                />
                {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute mt-1 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 text-base leading-6 overflow-auto focus:outline-none sm:text-sm border border-indigo-100 z-50">
                    {results.map((product) => {
                        const img = product.imagenWeb || (product.imagenes && product.imagenes[0]) || null;
                        return (
                            <div
                                key={product.id}
                                className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-indigo-50/50 transition-colors border-b border-gray-50 last:border-0"
                                onClick={() => {
                                    onSelect(product);
                                    setIsOpen(false);
                                    setQuery('');
                                }}
                            >
                                <div className="flex items-center">
                                    {img ? (
                                        <img src={img} alt="" className="w-10 h-10 rounded border border-gray-100 object-cover mr-3 bg-gray-50 flex-shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded border border-gray-100 mr-3 bg-gray-50 flex-shrink-0 flex items-center justify-center text-gray-300">
                                            <Globe size={16} />
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="block truncate font-medium text-gray-900">{product.nombre}</span>
                                        <span className="block truncate text-xs text-gray-500">
                                            Marca: {product.marca || 'N/A'} | SKU original: {product.sku || 'N/A'} | Cat: {product.categoria || 'General'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {isOpen && query.trim().length >= 2 && results.length === 0 && !isSearching && (
                <div className="absolute mt-1 w-full bg-white shadow-lg rounded-md py-3 px-4 text-sm text-gray-500 border border-gray-200 z-50">
                    No se encontraron resultados en el catálogo web.
                </div>
            )}
        </div>
    );
}

export function WebProductAlertPanel({ product }: { product: Producto | null }) {
    if (!product) return null;

    return (
        <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-indigo-800 font-semibold text-sm uppercase tracking-wider mb-1">
                        Información del Catálogo Web
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="bg-white p-3 rounded-lg border border-indigo-100/50 shadow-sm">
                            <span className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1">
                                🏷️ Referencias Web
                            </span>
                            <div className="text-sm text-gray-700 mt-1 space-y-1">
                                <p><span className="font-semibold text-slate-500">Marca:</span> {product.marca || 'No especificada'}</p>
                                <p><span className="font-semibold text-slate-500">Modelo:</span> {product.modelo || 'No especificado'}</p>
                                <p><span className="font-semibold text-slate-500">SKU Original:</span> {product.sku || 'No especificado'}</p>
                            </div>
                        </div>
                        
                        {product.descripcion && (
                            <div className="bg-white p-3 rounded-lg border border-indigo-100/50 shadow-sm flex flex-col">
                                <span className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1">
                                    📝 Descripción del Producto
                                </span>
                                <div className="text-xs text-gray-700 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap flex-1">
                                    {product.descripcion}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
