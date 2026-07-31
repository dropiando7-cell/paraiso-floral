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
        costoRevision: orden.costoRevision !== null && orden.costoRevision !== undefined ? Number(orden.costoRevision) : null,
        costoReparacion: orden.costoReparacion !== null && orden.costoReparacion !== undefined ? Number(orden.costoReparacion) : null,
    }));

    const safeEntregadas = entregadas.map((orden: any) => ({
        ...orden,
        costoRevision: orden.costoRevision !== null && orden.costoRevision !== undefined ? Number(orden.costoRevision) : null,
        costoReparacion: orden.costoReparacion !== null && orden.costoReparacion !== undefined ? Number(orden.costoReparacion) : null,
    }));

    const safeActivosClientes = activosClientes.map((activo: any) => ({
        ...activo,
        costoAdq: activo.costoAdq !== null && activo.costoAdq !== undefined ? Number(activo.costoAdq) : null,
        vidaUtilOverride: activo.vidaUtilOverride !== null && activo.vidaUtilOverride !== undefined ? Number(activo.vidaUtilOverride) : null,
        valResidual: activo.valResidual !== null && activo.valResidual !== undefined ? Number(activo.valResidual) : null,
        baseDeprec: activo.baseDeprec !== null && activo.baseDeprec !== undefined ? Number(activo.baseDeprec) : null,
        deprecMensual: activo.deprecMensual !== null && activo.deprecMensual !== undefined ? Number(activo.deprecMensual) : null,
        deprecAcum: activo.deprecAcum !== null && activo.deprecAcum !== undefined ? Number(activo.deprecAcum) : null,
        valorLibros: activo.valorLibros !== null && activo.valorLibros !== undefined ? Number(activo.valorLibros) : null,
        ordenesTrabajo: (activo.ordenesTrabajo || []).map((o: any) => ({
            ...o,
            costoRevision: o.costoRevision !== null && o.costoRevision !== undefined ? Number(o.costoRevision) : null,
            costoReparacion: o.costoReparacion !== null && o.costoReparacion !== undefined ? Number(o.costoReparacion) : null,
        }))
    }));

    return (
        <SoporteClient 
            initialData={safeOrdenes} 
            deliveredData={safeEntregadas}
            clientes={clientes}
            activosClientes={safeActivosClientes}
            userRole={dbUser.role}
            customRoleName={dbUser.customRoleName || ''}
            accessibleModules={dbUser.accessibleModules || []}
            userId={dbUser.id}
        />
    );
}
