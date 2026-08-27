import { prisma } from '../src/lib/prisma';

async function main() {
  const id = 'fd6a7017-bbe1-4bf7-a41c-1a2d81d8c812';
  const data = {
    name: 'PF_GERENCIA',
    baseRole: 'USER' as any,
    organizationId: 'a0287245-6cad-4df5-a32a-f214b7b72e04',
    accessibleModules: [
      "/",
      "/cotizaciones",
      "/facturas",
      "editar_facturas_emitidas",
      "/inventario",
      "/inventario/toma-fisica",
      "/contactos",
      "/cxc",
      "/caja-chica",
      "/inventario-ventas/rutas"
    ]
  };

  console.log('Simulating updateRoleTemplate transaction...');
  const existingTemplate = await prisma.roleTemplate.findUnique({ where: { id } });
  if (!existingTemplate) {
    console.error('Template not found');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.roleTemplate.update({
      where: { id },
      data: {
        name: data.name,
        baseRole: data.baseRole,
        organizationId: data.organizationId,
        accessibleModules: data.accessibleModules,
      },
    });

    if (existingTemplate.name !== data.name || existingTemplate.baseRole !== data.baseRole || JSON.stringify(existingTemplate.accessibleModules) !== JSON.stringify(data.accessibleModules)) {
      console.log('Accessible modules changed. Updating users...');
      const updateResult = await tx.user.updateMany({
        where: {
          organizationId: data.organizationId,
          customRoleName: existingTemplate.name,
        },
        data: {
          customRoleName: data.name,
          role: data.baseRole,
          accessibleModules: data.accessibleModules
        }
      });
      console.log('Update result for users:', updateResult);
    }
  });

  console.log('Simulation complete!');
}

main().catch(console.error);
