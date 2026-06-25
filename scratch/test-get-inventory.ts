import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

// Simple representation of cleanString from page.tsx
function cleanString(str: string | null | undefined): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .trim();
}

async function testGetInventory() {
    console.log("=== SIMULATING getInventory ===");

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
        console.error('Error loading landing settings:', e);
    }

    console.log(`allowScrapedProducts: ${allowScrapedProducts}`);
    console.log(`hideRealInventory: ${hideRealInventory}`);

    // Query DB
    let consumables: any[] = [];
    try {
        const productWhere: Prisma.ProductoWhereInput = {
            estado: 'ACTIVO',
            esServicio: false
        };

        if (hideRealInventory) {
            productWhere.OR = [
                { sku: { startsWith: 'SOMA-' } },
                { sku: { startsWith: 'REP-' } },
                { sku: { startsWith: 'PUKANG-' } },
                { sku: { startsWith: 'JOSON-' } }
            ];
        } else if (!allowScrapedProducts) {
            productWhere.AND = [
                { sku: { not: { startsWith: 'SOMA-' } } },
                { sku: { not: { startsWith: 'REP-' } } },
                { sku: { not: { startsWith: 'PUKANG-' } } },
                { sku: { not: { startsWith: 'JOSON-' } } }
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
                precioVenta: true,
                imagenWeb: true,
                tituloWeb: true,
                categoria: true,
                estado: true
            }
        });
    } catch (e) {
        console.error("Failed to query products:", e);
    }

    console.log(`Found ${consumables.length} total consumables in DB query.`);
    const josonConsumables = consumables.filter(c => c.sku.startsWith("JOSON-"));
    console.log(`Out of which, ${josonConsumables.length} starts with JOSON-.`);

    const unifiedItems = consumables.map(c => ({
        id: c.id,
        name: c.tituloWeb || c.nombre,
        brand: (c.marca || 'GENÉRICO').trim(),
        model: c.modelo || 'N/A',
        code: c.sku ? c.sku.replace(/^(SOMA-|PUKANG-|JOSON-)/, '') : '',
        imageUrl: c.imagenWeb || null,
        type: 'producto' as const,
        typeName: c.sku.startsWith('SOMA-') 
            ? (c.categoria || 'Máquinas de anestesia') 
            : c.sku.startsWith('PUKANG-')
                ? (c.categoria || 'Muebles Hospitalarios')
                : c.sku.startsWith('JOSON-')
                    ? (c.categoria || 'Camas y Mobiliario Hospitalario')
                    : c.sku.startsWith('REP-') 
                        ? `Repuesto / ${c.categoria || 'Accesorios'}` 
                        : 'Consumible / Repuesto',
        category: (c.categoria || 'CONSUMIBLES').trim(),
        hidden: c.estado === 'OCULTO',
    }));

    // Filter by selectedCategory = "Cama de UCI"
    const selectedCategory = "Cama de UCI";
    const cleanSelected = cleanString(selectedCategory);

    const filteredItems = unifiedItems.filter(item => {
        const cleanItemCat = cleanString(item.category);
        
        // Exact normalized match
        if (cleanItemCat === cleanSelected) return true;
        
        // Partial containment
        if (cleanItemCat.includes(cleanSelected) || cleanSelected.includes(cleanItemCat)) return true;
        
        // Custom check for "cama de hospital" parent category
        if (cleanSelected === "cama de hospital" || cleanSelected === "camas de hospital") {
            return cleanItemCat.includes("cama") || cleanItemCat.includes("uci") || cleanItemCat.includes("examen");
        }
        
        return false;
    });

    console.log(`After filtering by category = "${selectedCategory}": ${filteredItems.length} items found.`);
    filteredItems.forEach(item => {
        console.log(` - Brand: ${item.brand} | Name: ${item.name} | Category: ${item.category} (clean: ${cleanString(item.category)})`);
    });
}

testGetInventory();
export {};
