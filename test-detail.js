const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
        // 1. Try finding in ActivoFijo
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

        // 2. Try finding in Producto
        const product = await prisma.producto.findUnique({
            where: { id }
        });

        if (product) {
            if (product.sku.startsWith('SOMA-') && !allowScrapedProducts) {
                console.log("Failed because allowScrapedProducts is false");
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
  try {
    const settings = {
      "whatsappNumbers": [
        "50489246108",
        "50431782368"
      ],
      "contactEmails": [
        "ventas@bioelectronicahn.com",
        "gerencia@bioelectronicahn.com"
      ],
      "physicalAddress": "7 Calle, 9 Avenida NO, San Pedro Sula, Cortés",
      "workingHours": "Lunes a Viernes · 8:00 AM - 5:00 PM",
      "heroTitle": "Equipamiento Médico y Soporte Biomédico Lider en Honduras",
      "heroSubtitle": "Diseñando soluciones integrales en venta, distribución y soporte técnico especializado para hospitales y clínicas a nivel nacional.",
      "seoTitle": "",
      "quoteEmail": "cotizaciones@bioelectronicahn.com",
      "activeTheme": "BIO",
      "hideRealInventory": true
    };
    const idParam = "399a5886-6d46-4300-a821-8050aa79c56d-mindray-a7-anesthesia-machine";
    const itemId = getUuidFromParam(idParam);
    console.log("Extracted itemId:", itemId);
    const item = await getItemData(itemId, settings);
    console.log("Fetched item:", JSON.stringify(item, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
