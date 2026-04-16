'use client';

import React, { useState } from 'react';
import { Send, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface HistoryItem {
  id: string;
  time: string;
  to: string;
  nombre: string;
  status: 'success' | 'error';
  message?: string;
  sid?: string;
  error?: string;
}

const TEMPLATES = [
  {
    label: 'Factura lista',
    text: 'Tu factura está lista para pago. Por favor revisa los detalles en nuestro portal.',
  },
  {
    label: 'Renta activa',
    text: 'Tu equipo de renta ya está activo. Gracias por tu preferencia.',
  },
  {
    label: 'Mantenimiento programado',
    text: 'Recordatorio: Tienes un mantenimiento programado para tu equipo en los próximos días.',
  },
  {
    label: 'Pago recibido',
    text: 'Hemos recibido tu pago exitosamente. ¡Gracias!',
  },
];

export default function DebugWhatsappPage() {
  const [nombre, setNombre] = useState('Cliente Prueba');
  const [telefono, setTelefono] = useState('+50494897451');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTemplateClick = (text: string) => {
    setMensaje(text);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!telefono || !mensaje) {
      setResultMessage({ type: 'error', text: 'Teléfono y mensaje son obligatorios.' });
      return;
    }

    setLoading(true);
    setResultMessage(null);

    const now = new Date();
    const timeString = now.toLocaleTimeString();

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefono,
          nombre,
          mensaje,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setResultMessage({ type: 'success', text: `Mensaje enviado. SID: ${data.sid}` });
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            time: timeString,
            to: telefono,
            nombre,
            status: 'success',
            sid: data.sid,
            message: data.finalMessage || mensaje,
          },
          ...prev,
        ]);
      } else {
        setResultMessage({ type: 'error', text: `Error: ${data.error}` });
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            time: timeString,
            to: telefono,
            nombre,
            status: 'error',
            error: data.error,
            message: mensaje,
          },
          ...prev,
        ]);
      }
    } catch (error: any) {
      setResultMessage({ type: 'error', text: `Error de red: ${error.message}` });
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          time: timeString,
          to: telefono,
          nombre,
          status: 'error',
          error: error.message,
          message: mensaje,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Debug WhatsApp</h1>
          <p className="text-gray-500 mt-2">Módulo de pruebas para la integración de Twilio WhatsApp REST API.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Nuevo Mensaje
            </h2>
            
            <form onSubmit={handleSend} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Nombre del destinatario</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Teléfono (WhatsApp)</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Ej. +50494897451"
                  />
                  <p className="text-xs text-gray-500">Si no incluye '+', se asume Honduras (+504)</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Plantillas rápidas</label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTemplateClick(t.text)}
                      className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full hover:bg-green-100 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Mensaje a enviar</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors min-h-[120px] resize-y"
                  placeholder="Escribe tu mensaje aquí..."
                  required
                />
              </div>

              {resultMessage && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${resultMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {resultMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <span className="text-sm break-all">{resultMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg shadow-sm shadow-green-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar WhatsApp
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Historial */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full max-h-[800px]">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Historial de Sesión
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 py-12">
                  <Send className="w-12 h-12 opacity-20" />
                  <p className="text-sm">No hay mensajes recientes en esta sesión.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm space-y-2 relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800">{item.nombre}</span>
                      <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                    <div className="text-gray-600 text-xs">
                      Destino: <span className="font-medium text-gray-700">{item.to}</span>
                    </div>
                    <div className="bg-white border border-gray-100 p-2 text-xs text-gray-600 rounded whitespace-pre-wrap break-words italic">
                      "{item.message}"
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {item.status === 'success' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-green-700 text-xs font-medium">Enviado</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700 text-xs font-medium">Error</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono flex items-center" title={item.sid || item.error}>
                        {item.sid ? `SID: ${item.sid.substring(0, 16)}...` : 'Fallo el envío'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
