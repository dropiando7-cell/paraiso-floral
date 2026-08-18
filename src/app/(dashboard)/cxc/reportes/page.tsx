'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  BookOpen
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

const fmt = (n: number) => n.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 });

export default function ReportesCxCPage() {
  const [clientes, setClientes] = useState<ClienteCompact[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('TODOS');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [estado, setEstado] = useState<string>('TODOS'); // TODOS, PENDIENTE, VENCIDO, PAGADA, AL_DIA

  const [reporte, setReporte] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingClientes, setLoadingClientes] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter for the clients select dropdown
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');

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

  useEffect(() => {
    cargarClientes();
  }, []);

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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <>
      {/* Styles for print output matching the requested invoice / account statement layout */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 10px !important;
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
            border-bottom: 1px solid #cbd5e1 !important;
            padding: 5px 6px !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }
          .kpi-container {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 10px !important;
            background-color: #f8fafc !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* 🖨️ DETALLE DE IMPRESIÓN OFICIAL (ESTADO DE CUENTA / REPORTE) */}
      {reporte && (
        <div className="print-only max-w-4xl mx-auto p-2 space-y-4 text-slate-900 bg-white">
          <div className="print-header flex justify-between items-start border-b-2 border-emerald-600 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="Paraíso Floral" className="w-12 h-12 object-contain rounded-full shrink-0" />
              <div className="space-y-0.5">
                <h1 className="text-xl font-black text-emerald-800 tracking-tight">DISTRIBUIDORA PARAÍSO FLORAL</h1>
                <p className="text-[10px] font-bold text-slate-700">Mayorista y Distribuidora de Flores y Follajes Fresh 🌹</p>
                <p className="text-[9px] text-slate-500">RTN: 08011990123456 | Tegucigalpa, Honduras | Tel: +(504) 9538-0113</p>
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
                <p><strong>Rango de Fechas:</strong> {fechaInicio || 'Inicio'} al {fechaFin || 'Fin'}</p>
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
                      <td className="font-bold">{p.correlativo || 'ABONO'}</td>
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

          {/* Table: Credit Notes */}
          {reporte.notasCredito.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-0.5">
                3. AJUSTES Y DEVOLUCIONES POR FLOR DAÑADA / MERMAS
              </h3>
              <table className="w-full text-[9px]">
                <thead>
                  <tr>
                    <th className="text-left">Nota #</th>
                    {selectedClienteId === 'TODOS' && <th className="text-left">Cliente</th>}
                    <th className="text-left">Fecha</th>
                    <th className="text-left">Motivo / Descripción</th>
                    <th className="text-right">Monto Descontado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.notasCredito.map(n => (
                    <tr key={n.id}>
                      <td className="font-bold">{n.correlativo || 'NC'}</td>
                      {selectedClienteId === 'TODOS' && <td>{n.clienteNombre}</td>}
                      <td>{new Date(n.fecha).toLocaleDateString('es-HN')}</td>
                      <td>{n.motivo.replace('_', ' ')} - {n.descripcion}</td>
                      <td className="text-right tabular-nums font-bold text-amber-800">{fmt(n.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bank Accounts info */}
          <div className="p-2 border border-slate-300 rounded bg-slate-50 text-[9px] space-y-0.5">
            <p className="font-bold text-slate-800 uppercase">Cuentas Bancarias de Distribuidora Paraíso Floral:</p>
            <div className="grid grid-cols-3 gap-1 text-slate-700">
              <div>• <strong>Atlántida:</strong> 1100-2233-4455</div>
              <div>• <strong>Ficohsa:</strong> 2000-4455-6677</div>
              <div>• <strong>BAC:</strong> 9988-7766</div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
            <div>
              <div className="border-t border-slate-450 pt-0.5 font-bold text-slate-800">Crédito y Cobros</div>
              <p className="text-[9px] text-slate-400">Distribuidora Paraíso Floral</p>
            </div>
            <div>
              <div className="border-t border-slate-450 pt-0.5 font-bold text-slate-800">Firma del Cliente</div>
              <p className="text-[9px] text-slate-400">{selectedClienteId === 'TODOS' ? 'Conformidad de Cartera' : activeClienteNombre}</p>
            </div>
          </div>
        </div>
      )}

      {/* 💻 VISTA INTERACTIVA WEB (NO PRINT) */}
      <div className="no-print px-1 py-3 sm:px-6 sm:py-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 bg-slate-50/50 min-h-screen">
        {/* Breadcrumb & Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/cxc"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Cuentas por Cobrar
          </Link>

          {reporte && (
            <button
              onClick={handlePrint}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-900/90 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Reporte (PDF)</span>
            </button>
          )}
        </div>

        {/* Title Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-emerald-700/10">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>📊</span> Generador de Reportes CxC
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm font-medium">
              Obtén estados de cuenta consolidados, filtra por cliente, por vencimiento y por rango de fechas para exportar a PDF.
            </p>
          </div>
        </div>

        {/* Filters Form Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" /> Parámetros del Reporte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Cliente Picker */}
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
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    {/* Buscador rápido de clientes */}
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

            {/* Fecha Inicio */}
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

            {/* Fecha Fin */}
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
            {/* Estado Vencimiento */}
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

            {/* Submit Button */}
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

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-250 text-rose-700 rounded-2xl flex items-center gap-3 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Report Output Card */}
        {reporte ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3 sm:p-6 shadow-md space-y-4 sm:space-y-6">
            {/* Banner Header inside card */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wide">
                  Vista Previa del Reporte
                </span>
                <h2 className="text-lg font-black text-slate-900">{activeClienteNombre}</h2>
                <p className="text-xs text-slate-500">
                  {fechaInicio || fechaFin 
                    ? `Período: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Fin'}` 
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

            {/* KPI Cards section */}
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
                        <th className="py-2.5 px-3 text-right text-indigo-750">Facturado (+)</th>
                        <th className="py-2.5 px-3 text-right text-teal-750">Abonado (-)</th>
                        <th className="py-2.5 px-3 text-right text-amber-750">Notas Crédito (-)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-850">Saldo Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reporte.clientesResumen.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => {
                                setSelectedClienteId(c.id);
                                setTimeout(() => generarReporte(), 100);
                              }}
                              className="font-bold text-emerald-700 hover:underline cursor-pointer text-left focus:outline-none"
                            >
                              {c.nombre}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-500">{fmt(c.saldoAnterior)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-600">+{fmt(c.facturado)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-teal-600">-{fmt(c.abonado)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-600">-{fmt(c.notasCredito)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-900 bg-emerald-50/10">{fmt(c.saldoFinal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invoices table */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-4 h-4 text-emerald-600" /> 1. Detalle de Facturas Pendientes / Emitidas
              </h3>
              {reporte.facturas.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-200 rounded-xl">
                  No se encontraron facturas registradas en este rango de selección.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Factura</th>
                        {selectedClienteId === 'TODOS' && <th className="py-2.5 px-3">Cliente</th>}
                        <th className="py-2.5 px-3">Emisión</th>
                        <th className="py-2.5 px-3">Vencimiento</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                        <th className="py-2.5 px-3 text-center">Estado Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reporte.facturas.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">#{f.correlativo}</td>
                          {selectedClienteId === 'TODOS' && <td className="py-2.5 px-3 font-medium text-slate-700">{f.clienteNombre}</td>}
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {new Date(f.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {f.fechaVencimiento ? new Date(f.fechaVencimiento).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{fmt(f.total)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-800">{fmt(f.saldoPendiente)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              f.estadoPago === 'PAGADA'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : f.estadoPago === 'PARCIAL'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {f.estadoPago}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payments table */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-600" /> 2. Historial de Abonos y Pagos Recibidos
              </h3>
              {reporte.pagos.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-200 rounded-xl">
                  No se encontraron abonos registrados en este rango de selección.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Recibo #</th>
                        {selectedClienteId === 'TODOS' && <th className="py-2.5 px-3">Cliente</th>}
                        <th className="py-2.5 px-3">Fecha Pago</th>
                        <th className="py-2.5 px-3">Forma de Pago</th>
                        <th className="py-2.5 px-3">Banco / Referencia</th>
                        <th className="py-2.5 px-3 text-right">Monto Recibido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reporte.pagos.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{p.correlativo || 'RECIBO'}</td>
                          {selectedClienteId === 'TODOS' && <td className="py-2.5 px-3 font-medium text-slate-700">{p.clienteNombre}</td>}
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {new Date(p.fecha).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{p.metodoPago}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {p.banco ? `${p.banco} - ` : ''}{p.referencia || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-teal-700">{fmt(p.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Credit notes table */}
            {reporte.notasCredito.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <span>🌹</span> 3. Ajustes y Devoluciones por Flor Dañada / Mermas
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Nota #</th>
                        {selectedClienteId === 'TODOS' && <th className="py-2.5 px-3">Cliente</th>}
                        <th className="py-2.5 px-3">Fecha Ajuste</th>
                        <th className="py-2.5 px-3">Detalle del Reclamo</th>
                        <th className="py-2.5 px-3 text-right">Monto Descontado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reporte.notasCredito.map(n => (
                        <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{n.correlativo || 'NC'}</td>
                          {selectedClienteId === 'TODOS' && <td className="py-2.5 px-3 font-medium text-slate-700">{n.clienteNombre}</td>}
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {new Date(n.fecha).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            <span className="font-extrabold text-[10px] bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 mr-2">
                              {n.motivo.replace('_', ' ')}
                            </span>
                            {n.descripcion}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-700">{fmt(n.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <span>📊</span>
            </div>
            <h3 className="font-bold text-slate-800 text-base">Listo para generar tu reporte</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Define los filtros en el panel superior y presiona &quot;Generar Reporte&quot; para cargar la información.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
