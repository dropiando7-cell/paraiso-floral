import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const rs = await prisma.activoFijo.findMany({
    where: { descripcionCorta: { contains: 'Masimo' } }
  });
  console.log(rs.map(r => ({ idQr: r.idQr, desc: r.descripcionCorta, imagenUrl: r.imagenUrl })));
}

check().finally(() => prisma.$disconnect());
