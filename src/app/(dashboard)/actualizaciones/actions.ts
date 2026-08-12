'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellido: true,
      role: true,
      organizationId: true,
      avatarUrl: true,
    }
  });

  if (!dbUser) throw new Error('Usuario no encontrado en la base de datos');
  return dbUser;
}

export async function getActualizacionesData() {
  try {
    const dbUser = await getCurrentUser();

    // Fetch all updates for organization
    const rawActualizaciones = await prisma.sistemaActualizacion.findMany({
      where: {
        organizationId: dbUser.organizationId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatarUrl: true,
            role: true,
          }
        },
        comentarios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                avatarUrl: true,
                role: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        vistos: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                avatarUrl: true,
                role: true,
              }
            }
          },
          orderBy: { vistoAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const isUserAdmin = ['SUPER_ADMIN', 'ORG_ADMIN'].includes(dbUser.role);

    // Filter updates based on visibility settings if not published or restricted
    const actualizaciones = rawActualizaciones.filter(act => {
      if (isUserAdmin) return true; // Admin can see draft / restricted updates
      if (!act.publicado) return false;

      if (act.visibilidad === 'ALL') return true;
      if (act.visibilidad === 'ROLES') {
        return act.allowedRoles.includes(dbUser.role);
      }
      if (act.visibilidad === 'USERS_SELECT') {
        return act.allowedUserIds.includes(dbUser.id);
      }
      return true;
    });

    // Fetch list of organization users for admin selector
    const orgUsers = isUserAdmin ? await prisma.user.findMany({
      where: { organizationId: dbUser.organizationId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { nombre: 'asc' }
    }) : [];

    return {
      success: true,
      dbUser,
      actualizaciones,
      orgUsers
    };
  } catch (error: any) {
    console.error('Error fetching actualizaciones data:', error);
    return { success: false, error: error.message || 'Error al cargar datos' };
  }
}

export async function crearActualizacionAction(data: {
  titulo: string;
  subtitulo?: string;
  versionTag?: string;
  categoria?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  descripcion: string;
  publicado?: boolean;
  destacado?: boolean;
  visibilidad?: 'ALL' | 'ROLES' | 'USERS_SELECT';
  allowedRoles?: string[];
  allowedUserIds?: string[];
}) {
  try {
    const dbUser = await getCurrentUser();
    if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(dbUser.role)) {
      throw new Error('No tienes permisos para publicar actualizaciones.');
    }

    const nuevaActualizacion = await prisma.sistemaActualizacion.create({
      data: {
        organizationId: dbUser.organizationId,
        createdById: dbUser.id,
        titulo: data.titulo.trim(),
        subtitulo: data.subtitulo?.trim() || null,
        versionTag: data.versionTag?.trim() || 'v1.0.0',
        categoria: data.categoria || '🚀 Nueva Función',
        youtubeUrl: data.youtubeUrl?.trim() || null,
        videoUrl: data.videoUrl?.trim() || null,
        descripcion: data.descripcion.trim(),
        publicado: data.publicado !== undefined ? data.publicado : true,
        destacado: data.destacado || false,
        visibilidad: data.visibilidad || 'ALL',
        allowedRoles: data.allowedRoles || [],
        allowedUserIds: data.allowedUserIds || [],
      }
    });

    revalidatePath('/actualizaciones');
    return { success: true, data: nuevaActualizacion };
  } catch (error: any) {
    console.error('Error creating actualizacion:', error);
    return { success: false, error: error.message || 'Error al guardar la actualización' };
  }
}

export async function editarActualizacionAction(id: string, data: {
  titulo?: string;
  subtitulo?: string;
  versionTag?: string;
  categoria?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  descripcion?: string;
  publicado?: boolean;
  destacado?: boolean;
  visibilidad?: 'ALL' | 'ROLES' | 'USERS_SELECT';
  allowedRoles?: string[];
  allowedUserIds?: string[];
}) {
  try {
    const dbUser = await getCurrentUser();
    if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(dbUser.role)) {
      throw new Error('No tienes permisos para editar actualizaciones.');
    }

    const actUpdated = await prisma.sistemaActualizacion.update({
      where: { id },
      data: {
        ...(data.titulo && { titulo: data.titulo.trim() }),
        ...(data.subtitulo !== undefined && { subtitulo: data.subtitulo?.trim() || null }),
        ...(data.versionTag && { versionTag: data.versionTag.trim() }),
        ...(data.categoria && { categoria: data.categoria }),
        ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl?.trim() || null }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl?.trim() || null }),
        ...(data.descripcion && { descripcion: data.descripcion.trim() }),
        ...(data.publicado !== undefined && { publicado: data.publicado }),
        ...(data.destacado !== undefined && { destacado: data.destacado }),
        ...(data.visibilidad && { visibilidad: data.visibilidad }),
        ...(data.allowedRoles && { allowedRoles: data.allowedRoles }),
        ...(data.allowedUserIds && { allowedUserIds: data.allowedUserIds }),
      }
    });

    revalidatePath('/actualizaciones');
    return { success: true, data: actUpdated };
  } catch (error: any) {
    console.error('Error editing actualizacion:', error);
    return { success: false, error: error.message || 'Error al actualizar' };
  }
}

export async function eliminarActualizacionAction(id: string) {
  try {
    const dbUser = await getCurrentUser();
    if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(dbUser.role)) {
      throw new Error('No tienes permisos para eliminar la actualización.');
    }

    await prisma.sistemaActualizacion.delete({
      where: { id }
    });

    revalidatePath('/actualizaciones');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting actualizacion:', error);
    return { success: false, error: error.message || 'Error al eliminar' };
  }
}

export async function agregarComentarioAction(data: {
  actualizacionId: string;
  contenido: string;
  reaccion?: string;
  parentId?: string;
}) {
  try {
    const dbUser = await getCurrentUser();
    if (!data.contenido.trim() && !data.reaccion) {
      throw new Error('El comentario no puede estar vacío.');
    }

    const nuevoComentario = await prisma.sistemaActualizacionComentario.create({
      data: {
        actualizacionId: data.actualizacionId,
        usuarioId: dbUser.id,
        contenido: data.contenido.trim(),
        reaccion: data.reaccion || null,
        parentId: data.parentId || null,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatarUrl: true,
            role: true,
          }
        }
      }
    });

    revalidatePath('/actualizaciones');
    return { success: true, data: nuevoComentario };
  } catch (error: any) {
    console.error('Error adding comentario:', error);
    return { success: false, error: error.message || 'Error al publicar comentario' };
  }
}

export async function eliminarComentarioAction(comentarioId: string) {
  try {
    const dbUser = await getCurrentUser();

    const comentario = await prisma.sistemaActualizacionComentario.findUnique({
      where: { id: comentarioId }
    });

    if (!comentario) throw new Error('Comentario no encontrado.');

    const isOwner = comentario.usuarioId === dbUser.id;
    const isAdmin = ['SUPER_ADMIN', 'ORG_ADMIN'].includes(dbUser.role);

    if (!isOwner && !isAdmin) {
      throw new Error('No tienes permisos para eliminar este comentario.');
    }

    await prisma.sistemaActualizacionComentario.delete({
      where: { id: comentarioId }
    });

    revalidatePath('/actualizaciones');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting comentario:', error);
    return { success: false, error: error.message || 'Error al eliminar comentario' };
  }
}

export async function registrarVistoAction(actualizacionId: string) {
  try {
    const dbUser = await getCurrentUser();

    await prisma.sistemaActualizacionVisto.upsert({
      where: {
        actualizacionId_usuarioId: {
          actualizacionId,
          usuarioId: dbUser.id
        }
      },
      create: {
        actualizacionId,
        usuarioId: dbUser.id,
      },
      update: {
        vistoAt: new Date()
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error registering visto:', error);
    return { success: false };
  }
}
