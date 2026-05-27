import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const inv = await prisma.factura.findFirst({
        where: { correlativo: { contains: 'FAC-SO00001214' } }
    });
    console.log("Invoice found:", inv ? {
        id: inv.id,
        correlativo: inv.correlativo,
        estado: inv.estado,
        tipoDocumento: inv.tipoDocumento,
        total: inv.total.toString(),
        cajaSessionId: inv.cajaSessionId,
        fechaEmision: inv.fechaEmision,
        metodoPago: inv.metodoPago
    } : "Not found");
}

main().finally(() => prisma.$disconnect());
