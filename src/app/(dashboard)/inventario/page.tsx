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

    // @ts-ignore - Prisma client needs regeneration to include INVENTARIO_EDITOR
    if (dbUser.role === 'INVENTARIO_EDITOR') {
        redirect('/inventario/historico');
    }

    const orgId = dbUser.organizationId;

    // Remove heavy SSR blocking queries for assets and stats.
    // The client component will fetch these asynchronously on mount to avoid freezing the UI navigation.
    const initialData = { activos: [], total: 0, totalPages: 1 };
    const initialStats = null;

    const dbAreas = await prisma.area.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' },
    });

    return <InventarioClient initialData={initialData} initialStats={initialStats} dbAreas={dbAreas} userRole={dbUser.role} />;
}
