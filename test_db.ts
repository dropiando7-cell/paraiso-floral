import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const prod = await prisma.producto.findMany({
    where: { nombre: { contains: 'monitor', mode: 'insensitive' } }
  })
  console.log("Productos:", prod)
  
  const act = await prisma.activoFijo.findMany({
    where: { descripcionCorta: { contains: 'monitor', mode: 'insensitive' } }
  })
  console.log("Activos Fijos:", act)
}
main()
