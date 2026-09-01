'use client';

import React, { useState, useEffect } from 'react';
import { 
    Printer, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Package, 
    Box, 
    Sliders,
    Eye,
    QrCode,
    Barcode
} from 'lucide-react';
import { formatNombreProductoRecepcion } from '@/utils/recepcionHelpers';

export interface ItemPrevisualizacion {
    id: string;
    cajaNumero: number;
    descripcion: string;
    idQr: string;
    codigoBarras: string;
    cantidad: number;
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
    const [impresora, setImpresora] = useState<string>('Niimbot');
    const [tamano, setTamano] = useState<string>('70x40');
    const [items, setItems] = useState<ItemPrevisualizacion[]>([]);
    const [isPrinting, setIsPrinting] = useState<boolean>(false);
    const [selectedItemPreviewIdx, setSelectedItemPreviewIdx] = useState<number>(0);

    useEffect(() => {
        if (isOpen) {
            setItems(itemsIniciales.map(i => ({ ...i, descripcion: formatNombreProductoRecepcion(i.descripcion) })));
            setSelectedItemPreviewIdx(0);
        }
    }, [isOpen, itemsIniciales]);

    if (!isOpen) return null;

    const totalEtiquetas = items.reduce((acc, curr) => acc + (Math.max(0, curr.cantidad) || 0), 0);
    const selectedItemPreview = items[selectedItemPreviewIdx] || items[0];

    const handleCantidadChange = (idx: number, val: number) => {
        const cantVal = Math.max(0, val);
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, cantidad: cantVal } : item));
    };

    const handleConfirmar = async () => {
        if (totalEtiquetas === 0) return;
        setIsPrinting(true);
        try {
            await onConfirmarImpresion(impresora, tamano, items);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPrinting(false);
        }
    };

    // Parámetros de pre-vista en vivo
    const idQrPreview = selectedItemPreview?.idQr || '000271';
    const descPreview = selectedItemPreview?.descripcion || 'PRODUCTO DE MUESTRA';
    const codigoBarrasPreview = selectedItemPreview?.codigoBarras || idQrPreview;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-4 sm:p-6 text-slate-800 space-y-4 max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
                
                {/* Header Modal */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-600">
                            <Printer className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                                {titulo}
                            </h3>
                            {subtitulo && (
                                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                    {subtitulo}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Grid 2 Columnas: Controles + Preview a la izquierda / Tabla de ítems a la derecha */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto">
                    
                    {/* Columna Izquierda: Configuración de Impresora + Vista Previa en Vivo de la Etiqueta Térmica */}
                    <div className="lg:col-span-5 space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500 tracking-wider">
                            <Sliders className="w-4 h-4 text-indigo-600" />
                            Configuración de Impresora
                        </div>

                        {/* Selector Impresora Target */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Impresora de Destino</label>
                            <select
                                value={impresora}
                                onChange={(e) => setImpresora(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                            >
                                <option value="Niimbot">Niimbot K3 / Vorttek Print Server (Recomendada)</option>
                                <option value="TSC">TSC TE200 / Industrial</option>
                                <option value="Predeterminada">Impresora Predeterminada de Windows</option>
                            </select>
                        </div>

                        {/* Selector Tamaño de Etiqueta */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Tamaño de Etiqueta Térmica</label>
                            <select
                                value={tamano}
                                onChange={(e) => setTamano(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                            >
                                <option value="70x40">70 x 40 mm (Formato Grande CEDI - Recomendado)</option>
                                <option value="50x30">50 x 30 mm (Formato Mediano)</option>
                                <option value="50x25">50 x 25 mm (Formato Estándar)</option>
                            </select>
                        </div>

                        {/* Tarjeta de Pre-visualización Dinámica de la Etiqueta (Diseño Idéntico al Print Server Vorttek) */}
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                    Vista Previa de Etiqueta ({tamano} mm)
                                </span>
                            </div>

                            {/* Contenedor MOCK de Etiqueta Térmica Fiel al Servidor Vorttek */}
                            <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden font-sans">
                                {/* Fila Superior: ID QR Grande + QR Code Ficticio/Real */}
                                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                                    <div>
                                        <span className="text-xl sm:text-2xl font-black text-slate-950 font-mono tracking-tight block">
                                            {idQrPreview}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            ID ACTIVO CEDI
                                        </span>
                                    </div>
                                    
                                    <div className="w-16 h-16 bg-slate-50 border border-slate-300 rounded-lg flex flex-col items-center justify-center p-1 text-center shrink-0">
                                        <QrCode className="w-10 h-10 text-slate-900" />
                                        <span className="text-[8px] font-mono font-bold text-slate-500">QR LINK</span>
                                    </div>
                                </div>

                                {/* Centro: Nombre Comercial CEDI de la Flor en Letra Gigante */}
                                <div className="py-1">
                                    <h4 className="text-sm font-black text-slate-950 uppercase leading-snug break-words">
                                        {descPreview}
                                    </h4>
                                </div>

                                {/* Fila Inferior: Código de Barras 1D Grande Code128 */}
                                <div className="border-t border-slate-200 pt-2 flex flex-col items-center justify-center text-center">
                                    <div className="w-full h-10 bg-slate-900 rounded flex items-center justify-center p-1 text-white gap-1 font-mono text-[10px] tracking-widest overflow-hidden">
                                        <Barcode className="w-full h-8 text-white stroke-[2]" />
                                    </div>
                                    <span className="text-xs font-mono font-black tracking-widest text-slate-900 mt-1">
                                        CÓD: {codigoBarrasPreview}
                                    </span>
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-500 font-semibold text-center italic">
                                El diseño final es procesado en alta resolución por el servidor de impresión Vorttek con binarización directa.
                            </p>
                        </div>
                    </div>

                    {/* Columna Derecha: Listado Ajustable de Ítems a Imprimir */}
                    <div className="lg:col-span-7 flex flex-col space-y-3 min-h-0">
                        <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Package className="w-4 h-4 text-emerald-600" />
                                Detalle de Flores e Ítems a Generar ({items.length})
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black text-xs">
                                Total: {totalEtiquetas} etiquetas
                            </span>
                        </div>

                        {/* Tabla de Selección de Cantidad de Etiquetas */}
                        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
                            {items.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                                    No hay flores seleccionadas para impresión.
                                </div>
                            ) : (
                                items.map((item, idx) => {
                                    const isSelected = idx === selectedItemPreviewIdx;
                                    return (
                                        <div
                                            key={`${item.id}-${idx}`}
                                            onClick={() => setSelectedItemPreviewIdx(idx)}
                                            className={`p-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                                isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black text-slate-900 truncate">
                                                        {item.descripcion}
                                                    </span>
                                                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-emerald-800 px-1.5 py-0.2 rounded border border-slate-200">
                                                        Caja #{item.cajaNumero}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-2">
                                                    <span>QR: <strong className="font-mono text-slate-700">{item.idQr}</strong></span>
                                                    <span>•</span>
                                                    <span>1D: <strong className="font-mono text-slate-700">{item.codigoBarras || item.idQr}</strong></span>
                                                </div>
                                            </div>

                                            {/* Campo Número de Etiquetas */}
                                            <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1.5 rounded-xl border border-slate-200" onClick={e => e.stopPropagation()}>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Cant:</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={500}
                                                    value={item.cantidad}
                                                    onChange={(e) => handleCantidadChange(idx, parseInt(e.target.value, 10) || 0)}
                                                    className="w-12 bg-white border border-slate-300 rounded-lg text-center text-xs font-black py-1 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>

                {/* Banner Resumen Inferior */}
                <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                            <span className="font-black text-indigo-950 block leading-tight">
                                Listo para encolar {totalEtiquetas} etiquetas en {impresora} ({tamano} mm)
                            </span>
                            <span className="text-[11px] text-indigo-700 font-medium">
                                Los trabajos ingresarán a la cola de impresión del servidor Vorttek inmediatamente.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Botones */}
                <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-slate-100 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isPrinting}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleConfirmar}
                        disabled={isPrinting || totalEtiquetas === 0}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPrinting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Encolando Etiquetas...</>
                        ) : (
                            <><Printer className="w-4 h-4" /> Confirmar e Imprimir ({totalEtiquetas} Etiquetas)</>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
