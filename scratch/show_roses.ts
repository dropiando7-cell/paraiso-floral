import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showRoses() {
    const all = await prisma.activoFijo.findMany({
        orderBy: { idQr: 'asc' }
    });
    console.log("=== ROSAS EN ACTIVOS FIJOS ===");
    all.forEach(a => {
        if (a.descripcionCorta.toLowerCase().includes("rosa") || a.idQr === "000208" || a.idQr === "000206") {
            console.log(`QR: ${a.idQr.padStart(6, '0')} | CodBarras: ${a.codigoBarras || 'N/A'} | Desc: "${a.descripcionCorta}" | Stock: ${a.stock}`);
        }
    });
}

showRoses().finally(() => prisma.$disconnect());
