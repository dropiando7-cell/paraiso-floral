import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const h = await prisma.inventarioHistorico.findFirst()
  console.log(h)
  const count = await prisma.inventarioHistorico.count()
  console.log("Total:", count)
}
main()
