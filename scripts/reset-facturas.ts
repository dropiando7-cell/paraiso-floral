import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Restableciendo datos de facturación...');

  try {
    // 1. Eliminar facturas (elimina en cascada detalles_factura y movimientos si aplica, aunque movimientos son independientes)
    console.log('Eliminando facturas...');
    await prisma.factura.deleteMany({});
    
    // 2. Ajustar la secuencia de numeroInterno
    console.log('Ajustando secuencia PostgreSQL (facturas_numeroInterno_seq) a 1132...');
    await prisma.$executeRaw`ALTER SEQUENCE "facturas_numeroInterno_seq" RESTART WITH 1132;`;
    
    console.log('¡Limpieza completada con éxito!');
  } catch (error) {
    console.error('Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
