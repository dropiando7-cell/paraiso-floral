import XLSX from 'xlsx';

function analyzeExcel() {
  const wb = XLSX.readFile('referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx', { raw: true });
  console.log('Total sheet names:', wb.SheetNames.length);

  const sheetsInfo = wb.SheetNames.map((name, idx) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    let headerName = '';
    let lugar = '';
    for (let r = 0; r < Math.min(6, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toUpperCase();
        if (val.includes('CLIENTE')) {
          headerName = String(row[c+1] || row[c]).replace(/CLIENTE:?/i, '').trim();
        }
        if (val.includes('LUGAR')) {
          lugar = String(row[c+1] || row[c]).replace(/LUGAR:?/i, '').trim();
        }
      }
    }

    let txCount = 0;
    let finalSaldo = 0;
    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const [fecha, desc, cant, tot] = row;
      if (fecha !== undefined || desc !== undefined || cant !== undefined) {
        txCount++;
        if (typeof tot === 'number') finalSaldo = tot;
      }
    }

    return {
      index: idx + 1,
      sheetName: name,
      headerName,
      lugar,
      txCount,
      finalSaldo
    };
  });

  console.table(sheetsInfo);
}

analyzeExcel();
