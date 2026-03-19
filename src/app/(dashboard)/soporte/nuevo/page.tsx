import { prisma } from '@/lib/prisma';
import NuevoSoporteClient from './NuevoSoporteClient';

export const metadata = {
    title: 'Nueva Recepción | Soporte | Bioelectrónica',
    description: 'Recepcionar nuevo equipo para evaluación',
};

export default async function NuevoSoportePage() {
    const org = await prisma.organization.findFirst();
    if (!org) return <div>Org no encontrada</div>;

    const clientes = await prisma.cliente.findMany({
        where: { organizationId: org.id },
        orderBy: { nombre: 'asc' }
    });

    return <NuevoSoporteClient clientes={clientes} />;
}
