'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

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
        const { org } = await getCurrentUserAndOrg();

        const spaces = await prisma.kanbanSpace.findMany({
            where: { organizationId: org.id },
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
            createdAt: s.createdAt.toISOString()
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

        const space = await prisma.kanbanSpace.create({
            data: {
                organizationId: org.id,
                nombre: data.nombre.trim(),
                clave: normalizedClave,
                tiposActividad: data.tiposActividad || ["Task", "Story", "Feature", "Bug"],
                columnas: data.columnas || ["Por hacer", "En curso", "En revisión", "Listo"],
                creadoPorId: user.id
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
        const { org } = await getCurrentUserAndOrg();

        const space = await prisma.kanbanSpace.findFirst({
            where: { id: spaceId, organizationId: org.id },
            include: {
                tasks: {
                    include: {
                        asignado: {
                            select: { id: true, nombre: true, apellido: true, email: true }
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

        // Obtener miembros del equipo para asignación de tareas
        const members = await prisma.user.findMany({
            where: { organizationId: org.id },
            select: { id: true, nombre: true, apellido: true, email: true }
        });

        return {
            space: {
                id: space.id,
                nombre: space.nombre,
                clave: space.clave,
                columnas: space.columnas,
                tiposActividad: space.tiposActividad
            },
            tasks: space.tasks.map(t => ({
                id: t.id,
                codigo: t.codigo,
                title: t.title,
                description: t.description || '',
                status: t.status,
                type: t.type,
                priority: t.priority,
                dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                asignado: t.asignado ? {
                    id: t.asignado.id,
                    nombre: `${t.asignado.nombre || ''} ${t.asignado.apellido || ''}`.trim() || t.asignado.email
                } : null,
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
                nombre: `${m.nombre || ''} ${m.apellido || ''}`.trim() || m.email
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
    dueDate?: string;
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
                    asignadoId: data.asignadoId || null,
                    creadoPorId: user.id
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
    dueDate?: string | null;
}) {
    try {
        const { user } = await getCurrentUserAndOrg();

        const oldTask = await prisma.kanbanTask.findUnique({
            where: { id: taskId },
            include: { asignado: true }
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
            } else {
                logs.push(`Removió el responsable asignado`);
            }
        }
        if (data.dueDate !== undefined) {
            updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
            const formattedDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Sin fecha';
            logs.push(`Cambió la fecha límite a ${formattedDate}`);
        }

        if (Object.keys(updates).length === 0) return { success: true };

        updates.modificadoPorId = user.id;

        const updated = await prisma.kanbanTask.update({
            where: { id: taskId },
            data: updates
        });

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


