'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowLeft, 
  Upload, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  HelpCircle, 
  Mic, 
  Plus, 
  Minus,
  MapPin,
  CreditCard,
  UserCheck,
  Users,
  Check,
  Search,
  X
} from 'lucide-react';
import { crearPedido } from '../actions';
import { toast } from 'react-hot-toast';
import { VoiceOrderAssistantModal } from '@/components/pedidos/VoiceOrderAssistantModal';
import { ProductSmartAutocomplete, ProductCatalogItem } from '@/components/pedidos/ProductSmartAutocomplete';
import { ClientSmartAutocomplete, ClientCatalogItem } from '@/components/pedidos/ClientSmartAutocomplete';
import { playSuccessChime } from '@/utils/audioAlerts';

interface NuevoPedidoParserClientProps {
  dbUser: any;
  assistants: { id: string; nombre: string; avatar?: string }[];
  products: { id: string; nombre: string; sku: string; stockActual: number; precioVenta?: number }[];
  clients: { id: string; nombre: string; telefono: string; direccion: string }[];
}

interface ParsedItem {
  nombreProducto: string;
  cantidadSolicitada: number;
  mappedProductoId?: string; // Mapped product in DB
}

// Assigned Member Picker matching Tasks / Work Orders style (Image 1)
function AssignedMemberPicker({
  assistants,
  selectedId,
  onSelect
}: {
  assistants: { id: string; nombre: string; avatar?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedMember = assistants.find(a => a.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMembers = assistants.filter(a =>
    a.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="relative w-full">
      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
        <Users className="w-3.5 h-3.5 text-slate-500" />
        Personas Asignadas ({selectedMember ? 1 : 0})
      </label>

      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 min-h-[42px] flex items-center justify-between cursor-pointer transition-all shadow-xs"
      >
        {selectedMember ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 bg-slate-100/90 border border-slate-200 rounded-lg pl-1.5 pr-2.5 py-1 text-xs text-slate-800 font-bold"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black overflow-hidden shrink-0 shadow-xs">
              {selectedMember.avatar ? (
                <img src={selectedMember.avatar} alt={selectedMember.nombre} className="w-full h-full object-cover" />
              ) : (
                <span>{selectedMember.nombre.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span>{selectedMember.nombre}</span>
            <button
              type="button"
              onClick={() => onSelect('')}
              className="text-slate-400 hover:text-rose-600 transition-colors ml-1 text-sm font-bold leading-none cursor-pointer"
              title="Quitar asignación"
            >
              &times;
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium px-1">
            Buscar o seleccionar miembro...
          </span>
        )}

        <span className="text-[10px] text-slate-400 px-1 font-bold">▼</span>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 flex flex-col">
          <input
            type="text"
            placeholder="Buscar miembro..."
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-2 shrink-0 font-medium"
          />
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3 italic font-medium">
                No se encontraron miembros
              </p>
            ) : (
              filteredMembers.map(m => {
                const isSelected = m.id === selectedId;
                const initials = m.nombre.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelect(isSelected ? '' : m.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/70 text-indigo-800 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[9px] font-bold text-indigo-700 overflow-hidden shrink-0">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <span className="truncate">{m.nombre}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NuevoPedidoParserClient({
  dbUser,
  assistants,
  products,
  clients
}: NuevoPedidoParserClientProps) {
  const router = useRouter();
  const [creationMode, setCreationMode] = useState<'ia' | 'manual'>('manual');
  const [aiSourceType, setAiSourceType] = useState<'voice' | 'whatsapp' | 'photo'>('voice');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Form states
  const [hasParsedData, setHasParsedData] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [clienteNombreAI, setClienteNombreAI] = useState('');
  const [destino, setDestino] = useState('');
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'contra_entrega' | 'credito'>('contra_entrega');
  const [auxiliarAsignadoId, setAuxiliarAsignadoId] = useState('');
  const [notas, setNotas] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([{ nombreProducto: '', cantidadSolicitada: 1 }]);

  // Input refs for smooth keyboard navigation
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusLastRowOnAdd, setFocusLastRowOnAdd] = useState(false);

  const handleAddItem = useCallback(() => {
    setParsedItems(prev => [...prev, {
      nombreProducto: '',
      cantidadSolicitada: 1
    }]);
    setFocusLastRowOnAdd(true);
  }, []);

  // Global keyboard shortcut: Ctrl + Enter to append new product line
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAddItem();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleAddItem]);

  // Check if order data was passed via session storage from voice assistant modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('voiceParsedOrder');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          sessionStorage.removeItem('voiceParsedOrder');
          applyParsedData(data);
        } catch (e) {}
      }
    }
  }, []);

  const applyParsedData = (data: any) => {
    setCreationMode('ia');
    setClienteNombreAI(data.clienteNombre || '');
    setDestino(data.destino || '');
    setEstadoPago(data.estadoPago || 'contra_entrega');
    setNotas(data.notas || '');

    // Map client
    if (data.matchedCliente?.id) {
      setClienteId(data.matchedCliente.id);
    } else if (data.clienteNombre) {
      const matched = clients.find(c =>
        c.nombre.toLowerCase().includes(data.clienteNombre.toLowerCase())
      );
      if (matched) {
        setClienteId(matched.id);
        if (!data.destino && matched.direccion) {
          setDestino(matched.direccion);
        }
      }
    }

    // Map items
    const mapped: ParsedItem[] = (data.items || []).map((item: any) => {
      let prodId = item.productoId;
      if (!prodId) {
        const match = products.find(p =>
          p.nombre.toLowerCase().includes(item.nombreProducto.toLowerCase())
        );
        prodId = match ? match.id : undefined;
      }

      return {
        nombreProducto: item.nombreProducto,
        cantidadSolicitada: Math.max(1, Number(item.cantidadSolicitada) || 1),
        mappedProductoId: prodId
      };
    });

    setParsedItems(mapped.length > 0 ? mapped : [{ nombreProducto: '', cantidadSolicitada: 1 }]);
    setHasParsedData(true);
  };

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
      setInputText('');
    }
  };

  // Perform AI analysis for WhatsApp text or Handwritten Photo
  const handleAnalyze = async () => {
    if (!inputText && !selectedFile) {
      toast.error('Por favor escribe un mensaje de WhatsApp o selecciona una foto de comanda.');
      return;
    }

    setIsAnalyzing(true);
    let imageUrl = '';

    try {
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

      applyParsedData(parsedData);
      toast.success('Pedido analizado correctamente por el motor IA');
    } catch (e: any) {
      toast.error(e.message || 'Error al procesar el pedido con IA');
    } finally {
      setIsAnalyzing(false);
      setIsUploading(false);
    }
  };

  // Map item product change via smart autocomplete & focus quantity input immediately
  const handleItemProductSelect = (index: number, product: ProductCatalogItem | null) => {
    setParsedItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          mappedProductoId: product ? product.id : undefined,
          nombreProducto: product ? product.nombre : item.nombreProducto
        };
      }
      return item;
    }));

    if (product) {
      setTimeout(() => {
        qtyInputRefs.current[index]?.focus();
        qtyInputRefs.current[index]?.select();
      }, 50);
    }
  };

  const handleItemQtyChange = (index: number, val: number) => {
    setParsedItems(prev => prev.map((item, idx) => 
      idx === index ? { ...item, cantidadSolicitada: Math.max(1, val) } : item
    ));
  };

  const handleDeleteItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Submit order
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId) {
      toast.error('Por favor selecciona un Cliente del catálogo');
      return;
    }

    const selectedClient = clients.find(c => c.id === clienteId);
    const resolvedDestino = destino || selectedClient?.direccion || selectedClient?.nombre || 'Entrega CEDI';

    const unmappedItem = parsedItems.find(item => !item.mappedProductoId);
    if (unmappedItem) {
      toast.error(`Por favor selecciona el producto en catálogo para "${unmappedItem.nombreProducto || 'Ítem sin asignar'}".`);
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
        destino: resolvedDestino,
        estadoPago,
        auxiliarAsignadoId: auxiliarAsignadoId || undefined,
        notas: notas || undefined,
        items: parsedItems.map(item => {
          const prod = products.find(p => p.id === item.mappedProductoId);
          return {
            productoId: item.mappedProductoId!,
            nombreProducto: prod ? prod.nombre : item.nombreProducto,
            codigoBarras: prod?.sku,
            cantidadSolicitada: item.cantidadSolicitada
          };
        })
      };

      const result = await crearPedido(payload);
      if (result.success) {
        playSuccessChime();
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-20">
      
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
              {creationMode === 'manual' ? 'Nuevo Pedido Manual' : 'Creador de Pedidos con IA'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {creationMode === 'manual' 
                ? 'Ingresa los datos del cliente y los productos solicitados' 
                : 'Dicta por voz, pega mensajes de WhatsApp o sube fotos de comandas'}
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
            🤖 Asistente IA (Voz / WhatsApp)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Source Selector (Only visible in IA mode) */}
        {creationMode === 'ia' && (
          <div className="lg:col-span-1 flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
              Canal de Entrada IA
            </h2>

            {/* Sub-tabs for Voice, WhatsApp, Photo */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => setAiSourceType('voice')}
                className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  aiSourceType === 'voice' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Voz IA</span>
              </button>
              <button
                type="button"
                onClick={() => setAiSourceType('whatsapp')}
                className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  aiSourceType === 'whatsapp' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setAiSourceType('photo')}
                className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  aiSourceType === 'photo' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Foto OCR</span>
              </button>
            </div>

            {/* OPTION A: Voice Assistant trigger */}
            {aiSourceType === 'voice' && (
              <div className="flex flex-col items-center text-center p-6 bg-gradient-to-b from-blue-50/60 to-indigo-50/40 rounded-2xl border border-blue-100 gap-4 mt-2">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Mic className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Dictado por Voz Inteligente</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Presiona el botón para dictar el pedido. Gemini interpretará los productos y llenará los datos automáticamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Iniciar Dictado por Voz</span>
                </button>
              </div>
            )}

            {/* OPTION B: WhatsApp Text */}
            {aiSourceType === 'whatsapp' && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" /> Pegar Texto de WhatsApp
                  </label>
                  <textarea
                    placeholder="Ej. 'Pedido floreria rosalia, enviar a occidente la esperanza. ocupo 5 paquetes de rosas rojas y 2 rollos de eucalipto, cobrar contra entrega porfa'"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      setSelectedFile(null);
                    }}
                    disabled={isAnalyzing}
                    rows={6}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-800 bg-slate-50 font-medium placeholder-slate-400"
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !inputText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      <span>Analizando texto...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5" />
                      <span>Interpretar con IA</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* OPTION C: Photo Comanda */}
            {aiSourceType === 'photo' && (
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" /> Foto de Comanda / Papel
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isAnalyzing}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors mb-2" />
                    <span className="text-xs font-bold text-slate-700">
                      {selectedFile ? selectedFile.name : 'Seleccionar fotografía'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-semibold">JPG, PNG, WebP hasta 5MB</span>
                  </div>
                  {selectedFile && (
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-right text-xs font-bold text-red-500 hover:text-red-700 mt-1 cursor-pointer"
                    >
                      Quitar archivo
                    </button>
                  )}
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !selectedFile}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      <span>{isUploading ? 'Subiendo imagen...' : 'Escaneando OCR...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5" />
                      <span>Escanear Foto con IA</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        )}

        {/* Right Column: Extracted Fields and Smart Autocomplete Form */}
        <div className={creationMode === 'ia' ? 'lg:col-span-2 animate-in fade-in duration-200' : 'lg:col-span-3 animate-in fade-in duration-200'}>
          {creationMode === 'ia' && !hasParsedData ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Esperando Carga</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Dicta por voz, pega un mensaje o sube una fotografía para que la IA extraiga los campos automáticamente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-in fade-in duration-300">
              <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {creationMode === 'manual' ? 'Información del Nuevo Pedido' : 'Pedido Estructurado por IA'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Extracted client name (read-only reference) */}
                {creationMode === 'ia' && clienteNombreAI && (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Cliente Extraído (IA)</label>
                    <input
                      type="text"
                      value={clienteNombreAI}
                      readOnly
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 text-slate-600 font-bold focus:outline-none"
                    />
                  </div>
                )}

                {/* Database Client Smart Autocomplete selector */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    Cliente en Catálogo <span className="text-red-500">*</span>
                  </label>
                  <ClientSmartAutocomplete
                    clients={clients}
                    selectedClientId={clienteId}
                    onSelect={(selected) => {
                      if (selected) {
                        setClienteId(selected.id);
                        if (selected.direccion) {
                          setDestino(selected.direccion);
                        }
                      } else {
                        setClienteId('');
                      }
                    }}
                    placeholder="Escribe el nombre o teléfono del cliente..."
                    isInvalid={!clienteId}
                  />
                </div>

                {/* Payment condition */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Condición de Pago <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={estadoPago}
                    onChange={(e) => setEstadoPago(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs h-[42px]"
                  >
                    <option value="pagado">Pagado</option>
                    <option value="contra_entrega">Contra Entrega</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>

                {/* Assigned Member (Bodega) with Image 1 style */}
                <div className="flex flex-col gap-1.5">
                  <AssignedMemberPicker
                    assistants={assistants}
                    selectedId={auxiliarAsignadoId}
                    onSelect={setAuxiliarAsignadoId}
                  />
                </div>

                {/* Special Notes */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Notas y Observaciones</label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Instrucciones especiales de empaque o ruta"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Items list with Smart Autocomplete & fast Tab navigation */}
              <div className="flex flex-col gap-3 mt-4 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {creationMode === 'manual' ? 'Productos Solicitados' : 'Mapeo de Productos en Catálogo'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Escribe el nombre de la flor para autocompletar en tiempo real <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Ctrl + Enter</span> para agregar nueva línea
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold border border-emerald-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar producto
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {parsedItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 transition-all hover:border-slate-300 flex flex-col gap-3"
                    >
                      {/* Product Name extracted badge (Only in IA mode) */}
                      {creationMode === 'ia' && item.nombreProducto && (
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Detectado en Audio/Texto:</span>
                          <span className="text-xs font-black text-slate-800 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {item.nombreProducto}
                          </span>
                        </div>
                      )}

                      {/* Main Row: Responsive Grid for Smart Product Autocomplete, Qty & Delete */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        
                        {/* 1. Smart Product Autocomplete (Width: 9 cols on desktop) */}
                        <div className="md:col-span-9 flex flex-col gap-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                            <span>Producto en Catálogo</span>
                            {!item.mappedProductoId && (
                              <span className="text-rose-500 text-[10px] font-extrabold flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" /> Requerido
                              </span>
                            )}
                          </label>
                          <ProductSmartAutocomplete
                            products={products}
                            selectedProductId={item.mappedProductoId}
                            onSelect={(prod) => handleItemProductSelect(index, prod)}
                            onCtrlEnter={handleAddItem}
                            autoFocus={focusLastRowOnAdd && index === parsedItems.length - 1}
                            placeholder="Escribe flor o código (ej. Rosas Rojas, Girasoles, PF-000001)..."
                            isInvalid={!item.mappedProductoId}
                          />
                        </div>

                        {/* 2. Quantity Counter (Width: 2 cols on desktop) */}
                        <div className="md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                            Cantidad (Paq.)
                          </label>
                          <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleItemQtyChange(index, item.cantidadSolicitada - 1)}
                              className="p-2 hover:bg-slate-100 text-slate-500 active:scale-90 transition-all cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              ref={el => { qtyInputRefs.current[index] = el; }}
                              type="number"
                              value={item.cantidadSolicitada}
                              onChange={(e) => handleItemQtyChange(index, Number(e.target.value))}
                              onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddItem();
                                }
                              }}
                              min={1}
                              required
                              className="w-full text-center text-xs font-black text-slate-900 focus:outline-none py-2"
                            />
                            <button
                              type="button"
                              onClick={() => handleItemQtyChange(index, item.cantidadSolicitada + 1)}
                              className="p-2 hover:bg-slate-100 text-slate-500 active:scale-90 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* 3. Delete Action Button (Width: 1 col on desktop) */}
                        <div className="md:col-span-1 flex justify-end md:justify-center md:pt-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            disabled={parsedItems.length <= 1}
                            className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
                            title="Eliminar producto de la lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Save button */}
              <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/inventario-ventas/pedidos')}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {isSaving ? 'Guardando pedido...' : 'Guardar y Asignar Pedido'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceOrderAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onParsedOrder={applyParsedData}
        assistants={assistants}
      />

    </div>
  );
}
