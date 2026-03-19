import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import NuevaRentaClient from './NuevaRentaClient';
import { getClientesLista, getEquiposDisponibles } from '../actions2';

export const metadata = {
    title: 'Nueva Renta | Bioelectrónica',
};

export default async function NuevaRentaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true },
    });

    if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN')) {
        redirect('/unauthorized');
    }

    const [clientes, equipos] = await Promise.all([
        getClientesLista(),
        getEquiposDisponibles()
    ]);

    return <NuevaRentaClient clientes={clientes} equipos={equipos} />;
}
