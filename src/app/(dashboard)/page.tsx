import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { TrendingUp, TrendingDown, Clock, Activity, Users, Box, Wallet } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });

    if (dbUser?.role !== 'SUPER_ADMIN') {
      const allowedModules = dbUser?.accessibleModules || [];
      console.log('page.tsx: dbUser is', dbUser?.email, 'allowedModules:', allowedModules);
      if (!allowedModules.includes('/')) {
        if (allowedModules.length > 0) {
            console.log('page.tsx: redirecting to', allowedModules[0]);
            redirect(allowedModules[0]);
        }
        else {
            console.log('page.tsx: no allowed modules, redirecting to unauthorized');
            redirect('/unauthorized');
        }
      }
    }
    if (dbUser?.role === 'CHECKIN_KIDS') redirect('/checkin');
    if (dbUser?.role === 'MEDICAL_STAFF') redirect('/medico');
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 ease-out py-2 w-full max-w-7xl mx-auto">
      
      {/* Cards - V0 Moderno Blue Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* KPI 1 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Ingresos Totales</h3>
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700">
              <TrendingUp className="w-3 h-3 text-brand-600" />
              <span>+12.5%</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">L. 54,231.00</h2>
            <div className="mt-4 text-xs">
              <p className="text-slate-700 font-medium">Incremento este mes <TrendingUp className="w-3 h-3 inline text-slate-500 ml-1"/></p>
              <p className="text-slate-400 mt-0.5">Ventas y servicios al cierre</p>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Nuevos Clientes</h3>
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span>-20%</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">124</h2>
            <div className="mt-4 text-xs">
              <p className="text-slate-700 font-medium">Baja 20% en este periodo <TrendingDown className="w-3 h-3 inline text-slate-500 ml-1"/></p>
              <p className="text-slate-400 mt-0.5">Captación requiere atención</p>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Equipos Activos</h3>
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700">
              <TrendingUp className="w-3 h-3 text-brand-600" />
              <span>+12.5%</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">45,678</h2>
            <div className="mt-4 text-xs">
              <p className="text-slate-700 font-medium">Fuerte retención de inventario <TrendingUp className="w-3 h-3 inline text-slate-500 ml-1"/></p>
              <p className="text-slate-400 mt-0.5">Disponibilidad excede meta</p>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Tasa de Crecimiento</h3>
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700">
              <TrendingUp className="w-3 h-3 text-brand-600" />
              <span>+4.5%</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">4.5%</h2>
            <div className="mt-4 text-xs">
              <p className="text-slate-700 font-medium">Aumento constante visual <TrendingUp className="w-3 h-3 inline text-slate-500 ml-1"/></p>
              <p className="text-slate-400 mt-0.5">Cumple las proyecciones</p>
            </div>
          </div>
        </div>

      </div>

      {/* Main Chart Card (V0 Degradado Azul Palido) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative h-[450px]">
        {/* Superior Header */}
        <div className="p-6 pb-2 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Crecimiento Anual</h3>
            <p className="text-sm text-slate-500">Tráfico de los últimos meses (demostración visual)</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
            <button className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors hover:bg-slate-100">Últimos 3 meses</button>
            <button className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors hover:bg-slate-100">Últimos 30 días</button>
            <button className="px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-100 rounded-md shadow-sm border border-brand-200">Últimos 7 días</button>
          </div>
        </div>

        {/* The Wave Graph Section */}
        <div className="flex-1 w-full mt-10 relative overflow-hidden flex items-end">
          
          {/* Simulated Wave SVG */}
          <div className="absolute inset-0 w-full h-full flex items-end opacity-90 mix-blend-multiply">
              <svg viewBox="0 0 1000 250" preserveAspectRatio="none" className="w-full h-[80%] stroke-brand-500 stroke-[3px]" fill="none">
                  {/* Pale Blue Gradient Filling */}
                  <defs>
                      <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.25" />
                         <stop offset="40%" stopColor="var(--color-brand-300)" stopOpacity="0.1" />
                         <stop offset="100%" stopColor="var(--color-brand-100)" stopOpacity="0" />
                      </linearGradient>
                      
                      <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" stopColor="var(--color-brand-600)" stopOpacity="0.15" />
                         <stop offset="100%" stopColor="var(--color-brand-50)" stopOpacity="0" />
                      </linearGradient>
                  </defs>

                  {/* Back Wave */}
                  <path 
                     d="M0,150 C150,150 250,50 400,100 C550,150 650,230 800,180 C900,140 950,90 1000,110 L1000,250 L0,250 Z" 
                     fill="url(#waveGradient2)"
                     className="stroke-brand-300 stroke-2"
                  />
                  {/* Front Main Wave */}
                  <path 
                     d="M0,200 C200,200 300,50 500,120 C700,190 800,240 1000,150 L1000,250 L0,250 Z" 
                     fill="url(#waveGradient)"
                     className="stroke-brand-500 stroke-[3px]"
                  />
              </svg>
          </div>

          {/* Dots on the line (Simulating Data points) */}
          <div className="absolute inset-0 w-full h-full">
               <div className="absolute left-[20%] top-[45%] w-3 h-3 bg-white border-2 border-brand-500 rounded-full shadow-sm z-20"></div>
               <div className="absolute left-[50%] top-[46%] w-3 h-3 bg-white border-2 border-brand-500 rounded-full shadow-sm z-20"></div>
               <div className="absolute left-[80%] top-[86%] w-3 h-3 bg-white border-2 border-brand-500 rounded-full shadow-sm z-20"></div>
               <div className="absolute left-[98%] top-[58%] w-3 h-3 bg-white border-2 border-brand-500 rounded-full shadow-sm z-20"></div>
          </div>

          {/* X Axis Labels */}
          <div className="w-full absolute bottom-4 px-8 flex justify-between text-xs font-medium text-slate-400 z-30">
             <span>Jun 23</span>
             <span>Jun 24</span>
             <span>Jun 25</span>
             <span>Jun 26</span>
             <span>Jun 27</span>
             <span>Jun 28</span>
             <span>Jun 29</span>
          </div>

          <div className="w-full h-[60px] bg-gradient-to-t from-white to-transparent absolute bottom-0 z-10 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}
