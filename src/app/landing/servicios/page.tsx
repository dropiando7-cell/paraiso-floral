import React from 'react';
import { Truck, Sparkles, CheckCircle2, Building2, Flower2, Palette, ShieldCheck, CalendarCheck, ArrowRight, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Servicios Florales y Eventos - Distribuidora Paraíso Floral',
    description: 'Suministro mayorista continuo de flores frescas, arreglos para eventos corporativos, bodas y diseño floral personalizado en Honduras.',
};

export default function ServiciosPage() {
    return (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-16 animate-fade-in">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
                <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full inline-block">
                    SERVICIOS FLORALES & EVENTOS
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    Distribución Al Mayor, Eventos y Contratos Florales
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                    Abastecimiento garantizado de flores frescas importadas de Ecuador y Guatemala para floristerías, organizadores de eventos, hoteles y clientes corporativos en Honduras.
                </p>
            </div>

            {/* Contract / Service Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Suministro Continuo a Floristerías */}
                <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] space-y-6 hover:border-emerald-500/30 hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Truck size={28} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-900">Suministro Continuo a Floristerías</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Planificación de entregas periódicas con flores recién importadas conservadas en cámara fría. Garantía de volumen continuo en fechas de alta demanda (San Valentín, Día de las Madres, Navidad).
                        </p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-2.5 font-medium">
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Entregas semanales o bi-semanales programadas.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Calidad Grado A (Premium) con botones grandes y tallos de 70cm+.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Precios preferenciales directo de importación.</span>
                        </li>
                    </ul>
                </div>

                {/* 2. Diseño Floral para Eventos Corporativos y Bodas */}
                <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] space-y-6 hover:border-emerald-500/30 hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles size={28} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-900">Eventos Corporativos y Bodas</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Ambientación floral espectacular para bodas, galas corporativas, ferias, recepciones y graduaciones. Selección personalizada de colores y flores de tendencia.
                        </p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-2.5 font-medium">
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Asesoría de diseño y combinación de paletas cromáticas.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Montaje y asistencia profesional en el lugar del evento.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Disponibilidad de Rosas Freedom, Lirios, Gerberas y Eucalipto.</span>
                        </li>
                    </ul>
                </div>

                {/* 3. Suscripciones para Hoteles y Restaurantes */}
                <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] space-y-6 hover:border-emerald-500/30 hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 size={28} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-900">Suscripciones para Hoteles y Empresas</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Renovación periódica de arreglos florales de bienvenida en recepciones, lobbys de hoteles, restaurantes y salas de juntas ejecutivas.
                        </p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-2.5 font-medium">
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Diseños frescos que se sustituyen semanalmente.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Mantenimiento e hidratación profesional incluidos.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Facturación mensual consolidada para empresas.</span>
                        </li>
                    </ul>
                </div>

                {/* 4. Rosas Tinturadas y Pedidos Especiales */}
                <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] space-y-6 hover:border-emerald-500/30 hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Palette size={28} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-900">Rosas Tinturadas y Pedidos Especiales</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Tinturado exclusivo de rosas en tonos personalizados (Azul Arcoíris, Dorado, Colores Neón) y empaques de lujo en Papel Koreano impermeable.
                        </p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-2.5 font-medium">
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Personalización de tonos bajo pedido anticipado.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Presentaciones en paquetes de 10, 12 y 24 tallos.</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>Atención directa vía WhatsApp para pedidos inmediatos.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom Banner (CTA) */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-900/50 rounded-[2.5rem] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center text-white shadow-2xl">
                <div className="lg:col-span-2 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
                        <Flower2 size={22} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                        ¿Necesitas una cotización mayorista o asesoría para un evento?
                    </h2>
                    <p className="text-xs text-emerald-100/80 leading-relaxed max-w-xl">
                        Diseñamos un plan de suministro floral ajustado al presupuesto, frecuencia y volumen de tu floristería o negocio.
                    </p>
                </div>
                <div className="bg-white/10 backdrop-blur border border-white/10 p-6 rounded-2xl flex flex-col gap-4 text-center shrink-0 shadow-lg">
                    <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest block">Atención Personalizada</span>
                    <p className="text-xs text-slate-200 font-semibold leading-relaxed">Cotiza tu pedido directo por WhatsApp con nuestro equipo de ventas.</p>
                    <a 
                        href="https://wa.me/50431782368?text=Hola,%20quisiera%20solicitar%20informaci%C3%B3n%20sobre%20los%20servicios%20florales%20y%20suministro%20al%20mayor."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:text-white text-xs font-black py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                    >
                        <MessageCircle size={16} />
                        <span>Cotizar Pedido Por WhatsApp</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
