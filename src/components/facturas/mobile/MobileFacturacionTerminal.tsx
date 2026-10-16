'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Camera, 
  Mic, 
  MicOff, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  UserCheck, 
  CreditCard, 
  Calendar, 
  FileText, 
  Receipt, 
  Eye, 
  Send, 
  Loader2, 
  X, 
  Upload, 
  Tag, 
  Copy, 
  Check, 
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Zap,
  Building2,
  Phone,
  RefreshCw,
  ShoppingBag,
  LayoutGrid,
  List
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { playTactileClick, playSuccessChime, triggerHaptic, playErrorBuzz } from '@/utils/audioAlerts';
import { searchClientes, searchProductos } from '@/app/(dashboard)/facturas/actions';
import { resolveProductPrice } from '@/utils/productPricing';
import BandejaPedidosCediModal from '@/components/facturacion/BandejaPedidosCediModal';

// Helper to resolve flower images from public/flores or fallback
export const resolveFlowerImage = (name: string = ''): string => {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('freedom') || (n.includes('rosa') && n.includes('roja'))) return '/flores/ROSA-FREEDOM-24.png';
  if (n.includes('girasol')) return '/flores/GIRASOLES.jpg';
  if (n.includes('solidago')) return '/flores/SURTIDAS.jpg';
  if (n.includes('eucalipto') && n.includes('dollar')) return '/flores/EUCALIPTO-DOLLAR.jpg';
  if (n.includes('eucalipto')) return '/flores/EUCALIPTO-BABY-BLUE.jpg';
  if (n.includes('clavel')) return '/flores/CLAVEL-GRANDE.jpg';
  if (n.includes('gerbera')) return '/flores/GERBERAS.jpg';
  if (n.includes('tulipan')) return '/flores/TULIPANES-HOLANDA.jpg';
  if (n.includes('lirio') || n.includes('azucena')) return '/flores/LIRIOS-BLANCO.jpg';
  if (n.includes('mini') && n.includes('rosa')) return '/flores/MINIROSA.jpg';
  if (n.includes('baby') || n.includes('gyp') || n.includes('ilus')) return '/flores/BABY-BREATH.jpg';
  if (n.includes('espuma') || n.includes('oasis')) return '/flores/ESPUMA-OASIS.jpg';
  if (n.includes('papel')) return '/flores/PAPEL-KOREANO.jpg';
  if (n.includes('rosa')) return '/flores/ROSAS-ROJAS.jpg';
  return '/logo-paraiso-floral.png';
};

// Helper to determine if an item is LÁSER (barcode) vs CUBETA/GRANEL
export const resolveItemBadge = (name: string = '', code?: string) => {
  const n = name.toLowerCase();
  if (n.includes('suelto') || n.includes('atado') || n.includes('granel') || n.includes('solidago') || n.includes('follaje')) {
    return { label: 'CUBETA / GRANEL', isBulk: true };
  }
  return { label: 'LÁSER', isBulk: false };
};

interface MobileFacturacionTerminalProps {
  allClients?: any[];
  docType: 'factura' | 'cotizacion' | 'proforma' | 'nota_credito' | any;
  setDocType: (type: any) => void;
  docNumber: string;
  currentDocType: any;
  selectedClient: any;
  setSelectedClient?: (client: any) => void;
  setShowClientModal: (show: boolean) => void;
  resolvedFechaEmision?: string;
  today: string;
  futureDate?: ((days: number) => string) | string;
  validityDays: number;
  setValidityDays: (days: number) => void;
  paymentTerms: string;
  setPaymentTerms: (terms: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  aliasVenta: string;
  setAliasVenta: (alias: string) => void;
  lineItems: any[];
  setLineItems: React.Dispatch<React.SetStateAction<any[]>>;
  handleLineChange: (id: string, field: string, value: any) => void;
  handleDeleteLine: (id: string) => void;
  handleDuplicateLine: (id: string) => void;
  handleToggleLongDesc: (id: string) => void;
  emptyLine: () => any;
  emptySectionLine: () => any;
  setShowProductModal: (show: boolean) => void;
  totals: any;
  fmt: (n: number) => string;
  notes: string;
  setNotes: (notes: string) => void;
  isSaving: boolean;
  handleSave: () => void;
  viewMode: boolean;
  isLocked: boolean;
  setShowActionsModal: (show: boolean) => void;
  setShowWorkOrderModal?: (show: boolean) => void;
  onOpenPreview: (format?: 'ticket' | 'carta') => void;
  settings?: any;
  setSettings?: React.Dispatch<React.SetStateAction<any>>;
  handleEditClick?: () => void;
  isDocLockedForEdit?: boolean;
  isAnulada?: boolean;
  isConvertida?: boolean;
  onDiscard?: () => void;
  lastSavedDoc?: {
    show: boolean;
    docId: string;
    correlativo: string;
    format: string;
    clienteNombre?: string;
  } | null;
  onCloseLastSavedDoc?: () => void;
  onCaptureLetterImage?: () => Promise<void>;
}

export default function MobileFacturacionTerminal({
  allClients,
  docType,
  setDocType,
  docNumber,
  currentDocType,
  selectedClient,
  setSelectedClient,
  setShowClientModal,
  paymentTerms,
  setPaymentTerms,
  paymentMethod,
  setPaymentMethod,
  lineItems,
  setLineItems,
  handleLineChange,
  handleDeleteLine,
  setShowProductModal,
  totals,
  fmt,
  notes,
  setNotes,
  isSaving,
  handleSave,
  viewMode,
  isLocked,
  onOpenPreview,
  settings,
  setSettings,
  handleEditClick,
  isDocLockedForEdit,
  isAnulada,
  isConvertida,
  onDiscard,
  lastSavedDoc,
  onCloseLastSavedDoc,
  onCaptureLetterImage
}: MobileFacturacionTerminalProps) {

  const router = useRouter();
  // Estado para mostrar/ocultar el encabezado superior, tipo de doc e IA (oculto por defecto al crear)
  const [showTopSection, setShowTopSection] = useState(false);

  // ─── LOCAL STATE: AI HUB & CLIENT DIRECTORY MODAL ─────────────────────────
  const [activeAiModal, setActiveAiModal] = useState<'none' | 'libreta' | 'captura' | 'audio'>('none');
  const [libretaText, setLibretaText] = useState('');
  const [capturedImageB64, setCapturedImageB64] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Audio / Speech State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const speechRecognitionRef = useRef<any>(null);

  // Full Client Directory Modal State
  const [isClientDirectoryOpen, setIsClientDirectoryOpen] = useState(false);
  const [clientSearchText, setClientSearchText] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const clientSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Inline Client Search & Autocomplete
  const [inlineClientText, setInlineClientText] = useState(selectedClient?.name || '');
  const [isInlineFocused, setIsInlineFocused] = useState(false);
  const [inlineMatches, setInlineMatches] = useState<any[]>([]);
  const inlineSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Product Linking Modal
  const [linkingLineId, setLinkingLineId] = useState<string | null>(null);
  const [productSearchText, setProductSearchText] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Format Chooser for Preview (Ticket vs Carta) y Modal Post-Emisión
  const [showPreviewChooser, setShowPreviewChooser] = useState(false);
  const [isPostEmissionModalOpen, setIsPostEmissionModalOpen] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);

  // Abrir modal automáticamente cuando se emite / guarda exitosamente el documento
  useEffect(() => {
    if (lastSavedDoc?.show && lastSavedDoc?.docId) {
      setIsPostEmissionModalOpen(true);
      playSuccessChime();
    }
  }, [lastSavedDoc]);

  // View Mode: Cards visuales vs Lista Inline compacta (Inspirado en Imagen 3)
  const [itemsViewMode, setItemsViewMode] = useState<'cards' | 'inline'>('cards');

  // ─── SPEECH RECOGNITION SETUP ─────────────────────────────────────────────
  const startAudioListening = () => {
    const baseTranscript = audioTranscript ? audioTranscript.trim() + ' ' : '';
    setIsRecordingAudio(true);
    triggerHaptic(50);
    playTactileClick();

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-HN';

        recognition.onresult = (event: any) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + ' ';
          }
          setAudioTranscript(baseTranscript + fullText.trim());
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          toast.error('Error al capturar audio. Puedes escribir el texto.');
          setIsRecordingAudio(false);
        };

        recognition.onend = () => {
          setIsRecordingAudio(false);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error(e);
        toast.error('Tu navegador no soporta reconocimiento de voz nativo.');
        setIsRecordingAudio(false);
      }
    } else {
      toast.error('Micrófono no soportado directamente en este navegador.');
      setIsRecordingAudio(false);
    }
  };

  const stopAudioListening = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecordingAudio(false);
    triggerHaptic(40);
  };

  // ─── AI EXTRACTION PROCESSOR ──────────────────────────────────────────────
  const handleProcessWithAi = async (sourceType: 'libreta' | 'captura' | 'audio') => {
    let payloadText = '';
    let payloadImage = capturedImageB64;

    if (sourceType === 'libreta') {
      if (!libretaText.trim() && !payloadImage) {
        toast.error('Por favor escribe o pega el pedido de WhatsApp');
        return;
      }
      payloadText = libretaText;
    } else if (sourceType === 'captura') {
      if (!payloadImage) {
        toast.error('Por favor selecciona una captura de pantalla del pedido');
        return;
      }
    } else if (sourceType === 'audio') {
      if (!audioTranscript.trim()) {
        toast.error('No se ha detectado audio aún. Habla o dicta el pedido.');
        return;
      }
      payloadText = audioTranscript;
    }

    setIsAiProcessing(true);
    triggerHaptic(50);

    try {
      const res = await fetch('/api/ai/libreta-cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payloadText || undefined,
          imageB64: payloadImage || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al procesar con IA');
      }

      const extractedItems = data.items || [];
      if (extractedItems.length === 0) {
        toast.error('No se detectaron flores ni productos claros en el texto/imagen.');
        return;
      }

      // Automatically search catalog to find matching products
      const newItemsToAdd: any[] = [];

      for (const item of extractedItems) {
        const desc = (item.descripcion || item.descripcionOriginal || 'Producto').trim();
        const qty = Number(item.cantidad) || 1;
        const price = Number(item.precioUnitario) || 0;

        if (item.productoId) {
          newItemsToAdd.push({
            id: Math.random().toString(36).slice(2, 9),
            code: item.sku || '',
            shortDesc: desc,
            longDesc: item.descripcionLarga || '',
            richDesc: '',
            showLongDesc: false,
            qty: qty,
            unitPrice: price,
            tax: 'isv15',
            discount: 0,
            discountType: 'percentage',
            productoId: item.productoId,
            activoId: undefined,
            imageUrl: item.imageUrl || resolveFlowerImage(desc),
            _isNew: true
          });
          continue;
        }

        // Try fuzzy match in database products
        let matchedProduct: any = null;
        try {
          const searchRes = await searchProductos(desc);
          if (searchRes && searchRes.length > 0) {
            matchedProduct = searchRes[0];
          }
        } catch (e) {
          console.warn('Error fetching matching product', e);
        }

        const matchedName = matchedProduct?.nombre || matchedProduct?.name || '';
        const matchedCode = matchedProduct?.sku || matchedProduct?.code || '';
        const matchedDesc = matchedProduct?.descripcion || matchedProduct?.description || '';
        const matchedPrice = Number(matchedProduct?.precioVenta ?? matchedProduct?.price ?? 0);

        newItemsToAdd.push({
          id: Math.random().toString(36).slice(2, 9),
          code: matchedCode,
          shortDesc: matchedName || desc,
          longDesc: matchedDesc,
          richDesc: '',
          showLongDesc: false,
          qty: qty,
          unitPrice: price > 0 ? price : matchedPrice,
          tax: 'isv15',
          discount: 0,
          discountType: 'percentage',
          productoId: matchedProduct && matchedProduct.type === 'producto' ? matchedProduct.id : undefined,
          activoId: matchedProduct && matchedProduct.type === 'activo' ? matchedProduct.id : undefined,
          imageUrl: matchedProduct?.imageUrl || resolveFlowerImage(desc),
          _isNew: true
        });
      }

      // Cambiar tipo de documento si la IA lo detectó
      if (data.tipoDocumento && (data.tipoDocumento === 'factura' || data.tipoDocumento === 'cotizacion' || data.tipoDocumento === 'proforma')) {
        setDocType(data.tipoDocumento);
      }

      // Add to lineItems (replacing empty default row if single and blank)
      setLineItems(prev => {
        const isDefaultEmptyOnly = prev.length === 1 && !prev[0].shortDesc && !prev[0].code && (!prev[0].unitPrice || Number(prev[0].unitPrice) === 0);
        return isDefaultEmptyOnly ? newItemsToAdd : [...prev, ...newItemsToAdd];
      });

      // Asignar cliente si la IA lo identificó
      if (data.clienteNombre && typeof data.clienteNombre === 'string' && data.clienteNombre.trim()) {
        const searchPool = (allClients && allClients.length > 0) ? allClients : clientSuggestions;
        const cleanTarget = data.clienteNombre.trim().toLowerCase();
        const foundClient = searchPool.find((c: any) => 
          c.name?.toLowerCase().includes(cleanTarget) || cleanTarget.includes(c.name?.toLowerCase())
        );

        if (foundClient) {
          if (setSelectedClient) setSelectedClient(foundClient);
          setInlineClientText(foundClient.name);
          toast.success(`Cliente: ${foundClient.name}`, { icon: '👤' });
        } else {
          setInlineClientText(data.clienteNombre.trim());
          if (setSelectedClient) {
            setSelectedClient({
              id: '',
              name: data.clienteNombre.trim(),
              rtn: '',
              phone: '',
              address: '',
              category: 'Cliente'
            });
          }
          toast.success(`Cliente: ${data.clienteNombre.trim()}`, { icon: '👤' });
        }
      }

      if (data.notas && data.notas.trim()) {
        setNotes(notes ? `${notes}\n${data.notas}` : data.notas);
      }

      playSuccessChime();
      toast.success(`✨ ¡${extractedItems.length} flores agregadas al pedido!`, { duration: 4000 });
      setActiveAiModal('none');
      setLibretaText('');
      setCapturedImageB64(null);
      setAudioTranscript('');
    } catch (e: any) {
      console.error(e);
      playErrorBuzz();
      toast.error(e.message || 'Error al comunicarse con la IA');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Sync inline input with selectedClient
  useEffect(() => {
    if (selectedClient?.name) {
      setInlineClientText(selectedClient.name);
    }
  }, [selectedClient?.name]);

  // Load initial clients if not provided
  useEffect(() => {
    if (!allClients || allClients.length === 0) {
      searchClientes('').then(res => {
        if (res && res.length > 0) {
          setClientSuggestions(res.map((c: any) => ({
            id: c.id,
            name: c.nombre || c.name,
            rtn: c.rtn || '',
            phone: c.telefono || c.phone || '',
            address: c.direccion || c.address || '',
            category: c.categoria || c.category || 'Cliente'
          })));
        }
      }).catch(console.error);
    } else {
      setClientSuggestions(allClients);
    }
  }, [allClients]);

  // ─── CLIENT DIRECTORY SEARCH HANDLER ──────────────────────────────────────
  const openClientDirectory = async () => {
    setIsClientDirectoryOpen(true);
    setClientSearchText('');
    const source = (allClients && allClients.length > 0) ? allClients : clientSuggestions;
    if (source.length > 0) {
      setClientSuggestions(source);
    } else {
      setIsSearchingClients(true);
      try {
        const list = await searchClientes('');
        setClientSuggestions(list ? list.map((c: any) => ({
          id: c.id,
          name: c.nombre || c.name,
          rtn: c.rtn || '',
          phone: c.telefono || c.phone || '',
          address: c.direccion || c.address || '',
          category: c.categoria || c.category || 'Cliente'
        })) : []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingClients(false);
      }
    }
  };

  const handleClientSearchChange = (val: string) => {
    setClientSearchText(val);

    const source = (allClients && allClients.length > 0) ? allClients : clientSuggestions;
    const q = val.toLowerCase().trim();

    if (!q) {
      setClientSuggestions(source);
      return;
    }

    // Instant local filter in modal
    const localFiltered = source.filter(c => {
      const n = (c.name || c.nombre || '').toLowerCase();
      const r = (c.rtn || '').toLowerCase();
      const p = (c.phone || c.telefono || '').toLowerCase();
      const a = (c.address || c.direccion || '').toLowerCase();
      return n.includes(q) || r.includes(q) || p.includes(q) || a.includes(q);
    });
    setClientSuggestions(localFiltered);

    if (clientSearchDebounceRef.current) {
      clearTimeout(clientSearchDebounceRef.current);
    }

    clientSearchDebounceRef.current = setTimeout(async () => {
      setIsSearchingClients(true);
      try {
        const results = await searchClientes(val.trim());
        if (results && results.length > 0) {
          const map = new Map();
          localFiltered.forEach(item => map.set(item.id, item));
          results.forEach((c: any) => {
            const mapped = {
              id: c.id,
              name: c.nombre || c.name,
              rtn: c.rtn || '',
              phone: c.telefono || c.phone || '',
              address: c.direccion || c.address || '',
              category: c.categoria || c.category || 'Cliente'
            };
            if (!map.has(mapped.id)) map.set(mapped.id, mapped);
          });
          setClientSuggestions(Array.from(map.values()));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingClients(false);
      }
    }, 200);
  };

  // Handle typing directly into the "Buscar o escribir cliente..." input
  const handleInlineClientType = (val: string) => {
    setInlineClientText(val);
    setIsInlineFocused(true);

    const source = (allClients && allClients.length > 0) ? allClients : clientSuggestions;
    const q = val.toLowerCase().trim();

    if (!q) {
      setInlineMatches(source.slice(0, 15));
      return;
    }

    const localFiltered = source.filter(c => {
      const n = (c.name || c.nombre || '').toLowerCase();
      const r = (c.rtn || '').toLowerCase();
      const p = (c.phone || c.telefono || '').toLowerCase();
      const a = (c.address || c.direccion || '').toLowerCase();
      return n.includes(q) || r.includes(q) || p.includes(q) || a.includes(q);
    }).slice(0, 20);

    setInlineMatches(localFiltered);

    if (inlineSearchDebounceRef.current) clearTimeout(inlineSearchDebounceRef.current);
    inlineSearchDebounceRef.current = setTimeout(async () => {
      try {
        const serverResults = await searchClientes(q);
        if (serverResults && serverResults.length > 0) {
          const map = new Map();
          localFiltered.forEach(item => map.set(item.id, item));
          serverResults.forEach((c: any) => {
            const mapped = {
              id: c.id,
              name: c.nombre || c.name,
              rtn: c.rtn || '',
              phone: c.telefono || c.phone || '',
              address: c.direccion || c.address || '',
              category: c.categoria || c.category || 'Cliente'
            };
            if (!map.has(mapped.id)) map.set(mapped.id, mapped);
          });
          setInlineMatches(Array.from(map.values()).slice(0, 25));
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
  };

  const handleSelectClient = (client: any) => {
    const formatted = {
      id: client.id,
      name: client.name || client.nombre,
      rtn: client.rtn || '',
      email: client.email || '',
      phone: client.phone || client.telefono || '',
      address: client.address || client.direccion || '',
      city: client.city || '',
      category: client.category || client.categoria || 'Cliente'
    };
    if (setSelectedClient) {
      setSelectedClient(formatted);
    }
    setInlineClientText(formatted.name);
    setIsInlineFocused(false);
    setIsClientDirectoryOpen(false);
    triggerHaptic(30);
    playTactileClick();
    toast.success(`Cliente: ${formatted.name}`);
  };

  const handleUseCustomName = (name: string) => {
    const customClient = {
      id: `custom-${Date.now()}`,
      name: name.trim().toUpperCase(),
      rtn: '',
      email: '',
      phone: '',
      address: 'Mostrador / Local',
      city: 'San Pedro Sula',
      category: 'General'
    };
    if (setSelectedClient) {
      setSelectedClient(customClient);
    }
    setInlineClientText(name.trim().toUpperCase());
    setIsInlineFocused(false);
    setIsClientDirectoryOpen(false);
    triggerHaptic(30);
    playTactileClick();
    toast.success(`Cliente: ${name}`);
  };

  const handleSelectConsumidorFinal = () => {
    const consumidor = {
      id: 'cf',
      name: 'CONSUMIDOR FINAL',
      rtn: '00000000000000',
      email: '',
      phone: '',
      address: 'Mostrador / Local',
      city: 'San Pedro Sula',
      category: 'General'
    };
    if (setSelectedClient) {
      setSelectedClient(consumidor);
    }
    setInlineClientText('CONSUMIDOR FINAL');
    setIsInlineFocused(false);
    setIsClientDirectoryOpen(false);
    triggerHaptic(30);
    playTactileClick();
    toast.success('Cliente: CONSUMIDOR FINAL');
  };

  // Image Upload handler for Screenshot
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImageB64(event.target.result as string);
          triggerHaptic(30);
          toast.success('Captura cargada. Presiona "Escanear con IA".');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Search product to link an unlinked item
  const handleOpenLinkingModal = (lineId: string, currentDesc: string) => {
    setLinkingLineId(lineId);
    setProductSearchText(currentDesc);
    setIsSearchingProducts(true);
    searchProductos(currentDesc).then(res => {
      setProductSuggestions(res || []);
      setIsSearchingProducts(false);
    });
  };

  const handleLinkProductToLine = (product: any) => {
    if (!linkingLineId) return;
    const priceRes = resolveProductPrice(product, settings?.clientPriceHistory || {});
    setLineItems(prev => prev.map(item => {
      if (item.id === linkingLineId) {
        return {
          ...item,
          code: product.code,
          shortDesc: product.name,
          productoId: product.type === 'producto' ? product.id : undefined,
          activoId: product.type === 'activo' ? product.id : undefined,
          unitPrice: priceRes.unitPrice,
          priceOrigin: priceRes.priceOrigin,
          priceOriginLabel: priceRes.priceOriginLabel,
          imageUrl: product.imageUrl || resolveFlowerImage(product.name)
        };
      }
      return item;
    }));
    setLinkingLineId(null);
    playSuccessChime();
    toast.success(`Vinculado a: ${product.name}`);
  };

  // Stepper handlers with audio & haptics
  const handleStepQty = (id: string, currentVal: number | string, delta: number) => {
    triggerHaptic(20);
    playTactileClick();
    const curr = Number(currentVal) || 0;
    const nextVal = Math.max(1, curr + delta);
    handleLineChange(id, 'qty', nextVal);
  };

  const isFactura = docType === 'factura';
  const isCotizacion = docType === 'cotizacion';
  const isProforma = docType === 'proforma';

  return (
    <div className="w-full pb-36 print:hidden font-sans select-none animate-in fade-in duration-200 px-0.5">
      
      {/* ─── BARRA DE ESTILO SUPERIOR: TIPO DE DOCUMENTO & TOGGLE ENCABEZADO/IA ─── */}
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 mb-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isFactura ? 'bg-[#15803d]' : isCotizacion ? 'bg-[#1d4ed8]' : 'bg-[#6b21a8]'} animate-pulse`} />
          <span className="text-xs font-black uppercase text-slate-900 tracking-tight truncate">
            {isFactura ? 'Factura Oficial' : isCotizacion ? 'Cotización' : 'Pro Forma'}
          </span>
          {docNumber && (
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              #{docNumber}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowTopSection(prev => !prev);
            triggerHaptic(20);
            playTactileClick();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shadow-2xs active:scale-95 cursor-pointer ${
            showTopSection
              ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-900'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title={showTopSection ? "Ocultar panel superior" : "Mostrar tipo de documento, IA y atajos"}
        >
          {showTopSection ? (
            <>
              <span>Ocultar</span>
              <ChevronUp size={13} className="text-slate-300" />
            </>
          ) : (
            <>
              <SlidersHorizontal size={11} className="text-emerald-600" />
              <span>Opciones & IA</span>
              <ChevronDown size={13} className="text-slate-500" />
            </>
          )}
        </button>
      </div>

      {/* ─── CONTENEDOR DESPLEGABLE: ENCABEZADO, ACCESOS RÁPIDOS, TIPO DE DOC E IA ─── */}
      {showTopSection && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-2 mb-2">
          {/* Fila de Atajos Rápidos (IA, Pedidos CEDI, POS, Lista) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveAiModal('libreta');
                triggerHaptic(25);
                playTactileClick();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs shrink-0 active:scale-95 cursor-pointer"
            >
              <Sparkles size={13} className="text-fuchsia-200" />
              <span>IA</span>
            </button>

            <BandejaPedidosCediModal onSelectPedido={(pedido) => router.push(`/facturas/pos?cargarPedido=${pedido.id}`)} />

            <Link
              href="/facturas/pos"
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs shrink-0 active:scale-95"
            >
              <Zap size={13} className="text-white fill-white/20" />
              <span>POS</span>
            </Link>

            <Link
              href="/facturas?tab=facturas"
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 shrink-0 ml-auto"
            >
              <span>Ver Facturas</span>
            </Link>
          </div>

          {/* 1. TOP BRAND HEADER (Estilo Imagen 4) */}
          <div className="bg-[#386641] text-white px-3 py-2.5 rounded-xl shadow-md flex items-center justify-between">
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase text-emerald-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Paraíso Floral
              </h1>
              <p className="text-[10px] font-bold text-emerald-200/90 uppercase tracking-tight mt-0.5">
                Módulo de Facturación
              </p>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-200/80 block">
                {isFactura ? 'Factura Oficial' : isCotizacion ? 'Cotización' : 'Pro Forma'}
              </span>
              <span className="text-[11px] font-mono font-black bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/30 inline-block mt-0.5">
                {docNumber || 'PENDIENTE'}
              </span>
            </div>
          </div>

          {/* 2. SELECTOR DE TIPO DE DOCUMENTO (Pills Directos) */}
          <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300/60 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setDocType('factura');
                triggerHaptic(25);
                playTactileClick();
              }}
              className={`py-1.5 px-1 text-center rounded-lg text-xs font-black transition-all ${
                isFactura
                  ? 'bg-[#15803d] text-white shadow-sm scale-[1.01]'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              Factura Oficial
            </button>

            <button
              type="button"
              onClick={() => {
                setDocType('cotizacion');
                triggerHaptic(25);
                playTactileClick();
              }}
              className={`py-1.5 px-1 text-center rounded-lg text-xs font-black transition-all ${
                isCotizacion
                  ? 'bg-[#1d4ed8] text-white shadow-sm scale-[1.01]'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              Cotización
            </button>

            <button
              type="button"
              onClick={() => {
                setDocType('proforma');
                triggerHaptic(25);
                playTactileClick();
              }}
              className={`py-1.5 px-1 text-center rounded-lg text-xs font-black transition-all ${
                isProforma
                  ? 'bg-[#6b21a8] text-white shadow-sm scale-[1.01]'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              Pro Forma
            </button>
          </div>

          {/* 3. HUB DE ENTRADA INTELIGENTE CON IA (3 Canales) */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white p-2.5 rounded-xl shadow-md border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[11px] font-black tracking-wide uppercase text-emerald-100">
                  Carga con IA
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                Gemini Flash
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveAiModal('libreta');
                  triggerHaptic(30);
                  playTactileClick();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 transition-all text-center group cursor-pointer"
              >
                <MessageSquare size={14} className="text-emerald-300" />
                <span className="text-[11px] font-black">Libreta IA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAiModal('captura');
                  triggerHaptic(30);
                  playTactileClick();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 transition-all text-center group cursor-pointer"
              >
                <Camera size={14} className="text-indigo-300" />
                <span className="text-[11px] font-black">Captura</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAiModal('audio');
                  triggerHaptic(30);
                  playTactileClick();
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 transition-all text-center group cursor-pointer"
              >
                <Mic size={14} className="text-fuchsia-300" />
                <span className="text-[11px] font-black">Voz</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. CLIENTE & FORMA DE PAGO (Diseño Exacto Imagen 2) ────────────── */}
      <div className="bg-white rounded-xl p-1.5 sm:p-2 border border-slate-200 shadow-sm mb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          
          {/* Lado A: Nombre / o escribir cliente con búsqueda en tiempo real */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-black uppercase text-slate-800 tracking-tight flex items-center gap-1">
                <User size={12} className="text-[#2d6a4f]" />
                Nombre / o escribir
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSelectConsumidorFinal}
                  className="text-[9px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded transition-colors"
                >
                  + CF
                </button>
                <button
                  type="button"
                  onClick={openClientDirectory}
                  className="text-[9px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors flex items-center gap-0.5"
                >
                  <Search size={9} /> Directorio
                </button>
              </div>
            </div>

            {/* Input / Selector de Cliente Unificado (Sin duplicación de nombre) */}
            <div className="relative">
              {selectedClient ? (
                <div className="w-full pl-3 pr-2 py-2 bg-emerald-50/70 border-2 border-emerald-600 rounded-xl flex items-center justify-between min-h-[46px] shadow-xs">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={openClientDirectory}>
                    <div className="flex items-center gap-1.5">
                      <User size={14} className="text-[#2d6a4f] shrink-0" />
                      <span className="text-xs sm:text-sm font-black uppercase text-slate-900 truncate tracking-tight">
                        {(selectedClient.name || selectedClient.nombre || '').toUpperCase()}
                      </span>
                    </div>
                    {(selectedClient.rtn || selectedClient.phone) && (
                      <p className="text-[10px] text-slate-600 font-mono font-bold mt-0.5 truncate pl-5">
                        {selectedClient.rtn ? `RTN: ${selectedClient.rtn}` : ''}
                        {selectedClient.rtn && selectedClient.phone ? ' · ' : ''}
                        {selectedClient.phone ? `TEL: ${selectedClient.phone}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={openClientDirectory}
                      className="px-2 py-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-200/80 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                      title="Cambiar cliente"
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (setSelectedClient) setSelectedClient(null);
                        setInlineClientText('');
                        setIsInlineFocused(false);
                        triggerHaptic(20);
                      }}
                      className="w-7 h-7 rounded-full bg-slate-200/90 hover:bg-red-100 hover:text-red-600 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                      title="Quitar cliente"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={inlineClientText}
                    onChange={(e) => handleInlineClientType(e.target.value.toUpperCase())}
                    onFocus={() => {
                      setIsInlineFocused(true);
                      if (inlineMatches.length === 0) {
                        const source = (allClients && allClients.length > 0) ? allClients : clientSuggestions;
                        setInlineMatches(source.slice(0, 15));
                      }
                    }}
                    placeholder="BUSCAR O ESCRIBIR CLIENTE..."
                    style={{ textTransform: 'uppercase' }}
                    className="w-full pl-9 pr-9 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20 shadow-xs min-h-[46px] uppercase tracking-tight"
                  />
                  {inlineClientText && (
                    <button
                      type="button"
                      onClick={() => {
                        setInlineClientText('');
                        setIsInlineFocused(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Autocomplete Flotante Inline al Escribir */}
            {isInlineFocused && inlineMatches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-300 z-50 max-h-52 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 flex items-center justify-between border-b border-slate-200">
                  <span className="uppercase tracking-wider">Directorio de Clientes</span>
                  <button
                    type="button"
                    onClick={() => setIsInlineFocused(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                {inlineMatches.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectClient(c)}
                    className="p-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-left"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-black uppercase text-slate-900 truncate tracking-tight">{(c.name || c.nombre || '').toUpperCase()}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        RTN: {c.rtn || 'Consumidor Final'} {(c.phone || c.telefono) ? `· Tel: ${c.phone || c.telefono}` : ''}
                      </p>
                    </div>
                    {selectedClient?.id === c.id && (
                      <Check size={14} className="text-[#2d6a4f] shrink-0 font-black" />
                    )}
                  </div>
                ))}
                {inlineClientText.trim() && (
                  <div
                    onClick={() => handleUseCustomName(inlineClientText)}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 cursor-pointer text-center text-xs font-black uppercase text-emerald-800 border-t border-emerald-100"
                  >
                    + Usar cliente: &ldquo;{inlineClientText.toUpperCase()}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lado B: Tipo de Pago (Exacto Imagen 2) */}
          {docType !== 'nota_credito' && (
          <div>
            <label className="text-[11px] font-black uppercase text-slate-800 tracking-tight block mb-1">
              Tipo de pago
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => {
                  setPaymentTerms('Crédito 15 días');
                  setPaymentMethod('Efectivo');
                  triggerHaptic(20);
                  playTactileClick();
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-black transition-all ${
                  paymentTerms.toLowerCase().includes('crédito') || paymentTerms.toLowerCase().includes('credito')
                    ? 'bg-[#2d6a4f] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Crédito
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentTerms('Contado');
                  setPaymentMethod('Efectivo');
                  triggerHaptic(20);
                  playTactileClick();
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-black transition-all ${
                  paymentTerms === 'Contado' && paymentMethod === 'Efectivo'
                    ? 'bg-[#2d6a4f] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Contado
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentTerms('Contado');
                  setPaymentMethod('Transferencia Bancaria');
                  triggerHaptic(20);
                  playTactileClick();
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-black transition-all ${
                  paymentMethod === 'Transferencia Bancaria'
                    ? 'bg-[#2d6a4f] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Transferencia
              </button>
            </div>
          </div>
          )}

        </div>
      </div>

      {/* ─── 5. DETALLE DE FACTURA / CARDS RECTANGULARES (Estilo Imagen 2) ───── */}
      <div className="space-y-1.5 mb-2.5">
        
        {/* Título de la Sección & Contador */}
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2d6a4f]" />
            {isFactura ? 'Detalle de Factura' : isCotizacion ? 'Detalle de Cotización' : 'Detalle de Pro Forma'}
          </h2>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle: Cards vs Lista Inline (Inspirado en Imagen 3) */}
            <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => { setItemsViewMode('cards'); triggerHaptic(15); }}
                className={`px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 transition-all ${
                  itemsViewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista en Cards con foto"
              >
                <LayoutGrid size={11} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => { setItemsViewMode('inline'); triggerHaptic(15); }}
                className={`px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 transition-all ${
                  itemsViewMode === 'inline'
                    ? 'bg-[#2d6a4f] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista de lista rápida tipo tabla"
              >
                <List size={11} />
                <span>Lista</span>
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
              {lineItems.length} {lineItems.length === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {lineItems.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-6 text-center flex flex-col items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-slate-300 mb-1.5" />
            <h3 className="text-xs font-black text-slate-800">No hay flores en el pedido aún</h3>
            <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs">
              Usa la Libreta IA, toma foto, dicta por voz o presiona Agregar ítem.
            </p>
          </div>
        )}

        {/* ─── VISTA 1: LISTADO EN CARDS CON FOTOS (Estilo Imagen 2) ─── */}
        {itemsViewMode === 'cards' && lineItems.map((item) => {
          const qty = Number(item.qty) || 0;
          const price = Number(item.unitPrice) || 0;
          const lineTotal = qty * price;
          const isLinked = Boolean(item.productoId || item.activoId);
          const badgeInfo = resolveItemBadge(item.shortDesc, item.code);
          const flowerImg = item.imageUrl || resolveFlowerImage(item.shortDesc);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl p-2 sm:p-2.5 border-2 transition-all shadow-xs relative overflow-hidden flex items-center gap-2 min-h-[72px] ${
                badgeInfo.isBulk
                  ? 'border-[#b45309]'
                  : 'border-[#2d6a4f]'
              }`}
            >
              {/* 1. Foto de Flor (Izquierda - 52x52) */}
              <div className="w-13 h-13 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                <img
                  src={flowerImg}
                  alt={item.shortDesc || 'Flor'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo-paraiso-floral.png';
                  }}
                />
              </div>

              {/* 2. Columna Central (Título en Mayúsculas, Cantidad y Stepper) */}
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 py-0.5">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 leading-snug truncate tracking-tight">
                  {(item.shortDesc || 'FLOR SIN ASIGNAR').toUpperCase()}
                </h3>

                <p className="text-[10px] font-extrabold uppercase text-slate-500 leading-none">
                  {qty} {badgeInfo.isBulk ? 'ATADOS' : 'PAQ'}
                </p>

                {/* Stepper Compacto con Selección Automática */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <div className="flex items-center bg-slate-100 rounded-md border border-slate-300 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleStepQty(item.id, item.qty, -1)}
                      className="w-6 h-6 rounded bg-white text-slate-900 flex items-center justify-center font-black active:scale-95 active:bg-slate-200 border border-slate-200 cursor-pointer"
                      title="Disminuir"
                    >
                      <Minus size={11} strokeWidth={3} />
                    </button>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleLineChange(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="w-8 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none border-none p-0 select-all no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepQty(item.id, item.qty, 1)}
                      className="w-6 h-6 rounded bg-white text-slate-900 flex items-center justify-center font-black active:scale-95 active:bg-slate-200 border border-slate-200 cursor-pointer"
                      title="Aumentar"
                    >
                      <Plus size={11} strokeWidth={3} />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    Tot: L.{fmt(lineTotal).replace('L. ', '').replace('L ', '')}
                  </span>
                </div>
              </div>

              {/* 3. Columna Derecha (Precio Editable Arriba + Estado/Eliminar Abajo) */}
              <div className="shrink-0 flex flex-col justify-between items-end min-h-[58px] py-0.5 text-right gap-1.5">
                {/* Input de Precio Unitario Editable (Sin flechas ▲▼) */}
                <div className="flex items-center bg-slate-50 border-2 border-slate-300 focus-within:border-[#2d6a4f] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2d6a4f]/20 rounded-lg px-1.5 py-0.5 shadow-2xs">
                  <span className="text-[11px] font-black text-slate-400 font-mono mr-0.5">L.</span>
                  <input
                    type="number"
                    step="any"
                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                    placeholder="0.00"
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleLineChange(item.id, 'unitPrice', val === '' ? 0 : parseFloat(val) || 0);
                      handleLineChange(item.id, 'priceOrigin', 'manual');
                      handleLineChange(item.id, 'priceOriginLabel', undefined);
                    }}
                    className="w-16 sm:w-20 text-right text-xs sm:text-sm font-black text-slate-900 bg-transparent focus:outline-none font-mono no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {item.priceOriginLabel && (
                    <span 
                      title={item.priceOrigin === 'historial' ? 'Último precio facturado a este cliente' : 'Precio base del inventario'}
                      className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded leading-none ${
                        item.priceOrigin === 'historial' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {item.priceOrigin === 'historial' ? '⭐ Hist.' : '🏷️ Base'}
                    </span>
                  )}
                  {isLinked ? (
                    <span className="text-[9px] font-black uppercase bg-[#2d6a4f] text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                      <Check size={9} strokeWidth={3} /> OK
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenLinkingModal(item.id, item.shortDesc)}
                      className="text-[9px] font-black uppercase text-amber-900 bg-amber-200/90 border border-amber-400 px-1 py-0.5 rounded flex items-center gap-0.5 active:scale-95 cursor-pointer"
                    >
                      ⚠️ VINCULAR
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30);
                      handleDeleteLine(item.id);
                    }}
                    className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors cursor-pointer"
                    title="Eliminar flor"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* ─── VISTA 2: LISTADO INLINE COMPACTO Y LIMPIO (Inspirado en Imagen 3) ─── */}
        {itemsViewMode === 'inline' && lineItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
            {/* Cabecera de Tabla Inline */}
            <div className="bg-slate-100/90 border-b border-slate-300 px-2 py-2 flex items-center text-[10px] font-black uppercase text-slate-700 tracking-wider">
              <span className="flex-1 min-w-0">Flor / Ítem</span>
              <span className="w-20 text-center shrink-0">Cant</span>
              <span className="w-24 text-right shrink-0">Precio</span>
              <span className="w-7 text-right shrink-0"></span>
            </div>

            {/* Filas Compactas con Estilo Cebra */}
            <div className="divide-y divide-slate-200">
              {lineItems.map((item, idx) => {
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={item.id}
                    className={`px-2 py-2 flex items-center gap-1.5 transition-colors ${
                      isEven ? 'bg-white' : 'bg-slate-50/70'
                    }`}
                  >
                    {/* Nombre de Flor en Mayúsculas */}
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="text-xs font-black uppercase text-slate-900 truncate tracking-tight leading-tight">
                        {(item.shortDesc || 'FLOR SIN ASIGNAR').toUpperCase()}
                      </p>
                      <p className="text-[10px] font-bold uppercase text-slate-400 font-mono leading-none mt-0.5">
                        {resolveItemBadge(item.shortDesc, item.code).label}
                      </p>
                    </div>

                    {/* Stepper Compacto con Selección Automática */}
                    <div className="w-20 flex items-center justify-center bg-slate-100 rounded-md border border-slate-300 p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStepQty(item.id, item.qty, -1)}
                        className="w-5 h-5 rounded bg-white text-slate-900 flex items-center justify-center font-black active:scale-95 border border-slate-200 cursor-pointer"
                        title="Disminuir"
                      >
                        <Minus size={9} strokeWidth={3} />
                      </button>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleLineChange(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        className="w-7 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none border-none p-0 select-all no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepQty(item.id, item.qty, 1)}
                        className="w-5 h-5 rounded bg-white text-slate-900 flex items-center justify-center font-black active:scale-95 border border-slate-200 cursor-pointer"
                        title="Aumentar"
                      >
                        <Plus size={9} strokeWidth={3} />
                      </button>
                    </div>

                    {/* Precio Unitario Editable (Sin flechas ▲▼) */}
                    <div className="w-24 text-right shrink-0">
                      <div className="flex items-center justify-end bg-white border border-slate-300 rounded-md px-1.5 py-0.5 focus-within:border-[#2d6a4f] focus-within:ring-1 focus-within:ring-[#2d6a4f]/30">
                        <span className="text-[10px] font-bold text-slate-400 font-mono mr-0.5">L.</span>
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleLineChange(item.id, 'unitPrice', val === '' ? 0 : parseFloat(val) || 0);
                          }}
                          className="w-16 text-right text-xs font-black text-slate-900 bg-transparent focus:outline-none font-mono no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    {/* Botón Eliminar */}
                    <div className="w-7 text-right shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(30);
                          handleDeleteLine(item.id);
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Eliminar flor"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Botón Rectangular: Agregar ítem (F3 / Escáner) (Estilo Imagen 2) ─ */}
        <button
          type="button"
          onClick={() => {
            setShowProductModal(true);
            triggerHaptic(30);
            playTactileClick();
          }}
          className="w-full bg-[#e9ecef] hover:bg-slate-200 active:scale-[0.99] border border-slate-300 rounded-xl p-2.5 flex items-center gap-3 text-left transition-all shadow-xs cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-black text-slate-800 text-lg shadow-2xs shrink-0">
            +
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
              Agregar ítem (F3 / Escáner)
            </p>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">
              Añadir flor...
            </p>
          </div>
        </button>

      </div>

      {/* ─── SWITCH: PRECIOS INCLUYEN ISV (Estilo Escritorio) ─────────────── */}
      <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-2xs flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            settings?.pricesIncludeTax ? 'bg-emerald-100 text-[#2d6a4f]' : 'bg-slate-100 text-slate-600'
          }`}>
            <Receipt size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-900 uppercase block tracking-tight leading-tight">
              Precios incluyen ISV
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight font-medium">
              {settings?.pricesIncludeTax 
                ? 'Impuesto ISV 15% ya incluido en el precio' 
                : 'Impuesto ISV 15% se calcula adicional (+15%)'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(25);
            playTactileClick();
            setSettings?.((s: any) => ({ ...s, pricesIncludeTax: !s.pricesIncludeTax }));
          }}
          className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 cursor-pointer ${
            settings?.pricesIncludeTax ? 'bg-[#2d6a4f]' : 'bg-slate-300'
          }`}
          title="Alternar Precios incluyen ISV"
        >
          <span
            className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
              settings?.pricesIncludeTax ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* ─── 6. RESUMEN DE TOTALES (Estilo Imagen 4) ────────────────────────── */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm mb-3 space-y-1.5">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600">
          <span>Subtotal:</span>
          <span className="font-mono text-slate-800">{fmt(totals.subtotal || 0)}</span>
        </div>

        {(Number(totals.descuentos) > 0 || Number(totals.descuentoTotal) > 0) && (
          <div className="flex justify-between items-center text-xs font-bold text-amber-600">
            <span>Descuento:</span>
            <span className="font-mono">-{fmt(totals.descuentos || totals.descuentoTotal || 0)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-xs font-bold text-slate-600">
          <span>Impuesto (ISV 15%):</span>
          <span className="font-mono text-slate-800">{fmt(totals.isv15 || 0)}</span>
        </div>

        <div className="pt-2 border-t-2 border-slate-200 flex justify-between items-center">
          <span className="text-sm font-black uppercase tracking-tight text-slate-950">
            {isFactura ? 'Total Factura' : isCotizacion ? 'Total Cotización' : 'Total Documento'}
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-950">
            {fmt(totals.total || 0)}
          </span>
        </div>
      </div>

      {/* ─── BOTÓN DESCARTAR BORRADOR / LIMPIAR CARRITO (Afuera del Canvas) ─── */}
      {!viewMode && onDiscard && (
        <div className="pt-1 pb-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(30);
              playTactileClick();
              onDiscard();
            }}
            className="w-full py-3 px-4 rounded-xl border-2 border-red-200 bg-red-50/80 hover:bg-red-100 text-red-700 active:scale-[0.99] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer group"
          >
            <Trash2 size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
            <span>Descartar Borrador / Limpiar Pedido</span>
          </button>
        </div>
      )}

      {/* ─── 7. BARRA FIJA INFERIOR (Sticky Checkout) ─────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-300/80 p-2.5 shadow-2xl flex items-center gap-2 print:hidden md:hidden">
        {viewMode ? (
          <button
            type="button"
            onClick={() => setIsPostEmissionModalOpen(true)}
            className="w-full py-3.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20"
          >
            <Camera size={16} />
            <span>OPCIONES DE DOCUMENTO (CAPTURA / IMPRESIÓN)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
              isSaving
                ? 'bg-slate-400 cursor-not-allowed text-white'
                : isFactura
                  ? 'bg-[#15803d] hover:bg-[#166534] text-white shadow-emerald-700/25'
                  : isCotizacion
                    ? 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-blue-700/25'
                    : 'bg-[#6b21a8] hover:bg-[#581c87] text-white shadow-purple-700/25'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>
                  {isFactura 
                    ? 'GENERAR Y EMITIR FACTURA' 
                    : isCotizacion 
                      ? 'GENERAR COTIZACIÓN' 
                      : 'GENERAR PRO FORMA'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ─── MODAL POST-EMISIÓN: VISTA PREVIA Y ACCIONES (CAPTURA, TICKET, CARTA) ─── */}
      {(isPostEmissionModalOpen || showPreviewChooser) && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-4 sm:p-5 shadow-2xl border border-slate-200 flex flex-col gap-3 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 uppercase truncate">
                    {lastSavedDoc?.format === 'factura' 
                      ? 'Factura Oficial SAR' 
                      : lastSavedDoc?.format === 'proforma' 
                        ? 'Factura Pro Forma' 
                        : 'Cotización Emitida'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {lastSavedDoc?.correlativo || docNumber} {lastSavedDoc?.clienteNombre ? `• ${lastSavedDoc.clienteNombre}` : (selectedClient?.name ? `• ${selectedClient.name}` : '')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPostEmissionModalOpen(false);
                  setShowPreviewChooser(false);
                  onCloseLastSavedDoc?.();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 my-1">
              {/* 1. Realizar Captura */}
              <button
                type="button"
                disabled={isCapturingImage}
                onClick={async () => {
                  if (onCaptureLetterImage) {
                    setIsCapturingImage(true);
                    try {
                      await onCaptureLetterImage();
                    } finally {
                      setIsCapturingImage(false);
                    }
                  } else {
                    toast.error('Función de captura no disponible');
                  }
                }}
                className="p-3.5 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-600 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  {isCapturingImage ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-slate-900 uppercase">1. Realizar Captura</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">Recomendado</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-tight">
                    {isCapturingImage ? 'Capturando en tamaño carta...' : 'Copia la imagen en tamaño carta al portapapeles para WhatsApp'}
                  </p>
                </div>
              </button>

              {/* 2. Ticket */}
              <button
                type="button"
                onClick={() => {
                  const targetDocId = lastSavedDoc?.docId;
                  if (targetDocId) {
                    window.open(`/facturas/ver/${targetDocId}?print=ticket`, '_blank');
                  } else {
                    onOpenPreview('ticket');
                  }
                }}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-300 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Receipt size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-slate-900 uppercase">2. Ticket</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">80mm POS</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-tight">Optimizado para celulares e impresoras térmicas POS</p>
                </div>
              </button>

              {/* 3. Hoja en carta */}
              <button
                type="button"
                onClick={() => {
                  const targetDocId = lastSavedDoc?.docId;
                  if (targetDocId) {
                    window.open(`/facturas/ver/${targetDocId}?print=true`, '_blank');
                  } else {
                    onOpenPreview('carta');
                  }
                }}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-300 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-slate-900 uppercase">3. Hoja en carta</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">PDF Carta</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-tight">Documento completo en tamaño carta (8.5 × 11 in)</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsPostEmissionModalOpen(false);
                setShowPreviewChooser(false);
                onCloseLastSavedDoc?.();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 transition-colors uppercase tracking-wider"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL DEDICADO: DIRECTORIO DE CLIENTES (Búsqueda Rápida) ────── */}
      {isClientDirectoryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] h-[85vh] sm:h-auto flex flex-col p-4 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-300">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Directorio de Clientes</h3>
                  <p className="text-[10px] text-slate-500">Selecciona o busca un cliente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectConsumidorFinal}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg"
                >
                  + Consumidor Final
                </button>
                <button
                  type="button"
                  onClick={() => setIsClientDirectoryOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Input de Búsqueda con Autofocus */}
            <div className="relative my-3 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                autoFocus
                type="text"
                value={clientSearchText}
                onChange={(e) => handleClientSearchChange(e.target.value)}
                placeholder="Escribe nombre, teléfono o RTN..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white shadow-2xs"
              />
              {clientSearchText && (
                <button
                  type="button"
                  onClick={() => handleClientSearchChange('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Lista de Resultados del Directorio */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {isSearchingClients && (
                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-emerald-600" />
                  <span>Buscando en directorio...</span>
                </div>
              )}
              {!isSearchingClients && clientSuggestions.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No se encontraron clientes</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Prueba con otro nombre o selecciona Consumidor Final</p>
                </div>
              )}
              {clientSuggestions.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className={`p-3 cursor-pointer rounded-xl transition-all my-1 flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-emerald-600'
                        : 'hover:bg-slate-50 border border-slate-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-black uppercase text-slate-900 truncate tracking-tight">{(client.name || client.nombre || '').toUpperCase()}</p>
                        {(client.category || client.categoria) && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                            {client.category || client.categoria}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        RTN: {client.rtn || 'Consumidor Final'} {(client.phone || client.telefono) ? `· Tel: ${client.phone || client.telefono}` : ''}
                      </p>
                      {(client.address || client.direccion) && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{client.address || client.direccion}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL 1: LIBRETA MÁGICA IA (WhatsApp Text) ─────────────────────── */}
      {activeAiModal === 'libreta' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageSquare size={17} />
                </div>
                <h3 className="text-sm font-black text-slate-900">Libreta Mágica IA</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAiModal('none')}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Pega la lista del pedido de WhatsApp o escríbela libremente. La IA extraerá los nombres, paquetes y precios.
            </p>

            <textarea
              rows={5}
              value={libretaText}
              onChange={(e) => setLibretaText(e.target.value)}
              placeholder="Ejemplo:&#10;5 paquetes de rosas rojas freedom a 350 c/u&#10;2 atados de solidago&#10;1 eucalipto baby blue"
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-2xs"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveAiModal('none')}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleProcessWithAi('libreta')}
                disabled={isAiProcessing || !libretaText.trim()}
                className="flex-[1.5] py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 disabled:opacity-50"
              >
                {isAiProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Extraer con IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CAPTURA / FOTO DEL PEDIDO ─────────────────────────────── */}
      {activeAiModal === 'captura' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Camera size={17} />
                </div>
                <h3 className="text-sm font-black text-slate-900">Captura de WhatsApp / OCR</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAiModal('none')}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Selecciona una captura de pantalla del chat o toma una foto de la comanda de papel para extraer los productos automáticamente.
            </p>

            <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 flex flex-col items-center justify-center relative cursor-pointer hover:bg-indigo-50/80 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {capturedImageB64 ? (
                <div className="w-full flex flex-col items-center gap-2">
                  <img
                    src={capturedImageB64}
                    alt="Preview captura"
                    className="max-h-48 rounded-xl object-contain shadow-sm border border-indigo-200"
                  />
                  <span className="text-xs font-bold text-indigo-700">Toca para cambiar imagen</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-4">
                  <Upload className="w-8 h-8 text-indigo-500 mb-1" />
                  <span className="text-xs font-bold text-slate-800">Toca para subir o tomar foto</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP o captura de pantalla</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveAiModal('none')}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleProcessWithAi('captura')}
                disabled={isAiProcessing || !capturedImageB64}
                className="flex-[1.5] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {isAiProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Escaneando OCR...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Escanear con IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ASISTENTE DE VOZ / AUDIO ───────────────────────────────── */}
      {activeAiModal === 'audio' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center">
                  <Mic size={17} />
                </div>
                <h3 className="text-sm font-black text-slate-900">Dictado por Voz Inteligente</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopAudioListening();
                  setActiveAiModal('none');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Presiona el micrófono y dicta el pedido en voz alta. Ej: <em>"5 paquetes de rosas rojas y 2 paquetes de solidago fresco"</em>.
            </p>

            {/* Mic Pulse Button */}
            <div className="flex flex-col items-center justify-center py-4">
              <button
                type="button"
                onClick={isRecordingAudio ? stopAudioListening : startAudioListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all cursor-pointer ${
                  isRecordingAudio
                    ? 'bg-rose-600 scale-110 animate-pulse shadow-rose-500/50 ring-8 ring-rose-200'
                    : 'bg-fuchsia-600 hover:bg-fuchsia-700 shadow-fuchsia-500/30 active:scale-95'
                }`}
              >
                {isRecordingAudio ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <span className="text-xs font-black mt-3 text-slate-800">
                {isRecordingAudio ? '🔴 Escuchando... Toca para pausar' : 'Toca el micrófono para comenzar'}
              </span>
            </div>

            {/* Live Transcript Box */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-left min-h-[70px] relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Transcripción en vivo:</span>
                {audioTranscript.trim() && (
                  <button 
                    type="button" 
                    onClick={() => setAudioTranscript('')}
                    className="text-[10px] font-bold text-fuchsia-600 hover:underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {audioTranscript || <span className="text-slate-400 italic">Esperando que hables...</span>}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  stopAudioListening();
                  setActiveAiModal('none');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-xs text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAudioListening();
                  handleProcessWithAi('audio');
                }}
                disabled={isAiProcessing || !audioTranscript.trim()}
                className="flex-[1.5] py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-fuchsia-600/20 active:scale-95 disabled:opacity-50"
              >
                {isAiProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Procesando voz...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Interpretar Dictado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: VINCULAR PRODUCTO RÁPIDO ──────────────────────────────── */}
      {linkingLineId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-200 flex flex-col gap-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900">Vincular a Catálogo de Flores</h3>
              <button
                type="button"
                onClick={() => setLinkingLineId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={productSearchText}
                onChange={(e) => {
                  setProductSearchText(e.target.value);
                  setIsSearchingProducts(true);
                  searchProductos(e.target.value).then(res => {
                    setProductSuggestions(res || []);
                    setIsSearchingProducts(false);
                  });
                }}
                placeholder="Buscar flor en inventario..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {isSearchingProducts && (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Buscando flores...
                </div>
              )}
              {!isSearchingProducts && productSuggestions.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No se encontraron flores con esa descripción.
                </div>
              )}
              {productSuggestions.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleLinkProductToLine(prod)}
                  className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={prod.imageUrl || resolveFlowerImage(prod.name)}
                      alt={prod.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                    />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-900 truncate tracking-tight">{(prod.name || prod.nombre || '').toUpperCase()}</p>
                      <p className="text-[10px] text-slate-500 font-mono">SKU: {prod.code || prod.sku || 'N/A'}</p>
                    </div>
                  </div>
                  {(() => {
                    const priceInfo = resolveProductPrice(prod, settings?.clientPriceHistory || {});
                    return (
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black block ${
                          priceInfo.priceOrigin === 'historial' ? 'text-emerald-700' : 'text-emerald-800'
                        }`}>
                          {fmt(priceInfo.unitPrice)}
                        </span>
                        {priceInfo.priceOrigin === 'historial' && (
                          <span className="text-[8px] font-bold text-emerald-600 block">⭐ Historial</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
