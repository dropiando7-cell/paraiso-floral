'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Download,
  MessageCircle,
  Check,
  Loader2,
  FileText,
  ExternalLink,
  Pencil,
  Eye,
  FileDown,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { copyInvoiceImageToClipboard, captureInvoiceImageBlob } from '@/utils/invoiceImageUtils';
import { resolveFacturaSarMetadata } from '@/lib/sar-utils';
import { isCredito, isEnvioItem, extractSaldoFavorAplicado } from '@/utils/facturaUtils';
import SarFiscalBanner, { SarLeyendasFooter } from '@/components/facturas/templates/SarFiscalBanner';
import { getDocumentoById } from '@/app/(dashboard)/facturas/actions';

interface ModalVistaPreviaFacturaCxCProps {
  isOpen: boolean;
  onClose: () => void;
  factura: any | null;
  cliente?: {
    id?: string;
    nombre: string;
    rtn?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    email?: string | null;
    nombreContacto?: string | null;
    telefonoContacto?: string | null;
  } | null;
  organization?: any | null;
}

function cleanPhoneForWhatsApp(rawPhone?: string | null): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('504') && digits.length > 8) {
    return digits.slice(3);
  }
  return digits;
}

function sortDetalles(detalles: any[]): any[] {
  if (!Array.isArray(detalles) || detalles.length <= 1) return detalles || [];
  const withIndex = detalles.map((d, i) => {
    const raw = d.descripcion || '';
    const metaIdx = raw.indexOf('__METADATA__');
    let orden = Number.MAX_SAFE_INTEGER;
    if (metaIdx !== -1) {
      try {
        const parsed = JSON.parse(raw.substring(metaIdx + 12));
        if (typeof parsed.orden === 'number') {
          orden = parsed.orden;
        }
      } catch {}
    }
    return { d, orden, i };
  });
  withIndex.sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : a.i - b.i));
  return withIndex.map(x => x.d);
}

function parseDetalleDescripcion(rawDesc: string) {
  let desc = rawDesc || '';
  let isSection = false;
  let sectionStyle: any = null;

  const metaIdx = desc.indexOf('__METADATA__');
  if (metaIdx !== -1) {
    desc = desc.substring(0, metaIdx);
  }

  if (desc.startsWith('__SECTION__')) {
    isSection = true;
    desc = desc.substring(11);
    const styleIdx = desc.indexOf('__STYLE__');
    if (styleIdx !== -1) {
      try {
        sectionStyle = JSON.parse(desc.substring(styleIdx + 9));
      } catch {}
      desc = desc.substring(0, styleIdx);
    }
  }

  const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
  const shortDesc = lines[0] || 'Producto / Servicio';
  const extraLines = lines.slice(1);

  return {
    isSection,
    sectionStyle,
    shortDesc,
    extraLines
  };
}

export default function ModalVistaPreviaFacturaCxC({
  isOpen,
  onClose,
  factura: initialFactura,
  cliente: initialCliente,
  organization
}: ModalVistaPreviaFacturaCxCProps) {
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [fullFactura, setFullFactura] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const activeFactura = fullFactura || initialFactura;
  const activeCliente = initialCliente || activeFactura?.cliente || null;

  const [whatsappPhone, setWhatsappPhone] = useState(() =>
    cleanPhoneForWhatsApp(activeCliente?.telefono || activeCliente?.telefonoContacto)
  );

  useEffect(() => {
    setWhatsappPhone(cleanPhoneForWhatsApp(activeCliente?.telefono || activeCliente?.telefonoContacto));
  }, [activeCliente?.telefono, activeCliente?.telefonoContacto]);

  // Si la factura viene sin detalles (ej. desde ExcelLiveGrid), cargar el documento completo en segundo plano
  useEffect(() => {
    if (!isOpen || !initialFactura?.id || initialFactura.id === 'saldo-inicial-excel') {
      setFullFactura(null);
      return;
    }

    if (Array.isArray(initialFactura.detalles) && initialFactura.detalles.length > 0) {
      setFullFactura(initialFactura);
      return;
    }

    let cancelled = false;
    setLoadingDetails(true);
    getDocumentoById(initialFactura.id)
      .then((doc) => {
        if (!cancelled && doc) {
          setFullFactura({
            ...initialFactura,
            ...doc,
            saldoPendiente: initialFactura.saldoPendiente ?? doc.saldoPendiente,
            estadoPago: initialFactura.estadoPago ?? doc.estadoPago
          });
        }
      })
      .catch((err) => {
        console.error('Error cargando detalles de factura para vista previa:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialFactura]);

  const fmt = (val: number) =>
    `L. ${Number(val || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const parsedLines = useMemo(() => {
    const rawDetalles = sortDetalles(activeFactura?.detalles || []);
    return rawDetalles.map((d: any, idx: number) => {
      const parsed = parseDetalleDescripcion(d.descripcion || '');
      const qty = Number(d.cantidad || 0);
      const unitPrice = Number(d.precioUnitario || 0);
      const discount = Number(d.totalDescuento || 0);
      const pctIsv = Number(d.porcentajeIsv || 0);
      const lineTotal = d.totalLinea !== undefined && d.totalLinea !== null
        ? Number(d.totalLinea)
        : (qty * unitPrice - discount);

      return {
        id: d.id || `line-${idx}`,
        qty,
        unitPrice,
        discount,
        pctIsv,
        lineTotal,
        ...parsed
      };
    });
  }, [activeFactura?.detalles]);

  const computedTotals = useMemo(() => {
    const totalDoc = Number(activeFactura?.total || 0);
    const subTotalDoc = activeFactura?.subTotal !== undefined && activeFactura?.subTotal !== null
      ? Number(activeFactura.subTotal)
      : parsedLines.reduce((acc, l) => acc + (l.isSection ? 0 : l.qty * l.unitPrice), 0) || totalDoc;
    const descuentosDoc = Number(activeFactura?.descuentos || 0);
    const exentoDoc = activeFactura?.totalExento !== undefined && activeFactura?.totalExento !== null
      ? Number(activeFactura.totalExento)
      : parsedLines.reduce((acc, l) => (!l.isSection && l.pctIsv === 0 ? acc + l.lineTotal : acc), 0);
    const exoneradoDoc = Number(activeFactura?.totalExonerado || 0);
    const gravado15Doc = activeFactura?.totalGravado15 !== undefined && activeFactura?.totalGravado15 !== null
      ? Number(activeFactura.totalGravado15)
      : parsedLines.reduce((acc, l) => (!l.isSection && l.pctIsv === 15 ? acc + (l.qty * l.unitPrice - l.discount) : acc), 0);
    const isv15Doc = activeFactura?.isv15 !== undefined && activeFactura?.isv15 !== null
      ? Number(activeFactura.isv15)
      : parsedLines.reduce((acc, l) => (!l.isSection && l.pctIsv === 15 ? acc + (l.qty * l.unitPrice - l.discount) * 0.15 : acc), 0);

    const totalItemsQty = parsedLines
      .filter((l: any) => !l.isSection && !isEnvioItem({ shortDesc: l.shortDesc }))
      .reduce((sum: number, l: any) => sum + (Number(l.qty) || 0), 0);
    const formattedTotalQty = Number.isInteger(totalItemsQty) ? totalItemsQty : Number(totalItemsQty.toFixed(2));

    return {
      total: totalDoc,
      subtotal: subTotalDoc,
      descuentos: descuentosDoc,
      exento: exentoDoc,
      exonerado: exoneradoDoc,
      gravado15: gravado15Doc,
      isv15: isv15Doc,
      formattedTotalQty
    };
  }, [activeFactura, parsedLines]);

  if (!isOpen || !activeFactura) return null;

  const orgSettings = (organization?.invoiceSettings as any) || (activeFactura?.templateSettings as any) || {};
  const showPaymentTerms = Boolean(orgSettings?.showPaymentTerms);
  const sarMeta = resolveFacturaSarMetadata(
    {
      correlativo: activeFactura.correlativo,
      numeroCAI: activeFactura.numeroCAI,
      cai: activeFactura.cai,
      rangoAutorizado: activeFactura.rangoAutorizado,
      fechaLimiteEmision: activeFactura.fechaLimiteEmision
    },
    orgSettings?.sarConfig
  );

  const fechaObj = activeFactura.fechaEmision ? new Date(activeFactura.fechaEmision) : new Date();
  const datePart = !isNaN(fechaObj.getTime())
    ? fechaObj.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const timePart = !isNaN(fechaObj.getTime())
    ? fechaObj.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  const elaboradoPor =
    (activeFactura.creadoPor
      ? [activeFactura.creadoPor.nombre, activeFactura.creadoPor.apellido].filter(Boolean).join(' ')
      : null) ||
    activeFactura.vendedorNombre ||
    activeFactura.nombreUsuario ||
    'Administrador (BEA)';

  const terminosPago = activeFactura.terminosPago || 'Pago inmediato';
  const metodoPagoRaw = activeFactura.metodoPago || 'Efectivo';
  const esAlCredito = isCredito(terminosPago) || metodoPagoRaw === 'Crédito';
  const metodoPagoLabel = esAlCredito ? 'Al Crédito' : metodoPagoRaw;

  const cleanNotes = (activeFactura.notas || '').replace(/\s*\[SALDO_FAVOR_APLICADO:[\d.]+\]/g, '').trim();
  const montoSaldoFavor = Number(activeFactura.montoSaldoFavorAplicado || extractSaldoFavorAplicado(activeFactura) || 0);

  const saldoPendiente = Number(activeFactura.saldoPendiente ?? 0);
  const totalFactura = Number(activeFactura.total ?? 0);
  const esPagada = activeFactura.estadoPago === 'PAGADA' || saldoPendiente <= 0.01;
  const esParcial = !esPagada && saldoPendiente < totalFactura - 0.01;

  const handleCopyImage = async (): Promise<boolean> => {
    if (!sheetRef.current) return false;
    setIsCopying(true);
    try {
      const ok = await copyInvoiceImageToClipboard(sheetRef.current);
      if (ok) {
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
        toast.success('¡Imagen de la factura copiada! Presiona Ctrl+V en WhatsApp.');
        return true;
      } else {
        toast.error('Tu navegador bloqueó el portapapeles. Usa "Descargar PNG".');
        return false;
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al capturar la imagen de la factura.');
      return false;
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!sheetRef.current) return;
    setIsDownloadingPng(true);
    try {
      const blob = await captureInvoiceImageBlob(sheetRef.current);
      if (!blob) {
        toast.error('No se pudo generar la imagen PNG.');
        return;
      }
      const safeCorrelativo = (activeFactura.correlativo || 'Factura').replace(/[^a-zA-Z0-9_-]/g, '_');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura_${safeCorrelativo}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Imagen PNG descargada correctamente.');
    } catch (e) {
      console.error(e);
      toast.error('Error al descargar la imagen.');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Generando PDF de la factura...');
    try {
      const html2canvasModule = await import('html2canvas-pro');
      const jsPDFModule = await import('jspdf');
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      const container = sheetRef.current;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = 215.9;
      const pageHeight = 279.4;

      let imgWidth = pageWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight && imgHeight <= pageHeight * 1.15) {
        const scale = pageHeight / imgHeight;
        imgWidth = imgWidth * scale;
        imgHeight = pageHeight;
      }

      const pdf = new jsPDF('p', 'mm', 'letter');
      let heightLeft = imgHeight;
      let position = 0;
      const xOffset = (pageWidth - imgWidth) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 2) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeCorrelativo = (activeFactura.correlativo || 'Factura').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCliente = (activeCliente?.nombre || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Factura_${safeCorrelativo}_${safeCliente}.pdf`);
      toast.success('PDF descargado exitosamente.', { id: toastId });
    } catch (err) {
      console.error('Error generando PDF desde vista previa:', err);
      toast.error('Error al generar el PDF.', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    const cleanDigits = whatsappPhone.replace(/\D/g, '');
    if (!cleanDigits) {
      toast.error('Ingresa un número de WhatsApp válido');
      return;
    }
    await handleCopyImage();
    const fullPhone = cleanDigits.length === 8 ? `504${cleanDigits}` : cleanDigits;
    const msg = encodeURIComponent(
      `Hola *${activeCliente?.nombre || 'Estimado Cliente'}*, le compartimos su Factura Oficial *#${activeFactura.correlativo}* de *Paraíso Floral* por un total de *${fmt(computedTotals.total)}*.`
    );
    window.open(`https://web.whatsapp.com/send?phone=${fullPhone}&text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const footerTel = orgSettings?.footerTelefono || organization?.telefono || '+(504) 8854-2199 / +(504) 9645-3095';
  const footerCorreo = orgSettings?.footerCorreo || organization?.correoContacto || 'paraisofloralhn@gmail.com';
  const footerNota =
    orgSettings?.footerNota ||
    'Paraíso Floral - Flores y Follajes frescos para toda ocasión. Reclamos válidos únicamente el mismo día de entrega.';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-[920px] max-h-[95vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  Factura #{activeFactura.correlativo}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    esPagada
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : esParcial
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {esPagada ? '✓ Pagada' : esParcial ? `🟠 Pago Parcial (Resta: ${fmt(saldoPendiente)})` : `⏳ Pendiente (${fmt(saldoPendiente)})`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Vista previa en formato imagen oficial • Sin salir de Cuentas por Cobrar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Copiar Imagen al Portapapeles */}
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isCopying || loadingDetails}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Copiar factura como imagen al portapapeles (Ctrl+V para WhatsApp)"
            >
              {isCopying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : copiedSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedSuccess ? '¡Imagen Copiada!' : 'Copiar Imagen (Ctrl+V)'}
            </button>

            {/* Descargar PNG */}
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isDownloadingPng || loadingDetails}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 border border-slate-700 disabled:opacity-50 cursor-pointer"
              title="Descargar captura en formato imagen PNG"
            >
              {isDownloadingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
              PNG
            </button>

            {/* Descargar PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || loadingDetails}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 border border-slate-700 disabled:opacity-50 cursor-pointer"
              title="Descargar documento en formato PDF"
            >
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 text-rose-400" />}
              PDF
            </button>

            {/* Ir a Ver en Módulo de Facturación */}
            {activeFactura.id && activeFactura.id !== 'saldo-inicial-excel' && (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/facturas/ver/${activeFactura.id}`)}
                  className="px-3 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Abrir vista completa en el módulo de Facturación"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver en Facturación
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/facturas/${activeFactura.id}`)}
                  className="px-3 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Ir a editar esta factura en el módulo de Facturación"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Factura
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Cerrar vista previa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Quick Share Bar */}
        <div className="bg-emerald-50/90 border-b border-emerald-200/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Haz clic en <strong>Copiar Imagen (Ctrl+V)</strong> y pégala directamente en el chat de WhatsApp del cliente.
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-emerald-300 rounded-xl overflow-hidden text-xs shadow-2xs flex-1 sm:flex-initial">
              <span className="px-2.5 py-1.5 bg-emerald-100/70 text-emerald-800 font-bold border-r border-emerald-200">
                +504
              </span>
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="9999-9999"
                className="px-2.5 py-1.5 w-28 sm:w-32 outline-none font-mono font-bold text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isCopying || loadingDetails}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Copiar y Abrir WhatsApp
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Preview Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center items-start bg-slate-200/70">
          {loadingDetails ? (
            <div className="bg-white w-[816px] min-h-[600px] rounded-xl shadow-md border border-slate-300 flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
              <p className="text-sm font-bold text-slate-700">Cargando documento oficial #{activeFactura.correlativo}...</p>
            </div>
          ) : (
            /* Exact Official Invoice Sheet (816px Letter Width matching LegacyTemplate capture) */
            <div
              ref={sheetRef}
              className="bg-white text-gray-900 w-[816px] min-w-[816px] min-h-[1056px] shadow-xl border border-slate-300 p-10 flex flex-col justify-between font-sans select-text"
            >
              <div>
                {/* Header Block */}
                <div className="flex justify-between items-start mb-8">
                  {/* Logo */}
                  <div className="flex-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={organization?.logoUrl || '/icon.png'}
                      alt="Paraíso Floral"
                      className="h-28 w-auto object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 text-right flex flex-col items-end text-sm">
                    <h1 className="font-bold text-lg text-gray-900">
                      Distribuidora Paraíso Floral, S. de R.L.
                    </h1>
                    <div className="text-gray-700 leading-snug mt-0.5 text-xs">
                      <p className="whitespace-nowrap">
                        8 Calle, 9 Avenida NO, Bo. Guamilito, San Pedro Sula, Cortés
                      </p>
                      <div className="mt-0.5 space-y-0.5">
                        <p className="font-semibold text-slate-800">RTN: 05019023491749</p>
                        <p>Tel: +(504) 8854-2199 | +(504) 9645-3095</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div
                  className={`grid ${
                    showPaymentTerms
                      ? 'grid-cols-[0.8fr_0.6fr_0.6fr_0.6fr_1.8fr]'
                      : 'grid-cols-[0.9fr_0.7fr_0.7fr_1.7fr]'
                  } gap-3 mb-4 text-xs`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-base text-gray-900 leading-tight uppercase">
                      FACTURA OFICIAL
                      <br />
                      <span className="text-slate-800">{activeFactura.correlativo}</span>
                    </span>
                    <span className="text-gray-600 mt-1 whitespace-nowrap">Fecha: {datePart}</span>
                    {timePart && (
                      <span className="text-gray-500 text-[10px] mt-0.5 whitespace-nowrap">
                        {timePart}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col pl-3">
                    <span className="font-bold uppercase text-slate-800 text-[11px]">
                      Elaborado por:
                    </span>
                    <span className="text-gray-600 mt-1">{elaboradoPor}</span>
                  </div>

                  {showPaymentTerms && (
                    <div className="flex flex-col pl-3">
                      <span className="font-bold uppercase text-slate-800 text-[11px]">
                        Términos de pago:
                      </span>
                      <span className="text-gray-700 font-semibold mt-1 text-xs">
                        {terminosPago}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col pl-3">
                    <span className="font-bold uppercase text-slate-800 text-[11px]">
                      Método de pago:
                    </span>
                    <span
                      className={`mt-1 text-xs ${
                        esAlCredito ? 'text-indigo-700 font-bold' : 'text-gray-700 font-semibold'
                      }`}
                    >
                      {metodoPagoLabel}
                    </span>
                  </div>

                  <div className="flex flex-col pl-3">
                    <span className="font-bold uppercase text-slate-800 mb-1 text-[11px]">
                      Cliente:
                    </span>
                    <div className="text-[10px] leading-tight text-slate-700">
                      <span className="font-bold text-xs text-gray-900 block mb-0.5 uppercase">
                        {activeCliente?.nombre || activeFactura?.clienteNombre || 'Consumidor Final'}
                      </span>
                      {activeCliente?.direccion && (
                        <span className="block line-clamp-2">{activeCliente.direccion}</span>
                      )}
                      {activeCliente?.rtn && (
                        <span className="block mt-0.5 font-mono">RTN: {activeCliente.rtn}</span>
                      )}
                      {activeCliente?.nombreContacto && (
                        <span className="block mt-0.5 text-slate-500 font-medium">
                          Contacto: {activeCliente.nombreContacto}
                        </span>
                      )}
                      {activeCliente?.telefonoContacto && (
                        <span className="block mt-0.5 text-slate-700 font-semibold">
                          Tel. Contacto: {activeCliente.telefonoContacto}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SAR Fiscal Details Banner */}
                {(sarMeta.numeroCAI || sarMeta.rangoAutorizado || sarMeta.fechaLimiteEmision) && (
                  <SarFiscalBanner
                    numeroCAI={sarMeta.numeroCAI}
                    rangoAutorizado={sarMeta.rangoAutorizado}
                    fechaLimiteEmision={sarMeta.fechaLimiteEmision}
                    variant="bordered"
                    className="mb-4"
                  />
                )}

                {/* Items Table */}
                <div className="mb-8">
                  <div
                    className="grid grid-cols-[minmax(0,9fr)_minmax(0,45fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)] gap-2 px-4 text-[10px] font-bold uppercase text-gray-800 bg-[#f3f4f6] border border-[#1e293b]"
                  >
                    <div className="flex items-center justify-center text-center py-2 border-r border-[#1e293b]">
                      Cant.
                    </div>
                    <div className="flex items-center justify-center text-center py-2 border-r border-[#1e293b]">
                      Descripción
                    </div>
                    <div className="flex items-center justify-center text-center py-2 border-r border-[#1e293b]">
                      Precio
                    </div>
                    <div className="flex items-center justify-center text-center py-2 border-r border-[#1e293b]">
                      Desc.
                    </div>
                    <div className="flex items-center justify-center text-center py-2 border-r border-[#1e293b]">
                      Imp.
                    </div>
                    <div className="flex items-center justify-end text-right py-2 pr-2">
                      Monto
                    </div>
                  </div>

                  <div className="flex flex-col border-x border-b border-[#1e293b]">
                    {parsedLines.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 italic">
                        Factura #{activeFactura.correlativo} — Total {fmt(computedTotals.total)}
                      </div>
                    ) : (
                      parsedLines.map((line: any, idx: number) => {
                        if (line.isSection) {
                          return (
                            <div
                              key={line.id}
                              className="px-4 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 last:border-b-0"
                              style={{
                                backgroundColor: line.sectionStyle?.bg || '#e2e8f0',
                                color: line.sectionStyle?.color || '#0f172a'
                              }}
                            >
                              {line.shortDesc}
                            </div>
                          );
                        }

                        const impLabel =
                          line.pctIsv === 15
                            ? 'ISV 15%'
                            : line.pctIsv === 18
                            ? 'ISV 18%'
                            : 'Exento';

                        return (
                          <div
                            key={line.id}
                            className={`grid grid-cols-[minmax(0,9fr)_minmax(0,45fr)_minmax(0,18fr)_minmax(0,14fr)_minmax(0,15fr)_minmax(0,19fr)] gap-2 px-4 text-xs items-center border-b border-slate-300 last:border-b-0 ${
                              idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                            }`}
                          >
                            <div className="py-2 text-center font-mono font-semibold text-slate-800 border-r border-[#1e293b] h-full flex items-center justify-center">
                              {line.qty}
                            </div>
                            <div className="py-2 pl-1 pr-2 border-r border-[#1e293b] h-full flex flex-col justify-center">
                              <span className="font-bold text-slate-900 uppercase leading-snug">
                                {line.shortDesc}
                              </span>
                              {line.extraLines && line.extraLines.length > 0 && (
                                <span className="text-[10px] text-slate-500 mt-0.5 whitespace-pre-line">
                                  {line.extraLines.join('\n')}
                                </span>
                              )}
                            </div>
                            <div className="py-2 text-center font-mono text-slate-800 border-r border-[#1e293b] h-full flex items-center justify-center">
                              {fmt(line.unitPrice)}
                            </div>
                            <div className="py-2 text-center font-mono text-slate-600 border-r border-[#1e293b] h-full flex items-center justify-center">
                              {line.discount > 0 ? `-${fmt(line.discount)}` : '0%'}
                            </div>
                            <div className="py-2 text-center text-[11px] text-slate-700 border-r border-[#1e293b] h-full flex items-center justify-center">
                              {impLabel}
                            </div>
                            <div className="py-2 pr-2 text-right font-mono font-bold text-slate-900 h-full flex items-center justify-end">
                              {fmt(line.lineTotal)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Totals & Notes Section */}
                <div className="flex flex-row justify-between mb-4 mt-6 gap-8">
                  {/* Notes left */}
                  <div className="flex-1 mt-auto">
                    <div className="text-sm">
                      <p className="font-bold mb-1 text-xs text-slate-800">
                        {showPaymentTerms ? 'Nota / Plazo de pago:' : 'Nota / Observaciones:'}
                      </p>
                      <div className="text-[11px] text-slate-700 whitespace-pre-wrap break-words min-h-[40px]">
                        {cleanNotes || (showPaymentTerms ? terminosPago : '')}
                      </div>

                      {metodoPagoRaw === 'MIXTO' &&
                        Array.isArray(activeFactura.pagosMixtos) &&
                        activeFactura.pagosMixtos.length > 0 && (
                          <div className="mt-3 border-t border-slate-200 pt-2">
                            <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                              Desglose de Pago Mixto
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {activeFactura.pagosMixtos.map((p: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"
                                >
                                  <span className="text-slate-600">{p.metodoPago || p.metodo}</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {fmt(Number(p.monto))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Totals Table right */}
                  <div className="w-72 border-t border-gray-300 pt-2 shrink-0">
                    <div className="flex flex-col text-xs border border-b-0 border-[#1e293b]">
                      <div className="flex items-stretch border-b border-[#1e293b]">
                        <div className="flex-1 flex items-center border-r border-[#1e293b] px-2 py-0.5">
                          <span className="text-slate-700 font-semibold">Total Ítems / Paquetes</span>
                        </div>
                        <div className="w-[110px] flex items-center justify-end px-2 py-0.5">
                          <span className="font-mono font-extrabold text-slate-900">
                            {computedTotals.formattedTotalQty}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-stretch border-b border-[#1e293b]">
                        <div className="flex-1 flex items-center border-r border-[#1e293b] px-2 py-0.5">
                          <span className="text-gray-600 font-medium">Sub-Total</span>
                        </div>
                        <div className="w-[110px] flex items-center justify-end px-2 py-0.5">
                          <span className="font-mono">{fmt(computedTotals.subtotal)}</span>
                        </div>
                      </div>

                      {computedTotals.descuentos > 0 && (
                        <div className="flex items-stretch border-b border-[#1e293b]">
                          <div className="flex-1 flex items-center border-r border-[#1e293b] px-2 py-0.5">
                            <span className="text-gray-600 font-medium">Total Descuento</span>
                          </div>
                          <div className="w-[110px] flex items-center justify-end px-2 py-0.5">
                            <span className="font-mono text-red-600">
                              -{fmt(computedTotals.descuentos)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-stretch border-b border-[#1e293b]">
                        <div className="flex-1 flex items-center border-r border-[#1e293b] px-2 py-0.5">
                          <span className="text-gray-600 font-medium">Total Exento</span>
                        </div>
                        <div className="w-[110px] flex items-center justify-end px-2 py-0.5">
                          <span className="font-mono">{fmt(computedTotals.exento)}</span>
                        </div>
                      </div>

                      <div className="flex items-stretch border-b border-[#1e293b]">
                        <div className="flex-1 flex items-center border-r border-[#1e293b] px-2 py-0.5">
                          <span className="text-gray-600 font-medium">Total Exonerado</span>
                        </div>
                        <div className="w-[110px] flex items-center justify-end px-2 py-0.5">
                          <span className="font-mono">{fmt(computedTotals.exonerado)}</span>
                        </div>
                      </div>

                      <div className="flex items-stretch border-b border-[#1e293b]">
                        <div className="flex-1 flex items-center border-r border-[#1e293b] px-2 py-0.5">
                          <span className="text-gray-600 font-medium">Total Gravado 15%</span>
                        </div>
                        <div className="w-[110px] flex items-center justify-end px-2 py-0.5">
                          <span className="font-mono">{fmt(computedTotals.gravado15)}</span>
                        </div>
                      </div>

                      <div className="flex items-stretch border-b border-[#1e293b]">
                        <div className="flex-1 flex items-center border-r border-[#1e293b] px-2 py-0.5">
                          <span className="text-gray-600 font-medium">Total ISV 15%</span>
                        </div>
                        <div className="w-[110px] flex items-center justify-end px-2 py-0.5">
                          <span className="font-mono">{fmt(computedTotals.isv15)}</span>
                        </div>
                      </div>

                      <div
                        className="flex justify-between items-center px-3 py-1.5 bg-[#0f172a] text-white"
                        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                        <span className="font-bold text-sm">TOTAL</span>
                        <span className="font-bold font-mono text-2xl">
                          {fmt(computedTotals.total)}
                        </span>
                      </div>

                      {montoSaldoFavor > 0 && (
                        <div className="border-t border-emerald-600/40 overflow-hidden">
                          <div className="flex justify-between items-center px-2.5 py-1 bg-emerald-50 border-b border-emerald-200 text-emerald-800">
                            <span className="text-[11px] font-bold">(-) Saldo a Favor Aplicado</span>
                            <span className="text-[11px] font-bold font-mono">
                              -{fmt(montoSaldoFavor)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center px-2.5 py-1 bg-emerald-700 text-white">
                            <span className="text-xs font-extrabold uppercase">NETO A PAGAR</span>
                            <span className="text-sm font-black font-mono">
                              {fmt(Math.max(0, computedTotals.total - montoSaldoFavor))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Fiscal Legends & Footer */}
              <div className="mt-8">
                <SarLeyendasFooter className="mt-4 mb-2" />
                <div className="border-t border-slate-300 pt-2 mt-2">
                  <div className="w-full flex justify-center px-4">
                    <div className="flex flex-nowrap whitespace-nowrap items-center justify-center gap-x-2.5 text-slate-600 text-[9.5px] tracking-tight">
                      <span>Tel.: {footerTel}</span>
                      <span>Correo: {footerCorreo}</span>
                    </div>
                  </div>
                  {footerNota && (
                    <p className="text-[9px] text-slate-500 text-center mt-0.5 italic leading-tight">
                      {footerNota}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400 text-center mt-0.5">Página: 1/1</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
