'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { uploadToR2 } from '@/lib/storage/r2';
import { redirect } from 'next/navigation';

// ─── Helper: Get authenticated org ID ────────────────────────────────────────
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

// ─── Auto-generate ID QR ─────────────────────────────────────────────────────
async function generateIdQr(organizationId: string, area: string): Promise<string> {
    // Count existing activos in this area for this org
    const count = await prisma.activoFijo.count({
        where: { organizationId, area },
    });
    const correlative = String(count + 1).padStart(4, '0');
    return `${area}-${correlative}`;
}

// ─── READ: List with pagination, search, filters ─────────────────────────────
export async function getActivos(page = 1, search = '', area = '', estatus = '') {
    const orgId = await getOrgId();
    const PER_PAGE = 10;
    const skip = (page - 1) * PER_PAGE;

    const where = {
        organizationId: orgId,
        ...(search && {
            OR: [
                { descripcionCorta: { contains: search, mode: 'insensitive' as const } },
                { idQr: { contains: search, mode: 'insensitive' as const } },
                { serie: { contains: search, mode: 'insensitive' as const } },
                { modelo: { contains: search, mode: 'insensitive' as const } },
                { responsable: { contains: search, mode: 'insensitive' as const } },
            ],
        }),
        ...(area && { area }),
        ...(estatus && { estatusContable: estatus }),
    };

    const [activos, total] = await Promise.all([
        prisma.activoFijo.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: PER_PAGE,
        }),
        prisma.activoFijo.count({ where }),
    ]);

    return { activos, total, totalPages: Math.ceil(total / PER_PAGE) };
}

// ─── READ: Stats for cards ───────────────────────────────────────────────────
export async function getActivoStats() {
    const orgId = await getOrgId();

    const [total, vigente, depreciado, procesoBaja, conDano, areasCount] = await Promise.all([
        prisma.activoFijo.count({ where: { organizationId: orgId } }),
        prisma.activoFijo.count({ where: { organizationId: orgId, estatusContable: 'VIGENTE' } }),
        prisma.activoFijo.count({ where: { organizationId: orgId, estatusContable: 'DEPRECIADO' } }),
        prisma.activoFijo.count({ where: { organizationId: orgId, estatusContable: 'PROCESO DE BAJA' } }),
        prisma.activoFijo.count({ where: { organizationId: orgId, estadoDano: { not: null } } }),
        prisma.activoFijo.groupBy({ by: ['area'], where: { organizationId: orgId } }),
    ]);

    return { total, vigente, depreciado, procesoBaja, conDano, areasRegistradas: areasCount.length };
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createActivo(formData: FormData) {
    const orgId = await getOrgId();

    const area = formData.get('area') as string;
    const idQr = await generateIdQr(orgId, area);

    const costoStr = formData.get('costoAdq') as string;
    const fechaStr = formData.get('fechaAdq') as string;

    await prisma.activoFijo.create({
        data: {
            organizationId: orgId,
            idQr,
            area,
            descripcionCorta: formData.get('descripcionCorta') as string,
            descripcionDetallada: (formData.get('descripcionDetallada') as string) || null,
            serie: (formData.get('serie') as string) || null,
            modelo: (formData.get('modelo') as string) || null,
            cuentaAct: formData.get('cuentaAct') as string,
            estatusContable: (formData.get('estatusContable') as string) || 'VIGENTE',
            fechaAdq: fechaStr ? new Date(fechaStr) : null,
            integrado: formData.get('integrado') === 'true',
            costoAdq: costoStr ? parseFloat(costoStr) : null,
            origenActivo: (formData.get('origenActivo') as string) || null,
            imagenUrl: (formData.get('imagenUrl') as string) || null,
            imagenPlacaUrl: (formData.get('imagenPlacaUrl') as string) || null,
            estadoDano: (formData.get('estadoDano') as string) || null,
            tipoIncidencia: (formData.get('tipoIncidencia') as string) || null,
            accionRecomendada: (formData.get('accionRecomendada') as string) || null,
            responsable: (formData.get('responsable') as string) || null,
            observaciones: (formData.get('observaciones') as string) || null,
        },
    });

    revalidatePath('/inventario');
    return { success: true, idQr };
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function updateActivo(id: string, formData: FormData) {
    const orgId = await getOrgId();

    const costoStr = formData.get('costoAdq') as string;
    const fechaStr = formData.get('fechaAdq') as string;

    await prisma.activoFijo.updateMany({
        where: { id, organizationId: orgId },
        data: {
            descripcionCorta: formData.get('descripcionCorta') as string,
            descripcionDetallada: (formData.get('descripcionDetallada') as string) || null,
            serie: (formData.get('serie') as string) || null,
            modelo: (formData.get('modelo') as string) || null,
            area: formData.get('area') as string,
            cuentaAct: formData.get('cuentaAct') as string,
            estatusContable: formData.get('estatusContable') as string,
            fechaAdq: fechaStr ? new Date(fechaStr) : null,
            integrado: formData.get('integrado') === 'true',
            costoAdq: costoStr ? parseFloat(costoStr) : null,
            origenActivo: (formData.get('origenActivo') as string) || null,
            imagenUrl: (formData.get('imagenUrl') as string) || null,
            imagenPlacaUrl: (formData.get('imagenPlacaUrl') as string) || null,
            estadoDano: (formData.get('estadoDano') as string) || null,
            tipoIncidencia: (formData.get('tipoIncidencia') as string) || null,
            accionRecomendada: (formData.get('accionRecomendada') as string) || null,
            responsable: (formData.get('responsable') as string) || null,
            observaciones: (formData.get('observaciones') as string) || null,
        },
    });

    revalidatePath('/inventario');
    return { success: true };
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function deleteActivo(id: string) {
    const orgId = await getOrgId();
    await prisma.activoFijo.deleteMany({ where: { id, organizationId: orgId } });
    revalidatePath('/inventario');
    return { success: true };
}

// ─── UPLOAD IMAGE to R2 ──────────────────────────────────────────────────────
export async function uploadActivoImage(formData: FormData): Promise<{ url: string }> {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `activos/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const url = await uploadToR2(buffer, fileName, file.type);
    return { url };
}

// ─── PREVIEW ID QR (for form) ────────────────────────────────────────────────
export async function previewIdQr(area: string): Promise<string> {
    const orgId = await getOrgId();
    return generateIdQr(orgId, area);
}
