"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCalendarIntegration() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! }
    });

    if (!dbUser) return null;

    const integration = await prisma.calendarIntegration.findFirst({
        where: {
            userId: dbUser.id,
            organizationId: dbUser.organizationId
        }
    });

    return integration;
}

export async function getTasks() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! }
    });

    if (!dbUser) return [];

    return await prisma.task.findMany({
        where: {
            organizationId: dbUser.organizationId,
            status: {
                not: 'DONE'
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
}

export async function createTask(data: { title: string, description?: string, priority?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! }
    });

    if (!dbUser) return { error: "Usuario no encontrado en bd" };

    const task = await prisma.task.create({
        data: {
            organizationId: dbUser.organizationId,
            title: data.title,
            description: data.description || null,
            priority: data.priority || "MEDIUM"
        }
    });

    revalidatePath("/calendario");
    return { success: true, task };
}

export async function saveGoogleTokens(accessToken: string, refreshToken: string, email: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! }
    });

    if (!dbUser) return { error: "Usuario no encontrado" };

    await prisma.calendarIntegration.upsert({
        where: {
            userId_organizationId: {
                userId: dbUser.id,
                organizationId: dbUser.organizationId
            }
        },
        update: {
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleEmail: email
        },
        create: {
            userId: dbUser.id,
            organizationId: dbUser.organizationId,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleEmail: email
        }
    });

    revalidatePath("/calendario");
    return { success: true };
}
