'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Hash, ShieldAlert, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { getOrdenesDeActivo } from '@/app/(dashboard)/soporte/actions';

const formatDateString = (dateInput: Date | string) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  // Shift -6 hours for Honduras time (LATAM format)
  const localTime = d.getTime() - (6 * 60 * 60 * 1000);
  const date = new Date(localTime);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

interface ReportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  activoId?: string;
  activoIdQr?: string;
  currentOrderId?: string;
  currentOrderCode?: string;
  allowOnlyCurrent?: boolean;
}

export default function ReportConfigModal({
  isOpen,
  onClose,
  activoId,
  activoIdQr = 'N/A',
  currentOrderId,
  currentOrderCode,
  allowOnlyCurrent = false
}: ReportConfigModalProps) {
  const [reportType, setReportType] = useState<'full' | 'range' | 'order' | 'current'>(
    allowOnlyCurrent && currentOrderId ? 'current' : 'full'
  );
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ordenCodigo, setOrdenCodigo] = useState(currentOrderCode || '');
  const [mostrarFirmas, setMostrarFirmas] = useState(true);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [selectedOrdenId, setSelectedOrdenId] = useState('');
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);

  useEffect(() => {
    if (isOpen && (activoId || activoIdQr)) {
      const loadOrdenes = async () => {
        setLoadingOrdenes(true);
        try {
          const res = await getOrdenesDeActivo(activoId || activoIdQr);
          if (res.success && res.ordenes) {
            setOrdenes(res.ordenes);
            // Pre-select current order if it matches
            if (currentOrderId && res.ordenes.some((o: any) => o.id === currentOrderId)) {
              setSelectedOrdenId(currentOrderId);
            } else if (res.ordenes.length > 0) {
              setSelectedOrdenId(res.ordenes[0].id);
            }
          }
        } catch (err) {
          console.error("Error fetching orders in ReportConfigModal:", err);
        } finally {
          setLoadingOrdenes(false);
        }
      };
      loadOrdenes();
    }
  }, [isOpen, activoId, activoIdQr, currentOrderId]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    const params = new URLSearchParams();
    params.set('type', 'historial');
    params.set('mostrarFirmas', mostrarFirmas ? 'true' : 'false');

    if (reportType === 'range') {
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
    } else if (reportType === 'order') {
      if (selectedOrdenId) {
        params.set('onlyCurrent', 'true');
        params.set('currentOrderId', selectedOrdenId);
      }
    } else if (reportType === 'current' && currentOrderId) {
      params.set('onlyCurrent', 'true');
      params.set('currentOrderId', currentOrderId);
    }

    // Determine target ID
    const targetId = (reportType === 'current' && currentOrderId) ? currentOrderId : currentOrderId || activoId || '';
    
    // We open the PDF URL in a new window/tab
    const pdfUrl = `/api/pdf/${targetId || activoIdQr}?${params.toString()}`;
    window.open(pdfUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl p-6 relative max-w-md w-full border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-all active:scale-90"
        >
          <X className="w-5 h-5"/>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0500A3]/10 p-3 rounded-2xl">
            <FileText className="w-6 h-6 text-[#0500A3]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 leading-tight">Configurar Reporte Técnico</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Equipo: <span className="font-mono font-bold text-[#0500A3] bg-[#0500A3]/5 px-2 py-0.5 rounded">{activoIdQr}</span>
            </p>
          </div>
        </div>

        {/* Form Options */}
        <div className="space-y-4 text-left">
          
          {/* Tipo de Reporte */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
              ¿Qué deseas incluir en el reporte?
            </label>
            <div className="grid grid-cols-1 gap-2">
              
              {allowOnlyCurrent && currentOrderId && (
                <button
                  type="button"
                  onClick={() => setReportType('current')}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                    reportType === 'current'
                      ? 'border-[#0500A3] bg-[#0500A3]/5 text-[#0500A3]'
                      : 'border-slate-200 hover:border-slate-350 bg-white text-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    reportType === 'current' ? 'border-[#0500A3] bg-[#0500A3]' : 'border-slate-300'
                  }`}>
                    {reportType === 'current' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">Solo Orden de Trabajo Actual</div>
                    <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      Únicamente la orden #{currentOrderCode || 'actual'} con sus detalles.
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setReportType('full')}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                  reportType === 'full'
                    ? 'border-[#0500A3] bg-[#0500A3]/5 text-[#0500A3]'
                    : 'border-slate-200 hover:border-slate-350 bg-white text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  reportType === 'full' ? 'border-[#0500A3] bg-[#0500A3]' : 'border-slate-300'
                }`}>
                  {reportType === 'full' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold">Historial Completo (Unificado)</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Todas las órdenes de trabajo realizadas en la vida del equipo.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('range')}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                  reportType === 'range'
                    ? 'border-[#0500A3] bg-[#0500A3]/5 text-[#0500A3]'
                    : 'border-slate-200 hover:border-slate-350 bg-white text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  reportType === 'range' ? 'border-[#0500A3] bg-[#0500A3]' : 'border-slate-300'
                }`}>
                  {reportType === 'range' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold">Filtrar por Rango de Fechas</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Sólo órdenes recibidas dentro de un período específico.
                  </div>
                </div>
              </button>

              {reportType === 'range' && (
                <div className="grid grid-cols-2 gap-2 mt-1 px-1 py-1.5 bg-slate-50 rounded-xl border border-slate-150/60 animate-in slide-in-from-top-1.5 duration-200">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Desde:</label>
                    <input 
                      type="date"
                      value={desde}
                      onChange={e => setDesde(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0500A3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Hasta:</label>
                    <input 
                      type="date"
                      value={hasta}
                      onChange={e => setHasta(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0500A3]"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setReportType('order')}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                  reportType === 'order'
                    ? 'border-[#0500A3] bg-[#0500A3]/5 text-[#0500A3]'
                    : 'border-slate-200 hover:border-slate-350 bg-white text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  reportType === 'order' ? 'border-[#0500A3] bg-[#0500A3]' : 'border-slate-300'
                }`}>
                  {reportType === 'order' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold">Seleccionar Orden Específica</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Elige una orden de la lista cronológica para imprimir únicamente esa.
                  </div>
                </div>
              </button>

              {reportType === 'order' && (
                <div className="px-1 py-1.5 bg-slate-50 rounded-xl border border-slate-150/60 animate-in slide-in-from-top-1.5 duration-200">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Orden de Trabajo:</label>
                  {loadingOrdenes ? (
                    <div className="flex items-center justify-center p-3 text-xs text-slate-400 font-medium">
                      Cargando órdenes...
                    </div>
                  ) : ordenes.length === 0 ? (
                    <div className="flex items-center justify-center p-3 text-xs text-red-500 font-bold">
                      No se encontraron órdenes para este equipo.
                    </div>
                  ) : (
                    <select
                      value={selectedOrdenId}
                      onChange={e => setSelectedOrdenId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-750 focus:outline-none focus:border-[#0500A3] cursor-pointer"
                    >
                      {ordenes.map(o => (
                        <option key={o.id} value={o.id}>
                          {`Orden #${o.codigoSeguridad || 'Sin Código'} — ${formatDateString(o.fechaRecibido)}${o.id === currentOrderId ? ' (Actual)' : ''}${o.equipoDano ? ` [${o.equipoDano.slice(0, 20)}${o.equipoDano.length > 20 ? '...' : ''}]` : ''}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Firmas de Conformidad */}
          <div className="border-t border-slate-150/60 pt-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl">
              <div>
                <label className="text-xs font-bold text-slate-750 block">Incluir Firmas y Sellos</label>
                <span className="text-[10px] text-slate-400 font-medium">Mostrar firmas digitales de clientes y técnicos en el PDF.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={mostrarFirmas}
                  onChange={e => setMostrarFirmas(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0500A3]"></div>
              </label>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex gap-2.5 mt-2 border-t border-slate-150/60 pt-4">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs py-3 rounded-2xl active:scale-95 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            onClick={handleGenerate}
            className="flex-[2] flex items-center justify-center gap-1.5 py-3 bg-[#0500A3] hover:bg-[#0500A3]/90 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all shadow-md shadow-[#0500A3]/10 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Generar PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
}
