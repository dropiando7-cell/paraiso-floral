import { AIBanner } from '@/components/dashboard/AIBanner';
import { EventBanner } from '@/components/dashboard/EventBanner';
import { KPIGrid } from '@/components/dashboard/KPIGrid';

export default function Home() {
  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">
        Panorama General
      </h1>

      <AIBanner />
      <EventBanner />
      <KPIGrid />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-12">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm col-span-1 lg:col-span-2 min-h-[400px] flex flex-col items-center justify-center text-slate-400">
          <p className="font-medium">Gráfico de Flujo de Caja Multisede en construcción...</p>
          <span className="text-sm">Se integrará con Recharts próximamente.</span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[400px] flex flex-col gap-4">
          <h3 className="font-semibold text-slate-800">Estado del Sistema</h3>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-medium text-emerald-800 text-sm">Cloudflare Zero Trust</p>
              <p className="text-xs text-emerald-600">Protección activa</p>
            </div>
            <span className="text-xs font-bold text-emerald-700">100%</span>
          </div>

          <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl flex items-center justify-between opacity-80">
            <div>
              <p className="font-medium text-brand-800 text-sm">Database Backup</p>
              <p className="text-xs text-brand-600">Último hace 2 horas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
