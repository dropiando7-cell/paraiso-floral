import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SoporteDetailClient from './SoporteDetailClient';
import { createClient } from '@/utils/supabase/server';

export default async function SoporteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect('/login');

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  const userRole = dbUser?.role || 'USER';

  const orden = await prisma.ordenTrabajo.findUnique({
    where: { id: resolvedParams.id },
    include: {
      cliente: true,
      usuarioRecepcion: true,
      tecnicoReparacion: true,
      usuarioAprobacion: true,
      repuestos: { include: { producto: true } }
    }
  });

  if (!orden) {
    redirect('/soporte');
  }

  return <SoporteDetailClient 
    orden={{
        ...orden, 
        costoRevision: Number(orden.costoRevision), 
        costoReparacion: Number(orden.costoReparacion),
        repuestos: orden.repuestos.map((r: any) => ({
            ...r,
            precioSugerido: Number(r.precioSugerido),
            subtotal: Number(r.subtotal),
            precioAprobado: r.precioAprobado ? Number(r.precioAprobado) : null,
            subtotalAprobado: r.subtotalAprobado ? Number(r.subtotalAprobado) : null,
            producto: {
                ...r.producto,
                precioVenta: Number(r.producto.precioVenta)
            }
        }))
    }} 
    userRole={userRole}
    customRoleName={dbUser?.customRoleName || ''}
  />;
}
