import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PresupuestoFirmaClient from '@/app/c/[id]/presupuesto/PresupuestoFirmaClient';

export const metadata = {
    title: 'Aprobación de Presupuesto | Bioelectrónica',
};

export default async function PresupuestoPublicoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const factura = await prisma.factura.findUnique({
        where: { id },
        include: {
            cliente: true,
            organization: true,
            detalles: true
        }
    });

    if (!factura) {
        notFound();
    }

    if (factura.estado === 'APROBADA' || factura.firmaClienteBase64) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Presupuesto Aprobado</h1>
                <p className="text-slate-500 max-w-sm">Este presupuesto ya fue aprobado exitosamente. Nuestro equipo está procediendo con la reparación. Puedes cerrar esta ventana con seguridad.</p>
            </div>
        );
    }

    if (factura.estado === 'RECHAZADA') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 animate-bounce text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Presupuesto Rechazado</h1>
                <p className="text-slate-500 max-w-sm">Este presupuesto fue rechazado por usted. Nuestro equipo de soporte técnico se pondrá en contacto para ofrecerle una propuesta revisada.</p>
            </div>
        );
    }

    const plainFactura = JSON.parse(JSON.stringify(factura));
    const facturaSerialized = {
        ...plainFactura,
        subTotal: Number(plainFactura.subTotal),
        total: Number(plainFactura.total),
        detalles: plainFactura.detalles.map((d: any) => ({
            ...d,
            precioUnitario: Number(d.precioUnitario),
            totalLinea: Number(d.totalLinea)
        }))
    };

    return <PresupuestoFirmaClient factura={facturaSerialized as any} />;
}
