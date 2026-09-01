import { prisma } from '../src/lib/prisma';

async function listAllProducts() {
  const prods = await prisma.producto.findMany({
    where: { organizationId: 'a0287245-6cad-4df5-a32a-f214b7b72e04' },
    orderBy: { nombre: 'asc' }
  });
  console.log(`=== TODOS LOS PRODUCTOS (${prods.length}) ===`);
  prods.forEach(p => console.log(`${p.sku} | ${p.nombre} | Stock: ${p.stockActual} | Precio: ${p.precioVenta}`));
}

listAllProducts().finally(() => prisma.$disconnect());
