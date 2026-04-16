import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const rs = await prisma.activoFijo.findFirst({
    where: { descripcionCorta: { contains: 'BEA-001-0000' } }
  });
  console.log('contains desc:', rs?.descripcionCorta);

  const rs2 = await prisma.activoFijo.findFirst({
    where: { idQr: { contains: 'BEA-001-0000' } }
  });
  console.log('contains qr:', rs2?.idQr, rs2?.descripcionCorta);
}

check().finally(() => prisma.$disconnect());
