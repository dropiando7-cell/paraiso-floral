import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.productoOdoo.count();
  const withImage = await prisma.productoOdoo.count({
    where: {
      imagenUrl: { not: null }
    }
  });

  console.log(`Total ProductoOdoo: ${total}`);
  console.log(`ProductoOdoo con imagenUrl: ${withImage}`);

  const samples = await prisma.productoOdoo.findMany({
    take: 10,
    select: {
      id: true,
      nombre: true,
      odooId: true,
      imagenUrl: true
    }
  });
  console.log('Muestras:', JSON.stringify(samples, null, 2));

  const samplesWithImages = await prisma.productoOdoo.findMany({
    where: { imagenUrl: { not: null } },
    take: 5,
    select: {
      id: true,
      nombre: true,
      odooId: true,
      imagenUrl: true
    }
  });
  console.log('Muestras con imágenes:', JSON.stringify(samplesWithImages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
