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

    const orgId = dbUser.organizationId;

    // Pre-load first page of activos and stats server-side to avoid client loading flash
    const [activosRaw, total, statsData] = await Promise.all([
        prisma.activoFijo.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        }),
        prisma.activoFijo.count({ where: { organizationId: orgId } }),
        Promise.all([
            prisma.activoFijo.count({ where: { organizationId: orgId, estatusContable: 'VIGENTE' } }),
            prisma.activoFijo.count({ where: { organizationId: orgId, estatusContable: 'DEPRECIADO' } }),
            prisma.activoFijo.count({ where: { organizationId: orgId, estatusContable: 'PROCESO DE BAJA' } }),
            prisma.activoFijo.count({ where: { organizationId: orgId, estadoDano: { not: null } } }),
            prisma.activoFijo.groupBy({ by: ['area'], where: { organizationId: orgId } }),
        ]),
    ]);

    const [vigente, depreciado, procesoBaja, conDano, areasCount] = statsData;

    const initialData = {
        activos: JSON.parse(JSON.stringify(activosRaw)),
        total,
        totalPages: Math.ceil(total / 10),
    };

    const initialStats = {
        total,
        vigente,
        depreciado,
        procesoBaja,
        conDano,
        areasRegistradas: areasCount.length,
    };

    return <InventarioClient initialData={initialData} initialStats={initialStats} />;
}
