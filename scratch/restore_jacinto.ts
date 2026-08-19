import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.activoFijo.updateMany({
    where: { idQr: 'PF-000194' },
    data: {
      estatusContable: 'VIGENTE'
    }
  });

  console.log("✅ PF-000194 (Jacinto) ha sido cambiado nuevamente a VIGENTE.", updated);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
