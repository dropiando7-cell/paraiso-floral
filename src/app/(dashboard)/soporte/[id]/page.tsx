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
      tecnicosAsignados: true,
      usuarioAprobacion: true,
      repuestos: { include: { producto: true, activoFijo: true } },
      kanbanTasks: true
    }
  });

  if (!orden) {
    redirect('/soporte');
  }

  const organizationUsers = await prisma.user.findMany({
    where: { 
      organizationId: orden.organizationId,
      isAssignable: { not: false }
    },
    orderBy: { nombre: 'asc' }
  });

  const budgetFactura = await prisma.factura.findFirst({
    where: {
      ordenTrabajoId: resolvedParams.id,
      tipoDocumento: 'COTIZACION',
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      correlativo: true,
      total: true,
      estado: true,
    }
  });

  const serializedBudget = budgetFactura ? {
    id: budgetFactura.id,
    correlativo: budgetFactura.correlativo,
    total: Number(budgetFactura.total),
    estado: budgetFactura.estado,
  } : null;

  const finalFactura = await prisma.factura.findFirst({
    where: {
      ordenTrabajoId: resolvedParams.id,
      tipoDocumento: 'FACTURA',
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      correlativo: true,
      total: true,
      estado: true,
    }
  });

  const serializedFinalFactura = finalFactura ? {
    id: finalFactura.id,
    correlativo: finalFactura.correlativo,
    total: Number(finalFactura.total),
    estado: finalFactura.estado,
  } : null;

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
            producto: r.activoFijo ? {
                ...r.activoFijo,
                nombre: r.activoFijo.descripcionCorta,
                sku: r.activoFijo.codigoBarras || r.activoFijo.idQr,
                precioVenta: Number(r.activoFijo.costoAdq || 0)
            } : r.producto ? {
                ...r.producto,
                precioVenta: Number(r.producto.precioVenta)
            } : null
        })),
        kanbanTasks: orden.kanbanTasks?.map((t: any) => ({
            id: t.id,
            spaceId: t.spaceId,
            codigo: t.codigo
        })) || []
    }} 
    userRole={userRole}
    customRoleName={dbUser?.customRoleName || ''}
    userEmail={dbUser?.email || ''}
    organizationUsers={organizationUsers}
    budgetFactura={serializedBudget}
    finalFactura={serializedFinalFactura}
    accessibleModules={dbUser?.accessibleModules || []}
  />;
}
