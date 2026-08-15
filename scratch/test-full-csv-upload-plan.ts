import * as fs from 'fs';
import * as path from 'path';

interface CSVRow {
    lineNum: number;
    rawName: string;
    qtyStr: string;
    qty: number;
}

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
    rows.push({
        lineNum: i + 1,
        rawName,
        qtyStr,
        qty
    });
}

// Available images in /flores/
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

interface ParsedProduct {
    csvLine: number;
    rawName: string;
    displayName: string;
    category: string;
    area: string;
    stock: number;
    image?: string;
}

const products: ParsedProduct[] = [];

let currentGroupHeader: string | null = null;

const GROUP_HEADERS = [
    'ROSAS CARTON',
    'CLAVELES',
    'MINICLAVEL',
    'LIRIOS',
    'POMPONES',
    'MARGARITAS',
    'FUGGY',
    'CRISANTEMOS',
    'HYPERUCYM'
];

for (const row of rows) {
    const upper = row.rawName.toUpperCase();

    // Check if this row is a major group header
    if (GROUP_HEADERS.includes(upper)) {
        currentGroupHeader = upper;
        // If header itself has quantity, create product
        if (row.qtyStr !== '') {
            products.push({
                csvLine: row.lineNum,
                rawName: row.rawName,
                displayName: cleanTitle(row.rawName),
                category: determineCategory(row.rawName, currentGroupHeader),
                area: determineArea(determineCategory(row.rawName, currentGroupHeader)),
                stock: row.qty,
                image: imageMap[upper]
            });
        }
        continue;
    }

    // Check if we exited a group into standalone items
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
        'GERBERAS ROJA', 'FICHITAS', 'PANDAS', 'QUINCEAÑERAS', 'PINOCHO VERDE', 'LIRIO ROSELI',
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

    let finalTitle = row.rawName;
    if (currentGroupHeader) {
        if (currentGroupHeader === 'ROSAS CARTON') {
            finalTitle = `Rosa ${row.rawName}`;
        } else {
            const prettyGroup = currentGroupHeader.charAt(0) + currentGroupHeader.slice(1).toLowerCase();
            finalTitle = `${prettyGroup} ${row.rawName}`;
        }
    }

    const cat = determineCategory(finalTitle, currentGroupHeader);
    const area = determineArea(cat);

    products.push({
        csvLine: row.lineNum,
        rawName: row.rawName,
        displayName: cleanTitle(finalTitle),
        category: cat,
        area: area,
        stock: row.qty,
        image: imageMap[upper] || (currentGroupHeader === 'ROSAS CARTON' ? imageMap[upper] : undefined)
    });
}

function cleanTitle(str: string): string {
    let clean = str.trim().replace(/\.$/, '');
    // Title Case formatting with exception for short words
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

console.log(`Total Products Parsed: ${products.length}`);
const nonZero = products.filter(p => p.stock > 0);
console.log(`Products with Stock > 0: ${nonZero.length}`);
console.log(`Products with Stock = 0: ${products.length - nonZero.length}`);

console.log('\n--- FIRST 20 PRODUCTS ---');
console.log(products.slice(0, 20));

console.log('\n--- ALL NON-ZERO STOCK PRODUCTS ---');
console.table(nonZero.map(p => ({
    Line: p.csvLine,
    Name: p.displayName,
    Stock: p.stock,
    Category: p.category,
    Area: p.area,
    Img: p.image ? 'YES' : 'NO'
})));
