import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('Iniciando deduplicación de inventario...');
    
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.log('No org found');
        return;
    }

    const all = await prisma.activoFijo.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' }, // Mantener los más recientes
    });

    const seen = new Set();
    let deleted = 0;

    for (const p of all) {
        if (!p.descripcionCorta) continue;
        
        const key = p.descripcionCorta.trim().toLowerCase();
        
        if (seen.has(key)) {
            await prisma.activoFijo.delete({ where: { id: p.id } });
            deleted++;
        } else {
            seen.add(key);
        }
    }

    console.log(`🔥 Proceso finalizado. Se eliminaron ${deleted} productos duplicados.`);
}

run()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
