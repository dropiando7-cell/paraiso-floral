import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Encontrar la última sesión de la caja que esté cerrada
  const lastSession = await prisma.corteCajaSession.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (lastSession && lastSession.estado === 'CERRADA') {
    // Restaurarla a ABIERTA
    await prisma.corteCajaSession.update({
      where: { id: lastSession.id },
      data: {
        estado: 'ABIERTA',
        cierreAt: null,
        saldoFinalEfectivo: null,
        diferencia: null,
        observaciones: null,
        cerradoPorId: null
      }
    });
    
    // Y reasociar transacciones que pudieron desvincularse (solo si fue autocierre)
    // Pero si fue un cierre normal, es mejor solo abrirla
    
    console.log(`Sesión ${lastSession.id} restaurada exitosamente a ABIERTA`);
  } else {
    console.log('No se encontró una sesión para restaurar o la última ya está ABIERTA:', lastSession);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
