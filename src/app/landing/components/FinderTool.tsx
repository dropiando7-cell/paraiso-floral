'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, CheckCircle2 } from 'lucide-react';

export default function FinderTool() {
    const [facility, setFacility] = useState('');
    const [equipment, setEquipment] = useState('');
    const [budget, setBudget] = useState('');
    const [timeframe, setTimeframe] = useState('');
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!facility || !equipment || !budget || !timeframe || !email) {
            toast.error('Por favor complete todos los campos');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
            toast.success('¡Recomendación solicitada! En breve un ingeniero biomédico se pondrá en contacto.');
        }, 1500);
    };

    if (submitted) {
        return (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-xl flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-500 shadow-md">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="text-slate-900 font-extrabold text-lg">¡Solicitud Procesada!</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                    Hemos recibido tus preferencias. Un ingeniero biomédico analizará las mejores opciones disponibles y te enviará un reporte técnico y cotización a **{email}** en menos de 24 horas.
                </p>
                <button 
                    onClick={() => {
                        setSubmitted(false);
                        setFacility('');
                        setEquipment('');
                        setBudget('');
                        setTimeframe('');
                        setEmail('');
                    }}
                    className="mt-2 text-xs font-bold text-cyan-600 hover:text-cyan-700 underline"
                >
                    Realizar otra consulta
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight text-center uppercase tracking-widest text-slate-400">
                Equipment Finder Tool
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
                {/* Facility */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">¿Qué tipo de centro de salud gestiona?</label>
                    <select 
                        required
                        value={facility} 
                        onChange={(e) => setFacility(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                        <option value="">Seleccione una opción...</option>
                        <option value="clinica">Clínica Privada / Especialidades</option>
                        <option value="hospital">Hospital Clínico / General</option>
                        <option value="quirurgico">Centro Quirúrgico Independiente</option>
                        <option value="consultorio">Consultorio Médico Particular</option>
                    </select>
                </div>

                {/* Equipment Type */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">¿Qué equipo biomédico principal busca?</label>
                    <select 
                        required
                        value={equipment} 
                        onChange={(e) => setEquipment(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                        <option value="">Seleccione una opción...</option>
                        <option value="ultrasonido">Sistemas de Ultrasonido / Ecografía</option>
                        <option value="monitores">Monitores Multiparámetros / Signos Vitales</option>
                        <option value="anestesia">Máquinas de Anestesia y Soporte de Vida</option>
                        <option value="desfibrilador">Desfibriladores y Equipos de Emergencia</option>
                        <option value="otro">Ginecología, Incubadoras u Otros</option>
                    </select>
                </div>

                {/* Budget */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">¿Presupuesto estimado asignado?</label>
                    <select 
                        required
                        value={budget} 
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                        <option value="">Seleccione una opción...</option>
                        <option value="bajo">Menos de L 125,000 (~$5,000)</option>
                        <option value="medio">L 125,000 - L 375,000 ($5,000 - $15,000)</option>
                        <option value="alto">L 375,000 - L 750,000 ($15,000 - $30,000)</option>
                        <option value="premium">Más de L 750,000 (+$30,000)</option>
                    </select>
                </div>

                {/* Timeframe */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">¿Tiempo estimado para la adquisición?</label>
                    <select 
                        required
                        value={timeframe} 
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                        <option value="">Seleccione una opción...</option>
                        <option value="inmediato">Inmediato (Menos de 30 días)</option>
                        <option value="medio">Corto Plazo (1 - 3 meses)</option>
                        <option value="largo">Planificación Anual (+3 meses)</option>
                    </select>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico de Contacto</label>
                    <input 
                        type="email"
                        required
                        placeholder="ejemplo@clinica.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                </div>

                {/* Submit */}
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#00a8cc] hover:bg-[#00b4d8] text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] uppercase tracking-wider"
                >
                    <Send size={12} />
                    <span>{loading ? 'Procesando...' : 'Obtener Recomendaciones'}</span>
                </button>
            </form>
        </div>
    );
}
