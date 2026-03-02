const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();

    let count = 0;
    for (const u of users) {
        if (u.customRoleName) {
            // check if template exists
            const exists = await prisma.roleTemplate.findFirst({
                where: { name: u.customRoleName, organizationId: u.organizationId }
            });
            if (!exists) {
                await prisma.roleTemplate.create({
                    data: {
                        name: u.customRoleName,
                        organizationId: u.organizationId,
                        baseRole: u.role,
                        accessibleModules: u.accessibleModules || []
                    }
                });
                count++;
                console.log(`Created missing role template: ${u.customRoleName}`);
            }
        }
    }

    console.log(`Done. Created ${count} missing templates.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    });
