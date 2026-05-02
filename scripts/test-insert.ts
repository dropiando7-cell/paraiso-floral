import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organización no encontrada');

    let clienteRecord = await prisma.cliente.findFirst({
        where: { nombre: 'Test Cliente', organizationId: org.id }
    });

    if (!clienteRecord) {
        clienteRecord = await prisma.cliente.create({
            data: {
                nombre: 'Test Cliente',
                telefono: '12345678',
                organizationId: org.id
            }
        });
    }

    const orden = await prisma.ordenTrabajo.create({
        data: {
            organizationId: org.id,
            clienteId: clienteRecord.id,
            equipoDano: 'Equipo Médico',
            tipoAparato: 'MEDICO',
            marcaModelo: 'Test',
            serie: '123',
            descripcionFalla: 'Test falla',
            codigoSeguridad: 'AABB',
            fotosEstadoInicial: [],
            costoRevision: 650,
            estado: 'RECIBIDO',
            usuarioRecepcionId: null
        }
    });

    console.log('Success:', orden.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
