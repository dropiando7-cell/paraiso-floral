import { prisma } from '../src/lib/prisma';

async function uppercaseAllClients() {
    console.log('Converting all client names to UPPERCASE in DB...');
    const clientes = await prisma.cliente.findMany();
    let updatedCount = 0;
    for (const c of clientes) {
        const upperNombre = c.nombre.toUpperCase();
        const upperContacto = c.nombreContacto ? c.nombreContacto.toUpperCase() : null;

        if (c.nombre !== upperNombre || c.nombreContacto !== upperContacto) {
            await prisma.cliente.update({
                where: { id: c.id },
                data: {
                    nombre: upperNombre,
                    nombreContacto: upperContacto
                }
            });
            updatedCount++;
            console.log(`Updated client: ${c.nombre} -> ${upperNombre}`);
        }
    }
    console.log(`Successfully updated ${updatedCount} clients to UPPERCASE.`);
}

uppercaseAllClients().catch(console.error).finally(() => prisma.$disconnect());
