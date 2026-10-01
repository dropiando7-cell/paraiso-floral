import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const activos = await prisma.activoFijo.findMany({
    where: { descripcionCorta: { contains: 'ESTATICIA' } }
  });
  console.log(activos.map(a => ({ id: a.id, name: a.descripcionCorta, consumible: a.esConsumible, serie: a.serie, desc: a.descripcionDetallada })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
