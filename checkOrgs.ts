import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organization.findMany();
    console.log('ORGANIZACIONES EN LA BASE DE DATOS:');
    console.dir(orgs, { depth: null });
}

main().catch(console.error).finally(async () => { await prisma.$disconnect() });
