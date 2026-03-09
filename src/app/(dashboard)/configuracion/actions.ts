'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { EmailTemplateType, Role } from '@prisma/client';

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

// --- EMAIL TEMPLATES (ADMIN ONLY) ---
export async function getEmailTemplates() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) return [];

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { role: true, organizationId: true }
        });

        if (dbUser?.role !== 'SUPER_ADMIN') {
            return [];
        }

        const templates = await prisma.emailTemplate.findMany({
            where: { organizationId: dbUser.organizationId }
        });

        return templates;
    } catch (error) {
        console.error("Error fetching email templates:", error);
        return [];
    }
}

export async function saveEmailTemplate(data: {
    type: EmailTemplateType;
    subject: string;
    title: string;
    body: string;
    buttonText: string;
    isActive: boolean;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) return { success: false, error: 'No autorizado' };

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { role: true, organizationId: true }
        });

        if (dbUser?.role !== 'SUPER_ADMIN') {
            return { success: false, error: 'Se requieren permisos de administrador' };
        }

        const existing = await prisma.emailTemplate.findUnique({
            where: {
                organizationId_type: {
                    organizationId: dbUser.organizationId,
                    type: data.type
                }
            }
        });

        if (existing) {
            await prisma.emailTemplate.update({
                where: { id: existing.id },
                data: {
                    subject: data.subject,
                    title: data.title,
                    body: data.body,
                    buttonText: data.buttonText,
                    isActive: data.isActive
                }
            });
        } else {
            await prisma.emailTemplate.create({
                data: {
                    organizationId: dbUser.organizationId,
                    type: data.type,
                    subject: data.subject,
                    title: data.title,
                    body: data.body,
                    buttonText: data.buttonText,
                    isActive: data.isActive
                }
            });
        }

        revalidatePath('/configuracion');
        return { success: true };
    } catch (error) {
        console.error("Error saving email template:", error);
        return { success: false, error: 'Error del servidor al guardar la plantilla.' };
    }
}
