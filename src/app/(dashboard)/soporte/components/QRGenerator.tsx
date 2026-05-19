'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Printer, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';

type QRGeneratorProps = {
  orderId: string;
  serie: string;
  cliente: string;
  equipo?: string;
  fecha?: string;
};

export default function QRGenerator({ 
  orderId = "N/A", 
  serie = "N/A", 
  cliente = "N/A",
  equipo = "Sin especificar",
  fecha = new Date().toLocaleDateString("es-HN")
}: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [impresora, setImpresora] = useState('TSC TE200');
  const [tamano, setTamano] = useState('50x30');
  const [imprimiendo, setImprimiendo] = useState(false);
  const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleImprimir = async () => {
    setImprimiendo(true);
    setResultado(null);
    try {
      const params = new URLSearchParams({
        ordenId: orderId,
        serie,
        cliente,
        equipo,
        fecha,
        size: tamano
      });
      // Importante: usamos URL absoluta o ruta relativa desde el origen
      const urlImagen = `${window.location.origin}/api/impresion/generar-etiqueta-reparacion?${params.toString()}`;

      const res = await fetch('/api/impresion/encolar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlImagen,
          impresora,
          tamano,
          activoId: '00000000-0000-0000-0000-000000000000' // ID dummy para indicar etiqueta que no es un activo
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al imprimir');

      setResultado({ success: true, message: 'Enviado a impresión' });
      setTimeout(() => setResultado(null), 3000);
    } catch (e: any) {
      setResultado({ success: false, message: e.message });
      setTimeout(() => setResultado(null), 4000);
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border flex flex-col">
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
            ["Serie", serie],
            ["Cliente", cliente],
            ["Fecha", fecha],
          ].map(([k, v]) => (
            <div key={k} className="mb-1.5 truncate">
              <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{k}</div>
              <div className="text-xs text-slate-900 font-mono font-bold truncate">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Impresora</label>
            <select 
              value={impresora}
              onChange={(e) => setImpresora(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500"
            >
              <option value="TSC TE200">TSC TE200</option>
              <option value="Niimbot">Niimbot B21</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Tamaño</label>
            <select 
              value={tamano}
              onChange={(e) => setTamano(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500"
            >
              <option value="50x30">50x30 (Normal)</option>
              <option value="50x25">50x25 (Corto)</option>
              <option value="70x40">70x40 (Grande)</option>
            </select>
          </div>
        </div>

        {resultado && (
          <div className={`p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${resultado.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {resultado.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {resultado.message}
          </div>
        )}

        <button 
          onClick={handleImprimir}
          disabled={imprimiendo}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Printer className="w-4 h-4" /> 
          {imprimiendo ? 'Enviando...' : 'Imprimir Etiqueta'}
        </button>
      </div>
    </div>
  );
}
