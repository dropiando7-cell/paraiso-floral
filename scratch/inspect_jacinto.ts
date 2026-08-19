import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const jacinto = await prisma.activoFijo.findFirst({
    where: { idQr: 'PF-000194' },
    include: {
      detallesFactura: {
        include: {
          factura: true
        }
      },
      historial: true
    }
  });

  console.log("=== DETALLES DEL PRODUCTO PF-000194 (Jacinto) ===");
  console.log(JSON.stringify(jacinto, null, 2));

  // Also search for all facturas and invoice details created recently
  const facturasCount = await prisma.factura.count();
  const ultimasFacturas = await prisma.factura.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      detalles: true
    }
  });

  console.log(`\n=== ÚLTIMAS FACTURAS EMITIDAS (${facturasCount} total) ===`);
  console.log(JSON.stringify(ultimasFacturas, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
