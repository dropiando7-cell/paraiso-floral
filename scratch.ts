import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const orgId = 'a0287245-6cad-4df5-a32a-f214b7b72e04';

  const templates = await prisma.roleTemplate.findMany({
    where: { organizationId: orgId }
  });

  console.log('Role Templates:', templates);
}

check().catch(console.error).finally(() => prisma.$disconnect());
