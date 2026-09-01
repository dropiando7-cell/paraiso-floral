import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, nombre: true, apellido: true, email: true, role: true, organizationId: true }
  });
  console.log('=== USUARIOS ===');
  console.log(users);

  const org = await prisma.organization.findFirst();
  console.log('=== ORGANIZACION ===');
  console.log(org?.id, org?.name);

  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'rutas_db' }
  });
  console.log('=== RUTAS_DB EXISTS ===', !!setting);
  if (setting) {
    const data = JSON.parse(setting.value);
    console.log('Camiones:', data.camiones);
    console.log('Rutas existentes:', (data.rutas || []).map((r: any) => ({ id: r.id, nombre: r.rutaNombre, conductor: r.conductorNombre, estado: r.estado })));
  }

  const products = await prisma.producto.findMany({
    select: { id: true, nombre: true, sku: true, stockActual: true, precioVenta: true }
  });
  console.log(`=== PRODUCTOS TOTALES: ${products.length} ===`);
  console.log(products.slice(0, 30));
}

main().finally(() => prisma.$disconnect());
