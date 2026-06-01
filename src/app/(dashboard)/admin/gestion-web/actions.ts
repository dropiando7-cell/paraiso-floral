'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Helper to check permission
async function checkAdminAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        throw new Error('No autorizado');
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true }
    });

    if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN')) {
        throw new Error('Permisos insuficientes');
    }

    return dbUser;
}

export async function getWebSettings() {
    try {
        await checkAdminAuth();

        const settings = await prisma.systemSetting.findMany();
        
        // Parse keys
        const maintenanceMode = settings.find(s => s.key === 'maintenance_mode')?.value === 'true';
        
        const reviewsRaw = settings.find(s => s.key === 'google_reviews')?.value || '[]';
        const reviews = JSON.parse(reviewsRaw);

        const sectionsRaw = settings.find(s => s.key === 'landing_sections')?.value || '[]';
        const sections = JSON.parse(sectionsRaw);

        const landingSettingsRaw = settings.find(s => s.key === 'landing_settings')?.value || '{}';
        const landingSettings = JSON.parse(landingSettingsRaw);

        return {
            success: true,
            maintenanceMode,
            reviews,
            sections,
            landingSettings
        };
    } catch (error: any) {
        console.error('Error fetching web settings:', error);
        return { success: false, error: error.message || 'Error al obtener configuraciones' };
    }
}

export async function saveMaintenanceMode(enabled: boolean) {
    try {
        await checkAdminAuth();

        await prisma.systemSetting.upsert({
            where: { key: 'maintenance_mode' },
            update: { value: String(enabled) },
            create: { key: 'maintenance_mode', value: String(enabled) }
        });

        revalidatePath('/admin/gestion-web');
        revalidatePath('/landing');
        return { success: true };
    } catch (error: any) {
        console.error('Error saving maintenance mode:', error);
        return { success: false, error: error.message };
    }
}

export async function saveLandingSections(sections: any[]) {
    try {
        await checkAdminAuth();

        await prisma.systemSetting.upsert({
            where: { key: 'landing_sections' },
            update: { value: JSON.stringify(sections) },
            create: { key: 'landing_sections', value: JSON.stringify(sections) }
        });

        revalidatePath('/admin/gestion-web');
        revalidatePath('/landing');
        return { success: true };
    } catch (error: any) {
        console.error('Error saving sections:', error);
        return { success: false, error: error.message };
    }
}

export async function saveGoogleReviews(reviews: any[]) {
    try {
        await checkAdminAuth();

        await prisma.systemSetting.upsert({
            where: { key: 'google_reviews' },
            update: { value: JSON.stringify(reviews) },
            create: { key: 'google_reviews', value: JSON.stringify(reviews) }
        });

        revalidatePath('/admin/gestion-web');
        revalidatePath('/landing');
        return { success: true };
    } catch (error: any) {
        console.error('Error saving reviews:', error);
        return { success: false, error: error.message };
    }
}

export async function saveLandingSettings(settings: any) {
    try {
        await checkAdminAuth();

        await prisma.systemSetting.upsert({
            where: { key: 'landing_settings' },
            update: { value: JSON.stringify(settings) },
            create: { key: 'landing_settings', value: JSON.stringify(settings) }
        });

        revalidatePath('/admin/gestion-web');
        revalidatePath('/landing');
        return { success: true };
    } catch (error: any) {
        console.error('Error saving landing general settings:', error);
        return { success: false, error: error.message };
    }
}

// Search items in ActivoFijo and Producto to override their web images
export async function searchInventoryItems(query: string) {
    try {
        const dbUser = await checkAdminAuth();

        // Search Activos Fijos
        const activos = await prisma.activoFijo.findMany({
            where: {
                organizationId: dbUser.organizationId,
                OR: [
                    { descripcionCorta: { contains: query, mode: 'insensitive' } },
                    { marca: { contains: query, mode: 'insensitive' } },
                    { modelo: { contains: query, mode: 'insensitive' } },
                    { idQr: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 10,
            select: {
                id: true,
                descripcionCorta: true,
                marca: true,
                modelo: true,
                idQr: true,
                imagenUrl: true,
                costoAdq: true
            }
        });

        // Search Productos
        const productos = await prisma.producto.findMany({
            where: {
                organizationId: dbUser.organizationId,
                OR: [
                    { nombre: { contains: query, mode: 'insensitive' } },
                    { marca: { contains: query, mode: 'insensitive' } },
                    { modelo: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 10,
            select: {
                id: true,
                nombre: true,
                marca: true,
                modelo: true,
                sku: true
            }
        });

        return {
            success: true,
            activos: activos.map(a => ({
                id: a.id,
                name: a.descripcionCorta,
                brand: a.marca || 'N/A',
                model: a.modelo || 'N/A',
                code: a.idQr,
                imageUrl: a.imagenUrl,
                type: 'activo' as const,
                cost: a.costoAdq ? Number(a.costoAdq) : null
            })),
            productos: productos.map(p => ({
                id: p.id,
                name: p.nombre,
                brand: p.marca || 'N/A',
                model: p.modelo || 'N/A',
                code: p.sku,
                imageUrl: null, // No image field on Producto model
                type: 'producto' as const,
                cost: null
            }))
        };
    } catch (error: any) {
        console.error('Error searching inventory:', error);
        return { success: false, error: error.message };
    }
}

export async function updateItemImage(id: string, type: 'activo' | 'producto', imageUrl: string) {
    try {
        await checkAdminAuth();

        if (type === 'activo') {
            await prisma.activoFijo.update({
                where: { id },
                data: { imagenUrl: imageUrl }
            });
        } else {
            // Producto doesn't have an image field, but we can return success since we only do activos
            throw new Error('Solo se puede actualizar la imagen para equipos físicos (Activos Fijos)');
        }

        revalidatePath('/admin/gestion-web');
        revalidatePath('/landing');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating item image:', error);
        return { success: false, error: error.message };
    }
}
