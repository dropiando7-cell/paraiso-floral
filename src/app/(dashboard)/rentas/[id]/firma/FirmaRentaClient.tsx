'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Smartphone, Printer, Send, CheckCircle2, ArrowLeft, Loader2, PenTool } from 'lucide-react';
import Link from 'next/link';

export default function FirmaRentaClient({ renta }: { renta: any }) {
    const router = useRouter();
    const [publicUrl, setPublicUrl] = useState('');
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

    useEffect(() => {
        // Set public URL for the QR code
        if (typeof window !== 'undefined') {
            setPublicUrl(`${window.location.origin}/c/${renta.id}/firmar`);
        }
    }, [renta.id]);

    useEffect(() => {
        // Poll for signature status every 3 seconds
        const interval = setInterval(async () => {
            if (renta.estado !== 'PENDIENTE_FIRMA') return;
            try {
                const res = await fetch(`/api/rentas/${renta.id}/status`);
                const data = await res.json();
                if (data.estado === 'ACTIVA' && data.firmaUrl) {
                    router.push(`/rentas/${renta.id}/contrato`);
                }
            } catch (err) {}
        }, 3000);
        return () => clearInterval(interval);
    }, [renta.id, renta.estado, router]);

    const handleWhatsApp = async () => {
        setSendingWhatsapp(true);
        // Fallback for now until Twilio backend is ready: open wa.me
        const phone = renta.cliente?.telefono?.replace(/[^0-9]/g, '');
        if (phone) {
            const message = encodeURIComponent(`Hola ${renta.cliente?.nombre}, por favor ingresa a este enlace para firmar tu contrato de renta de equipo: ${publicUrl}`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        } else {
            alert('El cliente no tiene un teléfono registrado válido.');
        }
        setSendingWhatsapp(false);
    };

    if (renta.estado === 'ACTIVA') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
                <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-6" />
                <h1 className="text-3xl font-bold text-slate-800 mb-2">¡Contrato Firmado!</h1>
                <p className="text-slate-500 mb-8 text-center max-w-md">La firma del cliente ha sido registrada exitosamente. Generando documento oficial...</p>
                <button 
                    onClick={() => router.push(`/rentas/${renta.id}/contrato`)}
                    className="bg-[#0500A3] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/20"
                >
                    Ver Contrato PDF
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/rentas" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Recolección de Firma</h1>
                        <p className="text-sm text-slate-500">El contrato de {renta.cliente?.nombre} requiere firma para activarse.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Option 1: QR (Presencial) */}
                    <div className="md:col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-50 text-[#0500A3] rounded-full flex items-center justify-center mb-6">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Firma Presencial</h2>
                        <p className="text-sm text-slate-500 mb-8">Pide al cliente que escanee este código con su celular para firmar digitalmente.</p>
                        
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 transition-transform hover:scale-105">
                            {publicUrl ? (
                                <QRCode value={publicUrl} size={180} />
                            ) : (
                                <div className="w-[180px] h-[180px] bg-slate-100 animate-pulse rounded-lg" />
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Esperando firma...
                        </div>
                    </div>

                    {/* Options 2 & 3 */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Option 2: WhatsApp (Remoto) */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <Send className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-slate-800 mb-2">Firma a Domicilio (WhatsApp)</h2>
                                    <p className="text-sm text-slate-500 mb-6">Envía un mensaje automatizado con el enlace seguro para que el cliente pueda leer el contrato y dibujar su firma desde su casa.</p>
                                    
                                    <button 
                                        onClick={handleWhatsApp}
                                        disabled={sendingWhatsapp}
                                        className="bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#128C7E] transition-colors flex items-center gap-2 shadow-md shadow-green-900/10 active:scale-95 disabled:opacity-70"
                                    >
                                        {sendingWhatsapp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        Enviar Enlace Seguro por WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Option 3: Imprimir (Manual Fallback) */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 opacity-80 hover:opacity-100 transition-opacity">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">
                                    <Printer className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-slate-800 mb-2">Firma Manual (Papel)</h2>
                                    <p className="text-sm text-slate-500 mb-6">Si el cliente tiene dificultades con la tecnología, puedes imprimir el contrato físico tradicional y que lo firme con bolígrafo.</p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button 
                                            onClick={() => router.push(`/rentas/${renta.id}/contrato?imprimir=true`)}
                                            className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 active:scale-95"
                                        >
                                            <Printer className="w-5 h-5 text-slate-400" />
                                            Imprimir PDF
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (confirm('¿Confirmas que el cliente ya firmó el documento físico?')) {
                                                    await fetch(`/api/rentas/${renta.id}/firmar-manual`, { method: 'POST' });
                                                    router.refresh();
                                                }
                                            }}
                                            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                            Activar Manualmente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
