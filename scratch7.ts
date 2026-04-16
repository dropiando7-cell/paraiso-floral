import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const activo = await prisma.activoFijo.findFirst({
    where: { idQr: 'BEA-001-000066' }
  });
  console.log('Activo:', activo ? {
    idQr: activo.idQr,
    desc: activo.descripcionCorta,
    imagenUrl: activo.imagenUrl
  } : 'Not found');
}
check().finally(() => prisma.$disconnect());
