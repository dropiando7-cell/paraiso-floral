import XLSX from 'xlsx';

const wb = XLSX.readFile('referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx', { raw: true });

let totalCalculatedCartera = 0;
let totalExcelCartera = 0;
const results: any[] = [];

for (let sIdx = 0; sIdx < wb.SheetNames.length; sIdx++) {
  const sheetName = wb.SheetNames[sIdx];
  if (['Hoja2', 'Hoja3', 'RESUMIDO'].includes(sheetName.trim())) continue;

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  if (!rows || rows.length === 0) continue;

  let totalFacturas = 0;
  let totalPagos = 0;
  let excelFinalTotal = 0;

  for (let r = 4; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const [fecha, desc, rawCant, rawTot] = row;
    if (fecha === undefined && !desc && rawCant === undefined && rawTot === undefined) continue;

    const cant = typeof rawCant === 'number' ? rawCant : parseFloat(String(rawCant || '0').replace(/[^0-9.-]/g, '')) || 0;
    const descStr = String(desc || '').toUpperCase();

    const isAbono =
      cant < 0 ||
      descStr.includes('ABONO') ||
      descStr.includes('PAGO') ||
      descStr.includes('CHEQUE') ||
      descStr.includes('DEP') ||
      descStr.includes('TRANSF') ||
      descStr.includes('AJUSTE') ||
      descStr.includes('RETENCION') ||
      descStr.includes('DEV');

    if (isAbono) {
      totalPagos += Math.abs(cant);
    } else {
      totalFacturas += Math.abs(cant);
    }

    if (typeof rawTot === 'number') {
      excelFinalTotal = rawTot;
    }
  }

  const calculatedSaldo = totalFacturas - totalPagos;
  totalCalculatedCartera += calculatedSaldo;
  totalExcelCartera += excelFinalTotal;

  results.push({
    sheet: sheetName,
    facturado: totalFacturas,
    pagado: totalPagos,
    saldoCalculado: calculatedSaldo,
    saldoExcel: excelFinalTotal,
    match: Math.abs(calculatedSaldo - excelFinalTotal) < 1 ? '✅ EXACTO' : `⚠️ Dif: ${(calculatedSaldo - excelFinalTotal).toFixed(2)}`
  });
}

console.table(results);
console.log('Total Calculado:', totalCalculatedCartera.toFixed(2));
console.log('Total en Excel:', totalExcelCartera.toFixed(2));
