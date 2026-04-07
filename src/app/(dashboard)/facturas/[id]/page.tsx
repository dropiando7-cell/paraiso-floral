import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../DocumentBuilderClient';
import { getOrganizationId, getDocumentoById } from '../actions';
import { redirect } from 'next/navigation';

import FacturacionHeader from '../FacturacionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditDocumentPage({ 
    params,
    searchParams
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const isClone = resolvedSearchParams?.clone === 'true';

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
            doc = await getDocumentoById(id);
        }
    } catch (e) {
        console.error("Error fetching data:", e);
    }

    if (!org) redirect('/dashboard');
    if (!doc) redirect('/facturas');

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col">
            <FacturacionHeader activeTab={isClone ? "creador" : "editar"} isSubPage={true} />
            <div className="p-6 max-w-[1400px] mx-auto w-full">
               <DocumentBuilderClient organization={org} initialData={doc} editMode={!isClone} />
            </div>
        </div>
    );
}
