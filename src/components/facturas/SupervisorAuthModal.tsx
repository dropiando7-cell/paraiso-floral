'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { validarCodigoAutorizacionGerente } from '@/app/(dashboard)/facturas/actions';

export interface SupervisorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento?: {
    id: string;
    correlativo: string;
    fechaEmision?: string | Date;
    tipoDocumento?: string;
  } | null;
  facturaId?: string;
  correlativo?: string;
  total?: number;
  onSuccess?: (supervisor: { nombre: string; email: string }, code: string) => void;
  onAuthorized?: (supervisor: { nombre: string; email: string }, code: string) => void;
}

export default function SupervisorAuthModal({
  isOpen,
  onClose,
  documento,
  facturaId,
  correlativo,
  total,
  onSuccess,
  onAuthorized
}: SupervisorAuthModalProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const docId = documento?.id || facturaId || '';
  const docCorrelativo = documento?.correlativo || correlativo || '';

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setErrorMsg(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen || (!documento && !facturaId)) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Ingresa el código secreto de autorización.');
      return;
    }

    setIsValidating(true);
    setErrorMsg(null);

    try {
      const res = await validarCodigoAutorizacionGerente(code.trim(), docId);
      if (res.success && res.supervisor) {
        toast.success(`Desbloqueado con autorización de ${res.supervisor.nombre}`, {
          icon: '🔓',
          duration: 4000
        });
        if (onSuccess) onSuccess(res.supervisor, code.trim());
        if (onAuthorized) onAuthorized(res.supervisor, code.trim());
        onClose();
      } else {
        setErrorMsg(res.error || 'Código incorrecto o supervisor no habilitado.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleNumberClick = (digit: string) => {
    if (code.length < 10) {
      setCode(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setCode(prev => prev.slice(0, -1));
  };

  const formatFecha = (dStr?: string | Date) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in transition-all">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-md w-full p-6 sm:p-7 text-center flex flex-col items-center gap-4 animate-in zoom-in-95 relative border border-slate-100 overflow-hidden">
        
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Decorador superior */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* Icono de seguridad */}
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center ring-8 ring-amber-500/10 shadow-inner mt-1">
          <KeyRound size={32} className="stroke-[2.5]" />
        </div>

        {/* Título y descripción */}
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full inline-block">
            Seguridad y Control de Facturación
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Autorización de Gerencia
          </h3>
          <p className="text-xs text-slate-500 font-medium px-2 leading-relaxed">
            Esta factura tiene más de 24 horas emitida. Para proteger la integridad de las transacciones, requiere el código de un Gerente o SuperAdmin para modificarse.
          </p>
        </div>

        {/* Tarjeta del documento */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 w-full flex items-center justify-between text-left">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Documento Seleccionado
            </span>
            <span className="font-mono font-black text-base text-slate-800">
              {docCorrelativo || 'FACTURA'}
            </span>
          </div>
          {documento?.fechaEmision && (
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Emitida el
              </span>
              <span className="text-xs font-bold text-slate-600">
                {formatFecha(documento.fechaEmision)}
              </span>
            </div>
          )}
        </div>

        {/* Formulario de Código */}
        <form onSubmit={handleVerify} className="w-full space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 text-left">
              Código Secreto de Supervisor
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                autoComplete="off"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Ingresa PIN o código"
                className="w-full text-center text-xl font-mono tracking-widest font-black py-3 px-4 bg-slate-100/90 border-2 border-slate-200 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15 rounded-2xl transition-all outline-none text-slate-900"
              />
            </div>
            {errorMsg && (
              <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center justify-center gap-1">
                <AlertTriangle size={13} className="shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Teclado numérico rápido (Ideal para pantallas táctiles de POS) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num)}
                className="py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-base rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCode('')}
              className="py-2.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 active:scale-95 text-slate-500 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-base rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              ⌫
            </button>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isValidating || !code.trim()}
              className="flex-[1.5] py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/30 transition-all text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Desbloquear Factura</span>
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-slate-400 font-medium">
          Autorizadores: Lucio Barahona · Francis Carías · SuperAdmin
        </p>
      </div>
    </div>
  );
}
