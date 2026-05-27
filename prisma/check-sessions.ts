import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.corteCajaSession.findMany({
        orderBy: { aperturaAt: 'desc' },
        take: 5
    });
    console.log("Sessions found:", sessions.map(s => ({
        id: s.id,
        estado: s.estado,
        aperturaAt: s.aperturaAt,
        organizationId: s.organizationId
    })));

    const orgs = await prisma.organization.findMany();
    console.log("Organizations:", orgs.map(o => ({ id: o.id, name: o.name })));
}

main().finally(() => prisma.$disconnect());
