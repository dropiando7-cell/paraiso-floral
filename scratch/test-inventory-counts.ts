import { prisma } from '../src/lib/prisma';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
    const orgs = await prisma.organization.findMany();
    console.log('Organizations:', orgs.map(o => ({ id: o.id, name: o.name, slug: o.slug })));

    const activosCount = await prisma.activoFijo.count();
    console.log('Total ActivoFijo count:', activosCount);

    const categories = await prisma.categoria.findMany();
    console.log('Categories:', categories.map(c => ({ id: c.id, nombre: c.nombre })));

    const areas = await prisma.area.findMany();
    console.log('Areas:', areas.map(a => ({ id: a.id, name: a.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
