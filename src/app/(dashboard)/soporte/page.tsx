import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getOrdenesActivas, getHistorialEntregados } from './actions';
import SoporteClient from './SoporteClient';

export const metadata = {
    title: 'Soporte y Taller | Bioelectrónica',
    description: 'Gestión unificada de taller, mantenimiento y reparaciones de equipo',
};

export default async function SoportePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true, customRoleName: true, accessibleModules: true, organizationId: true }
    });

    if (!dbUser) redirect('/login');

    const orgId = dbUser.organizationId;

    const [ordenes, entregadas, clientes, activosClientes] = await Promise.all([
        getOrdenesActivas(),
        getHistorialEntregados(),
        prisma.cliente.findMany({
            where: { organizationId: orgId },
            orderBy: { nombre: 'asc' }
        }),
        prisma.activoFijo.findMany({
            where: {
                organizationId: orgId,
                esEquipoCliente: true
            },
            include: {
                cliente: true,
                ordenesTrabajo: {
                    include: {
                        tecnicosAsignados: {
                            select: { id: true, nombre: true, avatarUrl: true }
                        }
                    },
                    orderBy: { fechaRecibido: 'desc' }
                }
            },
            orderBy: { descripcionCorta: 'asc' }
        })
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
            clientes={clientes}
            activosClientes={activosClientes}
            userRole={dbUser.role}
            customRoleName={dbUser.customRoleName || ''}
            accessibleModules={dbUser.accessibleModules || []}
            userId={dbUser.id}
        />
    );
}
