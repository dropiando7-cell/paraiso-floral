import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cliente = await prisma.cliente.findFirst({
    where: { nombre: { contains: 'ROSALIA', mode: 'insensitive' } },
    include: {
      facturas: true,
      pagos: true,
      notasCredito: true
    }
  });

  console.log('Cliente encontrado:', cliente);
}

main().catch(console.error).finally(() => prisma.$disconnect());
