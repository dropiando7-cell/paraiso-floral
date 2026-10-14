'use client';

import React from 'react';

export const MOTIVOS_MERMA = [
  { key: 'MADURACION_MARCHITA', label: 'Maduración / Marchita', bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
  { key: 'TALLO_QUEBRADO', label: 'Tallo Quebrado', bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
  { key: 'HONGO_BOTRYTIS', label: 'Hongo / Botrytis', bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
  { key: 'TRANSPORTE', label: 'Daño Transporte', bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
  { key: 'OTRO', label: 'Otro Motivo', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
];

export function getMotivoInfo(key: string) {
  return MOTIVOS_MERMA.find(m => m.key === key) || {
    key,
    label: key || 'Maduración / Marchita',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300'
  };
}

interface MotivoSelectBadgeProps {
  value: string;
  onChange: (newMotivo: string) => void;
  disabled?: boolean;
  className?: string;
}

export function MotivoSelectBadge({ value, onChange, disabled = false, className = '' }: MotivoSelectBadgeProps) {
  const current = getMotivoInfo(value);

  return (
    <div className="relative inline-block w-full">
      <select
        value={value || 'MADURACION_MARCHITA'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none cursor-pointer px-2.5 font-black transition-all outline-none focus:ring-2 focus:ring-emerald-500/50 ${current.bg} ${current.text} ${current.border} ${className ? className : 'py-1 text-[11px] rounded-lg'}`}
      >
        {MOTIVOS_MERMA.map((m) => (
          <option key={m.key} value={m.key} className="bg-white text-slate-900 font-semibold py-1">
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
