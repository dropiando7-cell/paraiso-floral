import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface Params {
    category: string;
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

export default async function CategoryRedirectPage({
    params,
    searchParams
}: {
    params: Promise<Params>;
    searchParams: Promise<any>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    // Check if category matches a UUID (legacy redirect flow)
    const categoryParam = resolvedParams.category;
    const potentialId = getUuidFromParam(categoryParam);

    // Regex pattern for UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(potentialId)) {
        // 1. Try finding in Producto
        const product = await prisma.producto.findUnique({
            where: { id: potentialId }
        });

        if (product) {
            const canonicalCategory = slugify(product.categoria || 'consumibles');
            const canonicalSlug = `${product.id}-${slugify(product.nombre || '')}`;
            const queryStr = resolvedSearchParams.cotizar === 'true' ? '?cotizar=true' : '';
            redirect(`/productos/${canonicalCategory}/${canonicalSlug}${queryStr}`);
        }

        // 2. Try finding in ActivoFijo
        const asset = await prisma.activoFijo.findUnique({
            where: { id: potentialId },
            include: { categoria: true }
        });

        if (asset) {
            const canonicalCategory = slugify(asset.categoria?.nombre || 'equipos');
            const canonicalSlug = `${asset.id}-${slugify(asset.tituloWeb || asset.descripcionCorta || '')}`;
            const queryStr = resolvedSearchParams.cotizar === 'true' ? '?cotizar=true' : '';
            redirect(`/productos/${canonicalCategory}/${canonicalSlug}${queryStr}`);
        }
    }

    // If it's a category page request (e.g. /productos/maquinas-de-anestesia)
    // and they visited it directly, we redirect to the catalog page with the filter query parameter
    const queryStr = resolvedSearchParams.cotizar === 'true' ? '&cotizar=true' : '';
    redirect(`/productos?q=${encodeURIComponent(categoryParam)}${queryStr}`);
}
