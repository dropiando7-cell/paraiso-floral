import { prisma } from '../src/lib/prisma';

async function main() {
  const facturas = await prisma.factura.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, correlativo: true, tipoDocumento: true }
  });
  console.log('Recent Facturas:', facturas);
}

main().catch(console.error);
