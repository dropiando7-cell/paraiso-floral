'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { Role } from '@prisma/client';

export async function createUser(data: {
    email: string;
    role: Role;
    customRoleName?: string | null;
    organizationId: string;
    accessibleModules: string[];
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'No autenticado.' };
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (dbUser?.role !== 'SUPER_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN.' };
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            return { success: false, error: 'El usuario ya existe en el sistema.' };
        }

        // Create user in Prisma
        const newUser = await prisma.user.create({
            data: {
                email: data.email,
                role: data.role,
                customRoleName: data.customRoleName,
                organizationId: data.organizationId,
                accessibleModules: data.accessibleModules,
            },
        });

        revalidatePath('/admin/users');
        return { success: true, user: newUser };
    } catch (error: any) {
        console.error('Error creating user:', error);
        return { success: false, error: 'Error interno del servidor al crear usuario.' };
    }
}

export async function deleteUser(id: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'No autenticado.' };
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (dbUser?.role !== 'SUPER_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN.' };
        }

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return { success: false, error: 'Usuario no encontrado.' };

        // Prevent deleting oneself just in case
        if (targetUser.email === user.email) {
            return { success: false, error: 'No puedes eliminar tu propia cuenta.' };
        }

        await prisma.user.delete({ where: { id } });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return { success: false, error: 'Error interno del servidor al eliminar usuario.' };
    }
}

export async function editUser(
    id: string,
    data: {
        role: Role;
        customRoleName?: string | null;
        organizationId: string;
        accessibleModules: string[];
    }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'No autenticado.' };
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (dbUser?.role !== 'SUPER_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN.' };
        }

        // Update user in Prisma (Email is intentionally omitted from the update to avoid Supabase auth mismatch)
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                role: data.role,
                customRoleName: data.customRoleName,
                organizationId: data.organizationId,
                accessibleModules: data.accessibleModules,
            },
        });

        revalidatePath('/admin/users');
        return { success: true, user: updatedUser };
    } catch (error: any) {
        console.error('Error editing user:', error);
        return { success: false, error: 'Error interno del servidor al actualizar usuario.' };
    }
}

export async function createRoleTemplate(data: {
    name: string;
    baseRole: Role;
    organizationId: string;
    accessibleModules: string[];
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: 'No autenticado.' };

        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser?.role !== 'SUPER_ADMIN') return { success: false, error: 'No autorizado.' };

        const existing = await prisma.roleTemplate.findUnique({
            where: {
                organizationId_name: {
                    organizationId: data.organizationId,
                    name: data.name
                }
            }
        });

        if (existing) {
            return { success: false, error: 'Ya existe una plantilla con este nombre en la organización.' };
        }

        const newTemplate = await prisma.roleTemplate.create({
            data: {
                name: data.name,
                baseRole: data.baseRole,
                organizationId: data.organizationId,
                accessibleModules: data.accessibleModules,
            },
        });

        revalidatePath('/admin/users');
        return { success: true, template: newTemplate };
    } catch (error: any) {
        console.error('Error creating role template:', error);
        return { success: false, error: 'Error interno del servidor al crear el rol.' };
    }
}
