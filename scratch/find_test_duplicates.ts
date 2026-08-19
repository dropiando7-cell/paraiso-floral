import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activos = await prisma.activoFijo.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      idQr: true,
      descripcionCorta: true,
      stock: true,
      costoAdq: true,
      createdAt: true
    }
  });

  const testBatch1 = activos.filter(a => a.createdAt && a.createdAt.toISOString().startsWith('2026-08-13'));
  const testBatch2 = activos.filter(a => a.idQr === 'FREEDOM-24-7819');

  console.log(`=== BATCH 1: REGISTROS DE PRUEBA INICIALES (CREADOS EL 13 DE AGOSTO) [${testBatch1.length} ítems] ===\n`);
  testBatch1.forEach((item, index) => {
    console.log(`${(index + 1).toString().padStart(2, ' ')}. Etiqueta: ${item.idQr} | Producto: "${item.descripcionCorta}" | Stock: ${item.stock} | Precio: L. ${item.costoAdq} | Fecha: ${item.createdAt?.toISOString().replace('T', ' ').substring(0, 19)}`);
  });

  console.log(`\n=== OTROS PRUEBA ESPECÍFICOS ===`);
  testBatch2.forEach((item) => {
    console.log(`Etiqueta: ${item.idQr} | Producto: "${item.descripcionCorta}" | Stock: ${item.stock} | Precio: L. ${item.costoAdq}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
