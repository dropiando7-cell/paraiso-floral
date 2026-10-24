import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get('orgId');

        const where: any = { 
            estado: 'PENDIENTE',
            impresora: { not: 'Tickets' }
        };
        if (orgId) {
            where.organizationId = orgId;
        }

        const trabajosRaw = await prisma.colaImpresion.findMany({
            where,
            take: 20,
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                urlImagen: true,
                impresora: true,
                tamano: true,
                organizationId: true,
                activo: {
                    select: {
                        idQr: true,
                        descripcionCorta: true,
                        marca: true,
                        modelo: true,
                        serie: true,
                        codigoBarras: true
                    }
                }
            }
        });

        // Inyectar los parámetros específicos de cada etiqueta (como el codigoBarras serializado 010055-0001)
        // dentro de `activo` para que el Print Server local en otra laptop imprima cada serial único sin requerir cambios allá.
        const trabajos = trabajosRaw.map((t) => {
            let customIdQr = t.activo?.idQr || '';
            let customDesc = t.activo?.descripcionCorta || '';
            let customBarcode = t.activo?.codigoBarras || t.activo?.idQr || '';
            let customSerie = t.activo?.serie || '';

            try {
                if (t.urlImagen) {
                    const parsedUrl = new URL(t.urlImagen, 'https://paraiso-floral.vercel.app');
                    const qIdQr = parsedUrl.searchParams.get('idQr');
                    const qDesc = parsedUrl.searchParams.get('descripcion');
                    const qBarcode = parsedUrl.searchParams.get('codigoBarras');
                    const qSerie = parsedUrl.searchParams.get('serie');

                    if (qIdQr) customIdQr = qIdQr;
                    if (qDesc) customDesc = qDesc;
                    if (qBarcode) customBarcode = qBarcode;
                    if (qSerie) customSerie = qSerie;
                }
            } catch {
                // Ignorar error de parseo de URL y mantener valores base
            }

            return {
                ...t,
                activo: {
                    idQr: customIdQr || '000000',
                    descripcionCorta: customDesc || 'Sin descripción',
                    marca: t.activo?.marca || '',
                    modelo: t.activo?.modelo || '',
                    serie: customSerie,
                    codigoBarras: customBarcode || customIdQr || '000000'
                }
            };
        });

        return NextResponse.json({ trabajos });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
