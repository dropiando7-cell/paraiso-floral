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
            codigoBarras: true,
            codigoGrupo: true,
            organizationId: true,
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
            garantia: true,
            mantenimientosIncluidos: true,
            frecuenciaMantenimientoMeses: true,
            detallesFactura: {
                select: {
                    factura: {
                        select: {
                            id: true,
                            fechaEmision: true,
                            correlativo: true,
                            creadoPor: {
                                select: {
                                    nombre: true,
                                    apellido: true,
                                    email: true,
                                }
                            },
                            cliente: {
                                select: {
                                    nombre: true,
                                    telefono: true,
                                    direccion: true,
                                    rtn: true,
                                }
                            },
                            ordenEntrega: {
                                select: {
                                    correlativo: true,
                                    aplicaMantenimientos: true,
                                    evidenciaFotos: true,
                                }
                            }
                        }
                    }
                }
            }
        },
    });

    if (!activo) notFound();

    const data = JSON.parse(JSON.stringify(activo));
    const exactName = activo.descripcionCorta.trim().toLowerCase();

    const activosPotenciales = await prisma.activoFijo.findMany({
        where: { 
            organizationId: activo.organizationId,
            descripcionCorta: { contains: activo.descripcionCorta.trim() }
        },
        select: { idQr: true, serie: true, area: true, stock: true, estatusContable: true, descripcionCorta: true },
        orderBy: { area: 'asc' }
    });

    const activosSimilares = activosPotenciales.filter(
        a => a.descripcionCorta.trim().toLowerCase() === exactName
    );

    const distribucion = JSON.parse(JSON.stringify(activosSimilares));

    return <FichaTecnicaClient activo={data} distribucion={distribucion} />;
}
