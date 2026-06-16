const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const products = await prisma.producto.findMany({
      where: {
        nombre: {
          contains: 'Mindray A7'
        }
      }
    });
    console.log(JSON.stringify(products, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
