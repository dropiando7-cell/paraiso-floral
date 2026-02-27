'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // type-casting here for convenience
    // in practice, use a library like zod to validate the form data
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    // Check if user exists in Prisma before attempting to authenticate
    const authorizedUser = await prisma.user.findUnique({
        where: { email: data.email }
    })

    if (!authorizedUser) {
        return { error: 'Acceso Denegado. Tu cuenta no está autorizada. Contacta a administración.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: data.email as string,
        password: data.password as string,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/') // Redirects to MFA/Security Verification or Dashboard
}
