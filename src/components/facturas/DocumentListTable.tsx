'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, MoreHorizontal, FileText, CheckCircle2, AlertCircle, Copy, MessageCircle, Download, Pencil, Printer, Ban, AlertTriangle, X, Undo } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { anularDocumento } from '@/app/(dashboard)/facturas/actions';

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
  detalles?: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    totalLinea: number;
  }[];
}

interface Props {
  data: DocumentRecord[];
  type: 'FACTURA' | 'COTIZACION' | 'PROFORMA' | 'TODOS';
}

const fmt = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(n);

export default function DocumentListTable({ data, type }: Props) {
  const [search, setSearch] = useState('');
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [isAnulando, setIsAnulando] = useState<string | null>(null);
  const [docToAnul, setDocToAnul] = useState<DocumentRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<'fechaEmision' | 'total' | 'correlativo' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when criteria changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, showAnuladas, type]);

  const confirmAnular = async () => {
    if (!docToAnul) return;
    const id = docToAnul.id;
    setDocToAnul(null);
    setIsAnulando(id);
    const toastId = toast.loading('Anulando documento e inventario...');
    try {
      const res = await anularDocumento(id);
      if (res.success) {
        toast.success('El documento ha sido anulado con éxito', { id: toastId });
      } else {
        toast.error(res.error || 'Error al anular el documento', { id: toastId });
      }
    } catch (e: any) {
       toast.error(e.message || 'Error del servidor al anular', { id: toastId });
    } finally {
       setIsAnulando(null);
    }
  };

  const handleSort = (field: 'fechaEmision' | 'total' | 'correlativo') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredData = useMemo(() => {
    // 1. Filter
    const filtered = data.filter(doc => {
      // Filter out anuladas if the toggle is off
      if (!showAnuladas && doc.estado === 'ANULADA') return false;
      
      // Si estamos en la pestaña FACTURA, mostrar tanto facturas como notas de crédito
      if (type === 'FACTURA') {
        if (doc.tipoDocumento !== 'FACTURA' && doc.tipoDocumento !== 'NOTA_CREDITO') return false;
      } else if (type !== 'TODOS' && doc.tipoDocumento !== type) {
        return false;
      }
      
      const q = search.toLowerCase();
      return doc.correlativo.toLowerCase().includes(q) || 
             doc.clienteNombre.toLowerCase().includes(q) ||
             (doc.clienteRtn && doc.clienteRtn.toLowerCase().includes(q));
    });

    // 2. Sort
    if (sortField) {
      filtered.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'fechaEmision') {
          valA = new Date(a.fechaEmision).getTime();
          valB = new Date(b.fechaEmision).getTime();
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: sort by date descending
      filtered.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
    }

    return filtered;
  }, [data, type, search, showAnuladas, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'BORRADOR': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">Borrador</span>;
      case 'EMITIDA': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">Emitida</span>;
      case 'CONVERTIDA': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-blue-50 text-blue-600 border border-blue-200" title="Este documento fue convertido en otro">Convertida</span>;
      case 'PENDIENTE': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-yellow-50 text-yellow-600 border border-yellow-200">Pendiente</span>;
      case 'ANULADA': return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-red-50 text-red-600 border border-red-200">Anulada</span>;
      default: return <span className="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">{estado}</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {type === 'FACTURA' ? 'Historial de Facturas' : type === 'COTIZACION' ? 'Historial de Cotizaciones' : 'Documentos Recientes'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">Mostrando {filteredData.length} resultados encontrados.</p>
        </div>
        <div className="relative w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center sm:justify-start shadow-sm">
            <input 
              type="checkbox" 
              checked={showAnuladas}
              onChange={e => setShowAnuladas(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-slate-600 select-none">Mostrar Anuladas</span>
          </label>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar correlativo o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1 min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
              <th 
                onClick={() => handleSort('correlativo')}
                className="p-4 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Documento
                  {sortField === 'correlativo' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th className="p-4 border-b border-slate-200">Cliente / Entidad</th>
              <th 
                onClick={() => handleSort('fechaEmision')}
                className="p-4 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Emisión
                  {sortField === 'fechaEmision' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('total')}
                className="p-4 border-b border-slate-200 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Monto Total
                  {sortField === 'total' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th className="p-4 border-b border-slate-200 text-center">Estado</th>
              <th className="p-4 border-b border-slate-200 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center text-slate-400 h-64">
                   <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-base font-semibold text-slate-600">No hay registros</p>
                   <p className="text-sm mt-1">No se encontraron documentos {search && 'con esa búsqueda'}.</p>
                </td>
              </tr>
            ) : paginatedData.map(doc => (
              <React.Fragment key={doc.id}>
                <tr 
                  onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                  className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${expandedId === doc.id ? 'bg-blue-50/30' : ''}`}
                >
                  <td className="p-4 align-middle">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${doc.tipoDocumento === 'FACTURA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : doc.tipoDocumento === 'NOTA_CREDITO' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                       {doc.tipoDocumento === 'FACTURA' ? <CheckCircle2 size={18} /> : doc.tipoDocumento === 'NOTA_CREDITO' ? <Undo size={18} /> : <FileText size={18} />}
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
                  <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Link href={`/facturas/ver/${doc.id}?print=true`} title="Imprimir Documento" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Printer size={16} />
                    </Link>
                    <Link href={`/facturas/ver/${doc.id}?download=true`} title="Descargar PDF" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors">
                      <Download size={16} />
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
                    {doc.tipoDocumento === 'FACTURA' && doc.estado === 'EMITIDA' && (
                      <Link href={`/facturas/${doc.id}?notaCredito=true`} title="Generar Nota de Crédito" className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors">
                        <Undo size={16} />
                      </Link>
                    )}
                    {doc.estado !== 'ANULADA' && (
                      <button 
                        onClick={() => setDocToAnul(doc)} 
                        disabled={isAnulando === doc.id}
                        title="Anular Documento" 
                        className={`p-2 rounded-lg transition-colors ${isAnulando === doc.id ? 'text-slate-300' : 'text-slate-400 hover:text-red-600 hover:bg-red-100'}`}
                      >
                        <Ban size={16} className={isAnulando === doc.id ? 'animate-pulse' : ''} />
                      </button>
                    )}
                    <Link href={`/facturas/${doc.id}?clone=true`} title="Duplicar Documento" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Copy size={16} />
                    </Link>
                  </div>
                </td>
              </tr>
              {expandedId === doc.id && doc.detalles && (
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <td colSpan={6} className="p-0">
                    <div className="animate-in slide-in-from-top-4 fade-in duration-200">
                      <div className="px-6 py-4 flex gap-6">
                         <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-hidden">
                           <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                             <FileText size={14} className="text-slate-300" /> Detalle de Productos
                           </h4>
                           <div className="space-y-2">
                             {doc.detalles.map((det, i) => (
                               <div key={i} className="flex justify-between items-start text-sm py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                                 <div className="flex gap-3 min-w-0 flex-1 pr-4">
                                   <span className="font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-xs shrink-0 self-start mt-0.5">{det.cantidad}x</span>
                                   <div 
                                      className="font-semibold text-slate-700 text-xs line-clamp-3 leading-relaxed [&_p]:inline [&_p]:m-0" 
                                      title={det.descripcion.replace(/<[^>]+>/g, '')}
                                      dangerouslySetInnerHTML={{ __html: det.descripcion }}
                                   />
                                 </div>
                                 <div className="flex gap-4 shrink-0 font-mono text-xs mt-0.5">
                                   <span className="text-slate-400">{fmt(det.precioUnitario)} c/u</span>
                                   <span className="font-bold text-slate-800 w-20 text-right">{fmt(det.totalLinea)}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                           <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center px-2">
                             <span className="text-xs font-bold text-slate-500 uppercase">Total Documento</span>
                             <span className="font-black text-lg text-blue-600">{fmt(doc.total)}</span>
                           </div>
                         </div>
                         <div className="w-64 shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between hidden md:flex">
                            <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Acciones Rápidas</p>
                               <h3 className="font-bold text-lg leading-tight truncate">{doc.correlativo}</h3>
                               <p className="text-xs text-slate-300 mb-4">{doc.clienteNombre}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                               <Link href={`/facturas/ver/${doc.id}`} className="flex items-center justify-center w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors text-xs gap-2 shadow-inner">
                                 <Eye size={14} /> Vista Completa
                               </Link>
                            </div>
                         </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs text-slate-500 font-semibold">
            Mostrando <span className="font-bold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> a{' '}
            <span className="font-bold text-slate-700">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span>{' '}
            de <span className="font-bold text-slate-700">{filteredData.length}</span> resultados
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg transition ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {docToAnul && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-8 border-red-50">
                <AlertTriangle size={28} className="stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Anular esta {docToAnul.tipoDocumento.toLowerCase()}?</h3>
              <p className="text-sm text-slate-500 font-medium px-2 leading-relaxed">
                Estás a punto de anular el documento <strong className="text-slate-700">{docToAnul.correlativo}</strong> de <strong className="text-slate-700">{docToAnul.clienteNombre}</strong>.
              </p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 text-left">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-700">Esta acción restaurará el stock de inventario asignado a esta factura y dejará rastros de auditoría a tu nombre. No puede deshacerse.</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setDocToAnul(null)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAnular}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-500 border border-red-500 rounded-xl hover:bg-red-600 transition-all shadow-sm shadow-red-200"
              >
                Sí, Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
