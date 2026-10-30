'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Download,
  Receipt,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { captureInvoiceImageBlob, copyInvoiceImageToClipboard } from '@/utils/invoiceImageUtils';
import {
  ReciboAbonoData,
  formatFormaPagoRecibo,
  formatCorrelativoFacturaRecibo,
  cleanNotasRecibo
} from '@/lib/cxc-recibo-service';

interface ModalReciboAbonoProps {
  isOpen: boolean;
  onClose: () => void;
  recibo: ReciboAbonoData | null;
}

export default function ModalReciboAbono({ isOpen, onClose, recibo }: ModalReciboAbonoProps) {
  const [phone, setPhone] = useState('88542199');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !recibo) return;
    setCopiedSuccess(false);
    const rawPhone = recibo.cliente?.telefono ? recibo.cliente.telefono.replace(/[^0-9]/g, '') : '';
    const clean = rawPhone.startsWith('504') ? rawPhone.slice(3) : rawPhone;
    setPhone(clean || '88542199');
  }, [isOpen, recibo]);

  if (!isOpen || !recibo) return null;

  const handleCopyOnly = async () => {
    if (!captureRef.current) {
      toast.error('No se encontró el comprobante para capturar.');
      return;
    }

    setIsProcessing(true);
    setCopiedSuccess(false);
    try {
      await copyInvoiceImageToClipboard(captureRef.current);
      setCopiedSuccess(true);
      toast.success('¡Recibo de Abono copiado como imagen! Presiona Ctrl + V en WhatsApp.', {
        duration: 5000,
        icon: '🧾'
      });
    } catch (err: any) {
      console.error('Error copiando imagen de recibo:', err);
      toast.error(err.message || 'Error al copiar la imagen al portapapeles.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAndOpenWhatsApp = async () => {
    if (!captureRef.current) {
      toast.error('No se encontró el comprobante para capturar.');
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
      toast.success('¡Recibo copiado! Abriendo WhatsApp Web para que presiones Ctrl + V...', {
        duration: 5000,
        icon: '💬'
      });
      const waUrl = `https://web.whatsapp.com/send?phone=${clean}`;
      window.open(waUrl, '_blank');
    } catch (err: any) {
      console.error('Error copiando imagen de recibo:', err);
      toast.error(err.message || 'Error al copiar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!captureRef.current) return;
    setIsProcessing(true);
    try {
      const blob = await captureInvoiceImageBlob(captureRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (recibo.cliente.nombre || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCorr = (recibo.correlativo || 'ABONO').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.href = url;
      link.download = `Recibo_${safeCorr}_${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Recibo PNG descargado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar la imagen del recibo');
    } finally {
      setIsProcessing(false);
    }
  };

  // Formatear fecha estilo DD/MM/YYYY HH:mm (ej. 29/10/2026 14:02)
  const fechaObj = new Date(recibo.fecha);
  const fechaValida = !isNaN(fechaObj.getTime()) ? fechaObj : new Date();
  const dia = String(fechaValida.getDate()).padStart(2, '0');
  const mes = String(fechaValida.getMonth() + 1).padStart(2, '0');
  const anio = fechaValida.getFullYear();
  const horas = String(fechaValida.getHours()).padStart(2, '0');
  const minutos = String(fechaValida.getMinutes()).padStart(2, '0');
  const fechaFormateada = `${dia}/${mes}/${anio} ${horas}:${minutos}`;

  const formaPagoTexto = formatFormaPagoRecibo(recibo.metodoPago, recibo.banco);
  const notasLimpias = cleanNotasRecibo(recibo.notas);

  // Construir detalle de factura(s) afectada(s)
  const itemsAfectados: Array<{ etiqueta: string; monto: number }> = [];
  if (recibo.aplicadoASaldoInicial && recibo.aplicadoASaldoInicial > 0.009) {
    itemsAfectados.push({
      etiqueta: 'Saldo Inicial Registrado',
      monto: recibo.aplicadoASaldoInicial
    });
  }
  (recibo.facturasAfectadas || []).forEach(f => {
    itemsAfectados.push({
      etiqueta: formatCorrelativoFacturaRecibo(f.correlativo),
      monto: Number(f.montoAplicado)
    });
  });

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[3200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[95vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header del Modal */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-emerald-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Receipt size={21} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Comprobante Digital • Recibo de Abono / Caja
              </h3>
              <p className="text-xs font-semibold text-emerald-800">
                N° {recibo.correlativo} • {recibo.cliente.nombre}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Acciones de Copiado / WhatsApp */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyOnly}
              disabled={isProcessing}
              className="py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generando recibo HD...</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copiar Imagen</span>
                  <span className="bg-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Ctrl + V
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isProcessing}
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
                className="w-24 text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyAndOpenWhatsApp}
              disabled={isProcessing}
              className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <MessageCircle size={15} className="text-emerald-600" />
              <span>WhatsApp Web</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {copiedSuccess && (
          <div className="mx-5 mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-emerald-900 shrink-0">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold">
              <strong>¡Recibo copiado al portapapeles!</strong> Ve al chat de WhatsApp del cliente y presiona{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-800">
                Ctrl
              </kbd>{' '}
              +{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-slate-800">
                V
              </kbd>{' '}
              para enviarlo.
            </p>
          </div>
        )}

        {/* Área de Vista Previa del Recibo Capturable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/75 flex justify-center items-start">
          <div className="overflow-x-auto max-w-full">
            {/* TARJETA DE RECIBO EN MODO CLARO (DISEÑO FIEL A REFERENCIA) */}
            <div
              ref={captureRef}
              className="w-[460px] bg-white px-8 py-9 text-slate-900 shadow-xl border border-slate-200/90"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              {/* 1. Encabezado con Logo, Razón Social y Badge RECIBO DE ABONO / CAJA */}
              <div className="flex items-center justify-between gap-3 mb-7">
                <div className="flex items-center gap-3">
                  <img
                    src="/icon.png"
                    alt="Paraíso Floral"
                    className="w-11 h-11 object-contain shrink-0"
                  />
                  <div className="leading-tight">
                    <p className="text-[14px] font-bold text-slate-900 tracking-tight uppercase">
                      DISTRIBUIDORA PARAÍSO
                    </p>
                    <p className="text-[14px] font-bold text-slate-900 tracking-tight uppercase">
                      FLORAL, S. DE R.L. DE C.V.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-900 font-bold text-[11px] rounded-lg border border-slate-300 uppercase tracking-wide">
                    RECIBO DE ABONO / CAJA
                  </span>
                </div>
              </div>

              {/* 2. Monto Principal Abonado e Indicador de Éxito */}
              <div className="mb-5">
                <div className="text-[44px] font-extrabold text-slate-950 tracking-tight leading-none mb-2.5">
                  L. {Number(recibo.monto || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3.5} />
                  </span>
                  <span className="text-[16px] font-medium text-slate-800">
                    Abono Aplicado Exitosamente
                  </span>
                </div>
              </div>

              {/* Línea divisoria */}
              <div className="border-t border-slate-200 my-5" />

              {/* 3. DETALLES DEL RECIBO */}
              <div className="mb-5">
                <h4 className="text-[12px] font-extrabold text-slate-950 uppercase tracking-wider mb-1">
                  DETALLES DEL RECIBO
                </h4>
                <div className="text-[14.5px] text-slate-800 space-y-0.5 leading-snug">
                  <p>
                    Recibo de Caja / Abono N°: <span className="font-semibold text-slate-950">{recibo.correlativo}</span>
                  </p>
                  <p>Fecha: {fechaFormateada}</p>
                  <p>Usuario: {recibo.usuarioNombre || 'Departamento de Caja'}</p>
                </div>
              </div>

              {/* 4. CLIENTE */}
              <div className="mb-5">
                <h4 className="text-[12px] font-extrabold text-slate-950 uppercase tracking-wider mb-1">
                  CLIENTE
                </h4>
                <div className="text-[14.5px] text-slate-800 space-y-0.5 leading-snug">
                  <p className="font-semibold text-slate-950">{recibo.cliente.nombre}</p>
                  <p>RTN/DNI: {recibo.cliente.rtn || 'Consumidor Final'}</p>
                  <p>Tel: {recibo.cliente.telefono || 'No registrado'}</p>
                </div>
              </div>

              {/* 5. HISTORIAL DE CUENTA / DETALLE DEL ABONO */}
              <div className="mb-6">
                <h4 className="text-[12px] font-extrabold text-slate-950 uppercase tracking-wider mb-1">
                  HISTORIAL DE CUENTA
                </h4>
                <div className="text-[14.5px] text-slate-800 space-y-0.5 leading-snug">
                  {itemsAfectados.length === 0 ? (
                    <p>Factura Afectada: Abono General a Cuenta CxC</p>
                  ) : itemsAfectados.length === 1 ? (
                    <p>Factura Afectada: {itemsAfectados[0].etiqueta}</p>
                  ) : (
                    <div>
                      <p className="font-medium text-slate-900">Facturas Afectadas ({itemsAfectados.length}):</p>
                      <div className="pl-2.5 mt-0.5 space-y-0.5 text-[13.5px] text-slate-700 border-l-2 border-slate-200">
                        {itemsAfectados.map((it, idx) => (
                          <p key={idx}>
                            • {it.etiqueta}{' '}
                            <span className="text-slate-500">
                              (L. {it.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })})
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <p>
                    Saldo Anterior: L.{' '}
                    {Number(recibo.saldoAnterior || 0).toLocaleString('es-HN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p>Forma de Pago: {formaPagoTexto}</p>
                  <p>Referencia: {recibo.referencia && recibo.referencia.trim() ? recibo.referencia : 'N/A'}</p>
                  {notasLimpias && <p className="text-[13px] text-slate-600 pt-0.5">Nota: {notasLimpias}</p>}
                </div>
              </div>

              {/* 6. Caja Gris de RESUMEN DE SALDO */}
              <div className="bg-slate-100 border border-slate-300 rounded-xl px-5 py-4 mb-6">
                <p className="text-[12.5px] font-medium text-slate-700 uppercase tracking-wide">
                  RESUMEN DE SALDO
                </p>
                <p className="text-[18px] font-extrabold text-slate-950 tracking-tight mt-0.5">
                  NUEVO SALDO PENDIENTE: L.{' '}
                  {Number(recibo.nuevoSaldoPendiente || 0).toLocaleString('es-HN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                {recibo.excedenteMonedero && recibo.excedenteMonedero > 0.009 ? (
                  <p className="text-[12px] font-semibold text-emerald-700 mt-1">
                    + L. {recibo.excedenteMonedero.toLocaleString('es-HN', { minimumFractionDigits: 2 })} acreditados en Saldo a Favor (Monedero)
                  </p>
                ) : null}
              </div>

              {/* 7. Pie de Comprobante (Limpio sin el botón negro para captura de imagen) */}
              <p className="text-[12.5px] text-slate-600 leading-relaxed">
                ¡Gracias por su abono! Comprobante digital de Recibo de Abono / Caja generado por Distribuidora Paraíso Floral, S. de R.L. de C.V.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
