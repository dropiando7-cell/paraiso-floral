'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Check, X, MapPin, Phone, AlertCircle, Sparkles } from 'lucide-react';

export interface ClientCatalogItem {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
}

interface ClientSmartAutocompleteProps {
  clients: ClientCatalogItem[];
  selectedClientId?: string;
  onSelect: (client: ClientCatalogItem | null) => void;
  placeholder?: string;
  isInvalid?: boolean;
  disabled?: boolean;
}

export function ClientSmartAutocomplete({
  clients,
  selectedClientId,
  onSelect,
  placeholder = 'Buscar cliente por nombre o teléfono...',
  isInvalid = false,
  disabled = false
}: ClientSmartAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find currently selected client
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // Filter clients in real time
  const filteredClients = query.trim() === ''
    ? clients.slice(0, 10)
    : clients.filter(c => {
        const q = query.toLowerCase();
        return (
          c.nombre.toLowerCase().includes(q) ||
          (c.telefono && c.telefono.toLowerCase().includes(q)) ||
          (c.direccion && c.direccion.toLowerCase().includes(q))
        );
      }).slice(0, 15);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredClients.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredClients.length) % Math.max(1, filteredClients.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredClients[selectedIndex]) {
        handleSelect(filteredClients[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (client: ClientCatalogItem) => {
    onSelect(client);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Client Card */}
      {selectedClient ? (
        <div className="flex items-center justify-between p-3 bg-blue-50/80 border border-blue-300 rounded-2xl transition-all shadow-sm">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-inner font-black text-xs">
              {selectedClient.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-slate-900 truncate">
                  {selectedClient.nombre}
                </p>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold flex items-center gap-0.5">
                  <Check className="w-3 h-3 stroke-[3]" /> Seleccionado
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[11px] text-slate-500 font-semibold">
                {selectedClient.telefono && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedClient.telefono}
                  </span>
                )}
                {selectedClient.direccion && (
                  <span className="flex items-center gap-1 truncate max-w-[220px]">
                    <MapPin className="w-3 h-3 text-slate-400" /> {selectedClient.direccion}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-blue-200/60 rounded-xl text-blue-800 transition-colors ml-2 shrink-0 active:scale-95"
              title="Cambiar cliente"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
            className={`w-full pl-10 pr-8 py-2.5 text-xs font-semibold rounded-xl border bg-white focus:outline-none transition-all placeholder:text-slate-400 ${
              isInvalid
                ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100 bg-rose-50/20'
                : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900'
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
      {isOpen && !selectedClient && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full z-[90] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Clientes en Catálogo
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredClients.length} {filteredClients.length === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>

          {/* List of matching clients */}
          <div className="p-1.5 max-h-60 overflow-y-auto divide-y divide-slate-50">
            {filteredClients.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-semibold flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-1.5" />
                <span>No se encontraron clientes para "{query}"</span>
              </div>
            ) : (
              filteredClients.map((c, idx) => {
                const isHovered = idx === selectedIndex;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isHovered ? 'bg-blue-50/80 text-blue-950' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs transition-colors ${
                        isHovered ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.nombre.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-black truncate leading-tight ${
                          isHovered ? 'text-blue-950' : 'text-slate-900'
                        }`}>
                          {c.nombre}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500 font-medium">
                          {c.telefono && (
                            <span className="flex items-center gap-0.5">
                              📞 {c.telefono}
                            </span>
                          )}
                          {c.direccion && (
                            <span className="truncate max-w-[200px]">
                              📍 {c.direccion}
                            </span>
                          )}
                        </div>
                      </div>
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
