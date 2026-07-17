import { prisma } from './prisma';

interface LogActivityParams {
    userId?: string | null;
    organizationId: string;
    action: string;
    module: string;
    description: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: any;
}

/**
 * Logs a user activity into the database for audit and traceability.
 */
export async function logActivity({
    userId,
    organizationId,
    action,
    module,
    description,
    ipAddress,
    userAgent,
    metadata
}: LogActivityParams) {
    try {
        const log = await prisma.activityLog.create({
            data: {
                organizationId,
                userId: userId || null,
                action: action.toUpperCase(),
                module,
                description,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
            }
        });
        return { success: true, log };
    } catch (error) {
        console.error("Error writing activity log to DB:", error);
        return { success: false, error };
    }
}
