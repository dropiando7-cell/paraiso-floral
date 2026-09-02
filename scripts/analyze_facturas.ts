import { prisma } from '../src/lib/prisma';
import XLSX from 'xlsx';

async function analyzeAll() {
  console.log('=== 1. CHECKING SHEETS IN EXCEL ===');
  const wb = XLSX.readFile('referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx', { raw: true });
  console.log('Total sheets in Jose Mendez Excel:', wb.SheetNames.length);

  const excelSheetNames = wb.SheetNames.filter(s => !['Hoja2', 'Hoja3', 'RESUMIDO'].includes(s.trim()));
  console.log('Valid client sheets in Jose Mendez Excel:', excelSheetNames.length);
  console.log('Sheet names:', excelSheetNames);

  console.log('\n=== 2. CHECKING SERVIMAS, RIVERA, ENFOQUE, SOLINSA IN DB ===');
  const sampleOld = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: 'SERVIMAS' } },
        { nombre: { contains: 'RIVERA' } },
        { nombre: { contains: 'ENFOQUE' } },
        { nombre: { contains: 'SOLINSA' } }
      ]
    },
    include: {
      facturas: { select: { id: true, correlativo: true, total: true, saldoPendiente: true, createdAt: true, estado: true } },
      pagos: { select: { id: true, monto: true, fecha: true } }
    }
  });

  sampleOld.forEach(c => {
    console.log('\nCliente:', c.nombre, '| ruta:', c.ruta, '| vendedorId:', c.vendedorId, '| saldoInicial:', Number(c.saldoInicial));
    console.log('Facturas count:', c.facturas.length);
    c.facturas.slice(0, 5).forEach(f => console.log('  Factura:', f.correlativo, 'Total:', Number(f.total), 'CreatedAt:', f.createdAt));
  });

  console.log('\n=== 3. ALL FACTURA CORRELATIVOS DISTRIBUTION ===');
  const allFacturas = await prisma.factura.findMany({
    select: { id: true, correlativo: true, estado: true, total: true, createdAt: true }
  });
  console.log('Total facturas in DB:', allFacturas.length);
  const byPrefix: Record<string, number> = {};
  allFacturas.forEach(f => {
    const prefix = f.correlativo.slice(0, 15);
    byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
  });
  console.log('Facturas by prefix/correlativo:', byPrefix);
}

analyzeAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
