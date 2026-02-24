import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// ─── Types matching the template structure ────────────────────────────────────

export interface TemplateTransaction {
    fecha: string;
    referencia: string;
    descripcion: string;
    monto: number;
}

export interface TemplateReconciliationData {
    informacion_general: {
        banco_nombre: string;
        cuenta_numero: string;
        fecha_conciliacion: string;
        moneda: string;
        saldo_banco: number;
        saldo_libros: number;
    };
    debitos_libros_no_banco: TemplateTransaction[];      // (+) Depósitos en libros no en banco
    creditos_libros_no_banco: TemplateTransaction[];     // (-) Créditos en libros no en banco
    debitos_banco_no_libros: TemplateTransaction[];      // (+) Débitos en banco no en libros (ND)
    creditos_banco_no_libros: TemplateTransaction[];     // (-) Créditos en banco no en libros (NC)
    autorizaciones: {
        elaborado_nombre: string;
        elaborado_fecha: string;
    };
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

function setCell(ws: XLSX.WorkSheet, addr: string, value: string | number, style?: object) {
    const cell: XLSX.CellObject = {
        v: value,
        t: typeof value === 'number' ? 'n' : 's',
    };
    if (style) {
        (cell as unknown as Record<string, unknown>).s = style;
    }
    ws[addr] = cell;
}

function writeTransactionRows(
    ws: XLSX.WorkSheet,
    startRow: number,
    transactions: TemplateTransaction[],
    maxRows: number
): number {
    let total = 0;
    for (let i = 0; i < Math.min(transactions.length, maxRows); i++) {
        const t = transactions[i];
        const row = startRow + i;
        setCell(ws, `B${row}`, t.fecha);
        setCell(ws, `C${row}`, t.referencia);
        setCell(ws, `D${row}`, t.descripcion);
        setCell(ws, `E${row}`, t.monto);
        total += t.monto;
    }
    return total;
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Fill the master reconciliation Excel template with Claude's structured data.
 * Returns a Buffer of the filled workbook.
 */
export function fillReconciliationTemplate(data: TemplateReconciliationData): Buffer {
    const templatePath = path.join(process.cwd(), 'plantilla-concilia', 'Plantilla_Maestra_Conciliacion_Bancaria.xlsx');
    const templateBuffer = fs.readFileSync(templatePath);
    const wb = XLSX.read(templateBuffer, { type: 'buffer' });
    const ws = wb.Sheets['Hoja1'];

    const info = data.informacion_general;

    // ── Header info ──────────────────────────────────────────────────────────────
    setCell(ws, 'C7', info.banco_nombre);
    setCell(ws, 'E7', info.cuenta_numero);
    setCell(ws, 'C8', info.fecha_conciliacion);
    setCell(ws, 'E8', info.moneda || 'LPS');
    setCell(ws, 'E10', info.saldo_banco);

    // ── Section 1: Débitos en libros NO en banco (rows 13-14) ────────────────────
    // (+) Add to bank balance to reconcile
    const total1 = writeTransactionRows(ws, 13, data.debitos_libros_no_banco, 2);
    setCell(ws, 'E15', total1); // Total
    const saldoParcial1 = info.saldo_banco + total1;
    setCell(ws, 'E16', saldoParcial1);

    // ── Section 2: Créditos en libros NO en banco (rows 19-20) ───────────────────
    // (-) Subtract from bank balance to reconcile
    const total2 = writeTransactionRows(ws, 19, data.creditos_libros_no_banco, 2);
    setCell(ws, 'E21', total2);
    const saldoParcial2 = saldoParcial1 - total2;
    setCell(ws, 'E22', saldoParcial2);

    // ── Section 3: Débitos en banco NO en libros (rows 23-25) ────────────────────
    // These show differences — bank debited but not in books
    const total3 = writeTransactionRows(ws, 23, data.debitos_banco_no_libros, 3);
    setCell(ws, 'E26', total3);
    const saldoParcial3 = saldoParcial2 - total3;
    setCell(ws, 'E27', saldoParcial3);

    // ── Section 4: Créditos en banco NO en libros (rows 30-31) ───────────────────
    const total4 = writeTransactionRows(ws, 30, data.creditos_banco_no_libros, 2);
    setCell(ws, 'E32', total4);
    const saldoAjustado = saldoParcial3 + total4;
    setCell(ws, 'E33', saldoAjustado);

    // ── Final balances (rows 35-37) ───────────────────────────────────────────────
    const saldoFinalConciliado = saldoAjustado;
    const saldoFinalLibros = info.saldo_libros;
    const diferencia = saldoFinalConciliado - saldoFinalLibros;

    setCell(ws, 'E35', saldoFinalConciliado);
    setCell(ws, 'E36', saldoFinalLibros);
    setCell(ws, 'E37', diferencia);

    // ── Signatures (rows 40-41) ───────────────────────────────────────────────────
    setCell(ws, 'C40', data.autorizaciones.elaborado_nombre);
    setCell(ws, 'C41', data.autorizaciones.elaborado_fecha);
    // E40 already has "Rafael Isaac Paz Sabillón" from template

    // ── Write and return ──────────────────────────────────────────────────────────
    const outputBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return outputBuffer;
}
