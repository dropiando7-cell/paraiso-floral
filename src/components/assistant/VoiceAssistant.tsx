'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Mic, MicOff, X, Check, Loader2, AlertTriangle, 
    Plus, FileText, Database, ArrowRight, Sparkles 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { crearProducto } from '@/app/(dashboard)/precios/actions';
import { guardarDocumentoBuilder } from '@/app/(dashboard)/facturas/actions';

// Extender interfaz de Window para SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition?: any;
        webkitSpeechRecognition?: any;
    }
}

type AssistantState = 'idle' | 'listening' | 'processing' | 'reviewing' | 'saving' | 'error';

interface MatchedItem {
    found: boolean;
    name: string;
    quantity: number;
    price: number;
    cost: number;
    type: 'producto' | 'activo' | 'nuevo';
    productoId?: string;
    activoId?: string;
    sku?: string;
    stockActual?: number;
    // Client states in UI
    createInInventory?: boolean;
    editedName?: string;
    editedPrice?: number;
    editedCost?: number;
}

interface MatchedClient {
    id: string;
    nombre: string;
    rtn?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    found: boolean;
}

export function VoiceAssistant() {
    const router = useRouter();
    const [state, setState] = useState<AssistantState>('idle');
    const [transcript, setTranscript] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    // API response states
    const [documentAction, setDocumentAction] = useState<'CREATE_COTIZACION' | 'CREATE_FACTURA' | 'CHECK_INVENTORY'>('CREATE_COTIZACION');
    const [client, setClient] = useState<MatchedClient | null>(null);
    const [items, setItems] = useState<MatchedItem[]>([]);
    const [logId, setLogId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Speech recognition reference
    const recognitionRef = useRef<any>(null);

    // Inicializar reconocimiento de voz
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = true;
                rec.interimResults = true;
                rec.lang = 'es-HN'; // Español de Honduras / general

                rec.onstart = () => {
                    setState('listening');
                    setTranscript('');
                    setErrorMessage('');
                };

                rec.onresult = (event: any) => {
                    let currentTranscript = '';
                    for (let i = 0; i < event.results.length; ++i) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                    setTranscript(currentTranscript);
                };

                rec.onerror = (event: any) => {
                    console.error("Speech recognition error:", event);
                    if (event.error !== 'no-speech') {
                        setErrorMessage(`Error de voz: ${event.error}`);
                        setState('error');
                    } else {
                        setState('idle');
                    }
                };

                rec.onend = () => {
                    setState((prev) => {
                        if (prev === 'listening') {
                            return 'processing';
                        }
                        return prev;
                    });
                };

                recognitionRef.current = rec;
            }
        }
    }, []);

    // Escuchar cuando el estado pasa a 'processing' para llamar a la API
    useEffect(() => {
        if (state === 'processing' && transcript.trim() !== '') {
            processVoiceCommand(transcript);
        }
    }, [state, transcript]);

    const startListening = () => {
        if (!recognitionRef.current) {
            toast.error("El reconocimiento de voz no está soportado en este navegador.");
            return;
        }
        setIsOpen(true);
        setClient(null);
        setItems([]);
        setErrorMessage('');
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error("Error starting recognition:", e);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const closeAssistant = () => {
        stopListening();
        setIsOpen(false);
        setState('idle');
        setTranscript('');
    };

    // Llamada al endpoint para analizar la transcripción
    const processVoiceCommand = async (text: string) => {
        try {
            const res = await fetch('/api/assistant/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al procesar el comando de voz.');
            }

            setDocumentAction(data.action);
            setClient(data.client);
            
            // Inicializar estados editables de los items
            const initializedItems = data.items.map((it: any) => ({
                ...it,
                createInInventory: it.type === 'nuevo', // Activo por defecto si es nuevo
                editedName: it.name,
                editedPrice: it.price || 0,
                editedCost: it.cost || 0
            }));
            
            setItems(initializedItems);
            setLogId(data.logId);
            setState('reviewing');
        } catch (e: any) {
            console.error("Error processing voice command:", e);
            setErrorMessage(e.message || "Error al procesar el comando de voz.");
            setState('error');
        }
    };

    // Actualizar campos de ítems en revisión
    const updateItemField = (index: number, field: keyof MatchedItem, value: any) => {
        setItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
    };

    // Ejecutar guardado final
    const handleConfirm = async () => {
        if (!client) return;
        setState('saving');

        const saveToast = toast.loading("Guardando cotización e inventario...");
        try {
            // 1. Crear productos nuevos si el usuario lo aprobó
            const finalItems = [];

            for (const item of items) {
                if (item.type === 'nuevo' && item.createInInventory) {
                    // Generar un SKU único
                    const sku = 'CAT-' + String(Date.now()).slice(-6) + '-' + Math.floor(Math.random() * 10);
                    
                    const res = await crearProducto({
                        codigo: sku,
                        descripcion: item.editedName || item.name,
                        precioVenta: Number(item.editedPrice) || 0,
                        costoBase: Number(item.editedCost) || 0
                    });

                    if (!res.success || !res.producto) {
                        throw new Error(res.message || `No se pudo crear el producto "${item.name}"`);
                    }

                    finalItems.push({
                        qty: item.quantity,
                        unitPrice: Number(item.editedPrice) || 0,
                        discount: 0,
                        discountType: 'amount' as const,
                        shortDesc: item.editedName || item.name,
                        longDesc: '',
                        tax: 'isv15' as const,
                        productoId: res.producto.id,
                        activoId: null
                    });
                } else {
                    // Item ya existente en base de datos
                    finalItems.push({
                        qty: item.quantity,
                        unitPrice: item.type === 'nuevo' ? (Number(item.editedPrice) || 0) : (item.price || 0),
                        discount: 0,
                        discountType: 'amount' as const,
                        shortDesc: item.type === 'nuevo' ? (item.editedName || item.name) : item.name,
                        longDesc: '',
                        tax: 'isv15' as const,
                        productoId: item.type === 'producto' ? (item.productoId || null) : null,
                        activoId: item.type === 'activo' ? (item.activoId || null) : null
                    });
                }
            }

            // 2. Calcular Totales (Tax-Exclusive)
            const subTotal = finalItems.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
            const isv15 = subTotal * 0.15;
            const total = subTotal + isv15;

            // 3. Crear Cotización/Factura en DB
            const docData = {
                clienteId: client.id || null,
                clienteNombre: client.nombre,
                rtn: client.rtn || null,
                telefono: client.telefono || null,
                email: client.email || null,
                direccion: client.direccion || null,
                tipoDocumento: documentAction === 'CREATE_FACTURA' ? 'FACTURA' : 'COTIZACION',
                subTotal,
                descuentos: 0,
                totalExento: 0,
                totalExonerado: 0,
                totalGravado15: subTotal,
                isv15,
                total,
                metodoPago: 'Efectivo'
            };

            const docRes = await guardarDocumentoBuilder(docData, finalItems);

            if (!docRes.success) {
                throw new Error(docRes.error || "Error al guardar el documento.");
            }

            // 4. Actualizar log de trazabilidad (opcional, ya se creó en borrador en API route)
            if (logId) {
                await fetch('/api/assistant/voice/update-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logId, documentId: docRes.docId, status: 'PROCESADO' })
                }).catch(e => console.error("Error al actualizar log de voz:", e));
            }

            toast.success(
                `${documentAction === 'CREATE_FACTURA' ? 'Factura' : 'Cotización'} creada exitosamente: ${docRes.correlativo}`,
                { id: saveToast }
            );

            // Redirigir al listado de facturas/cotizaciones
            router.push('/facturas?tab=' + (documentAction === 'CREATE_FACTURA' ? 'facturas' : 'cotizaciones'));
            closeAssistant();
        } catch (e: any) {
            console.error("Error confirming voice document:", e);
            toast.error(e.message || "Error al guardar el documento.", { id: saveToast });
            setState('reviewing');
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={startListening}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform duration-200 border border-white/20 active:scale-95 group focus:outline-none"
                title="Asistente de Voz IA"
                aria-label="Abrir asistente de voz"
            >
                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md group-hover:scale-110 transition-transform duration-200" />
                <Mic size={24} className="relative z-10" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end lg:justify-center lg:items-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
            {/* Modal Container */}
            <div className="w-full lg:max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] lg:max-h-[75vh] overflow-hidden text-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-semibold text-sm tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-yellow-400 animate-spin-slow" />
                            Asistente de Voz ERP
                        </span>
                    </div>
                    <button 
                        onClick={closeAssistant} 
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {/* LISTENING STATE */}
                    {state === 'listening' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6">
                            {/* Onda de volumen animada */}
                            <div className="flex items-center justify-center space-x-1.5 h-16">
                                <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-1.5 h-10 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <div className="w-1.5 h-14 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                                <div className="w-1.5 h-8 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                <div className="w-1.5 h-12 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
                                <div className="w-1.5 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
                            </div>
                            
                            <p className="text-lg font-medium text-slate-300 text-center px-4">
                                {transcript || "Escuchando... dictando instrucción"}
                            </p>

                            <button
                                onClick={stopListening}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg transition-colors"
                            >
                                <MicOff size={18} />
                                Terminar de hablar
                            </button>
                        </div>
                    )}

                    {/* PROCESSING STATE */}
                    {state === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                            <p className="text-slate-300 font-medium text-center">
                                Interpretando dictado con Gemini IA...
                            </p>
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {state === 'error' && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                            <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                                <AlertTriangle size={32} />
                            </div>
                            <p className="text-red-400 font-semibold text-lg">Ocurrió un error</p>
                            <p className="text-slate-400 text-sm max-w-sm">{errorMessage}</p>
                            <button
                                onClick={startListening}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                    {/* REVIEWING STATE */}
                    {state === 'reviewing' && client && (
                        <div className="space-y-6">
                            {/* Transcripción leída */}
                            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                                <span className="text-xs text-slate-500 font-mono block mb-1">Transcripción original:</span>
                                <p className="text-slate-300 italic text-sm">"{transcript}"</p>
                            </div>

                            {/* Encabezado del documento */}
                            <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-200">
                                            {documentAction === 'CREATE_FACTURA' ? 'Factura de Venta' : 'Cotización de Servicio'}
                                        </h3>
                                        <p className="text-xs text-slate-500">Documento en borrador interpretado</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full">
                                    Borrador
                                </span>
                            </div>

                            {/* Cliente */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente</label>
                                <div className={`flex items-center justify-between p-4 rounded-xl border ${
                                    client.found 
                                    ? 'bg-emerald-500/5 border-emerald-500/20' 
                                    : 'bg-amber-500/5 border-amber-500/20'
                                }`}>
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${client.found ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            <Database size={18} />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={client.nombre}
                                                onChange={(e) => setClient({ ...client, nombre: e.target.value })}
                                                className="bg-transparent border-none p-0 focus:ring-0 text-slate-200 font-medium text-sm w-full outline-none"
                                            />
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {client.found ? 'Cliente registrado en la base de datos' : 'Nuevo cliente (se creará automáticamente)'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded ${
                                        client.found 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                        {client.found ? 'BD' : 'Nuevo'}
                                    </span>
                                </div>
                            </div>

                            {/* Items / Detalle */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Detalle de Equipos / Servicios</label>
                                <div className="space-y-3">
                                    {items.map((item, index) => (
                                        <div 
                                            key={index}
                                            className={`p-4 rounded-xl border space-y-3 ${
                                                item.found 
                                                ? 'bg-slate-900 border-slate-800' 
                                                : 'bg-amber-500/5 border-amber-500/20'
                                            }`}
                                        >
                                            {/* Fila Principal */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start space-x-2.5">
                                                    <span className="font-semibold text-blue-400 text-sm mt-0.5">{item.quantity}x</span>
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={item.editedName}
                                                            onChange={(e) => updateItemField(index, 'editedName', e.target.value)}
                                                            className="bg-transparent border-none p-0 focus:ring-0 text-slate-200 text-sm font-medium outline-none w-full"
                                                        />
                                                        {item.found ? (
                                                            <div className="flex items-center space-x-1.5 mt-1">
                                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                                                    SKU: {item.sku}
                                                                </span>
                                                                <span className="text-[10px] text-emerald-500 font-medium">
                                                                    Stock: {item.stockActual} u.
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-amber-400 font-medium block mt-1">
                                                                No registrado en inventario
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                                                    item.found ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                    {item.found ? 'EN STOCK' : 'NUEVO'}
                                                </span>
                                            </div>

                                            {/* Campos de Configuración / Precios */}
                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 block mb-0.5">Precio Venta (Lps)</label>
                                                    <input
                                                        type="number"
                                                        value={item.editedPrice}
                                                        onChange={(e) => updateItemField(index, 'editedPrice', parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-slate-700"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 block mb-0.5">Costo Base (Lps)</label>
                                                    <input
                                                        type="number"
                                                        value={item.editedCost}
                                                        disabled={item.found} // Deshabilitado si ya está registrado en DB
                                                        onChange={(e) => updateItemField(index, 'editedCost', parseFloat(e.target.value) || 0)}
                                                        className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-slate-700 ${
                                                            item.found ? 'opacity-40 cursor-not-allowed' : ''
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Opción de Registrar en Inventario */}
                                            {!item.found && (
                                                <div className="flex items-center space-x-2 pt-1 bg-amber-500/5 -mx-4 -mb-4 p-2 rounded-b-xl border-t border-amber-500/10">
                                                    <input
                                                        type="checkbox"
                                                        id={`create-inventory-${index}`}
                                                        checked={item.createInInventory}
                                                        onChange={(e) => updateItemField(index, 'createInInventory', e.target.checked)}
                                                        className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                                                    />
                                                    <label htmlFor={`create-inventory-${index}`} className="text-[10px] text-amber-400 font-medium cursor-pointer">
                                                        Supervisar y auto-registrar producto en catálogo base.
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
                    {state === 'reviewing' ? (
                        <>
                            <button
                                onClick={startListening}
                                className="px-4 py-2.5 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5"
                            >
                                <Mic size={16} />
                                Volver a Grabar
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                            >
                                <Check size={18} />
                                Confirmar y Generar
                            </button>
                        </>
                    ) : state === 'saving' ? (
                        <div className="w-full flex items-center justify-center py-2 text-slate-400 text-sm font-medium">
                            <Loader2 className="animate-spin text-emerald-500 mr-2" size={18} />
                            Creando cotización e inventario en la base de datos...
                        </div>
                    ) : (
                        <>
                            <div className="text-xs text-slate-500">
                                Di por ejemplo: "Cotiza a Juan Perez un osciloscopio digital"
                            </div>
                            <button
                                onClick={closeAssistant}
                                className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                            >
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
