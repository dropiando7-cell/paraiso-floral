import FacturacionTabsClient from './FacturacionTabsClient';
import { getAuthenticatedUser, getHistorialDocumentos } from './actions';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FacturasPage() {
    let dbUser;
    try {
        dbUser = await getAuthenticatedUser();
    } catch (authError) {
        redirect('/login');
    }

    const allowedModules = dbUser.accessibleModules || [];
    const hasAccess = dbUser.role === 'SUPER_ADMIN' || 
                      dbUser.role === 'ORG_ADMIN' || 
                      allowedModules.includes('/facturas') || 
                      allowedModules.includes('facturas_propias');
                      
    if (!hasAccess) {
        redirect('/unauthorized');
    }

    let org = null;
    let history: any[] = [];
    
    try {
        const orgId = dbUser.organizationId;
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
                invoiceSettings: true,
                invoiceTemplates: true
            }
        });
        
        const verSoloPropias = dbUser.role !== 'SUPER_ADMIN' && 
                               dbUser.role !== 'ORG_ADMIN' && 
                               allowedModules.includes('facturas_propias');
                               
        history = await getHistorialDocumentos(verSoloPropias ? dbUser.id : undefined);
    } catch (e) {
        console.error("Error fetching data for facturas page:", e);
    }

    return (
        <FacturacionTabsClient 
            organization={org} 
            history={history} 
            userRole={dbUser.role}
            userAccessibleModules={allowedModules}
            userEmail={dbUser.email}
        />
    );
}
