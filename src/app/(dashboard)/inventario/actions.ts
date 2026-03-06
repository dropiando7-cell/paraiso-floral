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

// Mapa basado en Codigos_Activos_Elim_CORRECTO.csv para códigos base
const PREFIX_MAP: Record<string, string> = {
    'PB-A1-OF.PASTOR': 'ELIM-PB-A01-OF',
    'PB-A2-OF.ADM': 'ELIM-PB-A02-OF',
    'PB-A3-S.CUNA': 'ELIM-PB-A03-SC',
    'PB-A4-ENFERM': 'ELIM-PB-A04-EN',
    'PB-A5-S.JUNTAS': 'ELIM-PB-A05-SJ',
    'PB-A6-COCINETA': 'ELIM-PB-A06-CK',
    'PB-A7-OF.JOVEN': 'ELIM-PB-A07-OF',
    'PB-A8-OF.EB': 'ELIM-PB-A08-OF',
    'PB-A9-EB': 'ELIM-PB-A09-EB',
    'PB-A10-EB': 'ELIM-PB-A10-EB',
    'PB-A11-COCIN CAF': 'ELIM-PB-A11-CA',
    'PB-A12-SALON CAF': 'ELIM-PB-A12-CA',
    'PB-A13-AUDIO': 'ELIM-PB-A13-AU',
    'PB-A14-MULTI': 'ELIM-PB-A14-ML',
    'PB-A15-TEMPLO': 'ELIM-PB-A15-TM',
    'PB-A16-PLATAFO': 'ELIM-PB-A16-PL',
    'PB-A17-OF.REC': 'ELIM-PB-A17-RC',
    'PB-A18-OF. IMCE': 'ELIM-PB-A18-OF',
    'PA-A1-SAL.MUL': 'ELIM-PA-A19-SL',
    'PA-A2-OFICINA': 'ELIM-PA-A20-OF',
    'PA-A3-EB': 'ELIM-PA-A21-EB',
    'PA-A4-EB': 'ELIM-PA-A22-EB',
    'PA-A5-EB': 'ELIM-PA-A23-EB',
    'PA-A6-EB': 'ELIM-PA-A24-EB',
    'PA-B1-PASILLO': 'ELIM-PA-A25-BD',
    'PB-B1-OFICINA': 'ELIM-PB-A26-BD',
    'PB-B2-PASILLO': 'ELIM-PB-A27-BD',
    'PB-B3-TRASERA': 'ELIM-PB-A28-BD',
    'PB-B4-TEMPLO': 'ELIM-PB-A29-BD',
    'PB-B5-TEMPLO': 'ELIM-PB-A30-BD',
    'B6-EXTERNA CV': 'ELIM-EX-A31-BD',
    'PB-A32-PT.VIGILANCIA': 'ELIM-PB-A32-PT',
    'TEST-AREA': 'TEST-AREA', // fallback para test
};

// ─── Auto-generate ID QR ─────────────────────────────────────────────────────
async function generateIdQr(organizationId: string, area: string): Promise<string> {
    // Count existing activos in this area for this org
    const count = await prisma.activoFijo.count({
        where: { organizationId, area },
    });
    const correlative = String(count + 1).padStart(4, '0');
    const prefijo = PREFIX_MAP[area] || area;
    return `${prefijo}-${correlative}`;
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
    const fechaLevStr = formData.get('fechaLevantamiento') as string;

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
            fechaLevantamiento: fechaLevStr ? new Date(fechaLevStr) : null,
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
    const fechaLevStr = formData.get('fechaLevantamiento') as string;

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
            fechaLevantamiento: fechaLevStr ? new Date(fechaLevStr) : null,
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
