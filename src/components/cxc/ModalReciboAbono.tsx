'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { numeroALetrasLempiras } from '@/utils/facturaUtils';

interface ModalReciboAbonoProps {
  isOpen: boolean;
  onClose: () => void;
  recibo: ReciboAbonoData | null;
}

export default function ModalReciboAbono({ isOpen, onClose, recibo }: ModalReciboAbonoProps) {
  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState('88542199');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !recibo) return;
    setCopiedSuccess(false);
    const rawPhone = recibo.cliente?.telefono ? recibo.cliente.telefono.replace(/[^0-9]/g, '') : '';
    const clean = rawPhone.startsWith('504') ? rawPhone.slice(3) : rawPhone;
    setPhone(clean || '88542199');
  }, [isOpen, recibo]);

  if (!mounted || !isOpen || !recibo) return null;

  const handleCopyOnly = async () => {
    if (!captureRef.current) {
      toast.error('No se encontró el comprobante para capturar.');
      return;
    }

    setIsProcessing(true);
    setCopiedSuccess(false);
    try {
      await copyInvoiceImageToClipboard(captureRef.current, { exactWidth: true, width: 440, scale: 3 });
      setCopiedSuccess(true);
      toast.success('¡Recibo de Abono copiado en formato vertical móvil! Presiona Ctrl + V en WhatsApp.', {
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
      await copyInvoiceImageToClipboard(captureRef.current, { exactWidth: true, width: 440, scale: 3 });
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
      const blob = await captureInvoiceImageBlob(captureRef.current, { exactWidth: true, width: 440, scale: 3 });
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
      toast.success('Recibo PNG vertical descargado exitosamente');
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

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] my-auto shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
              <strong>¡Recibo vertical copiado al portapapeles!</strong> Ve al chat de WhatsApp del cliente y presiona{' '}
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
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 flex justify-center items-start">
          <div className="overflow-x-auto max-w-full rounded-2xl shadow-lg border border-slate-300/80">
            {/* LIENZO EXTERIOR CON MÁRGENES LATERALES PARA SIMULAR EL TICKET RECORTADO */}
            <div
              ref={captureRef}
              data-capture-exact-width="true"
              className="w-[440px] bg-[#eef2f6] px-6 pt-6 pb-8 text-slate-900"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              {/* PAPEL BLANCO DEL TICKET INTERNO */}
              <div className="relative bg-white rounded-t-xl shadow-[0_8px_24px_rgba(15,23,42,0.08)] border-x border-t border-slate-200/90 px-6 pt-6 pb-5">
                {/* Franja decorativa superior */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 rounded-t-xl" />

                {/* 1. Encabezado con Logo, Razón Social y Badge RECIBO DE ABONO / CAJA */}
                <div className="flex items-center justify-between gap-2 mb-5 pt-1">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/icon.png"
                      alt="Paraíso Floral"
                      className="w-10 h-10 object-contain shrink-0"
                    />
                    <div className="leading-tight">
                      <p className="text-[12.5px] font-black text-slate-900 tracking-tight uppercase">
                        DISTRIBUIDORA PARAÍSO
                      </p>
                      <p className="text-[11.5px] font-bold text-slate-700 tracking-tight uppercase">
                        FLORAL, S. DE R.L. DE C.V.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-900 font-extrabold text-[10px] rounded-md border border-emerald-200 uppercase tracking-wider">
                      RECIBO DE CAJA
                    </span>
                  </div>
                </div>

                {/* 2. Monto Principal Abonado e Indicador de Éxito */}
                <div className="mb-4">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Monto Abonado
                  </p>
                  <div className="text-[38px] font-black text-slate-950 tracking-tight leading-none mb-2">
                    L. {Number(recibo.monto || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight mb-2.5">
                    ***{numeroALetrasLempiras(recibo.monto)}***
                  </p>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                      <Check size={11} strokeWidth={3.5} />
                    </span>
                    <span className="text-[12.5px] font-bold text-emerald-900">
                      Abono Aplicado Exitosamente
                    </span>
                  </div>
                </div>

                {/* Línea divisoria punteada estilo recibo */}
                <div className="border-t border-dashed border-slate-300 my-4" />

                {/* 3. TABLA DE FILAS ESTILO COMPROBANTE BANCARIO (Fecha, Recibo, Cliente, Método, Referencia) */}
                <div className="divide-y divide-slate-100 text-[13px] mb-4">
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 font-medium">Recibo N°</span>
                    <span className="font-bold text-slate-900 font-mono">{recibo.correlativo}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 font-medium">Fecha y Hora</span>
                    <span className="font-semibold text-slate-800">{fechaFormateada}</span>
                  </div>
                  <div className="py-2 flex items-start justify-between gap-3">
                    <span className="text-slate-500 font-medium shrink-0">Cliente</span>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 leading-snug">{recibo.cliente.nombre}</p>
                      {recibo.cliente.rtn && (
                        <p className="text-[11px] text-slate-500 font-mono">RTN: {recibo.cliente.rtn}</p>
                      )}
                    </div>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 font-medium shrink-0">Forma de Pago</span>
                    <span className="font-semibold text-slate-800 text-right">{formaPagoTexto}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 font-medium">Referencia</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {recibo.referencia && recibo.referencia.trim() ? recibo.referencia : 'N/A'}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-500 font-medium">Atendido por</span>
                    <span className="font-medium text-slate-700 text-right">
                      {recibo.usuarioNombre || 'Departamento de Caja'}
                    </span>
                  </div>
                  {notasLimpias && (
                    <div className="py-2 flex items-start justify-between gap-3">
                      <span className="text-slate-500 font-medium shrink-0">Concepto / Nota</span>
                      <span className="text-slate-700 text-right text-[12px]">{notasLimpias}</span>
                    </div>
                  )}
                </div>

                {/* 4. DESGLOSE DE FACTURAS AFECTADAS */}
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-lg px-3.5 py-2.5 mb-4">
                  <p className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Aplicación del Abono
                  </p>
                  {itemsAfectados.length === 0 ? (
                    <div className="flex justify-between items-center text-[12.5px]">
                      <span className="text-slate-700 font-medium">Abono General a Cuenta CxC</span>
                      <span className="font-mono font-bold text-slate-900">
                        L. {Number(recibo.monto || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {itemsAfectados.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[12.5px]">
                          <span className="text-slate-700 font-medium">
                            Factura <span className="font-mono font-semibold text-slate-900">{it.etiqueta}</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            L. {it.monto.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. RESUMEN DE SALDO (CON DETECCIÓN DE CUENTA AL DÍA / SALDO CERO) */}
                {(() => {
                  const saldoRestante = Math.max(0, Number(recibo.nuevoSaldoPendiente || 0));
                  const estaAlDia = saldoRestante <= 0.01;
                  return (
                    <div
                      className={`rounded-xl px-4 py-3 mb-4 border ${
                        estaAlDia
                          ? 'bg-emerald-50/90 border-emerald-300'
                          : 'bg-slate-100/90 border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[12px] text-slate-600 mb-1">
                        <span className="font-medium">Saldo Anterior:</span>
                        <span className="font-mono font-semibold">
                          L.{' '}
                          {Number(recibo.saldoAnterior || 0).toLocaleString('es-HN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[12px] text-emerald-700 mb-1.5 pb-1.5 border-b border-slate-200/80">
                        <span className="font-medium">(-) Abono Recibido:</span>
                        <span className="font-mono font-bold">
                          - L.{' '}
                          {Number(recibo.monto || 0).toLocaleString('es-HN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[12px] font-extrabold uppercase tracking-wide text-slate-900">
                          Nuevo Saldo Pendiente:
                        </span>
                        <span
                          className={`text-[18px] font-black font-mono tracking-tight ${
                            estaAlDia ? 'text-emerald-700' : 'text-slate-950'
                          }`}
                        >
                          L.{' '}
                          {saldoRestante.toLocaleString('es-HN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>

                      {estaAlDia && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/80 flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span className="text-[12px] font-extrabold">
                            ¡Felicidades, su cuenta se encuentra al día! Sin saldo pendiente.
                          </span>
                        </div>
                      )}

                      {recibo.excedenteMonedero && recibo.excedenteMonedero > 0.009 ? (
                        <p className="text-[11.5px] font-bold text-emerald-700 mt-1.5">
                          + L. {recibo.excedenteMonedero.toLocaleString('es-HN', { minimumFractionDigits: 2 })} acreditados en su Saldo a Favor (Monedero)
                        </p>
                      ) : null}
                    </div>
                  );
                })()}

                {/* 6. Pie de Comprobante */}
                <p className="text-[11px] text-center text-slate-500 leading-relaxed pt-1">
                  ¡Gracias por su pago! Comprobante oficial generado por Distribuidora Paraíso Floral, S. de R.L. de C.V.
                </p>
              </div>

              {/* BORDE INFERIOR CORTADO EN ZIGZAG (DIENTES DE TICKET SIMULADO) */}
              <div className="w-full overflow-hidden leading-none -mt-[1px] drop-shadow-[0_6px_8px_rgba(15,23,42,0.07)]">
                <svg
                  viewBox="0 0 392 14"
                  className="w-full h-[14px] block"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,0 L392,0 L392,2 L385,13 L378,2 L371,13 L364,2 L357,13 L350,2 L343,13 L336,2 L329,13 L322,2 L315,13 L308,2 L301,13 L294,2 L287,13 L280,2 L273,13 L266,2 L259,13 L252,2 L245,13 L238,2 L231,13 L224,2 L217,13 L210,2 L203,13 L196,2 L189,13 L182,2 L175,13 L168,2 L161,13 L154,2 L147,13 L140,2 L133,13 L126,2 L119,13 L112,2 L105,13 L98,2 L91,13 L84,2 L77,13 L70,2 L63,13 L56,2 L49,13 L42,2 L35,13 L28,2 L21,13 L14,2 L7,13 L0,2 Z"
                    fill="#ffffff"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
