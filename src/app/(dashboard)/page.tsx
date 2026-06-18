import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import HomeClient from './HomeClient';

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
        notIn: ['Hecho', 'Completado', 'Done', 'Cerrado']
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
        notIn: ['ENTREGADO']
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
        notIn: ['Hecho', 'Completado', 'Done', 'Cerrado']
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
        notIn: ['ENTREGADO']
      }
    }
  });

  return (
    <HomeClient
      dbUser={dbUser}
      kanbanTasks={kanbanTasks}
      workOrders={workOrders}
      totalPendingTasks={totalPendingTasks}
      totalPendingOrders={totalPendingOrders}
    />
  );
}
