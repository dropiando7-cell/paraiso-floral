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

        // 1. Intentar actualizar en Supabase Auth Metadata (para el nombre en sesión)
        try {
            await supabase.auth.updateUser({
                data: {
                    full_name: data.fullName,
                    name: data.fullName
                }
            });
        } catch (supErr) {
            console.warn('Advertencia al actualizar Supabase Auth User:', supErr);
        }

        // 2. Actualizar en Prisma Database (para nombre, apellido y teléfono)
        const parts = data.fullName.trim().split(/\s+/);
        const nombre = parts[0] || null;
        const apellido = parts.length > 1 ? parts.slice(1).join(" ") : null;

        if (user.email) {
            await prisma.user.updateMany({
                where: {
                    email: {
                        equals: user.email,
                        mode: 'insensitive'
                    }
                },
                data: {
                    phoneNumber: data.phone,
                    nombre,
                    apellido
                }
            });
        }

        revalidatePath('/perfil');
        return { success: true };
    } catch (error: any) {
        console.error('Error in updateProfile:', error);
        return { success: false, error: error?.message || 'Error interno del servidor al actualizar perfil.' };
    }
}

export async function updateAvatarInDb(url: string) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || !user.email) {
            return { success: false, error: 'No autorizado' };
        }

        await prisma.user.updateMany({
            where: {
                email: {
                    equals: user.email,
                    mode: 'insensitive'
                }
            },
            data: {
                avatarUrl: url
            }
        });

        revalidatePath('/perfil');
        return { success: true };
    } catch (error: any) {
        console.error('Error in updateAvatarInDb:', error);
        return { success: false, error: error?.message || 'Error interno del servidor al actualizar foto en DB.' };
    }
}

export async function updateSignatureInDb(signatureUrl: string) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || !user.email) {
            return { success: false, error: 'No autorizado' };
        }

        await prisma.user.updateMany({
            where: {
                email: {
                    equals: user.email,
                    mode: 'insensitive'
                }
            },
            data: {
                firmaDigitalUrl: signatureUrl || null
            }
        });

        revalidatePath('/perfil');
        return { success: true };
    } catch (error: any) {
        console.error('Error in updateSignatureInDb:', error);
        return { success: false, error: error?.message || 'Error interno del servidor al actualizar firma digital.' };
    }
}
