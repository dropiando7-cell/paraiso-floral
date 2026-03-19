'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Wrench, CheckCircle2, ArrowLeft, Send } from 'lucide-react';
import { createOrdenTrabajo } from '../actions';

type Cliente = { id: string, nombre: string, telefono: string | null };

export default function NuevoSoporteClient({ clientes }: { clientes: Cliente[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // Guardará la orden creada

    const [form, setForm] = useState({
        clienteId: '',
        equipoDano: '',
        marcaModelo: '',
        accesorios: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const orden = await createOrdenTrabajo(form);
            setResult(orden);
        } catch (error) {
            alert('Error al registrar la orden.');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        // Pantalla de Éxito
        const textToWA = `Hola ${result.cliente?.nombre}, le notificamos que hemos recibido su equipo en Bioelectrónica para evaluación técnica: \n\n*Equipo:* ${result.equipoDano}\n*Accesorios:* ${result.accesorios || 'Ninguno'}\n*Costo Revisión:* L. 650.00\n\n*Su código único de retiro es:* ${result.codigoSeguridad}\n_Presente este mensaje al retirar su equipo._`;
        const waLink = result.cliente?.telefono 
            ? `https://wa.me/${result.cliente.telefono.replace(/[\+\s\-]/g, '')}?text=${encodeURIComponent(textToWA)}`
            : `https://wa.me/?text=${encodeURIComponent(textToWA)}`;

        return (
            <div className="p-8 max-w-2xl mx-auto min-h-[80vh] flex flex-col items-center justify-center text-center">
                <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center w-full animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">¡Equipo Recepcionado!</h2>
                    <p className="text-slate-500 mt-2 mb-8">La orden de trabajo ha sido generada con éxito. Cargo a aplicar: L. 650.</p>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 inline-block shadow-inner">
                        <QRCode value={result.codigoSeguridad} size={180} className="mx-auto" />
                        <div className="mt-4 text-2xl tracking-widest font-mono font-bold text-slate-800">
                            {result.codigoSeguridad}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <a 
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <Send className="w-5 h-5" />
                            Enviar Comprobante Whatsapp
                        </a>
                        <button 
                            onClick={() => router.push('/soporte')}
                            className="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-xl transition-colors"
                        >
                            Volver al Taller
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Pantalla de Formulario
    return (
        <div className="p-8 max-w-3xl mx-auto">
            <button 
                onClick={() => router.push('/soporte')}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-6 font-medium transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Volver al Taller
            </button>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50/50 p-6 sm:p-8 border-b border-slate-100 flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Recepción de Equipo</h2>
                        <p className="text-slate-500 mt-1">Llene los datos del aparato para generar la Orden de Trabajo a taller.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cliente Propietario <span className="text-red-500">*</span></label>
                            <input 
                                list="clientes" 
                                required
                                placeholder="Escriba para buscar o seleccione un cliente..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                onChange={(e) => {
                                    const c = clientes.find(c => c.nombre === e.target.value || c.id === e.target.value);
                                    if (c) setForm({...form, clienteId: c.id});
                                }}
                            />
                            <datalist id="clientes">
                                {clientes.map(c => (
                                    <option key={c.id} value={c.nombre} />
                                ))}
                            </datalist>
                            <p className="text-xs text-slate-400 mt-1.5">Asegúrese de agregar el cliente primero en el Directorio si no existe.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción de la falla / Aparato <span className="text-red-500">*</span></label>
                            <input
                                required
                                value={form.equipoDano}
                                onChange={e => setForm({...form, equipoDano: e.target.value})}
                                placeholder="Ej: Monitor Multiparámetro enciende pero pantalla blanca"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Marca y Modelo</label>
                            <input
                                value={form.marcaModelo}
                                onChange={e => setForm({...form, marcaModelo: e.target.value})}
                                placeholder="Ej: Edan X12 (Opcional)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Accesorios que entrega</label>
                            <input
                                value={form.accesorios}
                                onChange={e => setForm({...form, accesorios: e.target.value})}
                                placeholder="Ej: Cable poder, 3 sensores (Opcional)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-blue-900">Cargo No Reembolsable de Evaluación</p>
                            <p className="text-sm text-blue-600/80">Este costo base se genera instantáneamente en este paso.</p>
                        </div>
                        <div className="text-xl font-black text-blue-700">L. 650.00</div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-sm shadow-blue-200 ${loading ? 'opacity-50 cursor-not-allowed flex items-center gap-2' : ''}`}
                        >
                            {loading ? 'Generando...' : 'Registrar Equipo y Generar QR'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
