'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Printer, QrCode, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

type QRGeneratorProps = {
  orderId: string;
  serie: string;
  cliente: string;
  equipo?: string;
  marcaModelo?: string;
  fecha?: string;
  kanbanCodigo?: string;
};

export default function QRGenerator({ 
  orderId = "N/A", 
  serie = "N/A", 
  cliente = "N/A",
  equipo = "Sin especificar",
  marcaModelo = "",
  fecha = new Date().toLocaleDateString("es-HN"),
  kanbanCodigo = ""
}: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 80;
    canvas.width = size; canvas.height = size;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);

    const hash = orderId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) || 123;
    const modules = 14;
    const cell = size / modules;
    ctx.fillStyle = "#0B1221";

    const finder = (ox: number, oy: number) => {
      ctx.fillRect(ox*cell, oy*cell, 7*cell, 7*cell);
      ctx.fillStyle = "#fff";
      ctx.fillRect((ox+1)*cell, (oy+1)*cell, 5*cell, 5*cell);
      ctx.fillStyle = "#0B1221";
      ctx.fillRect((ox+2)*cell, (oy+2)*cell, 3*cell, 3*cell);
    };
    finder(0, 0); finder(7, 0); finder(0, 7);

    const pseudo = (r: number, c: number) => (((r * 17 + c * 13 + hash) % 7) < 3);
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c > 5) || (r > 5 && c < 8)) continue;
        if (pseudo(r, c)) {
          ctx.fillStyle = "#0B1221";
          ctx.fillRect(c * cell, r * cell, cell - 0.5, cell - 0.5);
        }
      }
    }
  }, [orderId]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border flex flex-col border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
          <QrCode className="w-4 h-4 text-slate-700" />
        </div>
        <span className="text-[13px] font-bold text-slate-900 tracking-tight">Etiqueta de Trazabilidad</span>
      </div>

      <div className="flex gap-4 items-start mb-4">
        <div className="border-2 border-slate-900 p-1 rounded-md shrink-0">
          <canvas ref={canvasRef} className="block" />
        </div>
        <div className="flex-1 min-w-0">
          {[
            ["Orden", orderId],
            kanbanCodigo ? ["Tarea Kanban", kanbanCodigo] : null,
            ["Serie", serie],
            ["Cliente", cliente],
            ["Fecha", fecha],
          ].filter(Boolean).map((item) => {
            const [k, v] = item!;
            return (
              <div key={k} className="mb-1.5 truncate">
                <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{k}</div>
                <div className="text-xs text-slate-900 font-mono font-bold truncate">{v}</div>
              </div>
            );
          })}
        </div>
      </div>

      <button 
        onClick={() => setShowModal(true)}
        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors mt-auto"
      >
        <Printer className="w-4 h-4" /> 
        Imprimir Etiqueta
      </button>

      {showModal && (
        <PreviewEtiquetaReparacionModal 
          orderId={orderId}
          serie={serie}
          cliente={cliente}
          equipo={equipo}
          marcaModelo={marcaModelo}
          fecha={fecha}
          kanbanCodigo={kanbanCodigo}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── Modal de Vista Previa para Trazabilidad de Reparación ────────────────────
type PreviewModalProps = {
  orderId: string;
  serie: string;
  cliente: string;
  equipo: string;
  marcaModelo: string;
  fecha: string;
  kanbanCodigo?: string;
  onClose: () => void;
};

function PreviewEtiquetaReparacionModal({ 
  orderId, 
  serie, 
  cliente, 
  equipo, 
  marcaModelo,
  fecha, 
  kanbanCodigo = "",
  onClose 
}: PreviewModalProps) {
  const [cantidad, setCantidad] = useState(1);
  const [size, setSize] = useState('50x30');
  const [impresora, setImpresora] = useState('TSC TE200');
  const [imprimiendo, setImprimiendo] = useState(false);
  const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('default_printer');
    if (saved) {
      setImpresora(saved);
    }
  }, []);

  const handlePrinterChange = (newPrinter: string) => {
    setImpresora(newPrinter);
    localStorage.setItem('default_printer', newPrinter);
  };

  const params = new URLSearchParams({
    ordenId: orderId,
    serie,
    cliente,
    equipo,
    marcaModelo,
    fecha,
    size,
    kanbanCodigo
  });
  const urlImagen = `/api/impresion/generar-etiqueta-reparacion?${params.toString()}`;

  const handleImprimir = async () => {
    setImprimiendo(true);
    setResultado(null);
    try {
      const fullUrlImagen = `${window.location.origin}${urlImagen}`;
      const qtyToPrint = Number(cantidad) || 1;
      const enqueuePromises = [];

      for (let i = 0; i < qtyToPrint; i++) {
        enqueuePromises.push(
          fetch('/api/impresion/encolar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              urlImagen: fullUrlImagen,
              impresora,
              tamano: size,
              activoId: '00000000-0000-0000-0000-000000000000' // ID dummy para indicar etiqueta que no es un activo
            })
          })
        );
      }

      await Promise.all(enqueuePromises);

      setResultado({ success: true, message: `Enviadas ${qtyToPrint} copias a impresión` });
      setTimeout(() => {
        setResultado(null);
        onClose();
      }, 2000);
    } catch (e: any) {
      setResultado({ success: false, message: e.message || 'Error al imprimir' });
      setTimeout(() => setResultado(null), 4000);
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 relative max-w-lg w-full border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5"/>
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl">
            <Printer className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 leading-tight">Vista Previa de Etiqueta de Soporte</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Impresora seleccionada: <span className="font-semibold">{impresora}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Copias a Imprimir:</span>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={cantidad} 
              onChange={(e) => setCantidad(Number(e.target.value) || 1)}
              className="w-20 text-center font-bold font-mono py-1.5 px-2 rounded-lg border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-700">Tamaño Etiqueta:</span>
            <select 
              value={size} 
              onChange={(e) => setSize(e.target.value)}
              className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="50x30">50x30 mm (Normal)</option>
              <option value="50x25">50x25 mm (Corto)</option>
              <option value="70x40">70x40 mm (Grande)</option>
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-700">Impresora:</span>
            <select 
              value={impresora} 
              onChange={(e) => handlePrinterChange(e.target.value)}
              className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="TSC TE200">TSC TE200</option>
              <option value="Niimbot">NIIMBOT K3</option>
            </select>
          </div>
        </div>

        <div className="border-4 border-slate-100 rounded-xl p-4 bg-slate-50 flex justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={urlImagen} 
            className="w-full max-w-[320px] h-auto object-contain bg-white shadow-sm rounded border border-slate-200" 
            alt="Preview Etiqueta Reparación" 
          />
        </div>

        {resultado && (
          <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${
            resultado.success 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {resultado.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {resultado.message}
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 font-semibold border border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleImprimir} 
            disabled={imprimiendo} 
            className="flex-[2] flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-70 shadow-sm shadow-indigo-600/10"
          >
            {imprimiendo ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin"/>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>Enviar a Impresora</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
