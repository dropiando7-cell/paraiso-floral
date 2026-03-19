import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const orgs = await prisma.organization.findMany();
    console.log(orgs.map(o => ({ id: o.id, name: o.name })));
}

run().finally(() => prisma.$disconnect());
