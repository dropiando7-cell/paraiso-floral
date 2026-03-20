import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando Purga de Odoo al Histórico ---');
    
    // 1. Fetch all Odoo records from ActivoFijo
    const odooRecords = await prisma.activoFijo.findMany({
        where: {
            idQr: {
                startsWith: 'ODOO-'
            }
        }
    });

    console.log(`Se encontraron ${odooRecords.length} registros de Odoo para migrar al histórico.`);
    if (odooRecords.length === 0) {
        console.log('No hay registros por migrar.');
        process.exit(0);
    }

    let successCount = 0;
    let failedCount = 0;

    // 2. Loop through and map to InventarioHistorico
    for (const activo of odooRecords) {
        try {
            await prisma.$transaction(async (tx) => {
                // Insert into Historico
                await tx.inventarioHistorico.create({
                    data: {
                        organizationId: activo.organizationId,
                        cantidad: activo.stock > 0 ? activo.stock : 1,
                        nombrePropiedad: activo.descripcionCorta || 'Registro Odoo Sin Nombre',
                        serie: activo.serie,
                        fechaAdquisicion: activo.fechaAdq,
                        costoAdquisicion: activo.costoAdq,
                        cuentaContable: activo.cuentaAct,
                        vidaUtil: activo.vidaUtilOverride ? Number(activo.vidaUtilOverride) : null,
                        descripcionCorta: activo.descripcionCorta,
                        marca: activo.marca,
                        modelo: activo.modelo,
                        observaciones: `Migrado de Odoo ${activo.idQr}. ${activo.observaciones || ''}`,
                    }
                });

                // Delete from official ActivoFijo
                await tx.activoFijo.delete({
                    where: { id: activo.id }
                });
            });
            successCount++;
            if (successCount % 100 === 0) {
                console.log(`Progreso: ${successCount} / ${odooRecords.length}`);
            }
        } catch (error) {
            console.error(`Error al migrar activo ${activo.idQr}:`, error);
            failedCount++;
        }
    }

    console.log('--- Resumen de Purga de Odoo ---');
    console.log(`Movidos exitosamente: ${successCount}`);
    console.log(`Errores: ${failedCount}`);
    console.log('--------------------------------');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
