import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ReclasificacionClient from './ReclasificacionClient';

export const metadata = { title: 'Reclasificación Historico | SistemasElim' };

export default async function ReclasificacionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user?.email! },
        select: { organizationId: true, role: true, accessibleModules: true }
    });
    if (!dbUser) redirect('/unauthorized');

    const allowedRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'INVENTARIO_EDITOR'];
    const hasModuleAccess = dbUser.accessibleModules?.includes('/inventario/historico');

    if (!allowedRoles.includes(dbUser.role) && !hasModuleAccess) {
        redirect('/unauthorized');
    }

    return <ReclasificacionClient />;
}
