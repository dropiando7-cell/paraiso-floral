'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  Square, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  Volume2, 
  User, 
  MapPin, 
  Package, 
  Clock,
  Loader2,
  Edit3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { playWarehouseAlertChime, playSuccessChime, triggerHaptic } from '@/utils/audioAlerts';
import { crearPedido } from '@/app/(dashboard)/inventario-ventas/pedidos/actions';

interface VoiceOrderAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsedOrder?: (orderData: any) => void;
  onOrderCreated?: (pedidoId: string, codigoPedido: string) => void;
  assistants?: { id: string; nombre: string }[];
}

export function VoiceOrderAssistantModal({
  isOpen,
  onClose,
  onParsedOrder,
  onOrderCreated,
  assistants = []
}: VoiceOrderAssistantModalProps) {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setParsedData(null);
      setErrorMessage(null);
      setRecordingSeconds(0);
      setIsRecording(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Start voice recording
  const startRecording = async () => {
    setErrorMessage(null);
    setParsedData(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Try lightweight mime types for compression
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Default
          }
        }
      }

      const options = mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        await processAudio(audioBlob);
      };

      // Collect data every 500ms
      mediaRecorder.start(500);
      setIsRecording(true);
      setRecordingSeconds(0);
      triggerHaptic(50);

      // Start timer with 60s max limit
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Error accediendo al micrófono:', err);
      setErrorMessage('No se pudo acceder al micrófono. Por favor concede permisos de audio en tu navegador.');
      toast.error('Permiso de micrófono denegado');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      triggerHaptic(40);
    }
  };

  // Process audio with backend Gemini 2.5 route
  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'order_audio.webm');

      const resp = await fetch('/api/pedidos/voice-ai', {
        method: 'POST',
        body: formData
      });

      const data = await resp.json();

      if (!resp.ok || data.error) {
        throw new Error(data.error || 'Error al procesar el dictado con el asistente de IA');
      }

      setParsedData(data);
      playWarehouseAlertChime();
      toast.success('¡Pedido interpretado con éxito!');

    } catch (err: any) {
      console.error('Error en processAudio:', err);
      setErrorMessage(err.message || 'Error al interpretar el audio');
      toast.error('Error al procesar audio');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Direct Order Creation
  const handleCreateDirectly = async () => {
    if (!parsedData) return;

    if (!parsedData.matchedCliente?.id) {
      toast.error('No se pudo mapear un cliente registrado. Usa "Editar en Formulario" para seleccionarlo.');
      return;
    }

    const unmappedItem = parsedData.items.find((i: any) => !i.productoId);
    if (unmappedItem) {
      toast.error(`El ítem "${unmappedItem.nombreProducto}" no coincide con el inventario. Usa "Editar en Formulario".`);
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        clienteId: parsedData.matchedCliente.id,
        destino: parsedData.destino || 'Retiro en Tienda',
        estadoPago: parsedData.estadoPago || 'contra_entrega',
        notas: parsedData.notas ? `(Dictado por Voz) ${parsedData.notas}` : '(Dictado por Voz con IA)',
        items: parsedData.items.map((i: any) => ({
          productoId: i.productoId,
          nombreProducto: i.nombreProducto,
          variedadTono: i.variedadTono || undefined,
          codigoBarras: i.sku || undefined,
          cantidadSolicitada: i.cantidadSolicitada
        }))
      };

      const result = await crearPedido(payload);

      if (result.success) {
        playSuccessChime();
        toast.success(`¡Pedido ${result.codigoPedido} creado exitosamente!`);
        if (onOrderCreated && result.pedidoId) {
          onOrderCreated(result.pedidoId, result.codigoPedido!);
        }
        onClose();
        router.refresh();
      } else {
        toast.error(result.error || 'Error al guardar el pedido');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setIsCreating(false);
    }
  };

  // Transfer data to NuevoPedido form
  const handleEditInForm = () => {
    if (!parsedData) return;
    if (onParsedOrder) {
      onParsedOrder(parsedData);
      onClose();
    } else {
      // If we are in another page, save to sessionStorage and redirect
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('voiceParsedOrder', JSON.stringify(parsedData));
      }
      onClose();
      router.push('/inventario-ventas/pedidos/nuevo?source=voice');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-250">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight leading-tight">Asistente de Pedidos por Voz</h3>
              <p className="text-[11px] text-blue-100 font-medium">Potenciado por Gemini 2.5 Multimodal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">

          {/* STATE 1: Initial or Recording */}
          {!parsedData && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              
              {/* Animated Glowing Mic Circle */}
              <div className="relative my-4">
                {isRecording && (
                  <>
                    <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-ping" />
                    <div className="absolute -inset-8 rounded-full bg-indigo-500/15 animate-pulse duration-1000" />
                  </>
                )}

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
                    isRecording
                      ? 'bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-red-500/40 ring-4 ring-red-200 animate-pulse'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/40 hover:scale-105'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-10 h-10 fill-current" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </button>
              </div>

              {/* Status / Timer Text */}
              {isRecording ? (
                <div className="mt-4 flex flex-col items-center">
                  <div className="flex items-center gap-2 text-rose-600 font-black text-lg tracking-wider">
                    <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                    <span>00:{recordingSeconds.toString().padStart(2, '0')} / 00:60</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Habla claro dictando cliente, destino y productos. Toca el botón rojo al terminar.
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center max-w-sm">
                  <h4 className="text-base font-black text-slate-800">Toca el micrófono para dictar</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Ejemplo: <span className="italic font-bold text-slate-700">"Pedido para Floristería La Rosa, enviar a Tegucigalpa, pago contra entrega, 10 paquetes de rosas rojas y 5 girasoles"</span>
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="mt-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 max-w-md">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* STATE 2: Processing AI */}
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black animate-bounce">
                  ✨
                </div>
              </div>
              <h4 className="text-base font-black text-slate-900 mt-4">Interpretando tu audio...</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs font-medium">
                Gemini 2.5 está extrayendo los productos, cantidades y cruzando los datos con el inventario de Paraíso Floral.
              </p>
            </div>
          )}

          {/* STATE 3: Result Preview & Confirmation */}
          {parsedData && !isProcessing && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              
              {/* Dictation Summary Banner */}
              {parsedData.resumenDictado && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-start gap-2.5">
                  <Volume2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider">Audio Interpretado</span>
                    <p className="text-xs font-bold text-slate-800 italic mt-0.5">"{parsedData.resumenDictado}"</p>
                  </div>
                </div>
              )}

              {/* Order Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Cliente */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Cliente</span>
                    {parsedData.matchedCliente ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Registrado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                        Nuevo / No Registrado
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {parsedData.matchedCliente?.nombre || parsedData.clienteNombre || 'Sin especificar'}
                  </p>
                </div>

                {/* Destino & Pago */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Destino y Pago</span>
                  <p className="text-xs font-extrabold text-slate-800 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" /> {parsedData.destino || 'Retiro en Tienda'}
                  </p>
                  <div className="mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-[10px] font-extrabold text-slate-700 uppercase">
                      {parsedData.estadoPago.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">Productos Detectados ({parsedData.items.length})</span>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Stock CEDI</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {parsedData.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 truncate">{item.nombreProducto}</span>
                          {item.variedadTono && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                              {item.variedadTono}
                            </span>
                          )}
                        </div>
                        {item.productoId ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Catálogo: {item.sku}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3" /> No mapeado en catálogo
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-slate-900">{item.cantidadSolicitada} Paq.</span>
                        {item.stockActual !== undefined && (
                          <p className="text-[10px] font-bold text-slate-400">Disp: {item.stockActual}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {parsedData.notas && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600 italic">
                  Nota: {parsedData.notas}
                </div>
              )}

              {/* Retry button */}
              <div className="flex justify-center mt-1">
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Dictar de nuevo
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {parsedData && !isProcessing && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleEditInForm}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-300 hover:bg-white text-slate-800 text-xs font-bold transition-all"
            >
              <Edit3 className="w-4 h-4" /> Editar en Formulario
            </button>
            <button
              onClick={handleCreateDirectly}
              disabled={isCreating}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isCreating ? 'Creando Pedido...' : 'Crear Pedido Directo'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// Dedicated Floating Mic Action Button (Inspired by Image 2)
export function FloatingVoiceOrderButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/35 hover:scale-110 active:scale-95 flex items-center justify-center transition-all duration-300 group"
      title="Dictar Pedido con IA (Gemini 2.5)"
    >
      <div className="absolute -inset-1 rounded-full bg-blue-400/30 animate-ping pointer-events-none group-hover:block" />
      <Mic className="w-7 h-7 stroke-[2.2] group-hover:rotate-6 transition-transform" />
    </button>
  );
}
