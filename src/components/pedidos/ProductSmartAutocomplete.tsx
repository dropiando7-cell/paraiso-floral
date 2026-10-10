'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Package, Check, X, AlertCircle, Sparkles } from 'lucide-react';
import Fuse from 'fuse.js';

export interface ProductCatalogItem {
  id: string;
  nombre: string;
  sku: string;
  stockActual: number;
  precioVenta?: number;
}

interface ProductSmartAutocompleteProps {
  products: ProductCatalogItem[];
  selectedProductId?: string;
  onSelect: (product: ProductCatalogItem | null) => void;
  onSelectSuccess?: () => void;
  onCtrlEnter?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  isInvalid?: boolean;
  disabled?: boolean;
}

export function ProductSmartAutocomplete({
  products,
  selectedProductId,
  onSelect,
  onSelectSuccess,
  onCtrlEnter,
  autoFocus = false,
  placeholder = 'Buscar flor o producto por nombre o SKU...',
  isInvalid = false,
  disabled = false
}: ProductSmartAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && !selectedProductId) {
      inputRef.current?.focus();
    }
  }, [autoFocus, selectedProductId]);

  // Find currently selected product
  const selectedProduct = products.find(p => p.id === selectedProductId) || null;

  // Filter products in real time
  const filteredProducts = React.useMemo(() => {
    if (query.trim() === '') {
      return products.slice(0, 15); // Show top items on focus
    }
    const fuse = new Fuse(products, {
      keys: ['nombre', 'sku'],
      threshold: 0.4, // Intermedio para errores de dedo
      ignoreLocation: true,
      includeScore: true,
      useExtendedSearch: true
    });
    return fuse.search(query).map(r => r.item).slice(0, 20);
  }, [query, products]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onCtrlEnter?.();
      return;
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredProducts.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredProducts.length) % Math.max(1, filteredProducts.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[selectedIndex]) {
        handleSelect(filteredProducts[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (prod: ProductCatalogItem) => {
    onSelect(prod);
    setQuery('');
    setIsOpen(false);
    onSelectSuccess?.();
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* If a product is already selected, display an ergonomic card with a clear action */}
      {selectedProduct ? (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-xl transition-all shadow-sm group">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-inner">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 truncate leading-tight">
                {selectedProduct.nombre}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/80 px-1.5 py-0.2 rounded border border-emerald-200">
                  {selectedProduct.sku}
                </span>
                <span className={`text-[10px] font-extrabold ${
                  selectedProduct.stockActual > 10 ? 'text-emerald-700' : selectedProduct.stockActual > 0 ? 'text-amber-700' : 'text-rose-600'
                }`}>
                  Stock: {selectedProduct.stockActual}
                </span>
              </div>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-emerald-200/60 rounded-lg text-emerald-800 transition-colors ml-2 shrink-0 active:scale-95"
              title="Cambiar producto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`w-full pl-9 pr-8 py-2.5 text-xs font-semibold rounded-xl border bg-white focus:outline-none transition-all placeholder:text-slate-400 ${
              isInvalid
                ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100 bg-rose-50/20'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-slate-900'
            }`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Floating Autocomplete Dropdown Popover */}
      {isOpen && !selectedProduct && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full md:w-[480px] z-[90] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Coincidencias en Catálogo
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>

          {/* List of matching products */}
          <div className="p-1.5 max-h-64 overflow-y-auto divide-y divide-slate-50">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-semibold flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-1.5" />
                <span>No se encontraron productos para "{query}"</span>
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isHovered = idx === selectedIndex;
                const isLowStock = p.stockActual <= 10;
                const isOutOfStock = p.stockActual <= 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isHovered ? 'bg-emerald-50/80 text-emerald-950' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isHovered ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Package className="w-4.5 h-4.5 stroke-[2.2]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-extrabold truncate leading-tight ${
                          isHovered ? 'text-emerald-950' : 'text-slate-900'
                        }`}>
                          {p.nombre}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {p.sku}
                          </span>
                          {p.precioVenta !== undefined && (
                            <span className="text-[10px] font-bold text-slate-600">
                              L. {Number(p.precioVenta).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
                      }`}>
                        Stock: {p.stockActual}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}
