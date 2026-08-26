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

    // Fetch catalog assets/flowers (ActivoFijo) to display in the dropdown
    const activos = await prisma.activoFijo.findMany({
        where: { organizationId: orgId, estatusContable: 'VIGENTE' },
        orderBy: { descripcionCorta: 'asc' },
    });

    const productos = activos.map(a => ({
        id: a.id,
        sku: a.codigoBarras || a.idQr,
        nombre: a.descripcionCorta,
        stockActual: a.stock
    }));

    // Fetch recent movements for the history table
    const recientes = await prisma.movimientoInventario.findMany({
        where: { organizationId: orgId, tipoMovimiento: 'ENTRADA' },
        include: { producto: true, usuario: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    // Map to plain objects to serialize Decimal values (Next.js cannot pass Decimals to Client Components)
    const plainRecientes = recientes.map(mov => ({
        ...mov,
        producto: mov.producto ? {
            ...mov.producto,
            precioVenta: mov.producto.precioVenta ? Number(mov.producto.precioVenta) : 0,
            costoBase: mov.producto.costoBase ? Number(mov.producto.costoBase) : null,
        } : null
    }));

    return <EntradasClient productos={productos} recientes={plainRecientes} orgId={orgId} userId={dbUser.id} />;
}
