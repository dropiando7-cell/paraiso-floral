import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { KardexClient } from './KardexClient';

export const metadata = {
    title: 'Kardex de Inventario | Bioelectrónica',
};

// Next.js App Router async page component
export default async function KardexPage({ searchParams }: { searchParams: { producto?: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true, organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    const orgId = dbUser.organizationId;
    // Handle async searchParams per NextJS conventions if needed, but synchronous reading works in typical setups
    const params = await searchParams; // In latest NextJS, searchParams is promised
    const productoId = params?.producto;

    const productos = await prisma.producto.findMany({
        where: { organizationId: orgId },
        orderBy: { nombre: 'asc' },
    });

    const whereClause: any = { organizationId: orgId };
    if (productoId) {
        whereClause.productoId = productoId;
    }

    const movimientos = await prisma.movimientoInventario.findMany({
        where: whereClause,
        include: { producto: true, usuario: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    const serializedProductos = productos.map(p => ({
        ...p,
        precioVenta: Number(p.precioVenta),
        costoBase: p.costoBase ? Number(p.costoBase) : null,
    }));

    const serializedMovimientos = movimientos.map(m => ({
        ...m,
        producto: m.producto ? {
            ...m.producto,
            precioVenta: Number(m.producto.precioVenta),
            costoBase: m.producto.costoBase ? Number(m.producto.costoBase) : null,
        } : null,
    }));

    return <KardexClient productos={serializedProductos} movimientos={serializedMovimientos} />;
}
