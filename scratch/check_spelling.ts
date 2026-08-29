import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const all = await prisma.activoFijo.findMany();
    
    console.log("=== BUSCANDO POSIBLES COINCIDENCIAS ===");
    
    // Anjelika / Angelica
    const angelica = all.filter(a => a.descripcionCorta.toLowerCase().includes("angel"));
    console.log("Angelica/Anjelika:", angelica.map(a => `${a.idQr} - ${a.descripcionCorta}`));

    // Nautika / Nautica
    const nautica = all.filter(a => a.descripcionCorta.toLowerCase().includes("naut"));
    console.log("Nautika/Nautica:", nautica.map(a => `${a.idQr} - ${a.descripcionCorta}`));

    // Florida
    const florida = all.filter(a => a.descripcionCorta.toLowerCase().includes("flor"));
    console.log("Florida:", florida.map(a => `${a.idQr} - ${a.descripcionCorta}`));
}

check().finally(() => prisma.$disconnect());
