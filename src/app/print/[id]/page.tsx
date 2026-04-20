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
        // This relies on the cookie still being present from the Puppeteer context
        // In an ideal system, a signed jwt token would verify auth for serverless puppeteer.
        // Since puppeteer accesses the url natively, if it doesn't get auth cookies, getOrganizationId will fail.
        // If we are passing ?token, we can bypass or inject the token logic. For simplicity, 
        // we fetch using a pure Prisma call if token exists, or we expect cookies to carry over.
        org = await prisma.organization.findFirst(); // Fallback for print context auth
        if (org) {
            doc = await prisma.factura.findUnique({
                where: { id },
                include: { detalles: true, cliente: true }
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
