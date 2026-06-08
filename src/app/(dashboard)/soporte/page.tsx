import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getOrdenesActivas, getHistorialEntregados } from './actions';
import SoporteClient from './SoporteClient';

export const metadata = {
    title: 'Soporte y Reparaciones | Bioelectrónica',
    description: 'Gestión de taller y reparaciones de equipo',
};

export default async function SoportePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, customRoleName: true, accessibleModules: true }
    });

    const [ordenes, entregadas] = await Promise.all([
        getOrdenesActivas(),
        getHistorialEntregados()
    ]);
    
    const safeOrdenes = ordenes.map((orden: any) => ({
        ...orden,
        costoRevision: orden.costoRevision ? Number(orden.costoRevision) : null,
        costoReparacion: orden.costoReparacion ? Number(orden.costoReparacion) : null,
    }));

    const safeEntregadas = entregadas.map((orden: any) => ({
        ...orden,
        costoRevision: orden.costoRevision ? Number(orden.costoRevision) : null,
        costoReparacion: orden.costoReparacion ? Number(orden.costoReparacion) : null,
    }));

    return (
        <SoporteClient 
            initialData={safeOrdenes} 
            deliveredData={safeEntregadas}
            userRole={dbUser?.role || 'USER'}
            customRoleName={dbUser?.customRoleName || ''}
            accessibleModules={dbUser?.accessibleModules || []}
        />
    );
}

