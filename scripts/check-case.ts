import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findUnique({where:{email:'Recepcion@demo.com'}});
    console.log('Capital R User:', !!u);
}
main().finally(() => prisma.$disconnect());
