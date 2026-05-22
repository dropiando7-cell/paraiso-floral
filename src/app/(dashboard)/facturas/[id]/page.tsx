import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../DocumentBuilderClient';
import { getAuthenticatedUser, getDocumentoById } from '../actions';
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
    const isNotaCredito = resolvedSearchParams?.notaCredito === 'true';

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
        
        if (org && id !== 'nuevo') {
            doc = await getDocumentoById(id);
        }
    } catch (e) {
        console.error("Error fetching data:", e);
    }

    if (!org) redirect('/dashboard');
    if (!doc && id !== 'nuevo') redirect('/facturas');

    // Restricción: Si el documento es una Factura ya Emitida y no es admin, redirigir a ver
    if (doc && doc.tipoDocumento === 'FACTURA' && doc.estado === 'EMITIDA' && !isClone && !isNotaCredito) {
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'ORG_ADMIN') {
            redirect(`/facturas/ver/${id}`);
        }
    }

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col">
            <FacturacionHeader activeTab={isClone || isNotaCredito ? "creador" : "editar"} isSubPage={true} />
            <div className="p-6 max-w-[1400px] mx-auto w-full">
               <DocumentBuilderClient organization={org} initialData={doc} editMode={!isClone && !isNotaCredito} isNotaCredito={isNotaCredito} userRole={userRole} />
            </div>
        </div>
    );
}
