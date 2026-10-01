const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const detalles = await prisma.detalleFactura.findMany({
    where: { descripcion: { contains: 'Serie: N/A - Modelo: N/A' } }
  });
  console.log(`Found ${detalles.length} detalles to update.`);
  for (const d of detalles) {
    const updatedDesc = d.descripcion.replace('\nSerie: N/A - Modelo: N/A', '').replace('Serie: N/A - Modelo: N/A', '');
    await prisma.detalleFactura.update({
      where: { id: d.id },
      data: { descripcion: updatedDesc }
    });
  }
  console.log('Done.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
