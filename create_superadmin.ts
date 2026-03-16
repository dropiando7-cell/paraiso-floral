import { createClient } from '@supabase/supabase-js'
import { PrismaClient, Role, TwoFactorType } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const prisma = new PrismaClient()
    // 4. Crear o buscar al usuario master@zysell.com como SUPER_ADMIN
async function main() {
    const samuelEmail = 'samuel.test@zysell.com'
    const password = 'R@pido4130'

    console.log(`Intentando registrar usuario en Supabase Auth: ${samuelEmail}`)
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: samuelEmail,
        password,
    })

    if (authError) {
        console.error('❌ Error en Supabase Auth (es posible que ya exista):', authError.message)
    } else {
        console.log('✅ Solicitud de registro en Supabase exitosa.')
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
            console.log('⚠️ INFO: El usuario ya existía previamente en Supabase.')
        }
    }

    console.log('Buscando / Creando autorización en Prisma DB...')
    
    // Asegurarnos que la organización existe
    let centralOrg = await prisma.organization.findUnique({ where: { slug: 'central' } })
    if(!centralOrg) {
         centralOrg = await prisma.organization.create({
            data: {
                name: 'Bioelectrónica Honduras',
                slug: 'central',
                domain: 'bioelectronicahn.com',
            }
         })
         console.log('✅ Org Central re-creada por si acaso.')
    }

    const user = await prisma.user.upsert({
        where: { email: samuelEmail },
        update: {
            role: Role.SUPER_ADMIN,
        },
        create: {
            email: samuelEmail,
            role: Role.SUPER_ADMIN,
            organizationId: centralOrg.id,
            twoFactorType: TwoFactorType.NONE,
            twoFactorEnabled: false
        }
    })
    
    console.log(`✅ Usuario autorizado existosamente en Prisma DB con rol: ${user.role}`)
    console.log('\n--- TERMINADO ---')
}

main().catch(console.error).finally(async () => await prisma.$disconnect())
