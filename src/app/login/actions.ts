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
        let errorMsg = error.message;
        const lowerMsg = errorMsg.toLowerCase();
        
        if (error.status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('rate_limit')) {
            errorMsg = 'Se ha alcanzado el límite de solicitudes. Por favor, espera unos minutos e intenta de nuevo.';
        } else if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid credentials')) {
            errorMsg = 'Correo o contraseña incorrectos. Por favor, verifica tus datos.';
        } else if (lowerMsg.includes('email not confirmed')) {
            errorMsg = 'El correo electrónico no ha sido verificado aún.';
        }
        
        return { error: errorMsg }
    }

    revalidatePath('/', 'layout')

    // Redirect to default module if configured, otherwise root
    if (authorizedUser.defaultModule) {
        redirect(authorizedUser.defaultModule)
    } else {
        redirect('/') // Redirects to Dashboard
    }
}
