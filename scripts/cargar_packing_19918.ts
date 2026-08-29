import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = "a0287245-6cad-4df5-a32a-f214b7b72e04";

const packingListData = {
    numeroEnvio: "19918",
    proveedor: "LUCIO NAHUN BARAHONA SUAREZ SPS",
    cajas: [
        {
            numeroCaja: 1,
            codigoProveedor: "119764",
            items: [
                { cultivoOriginal: "ROSA - Freedom", descripcion: "Freedom", bonches: 25, qr: "000005" }
            ]
        },
        {
            numeroCaja: 2,
            codigoProveedor: "119765",
            items: [
                { cultivoOriginal: "ROSA - Freedom", descripcion: "Freedom", bonches: 25, qr: "000005" }
            ]
        },
        {
            numeroCaja: 3,
            codigoProveedor: "119962",
            items: [
                { cultivoOriginal: "ROSA - Vendela", descripcion: "Vendela", bonches: 21, qr: "000208" },
                { cultivoOriginal: "ROSA - Vendela 40 CMS", descripcion: "Vendela 40 CMS", bonches: 4, qr: "000208" }
            ]
        },
        {
            numeroCaja: 4,
            codigoProveedor: "119965",
            items: [
                { cultivoOriginal: "ROSA - Bonita 40 CMS", descripcion: "Rosa Bonita", bonches: 5, qr: "000019" },
                { cultivoOriginal: "ROSA - Boulevard 40 CMS", descripcion: "Rosa Boulevard", bonches: 2, qr: "000015" },
                { cultivoOriginal: "ROSA - Confidence", descripcion: "Rosa Confidence", bonches: 1, qr: "000027" },
                { cultivoOriginal: "ROSA - Esperance", descripcion: "Rosa Esperance", bonches: 3, qr: "000051" },
                { cultivoOriginal: "ROSA - Esperance 40 CMS", descripcion: "Rosa Esperance", bonches: 2, qr: "000051" },
                { cultivoOriginal: "ROSA - Geraldine", descripcion: "Rosa Geraldine", bonches: 2, qr: "000017" },
                { cultivoOriginal: "ROSA - Geraldine 40 CMS", descripcion: "Rosa Geraldine", bonches: 3, qr: "000017" },
                { cultivoOriginal: "ROSA - Magic Time", descripcion: "Rosa Magic Time", bonches: 2, qr: "000052" },
                { cultivoOriginal: "ROSA - Opala", descripcion: "Rosa Opala", bonches: 1, qr: "000016" },
                { cultivoOriginal: "ROSA - Opala 40 CMS", descripcion: "Rosa Opala", bonches: 4, qr: "000016" }
            ]
        },
        {
            numeroCaja: 5,
            codigoProveedor: "119966",
            items: [
                { cultivoOriginal: "ROSA - Anjelika", descripcion: "ANGELIKA", bonches: 2, qr: "000021" },
                { cultivoOriginal: "ROSA - Anjelika 40 CMS", descripcion: "ANGELIKA", bonches: 3, qr: "000021" },
                { cultivoOriginal: "ROSA - Boulevard", descripcion: "Rosa Boulevard", bonches: 1, qr: "000015" },
                { cultivoOriginal: "ROSA - Cool Water 40 CMS", descripcion: "Rosa Cool Water", bonches: 1, qr: "000053" },
                { cultivoOriginal: "ROSA - Deep Purple", descripcion: "Deep Purple", bonches: 1, qr: "000025" },
                { cultivoOriginal: "ROSA - Mohana", descripcion: "Rosa Mohana", bonches: 4, qr: "000018" },
                { cultivoOriginal: "ROSA - Mohana 40 CMS", descripcion: "Rosa Mohana", bonches: 1, qr: "000018" },
                { cultivoOriginal: "ROSA - Mondial 40 CMS", descripcion: "Mondial", bonches: 1, qr: "000065" },
                { cultivoOriginal: "ROSA - Nautika", descripcion: "Rosa Nautica", bonches: 1, qr: "000039" },
                { cultivoOriginal: "ROSA - Opala 40 CMS", descripcion: "Rosa Opala", bonches: 1, qr: "000016" },
                { cultivoOriginal: "ROSA - Pink Floyd", descripcion: "Rosa Pink Floyd", bonches: 1, qr: "000013" },
                { cultivoOriginal: "ROSA - Pink Floyd 40 CMS", descripcion: "Rosa Pink Floyd", bonches: 1, qr: "000013" },
                { cultivoOriginal: "ROSA - Purple Haze", descripcion: "PURPLE HAZE", bonches: 2, qr: "000022" },
                { cultivoOriginal: "ROSA - Quick Sand 40 CMS", descripcion: "Rosa Quick Sand", bonches: 3, qr: "000029" },
                { cultivoOriginal: "ROSA - Rosita Vendela 40 CM", descripcion: "Rosa Rosita Vendela", bonches: 1, qr: "000028" },
                { cultivoOriginal: "ROSA - Stunning", descripcion: "Rosa Stunning", bonches: 1, qr: "000043" }
            ]
        },
        {
            numeroCaja: 6,
            codigoProveedor: "119967",
            items: [
                { cultivoOriginal: "ROSA - Blue Mate 40 CMS", descripcion: "BLUE MATE", bonches: 1, qr: "000206" },
                { cultivoOriginal: "ROSA - Boulevard", descripcion: "Rosa Boulevard", bonches: 2, qr: "000015" },
                { cultivoOriginal: "ROSA - Boulevard 40 CMS", descripcion: "Rosa Boulevard", bonches: 2, qr: "000015" },
                { cultivoOriginal: "ROSA - Confidence 40 CMS", descripcion: "Rosa Confidence", bonches: 1, qr: "000027" },
                { cultivoOriginal: "ROSA - Engagement", descripcion: "Rosa Engagement", bonches: 1, qr: "000046" },
                { cultivoOriginal: "ROSA - Florida", descripcion: "Rosa Florida", bonches: 1, qr: "000219" },
                { cultivoOriginal: "ROSA - Geraldine", descripcion: "Rosa Geraldine", bonches: 1, qr: "000017" },
                { cultivoOriginal: "ROSA - Geraldine 40 CMS", descripcion: "Rosa Geraldine", bonches: 2, qr: "000017" },
                { cultivoOriginal: "ROSA - Malibu", descripcion: "Rosa Malibu", bonches: 1, qr: "000038" },
                { cultivoOriginal: "ROSA - Mohana 40 CMS", descripcion: "Rosa Mohana", bonches: 1, qr: "000018" },
                { cultivoOriginal: "ROSA - Purple Haze 40 CMS", descripcion: "PURPLE HAZE", bonches: 2, qr: "000022" },
                { cultivoOriginal: "ROSA - Surtido", descripcion: "SURTIDO", bonches: 2, qr: "000007" },
                { cultivoOriginal: "ROSA - Surtido 40 CMS", descripcion: "SURTIDO", bonches: 8, qr: "000007" }
            ]
        },
        {
            numeroCaja: 7,
            codigoProveedor: "119968",
            items: [
                { cultivoOriginal: "DUSTY MILLER - DUSTIN M", descripcion: "Dustin", bonches: 5, qr: "000200" },
                { cultivoOriginal: "HORTENSIA - COLORES", descripcion: "Hortensia e. Colores", bonches: 8, qr: "000104" },
                { cultivoOriginal: "LIMONIUM - Rosado", descripcion: "Limonium Rosado", bonches: 5, qr: "000085" }
            ]
        }
    ]
};

async function cargarLote() {
    console.log("🚀 Iniciando creación de Lote de Recepción 19918...");

    // 1. Verificar o crear Rosa Florida (QR 000219)
    let rosaFlorida = await prisma.activoFijo.findFirst({
        where: { organizationId: ORG_ID, idQr: "000219" }
    });

    if (!rosaFlorida) {
        console.log("➕ Creando nuevo ActivoFijo: 000219 - Rosa Florida...");
        rosaFlorida = await prisma.activoFijo.create({
            data: {
                organizationId: ORG_ID,
                idQr: "000219",
                codigoBarras: "PF-000219",
                descripcionCorta: "Rosa Florida",
                area: "BODEGA",
                cuentaAct: "INVENTARIO",
                stock: 0,
                lote: "19918",
                tipoEmpaque: "Cartón"
            }
        });
    }

    // 2. Cargar todos los activos fijos para mapear por idQr
    const todosActivos = await prisma.activoFijo.findMany({
        where: { organizationId: ORG_ID }
    });
    const qrToActivoMap = new Map(todosActivos.map(a => [a.idQr, a]));
    qrToActivoMap.set("000219", rosaFlorida);

    // 3. Eliminar si ya existe un lote previo con este número (Idempotencia)
    const loteExistente = await prisma.recepcionLote.findFirst({
        where: { organizationId: ORG_ID, numeroEnvio: packingListData.numeroEnvio }
    });

    if (loteExistente) {
        console.log("⚠️ Eliminando lote previo 19918 para recargar limpio...");
        await prisma.recepcionLote.delete({ where: { id: loteExistente.id } });
    }

    // Calcular total de bonches
    let totalBonches = 0;
    packingListData.cajas.forEach(c => {
        c.items.forEach(i => totalBonches += i.bonches);
    });

    // 4. Crear RecepcionLote con sus Cajas e Items
    console.log(`📦 Creando Recepción de Lote 19918 con ${packingListData.cajas.length} cajas y ${totalBonches} bonches...`);
    
    const nuevoLote = await prisma.recepcionLote.create({
        data: {
            organizationId: ORG_ID,
            numeroEnvio: packingListData.numeroEnvio,
            proveedor: packingListData.proveedor,
            estado: "EN_TRANSITO",
            totalCajas: packingListData.cajas.length,
            totalBonches: totalBonches,
            cajas: {
                create: packingListData.cajas.map(caja => ({
                    numeroCaja: caja.numeroCaja,
                    codigoProveedor: caja.codigoProveedor,
                    estado: "PENDIENTE",
                    items: {
                        create: caja.items.map(item => {
                            const activo = qrToActivoMap.get(item.qr);
                            return {
                                cultivoOriginal: item.cultivoOriginal,
                                descripcion: item.descripcion,
                                bonchesEsperados: item.bonches,
                                bonchesRecibidos: 0,
                                tipoEmpaque: "Cartón",
                                verificado: false,
                                activoFijoId: activo ? activo.id : null
                            };
                        })
                    }
                }))
            }
        },
        include: {
            cajas: {
                include: {
                    items: true
                }
            }
        }
    });

    console.log("✅ Lote de Recepción guardado exitosamente!");
    console.log(`ID Lote: ${nuevoLote.id}`);
    console.log(`Estado: ${nuevoLote.estado}`);
    console.log(`Cajas creadas: ${nuevoLote.cajas.length}`);
}

cargarLote()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
