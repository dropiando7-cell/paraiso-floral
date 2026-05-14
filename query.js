const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const movs = await prisma.cajaChicaMovimiento.findMany();
  console.log('Movimientos:', movs);
  const sessions = await prisma.cajaChicaSession.findMany();
  console.log('Sessions:', sessions);
}

main().finally(() => prisma.$disconnect());
