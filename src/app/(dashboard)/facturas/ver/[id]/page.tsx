import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../../DocumentBuilderClient';
import { getAuthenticatedUser, getDocumentoById } from '../../actions';
import { redirect } from 'next/navigation';

import FacturacionHeader from '../../FacturacionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ViewDocumentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let org = null;
    let doc = null;
    let userRole = 'USER';
    
    try {
        const authUser = await getAuthenticatedUser();
        const orgId = authUser.organizationId;
        userRole = authUser.role;

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

    return (
        <div className="bg-slate-50 min-h-screen print:overflow-visible">
            <FacturacionHeader activeTab="ver" isSubPage={true} />
            <DocumentBuilderClient organization={org} initialData={doc} viewMode={true} userRole={userRole} />
        </div>
    );
}
