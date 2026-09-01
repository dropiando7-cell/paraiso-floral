import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: 'ILONKA', mode: 'insensitive' } },
        { nombre: { contains: 'LOVELY', mode: 'insensitive' } },
        { nombre: { contains: 'JENNY', mode: 'insensitive' } },
      ]
    }
  });

  console.log('=== CLIENTES ENCONTRADOS ===');
  console.log(JSON.stringify(clients, null, 2));

  const total = await prisma.cliente.count();
  console.log(`Total clientes en DB: ${total}`);
}

main().finally(() => prisma.$disconnect());
