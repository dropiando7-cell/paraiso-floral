import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const totalWithImg = await prisma.inventarioHistorico.count({
    where: {
      imagenUrl: {
        not: null
      }
    }
  });

  const sampleWithImg = await prisma.inventarioHistorico.findFirst({
    where: {
      imagenUrl: {
        not: null
      }
    },
    select: {
      id: true,
      nombrePropiedad: true,
      imagenUrl: true,
      observaciones: true
    }
  });

  console.log({
    totalWithImg,
    sampleWithImg
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

