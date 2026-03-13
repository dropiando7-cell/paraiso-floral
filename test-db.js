const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  try {
    const user = await prisma.user.findFirst()
    console.log("Connected successfully! Found user:", user.email)
  } catch (e) {
    console.error("Connection failed:", e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
