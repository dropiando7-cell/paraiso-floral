import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { getMantenimientosData } from './actions';
import MantenimientosClient from './MantenimientosClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Garantías y Mantenimientos | Bioelectrónica',
    description: 'Gestión y control de mantenimientos preventivos y garantías de equipos',
};

export default async function MantenimientosPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true, customRoleName: true, accessibleModules: true }
    });

    if (!dbUser) redirect('/unauthorized');

    // Fetch maintenance and equipment data
    const data = await getMantenimientosData();

    if (!data.success) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-600">Error al cargar el módulo</h1>
                <p className="text-slate-500 mt-2">{data.error || 'Ocurrió un error desconocido'}</p>
            </div>
        );
    }

    return (
        <MantenimientosClient
            initialEquipos={data.equipos || []}
            initialMantenimientos={data.mantenimientos || []}
            clientes={data.clientes || []}
            usuarios={data.usuarios || []}
            config={data.config || { notificarDias: 5, whatsappTemplateSid: 'HXa363e371108b8cd13811d22b75ccbc74' }}
            userRole={dbUser.role}
        />
    );
}
