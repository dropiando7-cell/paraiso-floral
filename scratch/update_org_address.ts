import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        direccion: '8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula, Cortés',
        telefono: '+(504) 8854-2199 | +(504) 9645-3095',
      }
    });
    console.log(`Updated org: ${org.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
