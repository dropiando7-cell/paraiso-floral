import React, { useEffect, useRef } from 'react';
import { Printer, QrCode } from 'lucide-react';

type QRGeneratorProps = {
  orderId: string;
  serie: string;
  cliente: string;
};

export default function QRGenerator({ orderId = "N/A", serie = "N/A", cliente = "N/A" }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-full box-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
          <QrCode className="w-4 h-4 text-slate-700" />
        </div>
        <span className="text-[13px] font-bold text-slate-900 tracking-tight">Etiqueta de Trazabilidad</span>
      </div>

      <div className="flex gap-4 items-start">
        <div className="border-2 border-slate-900 p-1 rounded-md shrink-0">
          <canvas ref={canvasRef} className="block" />
        </div>
        <div className="flex-1 min-w-0">
          {[
            ["Orden", orderId],
            ["Serie", serie],
            ["Cliente", cliente],
            ["Fecha", new Date().toLocaleDateString("es-HN")],
          ].map(([k, v]) => (
            <div key={k} className="mb-1.5 truncate">
              <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{k}</div>
              <div className="text-xs text-slate-900 font-mono font-bold truncate">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full mt-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors">
        <Printer className="w-4 h-4" /> Imprimir Etiqueta
      </button>
    </div>
  );
}
