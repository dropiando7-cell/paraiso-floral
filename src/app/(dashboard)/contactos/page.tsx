import { prisma } from '@/lib/prisma';
import ContactosClient from './ContactosClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Directorio de Contactos | Bioelectrónica',
    description: 'Gestión de clientes y contactos',
};

export default async function ContactosPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true }
    });
    if (!dbUser) redirect('/unauthorized');

    const orgId = dbUser.organizationId;

    // SSR fetch the first 10 contacts ordered alphabetically
    const contacts = await prisma.cliente.findMany({
        where: { organizationId: orgId },
        orderBy: { nombre: 'asc' },
        take: 10,
    });

    return <ContactosClient initialData={contacts} />;
}
