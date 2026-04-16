import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const activos = await prisma.activoFijo.findMany({
    where: { organizationId: '2e6b71bb-a475-4dd3-83a4-b5fb6b6193f8', idQr: 'BEA-001-000095' }
  });
  console.log(activos.map(a => ({ idQr: a.idQr, imagenUrl: a.imagenUrl })));
}

check().finally(() => prisma.$disconnect());
