import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = 'a0287245-6cad-4df5-a32a-f214b7b72e04';

async function getOrCreateActivo(descripcion: string, cultivo: string) {
    const descClean = descripcion.trim();
    
    // Buscar si ya existe en la base de datos por descripción
    let activo = await prisma.activoFijo.findFirst({
        where: {
            organizationId: ORG_ID,
            OR: [
                { descripcionCorta: { equals: descClean, mode: 'insensitive' } },
                { descripcionDetallada: { equals: descClean, mode: 'insensitive' } }
            ]
        }
    });

    if (activo) {
        return activo;
    }

    // Obtener siguiente QR correlativo
    const lastActivo = await prisma.activoFijo.findFirst({
        where: { organizationId: ORG_ID },
        orderBy: { idQr: 'desc' }
    });

    let nextNum = 232;
    if (lastActivo && lastActivo.idQr) {
        const parsed = parseInt(lastActivo.idQr, 10);
        if (!isNaN(parsed)) nextNum = Math.max(nextNum, parsed + 1);
    }
    const nextQr = String(nextNum).padStart(6, '0');

    // Crear nuevo activo en catálogo
    activo = await prisma.activoFijo.create({
        data: {
            organizationId: ORG_ID,
            idQr: nextQr,
            descripcionCorta: descClean,
            descripcionDetallada: `${descClean} — Cultivo original: ${cultivo}`,
            area: 'CAMARA-FRIA-1',
            cuentaAct: 'Flores de Corte',
            estatusContable: 'VIGENTE',
            lote: 'IMPORTACION ECUADOR',
            stock: 0,
            tipoEmpaque: 'Cartón',
        }
    });

    console.log(`[CATALOGO] Creado nuevo producto QR ${nextQr}: ${descClean}`);
    return activo;
}

async function main() {
    console.log('Iniciando seed de 7 Packing Lists de Ecuador...');

    const enviosData = [
        {
            numeroEnvio: '5087821',
            proveedor: 'GALAPAGOS FLORES',
            cajas: [
                {
                    numeroCaja: 1,
                    codigoProveedor: 'GALAFLOR-HB1',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - CRYSTAL FLAME 60CM', cultivo: 'CRYSTAL FLAME 60CM', esperados: 4, tallos: 25 },
                        { desc: 'ROSA - KARMA 60CM', cultivo: 'KARMA 60CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - PINK X-PRESSION 50CM', cultivo: 'PINK X-PRESSION 50CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - STARDUST 60CM', cultivo: 'STARDUST 60CM', esperados: 2, tallos: 25 },
                    ]
                }
            ]
        },
        {
            numeroEnvio: '24291',
            proveedor: 'SANTA CLARA GARDENS',
            cajas: [
                {
                    numeroCaja: 1,
                    codigoProveedor: 'SANTA-HB1',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - MANDARIN X-PRESSION 50CM', cultivo: 'MANDARIN X PRESSION 50CM', esperados: 3, tallos: 25 },
                        { desc: 'ROSA - MELON X-PRESSION 50CM', cultivo: 'MELON X PRESSION 50CM', esperados: 3, tallos: 25 },
                        { desc: 'ROSA - COUNTRY BLUES 50CM', cultivo: 'COUNTRY BLUES 50CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - GERALDINE 60CM', cultivo: 'GERALDINE 60CM', esperados: 6, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 2,
                    codigoProveedor: 'SANTA-HB2',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - GERALDINE 60CM', cultivo: 'GERALDINE 60CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - MANDARIN X-PRESSION 60CM', cultivo: 'MANDARIN X PRESSION 60CM', esperados: 4, tallos: 25 },
                        { desc: 'ROSA - STARDUST 60CM', cultivo: 'STARDUST 60CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - SWEET MONDIAL 60CM', cultivo: 'SWEET MONDIAL 60CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - SWEET UNIQUE 60CM', cultivo: 'SWEET UNIQUE 60CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - MANDALA 60CM', cultivo: 'MANDALA 60CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - MANDALA 50CM', cultivo: 'MANDALA 50CM', esperados: 3, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 3,
                    codigoProveedor: 'SANTA-HB3',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - PINK X-PRESSION 60CM', cultivo: 'PINK X PRESSION 60CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - PINK X-PRESSION 50CM', cultivo: 'PINK X PRESSION 50CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - SWEET MEMORY 60CM', cultivo: 'SWEET MEMORY 60CM', esperados: 3, tallos: 25 },
                        { desc: 'ROSA - BE SWEET 70CM', cultivo: 'BE SWEET 70CM', esperados: 3, tallos: 25 },
                        { desc: 'ROSA - FREEDOM 70CM', cultivo: 'FREEDOM 70CM', esperados: 3, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 4,
                    codigoProveedor: 'SANTA-HB4',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - FREEDOM 70CM', cultivo: 'FREEDOM 70CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - MANDARIN X-PRESSION 70CM', cultivo: 'MANDARIN X PRESSION 70CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - MOODY BLUES 70CM', cultivo: 'MOODY BLUES 70CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - MOONSTONE 70CM', cultivo: 'MOONSTONE 70CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - SWEET UNIQUE 70CM', cultivo: 'SWEET UNIQUE 70CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - WHITE CHOCOLATE 70CM', cultivo: 'WHITE CHOCOLATE 70CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - PLAYA BLANCA 60CM', cultivo: 'PLAYA BLANCA 60CM', esperados: 4, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 5,
                    codigoProveedor: 'SANTA-HB5',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - FREEDOM 80CM', cultivo: 'FREEDOM 80CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - WHITE CHOCOLATE 70CM', cultivo: 'WHITE CHOCOLATE 70CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - PASION TURCA 80CM', cultivo: 'PASION TURCA 80CM', esperados: 4, tallos: 25 },
                        { desc: 'ROSA - PASION TURCA 70CM', cultivo: 'PASION TURCA 70CM', esperados: 1, tallos: 25 },
                        { desc: 'ROSA - HERMOSA 60CM', cultivo: 'HERMOSA 60CM', esperados: 2, tallos: 25 },
                        { desc: 'ROSA - HERMOSA 50CM', cultivo: 'HERMOSA 50CM', esperados: 3, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 6,
                    codigoProveedor: 'SANTA-HB6',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - HERMOSA 50CM', cultivo: 'HERMOSA 50CM', esperados: 10, tallos: 25 },
                    ]
                }
            ]
        },
        {
            numeroEnvio: '4',
            proveedor: 'QUALITY FLOWERS',
            cajas: [
                {
                    numeroCaja: 1,
                    codigoProveedor: 'QUALITY-EB1',
                    tipoEmpaque: 'EB',
                    items: [
                        { desc: 'RANUNCULUS - ORANGE 30CM', cultivo: 'RAN - ORANGE 30 CM STA FE', esperados: 2, tallos: 25 },
                        { desc: 'RANUNCULUS - ORANGE 35CM', cultivo: 'RAN - ORANGE 35 CM STA FE', esperados: 2, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 2,
                    codigoProveedor: 'QUALITY-EB2',
                    tipoEmpaque: 'EB',
                    items: [
                        { desc: 'RANUNCULUS - ORANGE 30CM', cultivo: 'RAN - ORANGE 30 CM STA FE', esperados: 2, tallos: 25 },
                        { desc: 'RANUNCULUS - ORANGE 35CM', cultivo: 'RAN - ORANGE 35 CM STA FE', esperados: 2, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 3,
                    codigoProveedor: 'QUALITY-EB3',
                    tipoEmpaque: 'EB',
                    items: [
                        { desc: 'RANUNCULUS - LIGHT PINK 30CM', cultivo: 'RAN - LIGHT PINK 30 CM STA FE', esperados: 2, tallos: 25 },
                        { desc: 'RANUNCULUS - LIGHT PINK 35CM', cultivo: 'RAN - LIGHT PINK 35 CM STA FE', esperados: 2, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 4,
                    codigoProveedor: 'QUALITY-QB1',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'RANUNCULUS - LIGHT PINK 30CM', cultivo: 'RAN - LIGHT PINK 30 CM STA FE', esperados: 2, tallos: 25 },
                        { desc: 'RANUNCULUS - LIGHT PINK 35CM', cultivo: 'RAN - LIGHT PINK 35 CM STA FE', esperados: 2, tallos: 25 },
                        { desc: 'RANUNCULUS - WHITE 35CM', cultivo: 'RAN - WHITE 35 CM STA FE', esperados: 2, tallos: 25 },
                    ]
                },
                {
                    numeroCaja: 5,
                    codigoProveedor: 'QUALITY-QB2',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'DELPHINIUM - CELESTE 60CM', cultivo: 'DELP - CELESTE 60CM', esperados: 3, tallos: 40 },
                    ]
                },
                {
                    numeroCaja: 6,
                    codigoProveedor: 'QUALITY-QB3',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'DELPHINIUM - CELESTE 60CM', cultivo: 'DELP - CELESTE 60CM', esperados: 3, tallos: 40 },
                    ]
                }
            ]
        },
        {
            numeroEnvio: '8472',
            proveedor: 'LUZ OF ROSES',
            cajas: [
                {
                    numeroCaja: 1,
                    codigoProveedor: 'LUZ-HB1',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ROSA - BE SWEET 60CM', cultivo: 'BE SWEET 60CM', esperados: 12, tallos: 25 }
                    ]
                }
            ]
        },
        {
            numeroEnvio: '197132',
            proveedor: 'FLOREQUISA',
            cajas: [
                {
                    numeroCaja: 1,
                    codigoProveedor: 'EQUINO-HB1',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'CRISANTEMO - LAMIRA 70CM', cultivo: 'LAMIRA 70CM', esperados: 5, tallos: 10 },
                        { desc: 'CRISANTEMO - PRISTINE 70CM', cultivo: 'PRISTINE 70CM', esperados: 10, tallos: 10 },
                        { desc: 'CRISANTEMO - ROSSANO ORANGE 70CM', cultivo: 'ROSSANO ORANGE 70CM', esperados: 5, tallos: 10 },
                        { desc: 'VERONICA - SALMON 70CM', cultivo: 'VERONICA SALMON 70CM', esperados: 10, tallos: 10 },
                    ]
                }
            ]
        },
        {
            numeroEnvio: '14417',
            proveedor: 'JYR QUALITY FLOWERS',
            cajas: [
                {
                    numeroCaja: 1,
                    codigoProveedor: 'JYR-QB1',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - PINK 70CM', cultivo: 'MATHIOLA PINK 70CM', esperados: 12, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 2,
                    codigoProveedor: 'JYR-QB2',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - WHITE 70CM', cultivo: 'MATHIOLA WHITE 70CM', esperados: 12, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 3,
                    codigoProveedor: 'JYR-QB3',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - PEACH 70CM', cultivo: 'MATHIOLA PEACH 70CM', esperados: 12, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 4,
                    codigoProveedor: 'JYR-QB4',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - PEACH 70CM', cultivo: 'MATHIOLA PEACH 70CM', esperados: 13, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 5,
                    codigoProveedor: 'JYR-QB5',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - LAVENDER 70CM', cultivo: 'MATHIOLA LAVENDER 70CM', esperados: 10, tallos: 10 },
                        { desc: 'MATHIOLA - PINK 70CM', cultivo: 'MATHIOLA PINK 70CM', esperados: 2, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 6,
                    codigoProveedor: 'JYR-QB6',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - PURPLE 70CM', cultivo: 'MATHIOLA PURPLE 70CM', esperados: 10, tallos: 10 },
                        { desc: 'MATHIOLA - WHITE 70CM', cultivo: 'MATHIOLA WHITE 70CM', esperados: 2, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 7,
                    codigoProveedor: 'JYR-QB7',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - RED RUBY 70CM', cultivo: 'MATHIOLA RED RUBY 70CM', esperados: 10, tallos: 10 },
                        { desc: 'MATHIOLA - WHITE 70CM', cultivo: 'MATHIOLA WHITE 70CM', esperados: 1, tallos: 10 },
                        { desc: 'MATHIOLA - PINK 70CM', cultivo: 'MATHIOLA PINK 70CM', esperados: 1, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 8,
                    codigoProveedor: 'JYR-EB1',
                    tipoEmpaque: 'EB',
                    items: [
                        { desc: 'MOLUCELLA - BELLS OF IRELAND 80CM', cultivo: 'MOLUCELLA BELLS OF IRELAND 80CM', esperados: 5, tallos: 10 }
                    ]
                },
                {
                    numeroCaja: 9,
                    codigoProveedor: 'JYR-QB8',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'MATHIOLA - MIXED COLORS 70CM', cultivo: 'MATHIOLA MIXED 70CM', esperados: 10, tallos: 10 }
                    ]
                }
            ]
        },
        {
            numeroEnvio: '621100',
            proveedor: 'FLORSANI',
            cajas: [
                ...Array.from({ length: 6 }).map((_, i) => ({
                    numeroCaja: i + 1,
                    codigoProveedor: `FLORSANI-HE${i + 1}`,
                    tipoEmpaque: 'HE',
                    items: [
                        { desc: 'GYPSOPHILA - XLENCE 80CM', cultivo: 'Gypsophila Xlence 80CM', esperados: 12, tallos: 25 }
                    ]
                })),
                {
                    numeroCaja: 7,
                    codigoProveedor: 'FLORSANI-QB1',
                    tipoEmpaque: 'QB',
                    items: [
                        { desc: 'GYPSOPHILA - XLENCE 80CM', cultivo: 'Gypsophila Xlence 80CM', esperados: 3, tallos: 25 }
                    ]
                },
                {
                    numeroCaja: 8,
                    codigoProveedor: 'FLORSANI-HB1',
                    tipoEmpaque: 'HB',
                    items: [
                        { desc: 'ERYNGIUM - BLUE LAGOON 70CM', cultivo: 'Eryngium Blue Lagoon 70CM', esperados: 20, tallos: 5 }
                    ]
                },
                {
                    numeroCaja: 9,
                    codigoProveedor: 'FLORSANI-EB1',
                    tipoEmpaque: 'EB',
                    items: [
                        { desc: 'ORNITHOGALUM - WHITE STAR 50CM', cultivo: 'Ornithogalum White Star 50CM', esperados: 10, tallos: 10 }
                    ]
                }
            ]
        }
    ];

    for (const data of enviosData) {
        // Eliminar si ya existia previamente para reinicializar limpiamente
        const existing = await prisma.recepcionLote.findFirst({
            where: { organizationId: ORG_ID, numeroEnvio: data.numeroEnvio }
        });
        if (existing) {
            await prisma.recepcionLote.delete({ where: { id: existing.id } });
            console.log(`[SEED] Eliminado lote previo Envío #${data.numeroEnvio}`);
        }

        const lote = await prisma.recepcionLote.create({
            data: {
                organizationId: ORG_ID,
                numeroEnvio: data.numeroEnvio,
                proveedor: data.proveedor,
                estado: 'EN_TRANSITO',
            }
        });

        console.log(`[SEED] Creado Lote Envío #${data.numeroEnvio} - ${data.proveedor}`);

        for (const cajaData of data.cajas) {
            const caja = await prisma.recepcionCaja.create({
                data: {
                    recepcionId: lote.id,
                    numeroCaja: cajaData.numeroCaja,
                    codigoProveedor: cajaData.codigoProveedor,
                    estado: 'PENDIENTE'
                }
            });

            for (const itemData of cajaData.items) {
                const activo = await getOrCreateActivo(itemData.desc, itemData.cultivo);

                await prisma.recepcionItem.create({
                    data: {
                        cajaId: caja.id,
                        descripcion: itemData.desc,
                        cultivoOriginal: itemData.cultivo,
                        bonchesEsperados: itemData.esperados,
                        bonchesRecibidos: itemData.esperados,
                        tipoEmpaque: cajaData.tipoEmpaque,
                        verificado: false,
                        activoFijoId: activo.id
                    }
                });
            }
        }
    }

    console.log('¡Seed de 7 Packing Lists de Ecuador completado exitosamente!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
