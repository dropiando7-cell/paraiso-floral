import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, organizationId: true }
  });
  console.log('Users and Orgs:', JSON.stringify(users, null, 2));

  const templates = await prisma.roleTemplate.findMany({
    select: { id: true, name: true, organizationId: true }
  });
  console.log('Templates and Orgs:', JSON.stringify(templates, null, 2));
}

main().catch(console.error);
