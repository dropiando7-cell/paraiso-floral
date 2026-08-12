'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Hash, ShieldAlert, Sparkles, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { getOrdenesDeActivo } from '@/app/(dashboard)/soporte/actions';
import { toast } from 'react-hot-toast';

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
  clienteId?: string;
  clienteNombre?: string;
  selectedEquipoIds?: string[];
  clientesList?: any[];
}

export default function ReportConfigModal({
  isOpen,
  onClose,
  activoId,
  activoIdQr = 'N/A',
  currentOrderId,
  currentOrderCode,
  allowOnlyCurrent = false,
  clienteId,
  clienteNombre,
  selectedEquipoIds = [],
  clientesList = []
}: ReportConfigModalProps) {
  const [selectedClienteId, setSelectedClienteId] = useState(
    clienteId || (clientesList && clientesList.length > 0 ? clientesList[0].id : '')
  );

  useEffect(() => {
    if (clienteId) {
      setSelectedClienteId(clienteId);
    } else if (clientesList && clientesList.length > 0 && !selectedClienteId) {
      setSelectedClienteId(clientesList[0].id);
    }
  }, [clienteId, clientesList]);

  const currentClienteObj = clientesList.find(c => c.id === selectedClienteId);
  const activeClienteNombre = currentClienteObj?.nombre || clienteNombre || '';

  const [reportType, setReportType] = useState<'full' | 'range' | 'order' | 'current' | 'clientFull'>(
    clienteId || selectedClienteId ? 'clientFull' : (allowOnlyCurrent && currentOrderId ? 'current' : 'full')
  );
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ordenCodigo, setOrdenCodigo] = useState(currentOrderCode || '');
  const [mostrarFirmas, setMostrarFirmas] = useState(true);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [selectedOrdenId, setSelectedOrdenId] = useState('');
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);

  // Estado para la barra de progreso y URL descargada del PDF
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('Iniciando...');
  const [completedBlobUrl, setCompletedBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && (activoId || activoIdQr) && activoIdQr !== 'N/A') {
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(10);
    setProgressStep('Consultando órdenes de trabajo y repuestos del cliente...');
    setCompletedBlobUrl(null);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 40) {
          setProgressStep('Procesando imágenes, fotos y firmas digitales...');
          return prev + 12;
        } else if (prev < 75) {
          setProgressStep('Compilando reporte técnico unificado en PDF...');
          return prev + 8;
        } else if (prev < 94) {
          setProgressStep('Optimizando documento final...');
          return prev + 2;
        }
        return prev;
      });
    }, 450);

    try {
      const params = new URLSearchParams();
      params.set('type', 'historial');
      params.set('mostrarFirmas', mostrarFirmas ? 'true' : 'false');

      const activeClienteId = selectedClienteId || clienteId;

      if (reportType === 'clientFull' || activeClienteId) {
        params.set('clientUnified', 'true');
        if (activeClienteId) params.set('clienteId', activeClienteId);
        if (selectedEquipoIds.length > 0) params.set('equipoIds', selectedEquipoIds.join(','));
      }

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
      let targetId = '';
      if (reportType === 'clientFull' || (activeClienteId && reportType !== 'current' && reportType !== 'order')) {
        targetId = activeClienteId ? `client-${activeClienteId}` : 'client-unified';
      } else if (reportType === 'current' && currentOrderId) {
        targetId = currentOrderId;
      } else if (reportType === 'order' && selectedOrdenId) {
        targetId = selectedOrdenId;
      } else {
        targetId = activoId || (activoIdQr && activoIdQr !== 'N/A' ? activoIdQr : '');
      }

      if (!targetId || targetId === 'N/A') {
        targetId = activeClienteId ? `client-${activeClienteId}` : 'unified';
      }

      const safeTargetId = encodeURIComponent(targetId.replace(/\//g, '_'));
      const pdfUrl = `/api/pdf/${safeTargetId}?${params.toString()}`;

      // Descarga asíncrona mediante fetch manteniendo al usuario en la página actual
      const res = await fetch(pdfUrl);
      if (!res.ok) {
        throw new Error('Error al generar el reporte en el servidor.');
      }

      const blob = await res.blob();
      clearInterval(interval);
      setProgress(100);
      setProgressStep('¡Documento generado con éxito!');

      const blobUrl = URL.createObjectURL(blob);
      setCompletedBlobUrl(blobUrl);

    } catch (err: any) {
      clearInterval(interval);
      setIsGenerating(false);
      setProgress(0);
      setCompletedBlobUrl(null);
      console.error(err);
      toast.error(err.message || 'Error al generar el reporte PDF.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl p-6 relative max-w-md w-full border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        {(!isGenerating || completedBlobUrl) && (
          <button 
            onClick={() => {
              setIsGenerating(false);
              setProgress(0);
              setCompletedBlobUrl(null);
              onClose();
            }} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-all active:scale-90"
          >
            <X className="w-5 h-5"/>
          </button>
        )}

        {isGenerating ? (
          /* MODAL INTERACTIVO DE PROGRESO Y GENERACIÓN DE PDF */
          completedBlobUrl ? (
            /* COMPLETADO: BOTÓN DIRECTO SI POPUP FUE BLOQUEADO O SE DESEA RE-ABRIR */
            <div className="flex flex-col items-center justify-center py-4 px-2 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-800 tracking-tight">
                  ¡Reporte Técnico Generado!
                </h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  El documento PDF se compiló exitosamente.
                </p>
              </div>

              <div className="w-full flex flex-col gap-2.5 pt-2">
                <a
                  href={completedBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#0500A3] hover:bg-[#0500A3]/90 text-white font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>Visualizar Reporte PDF</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setIsGenerating(false);
                    setProgress(0);
                    setCompletedBlobUrl(null);
                    onClose();
                  }}
                  className="w-full text-slate-500 hover:text-slate-700 font-bold text-xs py-2 transition cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-2 text-center space-y-6 animate-in fade-in duration-200">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-[#0500A3]/10 flex items-center justify-center text-[#0500A3] shadow-inner">
                  <FileText className="w-10 h-10 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 rounded-full p-1.5 shadow-md animate-bounce">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h4 className="text-base font-black text-slate-800 tracking-tight">
                  Generando Reporte Técnico
                </h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {activeClienteNombre ? `Cliente: ${activeClienteNombre}` : 'Compilando órdenes de trabajo'}
                </p>
              </div>

              {/* Barra de Progreso Animada */}
              <div className="w-full space-y-2.5">
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
                  <div 
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-[#0500A3] h-full rounded-full transition-all duration-300 shadow-sm" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#0500A3] font-semibold flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {progressStep}
                  </span>
                  <span className="text-slate-500 font-mono font-black">{progress}%</span>
                </div>
              </div>
            </div>
          )
        ) : (
          /* FORMULARIO DE CONFIGURACIÓN */
          <>

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
                onClick={() => setReportType('clientFull')}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                  reportType === 'clientFull'
                    ? 'border-[#0500A3] bg-[#0500A3]/5 text-[#0500A3]'
                    : 'border-slate-200 hover:border-slate-350 bg-white text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  reportType === 'clientFull' ? 'border-[#0500A3] bg-[#0500A3]' : 'border-slate-300'
                }`}>
                  {reportType === 'clientFull' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold">Historial Unificado del Cliente (Todas sus Órdenes)</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Un único reporte compilado con todas las órdenes de trabajo del cliente {activeClienteNombre ? `(${activeClienteNombre})` : ''}.
                  </div>
                </div>
              </button>

              {reportType === 'clientFull' && clientesList && clientesList.length > 0 && (
                <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-1.5 duration-200">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Cliente a Generar:</label>
                  <select
                    value={selectedClienteId}
                    onChange={e => setSelectedClienteId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0500A3] cursor-pointer"
                  >
                    {clientesList.map(cli => (
                      <option key={cli.id} value={cli.id}>
                        {cli.nombre} {cli.equipos ? `(${cli.equipos.length} equipos registrados)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
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
        </>
        )}

      </div>
    </div>
  );
}
