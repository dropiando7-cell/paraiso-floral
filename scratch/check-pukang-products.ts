import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

function cleanString(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^a-z0-9\s]/g, " ")   // Replace punctuation with spaces
        .trim();
}

async function check(searchParams: any) {
    const query = searchParams.q || '';
    const selectedBrand = searchParams.brand || '';
    const selectedType = searchParams.type || '';
    const selectedCategory = searchParams.category || '';

    let allowScrapedProducts = true;
    let hideRealInventory = false;
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'landing_settings' }
        });
        if (setting) {
            const parsed = JSON.parse(setting.value);
            allowScrapedProducts = parsed.allowScrapedProducts !== false;
            hideRealInventory = parsed.hideRealInventory === true;
        }
    } catch (e) {
        console.error('Error loading landing settings in getInventory:', e);
    }

    console.log("Settings loaded - hideRealInventory:", hideRealInventory, "allowScrapedProducts:", allowScrapedProducts);

    let assets: any[] = [];
    let consumables: any[] = [];

    if (!hideRealInventory && (selectedType === '' || selectedType === 'activo')) {
        assets = await prisma.activoFijo.findMany({
            where: {
                estatusContable: 'VIGENTE',
                NOT: [
                    { area: { equals: 'SERVICIOS', mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                descripcionCorta: true,
                marca: true,
                modelo: true,
                idQr: true,
                imagenUrl: true,
                imagenWeb: true,
                tituloWeb: true,
                categoria: {
                    select: {
                        nombre: true
                    }
                },
                estatusContable: true
            }
        });
    }

    if (selectedType === '' || selectedType === 'producto') {
        const productWhere: Prisma.ProductoWhereInput = {
            estado: 'ACTIVO',
            esServicio: false
        };

        if (hideRealInventory) {
            productWhere.OR = [
                { sku: { startsWith: 'SOMA-' } },
                { sku: { startsWith: 'REP-' } },
                { sku: { startsWith: 'PUKANG-' } }
            ];
        } else if (!allowScrapedProducts) {
            productWhere.AND = [
                { sku: { not: { startsWith: 'SOMA-' } } },
                { sku: { not: { startsWith: 'REP-' } } },
                { sku: { not: { startsWith: 'PUKANG-' } } }
            ];
        }

        consumables = await prisma.producto.findMany({
            where: productWhere,
            select: {
                id: true,
                nombre: true,
                marca: true,
                modelo: true,
                sku: true,
                imagenWeb: true,
                tituloWeb: true,
                categoria: true,
                estado: true
            }
        });
    }

    console.log(`Initial fetched assets: ${assets.length}`);
    console.log(`Initial fetched consumables: ${consumables.length}`);

    const unifiedItems = [
        ...assets.map(a => ({
            id: a.id,
            name: a.tituloWeb || a.descripcionCorta,
            brand: (a.marca || 'GENÉRICO').trim(),
            model: a.modelo || 'N/A',
            code: a.idQr || '',
            imageUrl: a.imagenWeb || a.imagenUrl,
            type: 'activo' as const,
            typeName: 'Equipo Médico / Activo',
            category: (a.categoria?.nombre || 'EQUIPOS').trim(),
            hidden: a.estatusContable === 'OCULTO',
        })),
        ...consumables.map(c => ({
            id: c.id,
            name: c.tituloWeb || c.nombre,
            brand: (c.marca || 'GENÉRICO').trim(),
            model: c.modelo || 'N/A',
            code: c.sku ? c.sku.replace(/^(SOMA-|PUKANG-)/, '') : '',
            imageUrl: c.imagenWeb || null,
            type: 'producto' as const,
            typeName: c.sku.startsWith('SOMA-') 
                ? (c.categoria || 'Máquinas de anestesia') 
                : c.sku.startsWith('PUKANG-')
                    ? (c.categoria || 'Muebles Hospitalarios')
                    : c.sku.startsWith('REP-') 
                        ? `Repuesto / ${c.categoria || 'Accesorios'}` 
                        : 'Consumible / Repuesto',
            category: (c.categoria || 'CONSUMIBLES').trim(),
            hidden: c.estado === 'OCULTO',
        }))
    ];

    let filteredItems = unifiedItems;

    if (selectedBrand) {
        filteredItems = filteredItems.filter(item => 
            item.brand.toUpperCase() === selectedBrand.toUpperCase()
        );
    }

    if (selectedCategory) {
        console.log(`Filtering by category: "${selectedCategory.toUpperCase()}"`);
        const cleanSelected = cleanString(selectedCategory);
        filteredItems = filteredItems.filter(item => {
            const cleanItemCat = cleanString(item.category);
            
            // Exact normalized match
            if (cleanItemCat === cleanSelected) return true;
            
            // Partial containment (e.g. "cama de hospital electrica" contains "cama de hospital")
            if (cleanItemCat.includes(cleanSelected) || cleanSelected.includes(cleanItemCat)) return true;
            
            // Custom check for "cama de hospital" parent category to match other beds in database
            if (cleanSelected === "cama de hospital" || cleanSelected === "camas de hospital") {
                return cleanItemCat.includes("cama") || cleanItemCat.includes("uci") || cleanItemCat.includes("examen");
            }
            
            return false;
        });
    }

    console.log(`Filtered items count: ${filteredItems.length}`);
}

console.log("=== RUNNING TEST WITH category='Cama de Hospital' ===");
check({ category: "Cama de Hospital" }).catch(console.error);
