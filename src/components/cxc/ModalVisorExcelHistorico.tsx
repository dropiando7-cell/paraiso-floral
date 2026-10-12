import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ModalVisorExcelHistoricoProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNombre: string;
}

export default function ModalVisorExcelHistorico({
  isOpen,
  onClose,
  clienteNombre
}: ModalVisorExcelHistoricoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadExcel();
    } else {
      // Reset state when closed
      setSheetData([]);
      setSelectedSheet('');
      setError(null);
    }
  }, [isOpen, clienteNombre]);

  const loadExcel = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/documentos/historico_occidente.xlsx');
      if (!response.ok) throw new Error('No se pudo encontrar el archivo histórico.');
      
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'buffer' });
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      
      // Try to find the exact or partial match for the client name
      const targetName = clienteNombre.toLowerCase().trim();
      let bestMatch = wb.SheetNames.find(s => s.toLowerCase().trim() === targetName);
      
      if (!bestMatch) {
        bestMatch = wb.SheetNames.find(s => s.toLowerCase().includes(targetName) || targetName.includes(s.toLowerCase()));
      }

      if (bestMatch) {
        handleSheetChange(bestMatch, wb);
      } else if (wb.SheetNames.length > 0) {
        // If not found, select the first one but show a warning maybe
        handleSheetChange(wb.SheetNames[0], wb);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = (sheetName: string, wbToUse: XLSX.WorkBook | null = workbook) => {
    setSelectedSheet(sheetName);
    if (!wbToUse) return;
    
    try {
      const worksheet = wbToUse.Sheets[sheetName];
      // Convert to array of arrays (header: 1)
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      setSheetData(data);
    } catch (err) {
      setError('Error al leer los datos de la pestaña.');
      setSheetData([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Visor de Historial Excel (Occidente)</h2>
              <p className="text-xs font-semibold text-slate-500">Consulta de registros anteriores a la migración</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50">
          
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-600">Cargando archivo histórico...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <p className="text-rose-600 font-bold">{error}</p>
              <button 
                onClick={loadExcel} 
                className="px-4 py-2 mt-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {/* Sheet Selector */}
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shrink-0 shadow-sm">
                <label className="text-xs font-bold text-slate-700 shrink-0">
                  Pestaña seleccionada (Cliente):
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="flex-1 text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sheets.map(sheet => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
                {selectedSheet && !selectedSheet.toLowerCase().includes(clienteNombre.toLowerCase()) && (
                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    ⚠️ Esta pestaña podría no coincidir con {clienteNombre}
                  </span>
                )}
              </div>

              {/* Table Viewer */}
              <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-inner">
                {sheetData.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    La pestaña está vacía o no se pudo leer.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                      <tr>
                        {/* Render headers from the first row assuming it's the longest or just loop through max columns */}
                        {Array.from({ length: Math.max(...sheetData.map(row => row.length || 0)) }).map((_, i) => (
                          <th key={i} className="px-3 py-2 border-b border-r border-slate-200 font-bold text-slate-700 last:border-r-0">
                            Col {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sheetData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-blue-50/50">
                          {Array.from({ length: Math.max(...sheetData.map(r => r.length || 0)) }).map((_, colIndex) => {
                            const cellValue = row[colIndex];
                            // Format number if it's a number
                            const displayValue = typeof cellValue === 'number' 
                              ? cellValue.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : (cellValue?.toString() || '');
                            
                            return (
                              <td key={colIndex} className="px-3 py-2 border-r border-slate-100 last:border-r-0 text-slate-600">
                                {displayValue}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
