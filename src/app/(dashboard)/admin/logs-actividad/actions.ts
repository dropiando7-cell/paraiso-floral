'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function getLiveUsers() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) {
            throw new Error('Unauthorized');
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        });
        if (!dbUser) {
            throw new Error('Unauthorized');
        }

        // Active threshold is 45 seconds (allows for slightly latent heartbeats)
        const threshold = new Date(Date.now() - 45 * 1000);
        const onlineUsers = await prisma.user.findMany({
            where: {
                organizationId: dbUser.organizationId,
                lastActiveAt: {
                    gt: threshold
                }
            },
            select: {
                id: true,
                email: true,
                nombre: true,
                apellido: true,
                role: true,
                customRoleName: true,
                puesto: true,
                avatarUrl: true,
                lastActiveAt: true,
                currentModule: true,
                isIdle: true
            },
            orderBy: {
                lastActiveAt: 'desc'
            }
        });

        return { success: true, onlineUsers };
    } catch (error: any) {
        console.error("Error in getLiveUsers server action:", error);
        return { success: false, error: error.message };
    }
}

export async function getActivityLogs(filters: {
    userId?: string;
    action?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) {
            throw new Error('Unauthorized');
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        });
        if (!dbUser) {
            throw new Error('Unauthorized');
        }

        // Only SUPER_ADMIN or authorized modules can read activity logs
        const hasAccess = dbUser.role === 'SUPER_ADMIN' || (dbUser.accessibleModules || []).includes('/admin/logs-actividad');
        if (!hasAccess) {
            throw new Error('Forbidden');
        }

        const page = filters.page || 1;
        const pageSize = filters.pageSize || 50;
        const { userId, action, module, startDate, endDate, search } = filters;

        const where: any = {
            organizationId: dbUser.organizationId
        };

        if (userId && userId !== 'ALL') {
            where.userId = userId;
        }
        if (action && action !== 'ALL') {
            where.action = action;
        }
        if (module && module !== 'ALL') {
            where.module = module;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        if (search) {
            where.description = {
                contains: search,
                mode: 'insensitive'
            };
        }

        const total = await prisma.activityLog.count({ where });
        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        nombre: true,
                        apellido: true,
                        role: true,
                        customRoleName: true,
                        puesto: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page - 1) * pageSize,
            take: pageSize
        });

        // Fetch user list for filters
        const allUsers = await prisma.user.findMany({
            where: {
                organizationId: dbUser.organizationId
            },
            select: {
                id: true,
                email: true,
                nombre: true,
                apellido: true
            },
            orderBy: {
                nombre: 'asc'
            }
        });

        return {
            success: true,
            logs,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page,
            allUsers
        };
    } catch (error: any) {
        console.error("Error in getActivityLogs server action:", error);
        return { success: false, error: error.message };
    }
}
