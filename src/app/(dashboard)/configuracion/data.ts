'use server';

import { prisma } from '@/lib/prisma';

export async function getUserPreferencesData(email: string) {
    if (!email) return null;

    try {
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: {
                defaultModule: true,
                timezone: true,
                theme: true,
                idleTimeoutEnabled: true,
                enableVoiceAi: true,
                role: true,
                accessibleModules: true,
                organizationId: true,
                organization: {
                    select: {
                        invoiceSettings: true
                    }
                }
            }
        });
        if (!user) return null;

        const invoiceSettings = (user.organization?.invoiceSettings as any) || {};
        
        return {
            ...user,
            allowZeroStockBilling: invoiceSettings.allowZeroStockBilling ?? true
        };
    } catch (error) {
        console.error("Error fetching user preferences data", error);
        return null;
    }
}
