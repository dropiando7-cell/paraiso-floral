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
    if (!dbUser) return <div>Usuario no encontrado</div>;
    const orgId = dbUser.organizationId;

    const clientes = await prisma.cliente.findMany({
        where: { organizationId: orgId },
        orderBy: { nombre: 'asc' }
    });

    const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        orderBy: { nombre: 'asc' }
    });

    return <NuevoSoporteClient userId={dbUser?.id || ''} clientes={clientes} users={users} />;
}
