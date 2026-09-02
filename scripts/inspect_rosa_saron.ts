import XLSX from 'xlsx';

const wb = XLSX.readFile('referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx', { raw: true });
const ws = wb.Sheets['ROSA SARON'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

console.log('--- ALL ROWS FOR ROSA SARON ---');
rows.forEach((r, idx) => {
  if (r && (r[0] !== undefined || r[1] !== undefined || r[2] !== undefined || r[3] !== undefined)) {
    console.log(`Row ${idx}:`, r);
  }
});
