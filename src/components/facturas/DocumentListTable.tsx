'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, MoreHorizontal, FileText, CheckCircle2, AlertCircle, Copy, MessageCircle, Download, Pencil, Printer, Ban, AlertTriangle, X, Undo, Mail, Clock, Package, Loader2, FileSpreadsheet, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { anularDocumento, limpiarBorradoresTemporalesHuecos, confirmarTransferencia, buscarHistorialDocumentos } from '@/app/(dashboard)/facturas/actions';
import SendEmailModal from '@/components/facturas/SendEmailModal';
import ReportesContablesModal from '@/components/facturas/ReportesContablesModal';
import SupervisorAuthModal from '@/components/facturas/SupervisorAuthModal';
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
  vendedorNombre?: string | null;
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
  organization?: any;
  userRole?: string;
  userAccessibleModules?: string[];
  userEmail?: string;
}

const fmt = (n: number) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }).format(n);

export default function DocumentListTable({ 
  data, 
  type,
  organization,
  userRole = 'USER',
  userAccessibleModules = [],
  userEmail = ''
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [isAnulando, setIsAnulando] = useState<string | null>(null);
  const [docToAnul, setDocToAnul] = useState<DocumentRecord | null>(null);
  const [docToConfirmTransfer, setDocToConfirmTransfer] = useState<DocumentRecord | null>(null);
  const [docToPrint, setDocToPrint] = useState<DocumentRecord | null>(null);
  const [ticketPreview, setTicketPreview] = useState<DocumentRecord | null>(null);
  const [directPrint, setDirectPrint] = useState(false);
  const [docForSupervisorAuth, setDocForSupervisorAuth] = useState<DocumentRecord | null>(null);
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);

  // Cerrar menú de acciones contextual al hacer clic fuera
  useEffect(() => {
    if (!openMenuDocId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-actions-menu]')) {
        setOpenMenuDocId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [openMenuDocId]);

  const isGerenteIlimitado = 
    userRole === 'SUPER_ADMIN' || 
    userEmail === 'master@superapp.com' ||
    (userAccessibleModules && userAccessibleModules.includes('editar_facturas_sin_limite')) ||
    ['lucio@paraisofloralhn.com', 'lucio.barahona@paraisofloral.com', 'francis@paraisofloralhn.com', 'francis.carias@paraisofloral.com'].includes(userEmail || '');

  const isDocExpired = (doc: DocumentRecord) => {
    if (doc.tipoDocumento !== 'FACTURA' || doc.estado !== 'EMITIDA') return false;
    const segConfig = organization?.invoiceSettings?.seguridadFacturas || {};
    const limiteActivo = segConfig.limiteEdicionActivo !== false;
    if (!limiteActivo) return false;
    const horasLimite = Number(segConfig.horasLimiteEdicion ?? 24);
    const fechaEmision = doc.fechaEmision ? new Date(doc.fechaEmision) : new Date();
    const diffHoras = (Date.now() - fechaEmision.getTime()) / (1000 * 60 * 60);
    return diffHoras > horasLimite;
  };
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

  // Remote search for comprehensive history (beyond initial 200)
  const [remoteResults, setRemoteResults] = useState<DocumentRecord[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setIsSearchingRemote(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const extraDocs = await buscarHistorialDocumentos(q);
        if (extraDocs && extraDocs.length > 0) {
          setRemoteResults(extraDocs as DocumentRecord[]);
        }
      } catch (err) {
        console.error("Error buscando documentos remotos:", err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Combine initial data with remote search results (deduplicating by ID)
  const allDocs = useMemo(() => {
    if (remoteResults.length === 0) return data;
    const existingIds = new Set(data.map(d => d.id));
    const newItems = remoteResults.filter(r => !existingIds.has(r.id));
    return [...data, ...newItems];
  }, [data, remoteResults]);

  // Pagination state for main invoice table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination state for product breakdown table
  const [productPage, setProductPage] = useState(1);
  const itemsPerPageProduct = 5;

  const [filterVendedor, setFilterVendedor] = useState<string>('TODOS');
  const [filterOrigen, setFilterOrigen] = useState<'TODOS' | 'PARAISO' | 'HF'>('TODOS');
  const [showPendientesTrans, setShowPendientesTrans] = useState(false);
  const [showCredito, setShowCredito] = useState(false);
  const [showCreditosVencidos, setShowCreditosVencidos] = useState(false);

  // Lista dinámica de vendedores para el selector
  const availableVendedores = useMemo(() => {
    const baseList = ["Jose Mendez", "Isamara Vigil", "Erick Saavedra", "Lucio Barahona", "Francis Carias"];
    const dynamicSet = new Set(baseList);
    for (const doc of allDocs) {
      if (doc.vendedorNombre && doc.vendedorNombre.trim()) {
        dynamicSet.add(doc.vendedorNombre.trim());
      }
    }
    return Array.from(dynamicSet).sort();
  }, [allDocs]);

  // Auto-clean legacy empty "Borrador Temporal" records on mount
  useEffect(() => {
    limpiarBorradoresTemporalesHuecos().catch(err => console.error("Auto-clean error:", err));
  }, []);

  // Reset pages when criteria changes
  useEffect(() => {
    setCurrentPage(1);
    setProductPage(1);
  }, [search, showAnuladas, type, filterVendedor, filterOrigen]);

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
    const filtered = allDocs.filter(doc => {
      if (!showAnuladas && doc.estado === 'ANULADA') return false;
      
      if (type === 'FACTURA') {
        if (doc.tipoDocumento !== 'FACTURA' && doc.tipoDocumento !== 'NOTA_CREDITO') return false;
      } else if (type !== 'TODOS' && doc.tipoDocumento !== type) {
        return false;
      }

      if (filterOrigen === 'PARAISO' && doc.aliasVenta === 'HonduFlores') return false;
      if (filterOrigen === 'HF' && doc.aliasVenta !== 'HonduFlores') return false;
      
      // Filtro por Vendedor
      if (filterVendedor === 'CON_VENDEDOR') {
        if (!doc.vendedorNombre || !doc.vendedorNombre.trim()) return false;
      } else if (filterVendedor === 'SIN_VENDEDOR') {
        if (doc.vendedorNombre && doc.vendedorNombre.trim()) return false;
      } else if (filterVendedor !== 'TODOS') {
        if (doc.vendedorNombre !== filterVendedor) return false;
      }

      if (showPendientesTrans) {
        if (doc.metodoPago !== 'Transferencia' || doc.transferenciaConfirmada || isCredito(doc.terminosPago)) return false;
      }

      if (showCredito) {
        if (!isCredito(doc.terminosPago) && doc.metodoPago !== 'Crédito' && doc.metodoPago !== 'CREDITO') return false;
      }

      if (showCreditosVencidos) {
        if (!isCredito(doc.terminosPago) && doc.metodoPago !== 'Crédito' && doc.metodoPago !== 'CREDITO') return false;
        const fVenc = doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : calcularFechaVencimiento(doc.fechaEmision, doc.terminosPago, doc.validezDias || 30);
        if (!fVenc || fVenc.getTime() >= new Date().getTime() || doc.estadoPago === 'PAGADA') return false;
      }
      
      const q = search.trim().toLowerCase();
      if (!q) return true;

      // 1. Correlativo (soporta búsqueda exacta o últimos dígitos como "3354")
      if (doc.correlativo.toLowerCase().includes(q)) return true;

      // 2. Cliente y RTN
      if (doc.clienteNombre.toLowerCase().includes(q)) return true;
      if (doc.clienteRtn && doc.clienteRtn.toLowerCase().includes(q)) return true;

      // 3. Vendedor asignado (ej. "erick", "saavedra")
      if (doc.vendedorNombre && doc.vendedorNombre.toLowerCase().includes(q)) return true;

      // 4. Productos / Detalles de la factura
      if (doc.detalles && doc.detalles.some(d => d.descripcion.toLowerCase().includes(q))) return true;

      return false;
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
  }, [allDocs, type, search, showAnuladas, sortField, sortDirection, filterOrigen, showPendientesTrans, showCredito, showCreditosVencidos]);

  // Resumen de productos facturados (cuando la búsqueda coincide con líneas de detalle)
  const productSummary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return null;

    const matchedItems: {
      facturaId: string;
      correlativo: string;
      tipoDocumento: string;
      fechaEmision: string;
      clienteNombre: string;
      clienteRtn: string;
      estado: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      totalLinea: number;
      totalFactura: number;
    }[] = [];

    let totalUnidades = 0;
    let totalMonto = 0;
    const facturasSet = new Set<string>();

    for (const doc of filteredData) {
      if (!doc.detalles) continue;
      for (const d of doc.detalles) {
        if (d.descripcion.toLowerCase().includes(q)) {
          const cleanDesc = d.descripcion.split('\n')[0].replace(/__METADATA__.*$/, '').trim();
          matchedItems.push({
            facturaId: doc.id,
            correlativo: doc.correlativo,
            tipoDocumento: doc.tipoDocumento,
            fechaEmision: doc.fechaEmision,
            clienteNombre: doc.clienteNombre,
            clienteRtn: doc.clienteRtn,
            estado: doc.estado,
            descripcion: cleanDesc,
            cantidad: Number(d.cantidad) || 0,
            precioUnitario: Number(d.precioUnitario) || 0,
            totalLinea: Number(d.totalLinea) || 0,
            totalFactura: Number(doc.total) || 0,
          });
          totalUnidades += Number(d.cantidad) || 0;
          totalMonto += Number(d.totalLinea) || 0;
          facturasSet.add(doc.id);
        }
      }
    }

    if (matchedItems.length === 0) return null;

    // Ordenar de más reciente a más antiguo
    matchedItems.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());

    return {
      query: search.trim(),
      items: matchedItems,
      totalUnidades,
      totalMonto,
      totalFacturas: facturasSet.size
    };
  }, [filteredData, search]);

  const productTotalPages = Math.ceil((productSummary?.items.length || 0) / itemsPerPageProduct);
  const paginatedProductItems = useMemo(() => {
    if (!productSummary) return [];
    const start = (productPage - 1) * itemsPerPageProduct;
    return productSummary.items.slice(start, start + itemsPerPageProduct);
  }, [productSummary, productPage, itemsPerPageProduct]);

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
    if (isCredito(doc.terminosPago) || doc.metodoPago === 'Crédito' || doc.metodoPago === 'CREDITO') {
      const fVenc = doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : calcularFechaVencimiento(doc.fechaEmision, doc.terminosPago, doc.validezDias || 30);
      const hoy = new Date();
      const diasCred = getDiasCredito(doc.terminosPago, doc.validezDias || 30);
      const diffMs = (fVenc ? fVenc.getTime() : 0) - hoy.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const estaVencida = diasRestantes < 0 && doc.estadoPago !== 'PAGADA';

      if (doc.estadoPago === 'PAGADA' && (typeof doc.saldoPendiente === 'number' && doc.saldoPendiente <= 0)) {
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
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3.5 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 w-full xl:w-auto">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 whitespace-nowrap">
              {type === 'FACTURA' ? 'Historial de Facturas' : type === 'COTIZACION' ? 'Historial de Cotizaciones' : 'Documentos Recientes'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Mostrando {filteredData.length} resultados encontrados.</p>
          </div>

          {/* 🔍 Buscador cambiado al LADO IZQUIERDO */}
          <div className="relative w-full sm:w-80">
            {isSearchingRemote ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={16} />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            )}
            <input
              type="text"
              placeholder="Buscar factura, cliente o producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filtros a la derecha */}
        <div className="relative w-full xl:w-auto flex flex-wrap items-center gap-2">
          {/* Selector de Filtro por Vendedor (Reemplaza Depurar Borradores) */}
          <select
            value={filterVendedor}
            onChange={(e) => setFilterVendedor(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            title="Filtrar por vendedor asignado"
          >
            <option value="TODOS">Todos los Vendedores</option>
            <option value="CON_VENDEDOR">Con Vendedor Asignado</option>
            <option value="SIN_VENDEDOR">Sin Vendedor Asignado</option>
            <optgroup label="Vendedores Registrados">
              {availableVendedores.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </optgroup>
          </select>

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
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            >
              <option value="TODOS">Todas las Ventas</option>
              <option value="PARAISO">Solo Paraíso Floral</option>
              <option value="HF">Solo HonduFlores</option>
            </select>
          )}
        </div>
      </div>

      {/* 🌸 RESUMEN Y DESGLOSE DE PRODUCTO (TIPO HISTORIAL CIERRE DE CAJA) */}
      {productSummary && (
        <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3.5 animate-in fade-in duration-200">
          {/* Tarjetas Superiores de Métricas (Igual que Cierre de Caja) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Producto Coincidente</span>
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate mt-1" title={productSummary.query}>
                🌸 &ldquo;{productSummary.query.toUpperCase()}&rdquo;
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unidades Facturadas</span>
              <p className="text-sm sm:text-base font-black text-blue-600 mt-1 tabular-nums">
                {productSummary.totalUnidades} <span className="text-xs font-bold text-slate-500">unid.</span>
              </p>
            </div>
            <div className="bg-emerald-50/40 rounded-xl border border-emerald-200 p-3 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Monto Total Producto</span>
              <p className="text-sm sm:text-base font-black text-emerald-700 mt-1 tabular-nums">
                {fmt(productSummary.totalMonto)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facturas Encontradas</span>
              <p className="text-sm sm:text-base font-black text-slate-800 mt-1 tabular-nums">
                {productSummary.totalFacturas} <span className="text-xs font-bold text-slate-500">doc{productSummary.totalFacturas !== 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>

          {/* Cuadro de Desglose de Transacciones (Idéntico a Cierre de Caja) */}
          <div className="bg-white/95 rounded-xl border border-slate-200 shadow-inner p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-slate-400" />
                  <span>Desglose de Facturas con este Producto</span>
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full">
                  {productSummary.items.length} registro{productSummary.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Página {productPage} de {productTotalPages || 1}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-600">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase border-b border-slate-100 bg-slate-50/50">
                    <th className="px-2.5 py-1.5">Hora / Emisión</th>
                    <th className="px-2.5 py-1.5">Concepto / Documento</th>
                    <th className="px-2.5 py-1.5">Cliente</th>
                    <th className="px-2.5 py-1.5 text-center">Cant. × Precio</th>
                    <th className="px-2.5 py-1.5 text-right">Monto Línea</th>
                    <th className="px-2.5 py-1.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {paginatedProductItems.map((item, idx) => (
                    <tr key={`${item.facturaId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-2.5 py-2 text-slate-500 font-normal whitespace-nowrap">
                        <div>
                          <span className="font-semibold text-slate-700">
                            {new Date(item.fechaEmision).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(item.fechaEmision).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 tabular-nums">
                              Facturación POS ({item.correlativo})
                            </span>
                            <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase rounded ${
                              item.estado === 'EMITIDA' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : item.estado === 'ANULADA'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.estado}
                            </span>
                          </div>
                          <span className="text-[10px] text-blue-700 font-bold truncate max-w-sm" title={item.descripcion}>
                            🌸 {item.descripcion}
                          </span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <p className="font-semibold text-slate-800 truncate max-w-[180px]">{item.clienteNombre}</p>
                        {item.clienteRtn && <p className="text-[10px] text-slate-400 font-mono">RTN: {item.clienteRtn}</p>}
                      </td>
                      <td className="px-2.5 py-2 text-center whitespace-nowrap font-mono text-[11px] text-slate-700">
                        <span className="font-bold text-slate-900">{item.cantidad}</span> unid. × <span className="text-slate-500">{fmt(item.precioUnitario)}</span>
                      </td>
                      <td className="px-2.5 py-2 text-right whitespace-nowrap">
                        <span className="text-emerald-700 font-black font-mono text-xs">
                          + {fmt(item.totalLinea)}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-medium">
                          Fac: {fmt(item.totalFactura)}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/facturas/ver/${item.facturaId}`}
                            title="Ver Factura"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const doc = allDocs.find(d => d.id === item.facturaId);
                              if (doc) setDocToPrint(doc);
                            }}
                            title="Imprimir Factura"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación del Desglose de Productos */}
            {productTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <p className="text-slate-500 font-medium">
                  Mostrando <span className="font-bold text-slate-700">{((productPage - 1) * itemsPerPageProduct) + 1}</span> a{' '}
                  <span className="font-bold text-slate-700">
                    {Math.min(productPage * itemsPerPageProduct, productSummary.items.length)}
                  </span>{' '}
                  de <span className="font-bold text-slate-700">{productSummary.items.length}</span> registros de este producto
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setProductPage(p => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition shadow-2xs cursor-pointer"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: productTotalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProductPage(p)}
                        className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-lg transition cursor-pointer ${
                          productPage === p
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductPage(p => Math.min(productTotalPages, p + 1))}
                    disabled={productPage === productTotalPages}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition shadow-2xs cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-900 truncate">{doc.clienteNombre}</p>
                    {doc.aliasVenta === 'HonduFlores' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title="Venta externa de HonduFlores">HF</span>
                    )}
                    {doc.vendedorNombre && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title={`Vendedor: ${doc.vendedorNombre}`}>
                        👤 {doc.vendedorNombre}
                      </span>
                    )}
                  </div>
                  {doc.clienteRtn && <p className="text-[11px] text-slate-500 font-mono">RTN: {doc.clienteRtn}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    Emisión: {new Date(doc.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  {productSummary && doc.detalles && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {doc.detalles
                        .filter(d => d.descripcion.toLowerCase().includes(productSummary.query.toLowerCase()))
                        .slice(0, 2)
                        .map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.5 rounded">
                            <span>🌸</span>
                            <span>{d.cantidad}x {d.descripcion.split('\n')[0].replace(/__METADATA__.*$/, '').trim()}</span>
                          </span>
                        ))}
                    </div>
                  )}
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
                  {isDocExpired(doc) && !isGerenteIlimitado ? (
                    <button 
                      onClick={() => setDocForSupervisorAuth(doc)} 
                      title="Factura protegida (+24h) - Desbloquear con PIN de Gerencia" 
                      className="p-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center shadow-xs"
                    >
                      <Lock size={15} />
                    </button>
                  ) : (
                    <Link 
                      href={`/facturas/${doc.id}`} 
                      title="Editar" 
                      className="p-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:text-amber-600 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Pencil size={15} />
                    </Link>
                  )}
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
                className="p-4 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap min-w-[200px] text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  Documento
                  {sortField === 'correlativo' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th className="p-4 border-b border-slate-200 text-center">Cliente / Entidad</th>
              <th 
                onClick={() => handleSort('fechaEmision')}
                className="p-4 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  Emisión
                  {sortField === 'fechaEmision' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('total')}
                className="p-4 border-b border-slate-200 text-center cursor-pointer select-none hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  Monto Total
                  {sortField === 'total' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                </div>
              </th>
              <th className="p-4 border-b border-slate-200 text-center">Estado</th>
              <th className="p-4 border-b border-slate-200 text-center whitespace-nowrap min-w-[130px]">Acciones</th>
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
              paginatedData.map((doc, index) => (
                <tr 
                  key={doc.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="p-4 align-middle whitespace-nowrap">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${doc.tipoDocumento === 'FACTURA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : doc.tipoDocumento === 'NOTA_CREDITO' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                       {doc.tipoDocumento === 'FACTURA' ? <CheckCircle2 size={18} /> : doc.tipoDocumento === 'NOTA_CREDITO' ? <Undo size={18} /> : <FileText size={18} />}
                     </div>
                     <div className="whitespace-nowrap">
                       <p className="font-bold text-slate-900 tabular-nums font-mono text-sm whitespace-nowrap tracking-tight">{doc.correlativo}</p>
                       <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{doc.tipoDocumento}</p>
                     </div>
                   </div>
                </td>
                <td className="p-4 align-middle max-w-[250px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 truncate">{doc.clienteNombre}</p>
                    {doc.aliasVenta === 'HonduFlores' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title="Venta externa de HonduFlores">HF</span>
                    )}
                    {doc.vendedorNombre && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0" title={`Vendedor: ${doc.vendedorNombre}`}>
                        👤 {doc.vendedorNombre}
                      </span>
                    )}
                  </div>
                  {doc.clienteRtn && <p className="text-xs text-slate-400 font-mono mt-0.5">RTN: {doc.clienteRtn}</p>}
                  {productSummary && doc.detalles && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {doc.detalles
                        .filter(d => d.descripcion.toLowerCase().includes(productSummary.query.toLowerCase()))
                        .slice(0, 2)
                        .map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.5 rounded-md">
                            <span>🌸</span>
                            <span>{d.cantidad}x {d.descripcion.split('\n')[0].replace(/__METADATA__.*$/, '').trim()}</span>
                          </span>
                        ))}
                    </div>
                  )}
                </td>
                <td className="p-4 align-middle whitespace-nowrap min-w-[160px]">
                  <p className="font-medium text-slate-700 text-base whitespace-nowrap leading-tight">
                    {new Date(doc.fechaEmision).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {isCredito(doc.terminosPago) ? (
                    <p className="text-xs text-indigo-700 font-extrabold uppercase tracking-wide mt-0.5 whitespace-nowrap">
                      Crédito {getDiasCredito(doc.terminosPago, doc.validezDias || 30)} días
                    </p>
                  ) : doc.tipoDocumento === 'COTIZACION' || doc.tipoDocumento === 'PROFORMA' ? (
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-0.5 whitespace-nowrap">
                      Validez {doc.validezDias || 30} días
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-0.5 whitespace-nowrap">
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
                <td className="p-4 align-middle text-center">
                  <div className="flex items-center justify-center gap-1 relative" onClick={e => e.stopPropagation()}>
                    {/* Botón Ver (Ojito) */}
                    <Link href={`/facturas/ver/${doc.id}`} title="Ver Documento" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Eye size={16} />
                    </Link>

                    {/* Botón Imprimir (Impresora) */}
                    <button onClick={() => setDocToPrint(doc)} title="Imprimir Documento" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer">
                      <Printer size={16} />
                    </button>

                    {/* Botón Editar (Lapicito o Candado si está protegida +24h) */}
                    {isDocExpired(doc) && !isGerenteIlimitado ? (
                      <button 
                        onClick={() => setDocForSupervisorAuth(doc)} 
                        title="Factura protegida (+24h) - Desbloquear con PIN de Gerencia" 
                        className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Lock size={16} />
                      </button>
                    ) : (
                      <Link href={`/facturas/${doc.id}`} title="Editar Documento" className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </Link>
                    )}

                    {/* Indicador Transferencia Confirmada si aplica */}
                    {doc.metodoPago === 'Transferencia' && doc.transferenciaConfirmada && doc.estado !== 'ANULADA' && (
                      <span title="Transferencia Confirmada" className="p-1.5 text-emerald-600 flex items-center">
                        <CheckCircle2 size={16} />
                      </span>
                    )}

                    {/* Menú de Más Opciones (...) */}
                    <div className="relative inline-block text-left" data-actions-menu>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuDocId(openMenuDocId === doc.id ? null : doc.id);
                        }}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${openMenuDocId === doc.id ? 'bg-slate-200 text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                        title="Más opciones"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openMenuDocId === doc.id && (
                        <div 
                          className={`absolute ${index >= paginatedData.length - 3 && paginatedData.length > 3 ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} right-0 z-50 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 animate-in fade-in zoom-in-95 duration-150 text-left`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/facturas/ver/${doc.id}?download=true`}
                            onClick={() => setOpenMenuDocId(null)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors w-full"
                          >
                            <Download size={15} className="text-slate-400 shrink-0" />
                            <span>Descargar PDF</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuDocId(null);
                              const clienteNombre = doc.clienteNombre || 'Estimado(a) cliente';
                              const docUrl = `${window.location.origin}/facturas/ver/${doc.id}`;
                              const pdfUrl = `${window.location.origin}/api/pdf/${doc.id}`;
                              const docLabel = doc.tipoDocumento === 'FACTURA' ? 'Factura' : doc.tipoDocumento === 'PROFORMA' ? 'Factura Pro Forma' : doc.tipoDocumento === 'NOTA_CREDITO' ? 'Nota de Crédito' : 'Cotización';
                              const mensaje = `Hola *${clienteNombre}*! 🌸\n\nLe compartimos su *${docLabel} No. ${doc.correlativo}* de *Distribuidora Paraíso Floral*.\n\n📄 *Ver documento:* \n${docUrl}\n\n📥 *Descarga directa PDF:* \n${pdfUrl}\n\n¡Muchas gracias por su preferencia! ✨`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
                            }}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors w-full text-left cursor-pointer"
                          >
                            <MessageCircle size={15} className="text-emerald-600 shrink-0" />
                            <span>Compartir por WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuDocId(null);
                              handleSendEmail(doc.id);
                            }}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors w-full text-left cursor-pointer"
                          >
                            <Mail size={15} className="text-blue-600 shrink-0" />
                            <span>Enviar por Correo</span>
                          </button>

                          <Link
                            href={`/facturas/${doc.id}?clone=true`}
                            onClick={() => setOpenMenuDocId(null)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors w-full"
                          >
                            <Copy size={15} className="text-slate-400 shrink-0" />
                            <span>Duplicar Documento</span>
                          </Link>

                          {doc.tipoDocumento === 'FACTURA' && doc.estado === 'EMITIDA' && (
                            <Link
                              href={`/facturas/${doc.id}?notaCredito=true`}
                              onClick={() => setOpenMenuDocId(null)}
                              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors w-full"
                            >
                              <Undo size={15} className="text-purple-600 shrink-0" />
                              <span>Generar Nota de Crédito</span>
                            </Link>
                          )}

                          {doc.metodoPago === 'Transferencia' && !doc.transferenciaConfirmada && doc.estado !== 'ANULADA' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuDocId(null);
                                setDocToConfirmTransfer(doc);
                              }}
                              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors w-full text-left cursor-pointer"
                            >
                              <Clock size={15} className="text-amber-500 shrink-0" />
                              <span>Confirmar Transferencia</span>
                            </button>
                          )}

                          {doc.estado !== 'ANULADA' && (
                            <>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuDocId(null);
                                  setDocToAnul(doc);
                                }}
                                disabled={isAnulando === doc.id}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors w-full text-left cursor-pointer disabled:opacity-50"
                              >
                                <Ban size={15} className={`text-rose-500 shrink-0 ${isAnulando === doc.id ? 'animate-pulse' : ''}`} />
                                <span>Anular Documento</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
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
                 className="group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 border-blue-100 hover:border-blue-500 rounded-2xl transition-all hover:shadow-lg cursor-pointer"
                 title="Imprimir formato Carta"
               >
                 <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Printer size={28} />
                 </div>
                 <div className="flex flex-col items-center leading-tight">
                   <span className="font-bold text-slate-700 text-sm text-center">Carta</span>
                   <span className="text-xs text-blue-600 font-semibold mt-0.5">Impresión Nativa</span>
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
                 className="group flex flex-col items-center justify-center gap-3 p-4 bg-white border-2 border-emerald-100 hover:border-emerald-500 rounded-2xl transition-all hover:shadow-lg cursor-pointer"
                 title="Imprimir ticket térmico POS"
               >
                 <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <FileText size={28} />
                 </div>
                 <div className="flex flex-col items-center leading-tight">
                   <span className="font-bold text-slate-700 text-sm text-center">Ticket</span>
                   <span className="text-xs text-emerald-600 font-semibold mt-0.5">{directPrint ? 'Impresión Directa' : 'Vista Previa'}</span>
                 </div>
               </button>
             </div>
             
             <button
                type="button"
                onClick={() => setDocToPrint(null)}
                className="mt-3 py-3 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl w-full transition-all cursor-pointer shadow-xs"
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
                          {(() => {
                              const tQty = (ticketPreview.detalles || [])
                                  .reduce((sum: number, it: any) => sum + (Number(it.cantidad || it.qty) || 0), 0);
                              const fQty = Number.isInteger(tQty) ? tQty : Number(tQty.toFixed(2));
                              return (
                                  <div className="border-t border-dashed border-black pt-1 mt-1 font-bold flex justify-between text-[11px]">
                                      <span>{fQty} TOTAL ÍTEMS / PAQUETES</span>
                                      <span></span>
                                  </div>
                              );
                          })()}
                      </div>
                      <div className="flex flex-col items-end text-sm mb-4 uppercase space-y-1">
                          {(() => {
                              const tQty = (ticketPreview.detalles || [])
                                  .reduce((sum: number, it: any) => sum + (Number(it.cantidad || it.qty) || 0), 0);
                              const fQty = Number.isInteger(tQty) ? tQty : Number(tQty.toFixed(2));
                              return (
                                  <div className="flex justify-between w-[70%] text-[11px] font-bold border-b border-dashed border-slate-300 pb-0.5 mb-0.5">
                                      <span>TOTAL ÍTEMS:</span>
                                      <span>{fQty}</span>
                                  </div>
                              );
                          })()}
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

      {/* Modal de Autorización de Supervisor (Desbloqueo de facturas protegidas +24h) */}
      {docForSupervisorAuth && (
        <SupervisorAuthModal
          isOpen={Boolean(docForSupervisorAuth)}
          onClose={() => setDocForSupervisorAuth(null)}
          facturaId={docForSupervisorAuth.id}
          correlativo={docForSupervisorAuth.correlativo}
          total={docForSupervisorAuth.total}
          onAuthorized={(supervisor: { nombre: string; email: string }, code: string) => {
            const docId = docForSupervisorAuth.id;
            setDocForSupervisorAuth(null);
            router.push(`/facturas/${docId}?authSupervisor=${encodeURIComponent(supervisor.nombre)}&authCode=${encodeURIComponent(code)}`);
          }}
        />
      )}
    </div>
  );
}



