import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { Box, Sparkles, TrendingUp, Users } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });

    // Verificar si el usuario tiene acceso al Portal (módulo '/')
    if (dbUser?.role !== 'SUPER_ADMIN') {
      const allowedModules = dbUser?.accessibleModules || [];
      if (!allowedModules.includes('/')) {
        // Si no tiene acceso al dashboard principal, lo enviamos a su primer módulo o a /unauthorized
        if (allowedModules.length > 0) {
          redirect(allowedModules[0]);
        } else {
          redirect('/unauthorized');
        }
      }
    }

    if (dbUser?.role === 'CHECKIN_KIDS') {
      redirect('/checkin');
    }
    if (dbUser?.role === 'MEDICAL_STAFF') {
      redirect('/medico');
    }
  }

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">
        Panorama General
      </h1>

      <div className="bg-brand-900 border border-brand-800 rounded-2xl p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bienvenido al Portal Bioelectrónica
          </h2>
          <p className="text-brand-100/80 text-lg">
            Tu centro de mando para la gestión de equipos médicos, refrigeración industrial e inventario especializado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: "Equipos en Inventario", value: "0", icon: Box, color: "text-blue-500", bg: "bg-blue-50" },
          { title: "Rentas Activas", value: "0", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
          { title: "Tickets de Soporte", value: "0", icon: Users, color: "text-orange-500", bg: "bg-orange-50" },
          { title: "Evaluaciones IA", value: "0", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
             <div className={`p-4 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
             </div>
             <div>
               <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
               <h4 className="text-2xl font-bold text-slate-800">{stat.value}</h4>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-12">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm col-span-1 lg:col-span-2 min-h-[400px] flex flex-col items-center justify-center text-slate-400">
          <Sparkles className="w-12 h-12 mb-4 text-slate-300" />
          <p className="font-medium text-lg text-slate-600">Módulo de Gráficas en Construcción</p>
          <span className="text-sm">Las analíticas de inventario y rentas aparecerán aquí.</span>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[400px] flex flex-col gap-4">
          <h3 className="font-semibold text-slate-800">Estado del Sistema</h3>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-medium text-emerald-800 text-sm">Base de Datos</p>
              <p className="text-xs text-emerald-600">Conexión establecida</p>
            </div>
            <span className="text-xs font-bold text-emerald-700">100%</span>
          </div>

          <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-medium text-brand-800 text-sm">Almacenamiento R2</p>
              <p className="text-xs text-brand-600">Alistando buckets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
