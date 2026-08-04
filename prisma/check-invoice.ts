import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== BUSCANDO TAREA KANBAN ODT-35 ===");
    const kTasks = await prisma.kanbanTask.findMany({
        where: {
            OR: [
                { codigo: { contains: 'ODT-35', mode: 'insensitive' } },
                { title: { contains: '16EA95D6', mode: 'insensitive' } }
            ]
        },
        include: {
            ordenTrabajo: {
                include: {
                    cliente: true
                }
            }
        }
    });
    console.log("KanbanTasks found:", JSON.stringify(kTasks, null, 2));

    console.log("\n=== BUSCANDO ORDEN TRABAJO DIRECTA ===");
    const ots = await prisma.ordenTrabajo.findMany({
        where: {
            OR: [
                { codigoSeguridad: { contains: '16EA95D6', mode: 'insensitive' } },
                { equipoDano: { contains: '16EA95D6', mode: 'insensitive' } },
                { marcaModelo: { contains: '16EA95D6', mode: 'insensitive' } }
            ]
        },
        include: {
            cliente: true
        }
    });
    console.log("OrdenesTrabajo direct found:", JSON.stringify(ots, null, 2));
}

main().finally(() => prisma.$disconnect());
