/**
 * GS1-128 / GS1 DataMatrix Application Identifier (AI) parser.
 * Handles both parenthesized format: (01)12345... 
 * and raw concatenated format: 011234500012345610...
 */

export interface GS1Fields {
    gtin?: string;       // AI 01 — Global Trade Item Number (14 digits)
    lote?: string;       // AI 10 — Lot / Batch number
    fechaProd?: string;  // AI 11 — Production date YYMMDD
    fechaVenc?: string;  // AI 17 — Expiry date YYMMDD
    serial?: string;     // AI 21 — Serial number
    qty?: string;        // AI 30 / 37 — Quantity
    ref?: string;        // AI 240 / 241 — Additional product ID (REF)
    raw: string;         // Original scanned string
}

// AI definitions: [code, fixedLength | null, description]
const AI_MAP: Array<[string, number | null, keyof GS1Fields]> = [
    ['01', 14, 'gtin'],
    ['10', null, 'lote'],
    ['11', 6, 'fechaProd'],
    ['17', 6, 'fechaVenc'],
    ['21', null, 'serial'],
    ['30', null, 'qty'],
    ['37', null, 'qty'],
    ['240', null, 'ref'],
    ['241', null, 'ref'],
];

const GS1_FNC1 = '\x1d'; // Group Separator character used in raw GS1

/**
 * Parses a GS1 barcode string (parenthesized or raw) and returns extracted fields.
 */
export function parseGS1(raw: string): GS1Fields {
    const result: GS1Fields = { raw };

    // --- Try parenthesized format: (01)12345(10)LOT ---
    if (raw.includes('(')) {
        const regex = /\((\d{2,4})\)([^(]*)/g;
        let match;
        while ((match = regex.exec(raw)) !== null) {
            const ai = match[1];
            const value = match[2].trim();
            applyAI(result, ai, value);
        }
        return result;
    }

    // --- Try raw concatenated format (with optional FNC1 separator) ---
    let pos = 0;
    const cleaned = raw.replace(/\s/g, '');
    while (pos < cleaned.length) {
        // Find matching AI (try 4-digit first, then 3, then 2)
        let matched = false;
        for (const digits of [4, 3, 2]) {
            const ai = cleaned.substring(pos, pos + digits);
            const def = AI_MAP.find(([code]) => code === ai);
            if (def) {
                const [, fixedLen, field] = def;
                pos += digits;
                let value: string;
                if (fixedLen) {
                    value = cleaned.substring(pos, pos + fixedLen);
                    pos += fixedLen;
                } else {
                    // Variable length: read until FNC1 or end
                    const fnc = cleaned.indexOf(GS1_FNC1, pos);
                    value = fnc >= 0 ? cleaned.substring(pos, fnc) : cleaned.substring(pos);
                    pos = fnc >= 0 ? fnc + 1 : cleaned.length;
                }
                applyAI(result, ai, value);
                matched = true;
                break;
            }
        }
        if (!matched) break; // Can't parse further
    }

    return result;
}

function applyAI(result: GS1Fields, ai: string, value: string) {
    const def = AI_MAP.find(([code]) => code === ai);
    if (def && value) {
        const field = def[2];
        if (!result[field]) { // Don't overwrite if already set
            (result as any)[field] = value;
        }
    }
}

/**
 * Formats a YYMMDD date string to a readable format (YYYY-MM-DD for HTML date inputs).
 */
export function gs1DateToISO(yymmdd: string): string | null {
    if (!yymmdd || yymmdd.length !== 6) return null;
    const yy = parseInt(yymmdd.substring(0, 2), 10);
    const mm = yymmdd.substring(2, 4);
    const dd = yymmdd.substring(4, 6);
    // GS1: years 00-49 → 2000-2049, years 50-99 → 1950-1999
    const yyyy = yy <= 49 ? 2000 + yy : 1900 + yy;
    if (dd === '00') return `${yyyy}-${mm}-01`; // Day 00 means last day of month
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns true if the raw string looks like a GS1 barcode.
 */
export function isGS1(raw: string): boolean {
    return raw.startsWith('(0') || raw.startsWith('01') || raw.includes('(10)') || raw.includes('\x1d');
}

/**
 * Returns the best unique identifier for inventory purposes.
 * Prefers GTIN (without leading zero padding) but falls back to lote/serial.
 */
export function getGS1PrimaryId(fields: GS1Fields): string {
    if (fields.gtin) {
        // Strip leading zeros to get the "REF" equivalent (last ~13 digits)
        return fields.gtin.replace(/^0+/, '') || fields.gtin;
    }
    return fields.ref || fields.serial || fields.lote || fields.raw;
}
