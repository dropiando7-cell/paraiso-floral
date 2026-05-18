import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import PagosClient from './PagosClient';

export const metadata = {
    title: 'Estado de Cuenta de Renta | Bioelectrónica',
};

export default async function PagosRentaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    const renta = await prisma.rentaEquipo.findFirst({
        where: {
            id,
            organizationId: dbUser.organizationId
        },
        include: {
            cliente: true,
            activoFijo: true,
            pagos: {
                orderBy: { fechaPago: 'desc' }
            }
        }
    });

    if (!renta) redirect('/rentas');

    // Convert decimal values to numbers for client components
    const rentaSerialized = {
        ...renta,
        costoRenta: Number(renta.costoRenta),
        deposito: Number(renta.deposito),
        depositoDevuelto: renta.depositoDevuelto ? Number(renta.depositoDevuelto) : null,
        pagos: renta.pagos.map(p => ({
            ...p,
            monto: Number(p.monto)
        }))
    };

    return <PagosClient renta={rentaSerialized} />;
}
