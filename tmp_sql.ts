import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('facturas', 'numeroInterno'), 1131, true);`);
    console.log("Secuencia actualizada, res =", res);
  } catch(e) {
    console.error("Error setting sequence:", e);
  }
}
main().finally(() => prisma.$disconnect());
