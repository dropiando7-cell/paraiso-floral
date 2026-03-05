const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const roles = await prisma.roleTemplate.findMany()
    console.log("Roles:", roles)

    const users = await prisma.user.findMany({
        select: { email: true, role: true, customRoleName: true, accessibleModules: true }
    })
    console.log("Users:", users)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
