'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

// Helper: Get authenticated user context
async function getContextUser(): Promise<{ orgId: string, userId: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) redirect('/unauthorized');
    return { orgId: dbUser.organizationId, userId: dbUser.id };
}

// 1. Buscar Activo por Serie o Código QR
export async function buscarActivoPorSerieOQr(identificador: string) {
    if (!identificador || identificador.trim() === '') return null;
    try {
        const { orgId } = await getContextUser();
        const cleanId = identificador.trim();

        const activo = await prisma.activoFijo.findFirst({
            where: {
                organizationId: orgId,
                OR: [
                    { idQr: { equals: cleanId, mode: 'insensitive' } },
                    { serie: { equals: cleanId, mode: 'insensitive' } }
                ]
            },
            include: {
                producto: true
            }
        });

        if (!activo) return null;

        return {
            id: activo.id,
            idQr: activo.idQr,
            descripcionCorta: activo.descripcionCorta,
            marca: activo.marca || '',
            modelo: activo.modelo || '',
            serie: activo.serie || '',
            estatusContable: activo.estatusContable,
            stock: activo.stock,
            costoAdq: activo.costoAdq ? Number(activo.costoAdq) : 0,
            precioVenta: activo.producto?.precioVenta ? Number(activo.producto.precioVenta) : 0,
            imagenUrl: activo.imagenUrl || null
        };
    } catch (e) {
        console.error('Error en buscarActivoPorSerieOQr:', e);
        return null;
    }
}

// 2. Procesar Reemplazo por Garantía
export async function procesarReemplazoGarantia(
    activoDefectuosoId: string, 
    activoReemplazoId: string, 
    motivo: string,
    firmaBase64?: string | null,
    firmaNombre?: string | null
) {
    try {
        const { orgId, userId } = await getContextUser();

        if (!motivo || motivo.trim() === '') {
            throw new Error('El motivo o hallazgo es obligatorio.');
        }

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                name: true,
                logoUrl: true,
                direccion: true,
                telefono: true,
                rtn: true
            }
        });

        const result = await prisma.$transaction(async (tx) => {
            // 1. Obtener y validar el activo defectuoso
            const defectuoso = await tx.activoFijo.findFirst({
                where: { id: activoDefectuosoId, organizationId: orgId }
            });
            if (!defectuoso) throw new Error('Equipo defectuoso no encontrado.');

            // 2. Obtener y validar el activo de reemplazo
            const reemplazo = await tx.activoFijo.findFirst({
                where: { id: activoReemplazoId, organizationId: orgId }
            });
            if (!reemplazo) throw new Error('Equipo de reemplazo no encontrado.');
            if (reemplazo.estatusContable !== 'VIGENTE') {
                throw new Error(`El equipo de reemplazo (${reemplazo.idQr}) debe estar en estado VIGENTE (actualmente: ${reemplazo.estatusContable}).`);
            }

            // 3. Cambiar estados
            const estadoAnteriorDefectuoso = defectuoso.estatusContable;
            const estadoAnteriorReemplazo = reemplazo.estatusContable;

            // Defectuoso -> EN REPARACION
            await tx.activoFijo.update({
                where: { id: defectuoso.id },
                data: { estatusContable: 'EN REPARACION' }
            });

            // Reemplazo -> VENDIDO (o heredado del estado del defectuoso)
            await tx.activoFijo.update({
                where: { id: reemplazo.id },
                data: { estatusContable: 'VENDIDO' }
            });

            // 4. Crear logs de trazabilidad con firma si aplica
            // Log para el defectuoso
            await tx.historialActivo.create({
                data: {
                    organizationId: orgId,
                    activoId: defectuoso.id,
                    estadoAnterior: estadoAnteriorDefectuoso,
                    estadoNuevo: 'EN REPARACION',
                    motivo: `Retirado por garantía. Entregado reemplazo S/N: ${reemplazo.serie || 'N/A'} (QR: ${reemplazo.idQr}). Detalle: ${motivo.trim()}`,
                    firmaBase64: firmaBase64 || null,
                    firmaNombre: firmaNombre || null,
                    creadoPorId: userId
                }
            });

            // Log para el de reemplazo
            await tx.historialActivo.create({
                data: {
                    organizationId: orgId,
                    activoId: reemplazo.id,
                    estadoAnterior: estadoAnteriorReemplazo,
                    estadoNuevo: 'VENDIDO',
                    motivo: `Entregado como reemplazo de garantía por equipo defectuoso S/N: ${defectuoso.serie || 'N/A'} (QR: ${defectuoso.idQr}).`,
                    firmaBase64: firmaBase64 || null,
                    firmaNombre: firmaNombre || null,
                    creadoPorId: userId
                }
            });

            return {
                success: true,
                error: null,
                org,
                defectuoso: {
                    idQr: defectuoso.idQr,
                    descripcionCorta: defectuoso.descripcionCorta,
                    serie: defectuoso.serie || '—',
                    modelo: defectuoso.modelo || '—',
                    marca: defectuoso.marca || '—'
                },
                reemplazo: {
                    idQr: reemplazo.idQr,
                    descripcionCorta: reemplazo.descripcionCorta,
                    serie: reemplazo.serie || '—',
                    modelo: reemplazo.modelo || '—',
                    marca: reemplazo.marca || '—'
                },
                firmaBase64: firmaBase64 || null,
                firmaNombre: firmaNombre || null,
                motivo: motivo.trim(),
                fecha: new Date().toISOString()
            };
        });

        revalidatePath('/inventario');
        revalidatePath('/inventario/garantias');
        return result;
    } catch (e: any) {
        console.error('Error en procesarReemplazoGarantia:', e);
        return { success: false, error: e.message || 'Error al procesar el reemplazo.' };
    }
}

// 3. Completar Reparación (Técnico lo cambia a VIGENTE)
export async function completarReparacionActivo(activoId: string, motivo: string) {
    try {
        const { orgId, userId } = await getContextUser();

        if (!motivo || motivo.trim() === '') {
            throw new Error('El reporte de reparación es obligatorio.');
        }

        const activo = await prisma.activoFijo.findFirst({
            where: { id: activoId, organizationId: orgId }
        });
        if (!activo) throw new Error('Equipo no encontrado.');

        const estadoAnterior = activo.estatusContable;

        await prisma.$transaction(async (tx) => {
            // Actualizar estado del activo a VIGENTE y remover estado de daño
            await tx.activoFijo.update({
                where: { id: activo.id },
                data: { 
                    estatusContable: 'VIGENTE',
                    estadoDano: null
                }
            });

            // Crear log
            await tx.historialActivo.create({
                data: {
                    organizationId: orgId,
                    activoId: activo.id,
                    estadoAnterior,
                    estadoNuevo: 'VIGENTE',
                    motivo: `Reparación completada. Retornado a inventario disponible. Reporte técnico: ${motivo.trim()}`,
                    creadoPorId: userId
                }
            });
        });

        revalidatePath('/inventario');
        revalidatePath('/inventario/garantias');
        return { success: true, error: null };
    } catch (e: any) {
        console.error('Error en completarReparacionActivo:', e);
        return { success: false, error: e.message || 'Error al completar la reparación.' };
    }
}

// 4. Obtener Historial de Garantías
export async function getHistorialGarantias() {
    try {
        const { orgId } = await getContextUser();

        const logs = await prisma.historialActivo.findMany({
            where: { organizationId: orgId },
            include: {
                activo: true,
                creadoPor: {
                    select: {
                        nombre: true,
                        apellido: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return logs.map(log => ({
            id: log.id,
            activoId: log.activoId,
            idQr: log.activo.idQr,
            descripcion: log.activo.descripcionCorta,
            serie: log.activo.serie || '—',
            estadoAnterior: log.estadoAnterior,
            estadoNuevo: log.estadoNuevo,
            motivo: log.motivo || '—',
            usuario: log.creadoPor ? `${log.creadoPor.nombre || ''} ${log.creadoPor.apellido || ''}`.trim() || log.creadoPor.email.split('@')[0] : '—',
            createdAt: log.createdAt.toISOString()
        }));
    } catch (e) {
        console.error('Error en getHistorialGarantias:', e);
        return [];
    }
}

// 5. Buscar Activos para Autocomplete en Garantías
export async function buscarActivosParaGarantia(query: string, filterStatus?: string) {
    if (!query || query.trim() === '') return [];
    try {
        const { orgId } = await getContextUser();
        const cleanQuery = query.trim();

        const cond: any = {
            organizationId: orgId,
            OR: [
                { idQr: { contains: cleanQuery, mode: 'insensitive' } },
                { serie: { contains: cleanQuery, mode: 'insensitive' } },
                { descripcionCorta: { contains: cleanQuery, mode: 'insensitive' } },
                { modelo: { contains: cleanQuery, mode: 'insensitive' } },
                { marca: { contains: cleanQuery, mode: 'insensitive' } }
            ]
        };

        if (filterStatus) {
            cond.estatusContable = filterStatus;
        }

        const activos = await prisma.activoFijo.findMany({
            where: cond,
            include: {
                producto: true
            },
            take: 15
        });

        return activos.map(activo => ({
            id: activo.id,
            idQr: activo.idQr,
            descripcionCorta: activo.descripcionCorta,
            marca: activo.marca || '',
            modelo: activo.modelo || '',
            serie: activo.serie || '',
            estatusContable: activo.estatusContable,
            stock: activo.stock,
            costoAdq: activo.costoAdq ? Number(activo.costoAdq) : 0,
            precioVenta: activo.producto?.precioVenta ? Number(activo.producto.precioVenta) : 0,
            imagenUrl: activo.imagenUrl || null,
            fechaVencimiento: activo.fechaVencimiento ? activo.fechaVencimiento.toISOString() : null
        }));
    } catch (e) {
        console.error('Error en buscarActivosParaGarantia:', e);
        return [];
    }
}

