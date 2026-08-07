import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import VerificationClientView from './VerificationClientView';

export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default async function OTVerificationPage({ params }: PageProps) {
  const { id } = await params;
  console.log('[OTVerificationPage] Request received for ID:', id);

  if (!id) {
    console.log('[OTVerificationPage] No ID provided -> notFound()');
    notFound();
  }

  const cleanId = decodeURIComponent(id).trim();
  console.log('[OTVerificationPage] cleanId:', cleanId);

  let activo: any = null;
  let singleOrden: any = null;

  // 1. Try finding ActivoFijo
  try {
    const whereConditions: any[] = [{ idQr: cleanId }];
    if (isUuid(cleanId)) {
      whereConditions.push({ id: cleanId });
    }

    activo = await prisma.activoFijo.findFirst({
      where: { OR: whereConditions },
      include: {
        cliente: true,
        ordenesTrabajo: {
          include: {
            tecnicoReparacion: {
              select: { nombre: true, apellido: true }
            },
            tecnicosAsignados: {
              select: { id: true, nombre: true, apellido: true }
            },
            repuestos: true,
            tiempos: {
              where: { anuladaAt: null },
              include: { tecnico: { select: { nombre: true, apellido: true } } },
              orderBy: { inicio: 'asc' }
            },
            kanbanTasks: {
              include: {
                attachments: {
                  include: { subidoPor: { select: { nombre: true, apellido: true } } }
                },
                comments: {
                  include: { usuario: { select: { nombre: true, apellido: true } } },
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          },
          orderBy: { fechaRecibido: 'desc' }
        }
      }
    });
  } catch (e) {
    console.error('Error fetching ActivoFijo:', e);
  }

  // 2. If not found as ActivoFijo, try finding OrdenTrabajo by id or codigoSeguridad
  if (!activo) {
    try {
      const whereConditions: any[] = [{ codigoSeguridad: cleanId }];
      if (isUuid(cleanId)) {
        whereConditions.push({ id: cleanId });
      }

      singleOrden = await prisma.ordenTrabajo.findFirst({
        where: { OR: whereConditions },
        include: {
          cliente: true,
          activo: true,
          tecnicoReparacion: {
            select: { nombre: true, apellido: true }
          },
          tecnicosAsignados: {
            select: { id: true, nombre: true, apellido: true }
          },
          repuestos: true,
          tiempos: {
            where: { anuladaAt: null },
            include: { tecnico: { select: { nombre: true, apellido: true } } },
            orderBy: { inicio: 'asc' }
          },
          kanbanTasks: {
            include: {
              attachments: {
                include: { subidoPor: { select: { nombre: true, apellido: true } } }
              },
              comments: {
                include: { usuario: { select: { nombre: true, apellido: true } } },
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });
    } catch (e) {
      console.error('Error fetching OrdenTrabajo:', e);
    }
  }

  // 3. If not found, try finding via KanbanTask
  if (!activo && !singleOrden && isUuid(cleanId)) {
    try {
      const task = await prisma.kanbanTask.findUnique({
        where: { id: cleanId },
        include: {
          attachments: {
            include: { subidoPor: { select: { nombre: true, apellido: true } } }
          },
          comments: {
            include: { usuario: { select: { nombre: true, apellido: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (task) {
        if (task.ordenTrabajoId) {
          singleOrden = await prisma.ordenTrabajo.findUnique({
            where: { id: task.ordenTrabajoId },
            include: {
              cliente: true,
              activo: true,
              tecnicoReparacion: { select: { nombre: true, apellido: true } },
              tecnicosAsignados: { select: { id: true, nombre: true, apellido: true } },
              repuestos: true,
              tiempos: {
                where: { anuladaAt: null },
                include: { tecnico: { select: { nombre: true, apellido: true } } },
                orderBy: { inicio: 'asc' }
              },
              kanbanTasks: {
                include: {
                  attachments: {
                    include: { subidoPor: { select: { nombre: true, apellido: true } } }
                  },
                  comments: {
                    include: { usuario: { select: { nombre: true, apellido: true } } },
                    orderBy: { createdAt: 'desc' }
                  }
                }
              }
            }
          });
        }

        if (!singleOrden) {
          // Construct synthetic orden from KanbanTask if no linked OrdenTrabajo exists
          singleOrden = {
            id: task.id,
            codigoSeguridad: task.codigo || task.title.match(/#([A-Za-z0-9]+)/)?.[1] || task.id.slice(0, 8),
            equipoDano: task.title,
            diagnosticoTecnico: task.description || 'Servicio registrado en tablero Kanban',
            estado: task.status || 'COMPLETADO',
            fechaRecibido: task.createdAt,
            cliente: null,
            kanbanTasks: [task],
            fotosEstadoInicial: [],
            fotosTecnico: [],
            repuestos: [],
            tiempos: []
          };
        }
      }
    } catch (e) {
      console.error('Error fetching KanbanTask for verification:', e);
    }
  }

  console.log('[OTVerificationPage] Result:', { activo: !!activo, singleOrden: !!singleOrden });

  // 4. Final check: if nothing found, return 404
  if (!activo && !singleOrden) {
    console.log('[OTVerificationPage] Neither activo nor singleOrden found -> notFound()');
    notFound();
  }

  // Serialize BigInt / Decimal / Date objects safely for Client Component
  const serializableData = JSON.parse(JSON.stringify({
    activo,
    singleOrden,
    pdfDownloadUrl: `/api/pdf/${activo ? activo.id : singleOrden.id}`
  }));

  return <VerificationClientView data={serializableData} />;
}
