'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  Copy,
  RefreshCw,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PegarExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportadoExitoso: () => void;
}

interface FilaParseada {
  fecha: string;
  descripcion: string;
  factura: string;
  exenta: number;
  gravada: number;
  isv15: number;
  total: number;
}

export default function PegarExcelModal({
  isOpen,
  onClose,
  onImportadoExitoso
}: PegarExcelModalProps) {
  const [rawText, setRawText] = useState<string>('');
  const [filas, setFilas] = useState<FilaParseada[]>([]);
  const [guardando, setGuardando] = useState<boolean>(false);

  if (!isOpen) return null;

  // Analizar texto pegado (formato TSV / Tab-Separated de Excel)
  const handleParseText = (text: string) => {
    setRawText(text);

    if (!text.trim()) {
      setFilas([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/);
    const parsed: FilaParseada[] = [];

    lines.forEach((line) => {
      // Ignorar encabezados comunes si el usuario los copió
      const lower = line.toLowerCase();
      if (lower.includes('fecha') && (lower.includes('descripcion') || lower.includes('proveedor') || lower.includes('total'))) {
        return;
      }

      // Separado por tabulaciones (estándar de Excel) o por comas/punto y coma
      const cols = line.split(/\t/);
      if (cols.length < 2) return;

      // Extraer campos según orden común:
      // Col 0: Fecha
      // Col 1: Descripción / Proveedor
      // Col 2: Factura
      // Col 3: Exenta
      // Col 4: Gravada
      // Col 5: ISV (15%)
      // Col 6: Total
      let fecha = cols[0]?.trim() || new Date().toISOString().split('T')[0];
      // Si la fecha viene en DD/MM/YYYY, convertirla a YYYY-MM-DD
      if (fecha.includes('/')) {
        const parts = fecha.split('/');
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            fecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      const desc = cols[1]?.trim() || 'Sin descripción';
      const factura = cols[2]?.trim() || '';

      const cleanNum = (val: string | undefined) => {
        if (!val) return 0;
        const cleaned = val.replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      const exenta = cleanNum(cols[3]);
      const gravada = cleanNum(cols[4]);
      let isv15 = cleanNum(cols[5]);
      let total = cleanNum(cols[6]);

      // Si no hay ISV pero hay gravada, calcular sugerido
      if (isv15 === 0 && gravada > 0) {
        isv15 = Math.round(gravada * 0.15 * 100) / 100;
      }

      // Si no hay total, calcular
      if (total === 0 && (exenta > 0 || gravada > 0)) {
        total = Math.round((exenta + gravada + isv15) * 100) / 100;
      }

      if (desc && (total > 0 || gravada > 0 || exenta > 0)) {
        parsed.push({
          fecha,
          descripcion: desc,
          factura,
          exenta,
          gravada,
          isv15,
          total
        });
      }
    });

    setFilas(parsed);
  };

  const handleImportarLote = async () => {
    if (filas.length === 0) {
      toast.error('No hay filas válidas para importar');
      return;
    }

    try {
      setGuardando(true);

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filas)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al importar lote');

      toast.success(`¡${filas.length} compras importadas exitosamente!`);
      onImportadoExitoso();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error importando compras');
    } finally {
      setGuardando(false);
    }
  };

  const totalImportacion = filas.reduce((acc, f) => acc + f.total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Pegar Filas Directamente desde Excel
              </h3>
              <p className="text-emerald-200 text-xs font-medium">
                Copia las filas en tu Excel con Ctrl+C y pégalas aquí con Ctrl+V.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {/* Instrucciones de columnas */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Estructura esperada de columnas en Excel:</span>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-mono">
                [FECHA] [DESCRIPCIÓN/PROVEEDOR] [N° FACTURA] [EXENTA] [GRAVADA] [ISV 15%] [TOTAL]
              </p>
              <p className="text-[10px] text-emerald-600 mt-1">
                * No te preocupes si falta alguna columna numérica o el ISV; el sistema lo calculará automáticamente.
              </p>
            </div>
          </div>

          {/* Área de Pegado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pega aquí el contenido copiado de Excel (Ctrl+V):
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleParseText(e.target.value)}
              placeholder="Haz clic aquí y presiona Ctrl+V..."
              className="w-full p-3 bg-white border-2 border-dashed border-emerald-300 focus:border-emerald-500 rounded-2xl font-mono text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Vista previa de las filas detectadas */}
          {filas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Vista Previa ({filas.length} {filas.length === 1 ? 'fila detectada' : 'filas detectadas'}):
                </span>
                <span className="text-xs font-black text-emerald-700 font-mono">
                  Suma Total: L. {totalImportacion.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[250px] overflow-y-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-100 text-[10px] font-black text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2 w-8 text-center">#</th>
                      <th className="p-2 w-24">Fecha</th>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 w-24">Factura</th>
                      <th className="p-2 w-20 text-right">Exenta</th>
                      <th className="p-2 w-20 text-right">Gravada</th>
                      <th className="p-2 w-20 text-right">ISV 15%</th>
                      <th className="p-2 w-24 text-right bg-emerald-50 text-emerald-950 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-[10px] text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-2 font-mono text-slate-700">{f.fecha}</td>
                        <td className="p-2 font-medium text-slate-900 truncate max-w-[180px]">{f.descripcion}</td>
                        <td className="p-2 font-mono text-slate-600">{f.factura || '-'}</td>
                        <td className="p-2 text-right font-mono text-slate-600">{f.exenta.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-slate-600">{f.gravada.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-slate-600">{f.isv15.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50">
                          L. {f.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              setRawText('');
              setFilas([]);
            }}
            disabled={filas.length === 0}
            className="px-3 py-2 text-slate-500 hover:text-rose-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleImportarLote}
              disabled={guardando || filas.length === 0}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importando {filas.length} registros...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Importar {filas.length} registros</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
