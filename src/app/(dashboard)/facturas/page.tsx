import FacturacionTabsClient from './FacturacionTabsClient';
import { getOrganizationId, getHistorialDocumentos } from './actions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FacturasPage() {
    let org = null;
    let history: any[] = [];
    
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
                qrPrefix: true,
                invoiceSettings: true
            }
        });
        
        history = await getHistorialDocumentos();
    } catch (e) {
        console.error("Error fetching data for facturas page:", e);
    }

    return <FacturacionTabsClient organization={org} history={history} />;
}
