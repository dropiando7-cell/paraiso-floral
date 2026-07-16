import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const quotes = await prisma.factura.findMany({
        where: {
            tipoDocumento: {
                in: ['COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO']
            }
        },
        orderBy: {
            fechaEmision: 'desc'
        },
        take: 15
    });

    console.log("Recent quotes found in DB:");
    quotes.forEach(q => {
        console.log(`- ID: ${q.id} | Corr: ${q.correlativo} | Tipo: ${q.tipoDocumento} | Estado: ${q.estado} | Emision: ${q.fechaEmision.toISOString().slice(0, 10)}`);
    });
}

main().finally(() => prisma.$disconnect());
