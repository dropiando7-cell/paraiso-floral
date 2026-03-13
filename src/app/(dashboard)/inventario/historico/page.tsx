import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import HistoricoEditorClient from './HistoricoEditorClient';

export const metadata = { title: 'Editor Histórico | SistemasElim' };

export default async function HistoricoPage() {
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

    return <HistoricoEditorClient />;
}
