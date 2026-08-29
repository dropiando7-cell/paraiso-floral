import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawPdfItems = [
    // Caja 1
    { caja: 1, bonches: 25, cultivo: "ROSA - Freedom" },
    // Caja 2
    { caja: 2, bonches: 25, cultivo: "ROSA - Freedom" },
    // Caja 3
    { caja: 3, bonches: 21, cultivo: "ROSA - Vendela" },
    { caja: 3, bonches: 4, cultivo: "ROSA - Vendela 40 CMS" },
    // Caja 4
    { caja: 4, bonches: 5, cultivo: "ROSA - Bonita 40 CMS" },
    { caja: 4, bonches: 2, cultivo: "ROSA - Boulevard 40 CMS" },
    { caja: 4, bonches: 1, cultivo: "ROSA - Confidence" },
    { caja: 4, bonches: 3, cultivo: "ROSA - Esperance" },
    { caja: 4, bonches: 2, cultivo: "ROSA - Esperance 40 CMS" },
    { caja: 4, bonches: 2, cultivo: "ROSA - Geraldine" },
    { caja: 4, bonches: 3, cultivo: "ROSA - Geraldine 40 CMS" },
    { caja: 4, bonches: 2, cultivo: "ROSA - Magic Time" },
    { caja: 4, bonches: 1, cultivo: "ROSA - Opala" },
    { caja: 4, bonches: 4, cultivo: "ROSA - Opala 40 CMS" },
    // Caja 5
    { caja: 5, bonches: 2, cultivo: "ROSA - Anjelika" },
    { caja: 5, bonches: 3, cultivo: "ROSA - Anjelika 40 CMS" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Boulevard" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Cool Water 40 CMS" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Deep Purple" },
    { caja: 5, bonches: 4, cultivo: "ROSA - Mohana" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Mohana 40 CMS" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Mondial 40 CMS" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Nautika" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Opala 40 CMS" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Pink Floyd" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Pink Floyd 40 CMS" },
    { caja: 5, bonches: 2, cultivo: "ROSA - Purple Haze" },
    { caja: 5, bonches: 3, cultivo: "ROSA - Quick Sand 40 CMS" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Rosita Vendela 40 CM" },
    { caja: 5, bonches: 1, cultivo: "ROSA - Stunning" },
    // Caja 6
    { caja: 6, bonches: 1, cultivo: "ROSA - Blue Mate 40 CMS" },
    { caja: 6, bonches: 2, cultivo: "ROSA - Boulevard" },
    { caja: 6, bonches: 2, cultivo: "ROSA - Boulevard 40 CMS" },
    { caja: 6, bonches: 1, cultivo: "ROSA - Confidence 40 CMS" },
    { caja: 6, bonches: 1, cultivo: "ROSA - Engagement" },
    { caja: 6, bonches: 1, cultivo: "ROSA - Florida" },
    { caja: 6, bonches: 1, cultivo: "ROSA - Geraldine" },
    { caja: 6, bonches: 2, cultivo: "ROSA - Geraldine 40 CMS" },
    { caja: 6, bonches: 1, cultivo: "ROSA - Malibu" },
    { caja: 6, bonches: 1, cultivo: "ROSA - Mohana 40 CMS" },
    { caja: 6, bonches: 2, cultivo: "ROSA - Purple Haze 40 CMS" },
    { caja: 6, bonches: 2, cultivo: "ROSA - Surtido" },
    { caja: 6, bonches: 8, cultivo: "ROSA - Surtido 40 CMS" },
];

// Custom mapping table from PDF cultivar string (after "ROSA - ") to ActivoFijo ID or QR
const manualMappings: { [key: string]: string } = {
    "Freedom": "000005",         // Freedom
    "Vendela": "000208",         // VENDELA (o 000208)
    "Vendela 40 CMS": "000208",
    "Bonita 40 CMS": "000019",    // Rosa Bonita
    "Boulevard": "000015",       // Rosa Boulevard
    "Boulevard 40 CMS": "000015",
    "Confidence": "000027",      // Rosa Confidence
    "Confidence 40 CMS": "000027",
    "Esperance": "000051",       // Rosa Esperance
    "Esperance 40 CMS": "000051",
    "Geraldine": "000017",       // Rosa Geraldine
    "Geraldine 40 CMS": "000017",
    "Magic Time": "000052",      // Rosa Magic Time
    "Opala": "000016",           // Rosa Opala
    "Opala 40 CMS": "000016",
    "Anjelika": "000021",        // ANGELIKA
    "Anjelika 40 CMS": "000021",
    "Cool Water 40 CMS": "000053", // Rosa Cool Water
    "Deep Purple": "000025",     // Deep Purple
    "Mohana": "000018",          // Rosa Mohana
    "Mohana 40 CMS": "000018",
    "Mondial 40 CMS": "000065",  // Mondial
    "Nautika": "000039",         // Rosa Nautica
    "Pink Floyd": "000013",      // Rosa Pink Floyd
    "Pink Floyd 40 CMS": "000013",
    "Purple Haze": "000022",     // PURPLE HAZE
    "Purple Haze 40 CMS": "000022",
    "Quick Sand 40 CMS": "000029", // Rosa Quick Sand
    "Rosita Vendela 40 CM": "000028", // Rosa Rosita Vendela
    "Stunning": "000043",        // Rosa Stunning
    "Blue Mate 40 CMS": "000206",// BLUE MATE
    "Engagement": "000046",      // Rosa Engagement
    "Florida": "NUEVO",          // No existe, requiere asignación de código nuevo (ej. 000219)
    "Malibu": "000038",          // Rosa Malibu
    "Surtido": "000007",         // SURTIDO
    "Surtido 40 CMS": "000007"
};

async function testFullMatching() {
    const all = await prisma.activoFijo.findMany();
    const qrMap = new Map(all.map(a => [a.idQr, a]));

    console.log("=== Mapeo Completo Lista de Rosas (ENVIO: 19918) ===");

    const totalsPerQr: { [qr: string]: { nombreBD: string; bonches: number } } = {};
    let totalUnmapped = 0;
    let totalBonchesGlobal = 0;

    for (const item of rawPdfItems) {
        const desc = item.cultivo.replace(/^ROSA\s*-\s*/i, '').trim();
        const targetQr = manualMappings[desc];
        totalBonchesGlobal += item.bonches;

        if (targetQr && targetQr !== "NUEVO") {
            const dbItem = qrMap.get(targetQr);
            const nombreBD = dbItem ? dbItem.descripcionCorta : "NOT FOUND";
            if (!totalsPerQr[targetQr]) {
                totalsPerQr[targetQr] = { nombreBD, bonches: 0 };
            }
            totalsPerQr[targetQr].bonches += item.bonches;
        } else {
            console.log(`⚠️ Item sin mapeo exacto o nuevo: "${desc}" (${item.bonches} bonches)`);
            totalUnmapped += item.bonches;
        }
    }

    console.log("\n=== CONSOLIDADO POR CÓDIGO/QR PARA SUBIR A LA BASE DE DATOS ===");
    console.table(Object.entries(totalsPerQr).map(([qr, val]) => ({
        QR: qr,
        NombreBD: val.nombreBD,
        BonchesASubir: val.bonches
    })));

    console.log(`Total Bonches Rosas en Packing List: ${totalBonchesGlobal}`);
    console.log(`Total Bonches Mapeados: ${totalBonchesGlobal - totalUnmapped}`);
    console.log(`Total Bonches Pendientes (Florida): ${totalUnmapped}`);
}

testFullMatching().finally(() => prisma.$disconnect());
