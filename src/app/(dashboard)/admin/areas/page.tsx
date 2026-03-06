import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import AdminAreasClient from './AdminAreasClient';
import { getAreas } from './actions';

export const metadata = {
    title: 'Mantenimiento de Áreas | Sistemas Elim',
    description: 'Gestión de áreas físicas para el inventario',
};

export default async function AdminAreasPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    // Solo super admins o admins de org
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN') {
        redirect('/unauthorized');
    }

    const areas = await getAreas();

    return <AdminAreasClient initialAreas={areas} />;
}
