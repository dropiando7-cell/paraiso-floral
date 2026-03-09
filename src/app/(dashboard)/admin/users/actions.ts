'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Role } from '@prisma/client';

export async function createUser(data: {
    email: string;
    password?: string;
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

        // Create in Supabase Auth if a password was provided (Classic Email)
        if (data.password) {
            const adminAuthClient = createAdminClient();
            const { error: authError } = await adminAuthClient.auth.admin.createUser({
                email: data.email,
                password: data.password,
                email_confirm: true, // Auto-confirm for admin creations
            });

            if (authError) {
                console.error('Error creating auth user:', authError);
                return { success: false, error: 'Error al registrar la credencial de seguridad: ' + authError.message };
            }
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

export async function updateRoleTemplate(id: string, data: {
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

        // Check if renaming to an existing name
        const existingTemplate = await prisma.roleTemplate.findUnique({ where: { id } });
        if (!existingTemplate) return { success: false, error: 'Plantilla no encontrada.' };

        if (existingTemplate.name !== data.name) {
            const duplicate = await prisma.roleTemplate.findFirst({
                where: {
                    organizationId: data.organizationId,
                    name: data.name,
                    id: { not: id } // Exclude current
                }
            });
            if (duplicate) return { success: false, error: 'Ya existe una plantilla con este nuevo nombre.' };
        }

        // Use a transaction to update the template AND the users that have this template string
        await prisma.$transaction(async (tx) => {
            await tx.roleTemplate.update({
                where: { id },
                data: {
                    name: data.name,
                    baseRole: data.baseRole,
                    organizationId: data.organizationId,
                    accessibleModules: data.accessibleModules,
                },
            });

            // Update all users that had the old custom role name to the new name and baseRole
            if (existingTemplate.name !== data.name || existingTemplate.baseRole !== data.baseRole || JSON.stringify(existingTemplate.accessibleModules) !== JSON.stringify(data.accessibleModules)) {
                await tx.user.updateMany({
                    where: {
                        organizationId: data.organizationId,
                        customRoleName: existingTemplate.name,
                    },
                    data: {
                        customRoleName: data.name,
                        role: data.baseRole,
                        accessibleModules: data.accessibleModules
                    }
                });
            }
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating role template:', error);
        return { success: false, error: 'Error interno del servidor al actualizar el rol.' };
    }
}

export async function deleteRoleTemplate(id: string, organizationId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: 'No autenticado.' };

        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser?.role !== 'SUPER_ADMIN') return { success: false, error: 'No autorizado.' };

        const existingTemplate = await prisma.roleTemplate.findUnique({ where: { id } });
        if (!existingTemplate) return { success: false, error: 'Plantilla no encontrada.' };

        // Use a transaction to delete the template AND remove it from users
        await prisma.$transaction(async (tx) => {
            await tx.roleTemplate.delete({ where: { id } });

            // Downgrade users who had this template
            await tx.user.updateMany({
                where: {
                    organizationId,
                    customRoleName: existingTemplate.name,
                },
                data: {
                    customRoleName: null,
                }
            });
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting role template:', error);
        return { success: false, error: 'Error interno del servidor al eliminar el rol.' };
    }
}
