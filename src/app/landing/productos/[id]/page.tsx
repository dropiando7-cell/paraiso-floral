import React from 'react';
import { prisma } from '@/lib/prisma';
import ProductDetailClient from './ProductDetailClient';
import { notFound } from 'next/navigation';

interface Params {
    id: string;
}

interface SearchParams {
    cotizar?: string;
}

async function getItemData(id: string) {
    try {
        // 1. Try finding in ActivoFijo
        const asset = await prisma.activoFijo.findUnique({
            where: { id },
            include: { categoria: true }
        });

        if (asset && asset.area?.toUpperCase() !== 'SERVICIOS') {
            // Compile technical details properties
            const details: Record<string, string> = {
                'Categoría': asset.categoria?.nombre || 'General',
                'Estatus': asset.estatusContable
            };
            if (asset.serie) details['Número de Serie'] = asset.serie;
            if (asset.estadoDano) details['Estado de Conservación'] = asset.estadoDano;
            if (asset.observaciones) details['Observaciones'] = asset.observaciones;

            return {
                id: asset.id,
                name: asset.tituloWeb || asset.descripcionCorta,
                brand: asset.marca || 'Genérico',
                model: asset.modelo || 'N/A',
                code: asset.idQr,
                imageUrl: asset.imagenWeb || asset.imagenUrl,
                type: 'activo' as const,
                typeName: 'Equipo Médico / Activo',
                description: asset.descripcionWeb || asset.descripcionDetallada || '',
                details
            };
        }

        // 2. Try finding in Producto
        const product = await prisma.producto.findUnique({
            where: { id }
        });

        if (product) {
            const details: Record<string, string> = {
                'SKU': product.sku,
                'Stock Disponible': String(product.stockActual),
                'Impuesto (ISV)': `${product.isvAplicable}%`
            };

            return {
                id: product.id,
                name: product.tituloWeb || product.nombre,
                brand: product.marca || 'Genérico',
                model: product.modelo || 'N/A',
                code: product.sku,
                imageUrl: product.imagenWeb || null,
                type: 'producto' as const,
                typeName: 'Consumible / Repuesto',
                description: product.descripcionWeb || product.descripcion || '',
                details
            };
        }
    } catch (e) {
        console.error('Error fetching item details:', e);
    }
    return null;
}

async function getLandingSettings() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'landing_settings' }
        });
        if (setting) {
            return JSON.parse(setting.value);
        }
    } catch (e) {
        console.error('Error fetching settings:', e);
    }
    return {
        whatsappNumbers: ['50431782368', '50489246108'],
        contactEmails: ['ventas@bioelectronicahn.com', 'gerencia@bioelectronicahn.com']
    };
}

export default async function ProductDetailPage({
    params,
    searchParams
}: {
    params: Promise<Params>;
    searchParams: Promise<SearchParams>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const item = await getItemData(resolvedParams.id);
    const settings = await getLandingSettings();

    if (!item) {
        notFound();
    }

    const autoOpen = resolvedSearchParams.cotizar === 'true';

    return (
        <ProductDetailClient 
            item={item} 
            landingSettings={settings} 
            autoOpenCotizar={autoOpen} 
        />
    );
}
