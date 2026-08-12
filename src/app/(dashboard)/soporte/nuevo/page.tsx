import { prisma } from '@/lib/prisma';
import NuevoSoporteClient from './NuevoSoporteClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Nueva Recepción | Soporte | Bioelectrónica',
    description: 'Recepcionar nuevo equipo para evaluación',
};

export default async function NuevoSoportePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) redirect('/login');

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) return <div>Usuario no encontrado</div>;
    const orgId = dbUser.organizationId;

    const resolvedParams = await searchParams;
    const activoIdParam = typeof resolvedParams?.activoId === 'string' ? resolvedParams.activoId : undefined;

    let initialActivo: any = null;
    let initialGarantiaConfig: any = null;

    if (activoIdParam) {
        const act = await prisma.activoFijo.findFirst({
            where: { id: activoIdParam, organizationId: orgId },
            include: { cliente: true }
        });
        if (act) {
            initialActivo = JSON.parse(JSON.stringify(act));
        }

        const lastOrder = await prisma.ordenTrabajo.findFirst({
            where: { activoId: activoIdParam, organizationId: orgId, aplicaMantenimientos: true },
            orderBy: { id: 'desc' },
            select: {
                aplicaMantenimientos: true,
                garantiaMeses: true,
                frecuenciaMantenimientoMeses: true,
                cantidadMantenimientos: true
            }
        });
        if (lastOrder) {
            initialGarantiaConfig = lastOrder;
        }
    }

    const clientes = await prisma.cliente.findMany({
        where: { organizationId: orgId },
        orderBy: { nombre: 'asc' }
    });

    const users = await prisma.user.findMany({
        where: { 
            organizationId: orgId,
            isAssignable: { not: false }
        },
        orderBy: { nombre: 'asc' }
    });

    return (
        <NuevoSoporteClient 
            userId={dbUser?.id || ''} 
            clientes={clientes} 
            users={users} 
            initialActivo={initialActivo}
            initialGarantiaConfig={initialGarantiaConfig}
        />
    );
}
