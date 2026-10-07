const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO ASIGNACIÓN SEGURA DE VENDEDORES ===");
  const filePath = "Packing List/vendedores/LISTA DE PAGOS PENDIENTES.xlsx";
  const workbook = xlsx.readFile(filePath);

  const vendorMap = {
    'LUCIO BARAHONA': 'Lucio Barahona',
    'ERICK SAAVEDRA': 'Erick Saavedra',
    'JOSE MENDEZ': 'Jose Mendez'
  };

  // 1. Cargar facturas en lote para mapear
  console.log("Cargando facturas de la base de datos...");
  const facturas = await prisma.factura.findMany({
    where: {
      correlativo: {
        gte: '000-001-01-00003000'
      }
    },
    select: {
      id: true,
      correlativo: true,
      cliente: { select: { nombre: true } },
      total: true,
      vendedorNombre: true
    }
  });

  const facturaMap = new Map();
  for (const f of facturas) {
    const match = f.correlativo.match(/(\d+)$/);
    if (match) {
      const numStr = String(parseInt(match[1], 10));
      facturaMap.set(numStr, f);
    }
  }

  let totalUpdated = 0;
  const summaryByVendor = {
    'Lucio Barahona': 0,
    'Erick Saavedra': 0,
    'Jose Mendez': 0
  };

  for (const sheetName of workbook.SheetNames) {
    const targetVendor = vendorMap[sheetName];
    if (!targetVendor) {
      console.warn(`Pestaña ignorada (no es vendedor mapeado): ${sheetName}`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\nProcesando pestaña "${sheetName}" -> Asignando a: "${targetVendor}"...`);

    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const rawCorrelativo = row[0];
      const num = parseInt(rawCorrelativo, 10);
      if (isNaN(num) || num < 100 || num > 99999) continue;

      const numStr = String(num);
      const factura = facturaMap.get(numStr);

      if (!factura) {
        console.warn(`[AVISO] No se encontró factura para correlativo ${numStr}`);
        continue;
      }

      // Actualizar de forma segura SOLO el campo vendedorNombre
      await prisma.factura.update({
        where: { id: factura.id },
        data: {
          vendedorNombre: targetVendor
        }
      });

      summaryByVendor[targetVendor]++;
      totalUpdated++;
    }
  }

  console.log("\n=== ASIGNACIÓN COMPLETADA CON ÉXITO ===");
  for (const [vendor, count] of Object.entries(summaryByVendor)) {
    console.log(`✓ ${vendor}: ${count} facturas asignadas`);
  }
  console.log(`TOTAL FACTURAS ACTUALIZADAS: ${totalUpdated}`);

  // Verificación final en base de datos
  console.log("\nVerificando conteos en la base de datos:");
  for (const vendor of Object.values(vendorMap)) {
    const countInDb = await prisma.factura.count({
      where: { vendedorNombre: vendor }
    });
    console.log(`- Base de Datos: "${vendor}" tiene ${countInDb} facturas.`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Error en la asignación:", e);
  await prisma.$disconnect();
  process.exit(1);
});
