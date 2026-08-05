import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../../DocumentBuilderClient';
import { getAuthenticatedUser, getDocumentoById } from '../../actions';
import { redirect } from 'next/navigation';

import FacturacionHeader from '../../FacturacionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ViewDocumentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
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
    let doc = null;
    let userRole = dbUser.role;
    
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
                invoiceSettings: true
            }
        });

        if (org) {
            doc = await getDocumentoById(id);
        }
    } catch (e) {
        console.error("Error fetching data:", e);
    }

    if (!org) redirect('/dashboard');
    if (!doc) redirect('/facturas');

    const verSoloPropias = dbUser.role !== 'SUPER_ADMIN' && 
                           dbUser.role !== 'ORG_ADMIN' && 
                           allowedModules.includes('facturas_propias');

    if (verSoloPropias && doc.creadoPorId !== dbUser.id) {
        redirect('/unauthorized');
    }

    return (
        <div className="bg-slate-50 min-h-screen print:h-auto print:min-h-0 print:overflow-visible">
            <FacturacionHeader activeTab="ver" isSubPage={true} />
            <DocumentBuilderClient organization={org} initialData={doc} viewMode={true} userRole={userRole} />
        </div>
    );
}
