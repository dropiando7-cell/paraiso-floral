import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const email = 'dropiando7@gmail.com';
  const realOrgId = '2e6b71bb-a475-4dd3-83a4-b5fb6b6193f8';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log(`Current org of ${email}: ${user.organizationId}`);
  
  await prisma.user.update({
    where: { email },
    data: { organizationId: realOrgId }
  });

  console.log(`Updated ${email} organizationId to ${realOrgId}.`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
