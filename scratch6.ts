import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.activoFijo.count({
    where: { organizationId: '2e6b71bb-a475-4dd3-83a4-b5fb6b6193f8' }
  });
  console.log('Total activos:', count);
}
check().finally(() => prisma.$disconnect());
