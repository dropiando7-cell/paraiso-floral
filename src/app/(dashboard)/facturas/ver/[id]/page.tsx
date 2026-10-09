import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../../DocumentBuilderClient';
import { getAuthenticatedUser, getDocumentoById } from '../../actions';
import { redirect } from 'next/navigation';

import FacturacionHeader from '../../FacturacionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ViewDocumentPage({ 
    params,
    searchParams 
}: { 
    params: Promise<{ id: string }>;
    searchParams: Promise<{ embed?: string }>;
}) {
    const { id } = await params;
    const { embed } = await searchParams;
    const isEmbed = embed === 'true';

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
                invoiceSettings: true,
                invoiceTemplates: true
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

    if (isEmbed) {
        return (
            <div className="bg-slate-100 min-h-screen p-2 sm:p-4 print:p-0 flex justify-center">
                <DocumentBuilderClient 
                    organization={org} 
                    initialData={doc} 
                    viewMode={true} 
                    embedMode={true} 
                    userRole={userRole} 
                    userAccessibleModules={allowedModules} 
                    userEmail={dbUser.email}
                />
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen print:h-auto print:min-h-0 print:overflow-visible">
            <FacturacionHeader activeTab="ver" isSubPage={true} />
            <DocumentBuilderClient 
                organization={org} 
                initialData={doc} 
                viewMode={true} 
                userRole={userRole} 
                userAccessibleModules={allowedModules} 
                userEmail={dbUser.email}
            />
        </div>
    );
}
