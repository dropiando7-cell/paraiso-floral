import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { EntradasClient } from './EntradasClient';

export const metadata = {
    title: 'Entradas de Inventario | Bioelectrónica',
};

export default async function EntradasPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true, organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    const orgId = dbUser.organizationId;

    // Fetch catalog products to display in the dropdown
    const productos = await prisma.producto.findMany({
        where: { organizationId: orgId, estado: 'ACTIVO' },
        orderBy: { nombre: 'asc' },
    });

    // Fetch recent movements for the history table
    const recientes = await prisma.movimientoInventario.findMany({
        where: { organizationId: orgId, tipoMovimiento: 'ENTRADA' },
        include: { producto: true, usuario: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return <EntradasClient productos={productos} recientes={recientes} orgId={orgId} userId={dbUser.id} />;
}
