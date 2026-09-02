import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ControlHorasClient } from './ControlHorasClient';
import { getHistorialReportesHoras } from './actions';

export const dynamic = 'force-dynamic';

export default async function ControlHorasPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true, role: true, accessibleModules: true },
    });
    if (!dbUser) redirect('/unauthorized');

    // Access check: SUPER_ADMIN, ORG_ADMIN, GERENTE, or explicitly allowed in accessibleModules
    const isAllowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'GERENTE'].includes(dbUser.role) ||
        (dbUser.accessibleModules && dbUser.accessibleModules.includes('/control-horas'));

    if (!isAllowed) {
        redirect('/unauthorized');
    }

    const historial = await getHistorialReportesHoras();

    return (
        <ControlHorasClient
            userRole={dbUser.role}
            initialHistorial={historial}
        />
    );
}
