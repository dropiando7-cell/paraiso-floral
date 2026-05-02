import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findUnique({where:{email:'recepcion@demo.com'}});
    console.log('User:', u);
}
main().finally(() => prisma.$disconnect());
