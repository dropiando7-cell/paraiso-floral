import { prisma } from '@/lib/prisma';
import NuevoSoporteClient from './NuevoSoporteClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Nueva Recepción | Soporte | Bioelectrónica',
    description: 'Recepcionar nuevo equipo para evaluación',
};

export default async function NuevoSoportePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) redirect('/login');

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    const org = await prisma.organization.findFirst();
    if (!org) return <div>Org no encontrada</div>;

    const clientes = await prisma.cliente.findMany({
        where: { organizationId: org.id },
        orderBy: { nombre: 'asc' }
    });

    const users = await prisma.user.findMany({
        where: { organizationId: org.id },
        orderBy: { nombre: 'asc' }
    });

    return <NuevoSoporteClient userId={dbUser?.id || ''} clientes={clientes} users={users} />;
}
