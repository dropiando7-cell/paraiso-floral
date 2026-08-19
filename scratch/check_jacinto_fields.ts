import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const jacinto = await prisma.activoFijo.findFirst({
    where: { idQr: 'PF-000194' }
  });

  console.log("=== PF-000194 TODAS LAS PROPIEDADES ===");
  console.log(jacinto);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
