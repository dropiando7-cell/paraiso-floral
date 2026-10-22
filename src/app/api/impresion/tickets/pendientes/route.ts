import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isEnvioItem } from '@/utils/facturaUtils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get('orgId');

        const where: any = { 
            estado: 'PENDIENTE',
            impresora: 'Tickets'
        };
        if (orgId) {
            where.organizationId = orgId;
        }

        const trabajos = await prisma.colaImpresion.findMany({
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

        const trabajosLimpios = trabajos.map((t) => {
            if (!t.urlImagen) return t;
            try {
                const parsed = JSON.parse(t.urlImagen);
                const cleanItem = (it: any) => {
                    const cleanDesc = String(it?.descripcion || '')
                        .replace(/__METADATA__[\s\S]*$/, '')
                        .replace(/__STYLE__[\s\S]*$/, '')
                        .replace(/^__SECTION__/, '')
                        .trim();
                    const cleanNombre = String(it?.nombre || cleanDesc)
                        .replace(/__METADATA__[\s\S]*$/, '')
                        .replace(/__STYLE__[\s\S]*$/, '')
                        .replace(/^__SECTION__/, '')
                        .split('\n')[0]
                        .trim();
                    const esEnvio = isEnvioItem({ nombre: cleanNombre, descripcion: cleanDesc });
                    return {
                        ...it,
                        cantidad: esEnvio ? '' : it.cantidad,
                        esEnvio,
                        descripcion: cleanDesc,
                        nombre: cleanNombre,
                    };
                };
                if (Array.isArray(parsed.items)) {
                    parsed.items = parsed.items.map(cleanItem);
                }
                if (parsed.documento && Array.isArray(parsed.documento.detalles)) {
                    parsed.documento.detalles = parsed.documento.detalles.map(cleanItem);
                }
                return { ...t, urlImagen: JSON.stringify(parsed) };
            } catch {
                return t;
            }
        });

        return NextResponse.json({ trabajos: trabajosLimpios });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

