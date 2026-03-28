import DocumentBuilderClient from './DocumentBuilderClient';
import { getOrganizationId } from './actions';
import { prisma } from '@/lib/prisma';

export default async function FacturasPage() {
    let org = null;
    try {
        const orgId = await getOrganizationId();
        org = await prisma.organization.findUnique({ 
            where: { id: orgId },
            select: { 
                name: true, 
                logoUrl: true, 
                direccion: true, 
                rtn: true, 
                telefono: true, 
                correoContacto: true,
                qrPrefix: true
            }
        });
    } catch (e) {
        console.error("Error fetching organization:", e);
    }

    return <DocumentBuilderClient organization={org} />;
}
