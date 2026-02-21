import { Calendar, MapPin, Users } from 'lucide-react';

export function EventBanner() {
    return (
        <div className="bg-white border border-event-purple-light/50 rounded-2xl p-6 shadow-sm relative overflow-hidden mt-6 group">
            {/* Background soft glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-event-purple-light/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            {/* Header section */}
            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 bg-event-purple text-white rounded-xl flex items-center justify-center shadow-lg shadow-event-purple/20">
                    <Calendar className="w-6 h-6" />
                </div>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Retiro Nacional Unidos en Adoración 2026</h2>
                        <span className="bg-event-purple text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Evento Mayor
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">El evento espiritual más importante del año</p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">

                {/* Fechas */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 group-hover:bg-event-purple/5 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-event-purple" />
                        <span className="text-xs font-bold text-event-purple tracking-widest uppercase">Fechas</span>
                    </div>
                    <div className="font-semibold text-slate-800">02, 03 y 04 de Abril</div>
                    <div className="text-sm text-slate-400 mt-0.5">3 días de bendición</div>
                </div>

                {/* Ubicación */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 group-hover:bg-event-purple/5 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-event-purple" />
                        <span className="text-xs font-bold text-event-purple tracking-widest uppercase">Ubicación</span>
                    </div>
                    <div className="font-semibold text-slate-800">Iglesia Elim Central</div>
                    <div className="text-sm text-slate-400 mt-0.5">Centro de Convenciones Expocentro</div>
                </div>

                {/* Asistencia */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 group-hover:bg-event-purple/5 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-event-purple" />
                        <span className="text-xs font-bold text-event-purple tracking-widest uppercase">Asistencia</span>
                    </div>
                    <div className="font-semibold text-slate-800">15,000+ Esperados</div>
                    <div className="text-sm text-slate-400 mt-0.5 flex flex-col sm:flex-row sm:items-center justify-between">
                        <span>Registro abierto</span>
                        {/* Optional call to action */}
                        <button className="text-event-purple hover:underline text-xs font-medium mt-1 sm:mt-0 transition-all">Ver detalles →</button>
                    </div>
                </div>

            </div>
        </div>
    );
}
