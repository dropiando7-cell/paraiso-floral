'use server';
import { prisma } from '@/lib/prisma';

export async function getUserProfileData(email: string) {
    if (!email) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                phoneNumber: true,
                role: true,
                customRoleName: true
            }
        });
        return user;
    } catch (error) {
        console.error("Error fetching user profile data", error);
        return null;
    }
}
