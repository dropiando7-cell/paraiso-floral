import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

interface CSVRow {
    lineNum: number;
    rawName: string;
    qtyStr: string;
    qty: number;
}

const imageMap: Record<string, string> = {
    'BONITA': '/flores/BONITA.jpg',
    'COOL WATER': '/flores/COOL-WATER.jpg',
    'ESPERANCE': '/flores/ESPERANCE.jpg',
    'EXOTIC': '/flores/EXOTIC.jpg',
    'GOLD STAR': '/flores/GOLD-STAR.jpg',
    'HIGH AND PEACE': '/flores/HIGH-AND-PEACE.jpg',
    'OPALA': '/flores/OPALA.jpg',
    'PEACH VERSILIA': '/flores/PEACH-VERSILIA.jpg',
    'PERLA': '/flores/PERLA.jpg',
    'PINK FLOYD': '/flores/PINK-FLOYD.jpg',
    'QUICK SAND': '/flores/QUICK-SAND.jpg',
    'ROSA PINTADA ARCOIRIS': '/flores/ROSA-PINTADA-ARCOIRIS.jpg',
    'AZUL': '/flores/ROSA-PINTADA-ARCOIRIS.jpg',
    'ROJAS': '/flores/ROSAS-ROJAS.jpg',
    'ROSITA VENDELA': '/flores/ROSITA-VENDELA.jpg',
    'SURTIDAS': '/flores/SURTIDAS.jpg'
};

const GROUP_HEADERS = [
    'ROSAS CARTON',
    'CLAVELES',
    'MINICLAVEL',
    'LIRIOS',
    'POMPONES',
    'MARGARITAS',
    'FUGGY',
    'CRISANTEMOS',
    'FICHITAS',
    'HYPERUCYM'
];

function cleanTitle(str: string): string {
    let clean = str.trim().replace(/\.$/, '');
    return clean
        .split(/\s+/)
        .map((w, idx) => {
            const lower = w.toLowerCase();
            if (idx > 0 && ['de', 'con', 'e.'].includes(lower)) return lower;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ')
        .replace(/\bG\./g, 'Guatemala')
        .replace(/\bE\./g, 'Ecuador')
        .replace(/\bM\.\s*Rosa\b/gi, 'Mini Rosa');
}

function determineCategory(name: string, groupHeader: string | null): string {
    const u = name.toUpperCase();
    if (groupHeader === 'ROSAS CARTON' || u.startsWith('ROSA') || u.includes('ECUADOR') || u.includes('EXOTIC') || u.includes('TITANIC') || u.includes('BONITA') || u.includes('VENDELA') || u.includes('MUNDIAL')) {
        if (!u.includes('SOLIDAGO') && !u.includes('STOCK') && !u.includes('ERINGIO') && !u.includes('HORTENSIA') && !u.includes('PROTEA')) {
            return 'Rosas Importadas';
        }
    }
    if (u.includes('EUCALIPTO') || u.includes('RUSCUS') || u.includes('RUSCU') || u.includes('SOLIDAGO') || u.includes('CRASPEDIA') || u.includes('DUSTY') || u.includes('ERUL') || u.includes('PACAYA') || u.includes('RUBELINA') || u.includes('PINILLOS') || u.includes('MANSAGEANA') || u.includes('AMARANTUS')) {
        return 'Follajes y Verdes';
    }
    if (u.includes('OASIS')) {
        return 'Espuma y Material Técnico';
    }
    return 'Flores de Corte';
}

function determineArea(category: string): string {
    if (category === 'Follajes y Verdes') return 'CAMARA-FRIA-2';
    if (category === 'Espuma y Material Técnico') return 'BODEGA-SUMINISTROS';
    return 'CAMARA-FRIA-1';
}

function getDefaultPriceAndCost(category: string): { precio: string, costo: number } {
    if (category === 'Rosas Importadas') return { precio: '300.00', costo: 140.00 };
    if (category === 'Flores de Corte') return { precio: '250.00', costo: 110.00 };
    if (category === 'Follajes y Verdes') return { precio: '200.00', costo: 90.00 };
    return { precio: '1450.00', costo: 850.00 };
}

async function main() {
    console.log('📌 Iniciando siembra masiva de inventario desde Inventario-Paraiso.csv...');

    // 1. Obtener organización
    const org = await prisma.organization.findFirst({
        where: { OR: [{ slug: 'central' }, { slug: 'paraiso-floral' }] }
    });

    if (!org) {
        throw new Error('Organización no encontrada.');
    }

    // 2. Obtener usuario master/admin
    const masterUser = await prisma.user.findFirst({
        where: { email: 'master@superapp.com' }
    });

    // 3. Crear o verificar Áreas
    const areaNames = [
        { name: 'CAMARA-FRIA-1', prefix: 'CF1', qrCode: 'AREA-CF1', description: 'Cámara Fría Principal (Rosas y Flores Importadas)' },
        { name: 'CAMARA-FRIA-2', prefix: 'CF2', qrCode: 'AREA-CF2', description: 'Cámara Fría Secundaria (Follajes y Verdes)' },
        { name: 'BODEGA-SUMINISTROS', prefix: 'BS', qrCode: 'AREA-BS', description: 'Bodega Insumos, Bases y Espuma Floral' },
        { name: 'SALA-EXHIBICION', prefix: 'SE', qrCode: 'AREA-SE', description: 'Atención al Cliente y Exhibición' }
    ];

    for (const a of areaNames) {
        await prisma.area.upsert({
            where: { organizationId_name: { organizationId: org.id, name: a.name } },
            update: { description: a.description, prefix: a.prefix },
            create: { organizationId: org.id, name: a.name, prefix: a.prefix, qrCode: a.qrCode, description: a.description }
        });
    }
    console.log('✅ Áreas verificadas.');

    // 4. Crear o verificar Categorías
    const categoryData = [
        { nombre: 'Rosas Importadas', color: '#e05688' },
        { nombre: 'Flores de Corte', color: '#ff70a6' },
        { nombre: 'Follajes y Verdes', color: '#2d6a4f' },
        { nombre: 'Bases y Jarrones', color: '#d4af37' },
        { nombre: 'Espuma y Material Técnico', color: '#3a86ff' },
        { nombre: 'Empaques y Envoltorios', color: '#8338ec' }
    ];

    const categoryMap: Record<string, string> = {};

    for (const cat of categoryData) {
        const existing = await prisma.categoria.findFirst({
            where: { organizationId: org.id, nombre: cat.nombre }
        });

        if (existing) {
            categoryMap[cat.nombre] = existing.id;
        } else {
            const created = await prisma.categoria.create({
                data: {
                    organizationId: org.id,
                    nombre: cat.nombre,
                    color: cat.color
                }
            });
            categoryMap[cat.nombre] = created.id;
        }
    }
    console.log('✅ Categorías verificadas.');

    // 5. Cargar y procesar CSV
    const csvPath = path.join(process.cwd(), 'flores', 'Inventario-Paraiso.csv');
    const rawLines = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/);

    const rows: CSVRow[] = [];
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        const rawName = parts[0] ? parts[0].trim() : '';
        const qtyStr = parts[1] ? parts[1].trim() : '';
        if (i === 0 && rawName.toUpperCase() === 'PRODUCTO') continue;
        if (!rawName) continue;

        const qty = qtyStr === '' || isNaN(Number(qtyStr)) ? 0 : Number(qtyStr);
        rows.push({ lineNum: i + 1, rawName, qtyStr, qty });
    }

    console.log(`📌 Procesando ${rows.length} líneas extraídas del archivo CSV...`);

    let currentGroupHeader: string | null = null;
    let countCreated = 0;
    let countUpdated = 0;
    let totalItemsWithStock = 0;
    let totalItemsZeroStock = 0;

    for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const upper = row.rawName.toUpperCase();

        if (GROUP_HEADERS.includes(upper)) {
            currentGroupHeader = upper;
            if (row.qtyStr === '') {
                continue; // Header row purely for context
            }
        }

        if ([
            'BABY GUATEMALA', 'BABY ECUADOR', 'GERBERAS ROSADAS', 'GERBERAS FUCSIAS',
            'GERBERAS BLANCAS', 'GERBERAS AMARILLAS', 'GERBERAS COLORES', 'MINIGERBERAS ROSADAS',
            'MINIGERBERAS FUCSIA', 'MINIGERBERAS BLANCAS', 'MINIROSAS ROSADA', 'MINIROSAS BLANCAS',
            'MINIROSAS COLORES', 'M. ROSA ECUADOR BLANCA', 'M. ROSA ECUADOR ROSADA', 'M. ROSA ECUADOR COLORES',
            'LIMONIUM MORADO', 'LIMONIUM ROSADO', 'LIMONIUM LILA', 'PIÑA COLADA',
            'ASTROMELIAS BLANCA', 'ASTROMELIAS ROSADAS', 'ASTROMELAS MORADAS', 'ASTROMELIAS COLORES',
            'ESTATICIAS MORADA', 'ESTATICIAS ROSADA', 'ESTATICIA BLANCA', 'ESTATICIA LILA', 'ESTATICIA COLORES',
            'HORTENSIA GUATEMALA BLANCA', 'HORTENSIA G. AZUL', 'HORTENSIA G. MORADA', 'HORTENSIA G. COLORES',
            'HORTENSIA E. BLANCA', 'HORTENSIA E. AZUL', 'HORTENSIA E. MORADA', 'HORTENSIA E. COLORES',
            'DUSTY MILLER', 'LISIANTHUS BLANCO', 'LISIANTHUS MORADO', 'LISIANTHUS ROSADO', 'LISIANTHUS COLORES',
            'GERBERAS ROJA', 'PANDAS', 'QUINCEAÑERAS', 'PINOCHO VERDE', 'LIRIO ROSELI',
            'MINI ROSA FUCSIA', 'DELFINIUN', 'CLAVELINAA', 'ANEMONAS', 'ASTER', 'SOLIDAGO',
            'SOLIDAGO ECUADOR', 'PITHUSFORO', 'EUCALIPTO NORMAL', 'EUCALIPTO DÓLAR', 'EUCALIPTO SILVER',
            'TULIPAN HOLANDA', 'PEONEAS', 'STOCK ECUADOR', 'ERINGIO ECUADOR', 'ERUL GRANDE', 'ERUL MEDIANO',
            'RUSCUS', 'CRASPEDIA', 'HIPERYCUM GUATEMALA', 'HIPERYCUM ECUADOR', 'RUSCU', 'RENANCULOS',
            'PACAYA', 'PINILLOS', 'MANSAGEANA', 'CARTUCHOS', 'ORQUIDEAS GUATEMALA', 'PROTEA ECUADOR',
            'RUBELINA', 'AMARANTUS CAIDO', 'MINIGIRASOL', 'DRAGON', 'GLADIOLA', 'CAMPANA DE IRLANDA',
            'DELFINIUM ECUADOR', 'ESTRELLA DE BELEN', 'JACINTO', 'CALA', 'GREEN BALL', 'OASIS',
            'MANZANILLA', 'DUSTIN', 'MINI PUMA', 'COTTON'
        ].includes(upper)) {
            currentGroupHeader = null;
        }

        let rawTitle = row.rawName;
        if (currentGroupHeader) {
            if (currentGroupHeader === 'ROSAS CARTON') {
                rawTitle = `Rosa ${row.rawName}`;
            } else {
                const prettyGroup = currentGroupHeader.charAt(0) + currentGroupHeader.slice(1).toLowerCase();
                rawTitle = `${prettyGroup} ${row.rawName}`;
            }
        }

        const displayName = cleanTitle(rawTitle);
        const categoryName = determineCategory(displayName, currentGroupHeader);
        const areaName = determineArea(categoryName);
        const categoryId = categoryMap[categoryName];
        const { precio, costo } = getDefaultPriceAndCost(categoryName);
        const resolvedImage = imageMap[upper] || (currentGroupHeader === 'ROSAS CARTON' ? imageMap[upper] : null);

        if (row.qty > 0) totalItemsWithStock++;
        else totalItemsZeroStock++;

        const idQr = `BEA-FLOR-${(idx + 1).toString().padStart(6, '0')}`;
        const codigoGrupo = `FLOR-${(idx + 1).toString().padStart(3, '0')}`;

        const existing = await prisma.activoFijo.findFirst({
            where: { organizationId: org.id, descripcionCorta: displayName }
        });

        if (existing) {
            await prisma.activoFijo.update({
                where: { id: existing.id },
                data: {
                    stock: row.qty,
                    costoAdq: costo,
                    referencia: precio,
                    area: areaName,
                    cuentaAct: categoryName,
                    categoriaId: categoryId,
                    imagenUrl: resolvedImage || existing.imagenUrl,
                    esConsumible: true,
                    updatedById: masterUser?.id || null
                }
            });
            countUpdated++;
        } else {
            await prisma.activoFijo.create({
                data: {
                    organizationId: org.id,
                    idQr: idQr,
                    codigoGrupo: codigoGrupo,
                    descripcionCorta: displayName,
                    descripcionDetallada: `${displayName} — Producto registrado desde inventario maestro Paraíso Floral. Presentación en paquetes/unidades.`,
                    marca: 'Paraíso Floral',
                    modelo: displayName,
                    area: areaName,
                    cuentaAct: categoryName,
                    estatusContable: 'VIGENTE',
                    fechaAdq: new Date(),
                    costoAdq: costo,
                    referencia: precio,
                    stock: row.qty,
                    esConsumible: true,
                    origenActivo: categoryName === 'Rosas Importadas' ? 'Ecuador' : 'Guatemala',
                    condicionActivo: 'Grado A (Premium)',
                    imagenUrl: resolvedImage || null,
                    categoriaId: categoryId,
                    createdById: masterUser?.id || null,
                    updatedById: masterUser?.id || null
                }
            });
            countCreated++;
        }
    }

    console.log('\n🎉 ¡CARGA MASIVA FINALIZADA CON ÉXITO!');
    console.log(`- Nuevos registros creados: ${countCreated}`);
    console.log(`- Registros existentes actualizados: ${countUpdated}`);
    console.log(`- Total productos procesados: ${countCreated + countUpdated}`);
    console.log(`- Productos con stock disponible (> 0): ${totalItemsWithStock}`);
    console.log(`- Productos agotados (stock = 0): ${totalItemsZeroStock}`);
}

main()
    .catch((err) => {
        console.error('❌ Error durante la importación:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
