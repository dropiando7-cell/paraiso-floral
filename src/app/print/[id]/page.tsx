import { prisma } from '@/lib/prisma';
import DocumentBuilderClient from '../../(dashboard)/facturas/DocumentBuilderClient';
import { getOrganizationId, getDocumentoById } from '../../(dashboard)/facturas/actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PurePrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let org = null;
    let doc = null;
    
    try {
        doc = await prisma.factura.findUnique({
            where: { id },
            include: { detalles: true, cliente: true }
        });
        if (doc) {
            org = await prisma.organization.findUnique({
                where: { id: doc.organizationId }
            });
        }
    } catch (e) {
        console.error("Error fetching data:", e);
    }

    if (!org || !doc) return <div>Document Error or Auth Error</div>;

    return (
        <div className="bg-white min-h-screen">
            <DocumentBuilderClient organization={org} initialData={doc as any} viewMode={true} />
        </div>
    );
}
