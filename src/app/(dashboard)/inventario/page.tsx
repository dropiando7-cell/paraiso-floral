import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { InventarioClient } from './InventarioClient';

export const metadata = {
    title: 'Inventario de Activos | Sistemas Elim',
    description: 'Gestión y control del patrimonio institucional de Misión Cristiana Elim Honduras',
};

export default async function InventarioPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    const allowedRoles = ['SUPER_ADMIN', 'ORG_ADMIN'];
    if (!allowedRoles.includes(dbUser.role)) redirect('/unauthorized');

    return <InventarioClient />;
}
