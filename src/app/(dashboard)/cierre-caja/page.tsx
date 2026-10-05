import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getActiveCajaSession, getHistorialCortes } from './actions';
import CierreCajaClient from './CierreCajaClient';

export const metadata = {
    title: 'Cierre de Caja Diario (Ventas) | Paraíso Floral',
    description: 'Módulo de arqueo y cierre diario de caja para ventas.',
};

export default async function CierreCajaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        redirect('/login');
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, accessibleModules: true }
    });

    const isAllowed = 
        dbUser?.role === 'SUPER_ADMIN' ||
        dbUser?.role === 'ORG_ADMIN' ||
        dbUser?.role === 'GERENTE' ||
        (dbUser?.accessibleModules || []).includes('/cierre-caja');

    if (!isAllowed) {
        redirect('/');
    }

    const activeSession = await getActiveCajaSession();
    const history = await getHistorialCortes();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Cierre de Caja Diario (Ventas)
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Controla el flujo de caja diario comercial. Abre turnos, realiza arqueo de efectivo y genera reportes de rendimiento fidedignos.
                </p>
            </div>

            <CierreCajaClient 
                initialActiveSession={activeSession} 
                initialHistory={history} 
            />
        </div>
    );
}
