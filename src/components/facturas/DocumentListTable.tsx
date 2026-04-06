'use client';

import React, { useState, useMemo } from 'react';
import { Search, Eye, MoreHorizontal, FileText, CheckCircle2, AlertCircle, Copy, MessageCircle, Download, Pencil, Printer } from 'lucide-react';
import Link from 'next/link';

export interface DocumentRecord {
  id: string;
  correlativo: string;
  tipoDocumento: string;
  estado: string;
  fechaEmision: string;
  validezDias: number | null;
  clienteNombre: string;
  clienteRtn: string;
  total: number;
}

interface Props {
  data: DocumentRecord[];
  type: 'FACTURA' | 'COTIZACION' | 'PROFORMA' | 'TODOS';
}

const fmt = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(n);

export default function DocumentListTable({ data, type }: Props) {
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    return data.filter(doc => {
      // If type isn't TODOS, filter by type
      if (type !== 'TODOS' && doc.tipoDocumento !== type) return false;
      
      const q = search.toLowerCase();
      return doc.correlativo.toLowerCase().includes(q) || 
             doc.clienteNombre.toLowerCase().includes(q) ||
             (doc.clienteRtn && doc.clienteRtn.toLowerCase().includes(q));
    });
  }, [data, type, search]);

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'BORRADOR': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">Borrador</span>;
      case 'EMITIDA': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">Emitida</span>;
      case 'PENDIENTE': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-yellow-50 text-yellow-600 border border-yellow-200">Pendiente</span>;
      case 'ANULADA': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-red-50 text-red-600 border border-red-200">Anulada</span>;
      default: return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">{estado}</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {type === 'FACTURA' ? 'Historial de Facturas' : type === 'COTIZACION' ? 'Historial de Cotizaciones' : 'Documentos Recientes'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">Mostrando {filteredData.length} resultados encontrados.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar correlativo o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-80 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1 min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
              <th className="p-4 border-b border-slate-200">Documento</th>
              <th className="p-4 border-b border-slate-200">Cliente / Entidad</th>
              <th className="p-4 border-b border-slate-200">Emisión</th>
              <th className="p-4 border-b border-slate-200 text-right">Monto Total</th>
              <th className="p-4 border-b border-slate-200 text-center">Estado</th>
              <th className="p-4 border-b border-slate-200 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center text-slate-400 h-64">
                   <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-base font-semibold text-slate-600">No hay registros</p>
                   <p className="text-sm mt-1">No se encontraron documentos {search && 'con esa búsqueda'}.</p>
                </td>
              </tr>
            ) : filteredData.map(doc => (
              <tr key={doc.id} className="hover:bg-blue-50/50 transition-colors group">
                <td className="p-4 align-middle">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${doc.tipoDocumento === 'FACTURA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                       {doc.tipoDocumento === 'FACTURA' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                     </div>
                     <div>
                       <p className="font-bold text-slate-800 tabular-nums">{doc.correlativo}</p>
                       <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{doc.tipoDocumento}</p>
                     </div>
                   </div>
                </td>
                <td className="p-4 align-middle max-w-[250px]">
                  <p className="font-semibold text-slate-800 truncate">{doc.clienteNombre}</p>
                  {doc.clienteRtn && <p className="text-xs text-slate-400 font-mono mt-0.5">RTN: {doc.clienteRtn}</p>}
                </td>
                <td className="p-4 align-middle">
                  <p className="font-medium text-slate-600">{new Date(doc.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Vence en {doc.validezDias || 30} d</p>
                </td>
                <td className="p-4 align-middle text-right">
                  <p className="font-bold text-slate-800 tracking-tight text-base">{fmt(doc.total)}</p>
                </td>
                <td className="p-4 align-middle text-center">
                  {getStatusBadge(doc.estado)}
                </td>
                <td className="p-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/facturas/ver/${doc.id}?print=true`} title="Imprimir Documento" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Printer size={16} />
                    </Link>
                    <Link href={`/facturas/${doc.id}`} title="Editar Documento" className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors">
                      <Pencil size={16} />
                    </Link>
                    <button 
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Aquí tienes tu documento: ${window.location.origin}/facturas/ver/${doc.id}`)}`, '_blank')} 
                      title="Enviar por WhatsApp" 
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button title="Duplicar" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Copy size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
