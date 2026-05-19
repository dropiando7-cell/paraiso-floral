import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RecepcionClient from './RecepcionClient';

export default async function RecepcionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });

    if (!dbUser) redirect('/login');

    const renta = await prisma.rentaEquipo.findUnique({
        where: { id, organizationId: dbUser.organizationId },
        include: {
            cliente: true,
            activoFijo: true,
        }
    });

    if (!renta || renta.estado !== 'ACTIVA') {
        redirect('/rentas');
    }

    const rentaSerialized = {
        ...renta,
        costoRenta: Number(renta.costoRenta),
        deposito: Number(renta.deposito),
        depositoDevuelto: renta.depositoDevuelto ? Number(renta.depositoDevuelto) : null,
    };

    return <RecepcionClient renta={rentaSerialized} />;
}
