import { prisma } from '@/lib/prisma';
import ContactosClient from './ContactosClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Directorio de Clientes | Paraíso Floral',
    description: 'Gestión de clientes y contactos de distribución',
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

    // SSR fetch the first 15 contacts ordered alphabetically
    const contacts = await prisma.cliente.findMany({
        where: { organizationId: orgId },
        orderBy: { nombre: 'asc' },
        take: 15,
    });

    const sanitizedContacts = contacts.map(c => ({
        ...c,
        limiteCredito: c.limiteCredito ? Number(c.limiteCredito) : 0,
        diasCredito: c.diasCredito || 15
    }));

    return <ContactosClient initialData={sanitizedContacts as any} />;
}
