import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../../DocumentBuilderClient';
import { getOrganizationId, getDocumentoById } from '../../actions';
import { redirect } from 'next/navigation';

import FacturacionHeader from '../../FacturacionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ViewDocumentPage({ params }: { params: { id: string } }) {
    let org = null;
    let doc = null;
    
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

        if (org) {
            doc = await getDocumentoById(params.id);
        }
    } catch (e) {
        console.error("Error fetching data:", e);
    }

    if (!org) redirect('/dashboard');
    if (!doc) redirect('/facturas');

    return (
        <div className="bg-slate-50 min-h-screen">
            <FacturacionHeader activeTab="ver" isSubPage={true} />
            <DocumentBuilderClient organization={org} initialData={doc} viewMode={true} />
        </div>
    );
}
