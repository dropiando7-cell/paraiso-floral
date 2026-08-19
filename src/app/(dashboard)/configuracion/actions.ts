'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { EmailTemplateType, Role } from '@prisma/client';
import { uploadToR2 } from '@/lib/storage/r2';

export async function updatePreferences(data: { defaultModule: string | null; timezone: string | null; theme: string | null; idleTimeoutEnabled?: boolean; disableAiVision?: boolean; enableVoiceAi?: boolean }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || !user.email) {
            return { success: false, error: 'No autorizado' };
        }

        const dbUser = await prisma.user.update({
            where: { email: user.email },
            data: {
                defaultModule: data.defaultModule,
                timezone: data.timezone,
                theme: data.theme || 'system',
                ...(data.idleTimeoutEnabled !== undefined && { idleTimeoutEnabled: data.idleTimeoutEnabled }),
                ...(data.enableVoiceAi !== undefined && { enableVoiceAi: data.enableVoiceAi })
            } as any
        });

        if (dbUser.role === 'SUPER_ADMIN' && data.disableAiVision !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: 'disable_ai_vision' },
                update: { value: data.disableAiVision ? 'true' : 'false' },
                create: { key: 'disable_ai_vision', value: data.disableAiVision ? 'true' : 'false' }
            });
        }

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

// --- PERFIL DE EMPRESA (WHITELABEL) ---
export async function getCompanyProfile() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return null;

        const dbUser = await prisma.user.findFirst({
            where: { email: { equals: user.email, mode: 'insensitive' } },
            include: { organization: true }
        });

        if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && dbUser.role !== 'GERENTE')) return null;

        return {
            name: dbUser.organization.name || '',
            direccion: dbUser.organization.direccion || '',
            telefono: dbUser.organization.telefono || '',
            correoContacto: dbUser.organization.correoContacto || '',
            rtn: dbUser.organization.rtn || '',
            logoUrl: dbUser.organization.logoUrl || '',
            qrPrefix: dbUser.organization.qrPrefix || 'PF'
        };
    } catch(e) {
        console.error(e);
        return null;
    }
}

export async function saveCompanyProfile(data: any) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return { success: false, error: 'No autorizado' };

        const dbUser = await prisma.user.findFirst({
            where: { email: { equals: user.email, mode: 'insensitive' } }
        });

        if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && dbUser.role !== 'GERENTE')) return { success: false, error: 'Sin permisos' };

        await prisma.organization.update({
            where: { id: dbUser.organizationId },
            data: {
                name: data.name,
                direccion: data.direccion,
                telefono: data.telefono,
                correoContacto: data.correoContacto,
                rtn: data.rtn,
                qrPrefix: data.qrPrefix ? String(data.qrPrefix).toUpperCase().substring(0, 4) : 'PF'
            }
        });

        revalidatePath('/configuracion');
        return { success: true };
    } catch(e) {
        console.error(e);
        return { success: false, error: 'Error al actualizar perfil' };
    }
}

export async function uploadCompanyLogo(formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return { success: false, error: 'No autorizado' };

        const dbUser = await prisma.user.findFirst({
            where: { email: { equals: user.email, mode: 'insensitive' } }
        });

        if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && dbUser.role !== 'GERENTE')) return { success: false, error: 'Sin permisos' };

        const file = formData.get('file') as File;
        if (!file) return { success: false, error: 'No se envió archivo' };

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const extension = file.name.split('.').pop() || 'png';
        const fileName = `logos/${dbUser.organizationId}-${Date.now()}.${extension}`;

        const url = await uploadToR2(buffer, fileName, file.type);
        
        await prisma.organization.update({
            where: { id: dbUser.organizationId },
            data: { logoUrl: url }
        });

        revalidatePath('/configuracion');
        return { success: true, url };
    } catch(e) {
        console.error("Upload error:", e);
        return { success: false, error: 'Error al subir logo' };
    }
}

export async function getAiVisionSetting() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'disable_ai_vision' }
        });
        return { success: true, disabled: setting ? setting.value === 'true' : false };
    } catch (e) {
        console.error(e);
        return { success: false, disabled: false };
    }
}

export async function saveAiVisionSetting(disabled: boolean) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return { success: false, error: 'No autorizado' };

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        });
        if (!dbUser || dbUser.role !== 'SUPER_ADMIN') {
            return { success: false, error: 'Se requieren permisos de administrador' };
        }

        await prisma.systemSetting.upsert({
            where: { key: 'disable_ai_vision' },
            update: { value: disabled ? 'true' : 'false' },
            create: { key: 'disable_ai_vision', value: disabled ? 'true' : 'false' }
        });

        revalidatePath('/configuracion');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Error al actualizar configuración' };
    }
}

