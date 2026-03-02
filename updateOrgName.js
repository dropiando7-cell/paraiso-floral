const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.organization.updateMany({
    where: { name: "Misión Cristiana Elim Central" },
    data: { name: "Elim Honduras" }
  });
  console.log(`Updated ${result.count} organizations.`);
}

main().catch(console.error).finally(async ()=> { await prisma.$disconnect() });
