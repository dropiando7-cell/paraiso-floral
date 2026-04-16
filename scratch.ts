import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const code1 = 'BEA-001-000099';
  const code2 = 'BEA-001-00009';
  
  const activo1 = await prisma.activoFijo.findFirst({ where: { idQr: code1 } });
  const activo2 = await prisma.activoFijo.findFirst({ where: { idQr: code2 } });
  
  console.log('Activo BEA-001-000099:', activo1 ? { ...activo1, descripcionCorta: activo1.descripcionCorta, imagenUrl: activo1.imagenUrl } : 'Not found');
  console.log('Activo BEA-001-00009:', activo2 ? { ...activo2, descripcionCorta: activo2.descripcionCorta, imagenUrl: activo2.imagenUrl } : 'Not found');

  const prod1 = await prisma.producto.findFirst({ where: { sku: code1 } });
  const prod2 = await prisma.producto.findFirst({ where: { sku: code2 } });

  console.log('Producto BEA-001-000099:', prod1 ? prod1.nombre : 'Not found');
  console.log('Producto BEA-001-00009:', prod2 ? prod2.nombre : 'Not found');
}

check().catch(console.error).finally(() => prisma.$disconnect());
