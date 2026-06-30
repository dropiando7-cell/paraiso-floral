'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Helper to check admin permission
async function checkAdminAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        throw new Error('No autorizado');
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true, accessibleModules: true }
    });

    if (!dbUser) {
        throw new Error('Permisos insuficientes');
    }

    const hasWebAccess = dbUser.accessibleModules.includes('/admin/gestion-web');

    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && !hasWebAccess) {
        throw new Error('Permisos insuficientes');
    }

    return dbUser;
}

const DEFAULT_BIO_SETTINGS = {
    avatarUrl: '/landing/bio-avatar.png',
    title: 'Bioelectrónica Honduras',
    subtitle: 'Servicio Técnico y Venta de Equipo Médico Profesional',
    location: 'Tegucigalpa, Francisco Morazán, Honduras',
    whatsapp: '50499000000', // Código de país sin el + para la API de WA
    phone: '+504 9900-0000',
    email: 'soporte@bioelectronicahn.com',
    facebook: 'https://facebook.com/bioelectronicahn',
    instagram: 'https://instagram.com/bioelectronicahn',
    tiktok: 'https://tiktok.com/@bioelectronicahn',
    website: 'https://bioelectronicahn.com',
    catalog: 'https://bioelectronicahn.com/landing/productos',
    customLinks: [
        { label: 'Ver Catálogo de Equipos', url: 'https://bioelectronicahn.com/landing/productos', icon: 'shopping-bag' },
        { label: 'Escríbenos por WhatsApp', url: 'https://wa.me/50499000000', icon: 'message-circle' },
        { label: 'Solicitar Servicio Técnico', url: 'https://bioelectronicahn.com/soporte/nuevo', icon: 'wrench' }
    ]
};

// Publicly accessible settings fetcher (used by the /bio page)
export async function getPublicBioSettings() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'bio_settings' }
        });

        if (!setting) {
            return { success: true, settings: DEFAULT_BIO_SETTINGS };
        }

        const parsed = JSON.parse(setting.value);
        return { success: true, settings: { ...DEFAULT_BIO_SETTINGS, ...parsed } };
    } catch (error: any) {
        console.error('Error fetching public bio settings:', error);
        return { success: true, settings: DEFAULT_BIO_SETTINGS }; // Fallback to default in case of error
    }
}

// Admin settings fetcher
export async function getBioSettings() {
    try {
        await checkAdminAuth();

        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'bio_settings' }
        });

        if (!setting) {
            return { success: true, settings: DEFAULT_BIO_SETTINGS };
        }

        const parsed = JSON.parse(setting.value);
        return { success: true, settings: { ...DEFAULT_BIO_SETTINGS, ...parsed } };
    } catch (error: any) {
        console.error('Error fetching admin bio settings:', error);
        return { success: false, error: error.message || 'Error al obtener configuración' };
    }
}

// Admin settings saver
export async function saveBioSettings(settings: any) {
    try {
        await checkAdminAuth();

        await prisma.systemSetting.upsert({
            where: { key: 'bio_settings' },
            update: { value: JSON.stringify(settings) },
            create: { key: 'bio_settings', value: JSON.stringify(settings) }
        });

        // Revalidate public page paths
        revalidatePath('/bio');
        revalidatePath('/landing/bio');
        revalidatePath('/admin/bio-settings');

        return { success: true };
    } catch (error: any) {
        console.error('Error saving bio settings:', error);
        return { success: false, error: error.message || 'Error al guardar configuración' };
    }
}
