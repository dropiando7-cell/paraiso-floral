import React from 'react';

interface SarFiscalBannerProps {
  numeroCAI?: string | null;
  rangoAutorizado?: string | null;
  fechaLimiteEmision?: string | Date | null;
  variant?: 'dark' | 'light' | 'bordered';
  className?: string;
}

export default function SarFiscalBanner({
  numeroCAI,
  rangoAutorizado,
  fechaLimiteEmision,
  variant = 'light',
  className = ''
}: SarFiscalBannerProps) {
  if (!numeroCAI && !rangoAutorizado && !fechaLimiteEmision) {
    return null;
  }

  const formattedDate = fechaLimiteEmision
    ? typeof fechaLimiteEmision === 'string'
      ? fechaLimiteEmision.split('T')[0]
      : new Date(fechaLimiteEmision).toLocaleDateString('es-HN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
    : null;

  if (variant === 'dark') {
    return (
      <div className={`bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3 text-white font-mono text-[11px] ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-slate-300 font-sans font-bold">
              CAI (Autorizado por SAR)
            </span>
            <span className="font-bold text-[11px] tracking-wide break-all text-white">
              {numeroCAI || '—'}
            </span>
          </div>
          {rangoAutorizado && (
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-300 font-sans font-bold">
                Rango Autorizado
              </span>
              <span className="text-[11px] font-semibold text-slate-100">
                {rangoAutorizado}
              </span>
            </div>
          )}
          {formattedDate && (
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-300 font-sans font-bold">
                Fecha Límite de Emisión
              </span>
              <span className="text-[11px] font-semibold text-emerald-300">
                {formattedDate}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isBordered = variant === 'bordered';

  return (
    <div className={`p-2.5 rounded-xl text-[10.5px] font-mono leading-tight ${
      isBordered 
        ? 'border-2 border-slate-800 bg-white text-slate-900' 
        : 'border border-slate-200 bg-slate-50 text-slate-800'
    } ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <span className="block text-[8.5px] uppercase tracking-wider text-slate-500 font-sans font-bold">
            CAI (Código Autorización)
          </span>
          <span className="font-bold tracking-wide break-all text-slate-950">
            {numeroCAI || '—'}
          </span>
        </div>
        {rangoAutorizado && (
          <div>
            <span className="block text-[8.5px] uppercase tracking-wider text-slate-500 font-sans font-bold">
              Rango Autorizado
            </span>
            <span className="font-semibold text-slate-800">
              {rangoAutorizado}
            </span>
          </div>
        )}
        {formattedDate && (
          <div>
            <span className="block text-[8.5px] uppercase tracking-wider text-slate-500 font-sans font-bold">
              Fecha Límite Emisión
            </span>
            <span className="font-semibold text-slate-800">
              {formattedDate}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SarLeyendasFooter({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center py-2 text-[9px] uppercase tracking-wider text-slate-500 font-mono space-y-0.5 border-t border-slate-200 ${className}`}>
      <p className="font-black text-slate-800 text-[9.5px]">ORIGINAL: CLIENTE • COPIA: EMISOR</p>
      <p className="font-bold text-slate-600">LA FACTURA ES BENEFICIO DE TODOS, EXÍJALA</p>
    </div>
  );
}
