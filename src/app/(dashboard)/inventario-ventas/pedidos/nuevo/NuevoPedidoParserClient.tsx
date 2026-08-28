'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowLeft, 
  Upload, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  PlusCircle,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { crearPedido } from '../actions';
import { toast } from 'react-hot-toast';

interface NuevoPedidoParserClientProps {
  dbUser: any;
  assistants: { id: string; nombre: string; avatar?: string }[];
  products: { id: string; nombre: string; sku: string; stockActual: number }[];
  clients: { id: string; nombre: string; telefono: string; direccion: string }[];
}

interface ParsedItem {
  nombreProducto: string;
  variedadTono?: string;
  cantidadSolicitada: number;
  mappedProductoId?: string; // Mapped product in DB
}

export default function NuevoPedidoParserClient({
  dbUser,
  assistants,
  products,
  clients
}: NuevoPedidoParserClientProps) {
  const router = useRouter();
  const [creationMode, setCreationMode] = useState<'ia' | 'manual'>('manual');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states loaded from AI
  const [hasParsedData, setHasParsedData] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [clienteNombreAI, setClienteNombreAI] = useState('');
  const [destino, setDestino] = useState('');
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'contra_entrega' | 'credito'>('contra_entrega');
  const [auxiliarAsignadoId, setAuxiliarAsignadoId] = useState('');
  const [notas, setNotas] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([{ nombreProducto: '', cantidadSolicitada: 1 }]);

  const toggleCreationMode = (mode: 'ia' | 'manual') => {
    setCreationMode(mode);
    if (mode === 'manual') {
      setClienteId('');
      setDestino('');
      setEstadoPago('contra_entrega');
      setNotas('');
      setParsedItems([{ nombreProducto: '', cantidadSolicitada: 1 }]);
    } else {
      setHasParsedData(false);
      setParsedItems([]);
    }
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setInputText(''); // Clear text when file is selected
    }
  };

  // Perform AI analysis
  const handleAnalyze = async () => {
    if (!inputText && !selectedFile) {
      toast.error('Por favor escribe un mensaje de WhatsApp o selecciona una foto de comanda.');
      return;
    }

    setIsAnalyzing(true);
    let imageUrl = '';

    try {
      // 1. Upload file if present
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('fileName', selectedFile.name);

        const uploadResp = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const uploadData = await uploadResp.json();
        if (!uploadResp.ok || uploadData.error) {
          throw new Error(uploadData.error || 'Error al subir la imagen');
        }

        imageUrl = uploadData.publicUrl;

        // If presigned URL returned, upload to R2
        if (uploadData.uploadUrl) {
          const putResp = await fetch(uploadData.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': selectedFile.type },
            body: selectedFile
          });
          if (!putResp.ok) throw new Error('Error al subir la imagen al almacenamiento R2');
        }
        setIsUploading(false);
      }

      // 2. Query parse-ai route
      const response = await fetch('/api/pedidos/parse-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText || undefined,
          imageUrl: imageUrl || undefined
        })
      });

      const parsedData = await response.json();
      if (!response.ok || parsedData.error) {
        throw new Error(parsedData.error || 'Error al analizar con IA');
      }

      // 3. Process result
      setClienteNombreAI(parsedData.clienteNombre || '');
      setDestino(parsedData.destino || '');
      setEstadoPago(parsedData.estadoPago || 'contra_entrega');
      setNotas(parsedData.notas || '');

      // Try to find a matching client by name
      if (parsedData.clienteNombre) {
        const matchedClient = clients.find(c => 
          c.nombre.toLowerCase().includes(parsedData.clienteNombre.toLowerCase())
        );
        if (matchedClient) {
          setClienteId(matchedClient.id);
          // If destination is empty, use client's address
          if (!parsedData.destino && matchedClient.direccion) {
            setDestino(matchedClient.direccion);
          }
        } else {
          setClienteId('');
        }
      }

      // Map parsed items and try to auto-match catalog products
      const itemsMapped: ParsedItem[] = (parsedData.items || []).map((item: any) => {
        // Try to match by product name in catalog
        const match = products.find(p => 
          p.nombre.toLowerCase().includes(item.nombreProducto.toLowerCase())
        );

        return {
          nombreProducto: item.nombreProducto,
          variedadTono: item.variedadTono,
          cantidadSolicitada: Number(item.cantidadSolicitada) || 1,
          mappedProductoId: match ? match.id : undefined
        };
      });

      setParsedItems(itemsMapped);
      setHasParsedData(true);
      toast.success('Pedido analizado correctamente por el motor IA');
    } catch (e: any) {
      toast.error(e.message || 'Error al procesar el pedido con IA');
    } finally {
      setIsAnalyzing(false);
      setIsUploading(false);
    }
  };

  // Map item product change
  const handleItemProductChange = (index: number, val: string) => {
    setParsedItems(prev => prev.map((item, idx) => 
      idx === index ? { ...item, mappedProductoId: val } : item
    ));
  };

  const handleItemQtyChange = (index: number, val: number) => {
    setParsedItems(prev => prev.map((item, idx) => 
      idx === index ? { ...item, cantidadSolicitada: val } : item
    ));
  };

  const handleDeleteItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItem = () => {
    setParsedItems(prev => [...prev, {
      nombreProducto: '',
      cantidadSolicitada: 1
    }]);
  };

  // Submit order
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId) {
      toast.error('Por favor selecciona un Cliente del catálogo');
      return;
    }

    if (!destino) {
      toast.error('Por favor escribe un lugar de destino');
      return;
    }

    // Verify all items are mapped to products
    const unmappedItem = parsedItems.find(item => !item.mappedProductoId);
    if (unmappedItem) {
      toast.error(`Por favor asocia el producto "${unmappedItem.nombreProducto || 'Nuevo'}" a un producto del catálogo.`);
      return;
    }

    if (parsedItems.length === 0) {
      toast.error('El pedido debe tener al menos un producto.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        clienteId,
        destino,
        estadoPago,
        auxiliarAsignadoId: auxiliarAsignadoId || undefined,
        notas: notas || undefined,
        items: parsedItems.map(item => {
          const prod = products.find(p => p.id === item.mappedProductoId);
          return {
            productoId: item.mappedProductoId!,
            nombreProducto: prod ? prod.nombre : item.nombreProducto,
            variedadTono: item.variedadTono,
            cantidadSolicitada: item.cantidadSolicitada
          };
        })
      };

      const result = await crearPedido(payload);
      if (result.success) {
        toast.success(`Pedido creado con éxito: ${result.codigoPedido}`);
        router.push('/inventario-ventas/pedidos');
      } else {
        toast.error(result.error || 'Error al guardar el pedido');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de red');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/inventario-ventas/pedidos')}
            className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {creationMode === 'manual' ? 'Nuevo Pedido Manual' : 'Creador de Pedidos IA'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {creationMode === 'manual' 
                ? 'Ingresa los datos del cliente y los productos solicitados' 
                : 'Parsea mensajes de WhatsApp o fotos de pedidos manuscritos'}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => toggleCreationMode('manual')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              creationMode === 'manual'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ✏️ Crear Manual
          </button>
          <button
            type="button"
            onClick={() => toggleCreationMode('ia')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              creationMode === 'ia'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            🤖 Importar con IA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Parser input (Only visible in IA mode) */}
        {creationMode === 'ia' && (
          <div className="lg:col-span-1 flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
              Asistente de Carga IA
            </h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Pega el texto del pedido copiado de WhatsApp o sube una fotografía del pedido escrito a mano en papel.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              {/* Input WhatsApp Text */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Texto de WhatsApp
                </label>
                <textarea
                  placeholder="Ej. 'Pedido floreria rosalia, enviar a occidente la esperanza. ocupo 5 paquetes de rosas rojas y 2 rollos de eucalipto, cobrar contra entrega porfa'"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setSelectedFile(null);
                  }}
                  disabled={isAnalyzing || !!selectedFile}
                  rows={6}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-800 bg-slate-50 font-medium placeholder-slate-400"
                />
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">o también</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* File upload handwritten order */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4" /> Comanda escrita a mano / Imagen
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isAnalyzing || !!inputText}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors mb-2" />
                  <span className="text-xs font-bold text-slate-700">
                    {selectedFile ? selectedFile.name : 'Seleccionar fotografía'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 font-semibold">JPG, PNG, WebP hasta 5MB</span>
                </div>
                {selectedFile && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-right text-xs font-bold text-red-500 hover:text-red-700 mt-1"
                  >
                    Quitar archivo
                  </button>
                )}
              </div>

              {/* Action button */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!inputText && !selectedFile)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    {isUploading ? 'Subiendo imagen...' : 'Analizando con IA...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                    Analizar con IA
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Right Column: AI Extraction and Mappings Form */}
        <div className={creationMode === 'ia' ? 'lg:col-span-2 animate-in fade-in duration-200' : 'lg:col-span-3 animate-in fade-in duration-200'}>
          {creationMode === 'ia' && !hasParsedData ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Esperando Carga</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">Los campos extraídos por IA y el mapeo de productos aparecerán aquí tras el análisis.</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-in fade-in duration-300">
              <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {creationMode === 'manual' ? 'Información del Nuevo Pedido' : 'Pedido Extraído por la IA'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Extracted client name (read-only reference) */}
                {creationMode === 'ia' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Cliente Extraído (IA)</label>
                    <input
                      type="text"
                      value={clienteNombreAI || 'No detectado'}
                      readOnly
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 text-slate-500 font-semibold focus:outline-none"
                    />
                  </div>
                )}

                {/* Database Client Mapping selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    Mapeo de Cliente en Catálogo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => {
                      setClienteId(e.target.value);
                      const selected = clients.find(c => c.id === e.target.value);
                      if (selected?.direccion && !destino) {
                        setDestino(selected.direccion);
                      }
                    }}
                    required
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Selecciona el cliente --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Lugar de Entrega / Destino <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    required
                    placeholder="Ej. Ruta Occidente, La Esperanza"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Payment terms */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Condición de Pago <span className="text-red-500">*</span></label>
                  <select
                    value={estadoPago}
                    onChange={(e) => setEstadoPago(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pagado">Pagado</option>
                    <option value="contra_entrega">Contra Entrega</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>

                {/* Assign Warehouse assistant immediately */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Asignación Inmediata de Bodega</label>
                  <select
                    value={auxiliarAsignadoId}
                    onChange={(e) => setAuxiliarAsignadoId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Dejar sin asignar en pendiente --</option>
                    {assistants.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Special Notes */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Notas y Observaciones</label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Instrucciones especiales de empaque o ruta"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Items mapping list */}
              <div className="flex flex-col gap-3 mt-4 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {creationMode === 'manual' ? 'Productos a Solicitar' : 'Mapeo de Ítems del Pedido'}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <PlusCircle className="w-4 h-4" /> Agregar ítem
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {parsedItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all animate-in fade-in duration-150"
                    >
                      {/* Product Name extracted (Only in IA mode) */}
                      {creationMode === 'ia' && (
                        <div className="flex-1 w-full flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Detalle del Pedido (IA)</span>
                          <div className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                            <span>{item.nombreProducto || 'Nuevo Producto'}</span>
                            {item.variedadTono && (
                              <span className="px-2 py-0.5 rounded bg-slate-200/60 text-[10px] font-extrabold text-slate-600">
                                {item.variedadTono}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Product Catalog mapping dropdown */}
                      <div className={`w-full flex flex-col gap-1 ${creationMode === 'manual' ? 'flex-1' : 'md:w-72'}`}>
                        <span className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-1">
                          {creationMode === 'manual' ? 'Producto' : 'Asociar a Producto Catálogo'}
                          {!item.mappedProductoId && (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                          )}
                        </span>
                        <select
                          value={item.mappedProductoId || ''}
                          onChange={(e) => handleItemProductChange(index, e.target.value)}
                          className={`w-full border rounded-xl p-2 text-xs font-semibold focus:outline-none focus:bg-white bg-white ${
                            item.mappedProductoId 
                              ? 'border-slate-200 text-slate-800' 
                              : 'border-red-300 text-red-700 bg-red-50'
                          }`}
                        >
                          <option value="">-- Selecciona producto --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.sku}) [Stock: {p.stockActual}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variety / Tone */}
                      <div className="w-full md:w-36 flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">Variedad / Tono</span>
                        <input
                          type="text"
                          placeholder="Ej. Rojo, Amarillo"
                          value={item.variedadTono || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParsedItems(prev => prev.map((it, idx) => 
                              idx === index ? { ...it, variedadTono: val } : it
                            ));
                          }}
                          className="w-full border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none bg-white text-slate-800"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="w-24 flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">Cantidad</span>
                        <input
                          type="number"
                          value={item.cantidadSolicitada}
                          onChange={(e) => handleItemQtyChange(index, Number(e.target.value))}
                          min={1}
                          required
                          className="w-full border border-slate-200 rounded-xl p-2 text-xs font-semibold text-center focus:outline-none bg-white text-slate-800"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Save button */}
              <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/inventario-ventas/pedidos')}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando pedido...' : 'Guardar y Asignar Pedido'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
