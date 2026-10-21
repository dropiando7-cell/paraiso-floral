'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import { Sparkles, RefreshCw, PlusCircle, CheckCircle2 } from 'lucide-react';
import Fuse from 'fuse.js';
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
  /** Si se define, muestra la opción "Crear producto nuevo" al final de la lista cuando no existe coincidencia exacta */
  onCreateNew?: (nombre: string) => void;
}

// ============================================================================
// CACHÉ EN MEMORIA DEL CATÁLOGO COMPLETO PARA BÚSQUEDA FUZZY INSTANTÁNEA
// ============================================================================
let catalogCache: ProductCatalogItem[] | null = null;
let catalogPromise: Promise<ProductCatalogItem[]> | null = null;

function mapRawToCatalogItem(p: any): ProductCatalogItem {
  return {
    id: p.id,
    code: p.sku || p.code || '',
    name: (p.nombre || p.name || '').toUpperCase(),
    category: p.categoria || p.marca || p.category || 'Misceláneo',
    stock: Number(p.stockActual ?? p.stock) || 0,
    costoBase: p.costoBase !== undefined && p.costoBase !== null ? Number(p.costoBase) : null
  };
}

export async function loadProductCatalogCache(force = false): Promise<ProductCatalogItem[]> {
  if (!force && catalogCache && catalogCache.length > 0) {
    return catalogCache;
  }
  if (!force && catalogPromise) {
    return catalogPromise;
  }
  catalogPromise = searchProductos('', 2500)
    .then((data) => {
      const mapped = (data || [])
        .filter((p: any) => !p.isOrdenTrabajo)
        .map(mapRawToCatalogItem);
      catalogCache = mapped;
      return mapped;
    })
    .catch((err) => {
      console.error('Error precargando catálogo de productos:', err);
      return catalogCache || [];
    })
    .finally(() => {
      catalogPromise = null;
    });
  return catalogPromise;
}

export function upsertProductInCatalogCache(item: ProductCatalogItem) {
  if (!catalogCache) {
    catalogCache = [item];
    return;
  }
  const idx = catalogCache.findIndex((p) => p.id === item.id);
  if (idx >= 0) {
    catalogCache[idx] = item;
  } else {
    catalogCache = [item, ...catalogCache];
  }
}

// ============================================================================
// UTILIDADES DE NORMALIZACIÓN, FONÉTICA ESPAÑOLA Y DISTANCIA DE EDICIÓN (FUZZY)
// ============================================================================
function normalizeText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemSpanishWord(word: string): string {
  if (word.length > 4 && word.endsWith('ES')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('S')) return word.slice(0, -1);
  return word;
}

function phoneticSpanish(str: string): string {
  return str
    .replace(/Z/g, 'S')
    .replace(/C([EI])/g, 'S$1')
    .replace(/V/g, 'B')
    .replace(/LL/g, 'Y')
    .replace(/H/g, '');
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > 3) return 99;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

interface RankedCatalogItem {
  item: ProductCatalogItem;
  tier: number;
  isExact: boolean;
}

function rankAndFilterProducts(
  items: ProductCatalogItem[],
  rawQuery: string,
  maxResults = 30
): RankedCatalogItem[] {
  const qNorm = normalizeText(rawQuery);
  if (qNorm.length < 2) return [];

  const qTokens = qNorm.split(' ').filter(Boolean);
  const qStems = qTokens.map(stemSpanishWord);
  const qStemJoined = qStems.join(' ');
  const qPhoneticJoined = phoneticSpanish(qStemJoined);
  const qPhoneticTokens = qStems.map(phoneticSpanish);

  // 1. Ejecutar Fuse.js sobre todo el catálogo para obtener score difuso ante errores de escritura
  const fuse = new Fuse(items, {
    keys: [
      { name: 'name', weight: 0.75 },
      { name: 'code', weight: 0.2 },
      { name: 'category', weight: 0.05 }
    ],
    threshold: 0.55,
    ignoreLocation: true,
    ignoreFieldNorm: true,
    includeScore: true,
    useExtendedSearch: true
  });

  const fuseScoreMap = new Map<string, number>();
  for (const res of fuse.search(rawQuery)) {
    fuseScoreMap.set(res.item.id, res.score ?? 0.5);
  }
  // También buscar con la versión singularizada/fonética si difiere
  if (qStemJoined !== qNorm) {
    for (const res of fuse.search(qStemJoined)) {
      const prev = fuseScoreMap.get(res.item.id);
      const sc = res.score ?? 0.5;
      if (prev === undefined || sc < prev) {
        fuseScoreMap.set(res.item.id, sc);
      }
    }
  }

  const scored: {
    item: ProductCatalogItem;
    tier: number;
    isExact: boolean;
    matchedTokens: number;
    exactTokens: number;
    editPenalty: number;
    fuseScore: number;
    nameLen: number;
  }[] = [];

  for (const item of items) {
    const nameNorm = normalizeText(item.name);
    const codeNorm = normalizeText(item.code);
    const nameTokens = nameNorm.split(' ').filter(Boolean);
    const nameStems = nameTokens.map(stemSpanishWord);
    const nameStemJoined = nameStems.join(' ');
    const namePhoneticJoined = phoneticSpanish(nameStemJoined);
    const namePhoneticTokens = nameStems.map(phoneticSpanish);
    const fScore = fuseScoreMap.get(item.id) ?? 1;

    // Tier 0: Coincidencia exacta de Código / SKU
    if (codeNorm && codeNorm === qNorm) {
      scored.push({
        item,
        tier: 0,
        isExact: true,
        matchedTokens: qTokens.length,
        exactTokens: qTokens.length,
        editPenalty: 0,
        fuseScore: 0,
        nameLen: nameNorm.length
      });
      continue;
    }

    // Tier 1: Coincidencia exacta de Nombre (incluyendo singular/plural o equivalencia fonética ej. ROSAS COLORES / ROSA COLORES / ROZAS COLORES)
    if (
      nameNorm === qNorm ||
      nameStemJoined === qStemJoined ||
      (qPhoneticJoined.length >= 3 && namePhoneticJoined === qPhoneticJoined)
    ) {
      scored.push({
        item,
        tier: 1,
        isExact: true,
        matchedTokens: qTokens.length,
        exactTokens: qTokens.length,
        editPenalty: nameNorm === qNorm ? 0 : 1,
        fuseScore: 0,
        nameLen: nameNorm.length
      });
      continue;
    }

    // Tier 2: El nombre o código empieza exactamente con toda la frase buscada (ej. "ROSAS COLORES ECUADOR" al buscar "ROSAS COLORES")
    if (
      nameNorm.startsWith(qNorm) ||
      nameStemJoined.startsWith(qStemJoined) ||
      (qPhoneticJoined.length >= 4 && namePhoneticJoined.startsWith(qPhoneticJoined)) ||
      codeNorm.startsWith(qNorm)
    ) {
      scored.push({
        item,
        tier: 2,
        isExact: false,
        matchedTokens: qTokens.length,
        exactTokens: qTokens.length,
        editPenalty: 0,
        fuseScore: fScore,
        nameLen: nameNorm.length
      });
      continue;
    }

    // Tier 3: El nombre contiene la frase completa exacta (ej. al buscar "COLORES", "ROSAS COLORES" va antes que "ROSAS COLORES ECUADOR" por menor longitud)
    if (
      nameNorm.includes(qNorm) ||
      nameStemJoined.includes(qStemJoined) ||
      (qPhoneticJoined.length >= 4 && namePhoneticJoined.includes(qPhoneticJoined))
    ) {
      // Contar palabras exactas para desempatar
      let exactCount = 0;
      for (let i = 0; i < qStems.length; i++) {
        if (nameStems.includes(qStems[i]) || namePhoneticTokens.includes(qPhoneticTokens[i])) {
          exactCount++;
        }
      }
      scored.push({
        item,
        tier: 3,
        isExact: false,
        matchedTokens: qTokens.length,
        exactTokens: exactCount,
        editPenalty: 0,
        fuseScore: fScore,
        nameLen: nameNorm.length
      });
      continue;
    }

    // Evaluar coincidencia palabra por palabra (exacta, prefijo o difusa Levenshtein)
    let exactTokenMatches = 0;
    let prefixOrSubMatches = 0;
    let fuzzyTokenMatches = 0;
    let totalEditDistance = 0;

    for (let i = 0; i < qTokens.length; i++) {
      const qt = qTokens[i];
      const qs = qStems[i];
      const qp = qPhoneticTokens[i];

      // 1) ¿Palabra exacta o raíz exacta o fonética exacta?
      const exactIdx = nameTokens.findIndex(
        (nt, idx) => nt === qt || nameStems[idx] === qs || (qp.length >= 3 && namePhoneticTokens[idx] === qp)
      );
      if (exactIdx >= 0) {
        exactTokenMatches++;
        prefixOrSubMatches++;
        fuzzyTokenMatches++;
        continue;
      }

      // 2) ¿Prefijo o subcadena dentro de alguna palabra o código?
      const subMatch =
        nameTokens.some(
          (nt, idx) =>
            nt.startsWith(qt) ||
            nameStems[idx].startsWith(qs) ||
            (qp.length >= 3 && namePhoneticTokens[idx].startsWith(qp)) ||
            (qt.length >= 3 && nt.includes(qt))
        ) || codeNorm.includes(qt);

      if (subMatch) {
        prefixOrSubMatches++;
        fuzzyTokenMatches++;
        totalEditDistance += 1;
        continue;
      }

      // 3) ¿Coincidencia difusa por distancia de edición (errores de dedo ej. "ROZAS COLORE", "GERVERA", "GIRAZOL")?
      const maxAllowedDist = qs.length >= 6 ? 2 : qs.length >= 4 ? 1 : 0;
      if (maxAllowedDist > 0) {
        let bestDist = 99;
        for (let idx = 0; idx < nameStems.length; idx++) {
          const ns = nameStems[idx];
          const np = namePhoneticTokens[idx];
          // Comparar tanto contra la palabra completa como contra el prefijo del mismo largo
          const d1 = levenshteinDistance(qs, ns);
          const d2 = levenshteinDistance(qp, np);
          const d3 = ns.length > qs.length ? levenshteinDistance(qs, ns.slice(0, qs.length)) : 99;
          const minD = Math.min(d1, d2, d3);
          if (minD < bestDist) bestDist = minD;
        }
        if (bestDist <= maxAllowedDist) {
          fuzzyTokenMatches++;
          totalEditDistance += bestDist;
        }
      }
    }

    // Tier 4: Todas las palabras buscadas están presentes (como palabra o subcadena/prefijo)
    if (qTokens.length > 0 && prefixOrSubMatches === qTokens.length) {
      scored.push({
        item,
        tier: 4,
        isExact: false,
        matchedTokens: prefixOrSubMatches,
        exactTokens: exactTokenMatches,
        editPenalty: totalEditDistance,
        fuseScore: fScore,
        nameLen: nameNorm.length
      });
      continue;
    }

    // Tier 5: Todas las palabras buscadas coinciden incluyendo tolerancia a errores ortográficos (Levenshtein / fonética)
    if (qTokens.length > 0 && fuzzyTokenMatches === qTokens.length) {
      scored.push({
        item,
        tier: 5,
        isExact: false,
        matchedTokens: fuzzyTokenMatches,
        exactTokens: exactTokenMatches,
        editPenalty: totalEditDistance,
        fuseScore: fScore,
        nameLen: nameNorm.length
      });
      continue;
    }

    // Tier 6: Coincidencias parciales o difusas de Fuse.js (al menos una palabra coincide o Fuse dio buen score)
    if (fuzzyTokenMatches > 0 || fScore <= 0.45) {
      scored.push({
        item,
        tier: 6,
        isExact: false,
        matchedTokens: fuzzyTokenMatches,
        exactTokens: exactTokenMatches,
        editPenalty: totalEditDistance,
        fuseScore: fScore,
        nameLen: nameNorm.length
      });
    }
  }

  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.matchedTokens !== b.matchedTokens) return b.matchedTokens - a.matchedTokens;
    if (a.exactTokens !== b.exactTokens) return b.exactTokens - a.exactTokens;
    if (a.editPenalty !== b.editPenalty) return a.editPenalty - b.editPenalty;
    if (a.nameLen !== b.nameLen) return a.nameLen - b.nameLen;
    if (Math.abs(a.fuseScore - b.fuseScore) > 0.05) return a.fuseScore - b.fuseScore;
    return a.item.name.localeCompare(b.item.name);
  });

  return scored.slice(0, maxResults).map((s) => ({
    item: s.item,
    tier: s.tier,
    isExact: s.isExact
  }));
}

export function ProductAutocompleteCell({
  value,
  onChange,
  onSelectProduct,
  placeholder = 'Buscar flor o producto...',
  autoFocus = false,
  onKeyDown,
  className = '',
  inputRef: inputRefProp,
  onCreateNew
}: ProductAutocompleteCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allCatalog, setAllCatalog] = useState<ProductCatalogItem[]>(catalogCache || []);
  const [remoteResults, setRemoteResults] = useState<ProductCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp || internalRef;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

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

  // Precargar el catálogo completo al montar para que Fuse.js tenga todos los productos disponibles al instante
  useEffect(() => {
    let mounted = true;
    loadProductCatalogCache(false).then((items) => {
      if (mounted && items.length > 0) {
        setAllCatalog(items);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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
  }, [inputRef]);

  // Respaldo dinámico contra servidor para capturar productos recién creados en otras terminales
  useEffect(() => {
    const q = value.trim();
    if (!isOpen || q.length < 2) {
      setRemoteResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchProductos(q, 60);
        const mapped: ProductCatalogItem[] = (data || [])
          .filter((p: any) => !p.isOrdenTrabajo)
          .map(mapRawToCatalogItem);
        setRemoteResults(mapped);
        // Integrar también en caché local cualquier producto nuevo
        if (mapped.length > 0 && catalogCache) {
          const map = new Map<string, ProductCatalogItem>();
          for (const item of catalogCache) map.set(item.id, item);
          for (const item of mapped) map.set(item.id, item);
          catalogCache = Array.from(map.values());
          setAllCatalog(catalogCache);
        }
      } catch (err) {
        console.error('Error buscando productos:', err);
      } finally {
        setIsLoading(false);
      }
    }, 140);

    return () => clearTimeout(timer);
  }, [value, isOpen]);

  // Combinar catálogo local precargado + resultados remotos y aplicar el motor de ranking inteligente + Fuse.js
  const rankedResults = useMemo(() => {
    if (!isOpen || value.trim().length < 2) return [];
    const mergedMap = new Map<string, ProductCatalogItem>();
    for (const p of allCatalog) mergedMap.set(p.id, p);
    for (const p of remoteResults) mergedMap.set(p.id, p);
    return rankAndFilterProducts(Array.from(mergedMap.values()), value.trim(), 30);
  }, [allCatalog, remoteResults, value, isOpen]);

  const results = useMemo(() => rankedResults.map((r) => r.item), [rankedResults]);
  const hasExactCatalogMatch = useMemo(
    () => rankedResults.some((r) => r.isExact),
    [rankedResults]
  );

  // Reiniciar selección al primer resultado (#1 más coincidente) cuando cambia el texto
  useEffect(() => {
    setSelectedIndex(0);
  }, [value]);

  // Mantener visible la fila seleccionada al navegar con teclado
  useEffect(() => {
    if (!isOpen || !listContainerRef.current) return;
    const activeEl = listContainerRef.current.querySelector(`[data-option-idx="${selectedIndex}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isOpen]);

  const handleSyncCatalog = async () => {
    setIsSyncing(true);
    try {
      const fresh = await loadProductCatalogCache(true);
      setAllCatalog(fresh);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelect = (product: ProductCatalogItem) => {
    setIsOpen(false);
    onChange(product.name);
    onSelectProduct(product);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    onCreateNew?.(value.trim());
  };

  // Solo mostrar la acción de "Crear producto nuevo" si NO existe ya una coincidencia exacta en el catálogo
  const showCreate = !!onCreateNew && !hasExactCatalogMatch && value.trim().length >= 2;
  const totalOptions = results.length + (showCreate ? 1 : 0);
  const createIndex = results.length;

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && totalOptions > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalOptions);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalOptions) % totalOptions);
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        if (results[selectedIndex]) {
          e.preventDefault();
          handleSelect(results[selectedIndex]);
          return;
        }
        if (showCreate && selectedIndex === createIndex) {
          e.preventDefault();
          handleCreateNew();
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    // Propagar otros eventos de teclado (como Tab o Ctrl+Enter)
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
          onFocus={(e) => {
            e.currentTarget.select();
            if (value.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full h-10 px-3 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${className}`}
        />
        {(isLoading || isSyncing) && (
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
            className="w-[520px] max-w-[95vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Coincidencias Inteligentes en Catálogo</span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSyncCatalog();
                  }}
                  title="Actualizar catálogo de flores desde la base de datos"
                  className="p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-emerald-700 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
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
              <div className="px-3 py-1 bg-slate-100/70 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-wider grid grid-cols-[74px_1fr_65px_85px] gap-2 items-center">
                <span>CÓDIGO</span>
                <span>DESCRIPCIÓN / FLOR</span>
                <span className="text-center">STOCK</span>
                <span className="text-right">CATEGORÍA</span>
              </div>
            )}

            {/* Lista de Resultados */}
            <div
              ref={listContainerRef}
              className="max-h-[280px] overflow-y-auto divide-y divide-slate-100 p-1"
            >
              {results.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  {isLoading ? 'Buscando flores en catálogo...' : `No se encontraron flores para "${value}"`}
                </div>
              ) : (
                rankedResults.map(({ item: p, isExact }, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={p.id}
                      data-option-idx={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(p);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`px-3 py-2 rounded-lg grid grid-cols-[74px_1fr_65px_85px] gap-2 items-center cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-300'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {/* Código / SKU */}
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded text-center truncate">
                        {p.code || '—'}
                      </span>

                      {/* Nombre Flor + Badge de Coincidencia Exacta */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-black truncate uppercase text-slate-900">
                          {p.name}
                        </span>
                        {isExact && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Exacto
                          </span>
                        )}
                      </div>

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

            {/* Aviso cuando ya existe coincidencia exacta para evitar códigos duplicados */}
            {hasExactCatalogMatch && (
              <div className="px-3 py-1.5 bg-emerald-50/90 border-t border-emerald-200 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Este producto ya está registrado en el catálogo. Presiona Enter para seleccionarlo.</span>
              </div>
            )}

            {/* Opción: Crear producto nuevo (solo si NO hay coincidencia exacta) */}
            {showCreate && (
              <div
                data-option-idx={createIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreateNew();
                }}
                onMouseEnter={() => setSelectedIndex(createIndex)}
                className={`mx-1 mb-1 px-3 py-2.5 rounded-lg border border-dashed flex items-center gap-2 cursor-pointer transition-colors text-xs font-black ${
                  selectedIndex === createIndex
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>
                  Crear producto nuevo: <span className="uppercase">"{value.trim()}"</span>
                </span>
                {results.length === 0 && (
                  <span className="ml-auto text-[10px] font-mono text-slate-400">↵</span>
                )}
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

