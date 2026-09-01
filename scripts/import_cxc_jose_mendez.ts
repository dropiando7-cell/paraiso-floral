import { prisma } from '../src/lib/prisma';
import XLSX from 'xlsx';

const ORG_ID = 'a0287245-6cad-4df5-a32a-f214b7b72e04'; // Paraíso Floral

function excelDateToDate(excelDate: any): Date | null {
  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof excelDate === 'string' && excelDate.trim()) {
    const parts = excelDate.trim().split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(excelDate);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

async function runImport() {
  console.log('🚀 Iniciando proceso de importación de CxC - Ruta Occidente (José Méndez)...');

  const fileUri = 'referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx';
  const wb = XLSX.readFile(fileUri, { raw: true });

  const dbClients = await prisma.cliente.findMany({
    where: { organizationId: ORG_ID },
  });

  console.log(`📋 Total de clientes en BD para Paraíso Floral: ${dbClients.length}`);

  let updatedCount = 0;
  let createdCount = 0;
  let totalBalanceImported = 0;

  for (const sheetName of wb.SheetNames) {
    if (['Hoja2', 'Hoja3', 'RESUMIDO'].includes(sheetName.trim())) continue;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    let clientNameInHeader = sheetName.trim();
    let locationInHeader = '';
    let headerRowIndex = -1;

    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toUpperCase();
        if (val.includes('CLIENTE') && row[c + 1]) clientNameInHeader = String(row[c + 1]).trim();
        if (val.includes('LUGAR') && row[c + 1]) locationInHeader = String(row[c + 1]).trim();
        if (val.includes('FECHA') || val.includes('FACTURA')) headerRowIndex = r;
      }
    }

    let lastTxBalance: number = 0;
    let lastTxDateRaw: any = null;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const fechaRaw = row[0];
      const descRaw = row[1];
      const cantRaw = row[2];
      const totalRaw = row[3];

      const desc = descRaw !== undefined && descRaw !== null ? String(descRaw).trim() : '';
      const cant = typeof cantRaw === 'number' ? cantRaw : parseFloat(String(cantRaw || '').replace(/,/g, ''));
      const total = typeof totalRaw === 'number' ? totalRaw : parseFloat(String(totalRaw || '').replace(/,/g, ''));

      if (fechaRaw !== undefined || desc || !isNaN(cant)) {
        if (!isNaN(total)) {
          lastTxBalance = total;
        }
        if (fechaRaw !== undefined && fechaRaw !== null) {
          lastTxDateRaw = fechaRaw;
        }
      }
    }

    const finalSaldo = lastTxBalance < 0 ? 0 : Number(lastTxBalance.toFixed(2));
    const parsedDate = excelDateToDate(lastTxDateRaw) || new Date('2026-08-31');

    const cleanSheet = sheetName.trim().toUpperCase();
    const cleanHeader = clientNameInHeader.trim().toUpperCase();

    // Specific matching logic
    let targetDbClient = null;

    if (cleanSheet === 'YOLANI ANY') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase() === 'FLORISTERIA YOLANY ANY') ||
                       dbClients.find(c => c.nombre.toUpperCase() === 'ANY');
    } else if (cleanSheet === 'DANIA DUBON') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase().includes('DANIA GISSELL DUBON'));
    } else if (cleanSheet === 'LEFRUITT') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase().includes('LEFRUITT'));
    } else if (cleanSheet === 'MANOS CREATIVAS') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase() === 'MANOS CREATIVAS') ||
                       dbClients.find(c => c.nombre.toUpperCase() === 'INVERSIONES MANOS CREATIVAS');
    } else if (cleanSheet === 'DPETALOS') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase() === 'FLORISTERIA D PETALOS');
    } else {
      targetDbClient = dbClients.find(c => {
        const dbName = c.nombre.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
        const sheetCleanName = cleanSheet.replace(/[^A-Z0-9 ]/g, '').trim();
        const headerCleanName = cleanHeader.replace(/[^A-Z0-9 ]/g, '').trim();
        return dbName === sheetCleanName || dbName === headerCleanName;
      });
    }

    const noteText = 'Carga inicial CxC Excel - Ruta Occidente / Vendedor José Mendez (Agosto 2026)';
    const deptText = locationInHeader.trim().toUpperCase() || 'OCCIDENTE';

    if (targetDbClient) {
      // Update existing client
      await prisma.cliente.update({
        where: { id: targetDbClient.id },
        data: {
          saldoInicial: finalSaldo,
          fechaSaldoInicial: parsedDate,
          departamento: targetDbClient.departamento || deptText,
          notas: targetDbClient.notas ? `${targetDbClient.notas} | ${noteText}` : noteText
        }
      });
      updatedCount++;
      totalBalanceImported += finalSaldo;
      console.log(`  ✅ [ACTUALIZADO] ${targetDbClient.nombre} => Saldo Inicial: L. ${finalSaldo.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`);
    } else {
      // Create new client
      const newClientName = cleanHeader || cleanSheet;
      const created = await prisma.cliente.create({
        data: {
          organizationId: ORG_ID,
          nombre: newClientName,
          departamento: deptText,
          limiteCredito: 0,
          saldoInicial: finalSaldo,
          fechaSaldoInicial: parsedDate,
          diasCredito: 15,
          notas: noteText
        }
      });
      createdCount++;
      totalBalanceImported += finalSaldo;
      console.log(`  ✨ [CREADO NUEVO] ${created.nombre} (${deptText}) => Saldo Inicial: L. ${finalSaldo.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`);
    }
  }

  console.log('\n====================================');
  console.log('🎉 RESUMEN DE LA IMPORTACIÓN');
  console.log('====================================');
  console.log(`Clientes Actualizados: ${updatedCount}`);
  console.log(`Clientes Nuevos Creados: ${createdCount}`);
  console.log(`Total Clientes Procesados: ${updatedCount + createdCount}`);
  console.log(`Monto Total CxC Importado: L. ${totalBalanceImported.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`);
}

runImport()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('❌ Error durante la importación:', err);
    prisma.$disconnect();
    process.exit(1);
  });
