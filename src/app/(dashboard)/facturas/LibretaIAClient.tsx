'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, Sparkles, AlertCircle, Copy, Share2, X, ImageIcon, 
  FileText, CheckCircle2, Receipt, ChevronDown, Upload 
} from 'lucide-react';
import toast from 'react-hot-toast';
import ClienteSearchSwitcher from '@/components/cxc/ClienteSearchSwitcher';
import { guardarDocumentoBuilder, searchProductos, getClientPriceHistory } from './actions';
import { resolveProductPrice } from '@/utils/productPricing';

type TargetDocType = 'COTIZACION' | 'FACTURA' | 'PROFORMA';

const DOC_TYPE_CONFIG: Record<TargetDocType, { 
  label: string; 
  actionLabel: string; 
  shortLabel: string; 
  icon: any; 
  badgeColor: string;
  buttonBg: string; 
  activePillBg: string;
}> = {
  COTIZACION: {
    label: 'Cotización',
    actionLabel: 'Convertir a Cotización',
    shortLabel: 'Cotización',
    icon: FileText,
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25',
    activePillBg: 'bg-blue-600 text-white shadow-sm'
  },
  FACTURA: {
    label: 'Factura Oficial',
    actionLabel: 'Convertir a Factura Oficial',
    shortLabel: 'Factura',
    icon: CheckCircle2,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    buttonBg: 'bg-[#15803d] hover:bg-[#166534] shadow-emerald-700/25',
    activePillBg: 'bg-[#15803d] text-white shadow-sm'
  },
  PROFORMA: {
    label: 'Factura Pro Forma',
    actionLabel: 'Convertir a Pro Forma',
    shortLabel: 'Pro Forma',
    icon: Receipt,
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    buttonBg: 'bg-[#6b21a8] hover:bg-[#581c87] shadow-purple-700/25',
    activePillBg: 'bg-[#6b21a8] text-white shadow-sm'
  }
};

interface Props {
  organization: any;
  userRole?: string;
  userAccessibleModules?: string[];
}

export default function LibretaIAClient({ organization }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [targetDocType, setTargetDocType] = useState<TargetDocType>('COTIZACION');
  const [showDocTypeMenu, setShowDocTypeMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pricesIncludeTax, setPricesIncludeTax] = useState<boolean>(() => {
    return organization?.invoiceSettings?.pricesIncludeTax !== false;
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cerrar menú desplegable al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowDocTypeMenu(false);
      }
    }
    if (showDocTypeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDocTypeMenu]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageB64(event.target.result as string);
        toast.success('Imagen cargada correctamente');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleProcess = async () => {
    if (!text.trim() && !imageB64) {
      toast.error('Por favor ingresa el texto o sube/pega una imagen del pedido');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/libreta-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, imageB64 })
      });
      const aiData = await res.json();
      if (aiData.error) throw new Error(aiData.error);

      let finalClienteId = selectedClienteId;
      if (!finalClienteId && aiData.clienteEncontrado?.id) {
        finalClienteId = aiData.clienteEncontrado.id;
        setSelectedClienteId(aiData.clienteEncontrado.id);
        setSelectedCliente(aiData.clienteEncontrado);
        toast.success(`Cliente detectado en factura: ${aiData.clienteEncontrado.nombre}`);
      }

      if (!finalClienteId) {
        toast.error(
          aiData.clienteNombre
            ? `Se detectó "${aiData.clienteNombre}" en la factura, pero no está registrado aún. Selecciónalo o créalo en el paso 1.`
            : 'Por favor selecciona un cliente en el paso 1 para continuar'
        );
        setIsLoading(false);
        return;
      }

      const extractedItems = aiData.items || [];
      if (extractedItems.length === 0) {
        throw new Error('No se detectaron flores ni productos claros en el texto/imagen');
      }

      // Obtener historial de precios del cliente para aplicar tarifas personalizadas si no se especificó precio manual
      let clientPriceHistory: Record<string, any> = {};
      try {
        clientPriceHistory = await getClientPriceHistory(finalClienteId);
      } catch (e) {
        console.warn('No se pudo cargar historial de precios del cliente:', e);
      }

      // Usar el emparejamiento inteligente del servidor con el catálogo preservando el orden 1 a 1
      const validItems = await Promise.all(
        extractedItems.map(async (item: any, idx: number) => {
          const desc = (item.descripcion || item.descripcionOriginal || 'Producto').trim();
          const qty = Number(item.cantidad) || 1;
          const userPrice = Number(item.precioUnitario) || 0;
          const isManualPrice = Boolean(item.precioManual) && userPrice > 0;

          if (item.productoId || item.activoId) {
            const priceInfo = resolveProductPrice(
              {
                id: item.productoId || item.activoId,
                type: item.productoId ? 'producto' : 'activo',
                name: desc,
                price: userPrice
              },
              clientPriceHistory
            );
            const resolvedUnitPrice = isManualPrice
              ? userPrice
              : (priceInfo.unitPrice > 0 ? priceInfo.unitPrice : userPrice);

            return {
              id: `ai-item-${idx}-${Date.now()}`,
              code: item.sku || '',
              shortDesc: desc,
              longDesc: item.descripcionLarga || '',
              richDesc: '',
              showLongDesc: false,
              qty,
              unitPrice: resolvedUnitPrice,
              tax: 'isv15',
              discount: 0,
              discountType: 'percentage',
              productoId: item.productoId || undefined,
              activoId: item.activoId || undefined,
              imageUrl: item.imageUrl || undefined
            };
          }

          let matchedProduct: any = null;
          try {
            const searchRes = await searchProductos(desc, 5);
            if (searchRes && searchRes.length > 0) {
              matchedProduct = searchRes[0];
            }
          } catch (e) {
            console.warn('Error al buscar producto coincidente en inventario:', e);
          }

          const matchedName = matchedProduct?.nombre || matchedProduct?.name || '';
          const matchedCode = matchedProduct?.sku || matchedProduct?.code || '';
          const matchedDesc = matchedProduct?.descripcion || matchedProduct?.description || '';
          const matchedPrice = Number(matchedProduct?.precioVenta ?? matchedProduct?.price ?? 0);

          let finalPrice = isManualPrice ? userPrice : (matchedPrice > 0 ? matchedPrice : userPrice);
          if (!isManualPrice && matchedProduct) {
            const priceInfo = resolveProductPrice(
              {
                id: matchedProduct.id,
                type: matchedProduct.type || 'producto',
                name: matchedName || desc,
                price: matchedPrice
              },
              clientPriceHistory
            );
            if (priceInfo.unitPrice > 0) {
              finalPrice = priceInfo.unitPrice;
            }
          }

          return {
            id: `ai-item-${idx}-${Date.now()}`,
            code: matchedCode,
            shortDesc: matchedName || desc,
            longDesc: matchedDesc,
            richDesc: '',
            showLongDesc: false,
            qty: qty,
            unitPrice: finalPrice,
            tax: 'isv15', // En Paraíso Floral todos los productos son gravados con ISV 15%
            discount: 0,
            discountType: 'percentage',
            productoId: matchedProduct && matchedProduct.type === 'producto' ? matchedProduct.id : undefined,
            activoId: matchedProduct && matchedProduct.type === 'activo' ? matchedProduct.id : undefined,
            imageUrl: matchedProduct?.imageUrl || undefined
          };
        })
      );

      // Calcular montos considerando el switch de ISV (precios incluyen o más ISV)
      let subTotal = 0;
      let totalGravado15 = 0;
      let totalIsv15 = 0;
      let finalTotal = 0;

      for (const it of validItems) {
        const lineVal = it.qty * it.unitPrice;
        if (pricesIncludeTax) {
          // El precio ya incluye el 15% de ISV
          const base = lineVal / 1.15;
          const isv = lineVal - base;
          subTotal += base;
          totalGravado15 += base;
          totalIsv15 += isv;
          finalTotal += lineVal;
        } else {
          // Se suma el 15% de ISV sobre el precio
          const isv = lineVal * 0.15;
          subTotal += lineVal;
          totalGravado15 += lineVal;
          totalIsv15 += isv;
          finalTotal += (lineVal + isv);
        }
      }

      const isCredito = aiData.condicionPago === 'credito';

      const data = {
        clienteId: finalClienteId,
        tipoDocumento: targetDocType,
        estado: targetDocType === 'FACTURA' ? 'BORRADOR' : undefined,
        notas: aiData.notas || '',
        terminosPago: isCredito ? '15 días netos' : 'Contado',
        metodoPago: isCredito ? 'Crédito' : 'Efectivo',
        aliasVenta: 'Paraíso Floral',
        transferenciaConfirmada: false,
        validezDias: targetDocType === 'COTIZACION' ? 15 : 30,
        subTotal: Number(subTotal.toFixed(2)),
        descuentos: 0,
        totalExento: 0,
        totalExonerado: 0,
        totalGravado15: Number(totalGravado15.toFixed(2)),
        isv15: Number(totalIsv15.toFixed(2)),
        totalGravado18: 0,
        isv18: 0,
        total: Number(finalTotal.toFixed(2)),
        templateSettings: {
          ...(organization?.invoiceSettings || {}),
          pricesIncludeTax
        }
      };

      const result = await guardarDocumentoBuilder(data, validItems);
      if (result.success && result.docId) {
        const docName = DOC_TYPE_CONFIG[targetDocType].label;
        toast.success(`¡${docName} generada exitosamente con ISV 15%!`);
        router.push(`/facturas/${result.docId}`);
      } else {
        throw new Error(result.error || `Error al guardar ${DOC_TYPE_CONFIG[targetDocType].label.toLowerCase()}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Ocurrió un error al procesar el pedido con IA');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setImageB64(event.target.result as string);
              toast.success('Imagen pegada correctamente');
            }
          };
          reader.readAsDataURL(file);
        }
      }
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
              Pega el pedido de WhatsApp o sube la foto de una factura/nota escrita a mano. La IA interpretará los productos contra tu inventario real y generará una {DOC_TYPE_CONFIG[targetDocType].label.toLowerCase()} lista para emitir.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* 1. Cliente Selection */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span>1. ¿Para quién es este pedido?</span>
              <span className="text-xs font-semibold text-slate-400">Opcional si aparece en la foto</span>
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

          {/* 2. Tipo de Documento Selection */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span>2. Tipo de documento a emitir</span>
              <span className="text-xs font-semibold text-slate-400">Selecciona el formato deseado</span>
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              {(['COTIZACION', 'FACTURA', 'PROFORMA'] as TargetDocType[]).map((type) => {
                const config = DOC_TYPE_CONFIG[type];
                const Icon = config.icon;
                const isSelected = targetDocType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTargetDocType(type)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-2 sm:px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      isSelected
                        ? config.activePillBg
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{config.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Text Area / Image Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800">3. Pega el pedido o sube foto de la factura</span>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir Foto
                </button>
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
                  className="flex items-center gap-1.5 text-xs text-fuchsia-600 hover:text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg transition-colors font-bold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Pegar Texto
                </button>
              </div>
            </div>
            <div className="relative group">
              {imageB64 ? (
                <div className="relative w-full h-64 p-2 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden group">
                  <img src={imageB64} alt="Pedido" className="max-h-full max-w-full object-contain rounded-xl" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => setImageB64(null)}
                      className="px-4 py-2 bg-white/90 text-slate-800 font-bold rounded-lg shadow-sm flex items-center gap-2 hover:bg-white cursor-pointer"
                    >
                      <X className="w-4 h-4 text-red-500" />
                      Remover Imagen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Ejemplo:&#10;1 Lirios blancos 350&#10;2 Gerberas rosadas 189 c/u&#10;1 envio 250"
                    className="w-full h-64 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 outline-none transition-all resize-none text-slate-700 font-medium placeholder:text-slate-400"
                  />
                  {!text && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50 group-focus-within:opacity-0 transition-opacity">
                      <div className="text-center space-y-2">
                        <div className="flex justify-center gap-2">
                          <Share2 className="w-8 h-8 text-slate-400" />
                          <ImageIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">Pega texto, capturas (Ctrl+V) o usa el botón &ldquo;Subir Foto&rdquo;</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Switch de Precios Incluyen ISV */}
            <div className="flex items-center gap-2.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block">Precios incluyen ISV</span>
                <span className="text-[10px] text-slate-500 block">
                  {pricesIncludeTax ? 'ISV 15% incluido en precio' : '+15% de ISV se sumará al total'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPricesIncludeTax(prev => !prev)}
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 focus:outline-none cursor-pointer ml-1 ${
                  pricesIncludeTax ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                title={pricesIncludeTax ? "Precios ya incluyen ISV (15%)" : "Se sumará el 15% de ISV al precio"}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                  pricesIncludeTax ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Coincidencias en catálogo automáticas</span>
            </div>
          </div>

          {/* Dynamic Split Button with Quick Dropdown */}
          <div ref={menuRef} className="relative w-full md:w-auto inline-flex shadow-lg rounded-xl overflow-visible">
            <button
              type="button"
              onClick={handleProcess}
              disabled={isLoading || (!text.trim() && !imageB64)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 text-white font-bold text-xs sm:text-sm transition-all rounded-l-xl active:scale-[0.99] disabled:opacity-50 cursor-pointer ${
                DOC_TYPE_CONFIG[targetDocType].buttonBg
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando {DOC_TYPE_CONFIG[targetDocType].shortLabel}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>{DOC_TYPE_CONFIG[targetDocType].actionLabel}</span>
                </>
              )}
            </button>

            {/* Split Arrow Menu Trigger */}
            <button
              type="button"
              onClick={() => setShowDocTypeMenu(prev => !prev)}
              disabled={isLoading}
              className={`px-3 py-3.5 border-l border-white/20 text-white rounded-r-xl transition-all cursor-pointer flex items-center justify-center hover:brightness-110 active:scale-95 ${
                DOC_TYPE_CONFIG[targetDocType].buttonBg
              } disabled:opacity-50`}
              title="Cambiar tipo de documento"
            >
              <ChevronDown size={17} className={`transition-transform duration-200 ${showDocTypeMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDocTypeMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cambiar tipo de documento</span>
                </div>
                {(['COTIZACION', 'FACTURA', 'PROFORMA'] as TargetDocType[]).map((type) => {
                  const config = DOC_TYPE_CONFIG[type];
                  const Icon = config.icon;
                  const isSelected = targetDocType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setTargetDocType(type);
                        setShowDocTypeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isSelected ? 'text-slate-900' : 'text-slate-400'} />
                        <span>{config.label}</span>
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
