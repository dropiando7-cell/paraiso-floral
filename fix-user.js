const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    await prisma.user.updateMany({
        where: { customRoleName: 'ASISTENTE_ADMIN' },
        data: { accessibleModules: ['/inventario'] }
    })
}

main()
    .then(() => console.log('Fixed users with ASISTENTE_ADMIN role'))
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
