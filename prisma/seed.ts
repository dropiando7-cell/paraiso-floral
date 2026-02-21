import { PrismaClient, Role, TwoFactorType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Iniciando el proceso de seeding...')

    // 1. Crear o buscar la Organización Central
    const centralOrg = await prisma.organization.upsert({
        where: { slug: 'central' }, // Unique identifier
        update: {},
        create: {
            name: 'Misión Cristiana Elim Central',
            slug: 'central',
            domain: 'elim.hn',
        },
    })

    console.log(`✅ Organización creada o verificada: ${centralOrg.name}`)

    // 2. Crear o buscar al usuario Isaac Paz como SUPER_ADMIN
    const email = 'isaac.paz@elim.hn'

    const isaac = await prisma.user.upsert({
        where: { email },
        update: {
            role: Role.SUPER_ADMIN,
            organizationId: centralOrg.id,
        },
        create: {
            email,
            role: Role.SUPER_ADMIN,
            organizationId: centralOrg.id,
            twoFactorType: TwoFactorType.NONE,
            twoFactorEnabled: false
        },
    })

    console.log(`✅ Usuario asignado como SUPER_ADMIN (1): ${isaac.email}`)

    // 3. Crear o buscar al usuario admin@elimhonduras.org como segundo SUPER_ADMIN
    const adminEmail = 'admin@elimhonduras.org'

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            role: Role.SUPER_ADMIN,
            organizationId: centralOrg.id,
        },
        create: {
            email: adminEmail,
            role: Role.SUPER_ADMIN,
            organizationId: centralOrg.id,
            twoFactorType: TwoFactorType.NONE,
            twoFactorEnabled: false
        },
    })

    console.log(`✅ Usuario asignado como SUPER_ADMIN (2): ${adminUser.email}`)
    console.log('Seeding finalizado con éxito.')
}

main()
    .catch((e) => {
        console.error('Error al ejecutar el seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
