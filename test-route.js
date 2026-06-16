const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugify = (text) => {
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

const getUuidFromParam = (param) => {
    const parts = param.split('-');
    if (parts.length >= 5) {
        return parts.slice(0, 5).join('-');
    }
    return param;
};

async function getItemData(id, settings) {
    const allowScrapedProducts = settings?.allowScrapedProducts !== false;
    const defaultScrapedStock = typeof settings?.defaultScrapedStock === 'number' ? settings.defaultScrapedStock : 5;

    try {
        const asset = await prisma.activoFijo.findUnique({
            where: { id },
            include: { categoria: true }
        });

        if (asset && asset.area?.toUpperCase() !== 'SERVICIOS') {
            return {
                id: asset.id,
                name: asset.tituloWeb || asset.descripcionCorta,
                brand: asset.marca || 'Genérico',
                model: asset.modelo || 'N/A',
                code: asset.idQr,
                imageUrl: asset.imagenWeb || asset.imagenUrl,
                type: 'activo',
                typeName: 'Equipo Médico / Activo',
                description: asset.descripcionWeb || asset.descripcionDetallada || '',
                category: asset.categoria?.nombre || 'equipos',
                hidden: asset.estatusContable === 'OCULTO'
            };
        }

        const product = await prisma.producto.findUnique({
            where: { id }
        });

        if (product) {
            if (product.sku.startsWith('SOMA-') && !allowScrapedProducts) {
                return null;
            }

            return {
                id: product.id,
                name: product.tituloWeb || product.nombre,
                brand: product.marca || 'Genérico',
                model: product.modelo || 'N/A',
                code: product.sku,
                imageUrl: product.imagenWeb || null,
                type: 'producto',
                typeName: 'Consumible / Repuesto',
                description: product.descripcionWeb || product.descripcion || '',
                category: 'consumibles',
                hidden: product.estado === 'OCULTO'
            };
        }
    } catch (e) {
        console.error('Error fetching item details:', e);
    }
    return null;
}

async function main() {
    const resolvedParams = {
        category: "consumibles",
        id: "399a5886-6d46-4300-a821-8050aa79c56d-mindray-a7-anesthesia-machine"
    };

    const setting = await prisma.systemSetting.findUnique({
        where: { key: 'landing_settings' }
    });
    const settings = setting ? JSON.parse(setting.value) : {};

    const itemId = getUuidFromParam(resolvedParams.id);
    const item = await getItemData(itemId, settings);

    if (!item) {
        console.log("RESULT: notFound() - Item is null");
        return;
    }

    const canonicalCategory = slugify(item.category || 'equipos');
    const canonicalSlug = `${item.id}-${slugify(item.name || '')}`;

    console.log("canonicalCategory:", canonicalCategory);
    console.log("canonicalSlug:", canonicalSlug);

    if (resolvedParams.category !== canonicalCategory || resolvedParams.id !== canonicalSlug) {
        console.log("RESULT: redirect to", `/productos/${canonicalCategory}/${canonicalSlug}`);
    } else {
        console.log("RESULT: Render page successfully!");
    }
}

main().then(() => prisma.$disconnect());
