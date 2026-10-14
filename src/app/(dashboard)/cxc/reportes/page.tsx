'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Calendar,
  User,
  DollarSign,
  FileText,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Filter,
  CheckCircle,
  Clock,
  BookOpen,
  MapPin,
  Truck,
  CheckSquare,
  Building2,
  Tag
} from 'lucide-react';

interface ClienteCompact {
  id: string;
  nombre: string;
}

interface ReporteData {
  resumen: {
    saldoAnterior: number;
    totalFacturado: number;
    totalAbonado: number;
    totalNotasCredito: number;
    saldoTotal: number;
  };
  facturas: Array<{
    id: string;
    correlativo: string;
    fechaEmision: string;
    fechaVencimiento: string | null;
    total: number;
    saldoPendiente: number;
    estadoPago: string;
    clienteNombre: string;
    clienteId: string;
  }>;
  pagos: Array<{
    id: string;
    correlativo: string | null;
    monto: number;
    fecha: string;
    metodoPago: string;
    banco: string | null;
    referencia: string | null;
    notas: string | null;
    clienteNombre: string;
  }>;
  notasCredito: Array<{
    id: string;
    correlativo: string | null;
    monto: number;
    fecha: string;
    motivo: string;
    descripcion: string;
    clienteNombre: string;
  }>;
  clientesResumen: Array<{
    id: string;
    nombre: string;
    saldoAnterior: number;
    facturado: number;
    abonado: number;
    notasCredito: number;
    saldoFinal: number;
  }>;
}

interface FacturaPendienteRuta {
  id: string;
  correlativo: string;
  fechaEmision: string | null;
  total: number;
  saldoPendiente: number;
  estadoPago: string;
  esSaldoInicial?: boolean;
}

interface ClienteRutaItem {
  id: string;
  nombre: string;
  alias?: string | null;
  telefono: string | null;
  direccion: string | null;
  departamento: string | null;
  ruta: string | null;
  vendedorId: string | null;
  vendedorNombre: string | null;
  saldoTotal: number;
  saldoVencido: number;
  facturasPendientesCount: number;
  facturasPendientes?: FacturaPendienteRuta[];
  maxDiasMora: number;
}

const fmt = (n: number) => n.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 });

const formatFechaDMY = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatFechaCorta = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit' });
};

function ReportesCxCContent() {
  const searchParams = useSearchParams();

  // Tipo de reporte: Estado de Cuenta (individual o consolidado) vs Hoja de Cobranza de Campo (Ruta)
  const [tipoReporte, setTipoReporte] = useState<'ESTADO_CUENTA' | 'HOJA_RUTA'>('ESTADO_CUENTA');

  // Estados para "Estado de Cuenta"
  const [clientes, setClientes] = useState<ClienteCompact[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('TODOS');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [estado, setEstado] = useState<string>('TODOS');
  const [reporte, setReporte] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingClientes, setLoadingClientes] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');

  // Estados para "Hoja de Cobranza de Campo (Ruta)"
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [rutas, setRutas] = useState<string[]>([
    'Ruta Occidente',
    'Ruta La Esperanza',
    'Ruta Guamilito / Progreso',
    'Cartera Francis Carías',
    'Nacional / Todas las Rutas'
  ]);
  const [selectedVendedorIdRuta, setSelectedVendedorIdRuta] = useState<string>('TODOS');
  const [selectedRuta, setSelectedRuta] = useState<string>('Ruta Occidente');
  const [fechaSalida, setFechaSalida] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clientesRuta, setClientesRuta] = useState<ClienteRutaItem[]>([]);
  const [loadingRuta, setLoadingRuta] = useState<boolean>(false);
  const [hojaRutaGenerada, setHojaRutaGenerada] = useState<boolean>(false);

  // Cargar vendedores
  const cargarVendedores = async () => {
    try {
      const res = await fetch('/api/cxc/vendedores');
      if (res.ok) {
        const data = await res.json();
        setVendedores(data.vendedores || []);
      }
    } catch (err) {
      console.error('Error cargando vendedores:', err);
    }
  };

  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const res = await fetch('/api/cxc/clientes?filtro=TODOS');
      if (res.ok) {
        const data = await res.json();
        setClientes(data.map((c: any) => ({ id: c.id, nombre: c.nombre })));
      }
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoadingClientes(false);
    }
  };

  useEffect(() => {
    cargarClientes();
    cargarVendedores();

    // Comprobar parámetros de URL
    const tipo = searchParams?.get('tipo');
    const paramRuta = searchParams?.get('ruta');
    const paramVendedorId = searchParams?.get('vendedorId');

    if (tipo === 'HOJA_RUTA') {
      setTipoReporte('HOJA_RUTA');
      if (paramRuta) setSelectedRuta(paramRuta);
      if (paramVendedorId) setSelectedVendedorIdRuta(paramVendedorId);
      
      // Auto-generar con esos parámetros
      generarHojaRutaConParams(paramRuta || 'Ruta Occidente', paramVendedorId || 'TODOS');
    }
  }, [searchParams]);

  const generarReporte = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        clienteId: selectedClienteId,
        fechaInicio,
        fechaFin,
        estado
      });

      const res = await fetch(`/api/cxc/reportes?${queryParams.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Error al generar el reporte');
      }

      setReporte(json);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const generarHojaRutaConParams = async (r: string, vId: string) => {
    try {
      setLoadingRuta(true);
      setError(null);
      const params = new URLSearchParams();
      if (r && r !== 'TODOS') params.set('ruta', r);
      if (vId && vId !== 'TODOS') params.set('vendedorId', vId);

      const res = await fetch(`/api/cxc/clientes?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener clientes de la ruta');

      // Filtrar ÚNICAMENTE clientes con saldo pendiente > 0 (los que deben)
      // Y ordenar del que debe más al que debe menos
      const conSaldo = (Array.isArray(data) ? data : [])
        .filter((c: any) => Number(c.saldoTotal || 0) > 0)
        .sort((a: any, b: any) => Number(b.saldoTotal || 0) - Number(a.saldoTotal || 0));

      setClientesRuta(conSaldo);
      setHojaRutaGenerada(true);
    } catch (err: any) {
      setError(err.message || 'Error al generar hoja de cobranza');
    } finally {
      setLoadingRuta(false);
    }
  };

  const generarHojaRuta = () => {
    generarHojaRutaConParams(selectedRuta, selectedVendedorIdRuta);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredClientOptions = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const activeClienteNombre = selectedClienteId === 'TODOS' 
    ? 'Todos los Clientes (Unificado)' 
    : clientes.find(c => c.id === selectedClienteId)?.nombre || 'Cliente Seleccionado';

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Cálculos para la Hoja de Ruta
  const totalCarteraRuta = clientesRuta.reduce((acc, c) => acc + Number(c.saldoTotal || 0), 0);
  const totalVencidoRuta = clientesRuta.reduce((acc, c) => acc + Number(c.saldoVencido || 0), 0);
  const vendedorActivoNombre = selectedVendedorIdRuta === 'TODOS'
    ? 'Todos los Vendedores'
    : (vendedores.find(v => v.id === selectedVendedorIdRuta)?.nombre || 'José Méndez');

  return (
    <>
      {/* Styles for print output matching the requested invoice / account statement layout */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 10px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-header {
            border-bottom: 2px solid #059669 !important;
            padding-bottom: 8px !important;
            margin-bottom: 12px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 9px !important;
          }
          .kpi-container {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 10px !important;
            background-color: #f8fafc !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 🖨️ SECCIÓN 1 DE IMPRESIÓN: ESTADO DE CUENTA POR CLIENTE */}
      {/* ========================================================================= */}
      {tipoReporte === 'ESTADO_CUENTA' && reporte && (
        <div className="print-only max-w-4xl mx-auto p-2 space-y-4 text-slate-900 bg-white">
          <div className="print-header flex justify-between items-start border-b-2 border-emerald-600 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="Paraíso Floral" className="w-12 h-12 object-contain rounded-full shrink-0" />
              <div className="space-y-0.5">
                <h1 className="text-xl font-black text-emerald-800 tracking-tight">DISTRIBUIDORA PARAÍSO FLORAL</h1>
                <p className="text-[10px] font-bold text-slate-700">Mayorista y Distribuidora de Flores y Follajes Fresh 🌹</p>
                <p className="text-[9px] text-slate-500">8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula, Cortés | Tel: +(504) 8854-2199 | +(504) 9645-3095</p>
              </div>
            </div>
            <div className="text-right space-y-0.5 shrink-0">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-extrabold text-[10px] rounded border border-emerald-300">
                REPORTE OFICIAL DE CXC
              </span>
              <p className="text-[9px] text-slate-400">Emisión: {fechaHoy}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-2.5 border border-slate-300 rounded-lg bg-slate-50/50 space-y-0.5 text-xs">
              <h3 className="text-[10px] font-black text-slate-800 uppercase border-b border-slate-200 pb-0.5 mb-1">PARÁMETROS DEL REPORTE</h3>
              <p className="truncate"><strong>Cliente:</strong> {activeClienteNombre}</p>
              {fechaInicio || fechaFin ? (
                <p><strong>Rango de Fechas:</strong> {formatFechaDMY(fechaInicio) || 'Inicio'} al {formatFechaDMY(fechaFin) || 'Fin'}</p>
              ) : (
                <p><strong>Fecha:</strong> Historial Completo</p>
              )}
              <p><strong>Filtro de Vencimiento:</strong> {estado === 'TODOS' ? 'Todos los Estados' : estado}</p>
            </div>

            <div className="p-2.5 border border-emerald-300 rounded-lg bg-emerald-50/20 space-y-0.5 text-xs text-right">
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Saldo Anterior / Deuda Previa:</span>
                <span className="font-semibold">{fmt(reporte.resumen.saldoAnterior)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Total Facturado (+):</span>
                <span className="font-semibold">{fmt(reporte.resumen.totalFacturado)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Total Abonos (-):</span>
                <span className="font-semibold text-teal-700">(-) {fmt(reporte.resumen.totalAbonado)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Notas de Crédito (-):</span>
                <span className="font-semibold text-amber-700">(-) {fmt(reporte.resumen.totalNotasCredito)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-emerald-300 font-black text-emerald-950 text-sm">
                <span>SALDO PENDIENTE NETO:</span>
                <span>{fmt(reporte.resumen.saldoTotal)}</span>
              </div>
            </div>
          </div>

          {/* Table: Client Balance Sheet (only if Unificado) */}
          {selectedClienteId === 'TODOS' && reporte.clientesResumen.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-0.5">
                BALANCE CONSOLIDADO POR CLIENTE
              </h3>
              <table className="w-full text-[9px]">
                <thead>
                  <tr>
                    <th className="text-left">Cliente</th>
                    <th className="text-right">Saldo Anterior</th>
                    <th className="text-right">Facturado (+)</th>
                    <th className="text-right">Abonado (-)</th>
                    <th className="text-right">Ajustes / NC (-)</th>
                    <th className="text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.clientesResumen.map(c => (
                    <tr key={c.id}>
                      <td className="font-bold">{c.nombre}</td>
                      <td className="text-right tabular-nums">{fmt(c.saldoAnterior)}</td>
                      <td className="text-right tabular-nums text-indigo-700">+{fmt(c.facturado)}</td>
                      <td className="text-right tabular-nums text-teal-700">-{fmt(c.abonado)}</td>
                      <td className="text-right tabular-nums text-amber-700">-{fmt(c.notasCredito)}</td>
                      <td className="text-right tabular-nums font-black bg-slate-50">{fmt(c.saldoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table: Invoices */}
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-0.5">
              1. DETALLE DE FACTURAS PENDIENTES / EMITIDAS
            </h3>
            {reporte.facturas.length === 0 ? (
              <p className="text-[10px] italic text-slate-500">No se encontraron facturas registradas en este período.</p>
            ) : (
              <table className="w-full text-[9px]">
                <thead>
                  <tr>
                    <th className="text-left">Factura</th>
                    {selectedClienteId === 'TODOS' && <th className="text-left">Cliente</th>}
                    <th className="text-left">Emisión</th>
                    <th className="text-left">Vence</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Saldo Pendiente</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.facturas.map(f => (
                    <tr key={f.id}>
                      <td className="font-bold">#{f.correlativo}</td>
                      {selectedClienteId === 'TODOS' && <td>{f.clienteNombre}</td>}
                      <td>{new Date(f.fechaEmision).toLocaleDateString('es-HN')}</td>
                      <td>{f.fechaVencimiento ? new Date(f.fechaVencimiento).toLocaleDateString('es-HN') : 'N/A'}</td>
                      <td className="text-right tabular-nums">{fmt(f.total)}</td>
                      <td className="text-right tabular-nums font-bold text-emerald-800">{fmt(f.saldoPendiente)}</td>
                      <td className="text-center font-semibold">{f.estadoPago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table: Payments */}
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-0.5">
              2. HISTORIAL DE ABONOS Y PAGOS RECIBIDOS
            </h3>
            {reporte.pagos.length === 0 ? (
              <p className="text-[10px] italic text-slate-500">No se encontraron abonos registrados en este período.</p>
            ) : (
              <table className="w-full text-[9px]">
                <thead>
                  <tr>
                    <th className="text-left">Recibo #</th>
                    {selectedClienteId === 'TODOS' && <th className="text-left">Cliente</th>}
                    <th className="text-left">Fecha Pago</th>
                    <th className="text-left">Método</th>
                    <th className="text-left">Banco / Referencia</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.pagos.map(p => (
                    <tr key={p.id}>
                      <td className="font-bold">#{p.correlativo || 'RECIBO'}</td>
                      {selectedClienteId === 'TODOS' && <td>{p.clienteNombre}</td>}
                      <td>{new Date(p.fecha).toLocaleDateString('es-HN')}</td>
                      <td>{p.metodoPago}</td>
                      <td>{p.banco ? `${p.banco} - ` : ''}{p.referencia || 'N/A'}</td>
                      <td className="text-right tabular-nums font-bold text-teal-800">{fmt(p.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
            <div>
              <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-800">Crédito y Cobros</div>
              <p className="text-[9px] text-slate-400">Distribuidora Paraíso Floral</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-800">Firma del Cliente</div>
              <p className="text-[9px] text-slate-400">{selectedClienteId === 'TODOS' ? 'Conformidad de Cartera' : activeClienteNombre}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🖨️ SECCIÓN 2 DE IMPRESIÓN: HOJA DE COBRANZA DE CAMPO (RUTA PARA EL VENDEDOR) */}
      {/* ========================================================================= */}
      {tipoReporte === 'HOJA_RUTA' && hojaRutaGenerada && (
        <div className="print-only max-w-5xl mx-auto p-2 space-y-3 text-slate-900 bg-white">
          {/* Header Oficial Membretado */}
          <div className="print-header flex justify-between items-start border-b-2 border-emerald-600 pb-2 mb-2">
            <div className="flex items-center gap-2.5">
              <img src="/icon.png" alt="Paraíso Floral" className="w-12 h-12 object-contain rounded-full shrink-0" />
              <div className="space-y-0.5">
                <h1 className="text-xl font-black text-emerald-800 tracking-tight">DISTRIBUIDORA PARAÍSO FLORAL</h1>
                <p className="text-[10px] font-bold text-slate-700">Mayorista y Distribuidora de Flores y Follajes Fresh 🌹</p>
                <p className="text-[9px] text-slate-500">8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula | Tel: +(504) 8854-2199 | +(504) 9645-3095</p>
              </div>
            </div>
            <div className="text-right space-y-0.5 shrink-0">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-950 font-black text-[10px] rounded border border-emerald-400">
                PLANILLA OFICIAL DE COBRANZA EN RUTA
              </span>
              <p className="text-[9px] text-slate-500 font-bold">Emisión: {fechaHoy}</p>
            </div>
          </div>

          {/* Parámetros y Cuadro de Liquidación de Caja */}
          <div className="grid grid-cols-2 gap-3">
            {/* Caja Izquierda: Parámetros */}
            <div className="p-2.5 border border-slate-300 rounded-lg bg-slate-50/60 space-y-1 text-xs">
              <h3 className="text-[10px] font-black text-slate-800 uppercase border-b border-slate-200 pb-0.5 mb-1">
                PARÁMETROS DE LA RUTA COMERCIAL
              </h3>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Vendedor Responsable:</span>
                <span className="font-extrabold text-slate-900">{vendedorActivoNombre}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Ruta Comercial:</span>
                <span className="font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  📍 {selectedRuta}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Fecha de Salida:</span>
                <span className="font-bold text-slate-800">{formatFechaDMY(fechaSalida)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Clientes con Saldo a Cobrar:</span>
                <span className="font-black text-slate-900">{clientesRuta.length} Clientes</span>
              </div>
            </div>

            {/* Caja Derecha: Cuadre de Caja de Campo */}
            <div className="p-2.5 border border-emerald-400 rounded-lg bg-emerald-50/20 space-y-1 text-xs">
              <h3 className="text-[10px] font-black text-emerald-950 uppercase border-b border-emerald-200 pb-0.5 mb-1 flex justify-between">
                <span>CONTROL Y LIQUIDACIÓN DE CAJA</span>
                <span className="text-emerald-700">USO ADMINISTRATIVO</span>
              </h3>
              <div className="flex justify-between py-0.5 text-slate-700 font-bold">
                <span>Cartera Total Asignada:</span>
                <span className="font-black text-emerald-900 font-mono text-sm">{fmt(totalCarteraRuta)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Recaudado en Efectivo:</span>
                <span className="font-mono text-slate-400 font-bold">L. ________________________</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Recaudado en Transferencias:</span>
                <span className="font-mono text-slate-400 font-bold">L. ________________________</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-200 text-slate-900 font-black">
                <span>TOTAL LIQUIDADO EN CAJA:</span>
                <span className="font-mono text-slate-400">L. ________________________</span>
              </div>
            </div>
          </div>

          {/* Tabla de Clientes con Saldo (Ordenados de mayor a menor saldo) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center border-b border-slate-300 pb-1">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                LISTA DE COBRANZA - CLIENTES CON SALDO PENDIENTE ({clientesRuta.length})
              </h3>
              <span className="text-[9px] text-slate-500 font-semibold italic">
                * Ordenados del que debe más al que debe menos
              </span>
            </div>

            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black text-[9px]">
                  <th className="w-7 text-center">#</th>
                  <th className="text-left py-2 px-2 w-56">Cliente / Contacto</th>
                  <th className="text-left py-2 px-2">
                    Desglose de Facturas Pendientes (Reciente → Antigua)
                  </th>
                  <th className="text-right py-2 px-2.5 w-28 bg-emerald-50 text-emerald-950 font-black">
                    Saldo a Cobrar
                  </th>
                  <th className="text-center py-2 px-2.5 w-36 bg-amber-50/60 text-amber-950 font-black">
                    Abono Recibido (L.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[9px]">
                {clientesRuta.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="text-center font-bold text-slate-500 py-1.5">{idx + 1}</td>
                    
                    {/* Cliente + Teléfono + Alias */}
                    <td className="py-1.5 px-2 font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-[9.5px]">{c.nombre}</span>
                        {c.telefono && <span className="text-[8.5px] text-slate-600 shrink-0 font-medium">📱 {c.telefono}</span>}
                        {c.alias && (
                          <span className="inline-flex items-center gap-0.5 font-bold text-amber-900 bg-amber-100 px-1 py-0.2 rounded border border-amber-300 text-[8px] shrink-0">
                            🏷️ {c.alias}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Desglose de Facturas Pendientes */}
                    <td className="py-1.5 px-2">
                      {c.facturasPendientes && c.facturasPendientes.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {c.facturasPendientes.map((f, fIdx) => (
                            <span
                              key={f.id}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8.5px] ${
                                fIdx === 0 && !f.esSaldoInicial
                                  ? 'bg-emerald-50/90 border-emerald-400 text-slate-950'
                                  : 'bg-slate-50 border-slate-300 text-slate-800'
                              }`}
                            >
                              {f.esSaldoInicial ? (
                                <>
                                  <span className="font-bold text-slate-600">Saldo Ant:</span>
                                  <span className="font-black font-mono text-slate-900">{fmt(f.saldoPendiente)}</span>
                                </>
                              ) : (
                                <>
                                  {f.fechaEmision && (
                                    <span className="font-bold text-emerald-800">{formatFechaCorta(f.fechaEmision)}</span>
                                  )}
                                  <span className="font-black font-mono text-slate-950">{fmt(f.saldoPendiente)}</span>
                                  <span className="text-[7.5px] text-slate-500 font-semibold">
                                    (#{f.correlativo}{f.estadoPago === 'PARCIAL' ? ' • Saldo' : ''})
                                  </span>
                                </>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[8.5px] text-slate-500 italic">
                          Saldo pendiente: {fmt(c.saldoTotal)}
                        </span>
                      )}
                    </td>

                    {/* Saldo a Cobrar */}
                    <td className="py-1.5 px-2.5 text-right font-black text-slate-950 font-mono text-[10px] bg-emerald-50/40 whitespace-nowrap">
                      {fmt(c.saldoTotal)}
                    </td>

                    {/* Recuadro Abono Recibido (Columna Final) */}
                    <td className="py-1.5 px-2.5 text-left bg-amber-50/20">
                      <div className="w-full h-6 border border-dashed border-slate-400 rounded bg-white flex items-center px-1.5 text-slate-400 text-[8px] font-bold">
                        L.
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Fila Totalizadora con altura adecuada para escritura manual */}
                <tr className="bg-slate-100/90 font-black text-[10px] border-t-2 border-slate-400">
                  <td colSpan={3} className="py-3.5 px-3 text-right uppercase text-slate-800 align-middle">
                    TOTAL CARTERA A COBRAR ({clientesRuta.length} CLIENTES):
                  </td>
                  <td className="py-3.5 px-2.5 text-right font-mono text-emerald-950 bg-emerald-100 text-[12px] font-black align-middle whitespace-nowrap">
                    {fmt(totalCarteraRuta)}
                  </td>
                  <td className="py-2.5 px-2.5 text-left font-mono bg-amber-100/70 align-top">
                    <div className="text-[8.5px] font-black text-slate-800 uppercase tracking-tight">
                      Total Recaudado:
                    </div>
                    <div className="text-xs font-black text-slate-400 mt-1 h-6 flex items-center">
                      L.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Firmas de Entrega y Liquidación directamente después de los totales */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-center text-[10px]">
            <div>
              <div className="border-t border-slate-500 pt-1 font-extrabold text-slate-900">
                {vendedorActivoNombre}
              </div>
              <p className="text-[9px] text-slate-600 font-bold">Firma del Vendedor / Cobrador</p>
            </div>
            <div>
              <div className="border-t border-slate-500 pt-1 font-extrabold text-slate-900">
                Administración / Cierre de Caja
              </div>
              <p className="text-[9px] text-slate-600 font-bold">Recibido y Cuadrado por Caja General</p>
            </div>
          </div>

          <p className="text-[8px] text-center text-slate-400 pt-2 italic">
            * Planilla oficial de campo. Todo valor anotado debe ser respaldado físicamente en caja o con comprobante digital antes de asentar los abonos en el sistema.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💻 VISTA INTERACTIVA WEB (NO PRINT) */}
      {/* ========================================================================= */}
      <div className="no-print px-1 py-3 sm:px-6 sm:py-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 bg-slate-50/50 min-h-screen">
        {/* Breadcrumb & Botón Imprimir */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/cxc"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Cuentas por Cobrar
          </Link>

          {((tipoReporte === 'ESTADO_CUENTA' && reporte) || (tipoReporte === 'HOJA_RUTA' && hojaRutaGenerada)) && (
            <button
              onClick={handlePrint}
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir Documento Oficial (PDF)</span>
            </button>
          )}
        </div>

        {/* Title Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-emerald-700/10">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>📊</span> Centro de Reportes & Hojas de Cobranza CxC
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm font-medium">
              Genera estados de cuenta contables o imprime la planilla de cobro de campo para el vendedor en ruta.
            </p>
          </div>
        </div>

        {/* Selector de Tipo de Reporte (TABS) */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <button
            onClick={() => setTipoReporte('HOJA_RUTA')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tipoReporte === 'HOJA_RUTA'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Hoja de Cobranza de Campo (Ruta)</span>
            <span className="text-[10px] bg-emerald-500/30 text-white px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline">
              Recomendado
            </span>
          </button>

          <button
            onClick={() => setTipoReporte('ESTADO_CUENTA')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tipoReporte === 'ESTADO_CUENTA'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Estado de Cuenta por Cliente</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FORMULARIO PARA HOJA DE COBRANZA (RUTA) */}
        {/* ========================================================================= */}
        {tipoReporte === 'HOJA_RUTA' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" /> Parámetros de la Hoja de Ruta
              </h2>
              <span className="text-xs text-slate-500 font-semibold">
                Solo lista clientes con saldo pendiente (&gt; L. 0)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Selector de Ruta */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Ruta Comercial
                </label>
                <select
                  value={selectedRuta}
                  onChange={(e) => setSelectedRuta(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todas las Rutas</option>
                  {rutas.map(r => (
                    <option key={r} value={r}>📍 {r}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Vendedor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Vendedor Responsable
                </label>
                <select
                  value={selectedVendedorIdRuta}
                  onChange={(e) => setSelectedVendedorIdRuta(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos los Vendedores</option>
                  {vendedores.map(v => (
                    <option key={v.id} value={v.id}>
                      👤 {v.nombre ? `${v.nombre} ${v.apellido || ''}` : v.email} {v.puesto ? `(${v.puesto})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha de Salida */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha de Salida
                </label>
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={generarHojaRuta}
                disabled={loadingRuta}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingRuta ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generando Hoja de Cobranza...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Generar Hoja de Cobranza de Campo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FORMULARIO PARA ESTADO DE CUENTA POR CLIENTE */}
        {/* ========================================================================= */}
        {tipoReporte === 'ESTADO_CUENTA' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" /> Parámetros del Estado de Cuenta
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Cliente
                </label>
                <div className="relative">
                  {loadingClientes ? (
                    <div className="w-full py-2 px-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-400">
                      Cargando listado de clientes...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedClienteId}
                        onChange={(e) => setSelectedClienteId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                      >
                        <option value="TODOS">👥 TODOS LOS CLIENTES (UNIFICADO)</option>
                        {filteredClientOptions.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Filtrar clientes en la lista..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] placeholder:text-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Estado de Deuda Facturas
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos los estados (Vencidas, al día, pagadas, etc.)</option>
                  <option value="PENDIENTE">Sólo Facturas Pendientes (Con Saldo)</option>
                  <option value="VENCIDO">Sólo Facturas Vencidas (Con Saldo)</option>
                  <option value="AL_DIA">Sólo Facturas Al Día (Con Saldo)</option>
                  <option value="PAGADA">Sólo Facturas Solventadas (Pagadas)</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={generarReporte}
                  disabled={loading || loadingClientes}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generando Reporte...</span>
                    </>
                  ) : (
                    <>
                      <span>📊</span>
                      <span>Generar Reporte</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA PREVIA EN PANTALLA: HOJA DE RUTA */}
        {/* ========================================================================= */}
        {tipoReporte === 'HOJA_RUTA' && hojaRutaGenerada && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-4 gap-3">
              <div>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wide">
                  Vista Previa • Hoja de Cobranza de Campo
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Ruta: {selectedRuta}
                </h2>
                <p className="text-xs text-slate-500">
                  Vendedor: <span className="font-bold text-slate-700">{vendedorActivoNombre}</span> • Fecha: <span className="font-bold text-slate-700">{formatFechaDMY(fechaSalida)}</span>
                </p>
              </div>

              <button
                onClick={handlePrint}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hoja de Ruta (PDF)</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Cartera a Cobrar</span>
                <p className="text-xl font-black text-emerald-950 font-mono mt-0.5">{fmt(totalCarteraRuta)}</p>
                <p className="text-[10px] text-emerald-700 mt-1 font-semibold">Total pendiente en esta ruta</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Clientes con Saldo</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{clientesRuta.length} clientes</p>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">Ordenados de mayor a menor deuda</p>
              </div>

              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 col-span-2 md:col-span-1">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Saldo Vencido</span>
                <p className="text-xl font-black text-rose-900 font-mono mt-0.5">{fmt(totalVencidoRuta)}</p>
                <p className="text-[10px] text-rose-700 mt-1 font-semibold">Vencidos (+15 días de plazo)</p>
              </div>
            </div>

            {/* Table Preview */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-8">#</th>
                    <th className="py-3 px-3 w-64">Cliente / Contacto</th>
                    <th className="py-3 px-3 text-left">
                      Desglose de Facturas Pendientes (Reciente → Antigua)
                    </th>
                    <th className="py-3 px-3 text-right w-36 bg-emerald-50 text-emerald-950">Saldo a Cobrar</th>
                    <th className="py-3 px-3 text-center w-44 bg-amber-50 text-amber-950">Espacio de Abono (Físico)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesRuta.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs">{c.nombre}</span>
                          {c.telefono && <span className="text-[11px] text-slate-500 shrink-0 font-medium">📱 {c.telefono}</span>}
                          {c.alias && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                              🏷️ {c.alias}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {c.facturasPendientes && c.facturasPendientes.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {c.facturasPendientes.map((f, fIdx) => (
                              <span
                                key={f.id}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] ${
                                  fIdx === 0 && !f.esSaldoInicial
                                    ? 'bg-emerald-50 border-emerald-300 text-slate-900 shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                {f.esSaldoInicial ? (
                                  <>
                                    <span className="font-bold text-slate-500 text-[10px]">Saldo Ant:</span>
                                    <span className="font-black font-mono text-slate-900">{fmt(f.saldoPendiente)}</span>
                                  </>
                                ) : (
                                  <>
                                    {f.fechaEmision && (
                                      <span className="font-extrabold text-emerald-700 text-[10px] bg-white px-1 py-0.2 rounded border border-emerald-200">
                                        {formatFechaCorta(f.fechaEmision)}
                                      </span>
                                    )}
                                    <span className="font-black font-mono text-slate-950">{fmt(f.saldoPendiente)}</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      (#{f.correlativo}{f.estadoPago === 'PARCIAL' ? ' • Saldo' : ''})
                                    </span>
                                  </>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Saldo pendiente: {fmt(c.saldoTotal)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono text-sm bg-emerald-50/30 whitespace-nowrap">
                        {fmt(c.saldoTotal)}
                      </td>
                      <td className="py-2.5 px-3 bg-amber-50/15">
                        <div className="w-full h-7 border border-dashed border-slate-300 rounded-lg bg-white flex items-center px-2.5 text-slate-400 text-xs font-bold">
                          L.
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-3 text-right uppercase text-slate-800 align-middle">
                      TOTAL CARTERA ({clientesRuta.length} CLIENTES):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-950 bg-emerald-100 text-sm font-black align-middle whitespace-nowrap">
                      {fmt(totalCarteraRuta)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono bg-amber-100/70 align-top">
                      <div className="text-[10px] font-black text-slate-800 uppercase">
                        Total Recaudado:
                      </div>
                      <div className="text-sm font-black text-slate-400 mt-1 h-6 flex items-center">
                        L.
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA PREVIA EN PANTALLA: ESTADO DE CUENTA */}
        {/* ========================================================================= */}
        {tipoReporte === 'ESTADO_CUENTA' && reporte && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3 sm:p-6 shadow-md space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wide">
                  Vista Previa del Reporte
                </span>
                <h2 className="text-lg font-black text-slate-900">{activeClienteNombre}</h2>
                <p className="text-xs text-slate-500">
                  {fechaInicio || fechaFin 
                    ? `Período: ${formatFechaDMY(fechaInicio) || 'Inicio'} al ${formatFechaDMY(fechaFin) || 'Fin'}` 
                    : 'Historial completo de movimientos contables.'}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <button
                  onClick={handlePrint}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Reporte</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-200/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Saldo Anterior</span>
                <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">{fmt(reporte.resumen.saldoAnterior)}</p>
              </div>
              <div className="p-2.5 sm:p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Facturado (+)</span>
                <p className="text-xs sm:text-sm font-black text-indigo-900 mt-0.5">+{fmt(reporte.resumen.totalFacturado)}</p>
              </div>
              <div className="p-2.5 sm:p-3.5 bg-teal-50/50 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Abonado (-)</span>
                <p className="text-xs sm:text-sm font-black text-teal-900 mt-0.5">-{fmt(reporte.resumen.totalAbonado)}</p>
              </div>
              <div className="p-2.5 sm:p-3.5 bg-amber-50/50 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Descuentos/NC (-)</span>
                <p className="text-xs sm:text-sm font-black text-amber-900 mt-0.5">-{fmt(reporte.resumen.totalNotasCredito)}</p>
              </div>
              <div className="p-2.5 sm:p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 col-span-2 md:col-span-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide font-sans">Saldo Neto</span>
                <p className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">{fmt(reporte.resumen.saldoTotal)}</p>
              </div>
            </div>

            {/* Trial Balance table (only for TODOS) */}
            {selectedClienteId === 'TODOS' && reporte.clientesResumen.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <span>👥</span> Resumen de Saldos Consolidado por Cliente
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3 text-right">Saldo Anterior</th>
                        <th className="py-2.5 px-3 text-right text-indigo-700">Facturado (+)</th>
                        <th className="py-2.5 px-3 text-right text-teal-700">Abonado (-)</th>
                        <th className="py-2.5 px-3 text-right text-amber-700">Notas Crédito (-)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-800">Saldo Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reporte.clientesResumen.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900">{c.nombre}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 font-semibold">{fmt(c.saldoAnterior)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-indigo-700 font-semibold">+{fmt(c.facturado)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-teal-700 font-semibold">-{fmt(c.abonado)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-amber-700 font-semibold">-{fmt(c.notasCredito)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-black text-slate-900 bg-slate-50">{fmt(c.saldoFinal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function ReportesCxCPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>Cargando centro de reportes...</span>
      </div>
    }>
      <ReportesCxCContent />
    </Suspense>
  );
}
