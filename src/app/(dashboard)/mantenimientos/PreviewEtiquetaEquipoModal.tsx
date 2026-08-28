'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type EquipoClienteDetail = {
    id: string;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    serie: string | null;
    codigoEtiqueta: string | null;
    fechaInstalacion: Date | string | null;
    cliente: {
        nombre: string;
    };
};

type PreviewModalProps = {
    equipo: EquipoClienteDetail;
    onClose: () => void;
};

export default function PreviewEtiquetaEquipoModal({
    equipo,
    onClose
}: PreviewModalProps) {
    const [cantidad, setCantidad] = useState(1);
    const [size, setSize] = useState('50x30');
    const [impresora, setImpresora] = useState('TSC TE200');
    const [imprimiendo, setImprimiendo] = useState(false);
    const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('default_printer');
        if (saved) {
            setImpresora(saved);
        }
    }, []);

    const handlePrinterChange = (newPrinter: string) => {
        setImpresora(newPrinter);
        localStorage.setItem('default_printer', newPrinter);
    };

    // Construir parámetros para la generación de la imagen
    const params = new URLSearchParams({
        id: equipo.id,
        codigoEtiqueta: equipo.codigoEtiqueta || '',
        nombre: equipo.nombre,
        marca: equipo.marca || '',
        modelo: equipo.modelo || '',
        serie: equipo.serie || 'N/A',
        cliente: equipo.cliente?.nombre || 'Sin Cliente',
        fechaInstalacion: equipo.fechaInstalacion ? new Date(equipo.fechaInstalacion).toISOString() : '',
        size
    });

    const urlImagen = `/api/impresion/generar-etiqueta-equipo?${params.toString()}`;

    const handleImprimir = async () => {
        setImprimiendo(true);
        setResultado(null);
        try {
            const fullUrlImagen = `${window.location.origin}${urlImagen}`;
            const qtyToPrint = Number(cantidad) || 1;
            const enqueuePromises = [];

            for (let i = 0; i < qtyToPrint; i++) {
                enqueuePromises.push(
                    fetch('/api/impresion/encolar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            urlImagen: fullUrlImagen,
                            impresora,
                            tamano: size,
                            activoId: '00000000-0000-0000-0000-000000000000' // ID dummy para indicar etiqueta que no es un activo fijo directo
                        })
                    })
                );
            }

            await Promise.all(enqueuePromises);

            setResultado({ success: true, message: `Enviadas ${qtyToPrint} copias a impresión` });
            setTimeout(() => {
                setResultado(null);
                onClose();
            }, 2000);
        } catch (e: any) {
            setResultado({ success: false, message: e.message || 'Error al encolar la impresión' });
            setTimeout(() => setResultado(null), 4000);
        } finally {
            setImprimiendo(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl p-6 relative max-w-lg w-full border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2.5 rounded-xl">
                        <Printer className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 leading-tight">Imprimir Etiqueta de Equipo</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Destinado para el control de mantenimientos y trazabilidad
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Copias a Imprimir:</span>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={cantidad}
                            onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                            className="w-20 text-center font-bold font-mono py-1.5 px-2 rounded-lg border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        />
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-sm font-semibold text-slate-700">Tamaño Etiqueta:</span>
                        <select
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            <option value="50x30">50x30 mm (Normal)</option>
                            <option value="50x25">50x25 mm (Corto)</option>
                            <option value="70x40">70x40 mm (Grande)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-sm font-semibold text-slate-700">Impresora:</span>
                        <select
                            value={impresora}
                            onChange={(e) => handlePrinterChange(e.target.value)}
                            className="text-sm font-semibold py-1.5 px-2 rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            <option value="TSC TE200">TSC TE200</option>
                            <option value="Niimbot">NIIMBOT K3</option>
                            <option value="Vorttek">Vorttek</option>
                        </select>
                    </div>
                </div>

                <div className="border-4 border-slate-100 rounded-xl p-4 bg-slate-50 flex justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={urlImagen}
                        className="w-full max-w-[320px] h-auto object-contain bg-white shadow-sm rounded border border-slate-200 animate-pulse"
                        alt="Preview Etiqueta Equipo"
                        onLoad={(e) => {
                            e.currentTarget.classList.remove('animate-pulse');
                        }}
                    />
                </div>

                {resultado && (
                    <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${
                        resultado.success
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                        {resultado.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {resultado.message}
                    </div>
                )}

                <div className="flex gap-3 mt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 font-semibold border border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleImprimir}
                        disabled={imprimiendo}
                        className="flex-[2] flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-70 shadow-sm shadow-indigo-600/10"
                    >
                        {imprimiendo ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Enviando...</span>
                            </>
                        ) : (
                            <>
                                <Printer className="w-5 h-5" />
                                <span>Enviar a Impresora</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
