import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.corteCajaSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log(JSON.stringify(sessions, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
