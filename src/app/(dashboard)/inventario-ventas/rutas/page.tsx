import { getRutas, getCediProductos, getCediClientes, getCamiones, getRutasPredefinidas } from './actions';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { withRoleGuard } from '@/utils/rbac';
import RutasClient from './RutasClient';

export const dynamic = 'force-dynamic';

async function RutasPage() {
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

  // Fetch routes and trucks
  const routes = await getRutas();
  const camiones = await getCamiones();
  const rutasPredefinidas = await getRutasPredefinidas();
  
  // Fetch CEDI products and clients
  const products = await getCediProductos();
  const clients = await getCediClientes();

  // Fetch potential conductors (users of the same organization)
  const conductors = await prisma.user.findMany({
    where: { organizationId: dbUser.organizationId },
    select: { id: true, nombre: true, apellido: true }
  });

  // Fetch pending invoices that can be assigned to new routes
  const pendingInvoices = await prisma.factura.findMany({
    where: {
      organizationId: dbUser.organizationId,
      estado: { in: ['EMITIDA', 'PENDIENTE'] }
    },
    include: {
      detalles: true,
      cliente: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const serializedRoutes = JSON.parse(JSON.stringify(routes));
  const serializedCamiones = JSON.parse(JSON.stringify(camiones));
  const serializedRutasPredefinidas = JSON.parse(JSON.stringify(rutasPredefinidas));
  const serializedProducts = JSON.parse(JSON.stringify(products));
  const serializedClients = JSON.parse(JSON.stringify(clients));
  const serializedConductors = conductors.map(c => ({
    id: c.id,
    nombre: [c.nombre, c.apellido].filter(Boolean).join(' ') || 'Sin Nombre'
  }));
  const serializedInvoices = pendingInvoices.map(f => ({
    id: f.id,
    numeroFactura: f.correlativo,
    clienteNombre: f.cliente.nombre,
    total: Number(f.total)
  }));

  return (
    <RutasClient
      dbUser={JSON.parse(JSON.stringify(dbUser))}
      initialRoutes={serializedRoutes}
      initialCamiones={serializedCamiones}
      initialRutasPredefinidas={serializedRutasPredefinidas}
      cediProducts={serializedProducts}
      cediClients={serializedClients}
      conductors={serializedConductors}
      pendingInvoices={serializedInvoices}
    />
  );
}

export default withRoleGuard('/inventario-ventas/rutas', RutasPage);
