import React from 'react';
import { Wrench, CheckCircle2, Shield, HeartPulse, FileText, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Contratos y Servicios Biomédicos - Bioelectrónica',
    description: 'Ofrecemos mantenimiento preventivo, correctivo y contratos de calibración de equipo médico en Honduras.',
};

export default function ServiciosPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-16 animate-fade-in">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                    Soporte Técnico de Nivel Hospitalario
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                    Contratos de Soporte y Servicios Biomédicos
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Asegura el cumplimiento normativo de tu clínica y protege la inversión en tus equipos médicos. Ingenieros certificados respaldan cada intervención.
                </p>
            </div>

            {/* Contract Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Preventivo */}
                <div className="p-8 bg-white border border-slate-200 rounded-[2rem] space-y-6 hover:border-blue-500/20 shadow-sm transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-650 flex items-center justify-center">
                        <ClipboardCheck size={24} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold text-slate-900">Mantenimiento Preventivo Planificado (PPM)</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Diseñado para prevenir fallas antes de que ocurran. Incluye calibración, pruebas de seguridad eléctrica, limpieza profunda interna, y cambio de consumibles críticos recomendados por el fabricante.
                        </p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-2 font-medium">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Visitas bimestrales o semestrales planificadas.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Certificado de seguridad eléctrica e informes técnicos.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Descuentos preferenciales en adquisición de repuestos.</span>
                        </li>
                    </ul>
                </div>

                {/* Correctivo */}
                <div className="p-8 bg-white border border-slate-200 rounded-[2rem] space-y-6 hover:border-indigo-500/20 shadow-sm transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-650 flex items-center justify-center">
                        <Wrench size={24} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold text-slate-900">Soporte Técnico Correctivo (Asistencia Rápida)</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Respuesta rápida ante emergencias de inoperatividad en quirófanos, UCI o salas de imagenología. Diagnóstico preciso por osciloscopio y analizadores específicos para solucionar bloqueos de software o fallas electrónicas.
                        </p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-2 font-medium">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Tiempo de respuesta garantizado menor a 24 horas.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Técnicos especialistas y laboratorio electrónico propio.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Garantía escrita de 90 días por cada reparación realizada.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Calibration details */}
            <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center">
                        <Shield size={20} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Calibración Biomédica Con Patrones Certificados</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Utilizamos simuladores de signos vitales, analizadores de desfibrilación y seguridad eléctrica de alta gama Fluke Biomedical. Emitimos informes válidos para la obtención de licencias de operación y acreditaciones de calidad de la Secretaría de Salud de Honduras.
                    </p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col gap-4 text-center shrink-0 shadow-sm">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">¿Necesitas un contrato anual?</span>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">Armamos planes a la medida de tu hospital, clínica u odontología.</p>
                    <Link 
                        href="/contacto"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10"
                    >
                        Solicitar Presupuesto
                    </Link>
                </div>
            </div>
        </div>
    );
}
