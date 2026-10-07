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
  FileCheck,
  Clock,
  BookOpen,
  Edit3,
  Trash2,
  Plus,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalAbono from '@/components/cxc/ModalAbono';
import ModalNotaCredito from '@/components/cxc/ModalNotaCredito';
import ModalSaldoInicial from '@/components/cxc/ModalSaldoInicial';
import ModalEditarAbono from '@/components/cxc/ModalEditarAbono';
import ModalRegistrarFactura from '@/components/cxc/ModalRegistrarFactura';
import { exportarEstadoCuentaClienteExcel } from '@/utils/cxcExportUtils';
import ClienteSearchSwitcher from '@/components/cxc/ClienteSearchSwitcher';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ClienteDetalle {
  cliente: {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    departamento?: string | null;
    rtn: string | null;
    limiteCredito: number;
    saldoInicial?: number;
    fechaSaldoInicial?: string | Date | null;
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
    creadoPor?: { nombre: string | null; apellido: string | null } | null;
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
  const [activeTab, setActiveTab] = useState<'MAYOR' | 'FACTURAS' | 'PAGOS' | 'NOTAS'>('MAYOR');
  const [sharing, setSharing] = useState<boolean>(false);

  // Modales
  const [modalFacturaOpen, setModalFacturaOpen] = useState<boolean>(false);
  const [modalAbonoOpen, setModalAbonoOpen] = useState<boolean>(false);
  const [modalNCOpen, setModalNCOpen] = useState<boolean>(false);
  const [modalSaldoInicialOpen, setModalSaldoInicialOpen] = useState<boolean>(false);
  const [modalEditarAbonoOpen, setModalEditarAbonoOpen] = useState<boolean>(false);
  const [pagoAEditar, setPagoAEditar] = useState<any>(null);

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

  const handleAnularAbono = async (pagoId: string, correlativo?: string | null) => {
    if (!confirm(`¿Estás seguro de anular el abono ${correlativo || ''}? El monto descontado volverá a sumarse automáticamente a la deuda del cliente.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/cxc/abonos/${pagoId}`, { method: 'DELETE' });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Error al anular abono');
      toast.success('Abono anulado exitosamente');
      cargarEstadoCuenta();
    } catch (err: any) {
      toast.error(err.message || 'Error al anular abono');
      setLoading(false);
    }
  };

  const handleAnularNotaCredito = async (ncId: string, correlativo?: string | null) => {
    if (!confirm(`¿Estás seguro de anular la Nota de Crédito / Merma ${correlativo || ''}?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/cxc/notas-credito/${ncId}`, { method: 'DELETE' });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Error al anular nota de crédito');
      toast.success('Nota de crédito anulada exitosamente');
      cargarEstadoCuenta();
    } catch (err: any) {
      toast.error(err.message || 'Error al anular nota de crédito');
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstadoCuenta();
  }, [clienteId]);

  // Construcción del Libro Mayor Contable Unificado (Débitos y Créditos)
  const movimientosContables = React.useMemo(() => {
    if (!data) return [];

    const list: Array<{
      id: string;
      fecha: Date;
      tipo: 'SALDO_INICIAL' | 'FACTURA' | 'ABONO' | 'NOTA_CREDITO';
      documento: string;
      detalles: string;
      debito: number;
      credito: number;
    }> = [];

    // 1. Saldo Inicial (Excel)
    if (data.cliente.saldoInicial && data.cliente.saldoInicial > 0) {
      list.push({
        id: 'saldo-inicial-excel',
        fecha: data.cliente.fechaSaldoInicial ? new Date(data.cliente.fechaSaldoInicial) : new Date('2026-01-01'),
        tipo: 'SALDO_INICIAL',
        documento: 'SALDO INICIAL EXCEL',
        detalles: 'Carga de deuda previa registrada de libreta Excel',
        debito: data.cliente.saldoInicial,
        credito: 0
      });
    }

    // 2. Facturas
    (data.facturas || []).forEach(f => {
      if (f.correlativo !== 'SALDO INICIAL EXCEL') {
        const desc = f.detalles && f.detalles.length > 0
          ? f.detalles.map(d => `${d.cantidad > 1 ? `${d.cantidad}x ` : ''}${d.descripcion}`).join(', ')
          : 'Venta a Crédito Comercial';

        list.push({
          id: f.id,
          fecha: new Date(f.fechaEmision),
          tipo: 'FACTURA',
          documento: `#${f.correlativo}`,
          detalles: desc,
          debito: f.total,
          credito: 0
        });
      }
    });

    // 3. Abonos
    (data.pagos || []).forEach(p => {
      const desc = `Abono (${p.metodoPago})${p.banco ? ` en ${p.banco}` : ''}${p.referencia ? ` Ref: ${p.referencia}` : ''}${p.notas ? ` [${p.notas}]` : ''}`;
      list.push({
        id: p.id,
        fecha: new Date(p.fecha),
        tipo: 'ABONO',
        documento: p.correlativo || 'RECIBO PAGO',
        detalles: desc,
        debito: 0,
        credito: p.monto
      });
    });

    // 4. Notas de Crédito / Mermas
    (data.notasCredito || []).forEach(n => {
      const desc = `Ajuste (${n.motivo || 'Flor Dañada'})${n.descripcion ? ` - ${n.descripcion}` : ''}`;
      list.push({
        id: n.id,
        fecha: new Date(n.fecha),
        tipo: 'NOTA_CREDITO',
        documento: n.correlativo || 'NOTA CREDITO',
        detalles: desc,
        debito: 0,
        credito: n.monto
      });
    });

    // Ordenar cronológicamente (más antiguo primero)
    list.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    let saldoAcumulado = 0;
    return list.map(item => {
      saldoAcumulado = saldoAcumulado + item.debito - item.credito;
      return {
        ...item,
        saldoAcumulado: saldoAcumulado
      };
    });
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportarExcel = () => {
    if (!data) return;
    const exportMovs = movimientosContables.map(m => ({
      fecha: m.fecha,
      tipo: m.tipo,
      documento: m.documento,
      detalles: m.detalles,
      debito: m.debito,
      credito: m.credito,
      saldoAcumulado: m.saldoAcumulado
    }));

    exportarEstadoCuentaClienteExcel(
      {
        nombre: data.cliente.nombre,
        telefono: data.cliente.telefono,
        rtn: data.cliente.rtn,
        departamento: data.cliente.departamento,
        saldoTotal: data.resumen.saldoTotal
      },
      exportMovs
    );
    toast.success('Descargando archivo Excel del estado de cuenta...');
  };

  // Función para compartir directamente el archivo PDF o enlace desde celulares
  const handleSharePdfWhatsApp = async () => {
    if (!data) return;
    try {
      setSharing(true);
      
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const shareTitle = `Estado de Cuenta - ${data.cliente.nombre}`;
      const shareText = `🌸 DISTRIBUIDORA PARAÍSO FLORAL 🌸\nEstado de Cuenta de ${data.cliente.nombre}\nSaldo Pendiente: L. ${data.resumen.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl
        });
      } else {
        const waUrl = generarWhatsAppLink();
        if (waUrl) window.open(waUrl, '_blank');
      }
    } catch (err) {
      console.log('Compartir cancelado:', err);
    } finally {
      setSharing(false);
    }
  };

  const generarWhatsAppLink = () => {
    if (!data?.cliente.telefono) return null;
    const cleanPhone = data.cliente.telefono.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 8 ? `504${cleanPhone}` : cleanPhone;
    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${data.cliente.id}/cxc` : '';

    const texto = `*DISTRIBUIDORA PARAISO FLORAL*
*Estado de Cuenta Oficial*

Cliente: *${data.cliente.nombre}*

• *Saldo Pendiente Total:* L. ${data.resumen.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
• *Total Facturado:* L. ${data.resumen.totalFacturado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
• *Total Abonado:* L. ${data.resumen.totalAbonado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
• *Notas de Crédito / Mermas:* L. ${data.resumen.totalNotasCredito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}

• *Ver o Descargar Estado de Cuenta en PDF:*
${publicUrl}

¡Agradecemos su preferencia y puntualidad!`;

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
        {/* Encabezado Membretado Oficial con Logo */}
        <div className="print-header flex justify-between items-start border-b-2 border-emerald-600 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Paraíso Floral" className="w-14 h-14 object-contain rounded-full border border-slate-200 shrink-0" />
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black text-emerald-800 tracking-tight">DISTRIBUIDORA PARAÍSO FLORAL</h1>
              <p className="text-xs font-bold text-slate-700">Mayorista y Distribuidora de Flores y Follajes Fresh 🌹</p>
              <p className="text-[11px] text-slate-600">8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula, Cortés</p>
              <p className="text-[11px] text-slate-600">Teléfono / WhatsApp: +(504) 8854-2199 | +(504) 9645-3095</p>
            </div>
          </div>
          <div className="text-right space-y-1 shrink-0">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-lg border border-emerald-300">
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
            <p className="text-xs text-slate-700"><strong>Dirección:</strong> {cliente.direccion || 'San Pedro Sula, Cortés'}</p>
          </div>

          <div className="p-3 border border-emerald-300 rounded-lg bg-emerald-50/30 space-y-1 text-right">
            {cliente.saldoInicial !== undefined && cliente.saldoInicial > 0 && (
              <div className="flex justify-between text-xs py-0.5 text-amber-900 font-bold">
                <span>Saldo Inicial Deuda:</span>
                <span>L. {cliente.saldoInicial.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
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
            <div className="flex justify-between text-sm pt-2 border-t border-emerald-300 font-black text-emerald-900 font-mono">
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
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap flex-1">
            <Link
              href="/cxc"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </Link>

            {/* Campo Inteligente Selector Rápido de Cliente */}
            <div className="w-full sm:w-80">
              <ClienteSearchSwitcher
                currentClienteId={cliente.id}
                currentClienteNombre={cliente.nombre}
                navigateToPage={true}
                placeholder="⚡ Ir a otro cliente inmediatamente..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botón Exportar a Excel */}
            <button
              onClick={handleExportarExcel}
              className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Descargar libro mayor en Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleSharePdfWhatsApp}
              disabled={sharing}
              className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              title="Compartir enlace oficial directo"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </button>

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Tarjeta del Cliente & Resumen */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Estado de Cuenta Oficial
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{cliente.nombre}</h1>
              <p className="text-xs text-slate-500 flex items-center gap-3 pt-1 flex-wrap">
                <span>📱 Tel: {cliente.telefono || 'Sin teléfono'}</span>
                <span>📄 RTN: {cliente.rtn || 'Consumidor Final'}</span>
                <span>📍 {cliente.departamento || cliente.direccion || 'Occidente'}</span>
              </p>
            </div>

            {/* Acciones Rápidas del Cliente */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botón Nueva Factura */}
              <button
                onClick={() => setModalFacturaOpen(true)}
                className="py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>+ Factura</span>
              </button>

              <button
                onClick={() => setModalAbonoOpen(true)}
                className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Abonar</span>
              </button>

              <button
                onClick={() => setModalNCOpen(true)}
                className="py-2.5 px-3.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Flower2 className="w-4 h-4" />
                <span>Ajuste Flor</span>
              </button>

              <button
                onClick={() => setModalSaldoInicialOpen(true)}
                className="py-2.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Saldo Inicial</span>
              </button>
            </div>
          </div>

          {/* 4 KPIs Métricas del Cliente */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${
              resumen.saldoTotal < 0 
                ? 'bg-blue-50/60 border-blue-100' 
                : 'bg-emerald-50/60 border-emerald-100'
            }`}>
              <span className={`text-[11px] font-bold uppercase ${
                resumen.saldoTotal < 0 ? 'text-blue-800' : 'text-emerald-800'
              }`}>
                {resumen.saldoTotal < 0 ? 'Saldo a Favor' : 'Saldo Pendiente'}
              </span>
              <p className={`text-xl sm:text-2xl font-black mt-1 font-mono ${
                resumen.saldoTotal < 0 ? 'text-blue-600' : 'text-emerald-600'
              }`}>
                L. {Math.abs(resumen.saldoTotal).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Facturado</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
                L. {resumen.totalFacturado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100">
              <span className="text-[11px] font-bold text-teal-800 uppercase">Total Abonado</span>
              <p className="text-xl sm:text-2xl font-black text-teal-600 mt-1 font-mono">
                L. {resumen.totalAbonado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
              <span className="text-[11px] font-bold text-amber-800 uppercase">Notas de Crédito / Mermas</span>
              <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1 font-mono">
                L. {resumen.totalNotasCredito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación del Historial */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('MAYOR')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'MAYOR'
                  ? 'bg-slate-900 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Libro Mayor Contable ({movimientosContables.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('FACTURAS')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'FACTURAS'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Facturas ({facturas.length})
            </button>
            <button
              onClick={() => setActiveTab('PAGOS')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'PAGOS'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Historial de Abonos ({pagos.length})
            </button>
            <button
              onClick={() => setActiveTab('NOTAS')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'NOTAS'
                  ? 'bg-amber-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ajustes / Flor Dañada ({notasCredito.length})
            </button>
          </div>

          {/* TAB 0: LIBRO MAYOR CONTABLE */}
          {activeTab === 'MAYOR' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                  <BookOpen className="w-4 h-4 text-indigo-600" /> Libro Mayor Contable (Débitos y Créditos)
                </h3>
                <span className="text-xs font-bold text-slate-500">{movimientosContables.length} Movimientos Registrados</span>
              </div>

              {movimientosContables.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No hay movimientos contables registrados para este cliente.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3">Fecha</th>
                        <th className="py-3 px-3">Comprobante</th>
                        <th className="py-3 px-3">Concepto / Detalles</th>
                        <th className="py-3 px-3 text-right text-slate-900">Débito (+) [Cargo]</th>
                        <th className="py-3 px-3 text-right text-emerald-700">Crédito (-) [Abono]</th>
                        <th className="py-3 px-3 text-right text-indigo-900 bg-indigo-50/50">Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movimientosContables.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                            {m.fecha.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                            {m.documento}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium max-w-xs truncate">
                            {m.detalles}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                            {m.debito > 0 ? `+ L. ${m.debito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 whitespace-nowrap font-mono">
                            {m.credito > 0 ? `- L. ${m.credito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-indigo-950 whitespace-nowrap bg-indigo-50/40 text-sm">
                            L. {m.saldoAcumulado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: FACTURAS */}
          {activeTab === 'FACTURAS' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Facturas emitidas al cliente
                </h3>
                <button
                  onClick={() => setModalFacturaOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> + Registrar Factura
                </button>
              </div>

              {facturas.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No hay facturas registradas para este cliente.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3">Correlativo</th>
                        <th className="py-3 px-3">Fecha</th>
                        <th className="py-3 px-3 text-right">Total Factura</th>
                        <th className="py-3 px-3 text-right">Saldo Pendiente</th>
                        <th className="py-3 px-3 text-center">Estado Pago</th>
                        <th className="py-3 px-3">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {facturas.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">#{f.correlativo}</td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(f.fechaEmision).toLocaleDateString('es-HN')}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-800 font-mono">
                            L. {f.total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-600 font-mono">
                            L. {f.saldoPendiente.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                f.estadoPago === 'PAGADA'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : f.estadoPago === 'PARCIAL'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {f.estadoPago || 'PENDIENTE'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {f.creadoPor ? `${f.creadoPor.nombre || ''} ${f.creadoPor.apellido || ''}`.trim() : 'Sistema'}
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Registros de Abonos y Pagos
                </h3>
                <button
                  onClick={() => setModalAbonoOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> + Registrar Abono
                </button>
              </div>

              {pagos.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No hay abonos registrados aún.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3">Recibo #</th>
                        <th className="py-3 px-3">Fecha</th>
                        <th className="py-3 px-3">Método</th>
                        <th className="py-3 px-3">Banco / Ref</th>
                        <th className="py-3 px-3 text-right">Monto Abonado</th>
                        <th className="py-3 px-3">Usuario</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {pagos.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">{p.correlativo || 'REC-ABONO'}</td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(p.fecha).toLocaleDateString('es-HN')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md font-bold text-[10px] border border-teal-200">
                              {p.metodoPago}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {p.banco ? `${p.banco} - ` : ''}{p.referencia || 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-teal-700 font-mono">
                            L. {p.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {p.creadoPor ? `${p.creadoPor.nombre || ''} ${p.creadoPor.apellido || ''}`.trim() : 'Sistema'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleAnularAbono(p.id, p.correlativo)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Anular Abono"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTAS DE CRÉDITO / MERMAS */}
          {activeTab === 'NOTAS' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Flower2 className="w-4 h-4 text-amber-600" /> Ajustes por Flor Dañada y Devoluciones
                </h3>
                <button
                  onClick={() => setModalNCOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> + Registrar Ajuste
                </button>
              </div>

              {notasCredito.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No hay notas de crédito registradas.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3">Nota #</th>
                        <th className="py-3 px-3">Fecha</th>
                        <th className="py-3 px-3">Motivo</th>
                        <th className="py-3 px-3">Descripción / Detalle</th>
                        <th className="py-3 px-3 text-right">Monto</th>
                        <th className="py-3 px-3">Usuario</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {notasCredito.map(nc => (
                        <tr key={nc.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">{nc.correlativo || 'NC-001'}</td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(nc.fecha).toLocaleDateString('es-HN')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-bold text-[10px] border border-amber-200">
                              {nc.motivo.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {nc.descripcion}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-700 font-mono">
                            L. {nc.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {nc.creadoPor ? `${nc.creadoPor.nombre || ''} ${nc.creadoPor.apellido || ''}`.trim() : 'Sistema'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleAnularNotaCredito(nc.id, nc.correlativo)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Anular Nota de Crédito"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <ModalRegistrarFactura
        isOpen={modalFacturaOpen}
        onClose={() => setModalFacturaOpen(false)}
        onSuccess={cargarEstadoCuenta}
        clientePreseleccionado={data?.cliente}
      />

      <ModalAbono
        isOpen={modalAbonoOpen}
        onClose={() => setModalAbonoOpen(false)}
        onSuccess={cargarEstadoCuenta}
        cliente={
          data?.cliente
            ? {
                ...data.cliente,
                saldoTotal: data.resumen.saldoTotal,
              }
            : null
        }
      />

      <ModalNotaCredito
        isOpen={modalNCOpen}
        onClose={() => setModalNCOpen(false)}
        onSuccess={cargarEstadoCuenta}
        cliente={data?.cliente as any}
      />

      <ModalSaldoInicial
        isOpen={modalSaldoInicialOpen}
        onClose={() => setModalSaldoInicialOpen(false)}
        onSuccess={cargarEstadoCuenta}
        cliente={data?.cliente as any}
      />

      {pagoAEditar && (
        <ModalEditarAbono
          isOpen={modalEditarAbonoOpen}
          onClose={() => {
            setModalEditarAbonoOpen(false);
            setPagoAEditar(null);
          }}
          onSuccess={cargarEstadoCuenta}
          pago={pagoAEditar}
          clienteNombre={cliente.nombre}
        />
      )}
    </>
  );
}
