'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, ExternalLink, Send, ShieldCheck, PenTool, RefreshCw, UserCheck, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ClienteFirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
    id: string;
    nombre: string;
    telefono?: string | null;
    telefonoContacto?: string | null;
    nombreContacto?: string | null;
    firmaDigitalUrl?: string | null;
    firmaDigitalNombre?: string | null;
    firmaDigitalFecha?: string | null;
  } | null;
  onFirmaUpdated?: () => void;
}

export default function ClienteFirmaModal({ isOpen, onClose, cliente, onFirmaUpdated }: ClienteFirmaModalProps) {
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (cliente && typeof window !== 'undefined') {
      const origin = window.location.origin;
      const url = `${origin}/c/${cliente.id}/cliente-firma`;
      setPublicUrl(url);

      const encodedUrl = encodeURIComponent(url);
      setQrUrl(`https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodedUrl}&scale=5&eclevel=M&includetext=false`);
    }
  }, [cliente]);

  if (!isOpen || !cliente) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('¡Enlace de firma copiado al portapapeles!');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const handleSendWhatsApp = () => {
    const targetPhone = cliente.telefonoContacto || cliente.telefono || '';
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Estimado(a) representante de *${cliente.nombre}*,\n\nLe enviamos el enlace seguro para registrar la Firma Digital Oficial del Representante Legal de la empresa en nuestro sistema de trazabilidad técnica:\n\n${publicUrl}\n\nUna vez registrada, su firma aparecerá automáticamente en todos los Reportes Técnicos Unificados.`
    );

    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone.length === 8 ? '504' + cleanPhone : cleanPhone}?text=${message}`
      : `https://api.whatsapp.com/send?text=${message}`;

    window.open(waUrl, '_blank');
  };

  const formatDateStr = (d?: string | null) => {
    if (!d) return 'N/A';
    try {
      const date = new Date(d);
      return new Intl.DateTimeFormat('es-HN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl p-6 relative max-w-lg w-full border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado Modal */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base leading-tight">Enlace de Firma del Cliente</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">{cliente.nombre}</p>
          </div>
        </div>

        {/* Estado de Firma Actual */}
        <div className={`p-4 rounded-2xl border ${
          cliente.firmaDigitalUrl 
            ? 'bg-emerald-50/70 border-emerald-200' 
            : 'bg-amber-50/70 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              cliente.firmaDigitalUrl 
                ? 'bg-emerald-600 text-white' 
                : 'bg-amber-600 text-white'
            }`}>
              {cliente.firmaDigitalUrl ? '✓ Firma Registrada' : '⚠ Pendiente de Firma'}
            </span>

            {cliente.firmaDigitalFecha && (
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {formatDateStr(cliente.firmaDigitalFecha)}
              </span>
            )}
          </div>

          {cliente.firmaDigitalUrl ? (
            <div className="mt-3 flex items-center gap-4 bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
              <div className="h-14 w-28 bg-slate-50 rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                <img src={cliente.firmaDigitalUrl} alt="Firma Guardada" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="text-xs space-y-0.5 overflow-hidden">
                <p className="text-slate-400 text-[10px] font-semibold">Representante Legal / Firmante:</p>
                <p className="text-slate-900 font-extrabold truncate">{cliente.firmaDigitalNombre || 'Sin nombre especificado'}</p>
                <p className="text-emerald-700 text-[10px] font-bold">Activa en Reporte Unificado</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-800 mt-2 font-medium">
              Este cliente aún no posee una firma digital guardada. Envía el enlace o QR al representante de la empresa para que la firme.
            </p>
          )}
        </div>

        {/* Sección Código QR y Enlace Directo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
          <div className="sm:col-span-1 flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
            {qrUrl ? (
              <img src={qrUrl} alt="Código QR de Firma" className="w-28 h-28 object-contain" />
            ) : (
              <QrCode className="w-20 h-20 text-slate-300" />
            )}
            <span className="text-[9px] font-bold text-slate-400 mt-1">Escanear con celular</span>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <label className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider block">
              Enlace Público Directo
            </label>
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700 select-all focus:outline-none"
            />
            
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Enlace'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.open(publicUrl, '_blank')}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-2 rounded-xl transition cursor-pointer"
                title="Abrir en nueva pestaña para firmar ahora"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Acciones Principales */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Enviar por WhatsApp al Cliente</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-5 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
