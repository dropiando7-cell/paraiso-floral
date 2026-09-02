'use client';

import React, { useState, useEffect } from 'react';
import { 
    Printer, 
    X, 
    Loader2
} from 'lucide-react';
import { formatNombreProductoRecepcion } from '@/utils/recepcionHelpers';

export interface ItemPrevisualizacion {
    id: string;
    cajaNumero: number;
    descripcion: string;
    idQr: string;
    codigoBarras: string;
    cantidad: number;
    cantidadStr?: string;
    activoFijoId?: string;
}

interface ModalPrevisualizarImpresionProps {
    isOpen: boolean;
    onClose: () => void;
    titulo: string;
    subtitulo?: string;
    itemsIniciales: ItemPrevisualizacion[];
    onConfirmarImpresion: (impresora: string, tamano: string, itemsFinales: ItemPrevisualizacion[]) => Promise<void>;
}

export default function ModalPrevisualizarImpresion({
    isOpen,
    onClose,
    titulo,
    subtitulo,
    itemsIniciales,
    onConfirmarImpresion
}: ModalPrevisualizarImpresionProps) {
    const [impresora, setImpresora] = useState<string>('Vorttek');
    const [tamano, setTamano] = useState<string>('50x25');
    const [items, setItems] = useState<ItemPrevisualizacion[]>([]);
    const [isPrinting, setIsPrinting] = useState<boolean>(false);
    const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
    const [cantidadStr, setCantidadStr] = useState<string>('1');

    useEffect(() => {
        setImpresora('Vorttek');
        localStorage.setItem('default_printer', 'Vorttek');
    }, []);

    useEffect(() => {
        if (isOpen && itemsIniciales.length > 0) {
            const formatted = itemsIniciales.map(i => ({
                ...i,
                descripcion: formatNombreProductoRecepcion(i.descripcion)
            }));
            setItems(formatted);
            setSelectedItemIdx(0);
            setCantidadStr(String(formatted[0]?.cantidad || 1));
        }
    }, [isOpen, itemsIniciales]);

    if (!isOpen) return null;

    const handlePrinterChange = (newPrinter: string) => {
        setImpresora(newPrinter);
        localStorage.setItem('default_printer', newPrinter);
    };

    const selectedItem = items[selectedItemIdx] || items[0];

    // Sincronizar cambios en el campo de copias con el ítem seleccionado o todos los ítems si es 1
    const handleCantidadStrChange = (newStr: string) => {
        setCantidadStr(newStr);
        const parsedVal = Math.max(0, parseInt(newStr, 10) || 0);
        
        setItems(prev => prev.map((it, idx) => {
            if (prev.length === 1 || idx === selectedItemIdx) {
                return { ...it, cantidad: parsedVal, cantidadStr: newStr };
            }
            return it;
        }));
    };

    const handleConfirmar = async () => {
        setIsPrinting(true);
        try {
            // Asegurar que las cantidades tengan al menos 1
            const itemsFinales = items.map(it => ({
                ...it,
                cantidad: Math.max(1, it.cantidad || parseInt(cantidadStr, 10) || 1)
            }));
            await onConfirmarImpresion(impresora, tamano, itemsFinales);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPrinting(false);
        }
    };

    // Generar la URL idéntica al modal de Inventario
    const searchParams = new URLSearchParams({
        idQr: selectedItem?.idQr || '',
        descripcion: selectedItem?.descripcion || '',
        codigoBarras: selectedItem?.codigoBarras || '',
        area: 'BODEGA RECEPCIÓN',
        size: tamano,
        impresora: impresora
    });
    const previewUrl = `/api/impresion/generar-etiqueta?${searchParams.toString()}`;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 relative max-w-lg w-full">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                    <X className="w-5 h-5"/>
                </button>
                
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2.5 rounded-xl">
                        <Printer className="w-5 h-5 text-[#0500A3]" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 leading-tight">
                            {titulo || 'Vista Previa de Etiqueta QR'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Asegúrate de que la impresora VORTTEK esté conectada y lista.
                        </p>
                    </div>
                </div>

                {/* Si hay múltiples productos en la caja/lote, selector rápido */}
                {items.length > 1 && (
                    <div className="mb-3 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-900 shrink-0">Variedad ({items.length}):</span>
                        <select
                            value={selectedItemIdx}
                            onChange={(e) => {
                                const idx = Number(e.target.value);
                                setSelectedItemIdx(idx);
                                setCantidadStr(String(items[idx]?.cantidad || 1));
                            }}
                            className="bg-white text-xs font-bold py-1 px-2 rounded-lg border border-indigo-200 text-slate-800 focus:outline-none w-full truncate"
                        >
                            {items.map((it, idx) => (
                                <option key={`${it.id}-${idx}`} value={idx}>
                                    {it.descripcion} (Cant: {it.cantidad || 1})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Formulario de Parámetros */}
                <div className="mb-4 flex flex-col gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Copias a Imprimir:</span>
                        <input 
                            type="number" 
                            min="1" 
                            max="500" 
                            value={cantidadStr} 
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCantidadStrChange(e.target.value)}
                            onBlur={() => {
                                if (!cantidadStr || parseInt(cantidadStr, 10) < 1) {
                                    handleCantidadStrChange('1');
                                }
                            }}
                            placeholder="1"
                            className="w-24 text-center font-black text-lg py-2 px-3 rounded-xl border-2 border-slate-300 focus:border-[#0500A3] focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-sm font-semibold text-slate-700">Tamaño Etiqueta:</span>
                        <select 
                            value={tamano} 
                            onChange={(e) => setTamano(e.target.value)}
                            className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-blue-500 bg-white"
                        >
                            <option value="50x25">50x25 mm</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-sm font-semibold text-slate-700">Impresora:</span>
                        <select 
                            value={impresora} 
                            onChange={(e) => handlePrinterChange(e.target.value)}
                            className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-blue-500 bg-white"
                        >
                            <option value="Vorttek">VORTTEK</option>
                        </select>
                    </div>
                </div>

                {/* Pre-visualización de la Etiqueta (Imagen idéntica a Inventario) */}
                <div className="border-4 border-slate-100 rounded-xl p-4 bg-slate-50 flex justify-center mb-6 overflow-hidden min-h-[160px] items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} className="w-full max-w-[406px] h-auto object-contain bg-white shadow-sm" alt="Preview Etiqueta" />
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={isPrinting}
                        className="flex-1 font-semibold border-2 border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmar} 
                        disabled={isPrinting} 
                        className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#0500A3] text-white hover:bg-[#0600c2] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-70"
                    >
                        {isPrinting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Printer className="w-5 h-5" />} Enviar a Impresora
                    </button>
                </div>

            </div>
        </div>
    );
}
