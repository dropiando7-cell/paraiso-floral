'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProductoOdoo } from '@prisma/client';
import { searchOdooProducts } from '@/app/actions/odoo';
import { Search, Loader2, Database, AlertCircle } from 'lucide-react';

interface BuscadorOdooProps {
    onSelect: (producto: ProductoOdoo) => void;
}

export default function BuscadorOdoo({ onSelect }: BuscadorOdooProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProductoOdoo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Simple debounce
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const data = await searchOdooProducts(query);
                    setResults(data);
                    setIsOpen(true);
                } catch (error) {
                    console.error("Failed to search", error);
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
        <div className="relative w-full mb-6 z-50 bg-blue-50/50 p-4 rounded-xl border border-blue-100" ref={dropdownRef}>
            <div className="flex items-center gap-2 mb-2 text-blue-800 font-semibold">
                <Database className="w-5 h-5" />
                <h2>Referencia Histórica (Odoo)</h2>
            </div>
            <p className="text-sm text-blue-600 mb-3">
                Busca un componente en la base de datos anterior para cargar su foto y referencias.
            </p>
            
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-blue-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-blue-200 rounded-lg leading-5 bg-white placeholder-blue-300 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out shadow-sm"
                    placeholder="Buscar por nombre, SKU o ref. interna..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClick={() => { if(results.length > 0) setIsOpen(true) }}
                />
                {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute mt-1 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 text-base leading-6 overflow-auto focus:outline-none sm:text-sm border border-blue-100 z-50">
                    {results.map((product) => (
                        <div
                            key={product.id}
                            className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            onClick={() => {
                                onSelect(product);
                                setIsOpen(false);
                                setQuery('');
                            }}
                        >
                            <div className="flex items-center">
                                {product.imagenUrl ? (
                                    <img src={product.imagenUrl} alt="" className="w-10 h-10 rounded border border-gray-100 object-cover mr-3 bg-gray-50 flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded border border-gray-100 mr-3 bg-gray-50 flex-shrink-0 flex items-center justify-center text-gray-300">
                                        <Database size={16} />
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                    <span className="block truncate font-medium text-gray-900">{product.nombreMostrar || product.nombre}</span>
                                    <span className="block truncate text-xs text-gray-500">
                                        Ref: {product.referenciaInterna || product.codigoBarras || product.odooId || 'N/A'} | Stock: {product.cantidadOdoo ?? 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {isOpen && query.trim().length >= 2 && results.length === 0 && !isSearching && (
                <div className="absolute mt-1 w-full bg-white shadow-lg rounded-md py-3 px-4 text-sm text-gray-500 border border-gray-200 z-50">
                    No se encontraron resultados en Odoo.
                </div>
            )}
        </div>
    );
}

export function OdooAlertPanel({ product }: { product: ProductoOdoo | null }) {
    if (!product) return null;

    return (
        <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-yellow-800 font-semibold text-sm uppercase tracking-wider mb-1">
                        Información Histórica de Odoo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="bg-white p-3 rounded-lg border border-yellow-100 shadow-sm">
                            <span className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1">
                                💡 Cantidad en Odoo
                            </span>
                            <div className="text-xl font-black text-gray-900 mt-1">
                                {product.cantidadOdoo !== null ? `${product.cantidadOdoo} unidades` : 'No especificada'}
                            </div>
                            <p className="text-xs text-yellow-700 mt-2 font-medium bg-yellow-100/50 p-2 rounded">
                                👉 Por favor cuenta físicamente e ingresa el valor real en el formulario.
                            </p>
                        </div>
                        
                        {(product.notasInternas || product.descripcionSitioWeb) && (
                            <div className="bg-white p-3 rounded-lg border border-yellow-100 shadow-sm flex flex-col">
                                <span className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1">
                                    📝 Notas Internas
                                </span>
                                <div className="text-sm text-gray-700 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap flex-1">
                                    {product.notasInternas || product.descripcionSitioWeb}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
