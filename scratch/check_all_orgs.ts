import { prisma } from '../src/lib/prisma';

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('All Organizations:', JSON.stringify(orgs, null, 2));
}

main().catch(console.error);
