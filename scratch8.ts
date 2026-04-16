import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const activo = await prisma.activoFijo.findFirst({
      where: {
          organizationId: '2e6b71bb-a475-4dd3-83a4-b5fb6b6193f8',
          idQr: { equals: 'BEA-001-00006', mode: 'insensitive' },
          estatusContable: 'VIGENTE'
      },
      include: { producto: true }
  });
  console.log('Equals directly:', activo ? activo.idQr : 'No');

  const p = await prisma.producto.findFirst({
    where: { sku: { equals: 'BEA-001-00006', mode: 'insensitive' } }
  });
  console.log('Equals producto:', p ? p.sku : 'No');
}
check().finally(() => prisma.$disconnect());
