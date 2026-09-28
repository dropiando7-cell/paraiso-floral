const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.roleTemplate.findFirst({
    where: { name: 'KEYLIN_ADMON' }
  });
  console.log(role);
}
main();
