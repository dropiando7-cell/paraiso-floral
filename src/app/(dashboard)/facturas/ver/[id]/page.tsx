import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../../DocumentBuilderClient';
import { getOrganizationId, getDocumentoById } from '../../actions';
import { redirect } from 'next/navigation';

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

        if (!org) redirect('/dashboard');
        
        doc = await getDocumentoById(params.id);
        if (!doc) redirect('/facturas');

    } catch (e) {
        console.error("Error fetching data:", e);
        redirect('/facturas');
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <DocumentBuilderClient organization={org} initialData={doc} viewMode={true} />
        </div>
    );
}
