import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../../(dashboard)/facturas/DocumentBuilderClient';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PurePrintPage({ 
    params,
    searchParams
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const isEdit = resolvedSearchParams?.edit === 'true';
    
    let org = null;
    let doc = null;
    let isEditAllowed = false;
    let userRole = 'USER';
    
    try {
        const rawDoc = await prisma.factura.findUnique({
            where: { id },
            include: { detalles: true, cliente: true }
        });
        if (rawDoc) {
            doc = JSON.parse(JSON.stringify(rawDoc));
            org = await prisma.organization.findUnique({
                where: { id: rawDoc.organizationId }
            });

            if (isEdit && org) {
                try {
                    const supabase = await createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && user.email) {
                        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
                        if (dbUser) {
                            userRole = dbUser.role || 'USER';
                            const cRole = dbUser.customRoleName?.toUpperCase() || '';
                            const isGlobal = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN';
                            const isSoporteAdmin = isGlobal || 
                                                   dbUser.email === 'emilia.zapata@bioelectronicahn.com' || 
                                                   cRole.includes('SOPORTE_GLOBAL') || 
                                                   cRole.includes('SOPORTE COMPLETO') || 
                                                   cRole.includes('SOPORTE_ADMIN') || 
                                                   cRole.includes('COORDINADOR') || 
                                                   cRole.includes('SOPORTE TOTAL') ||
                                                   cRole.includes('ADMINISTRADOR DE SOPORTE') ||
                                                   cRole.includes('ADMINISTRADOR SOPORTE');
                            const isGerente = isSoporteAdmin || userRole === 'GERENTE' || cRole === 'GERENTE' || cRole.includes('GERENTE');
                            
                            if (isGerente) {
                                isEditAllowed = true;
                            }
                        }
                    }
                } catch (authError) {
                    console.error("Auth error in print page:", authError);
                }
            }
        }
    } catch (e) {
        console.error("Error fetching data:", e);
    }

    if (!org || !doc) return <div>Document Error or Auth Error</div>;

    const actualEdit = isEdit && isEditAllowed;

    return (
        <div className="bg-white min-h-screen">
            <DocumentBuilderClient 
                organization={org} 
                initialData={doc as any} 
                viewMode={!actualEdit} 
                editMode={actualEdit}
                userRole={userRole}
            />
        </div>
    );
}
