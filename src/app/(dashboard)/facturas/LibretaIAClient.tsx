'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, AlertCircle, Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ClienteSearchSwitcher from '@/components/cxc/ClienteSearchSwitcher';
import { guardarDocumentoBuilder } from './actions';

interface Props {
  organization: any;
  userRole?: string;
  userAccessibleModules?: string[];
}

export default function LibretaIAClient({ organization }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProcess = async () => {
    if (!selectedClienteId) {
      toast.error('Por favor selecciona un cliente primero');
      return;
    }
    if (!text.trim()) {
      toast.error('Por favor ingresa el texto del pedido');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/libreta-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const aiData = await res.json();
      if (aiData.error) throw new Error(aiData.error);

      // Calcular totales
      let subTotal = 0;
      const validItems = (aiData.items || []).map((item: any, idx: number) => {
        const lineTotal = (item.cantidad || 1) * (item.precioUnitario || 0);
        subTotal += lineTotal;
        return {
          id: `ai-item-${idx}`,
          code: '',
          shortDesc: item.descripcion,
          longDesc: '',
          richDesc: '',
          showLongDesc: false,
          qty: item.cantidad || 1,
          unitPrice: item.precioUnitario || 0,
          tax: 'EXENTO', // Por defecto exento para líneas libres, se puede editar luego
          discount: 0,
          discountType: 'percentage',
        };
      });

      const data = {
        clienteId: selectedClienteId,
        tipoDocumento: 'COTIZACION',
        notas: aiData.notas || '',
        terminosPago: 'Contado',
        metodoPago: 'Efectivo',
        transferenciaConfirmada: false,
        validezDias: 15,
        subTotal: subTotal,
        descuentos: 0,
        totalExento: subTotal, // Todo exento por defecto
        totalExonerado: 0,
        totalGravado15: 0,
        isv15: 0,
        totalGravado18: 0,
        isv18: 0,
        total: subTotal,
      };

      const result = await guardarDocumentoBuilder(data, validItems);
      if (result.success && result.docId) {
        toast.success('¡Cotización generada exitosamente!');
        router.push(`/facturas/ver/${result.docId}?whatsapp=true`);
      } else {
        throw new Error(result.error || 'Error al guardar la cotización');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Ocurrió un error al procesar el pedido con IA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-2 sm:p-6 fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Sparkles className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Libreta Mágica IA</h2>
            </div>
            <p className="text-fuchsia-100 font-medium max-w-lg leading-relaxed">
              Pega la lista del pedido de WhatsApp aquí. La IA lo leerá, extraerá los productos, y generará una cotización lista para compartir.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Cliente Selection */}
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span>1. ¿Para quién es este pedido?</span>
            </label>
            <div className="relative">
              <ClienteSearchSwitcher 
                currentClienteId={selectedClienteId || undefined}
                currentClienteNombre={selectedCliente?.nombre}
                onSelectCliente={(id, cliente) => {
                  setSelectedClienteId(id);
                  setSelectedCliente(cliente);
                }}
                placeholder="Buscar o seleccionar cliente..."
                className="w-full text-base"
              />
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span>2. Pega el pedido aquí</span>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const clipboardText = await navigator.clipboard.readText();
                    setText(clipboardText);
                    toast.success('Texto pegado del portapapeles');
                  } catch (e) {
                    toast.error('No se pudo acceder al portapapeles');
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-fuchsia-600 hover:text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg transition-colors font-bold"
              >
                <Copy className="w-3.5 h-3.5" />
                Pegar
              </button>
            </label>
            <div className="relative group">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ejemplo:&#10;1 Lirios blancos 350&#10;2 Gerberas rosadas 189 c/u&#10;1 envio 250"
                className="w-full h-64 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none transition-all resize-none text-slate-700 font-medium placeholder:text-slate-400"
              />
              {!text && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50 group-focus-within:opacity-0 transition-opacity">
                  <div className="text-center space-y-2">
                    <Share2 className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-500">Pega directo desde WhatsApp</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <AlertCircle className="w-4 h-4 text-fuchsia-500" />
            La IA usará líneas libres (productos sin código).
          </div>
          <button
            type="button"
            onClick={handleProcess}
            disabled={isLoading || !text.trim() || !selectedClienteId}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generando Cotización...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
                <span>Convertir a Cotización</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
