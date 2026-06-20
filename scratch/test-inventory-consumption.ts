import { prisma } from '../src/lib/prisma';
import { 
    getTaskMaterials, 
    searchMaterialsForTask, 
    consumeMaterialForTask, 
    cancelMaterialConsumptionForTask 
} from '../src/app/(dashboard)/kanban/actions';

async function testPrismaLogic() {
    console.log("=== Testing Kanban Inventory Consumption Logic ===");
    const task = await prisma.kanbanTask.findFirst();
    const user = await prisma.user.findFirst();
    if (!task || !user) {
        console.log("No tasks or users found to test.");
        return;
    }
    const activo = await prisma.activoFijo.findFirst({
        where: {
            organizationId: task.organizationId,
            esParaRenta: false,
            stock: { gt: 2 }
        }
    });
    if (!activo) {
        console.log("No inventory item found with stock > 2.");
        return;
    }

    const initialStock = activo.stock;
    console.log(`Initial stock for ${activo.descripcionCorta} at ${activo.area}: ${initialStock}`);

    // Simulate consumption logic
    console.log("Simulating consumption of 1 unit...");
    const result = await prisma.$transaction(async (tx) => {
        // Decrement stock in ActivoFijo
        const updatedActivo = await tx.activoFijo.update({
            where: { id: activo.id },
            data: { stock: { decrement: 1 } }
        });

        // Resolve matching Producto for master sync
        let prodId = activo.productoId;
        if (!prodId && activo.codigoBarras) {
            const matchProd = await tx.producto.findFirst({
                where: { organizationId: task.organizationId, sku: activo.codigoBarras }
            });
            if (matchProd) {
                prodId = matchProd.id;
            }
        }

        if (prodId) {
            await tx.producto.update({
                where: { id: prodId },
                data: { stockActual: { decrement: 1 } }
            });
        }

        // Create KanbanTaskMaterial
        const material = await tx.kanbanTaskMaterial.create({
            data: {
                taskId: task.id,
                activoFijoId: activo.id,
                cantidad: 1,
                area: activo.area,
                creadoPorId: user.id
            }
        });

        // Log Kanban Activity
        await tx.kanbanActivity.create({
            data: {
                spaceId: task.spaceId,
                taskId: task.id,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `[TEST] Descargó de inventario: 1x ${activo.descripcionCorta} de la ubicación "${activo.area}"`
            }
        });

        return { material, updatedActivo };
    });

    console.log(`Updated stock in ActivoFijo: ${result.updatedActivo.stock} (Expected: ${initialStock - 1})`);
    console.log("Material record created:", result.material);

    // Simulate cancellation logic
    console.log("Simulating cancellation of consumption...");
    await prisma.$transaction(async (tx) => {
        await tx.kanbanTaskMaterial.update({
            where: { id: result.material.id },
            data: {
                anuladaPorId: user.id,
                anuladaAt: new Date()
            }
        });

        await tx.activoFijo.update({
            where: { id: activo.id },
            data: { stock: { increment: 1 } }
        });

        let prodId = activo.productoId;
        if (!prodId && activo.codigoBarras) {
            const matchProd = await tx.producto.findFirst({
                where: { organizationId: task.organizationId, sku: activo.codigoBarras }
            });
            if (matchProd) {
                prodId = matchProd.id;
            }
        }

        if (prodId) {
            await tx.producto.update({
                where: { id: prodId },
                data: { stockActual: { increment: 1 } }
            });
        }
    });

    const finalActivo = await prisma.activoFijo.findUnique({ where: { id: activo.id } });
    console.log(`Final stock after cancellation: ${finalActivo?.stock} (Expected: ${initialStock})`);
    
    // Cleanup the test material and test activity records
    await prisma.kanbanTaskMaterial.delete({ where: { id: result.material.id } });
    await prisma.kanbanActivity.deleteMany({
        where: {
            taskId: task.id,
            detalles: { startsWith: '[TEST]' }
        }
    });
    console.log("Test execution successfully validated and cleaned up!");
}

testPrismaLogic()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
