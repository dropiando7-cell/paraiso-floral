import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseWarrantyMonths(garantiaStr: string | null | undefined): number | null {
    if (!garantiaStr) return null;
    const clean = garantiaStr.toLowerCase().trim();
    if (clean.includes('año') || clean.includes('ano')) {
        const matches = clean.match(/\d+/);
        if (matches) return parseInt(matches[0]) * 12;
    }
    if (clean.includes('mes')) {
        const matches = clean.match(/\d+/);
        if (matches) return parseInt(matches[0]);
    }
    if (clean.includes('dia') || clean.includes('día')) {
        const matches = clean.match(/\d+/);
        if (matches) return Math.ceil(parseInt(matches[0]) / 30);
    }
    const numeric = parseInt(clean);
    if (!isNaN(numeric)) return numeric;
    return null;
}

async function main() {
    console.log('Iniciando sincronización de mantenimientos y garantías existentes...');

    // Buscar todas las órdenes de entrega que aplican mantenimientos
    const ordenes = await prisma.ordenEntrega.findMany({
        where: { aplicaMantenimientos: true },
        include: {
            factura: {
                include: {
                    cliente: true,
                    detalles: {
                        where: {
                            activoId: { not: null }
                        },
                        include: {
                            activo: true
                        }
                    }
                }
            }
        }
    });

    console.log(`Encontradas ${ordenes.length} órdenes de entrega que aplican mantenimientos.`);

    let equiposCreados = 0;
    let mantenimientosProgramados = 0;

    for (const orden of ordenes) {
        if (!orden.factura) {
            console.log(`⚠️ Orden ${orden.correlativo} no tiene factura enlazada.`);
            continue;
        }

        const clienteId = orden.factura.clienteId;
        const facturaId = orden.facturaId;
        const orgId = orden.organizationId;
        const fechaVenta = orden.factura.fechaEmision;

        for (const detalle of orden.factura.detalles) {
            if (!detalle.activoId || !detalle.activo) continue;

            const activo = detalle.activo;

            // Verificar si el equipo ya fue creado
            let equipoCliente = await prisma.equipoCliente.findUnique({
                where: { activoFijoId: detalle.activoId }
            });

            if (!equipoCliente) {
                // Calcular fecha de vencimiento de la garantía
                let fechaVencimientoGarantia: Date | null = null;
                let garantiaMeses: number | null = null;

                const meses = parseWarrantyMonths(activo.garantia);
                if (meses) {
                    garantiaMeses = meses;
                    const fechaBase = fechaVenta ? new Date(fechaVenta) : new Date();
                    fechaVencimientoGarantia = new Date(fechaBase);
                    fechaVencimientoGarantia.setMonth(fechaVencimientoGarantia.getMonth() + meses);
                }

                // Crear el equipo del cliente
                equipoCliente = await prisma.equipoCliente.create({
                    data: {
                        organizationId: orgId,
                        clienteId,
                        activoFijoId: detalle.activoId,
                        facturaId,
                        nombre: activo.descripcionCorta,
                        marca: activo.marca,
                        modelo: activo.modelo,
                        serie: activo.serie,
                        codigoEtiqueta: activo.idQr, // ID QR como código de etiqueta
                        fechaInstalacion: fechaVenta,
                        garantiaMeses,
                        fechaVencimientoGarantia,
                        mantenimientosGratisTotales: activo.mantenimientosIncluidos || 5,
                        mantenimientosGratisRealizados: 0
                    }
                });
                equiposCreados++;
                console.log(`✅ Creado EquipoCliente: ${equipoCliente.nombre} (Serie: ${equipoCliente.serie}, Cliente: ${orden.factura.cliente.nombre})`);
            }

            // Generar mantenimientos programados de garantía si no existen ninguno
            const countMantenimientos = await prisma.mantenimiento.count({
                where: { equipoClienteId: equipoCliente.id }
            });

            if (countMantenimientos === 0) {
                const mantenimientosIncluidos = activo.mantenimientosIncluidos || 5;
                const frecuenciaMeses = activo.frecuenciaMantenimientoMeses || 3;
                const baseDate = fechaVenta ? new Date(fechaVenta) : new Date();

                for (let i = 1; i <= mantenimientosIncluidos; i++) {
                    const scheduledDate = new Date(baseDate);
                    scheduledDate.setMonth(scheduledDate.getMonth() + (i * frecuenciaMeses));

                    await prisma.mantenimiento.create({
                        data: {
                            organizationId: orgId,
                            equipoClienteId: equipoCliente.id,
                            fechaProgramada: scheduledDate,
                            tipo: "GARANTIA",
                            estado: "PROGRAMADO",
                            esGratis: true,
                            notas: `Mantenimiento gratuito #${i} de garantía`
                        }
                    });
                    mantenimientosProgramados++;
                }
                console.log(`   🗓️ Programados ${mantenimientosIncluidos} mantenimientos para el equipo: ${equipoCliente.nombre}`);
            }
        }
    }

    console.log(`Sincronización finalizada exitosamente.`);
    console.log(`Resumen: ${equiposCreados} equipos creados, ${mantenimientosProgramados} mantenimientos programados.`);
}

main()
    .catch((e) => {
        console.error('Error running sync script:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
