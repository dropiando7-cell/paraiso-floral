import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { getRentas } from './actions';
import RentasClient from './RentasClient';

export const metadata = {
    title: 'Rentas de Equipos | Bioelectrónica',
    description: 'Gestión de rentas de equipo médico',
};

export default async function RentasPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true, accessibleModules: true },
    });

    if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && !dbUser.accessibleModules.includes('/rentas'))) {
        redirect('/unauthorized');
    }

    const rawRentas = await getRentas();
    const initialRentas = rawRentas.map(renta => ({
        ...renta,
        costoRenta: Number(renta.costoRenta),
        deposito: Number(renta.deposito),
    }));

    return <RentasClient initialRentas={initialRentas} />;
}
