'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { triggerNotification } from '@/lib/notifications';

// Auxiliar para obtener usuario y organización actuales
async function getCurrentUserAndOrg() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error('No autorizado');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { organization: true }
    });

    if (!dbUser) throw new Error('Usuario no registrado en la base de datos');
    return { user: dbUser, org: dbUser.organization };
}

// 1. Obtener todos los espacios
export async function getSpaces() {
    try {
        const { user, org } = await getCurrentUserAndOrg();
        const isPrivileged = user.role === 'SUPER_ADMIN' || user.email === 'emilia.zapata@bioelectronicahn.com';

        const spaces = await prisma.kanbanSpace.findMany({
            where: { 
                organizationId: org.id,
                ...(isPrivileged ? {} : {
                    OR: [
                        { acceso: 'Abierto' },
                        { creadoPorId: user.id },
                        { miembros: { some: { id: user.id } } }
                    ]
                })
            },
            include: {
                _count: {
                    select: { tasks: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return spaces.map(s => ({
            id: s.id,
            nombre: s.nombre,
            clave: s.clave,
            columnas: s.columnas,
            tiposActividad: s.tiposActividad,
            taskCount: s._count.tasks,
            createdAt: s.createdAt.toISOString(),
            archivado: s.archivado,
            acceso: s.acceso
        }));
    } catch (e) {
        console.error("getSpaces Error:", e);
        throw e;
    }
}

// 2. Crear un nuevo espacio
export async function createSpace(data: {
    nombre: string;
    clave: string;
    tiposActividad?: string[];
    columnas?: string[];
    acceso?: string;
    miembroIds?: string[];
}) {
    try {
        const { user, org } = await getCurrentUserAndOrg();
        const normalizedClave = data.clave.trim().toUpperCase();

        // Verificar si la clave ya existe
        const existing = await prisma.kanbanSpace.findFirst({
            where: {
                organizationId: org.id,
                clave: normalizedClave
            }
        });

        if (existing) {
            throw new Error(`La clave de espacio "${normalizedClave}" ya está en uso.`);
        }

        const canRestrict = user.role === 'SUPER_ADMIN' || user.email === 'emilia.zapata@bioelectronicahn.com' || user.puedeAsignarEspacios === true;
        const accessType = data.acceso === 'Restringido' && canRestrict ? 'Restringido' : 'Abierto';

        const space = await prisma.kanbanSpace.create({
            data: {
                organizationId: org.id,
                nombre: data.nombre.trim(),
                clave: normalizedClave,
                tiposActividad: data.tiposActividad || ["Tarea", "Historia", "Funcionalidad", "Error / Falla", "Mantenimiento Preventivo", "Mantenimiento Correctivo", "Calibración", "Instalación", "Diagnóstico", "Soporte Técnico"],
                columnas: data.columnas || ["Por hacer", "En curso", "En revisión", "Listo"],
                creadoPorId: user.id,
                acceso: accessType,
                ...(accessType === 'Restringido' && data.miembroIds && data.miembroIds.length > 0 ? {
                    miembros: {
                        connect: data.miembroIds.map(id => ({ id }))
                    }
                } : {})
            }
        });

        // Registrar actividad de creación
        await prisma.kanbanActivity.create({
            data: {
                spaceId: space.id,
                usuarioId: user.id,
                accion: 'CREACION_ESPACIO',
                detalles: `Creó el espacio de trabajo "${space.nombre}" [${space.clave}]`
            }
        });

        revalidatePath('/kanban');
        return { success: true, spaceId: space.id };
    } catch (e: any) {
        console.error("createSpace Error:", e);
        return { success: false, error: e.message || 'Error al crear espacio' };
    }
}

// 3. Obtener detalles completos de un espacio
export async function getSpaceDetails(spaceId: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findFirst({
            where: { id: spaceId, organizationId: org.id },
            include: {
                miembros: {
                    select: { id: true, nombre: true, apellido: true, email: true, avatarUrl: true }
                },
                tasks: {
                    include: {
                        asignado: {
                            select: { id: true, nombre: true, apellido: true, email: true, avatarUrl: true }
                        },
                        asignados: {
                            select: { id: true, nombre: true, apellido: true, email: true, avatarUrl: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                activities: {
                    include: {
                        usuario: {
                            select: { id: true, nombre: true, apellido: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });

        if (!space) throw new Error('Espacio no encontrado');

        const isPrivileged = user.role === 'SUPER_ADMIN' || user.email === 'emilia.zapata@bioelectronicahn.com';
        
        if (space.acceso === 'Restringido') {
            const isMember = space.miembros.some(m => m.id === user.id);
            const isCreator = space.creadoPorId === user.id;
            
            if (!isPrivileged && !isMember && !isCreator) {
                throw new Error('No tienes acceso a este espacio de trabajo restringido');
            }
        }

        // Obtener miembros del equipo para asignación de tareas
        const members = await prisma.user.findMany({
            where: { organizationId: org.id },
            select: { id: true, nombre: true, apellido: true, email: true, avatarUrl: true, puedeAsignarEspacios: true, role: true }
        });

        // Obtener todos los espacios de la organización (filtrados por acceso)
        const spaces = await prisma.kanbanSpace.findMany({
            where: { 
                organizationId: org.id, 
                archivado: false,
                ...(isPrivileged ? {} : {
                    OR: [
                        { acceso: 'Abierto' },
                        { creadoPorId: user.id },
                        { miembros: { some: { id: user.id } } }
                    ]
                })
            },
            select: { id: true, nombre: true, clave: true, columnas: true, tiposActividad: true }
        });

        return {
            currentUserRole: user.role,
            currentUserCanManageAccess: isPrivileged || user.puedeAsignarEspacios === true || space.creadoPorId === user.id,
            space: {
                id: space.id,
                nombre: space.nombre,
                clave: space.clave,
                columnas: space.columnas,
                tiposActividad: space.tiposActividad,
                acceso: space.acceso,
                miembros: space.miembros.map(m => ({
                    id: m.id,
                    nombre: `${m.nombre || ''} ${m.apellido || ''}`.trim() || m.email,
                    email: m.email,
                    avatarUrl: m.avatarUrl || null
                })),
                creadoPorId: space.creadoPorId
            },
            spaces: spaces.map(s => ({
                id: s.id,
                nombre: s.nombre,
                clave: s.clave,
                columnas: s.columnas,
                tiposActividad: s.tiposActividad
            })),
            tasks: space.tasks.map(t => ({
                id: t.id,
                codigo: t.codigo,
                title: t.title,
                description: t.description || '',
                status: t.status,
                type: t.type,
                priority: t.priority,
                dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                startDate: t.startDate ? t.startDate.toISOString() : null,
                etiquetas: t.etiquetas,
                team: t.team || '',
                parentId: t.parentId || null,
                modulo: t.modulo || null,
                asignado: t.asignado ? {
                    id: t.asignado.id,
                    nombre: `${t.asignado.nombre || ''} ${t.asignado.apellido || ''}`.trim() || t.asignado.email,
                    avatarUrl: t.asignado.avatarUrl || null
                } : null,
                asignados: t.asignados.map(u => ({
                    id: u.id,
                    nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email,
                    avatarUrl: u.avatarUrl || null
                })),
                ordenTrabajoId: t.ordenTrabajoId || null,
                createdAt: t.createdAt.toISOString()
            })),
            activities: space.activities.map(act => ({
                id: act.id,
                taskId: act.taskId,
                usuario: `${act.usuario.nombre || ''} ${act.usuario.apellido || ''}`.trim() || 'Usuario del ERP',
                accion: act.accion,
                detalles: act.detalles,
                createdAt: act.createdAt.toISOString()
            })),
            members: members.map(m => ({
                id: m.id,
                nombre: `${m.nombre || ''} ${m.apellido || ''}`.trim() || m.email,
                avatarUrl: m.avatarUrl || null
            }))
        };
    } catch (e) {
        console.error("getSpaceDetails Error:", e);
        throw e;
    }
}

// 4. Crear una tarea Kanban correlativa
export async function createKanbanTask(data: {
    spaceId: string;
    title: string;
    description?: string;
    status: string;
    type: string;
    priority: string;
    asignadoId?: string;
    asignadoIds?: string[];
    dueDate?: string;
    startDate?: string;
    parentId?: string;
    etiquetas?: string[];
    team?: string;
    modulo?: string;
    attachments?: {
        nombre: string;
        url: string;
        tipo: string;
        tamano: number;
        descripcion?: string;
    }[];
}) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        // Transacción para incrementar y asignar correlativo de forma segura
        const newTask = await prisma.$transaction(async (tx) => {
            const space = await tx.kanbanSpace.findUnique({
                where: { id: data.spaceId }
            });

            if (!space) throw new Error('Espacio no encontrado');

            const nextNumber = space.lastTaskNumber + 1;
            const codigo = `${space.clave}-${nextNumber}`;

            // Actualizar correlativo en el espacio
            await tx.kanbanSpace.update({
                where: { id: data.spaceId },
                data: { lastTaskNumber: nextNumber }
            });

            // Determinar responsable primario para compatibilidad
            const primaryAsignadoId = data.asignadoIds && data.asignadoIds.length > 0
                ? data.asignadoIds[0]
                : data.asignadoId || null;

            // Crear la tarea
            return tx.kanbanTask.create({
                data: {
                    spaceId: data.spaceId,
                    organizationId: org.id,
                    codigo,
                    title: data.title.trim(),
                    description: data.description?.trim() || null,
                    status: data.status,
                    type: data.type,
                    priority: data.priority,
                    modulo: data.modulo || null,
                    asignadoId: primaryAsignadoId,
                    asignados: data.asignadoIds && data.asignadoIds.length > 0 ? {
                        connect: data.asignadoIds.map(id => ({ id }))
                    } : data.asignadoId ? {
                        connect: [{ id: data.asignadoId }]
                    } : undefined,
                    dueDate: data.dueDate ? new Date(data.dueDate) : null,
                    startDate: data.startDate ? new Date(data.startDate) : null,
                    parentId: data.parentId || null,
                    etiquetas: data.etiquetas || [],
                    team: data.team?.trim() || null,
                    creadoPorId: user.id,
                    attachments: data.attachments && data.attachments.length > 0 ? {
                        create: data.attachments.map(att => ({
                            nombre: att.nombre,
                            url: att.url,
                            tipo: att.tipo,
                            tamano: att.tamano,
                            descripcion: att.descripcion || null,
                            subidoPorId: user.id
                        }))
                    } : undefined
                }
            });
        });

        // Registrar actividad de creación
        await prisma.kanbanActivity.create({
            data: {
                spaceId: data.spaceId,
                taskId: newTask.id,
                usuarioId: user.id,
                accion: 'CREACION_TAREA',
                detalles: `Creó la tarea ${newTask.codigo}: "${newTask.title}" en la columna "${data.status}"`
            }
        });

        // Notificar a los técnicos asignados
        const assignees = data.asignadoIds || (data.asignadoId ? [data.asignadoId] : []);
        for (const assigneeId of assignees) {
            if (assigneeId !== user.id) {
                await triggerNotification(
                    assigneeId,
                    "Nueva Tarea Asignada",
                    `Se te ha asignado la tarea ${newTask.codigo}: "${newTask.title}" por ${user.nombre || user.email}.`,
                    `/kanban`,
                    'TASK',
                    user.id
                );
            }
        }

        revalidatePath(`/kanban/${data.spaceId}`);
        return { success: true, task: newTask };
    } catch (e: any) {
        console.error("createKanbanTask Error:", e);
        return { success: false, error: e.message || 'Error al crear tarea' };
    }
}

// 5. Mover tarea de estado (Tablero)
export async function updateTaskStatus(taskId: string, targetStatus: string) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const task = await prisma.kanbanTask.findUnique({
            where: { id: taskId }
        });

        if (!task) throw new Error('Tarea no encontrada');

        const oldStatus = task.status;
        if (oldStatus === targetStatus) return { success: true };

        const updated = await prisma.kanbanTask.update({
            where: { id: taskId },
            data: {
                status: targetStatus,
                modificadoPorId: user.id
            }
        });

        // Registrar auditoría
        await prisma.kanbanActivity.create({
            data: {
                spaceId: task.spaceId,
                taskId,
                usuarioId: user.id,
                accion: 'MOVIMIENTO',
                detalles: `Mover de "${oldStatus}" a "${targetStatus}"`
            }
        });

        // Notificar al creador o responsables asignados si otra persona mueve la tarea
        try {
            const taskWithAssignees = await prisma.kanbanTask.findUnique({
                where: { id: taskId },
                include: { asignados: true }
            });

            if (taskWithAssignees) {
                // Si la tarea se mueve a Listo/Completado/Hecho, notificar al creador si no fue él mismo
                const isCompleted = targetStatus.toLowerCase().includes('listo') || 
                                    targetStatus.toLowerCase().includes('completado') || 
                                    targetStatus.toLowerCase().includes('hecho');
                if (isCompleted && taskWithAssignees.creadoPorId && taskWithAssignees.creadoPorId !== user.id) {
                    await triggerNotification(
                        taskWithAssignees.creadoPorId,
                        "Tarea Completada",
                        `La tarea ${taskWithAssignees.codigo} ("${taskWithAssignees.title}") ha sido movida a "${targetStatus}" por ${user.nombre || user.email}.`,
                        `/kanban`,
                        'TASK',
                        user.id
                    );
                }

                // Notificar a los asignados si otra persona mueve su tarea
                for (const assignee of taskWithAssignees.asignados) {
                    if (assignee.id !== user.id) {
                        await triggerNotification(
                            assignee.id,
                            "Estado de Tarea Actualizado",
                            `La tarea ${taskWithAssignees.codigo} ("${taskWithAssignees.title}") fue movida de "${oldStatus}" a "${targetStatus}" por ${user.nombre || user.email}.`,
                            `/kanban`,
                            'TASK',
                            user.id
                        );
                    }
                }
            }
        } catch (notifErr) {
            console.error("Error sending update status notification:", notifErr);
        }

        revalidatePath(`/kanban/${task.spaceId}`);
        return { success: true, task: updated };
    } catch (e: any) {
        console.error("updateTaskStatus Error:", e);
        return { success: false, error: e.message || 'Error al mover tarea' };
    }
}

// 6. Actualizar campos específicos de la tarea
export async function updateTaskFields(taskId: string, data: {
    title?: string;
    description?: string;
    status?: string;
    type?: string;
    priority?: string;
    asignadoId?: string;
    asignadoIds?: string[];
    dueDate?: string | null;
    startDate?: string | null;
    parentId?: string | null;
    etiquetas?: string[];
    team?: string | null;
    modulo?: string | null;
}) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const oldTask = await prisma.kanbanTask.findUnique({
            where: { id: taskId },
            include: { asignado: true, asignados: true }
        });

        if (!oldTask) throw new Error('Tarea no encontrada');

        const updates: any = {};
        const logs: string[] = [];

        if (data.title !== undefined && data.title !== oldTask.title) {
            updates.title = data.title.trim();
            logs.push(`Modificó el título a "${data.title}"`);
        }
        if (data.description !== undefined && data.description !== oldTask.description) {
            updates.description = data.description?.trim() || null;
            logs.push(`Modificó la descripción`);
        }
        if (data.status !== undefined && data.status !== oldTask.status) {
            updates.status = data.status;
            logs.push(`Mover de "${oldTask.status}" a "${data.status}"`);
        }
        if (data.type !== undefined && data.type !== oldTask.type) {
            updates.type = data.type;
            logs.push(`Cambió el tipo a "${data.type}"`);
        }
        if (data.priority !== undefined && data.priority !== oldTask.priority) {
            updates.priority = data.priority;
            logs.push(`Cambió la prioridad a "${data.priority}"`);
        }
        if (data.asignadoId !== undefined && data.asignadoId !== oldTask.asignadoId) {
            updates.asignadoId = data.asignadoId || null;
            if (data.asignadoId) {
                const targetUser = await prisma.user.findUnique({ where: { id: data.asignadoId } });
                logs.push(`Asignó la tarea a ${targetUser ? `${targetUser.nombre || ''} ${targetUser.apellido || ''}`.trim() || targetUser.email : 'Miembro'}`);
                if (data.asignadoIds === undefined) {
                    updates.asignados = {
                        set: [{ id: data.asignadoId }]
                    };
                }
            } else {
                logs.push(`Removió el responsable asignado`);
                if (data.asignadoIds === undefined) {
                    updates.asignados = {
                        set: []
                    };
                }
            }
        }
        if (data.asignadoIds !== undefined) {
            updates.asignados = {
                set: data.asignadoIds.map(id => ({ id }))
            };
            updates.asignadoId = data.asignadoIds.length > 0 ? data.asignadoIds[0] : null;
            logs.push(`Actualizó los responsables asignados (${data.asignadoIds.length} personas)`);
        }
        if (data.dueDate !== undefined) {
            updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
            const formattedDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Sin fecha';
            logs.push(`Cambió la fecha límite a ${formattedDate}`);
        }
        if (data.startDate !== undefined) {
            updates.startDate = data.startDate ? new Date(data.startDate) : null;
            const formattedDate = data.startDate ? new Date(data.startDate).toLocaleDateString() : 'Sin fecha';
            logs.push(`Cambió la fecha de inicio a ${formattedDate}`);
        }
        if (data.parentId !== undefined) {
            updates.parentId = data.parentId || null;
            logs.push(data.parentId ? `Asoció a tarea principal` : `Removió tarea principal`);
        }
        if (data.etiquetas !== undefined) {
            updates.etiquetas = data.etiquetas;
            logs.push(`Actualizó etiquetas a: ${data.etiquetas.join(', ')}`);
        }
        if (data.team !== undefined) {
            updates.team = data.team || null;
            logs.push(`Cambió el equipo a "${data.team || 'Ninguno'}"`);
        }
        if (data.modulo !== undefined && data.modulo !== oldTask.modulo) {
            updates.modulo = data.modulo || null;
            logs.push(`Cambió el módulo a "${data.modulo || 'Ninguno'}"`);
        }

        if (Object.keys(updates).length === 0) return { success: true };

        updates.modificadoPorId = user.id;

        const updated = await prisma.kanbanTask.update({
            where: { id: taskId },
            data: updates
        });

        // Sync back to OrdenTrabajo if it is associated with a support order
        if (oldTask.ordenTrabajoId && (data.asignadoIds !== undefined || data.asignadoId !== undefined)) {
            try {
                let finalTecnicoIds: string[] = [];
                if (data.asignadoIds !== undefined) {
                    finalTecnicoIds = data.asignadoIds;
                } else if (data.asignadoId !== undefined) {
                    finalTecnicoIds = data.asignadoId ? [data.asignadoId] : [];
                }

                const firstTecnicoId = finalTecnicoIds[0] || null;

                await prisma.ordenTrabajo.update({
                    where: { id: oldTask.ordenTrabajoId },
                    data: {
                        tecnicoReparacionId: firstTecnicoId,
                        tecnicosAsignados: {
                            set: finalTecnicoIds.map(id => ({ id }))
                        }
                    }
                });
                revalidatePath('/soporte');
                revalidatePath(`/soporte/${oldTask.ordenTrabajoId}`);
            } catch (syncErr) {
                console.error("[Support Sync Error in updateTaskFields]:", syncErr);
            }
        }

        // Registrar múltiples actividades de auditoría consolidadas
        await prisma.kanbanActivity.create({
            data: {
                spaceId: oldTask.spaceId,
                taskId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: logs.join(', ')
            }
        });

        // Notificar a nuevos técnicos asignados
        try {
            let newAssigneeIds: string[] = [];
            if (data.asignadoIds !== undefined) {
                const oldIds = oldTask.asignados.map(a => a.id);
                newAssigneeIds = data.asignadoIds.filter(id => !oldIds.includes(id));
            } else if (data.asignadoId !== undefined) {
                if (data.asignadoId && oldTask.asignadoId !== data.asignadoId) {
                    newAssigneeIds = [data.asignadoId];
                }
            }

            for (const assigneeId of newAssigneeIds) {
                if (assigneeId !== user.id) {
                    await triggerNotification(
                        assigneeId,
                        "Tarea Asignada",
                        `Se te ha asignado la tarea ${oldTask.codigo}: "${data.title !== undefined ? data.title : oldTask.title}" por ${user.nombre || user.email}.`,
                        `/kanban`,
                        'TASK',
                        user.id
                    );
                }
            }
        } catch (notifErr) {
            console.error("Error sending update task fields assignment notification:", notifErr);
        }

        revalidatePath(`/kanban/${oldTask.spaceId}`);
        return { success: true, task: updated };
    } catch (e: any) {
        console.error("updateTaskFields Error:", e);
        return { success: false, error: e.message || 'Error al actualizar tarea' };
    }
}

// 7. Borrar tarea
export async function deleteKanbanTask(taskId: string) {
    try {
        const { user } = await getCurrentUserAndOrg();

        if (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
            throw new Error('No autorizado. Solo los administradores pueden eliminar tareas.');
        }

        const task = await prisma.kanbanTask.findUnique({
            where: { id: taskId }
        });

        if (!task) throw new Error('Tarea no encontrada');

        await prisma.kanbanTask.delete({
            where: { id: taskId }
        });

        // Registrar auditoría en el espacio
        await prisma.kanbanActivity.create({
            data: {
                spaceId: task.spaceId,
                usuarioId: user.id,
                accion: 'ELIMINACION',
                detalles: `Eliminó la tarea ${task.codigo}: "${task.title}"`
            }
        });

        revalidatePath(`/kanban/${task.spaceId}`);
        return { success: true };
    } catch (e: any) {
        console.error("deleteKanbanTask Error:", e);
        return { success: false, error: e.message || 'Error al eliminar tarea' };
    }
}

// 8. Agregar columna al espacio de trabajo
export async function addColumnToSpace(spaceId: string, columnName: string) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findUnique({
            where: { id: spaceId }
        });

        if (!space) throw new Error('Espacio de trabajo no encontrado');

        const trimmedName = columnName.trim();
        if (!trimmedName) throw new Error('El nombre de la columna no puede estar vacío');

        // Validar duplicados (insensible a mayúsculas/minúsculas)
        const isDuplicate = space.columnas.some(
            col => col.toLowerCase() === trimmedName.toLowerCase()
        );

        if (isDuplicate) {
            throw new Error(`La columna "${trimmedName}" ya existe en este tablero.`);
        }

        const updated = await prisma.kanbanSpace.update({
            where: { id: spaceId },
            data: {
                columnas: [...space.columnas, trimmedName]
            }
        });

        // Registrar actividad de actualización
        await prisma.kanbanActivity.create({
            data: {
                spaceId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Agregó la columna "${trimmedName}" al tablero`
            }
        });

        revalidatePath(`/kanban/${spaceId}`);
        return { success: true, columnas: updated.columnas };
    } catch (e: any) {
        console.error("addColumnToSpace Error:", e);
        return { success: false, error: e.message || 'Error al agregar columna' };
    }
}

// 9. Eliminar columna del espacio de trabajo
export async function deleteColumnFromSpace(spaceId: string, columnName: string) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findUnique({
            where: { id: spaceId }
        });

        if (!space) throw new Error('Espacio de trabajo no encontrado');

        const index = space.columnas.indexOf(columnName);
        if (index === -1) throw new Error('La columna no existe en este tablero');

        if (space.columnas.length <= 1) {
            throw new Error('Debe haber al menos una columna en el tablero');
        }

        const isProtectedSpace = 
            space.clave === 'DB' || 
            space.clave === 'ODT' || 
            space.clave === 'DBIO' ||
            space.nombre.toUpperCase() === 'DESARROLLO BIO' ||
            space.nombre.toUpperCase() === 'ORDENES DE TRABAJO' ||
            space.nombre.toUpperCase() === 'TAREAS GENERALES';

        if (isProtectedSpace && ['POR HACER', 'EN CURSO', 'LISTO'].includes(columnName.toUpperCase())) {
            if (user.role !== 'SUPER_ADMIN') {
                throw new Error('Solo un Super Admin puede eliminar las columnas base de los espacios principales.');
            }
        }

        const remainingColumns = space.columnas.filter(col => col !== columnName);
        const fallbackColumn = remainingColumns[0]; // Mover tareas a la primera columna disponible

        // 1. Mover todas las tareas de la columna eliminada a la columna de respaldo
        await prisma.kanbanTask.updateMany({
            where: {
                spaceId,
                status: columnName
            },
            data: {
                status: fallbackColumn
            }
        });

        // 2. Actualizar las columnas en el espacio
        const updated = await prisma.kanbanSpace.update({
            where: { id: spaceId },
            data: {
                columnas: remainingColumns
            }
        });

        // 3. Registrar actividad de actualización
        await prisma.kanbanActivity.create({
            data: {
                spaceId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Eliminó la columna "${columnName}" (las tareas fueron movidas a "${fallbackColumn}")`
            }
        });

        revalidatePath(`/kanban/${spaceId}`);
        return { success: true, columnas: updated.columnas, fallbackColumn };
    } catch (e: any) {
        console.error("deleteColumnFromSpace Error:", e);
        return { success: false, error: e.message || 'Error al eliminar columna' };
    }
}

// 10. Archivar o desarchivar un espacio de trabajo
export async function archiveSpace(spaceId: string, archivado: boolean) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findFirst({
            where: { id: spaceId, organizationId: org.id }
        });

        if (!space) throw new Error('Espacio de trabajo no encontrado');

        await prisma.kanbanSpace.update({
            where: { id: spaceId },
            data: { archivado }
        });

        // Registrar actividad de auditoría
        await prisma.kanbanActivity.create({
            data: {
                spaceId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: archivado ? 'Archivó el espacio de trabajo' : 'Desarchivó el espacio de trabajo'
            }
        });

        revalidatePath('/kanban');
        return { success: true };
    } catch (e: any) {
        console.error("archiveSpace Error:", e);
        return { success: false, error: e.message || 'Error al modificar estado del espacio' };
    }
}

// 11. Obtener comentarios y archivos adjuntos de una tarea
export async function getTaskCommentsAndAttachments(taskId: string) {
    try {
        const { org } = await getCurrentUserAndOrg();

        const task = await prisma.kanbanTask.findFirst({
            where: { id: taskId, organizationId: org.id }
        });

        if (!task) throw new Error('Tarea no encontrada');

        const comments = await prisma.kanbanComment.findMany({
            where: { taskId },
            include: {
                usuario: {
                    select: { id: true, nombre: true, apellido: true, email: true, avatarUrl: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        const attachments = await prisma.kanbanAttachment.findMany({
            where: { taskId },
            include: {
                subidoPor: {
                    select: { id: true, nombre: true, apellido: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return {
            success: true,
            comments: comments.map(c => ({
                id: c.id,
                contenido: c.contenido,
                createdAt: c.createdAt.toISOString(),
                usuario: {
                    id: c.usuario.id,
                    nombre: `${c.usuario.nombre || ''} ${c.usuario.apellido || ''}`.trim() || c.usuario.email,
                    avatarUrl: c.usuario.avatarUrl || null
                }
            })),
            attachments: attachments.map(a => ({
                id: a.id,
                nombre: a.nombre,
                url: a.url,
                tipo: a.tipo,
                tamano: a.tamano,
                descripcion: a.descripcion || null,
                createdAt: a.createdAt.toISOString(),
                subidoPor: {
                    id: a.subidoPor.id,
                    nombre: `${a.subidoPor.nombre || ''} ${a.subidoPor.apellido || ''}`.trim() || a.subidoPor.email
                }
            }))
        };
    } catch (e: any) {
        console.error("getTaskCommentsAndAttachments Error:", e);
        return { success: false, error: e.message || 'Error al obtener comentarios y adjuntos' };
    }
}

// 12. Crear un nuevo comentario
export async function createKanbanComment(taskId: string, contenido: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const task = await prisma.kanbanTask.findFirst({
            where: { id: taskId, organizationId: org.id }
        });

        if (!task) throw new Error('Tarea no encontrada');

        const comment = await prisma.kanbanComment.create({
            data: {
                taskId,
                usuarioId: user.id,
                contenido: contenido.trim()
            },
            include: {
                usuario: {
                    select: { id: true, nombre: true, apellido: true, email: true, avatarUrl: true }
                }
            }
        });

        // Registrar auditoría
        await prisma.kanbanActivity.create({
            data: {
                spaceId: task.spaceId,
                taskId,
                usuarioId: user.id,
                accion: 'COMENTARIO',
                detalles: `Añadió un comentario`
            }
        });

        revalidatePath(`/kanban/${task.spaceId}`);
        return {
            success: true,
            comment: {
                id: comment.id,
                contenido: comment.contenido,
                createdAt: comment.createdAt.toISOString(),
                usuario: {
                    id: comment.usuario.id,
                    nombre: `${comment.usuario.nombre || ''} ${comment.usuario.apellido || ''}`.trim() || comment.usuario.email,
                    avatarUrl: comment.usuario.avatarUrl || null
                }
            }
        };
    } catch (e: any) {
        console.error("createKanbanComment Error:", e);
        return { success: false, error: e.message || 'Error al crear comentario' };
    }
}

// 13. Eliminar un comentario
export async function deleteKanbanComment(commentId: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const comment = await prisma.kanbanComment.findUnique({
            where: { id: commentId },
            include: { task: true }
        });

        if (!comment) throw new Error('Comentario no encontrado');
        if (comment.task.organizationId !== org.id) throw new Error('No autorizado');

        const isAuthor = comment.usuarioId === user.id;
        const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN';

        if (!isAuthor && !isAdmin) {
            throw new Error('No tienes permiso para eliminar este comentario');
        }

        await prisma.kanbanComment.delete({
            where: { id: commentId }
        });

        // Registrar auditoría
        await prisma.kanbanActivity.create({
            data: {
                spaceId: comment.task.spaceId,
                taskId: comment.taskId,
                usuarioId: user.id,
                accion: 'ELIMINACION',
                detalles: `Eliminó un comentario (contenido anterior: "${comment.contenido.substring(0, 100)}")`
            }
        });

        revalidatePath(`/kanban/${comment.task.spaceId}`);
        return { success: true };
    } catch (e: any) {
        console.error("deleteKanbanComment Error:", e);
        return { success: false, error: e.message || 'Error al eliminar comentario' };
    }
}

// 13b. Editar un comentario
export async function updateKanbanComment(commentId: string, nuevoContenido: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const comment = await prisma.kanbanComment.findUnique({
            where: { id: commentId },
            include: { task: true }
        });

        if (!comment) throw new Error('Comentario no encontrado');
        if (comment.task.organizationId !== org.id) throw new Error('No autorizado');

        const isAuthor = comment.usuarioId === user.id;
        const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN';

        if (!isAuthor && !isAdmin) {
            throw new Error('No tienes permiso para editar este comentario');
        }

        const oldContenido = comment.contenido;
        const updated = await prisma.kanbanComment.update({
            where: { id: commentId },
            data: {
                contenido: nuevoContenido.trim()
            }
        });

        // Registrar auditoría
        await prisma.kanbanActivity.create({
            data: {
                spaceId: comment.task.spaceId,
                taskId: comment.taskId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Editó un comentario (antes: "${oldContenido.substring(0, 100)}")`
            }
        });

        revalidatePath(`/kanban/${comment.task.spaceId}`);
        return { 
            success: true, 
            comment: {
                id: updated.id,
                contenido: updated.contenido,
                createdAt: updated.createdAt.toISOString()
            }
        };
    } catch (e: any) {
        console.error("updateKanbanComment Error:", e);
        return { success: false, error: e.message || 'Error al editar comentario' };
    }
}

// 14. Registrar un archivo adjunto
export async function createKanbanAttachment(data: {
    taskId: string;
    nombre: string;
    url: string;
    tipo: string;
    tamano: number;
    descripcion?: string;
}) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const task = await prisma.kanbanTask.findFirst({
            where: { id: data.taskId, organizationId: org.id }
        });

        if (!task) throw new Error('Tarea no encontrada');

        const attachment = await prisma.kanbanAttachment.create({
            data: {
                taskId: data.taskId,
                nombre: data.nombre,
                url: data.url,
                tipo: data.tipo,
                tamano: data.tamano,
                descripcion: data.descripcion || null,
                subidoPorId: user.id
            },
            include: {
                subidoPor: {
                    select: { id: true, nombre: true, apellido: true, email: true }
                }
            }
        });

        // Registrar auditoría
        await prisma.kanbanActivity.create({
            data: {
                spaceId: task.spaceId,
                taskId: data.taskId,
                usuarioId: user.id,
                accion: 'COMENTARIO',
                detalles: `Subió el archivo adjunto "${data.nombre}"`
            }
        });

        revalidatePath(`/kanban/${task.spaceId}`);
        return {
            success: true,
            attachment: {
                id: attachment.id,
                nombre: attachment.nombre,
                url: attachment.url,
                tipo: attachment.tipo,
                tamano: attachment.tamano,
                createdAt: attachment.createdAt.toISOString(),
                subidoPor: {
                    id: attachment.subidoPor.id,
                    nombre: `${attachment.subidoPor.nombre || ''} ${attachment.subidoPor.apellido || ''}`.trim() || attachment.subidoPor.email
                }
            }
        };
    } catch (e: any) {
        console.error("createKanbanAttachment Error:", e);
        return { success: false, error: e.message || 'Error al registrar adjunto' };
    }
}

// 15. Eliminar un archivo adjunto
export async function deleteKanbanAttachment(attachmentId: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const attachment = await prisma.kanbanAttachment.findUnique({
            where: { id: attachmentId },
            include: { task: true }
        });

        if (!attachment) throw new Error('Adjunto no encontrado');
        if (attachment.task.organizationId !== org.id) throw new Error('No autorizado');

        const isOwner = attachment.subidoPorId === user.id;
        const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN';

        if (!isOwner && !isAdmin) {
            throw new Error('No tienes permiso para eliminar este adjunto');
        }

        await prisma.kanbanAttachment.delete({
            where: { id: attachmentId }
        });

        // Registrar auditoría con descripción si existía
        const descInfo = attachment.descripcion ? ` (Descripción: "${attachment.descripcion}")` : ' (Sin descripción)';
        const detalles = `Eliminó el archivo adjunto "${attachment.nombre}"${descInfo}`;

        await prisma.kanbanActivity.create({
            data: {
                spaceId: attachment.task.spaceId,
                taskId: attachment.taskId,
                usuarioId: user.id,
                accion: 'ELIMINACION',
                detalles
            }
        });

        revalidatePath(`/kanban/${attachment.task.spaceId}`);
        return { success: true };
    } catch (e: any) {
        console.error("deleteKanbanAttachment Error:", e);
        return { success: false, error: e.message || 'Error al eliminar adjunto' };
    }
}

// 16. Mover tarea a otro espacio (tablero)
export async function moveTaskToSpace(taskId: string, targetSpaceId: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const task = await prisma.kanbanTask.findUnique({
            where: { id: taskId },
            include: { space: true }
        });

        if (!task) throw new Error('Tarea no encontrada');
        if (task.spaceId === targetSpaceId) return { success: true, task };

        // Transacción para obtener correlativo de forma segura y actualizar
        const updatedTask = await prisma.$transaction(async (tx) => {
            const targetSpace = await tx.kanbanSpace.findUnique({
                where: { id: targetSpaceId }
            });

            if (!targetSpace) throw new Error('Espacio de destino no encontrado');

            const nextNumber = targetSpace.lastTaskNumber + 1;
            const codigo = `${targetSpace.clave}-${nextNumber}`;

            // Actualizar correlativo en el espacio de destino
            await tx.kanbanSpace.update({
                where: { id: targetSpaceId },
                data: { lastTaskNumber: nextNumber }
            });

            // Si el estado actual de la tarea no existe en el espacio destino, mover a la primera columna
            const targetStatus = targetSpace.columnas.includes(task.status)
                ? task.status
                : targetSpace.columnas[0] || 'Por hacer';

            // Actualizar la tarea
            return tx.kanbanTask.update({
                where: { id: taskId },
                data: {
                    spaceId: targetSpaceId,
                    codigo,
                    status: targetStatus,
                    modificadoPorId: user.id
                }
            });
        });

        // Registrar actividad en ambos espacios
        await prisma.kanbanActivity.create({
            data: {
                spaceId: task.spaceId,
                taskId,
                usuarioId: user.id,
                accion: 'MOVIMIENTO',
                detalles: `Movió la tarea ${task.codigo} al espacio "${updatedTask.codigo}"`
            }
        });

        await prisma.kanbanActivity.create({
            data: {
                spaceId: targetSpaceId,
                taskId,
                usuarioId: user.id,
                accion: 'MOVIMIENTO',
                detalles: `Recibió la tarea trasladada de "${task.space.nombre}" como ${updatedTask.codigo}`
            }
        });

        revalidatePath(`/kanban/${task.spaceId}`);
        revalidatePath(`/kanban/${targetSpaceId}`);
        
        return { success: true, task: updatedTask };
    } catch (e: any) {
        console.error("moveTaskToSpace Error:", e);
        return { success: false, error: e.message || 'Error al trasladar de espacio' };
    }
}

// 22. Actualizar los miembros y acceso de un espacio
export async function updateSpaceMembers(spaceId: string, acceso: string, miembroIds: string[]) {
    try {
        const { user, org } = await getCurrentUserAndOrg();
        
        const space = await prisma.kanbanSpace.findFirst({
            where: { id: spaceId, organizationId: org.id }
        });
        
        if (!space) throw new Error('Espacio no encontrado');
        
        // Verificar si el usuario tiene privilegios para gestionar este espacio
        const isPrivileged = user.role === 'SUPER_ADMIN' || user.email === 'emilia.zapata@bioelectronicahn.com';
        const canManage = isPrivileged || user.puedeAsignarEspacios === true || space.creadoPorId === user.id;
        
        if (!canManage) {
            throw new Error('No tienes permisos para gestionar los accesos de este espacio');
        }
        
        // Si el acceso pasa a "Abierto", podemos limpiar la relación de miembros
        // Si es "Restringido", conectamos los miembros pasados
        await prisma.$transaction(async (tx) => {
            // Desconectar todos los miembros actuales
            await tx.kanbanSpace.update({
                where: { id: spaceId },
                data: {
                    acceso: acceso,
                    miembros: {
                        set: [] // Limpiar miembros anteriores
                    }
                }
            });
            
            if (acceso === 'Restringido' && miembroIds.length > 0) {
                await tx.kanbanSpace.update({
                    where: { id: spaceId },
                    data: {
                        miembros: {
                            connect: miembroIds.map(id => ({ id }))
                        }
                    }
                });
            }
        });
        
        // Registrar actividad
        await prisma.kanbanActivity.create({
            data: {
                spaceId: spaceId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Actualizó los accesos del espacio. Tipo de acceso: "${acceso}"`
            }
        });
        
        revalidatePath(`/kanban/${spaceId}`);
        revalidatePath('/kanban');
        return { success: true };
    } catch (e: any) {
        console.error("updateSpaceMembers Error:", e);
        return { success: false, error: e.message || 'Error al actualizar accesos' };
    }
}

// 23. Obtener datos iniciales del Dashboard Kanban
export async function getKanbanInitData() {
    try {
        const { user, org } = await getCurrentUserAndOrg();
        const spaces = await getSpaces();
        
        const members = await prisma.user.findMany({
            where: { organizationId: org.id },
            select: { id: true, nombre: true, apellido: true, email: true, avatarUrl: true }
        });
        
        return {
            spaces,
            currentUser: {
                id: user.id,
                email: user.email,
                role: user.role,
                puedeAsignarEspacios: user.puedeAsignarEspacios
            },
            organizationMembers: members.map(m => ({
                id: m.id,
                nombre: `${m.nombre || ''} ${m.apellido || ''}`.trim() || m.email,
                email: m.email,
                avatarUrl: m.avatarUrl || null
            }))
        };
    } catch (e) {
        console.error("getKanbanInitData Error:", e);
        throw e;
    }
}

// 24. Actualizar descripción de archivo adjunto
export async function updateKanbanAttachmentDescription(attachmentId: string, descripcion: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const attachment = await prisma.kanbanAttachment.findUnique({
            where: { id: attachmentId },
            include: { task: true }
        });

        if (!attachment) throw new Error('Adjunto no encontrado');
        if (attachment.task.organizationId !== org.id) throw new Error('No autorizado');

        const isOwner = attachment.subidoPorId === user.id;
        const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN';

        if (!isOwner && !isAdmin) {
            throw new Error('No tienes permiso para editar este adjunto');
        }

        const updated = await prisma.kanbanAttachment.update({
            where: { id: attachmentId },
            data: {
                descripcion: descripcion.trim() || null
            }
        });

        // Registrar auditoría
        await prisma.kanbanActivity.create({
            data: {
                spaceId: attachment.task.spaceId,
                taskId: attachment.taskId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Actualizó la descripción del archivo adjunto "${attachment.nombre}"`
            }
        });

        revalidatePath(`/kanban/${attachment.task.spaceId}`);
        return { success: true, attachment: updated };
    } catch (e: any) {
        console.error("updateKanbanAttachmentDescription Error:", e);
        return { success: false, error: e.message || 'Error al actualizar descripción de adjunto' };
    }
}

export async function updateSpaceName(spaceId: string, nuevoNombre: string) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findUnique({
            where: { id: spaceId }
        });

        if (!space) throw new Error('Espacio de trabajo no encontrado');

        const isPrivileged = user.role === 'SUPER_ADMIN' || user.email === 'emilia.zapata@bioelectronicahn.com';
        const isCreator = space.creadoPorId === user.id;

        if (!isPrivileged && !isCreator && user.puedeAsignarEspacios !== true) {
            throw new Error('No tienes permisos para renombrar este espacio de trabajo.');
        }

        const trimmed = nuevoNombre.trim();
        if (!trimmed) throw new Error('El nombre del espacio no puede estar vacío.');

        const updated = await prisma.kanbanSpace.update({
            where: { id: spaceId },
            data: { nombre: trimmed }
        });

        await prisma.kanbanActivity.create({
            data: {
                spaceId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Renombró el espacio de trabajo a "${trimmed}"`
            }
        });

        revalidatePath('/kanban');
        revalidatePath(`/kanban/${spaceId}`);
        return { success: true, space: updated };
    } catch (e: any) {
        console.error("updateSpaceName Error:", e);
        return { success: false, error: e.message || 'Error al renombrar espacio' };
    }
}

export async function addActivityTypeToSpace(spaceId: string, activityType: string) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findUnique({
            where: { id: spaceId }
        });

        if (!space) throw new Error('Espacio de trabajo no encontrado');

        const trimmedType = activityType.trim();
        if (!trimmedType) throw new Error('El tipo de actividad no puede estar vacío');

        // Validar duplicados (insensible a mayúsculas/minúsculas)
        const isDuplicate = space.tiposActividad.some(
            t => t.toLowerCase() === trimmedType.toLowerCase()
        );

        if (isDuplicate) {
            throw new Error(`El tipo de actividad "${trimmedType}" ya existe en este tablero.`);
        }

        const updated = await prisma.kanbanSpace.update({
            where: { id: spaceId },
            data: {
                tiposActividad: [...space.tiposActividad, trimmedType]
            }
        });

        // Registrar actividad de actualización
        await prisma.kanbanActivity.create({
            data: {
                spaceId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Agregó el tipo de actividad "${trimmedType}" al tablero`
            }
        });

        revalidatePath(`/kanban/${spaceId}`);
        revalidatePath('/kanban');
        return { success: true, tiposActividad: updated.tiposActividad };
    } catch (e: any) {
        console.error("addActivityTypeToSpace Error:", e);
        return { success: false, error: e.message || 'Error al agregar tipo de actividad' };
    }
}

export async function renameColumnInSpace(spaceId: string, oldName: string, newName: string) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findUnique({
            where: { id: spaceId }
        });

        if (!space) throw new Error('Espacio de trabajo no encontrado');

        const trimmedOld = oldName.trim();
        const trimmedNew = newName.trim();
        if (!trimmedNew) throw new Error('El nombre de la columna no puede estar vacío');
        if (trimmedOld === trimmedNew) return { success: true, columnas: space.columnas };

        // Validar si el nuevo nombre ya existe en otras columnas
        const isDuplicate = space.columnas.some(
            col => col.toLowerCase() === trimmedNew.toLowerCase() && col.toLowerCase() !== trimmedOld.toLowerCase()
        );

        if (isDuplicate) {
            throw new Error(`La columna "${trimmedNew}" ya existe en este tablero.`);
        }

        // Reemplazar el nombre en el array de columnas
        const updatedColumnas = space.columnas.map(col => col === trimmedOld ? trimmedNew : col);

        // Actualizar tanto el espacio como las tareas correspondientes
        const updated = await prisma.$transaction(async (tx) => {
            // 1. Actualizar el status de todas las tareas correspondientes
            await tx.kanbanTask.updateMany({
                where: {
                    spaceId,
                    status: trimmedOld
                },
                data: {
                    status: trimmedNew
                }
            });

            // 2. Actualizar las columnas en el espacio
            return tx.kanbanSpace.update({
                where: { id: spaceId },
                data: {
                    columnas: updatedColumnas
                }
            });
        });

        // 3. Registrar actividad de actualización
        await prisma.kanbanActivity.create({
            data: {
                spaceId,
                usuarioId: user.id,
                accion: 'ACTUALIZACION',
                detalles: `Renombró la columna "${trimmedOld}" a "${trimmedNew}"`
            }
        });

        revalidatePath(`/kanban/${spaceId}`);
        revalidatePath('/kanban');
        return { success: true, columnas: updated.columnas };
    } catch (e: any) {
        console.error("renameColumnInSpace Error:", e);
        return { success: false, error: e.message || 'Error al renombrar la columna' };
    }
}

// --- CONSUMO DE MATERIALES EN TAREAS KANBAN ---

export async function getTaskMaterials(taskId: string) {
    try {
        const { org } = await getCurrentUserAndOrg();

        const task = await prisma.kanbanTask.findFirst({
            where: { id: taskId, organizationId: org.id }
        });
        if (!task) throw new Error('Tarea no encontrada');

        const materials = await prisma.kanbanTaskMaterial.findMany({
            where: { taskId, anuladaAt: null },
            include: {
                activoFijo: true,
                creadoPor: {
                    select: { id: true, nombre: true, apellido: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return {
            success: true,
            materials: materials.map(m => ({
                id: m.id,
                activoFijoId: m.activoFijoId,
                descripcionCorta: m.activoFijo.descripcionCorta,
                codigoBarras: m.activoFijo.codigoBarras || '',
                idQr: m.activoFijo.idQr,
                cantidad: m.cantidad,
                area: m.area,
                createdAt: m.createdAt.toISOString(),
                creadoPor: {
                    id: m.creadoPor?.id || '',
                    nombre: m.creadoPor ? `${m.creadoPor.nombre || ''} ${m.creadoPor.apellido || ''}`.trim() || m.creadoPor.email : 'Sistema'
                }
            }))
        };
    } catch (e: any) {
        console.error("getTaskMaterials Error:", e);
        return { success: false, error: e.message || 'Error al obtener materiales' };
    }
}

export async function searchMaterialsForTask(query: string) {
    try {
        const { org } = await getCurrentUserAndOrg();
        if (!query || query.trim().length < 2) return [];

        const matched = await prisma.activoFijo.findMany({
            where: {
                organizationId: org.id,
                esParaRenta: false,
                stock: { gt: 0 },
                OR: [
                    { descripcionCorta: { contains: query, mode: 'insensitive' } },
                    { codigoBarras: { contains: query, mode: 'insensitive' } },
                    { idQr: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                descripcionCorta: true,
                codigoBarras: true,
                idQr: true,
                stock: true,
                area: true,
                productoId: true
            },
            take: 30
        });

        return matched;
    } catch (e) {
        console.error("searchMaterialsForTask Error:", e);
        return [];
    }
}

export async function consumeMaterialForTask(taskId: string, activoFijoId: string, cantidad: number) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        if (cantidad <= 0) throw new Error("La cantidad debe ser mayor que cero");

        const task = await prisma.kanbanTask.findFirst({
            where: { id: taskId, organizationId: org.id }
        });
        if (!task) throw new Error("Tarea no encontrada");

        const result = await prisma.$transaction(async (tx) => {
            const activo = await tx.activoFijo.findUnique({
                where: { id: activoFijoId, organizationId: org.id }
            });
            if (!activo) throw new Error("Componente no encontrado en inventario");
            if (activo.stock < cantidad) {
                throw new Error(`Stock insuficiente en ${activo.area}. Stock disponible: ${activo.stock}`);
            }

            // 1. Decrementar stock en ActivoFijo
            await tx.activoFijo.update({
                where: { id: activoFijoId },
                data: { stock: { decrement: cantidad } }
            });

            // 2. Resolver matching Producto para sincronización y Movimientos
            let prodId = activo.productoId;
            if (!prodId && activo.codigoBarras) {
                const matchProd = await tx.producto.findFirst({
                    where: { organizationId: org.id, sku: activo.codigoBarras }
                });
                if (matchProd) {
                    prodId = matchProd.id;
                    await tx.activoFijo.update({
                        where: { id: activoFijoId },
                        data: { productoId: prodId }
                    });
                }
            }

            if (prodId) {
                // Decrementar stock en Producto
                await tx.producto.update({
                    where: { id: prodId },
                    data: { stockActual: { decrement: cantidad } }
                });

                // Registrar MovimientoInventario
                await tx.movimientoInventario.create({
                    data: {
                        organizationId: org.id,
                        productoId: prodId,
                        tipoMovimiento: 'SALIDA',
                        cantidad,
                        motivo: `Uso en Tarea Kanban ${task.codigo} (${task.title})`,
                        usuarioId: user.id
                    }
                });
            }

            // 3. Crear KanbanTaskMaterial
            const material = await tx.kanbanTaskMaterial.create({
                data: {
                    taskId,
                    activoFijoId,
                    cantidad,
                    area: activo.area,
                    creadoPorId: user.id
                },
                include: {
                    activoFijo: true,
                    creadoPor: {
                        select: { id: true, nombre: true, apellido: true, email: true }
                    }
                }
            });

            // 4. Registrar actividad del Kanban
            await tx.kanbanActivity.create({
                data: {
                    spaceId: task.spaceId,
                    taskId,
                    usuarioId: user.id,
                    accion: 'ACTUALIZACION',
                    detalles: `Descargó de inventario: ${cantidad}x ${activo.descripcionCorta} de la ubicación "${activo.area}"`
                }
            });

            return material;
        });

        revalidatePath(`/kanban/${task.spaceId}`);
        return {
            success: true,
            material: {
                id: result.id,
                activoFijoId: result.activoFijoId,
                descripcionCorta: result.activoFijo.descripcionCorta,
                codigoBarras: result.activoFijo.codigoBarras || '',
                idQr: result.activoFijo.idQr,
                cantidad: result.cantidad,
                area: result.area,
                createdAt: result.createdAt.toISOString(),
                creadoPor: {
                    id: result.creadoPor?.id || '',
                    nombre: result.creadoPor ? `${result.creadoPor.nombre || ''} ${result.creadoPor.apellido || ''}`.trim() || result.creadoPor.email : 'Sistema'
                }
            }
        };
    } catch (e: any) {
        console.error("consumeMaterialForTask Error:", e);
        return { success: false, error: e.message || 'Error al consumir material de inventario' };
    }
}

export async function cancelMaterialConsumptionForTask(materialId: string) {
    try {
        const { user, org } = await getCurrentUserAndOrg();

        const material = await prisma.kanbanTaskMaterial.findUnique({
            where: { id: materialId },
            include: {
                task: true,
                activoFijo: true
            }
        });

        if (!material) throw new Error("Registro de consumo de material no encontrado");
        if (material.task.organizationId !== org.id) throw new Error("No autorizado");
        if (material.anuladaAt !== null) throw new Error("El consumo ya ha sido cancelado");

        await prisma.$transaction(async (tx) => {
            // 1. Anulación lógica
            await tx.kanbanTaskMaterial.update({
                where: { id: materialId },
                data: {
                    anuladaPorId: user.id,
                    anuladaAt: new Date()
                }
            });

            // 2. Devolver stock a ActivoFijo
            await tx.activoFijo.update({
                where: { id: material.activoFijoId },
                data: { stock: { increment: material.cantidad } }
            });

            // 3. Devolver stock a Producto y registrar movimiento
            let prodId = material.activoFijo.productoId;
            if (!prodId && material.activoFijo.codigoBarras) {
                const matchProd = await tx.producto.findFirst({
                    where: { organizationId: org.id, sku: material.activoFijo.codigoBarras }
                });
                if (matchProd) {
                    prodId = matchProd.id;
                }
            }

            if (prodId) {
                // Incrementar stock en Producto
                await tx.producto.update({
                    where: { id: prodId },
                    data: { stockActual: { increment: material.cantidad } }
                });

                // Registrar MovimientoInventario
                await tx.movimientoInventario.create({
                    data: {
                        organizationId: org.id,
                        productoId: prodId,
                        tipoMovimiento: 'ENTRADA',
                        cantidad: material.cantidad,
                        motivo: `Devolución de material de Tarea Kanban ${material.task.codigo} (${material.task.title})`,
                        usuarioId: user.id
                    }
                });
            }

            // 4. Registrar actividad del Kanban
            await tx.kanbanActivity.create({
                data: {
                    spaceId: material.task.spaceId,
                    taskId: material.taskId,
                    usuarioId: user.id,
                    accion: 'ACTUALIZACION',
                    detalles: `Canceló descarga de material: devolvió ${material.cantidad}x ${material.activoFijo.descripcionCorta} a la ubicación "${material.activoFijo.area}"`
                }
            });
        });

        revalidatePath(`/kanban/${material.task.spaceId}`);
        return { success: true };
    } catch (e: any) {
        console.error("cancelMaterialConsumptionForTask Error:", e);
        return { success: false, error: e.message || 'Error al cancelar la descarga de material' };
    }
}








