import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SoporteDetailClient from './SoporteDetailClient';
import { createClient } from '@/utils/supabase/server';

export default async function SoporteDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect('/login');

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  const userRole = dbUser?.role || 'USER';

  const orden = await prisma.ordenTrabajo.findUnique({
    where: { id: params.id },
    include: {
      cliente: true,
      usuarioRecepcion: true,
      tecnicoReparacion: true,
      usuarioAprobacion: true,
    }
  });

  if (!orden) {
    redirect('/soporte');
  }

  return <SoporteDetailClient orden={{...orden, costoRevision: Number(orden.costoRevision), costoReparacion: Number(orden.costoReparacion)}} userRole={userRole} />;
}
