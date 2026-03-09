'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updatePreferences(data: { defaultModule: string | null; timezone: string | null; theme: string | null }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || !user.email) {
            return { success: false, error: 'No autorizado' };
        }

        await prisma.user.update({
            where: { email: user.email },
            data: {
                defaultModule: data.defaultModule,
                timezone: data.timezone,
                theme: data.theme || 'system'
            }
        });

        revalidatePath('/configuracion');
        return { success: true };
    } catch (error) {
        console.error('Error in updatePreferences:', error);
        return { success: false, error: 'Error interno del servidor al actualizar preferencias.' };
    }
}
