'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactFormClient() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !email || !message) {
            toast.error('Por favor, completa todos los campos requeridos.');
            return;
        }

        setSending(true);
        setTimeout(() => {
            setSending(false);
            toast.success('¡Mensaje enviado con éxito! Nos pondremos en contacto a la brevedad.');
            setName('');
            setPhone('');
            setEmail('');
            setMessage('');
        }, 1500);
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-md">
            <h3 className="font-extrabold text-sm text-slate-900">Enviar Mensaje Rápido</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre Completo</label>
                    <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Manuel Tejada" 
                        className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Número Telefónico</label>
                    <input 
                        type="tel" 
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej: 9988-7766" 
                        className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico</label>
                <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com" 
                    className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensaje / Detalle de la Solicitud</label>
                <textarea 
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Detalla qué equipo necesitas cotizar o el soporte técnico que estás buscando..." 
                    rows={6}
                    className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
            </div>

            <button 
                type="submit"
                disabled={sending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
            >
                <Send size={14} />
                <span>{sending ? 'Enviando Mensaje...' : 'Enviar Mensaje'}</span>
            </button>
        </form>
    );
}
