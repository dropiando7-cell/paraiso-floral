import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.factura.updateMany({
    where: {
      correlativo: {
        startsWith: 'FAC-OCC'
      },
      cajaSessionId: {
        not: null
      }
    },
    data: {
      cajaSessionId: null
    }
  });
  console.log(`Unlinked ${result.count} FAC-OCC invoices from caja sessions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
