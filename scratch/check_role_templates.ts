import { prisma } from '../src/lib/prisma';

async function main() {
  const templates = await prisma.roleTemplate.findMany();
  console.log('Role Templates in DB:', JSON.stringify(templates, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      customRoleName: true,
      accessibleModules: true,
    }
  });
  console.log('Users in DB:', JSON.stringify(users, null, 2));
}

main().catch(console.error);
