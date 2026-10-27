'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Download,
  Image as ImageIcon,
  BookOpen,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { captureInvoiceImageBlob, copyInvoiceImageToClipboard } from '@/utils/invoiceImageUtils';

interface ClienteDetalleData {
  cliente: {
    id: string;
    nombre: string;
    telefono: string | null;
    email?: string | null;
    direccion?: string | null;
    departamento?: string | null;
    rtn?: string | null;
    limiteCredito?: number;
    saldoInicial?: number;
    saldoFavor?: number;
    fechaSaldoInicial?: string | Date | null;
    diasCredito?: number;
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
    metodoPago?: string | null;
    terminosPago?: string | null;
    pagadoEnFacturacion?: number;
    detalles?: Array<{
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
  }>;
  notasCredito: Array<{
    id: string;
    correlativo: string | null;
    monto: number;
    motivo: string;
    descripcion: string;
    fecha: string;
  }>;
}

interface ModalEstadoCuentaImagenProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId?: string | null;
  initialData?: ClienteDetalleData | null;
}

export default function ModalEstadoCuentaImagen({
  isOpen,
  onClose,
  clienteId,
  initialData
}: ModalEstadoCuentaImagenProps) {
  const [data, setData] = useState<ClienteDetalleData | null>(initialData || null);
  const [loadingData, setLoadingData] = useState(false);
  const [vistaModo, setVistaModo] = useState<'MAYOR' | 'RESUMEN_FACTURAS'>('MAYOR');
  const [phone, setPhone] = useState('88542199');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCopiedSuccess(false);

    if (initialData) {
      setData(initialData);
      const rawPhone = initialData.cliente.telefono ? initialData.cliente.telefono.replace(/[^0-9]/g, '') : '';
      const clean = rawPhone.startsWith('504') ? rawPhone.slice(3) : rawPhone;
      setPhone(clean || '88542199');
      return;
    }

    if (clienteId) {
      setLoadingData(true);
      fetch(`/api/cxc/clientes/${clienteId}`)
        .then(res => (res.ok ? res.json() : Promise.reject(new Error('Error al cargar estado de cuenta'))))
        .then((json: ClienteDetalleData) => {
          setData(json);
          const rawPhone = json.cliente?.telefono ? json.cliente.telefono.replace(/[^0-9]/g, '') : '';
          const clean = rawPhone.startsWith('504') ? rawPhone.slice(3) : rawPhone;
          setPhone(clean || '88542199');
        })
        .catch(err => {
          console.error('Error cargando estado de cuenta para imagen:', err);
          toast.error('No se pudo cargar el estado de cuenta del cliente.');
        })
        .finally(() => setLoadingData(false));
    }
  }, [isOpen, clienteId, initialData]);

  const movimientosContables = useMemo(() => {
    if (!data) return [];

    const list: Array<{
      id: string;
      fecha: Date;
      tipo: 'SALDO_INICIAL' | 'FACTURA' | 'PAGO_FACTURACION' | 'ABONO' | 'NOTA_CREDITO';
      documento: string;
      detalles: string;
      debito: number;
      credito: number;
    }> = [];

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

    (data.facturas || []).forEach(f => {
      if (f.correlativo !== 'SALDO INICIAL EXCEL') {
        const desc =
          f.detalles && f.detalles.length > 0
            ? f.detalles
                .map(
                  d =>
                    `${d.cantidad > 1 ? `${d.cantidad}x ` : ''}${(d.descripcion || '')
                      .replace(/__METADATA__[\s\S]*$/, '')
                      .split('\n')[0]
                      .trim()}`
                )
                .join(', ')
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

        const pagadoEnFac = Number(f.pagadoEnFacturacion || 0);
        if (pagadoEnFac > 0) {
          list.push({
            id: `pago-fac-${f.id}`,
            fecha: new Date(f.fechaEmision),
            tipo: 'PAGO_FACTURACION',
            documento: `#${f.correlativo}`,
            detalles: `Pago en Facturación (${f.metodoPago || 'Contado'}) — Factura #${f.correlativo}`,
            debito: 0,
            credito: pagadoEnFac
          });
        }
      }
    });

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

    (data.notasCredito || []).forEach(n => {
      const motivoLegible =
        n.motivo === 'FLOR_DANADA'
          ? 'Flor Dañada'
          : n.motivo === 'ERROR_FACTURACION'
          ? 'Error de Cobro'
          : n.motivo === 'DESCUENTO_ESPECIAL'
          ? 'Descuento / Rebaja'
          : n.motivo || 'Ajuste Flor';
      const desc = `Ajuste (${motivoLegible})${n.descripcion ? ` — ${n.descripcion}` : ''}`;

      let fechaNC = new Date(n.fecha);
      const rawFecha = String(n.fecha || '');
      if (rawFecha.endsWith('T00:00:00.000Z')) {
        const soloDia = rawFecha.slice(0, 10);
        const createdRaw = String((n as any).createdAt || '');
        if (createdRaw && createdRaw.slice(0, 10) === soloDia) {
          fechaNC = new Date(createdRaw);
        } else {
          fechaNC = new Date(`${soloDia}T23:59:00-06:00`);
        }
      }

      list.push({
        id: n.id,
        fecha: fechaNC,
        tipo: 'NOTA_CREDITO',
        documento: n.correlativo || 'NOTA CREDITO',
        detalles: desc,
        debito: 0,
        credito: n.monto
      });
    });

    const tipoOrden: Record<string, number> = {
      SALDO_INICIAL: 0,
      FACTURA: 1,
      PAGO_FACTURACION: 2,
      ABONO: 3,
      NOTA_CREDITO: 4
    };

    list.sort((a, b) => {
      const diff = a.fecha.getTime() - b.fecha.getTime();
      if (diff !== 0) return diff;
      return (tipoOrden[a.tipo] ?? 9) - (tipoOrden[b.tipo] ?? 9);
    });

    let saldoAcumulado = 0;
    return list.map(item => {
      saldoAcumulado = saldoAcumulado + item.debito - item.credito;
      return {
        ...item,
        saldoAcumulado
      };
    });
  }, [data]);

  if (!isOpen) return null;

  const handleCopyOnly = async () => {
    if (!captureRef.current) {
      toast.error('No se encontró el documento de estado de cuenta.');
      return;
    }

    setIsProcessing(true);
    setCopiedSuccess(false);
    try {
      await copyInvoiceImageToClipboard(captureRef.current);
      setCopiedSuccess(true);
      toast.success('¡Estado de cuenta copiado como imagen! Presiona Ctrl + V en WhatsApp.', {
        duration: 5000,
        icon: '📸'
      });
    } catch (err: any) {
      console.error('Error copiando imagen de estado de cuenta:', err);
      toast.error(err.message || 'Error al copiar la imagen al portapapeles.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAndOpenWhatsApp = async () => {
    if (!captureRef.current) {
      toast.error('No se encontró el documento de estado de cuenta.');
      return;
    }

    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 8) {
      clean = '504' + clean;
    }

    if (!clean || clean.length < 8) {
      toast.error('Por favor ingresa un número de teléfono válido.');
      return;
    }

    setIsProcessing(true);
    setCopiedSuccess(false);
    try {
      await copyInvoiceImageToClipboard(captureRef.current);
      setCopiedSuccess(true);
      toast.success('¡Imagen copiada! Abriendo WhatsApp Web para que presiones Ctrl + V...', {
        duration: 5000,
        icon: '💬'
      });
      const waUrl = `https://web.whatsapp.com/send?phone=${clean}`;
      window.open(waUrl, '_blank');
    } catch (err: any) {
      console.error('Error copiando imagen de estado de cuenta:', err);
      toast.error(err.message || 'Error al copiar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!captureRef.current || !data) return;
    setIsProcessing(true);
    try {
      const blob = await captureInvoiceImageBlob(captureRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = data.cliente.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.href = url;
      link.download = `Estado_Cuenta_${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Imagen PNG descargada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const facturasPendientes = (data?.facturas || []).filter(f => Number(f.saldoPendiente) > 0.009);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[3100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[94vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header del Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-emerald-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <ImageIcon size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Estado de Cuenta en Imagen (WhatsApp)
              </h3>
              <p className="text-xs font-semibold text-emerald-800">
                {data?.cliente?.nombre || 'Cargando cliente...'} • Listo para copiar y pegar con Ctrl + V
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de Formato Visual */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setVistaModo('MAYOR')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  vistaModo === 'MAYOR'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen size={13} />
                <span>Libro Mayor</span>
              </button>
              <button
                type="button"
                onClick={() => setVistaModo('RESUMEN_FACTURAS')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  vistaModo === 'RESUMEN_FACTURAS'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={13} />
                <span>Facturas y Abonos</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Acciones de Copiado / WhatsApp */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyOnly}
              disabled={isProcessing || loadingData || !data}
              className="py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generando imagen HD...</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copiar Imagen al Portapapeles</span>
                  <span className="bg-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Ctrl + V
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isProcessing || loadingData || !data}
              className="py-2.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={15} className="text-emerald-600" />
              <span>Descargar PNG</span>
            </button>
          </div>

          {/* Abrir chat directo con número */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-xs font-bold text-slate-500">+504</span>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="8854-2199"
                className="w-28 text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyAndOpenWhatsApp}
              disabled={isProcessing || loadingData || !data}
              className="py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <MessageCircle size={15} className="text-emerald-600" />
              <span>Copiar y Abrir WhatsApp Web</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>

        {copiedSuccess && (
          <div className="mx-5 mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-emerald-900 shrink-0">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold">
              <strong>¡Imagen copiada al portapapeles!</strong> Ve a la conversación de WhatsApp y presiona{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-800">
                Ctrl
              </kbd>{' '}
              +{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-800">
                V
              </kbd>{' '}
              para enviarla.
            </p>
          </div>
        )}

        {/* Área de Vista Previa del Documento Capturable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex justify-center">
          {loadingData || !data ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-9 h-9 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Generando vista de Estado de Cuenta...</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              {/* CONTENEDOR CAPTURABLE EN ALTA RESOLUCIÓN */}
              <div
                ref={captureRef}
                className="w-[860px] bg-white p-7 text-slate-900 space-y-5 shadow-lg rounded-none border border-slate-200"
              >
                {/* Encabezado Membretado */}
                <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src="/icon.png"
                      alt="Paraíso Floral"
                      className="w-14 h-14 object-contain rounded-full border border-slate-200 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <h1 className="text-xl font-black text-emerald-800 tracking-tight">
                        DISTRIBUIDORA PARAÍSO FLORAL, S. DE R.L.
                      </h1>
                      <p className="text-xs font-bold text-slate-700">
                        Mayorista y Distribuidora de Flores y Follajes Fresh
                      </p>
                      <p className="text-[11px] text-slate-500">
                        8 Calle, 9 Avenida NO, Bo. Guamilito, San Pedro Sula, Cortés • Tel: +(504) 8854-2199 | +(504) 9645-3095
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded-lg border border-emerald-300 uppercase tracking-wider">
                      Estado de Cuenta Oficial
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">Fecha: {fechaHoy}</p>
                  </div>
                </div>

                {/* Bloque de Cliente */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5">
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">
                      Cliente
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{data.cliente.nombre}</h2>
                    <div className="flex items-center gap-4 text-xs text-slate-600 font-medium mt-0.5">
                      <span>Tel: {data.cliente.telefono || 'Sin teléfono'}</span>
                      <span>•</span>
                      <span>RTN: {data.cliente.rtn || 'Consumidor Final'}</span>
                      <span>•</span>
                      <span>Ubicación: {data.cliente.departamento || data.cliente.direccion || 'General'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      {data.resumen.saldoTotal < 0 ? 'Saldo a Favor' : 'Saldo Pendiente Actual'}
                    </span>
                    <span
                      className={`text-2xl font-black font-mono ${
                        data.resumen.saldoTotal < 0 ? 'text-blue-600' : 'text-emerald-700'
                      }`}
                    >
                      L. {Math.abs(data.resumen.saldoTotal).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 4 KPIs Financieros (idénticos al perfil) */}
                <div className="grid grid-cols-4 gap-3">
                  <div
                    className={`p-3.5 rounded-2xl border ${
                      data.resumen.saldoTotal < 0
                        ? 'bg-blue-50/70 border-blue-200'
                        : 'bg-emerald-50/70 border-emerald-200'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-extrabold uppercase ${
                        data.resumen.saldoTotal < 0 ? 'text-blue-800' : 'text-emerald-800'
                      }`}
                    >
                      {data.resumen.saldoTotal < 0 ? 'Saldo a Favor' : 'Saldo Pendiente'}
                    </span>
                    <p
                      className={`text-xl font-black mt-1 font-mono ${
                        data.resumen.saldoTotal < 0 ? 'text-blue-600' : 'text-emerald-600'
                      }`}
                    >
                      L. {Math.abs(data.resumen.saldoTotal).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Total Facturado</span>
                    <p className="text-xl font-black text-slate-900 mt-1 font-mono">
                      L. {data.resumen.totalFacturado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200">
                    <span className="text-[10px] font-extrabold text-teal-800 uppercase">Total Abonado</span>
                    <p className="text-xl font-black text-teal-600 mt-1 font-mono">
                      L. {data.resumen.totalAbonado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                    <span className="text-[10px] font-extrabold text-amber-800 uppercase">
                      Notas de Crédito / Mermas
                    </span>
                    <p className="text-xl font-black text-amber-600 mt-1 font-mono">
                      L. {data.resumen.totalNotasCredito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Contenido Principal Según Modo Seleccionado */}
                {vistaModo === 'MAYOR' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Libro Mayor Contable (Débitos y Créditos)
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500">
                        {movimientosContables.length} Movimientos Registrados
                      </span>
                    </div>

                    {movimientosContables.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center italic">
                        No hay movimientos registrados para este cliente.
                      </p>
                    ) : (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                              <th className="py-2.5 px-3">Fecha</th>
                              <th className="py-2.5 px-3">Comprobante</th>
                              <th className="py-2.5 px-3">Concepto / Detalles</th>
                              <th className="py-2.5 px-3 text-right text-slate-900">Débito (+) [Cargo]</th>
                              <th className="py-2.5 px-3 text-right text-emerald-700">Crédito (-) [Abono]</th>
                              <th className="py-2.5 px-3 text-right text-indigo-900 bg-indigo-50/60">
                                Saldo Acumulado
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {movimientosContables.map(m => (
                              <tr
                                key={m.id}
                                className={m.tipo === 'NOTA_CREDITO' ? 'bg-amber-50/30' : 'bg-white'}
                              >
                                <td className="py-2 px-3 font-medium text-slate-600 whitespace-nowrap">
                                  {m.fecha.toLocaleDateString('es-HN', {
                                    timeZone: 'America/Tegucigalpa',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="py-2 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                                  {m.documento}
                                </td>
                                <td className="py-2 px-3 text-slate-700 font-medium max-w-[280px] break-words">
                                  {m.detalles}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                                  {m.debito > 0
                                    ? `+ L. ${m.debito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
                                    : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-600 whitespace-nowrap font-mono">
                                  {m.credito > 0
                                    ? `- L. ${m.credito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
                                    : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-black text-indigo-950 whitespace-nowrap bg-indigo-50/40">
                                  L. {m.saldoAcumulado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Tabla 1: Facturas con Saldo Pendiente */}
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                        1. Facturas Pendientes de Pago ({facturasPendientes.length})
                      </h3>
                      {facturasPendientes.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          El cliente no tiene facturas pendientes de pago.
                        </p>
                      ) : (
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase">
                                <th className="py-2 px-3"># Factura</th>
                                <th className="py-2 px-3">Fecha Emisión</th>
                                <th className="py-2 px-3 text-right">Total Factura</th>
                                <th className="py-2 px-3 text-right">Saldo Pendiente</th>
                                <th className="py-2 px-3 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {facturasPendientes.map(f => (
                                <tr key={f.id}>
                                  <td className="py-2 px-3 font-extrabold text-slate-900">#{f.correlativo}</td>
                                  <td className="py-2 px-3 text-slate-600">
                                    {new Date(f.fechaEmision).toLocaleDateString('es-HN')}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-800">
                                    L. {f.total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                    L. {f.saldoPendiente.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-amber-800">
                                    {f.estadoPago || 'PENDIENTE'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Tabla 2: Historial de Abonos Recientes */}
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                        2. Abonos y Pagos Recibidos ({data.pagos.length})
                      </h3>
                      {data.pagos.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No hay abonos registrados.</p>
                      ) : (
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase">
                                <th className="py-2 px-3">Recibo #</th>
                                <th className="py-2 px-3">Fecha Pago</th>
                                <th className="py-2 px-3">Método</th>
                                <th className="py-2 px-3">Banco / Referencia</th>
                                <th className="py-2 px-3 text-right">Monto Abonado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.pagos.slice(0, 15).map(p => (
                                <tr key={p.id}>
                                  <td className="py-2 px-3 font-bold text-slate-900">
                                    {p.correlativo || 'REC-ABONO'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">
                                    {new Date(p.fecha).toLocaleDateString('es-HN')}
                                  </td>
                                  <td className="py-2 px-3 font-semibold text-slate-700">{p.metodoPago}</td>
                                  <td className="py-2 px-3 text-slate-600">
                                    {p.banco ? `${p.banco} - ` : ''}
                                    {p.referencia || p.notas || 'N/A'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-black text-teal-700">
                                    L. {p.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pie del Estado de Cuenta */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Distribuidora Paraíso Floral • Departamento de Crédito y Cobros</span>
                  <span className="font-bold text-emerald-800">
                    ¡Gracias por su preferencia y puntualidad!
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
