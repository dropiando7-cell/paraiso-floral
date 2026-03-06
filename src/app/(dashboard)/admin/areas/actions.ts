'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function getOrgId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) redirect('/unauthorized');
    return dbUser.organizationId;
}

export async function getAreas() {
    const orgId = await getOrgId();
    return prisma.area.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' },
    });
}

export async function createArea(formData: FormData) {
    const orgId = await getOrgId();
    const name = formData.get('name') as string;
    const prefix = formData.get('prefix') as string;
    const description = (formData.get('description') as string) || null;

    // Auto-generar un QR base si no viene
    const fallbackQr = `ELIM-QR-GEN-${name.replace(/[^A-Z0-9]/g, '-')}`;
    const qrCode = (formData.get('qrCode') as string) || fallbackQr;

    try {
        await prisma.area.create({
            data: {
                organizationId: orgId,
                name,
                prefix,
                description,
                qrCode
            }
        });
        revalidatePath('/admin/areas');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateArea(id: string, formData: FormData) {
    const orgId = await getOrgId();
    const name = formData.get('name') as string;
    const prefix = formData.get('prefix') as string;
    const qrCode = formData.get('qrCode') as string;
    const description = (formData.get('description') as string) || null;

    try {
        await prisma.area.updateMany({
            where: { id, organizationId: orgId },
            data: { name, prefix, qrCode, description }
        });
        revalidatePath('/admin/areas');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteArea(id: string) {
    const orgId = await getOrgId();
    try {
        await prisma.area.deleteMany({
            where: { id, organizationId: orgId }
        });
        revalidatePath('/admin/areas');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: 'No se puede eliminar el área. Posiblemente hay registros usándola.' };
    }
}
