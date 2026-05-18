import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import FirmaRentaClient from './FirmaRentaClient';

export const metadata = {
    title: 'Firma de Contrato | Bioelectrónica',
};

export default async function FirmaRentaPage({ params }: { params: { id: string } }) {
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
            id: params.id,
            organizationId: dbUser.organizationId
        },
        include: {
            cliente: true,
            activoFijo: true
        }
    });

    if (!renta) redirect('/rentas');

    return <FirmaRentaClient renta={renta as any} />;
}
