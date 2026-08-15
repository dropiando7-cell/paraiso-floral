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

console.log(`Extracted ${rows.length} rows from CSV.\n`);

// Group mapping rules
interface FinalProduct {
    csvLine: number;
    rawName: string;
    displayName: string;
    category: string;
    area: string;
    stock: number;
    image?: string;
}

const products: FinalProduct[] = [];

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

let currentGroup: string | null = null;

for (const row of rows) {
    const upper = row.rawName.toUpperCase();
    
    // Check header groups
    if (['CLAVELES', 'MINICLAVEL', 'LIRIOS', 'POMPONES', 'MARGARITAS', 'FUGGY', 'CRISANTEMOS', 'HYPERUCYM', 'ROSAS CARTON'].includes(upper)) {
        currentGroup = upper;
        // If the header row itself has a quantity, we create a product for it, otherwise it serves as context
        if (row.qtyStr !== '') {
            products.push({
                csvLine: row.lineNum,
                rawName: row.rawName,
                displayName: row.rawName,
                category: getCategoryForGroup(row.rawName),
                area: getAreaForGroup(row.rawName),
                stock: row.qty,
                image: getImage(row.rawName)
            });
        }
        continue;
    }

    // Determine display name
    let name = row.rawName;
    if (currentGroup && ['ROSADO', 'BLANCO', 'FUCSIA', 'ROJO', 'COLORES', 'ROSADAS', 'BLANCAS', 'AMARILLO', 'AMARILLAS', 'MORADO', 'MORADAS', 'LILA', 'ocre.', 'MEXICANO'].includes(row.rawName)) {
        // Build composite name like "Claveles Fucsia", "Pompones Amarillo", etc.
        const groupTitle = currentGroup.charAt(0) + currentGroup.slice(1).toLowerCase();
        name = `${groupTitle} ${row.rawName}`;
    }

    // Reset currentGroup if we move to unrelated products
    if (['BABY GUATEMALA', 'LIMONIUM MORADO', 'ASTROMELIAS BLANCA', 'ESTATICIAS MORADA', 'HORTENSIA GUATEMALA BLANCA', 'SOLIDAGO', 'DELFINIUN', 'EUCALIPTO DÓLAR'].includes(upper)) {
        currentGroup = null;
    }

    products.push({
        csvLine: row.lineNum,
        rawName: row.rawName,
        displayName: formatDisplayName(name),
        category: getCategoryForGroup(name),
        area: getAreaForGroup(name),
        stock: row.qty,
        image: getImage(row.rawName)
    });
}

function formatDisplayName(str: string): string {
    return str.trim()
        .replace(/\.$/, '')
        .split(' ')
        .map(w => w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())
        .join(' ');
}

function getCategoryForGroup(name: string): string {
    const u = name.toUpperCase();
    if (u.includes('ROSA') || u.includes('ECUADOR') || u.includes('EXOTIC') || u.includes('TITANIC') || u.includes('BONITA') || u.includes('VENDELA') || u.includes('MUNDIAL')) {
        return 'Rosas Importadas';
    }
    if (u.includes('EUCALIPTO') || u.includes('RUSCUS') || u.includes('SOLIDAGO') || u.includes('CRASPEDIA') || u.includes('DUSTY') || u.includes('ERUL') || u.includes('PACAYA') || u.includes('RUBELINA') || u.includes('PINILLOS') || u.includes('MANSAGEANA')) {
        return 'Follajes y Verdes';
    }
    if (u.includes('OASIS')) {
        return 'Espuma y Material Técnico';
    }
    return 'Flores de Corte';
}

function getAreaForGroup(name: string): string {
    const cat = getCategoryForGroup(name);
    if (cat === 'Follajes y Verdes') return 'CAMARA-FRIA-2';
    if (cat === 'Espuma y Material Técnico') return 'BODEGA-SUMINISTROS';
    return 'CAMARA-FRIA-1';
}

function getImage(rawName: string): string | undefined {
    const clean = rawName.toUpperCase().trim();
    if (imageMap[clean]) return imageMap[clean];
    return undefined;
}

console.log(`Processed ${products.length} final products.\n`);
console.log('Sample parsed products:');
console.log(products.slice(0, 25));
console.log('\nProducts with stock > 0:');
const withStock = products.filter(p => p.stock > 0);
console.log(`Total products with stock > 0: ${withStock.length}`);
console.log(withStock);
