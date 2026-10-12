'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, ArrowUpRight } from 'lucide-react';
import { getSaldoFavorCliente } from '@/app/(dashboard)/contactos/actions';

/**
 * Aviso informativo (NO imprimible) de saldo a favor del cliente.
 * No modifica totales ni el documento: solo alerta al facturador.
 */
export default function SaldoFavorBadge({ clienteId, clienteNombre }: { clienteId?: string | null; clienteNombre?: string }) {
  const [saldo, setSaldo] = useState(0);

  useEffect(() => {
    let alive = true;
    setSaldo(0);
    if (!clienteId) return;
    getSaldoFavorCliente(clienteId)
      .then(v => { if (alive) setSaldo(Number(v) || 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, [clienteId]);

  if (!clienteId || saldo <= 0) return null;

  return (
    <div className="print:hidden w-[816px] max-w-full mx-auto mb-3 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <Wallet size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Cliente con saldo a favor</p>
            <p className="text-sm font-black text-slate-900 truncate">
              {clienteNombre ? `${clienteNombre} · ` : ''}
              <span className="font-mono text-emerald-700">L. {saldo.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>
        <Link
          href={`/cxc/cliente/${clienteId}`}
          target="_blank"
          className="shrink-0 flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          Ver monedero <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
