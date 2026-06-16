import React from 'react';
import { prisma } from '@/lib/prisma';
import ProductDetailClient from './ProductDetailClient';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

interface Params {
    id: string;
}

interface SearchParams {
    cotizar?: string;
}

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

const getUuidFromParam = (param: string) => {
    const parts = param.split('-');
    if (parts.length >= 5) {
        return parts.slice(0, 5).join('-');
    }
    return param;
};

async function getItemData(id: string, settings: any) {
    const allowScrapedProducts = settings?.allowScrapedProducts !== false;
    const defaultScrapedStock = typeof settings?.defaultScrapedStock === 'number' ? settings.defaultScrapedStock : 5;

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
                category: asset.categoria?.nombre || 'equipos',
                details
            };
        }

        // 2. Try finding in Producto
        const product = await prisma.producto.findUnique({
            where: { id }
        });

        if (product) {
            // If it is a scraped SOMA product and they are currently disabled, prevent details access
            if (product.sku.startsWith('SOMA-') && !allowScrapedProducts) {
                return null;
            }

            // Determine virtual or actual stock display
            let stockVal = String(product.stockActual);
            if (product.sku.startsWith('SOMA-')) {
                if (defaultScrapedStock > 0) {
                    stockVal = `${defaultScrapedStock}`;
                } else {
                    stockVal = 'Bajo Pedido (Sin stock inmediato)';
                }
            }

            const details: Record<string, string> = {
                'SKU': product.sku,
                'Stock Disponible': stockVal,
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
                typeName: product.sku.startsWith('SOMA-') ? (product.categoria || 'Máquinas de anestesia') : 'Consumible / Repuesto',
                description: product.descripcionWeb || product.descripcion || '',
                category: product.categoria || 'consumibles',
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
    const settings = await getLandingSettings();
    
    // Extract actual database UUID from parameter
    const itemId = getUuidFromParam(resolvedParams.id);
    const item = await getItemData(itemId, settings);

    if (!item) {
        notFound();
    }

    // Always redirect legacy requests to the new canonical nested structure /productos/[category]/[id]-[slug]
    const canonicalCategory = slugify(item.category || 'equipos');
    const canonicalSlug = `${item.id}-${slugify(item.name || '')}`;
    const queryStr = resolvedSearchParams.cotizar === 'true' ? '?cotizar=true' : '';
    redirect(`/productos/${canonicalCategory}/${canonicalSlug}${queryStr}`);
}
