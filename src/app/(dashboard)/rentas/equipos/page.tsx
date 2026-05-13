import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { InventarioClient } from '../../inventario/InventarioClient';
import { getEquiposParaRenta, getRentaStats } from './actions';

export const metadata = {
    title: 'Equipos para Renta | Bioelectrónica',
    description: 'Gestión de equipos médicos disponibles para arrendamiento',
};

export default async function EquiposRentaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    const orgId = dbUser.organizationId;

    const [initialData, initialStats, dbAreas] = await Promise.all([
        getEquiposParaRenta(1, '', '', ''),
        getRentaStats(),
        prisma.area.findMany({
            where: { organizationId: orgId },
            orderBy: { name: 'asc' },
        })
    ]);

    return (
        <InventarioClient 
            initialData={initialData} 
            initialStats={initialStats} 
            dbAreas={dbAreas} 
            userRole={dbUser.role} 
            isRentaMode={true} 
        />
    );
}
