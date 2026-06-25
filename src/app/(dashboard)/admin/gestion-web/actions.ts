'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const getUuidFromParam = (param: string) => {
    const parts = param.split('-');
    if (parts.length >= 5) {
        return parts.slice(0, 5).join('-');
    }
    return param;
};

// Helper to check permission
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
                descripcionDetallada: true,
                marca: true,
                modelo: true,
                idQr: true,
                imagenUrl: true,
                imagenWeb: true,
                tituloWeb: true,
                descripcionWeb: true,
                costoAdq: true,
                categoria: {
                    select: {
                        nombre: true
                    }
                }
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
                descripcion: true,
                marca: true,
                modelo: true,
                sku: true,
                imagenWeb: true,
                tituloWeb: true,
                descripcionWeb: true,
                categoria: true
            }
        });

        return {
            success: true,
            activos: activos.map(a => ({
                id: a.id,
                name: a.descripcionCorta,
                internalDescription: a.descripcionDetallada || '',
                brand: a.marca || 'N/A',
                model: a.modelo || 'N/A',
                code: a.idQr,
                imageUrl: a.imagenUrl,
                imagenWeb: a.imagenWeb || '',
                tituloWeb: a.tituloWeb || '',
                descripcionWeb: a.descripcionWeb || '',
                type: 'activo' as const,
                cost: a.costoAdq ? Number(a.costoAdq) : null,
                category: a.categoria?.nombre || 'equipos'
            })),
            productos: productos.map(p => ({
                id: p.id,
                name: p.nombre,
                internalDescription: p.descripcion || '',
                brand: p.marca || 'N/A',
                model: p.modelo || 'N/A',
                code: p.sku,
                imageUrl: null, // No image field on original Producto model
                imagenWeb: p.imagenWeb || '',
                tituloWeb: p.tituloWeb || '',
                descripcionWeb: p.descripcionWeb || '',
                type: 'producto' as const,
                cost: null,
                category: p.categoria || 'consumibles'
            }))
        };
    } catch (error: any) {
        console.error('Error searching inventory:', error);
        return { success: false, error: error.message };
    }
}

export async function updateItemWebFields(
    id: string,
    type: 'activo' | 'producto',
    fields: { imagenWeb?: string; tituloWeb?: string; descripcionWeb?: string }
) {
    try {
        await checkAdminAuth();
        const itemId = getUuidFromParam(id);

        const data: { imagenWeb?: string | null; tituloWeb?: string | null; descripcionWeb?: string | null } = {};

        if (fields.imagenWeb !== undefined) data.imagenWeb = fields.imagenWeb.trim() || null;
        if (fields.tituloWeb !== undefined) data.tituloWeb = fields.tituloWeb.trim() || null;
        if (fields.descripcionWeb !== undefined) data.descripcionWeb = fields.descripcionWeb.trim() || null;

        if (type === 'activo') {
            await prisma.activoFijo.update({
                where: { id: itemId },
                data
            });
        } else {
            await prisma.producto.update({
                where: { id: itemId },
                data
            });
        }

        revalidatePath('/admin/gestion-web');
        revalidatePath('/landing');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating item web fields:', error);
        return { success: false, error: error.message || 'Error al guardar los datos personalizados' };
    }
}

export async function updateItemImage(id: string, type: 'activo' | 'producto', imageUrl: string) {
    // Keep this as a wrapper for safety/backward compatibility, directing to updateItemWebFields
    return updateItemWebFields(id, type, { imagenWeb: imageUrl });
}

export async function getPaginatedInventoryItems(page: number, limit: number, query = '', sourceFilter: 'all' | 'scraped' | 'own' = 'all') {
    try {
        const dbUser = await checkAdminAuth();
        const search = query.trim();

        // Asset filter
        const assetsWhere: any = {
            organizationId: dbUser.organizationId,
            estatusContable: 'VIGENTE',
            NOT: [
                { area: { equals: 'SERVICIOS', mode: 'insensitive' } }
            ]
        };
        if (search) {
            const tokens = search.split(/\s+/).filter(Boolean);
            if (tokens.length > 0) {
                assetsWhere.AND = tokens.map(token => ({
                    OR: [
                        { descripcionCorta: { contains: token, mode: 'insensitive' } },
                        { marca: { contains: token, mode: 'insensitive' } },
                        { modelo: { contains: token, mode: 'insensitive' } },
                        { idQr: { contains: token, mode: 'insensitive' } }
                    ]
                }));
            }
        }

        // Product filter
        const productsWhere: any = {
            organizationId: dbUser.organizationId,
            estado: 'ACTIVO',
            esServicio: false
        };
        if (search) {
            const tokens = search.split(/\s+/).filter(Boolean);
            if (tokens.length > 0) {
                productsWhere.AND = tokens.map(token => ({
                    OR: [
                        { nombre: { contains: token, mode: 'insensitive' } },
                        { marca: { contains: token, mode: 'insensitive' } },
                        { modelo: { contains: token, mode: 'insensitive' } },
                        { sku: { contains: token, mode: 'insensitive' } }
                    ]
                }));
            }
        }

        // Apply source filters (scraped SOMA products vs own inventory)
        if (sourceFilter === 'scraped') {
            productsWhere.OR = [
                { sku: { startsWith: 'SOMA-' } },
                { sku: { startsWith: 'REP-' } },
                { sku: { startsWith: 'PUKANG-' } },
                { sku: { startsWith: 'JOSON-' } },
                { sku: { startsWith: 'AERTI-' } },
                { sku: { startsWith: 'DRE-' } }
            ];
        } else if (sourceFilter === 'own') {
            if (!productsWhere.AND) {
                productsWhere.AND = [];
            }
            productsWhere.AND.push(
                { sku: { not: { startsWith: 'SOMA-' } } },
                { sku: { not: { startsWith: 'REP-' } } },
                { sku: { not: { startsWith: 'PUKANG-' } } },
                { sku: { not: { startsWith: 'JOSON-' } } },
                { sku: { not: { startsWith: 'AERTI-' } } },
                { sku: { not: { startsWith: 'DRE-' } } }
            );
        }

        const assetsCount = sourceFilter === 'scraped' ? 0 : await prisma.activoFijo.count({ where: assetsWhere });
        const productsCount = await prisma.producto.count({ where: productsWhere });
        const totalItems = assetsCount + productsCount;
        const totalPages = Math.ceil(totalItems / limit);

        const skip = (page - 1) * limit;
        let items: any[] = [];

        if (skip < assetsCount) {
            // Fetch assets
            const assets = await prisma.activoFijo.findMany({
                where: assetsWhere,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    descripcionCorta: true,
                    descripcionDetallada: true,
                    marca: true,
                    modelo: true,
                    idQr: true,
                    imagenUrl: true,
                    imagenWeb: true,
                    tituloWeb: true,
                    descripcionWeb: true,
                    costoAdq: true,
                    categoria: {
                        select: {
                            nombre: true
                        }
                    }
                }
            });

            items = assets.map(a => ({
                id: a.id,
                name: a.descripcionCorta,
                internalDescription: a.descripcionDetallada || '',
                brand: a.marca || 'N/A',
                model: a.modelo || 'N/A',
                code: a.idQr,
                imageUrl: a.imagenUrl,
                imagenWeb: a.imagenWeb || '',
                tituloWeb: a.tituloWeb || '',
                descripcionWeb: a.descripcionWeb || '',
                type: 'activo' as const,
                cost: a.costoAdq ? Number(a.costoAdq) : null,
                category: a.categoria?.nombre || 'equipos'
            }));

            // If we still have space in the page, fetch products
            if (items.length < limit) {
                const remaining = limit - items.length;
                const products = await prisma.producto.findMany({
                    where: productsWhere,
                    orderBy: { createdAt: 'desc' },
                    skip: 0,
                    take: remaining,
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        marca: true,
                        modelo: true,
                        sku: true,
                        imagenWeb: true,
                        tituloWeb: true,
                        descripcionWeb: true,
                        categoria: true
                    }
                });

                items = [
                    ...items,
                    ...products.map(p => ({
                        id: p.id,
                        name: p.nombre,
                        internalDescription: p.descripcion || '',
                        brand: p.marca || 'N/A',
                        model: p.modelo || 'N/A',
                        code: p.sku,
                        imageUrl: null,
                        imagenWeb: p.imagenWeb || '',
                        tituloWeb: p.tituloWeb || '',
                        descripcionWeb: p.descripcionWeb || '',
                        type: 'producto' as const,
                        cost: null,
                        category: p.categoria || 'consumibles'
                    }))
                ];
            }
        } else {
            // Fetch only products
            const productSkip = skip - assetsCount;
            const products = await prisma.producto.findMany({
                where: productsWhere,
                orderBy: { createdAt: 'desc' },
                skip: productSkip,
                take: limit,
                select: {
                    id: true,
                    nombre: true,
                    descripcion: true,
                    marca: true,
                    modelo: true,
                    sku: true,
                    imagenWeb: true,
                    tituloWeb: true,
                    descripcionWeb: true,
                    categoria: true
                }
            });

            items = products.map(p => ({
                id: p.id,
                name: p.nombre,
                internalDescription: p.descripcion || '',
                brand: p.marca || 'N/A',
                model: p.modelo || 'N/A',
                code: p.sku,
                imageUrl: null,
                imagenWeb: p.imagenWeb || '',
                tituloWeb: p.tituloWeb || '',
                descripcionWeb: p.descripcionWeb || '',
                type: 'producto' as const,
                cost: null,
                category: p.categoria || 'consumibles'
            }));
        }

        return {
            success: true,
            items,
            totalItems,
            totalPages,
            currentPage: page
        };

    } catch (error: any) {
        console.error('Error fetching paginated web inventory:', error);
        return { success: false, error: error.message || 'Error al cargar catálogo' };
    }
}

// Web Contacts actions
export async function getWebContacts() {
    try {
        await checkAdminAuth();

        const contacts = await prisma.webContact.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return {
            success: true,
            contacts: contacts.map(c => ({
                id: c.id,
                nombre: c.nombre,
                telefono: c.telefono,
                correo: c.correo,
                mensaje: c.mensaje,
                estado: c.estado,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
            }))
        };
    } catch (error: any) {
        console.error('Error fetching web contacts:', error);
        return { success: false, error: error.message || 'Error al obtener contactos web' };
    }
}

export async function updateContactStatus(id: string, estado: string) {
    try {
        await checkAdminAuth();

        const updated = await prisma.webContact.update({
            where: { id },
            data: { estado }
        });

        revalidatePath('/admin/gestion-web');
        return { 
            success: true, 
            contact: {
                id: updated.id,
                nombre: updated.nombre,
                telefono: updated.telefono,
                correo: updated.correo,
                mensaje: updated.mensaje,
                estado: updated.estado,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            }
        };
    } catch (error: any) {
        console.error('Error updating contact status:', error);
        return { success: false, error: error.message || 'Error al actualizar el estado' };
    }
}

export async function deleteWebContact(id: string) {
    try {
        await checkAdminAuth();

        await prisma.webContact.delete({
            where: { id }
        });

        revalidatePath('/admin/gestion-web');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting web contact:', error);
        return { success: false, error: error.message || 'Error al eliminar contacto web' };
    }
}

// Web Traffic / Live Activity actions
export async function getWebTraffic(minutesLimit: number = 15) {
    try {
        await checkAdminAuth();

        // 1. Get recent logs (e.g., last 200 logs)
        const logs = await prisma.webTraffic.findMany({
            orderBy: { timestamp: 'desc' },
            take: 200
        });

        // 2. Calculate active visitors (visitors who logged traffic in the last N minutes)
        const timeThreshold = new Date(Date.now() - minutesLimit * 60 * 1000);
        
        const activeVisitorsLogs = await prisma.webTraffic.findMany({
            where: {
                timestamp: {
                    gte: timeThreshold
                }
            },
            select: {
                ip: true,
                pais: true,
                ciudad: true,
                dispositivo: true,
                browser: true,
                so: true,
                pagina: true,
                timestamp: true
            },
            orderBy: { timestamp: 'desc' }
        });

        // Group by IP to count unique online visitors
        const uniqueVisitorsMap = new Map<string, any>();
        activeVisitorsLogs.forEach(log => {
            if (!uniqueVisitorsMap.has(log.ip)) {
                uniqueVisitorsMap.set(log.ip, {
                    ip: log.ip,
                    pais: log.pais || 'Desconocido',
                    ciudad: log.ciudad || 'Desconocido',
                    dispositivo: log.dispositivo || 'Desktop',
                    browser: log.browser || 'Chrome',
                    so: log.so || 'Windows',
                    lastPage: log.pagina,
                    lastActive: log.timestamp.toISOString(),
                    pagesVisited: [log.pagina]
                });
            } else {
                const existing = uniqueVisitorsMap.get(log.ip);
                if (!existing.pagesVisited.includes(log.pagina)) {
                    existing.pagesVisited.push(log.pagina);
                }
            }
        });

        const activeVisitors = Array.from(uniqueVisitorsMap.values());

        // 3. Page views breakdown (top pages from all logs)
        const pagesMap: Record<string, number> = {};
        logs.forEach(log => {
            pagesMap[log.pagina] = (pagesMap[log.pagina] || 0) + 1;
        });
        const topPages = Object.entries(pagesMap)
            .map(([page, count]) => ({ page, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            success: true,
            logs: logs.map(l => ({
                id: l.id,
                ip: l.ip,
                pais: l.pais,
                ciudad: l.ciudad,
                dispositivo: l.dispositivo,
                browser: l.browser,
                so: l.so,
                userAgent: l.userAgent,
                pagina: l.pagina,
                timestamp: l.timestamp.toISOString()
            })),
            activeCount: activeVisitors.length,
            activeVisitors,
            topPages
        };
    } catch (error: any) {
        console.error('Error fetching web traffic:', error);
        return { success: false, error: error.message || 'Error al obtener tráfico web' };
    }
}

export async function getInventoryItemById(id: string) {
    try {
        const dbUser = await checkAdminAuth();
        const itemId = getUuidFromParam(id);

        // 1. Try finding in ActivoFijo
        const asset = await prisma.activoFijo.findFirst({
            where: { id: itemId, organizationId: dbUser.organizationId },
            include: { categoria: true }
        });

        if (asset) {
            return {
                success: true,
                item: {
                    id: asset.id,
                    name: asset.descripcionCorta,
                    internalDescription: asset.descripcionDetallada || '',
                    brand: asset.marca || 'N/A',
                    model: asset.modelo || 'N/A',
                    code: asset.idQr,
                    imageUrl: asset.imagenUrl,
                    imagenWeb: asset.imagenWeb || '',
                    tituloWeb: asset.tituloWeb || '',
                    descripcionWeb: asset.descripcionWeb || '',
                    type: 'activo' as const,
                    cost: asset.costoAdq ? Number(asset.costoAdq) : null,
                    category: asset.categoria?.nombre || 'equipos'
                }
            };
        }

        // 2. Try finding in Producto
        const product = await prisma.producto.findFirst({
            where: { id: itemId, organizationId: dbUser.organizationId }
        });

        if (product) {
            return {
                success: true,
                item: {
                    id: product.id,
                    name: product.nombre,
                    internalDescription: product.descripcion || '',
                    brand: product.marca || 'N/A',
                    model: product.modelo || 'N/A',
                    code: product.sku,
                    imageUrl: null,
                    imagenWeb: product.imagenWeb || '',
                    tituloWeb: product.tituloWeb || '',
                    descripcionWeb: product.descripcionWeb || '',
                    type: 'producto' as const,
                    cost: null,
                    category: product.categoria || 'consumibles'
                }
            };
        }

        return { success: false, error: 'Producto / Equipo no encontrado' };
    } catch (error: any) {
        console.error('Error fetching item by id:', error);
        return { success: false, error: error.message || 'Error al cargar el producto' };
    }
}

export async function deleteInventoryItem(id: string, type: 'activo' | 'producto') {
    try {
        await checkAdminAuth();
        const itemId = getUuidFromParam(id);

        if (type === 'activo') {
            try {
                // Try complete deletion first
                await prisma.activoFijo.delete({
                    where: { id: itemId }
                });
            } catch (deleteError) {
                console.warn('Could not hard delete activo, marking as ELIMINADO:', deleteError);
                // Fallback to soft delete
                await prisma.activoFijo.update({
                    where: { id: itemId },
                    data: { estatusContable: 'ELIMINADO' }
                });
            }
        } else {
            try {
                // Try complete deletion first
                await prisma.producto.delete({
                    where: { id: itemId }
                });
            } catch (deleteError) {
                console.warn('Could not hard delete producto, marking as INACTIVO:', deleteError);
                // Fallback to soft delete
                await prisma.producto.update({
                    where: { id: itemId },
                    data: { estado: 'INACTIVO' }
                });
            }
        }

        revalidatePath('/admin/gestion-web');
        revalidatePath('/landing');
        revalidatePath('/landing/productos');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting inventory item:', error);
        return { success: false, error: error.message || 'Error al eliminar el producto' };
    }
}

export async function getImportedCategories() {
    try {
        await checkAdminAuth();
        const products = await prisma.producto.findMany({
            where: {
                estado: 'ACTIVO',
                OR: [
                    { sku: { startsWith: 'SOMA-' } },
                    { sku: { startsWith: 'REP-' } },
                    { sku: { startsWith: 'PUKANG-' } },
                    { sku: { startsWith: 'JOSON-' } },
                    { sku: { startsWith: 'AERTI-' } },
                    { sku: { startsWith: 'DRE-' } }
                ]
            },
            select: {
                categoria: true
            }
        });
        const uniqueCategories = Array.from(new Set(products.map(p => p.categoria).filter(Boolean))) as string[];
        return { success: true, categories: uniqueCategories };
    } catch (error: any) {
        console.error('Error fetching imported categories:', error);
        return { success: false, categories: [] };
    }
}
