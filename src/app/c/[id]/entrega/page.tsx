import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EntregaFirmaClient from './EntregaFirmaClient';

export const metadata = {
    title: 'Firma de Recibido de Entrega | Bioelectrónica',
};

export default async function EntregaPublicaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const factura = await prisma.factura.findUnique({
        where: { id },
        include: {
            cliente: true,
            ordenEntrega: true,
            organization: true
        }
    });

    if (!factura || !factura.ordenEntrega) {
        notFound();
    }

    const rawSettings = factura.templateSettings ? JSON.parse(JSON.stringify(factura.templateSettings)) : {};
    const hasAlreadySigned = rawSettings.signaturesList?.some((sig: any) => sig.id === 'cliente_firma' && sig.enabled && sig.imageUrl);

    if (hasAlreadySigned) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/50">
                    <svg className="w-10 h-10 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Orden de Entrega Firmada</h1>
                <p className="text-sm text-slate-500 max-w-sm font-medium">Esta orden de entrega ya fue firmada exitosamente de recibido por el cliente. Puedes cerrar esta ventana con seguridad.</p>
            </div>
        );
    }

    const facturaSerialized = {
        id: factura.id,
        correlativo: factura.correlativo || 'OE-' + factura.ordenEntrega.correlativo,
        clienteNombre: factura.cliente?.nombre || 'Cliente',
        organizationNombre: factura.organization?.name || 'Bioelectrónica Honduras',
        ordenEntregaId: factura.ordenEntrega.id,
    };

    return <EntregaFirmaClient factura={facturaSerialized} />;
}
