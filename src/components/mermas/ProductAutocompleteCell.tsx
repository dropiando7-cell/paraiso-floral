'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import { Search, Sparkles, Box, RefreshCw } from 'lucide-react';
import { searchProductos } from '@/app/(dashboard)/facturas/actions';

export interface ProductCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  costoBase?: number | null;
}

interface ProductAutocompleteCellProps {
  value: string;
  onChange: (val: string) => void;
  onSelectProduct: (product: ProductCatalogItem) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ProductAutocompleteCell({
  value,
  onChange,
  onSelectProduct,
  placeholder = 'Buscar flor o producto...',
  autoFocus = false,
  onKeyDown,
  className = '',
  inputRef: inputRefProp
}: ProductAutocompleteCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<ProductCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp || internalRef;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Configuración de Floating UI para el Smart Flip (Arriba / Abajo)
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 12 }),
      shift({ padding: 12 })
    ]
  });

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda dinámica con debounce
  useEffect(() => {
    if (!isOpen || value.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchProductos(value.trim(), 25);
        const mapped: ProductCatalogItem[] = (data || []).map((p: any) => ({
          id: p.id,
          code: p.sku || '',
          name: p.nombre || '',
          category: p.categoria || p.marca || 'Misceláneo',
          stock: Number(p.stockActual) || 0,
          costoBase: p.costoBase ? Number(p.costoBase) : null
        }));
        setResults(mapped);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Error buscando productos:', err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [value, isOpen]);

  const handleSelect = (product: ProductCatalogItem) => {
    onChange(product.name);
    onSelectProduct(product);
    setIsOpen(false);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        return;
      }
      if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          handleSelect(results[selectedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    // Propagar otros eventos de teclado (como Tab o Enter para avanzar)
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="relative w-full">
      <div ref={refs.setReference} className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full h-10 px-3 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${className}`}
        />
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          </div>
        )}
      </div>

      {isOpen && value.trim().length >= 2 && (
        <FloatingPortal>
          <div
            ref={(node) => {
              refs.setFloating(node);
              (dropdownRef as any).current = node;
            }}
            style={{ ...floatingStyles, zIndex: 99999 }}
            className="w-[480px] max-w-[95vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Coincidencias en Catálogo</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 font-mono">
                <span>↑↓ navegar · ↵ elegir</span>
                <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded-full">
                  {results.length}
                </span>
              </div>
            </div>

            {/* Cabecera de columnas */}
            {results.length > 0 && (
              <div className="px-3 py-1 bg-slate-100/70 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-wider grid grid-cols-[70px_1fr_65px_80px] gap-2 items-center">
                <span>CÓDIGO</span>
                <span>DESCRIPCIÓN / FLOR</span>
                <span className="text-center">STOCK</span>
                <span className="text-right">CATEGORÍA</span>
              </div>
            )}

            {/* Lista de Resultados */}
            <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100 p-1">
              {results.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  {isLoading ? 'Buscando flores en catálogo...' : `No se encontraron flores para "${value}"`}
                </div>
              ) : (
                results.map((p, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(p);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`px-3 py-2 rounded-lg grid grid-cols-[70px_1fr_65px_80px] gap-2 items-center cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {/* Código / SKU */}
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded text-center truncate">
                        {p.code || '—'}
                      </span>

                      {/* Nombre Flor */}
                      <span className="text-xs font-black truncate uppercase text-slate-900">
                        {p.name}
                      </span>

                      {/* Stock */}
                      <div className="flex justify-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          p.stock > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {p.stock} uds
                        </span>
                      </div>

                      {/* Categoría */}
                      <span className="text-[10px] text-right text-slate-500 font-semibold truncate">
                        {p.category}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
