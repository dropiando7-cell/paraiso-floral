'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { triggerNotification } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';

// Helper to authenticate any active user
async function checkAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        throw new Error('No autorizado');
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: {
            id: true,
            email: true,
            role: true,
            accessibleModules: true,
            organizationId: true
        }
    });

    if (!dbUser) {
        throw new Error('Usuario no encontrado');
    }

    return dbUser;
}

// Helper to check for admin-level permission
async function checkAdminAuth() {
    const dbUser = await checkAuth();
    
    const hasAccess = (dbUser.accessibleModules || []).includes('/admin/notificaciones');
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && !hasAccess) {
        throw new Error('Permisos insuficientes para administrar notificaciones');
    }

    return dbUser;
}

/**
 * Obtiene las notificaciones del usuario autenticado (últimas 50 activas)
 */
export async function getUserNotifications() {
    try {
        const dbUser = await checkAuth();

        const notifications = await prisma.notification.findMany({
            where: {
                userId: dbUser.id,
                anuladaAt: null
            },
            select: {
                id: true,
                title: true,
                message: true,
                type: true,
                read: true,
                readAt: true,
                link: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        return { success: true, notifications };
    } catch (err: any) {
        console.error('Error fetching notifications:', err);
        return { success: false, error: err.message || 'Error al obtener notificaciones', notifications: [] };
    }
}

/**
 * Marca una notificación específica como leída
 */
export async function markNotificationAsRead(id: string) {
    try {
        const dbUser = await checkAuth();

        await prisma.notification.update({
            where: {
                id,
                userId: dbUser.id
            },
            data: {
                read: true,
                readAt: new Date()
            }
        });

        revalidatePath('/');
        return { success: true };
    } catch (err: any) {
        console.error('Error marking notification as read:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Marca todas las notificaciones del usuario como leídas
 */
export async function markAllNotificationsAsRead() {
    try {
        const dbUser = await checkAuth();

        await prisma.notification.updateMany({
            where: {
                userId: dbUser.id,
                read: false,
                anuladaAt: null
            },
            data: {
                read: true,
                readAt: new Date()
            }
        });

        revalidatePath('/');
        return { success: true };
    } catch (err: any) {
        console.error('Error marking all notifications as read:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Realiza el borrado lógico (anulación) de una notificación específica
 */
export async function deleteNotification(id: string) {
    try {
        const dbUser = await checkAuth();

        await prisma.notification.update({
            where: {
                id,
                userId: dbUser.id
            },
            data: {
                anuladaAt: new Date(),
                anuladaPorId: dbUser.id
            }
        });

        revalidatePath('/');
        return { success: true };
    } catch (err: any) {
        console.error('Error deleting notification:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Registra o actualiza el OneSignal Subscription ID del usuario actual
 */
export async function registerOneSignalSubscription(subscriptionId: string | null) {
    try {
        const dbUser = await checkAuth();

        // Si ya está registrado en otro usuario, limpiar primero para mantener el unique
        if (subscriptionId) {
            await prisma.user.updateMany({
                where: {
                    oneSignalSubscriptionId: subscriptionId,
                    id: { not: dbUser.id }
                },
                data: {
                    oneSignalSubscriptionId: null
                }
            });
        }

        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                oneSignalSubscriptionId: subscriptionId
            }
        });

        return { success: true };
    } catch (err: any) {
        console.error('Error registering OneSignal subscription:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Obtiene estadísticas y lista de usuarios con estado de notificaciones
 */
export async function getNotificationsAdminData() {
    try {
        const dbUser = await checkAdminAuth();

        const staffUsers = await prisma.user.findMany({
            where: {
                organizationId: dbUser.organizationId,
                role: { in: ['SUPER_ADMIN', 'ORG_ADMIN', 'USER', 'GERENTE', 'INVENTARIO_EDITOR'] }
            },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                role: true,
                puesto: true,
                oneSignalSubscriptionId: true
            },
            orderBy: {
                nombre: 'asc'
            }
        });

        // Contar el total de notificaciones enviadas y leídas en la organización
        const totalSentCount = await prisma.notification.count({
            where: {
                user: { organizationId: dbUser.organizationId },
                anuladaAt: null
            }
        });

        const readCount = await prisma.notification.count({
            where: {
                user: { organizationId: dbUser.organizationId },
                read: true,
                anuladaAt: null
            }
        });

        return {
            success: true,
            users: staffUsers,
            stats: {
                totalUsers: staffUsers.length,
                registeredPushUsers: staffUsers.filter(u => u.oneSignalSubscriptionId !== null).length,
                totalSentCount,
                readCount
            }
        };
    } catch (err: any) {
        console.error('Error fetching notifications admin data:', err);
        return { success: false, error: err.message, users: [], stats: { totalUsers: 0, registeredPushUsers: 0, totalSentCount: 0, readCount: 0 } };
    }
}

/**
 * Envía una notificación manual (Broadcast a todos o dirigidas a usuarios específicos)
 */
export async function sendManualNotification(
    targetUserIds: string[] | 'all',
    title: string,
    message: string,
    link?: string
) {
    try {
        const dbUser = await checkAdminAuth();

        let recipientIds: string[] = [];

        if (targetUserIds === 'all') {
            const allUsers = await prisma.user.findMany({
                where: { organizationId: dbUser.organizationId },
                select: { id: true }
            });
            recipientIds = allUsers.map(u => u.id);
        } else {
            recipientIds = targetUserIds;
        }

        if (recipientIds.length === 0) {
            return { success: false, error: 'No se encontraron destinatarios válidos' };
        }

        // Despachar notificaciones
        let successCount = 0;
        for (const targetId of recipientIds) {
            const res = await triggerNotification(
                targetId,
                title,
                message,
                link || undefined,
                'SYSTEM',
                dbUser.id
            );
            if (res) successCount++;
        }

        return { success: true, count: successCount };
    } catch (err: any) {
        console.error('Error sending manual notification:', err);
        return { success: false, error: err.message };
    }
}
