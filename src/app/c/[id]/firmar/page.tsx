import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import FirmaClient from './FirmaClient';

export const metadata = {
    title: 'Firma de Contrato de Renta | Bioelectrónica',
};

export default async function FirmaPublicaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const renta = await prisma.rentaEquipo.findUnique({
        where: { id },
        include: {
            cliente: true,
            activoFijo: true,
            organization: true
        }
    });

    if (!renta) {
        notFound();
    }

    if (renta.estado === 'ACTIVA') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Contrato ya firmado</h1>
                <p className="text-slate-500 max-w-sm">Este contrato ya fue firmado exitosamente y se encuentra activo. Puedes cerrar esta ventana con seguridad.</p>
            </div>
        );
    }

    const rentaSerialized = {
        ...renta,
        costoRenta: Number(renta.costoRenta),
        deposito: Number(renta.deposito),
        depositoDevuelto: renta.depositoDevuelto ? Number(renta.depositoDevuelto) : null,
    };

    return <FirmaClient renta={rentaSerialized as any} />;
}
