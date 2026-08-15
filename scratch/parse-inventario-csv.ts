import * as fs from 'fs';
import * as path from 'path';

const csvPath = path.join(process.cwd(), 'flores', 'Inventario-Paraiso.csv');
const content = fs.readFileSync(csvPath, 'utf-8');

const lines = content.split(/\r?\n/);
console.log(`Total lines in CSV: ${lines.length}`);

interface ParsedItem {
    lineNum: number;
    rawProduct: string;
    parentHeader?: string;
    finalName: string;
    quantity: number;
    hasQuantityInCsv: boolean;
}

const parsedItems: ParsedItem[] = [];

// Hierarchical context trackers
let currentGroupHeader: string | null = null;
let subGroupHeader: string | null = null;

// Headers in CSV that represent groups rather than individual items unless they have quantity themselves
const KnownGroupHeaders = [
    'ROSAS CARTON',
    'ECUADOR ROJO',
    'ECUADOR COLORES',
    'ECUADOR TINTURADAS',
    'CLAVELES',
    'MINICLAVEL',
    'LIRIOS',
    'POMPONES',
    'MARGARITAS',
    'FUGGY',
    'CRISANTEMOS',
    'HYPERUCYM'
];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    const productStr = parts[0] ? parts[0].trim() : '';
    const qtyStr = parts[1] ? parts[1].trim() : '';

    if (i === 0 && productStr.toUpperCase() === 'PRODUCTO') {
        continue; // skip header
    }

    if (!productStr) continue;

    const qty = qtyStr === '' || isNaN(Number(qtyStr)) ? 0 : Number(qtyStr);
    const hasQty = qtyStr !== '' && !isNaN(Number(qtyStr));

    console.log(`L${i+1}: [${productStr}] -> QtyStr: "${qtyStr}" (Parsed Qty: ${qty})`);
}
