'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export interface ItemTomaFisica {
    id: string; // AuditoriaDetalle.id (unique row key)
    activoFijoId: string; // ActivoFijo.id
    idQr: string;
    descripcionCorta: string;
    area: string;
    categoriaNombre: string;
    imagenUrl: string | null;
    stockSistema: number;
    conteoFisico: number | null;
    conteoAnterior: number | null;
    conteoNuevo: number | null;
    diferencia: number | null;
    merma: number;
    mermaFecha: string | null;
    mermaFotos: string[];
    ubicacion: string | null;
}

export interface ItemConteoSave {
    activoFijoId: string;
    stockSistema: number;
    conteo: number | null;
    conteoAnterior: number | null;
    conteoNuevo: number | null;
    merma: number;
    mermaFecha: string | null;
    mermaFotos: string[];
    ubicacion: string | null;
}

async function getAuthContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, nombre: true, apellido: true, organizationId: true, role: true, customRoleName: true, accessibleModules: true },
    });
    if (!dbUser) redirect('/unauthorized');

    const allowed = dbUser.role === 'SUPER_ADMIN' || 
                    dbUser.role === 'ORG_ADMIN' || 
                    dbUser.role === 'INVENTARIO_EDITOR' ||
                    dbUser.role === 'GERENTE' ||
                    dbUser.customRoleName === 'PF_GERENCIA' ||
                    (dbUser.customRoleName || '').toUpperCase().includes('GEREN') ||
                    (dbUser.accessibleModules || []).includes('/inventario/toma-fisica') ||
                    (dbUser.accessibleModules || []).includes('/inventario');

    if (!allowed) redirect('/unauthorized');

    return dbUser;
}

// 1. Get list of all Audits
export async function getAuditoriasInventario() {
    try {
        const user = await getAuthContext();

        const auditorias = await prisma.auditoriaInventario.findMany({
            where: { organizationId: user.organizationId },
            include: {
                creadoPor: { select: { nombre: true, apellido: true } },
                aprobadoPor: { select: { nombre: true, apellido: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const isAdmin = user.role === 'SUPER_ADMIN' || 
                        user.role === 'ORG_ADMIN' || 
                        user.role === 'GERENTE' || 
                        user.customRoleName === 'PF_GERENCIA' || 
                        (user.customRoleName || '').toUpperCase().includes('GEREN');

        return {
            success: true,
            auditorias: auditorias.map(a => ({
                id: a.id,
                correlativo: a.correlativo,
                estado: a.estado,
                notas: a.notas,
                creadoPor: a.creadoPor ? `${a.creadoPor.nombre || ''} ${a.creadoPor.apellido || ''}`.trim() : 'Sistema',
                aprobadoPor: a.aprobadoPor ? `${a.aprobadoPor.nombre || ''} ${a.aprobadoPor.apellido || ''}`.trim() : null,
                createdAt: a.createdAt
            })),
            isAdmin
        };
    } catch (error: any) {
        console.error('Error fetching auditorias list:', error);
        return { success: false, error: error.message || 'Error cargando listado' };
    }
}

// 2. Start a New Audit Session (Copy current stock to details)
export async function iniciarNuevaTomaFisica(notas?: string) {
    try {
        const user = await getAuthContext();

        // Generate correlativo AUD-XXXXX
        const count = await prisma.auditoriaInventario.count({
            where: { organizationId: user.organizationId }
        });
        const correlativo = `AUD-${String(count + 1).padStart(5, '0')}`;

        // Get all active flower varieties
        const activos = await prisma.activoFijo.findMany({
            where: {
                organizationId: user.organizationId,
                esParaRenta: false,
                esEquipoCliente: false,
                area: { not: 'SERVICIOS' }
            },
            select: {
                id: true,
                stock: true
            }
        });

        if (activos.length === 0) {
            throw new Error('No hay productos en inventario para auditar.');
        }

        // Create Auditoria with details in transaction
        const nuevaAuditoria = await prisma.$transaction(async (tx) => {
            const aud = await tx.auditoriaInventario.create({
                data: {
                    organizationId: user.organizationId,
                    correlativo,
                    estado: 'CONTEO',
                    notas: notas || `Toma física iniciada por ${user.nombre || user.id}`,
                    creadoPorId: user.id
                }
            });

            const detallesData = activos.map(a => ({
                auditoriaId: aud.id,
                activoFijoId: a.id,
                stockSistema: a.stock || 0,
                conteoFisico: null,
                conteoAnterior: 0,
                conteoNuevo: 0,
                diferencia: null,
                merma: 0,
                mermaFecha: null,
                mermaFotos: [],
                ubicacion: null
            }));

            await tx.auditoriaDetalle.createMany({
                data: detallesData
            });

            return aud;
        });

        revalidatePath('/inventario/toma-fisica');
        return { success: true, auditoriaId: nuevaAuditoria.id };
    } catch (error: any) {
        console.error('Error starting new audit:', error);
        return { success: false, error: error.message || 'Error al iniciar la toma física.' };
    }
}

// 3. Get Details of a Specific Audit
export async function getAuditoriaInventarioDetalle(id: string) {
    try {
        const user = await getAuthContext();

        const auditoria = await prisma.auditoriaInventario.findUnique({
            where: { id },
            include: {
                creadoPor: { select: { nombre: true, apellido: true } },
                aprobadoPor: { select: { nombre: true, apellido: true } },
                detalles: {
                    include: {
                        activoFijo: {
                            select: {
                                id: true,
                                idQr: true,
                                descripcionCorta: true,
                                area: true,
                                imagenUrl: true,
                                categoria: { select: { nombre: true } },
                                cuentaAct: true
                            }
                        }
                    },
                    orderBy: [
                        { activoFijo: { area: 'asc' } },
                        { activoFijo: { descripcionCorta: 'asc' } }
                    ]
                }
            }
        });

        if (!auditoria || auditoria.organizationId !== user.organizationId) {
            throw new Error('Auditoría no encontrada.');
        }

        const items: ItemTomaFisica[] = auditoria.detalles.map(d => ({
            id: d.id, // Using AuditoriaDetalle.id to allow duplicates of the same activoFijoId on the client
            activoFijoId: d.activoFijoId,
            idQr: d.activoFijo?.idQr || '',
            descripcionCorta: d.activoFijo?.descripcionCorta || '',
            area: d.activoFijo?.area || 'BODEGA',
            categoriaNombre: d.activoFijo?.categoria?.nombre || d.activoFijo?.cuentaAct || 'General',
            imagenUrl: d.activoFijo?.imagenUrl || null,
            stockSistema: d.stockSistema,
            conteoFisico: d.conteoFisico,
            conteoAnterior: d.conteoAnterior,
            conteoNuevo: d.conteoNuevo,
            diferencia: d.diferencia,
            merma: d.merma || 0,
            mermaFecha: d.mermaFecha ? d.mermaFecha.toISOString() : null,
            mermaFotos: Array.isArray(d.mermaFotos) ? (d.mermaFotos as string[]) : [],
            ubicacion: d.ubicacion
        }));

        const usuarioNombre = `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.id;
        const isAdmin = user.role === 'SUPER_ADMIN' || 
                        user.role === 'ORG_ADMIN' || 
                        user.role === 'GERENTE' || 
                        user.customRoleName === 'PF_GERENCIA' || 
                        (user.customRoleName || '').toUpperCase().includes('GEREN');

        return {
            success: true,
            auditoria: {
                id: auditoria.id,
                correlativo: auditoria.correlativo,
                estado: auditoria.estado,
                notas: auditoria.notas,
                createdAt: auditoria.createdAt,
                creadoPor: auditoria.creadoPor ? `${auditoria.creadoPor.nombre || ''} ${auditoria.creadoPor.apellido || ''}`.trim() : 'Sistema',
                aprobadoPor: auditoria.aprobadoPor ? `${auditoria.aprobadoPor.nombre || ''} ${auditoria.aprobadoPor.apellido || ''}`.trim() : null,
            },
            usuarioNombre,
            isAdmin,
            items
        };
    } catch (error: any) {
        console.error('Error fetching audit details:', error);
        return { success: false, error: error.message || 'Error cargando detalles de auditoría' };
    }
}

// 4. Save Counting Progress (Atomic delete-and-recreate transaction)
export async function guardarProgresoTomaFisica(
    auditoriaId: string, 
    conteos: ItemConteoSave[]
) {
    try {
        const user = await getAuthContext();

        // Verify auditoria exists and is editable
        const auditoria = await prisma.auditoriaInventario.findUnique({
            where: { id: auditoriaId },
            select: { id: true, estado: true, organizationId: true }
        });

        if (!auditoria || auditoria.organizationId !== user.organizationId) {
            throw new Error('Auditoría no encontrada.');
        }

        if (auditoria.estado !== 'CONTEO' && auditoria.estado !== 'PENDIENTE_APROBACION') {
            throw new Error('No se pueden modificar conteos en una auditoría cerrada o aprobada.');
        }

        // We run an atomic delete-and-recreate inside a transaction to support dynamic row additions/deletions
        await prisma.$transaction(async (tx) => {
            // Delete old details
            await tx.auditoriaDetalle.deleteMany({
                where: { auditoriaId }
            });

            // Create new details list
            const insertData = conteos.map(item => {
                const conteoVal = item.conteo;
                const diff = conteoVal !== null ? (conteoVal - item.stockSistema) : null;
                
                let formattedMermaFecha = null;
                if (item.mermaFecha) {
                    formattedMermaFecha = new Date(item.mermaFecha);
                }

                return {
                    auditoriaId,
                    activoFijoId: item.activoFijoId,
                    stockSistema: item.stockSistema,
                    conteoFisico: conteoVal,
                    conteoAnterior: item.conteoAnterior || 0,
                    conteoNuevo: item.conteoNuevo || 0,
                    diferencia: diff,
                    merma: item.merma || 0,
                    mermaFecha: formattedMermaFecha,
                    mermaFotos: item.mermaFotos || [],
                    ubicacion: item.ubicacion || null
                };
            });

            await tx.auditoriaDetalle.createMany({
                data: insertData
            });
        });

        revalidatePath(`/inventario/toma-fisica/${auditoriaId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Error saving progress:', error);
        return { success: false, error: error.message || 'Error al guardar el progreso.' };
    }
}

// 5. Submit Audit for Review
export async function enviarARevisionTomaFisica(auditoriaId: string) {
    try {
        const user = await getAuthContext();

        const auditoria = await prisma.auditoriaInventario.findUnique({
            where: { id: auditoriaId },
            select: { id: true, estado: true, organizationId: true }
        });

        if (!auditoria || auditoria.organizationId !== user.organizationId) {
            throw new Error('Auditoría no encontrada.');
        }

        await prisma.auditoriaInventario.update({
            where: { id: auditoriaId },
            data: { estado: 'PENDIENTE_APROBACION' }
        });

        revalidatePath('/inventario/toma-fisica');
        revalidatePath(`/inventario/toma-fisica/${auditoriaId}`);

        return { success: true };
    } catch (error: any) {
        console.error('Error submitting audit:', error);
        return { success: false, error: error.message || 'Error al enviar a revisión.' };
    }
}

// 6. Approve Audit and Apply Adjustments (Aggregated by Flower Variety)
export async function aprobarTomaFisica(auditoriaId: string, motivoNotas?: string) {
    try {
        const user = await getAuthContext();

        // Security check
        const isAdmin = user.role === 'SUPER_ADMIN' || 
                        user.role === 'ORG_ADMIN' || 
                        user.role === 'GERENTE' || 
                        user.customRoleName === 'PF_GERENCIA' || 
                        (user.customRoleName || '').toUpperCase().includes('GEREN');
        if (!isAdmin) {
            throw new Error('No autorizado. Solo administradores o la gerencia pueden aprobar auditorías.');
        }

        const auditoria = await prisma.auditoriaInventario.findUnique({
            where: { id: auditoriaId },
            include: {
                detalles: {
                    include: {
                        activoFijo: {
                            select: { id: true, stock: true, productoId: true }
                        }
                    }
                }
            }
        });

        if (!auditoria || auditoria.organizationId !== user.organizationId) {
            throw new Error('Auditoría no encontrada.');
        }

        if (auditoria.estado !== 'PENDIENTE_APROBACION' && auditoria.estado !== 'CONTEO') {
            throw new Error('Esta auditoría ya fue cerrada, aprobada o anulada.');
        }

        // Aggregate details by activoFijoId
        const aggregated: Record<string, {
            activoFijoId: string;
            stockSistema: number;
            totalConteo: number;
            totalMerma: number;
            productoId: string | null;
        }> = {};

        for (const d of auditoria.detalles) {
            const afId = d.activoFijoId;
            const countVal = d.conteoFisico !== null ? d.conteoFisico : d.stockSistema;

            if (!aggregated[afId]) {
                aggregated[afId] = {
                    activoFijoId: afId,
                    stockSistema: d.stockSistema, // system stock is static
                    totalConteo: 0,
                    totalMerma: 0,
                    productoId: d.activoFijo?.productoId || null
                };
            }

            aggregated[afId].totalConteo += countVal;
            aggregated[afId].totalMerma += (d.merma || 0);
        }

        // Apply adjustments and log mermas in transaction
        await prisma.$transaction(async (tx) => {
            for (const key of Object.keys(aggregated)) {
                const group = aggregated[key];
                const diferencia = group.totalConteo - group.stockSistema;

                // 1. Update live stock in ActivoFijo
                await tx.activoFijo.update({
                    where: { id: group.activoFijoId },
                    data: { stock: group.totalConteo }
                });

                // 2. Log stock difference adjustment
                if (group.productoId && diferencia !== 0) {
                    const tipoMov = diferencia < 0 ? 'AJUSTE_DISMINUCION' : 'AJUSTE_INCREMENTO';
                    await tx.movimientoInventario.create({
                        data: {
                            organizationId: user.organizationId,
                            productoId: group.productoId,
                            tipoMovimiento: tipoMov,
                            cantidad: Math.abs(diferencia),
                            motivo: motivoNotas || `Ajuste por Auditoría Física ${auditoria.correlativo}`,
                            referencia: auditoria.correlativo,
                            usuarioId: user.id
                        }
                    });
                }

                // 3. Log mermas if any
                if (group.productoId && group.totalMerma > 0) {
                    await tx.movimientoInventario.create({
                        data: {
                            organizationId: user.organizationId,
                            productoId: group.productoId,
                            tipoMovimiento: 'MERMA',
                            cantidad: group.totalMerma,
                            motivo: `Merma reportada en Auditoría Física ${auditoria.correlativo}`,
                            referencia: auditoria.correlativo,
                            usuarioId: user.id
                        }
                    });
                }
            }

            // Set audit status as APROBADA
            await tx.auditoriaInventario.update({
                where: { id: auditoriaId },
                data: {
                    estado: 'APROBADA',
                    aprobadoPorId: user.id,
                    notas: auditoria.notas ? `${auditoria.notas}\n\nAprobado por ${user.nombre || user.id}` : `Aprobado por ${user.nombre || user.id}`
                } as any
            });
        });

        revalidatePath('/inventario');
        revalidatePath('/inventario/toma-fisica');
        revalidatePath(`/inventario/toma-fisica/${auditoriaId}`);

        return { success: true };
    } catch (error: any) {
        console.error('Error approving audit:', error);
        return { success: false, error: error.message || 'Error al aprobar la auditoría.' };
    }
}

// 7. Undo/Revert Applied Audit (Symmetric Reversion)
export async function deshacerTomaFisica(auditoriaId: string) {
    try {
        const user = await getAuthContext();

        // Security check
        const isAdmin = user.role === 'SUPER_ADMIN' || 
                        user.role === 'ORG_ADMIN' || 
                        user.role === 'GERENTE' || 
                        user.customRoleName === 'PF_GERENCIA' || 
                        (user.customRoleName || '').toUpperCase().includes('GEREN');
        if (!isAdmin) {
            throw new Error('No autorizado. Solo administradores o la gerencia pueden revertir auditorías.');
        }

        const auditoria = await prisma.auditoriaInventario.findUnique({
            where: { id: auditoriaId },
            include: {
                detalles: {
                    include: {
                        activoFijo: {
                            select: { id: true, stock: true, productoId: true }
                        }
                    }
                }
            }
        });

        if (!auditoria || auditoria.organizationId !== user.organizationId) {
            throw new Error('Auditoría no encontrada.');
        }

        if (auditoria.estado !== 'APROBADA') {
            throw new Error('Solo se pueden deshacer auditorías que estén en estado APROBADA.');
        }

        // Aggregate details by activoFijoId to reconstruct reversion values
        const aggregated: Record<string, {
            activoFijoId: string;
            stockSistema: number;
            totalConteo: number;
            totalMerma: number;
            productoId: string | null;
        }> = {};

        for (const d of auditoria.detalles) {
            const afId = d.activoFijoId;
            const countVal = d.conteoFisico !== null ? d.conteoFisico : d.stockSistema;

            if (!aggregated[afId]) {
                aggregated[afId] = {
                    activoFijoId: afId,
                    stockSistema: d.stockSistema,
                    totalConteo: 0,
                    totalMerma: 0,
                    productoId: d.activoFijo?.productoId || null
                };
            }

            aggregated[afId].totalConteo += countVal;
            aggregated[afId].totalMerma += (d.merma || 0);
        }

        // Revert in transaction
        await prisma.$transaction(async (tx) => {
            for (const key of Object.keys(aggregated)) {
                const group = aggregated[key];
                const diferencia = group.totalConteo - group.stockSistema;

                // 1. Revert stock back to pre-audit stockSistema
                await tx.activoFijo.update({
                    where: { id: group.activoFijoId },
                    data: { stock: group.stockSistema }
                });

                // 2. Log compensating stock adjustment
                if (group.productoId && diferencia !== 0) {
                    const tipoMovInverso = diferencia < 0 ? 'AJUSTE_INCREMENTO' : 'AJUSTE_DISMINUCION';
                    await tx.movimientoInventario.create({
                        data: {
                            organizationId: user.organizationId,
                            productoId: group.productoId,
                            tipoMovimiento: tipoMovInverso,
                            cantidad: Math.abs(diferencia),
                            motivo: `Reversión de Ajuste de Auditoría Física ${auditoria.correlativo}`,
                            referencia: `REV-${auditoria.correlativo}`,
                            usuarioId: user.id
                        }
                    });
                }

                // 3. Log compensating merma adjustment
                if (group.productoId && group.totalMerma > 0) {
                    await tx.movimientoInventario.create({
                        data: {
                            organizationId: user.organizationId,
                            productoId: group.productoId,
                            tipoMovimiento: 'AJUSTE_INCREMENTO',
                            cantidad: group.totalMerma,
                            motivo: `Reversión de Merma de Auditoría Física ${auditoria.correlativo}`,
                            referencia: `REV-${auditoria.correlativo}`,
                            usuarioId: user.id
                        }
                    });
                }
            }

            // Set audit status as ANULADA
            await tx.auditoriaInventario.update({
                where: { id: auditoriaId },
                data: {
                    estado: 'ANULADA',
                    notas: auditoria.notas ? `${auditoria.notas}\n\nRevertido/Anulado por ${user.nombre || user.id}` : `Revertido/Anulado por ${user.nombre || user.id}`
                } as any
            });
        });

        revalidatePath('/inventario');
        revalidatePath('/inventario/toma-fisica');
        revalidatePath(`/inventario/toma-fisica/${auditoriaId}`);

        return { success: true };
    } catch (error: any) {
        console.error('Error undoing audit:', error);
        return { success: false, error: error.message || 'Error al revertir la auditoría.' };
    }
}
