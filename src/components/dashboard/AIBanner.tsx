import { Sparkles, Zap } from 'lucide-react';

export function AIBanner() {
    return (
        <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-6 text-white shadow-lg shadow-brand-500/20 flex items-center justify-between relative overflow-hidden group">

            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute bottom-0 left-20 w-64 h-64 bg-brand-400/20 rounded-full blur-2xl -mb-20 pointer-events-none" />

            <div className="flex gap-5 items-start relative z-10 w-full">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/20 backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-brand-100" />
                </div>

                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight mb-1">Análisis de Tendencias Financieras</h2>
                        <p className="text-brand-100 text-sm">
                            Crecimiento proyectado del <strong className="text-white">12%</strong> para el próximo trimestre basado en datos históricos y tendencias actuales.
                        </p>
                    </div>

                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm shrink-0">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>IA Activa</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
