import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Borrando datos de prueba de ActivoFijo y AreaInventoryStatus...');
    await prisma.colaImpresion.deleteMany({});
    await prisma.areaInventoryStatus.deleteMany({});
    await prisma.activoFijo.deleteMany({});
    console.log('¡Limpieza completada con éxito!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
