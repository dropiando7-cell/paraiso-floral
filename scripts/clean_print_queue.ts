import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Limpiando la Cola de Impresión en Base de Datos...');

    try {
        const deleted = await prisma.colaImpresion.deleteMany({
            where: {
                estado: 'PENDIENTE'
            }
        });

        console.log(`✅ ¡Éxito! Se han eliminado ${deleted.count} trabajos de impresión atascados.`);
    } catch (error) {
        console.error('❌ Error limpiando la cola:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
