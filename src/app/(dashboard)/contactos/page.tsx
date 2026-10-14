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

    const [contacts, totalCount, vendedores, rutasRaw] = await Promise.all([
        prisma.cliente.findMany({
            where: { organizationId: orgId },
            include: {
                vendedor: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true
                    }
                }
            },
            orderBy: { nombre: 'asc' },
            take: 10,
        }),
        prisma.cliente.count({
            where: { organizationId: orgId }
        }),
        prisma.user.findMany({
            where: { organizationId: orgId, isAssignable: true },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                puesto: true,
                rutasAsignadas: true
            },
            orderBy: { nombre: 'asc' }
        }),
        prisma.cliente.findMany({
            where: { organizationId: orgId, ruta: { not: null } },
            distinct: ['ruta'],
            select: { ruta: true }
        })
    ]);

    const setRutas = new Set<string>([
        'Ruta Occidente',
        'Ruta La Esperanza',
        'Ruta Guamilito / Progreso',
        'Cartera Francis Carías',
        'Nacional / Todas las Rutas'
    ]);
    rutasRaw.forEach(c => {
        if (c.ruta?.trim()) setRutas.add(c.ruta.trim());
    });
    const listaRutas = Array.from(setRutas).sort();

    const sanitizedContacts = contacts.map(c => ({
        ...c,
        limiteCredito: c.limiteCredito ? Number(c.limiteCredito) : 0,
        saldoInicial: c.saldoInicial ? Number(c.saldoInicial) : 0,
        saldoFavor: c.saldoFavor ? Number(c.saldoFavor) : 0,
        diasCredito: c.diasCredito || 15
    }));

    return (
        <ContactosClient 
            initialData={sanitizedContacts as any} 
            initialTotalCount={totalCount}
            initialTotalPages={Math.ceil(totalCount / 10)}
            initialVendedores={vendedores}
            initialRutas={listaRutas}
        />
    );
}
