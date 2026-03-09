'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateProfile(data: { fullName: string; phone: string }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'No autorizado' };
        }

        // 1. Update Supabase Auth Metadata (for the name)
        const { error: updateError } = await supabase.auth.updateUser({
            data: {
                full_name: data.fullName,
                name: data.fullName
            }
        });

        if (updateError) {
            console.error('Error updating supabase metadata:', updateError);
            return { success: false, error: 'Error al actualizar nombre en sesión.' };
        }

        // 2. Update Prisma Database (for the phone)
        await prisma.user.update({
            where: { email: user.email },
            data: {
                phoneNumber: data.phone
            }
        });

        revalidatePath('/perfil');
        return { success: true };
    } catch (error) {
        console.error('Error in updateProfile:', error);
        return { success: false, error: 'Error interno del servidor al actualizar perfil.' };
    }
}
