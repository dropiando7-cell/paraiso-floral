'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  MessageCircle,
  FileText,
  DollarSign,
  Flower2,
  AlertTriangle,
  RefreshCw,
  Share2,
  FileCheck
} from 'lucide-react';
import ModalAbono from '@/components/cxc/ModalAbono';
import ModalNotaCredito from '@/components/cxc/ModalNotaCredito';

interface ClienteDetalle {
  cliente: {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    rtn: string | null;
    limiteCredito: number;
    diasCredito: number;
  };
  resumen: {
    saldoTotal: number;
    totalFacturado: number;
    totalAbonado: number;
    totalNotasCredito: number;
  };
  facturas: Array<{
    id: string;
    correlativo: string;
    fechaEmision: string;
    total: number;
    saldoPendiente: number;
    estadoPago: string;
    detalles: Array<{
      id: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      totalLinea: number;
    }>;
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
    creadoPor: { nombre: string | null; apellido: string | null } | null;
  }>;
  notasCredito: Array<{
    id: string;
    correlativo: string | null;
    monto: number;
    motivo: string;
    descripcion: string;
    fotos: string[] | null;
    fecha: string;
    creadoPor: { nombre: string | null; apellido: string | null } | null;
  }>;
}

export default function ClienteEstadoCuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clienteId = resolvedParams.id;

  const [data, setData] = useState<ClienteDetalle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'FACTURAS' | 'PAGOS' | 'NOTAS'>('FACTURAS');
  const [sharing, setSharing] = useState<boolean>(false);

  // Modales
  const [modalAbonoOpen, setModalAbonoOpen] = useState<boolean>(false);
  const [modalNCOpen, setModalNCOpen] = useState<boolean>(false);

  const cargarEstadoCuenta = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cxc/clientes/${clienteId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error cargando estado de cuenta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstadoCuenta();
  }, [clienteId]);

  const handlePrint = () => {
    window.print();
  };

  // Función para compartir directamente el archivo PDF o enlace desde celulares
  const handleSharePdfWhatsApp = async () => {
    if (!data) return;
    try {
      setSharing(true);
      
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const shareTitle = `Estado de Cuenta - ${data.cliente.nombre}`;
      const shareText = `🌸 DISTRIBUIDORA PARAÍSO FLORAL 🌸\nEstado de Cuenta de ${data.cliente.nombre}\nSaldo Pendiente: L. ${data.resumen.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

      // Si el navegador en teléfono soporta Web Share API con archivos/links
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl
        });
      } else {
        // Fallback abrir WhatsApp directo
        const waUrl = generarWhatsAppLink();
        if (waUrl) window.open(waUrl, '_blank');
      }
    } catch (err) {
      console.log('Compartir cancelado o no soportado:', err);
    } finally {
      setSharing(false);
    }
  };

  const generarWhatsAppLink = () => {
    if (!data?.cliente.telefono) return null;
    const cleanPhone = data.cliente.telefono.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 8 ? `504${cleanPhone}` : cleanPhone;
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    const texto = `🌸 *DISTRIBUIDORA PARAÍSO FLORAL* 🌸
*Estado de Cuenta Detallado*

Cliente: *${data.cliente.nombre}*

📌 *Saldo Pendiente Total:* L. ${data.resumen.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
📊 *Total Facturado:* L. ${data.resumen.totalFacturado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
💵 *Total Abonado:* L. ${data.resumen.totalAbonado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
🌹 *Notas de Crédito / Ajustes:* L. ${data.resumen.totalNotasCredito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}

🔗 *Ver o Descargar Estado de Cuenta:*
${currentUrl}

¡Agradecemos su preferencia! 🌺`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(texto)}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center max-w-5xl mx-auto space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-600" />
        <p className="text-sm font-semibold text-slate-600">Cargando estado de cuenta del cliente...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center max-w-5xl mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Cliente no encontrado</h2>
        <Link href="/cxc" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Volver a Cuentas por Cobrar
        </Link>
      </div>
    );
  }

  const { cliente, resumen, facturas, pagos, notasCredito } = data;
  const waLink = generarWhatsAppLink();
  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <>
      {/* Estilos Específicos para Impresión Oficial de Documento */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-header {
            border-bottom: 2px solid #059669 !important;
            padding-bottom: 12px !important;
            margin-bottom: 16px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 6px 8px !important;
          }
          th {
            background-color: #f8fafc !important;
            color: #1e293b !important;
            font-weight: 700 !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* VISTA PARA IMPRESIÓN OFICIAL (DOCUMENTO CONTABLE COMERCIAL) */}
      <div className="print-only max-w-4xl mx-auto p-4 space-y-6 text-slate-900 bg-white">
        {/* Encabezado Membretado Oficial */}
        <div className="print-header flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-emerald-800 tracking-tight">DISTRIBUIDORA PARAÍSO FLORAL</h1>
            <p className="text-xs font-bold text-slate-700">Venta de Flores al Mayoreo y Detalle</p>
            <p className="text-[11px] text-slate-600">RTN: 08011990123456 | Tegucigalpa, Honduras</p>
            <p className="text-[11px] text-slate-600">Teléfono / WhatsApp: +(504) 9988-7766 | +(504) 3322-1100</p>
          </div>
          <div className="text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded border border-emerald-300">
              ESTADO DE CUENTA
            </span>
            <p className="text-[11px] text-slate-500 pt-1">Emisión: {fechaHoy}</p>
          </div>
        </div>

        {/* Datos del Cliente y Resumen Financiero */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border border-slate-300 rounded-lg bg-slate-50/50 space-y-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">DATOS DEL CLIENTE</h3>
            <p className="text-sm font-black text-slate-900">{cliente.nombre}</p>
            <p className="text-xs text-slate-700"><strong>Teléfono:</strong> {cliente.telefono || 'N/A'}</p>
            <p className="text-xs text-slate-700"><strong>RTN:</strong> {cliente.rtn || 'Consumidor Final'}</p>
            <p className="text-xs text-slate-700"><strong>Dirección:</strong> {cliente.direccion || 'Tegucigalpa, Honduras'}</p>
          </div>

          <div className="p-3 border border-emerald-300 rounded-lg bg-emerald-50/30 space-y-1 text-right">
            <h3 className="text-xs font-bold text-emerald-900 uppercase border-b border-emerald-200 pb-1 text-right">RESUMEN DE CUENTA</h3>
            <div className="flex justify-between text-xs py-0.5">
              <span className="text-slate-600">Total Facturado:</span>
              <span className="font-bold">L. {resumen.totalFacturado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs py-0.5">
              <span className="text-slate-600">Total Abonos:</span>
              <span className="font-bold text-teal-700">(-) L. {resumen.totalAbonado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs py-0.5">
              <span className="text-slate-600">Notas de Crédito / Mermas:</span>
              <span className="font-bold text-amber-700">(-) L. {resumen.totalNotasCredito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-emerald-300 font-black text-emerald-900">
              <span>SALDO A PAGAR:</span>
              <span className="text-base">L. {resumen.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Tabla 1: Facturas Pendientes */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1">
            1. DETALLE DE FACTURAS PENDIENTES
          </h3>
          {facturas.length === 0 ? (
            <p className="text-xs italic text-slate-500">El cliente no tiene facturas pendientes a la fecha.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left"># Factura</th>
                  <th className="text-left">Fecha Emisión</th>
                  <th className="text-right">Monto Total</th>
                  <th className="text-right">Saldo Pendiente</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map(f => (
                  <tr key={f.id}>
                    <td className="font-bold">#{f.correlativo}</td>
                    <td>{new Date(f.fechaEmision).toLocaleDateString('es-HN')}</td>
                    <td className="text-right">L. {f.total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right font-bold text-emerald-800">L. {f.saldoPendiente.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-center font-semibold">{f.estadoPago || 'PENDIENTE'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tabla 2: Historial de Abonos Recientes */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1">
            2. HISTORIAL DE ABONOS Y PAGOS RECIBIDOS
          </h3>
          {pagos.length === 0 ? (
            <p className="text-xs italic text-slate-500">No hay abonos registrados en el historial.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left">Recibo #</th>
                  <th className="text-left">Fecha Pago</th>
                  <th className="text-left">Método</th>
                  <th className="text-left">Banco / Referencia</th>
                  <th className="text-right">Monto Abonado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id}>
                    <td className="font-bold">{p.correlativo || 'REC-ABONO'}</td>
                    <td>{new Date(p.fecha).toLocaleDateString('es-HN')}</td>
                    <td>{p.metodoPago}</td>
                    <td>{p.banco ? `${p.banco} - ` : ''}{p.referencia || 'N/A'}</td>
                    <td className="text-right font-bold text-teal-800">L. {p.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tabla 3: Notas de Crédito y Ajustes por Flor */}
        {notasCredito.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1">
              3. AJUSTES Y DEVOLUCIONES POR FLOR DAÑADA / MERMAS
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left">Nota #</th>
                  <th className="text-left">Fecha</th>
                  <th className="text-left">Motivo / Justificación</th>
                  <th className="text-right">Monto Descontado</th>
                </tr>
              </thead>
              <tbody>
                {notasCredito.map(nc => (
                  <tr key={nc.id}>
                    <td className="font-bold">{nc.correlativo || 'NC-001'}</td>
                    <td>{new Date(nc.fecha).toLocaleDateString('es-HN')}</td>
                    <td>{nc.motivo.replace('_', ' ')} - {nc.descripcion}</td>
                    <td className="text-right font-bold text-amber-800">L. {nc.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cuentas Bancarias de Pago */}
        <div className="p-3 border border-slate-300 rounded-lg bg-slate-50 text-[11px] space-y-1">
          <p className="font-bold text-slate-800 uppercase">Cuentas Bancarias Autorizadas para Depósito / Transferencia:</p>
          <div className="grid grid-cols-3 gap-2 text-slate-700">
            <div>• <strong>Banco Atlántida:</strong> 1100-2233-4455 (Paraíso Floral)</div>
            <div>• <strong>Banco Ficohsa:</strong> 2000-4455-6677 (Paraíso Floral)</div>
            <div>• <strong>Tigo Money / BAC:</strong> 9988-7766</div>
          </div>
        </div>

        {/* Firmas de Conformidad */}
        <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Departamento de Crédito y Cobros</div>
            <p className="text-[10px] text-slate-500">Distribuidora Paraíso Floral</p>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Firma de Conformidad del Cliente</div>
            <p className="text-[10px] text-slate-500">{cliente.nombre}</p>
          </div>
        </div>
      </div>

      {/* VISTA PANTALLA INTERACTIVA (NO PRINT) */}
      <div className="no-print p-4 sm:p-6 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
        {/* Botón Volver & Acciones de Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/cxc"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Cuentas por Cobrar
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSharePdfWhatsApp}
              disabled={sharing}
              className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
              title="Compartir enlace oficial directo"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir por Celular</span>
            </button>

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Descargar PDF</span>
            </button>
          </div>
        </div>

        {/* Tarjeta del Cliente & Resumen - Modo Día */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Estado de Cuenta Oficial
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{cliente.nombre}</h1>
              <p className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                <span>📱 Tel: {cliente.telefono || 'Sin teléfono'}</span>
                <span>📄 RTN: {cliente.rtn || 'Consumidor Final'}</span>
                <span>📍 {cliente.direccion || 'Tegucigalpa'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalAbonoOpen(true)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                <span>Abonar</span>
              </button>
              <button
                onClick={() => setModalNCOpen(true)}
                className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Flower2 className="w-4 h-4" />
                <span>Ajuste por Flor</span>
              </button>
            </div>
          </div>

          {/* 4 KPIs Métricas del Cliente */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Saldo Pendiente</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                L. {resumen.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Facturado</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                L. {resumen.totalFacturado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100">
              <span className="text-[11px] font-bold text-teal-800 uppercase">Total Abonado</span>
              <p className="text-xl sm:text-2xl font-black text-teal-600 mt-1">
                L. {resumen.totalAbonado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
              <span className="text-[11px] font-bold text-amber-800 uppercase">Notas de Crédito / Mermas</span>
              <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                L. {resumen.totalNotasCredito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación del Historial */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveTab('FACTURAS')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'FACTURAS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Facturas ({facturas.length})
            </button>
            <button
              onClick={() => setActiveTab('PAGOS')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'PAGOS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Historial de Abonos ({pagos.length})
            </button>
            <button
              onClick={() => setActiveTab('NOTAS')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'NOTAS'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ajustes / Flor Dañada ({notasCredito.length})
            </button>
          </div>

          {/* TAB 1: FACTURAS */}
          {activeTab === 'FACTURAS' && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Facturas emitidas al cliente
              </h3>

              {facturas.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No hay facturas registradas para este cliente.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 px-2">Correlativo</th>
                        <th className="pb-3 px-2">Fecha</th>
                        <th className="pb-3 px-2 text-right">Total Factura</th>
                        <th className="pb-3 px-2 text-right">Saldo Pendiente</th>
                        <th className="pb-3 px-2 text-center">Estado Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {facturas.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-3 px-2 font-bold text-slate-900">#{f.correlativo}</td>
                          <td className="py-3 px-2 text-slate-500">
                            {new Date(f.fechaEmision).toLocaleDateString('es-HN')}
                          </td>
                          <td className="py-3 px-2 text-right font-semibold text-slate-800">
                            L. {f.total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-2 text-right font-black text-emerald-600">
                            L. {f.saldoPendiente.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                f.estadoPago === 'PAGADA'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : f.estadoPago === 'PARCIAL'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {f.estadoPago || 'PENDIENTE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL DE ABONOS */}
          {activeTab === 'PAGOS' && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Registros de Abonos y Pagos
              </h3>

              {pagos.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No hay abonos registrados aun.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 px-2">Recibo #</th>
                        <th className="pb-3 px-2">Fecha</th>
                        <th className="pb-3 px-2">Método</th>
                        <th className="pb-3 px-2">Banco / Ref</th>
                        <th className="pb-3 px-2 text-right">Monto Abonado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {pagos.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-2 font-bold text-slate-900">
                            {p.correlativo || 'REC-ABONO'}
                          </td>
                          <td className="py-3 px-2 text-slate-500">
                            {new Date(p.fecha).toLocaleDateString('es-HN')}
                          </td>
                          <td className="py-3 px-2 font-medium text-emerald-700">
                            {p.metodoPago}
                          </td>
                          <td className="py-3 px-2 text-slate-500">
                            {p.banco ? `${p.banco} - ` : ''}{p.referencia || 'N/A'}
                          </td>
                          <td className="py-3 px-2 text-right font-black text-emerald-600">
                            L. {p.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTAS DE CREDITO POR FLOR DAÑADA */}
          {activeTab === 'NOTAS' && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Flower2 className="w-4 h-4 text-amber-600" /> Historial de Devoluciones y Notas de Crédito
              </h3>

              {notasCredito.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No hay notas de crédito registradas.</p>
              ) : (
                <div className="space-y-3">
                  {notasCredito.map(nc => (
                    <div
                      key={nc.id}
                      className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex flex-col sm:flex-row justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">#{nc.correlativo || 'NC-001'}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                            {nc.motivo.replace('_', ' ')}
                          </span>
                          <span className="text-slate-400">
                            {new Date(nc.fecha).toLocaleDateString('es-HN')}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium">{nc.descripcion}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-slate-400 block text-[10px]">Monto Descontado</span>
                        <span className="text-lg font-black text-amber-700">
                          L. {nc.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modales */}
        <ModalAbono
          isOpen={modalAbonoOpen}
          onClose={() => setModalAbonoOpen(false)}
          onSuccess={cargarEstadoCuenta}
          cliente={{
            id: cliente.id,
            nombre: cliente.nombre,
            saldoTotal: resumen.saldoTotal,
            facturas
          }}
        />

        <ModalNotaCredito
          isOpen={modalNCOpen}
          onClose={() => setModalNCOpen(false)}
          onSuccess={cargarEstadoCuenta}
          cliente={{
            id: cliente.id,
            nombre: cliente.nombre,
            saldoTotal: resumen.saldoTotal,
            facturas
          }}
        />
      </div>
    </>
  );
}
