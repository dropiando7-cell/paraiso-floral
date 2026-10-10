'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, User, Check, Sparkles, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface ClienteOption {
  id: string;
  nombre: string;
  departamento?: string | null;
  telefono?: string | null;
  saldoTotal?: number;
}

interface ClienteSearchSwitcherProps {
  currentClienteId?: string;
  currentClienteNombre?: string;
  onSelectCliente?: (clienteId: string, cliente?: ClienteOption) => void;
  navigateToPage?: boolean; // Si es true, redirige a /cxc/cliente/[id]
  className?: string;
  placeholder?: string;
}

export default function ClienteSearchSwitcher({
  currentClienteId,
  currentClienteNombre,
  onSelectCliente,
  navigateToPage = false,
  className = '',
  placeholder = '🔍 Buscar cliente para cambiar rápido...'
}: ClienteSearchSwitcherProps) {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/cxc/clientes?filtro=TODOS');
        if (res.ok) {
          const data = await res.json();
          setClientes(
            data.map((c: any) => ({
              id: c.id,
              nombre: c.nombre,
              departamento: c.departamento,
              telefono: c.telefono,
              saldoTotal: Number(c.saldoTotal || 0)
            }))
          );
        }
      } catch (err) {
        console.error('Error cargando lista de clientes para switcher:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar clientes
  const clientesFiltrados = React.useMemo(() => {
    if (!search.trim()) return clientes.slice(0, 50); // Mostrar primeros 50 si no busca
    const term = search.toLowerCase().trim();
    return clientes.filter(
      c =>
        c.nombre.toLowerCase().includes(term) ||
        (c.departamento && c.departamento.toLowerCase().includes(term)) ||
        (c.telefono && c.telefono.includes(term))
    );
  }, [clientes, search]);

  const handleSelect = (c: ClienteOption) => {
    setIsOpen(false);
    setSearch('');
    if (navigateToPage) {
      router.push(`/cxc/cliente/${c.id}`);
    }
    if (onSelectCliente) {
      onSelectCliente(c.id, c);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < clientesFiltrados.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : clientesFiltrados.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (clientesFiltrados[selectedIndex]) {
        handleSelect(clientesFiltrados[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clienteActualObj = clientes.find(c => c.id === currentClienteId);
  const nombreAMostrar = currentClienteNombre || clienteActualObj?.nombre || 'Seleccionar cliente...';

  return (
    <div ref={containerRef} className={`relative z-30 ${className}`}>
      {/* Input / Trigger */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 pointer-events-none">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : ''}
          onFocus={() => {
            setIsOpen(true);
            setSearch('');
          }}
          onChange={e => {
            setSearch(e.target.value.toUpperCase());
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? 'Escribe nombre, teléfono o ubicación...' : nombreAMostrar}
          className="w-full pl-9 pr-9 py-2 bg-white border-2 border-emerald-500/40 hover:border-emerald-500 focus:border-emerald-600 rounded-2xl text-xs font-black text-slate-900 placeholder:text-slate-700 placeholder:font-bold shadow-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown flotante */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-50 animate-fadeIn">
          <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase px-3">
            <span>Campo Inteligente ({clientesFiltrados.length} clientes encontrados)</span>
            <span>Acceso Rápido</span>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-500 font-medium">Cargando clientes...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No se encontraron clientes con ese término.</div>
          ) : (
            <div className="py-1 divide-y divide-slate-50">
              {clientesFiltrados.map((c, idx) => {
                const isCurrent = c.id === currentClienteId;
                const isHighlighted = idx === selectedIndex;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isHighlighted ? 'bg-emerald-50/90' : 'hover:bg-slate-50'
                    } ${isCurrent ? 'bg-emerald-100/50' : ''}`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900 truncate">{c.nombre}</span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-600 text-white shrink-0">
                            <Check className="w-2.5 h-2.5" /> Actual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        {c.departamento && (
                          <span className="flex items-center gap-0.5 text-slate-600">
                            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                            {c.departamento}
                          </span>
                        )}
                        {c.telefono && <span>📱 {c.telefono}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-xs text-emerald-700">
                        L. {c.saldoTotal?.toLocaleString('es-HN', { minimumFractionDigits: 2 }) || '0.00'}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Saldo Total</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
