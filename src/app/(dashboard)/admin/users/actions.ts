'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Role, EmailTemplateType } from '@prisma/client';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import WelcomeEmailDynamic from '@/emails/WelcomeEmailDynamic';
import { logActivity } from '@/lib/activity-logger';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function createUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    role: Role;
    customRoleName?: string | null;
    organizationId: string;
    accessibleModules: string[];
    puedeAsignarEspacios?: boolean;
    puesto?: string;
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

        if (dbUser?.role !== 'SUPER_ADMIN' && dbUser?.role !== 'CHECKIN_KIDS_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN o CHECKIN_KIDS_ADMIN.' };
        }

        if (dbUser.role === 'CHECKIN_KIDS_ADMIN') {
            if (data.role !== 'CHECKIN_KIDS' || data.customRoleName) {
                return { success: false, error: 'No autorizado. Solo puedes crear usuarios con el rol CHECKIN_KIDS.' };
            }
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
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!serviceKey) {
                return {
                    success: false,
                    error: 'La variable de entorno SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor/entorno local. Por favor agrégala a tu archivo .env.'
                };
            }
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            const adminAuthClient = createAdminClient();
            const { error: authError } = await adminAuthClient.auth.admin.createUser({
                email: data.email,
                password: data.password,
                email_confirm: true, // Auto-confirm for admin creations
                user_metadata: {
                    full_name: fullName || undefined // Pass the full name here for the profile
                }
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
                puedeAsignarEspacios: data.puedeAsignarEspacios ?? false,
                puesto: data.puesto,
            },
        });

        // Log activity
        await logActivity({
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            action: 'CREATE',
            module: '/admin/users',
            description: `Creado usuario: ${data.email} con rol ${data.customRoleName || data.role}`,
            metadata: {
                createdUserEmail: data.email,
                role: data.role,
                customRoleName: data.customRoleName,
                accessibleModules: data.accessibleModules
            }
        });

        // Send Welcome Email asynchronously
        try {
            // Provide a graceful fallback if the URL environment variable isn't set
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paraiso-floral.vercel.app';
            
            // Get Organization Details for Whitelabel
            const organization = await prisma.organization.findUnique({
                where: { id: data.organizationId }
            });
            const orgName = organization?.name || 'Bioelectrónica';
            const logoUrl = organization?.logoUrl || undefined;

            const senderEmail = `${orgName} <admin@bioelectronica.hn>`;
            const computedFirstName = data.firstName || data.email.split('@')[0];

            // 1. Fetch the corresponding custom template from the database
            const templateType = data.password ? 'CLASSIC_WELCOME' : 'GOOGLE_WELCOME';
            const emailTemplate = await prisma.emailTemplate.findUnique({
                where: {
                    organizationId_type: {
                        organizationId: data.organizationId,
                        type: templateType
                    }
                }
            });

            // 2. Set Fallback content if no active template exists or it's deactivated
            const activeTemplate = emailTemplate?.isActive ? emailTemplate : {
                subject: data.password ? `¡Bienvenido a ${orgName}!` : `¡Acceso Concedido a ${orgName}!`,
                title: data.password ? `¡Bienvenido a ${orgName}!` : '¡Acceso Concedido!',
                body: data.password
                    ? 'Tu cuenta ha sido creada exitosamente. \nTus credenciales son: \nCorreo: {{email}} \nContraseña Temporal: {{password}}'
                    : `Nos complace informarte que tu cuenta de Google Workspace ({{email}}) ha sido autorizada para ingresar a ${orgName}. \n\nYa puedes ingresar a la plataforma utilizando el botón de "Continuar con Google". No necesitas contraseña.`,
                buttonText: data.password ? 'Iniciar Sesión Ahora' : 'Entrar con Google Workspace',
                type: templateType
            };

            // 3. Send email using the Dynamic component
            console.log('--- ENVIANDO CORREO NUEVO USUARIO ---');
            console.log('Sender:', senderEmail, 'To:', data.email, 'Subject:', activeTemplate.subject);
            console.log('RESEND_API_KEY Configured?', !!process.env.RESEND_API_KEY);
            // 4. Pre-render the component to an HTML string to avoid Vercel Edge SSR crashes
            const htmlEmail = await render(WelcomeEmailDynamic({
                type: templateType,
                title: activeTemplate.title,
                body: activeTemplate.body,
                buttonText: activeTemplate.buttonText,
                firstName: computedFirstName,
                email: data.email,
                password: data.password,
                logoUrl: logoUrl,
                orgName: orgName,
                loginUrl: `${appUrl}/login`,
            }));

            await resend.emails.send({
                from: senderEmail,
                to: data.email,
                subject: activeTemplate.subject,
                html: htmlEmail,
            });

        } catch (emailError: any) {
            console.error('---- ERROR FATAL ENVIANDO EL CORREO (CREATE) ----');
            console.error(emailError);
            if (emailError?.response) console.error('Response:', emailError.response);
            if (emailError?.message) console.error('Message:', emailError.message);
            // We do not return an error here so the user creation process still succeeds in UI
        }

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

        if (dbUser?.role !== 'SUPER_ADMIN' && dbUser?.role !== 'CHECKIN_KIDS_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN o CHECKIN_KIDS_ADMIN.' };
        }

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return { success: false, error: 'Usuario no encontrado.' };

        if (dbUser.role === 'CHECKIN_KIDS_ADMIN') {
            if (targetUser.role !== 'CHECKIN_KIDS') {
                return { success: false, error: 'No autorizado. Solo puedes eliminar usuarios con el rol CHECKIN_KIDS.' };
            }
        }

        // Prevent deleting oneself just in case
        if (targetUser.email === user.email) {
            return { success: false, error: 'No puedes eliminar tu propia cuenta.' };
        }

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        let warning = undefined;

        if (serviceKey) {
            const adminAuthClient = createAdminClient();

            // Buscamos el ID del usuario en Supabase Auth usando su email
            let page = 1;
            let authUserIdToDelete = null;
            let hasMore = true;

            while (hasMore) {
                const { data: { users }, error: listError } = await adminAuthClient.auth.admin.listUsers({ page, perPage: 100 });
                if (listError || !users) break;

                const found = users.find(u => u.email === targetUser.email);
                if (found) {
                    authUserIdToDelete = found.id;
                    break;
                }
                if (users.length < 100) hasMore = false;
                page++;
            }

            // Si lo encontramos en Auth, lo eliminamos de ahí también
            if (authUserIdToDelete) {
                const { error: deleteAuthError } = await adminAuthClient.auth.admin.deleteUser(authUserIdToDelete);
                if (deleteAuthError) {
                    console.error("Error eliminando perfil de Auth:", deleteAuthError);
                    return { success: false, error: 'Error al eliminar credencial de acceso: ' + deleteAuthError.message };
                }
            }
        } else {
            warning = 'Falta SUPABASE_SERVICE_ROLE_KEY. El usuario se eliminó de la base de datos local, pero no de Supabase Auth.';
        }

        // Log activity
        await logActivity({
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            action: 'DELETE',
            module: '/admin/users',
            description: `Eliminado usuario: ${targetUser.email}`,
            metadata: {
                deletedUserEmail: targetUser.email,
                role: targetUser.role
            }
        });

        // Luego eliminamos de la base de datos de Prisma
        await prisma.user.delete({ where: { id } });

        revalidatePath('/admin/users');
        return { success: true, warning };
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
        puedeAsignarEspacios?: boolean;
        puesto?: string;
        nombre?: string;
        apellido?: string;
        password?: string;
        isAssignable?: boolean;
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

        if (dbUser?.role !== 'SUPER_ADMIN' && dbUser?.role !== 'CHECKIN_KIDS_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN o CHECKIN_KIDS_ADMIN.' };
        }

        if (dbUser.role === 'CHECKIN_KIDS_ADMIN') {
            if (data.role !== 'CHECKIN_KIDS' || data.customRoleName) {
                return { success: false, error: 'No autorizado. Solo puedes asignar el rol CHECKIN_KIDS.' };
            }

            const targetUser = await prisma.user.findUnique({ where: { id } });
            if (targetUser?.role !== 'CHECKIN_KIDS') {
                return { success: false, error: 'No autorizado. Solo puedes editar usuarios que ya tienen el rol CHECKIN_KIDS.' };
            }
        }

        if (data.password && data.password.length < 6) {
            return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
        }

        // Update user in Prisma (Email is intentionally omitted from the update to avoid Supabase auth mismatch)
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                role: data.role,
                customRoleName: data.customRoleName,
                organizationId: data.organizationId,
                accessibleModules: data.accessibleModules,
                puedeAsignarEspacios: data.puedeAsignarEspacios ?? false,
                puesto: data.puesto,
                nombre: data.nombre,
                apellido: data.apellido,
                isAssignable: data.isAssignable,
            },
        });

        // Log activity
        await logActivity({
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            action: 'UPDATE',
            module: '/admin/users',
            description: `Editado usuario: ${updatedUser.email}`,
            metadata: {
                updatedUserEmail: updatedUser.email,
                newData: {
                    role: data.role,
                    customRoleName: data.customRoleName,
                    puesto: data.puesto,
                    accessibleModules: data.accessibleModules
                }
            }
        });

        // Also update Supabase Auth if service key is configured
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey) {
            try {
                const adminAuthClient = createAdminClient();
                // Find user in auth using email
                let page = 1;
                let authUserIdToUpdate = null;
                let hasMore = true;
                while (hasMore) {
                    const { data: { users }, error: listError } = await adminAuthClient.auth.admin.listUsers({ page, perPage: 100 });
                    if (listError || !users) break;

                    const found = users.find(u => u.email === updatedUser.email);
                    if (found) {
                        authUserIdToUpdate = found.id;
                        break;
                    }
                    if (users.length < 100) hasMore = false;
                    page++;
                }

                if (authUserIdToUpdate) {
                    const fullName = `${data.nombre || ''} ${data.apellido || ''}`.trim();
                    const updateData: any = {
                        user_metadata: {
                            full_name: fullName || undefined
                        }
                    };
                    if (data.password) {
                        updateData.password = data.password;
                    }
                    const { error: updateAuthError } = await adminAuthClient.auth.admin.updateUserById(authUserIdToUpdate, updateData);
                    if (updateAuthError && data.password) {
                        return { success: false, error: 'Error al cambiar la contraseña en el sistema de seguridad: ' + updateAuthError.message };
                    }
                } else if (data.password) {
                    return { success: false, error: 'No se encontró el perfil de seguridad del usuario para actualizar la contraseña.' };
                }
            } catch (authErr: any) {
                console.error('Error updating auth metadata/password in editUser server action:', authErr);
                if (data.password) {
                    return { success: false, error: 'Error al cambiar la contraseña: ' + (authErr?.message || authErr) };
                }
            }
        } else if (data.password) {
            return {
                success: false,
                error: 'La variable de entorno SUPABASE_SERVICE_ROLE_KEY no está configurada. No se puede cambiar la contraseña.'
            };
        }

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

        // Log activity
        await logActivity({
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            action: 'CREATE',
            module: '/admin/users',
            description: `Creado rol personalizado: ${data.name}`,
            metadata: {
                roleName: data.name,
                baseRole: data.baseRole,
                accessibleModules: data.accessibleModules
            }
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

        // Log activity
        await logActivity({
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            action: 'UPDATE',
            module: '/admin/users',
            description: `Actualizado rol personalizado: ${data.name}`,
            metadata: {
                roleName: data.name,
                baseRole: data.baseRole,
                accessibleModules: data.accessibleModules
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

        // Log activity
        await logActivity({
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            action: 'DELETE',
            module: '/admin/users',
            description: `Eliminado rol personalizado: ${existingTemplate.name}`,
            metadata: {
                roleName: existingTemplate.name,
                baseRole: existingTemplate.baseRole
            }
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting role template:', error);
        return { success: false, error: 'Error interno del servidor al eliminar el rol.' };
    }
}

export async function sendManualWelcomeEmail(userId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: 'No autenticado.' };

        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser?.role !== 'SUPER_ADMIN' && dbUser?.role !== 'CHECKIN_KIDS_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN o CHECKIN_KIDS_ADMIN.' };
        }

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return { success: false, error: 'Usuario no encontrado en la base de datos.' };

        if (dbUser.role === 'CHECKIN_KIDS_ADMIN') {
            if (targetUser.role !== 'CHECKIN_KIDS') {
                return { success: false, error: 'No autorizado. Solo puedes reenviar correos a usuarios con el rol CHECKIN_KIDS.' };
            }
        }

        const adminAuthClient = createAdminClient();

        let page = 1;
        let authTargetUser = null;
        let hasMore = true;

        while (hasMore) {
            const { data: { users }, error: listError } = await adminAuthClient.auth.admin.listUsers({ page, perPage: 100 });
            if (listError || !users) break;

            const found = users.find(u => u.email === targetUser.email);
            if (found) {
                authTargetUser = found;
                break;
            }
            if (users.length < 100) hasMore = false;
            page++;
        }

        if (!authTargetUser) {
            return { success: false, error: 'Usuario no encontrado en el sistema de autenticación.' };
        }

        const isGoogle = authTargetUser.app_metadata?.providers?.includes('google');
        const computedFirstName = authTargetUser.user_metadata?.full_name?.split(' ')[0] || targetUser.email.split('@')[0];

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paraiso-floral.vercel.app';
        
        // Get Organization Details for Whitelabel
        const organization = await prisma.organization.findUnique({
            where: { id: targetUser.organizationId }
        });
        const orgName = organization?.name || 'Bioelectrónica';
        const logoUrl = organization?.logoUrl || undefined;

        const senderEmail = `${orgName} <admin@bioelectronica.hn>`;

        let newTempPassword = null;
        let templateType: EmailTemplateType = 'GOOGLE_WELCOME';

        if (!isGoogle) {
            // It's a classic user. Generate a new secure temporary password
            newTempPassword = Math.random().toString(36).slice(-8) + 'A1!';
            templateType = 'CLASSIC_WELCOME';
            // Update auth user with new password
            await adminAuthClient.auth.admin.updateUserById(authTargetUser.id, {
                password: newTempPassword
            });
        }

        // Fetch the active custom template from the database
        const emailTemplate = await prisma.emailTemplate.findUnique({
            where: {
                organizationId_type: {
                    organizationId: targetUser.organizationId,
                    type: templateType
                }
            }
        });

        // Set Fallback content if no template is active
        const activeTemplate = emailTemplate?.isActive ? emailTemplate : {
            subject: newTempPassword ? `¡Bienvenido a ${orgName}!` : `¡Acceso Concedido a ${orgName}!`,
            title: newTempPassword ? `¡Bienvenido a ${orgName}!` : '¡Acceso Concedido!',
            body: newTempPassword
                ? 'Tu cuenta ha sido creada exitosamente. \nTus credenciales son: \nCorreo: {{email}} \nContraseña Temporal: {{password}}'
                : `Nos complace informarte que tu cuenta de Google Workspace ({{email}}) ha sido autorizada para ingresar a ${orgName}. \n\nYa puedes ingresar a la plataforma utilizando el botón de "Continuar con Google". No necesitas contraseña.`,
            buttonText: newTempPassword ? 'Iniciar Sesión Ahora' : 'Entrar con Google Workspace',
            type: templateType
        };

        const resend = new Resend(process.env.RESEND_API_KEY);
        console.log('--- ENVIANDO CORREO MANUAL ---');
        console.log('Sender:', senderEmail, 'To:', targetUser.email, 'Subject:', activeTemplate.subject);
        console.log('RESEND_API_KEY Configured?', !!process.env.RESEND_API_KEY);
        try {
            // Pre-render the HTML
            const htmlEmail = await render(WelcomeEmailDynamic({
                type: templateType,
                title: activeTemplate.title,
                body: activeTemplate.body,
                buttonText: activeTemplate.buttonText,
                firstName: computedFirstName,
                email: targetUser.email,
                password: newTempPassword || undefined,
                logoUrl: logoUrl,
                orgName: orgName,
                loginUrl: `${appUrl}/login`,
            }));

            const sendResult = await resend.emails.send({
                from: senderEmail,
                to: targetUser.email,
                subject: activeTemplate.subject,
                html: htmlEmail,
            });
            console.log("Resultado de Resend API:", sendResult);
        } catch (emailError: any) {
            console.error('---- ERROR FATAL ENVIANDO EL CORREO (MANUAL) ----');
            console.error(emailError);
            if (emailError?.response) console.error('Response:', emailError.response);
            if (emailError?.message) console.error('Message:', emailError.message);
        }

        return { success: true, message: newTempPassword ? 'Correo enviado con nueva contraseña temporal.' : 'Correo de invitación enviado con éxito.' };
    } catch (error: any) {
        console.error('Error enviando correo manual:', error);
        return { success: false, error: 'Error interno del servidor al enviar correo.' };
    }
}

export async function createOrganization(data: {
    name: string;
    slug: string;
    correoContacto?: string;
    telefono?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: 'No autenticado.' };

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (dbUser?.role !== 'SUPER_ADMIN') {
            return { success: false, error: 'No autorizado. Se requiere rol SUPER_ADMIN.' };
        }

        // Validate unique slug
        const existing = await prisma.organization.findUnique({
            where: { slug: data.slug },
        });

        if (existing) {
            return { success: false, error: 'Ya existe una organización con ese slug.' };
        }

        const newOrg = await prisma.organization.create({
            data: {
                name: data.name,
                slug: data.slug,
                correoContacto: data.correoContacto || null,
                telefono: data.telefono || null,
            },
        });

        revalidatePath('/admin/users');
        return { success: true, organization: newOrg };
    } catch (error: any) {
        console.error('Error creating organization:', error);
        return { success: false, error: 'Error interno del servidor al crear la organización.' };
    }
}

