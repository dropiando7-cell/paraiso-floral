import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Raw list extracted from Page 1 of PACKIN LIST LUCIO SPS 28.08.26.pdf
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

async function main() {
    console.log("=== ANÁLISIS DE EXTRACCIÓN Y MATCHING CON BD ===");
    
    // Total de bonches de rosas en PDF:
    const totalBonchesRosa = rawPdfItems.reduce((sum, item) => sum + item.bonches, 0);
    console.log(`Total items de rosa en lista: ${rawPdfItems.length}`);
    console.log(`Total bonches de rosas en PDF: ${totalBonchesRosa}`);

    // Extraer limpia la descripción quitando "ROSA - " y " 40 CMS" / " 40 CM" si aplica o agrupando.
    // Vamos a ver qué activos tenemos en la BD
    const todosActivos = await prisma.activoFijo.findMany();

    console.log("\n--- DETALLE ITEM POR ITEM CON SU CORRESPONDIENTE EN BD ---");

    const agrupadosPorCultivoExtradido: { [key: string]: number } = {};
    const agrupadosNormalizado: { [key: string]: number } = {};

    for (const item of rawPdfItems) {
        // Quitar "ROSA - "
        const desc = item.cultivo.replace(/^ROSA\s*-\s*/i, '').trim();
        agrupadosPorCultivoExtradido[desc] = (agrupadosPorCultivoExtradido[desc] || 0) + item.bonches;

        // Normalizar variedad (ej. "Geraldine 40 CMS" -> "Geraldine")
        const variedadSinLongitud = desc.replace(/\s*\d+\s*CMS?$/i, '').trim();
        agrupadosNormalizado[variedadSinLongitud] = (agrupadosNormalizado[variedadSinLongitud] || 0) + item.bonches;
    }

    console.log("\n=== RESUMEN POR DESCRIPCIÓN EXTRAÍDA DEL PDF (Tal cual) ===");
    console.table(Object.entries(agrupadosPorCultivoExtradido).map(([desc, cant]) => ({ Descripcion: desc, Bonches: cant })));

    console.log("\n=== RESUMEN NORMALIZADO (Sin sufijo 40 CMS) ===");
    console.table(Object.entries(agrupadosNormalizado).map(([variedad, cant]) => ({ Variedad: variedad, TotalBonches: cant })));

    console.log("\n=== COINCIDENCIAS CON LA BASE DE DATOS (ActivoFijo) ===");
    for (const [variedad, totalBonches] of Object.entries(agrupadosNormalizado)) {
        // Buscar en ActivoFijo
        const matches = todosActivos.filter(a => 
            a.descripcionCorta.toLowerCase().includes(variedad.toLowerCase()) ||
            variedad.toLowerCase().includes(a.descripcionCorta.toLowerCase().replace("rosa ", ""))
        );
        if (matches.length > 0) {
            console.log(`✅ '${variedad}' (${totalBonches} bonches) -> Matcheado con BD:`);
            matches.forEach(m => console.log(`   └─ Code/QR: ${m.idQr} | CodBarras: ${m.codigoBarras} | Nombre BD: "${m.descripcionCorta}" | Stock Actual: ${m.stock}`));
        } else {
            console.log(`⚠️ '${variedad}' (${totalBonches} bonches) -> NO ENCONTRADO EXACTO EN BD`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
