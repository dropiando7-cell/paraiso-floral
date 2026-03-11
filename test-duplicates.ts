import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const all = await prisma.inventarioHistorico.findMany({
    orderBy: { createdAt: 'asc' }
  });
  console.log("Total records:", all.length);
  
  const createdAts = new Set(all.map(r => r.createdAt.toISOString()));
  console.log("Distinct createdAts:", Array.from(createdAts));

  // Count exactly identical records (ignoring ID and timestamps)
  const duplicates = await prisma.$queryRaw`
    SELECT "nombrePropiedad", "costoAdquisicion", COUNT(*) as count
    FROM "InventarioHistorico"
    GROUP BY "nombrePropiedad", "costoAdquisicion"
    HAVING COUNT(*) > 1
    LIMIT 5;
  `;
  console.log("Some duplicates:", duplicates);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
