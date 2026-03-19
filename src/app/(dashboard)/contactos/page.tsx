import { prisma } from '@/lib/prisma';
import ContactosClient from './ContactosClient';

export const metadata = {
    title: 'Directorio de Contactos | Bioelectrónica',
    description: 'Gestión de clientes y contactos',
};

export default async function ContactosPage() {
    const org = await prisma.organization.findFirst();
    if (!org) {
        return <div className="p-8 text-center text-slate-500">Error: Organización no encontrada</div>;
    }

    // SSR fetch the first 10 contacts ordered alphabetically
    const contacts = await prisma.cliente.findMany({
        where: { organizationId: org.id },
        orderBy: { nombre: 'asc' },
        take: 10,
    });

    return <ContactosClient initialData={contacts} />;
}
