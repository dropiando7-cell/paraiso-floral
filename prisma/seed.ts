import { PrismaClient, Role, TwoFactorType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Iniciando el proceso de seeding...')

    // 1. Crear o buscar la Organización Central
    const centralOrg = await prisma.organization.upsert({
        where: { slug: 'central' }, // Unique identifier
        update: {},
        create: {
            name: 'Bioelectrónica Honduras',
            slug: 'central',
            domain: 'bioelectronicahn.com',
        },
    })

    console.log(`✅ Organización creada o verificada: ${centralOrg.name}`)

    // 2. Crear o buscar al usuario principal como SUPER_ADMIN
    const email = 'admin@bioelectronicahn.com'

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

    // 3. Crear o buscar al usuario alterno como segundo SUPER_ADMIN
    const adminEmail = 'soporte@bioelectronicahn.com'

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

    // 4. Crear o buscar al usuario samuel@zysell.com como SUPER_ADMIN
    const samuelEmail = 'samuel@zysell.com'

    const samuelUser = await prisma.user.upsert({
        where: { email: samuelEmail },
        update: {
            role: Role.SUPER_ADMIN,
            organizationId: centralOrg.id,
        },
        create: {
            email: samuelEmail,
            role: Role.SUPER_ADMIN,
            organizationId: centralOrg.id,
            twoFactorType: TwoFactorType.NONE,
            twoFactorEnabled: false
        },
    })

    console.log(`✅ Usuario asignado como SUPER_ADMIN (3): ${samuelUser.email}`)
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
