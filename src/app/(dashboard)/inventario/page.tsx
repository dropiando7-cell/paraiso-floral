import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { getActivos, getActivoStats } from './actions';
import { InventarioClient } from './InventarioClient';

export const metadata = {
    title: 'Inventario de Activos | Bioelectrónica',
    description: 'Gestión y control de inventario',
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

    // @ts-ignore - Prisma client needs regeneration to include INVENTARIO_EDITOR
    if (dbUser.role === 'INVENTARIO_EDITOR') {
        redirect('/inventario/historico');
    }

    const orgId = dbUser.organizationId;

    // Fetch initial data on the server for instant UI rendering!
    const [initialData, initialStats, dbAreas] = await Promise.all([
        getActivos(1, '', '', ''),
        getActivoStats(),
        prisma.area.findMany({
            where: { organizationId: orgId },
            orderBy: { name: 'asc' },
        })
    ]);

    return <InventarioClient initialData={initialData} initialStats={initialStats} dbAreas={dbAreas} userRole={dbUser.role} />;
}
