import { createClient } from '@supabase/supabase-js'
import { PrismaClient, Role, TwoFactorType } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const adminAuthClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})
const prisma = new PrismaClient()

async function main() {
    const email = 'master@superapp.com'
    const password = 'R@pido4130!n'

    console.log(`📌 Creando/Actualizando usuario SuperAdmin: ${email}`)

    // 1. Crear o verificar usuario en Supabase Auth con service_role (para confirmar correo automáticamente)
    let authUserId: string | null = null

    // Buscar si ya existe en Supabase Auth
    const { data: listData, error: listError } = await adminAuthClient.auth.admin.listUsers()
    if (listError) {
        console.error('⚠️ Error listando usuarios en Supabase Auth:', listError.message)
    }

    const existingAuthUser = listData?.users.find(u => u.email === email)

    if (existingAuthUser) {
        console.log('✅ Usuario encontrado en Supabase Auth. Actualizando contraseña...')
        authUserId = existingAuthUser.id
        const { error: updateError } = await adminAuthClient.auth.admin.updateUserById(authUserId, {
            password: password,
            email_confirm: true,
            user_metadata: { full_name: 'Master SuperAdmin' }
        })
        if (updateError) {
            console.error('❌ Error actualizando contraseña en Supabase Auth:', updateError.message)
        } else {
            console.log('✅ Contraseña actualizada correctamente en Supabase Auth.')
        }
    } else {
        console.log('✨ Creando nuevo usuario en Supabase Auth con email_confirm=true...')
        const { data: createData, error: createError } = await adminAuthClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: 'Master SuperAdmin' }
        })

        if (createError) {
            console.error('❌ Error creando usuario en Supabase Auth:', createError.message)
        } else if (createData.user) {
            authUserId = createData.user.id
            console.log('✅ Usuario creado exitosamente en Supabase Auth.')
        }
    }

    // 2. Asegurarnos que la Organización Central existe
    console.log('📌 Verificando Organización Central...')
    let org = await prisma.organization.findFirst({
        where: { OR: [{ slug: 'central' }, { slug: 'paraiso-floral' }] }
    })

    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'Distribuidora Paraíso Floral',
                slug: 'central',
                domain: 'paraiso-floral.vercel.app',
                direccion: 'San Pedro Sula, Cortés',
                correoContacto: 'master@superapp.com'
            }
        })
        console.log('✅ Organización creada:', org.name)
    } else {
        // Actualizar nombre a Distribuidora Paraíso Floral si aún se llamaba diferente
        org = await prisma.organization.update({
            where: { id: org.id },
            data: { name: 'Distribuidora Paraíso Floral' }
        })
        console.log('✅ Organización existente vinculada:', org.name)
    }

    // 3. Crear o actualizar el usuario en Prisma DB como SUPER_ADMIN
    const dbUser = await prisma.user.upsert({
        where: { email: email },
        update: {
            role: Role.SUPER_ADMIN,
            organizationId: org.id,
            nombre: 'Master',
            apellido: 'Admin',
            puesto: 'Super Administrator'
        },
        create: {
            email: email,
            role: Role.SUPER_ADMIN,
            organizationId: org.id,
            nombre: 'Master',
            apellido: 'Admin',
            puesto: 'Super Administrator',
            twoFactorType: TwoFactorType.NONE,
            twoFactorEnabled: false
        }
    })

    console.log(`\n🎉 USUARIO CREADO Y CONFIGURADO CON ÉXITO:`)
    console.log(`- Email: ${dbUser.email}`)
    console.log(`- Rol: ${dbUser.role}`)
    console.log(`- Organización: ${org.name} (ID: ${org.id})`)
    console.log('\n--- PROCESO COMPLETADO ---')
}

main().catch(console.error).finally(async () => await prisma.$disconnect())
