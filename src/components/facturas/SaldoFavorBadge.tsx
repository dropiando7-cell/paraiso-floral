'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, ArrowUpRight, CheckCircle2, Circle } from 'lucide-react';
import { getSaldoFavorCliente } from '@/app/(dashboard)/contactos/actions';

interface SaldoFavorBadgeProps {
  clienteId?: string | null;
  clienteNombre?: string;
  totalFactura?: number;
  aplicarSaldoFavor?: boolean;
  onToggleAplicar?: (val: boolean) => void;
  onSaldoChange?: (saldo: number) => void;
  viewMode?: boolean;
  docType?: string;
  montoAplicadoGuardado?: number;
}

/**
 * Banner interactivo (NO imprimible) de saldo a favor del cliente.
 * Permite elegir si se aplica el saldo a favor del monedero en la factura actual (Crédito o Contado),
 * rebajándolo después del TOTAL para cumplir con el SAR.
 */
export default function SaldoFavorBadge({
  clienteId,
  clienteNombre,
  totalFactura = 0,
  aplicarSaldoFavor = true,
  onToggleAplicar,
  onSaldoChange,
  viewMode = false,
  docType = 'factura',
  montoAplicadoGuardado = 0,
}: SaldoFavorBadgeProps) {
  const [saldo, setSaldo] = useState(0);

  useEffect(() => {
    let alive = true;
    setSaldo(0);
    onSaldoChange?.(0);
    if (!clienteId) return;
    getSaldoFavorCliente(clienteId)
      .then(v => {
        if (alive) {
          const val = Number(v) || 0;
          setSaldo(val);
          onSaldoChange?.(val);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [clienteId]);

  const tieneAplicadoGuardado = viewMode && Number(montoAplicadoGuardado) > 0;
  if (!clienteId || (saldo <= 0 && !tieneAplicadoGuardado)) return null;

  const esFacturaEditable = !viewMode && docType === 'factura';
  const montoAplicarPreview = esFacturaEditable && aplicarSaldoFavor
    ? Math.min(saldo, Math.max(0, Number(totalFactura) || 0))
    : 0;
  const netoCobrarPreview = Math.max(0, (Number(totalFactura) || 0) - montoAplicarPreview);

  return (
    <div className="print:hidden w-[816px] max-w-full mx-auto mb-3 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/80 to-emerald-50 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <Wallet size={19} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {tieneAplicadoGuardado ? 'Saldo a favor aplicado en esta factura' : 'Cliente con saldo a favor (Monedero)'}
            </p>
            <p className="text-sm font-black text-slate-900 truncate">
              {clienteNombre ? `${clienteNombre} · ` : ''}
              {tieneAplicadoGuardado ? (
                <span className="font-mono text-emerald-700">
                  Aplicado: -L. {Number(montoAplicadoGuardado).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {saldo > 0 ? ` (Disponible hoy: L. ${saldo.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
                </span>
              ) : (
                <span className="font-mono text-emerald-700">
                  L. {saldo.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </p>
            {esFacturaEditable && (
              <p className="text-[11px] text-slate-600 mt-0.5">
                {aplicarSaldoFavor ? (
                  montoAplicarPreview > 0 ? (
                    <>
                      Se rebajará <strong className="text-emerald-700 font-mono">-L. {montoAplicarPreview.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> debajo del TOTAL (SAR) · Neto a cobrar/pagar: <strong className="text-slate-900 font-mono">L. {netoCobrarPreview.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </>
                  ) : (
                    <>Agrega ítems a la factura para descontar automáticamente este saldo a favor.</>
                  )
                ) : (
                  <>No se descontará en esta factura (el saldo quedará reservado en su monedero).</>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {esFacturaEditable && onToggleAplicar && (
            <button
              type="button"
              onClick={() => onToggleAplicar(!aplicarSaldoFavor)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all shadow-sm border ${
                aplicarSaldoFavor
                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {aplicarSaldoFavor ? (
                <>
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>Aplicar en esta factura</span>
                </>
              ) : (
                <>
                  <Circle size={15} className="shrink-0 text-slate-400" />
                  <span>Aplicar saldo a favor</span>
                </>
              )}
            </button>
          )}
          <Link
            href={`/cxc/cliente/${clienteId}`}
            target="_blank"
            className="shrink-0 flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            Ver monedero <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
