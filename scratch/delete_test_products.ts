import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const testQrs = [
    'PF-0001', 'PF-0002', 'PF-0003', 'PF-0004', 'PF-0005', 'PF-0006', 'PF-0007', 'PF-0008', 'PF-0009', 'PF-0010',
    'PF-0011', 'PF-0012', 'PF-0013', 'PF-0014', 'PF-0015', 'PF-0016', 'PF-0017', 'PF-0018', 'PF-0019', 'PF-0020',
    'PF-0021', 'PF-0022', 'PF-0023', 'PF-0024', 'PF-0025', 'PF-0026', 'PF-0027', 'PF-0028', 'PF-0029',
    'FREEDOM-24-7819'
  ];

  console.log(`Buscando ${testQrs.length} productos de prueba para eliminación...\n`);

  const itemsToDelete = await prisma.activoFijo.findMany({
    where: {
      idQr: { in: testQrs }
    },
    select: {
      id: true,
      idQr: true,
      descripcionCorta: true,
      stock: true
    }
  });

  console.log(`Encontrados ${itemsToDelete.length} registros en base de datos para eliminar:`);
  itemsToDelete.forEach((item, i) => {
    console.log(`  [${i + 1}] QR: ${item.idQr} | ID: ${item.id} | ${item.descripcionCorta}`);
  });

  const ids = itemsToDelete.map(i => i.id);

  if (ids.length === 0) {
    console.log("No se encontraron registros de prueba para eliminar.");
    return;
  }

  // Delete from ActivoFijo
  const deleteResult = await prisma.activoFijo.deleteMany({
    where: {
      id: { in: ids }
    }
  });

  console.log(`\n✅ ¡ELIMINACIÓN EXITOSA! Se eliminaron ${deleteResult.count} productos de prueba.`);

  const remainingCount = await prisma.activoFijo.count();
  console.log(`📊 Total de productos en catálogo activo: ${remainingCount}`);
}

main()
  .catch((err) => {
    console.error("❌ Error al eliminar registros:", err);
  })
  .finally(() => prisma.$disconnect());
