import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import FichaTecnicaClient from './FichaTecnicaClient';

type Props = { params: Promise<{ idQr: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { idQr } = await params;
    const activo = await prisma.activoFijo.findFirst({
        where: { idQr: decodeURIComponent(idQr) },
        select: { descripcionCorta: true, idQr: true },
    });

    return {
        title: activo
            ? `${activo.descripcionCorta} | Ficha Técnica — Bioelectrónica`
            : 'Activo no encontrado | Bioelectrónica',
        description: activo
            ? `Ficha técnica de ${activo.descripcionCorta} - Bioelectrónica Honduras`
            : 'El producto solicitado no fue encontrado.',
    };
}

export default async function FichaTecnicaPage({ params }: Props) {
    const { idQr } = await params;

    const activo = await prisma.activoFijo.findFirst({
        where: { idQr: decodeURIComponent(idQr) },
        select: {
            idQr: true,
            descripcionCorta: true,
            descripcionDetallada: true,
            serie: true,
            modelo: true,
            area: true,
            cuentaAct: true,
            estatusContable: true,
            estadoDano: true,
            tipoIncidencia: true,
            accionRecomendada: true,
            responsable: true,
            observaciones: true,
            imagenUrl: true,
            imagenPlacaUrl: true,
            fechaAdq: true,
            fechaLevantamiento: true,
            integrado: true,
            costoAdq: true,
            createdAt: true,
        },
    });

    if (!activo) notFound();

    // serialize dates
    const data = JSON.parse(JSON.stringify(activo));

    const activosSimilares = await prisma.activoFijo.findMany({
        where: { idQr: decodeURIComponent(idQr) },
        select: { area: true, stock: true },
    });
    const distribucion = JSON.parse(JSON.stringify(activosSimilares));

    return <FichaTecnicaClient activo={data} distribucion={distribucion} />;
}
