'use server';

import { prisma } from '@/lib/prisma';

export async function getUserPreferencesData(email: string) {
    if (!email) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                defaultModule: true,
                timezone: true,
                theme: true,
                idleTimeoutEnabled: true,
                role: true,
                accessibleModules: true
            }
        });
        return user;
    } catch (error) {
        console.error("Error fetching user preferences data", error);
        return null;
    }
}
