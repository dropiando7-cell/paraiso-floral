import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrg() {
    const orgs = await prisma.organization.findMany();
    console.log("Organizaciones:", orgs);

    const firstActivo = await prisma.activoFijo.findFirst();
    console.log("Primer activo orgId:", firstActivo?.organizationId);
}

checkOrg().finally(() => prisma.$disconnect());
