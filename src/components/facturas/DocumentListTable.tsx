'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, MoreHorizontal, FileText, CheckCircle2, AlertCircle, Copy, MessageCircle, Download, Pencil, Printer, Ban, AlertTriangle, X, Undo, Mail, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { anularDocumento, limpiarBorradoresTemporalesHuecos, confirmarTransferencia } from '@/app/(dashboard)/facturas/actions';
import SendEmailModal from '@/components/facturas/SendEmailModal';
import { isCredito, getDiasCredito, calcularFechaVencimiento } from '@/utils/facturaUtils';

export interface DocumentRecord {
  id: string;
  correlativo: string;
  tipoDocumento: string;
  estado: string;
  fechaEmision: string;
  fechaVencimiento?: string | null;
  terminosPago?: string | null;
  saldoPendiente?: number | null;
  estadoPago?: string | null;
  validezDias: number | null;
  clienteNombre: string;
  clienteRtn: string;
  total: number;
  metodoPago?: string | null;
  aliasVenta?: string;
  transferenciaConfirmada?: boolean;
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
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [isAnulando, setIsAnulando] = useState<string | null>(null);
  const [docToAnul, setDocToAnul] = useState<DocumentRecord | null>(null);
  const [docToConfirmTransfer, setDocToConfirmTransfer] = useState<DocumentRecord | null>(null);
  const [docToPrint, setDocToPrint] = useState<DocumentRecord | null>(null);
  const [ticketPreview, setTicketPreview] = useState<DocumentRecord | null>(null);
  const [directPrint, setDirectPrint] = useState(false);
  useEffect(() => { setDirectPrint(localStorage.getItem('pos_direct_print') === 'true'); }, []);

  // Listener para presionar Enter e imprimir el ticket cuando el modal esté abierto
  useEffect(() => {
    if (!ticketPreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = document.getElementById('btn-imprimir-ticket') as HTMLButtonElement | null;
        if (btn) btn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setTicketPreview(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ticketPreview]);
  
  // Email modal states
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false);
  const [sendEmailDocId, setSendEmailDocId] = useState('');

  const handleSendEmail = (id: string) => {
    setSendEmailDocId(id);
    setSendEmailModalOpen(true);
  };

  // Sorting state
  const [sortField, setSortField] = useState<'fechaEmision' | 'total' | 'correlativo' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isCleaningDrafts, setIsCleaningDrafts] = useState(false);
  const [filterOrigen, setFilterOrigen] = useState<'TODOS' | 'PARAISO' | 'HF'>('TODOS');
  const [showPendientesTrans, setShowPendientesTrans] = useState(false);
  const [showCredito, setShowCredito] = useState(false);
  const [showCreditosVencidos, setShowCreditosVencidos] = useState(false);

  // Auto-clean legacy empty "Borrador Temporal" records on mount
  useEffect(() => {
    limpiarBorradoresTemporalesHuecos().catch(err => console.error("Auto-clean error:", err));
  }, []);

  const handleCleanDrafts = async () => {
    setIsCleaningDrafts(true);
    try {
      const res = await limpiarBorradoresTemporalesHuecos();
      if (res.success) {
        if (res.count && res.count > 0) {
          toast.success(`Se depuraron ${res.count} borradores en cero del historial`);
        } else {
          toast.success('No hay borradores en cero por depurar');
        }
      } else {
        toast.error(res.error || 'Error al depurar borradores');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al depurar borradores');
    } finally {
      setIsCleaningDrafts(false);
    }
  };

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

  const handleConfirmarTransferencia = async () => {
    if (!docToConfirmTransfer) return;
    const id = docToConfirmTransfer.id;
    setDocToConfirmTransfer(null);
    const toastId = toast.loading('Confirmando transferencia...');
    try {
      const res = await confirmarTransferencia(id);
      if (res.success) {
        toast.success('Transferencia confirmada con éxito', { id: toastId });
        router.refresh();
      } else {
        toast.error(res.error || 'Error al confirmar transferencia', { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || 'Error del servidor', { id: toastId });
    }
  };

  const filteredData = useMemo(() => {
    const filtered = data.filter(doc => {
      if (!showAnuladas && doc.estado === 'ANULADA') return false;
      
      if (type === 'FACTURA') {
        if (doc.tipoDocumento !== 'FACTURA' && doc.tipoDocumento !== 'NOTA_CREDITO') return false;
      } else if (type !== 'TODOS' && doc.tipoDocumento !== type) {
        return false;
      }

      if (filterOrigen === 'PARAISO' && doc.aliasVenta === 'HonduFlores') return false;
      if (filterOrigen === 'HF' && doc.aliasVenta !== 'HonduFlores') return false;
      
      if (showPendientesTrans) {
        if (doc.metodoPago !== 'Transferencia' || doc.transferenciaConfirmada || isCredito(doc.terminosPago)) return false;
      }

      if (showCredito) {
        if (!isCredito(doc.terminosPago)) return false;
      }

      if (showCreditosVencidos) {
        if (!isCredito(doc.terminosPago)) return false;
        const fVenc = doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : calcularFechaVencimiento(doc.fechaEmision, doc.terminosPago, doc.validezDias || 30);
        if (!fVenc || fVenc.getTime() >= new Date().getTime() || doc.estadoPago === 'PAGADA') return false;
      }
      
      const q = search.toLowerCase();
      return doc.correlativo.toLowerCase().includes(q) || 
             doc.clienteNombre.toLowerCase().includes(q) ||
             (doc.clienteRtn && doc.clienteRtn.toLowerCase().includes(q));
    });

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
      filtered.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
    }

    return filtered;
  }, [data, type, search, showAnuladas, sortField, sortDirection, filterOrigen, showPendientesTrans, showCredito, showCreditosVencidos]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusBadge = (doc: DocumentRecord) => {
    let badge = null;
    switch (doc.estado) {
      case 'BORRADOR': badge = <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-md bg-slate-100 text-slate-600 border border-slate-200">Borrador</span>; break;
      case 'EMITIDA': badge = <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Emitida</span>; break;
      case 'CONVERTIDA': badge = <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-md bg-blue-50 text-blue-700 border border-blue-200" title="Este documento fue convertido en otro">Convertida</span>; break;
      case 'PENDIENTE': badge = <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-md bg-amber-50 text-amber-700 border border-amber-200">Pendiente</span>; break;
      case 'ANULADA': badge = <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-md bg-rose-50 text-rose-700 border border-rose-200">Anulada</span>; break;
      default: badge = <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-md bg-slate-100 text-slate-600 border border-slate-200">{doc.estado}</span>; break;
    }
    
    if (doc.estado === 'ANULADA') return badge;

    // 1. SI ES UNA TRANSACCIÓN AL CRÉDITO:
    // Nunca debe decir "Pend. Transferencia". Debe decir CLARAMENTE "Crédito"
    if (isCredito(doc.terminosPago)) {
      const fVenc = doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : calcularFechaVencimiento(doc.fechaEmision, doc.terminosPago, doc.validezDias || 30);
      const hoy = new Date();
      const diasCred = getDiasCredito(doc.terminosPago, doc.validezDias || 30);
      const diffMs = (fVenc ? fVenc.getTime() : 0) - hoy.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const estaVencida = diasRestantes < 0 && doc.estadoPago !== 'PAGADA';

      if (doc.estadoPago === 'PAGADA' || (typeof doc.saldoPendiente === 'number' && doc.saldoPendiente <= 0)) {
        return (
          <div className="flex flex-col items-center gap-1">
            {badge}
            <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-md text-emerald-700 bg-emerald-100 border border-emerald-200 flex items-center gap-1 shadow-2xs whitespace-nowrap">
              <CheckCircle2 size={10} /> Crédito Pagado
            </span>
          </div>
        );
      }

      if (estaVencida) {
        return (
          <div className="flex flex-col items-center gap-1">
            {badge}
            <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-md text-rose-700 bg-rose-100 border border-rose-300 flex items-center gap-1 shadow-2xs animate-pulse whitespace-nowrap" title={`Venció hace ${Math.abs(diasRestantes)} días`}>
              <AlertTriangle size={10} /> Crédito Vencido ({Math.abs(diasRestantes)}d)
            </span>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center gap-1">
          {badge}
          <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-md text-indigo-700 bg-indigo-50 border border-indigo-200 flex items-center gap-1 shadow-2xs whitespace-nowrap">
            <Clock size={10} /> Crédito {diasCred}D ({diasRestantes}d)
          </span>
        </div>
      );
    }

    // 2. SI ES CONTADO CON TRANSFERENCIA BANCARIA:
    if (doc.metodoPago === 'Transferencia') {
      if (doc.transferenciaConfirmada) {
        return (
          <div className="flex flex-col items-center gap-1">
            {badge}
            <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-md text-emerald-700 bg-emerald-100 border border-emerald-200 flex items-center gap-1 shadow-2xs whitespace-nowrap">
              <CheckCircle2 size={10} /> Tr. Confirmada
            </span>
          </div>
        );
      } else {
        const horas = (new Date().getTime() - new Date(doc.fechaEmision).getTime()) / (1000 * 60 * 60);
        const esDemorada = horas > 24;

        return (
          <div className="flex flex-col items-center gap-1">
            {badge}
            {esDemorada ? (
              <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-md text-rose-700 bg-rose-100 border border-rose-300 flex items-center gap-1 shadow-2xs animate-pulse whitespace-nowrap" title="Más de 24 horas sin confirmarse comprobante">
                <AlertTriangle size={10} /> Transf. Demorada (+24h)
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-md text-amber-700 bg-amber-100 border border-amber-200 flex items-center gap-1 shadow-2xs whitespace-nowrap">
                <Clock size={10} /> Pend. Transferencia
              </span>
            )}
          </div>
        );
      }
    }
    return badge;
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in">
      {/* Header & Controls */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            {type === 'FACTURA' ? 'Historial de Facturas' : type === 'COTIZACION' ? 'Historial de Cotizaciones' : 'Documentos Recientes'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">Mostrando {filteredData.length} resultados encontrados.</p>
        </div>

        <div className="relative w-full lg:w-auto flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            onClick={handleCleanDrafts}
            disabled={isCleaningDrafts}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            title="Limpiar registros de Borrador Temporal en L 0.00 del historial"
          >
            <span>🧹</span>
            <span>{isCleaningDrafts ? 'Depurando...' : 'Depurar Borradores'}</span>
          </button>

          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center sm:justify-start shadow-2xs">
            <input 
              type="checkbox" 
              checked={showAnuladas}
              onChange={e => setShowAnuladas(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-700 select-none">Mostrar Anuladas</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center sm:justify-start shadow-2xs">
            <input 
              type="checkbox" 
              checked={showPendientesTrans}
              onChange={e => setShowPendientesTrans(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
            />
            <span className="text-xs font-bold text-slate-700 select-none">Pend. Transferencia</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center sm:justify-start shadow-2xs">
            <input 
              type="checkbox" 
              checked={showCredito}
              onChange={e => setShowCredito(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-slate-700 select-none">Ventas a Crédito</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center sm:justify-start shadow-2xs">
            <input 
              type="checkbox" 
              checked={showCreditosVencidos}
              onChange={e => setShowCreditosVencidos(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
            <span className="text-xs font-bold text-slate-700 select-none">Créditos Vencidos</span>
          </label>

          {type === 'FACTURA' && (
            <select
              value={filterOrigen}
              onChange={(e) => setFilterOrigen(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="TODOS">Todas las Ventas</option>
              <option value="PARAISO">Solo Paraíso Floral</option>
              <option value="HF">Solo HonduFlores</option>
            </select>
          )}

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar correlativo o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 📱 VISTA MÓVIL EN CARDS (< md) */}
      <div className="block md:hidden p-2 space-y-2.5 flex-1 overflow-y-auto">
        {paginatedData.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileText size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No hay registros</p>
            <p className="text-xs text-slate-400 mt-0.5">No se encontraron documentos {search && 'con esa búsqueda'}.</p>
          </div>
        ) : (
          paginatedData.map(doc => (
            <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5">
              {/* Encabezado Card */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${doc.tipoDocumento === 'FACTURA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : doc.tipoDocumento === 'NOTA_CREDITO' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {doc.tipoDocumento === 'FACTURA' ? <CheckCircle2 size={16} /> : doc.tipoDocumento === 'NOTA_CREDITO' ? <Undo size={16} /> : <FileText size={16} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm leading-none tabular-nums">{doc.correlativo}</p>
                    <p className="text-[9px] font-mono font-bold uppercase text-slate-400 mt-0.5">{doc.tipoDocumento}</p>
                  </div>
                </div>
                <div>
                  {getStatusBadge(doc)}
                </div>
              </div>

              {/* Información de Cliente y Fecha */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{doc.clienteNombre}</p>
                    {doc.aliasVenta === 'HonduFlores' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title="Venta externa de HonduFlores">HF</span>
                    )}
                  </div>
                  {doc.clienteRtn && <p className="text-[11px] text-slate-500 font-mono">RTN: {doc.clienteRtn}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    Emisión: {new Date(doc.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Monto Total</span>
                  <span className="text-base font-black text-slate-900 tracking-tight">{fmt(doc.total)}</span>
                </div>
              </div>

              {/* Botones de Acción Móviles Táctiles */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 overflow-x-auto">
                <div className="flex items-center gap-1.5">
                  <Link 
                    href={`/facturas/ver/${doc.id}`} 
                    className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                  >
                    <Eye size={14} /> Ver
                  </Link>
                  <button 
                    onClick={() => setDocToPrint(doc)}
                    title="Imprimir" 
                    className="p-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-600 rounded-lg transition-colors"
                  >
                    <Printer size={15} />
                  </button>
                  <Link 
                    href={`/facturas/ver/${doc.id}?download=true`} 
                    title="Descargar PDF" 
                    className="p-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:text-emerald-600 rounded-lg transition-colors"
                  >
                    <Download size={15} />
                  </Link>
                  <button 
                    onClick={() => {
                      const clienteNombre = doc.clienteNombre || 'Estimado(a) cliente';
                      const docUrl = `${window.location.origin}/facturas/ver/${doc.id}`;
                      const pdfUrl = `${window.location.origin}/api/pdf/${doc.id}`;
                      const docLabel = doc.tipoDocumento === 'FACTURA' ? 'Factura' : doc.tipoDocumento === 'PROFORMA' ? 'Factura Pro Forma' : doc.tipoDocumento === 'NOTA_CREDITO' ? 'Nota de Crédito' : 'Cotización';
                      const mensaje = `Hola *${clienteNombre}*! 🌸\n\nLe compartimos su *${docLabel} No. ${doc.correlativo}* de *Distribuidora Paraíso Floral*.\n\n📄 *Ver documento:* \n${docUrl}\n\n📥 *Descarga directa PDF:* \n${pdfUrl}\n\n¡Muchas gracias por su preferencia! ✨`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
                    }}
                    title="Enviar por WhatsApp" 
                    className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <MessageCircle size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link 
                    href={`/facturas/${doc.id}`} 
                    title="Editar" 
                    className="p-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:text-amber-600 rounded-lg transition-colors"
                  >
                    <Pencil size={15} />
                  </Link>
                  {doc.estado !== 'ANULADA' && (
                    <button 
                      onClick={() => setDocToAnul(doc)} 
                      disabled={isAnulando === doc.id}
                      title="Anular Documento" 
                      className={`p-1.5 rounded-lg border transition-colors ${isAnulando === doc.id ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'}`}
                    >
                      <Ban size={15} className={isAnulando === doc.id ? 'animate-pulse' : ''} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 💻 VISTA ESCRITORIO EN TABLA (>= md) */}
      <div className="hidden md:block overflow-x-auto flex-1 min-h-[400px]">
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
            ) : (
              paginatedData.map(doc => (
                <tr 
                  key={doc.id}
                  className="hover:bg-blue-50/30 transition-colors group"
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 truncate">{doc.clienteNombre}</p>
                    {doc.aliasVenta === 'HonduFlores' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title="Venta externa de HonduFlores">HF</span>
                    )}
                  </div>
                  {doc.clienteRtn && <p className="text-xs text-slate-400 font-mono mt-0.5">RTN: {doc.clienteRtn}</p>}
                </td>
                <td className="p-4 align-middle whitespace-nowrap min-w-[130px]">
                  <p className="font-semibold text-slate-800 text-xs whitespace-nowrap">
                    {new Date(doc.fechaEmision).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {isCredito(doc.terminosPago) ? (
                    <p className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider mt-0.5 whitespace-nowrap">
                      Crédito {getDiasCredito(doc.terminosPago, doc.validezDias || 30)} días
                    </p>
                  ) : doc.tipoDocumento === 'COTIZACION' || doc.tipoDocumento === 'PROFORMA' ? (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap">
                      Validez {doc.validezDias || 30} días
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5 whitespace-nowrap">
                      Contado
                    </p>
                  )}
                </td>
                <td className="p-4 align-middle text-right">
                  <p className="font-bold text-slate-800 tracking-tight text-base">{fmt(doc.total)}</p>
                </td>
                <td className="p-4 align-middle text-center">
                  {getStatusBadge(doc)}
                </td>
                <td className="p-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Link href={`/facturas/ver/${doc.id}`} title="Ver Documento" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Eye size={16} />
                    </Link>
                    <button onClick={() => setDocToPrint(doc)} title="Imprimir Documento" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Printer size={16} />
                    </button>
                    <Link href={`/facturas/ver/${doc.id}?download=true`} title="Descargar PDF" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors">
                      <Download size={16} />
                    </Link>
                    <Link href={`/facturas/${doc.id}`} title="Editar Documento" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors">
                      <Pencil size={16} />
                    </Link>
                    <Link
                      href={`/facturas/ver/${doc.id}?whatsapp=true`}
                      title="Copiar Imagen para WhatsApp"
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <MessageCircle size={16} />
                    </Link>
                    <button 
                      onClick={() => handleSendEmail(doc.id)} 
                      title="Enviar por Correo" 
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Mail size={16} />
                    </button>
                    {doc.tipoDocumento === 'FACTURA' && doc.estado === 'EMITIDA' && (
                      <Link href={`/facturas/${doc.id}?notaCredito=true`} title="Generar Nota de Crédito" className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors">
                        <Undo size={16} />
                      </Link>
                    )}
                    {doc.metodoPago === 'Transferencia' && !doc.transferenciaConfirmada && doc.estado !== 'ANULADA' && (
                      <button 
                        onClick={() => setDocToConfirmTransfer(doc)} 
                        title="Confirmar Transferencia" 
                        className="p-2 text-amber-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Clock size={16} />
                      </button>
                    )}
                    {doc.metodoPago === 'Transferencia' && doc.transferenciaConfirmada && doc.estado !== 'ANULADA' && (
                      <span title="Transferencia Confirmada" className="p-2 text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={16} />
                      </span>
                    )}
                    {doc.estado !== 'ANULADA' && (
                      <button 
                        onClick={() => setDocToAnul(doc)} 
                        disabled={isAnulando === doc.id}
                        title="Anular Documento" 
                        className={`p-2 rounded-lg transition-colors ${isAnulando === doc.id ? 'text-slate-300' : 'text-slate-500 hover:text-red-600 hover:bg-red-100'}`}
                      >
                        <Ban size={16} className={isAnulando === doc.id ? 'animate-pulse' : ''} />
                      </button>
                    )}
                    <Link href={`/facturas/${doc.id}?clone=true`} title="Duplicar Documento" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Copy size={16} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-3 py-3 sm:px-5 sm:py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/50">
          <p className="text-xs text-slate-500 font-semibold text-center sm:text-left">
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
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
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
                      ? 'bg-blue-600 text-white shadow-2xs'
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
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal Confirmar Anulación */}
      {docToAnul && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-3 text-rose-600">
               <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center font-bold">
                 <AlertTriangle size={20} />
               </div>
               <div>
                 <h3 className="font-extrabold text-slate-900 text-base">¿Anular este Documento?</h3>
                 <p className="text-xs text-slate-500 font-mono">{docToAnul.correlativo}</p>
               </div>
             </div>
             <p className="text-xs text-slate-600 leading-relaxed font-medium">
               Esta acción revertirá los saldos y liberará los ítems de inventario asociados. No se puede deshacer.
             </p>
             <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDocToAnul(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAnular}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md"
                >
                  Sí, Anular Documento
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Transferencia */}
      {docToConfirmTransfer && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-3 text-emerald-600">
               <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center font-bold">
                 <CheckCircle2 size={20} />
               </div>
               <div>
                 <h3 className="font-extrabold text-slate-900 text-base">¿Confirmar Transferencia?</h3>
                 <p className="text-xs text-slate-500 font-mono">{docToConfirmTransfer.correlativo}</p>
               </div>
             </div>
             <p className="text-xs text-slate-600 leading-relaxed font-medium">
               Asegúrate de haber verificado que los fondos ({fmt(docToConfirmTransfer.total)}) estén reflejados correctamente en la cuenta bancaria de Paraíso Floral. Esta acción marcará la factura como pagada definitivamente.
             </p>
             <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDocToConfirmTransfer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarTransferencia}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>Sí, Fondos Verificados</span>
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Opciones de Impresión */}
      {docToPrint && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 text-center flex flex-col items-center relative overflow-hidden">
             <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-1 ring-8 ring-blue-50/50 shadow-inner">
               <Printer size={28} className="stroke-[2.2]" />
             </div>
             <div className="space-y-1">
               <h3 className="font-black text-slate-900 text-xl tracking-tight">Opciones de Impresión</h3>
               <p className="text-xs text-slate-500 font-medium">¿Cómo deseas imprimir el documento <span className="font-mono text-slate-800 font-bold">{docToPrint.correlativo}</span>?</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4 w-full mt-2">
               <button
                 type="button"
                 onClick={() => {
                   window.open(`/facturas/ver/${docToPrint.id}?print=true`, '_blank');
                   setDocToPrint(null);
                 }}
                 className="group relative flex flex-col items-center justify-center gap-2.5 py-4 px-3 bg-gradient-to-b from-blue-50 to-blue-100/70 hover:from-blue-100 hover:to-blue-200/90 border border-blue-200 border-b-[5px] border-b-blue-500 hover:border-b-blue-600 rounded-2xl text-blue-950 shadow-sm hover:shadow-md active:translate-y-[4px] active:border-b-[1px] active:shadow-none transition-all duration-150 cursor-pointer select-none"
                 title="Imprimir formato Carta"
               >
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform duration-150">
                   <Printer size={22} className="stroke-[2.2]" />
                 </div>
                 <div className="flex flex-col items-center leading-tight">
                   <span className="text-xs uppercase tracking-wider font-black text-slate-800">Carta</span>
                   <span className="text-[11px] font-bold text-blue-600 mt-0.5">Impresión Nativa</span>
                 </div>
               </button>
               
               <button
                 type="button"
                 onClick={async () => {
                    if (directPrint) {
                        try {
                            const toastId = toast.loading('Enviando a cola de tickets...');
                            const res = await fetch('/api/impresion/tickets/encolar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ docId: docToPrint.id })
                            });
                            const data = await res.json();
                            if (res.ok) {
                                toast.success('Ticket enviado exitosamente', { id: toastId });
                                setDocToPrint(null);
                            } else {
                                toast.error(data.error || 'Error al encolar', { id: toastId });
                            }
                        } catch (e) {
                            toast.error('Error de red al imprimir');
                        }
                    } else {
                        setTicketPreview(docToPrint); 
                        setDocToPrint(null); 
                    }
                  }}
                 className="group relative flex flex-col items-center justify-center gap-2.5 py-4 px-3 bg-gradient-to-b from-teal-50 to-teal-100/70 hover:from-teal-100 hover:to-teal-200/90 border border-teal-200 border-b-[5px] border-b-teal-500 hover:border-b-teal-600 rounded-2xl text-teal-950 shadow-sm hover:shadow-md active:translate-y-[4px] active:border-b-[1px] active:shadow-none transition-all duration-150 cursor-pointer select-none"
                 title="Imprimir ticket térmico POS"
               >
                 <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/30 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform duration-150">
                   <FileText size={22} className="stroke-[2.2]" />
                 </div>
                 <div className="flex flex-col items-center leading-tight">
                   <span className="text-xs uppercase tracking-wider font-black text-slate-800">Ticket</span>
                   <span className="text-[11px] font-bold text-teal-600 mt-0.5">{directPrint ? 'Impresión Directa' : 'Vista Previa'}</span>
                 </div>
               </button>
             </div>
             
             <button
                type="button"
                onClick={() => setDocToPrint(null)}
                className="mt-3 py-3 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 border-b-[4px] border-b-slate-400 text-slate-700 text-xs font-black rounded-2xl w-full active:translate-y-[3px] active:border-b-[1px] transition-all cursor-pointer shadow-xs select-none"
             >
                Cancelar
             </button>
          </div>
        </div>
      )}

      
      {/* Modal Preview Ticket */}
      {ticketPreview && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-[380px] flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
             <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
               <div className="flex items-center gap-2 text-slate-800 font-bold">
                 <FileText size={18} className="text-emerald-500" />
                 <span>Vista Previa del Ticket</span>
               </div>
               <button onClick={() => setTicketPreview(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center">
                <div className="bg-white shadow-sm border border-slate-200 font-mono text-[11px] leading-tight text-black p-4" style={{ width: '80mm', minHeight: '100px' }}>
                     <div className="text-center font-bold text-sm mb-2 uppercase">Distribuidora Paraíso Floral, S. de R.L.</div>
                     <div className="text-center mb-4 uppercase">
                         RTN: 05019023491749<br/>
                         8 Calle, 9 Avenida NO, Barrio Guamilito,<br/>
                         San Pedro Sula, Cortes<br/>
                     </div>
                     <div className="mb-2 uppercase">
                         FACTURA NO: {ticketPreview.correlativo}<br/>
                         FECHA: {new Date(ticketPreview.fechaEmision).toLocaleString('es-HN')}<br/>
                         CAI: {(ticketPreview as any).cai || 'N/A'}<br/>
                         CLIENTE: {ticketPreview.clienteNombre || 'CONSUMIDOR FINAL'}<br/>
                         {ticketPreview.clienteRtn && <>RTN CLIENTE: {ticketPreview.clienteRtn}<br/></>}
                     </div>
                     <div className="border-t border-b border-dashed border-black py-2 mb-2 uppercase">
                         <div className="flex justify-between font-bold mb-1">
                             <span>CANT DESCRIPCION</span>
                             <span>TOTAL</span>
                         </div>
                         {ticketPreview.detalles?.map((d, i) => {
                             let n = (d as any).nombre || (d as any).productoNombre || d.descripcion || '';
                             n = n.split('\n')[0];
                             if (n.includes('Producto registrado')) n = n.split('Producto registrado')[0];
                             return (
                                 <div key={i} className="mb-1 flex justify-between">
                                     <span className="pr-2 w-[70%]">{d.cantidad} <span className="pl-1">{n.trim()}</span></span>
                                     <span className="w-[30%] text-right">L {Number(d.totalLinea || (d as any).total || 0).toFixed(2)}</span>
                                 </div>
                             )
                         })}
                     </div>
                     <div className="flex flex-col items-end text-sm mb-4 uppercase space-y-1">
                         <div className="flex justify-between w-[70%]">
                             <span>SUBTOTAL:</span>
                             <span>L {Number(((ticketPreview as any).subTotal || (ticketPreview as any).subtotal || ticketPreview.detalles?.reduce((acc: number, d: any) => acc + Number(d.totalLinea || d.total || 0), 0) || ticketPreview.total || 0)).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between w-[70%]">
                             <span>IMPUESTO:</span>
                             <span>L {Number(((ticketPreview as any).totalGravado15 || 0) * 0.15 + ((ticketPreview as any).totalGravado18 || 0) * 0.18 || (ticketPreview as any).isv || 0).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between w-[70%] font-bold text-base mt-2">
                             <span>TOTAL:</span>
                             <span>L {Number(ticketPreview.total || 0).toFixed(2)}</span>
                         </div>
                     </div>
                     <div className="text-center">
                         *** GRACIAS POR SU COMPRA ***<br/>
                         <span className="text-[9px]">Desarrollado por Soluciones Tecnológicas HN<br/>+504 94897451</span>
                     </div>
                  </div>
               </div>

             <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
                <button
                  id="btn-imprimir-ticket"
                  autoFocus
                  onClick={async () => {
                    try {
                        const toastId = toast.loading('Enviando a cola de tickets...');
                        const res = await fetch('/api/impresion/tickets/encolar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ docId: ticketPreview.id })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            toast.success('Ticket enviado exitosamente', { id: toastId });
                            setTicketPreview(null);
                        } else {
                            toast.error(data.error || 'Error al encolar', { id: toastId });
                        }
                    } catch (e) {
                        toast.error('Error de red al imprimir');
                    }
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors focus:ring-4 focus:ring-emerald-300"
                >
                  <Printer size={18} />
                  <span>Imprimir Ticket Ahora (Enter)</span>
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Enviar Email */}
      <SendEmailModal
        isOpen={sendEmailModalOpen}
        onClose={() => setSendEmailModalOpen(false)}
        documentoId={sendEmailDocId}
      />
    </div>
  );
}



