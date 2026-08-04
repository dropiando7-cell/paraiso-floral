import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const id = 'ee8f3681-e869-4030-a54f-e83cf6c78363';
    const invoice = await prisma.factura.findUnique({
        where: { id },
        include: {
            cliente: true,
            detalles: true
        }
    });
    console.log("Invoice in DB:", invoice);
}

main().finally(() => prisma.$disconnect());
