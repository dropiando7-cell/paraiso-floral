import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const dbUser = await prisma.user.findUnique({ 
    where: { email: user.email },
    include: { organization: true }
  });

  if (!dbUser) {
    redirect('/unauthorized');
  }

  // Specialized roles redirect to their kiosk/mobile applications
  if (dbUser.role === 'CHECKIN_KIDS') redirect('/checkin');
  if (dbUser.role === 'MEDICAL_STAFF') redirect('/medico');

  // Fetch pending Kanban Tasks assigned to the user
  const kanbanTasks = await prisma.kanbanTask.findMany({
    where: {
      organizationId: dbUser.organizationId,
      OR: [
        { asignadoId: dbUser.id },
        { asignados: { some: { id: dbUser.id } } }
      ],
      status: {
        notIn: ['hecho', 'completado', 'done', 'cerrado', 'listo'],
        mode: 'insensitive'
      }
    },
    include: {
      space: true
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 6
  });

  // Fetch pending support tickets / work orders assigned to the user
  const workOrders = await prisma.ordenTrabajo.findMany({
    where: {
      organizationId: dbUser.organizationId,
      OR: [
        { tecnicoReparacionId: dbUser.id },
        { tecnicosAsignados: { some: { id: dbUser.id } } }
      ],
      estado: {
        notIn: ['entregado'],
        mode: 'insensitive'
      }
    },
    include: {
      cliente: true
    },
    orderBy: {
      fechaRecibido: 'desc'
    },
    take: 6
  });

  // Counts for status cards
  const totalPendingTasks = await prisma.kanbanTask.count({
    where: {
      organizationId: dbUser.organizationId,
      OR: [
        { asignadoId: dbUser.id },
        { asignados: { some: { id: dbUser.id } } }
      ],
      status: {
        notIn: ['hecho', 'completado', 'done', 'cerrado', 'listo'],
        mode: 'insensitive'
      }
    }
  });

  const totalPendingOrders = await prisma.ordenTrabajo.count({
    where: {
      organizationId: dbUser.organizationId,
      OR: [
        { tecnicoReparacionId: dbUser.id },
        { tecnicosAsignados: { some: { id: dbUser.id } } }
      ],
      estado: {
        notIn: ['entregado'],
        mode: 'insensitive'
      }
    }
  });

  // Fetch all tasks assigned to the user for summary
  const allUserTasks = await prisma.kanbanTask.findMany({
    where: {
      organizationId: dbUser.organizationId,
      OR: [
        { asignadoId: dbUser.id },
        { asignados: { some: { id: dbUser.id } } }
      ]
    },
    select: {
      status: true
    }
  });

  // Fetch all work orders assigned to the user for summary
  const allUserOrders = await prisma.ordenTrabajo.findMany({
    where: {
      organizationId: dbUser.organizationId,
      OR: [
        { tecnicoReparacionId: dbUser.id },
        { tecnicosAsignados: { some: { id: dbUser.id } } }
      ]
    },
    select: {
      estado: true
    }
  });

  // Classify tasks into summary counts
  let tasksPendingCount = 0;
  let tasksInProgressCount = 0;
  let tasksCompletedCount = 0;

  for (const t of allUserTasks) {
    const s = t.status.toLowerCase().trim();
    if (['para ejecutar', 'por hacer', 'todo', 'backlog', 'pendiente'].includes(s)) {
      tasksPendingCount++;
    } else if (['en ejecucion', 'en ejecución', 'en curso', 'en revision', 'en revisión', 'in progress', 'progress'].includes(s)) {
      tasksInProgressCount++;
    } else if (['completado', 'listo', 'hecho', 'cerrado', 'done', 'completed'].includes(s)) {
      tasksCompletedCount++;
    } else {
      tasksPendingCount++; // Fallback
    }
  }

  // Classify work orders into summary counts
  let ordersPendingCount = 0;
  let ordersInProgressCount = 0;
  let ordersCompletedCount = 0;

  for (const o of allUserOrders) {
    const e = o.estado.toUpperCase().trim();
    if (['RECIBIDO', 'EN_EVALUACION', 'ESPERANDO_APROBACION', 'APROBACION_PRESUPUESTO'].includes(e)) {
      ordersPendingCount++;
    } else if (['REPARACION'].includes(e)) {
      ordersInProgressCount++;
    } else if (['LISTO_ENTREGA', 'ENTREGADO'].includes(e)) {
      ordersCompletedCount++;
    } else {
      ordersPendingCount++; // Fallback
    }
  }

  return (
    <HomeClient
      dbUser={dbUser}
      kanbanTasks={kanbanTasks}
      workOrders={workOrders}
      totalPendingTasks={totalPendingTasks}
      totalPendingOrders={totalPendingOrders}
      tasksSummary={{
        pending: tasksPendingCount,
        inProgress: tasksInProgressCount,
        completed: tasksCompletedCount
      }}
      ordersSummary={{
        pending: ordersPendingCount,
        inProgress: ordersInProgressCount,
        completed: ordersCompletedCount
      }}
    />
  );
}
