'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, ArrowLeft, CheckCircle2, AlertTriangle, User, MonitorSmartphone } from 'lucide-react';
import { getOrdenByQR, entregarOrden } from '../actions';

type Orden = any; // Tipado parcial

export default function EscanerClient() {
    const router = useRouter();
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [orden, setOrden] = useState<Orden | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [entregado, setEntregado] = useState(false);

    // ZXing Scanner relies on component lifecycle, dropping archaic HTML5 useEffect
    const verificarOrden = async (codigo: string) => {
        setLoading(true);
        setError('');
        try {
            const result = await getOrdenByQR(codigo);
            if (!result) {
                setError('Código QR no encontrado en los registros.');
                setScannedCode(null);
                return;
            }
            if (result.estado === 'ENTREGADO') {
                setError('Este equipo ya fue marcado como ENTREGADO y retirado.');
            }
            setOrden(result);
        } catch (e) {
            setError('Error al procesar el código.');
            setScannedCode(null);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmarEntrega = async () => {
        if (!orden) return;
        setLoading(true);
        try {
            await entregarOrden(orden.id);
            setEntregado(true);
        } catch (e) {
            alert('Error cerrando la orden.');
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setScannedCode(null);
        setOrden(null);
        setError('');
        setEntregado(false);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto min-h-[85vh] flex flex-col items-center">
            <div className="w-full mb-6">
                <button 
                    onClick={() => router.push('/soporte')}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al Taller
                </button>
            </div>

            <div className="bg-white w-full rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-slate-900 p-6 flex flex-col items-center justify-center text-white relative">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-3">
                        <QrCode className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Escáner de Salida</h2>
                    <p className="text-slate-400 mt-1">Escanea el recibo del cliente para entregar el equipo</p>
                </div>

                <div className="p-8">
                    {/* ESTADO 1: Cargando base */}
                    {loading && !orden && !entregado && (
                        <div className="py-12 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent animate-spin rounded-full mb-4"></div>
                            <p className="font-semibold text-slate-500">Buscando ticket...</p>
                        </div>
                    )}

                    {/* ESTADO 2: Escáner Activo */}
                    {!scannedCode && !loading && !entregado && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            {error && (
                                <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}
                            <div className="w-full text-slate-800 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 relative bg-black aspect-square max-w-sm mx-auto">
                                <Scanner 
                                    onScan={(result) => {
                                        if (result && result.length > 0) {
                                            const decodedText = result[0].rawValue;
                                            setScannedCode(decodedText);
                                            verificarOrden(decodedText);
                                        }
                                    }}
                                    formats={["qr_code", "code_128", "code_39", "ean_13"]}
                                />
                            </div>
                            <p className="text-center text-sm font-semibold text-slate-400 mt-4 uppercase tracking-widest">
                                Espere al Lector de Cámara
                            </p>
                        </div>
                    )}

                    {/* ESTADO 3: Orden Encontrada, Pendiente de Entrega */}
                    {orden && !entregado && (
                        <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                            {error && (
                                <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl flex items-center gap-2 font-bold text-sm">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <span className="text-xs font-mono font-bold uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                                    TICKET #{orden.codigoSeguridad}
                                </span>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Cliente Propietario</p>
                                        <p className="font-bold text-slate-800 text-lg leading-tight">{orden.cliente?.nombre}</p>
                                        <p className="text-slate-500 text-sm mt-0.5">{orden.cliente?.telefono || 'Sin teléfono'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center shrink-0">
                                        <MonitorSmartphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Equipo en Taller</p>
                                        <p className="font-bold text-slate-800 leading-tight">{orden.equipoDano}</p>
                                        <p className="text-slate-500 text-sm mt-0.5">{orden.marcaModelo || 'No especificado'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 mb-8 text-center">
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-1">Saldo a Cobrar</p>
                                <div className="text-4xl font-black text-blue-900 font-mono tracking-tight">
                                    L. {(parseFloat(orden.costoRevision) + parseFloat(orden.costoReparacion || 0)).toFixed(2)}
                                </div>
                                <div className="flex justify-center gap-4 mt-3 text-xs font-semibold text-blue-700/80">
                                    <span>Revisión: L. {orden.costoRevision}</span>
                                    {orden.costoReparacion > 0 && <span>+ Reparación: L. {orden.costoReparacion}</span>}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                    onClick={resetScanner}
                                    className="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3.5 px-6 rounded-xl transition-colors"
                                >
                                    Escanear Otro
                                </button>
                                <button 
                                    onClick={handleConfirmarEntrega}
                                    disabled={loading || orden.estado === 'ENTREGADO'}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Procesando...' : 'Entregar Equipo (Checkout)'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ESTADO 4: Éxito de Entrega */}
                    {entregado && (
                        <div className="py-10 text-center animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800 mb-2">¡Equipo Entregado!</h3>
                            <p className="text-slate-500 mb-8 max-w-[250px] mx-auto">El ticket ha sido cerrado y el equipo entregado exitosamente al cliente.</p>
                            
                            <button 
                                onClick={resetScanner}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl transition-all w-full"
                            >
                                Escanear Siguiente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
