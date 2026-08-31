import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = 'a0287245-6cad-4df5-a32a-f214b7b72e04'; // Paraíso Floral

async function main() {
    console.log('--- INICIANDO SEED DE PACKING LIST ECUADOR PREMIUM CON AUTO-CREACIÓN DE CATÁLOGO ---');

    // 1. Obtener catálogo actual de activos
    let activos = await prisma.activoFijo.findMany({
        where: { organizationId: ORG_ID },
        select: { id: true, idQr: true, descripcionCorta: true, marca: true }
    });

    console.log(`Cargados ${activos.length} activos del catálogo.`);

    // Obtener el mayor QR numérico para continuar la secuencia
    const qrNumbers = activos.map(a => parseInt(a.idQr, 10)).filter(n => !isNaN(n));
    let nextQr = qrNumbers.length > 0 ? Math.max(...qrNumbers) + 1 : 220;

    // Helper para formatear QR con ceros a la izquierda (6 dígitos)
    function formatQr(num: number): string {
        return num.toString().padStart(6, '0');
    }

    // Estructura detallada del lote (14 cajas)
    const cajasData = [
        {
            numeroCaja: 1,
            codigoProveedor: 'AGROGANA-EB1',
            farmName: 'AGROGANA',
            items: [
                { descripcion: 'SF - CAMPANULA LILA', cultivo: 'SF - CAMPANULA LILA', bonches: 5 },
                { descripcion: 'SF - CAMPANULLA WHITE', cultivo: 'SF - CAMPANULLA WHITE', bonches: 5 }
            ]
        },
        {
            numeroCaja: 2,
            codigoProveedor: 'FV-QB1',
            farmName: 'FLOWER VILLAGE',
            items: [
                { descripcion: 'HYD - HYD. MAGICAL CHARM', cultivo: 'HYD - MAGICAL CHARM', bonches: 24 }
            ]
        },
        {
            numeroCaja: 3,
            codigoProveedor: 'FV-QB2',
            farmName: 'FLOWER VILLAGE',
            items: [
                { descripcion: 'HYD - HYD. MAGICAL TENDER', cultivo: 'HYD - MAGICAL TENDER', bonches: 26 }
            ]
        },
        {
            numeroCaja: 4,
            codigoProveedor: 'LF-QB1',
            farmName: 'LIFE FLOWERS CIA',
            items: [
                { descripcion: 'ROSA - LEMONADE (Grade 50)', cultivo: 'ROSA - LEMONADE', bonches: 2 },
                { descripcion: 'ROSA - LEMONADE (Grade 60)', cultivo: 'ROSA - LEMONADE', bonches: 1 },
                { descripcion: 'ROSA - LEMONADE (Grade 70)', cultivo: 'ROSA - LEMONADE', bonches: 1 }
            ]
        },
        {
            numeroCaja: 5,
            codigoProveedor: 'MAGNIFICA-QB1',
            farmName: 'MAGNIFICA',
            items: [
                { descripcion: 'CHR - ROSSETA (Grade 70)', cultivo: 'CHR - ROSSETA', bonches: 7 }
            ]
        },
        {
            numeroCaja: 6,
            codigoProveedor: 'MAGNIFICA-QB2',
            farmName: 'MAGNIFICA',
            items: [
                { descripcion: 'CHR - ROSSETA (Grade 70)', cultivo: 'CHR - ROSSETA', bonches: 8 }
            ]
        },
        {
            numeroCaja: 7,
            codigoProveedor: 'MAGNIFICA-QB3',
            farmName: 'MAGNIFICA',
            items: [
                { descripcion: 'CHR - LINETTE (Grade 70)', cultivo: 'CHR - LINETTE', bonches: 7 }
            ]
        },
        {
            numeroCaja: 8,
            codigoProveedor: 'MAGNIFICA-QB4',
            farmName: 'MAGNIFICA',
            items: [
                { descripcion: 'CHR - LINETTE (Grade 70)', cultivo: 'CHR - LINETTE', bonches: 8 }
            ]
        },
        {
            numeroCaja: 9,
            codigoProveedor: 'MAGNIFICA-QB5',
            farmName: 'MAGNIFICA',
            items: [
                { descripcion: 'CHR - MAGNUM WHITE (Grade 70)', cultivo: 'CHR - MAGNUM WHITE', bonches: 7 }
            ]
        },
        {
            numeroCaja: 10,
            codigoProveedor: 'MAGNIFICA-QB6',
            farmName: 'MAGNIFICA',
            items: [
                { descripcion: 'CHR - MAGNUM WHITE (Grade 70)', cultivo: 'CHR - MAGNUM WHITE', bonches: 8 }
            ]
        },
        {
            numeroCaja: 11,
            codigoProveedor: 'NR-QB1',
            farmName: 'NATURE ROSES',
            items: [
                { descripcion: 'GR - ANTONIA (Grade 40)', cultivo: 'GR - ANTONIA', bonches: 2 },
                { descripcion: 'GR - ANTONIA (Grade 50)', cultivo: 'GR - ANTONIA', bonches: 2 }
            ]
        },
        {
            numeroCaja: 12,
            codigoProveedor: 'VF-QB1',
            farmName: 'VALLEFLOR',
            items: [
                { descripcion: 'SF - CALLA LILIES WHITE (Grade 50)', cultivo: 'SF - CALLA LILIES WHITE', bonches: 1 },
                { descripcion: 'SF - CALLA LILIES WHITE (Grade 35)', cultivo: 'SF - CALLA LILIES WHITE', bonches: 9 }
            ]
        },
        {
            numeroCaja: 13,
            codigoProveedor: 'VF-QB2',
            farmName: 'VALLEFLOR',
            items: [
                { descripcion: 'SF - CALLAS BLACK (Grade 40)', cultivo: 'SF - CALLAS BLACK', bonches: 2 },
                { descripcion: 'SF - CALLAS BLACK (Grade 45)', cultivo: 'SF - CALLAS BLACK', bonches: 8 }
            ]
        },
        {
            numeroCaja: 14,
            codigoProveedor: 'VF-QB3',
            farmName: 'VALLEFLOR',
            items: [
                { descripcion: 'SF - CALLAS LIGHT PINK (Grade 30)', cultivo: 'SF - CALLAS LIGHT PINK', bonches: 3 },
                { descripcion: 'SF - CALLAS LIGHT PINK (Grade 35)', cultivo: 'SF - CALLAS LIGHT PINK', bonches: 7 }
            ]
        }
    ];

    // Helper para limpiar el nombre (quitar el grado de la descripción)
    function cleanFlowerName(desc: string): string {
        // Ej. "ROSA - LEMONADE (Grade 50)" -> "ROSA - LEMONADE"
        return desc.replace(/\s*\(Grade\s+\d+\)/i, '').trim();
    }

    // 2. Crear lote
    const loteData = {
        organizationId: ORG_ID,
        numeroEnvio: '123419',
        proveedor: 'ECUADOR PREMIUM',
        estado: 'EN_TRANSITO',
        totalCajas: 14,
        totalBonches: 143,
        fechaLlegada: new Date(),
        notas: 'Packing list importado automáticamente del pedido de Ecuador. Factura/Invoice 123419.'
    };

    const loteExistente = await prisma.recepcionLote.findFirst({
        where: { organizationId: ORG_ID, numeroEnvio: loteData.numeroEnvio }
    });

    if (loteExistente) {
        console.log(`El lote con envío #${loteData.numeroEnvio} ya existe. Eliminándolo para recargar de forma limpia.`);
        await prisma.recepcionLote.delete({ where: { id: loteExistente.id } });
    }

    const nuevoLote = await prisma.recepcionLote.create({
        data: loteData
    });
    console.log(`Lote creado con ID: ${nuevoLote.id} (Envío #${nuevoLote.numeroEnvio})`);

    // 3. Crear cajas e items, y auto-crear catálogo si no existe
    for (const c of cajasData) {
        const nuevaCaja = await prisma.recepcionCaja.create({
            data: {
                recepcionId: nuevoLote.id,
                numeroCaja: c.numeroCaja,
                codigoProveedor: c.codigoProveedor,
                estado: 'PENDIENTE'
            }
        });
        console.log(`  -> Caja #${nuevaCaja.numeroCaja} creada con Folio: ${nuevaCaja.codigoProveedor}`);

        for (const item of c.items) {
            const cleanName = cleanFlowerName(item.descripcion);
            
            // Buscar si ya existe en catálogo
            let match = activos.find(a => a.descripcionCorta.toLowerCase() === cleanName.toLowerCase());
            
            if (!match) {
                // Si no existe, crear el registro en ActivoFijo
                const nextQrStr = formatQr(nextQr++);
                
                // Intentar asociar con un Producto en base al nombre
                // Buscamos un producto o lo creamos si aplica. Si no se puede, se crea el ActivoFijo con productoId = null
                const cleanNameSku = `PF-${nextQrStr}`;
                
                const nuevoActivo = await prisma.activoFijo.create({
                    data: {
                        organizationId: ORG_ID,
                        idQr: nextQrStr,
                        descripcionCorta: cleanName,
                        descripcionDetallada: `${cleanName} — Registrado automáticamente desde Packing List de Ecuador.`,
                        area: 'CAMARA-FRIA-1',
                        cuentaAct: 'Flores de Corte',
                        estatusContable: 'VIGENTE',
                        marca: c.farmName,
                        stock: 0, // Stock inicial 0, en tránsito
                        esConsumible: true,
                        tipoEmpaque: 'Cartón',
                        codigoBarras: cleanNameSku
                    }
                });

                console.log(`     [CATÁLOGO] Creado nuevo producto en catálogo: "${cleanName}" -> QR: ${nextQrStr}`);
                
                // Actualizar lista en memoria
                match = {
                    id: nuevoActivo.id,
                    idQr: nuevoActivo.idQr,
                    descripcionCorta: nuevoActivo.descripcionCorta,
                    marca: nuevoActivo.marca
                };
                activos.push(match);
            } else {
                console.log(`     [CATÁLOGO] Item encontrado: "${cleanName}" -> QR: ${match.idQr}`);
            }

            // Crear el item de la recepción
            await prisma.recepcionItem.create({
                data: {
                    cajaId: nuevaCaja.id,
                    activoFijoId: match.id,
                    cultivoOriginal: item.cultivo,
                    descripcion: item.descripcion,
                    bonchesEsperados: item.bonches,
                    bonchesRecibidos: 0,
                    verificado: false,
                    tipoEmpaque: 'Cartón'
                }
            });
        }
    }

    console.log('--- PACKING LIST REGISTRADO CON ÉXITO ---');
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
