import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    await prisma.user.update({
        where: { email: 'recepcion@demo.com' },
        data: {
            accessibleModules: ['/', '/soporte', '/inventario']
        }
    });
    console.log('Fixed modules');
}
main().finally(() => prisma.$disconnect());
